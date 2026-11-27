/**
 * KnowHippo intervention ("Hippo Trail", working name) — the lesson contract.
 * docs/knowhippo-intervention.md. Kennady, November 2026: leveled, hands-on math intervention, separate from KnowHippo core. Every skill has
 * one lesson in five steps (Warm-up, Show Me, Build it together, Build it yourself, Show what you know). A lesson is data, not code: the
 * CMS edits it, the student app (later) plays it with the same tools. Pure module: types, defaults, the draft a publisher starts from,
 * validation, and the rules the tools use to check answers and pick hints.
 */

/** Working name; Kennady is still choosing it. Every label reads from here. */
export const TRAIL_NAME = 'Hippo Trail'

/** Tools with a working editor and preview. Others in the toolkit show an outline until they are built. */
export const BUILT_TOOLS = ['CTR', 'LC', 'TF', 'NL', 'HB'] as const
export type ToolCode = typeof BUILT_TOOLS[number]
export const isBuiltTool = (code: string): code is ToolCode => (BUILT_TOOLS as readonly string[]).includes(code)

/**
 * A tool's state: the picture in a question, the start of a Show Me, and what a student builds.
 * CTR counters (red = how many are flipped to the second color, for two-color counters) · LC a train of linking cubes ·
 * TF ten frames (cells = filled squares, 0-19, so the "fill the first frame first" rule can be checked) ·
 * NL number line with an optional marker · HB hundreds board (marked squares; hidden squares show blank).
 */
export type Scene =
  | { tool: 'CTR'; count: number; red: number }
  | { tool: 'LC'; count: number }
  | { tool: 'TF'; frames: 1 | 2; cells: number[] }
  | { tool: 'NL'; min: number; max: number; step: number; at: number | null; orient: 'h' | 'v' }
  | { tool: 'HB'; max: 100 | 120; marked: number[]; hidden: number[] }

export type Item = { id: string; prompt: string; scene: Scene | null; choices: [string, string, string]; answer: 0 | 1 | 2; whyWrong: string; source: 'bank' | 'draft' }
/** One thing that happens on screen in a Show Me, with the caption students read. */
export type MoveAct = 'say' | 'add' | 'remove' | 'flip' | 'jump' | 'mark'
export type Move = { id: string; act: MoveAct; value: number; caption: string }
/** build: the student makes the number with the tool. read: the tool shows the number and the student types it. */
export type Problem = { id: string; kind: 'build' | 'read'; target: number }
export type PracticeRules = { addPerMiss: number; finishStreak: number; missRow: number; missTotal: number; maxExtra: number }
export type LessonSteps = {
  v: 1
  warmup: { items: Item[] }
  showMe: { tool: ToolCode; start: Scene; moves: Move[]; readAloud: boolean }
  together: { tool: ToolCode; prompts: 'guided' | 'none'; problems: Problem[] }
  yourself: { tool: ToolCode; problems: Problem[] }
  mastery: { items: Item[]; passMark: number }
  rules: PracticeRules
  hints: Record<HintKey, string>
}

/** Kennady, November 22, 2026: each missed problem adds 2 more like it; finish with 2 right in a row; move down a level after 3 missed in
 * a row, 4 missed in a step, or 8 extras without finishing. Drafts the team can change per lesson. */
export const DEFAULT_RULES: PracticeRules = { addPerMiss: 2, finishStreak: 2, missRow: 3, missTotal: 4, maxExtra: 8 }
export const DEFAULT_PASS_MARK = 80

/** The mistakes the tools can spot, and the words students read for each. {n} = the number, {have} = what they made. */
export const HINT_KEYS = ['recount', 'offByOne', 'fillFirstFrame', 'countJumps', 'rowsAreTens', 'nextDoor'] as const
export type HintKey = typeof HINT_KEYS[number]
export const HINT_LABELS: Record<HintKey, string> = {
  recount: 'Counted wrong', offByOne: 'Off by one', fillFirstFrame: 'Started the second ten frame too soon',
  countJumps: 'Number line: wrong spot', rowsAreTens: 'Hundreds board: wrong row', nextDoor: 'Hundreds board: one square off',
}
export const DEFAULT_HINTS: Record<HintKey, string> = {
  recount: 'Count again. Touch each one once as you count.',
  offByOne: 'You have {have}. You need {n}. Add or take away one.',
  fillFirstFrame: 'Fill the first ten frame before you start the second one.',
  countJumps: 'Start at 0 and count each jump to {n}.',
  rowsAreTens: 'Each row is 10 more. Find the row for {n} first.',
  nextDoor: 'So close! {n} is right next door.',
}
export const STEP_NAMES = ['Warm-up', 'Show Me', 'Build it together', 'Build it yourself', 'Show what you know'] as const

