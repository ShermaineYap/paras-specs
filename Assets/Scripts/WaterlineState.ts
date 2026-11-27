/**
 * WaterlineState — pure logic, no scene access.
 *
 * Owns: the body-word rule (brief: "Where things live → Depth tag"), which belongings a
 * level flags, which flagged item is "next", and the summary-line format.
 * Must not: touch SceneObjects, components, audio, or UI. Everything here is unit-testable
 * from a LEAF scenario by calling the functions directly.
 */

export interface BodyLandmark {
  word: string
  fraction: number // fraction of current eye height above the floor
}

/** Brief defaults: ankles 10%, knees 30%, waist 60%, chest 78%, chin 92% of eye height; plus hips 50% (round 5). */
export const DEFAULT_LANDMARKS: BodyLandmark[] = [
  {word: "ankles", fraction: 0.1},
  {word: "knees", fraction: 0.3},
  {word: "hips", fraction: 0.5},
  {word: "waist", fraction: 0.6},
  {word: "chest", fraction: 0.78},
  {word: "chin", fraction: 0.92},
]

export interface BodyReading {
  /** e.g. "up to your chin", "above your knees", "over your head" */
  phrase: string
  /** the bare body word, e.g. "chin", or "head" when submerged */
  word: string
  underwater: boolean
}

/**
 * The word is the highest landmark at or below the water. Within `toleranceCm` of that
 * landmark it reads "up to your …", otherwise "above your …". If the eyes are below the
 * surface it reads "over your head". Below the lowest landmark it reads "below your ankles".
 */
export function bodyReading(
  waterCm: number,
  eyeCm: number,
  landmarks: BodyLandmark[] = DEFAULT_LANDMARKS,
  toleranceCm: number = 5,
): BodyReading {
  if (eyeCm < waterCm) {
    return {phrase: "over your head", word: "head", underwater: true}
  }
  let best: BodyLandmark | null = null
  let bestH = -1
  for (const lm of landmarks) {
    const h = lm.fraction * eyeCm
    if (h <= waterCm && h > bestH) {
      best = lm
      bestH = h
    }
  }
  if (!best) {
    const lowest = landmarks.reduce((a, b) => (a.fraction < b.fraction ? a : b))
    return {phrase: `below your ${lowest.word}`, word: lowest.word, underwater: false}
  }
  const upTo = Math.abs(waterCm - bestH) <= toleranceCm
  return {phrase: `${upTo ? "up to" : "above"} your ${best.word}`, word: best.word, underwater: false}
}

export function depthTagText(waterCm: number, eyeCm: number, landmarks?: BodyLandmark[], toleranceCm?: number): string {
  const r = bodyReading(waterCm, eyeCm, landmarks, toleranceCm)
  return `Water here: ${Math.round(waterCm)} cm, ${r.phrase}`
}

export interface ItemInfo {
  heightCm: number // base height above the floor where it was tagged
  tagged: boolean
  safe: boolean
}

/** Tagged belongings strictly below the chosen water height. */
export function flaggedItems<T extends ItemInfo>(items: T[], levelCm: number): T[] {
  return items.filter((i) => i.tagged && i.heightCm < levelCm)
}

/** The one lowest flagged item that is not yet safe, or null when everything flagged is safe. */
export function nextItem<T extends ItemInfo>(items: T[], levelCm: number): T | null {
  const open = flaggedItems(items, levelCm).filter((i) => !i.safe)
  if (open.length === 0) return null
  open.sort((a, b) => a.heightCm - b.heightCm)
  return open[0]
}

/** "5 of 5 above water, 1:48" */
export function summaryLine(saved: number, total: number, seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${saved} of ${total} above water, ${m}:${r < 10 ? "0" : ""}${r}`
}

/** Smoothstep easing used by the rise/drain animation. */
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t))
  return c * c * (3 - 2 * c)
}
