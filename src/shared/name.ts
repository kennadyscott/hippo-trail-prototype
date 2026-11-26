// The working name, narrowed by Kennady on November 26, 2026. Picked in the prototype strip; both pages read it.
export const NAMES = ['Hippo Trail', 'Hippo Climb', 'Hippo Boost', 'Hippo Basecamp'] as const
export type TrailName = typeof NAMES[number]
const KEY = 'hippo-trail-name'
export function loadName(): TrailName {
  try { const v = localStorage.getItem(KEY); return (NAMES as readonly string[]).includes(v ?? '') ? v as TrailName : NAMES[0] } catch { return NAMES[0] }
}
export function saveName(n: TrailName) { try { localStorage.setItem(KEY, n) } catch { /* private window */ } }
/** "Hippo Climb" -> "Climb", for the two-tone mark. */
export const nameWord = (n: string) => n.replace(/^Hippo /, '')