export const sceneNumber = (s: Scene): number | null =>
  s.tool === 'CTR' || s.tool === 'LC' ? s.count : s.tool === 'TF' ? s.cells.length : s.tool === 'NL' ? s.at : s.marked.length === 1 ? s.marked[0] : null
export const fillHint = (text: string, n: number, have: number | null) => text.replace(/\{n\}/g, String(n)).replace(/\{have\}/g, have === null ? 'nothing' : String(have))

/** The starting (empty) scene for building `target` with `tool`. */
export function blankScene(tool: ToolCode, target: number): Scene {
  switch (tool) {
    case 'CTR': return { tool, count: 0, red: 0 }
    case 'LC': return { tool, count: 0 }
    case 'TF': return { tool, frames: target > 10 ? 2 : 1, cells: [] }
    case 'NL': { const r = lineRange(target); return { tool, ...r, at: null, orient: 'h' } }
    case 'HB': return { tool, max: target > 100 ? 120 : 100, marked: [], hidden: [] }
  }
}
/** The scene that shows `n` (a question picture, or a read-the-tool problem). */
export function shownScene(tool: ToolCode, n: number): Scene {
  switch (tool) {
    case 'CTR': return { tool, count: n, red: 0 }
    case 'LC': return { tool, count: n }
    case 'TF': return { tool, frames: n > 10 ? 2 : 1, cells: Array.from({ length: Math.min(n, 20) }, (_, i) => i) }
    case 'NL': { const r = lineRange(n); return { tool, ...r, at: n, orient: 'h' } }
    case 'HB': return { tool, max: n > 100 ? 120 : 100, marked: [], hidden: [n] }
  }
}
/** Number line window: 0-10, 0-20, then the decade or hundred around the number. */
export function lineRange(n: number): { min: number; max: number; step: number } {
  if (n <= 10) return { min: 0, max: 10, step: 1 }
  if (n <= 20) return { min: 0, max: 20, step: 1 }
  if (n <= 120) { const lo = Math.floor(n / 10) * 10; return { min: lo === n ? lo - 10 : lo, max: (lo === n ? lo : lo + 10), step: 1 } }
  const lo = Math.floor(n / 100) * 100; return { min: lo, max: lo + 100, step: 10 }
}

