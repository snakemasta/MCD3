/**
 * Lightweight WebAudio notification-sound synthesizer. No external assets — each
 * "sound type" is a short, professional, synthesized tone sequence. Browser-only;
 * all calls are guarded so importing on the server is safe.
 */

import type { NotificationSoundType } from "@/lib/notification-categories"

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) {
    try {
      audioCtx = new Ctor()
    } catch {
      return null
    }
  }
  return audioCtx
}

/**
 * Resume the AudioContext in response to a user gesture. Browsers block audio
 * until the user has interacted with the page; call this from a click/keydown.
 */
export function unlockAudio(): void {
  const ctx = getCtx()
  if (ctx && ctx.state === "suspended") {
    void ctx.resume().catch(() => {})
  }
}

interface Tone {
  freq: number
  /** Start offset in seconds from now. */
  at: number
  /** Duration in seconds. */
  dur: number
  type?: OscillatorType
}

const TONE_MAP: Record<NotificationSoundType, Tone[]> = {
  // Soft two-note rising chime.
  chime: [
    { freq: 660, at: 0, dur: 0.18, type: "sine" },
    { freq: 880, at: 0.14, dur: 0.28, type: "sine" },
  ],
  // Single subtle ping.
  ping: [{ freq: 880, at: 0, dur: 0.22, type: "sine" }],
  // Gentle bell — fundamental plus a quiet higher partial.
  bell: [
    { freq: 587.33, at: 0, dur: 0.5, type: "sine" },
    { freq: 1174.66, at: 0, dur: 0.4, type: "sine" },
  ],
  // Rising two-tone alert, slightly more attention-grabbing.
  alert: [
    { freq: 523.25, at: 0, dur: 0.16, type: "triangle" },
    { freq: 783.99, at: 0.16, dur: 0.22, type: "triangle" },
  ],
  // Short digital blip.
  digital: [
    { freq: 1046.5, at: 0, dur: 0.08, type: "square" },
    { freq: 1318.5, at: 0.09, dur: 0.1, type: "square" },
  ],
}

/**
 * Play a notification sound. `volume` is 0-100. Returns true if playback was
 * attempted (context available and not suspended).
 */
export function playNotificationSound(type: NotificationSoundType, volume = 70): boolean {
  const ctx = getCtx()
  if (!ctx) return false
  // If still suspended (no gesture yet), try to resume; if it can't, bail.
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => {})
  }

  const tones = TONE_MAP[type] ?? TONE_MAP.chime
  // Master gain keeps things subtle; user volume scales within that ceiling.
  const ceiling = 0.18
  const level = Math.max(0, Math.min(1, volume / 100)) * ceiling
  if (level <= 0) return false

  const now = ctx.currentTime
  for (const tone of tones) {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = tone.type ?? "sine"
    osc.frequency.value = tone.freq
    osc.connect(gain)
    gain.connect(ctx.destination)

    const start = now + tone.at
    const end = start + tone.dur
    // Quick attack, exponential decay for a clean, non-harsh envelope.
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(level, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, end)

    osc.start(start)
    osc.stop(end + 0.02)
  }
  return true
}
