// Hippo Trail in the KnowHippo student site: the adventures page, a trail page built like the live Know & Grow plan page, lessons,
// step back, level up and the free Math tools. Progress is kept in this browser only.
import {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react'
import {ToolView} from '@/components/khi-tools'
import {blankScene, isBuiltTool, type Scene, type ToolCode} from '@/lib/khi-steps'
import type {KhiSkill} from '@/lib/khi-contract'
import {TRAILS, byCode, levelsOf, playable, skillsOf, waitingOn, type TrailCode} from '../shared/trail'
import {Header, Subjects, TrailMark} from './Chrome'
import {NAMES, loadName, saveName, type TrailName} from '../shared/name'
import {Lesson, STEPS, type Outcome} from './Lesson'
import mathIsland from './art/math-island.webp'
import portalIsland from './art/portal-island.webp'
import bridgeIsland from './art/bridge-island.webp'
import towerIsland from './art/tower-island.webp'
import hippoPin from './art/hippo-position.webp'
import hugo from './art/hugo-hippo.png'

const ISLANDS = [mathIsland, portalIsland, bridgeIsland, towerIsland]

type Progress = {level: number; done: Record<string, number>; review: {code: string; from: string; reason: string} | null}
type View =
  | {name: 'adventures'} | {name: 'trail'} | {name: 'tools'}
  | {name: 'lesson'; code: string; step: number; review: boolean}
  | {name: 'stepback'; code: string; reason: string} | {name: 'levelup'; level: number}
const START: Record<TrailCode, Progress> = {
  CC: {level: 2, done: {'CC2.1': 100, 'CC2.2': 75}, review: null},
  PV: {level: 1, done: {}, review: null},
}
const KEY = 'hippo-trail-progress-v1'
const load = (): {trail: TrailCode; prog: Record<TrailCode, Progress>} => {
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s?.prog?.CC && s?.prog?.PV) return s } catch { /* ignore */ }
  return {trail: 'CC', prog: structuredClone(START)}
}

export function App() {
  const init = useMemo(load, [])
  const [name, setName] = useState<TrailName>(loadName)
  const [trail, setTrail] = useState<TrailCode>(init.trail), [prog, setProg] = useState(init.prog), [view, setView] = useState<View>({name: 'trail'})
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify({trail, prog})) } catch { /* ignore */ } }, [trail, prog])
  useEffect(() => { window.scrollTo(0, 0) }, [view.name, (view as {code?: string}).code])
  const P = prog[trail], T = TRAILS[trail]
  const levelSkills = skillsOf(trail).filter(s => s.level === P.level)
  const current = levelSkills.find(s => P.done[s.code] == null) ?? null
  const update = (f: (p: Progress) => Progress) => setProg(all => ({...all, [trail]: f(structuredClone(all[trail]))}))

  const finishLesson = (code: string, review: boolean, o: Outcome) => {
    if (o.kind === 'stepBack') {
      const s = byCode.get(code)!, pre = s.prereqs.find(c => byCode.get(c)?.category === s.category) ?? s.prereqs[0]
      if (review || !pre) { setView({name: 'trail'}); return }
      update(p => ({...p, review: {code: pre, from: code, reason: o.reason}}))
      setView({name: 'stepback', code, reason: o.reason}); return
    }
    if (review) { update(p => ({...p, review: null})); setView({name: 'trail'}); return }
    const next = {...P, done: {...P.done, [code]: o.pct}}
    update(() => next)
    const allDone = levelSkills.every(s => next.done[s.code] != null)
    setView(allDone ? {name: 'levelup', level: P.level} : {name: 'trail'})
  }

  let page: React.ReactNode
  if (view.name === 'adventures') page = <Adventures name={name} prog={prog} onTrail={t => { setTrail(t); setView({name: 'trail'}) }} onTools={() => setView({name: 'tools'})}/>
  else if (view.name === 'tools') page = <Tools onBack={() => setView({name: 'adventures'})}/>
  else if (view.name === 'lesson') {
    const s = byCode.get(view.code)!
    page = <LessonPage key={view.code + view.review} name={name} skill={s} trailName={T.name} level={P.level} review={view.review} step={view.step} setStep={n => setView({...view, step: n})}
      onBack={() => setView({name: 'trail'})} onDone={o => finishLesson(view.code, view.review, o)}/>
  } else if (view.name === 'stepback') page = <StepBack skill={byCode.get(view.code)!} pre={byCode.get(P.review?.code ?? '')} reason={view.reason} level={P.level} onGo={() => setView({name: 'trail'})}/>
  else if (view.name === 'levelup') page = <LevelUp trail={trail} level={view.level} onGo={() => { update(p => ({...p, level: Math.min(p.level + 1, Math.max(...levelsOf(trail))), review: null})); setView({name: 'trail'}) }}/>
  else page = <Trail name={name} trail={trail} P={P} current={current} levelSkills={levelSkills} onBack={() => setView({name: 'adventures'})}
    onPlay={(code, review) => setView({name: 'lesson', code, step: 0, review})} onLevelUp={() => setView({name: 'levelup', level: P.level})}/>

  return <>
    <DemoBar name={name} onName={n => { setName(n); saveName(n) }} trail={trail} level={P.level} onTrail={t => { setTrail(t); setView({name: 'trail'}) }}
      onLevel={l => { update(p => ({...p, level: l, review: null})); setView({name: 'trail'}) }}
      onReset={() => { setProg(structuredClone(START)); setTrail('CC'); setView({name: 'trail'}) }}/>
    <div className="student-world">
      <Header onHome={() => setView({name: 'adventures'})}/>
      <Subjects/>
      {page}
    </div>
  </>
}