/** Is a built scene right for `target`, and if not, which hint fits? */
export function checkBuild(scene: Scene, target: number): { right: boolean; hint: HintKey; have: number | null } {
  const have = sceneNumber(scene)
  if (have === target) return { right: true, hint: 'recount', have }
  if (scene.tool === 'TF' && scene.frames === 2 && scene.cells.some(c => c >= 10) && scene.cells.filter(c => c < 10).length < 10) return { right: false, hint: 'fillFirstFrame', have }
  if (scene.tool === 'NL') return { right: false, hint: have !== null && Math.abs(have - target) === scene.step ? 'offByOne' : 'countJumps', have }
  if (scene.tool === 'HB') return { right: false, hint: have !== null && Math.abs(have - target) === 10 ? 'rowsAreTens' : have !== null && Math.abs(have - target) === 1 ? 'nextDoor' : 'rowsAreTens', have }
  return { right: false, hint: have !== null && Math.abs(have - target) === 1 ? 'offByOne' : 'recount', have }
}
/** Apply one Show Me move to a scene. */
export function applyMove(scene: Scene, m: Move): Scene {
  if (m.act === 'say') return scene
  switch (scene.tool) {
    case 'CTR': return m.act === 'add' ? { ...scene, count: Math.min(30, scene.count + Math.max(1, m.value)) } : m.act === 'remove' ? { ...scene, count: Math.max(0, scene.count - Math.max(1, m.value)), red: Math.min(scene.red, Math.max(0, scene.count - Math.max(1, m.value))) } : m.act === 'flip' ? { ...scene, red: Math.max(0, Math.min(scene.count, m.value)) } : scene
    case 'LC': return m.act === 'add' ? { ...scene, count: Math.min(30, scene.count + Math.max(1, m.value)) } : m.act === 'remove' ? { ...scene, count: Math.max(0, scene.count - Math.max(1, m.value)) } : scene
    case 'TF': { const n = m.act === 'add' ? scene.cells.length + Math.max(1, m.value) : m.act === 'remove' ? scene.cells.length - Math.max(1, m.value) : scene.cells.length
      const k = Math.max(0, Math.min(scene.frames * 10, n)); return { ...scene, cells: Array.from({ length: k }, (_, i) => i) } }
    case 'NL': return m.act === 'jump' ? { ...scene, at: Math.max(scene.min, Math.min(scene.max, m.value)) } : scene
    case 'HB': return m.act === 'mark' ? { ...scene, marked: scene.marked.includes(m.value) ? scene.marked : [...scene.marked, m.value].slice(-60) } : scene
  }
}
/** The moves a tool offers in the Show Me editor. */
export const MOVE_OPTIONS: Record<ToolCode, Array<[MoveAct, string]>> = {
  CTR: [['say', 'Just the caption'], ['add', 'Add counters'], ['remove', 'Take counters away'], ['flip', 'Flip to the second color (how many)']],
  LC: [['say', 'Just the caption'], ['add', 'Add cubes'], ['remove', 'Take cubes away']],
  TF: [['say', 'Just the caption'], ['add', 'Add counters'], ['remove', 'Take counters away']],
  NL: [['say', 'Just the caption'], ['jump', 'Jump to']],
  HB: [['say', 'Just the caption'], ['mark', 'Mark the square']],
}

