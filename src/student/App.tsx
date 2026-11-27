// The Hippo Trail (working name) inside the KnowHippo student site. It keeps the live site's header, art and type, but has its own look
// so a student knows they are building skills: a gold "power-up climb" up one mountain (levels are camps), Hugo as coach, badges,
// time spent, and what the climb unlocks in Know & Grow. Screens: Home, Hippo Check, the climb, lessons, step back, level up,
// quick review, Math tools, and the Know & Grow adventures. Progress is kept in this browser only.
import {useEffect, useMemo, useRef, useState} from 'react'
import {ToolView} from '@/components/khi-tools'
import {blankScene, isBuiltTool, shownScene, type Item, type Scene, type ToolCode} from '@/lib/khi-steps'
import type {KhiSkill} from '@/lib/khi-contract'
import {TRAILS, byCode, climbLevels, levelsOf, playable, setStudentGrade, skillsOf, stepsFor, studentGrade, summitLevel, waitingOn, type TrailCode} from '../shared/trail'
import {Header, Subjects, TrailMark} from './Chrome'
import {Lesson, STEPS, type Outcome} from './Lesson'
import {NAMES, loadName, saveName, type TrailName} from '../shared/name'
import mathIsland from './art/math-island.webp'
import portalIsland from './art/portal-island.webp'
import bridgeIsland from './art/bridge-island.webp'
import towerIsland from './art/tower-island.webp'
import hugo from './art/hugo-hippo.png'
import hugoHead from './art/hugo-head.png'
import hugoHiker from './art/hugo-hiker.png'
import mountainArt from './art/climb-mountain.jpg'
import campArt from './art/climb-camp.jpg'
import ridgeArt from './art/climb-ridge.jpg'

const ISLANDS = [mathIsland, portalIsland, bridgeIsland, towerIsland]
const KNOW_GROW = ['Represent Data', 'Multiplicative Comparison', 'Represent Numbers', 'Rounding Numbers']
/** The Know & Grow adventure each climb opens up (example pairing for the prototype). */
const UNLOCKS: Record<TrailCode, string> = {CC: 'Represent Numbers', PV: 'Rounding Numbers'}

type Progress = {level: number; done: Record<string, number>; review: {code: string; from: string; reason: string} | null; minutes: number; started: string; finished?: boolean}
type View =
  | {name: 'home'} | {name: 'check'} | {name: 'climb'} | {name: 'review'} | {name: 'tools'} | {name: 'adventures'} | {name: 'rules'} | {name: 'built'}
  | {name: 'lesson'; code: string; step: number; review: boolean}
  | {name: 'stepback'; code: string; reason: string} | {name: 'levelup'; level: number}
const START: Record<TrailCode, Progress> = {
  CC: {level: 2, done: {'CC2.1': 100, 'CC2.2': 75}, review: null, minutes: 42, started: 'Nov 3'},
  PV: {level: 1, done: {}, review: null, minutes: 0, started: 'Nov 24'},
}
const KEY = 'hippo-trail-progress-v3'   // v3: skills were renumbered when every level became one grade
const load = (): {trail: TrailCode; prog: Record<TrailCode, Progress>} => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s?.prog?.CC?.started && s?.prog?.PV?.started) return s } catch { /* ignore */ }
  return {trail: 'CC', prog: structuredClone(START)}
}
const LESSON_MINUTES = 10

export function App() {
  const init = useMemo(load, [])
  const [name, setName] = useState<TrailName>(loadName)
  const [grade, setGrade] = useState(() => { try { const v = Number(localStorage.getItem('hippo-trail-grade')); return v >= 0 && v <= 5 && localStorage.getItem('hippo-trail-grade') !== null ? v : 3 } catch { return 3 } })
  setStudentGrade(grade)
  const [layout, setLayoutState] = useState<Layout>(() => { try { const v = localStorage.getItem('hippo-trail-layout'); return v === 'C' || v === 'D' ? v : 'A' } catch { return 'A' } })
  const setLayout = (l: Layout) => { setLayoutState(l); try { localStorage.setItem('hippo-trail-layout', l) } catch { /* ignore */ } }
  const [trail, setTrail] = useState<TrailCode>(init.trail), [prog, setProg] = useState(init.prog), [view, setView] = useState<View>(() => location.hash === '#rules' ? {name: 'rules'} : location.hash === '#built' ? {name: 'built'} : {name: 'home'})
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({trail, prog})) } catch { /* ignore */ } }, [trail, prog])
  useEffect(() => { window.scrollTo(0, 0) }, [view.name, (view as {code?: string}).code])
  const P = prog[trail], T = TRAILS[trail]
  const levelSkills = skillsOf(trail).filter(s => s.level === P.level)
  const current = levelSkills.find(s => P.done[s.code] == null) ?? null
  const update = (f: (p: Progress) => Progress) => setProg(all => ({...all, [trail]: f(structuredClone(all[trail]))}))

  const finishLesson = (code: string, review: boolean, o: Outcome) => {
    if (o.kind === 'stepBack') {
      const s = byCode.get(code)!, pre = s.prereqs.find(c => byCode.get(c)?.category === s.category) ?? s.prereqs[0]
      if (review || !pre) { setView({name: 'climb'}); return }
      update(p => ({...p, review: {code: pre, from: code, reason: o.reason}, minutes: p.minutes + LESSON_MINUTES / 2}))
      setView({name: 'stepback', code, reason: o.reason}); return
    }
    if (review) { update(p => ({...p, review: null, minutes: p.minutes + LESSON_MINUTES})); setView({name: 'climb'}); return }
    const next = {...P, done: {...P.done, [code]: o.pct}, minutes: P.minutes + LESSON_MINUTES}
    update(() => next)
    setView(levelSkills.every(s => next.done[s.code] != null) ? {name: 'levelup', level: P.level} : {name: 'climb'})
  }
  const levelUp = () => {
    if (P.level >= summitLevel(trail)) { update(p => ({...p, finished: true, review: null})); setView({name: 'adventures'}); return }
    update(p => ({...p, level: Math.min(p.level + 1, summitLevel(trail)), review: null})); setView({name: 'climb'})
  }
  const play = (code: string, review = false) => setView({name: 'lesson', code, step: 0, review})

  // Screen bar: jump to any screen, set up the way it would look.
  const jump = (to: string) => {
    if (to === 'lesson') { const s = current ?? levelSkills[0]; if (s && playable(s)) play(s.code); else setView({name: 'climb'}); return }
    if (to === 'stepback') {
      const s = current ?? levelSkills[levelSkills.length - 1], pre = s?.prereqs.find(c => byCode.get(c)?.category === s.category) ?? s?.prereqs[0]
      if (s && pre) { update(p => ({...p, review: {code: pre, from: s.code, reason: '3 problems in a row needed help'}})); setView({name: 'stepback', code: s.code, reason: '3 problems in a row needed help'}) }
      return
    }
    if (to === 'levelup') { setView({name: 'levelup', level: P.level}); return }
    setView({name: to} as View)
  }

  let page: React.ReactNode
  switch (view.name) {
    case 'home': page = <Home name={name} trail={trail} P={P} current={current} levelSkills={levelSkills} onGo={jump}/>; break
    case 'check': page = <HippoCheck name={name} trail={trail} onDone={() => setView({name: 'climb'})} onBack={() => setView({name: 'home'})}/>; break
    case 'review': page = <QuickReview trail={trail} P={P} onBack={() => setView({name: 'home'})}/>; break
    case 'tools': page = <Tools onBack={() => setView({name: 'home'})}/>; break
    case 'adventures': page = <Adventures onBack={() => setView({name: 'home'})}/>; break
    case 'rules': page = <EntryRules name={name} onBack={() => setView({name: 'home'})}/>; break
    case 'built': page = <QuickToBuild name={name} onBack={() => setView({name: 'home'})}/>; break
    case 'lesson': {
      const s = byCode.get(view.code)!
      page = <LessonPage key={view.code + view.review} name={name} skill={s} trailName={T.name} level={P.level} review={view.review} step={view.step} setStep={n => setView({...view, step: n})}
        onBack={() => setView({name: 'climb'})} onDone={o => finishLesson(view.code, view.review, o)}/>
      break
    }
    case 'stepback': page = <StepBack name={name} skill={byCode.get(view.code)!} pre={byCode.get(P.review?.code ?? '')} reason={view.reason} level={P.level} onGo={() => setView({name: 'climb'})}/>; break
    case 'levelup': page = <LevelUp name={name} trail={trail} level={view.level} P={P} onGo={levelUp}/>; break
    default: page = <Climb layout={layout} name={name} trail={trail} P={P} current={current} levelSkills={levelSkills} onBack={() => setView({name: 'home'})} onPlay={play} onLevelUp={() => setView({name: 'levelup', level: P.level})}/>
  }

  return <>
    <nav className="pt-switch" aria-label="Prototype view"><b>Prototype</b><span>View as</span><a href="./" aria-current="page">Student</a><a href="./teacher.html">Teacher</a><a href="./cms.html">CMS</a><button type="button" className="pt-rules" aria-pressed={view.name === 'rules'} onClick={() => setView({name: 'rules'})}>Entry rules</button><button type="button" className="pt-rules" aria-pressed={view.name === 'built'} onClick={() => setView({name: 'built'})}>Why it’s quick to build</button><span className="pt-sep">Climb layout</span>{([["A", "Mountain map"], ["C", "Ridge"], ["D", "Drawn"]] as [Layout, string][]).map(([l, label]) => <button key={l} type="button" className="pt-abc" aria-pressed={layout === l} onClick={() => { setLayout(l); setView({name: 'climb'}) }}>{l} · {label}</button>)}<small>Not part of KnowHippo</small></nav>
    <div className="student-world ht-has-bar">
      <Header grade={grade} onHome={() => setView({name: 'home'})}/>
      {page}
    </div>
    <ScreenBar active={view.name} onJump={jump} name={name} onName={n => { setName(n); saveName(n) }} trail={trail} level={P.level}
      onTrail={t => { setTrail(t); setView({name: 'climb'}) }} onLevel={l => { update(p => ({...p, level: l, review: null})); setView({name: 'climb'}) }}
      onReset={() => { setProg(structuredClone(START)); setTrail('CC'); setView({name: 'home'}) }}
      grade={grade} onGrade={g => { setGrade(g); try { localStorage.setItem('hippo-trail-grade', String(g)) } catch { /* ignore */ } setStudentGrade(g); setProg(all => Object.fromEntries(Object.entries(all).map(([k, v]) => [k, {...v, finished: false, level: Math.min(v.level, summitLevel(k as TrailCode))}])) as Record<TrailCode, Progress>); setView({name: 'climb'}) }}/>
  </>
}