/* ---------- My adventures: the live overview, with the Hippo Trail first ---------- */
const KNOW_GROW = ['Represent Data', 'Multiplicative Comparison', 'Represent Numbers', 'Rounding Numbers']
function Adventures({name, prog, onTrail, onTools}: {name: string; prog: Record<TrailCode, Progress>; onTrail: (t: TrailCode) => void; onTools: () => void}) {
  const card = (t: TrailCode, i: number) => {
    const P = prog[t], levels = levelsOf(t)
    return <button key={t} type="button" className="gw-plan-island" onClick={() => onTrail(t)}>
      <img src={ISLANDS[i]} alt=""/>
      <span className="gw-plan-card"><span className="gw-plan-number">{i + 1}</span>
        <span><strong>{TRAILS[t].name}</strong>
          <span className="gw-mini-path">{levels.map(l => <i key={l} className={l < P.level ? 'done' : undefined}>{l < P.level ? '✓' : ''}</i>)}</span>
          <small>Level {P.level} of {levels.length}</small></span>
        <span>→</span></span>
    </button>
  }
  return <main className="gw-world gw-plans">
    <header className="gw-intro">
      <TrailMark name={name}/>
      <span>MATH · {name.toUpperCase()}</span>
      <h1>Your climb is waiting<span>.</span></h1>
      <p>Finish your trail, then your next adventures open.</p>
    </header>
    <div className="gw-plan-grid">
      {card('CC', 0)}{card('PV', 1)}
      <button type="button" className="gw-plan-island" onClick={onTools}>
        <img src={ISLANDS[2]} alt=""/>
        <span className="gw-plan-card"><span className="gw-plan-number">✦</span><span><strong>Math tools</strong><small>Free · use them for any math work</small></span><span>→</span></span>
      </button>
      <div className="gw-plan-island ht-after" aria-label="Know and Grow adventures, after your trail">
        <img src={ISLANDS[3]} alt=""/>
        <span className="gw-plan-card"><span className="gw-plan-number">4</span><span><strong>{KNOW_GROW[0]}</strong><small>Opens after your trail</small></span></span>
      </div>
    </div>
    <div className="gw-guide"><div className="gw-hippo-sprite gw-pose-point"/><p>Pick up your trail.<br/><strong>You’ve got this, Henry!</strong></p></div>
  </main>
}