// ---- The draft a publisher starts from. AI drafting replaces these numbers and words later; the shape stays. ----
export type DraftSkill = { code: string; name: string; levelNo: number; categoryCode: string; tools: string[] }
const word = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
/** The numbers a skill works with, from its name and level (Counting & Cardinality ranges, Kennady November 22: to 10, then 11-20, …). */
export function skillRange(s: Pick<DraftSkill, 'name' | 'levelNo' | 'categoryCode'>): { lo: number; hi: number } {
  const n = s.name.toLowerCase()
  if (/\b(11|eleven) to (20|nineteen)|teen|10 to 20/.test(n)) return { lo: 11, hi: 19 }
  if (/to 10\b|within 10|\bto ten\b/.test(n)) return { lo: 1, hi: 10 }
  if (/to 20\b/.test(n)) return { lo: 1, hi: 20 }
  if (/to 100\b|by ones and tens/.test(n)) return { lo: 20, hi: 100 }
  if (/to 120\b/.test(n)) return { lo: 20, hi: 120 }
  if (/1,200|10s and 100s/.test(n)) return { lo: 120, hi: 1200 }
  if (s.categoryCode === 'CC') return s.levelNo <= 1 ? { lo: 1, hi: 10 } : s.levelNo === 2 ? { lo: 20, hi: 120 } : { lo: 120, hi: 1200 }   // one level per grade: K, grade 1, grade 2
  return { lo: 1, hi: 20 }
}
/** The first built tool the skill lists, else ten frames. */
export const skillTool = (tools: string[]): ToolCode => (tools.find(isBuiltTool) as ToolCode | undefined) ?? 'TF'
/** A tool that can show numbers in this range (ten frames stop at 20, counters and cubes at 30). */
export function toolFor(tools: string[], hi: number): ToolCode {
  const ok = tools.filter(isBuiltTool).filter(t => (t === 'TF' ? hi <= 20 : t === 'CTR' || t === 'LC' ? hi <= 30 : true)) as ToolCode[]
  return ok[0] ?? (hi <= 20 ? 'TF' : hi <= 120 ? 'HB' : 'NL')
}
function spread(lo: number, hi: number, k: number, seed: number) {
  const out: number[] = [], span = Math.max(1, hi - lo + 1)
  for (let i = 0; out.length < k && i < k * 6; i++) { const v = lo + ((seed * 7 + i * 5 + i * i * 3) % span); if (!out.includes(v)) out.push(v) }
  while (out.length < k) out.push(Math.min(hi, lo + out.length))
  return out
}
const seedOf = (code: string) => [...code].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7)
let idn = 0
const nid = (p: string) => `${p}${(++idn).toString(36)}${Date.now().toString(36).slice(-3)}`
/** A question about a number shown with a tool, with three choices (the right one, one more, one less). */
export function draftItem(tool: ToolCode, n: number, position: number, source: Item['source']): Item {
  const prompt = tool === 'NL' ? 'What number is the marker on?' : tool === 'HB' ? 'Which number is hidden?' : tool === 'LC' ? 'How many cubes are in the train?' : 'How many counters?'
  const near = tool === 'NL' && lineRange(n).step === 10 ? 10 : 1
  const others = [n + near, Math.max(0, n - near) === n ? n + 2 * near : n - near]
  const answer = (position % 3) as 0 | 1 | 2, choices = others.map(String)
  choices.splice(answer, 0, String(n))
  return { id: nid('q'), prompt, scene: shownScene(tool, n), choices: choices as [string, string, string], answer, whyWrong: tool === 'HB' ? 'Each row is 10 more. Count along the row to the hidden square.' : tool === 'NL' ? 'Count the jumps from the start of the line.' : 'Count each one once. Touch it as you count.', source }
}
/** The moves that build n from empty, one caption each. */
export function draftMoves(tool: ToolCode, n: number): Move[] {
  const m = (act: MoveAct, value: number, caption: string): Move => ({ id: nid('m'), act, value, caption })
  if (tool === 'NL') { const r = lineRange(n), out = [m('say', 0, `Let's find ${n} on the number line.`)]; let at = r.min; out.push(m('jump', at, `Start at ${at}.`)); const step = n - r.min > 10 ? Math.max(r.step, 10) : r.step; while (at + step <= n && out.length < 24) { at += step; out.push(m('jump', at, `${at}.`)) } if (at !== n) out.push(m('jump', n, `${n}.`)); out.push(m('say', 0, `That's ${n}.`)); return out }
  if (tool === 'HB') { const out = [m('say', 0, `Let's find ${n} on the hundreds board.`)], row = Math.floor((n - 1) / 10) * 10 + 1; if (row > 1) out.push(m('mark', row, `Each row starts 10 more. This row starts at ${row}.`)); out.push(m('mark', n, `Count along the row to ${n}.`)); return out }
  const out = [m('say', 0, `Let's show ${n}.`)]
  const unit = tool === 'LC' ? 'cube' : 'counter'
  if (n > 12) { out.push(m('add', 10, `Ten ${unit}s make 10.`)); for (let i = 11; i <= n; i++) out.push(m('add', 1, String(i))) }
  else for (let i = 1; i <= n; i++) out.push(m('add', 1, i === 10 && tool === 'TF' ? '10. One full ten frame!' : String(i)))
  out.push(m('say', 0, n > 10 && n < 20 ? `10 and ${n - 10} more make ${n}. We say ${word[n] ?? n}.` : `That's ${n}. The last number we say tells how many.`))
  return out
}
/** The whole draft lesson for a skill. `prereq` is the skill the warm-up practices (or the skill itself when it has none). */
export function draftLesson(skill: DraftSkill, prereq: DraftSkill | null): LessonSteps {
  const r = skillRange(skill), tool = toolFor(skill.tools, r.hi), seed = seedOf(skill.code)
  const pr = prereq ?? skill, prRange = skillRange(pr), prTool = toolFor(pr.tools, prRange.hi)
  const warm = spread(prRange.lo, prRange.hi, 3, seed + 1).map((n, i) => draftItem(prTool, n, i + seed, i < 2 ? 'bank' : 'draft'))
  const [show, ...rest] = spread(r.lo, r.hi, 9, seed)
  const together: Problem[] = [rest[0], rest[1], rest[2], rest[3]].map((n, i) => ({ id: nid('p'), kind: i === 2 ? 'read' : 'build', target: n }))
  const yourself: Problem[] = [rest[4], rest[5], rest[6], rest[7]].map((n, i) => ({ id: nid('p'), kind: i === 2 ? 'read' : 'build', target: n }))
  const mastery = spread(r.lo, r.hi, 4, seed + 5).map((n, i) => draftItem(tool, n, i + seed + 2, 'draft'))
  return { v: 1, warmup: { items: warm }, showMe: { tool, start: blankScene(tool, show), moves: draftMoves(tool, show), readAloud: true },
    together: { tool, prompts: 'guided', problems: together }, yourself: { tool, problems: yourself }, mastery: { items: mastery, passMark: DEFAULT_PASS_MARK },
    rules: { ...DEFAULT_RULES }, hints: { ...DEFAULT_HINTS } }
}
/** Another problem with the same tricky part (a teen stays a teen; a decade number stays a decade number). Used for "2 more like it". */
export function likeProblem(p: Problem, k: number): Problem {
  const t = p.target, ten = t % 10 === 0, teen = t > 10 && t < 20
  let n = teen ? 11 + ((t - 11 + 3 * k + 2) % 9) : ten ? Math.max(10, ((t / 10 + k) % 12) * 10 || 10) : t <= 10 ? 1 + ((t + 2 * k) % 10) : Math.max(1, t + (k % 2 ? 1 : -1) * (k + 1))
  if (n === t) n = t === 1 ? 2 : t - 1
  return { id: nid('p'), kind: p.kind, target: n }
}

