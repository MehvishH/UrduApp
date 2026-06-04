import { AudioModule, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";

import { romanToUrdu } from "./urdu";

type SpeakInput =
  | string
  | {
      urdu?: string;
      roman?: string;
      /**
       * Set true when `urdu` is hand-curated, real Urdu script (e.g. the
       * Shabash / Phir koshish / Mubarak ho cue words). speakUrdu will then
       * route to Urdu TTS directly. Without this flag, the Urdu field is
       * treated as untrustworthy (it may be algorithmic) and we route the
       * Roman through Hindi TTS instead, which handles Roman Hindi/Urdu
       * reliably without the API translation round-trip that used to drift.
       */
      curated?: boolean;
    };

let currentPlayer: AudioPlayer | null = null;
let cachedUrduVoice: Speech.Voice | null | undefined = undefined;
let cachedHindiVoice: Speech.Voice | null | undefined = undefined;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://translate.google.com/",
  Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
  "Accept-Language": "ur-PK,ur;q=0.9,hi-IN;q=0.8,en;q=0.6",
};

function resolveTexts(input: SpeakInput): { urdu: string; roman: string; curated: boolean } {
  if (typeof input === "string") {
    return { urdu: romanToUrdu(input), roman: input, curated: false };
  }
  const roman = input.roman ?? "";
  const urdu = input.urdu ?? (roman ? romanToUrdu(roman) : "");
  return { urdu, roman, curated: Boolean(input.curated) };
}

function tearDownPlayer() {
  try {
    if (currentPlayer) {
      try {
        currentPlayer.pause();
      } catch {}
      try {
        currentPlayer.remove();
      } catch {}
      currentPlayer = null;
    }
  } catch {}
}

function buildGoogleTtsUrl(text: string, languageTag: string): string {
  const trimmed = text.trim();
  const safe = trimmed.length > 180 ? trimmed.slice(0, 180) : trimmed;
  const encoded = encodeURIComponent(safe);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${languageTag}&total=1&idx=0&client=tw-ob&textlen=${safe.length}`;
}

async function tryGoogleTts(text: string, languageTag: string): Promise<boolean> {
  if (!text.trim()) return false;
  const url = buildGoogleTtsUrl(text, languageTag);

  // Probe first — expo-audio's AudioPlayer constructor doesn't surface
  // load errors synchronously, so if Google returns 403 / rate-limits us
  // the player just sits silent. Probing means we actually fall back
  // when the endpoint isn't serving audio.
  try {
    const probe = await fetch(url, { method: "GET", headers: BROWSER_HEADERS });
    if (!probe.ok) {
      if (__DEV__) console.warn("[audio] Google TTS HTTP", probe.status, "lang:", languageTag);
      return false;
    }
    const contentType = probe.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("audio")) {
      if (__DEV__) console.warn("[audio] Google TTS wrong content-type:", contentType);
      return false;
    }
  } catch (error) {
    if (__DEV__) console.warn("[audio] Google TTS probe failed:", error);
    return false;
  }

  try {
    const player = new AudioModule.AudioPlayer(
      { uri: url, headers: BROWSER_HEADERS },
      500,
      false,
    );
    currentPlayer = player;
    player.play();
    return true;
  } catch (error) {
    if (__DEV__) console.warn("[audio] Google TTS player error:", error);
    tearDownPlayer();
    return false;
  }
}

async function tryDeviceVoice(text: string, languagePrefix: string, voiceCache: { value: Speech.Voice | null | undefined }): Promise<boolean> {
  if (!text.trim()) return false;
  try {
    if (voiceCache.value === undefined) {
      const voices = await Speech.getAvailableVoicesAsync();
      voiceCache.value = voices.find((voice) => (voice.language ?? "").toLowerCase().startsWith(languagePrefix)) ?? null;
    }
    if (!voiceCache.value) return false;
    Speech.speak(text, {
      language: voiceCache.value.language,
      voice: voiceCache.value.identifier,
      rate: 0.5,
      pitch: 1,
    });
    return true;
  } catch (error) {
    if (__DEV__) console.warn("[audio] Device voice failed:", error);
    return false;
  }
}

function speakRomanFallback(romanText: string) {
  if (!romanText.trim()) return;
  try {
    Speech.speak(romanText, { language: "hi-IN", rate: 0.5, pitch: 1 });
  } catch (error) {
    if (__DEV__) console.warn("[audio] Roman fallback failed:", error);
  }
}

export async function speakUrdu(input: SpeakInput): Promise<void> {
  const { urdu, roman, curated } = resolveTexts(input);

  stopSpeech();

  // Strategy depends on whether the caller provided hand-curated Urdu
  // script or only a Roman transliteration:
  //
  //   • curated + urdu  → use Google Urdu TTS (tl=ur). This is the cue
  //                       words ("شاباش" etc) where the script is correct.
  //   • roman           → use Google Hindi TTS (tl=hi-IN) with the Roman
  //                       text directly. Google's Hindi TTS handles Roman
  //                       Hindi/Urdu reliably and sounds essentially Urdu
  //                       to a learner. Avoids the unreliable translate-
  //                       then-speak round-trip that used to drift words.
  //
  // Each tier falls back to the next if Google blocks us. Final tier is
  // expo-speech's Hindi voice on-device, then the original Roman text via
  // any available voice.
  const voiceCacheUrdu = { value: cachedUrduVoice };
  const voiceCacheHindi = { value: cachedHindiVoice };

  if (curated && urdu) {
    if (await tryGoogleTts(urdu, "ur")) return;
  }

  if (roman) {
    if (await tryGoogleTts(roman, "hi-IN")) return;
  }

  if (curated && urdu) {
    if (await tryDeviceVoice(urdu, "ur", voiceCacheUrdu)) {
      cachedUrduVoice = voiceCacheUrdu.value;
      return;
    }
  }

  if (roman) {
    if (await tryDeviceVoice(roman, "hi", voiceCacheHindi)) {
      cachedHindiVoice = voiceCacheHindi.value;
      return;
    }
  }

  speakRomanFallback(roman);
}

export function stopSpeech(): void {
  try {
    Speech.stop();
  } catch {}
  tearDownPlayer();
}

// Short Urdu cues that double as ambient encouragement. Marked curated so
// they go through the Urdu-script TTS path directly.
const CUES = {
  correct: { urdu: "شاباش", roman: "Shabash", curated: true as const },
  wrong: { urdu: "پھر کوشش", roman: "Phir koshish", curated: true as const },
  complete: { urdu: "مبارک ہو", roman: "Mubarak ho", curated: true as const },
} as const;

export type CueKind = keyof typeof CUES;

export async function playCue(kind: CueKind): Promise<void> {
  await speakUrdu(CUES[kind]);
}