/* ---------- The trail page, built like the live Know & Grow plan page ---------- */
type Stop = {key: string; type: string; stage: string; title: string; status: string; state: 'done' | 'current' | 'later'; skill?: KhiSkill; score?: string; review?: boolean; locked?: string}
function Trail({name, trail, P, current, levelSkills, onBack, onPlay, onLevelUp}: {name: string; trail: TrailCode; P: Progress; current: KhiSkill | null; levelSkills: KhiSkill[]; onBack: () => void; onPlay: (code: string, review: boolean) => void; onLevelUp: () => void}) {
  const T = TRAILS[trail], levels = levelsOf(trail), last = Math.max(...levels)
  const stops: Stop[] = []
  for (const s of levelSkills) {
    if (P.review && current && s.code === current.code) {
      const pre = byCode.get(P.review.code)!
      stops.push({key: 'review', type: 'Review stop', stage: 'Review', title: pre.name, status: `From Level ${pre.level} · about 8 minutes`, state: 'current', skill: pre, review: true})
    }
    const done = P.done[s.code] != null, isCur = !!current && s.code === current.code && !P.review, lock = !playable(s)
    stops.push({key: s.code, type: `Level ${P.level} skill`, stage: done ? 'Done' : 'Build', title: s.name, skill: s,
      status: done ? 'Finished' : lock ? `Needs the ${waitingOn(s)} · coming soon` : isCur ? 'Up next' : 'Ahead on your trail',
      state: done ? 'done' : isCur ? 'current' : 'later', score: done ? `${P.done[s.code]}%` : undefined, locked: lock ? waitingOn(s) : undefined})
  }
  if (P.level < last) stops.push({key: 'next', type: 'Level up', stage: 'Next level', title: `Level ${P.level + 1}: ${T.levelNames[P.level + 1]}`, status: `Opens when you finish Level ${P.level}`, state: !current ? 'current' : 'later'})
  const finished = stops.filter(s => s.state === 'done').length
  const curStop = stops.find(s => s.state === 'current')
  const pathRef = useRef<HTMLDivElement>(null), [segs, setSegs] = useState<string[]>([])
  useLayoutEffect(() => {
    const draw = () => {
      const box = pathRef.current; if (!box) return
      const b = box.getBoundingClientRect(), pts = [...box.querySelectorAll<HTMLImageElement>('.gw-island')].map(i => { const r = i.getBoundingClientRect(); return [r.left - b.left + r.width / 2, r.top - b.top + r.height / 2] })
      const mid = b.width / 2
      setSegs(pts.slice(1).map((p, k) => { const a = pts[k]; return `M ${a[0]} ${a[1]} C ${mid} ${a[1]}, ${mid} ${p[1]}, ${p[0]} ${p[1]}` }))
    }
    draw(); const ro = new ResizeObserver(draw); if (pathRef.current) ro.observe(pathRef.current)
    const imgs = [...(pathRef.current?.querySelectorAll('img') ?? [])]; imgs.forEach(i => i.addEventListener('load', draw))
    return () => { ro.disconnect(); imgs.forEach(i => i.removeEventListener('load', draw)) }
  }, [stops.length, trail, P.level])
  const curSkill = curStop?.skill, curTools = curSkill ? curSkill.tools.filter(isBuiltTool) : []
  const play = (s: Stop) => { if (s.skill && !s.locked && s.state !== 'later') onPlay(s.skill.code, !!s.review) }
  return <main className="gw-world gw-detail">
    <div className="gw-detail-heading">
      <div>
        <button type="button" className="gw-back" onClick={onBack}>‹ My adventures</button>
        <span className="kg-plan-label">Your {name} · Level {P.level}</span>
        <h1>{T.name}</h1>
        <details className="gw-info"><summary>i</summary><p>Level {P.level} of {levels.length}: {T.levelNames[P.level]}. Every trail starts at Level 1 and you climb one level at a time.</p></details>
      </div>
      <div className="gw-journey"><strong>{finished} of {stops.length} stops finished</strong>
        <div>{stops.map((s, k) => <span key={s.key} className={s.state === 'done' ? 'done' : s.state === 'current' ? 'current' : undefined}>{s.state === 'done' ? '✓' : k + 1}</span>)}</div></div>
    </div>
    <section className="kg-journey">
      <TrailMark name={name}/>
      <ol>{STEPS.map((n, k) => <li key={n}><span>{k + 1}</span>{n}</li>)}</ol>
      <details><summary>How your {nameWordLower(name)} works</summary><p>Each stop is one skill in five steps. Watch Show Me, build it with the tools, then show what you know. If something is tricky you get more practice, and a review stop if you need it. Finish every stop to open the next level.</p></details>
    </section>
    <div className="gw-path" ref={pathRef}>
      <svg className="gw-trail" aria-hidden="true">{segs.map((d, k) => <path key={k} d={d}/>)}</svg>
      {stops.map((s, k) => <article key={s.key} className={`gw-stop ${s.state}`}>
        <img className="gw-island" src={ISLANDS[k % 4]} alt=""/>
        {s.state === 'current' && <div className="gw-pin"><img src={hippoPin} alt="You are here"/></div>}
        <div className={`gw-stop-label${s.skill && !s.locked && s.state !== 'later' ? ' ht-clickable' : ''}`} onClick={() => play(s)} role={s.skill && !s.locked && s.state !== 'later' ? 'button' : undefined} tabIndex={s.skill && !s.locked && s.state !== 'later' ? 0 : undefined} onKeyDown={e => { if (e.key === 'Enter') play(s) }}>
          <span className="gw-stop-type">{s.type}</span>
          <span className="gw-stop-number">{s.state === 'done' ? '✓' : k + 1}</span>
          <div><span className="kg-stage">{s.stage}</span><strong>{s.title}</strong><small>{s.status}</small></div>
          {s.score && <span className="gw-score">{s.score}</span>}
        </div>
        {s.state === 'current' && s.skill && <div className="gw-warmup">
          <div className="gw-warmup-intro"><img src={hugo} alt=""/><div><span className="gw-warmup-eyebrow">Show Me first</span><strong>Hippo Show Me</strong><span>Watch it on the {curTools.length ? curTools.map(t => toolLabel(t)).slice(0, 2).join(' and ') : 'tools'}</span></div><span className="gw-warmup-spark">✦</span></div>
          <div className="gw-warmup-sequence"><span><b>1</b>Show Me</span><span>→</span><span><b>2</b>Build it</span></div>
        </div>}
      </article>)}
    </div>
    {curStop && <div className="gw-action-dock">
      <div><strong>{curStop.review ? `Review stop: ${curStop.title}` : curStop.skill ? curStop.title : `Level ${P.level} complete!`}</strong>
        <span>{curStop.skill ? (curStop.locked ? `Needs the ${curStop.locked}` : '5 steps · about 10 minutes') : `Level ${P.level + 1} is ready`}</span></div>
      {curStop.skill ? (!curStop.locked && <button type="button" onClick={() => play(curStop)}>{curStop.review ? 'Start review →' : 'Continue trail →'}</button>)
        : <button type="button" onClick={onLevelUp}>Level up →</button>}
    </div>}
  </main>
}
const nameWordLower = (n: string) => n.replace(/^Hippo /, '').toLowerCase()
const toolLabel = (t: string) => ({CTR: 'counters', LC: 'linking cubes', TF: 'ten frames', NL: 'number line', HB: 'hundreds board'} as Record<string, string>)[t] ?? t

