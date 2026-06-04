import { AudioModule, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";

import { romanToUrdu } from "./urdu";

type SpeakInput =
  | string
  | {
      urdu?: string;
      roman?: string;
      /**
       * Set true when `urdu` is hand-curated, real Urdu script (e.g. cue
       * words). When false / unset, speakUrdu treats `urdu` as possibly
       * algorithmic and tries to fetch a proper translation from Google.
       */
      curated?: boolean;
    };

let currentPlayer: AudioPlayer | null = null;
let cachedUrduVoice: Speech.Voice | null | undefined = undefined;
const translationCache = new Map<string, string>();

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://translate.google.com/",
  Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
  "Accept-Language": "ur-PK,ur;q=0.9,en;q=0.6",
};

function resolveTexts(input: SpeakInput): { urdu: string; roman: string; curated: boolean } {
  if (typeof input === "string") {
    return { urdu: romanToUrdu(input), roman: input, curated: false };
  }
  const roman = input.roman ?? "";
  const urdu = input.urdu ?? (roman ? romanToUrdu(roman) : "");
  return { urdu, roman, curated: Boolean(input.curated) };
}

function looksLikeUrdu(text: string): boolean {
  // Real Urdu strings contain characters from the Arabic Unicode block(s).
  // Algorithmic transliteration sometimes does too, but real curated text
  // typically has spaces+kashida and the "real Urdu" cue strings we use
  // already pass this. We pair it with a roman-based override below.
  return /[؀-ۿ]/.test(text);
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

function buildGoogleTtsUrl(text: string): string {
  const trimmed = text.trim();
  const safe = trimmed.length > 180 ? trimmed.slice(0, 180) : trimmed;
  const encoded = encodeURIComponent(safe);
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=ur&total=1&idx=0&client=tw-ob&textlen=${safe.length}`;
}

/**
 * Translate a Roman Urdu (or English) phrase to proper Urdu script via
 * Google Translate's public web endpoint. Cached in-memory for the session
 * so the same phrase only costs one round-trip.
 *
 * Returns the original input as a safe fallback when the API is
 * unreachable or returns nothing useful — that way speakUrdu still has
 * something to feed the TTS engine even when offline.
 */
async function translateToProperUrdu(roman: string): Promise<string> {
  const key = roman.trim();
  if (!key) return roman;
  if (translationCache.has(key)) {
    return translationCache.get(key)!;
  }
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ur&dt=t&q=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": BROWSER_HEADERS["User-Agent"],
        Referer: BROWSER_HEADERS.Referer,
      },
    });
    if (!response.ok) {
      if (__DEV__) console.warn("[audio] Translate HTTP", response.status, "for", key);
      return roman;
    }
    const body = await response.json();
    // Response shape: [[ [translated, original, ...] ], ...]
    const segments: Array<[string, string]> = Array.isArray(body?.[0]) ? body[0] : [];
    const translated = segments.map((segment) => segment?.[0] ?? "").join("");
    if (translated && looksLikeUrdu(translated)) {
      translationCache.set(key, translated);
      return translated;
    }
    return roman;
  } catch (error) {
    if (__DEV__) console.warn("[audio] Translate failed:", error);
    return roman;
  }
}

async function tryGoogleTts(urduText: string): Promise<boolean> {
  if (!urduText.trim()) return false;
  const url = buildGoogleTtsUrl(urduText);

  // Pre-fetch the URL so we know Google will actually serve audio for this
  // request. expo-audio's AudioPlayer constructor doesn't surface load
  // errors synchronously, so without this check a 403 or rate-limit
  // response just plays silence (and we never fall back).
  try {
    const probe = await fetch(url, {
      method: "GET",
      headers: BROWSER_HEADERS,
    });
    if (!probe.ok) {
      if (__DEV__) console.warn("[audio] Google TTS HTTP", probe.status);
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
      {
        uri: url,
        headers: BROWSER_HEADERS,
      },
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

async function tryDeviceUrduVoice(urduText: string): Promise<boolean> {
  if (!urduText.trim()) return false;
  try {
    if (cachedUrduVoice === undefined) {
      const voices = await Speech.getAvailableVoicesAsync();
      cachedUrduVoice =
        voices.find((voice) => (voice.language ?? "").toLowerCase().startsWith("ur")) ?? null;
    }
    if (!cachedUrduVoice) return false;
    Speech.speak(urduText, {
      language: cachedUrduVoice.language,
      voice: cachedUrduVoice.identifier,
      rate: 0.5,
      pitch: 1,
    });
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn("[audio] Device Urdu voice failed:", error);
    }
    return false;
  }
}

function speakRomanFallback(romanText: string) {
  if (!romanText.trim()) return;
  try {
    Speech.speak(romanText, {
      language: "hi-IN",
      rate: 0.5,
      pitch: 1,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[audio] Roman fallback failed:", error);
    }
  }
}

export async function speakUrdu(input: SpeakInput): Promise<void> {
  const { urdu: resolvedUrdu, roman, curated } = resolveTexts(input);
  let urdu = resolvedUrdu;

  // Algorithmic Roman→Urdu transliteration (utils/urdu.ts) produces
  // garbled script that Google's TTS reads as gibberish. When the caller
  // didn't flag the urdu as curated, ask Google Translate for the proper
  // Urdu script first.
  if (!curated && roman) {
    const proper = await translateToProperUrdu(roman);
    if (proper && proper !== roman && looksLikeUrdu(proper)) {
      urdu = proper;
    }
  }

  stopSpeech();

  if (await tryGoogleTts(urdu)) return;
  if (await tryDeviceUrduVoice(urdu)) return;
  speakRomanFallback(roman);
}

export function stopSpeech(): void {
  try {
    Speech.stop();
  } catch {}
  tearDownPlayer();
}

// Short Urdu cues that double as ambient encouragement. Uses the same
// Google-TTS-then-device-fallback chain as speakUrdu.
const CUES = {
  correct: { urdu: "شاباش", roman: "Shabash", curated: true as const },
  wrong: { urdu: "پھر کوشش", roman: "Phir koshish", curated: true as const },
  complete: { urdu: "مبارک ہو", roman: "Mubarak ho", curated: true as const },
} as const;

export type CueKind = keyof typeof CUES;

export async function playCue(kind: CueKind): Promise<void> {
  await speakUrdu(CUES[kind]);
}
