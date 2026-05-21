import { AudioModule, type AudioPlayer } from "expo-audio";
import * as Speech from "expo-speech";

import { romanToUrdu } from "./urdu";

type SpeakInput =
  | string
  | {
      urdu?: string;
      roman?: string;
    };

let currentPlayer: AudioPlayer | null = null;
let cachedUrduVoice: Speech.Voice | null | undefined = undefined;

function resolveTexts(input: SpeakInput): { urdu: string; roman: string } {
  if (typeof input === "string") {
    return { urdu: romanToUrdu(input), roman: input };
  }
  const roman = input.roman ?? "";
  const urdu = input.urdu ?? (roman ? romanToUrdu(roman) : "");
  return { urdu, roman };
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
  // The unofficial Google Translate TTS endpoint expects text under ~200 chars.
  const safe = trimmed.length > 180 ? trimmed.slice(0, 180) : trimmed;
  const encoded = encodeURIComponent(safe);
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=ur&client=tw-ob&q=${encoded}`;
}

async function tryGoogleTts(urduText: string): Promise<boolean> {
  if (!urduText.trim()) return false;
  try {
    const player = new AudioModule.AudioPlayer(
      {
        uri: buildGoogleTtsUrl(urduText),
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
          Accept: "audio/mpeg,audio/*;q=0.9,*/*;q=0.8",
          "Accept-Language": "ur-PK,ur;q=0.9,en;q=0.6",
        },
      },
      500,
      false,
    );
    currentPlayer = player;
    // expo-audio queues play() until the source is loaded.
    player.play();
    return true;
  } catch (error) {
    if (__DEV__) {
      console.warn("[audio] Google TTS failed, will fall back:", error);
    }
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
      language: "en-US",
      rate: 0.45,
      pitch: 1,
    });
  } catch (error) {
    if (__DEV__) {
      console.warn("[audio] Roman fallback failed:", error);
    }
  }
}

export async function speakUrdu(input: SpeakInput): Promise<void> {
  const { urdu, roman } = resolveTexts(input);
  stopSpeech();

  // Strategy 1: Google Translate TTS — proper Urdu pronunciation, works without
  // any device voice install. Requires network.
  if (await tryGoogleTts(urdu)) return;

  // Strategy 2: device-installed Urdu voice via expo-speech. Quality varies.
  if (await tryDeviceUrduVoice(urdu)) return;

  // Strategy 3: last resort — English voice reading the Roman transliteration.
  // Sounds approximate but at least gives the learner a phonetic cue.
  speakRomanFallback(roman);
}

export function stopSpeech(): void {
  try {
    Speech.stop();
  } catch {}
  tearDownPlayer();
}