/* ---------- Lesson page ---------- */
function LessonPage({name, skill, trailName, level, review, step, setStep, onBack, onDone}: {name: string; skill: KhiSkill; trailName: string; level: number; review: boolean; step: number; setStep: (n: number) => void; onBack: () => void; onDone: (o: Outcome) => void}) {
  return <main className="gw-world gw-detail">
    <div className="gw-detail-heading">
      <div>
        <button type="button" className="gw-back" onClick={onBack}>‹ {trailName}</button>
        <span className="kg-plan-label">{review ? 'Review stop' : `Level ${level} · ${name}`}</span>
        <h1>{skill.name}</h1>
      </div>
      <div className="gw-journey"><strong>Step {step + 1} of 5</strong>
        <div>{STEPS.map((n, k) => <span key={n} className={k < step ? 'done' : k === step ? 'current' : undefined}>{k < step ? '✓' : k + 1}</span>)}</div></div>
    </div>
    <section className="kg-journey">
      <TrailMark name={name}/>
      <ol>{STEPS.map((n, k) => <li key={n} className={k === step ? 'current' : undefined}><span>{k + 1}</span>{n}</li>)}</ol>
    </section>
    <Lesson skill={skill} step={step} setStep={setStep} onDone={onDone}/>
  </main>
}

