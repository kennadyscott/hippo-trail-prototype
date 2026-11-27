// The skill map and lessons both pages use. Lessons start as drafts made from the skill map by the same rules as the CMS; a lesson saved in
// the Publisher view is kept in this browser and is the one the student view plays.
import mapFile from '../data/knowhippo-intervention-map.json'
import {draftLesson, isBuiltTool, type LessonSteps} from '@/lib/khi-steps'
import {ZONES, type KhiMap, type KhiReview, type KhiSkill, type KhiStatus} from '@/lib/khi-contract'

type MapFile = {
  categories: {code: string; zone: string; name: string; order: number; texasGrades: Record<string, string>}[]
  tools: KhiMap['tools']
  skills: {code: string; category: string; level: number; name: string; order: number; tools: string[]; prereqs: string[]; texasMain: string[]; texasAlso: string[]}[]
}
export const file = mapFile as unknown as MapFile

export const baseMap: KhiMap = {
  zones: [...ZONES], stateName: 'Texas',
  categories: file.categories.map(c => ({code: c.code, zone: c.zone, name: c.name, order: c.order, levels: Object.entries(c.texasGrades).map(([l, g]) => ({levelNo: Number(l), grade: g}))})),
  tools: file.tools,
  skills: file.skills.map((s, i) => ({id: i + 1, code: s.code, category: s.category, level: s.level, name: s.name, order: s.order, tools: s.tools, prereqs: s.prereqs,
    standards: [...s.texasMain.map(c => ({code: c, description: '', main: true})), ...s.texasAlso.map(c => ({code: c, description: '', main: false}))], lesson: null, status: 'none' as KhiStatus})),
}
export const byCode = new Map(baseMap.skills.map(s => [s.code, s]))
export const byId = new Map(baseMap.skills.map(s => [s.id, s]))
export const skillsOf = (cat: string) => baseMap.skills.filter(s => s.category === cat).sort((a, b) => a.level - b.level || a.order - b.order)
export const CC = skillsOf('CC')

// The two trails in the prototype. Level names are what students read; grades stay hidden. One level is one grade (November 27, 2026):
// Counting's two Kinder levels became one, so Level 1 is Kinder, Level 2 is grade 1 and so on.
export type TrailCode = 'CC' | 'PV'
export const TRAILS: Record<TrailCode, {name: string; levelNames: Record<number, string>; playableTo: number}> = {
  CC: {name: 'Counting & Cardinality', playableTo: 3,
    levelNames: {1: 'Count to 20, then to 100', 2: 'Count to 120', 3: 'Count to 1,200', 4: 'Count to 100,000', 5: 'Big numbers and tenths', 6: 'Decimals to thousandths'}},
  PV: {name: 'Base Ten Place Value', playableTo: 1,
    levelNames: {1: 'Ten and some more', 2: 'Tens and ones', 3: 'Hundreds, tens and ones', 4: 'Big numbers and rounding', 5: 'Each place is 10 times', 6: 'Decimals'}},
}
export const levelsOf = (cat: TrailCode) => [...new Set(skillsOf(cat).map(s => s.level))].sort((a, b) => a - b)
export const toolName = (code: string) => baseMap.tools.find(t => t.code === code)?.name.replace(/ \(.*\)$/, '').replace(/:.*$/, '') ?? code
/** A skill plays in the prototype when its level's lessons are drafted well and its tool is built. */
export function playable(s: KhiSkill) {
  const t = TRAILS[s.category as TrailCode]
  return !!t && s.level <= t.playableTo && s.tools.some(isBuiltTool)
}
/** What a locked stop is waiting for. */
export const waitingOn = (s: KhiSkill) => toolName(s.tools.find(t => !isBuiltTool(t)) ?? s.tools[0]).toLowerCase()

export const draftOf = (s: KhiSkill) => ({code: s.code, name: s.name, levelNo: s.level, categoryCode: s.category, tools: s.tools})
const drafts = new Map<string, LessonSteps>()
export function draftFor(s: KhiSkill) {
  let d = drafts.get(s.code)
  if (!d) { const p = s.prereqs[0] ? byCode.get(s.prereqs[0]) : undefined; d = draftLesson(draftOf(s), p ? draftOf(p) : null); drafts.set(s.code, d) }
  return d
}

// Lessons saved in the Publisher view, kept in this browser so both pages see them.
export type Saved = {steps: LessonSteps; version: number; review: KhiReview}
const KEY = 'hippo-trail-saved-v1'
export function loadSaved(): Record<string, Saved> {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
export function writeSaved(all: Record<string, Saved>) {
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* private window: saves last for this tab only */ }
}
export const stepsFor = (s: KhiSkill) => loadSaved()[s.code]?.steps ?? draftFor(s)

// The climb stops at grade level (Kennady, November 26, 2026): the summit is the last camp below the student's grade.
// Reaching it is the win; that category goes back to the normal Know & Grow path.
let STUDENT_GRADE = 3
export const setStudentGrade = (g: number) => { STUDENT_GRADE = g }
export const studentGrade = () => STUDENT_GRADE
const gradeNum = (g: string | null | undefined) => g === 'K' ? 0 : Number(g ?? 0)
export const levelGrade = (cat: string, l: number) => gradeNum(baseMap.categories.find(c => c.code === cat)?.levels.find(x => x.levelNo === l)?.grade)
export function summitLevel(cat: TrailCode) {
  const all = levelsOf(cat), below = all.filter(l => levelGrade(cat, l) < STUDENT_GRADE)
  if (below.length) return Math.max(...below)
  const atOrBelow = all.filter(l => levelGrade(cat, l) <= STUDENT_GRADE)
  return atOrBelow.length ? Math.max(...atOrBelow) : all[0]
}
export const climbLevels = (cat: TrailCode) => levelsOf(cat).filter(l => l <= summitLevel(cat))