// ---- Validation: the shape the CMS saves and the student app reads. ----
export class KhiValidation extends Error {}
const bad = (m: string): never => { throw new KhiValidation(m) }
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const int = (v: unknown, lo: number, hi: number, what: string) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : bad(`${what} must be a whole number from ${lo} to ${hi}.`))
const text = (v: unknown, max: number, what: string, allowEmpty = false) => (typeof v === 'string' && v.trim().length <= max && (allowEmpty || v.trim().length > 0) ? v.trim() : bad(`${what} needs text up to ${max} characters.`))
const idOf = (v: unknown) => (typeof v === 'string' && /^[a-z0-9]{1,24}$/i.test(v) ? v : bad('Reload: an item is missing its id.'))
const list = <T>(v: unknown, max: number, what: string, each: (x: unknown, i: number) => T, min = 0): T[] => (Array.isArray(v) && v.length >= min && v.length <= max ? v.map(each) : bad(`${what}: ${min ? `${min} to ` : 'up to '}${max}.`))
export function validateScene(v: unknown): Scene {
  if (!obj(v)) return bad('Reload: a tool picture is missing.')
  switch (v.tool) {
    case 'CTR': { const count = int(v.count, 0, 30, 'Counters'); return { tool: 'CTR', count, red: int(v.red, 0, count, 'Second-color counters') } }
    case 'LC': return { tool: 'LC', count: int(v.count, 0, 30, 'Cubes') }
    case 'TF': { const frames = int(v.frames, 1, 2, 'Ten frames') as 1 | 2, cells = list(v.cells, frames * 10, 'Ten frame squares', x => int(x, 0, frames * 10 - 1, 'A ten frame square')); if (new Set(cells).size !== cells.length) bad('A ten frame square is listed twice.'); return { tool: 'TF', frames, cells } }
    case 'NL': { const min = int(v.min, 0, 10000, 'Number line start'), max = int(v.max, min + 1, 10000, 'Number line end'), step = int(v.step, 1, 1000, 'Number line step'); if ((max - min) / step > 40) bad('A number line can show up to 40 marks.'); const at = v.at === null ? null : int(v.at, min, max, 'The marker'); return { tool: 'NL', min, max, step, at, orient: v.orient === 'v' ? 'v' : 'h' } }
    case 'HB': { const max = (v.max === 120 ? 120 : v.max === 100 ? 100 : bad('A hundreds board goes to 100 or 120.')) as 100 | 120; return { tool: 'HB', max, marked: list(v.marked, 60, 'Marked squares', x => int(x, 1, max, 'A marked square')), hidden: list(v.hidden, 20, 'Hidden squares', x => int(x, 1, max, 'A hidden square')) } }
    default: return bad('Reload: that tool is not available yet.')
  }
}
function validateItem(v: unknown): Item {
  if (!obj(v)) return bad('Reload: a question is missing.')
  const choices = list(v.choices, 3, 'Each question has 3 choices', x => text(x, 40, 'A choice'), 3) as [string, string, string]
  if (new Set(choices.map(c => c.toLowerCase())).size !== 3) bad('The 3 choices must all be different.')
  return { id: idOf(v.id), prompt: text(v.prompt, 200, 'A question'), scene: v.scene === null ? null : validateScene(v.scene), choices, answer: int(v.answer, 0, 2, 'The right choice') as 0 | 1 | 2, whyWrong: text(v.whyWrong, 200, 'The wrong-choice message', true), source: v.source === 'bank' ? 'bank' : 'draft' }
}
const validateProblem = (v: unknown): Problem => { if (!obj(v)) return bad('Reload: a problem is missing.'); return { id: idOf(v.id), kind: v.kind === 'read' ? 'read' : v.kind === 'build' ? 'build' : bad('A problem is Build or Read.'), target: int(v.target, 0, 10000, 'A problem number') } }
const toolOf = (v: unknown) => (typeof v === 'string' && isBuiltTool(v) ? v : bad('Reload: that tool is not available yet.'))
export function validateLesson(v: unknown): LessonSteps {
  if (!obj(v) || v.v !== 1) return bad('Reload: this lesson is not in a form this version can save.')
  const w = obj(v.warmup) ? v.warmup : bad('Reload: the warm-up is missing.'), s = obj(v.showMe) ? v.showMe : bad('Reload: Show Me is missing.')
  const t = obj(v.together) ? v.together : bad('Reload: Build it together is missing.'), y = obj(v.yourself) ? v.yourself : bad('Reload: Build it yourself is missing.')
  const m = obj(v.mastery) ? v.mastery : bad('Reload: Show what you know is missing.'), r = obj(v.rules) ? v.rules : bad('Reload: the practice rules are missing.'), h = obj(v.hints) ? v.hints : bad('Reload: the hints are missing.')
  const showTool = toolOf(s.tool), start = validateScene(s.start)
  if (start.tool !== showTool) bad('Show Me starts with a different tool than it uses.')
  const moves = list(s.moves, 60, 'Show Me moves', x => { if (!obj(x)) return bad('Reload: a move is missing.'); const act = (['say', 'add', 'remove', 'flip', 'jump', 'mark'] as const).find(a => a === x.act) ?? bad('A move needs an action.'); if (act !== 'say' && !MOVE_OPTIONS[showTool].some(([a]) => a === act)) bad(`${showTool} cannot ${act}.`); return { id: idOf(x.id), act, value: int(x.value, 0, 10000, 'A move value'), caption: text(x.caption, 160, 'A caption') } }, 1)
  const hints = Object.fromEntries(HINT_KEYS.map(k => [k, text(h[k], 200, `The "${HINT_LABELS[k]}" hint`)])) as Record<HintKey, string>
  return {
    v: 1,
    warmup: { items: list(w.items, 8, 'Warm-up questions', validateItem, 1) },
    showMe: { tool: showTool, start, moves, readAloud: s.readAloud === true },
    together: { tool: toolOf(t.tool), prompts: t.prompts === 'none' ? 'none' : 'guided', problems: list(t.problems, 12, 'Build it together problems', validateProblem, 1) },
    yourself: { tool: toolOf(y.tool), problems: list(y.problems, 12, 'Build it yourself problems', validateProblem, 1) },
    mastery: { items: list(m.items, 10, 'Mastery questions', validateItem, 1), passMark: int(m.passMark, 50, 100, 'The pass mark') },
    rules: { addPerMiss: int(r.addPerMiss, 0, 5, 'More problems per miss'), finishStreak: int(r.finishStreak, 1, 5, 'Right in a row to finish'), missRow: int(r.missRow, 2, 9, 'Misses in a row'), missTotal: int(r.missTotal, 2, 12, 'Misses in a step'), maxExtra: int(r.maxExtra, 2, 20, 'Extra problems') },
    hints,
  }
}