/* ---------- Step back and Level up ---------- */
function StepBack({skill, pre, reason, level, onGo}: {skill: KhiSkill; pre?: KhiSkill; reason: string; level: number; onGo: () => void}) {
  return <main className="gw-world gw-detail"><section className="ht-card ht-narrow">
    <span className="ht-eyebrow">Step back</span>
    <h2>Let’s go back a step</h2>
    <p className="ht-why">Why: {reason}.</p>
    <p className="ht-prompt">{skill.name} builds on <b>{pre?.name ?? 'an earlier skill'}</b>{pre ? ` from Level ${pre.level}` : ''}. A short review stop is now on your trail. Finish it, then come back to this skill.</p>
    <p className="ht-note">Your Level {level} progress is saved. Your teacher can see you’re on a review stop.</p>
    <div className="ht-row"><span/><button type="button" className="ht-go" onClick={onGo}>Go to my review stop →</button></div>
  </section></main>
}
function LevelUp({trail, level, onGo}: {trail: TrailCode; level: number; onGo: () => void}) {
  const T = TRAILS[trail], next = T.levelNames[level + 1]
  const cols = ['#f472b6', '#8b5cf6', '#14b8a6', '#f7b733', '#60a5fa']
  return <main className="gw-world gw-detail"><section className="ht-card ht-narrow ht-celebrate">
    {Array.from({length: 26}, (_, i) => <i key={i} className="ht-conf" style={{left: `${(i * 37) % 100}%`, background: cols[i % 5], animationDelay: `${(i % 9) * .25}s`}}/>)}
    <div className="ht-stars" aria-hidden="true">★★★</div>
    <h2>Level {level} complete!</h2>
    <p className="ht-prompt">{next ? `Level ${level + 1} is unlocked: ${next.toLowerCase()}.` : `You finished the ${T.name} trail!`}</p>
    <p className="ht-note">Your skills from Level {level} will come back in quick reviews so they stay strong.</p>
    <div className="ht-row ht-row-center"><button type="button" className="ht-go" onClick={onGo}>Keep climbing →</button></div>
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
      <button type="button" className="gw-back" onClick={onBack}>‹ My adventures</button>
      <span className="kg-plan-label">Free for every student</span>
      <h1>Math tools</h1>
    </div></div>
    <div className="ht-tools">
      {TOOLS.map(x => <button key={x.code} type="button" className="ht-tool" aria-pressed={pick === x.code} onClick={() => setPick(x.code)}><b>{x.name}</b><span>{x.about}</span></button>)}
      {SOON.map(n => <div key={n} className="ht-tool ht-soon"><b>{n}</b><span>Coming soon</span></div>)}
    </div>
    <section className="ht-card"><h2>{t.name}</h2><p className="ht-prompt">{t.about}. Use it for any math work.</p>
      <div className="ht-mat"><ToolView scene={scenes[pick]} onChange={s => setScenes(all => ({...all, [pick]: s}))} label={t.name}/></div></section>
  </main>
}

/* ---------- prototype controls (not part of KnowHippo) ---------- */
function DemoBar({name, onName, trail, level, onTrail, onLevel, onReset}: {name: TrailName; onName: (n: TrailName) => void; trail: TrailCode; level: number; onTrail: (t: TrailCode) => void; onLevel: (l: number) => void; onReset: () => void}) {
  return <nav className="ht-demo" aria-label="Prototype controls">
    <b>Prototype</b><small>Not part of KnowHippo</small>
    <label>Name <select value={name} onChange={e => onName(e.target.value as TrailName)}>{NAMES.map(n => <option key={n}>{n}</option>)}</select></label>
    <label>Trail <select value={trail} onChange={e => onTrail(e.target.value as TrailCode)}>{(Object.keys(TRAILS) as TrailCode[]).map(t => <option key={t} value={t}>{TRAILS[t].name}</option>)}</select></label>
    <label>Level <select value={level} onChange={e => onLevel(Number(e.target.value))}>{levelsOf(trail).map(l => <option key={l} value={l}>{l}{l > TRAILS[trail].playableTo ? ' (preview)' : ''}</option>)}</select></label>
    <button type="button" onClick={onReset}>Start over</button>
    <a href="./plan.html">Publisher and costs ↗</a>
  </nav>
}
