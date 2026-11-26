/**
 * KnowHippo intervention ("Hippo Trail", working name): the skill map and review shapes the pages read, and the save body.
 * docs/knowhippo-intervention.md. Storage: scripts/knowhippo-intervention.sql. The lesson itself: src/lib/khi-steps.ts.
 */
import { KhiValidation, validateLesson, type LessonSteps } from './khi-steps.ts'
export { KhiValidation }

/** The team's review of a lesson, kept in the publisher review storage (kind khi-lesson, record = skill Id), like the Know-How review. */
export const KHI_REVIEW_KIND = 'khi-lesson' as const
/** none = no lesson saved yet (the builder starts from a draft); then To review, Approved, Feedback or Stuck. */
export type KhiStatus = 'none' | 'to-review' | 'approved' | 'feedback' | 'stuck'
export const khiStatusLabel: Record<KhiStatus, string> = { none: 'Not started', 'to-review': 'To review', approved: 'Approved', feedback: 'Feedback', stuck: 'Stuck' }

export type KhiCategory = { code: string; zone: string; name: string; order: number; levels: { levelNo: number; grade: string | null }[] }
export type KhiTool = { code: string; name: string; group: string; onList: boolean; order: number }
export type KhiStandard = { code: string; description: string; main: boolean }
export type KhiSkill = {
  id: number; code: string; category: string; level: number; name: string; order: number
  tools: string[]; prereqs: string[]; standards: KhiStandard[]
  lesson: { version: number; updatedOn: string } | null
  status: KhiStatus
}
export type KhiMap = { zones: string[]; categories: KhiCategory[]; tools: KhiTool[]; skills: KhiSkill[]; stateName: string }

export type KhiNote = { id: number; kind: 'feedback' | 'stuck'; note: string; by: string; on: string }
export type KhiReview = { status: Exclude<KhiStatus, 'none'>; approved: { by: string; on: string } | null; notes: KhiNote[] }
/** One skill's lesson for the builder: the saved lesson (or null: the page drafts one), its version and review. */
export type KhiLessonDetail = { skill: KhiSkill; prereq: KhiSkill | null; steps: LessonSteps | null; version: number; revision: string | null; review: KhiReview | null }

export const ZONES = ['Whole Numbers', 'Operations', 'Fractions & Decimals', 'Algebraic Thinking', 'Geometry', 'Measurement', 'Data'] as const

/** The save body the API accepts: one lesson at the version it was opened at. */
export type KhiSaveBody = { action: 'save'; kind: 'lesson'; skillId: number; version: number; steps: LessonSteps }
export function validateKhiSave(v: unknown): KhiSaveBody {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new KhiValidation('Invalid save request.')
  const o = v as Record<string, unknown>
  if (Object.keys(o).sort().join(',') !== 'action,kind,skillId,steps,version' || o.action !== 'save' || o.kind !== 'lesson') throw new KhiValidation('Invalid save request.')
  if (!Number.isInteger(o.skillId) || (o.skillId as number) < 1) throw new KhiValidation('Choose a skill.')
  if (!Number.isInteger(o.version) || (o.version as number) < 0) throw new KhiValidation('Reload before saving.')
  return { action: 'save', kind: 'lesson', skillId: o.skillId as number, version: o.version as number, steps: validateLesson(o.steps) }
}