/* ---------- small shared pieces ---------- */
function Badge({n, earned, size = 46}: {n: number; earned: boolean; size?: number}) {
  return <svg className="ht-badge" width={size} height={size * 1.2} viewBox="0 0 50 60" role="img" aria-label={`Camp ${n} badge${earned ? '' : ' (not yet)'}`}>
    <path d="M14 34 L8 58 L18 52 L24 59 L27 36 Z" fill={earned ? '#e5484d' : '#d9d3ec'}/><path d="M36 34 L42 58 L32 52 L26 59 L23 36 Z" fill={earned ? '#c43a3f' : '#cfc8e6'}/>
    <circle cx="25" cy="24" r="21" fill={earned ? '#f5a524' : '#ece8f7'} stroke={earned ? '#c97c00' : '#d9d3ec'} strokeWidth="3"/>
    <circle cx="25" cy="24" r="15" fill={earned ? '#ffd166' : '#f6f3fc'}/>
    <path d="M15 30 L22 18 L26 24 L29 20 L36 30 Z" fill={earned ? '#c97c00' : '#d9d3ec'}/>
    <text x="25" y="17" textAnchor="middle" fontSize="9" fontWeight="900" fill={earned ? '#7a4300' : '#b3abcf'}>{n}</text>
  </svg>
}
const skillsMastered = (trail: TrailCode, P: Progress) => skillsOf(trail).filter(s => s.level < P.level || P.done[s.code] != null)
const shortName = (n: string) => n.split(/[;:]/)[0].replace(/^(Count|Read|Say|Write)( and \w+)? /, (m) => m)

