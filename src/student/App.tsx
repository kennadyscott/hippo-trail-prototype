// The Hippo Trail (working name) inside the KnowHippo student site. It keeps the live site's header, art and type, but has its own look
// so a student knows they are building skills: a gold "power-up climb" up one mountain (levels are camps), Hugo as coach, badges,
// time spent, and what the climb unlocks in Know & Grow. Screens: Home, Hippo Check, the climb, lessons, step back, level up,
// quick review, Math tools, and the Know & Grow adventures. Progress is kept in this browser only.
import {useEffect, useMemo, useState} from 'react'
import {ToolView} from '@/components/khi-tools'
import {blankScene, isBuiltTool, shownScene, type Item, type Scene, type ToolCode} from '@/lib/khi-steps'
import type {KhiSkill} from '@/lib/khi-contract'
import {TRAILS, byCode, levelsOf, playable, skillsOf, stepsFor, waitingOn, type TrailCode} from '../shared/trail'
import {Header, Subjects, TrailMark} from './Chrome'
import {Lesson, STEPS, type Outcome} from './Lesson'
import {NAMES, loadName, saveName, type TrailName} from '../shared/name'
import mathIsland from './art/math-island.webp'
import portalIsland from './art/portal-island.webp'
import bridgeIsland from './art/bridge-island.webp'
import towerIsland from './art/tower-island.webp'
import hugo from './art/hugo-hippo.png'
import hugoHead from './art/hugo-head.png'

const ISLANDS = [mathIsland, portalIsland, bridgeIsland, towerIsland]
const KNOW_GROW = ['Represent Data', 'Multiplicative Comparison', 'Represent Numbers', 'Rounding Numbers']
/** The Know & Grow adventure each climb opens up (example pairing for the prototype). */
const UNLOCKS: Record<TrailCode, string> = {CC: 'Represent Numbers', PV: 'Rounding Numbers'}

type Progress = {level: number; done: Record<string, number>; review: {code: string; from: string; reason: string} | null; minutes: number; started: string}
type View =
  | {name: 'home'} | {name: 'check'} | {name: 'climb'} | {name: 'review'} | {name: 'tools'} | {name: 'adventures'}
  | {name: 'lesson'; code: string; step: number; review: boolean}
  | {name: 'stepback'; code: string; reason: string} | {name: 'levelup'; level: number}
const START: Record<TrailCode, Progress> = {
  CC: {level: 2, done: {'CC2.1': 100, 'CC2.2': 75}, review: null, minutes: 42, started: 'Nov 3'},
  PV: {level: 1, done: {}, review: null, minutes: 0, started: 'Nov 24'},
}
const KEY = 'hippo-trail-progress-v2'
const load = (): {trail: TrailCode; prog: Record<TrailCode, Progress>} => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s?.prog?.CC?.started && s?.prog?.PV?.started) return s } catch { /* ignore */ }
  return {trail: 'CC', prog: structuredClone(START)}
}
const LESSON_MINUTES = 10

export function App() {
  const init = useMemo(load, [])
  const [name, setName] = useState<TrailName>(loadName)
  const [trail, setTrail] = useState<TrailCode>(init.trail), [prog, setProg] = useState(init.prog), [view, setView] = useState<View>({name: 'home'})
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
  const levelUp = () => { update(p => ({...p, level: Math.min(p.level + 1, Math.max(...levelsOf(trail))), review: null})); setView({name: 'climb'}) }
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
    case 'lesson': {
      const s = byCode.get(view.code)!
      page = <LessonPage key={view.code + view.review} name={name} skill={s} trailName={T.name} level={P.level} review={view.review} step={view.step} setStep={n => setView({...view, step: n})}
        onBack={() => setView({name: 'climb'})} onDone={o => finishLesson(view.code, view.review, o)}/>
      break
    }
    case 'stepback': page = <StepBack name={name} skill={byCode.get(view.code)!} pre={byCode.get(P.review?.code ?? '')} reason={view.reason} level={P.level} onGo={() => setView({name: 'climb'})}/>; break
    case 'levelup': page = <LevelUp name={name} trail={trail} level={view.level} P={P} onGo={levelUp}/>; break
    default: page = <Climb name={name} trail={trail} P={P} current={current} levelSkills={levelSkills} onBack={() => setView({name: 'home'})} onPlay={play} onLevelUp={() => setView({name: 'levelup', level: P.level})}/>
  }

  return <>
    <nav className="pt-switch" aria-label="Prototype view"><b>Prototype</b><span>View as</span><a href="./" aria-current="page">Student</a><a href="./teacher.html">Teacher</a><a href="./cms.html">CMS</a><small>Not part of KnowHippo</small></nav>
    <div className="student-world ht-has-bar">
      <Header onHome={() => setView({name: 'home'})}/>
      {page}
    </div>
    <ScreenBar active={view.name} onJump={jump} name={name} onName={n => { setName(n); saveName(n) }} trail={trail} level={P.level}
      onTrail={t => { setTrail(t); setView({name: 'climb'}) }} onLevel={l => { update(p => ({...p, level: l, review: null})); setView({name: 'climb'}) }}
      onReset={() => { setProg(structuredClone(START)); setTrail('CC'); setView({name: 'home'}) }}/>
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
        <h3>{T.name} · Level {P.level}</h3>
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

