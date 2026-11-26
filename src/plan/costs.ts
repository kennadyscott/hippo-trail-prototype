// Rough build estimates for the Hippo Trail pitch (fixed, for discussion). Every number here is shown on the page with its assumption.
export const RATE = { dev: 90, pub: 35 } // $ per hour, placeholder rates
export const HOURS_PER_DAY = 8
export const BUILT = ['CTR', 'LC', 'TF', 'NL', 'HB'] // working in the CMS build today
// Dev days to make one manipulative production-ready (drag and tap on tablets, read-aloud, keyboard, checking and hints).
export const TOOL_SIZE: Record<string, 'S' | 'M' | 'L'> = {
  CTR: 'S', LC: 'S', TF: 'S', NL: 'M', HB: 'M', UT: 'S', US: 'S', PVT: 'S', PPW: 'S', AR: 'S', IO: 'S',
  CUP: 'M', PVC: 'M', SD: 'M', FC: 'M', FS: 'M', FB: 'M', FT: 'M', CR: 'M', PB: 'M', NS: 'M', RUL: 'M', LV: 'M', CN: 'M', CLK: 'M', CG: 'M',
  B10: 'L', BAL: 'L', TAN: 'L', GB: 'L', UC: 'L', SOL: 'L', PRO: 'L', GR: 'L',
}
export const SIZE_DAYS = { S: 3, M: 5, L: 10 } as const

export type Line = [string, number]
export type Depth = {
  key: 'lean' | 'standard' | 'full'; name: string; tag: string; pick?: boolean
  student: string[]; teacher: string[]; publisher: string
  platform: Line[]; pubHoursPerSkill: number; toolMode: 'pictures' | 'hands-on'; risk: string
}
export const DEPTHS: Depth[] = [
  { key: 'lean', name: 'Lean', tag: 'Questions and Show Me',
    student: ['Warm-up and mastery questions with pictures of the tools', 'Show Me plays a worked example', 'Levels go up on the mastery check and down after misses'],
    teacher: ['Assign a student to a category', 'A list of levels passed'],
    publisher: 'Check the drafted questions and the Show Me, then approve.',
    platform: [['Trail home and level climb in the student app', 4], ['Lesson player: questions and Show Me (same code as the CMS)', 4], ['Progress, level up and level down', 4], ['Teacher: assign and a progress list', 3], ['Testing on Chromebooks and iPads', 3]],
    pubHoursPerSkill: 0.5, toolMode: 'pictures',
    risk: 'Feels like the core questions again. It drops the hands-on work you wanted for intervention.' },
  { key: 'standard', name: 'Standard', tag: 'The hands-on lesson in this prototype', pick: true,
    student: ['All five steps, building on real manipulatives', 'A hint for the exact mistake, then 2 more like it', 'Finish with 2 right in a row; 3 misses in a row moves down a level', 'Building blocks stop, then a review stop one level down'],
    teacher: ['Everything in Lean', 'Who moved down a level and why'],
    publisher: 'Open the draft, play it as a student, fix what is off, save; a second person approves.',
    platform: [['Everything in Lean', 18], ['Hands-on practice player with the practice rules', 5], ['Production-ready versions of the 5 built tools', 6], ['Help ladder: Building blocks and review stops', 3], ['CMS: install, merge and test (already built)', 2]],
    pubHoursPerSkill: 1.25, toolMode: 'hands-on',
    risk: 'The tools are the slow part. Each new category waits on the tools it needs.' },
  { key: 'full', name: 'Full', tag: 'The sellable add-on',
    student: ['Everything in Standard', 'Hippo Check places each category', 'Spiral review of passed skills', 'Enters on its own after repeated low scores in a category'],
    teacher: ['Everything in Standard', 'Growth by standard, category and domain', '“Alice made 3 years of growth in 6 months”', 'Time on task as accelerated instruction'],
    publisher: 'Standard, plus spiral review questions and a few placement questions per level.',
    platform: [['Everything in Standard', 34], ['Hippo Check placement by level', 8], ['Auto-entry from repeated low scores in core', 5], ['Spiral review scheduling', 6], ['Teacher growth reports and time on task', 12], ['District roll-up and the paid add-on switch', 4]],
    pubHoursPerSkill: 1.85, toolMode: 'hands-on',
    risk: 'The most to build before anyone sees it. The reports also need real student data to prove the growth claim.' },
]
// Counting & Cardinality beyond what the prototype plays: decimals on the number line and place value chart.
export const CC_DECIMALS_DAYS = 2
export const PICTURE_DAYS_PER_TOOL = 0.5
export const toolDays = (code: string) => SIZE_DAYS[TOOL_SIZE[code] ?? 'M']
export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
export const moneyK = (n: number) => '$' + (Math.round(n / 100) / 10).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'

/* ---------- AI cost, from the CMS AI cost log (dbo.CRLitLabAICall and dbo.CRPassageGenAICall), read November 26, 2026 ---------- */
export const AI_LOG = {
  fillOpus: { calls: 714, items: 221, perCall: 0.1525, perItem: 0.493, avgIn: 16985, avgOut: 4228 },
  fillSonnet: { calls: 279, items: 117, perCall: 0.0487, perItem: 0.116 },
  pgSet: { calls: 248, perCall: 0.1312 },
  sectionsSonnet: { perCall: 0.018 },
  lessonVideo: { calls: 6, perCall: 2.8667 },
  questionPicture: { calls: 583, perCall: 0.0438 },
  months: [{ month: 'October 2026', cost: 36.03 }, { month: 'November 2026 (to the 26th)', cost: 149.15 + 32.54 }],
  prices: { opus: [4, 20], sonnet: [2, 10] }, // $ per million tokens in / out
}
// What one lesson's AI drafting costs at each depth, per skill, built from the log lines above.
export type AiLine = { what: string; basis: string; cost: number }
export const AI_PER_SKILL: Record<'lean' | 'standard' | 'full', AiLine[]> = {
  lean: [{ what: 'Draft the questions and Show Me, with redrafts', basis: 'About half a Fill breakout on Opus 5.5', cost: 0.25 }],
  standard: [
    { what: 'Draft the whole five-step lesson, with redrafts', basis: 'Fill breakout on Opus 5.5: 3.2 calls, $0.49 per finished breakout', cost: 0.49 },
    { what: 'A checking pass before a person reviews it', basis: 'A short Sonnet 5 check, like Sections ($0.018 a call)', cost: 0.02 },
  ],
  full: [
    { what: 'Draft the whole five-step lesson, with redrafts', basis: 'Fill breakout on Opus 5.5: 3.2 calls, $0.49 per finished breakout', cost: 0.49 },
    { what: 'A checking pass before a person reviews it', basis: 'A short Sonnet 5 check, like Sections ($0.018 a call)', cost: 0.02 },
    { what: 'Spiral review and placement questions', basis: 'Fill breakout on Sonnet 5: $0.12 per finished item', cost: 0.12 },
  ],
}
export const aiPerSkill = (k: 'lean' | 'standard' | 'full') => AI_PER_SKILL[k].reduce((a, l) => a + l.cost, 0)
export const WORST_CASE_MULT = 2 // twice the measured redrafts
export const usd = (n: number) => n < 10 ? '$' + n.toFixed(2) : '$' + Math.round(n).toLocaleString('en-US')