/* ---------- Home (My Learning) ---------- */
function Home({name, trail, P, current, levelSkills, onGo}: {name: string; trail: TrailCode; P: Progress; current: KhiSkill | null; levelSkills: KhiSkill[]; onGo: (to: string) => void}) {
  const T = TRAILS[trail], done = levelSkills.filter(s => P.done[s.code] != null).length, left = levelSkills.length - done
  const passed = skillsMastered(trail, P).length
  return <main className="gw-world ht-home">
    <div className="ht-home-head"><h1>My Learning</h1><Subjects/></div>
    <div className="gw-guide ht-guide"><div className="gw-hippo-sprite gw-pose-point"/>
      <p>{left > 0 ? <>Ready to climb? <strong>You’re {left} skill{left > 1 ? 's' : ''} from Level {P.level + 1}!</strong></> : <>You reached the top of Level {P.level}. <strong>Time to level up!</strong></>}</p></div>
    <div className="ht-cards">
      <article className="ht-hcard ht-feature">
        <div className="ht-art ht-art-climb"><MiniMountain/></div>
        <span className="ht-tag ht-tag-gold">{name}</span>
        <h3>{T.name} · {P.finished ? 'Grade level ✓' : `Level ${P.level}`}</h3>
        <p>{done} of {levelSkills.length} skills done{current ? ` · next: ${shortName(current.name).toLowerCase()}` : ''}</p>
        <div className="ht-bar" aria-label={`${done} of ${levelSkills.length} skills`}><i style={{width: `${Math.max(6, done / levelSkills.length * 100)}%`}}/></div>
        <button type="button" className="ht-gold" onClick={() => onGo('climb')}>▶ Keep climbing</button>
      </article>
      <article className="ht-hcard">
        <div className="ht-art ht-art-core"><Crystal/></div>
        <span className="ht-tag ht-tag-teal">Know &amp; Grow</span>
        <h3>Math discovery</h3>
        <p>Your grade-level practice</p>
        <button type="button" className="ht-go" onClick={() => onGo('adventures')}>▶ Continue</button>
      </article>
      <article className="ht-hcard">
        <div className="ht-art ht-art-review"><ReviewArt/></div>
        <span className="ht-tag ht-tag-sun">This week</span>
        <h3>Quick review</h3>
        <p>{Math.min(3, passed)} skills you already passed</p>
        <button type="button" className="ht-soft" onClick={() => onGo('review')} disabled={passed === 0}>Start review</button>
      </article>
      <article className="ht-hcard">
        <div className="ht-art ht-art-tools"><ToolsArt/></div>
        <span className="ht-tag ht-tag-teal">Free</span>
        <h3>Math tools</h3>
        <p>Counters, ten frames and more for any math work</p>
        <button type="button" className="ht-soft" onClick={() => onGo('tools')}>Open tools</button>
      </article>
    </div>
  </main>
}
function MiniMountain() { return <svg width="150" height="96" viewBox="0 0 150 96" aria-hidden="true"><path d="M10 90 L60 18 L82 46 L96 30 L140 90Z" fill="#8b5cf6"/><path d="M60 18 l12 18 l-10 -4 l-8 10z" fill="#fff"/><path d="M28 86 q24 -10 30 -26 t34 -20 t24 -14" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="5 5"/><circle cx="28" cy="86" r="6" fill="#00aa98"/><circle cx="58" cy="60" r="6" fill="#00aa98"/><circle cx="92" cy="40" r="7" fill="#f5a524" stroke="#fff" strokeWidth="2"/><path d="M116 26 v-14 l12 5 l-12 5" fill="#f472b6" stroke="#24124f" strokeWidth="1.5"/></svg> }
function Crystal() { return <svg width="100" height="96" viewBox="0 0 100 96" aria-hidden="true"><path d="M50 6 L70 34 L50 90 L30 34Z" fill="#5eead4"/><path d="M50 6 L70 34 L50 40Z" fill="#a7f3d0"/><path d="M20 40 L32 56 L22 86 L10 56Z" fill="#a78bfa"/><path d="M80 44 L90 58 L82 84 L72 58Z" fill="#c4b5fd"/></svg> }
function ReviewArt() { return <svg width="110" height="90" viewBox="0 0 110 90" aria-hidden="true"><rect x="14" y="16" width="56" height="66" rx="8" fill="#fff" stroke="#f7b733" strokeWidth="3"/><path d="M24 34l6 6 10-12M24 54l6 6 10-12" fill="none" stroke="#00aa98" strokeWidth="4" strokeLinecap="round"/><circle cx="80" cy="46" r="22" fill="#f472b6"/><path d="M80 34v12l8 6" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round"/></svg> }
function ToolsArt() { return <svg width="130" height="90" viewBox="0 0 130 90" aria-hidden="true"><rect x="8" y="20" width="48" height="48" rx="3" fill="#22c3b0" stroke="#0b7f72" strokeWidth="2"/><path d="M8 32h48M8 44h48M8 56h48M20 20v48M32 20v48M44 20v48" stroke="#0b7f72" strokeWidth="1"/><rect x="64" y="14" width="10" height="60" rx="2" fill="#8b5cf6"/><rect x="80" y="14" width="10" height="60" rx="2" fill="#8b5cf6"/><rect x="98" y="56" width="12" height="12" rx="2" fill="#f7b733"/><rect x="112" y="56" width="12" height="12" rx="2" fill="#f7b733"/></svg> }

/* ---------- The climb, three layouts to compare (A: the mountain map, B: at camp, C: the ridge) ---------- */
export type Layout = 'A' | 'B' | 'C' | 'D'
// The painted trails, traced by hand from the art (% of the picture, bottom to top), and the points where the trail passes each tent.
type Route = {pts: [number, number][]; camps: number[]}
const MOUNT_ROUTE: Route = {
  pts: [[57, 99.5], [53, 95], [46, 92.8], [36, 90.5], [40, 88.5], [47, 86.5], [55, 84], [61.5, 81.5], [59, 79], [53, 77.8], [47, 77], [41, 75], [36, 72], [35, 69.5], [40, 67], [48, 65.2], [55, 64], [59, 63], [56, 60.5], [52, 58], [49, 56.5], [46, 54.5], [44, 52.5], [46, 50.5], [50, 48.8], [55, 47], [59, 45], [60, 43.5], [57, 40.5], [53, 39], [48, 37], [44, 35.5], [43, 35], [46, 32.5], [51, 31], [56, 29.5], [53, 27.5], [49, 25.8], [45, 24], [47, 19], [50, 13], [51, 9.5]],
  camps: [10, 17, 22, 27, 32, 35, 38]}
const RIDGE_ROUTE: Route = {
  pts: [[2, 92.2], [7.5, 87.5], [13, 82.3], [16, 77], [19.5, 71.2], [23.5, 68.3], [28, 65.3], [32.5, 60.7], [36, 58.3], [41, 56], [45, 53.7], [48, 51.3], [51, 49.6], [55, 48.4], [60, 46.7], [65, 42], [71, 40.3], [75, 37.3], [81, 33.3], [87, 27.4], [89.5, 24.5], [91.5, 22.2], [94, 7]],
  camps: [2, 5, 9, 13, 15, 18, 20]}

type ClimbProps = {name: string; trail: TrailCode; P: Progress; current: KhiSkill | null; levelSkills: KhiSkill[]; layout: Layout; onBack: () => void; onPlay: (code: string, review?: boolean) => void; onLevelUp: () => void}
function useClimb({trail, P, current, levelSkills}: ClimbProps) {
  const T = TRAILS[trail], levels = climbLevels(trail), top = Math.max(...levels)
  const done = levelSkills.filter(s => P.done[s.code] != null).length
  const mastered = skillsMastered(trail, P), badges = levels.filter(l => l < P.level).length
  const pre = P.review ? byCode.get(P.review.code) : undefined
  const tools = current ? current.tools.filter(isBuiltTool).slice(0, 2).map(t => TOOL_WORDS[t] ?? t) : []
  const next = pre ? {title: `Review stop: ${pre.name}`, sub: `From Camp ${pre.level} · about 8 minutes`, code: pre.code, review: true}
    : current ? {title: current.name, sub: playable(current) ? `5 steps on the ${tools.join(' and ') || 'tools'} · about 10 minutes` : `Needs the ${waitingOn(current)} · coming soon`, code: playable(current) ? current.code : null, review: false}
    : {title: `Camp ${P.level} complete!`, sub: `Earn your Camp ${P.level} badge`, code: null, review: false}
  return {T, levels, top, done, mastered, badges, pre, next}
}
function Go({p, c}: {p: ClimbProps; c: ReturnType<typeof useClimb>}) {
  const {next} = c
  if (next.code) return <button type="button" className="ht-gold ht-big" onClick={() => p.onPlay(next.code!, next.review)}>{next.review ? 'Start review stop →' : 'Continue climb →'}</button>
  if (!p.current) return <button type="button" className="ht-gold ht-big" onClick={p.onLevelUp}>Level up →</button>
  return null
}
function SkillList({p, c, compact}: {p: ClimbProps; c: ReturnType<typeof useClimb>; compact?: boolean}) {
  return <ul className={`ht-skills${compact ? ' ht-skills-compact' : ''}`}>
    {c.pre && <li><button type="button" className="ht-skill ht-skill-review" onClick={() => p.onPlay(c.pre!.code, true)}><span className="ht-sdot">↩</span><span><b>Review stop: {c.pre.name}</b><small>From Camp {c.pre.level}</small></span></button></li>}
    {p.levelSkills.map(s => {
      const d = p.P.done[s.code] != null, now = s === p.current && !c.pre, lock = !playable(s), can = !lock && (d || now)
      return <li key={s.code}><button type="button" className={`ht-skill${now ? ' now' : ''}${d ? ' done' : ''}`} disabled={!can} onClick={() => p.onPlay(s.code)}>
        <span className="ht-sdot">{d ? '✓' : now ? '▶' : '·'}</span>
        <span><b>{s.name}</b>{!compact && <small>{d ? `Mastered · ${p.P.done[s.code]}%` : lock ? `Needs the ${waitingOn(s)}` : now ? 'Up next' : 'Ahead'}</small>}</span>
      </button></li>
    })}
  </ul>
}
// Arc-length helpers along a route (in picture %, corrected for the picture's shape so distances are fair).
function routeMath(r: Route, aspect: number) {
  const P = r.pts.map(([x, y]) => [x, y * aspect] as [number, number])
  const cum = [0]; for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
  const total = cum[cum.length - 1]
  const at = (t: number): [number, number] => { const d = Math.max(0, Math.min(1, t)) * total; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++
    const f = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [r.pts[i - 1][0] + (r.pts[i][0] - r.pts[i - 1][0]) * f, r.pts[i - 1][1] + (r.pts[i][1] - r.pts[i - 1][1]) * f] }
  const tOf = (idx: number) => cum[idx] / total
  const path = (t0: number, t1: number) => { const n = Math.max(2, Math.round((t1 - t0) * 160)); let d = ''; for (let k = 0; k <= n; k++) { const [x, y] = at(t0 + (t1 - t0) * k / n); d += `${k ? ' L' : 'M'} ${x} ${y}` } return t1 > t0 ? d : '' }
  return {at, tOf, path}
}
function Pins({p, c, route, aspect}: {p: ClimbProps; c: ReturnType<typeof useClimb>; route: Route; aspect: number}) {
  const R = useMemo(() => routeMath(route, aspect), [route, aspect])
  const n = c.levels.length
  const campT = c.levels.map((_, i) => R.tOf(route.camps[n < 2 ? route.camps.length - 1 : Math.round(i * (route.camps.length - 1) / (n - 1))]))
  const ci = Math.max(0, c.levels.indexOf(p.P.level)), endT = 1
  const frac = p.levelSkills.length ? c.done / p.levelSkills.length : 0
  const target = campT[ci] + ((ci + 1 < n ? campT[ci + 1] : endT) - campT[ci]) * frac
  const key = `hippo-trail-hugo-${p.trail}`
  const [t, setT] = useState(() => { try { const v = Number(sessionStorage.getItem(key)); return v > 0 ? v : campT[0] } catch { return campT[0] } })
  const [flip, setFlip] = useState(false)
  const raf = useRef(0)
  const walk = (from: number, to: number, ms: number) => {
    cancelAnimationFrame(raf.current)
    if (Math.abs(to - from) < 1e-4 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setT(to); return }
    const start = performance.now()
    const step = (now: number) => { const k = Math.min(1, (now - start) / ms), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2, v = from + (to - from) * e
      const [x1] = R.at(v), [x0] = R.at(v - 0.004); setFlip(x1 < x0); setT(v); if (k < 1) raf.current = requestAnimationFrame(step) }
    raf.current = requestAnimationFrame(step)
  }
  useEffect(() => { walk(t, target, 1600 + Math.abs(target - t) * 4000); try { sessionStorage.setItem(key, String(target)) } catch { /* ignore */ } return () => cancelAnimationFrame(raf.current) }, [target]) // eslint-disable-line
  const [hx, hy] = R.at(t)
  return <>
    <svg className="ht-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={R.path(0, endT)} className="ht-route-glow"/>
      <path d={R.path(t, endT)} className="ht-route-ahead"/>
      <path d={R.path(0, t)} className="ht-route-done"/>
    </svg>
    {c.levels.map((l, i) => { const [x, y] = R.at(campT[i]), isCur = l === p.P.level, done = l < p.P.level
      return <div key={l} className={`ht-pin${isCur ? ' cur' : done ? ' done' : ''}`} style={{left: `${x}%`, top: `${y}%`}}>
        <span className="ht-pin-dot">{done ? '✓' : l}</span>
        <span className="ht-pin-label">{l === c.top ? `Camp ${l} · grade level` : `Camp ${l}`}</span>
      </div> })}
    <div className="ht-walker" style={{left: `${hx}%`, top: `${hy}%`}}>
      <span className="ht-walker-tag">{c.done} of {p.levelSkills.length} skills · Camp {p.P.level}</span>
      <img src={hugoHiker} alt={`Hugo is on the way to ${ci + 1 < n ? `Camp ${c.levels[ci + 1]}` : 'the grade-level summit'}`} style={{transform: flip ? 'scaleX(-1)' : undefined}}/>
    </div>
    <button type="button" className="ht-replay" onClick={() => { setT(0); walk(0, target, 4200) }}>▶ Watch Hugo climb</button>
  </>
}
function Pack({c, p, inline}: {c: ReturnType<typeof useClimb>; p: ClimbProps; inline?: boolean}) {
  return <div className={inline ? 'ht-pack-inline' : 'ht-pack'}>
    <span><Badge n={Math.max(1, c.badges)} earned={c.badges > 0} size={26}/><b>{c.badges}</b> of {c.levels.length} badges</span>
    <span>🧠 <b>{c.mastered.length}</b> skills built</span>
    <span>⏱ <b>{Math.round(p.P.minutes)}</b> min this week</span>
    <span>🔑 Camp {Math.min(p.P.level + 1, c.top)} opens <b>{UNLOCKS[p.trail]}</b></span>
  </div>
}
function ClimbHead({p, c, chip}: {p: ClimbProps; c: ReturnType<typeof useClimb>; chip?: boolean}) {
  return <div className="gw-detail-heading ht-head-calm"><div>
    <button type="button" className="gw-back" onClick={p.onBack}>‹ My Learning</button>
    <span className="kg-plan-label ht-gold-text">{p.name} · power-up climb</span>
    <h1>{c.T.name}</h1>
    <Subjects/>
  </div>{chip && <div className="gw-journey ht-level-chip"><strong>Camp {p.P.level} of {c.levels.length}</strong>
    <div>{c.levels.map(l => <span key={l} className={l < p.P.level ? 'done' : l === p.P.level ? 'current' : undefined}>{l < p.P.level ? '✓' : l}</span>)}</div></div>}</div>
}

function Climb(p: ClimbProps) {
  if (p.layout === 'D') return <ClimbDrawn {...p}/>
  const c = useClimb(p), {T, P} = {T: c.T, P: p.P}
  if (p.layout === 'B') return <main className="gw-world gw-detail ht-climb ht-B">
    <ClimbHead p={p} c={c}/>
    <section className="htB-hero" style={{backgroundImage: `url(${campArt})`}}>
      <div className="htB-copy">
        <span className="ht-eyebrow ht-eyebrow-gold">Camp {P.level} of {c.levels.length}</span>
        <h2>{T.levelNames[P.level]}</h2>
        <p>{c.done} of {p.levelSkills.length} skills done at this camp</p>
        <div className="ht-seg">{p.levelSkills.map(s => <i key={s.code} data-s={P.done[s.code] != null ? 'done' : s === p.current ? 'now' : undefined}/>)}</div>
        <div className="htB-next"><small>Next</small><b>{c.next.title}</b><span>{c.next.sub}</span></div>
        <Go p={p} c={c}/>
      </div>
      <img className="htB-hugo" src={hugoHiker} alt=""/>
    </section>
    <section className="htB-stones" aria-label={`Camp ${P.level} skills`}>
      {p.levelSkills.map((s, i) => { const d = P.done[s.code] != null, now = s === p.current && !c.pre, can = playable(s) && (d || now)
        return <button key={s.code} type="button" className={`htB-stone${d ? ' done' : now ? ' now' : ''}`} disabled={!can} onClick={() => p.onPlay(s.code)}>
          <span>{d ? '✓' : i + 1}</span><b>{shortName(s.name)}</b><small>{d ? `${P.done[s.code]}%` : now ? 'Up next' : playable(s) ? 'Ahead' : 'Coming soon'}</small></button> })}
    </section>
    <section className="htB-alt" aria-label="Your camps">
      {c.levels.map(l => <div key={l} className={l < P.level ? 'done' : l === P.level ? 'cur' : ''}><i>{l < P.level ? '✓' : l === c.top ? '⚑' : '⛺'}</i><small>{l === c.top ? 'Grade level' : `Camp ${l}`}</small></div>)}
    </section>
    <details className="htB-pack"><summary>🎒 Your pack · {c.badges} badge{c.badges === 1 ? '' : 's'} · {c.mastered.length} skills · {Math.round(P.minutes)} min this week</summary>
      <div className="ht-badges">{c.levels.map(l => <Badge key={l} n={l} earned={l < P.level}/>)}</div><Pack c={c} p={p} inline/></details>
  </main>

  if (p.layout === 'C') return <main className="gw-world gw-detail ht-climb ht-C">
    <ClimbHead p={p} c={c} chip/>
    <div className="htC">
    <section className="htC-pano"><img src={ridgeArt} alt={`${T.name}: ${c.levels.length} camps from the meadow to the summit`}/><Pins p={p} c={c} route={RIDGE_ROUTE} aspect={943 / 2200}/></section>
    <section className="htC-today">
      <span className="ht-eyebrow ht-eyebrow-gold">Today’s climb · Camp {P.level}: {T.levelNames[P.level]}</span>
      <h2>{c.next.title}</h2>
      <p>{c.next.sub}</p>
      <Go p={p} c={c}/>
      <details className="htC-more"><summary>All {p.levelSkills.length} skills at Camp {P.level} · {c.done} done</summary><SkillList p={p} c={c}/></details>
    </section>
    <Pack c={c} p={p}/>
    </div>
  </main>

  // A: the mountain is the map
  return <main className="gw-world gw-detail ht-climb ht-A">
    <ClimbHead p={p} c={c}/>
    <div className="htA">
      <section className="htA-map"><img src={mountainArt} alt={`${T.name}: ${c.levels.length} camps up the mountain`}/><Pins p={p} c={c} route={MOUNT_ROUTE} aspect={1506 / 1000}/></section>
      <aside className="htA-card">
        <span className="ht-eyebrow ht-eyebrow-gold">Camp {P.level} of {c.levels.length}</span>
        <h2>{T.levelNames[P.level]}</h2>
        <div className="ht-seg">{p.levelSkills.map(s => <i key={s.code} data-s={P.done[s.code] != null ? 'done' : s === p.current ? 'now' : undefined}/>)}</div>
        <p className="ht-camp-sum">{c.done} of {p.levelSkills.length} skills mastered · Every camp makes your class math easier.</p>
        <SkillList p={p} c={c} compact/>
        <Go p={p} c={c}/>
        <Pack c={c} p={p} inline/>
      </aside>
    </div>
  </main>
}
const TOOL_WORDS: Record<string, string> = {CTR: 'counters', LC: 'linking cubes', TF: 'ten frames', NL: 'number line', HB: 'hundreds board'}

/* ---------- D: the drawn mountain (the earlier climb page, kept as an option) ---------- */
function ClimbDrawn(p: ClimbProps) {
  const c = useClimb(p), {T} = c, P = p.P
  return <main className="gw-world gw-detail ht-climb ht-D">
    <ClimbHead p={p} c={c}/>
    <div className="htD">
      <section className="htD-art"><DrawnMountain levels={c.levels} level={P.level} names={T.levelNames} top={c.top}/></section>
      <aside className="htD-card">
        <span className="ht-eyebrow ht-eyebrow-gold">Camp {P.level} of {c.levels.length}{P.level === c.top ? ' · grade level' : ''}</span>
        <h2>{T.levelNames[P.level]}</h2>
        <p className="htD-why">Every camp you reach makes your class math easier.</p>
        <div className="ht-seg">{p.levelSkills.map(s => <i key={s.code} data-s={P.done[s.code] != null ? 'done' : s === p.current ? 'now' : undefined}/>)}</div>
        <p className="ht-camp-sum">{c.done} of {p.levelSkills.length} skills done at this camp</p>
        <div className="htD-next"><small>{c.pre ? 'Review stop' : 'Next'}</small><b>{c.next.title}</b><span>{c.next.sub}</span></div>
        <Go p={p} c={c}/>
        <details className="htD-more"><summary>All {p.levelSkills.length} skills at this camp</summary><SkillList p={p} c={c}/></details>
        <p className="htD-quiet">{c.badges} of {c.levels.length} badges · {Math.round(P.minutes)} min this week · Camp {Math.min(P.level + 1, c.top)} opens {UNLOCKS[p.trail]}</p>
      </aside>
    </div>
  </main>
}

/** The drawn mountain: camps up a switchback, Hugo at the current camp. */
function DrawnMountain({levels, level, names, top}: {levels: number[]; level: number; names: Record<number, string>; top: number}) {
  const n = levels.length, pts = levels.map((l, i) => [i % 2 ? 236 : 124, 520 - i * (420 / Math.max(1, n - 1))])
  const path = 'M180 580 ' + pts.map(q => `L${q[0]} ${q[1]}`).join(' ')
  const ci = Math.max(0, levels.indexOf(level)), done = 'M180 580 ' + pts.slice(0, ci + 1).map(q => `L${q[0]} ${q[1]}`).join(' ')
  return <svg viewBox="0 0 360 600" role="img" aria-label={`Camp ${level} of ${n}`}>
    <path d="M0 600 L180 40 L360 600Z" fill="#a993ee"/><path d="M180 40 L360 600 L230 600Z" fill="#8466dc"/><path d="M0 600 L80 360 L140 600Z" fill="#c4b5f5"/>
    <path d="M180 40 L212 140 L192 126 L178 150 L160 124 L148 140Z" fill="#fff"/>
    <path d="M180 40 v-30 l22 8 l-22 8" fill="#e5484d" stroke="#291454" strokeWidth="2"/>
    <path d={path} fill="none" stroke="#291454" strokeOpacity=".35" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round"/>
    <path d={path} fill="none" stroke="#fff" strokeWidth="5" strokeDasharray="1 12" strokeLinecap="round" strokeLinejoin="round"/>
    <path d={done} fill="none" stroke="#f5a524" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    {pts.map((q, i) => { const l = levels[i], cur = l === level, d = l < level
      return <g key={l} transform={`translate(${q[0]} ${q[1]})`}>
        <circle r={cur ? 22 : 16} fill={d ? '#00aa98' : cur ? '#f5a524' : '#fff'} stroke={cur || d ? '#fff' : '#291454'} strokeWidth="4"/>
        {(cur || d) && <circle r={cur ? 26 : 19} fill="none" stroke="#291454" strokeWidth="2.5"/>}
        <text y="6" textAnchor="middle" fontSize={cur ? 20 : 15} fontWeight="900" fill={d || cur ? '#fff' : '#291454'}>{d ? '✓' : l}</text>
        <text x={i % 2 ? -32 : 32} y="6" textAnchor={i % 2 ? 'end' : 'start'} fontSize="13" fontWeight="900" fill="#291454" paintOrder="stroke" stroke="#fff" strokeWidth="4">{l === top ? 'Grade level' : `Camp ${l}`}</text>
      </g> })}
    <image href={hugoHiker} x={pts[ci][0] + (ci % 2 ? 20 : -96)} y={pts[ci][1] - 92} width="76" height="76"/>
    <text x={pts[ci][0]} y={pts[ci][1] + 46} textAnchor="middle" fontSize="13" fontWeight="900" fill="#a35f00" paintOrder="stroke" stroke="#fff" strokeWidth="4">{names[level]}</text>
  </svg>
}

/* ---------- Hippo Check: where the climb starts ---------- */
function HippoCheck({name, trail, onDone, onBack}: {name: string; trail: TrailCode; onDone: () => void; onBack: () => void}) {
  const qs: {q: string; scene?: Scene; ch: string[]}[] = trail === 'CC'
    ? [{q: 'How many counters?', scene: shownScene('TF', 8), ch: ['6', '8', '9']}, {q: 'What number comes after 12?', ch: ['11', '13', '20']}, {q: 'What number is the marker on?', scene: shownScene('NL', 15), ch: ['14', '15', '16']}]
    : [{q: 'How many in all?', scene: shownScene('TF', 7), ch: ['5', '7', '8']}, {q: 'Which is 10 and 4 more?', ch: ['14', '41', '104']}, {q: 'How many counters?', scene: shownScene('TF', 16), ch: ['15', '16', '61']}]
  const [i, setI] = useState(-1)
  const T = TRAILS[trail]
  return <main className="gw-world gw-detail"><div className="gw-detail-heading"><div>
      <button type="button" className="gw-back" onClick={onBack}>‹ My Learning</button>
      <span className="kg-plan-label ht-gold-text">Hippo Check · {name}</span><h1>{T.name}</h1></div></div>
    <section className="ht-card ht-narrow">
      {i < 0 ? <><span className="ht-eyebrow ht-eyebrow-gold">Hippo Check</span><h2>Let’s find your starting camp</h2>
        <p className="ht-prompt">A few questions show where your climb begins. This isn’t a test, and it’s okay to say “I’m not sure.”</p>
        <div className="ht-row"><span/><button type="button" className="ht-gold" onClick={() => setI(0)}>I’m ready →</button></div></>
      : i >= qs.length ? <div className="ht-center"><span className="ht-eyebrow ht-eyebrow-gold">Your starting camp</span><h2>Your climb starts at Level {START[trail].level}!</h2>
        <p className="ht-prompt">{T.name} · Camp {START[trail].level}: {T.levelNames[START[trail].level].toLowerCase()}.</p>
        <p className="ht-note">Every camp you reach makes your class math easier.</p>
        <div className="ht-row ht-row-center"><button type="button" className="ht-gold" onClick={onDone}>See my climb →</button></div></div>
      : <><p className="ht-count">Question {i + 1} of {qs.length}</p><div className="ht-bar"><i style={{width: `${(i + 1) / qs.length * 100}%`}}/></div>
        <h2>{qs[i].q}</h2>{qs[i].scene && <div className="ht-mat"><ToolView scene={qs[i].scene!}/></div>}
        <div className="ht-choices">{qs[i].ch.map(c => <button key={c} type="button" className="ht-choice" onClick={() => setI(i + 1)}>{c}</button>)}</div>
        <div className="ht-row"><span/><button type="button" className="ht-soft" onClick={() => setI(i + 1)}>I’m not sure</button></div></>}
    </section></main>
}

/* ---------- Quick review: skills already passed come back ---------- */
function QuickReview({trail, P, onBack}: {trail: TrailCode; P: Progress; onBack: () => void}) {
  const items = useMemo(() => skillsMastered(trail, P).filter(playable).slice(-3).map(s => ({skill: s, item: stepsFor(s).mastery.items[0] as Item})), [trail, P])
  const [i, setI] = useState(0), [picked, setPicked] = useState<number | null>(null), [right, setRight] = useState(0)
  return <main className="gw-world gw-detail"><div className="gw-detail-heading"><div>
      <button type="button" className="gw-back" onClick={onBack}>‹ My Learning</button>
      <span className="kg-plan-label">Quick review</span><h1>Keep your skills strong</h1></div></div>
    <section className="ht-card ht-narrow">
      {!items.length ? <><h2>Nothing to review yet</h2><p className="ht-prompt">Skills you master on your climb come back here.</p></>
      : i >= items.length ? <div className="ht-center"><h2>Nice work!</h2><p className="ht-prompt">{right} of {items.length} right.</p>
        <p className="ht-note">{right === items.length ? 'All of these skills are still strong.' : 'The tricky one comes back soon for practice.'}</p>
        <div className="ht-row ht-row-center"><button type="button" className="ht-go" onClick={onBack}>Back to My Learning →</button></div></div>
      : (() => { const {skill, item} = items[i]; return <>
        <span className="ht-eyebrow">Quick review · {i + 1} of {items.length}</span><p className="ht-count">{skill.name}</p>
        <p className="ht-prompt">{item.prompt}</p>{item.scene && <div className="ht-mat"><ToolView scene={item.scene}/></div>}
        <div className="ht-choices">{item.choices.map((c, j) => <button key={j} type="button" className="ht-choice" disabled={picked !== null} data-state={picked === j ? (j === item.answer ? 'right' : 'wrong') : undefined} onClick={() => { setPicked(j); if (j === item.answer) setRight(r => r + 1) }}>{c}</button>)}</div>
        <div aria-live="polite">{picked !== null && <div className="ht-fb" data-ok={picked === item.answer}>{picked === item.answer ? 'Still got it!' : 'Good try. This one will come back for practice.'}</div>}</div>
        {picked !== null && <div className="ht-row"><span/><button type="button" className="ht-go" onClick={() => { setI(i + 1); setPicked(null) }}>Next →</button></div>}
      </> })()}
    </section></main>
}


/* ---------- Entry rules: how a student gets on (and off) the climb. Draft numbers from the CMS rules page. ---------- */
function EntryRules({name, onBack}: {name: string; onBack: () => void}) {
  const step = (n: string, t: string, d: string, gold?: boolean) => <li className={gold ? 'gold' : undefined}><span>{n}</span><b>{t}</b><small>{d}</small></li>
  return <main className="gw-world gw-detail">
    <div className="gw-detail-heading"><div>
      <button type="button" className="gw-back" onClick={onBack}>‹ My Learning</button>
      <span className="kg-plan-label">Prototype · how it works</span>
      <h1>Who goes on the {name}</h1>
    </div></div>
    <section className="ht-rules">
      <ol className="ht-flow">
        {step('1', 'Low scores, or a teacher', 'Low scores start it; teachers can assign it too', true)}
        {step('2', 'Hippo Check', 'Finds the starting camp')}
        {step('3', 'The climb', 'That category’s core work waits', true)}
        {step('4', 'Grade-level summit', 'The last camp below the student’s grade. That’s the win.')}
        {step('5', 'Back to Know & Grow', 'Spiral review keeps skills strong', true)}
      </ol>
      <div className="ht-rule-grid">
        <article className="ht-rule"><h2>Starts on its own <em>Draft</em></h2><p>Repeated low grade-level scores in one category start the {name} for that category. No one has to approve it.</p>
          <dl><div><dt>Breakouts under the mastery mark</dt><dd>3 or more</dd></div><div><dt>Within</dt><dd>30 days</dd></div><div><dt>Counts toward a category when</dt><dd>The breakout’s standards tag to that category’s skills</dd></div><div><dt>Scope</dt><dd>Only that category</dd></div><div><dt>Teacher sees</dt><dd>“Started on its own” on Class Overview</dd></div></dl></article>
        <article className="ht-rule"><h2>A teacher assigns it</h2><p>From the teacher view, for any student.</p>
          <dl><div><dt>Scope</dt><dd>One category, or all of them</dd></div><div><dt>Shows in reports as</dt><dd>Teacher assigned</dd></div></dl></article>
        <article className="ht-rule"><h2>Hippo Check <em>Draft</em></h2><p>A short placement check, scored by rules. No AI.</p>
          <dl><div><dt>Starts at</dt><dd>One level below the student’s grade</dd></div><div><dt>Items per skill</dt><dd>2–3</dd></div><div><dt>Steps down after</dt><dd>2 misses</dd></div><div><dt>Next category in the same zone</dt><dd>No new check</dd></div></dl></article>
        <article className="ht-rule"><h2>While climbing</h2><p>Only the trail’s category changes; everything else stays in core.</p>
          <dl><div><dt>That category’s grade-level work</dt><dd>Waits</dd></div><div><dt>Other categories</dt><dd>Carry on in Know &amp; Grow</dd></div><div><dt>Skill pass mark</dt><dd>80% on the first try</dd></div><div><dt>Moves down a camp after</dt><dd>3 missed in a row · 4 in a step · 8 extras</dd></div></dl></article>
        <article className="ht-rule"><h2>Back to core</h2><p>The climb ends at grade level. Grade-level work belongs to Know &amp; Grow, so the {name} never goes past it.</p>
          <dl><div><dt>Summit</dt><dd>The last camp below the student’s grade</dd></div><div><dt>Leaves the trail</dt><dd>When the summit camp is mastered</dd></div><div><dt>Then</dt><dd>Spiral review at 1 week, 3 weeks, 6 weeks, then monthly</dd></div></dl></article>
        <article className="ht-rule ht-rule-decided"><h2>Decided</h2><p>Low scores start the {name} on their own, and teachers can also assign it to any student.</p>
          <p className="ht-note">Decided by Kennady, November 26, 2026.</p></article>
      </div>
    </section>
  </main>
}


/* ---------- Why it's quick to build: publishers review and approve; they don't build lessons ---------- */
function QuickToBuild({name, onBack}: {name: string; onBack: () => void}) {
  const step = (n: string, t: string, d: string, who: 'auto' | 'pub') => <li className={who === 'auto' ? 'gold' : undefined}><span>{n}</span><b>{t}</b><small>{d}</small><em>{who === 'auto' ? 'Automatic' : 'Publisher'}</em></li>
  return <main className="gw-world gw-detail">
    <div className="gw-detail-heading"><div>
      <button type="button" className="gw-back" onClick={onBack}>‹ My Learning</button>
      <span className="kg-plan-label">Prototype · how lessons get made</span>
      <h1>Why the {name} is quick to make</h1>
    </div></div>
    <section className="ht-rules">
      <p className="ht-lede">Publishers check and approve lessons. They don’t build them. Everything a lesson needs is already decided by the skill map, one lesson shape and a set of shared tools, so a draft appears on its own and the publisher’s job is to play it and say yes.</p>
      <ol className="ht-flow ht-flow-built">
        {step('1', 'Skill map', '219 skills, already planned', 'auto')}
        {step('2', 'Draft appears', 'Made from the skill map in seconds · $0', 'auto')}
        {step('3', 'Play it', 'As a student, in the preview', 'pub')}
        {step('4', 'Fix what’s off', 'A word, a number, a picture', 'pub')}
        {step('5', 'Approve', 'Or Feedback / Stuck with a note', 'pub')}
      </ol>
      <h2 className="ht-sec">Already done for every lesson</h2>
      <div className="ht-rule-grid">
        <article className="ht-rule"><h2>The plan is the skill map</h2><p>219 skills in 17 categories. Each one already has its level, the skill it builds on, its standards and its tools. No one designs a sequence lesson by lesson.</p></article>
        <article className="ht-rule"><h2>Every lesson has the same shape</h2><p>Warm-up, Show Me, Build together, Build it yourself, Show what you know. There’s no layout or flow to invent, and students always know what comes next.</p></article>
        <article className="ht-rule"><h2>The draft writes itself</h2><p>Rules turn the skill into a full lesson: numbers in the right range (a teen skill practices teens), the right tool, the Show Me moves, 8 practice problems, and warm-up and mastery questions. No AI is needed, so it costs nothing.</p></article>
        <article className="ht-rule"><h2>The tools check the answers</h2><p>Counters, ten frames, number lines and the rest know what the student built. There’s no answer key to write, and the hint for each kind of mistake comes from the tool.</p></article>
        <article className="ht-rule"><h2>The rules are set once</h2><p>More practice after a miss, moving down a level, the help ladder and the pass mark are one setting for every lesson, not something to build into each one.</p></article>
        <article className="ht-rule"><h2>One lesson feeds three places</h2><p>The same mastery questions are reused by Hippo Check (placement) and spiral review, so those don’t need their own content.</p></article>
      </div>
      <div className="ht-rule-grid">
        <article className="ht-rule ht-rule-decided"><h2>What a publisher does</h2><p>Open the draft, play it in the student preview, fix anything that’s off, then approve.</p>
          <dl><div><dt>Per skill</dt><dd>About an hour, mostly playing it</dd></div><div><dt>Counting &amp; Cardinality</dt><dd>21 skills · about 26 hours</dd></div><div><dt>All of K–5 math</dt><dd>219 skills · about 274 hours</dd></div><div><dt>AI cost to draft</dt><dd>$0 (rules, not AI)</dd></div></dl></article>
        <article className="ht-rule"><h2>What’s still real building</h2><p>The manipulatives, built once by developers and reused by every lesson that needs them.</p>
          <dl><div><dt>Built so far</dt><dd>Counters, linking cubes, ten frames, number lines, hundreds board</dd></div><div><dt>8 tools cover</dt><dd>The main tool for 141 of the 219 skills</dd></div><div><dt>Next to build</dt><dd>Place value chart, base-ten blocks, fraction bars</dd></div></dl></article>
      </div>
      <div className="ht-row ht-row-center"><a className="ht-gold ht-linkbtn" href="./cms.html">See the lesson builder in the CMS →</a></div>
    </section>
  </main>
}

/* ---------- Know & Grow adventures (the core, for contrast) ---------- */
function Adventures({onBack}: {onBack: () => void}) {
  return <main className="gw-world gw-plans">
    <button type="button" className="gw-back ht-back-float" onClick={onBack}>‹ My Learning</button>
    <header className="gw-intro">
      <div className="kg-mark"><span className="kg-orbit"><img src={hugoHead} alt=""/></span><span><small>THE</small><strong>Know <i>&amp;</i> <b>Grow</b> Cycle</strong></span></div>
      <span>MATH · ROUND 1</span><h1>Your next adventures await<span>.</span></h1><p>Your Know &amp; Grow Plan. One discovery at a time.</p><Subjects/>
    </header>
    <div className="gw-plan-grid">{KNOW_GROW.map((t, i) => <div key={t} className="gw-plan-island ht-after">
      <img src={ISLANDS[i]} alt=""/><span className="gw-plan-card"><span className="gw-plan-number">{i + 1}</span><span><strong>{t}</strong><small>The core Know &amp; Grow plan, shown for comparison</small></span></span></div>)}</div>
  </main>
}

/* ---------- Lesson page ---------- */
function LessonPage({name, skill, trailName, level, review, step, setStep, onBack, onDone}: {name: string; skill: KhiSkill; trailName: string; level: number; review: boolean; step: number; setStep: (n: number) => void; onBack: () => void; onDone: (o: Outcome) => void}) {
  return <main className="gw-world gw-detail ht-climb">
    <div className="gw-detail-heading">
      <div>
        <button type="button" className="gw-back" onClick={onBack}>‹ {trailName} climb</button>
        <span className="kg-plan-label ht-gold-text">{review ? `Review stop · ${name}` : `Camp ${level} · ${name}`}</span>
        <h1>{skill.name}</h1>
      </div>
      <div className="gw-journey ht-level-chip"><strong>Step {step + 1} of 5</strong>
        <div>{STEPS.map((n, k) => <span key={n} className={k < step ? 'done' : k === step ? 'current' : undefined}>{k < step ? '✓' : k + 1}</span>)}</div></div>
    </div>
    <section className="kg-journey ht-journey-gold">
      <TrailMark name={name}/>
      <ol>{STEPS.map((n, k) => <li key={n} className={k === step ? 'current' : undefined}><span>{k + 1}</span>{n}</li>)}</ol>
    </section>
    <Lesson skill={skill} step={step} setStep={setStep} onDone={onDone}/>
  </main>
}

/* ---------- Step back and Level up ---------- */
function StepBack({name, skill, pre, reason, level, onGo}: {name: string; skill: KhiSkill; pre?: KhiSkill; reason: string; level: number; onGo: () => void}) {
  return <main className="gw-world gw-detail ht-climb"><section className="ht-card ht-narrow">
    <span className="ht-eyebrow ht-eyebrow-gold">{name} · Step back</span>
    <h2>Let’s go back a step</h2>
    <p className="ht-why">Why: {reason}.</p>
    <p className="ht-prompt">{skill.name} builds on <b>{pre?.name ?? 'an earlier skill'}</b>{pre ? ` from Camp ${pre.level}` : ''}. A short review stop is now on your climb. Finish it, then come back to this skill.</p>
    <p className="ht-note">Your Camp {level} progress is saved. Your teacher can see you’re on a review stop.</p>
    <div className="ht-row"><span/><button type="button" className="ht-gold" onClick={onGo}>Go to my review stop →</button></div>
  </section></main>
}
function LevelUp({name, trail, level, P, onGo}: {name: string; trail: TrailCode; level: number; P: Progress; onGo: () => void}) {
  const T = TRAILS[trail], next = T.levelNames[level + 1]
  if (level >= summitLevel(trail)) {
    const cols = ['#f472b6', '#8b5cf6', '#14b8a6', '#f5a524', '#60a5fa']
    return <main className="gw-world gw-detail ht-climb"><section className="ht-card ht-narrow ht-celebrate">
      {Array.from({length: 34}, (_, i) => <i key={i} className="ht-conf" style={{left: `${(i * 37) % 100}%`, background: cols[i % 5], animationDelay: `${(i % 9) * .22}s`}}/>)}
      <img src={hugoHiker} alt="" style={{width: 140, justifySelf: 'center'}}/>
      <span className="ht-eyebrow ht-eyebrow-gold">{name} · summit</span>
      <h2>You’re at grade level in {T.name}!</h2>
      <p className="ht-prompt">You finished every camp below grade {studentGrade() === 0 ? 'K' : studentGrade()}, so you’re ready for grade-level work. That’s the whole climb.</p>
      <p className="ht-note">{T.name} goes back to your Know &amp; Grow adventures now, starting with {UNLOCKS[trail]}. Your climb skills keep coming back in quick reviews so they stay strong. You spent {Math.round(P.minutes)} minutes climbing this week.</p>
      <div className="ht-row ht-row-center"><button type="button" className="ht-gold" onClick={onGo}>Back to Know &amp; Grow →</button></div>
    </section></main>
  }
  const cols = ['#f472b6', '#8b5cf6', '#14b8a6', '#f5a524', '#60a5fa']
  const unlockNow = level + 1 >= 3
  return <main className="gw-world gw-detail ht-climb"><section className="ht-card ht-narrow ht-celebrate">
    {Array.from({length: 26}, (_, i) => <i key={i} className="ht-conf" style={{left: `${(i * 37) % 100}%`, background: cols[i % 5], animationDelay: `${(i % 9) * .25}s`}}/>)}
    <Badge n={level} earned size={96}/>
    <span className="ht-eyebrow ht-eyebrow-gold">{name}</span>
    <h2>Camp {level} badge earned!</h2>
    <p className="ht-prompt">{next ? `Level ${level + 1} is unlocked: ${next.toLowerCase()}.` : `You reached the summit of ${T.name}!`}</p>
    <p className="ht-note">{unlockNow ? `Your class math just got easier: ${UNLOCKS[trail]} in Know & Grow is ready when you are.` : `Your Level ${level} skills come back in quick reviews so they stay strong.`} You’ve spent {Math.round(P.minutes)} minutes climbing this week.</p>
    <div className="ht-row ht-row-center"><button type="button" className="ht-gold" onClick={onGo}>Keep climbing →</button></div>
  </section></main>
}

/* ---------- Math tools: free, any time ---------- */
const TOOLS: {code: ToolCode; name: string; about: string; start: Scene}[] = [
  {code: 'CTR', name: 'Counters', about: 'Count, add and take away', start: blankScene('CTR', 20)},
  {code: 'TF', name: 'Ten frames', about: 'See numbers to 20', start: blankScene('TF', 20)},
  {code: 'LC', name: 'Linking cubes', about: 'Build trains and compare', start: blankScene('LC', 20)},
  {code: 'NL', name: 'Number line', about: 'Count on and jump', start: blankScene('NL', 20)},
  {code: 'HB', name: 'Hundreds board', about: 'Find patterns to 100', start: blankScene('HB', 100)},
]
const SOON = ['Base-ten blocks', 'Place value chart', 'Fraction bars', 'Geoboard']
function Tools({onBack}: {onBack: () => void}) {
  const [pick, setPick] = useState<ToolCode>('TF'), [scenes, setScenes] = useState<Record<string, Scene>>(() => Object.fromEntries(TOOLS.map(t => [t.code, t.start])))
  const t = TOOLS.find(x => x.code === pick)!
  return <main className="gw-world gw-detail">
    <div className="gw-detail-heading"><div>
      <button type="button" className="gw-back" onClick={onBack}>‹ My Learning</button>
      <span className="kg-plan-label">Free for every student</span>
      <h1>Math tools</h1>
      <Subjects/>
    </div></div>
    <div className="ht-tools">
      {TOOLS.map(x => <button key={x.code} type="button" className="ht-tool" aria-pressed={pick === x.code} onClick={() => setPick(x.code)}><b>{x.name}</b><span>{x.about}</span></button>)}
      {SOON.map(n => <div key={n} className="ht-tool ht-soon"><b>{n}</b><span>Coming soon</span></div>)}
    </div>
    <section className="ht-card"><h2>{t.name}</h2><p className="ht-prompt">{t.about}. Use it for any math work.</p>
      <div className="ht-mat"><ToolView scene={scenes[pick]} onChange={s => setScenes(all => ({...all, [pick]: s}))} label={t.name}/></div></section>
  </main>
}

/* ---------- prototype screen bar (not part of KnowHippo) ---------- */
const SCREENS: [string, string][] = [['home', 'Home'], ['check', 'Hippo Check'], ['climb', 'Climb map'], ['lesson', 'Lesson'], ['levelup', 'Level up'], ['stepback', 'Step back'], ['review', 'Quick review'], ['tools', 'Math tools']]
function ScreenBar({active, onJump, name, onName, trail, level, onTrail, onLevel, onReset, grade, onGrade}: {active: string; onJump: (to: string) => void; name: TrailName; onName: (n: TrailName) => void; trail: TrailCode; level: number; onTrail: (t: TrailCode) => void; onLevel: (l: number) => void; onReset: () => void; grade: number; onGrade: (g: number) => void}) {
  return <nav className="ht-screenbar" aria-label="Prototype screens">
    <b>Prototype screens</b>
    <div className="ht-sb-screens">{SCREENS.map(([k, l]) => <button key={k} type="button" aria-current={active === k || (k === 'climb' && active === 'adventures') ? 'true' : undefined} onClick={() => onJump(k)}>{l}</button>)}</div>
    <div className="ht-sb-opts">
      <label>Name <select value={name} onChange={e => onName(e.target.value as TrailName)}>{NAMES.map(n => <option key={n}>{n}</option>)}</select></label>
      <label>Grade <select value={grade} onChange={e => onGrade(Number(e.target.value))}>{[0, 1, 2, 3, 4, 5].map(g => <option key={g} value={g}>{g === 0 ? 'K' : g}</option>)}</select></label>
      <label>Climb <select value={trail} onChange={e => onTrail(e.target.value as TrailCode)}>{(Object.keys(TRAILS) as TrailCode[]).map(t => <option key={t} value={t}>{TRAILS[t].name}</option>)}</select></label>
      <label>Level <select value={level} onChange={e => onLevel(Number(e.target.value))}>{climbLevels(trail).map(l => <option key={l} value={l}>{l}{l > TRAILS[trail].playableTo ? ' (preview)' : ''}</option>)}</select></label>
      <button type="button" onClick={onReset}>Start over</button>
    </div>
  </nav>
}