/* ---------- The climb: one mountain, levels as camps ---------- */
function Climb({name, trail, P, current, levelSkills, onBack, onPlay, onLevelUp}: {name: string; trail: TrailCode; P: Progress; current: KhiSkill | null; levelSkills: KhiSkill[]; onBack: () => void; onPlay: (code: string, review?: boolean) => void; onLevelUp: () => void}) {
  const T = TRAILS[trail], levels = levelsOf(trail), top = Math.max(...levels)
  const done = levelSkills.filter(s => P.done[s.code] != null).length, left = levelSkills.length - done
  const mastered = skillsMastered(trail, P), badges = levels.filter(l => l < P.level).length
  const pre = P.review ? byCode.get(P.review.code) : undefined
  const tools = current ? current.tools.filter(isBuiltTool) : []
  return <main className="gw-world gw-detail ht-climb">
    <div className="gw-detail-heading">
      <div>
        <button type="button" className="gw-back" onClick={onBack}>‹ My Learning</button>
        <span className="kg-plan-label ht-gold-text">Your power-up climb · {name}</span>
        <h1>{T.name}</h1>
        <Subjects/>
      </div>
      <div className="gw-journey ht-level-chip"><strong>Level {P.level} of {levels.length}</strong>
        <div>{levels.map(l => <span key={l} className={l < P.level ? 'done' : l === P.level ? 'current' : undefined}>{l < P.level ? '✓' : l}</span>)}</div></div>
    </div>

    <section className="ht-coach">
      <img src={hugo} alt=""/>
      <div><span>{name.toUpperCase()} · POWER-UP</span><strong>Every camp you reach makes your class math easier.</strong></div>
      <em>{left > 0 ? `You’re ${left} skill${left > 1 ? 's' : ''} from Camp ${Math.min(P.level + 1, top)}!` : `Camp ${P.level} done. Level up!`}</em>
      <div className="ht-next">
        <small>{pre ? 'Review stop · about 8 minutes' : current ? (playable(current) ? `Next · 5 steps on the ${tools.slice(0, 2).map(t => TOOL_WORDS[t] ?? t).join(' and ') || 'tools'}` : `Needs the ${waitingOn(current)}`) : 'Earn your badge'}</small>
        <b>{pre ? pre.name : current ? current.name : `Camp ${P.level} complete!`}</b>
      </div>
      {pre ? <button type="button" className="ht-gold" onClick={() => onPlay(pre.code, true)}>Start review →</button>
        : current ? (playable(current) && <button type="button" className="ht-gold" onClick={() => onPlay(current.code)}>Continue climb →</button>)
        : <button type="button" className="ht-gold" onClick={onLevelUp}>Level up →</button>}
    </section>

    <div className="ht-climb-grid">
      <section className="ht-mtn" aria-label={`${T.name} climb`}>
        <Mountain levels={levels} level={P.level}/>
        <ol className="ht-camps">
          {[...levels].reverse().map(l => {
            const isCur = l === P.level, isDone = l < P.level
            return <li key={l} className={isCur ? 'cur' : isDone ? 'done' : 'later'}>
              <div className="ht-camp-head">
                <span className="ht-camp-dot">{isDone ? '✓' : l === top ? '⚑' : l}</span>
                <span><small>{l === top ? 'Summit' : `Camp ${l}`}</small><b>{T.levelNames[l]}</b></span>
                {isDone && <Badge n={l} earned size={28}/>}
                {isCur && <span className="ht-here"><img src={hugoHead} alt=""/>You are here</span>}
              </div>
              {isCur && <div className="ht-camp-body">
                <div className="ht-seg">{levelSkills.map(s => <i key={s.code} data-s={P.done[s.code] != null ? 'done' : s === current ? 'now' : undefined}/>)}</div>
                <p className="ht-camp-sum">{done} of {levelSkills.length} skills mastered</p>
                <ul className="ht-skills">
                  {pre && <li><button type="button" className="ht-skill ht-skill-review" onClick={() => onPlay(pre.code, true)}><span className="ht-sdot">↩</span><span><b>Review stop: {pre.name}</b><small>From Level {pre.level} · about 8 minutes</small></span><span className="ht-go-mini">Start</span></button></li>}
                  {levelSkills.map(s => {
                    const d = P.done[s.code] != null, now = s === current && !pre, lock = !playable(s)
                    const can = !lock && (d || now)
                    return <li key={s.code}><button type="button" className={`ht-skill${now ? ' now' : ''}${d ? ' done' : ''}`} disabled={!can} onClick={() => onPlay(s.code)}>
                      <span className="ht-sdot">{d ? '✓' : now ? '▶' : '·'}</span>
                      <span><b>{s.name}</b><small>{d ? `Mastered · ${P.done[s.code]}%` : lock ? `Needs the ${waitingOn(s)} · coming soon` : now ? 'Up next · about 10 minutes' : 'Ahead on your climb'}</small></span>
                      {d ? <span className="ht-again">Play again</span> : now ? <span className="ht-go-mini">Start</span> : null}
                    </button></li>
                  })}
                </ul>
              </div>}
            </li>
          })}
          <li className="done ht-base"><div className="ht-camp-head"><span className="ht-camp-dot">⛺</span><span><small>Base camp</small><b>Started {P.started}</b></span></div></li>
        </ol>
      </section>

      <aside className="ht-side">
        <div className="ht-stats">
          <div><small>Levels climbed</small><b>{P.level - 1}</b></div>
          <div><small>Skills mastered</small><b>{mastered.length}</b></div>
          <div><small>This week</small><b>{Math.round(P.minutes)} min</b></div>
          <div><small>Badges</small><b>{badges} of {levels.length}</b></div>
        </div>
        <div className="ht-panel ht-unlock"><small>What this unlocks</small><p>🔑 Finish Camp {Math.min(P.level + 1, top)} to open <b>{UNLOCKS[trail]}</b> in Know &amp; Grow.</p></div>
        <div className="ht-panel"><small>Your badges</small><div className="ht-badges">{levels.map(l => <Badge key={l} n={l} earned={l < P.level}/>)}</div></div>
        <div className="ht-panel"><small>Skills you’ve built</small>
          <div className="ht-chips">{mastered.length ? mastered.slice(-6).reverse().map(s => <span key={s.code}>{shortName(s.name)}</span>) : <em>Your first skill shows up here.</em>}{mastered.length > 6 && <em>+{mastered.length - 6} more</em>}</div></div>
      </aside>
    </div>

  </main>
}
const TOOL_WORDS: Record<string, string> = {CTR: 'counters', LC: 'linking cubes', TF: 'ten frames', NL: 'number line', HB: 'hundreds board'}

function Mountain({levels, level}: {levels: number[]; level: number}) {
  const n = levels.length, pts = levels.map((l, i) => [i % 2 ? 190 : 110, 470 - i * (400 / Math.max(1, n - 1))])
  const path = 'M150 500 ' + pts.map(p => `L${p[0]} ${p[1]}`).join(' ')
  return <svg className="ht-mtn-art" viewBox="0 0 300 520" aria-hidden="true">
    <path d="M0 520 L150 30 L300 520Z" fill="#9b7fe8"/><path d="M150 30 L300 520 L190 520Z" fill="#7c5bd6"/><path d="M0 520 L70 300 L120 520Z" fill="#b9a5f2"/>
    <path d="M150 30 L178 120 L160 108 L148 128 L132 106 L122 120Z" fill="#fff"/>
    <path d={path} fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity=".9"/>
    <path d={path} fill="none" stroke="#f5a524" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round"/>
    {pts.map((p, i) => { const l = levels[i]; return <g key={l} transform={`translate(${p[0]} ${p[1]})`}>
      <circle r={l === level ? 17 : 13} fill={l < level ? '#00aa98' : l === level ? '#f5a524' : '#e9e3fb'} stroke="#fff" strokeWidth="4"/>
      <text y="5" textAnchor="middle" fontSize="13" fontWeight="900" fill={l <= level ? '#fff' : '#8b7fb8'}>{l < level ? '✓' : l}</text>
    </g> })}
    <path d="M150 30 v-26 l18 7 l-18 7" fill="#e5484d" stroke="#291454" strokeWidth="2"/>
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
function ScreenBar({active, onJump, name, onName, trail, level, onTrail, onLevel, onReset}: {active: string; onJump: (to: string) => void; name: TrailName; onName: (n: TrailName) => void; trail: TrailCode; level: number; onTrail: (t: TrailCode) => void; onLevel: (l: number) => void; onReset: () => void}) {
  return <nav className="ht-screenbar" aria-label="Prototype screens">
    <b>Prototype screens</b>
    <div className="ht-sb-screens">{SCREENS.map(([k, l]) => <button key={k} type="button" aria-current={active === k || (k === 'climb' && active === 'adventures') ? 'true' : undefined} onClick={() => onJump(k)}>{l}</button>)}</div>
    <div className="ht-sb-opts">
      <label>Name <select value={name} onChange={e => onName(e.target.value as TrailName)}>{NAMES.map(n => <option key={n}>{n}</option>)}</select></label>
      <label>Climb <select value={trail} onChange={e => onTrail(e.target.value as TrailCode)}>{(Object.keys(TRAILS) as TrailCode[]).map(t => <option key={t} value={t}>{TRAILS[t].name}</option>)}</select></label>
      <label>Level <select value={level} onChange={e => onLevel(Number(e.target.value))}>{levelsOf(trail).map(l => <option key={l} value={l}>{l}{l > TRAILS[trail].playableTo ? ' (preview)' : ''}</option>)}</select></label>
      <button type="button" onClick={onReset}>Start over</button>
    </div>
  </nav>
}
