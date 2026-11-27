// One Hippo Trail lesson in five steps, played on the real tools with the real checking, hints and practice rules (src/khi, copied from the CMS).
import {useEffect, useMemo, useRef, useState} from 'react'
import {ToolView} from '@/components/khi-tools'
import {applyMove, blankScene, checkBuild, fillHint, likeProblem, sceneNumber, shownScene, type Item, type LessonSteps, type Problem, type Scene, type ToolCode} from '@/lib/khi-steps'
import type {KhiSkill} from '@/lib/khi-contract'
import {byCode, stepsFor} from '../shared/trail'
import hugo from './art/hugo-hippo.png'

export const STEPS = ['Warm-up', 'Show Me', 'Build together', 'Build it yourself', 'Show what you know'] as const
export type Outcome = {kind: 'passed'; pct: number} | {kind: 'stepBack'; reason: string}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function Help({title, children}: {title: string; children: React.ReactNode}) {
  return <div className="ht-help"><img src={hugo} alt=""/><div><b>{title}</b><div>{children}</div></div></div>
}
function Go({children, onClick, soft, disabled}: {children: React.ReactNode; onClick?: () => void; soft?: boolean; disabled?: boolean}) {
  return <button type="button" className={soft ? 'ht-soft' : 'ht-go'} onClick={onClick} disabled={disabled}>{children}</button>
}

/** The lesson card. Steps move forward on their own; the strip above (in the page) shows where the student is. */
export function Lesson({skill, step, setStep, onDone}: {skill: KhiSkill; step: number; setStep: (n: number) => void; onDone: (o: Outcome) => void}) {
  const L = useMemo(() => stepsFor(skill), [skill])
  const [detours, setDetours] = useState(0)
  const stepBack = (reason: string) => onDone({kind: 'stepBack', reason})
  return <section className="ht-card" aria-label={skill.name}>
    {step === 0 && <Items key="w" items={L.warmup.items} title="Warm-up" next="On to Show Me" onFinish={() => setStep(1)}/>}
    {step === 1 && <ShowMe key="s" L={L} onNext={() => setStep(2)}/>}
    {(step === 2 || step === 3) && <Practice key={step} L={L} skill={skill} guided={step === 2} detours={detours} addDetour={() => setDetours(d => d + 1)} onStepBack={stepBack} onNext={() => setStep(step + 1)}/>}
    {step === 4 && <Mastery key="m" L={L} onPass={pct => onDone({kind: 'passed', pct})} onRetry={() => setStep(1)}/>}
  </section>
}

/* ---------- Warm-up (and the Building blocks questions) ---------- */
function Items({items, title, next, onFinish, eyebrow}: {items: Item[]; title: string; next: string; onFinish: () => void; eyebrow?: string}) {
  const [i, setI] = useState(0), [picked, setPicked] = useState<number[]>([])
  const it = items[i], right = picked.includes(it.answer)
  return <>
    {eyebrow && <span className="ht-eyebrow">{eyebrow}</span>}
    <h2>{title}</h2><p className="ht-count">Question {i + 1} of {items.length}</p>
    <p className="ht-prompt">{it.prompt}</p>
    {it.scene && <div className="ht-mat"><ToolView scene={it.scene}/></div>}
    <div className="ht-choices">{it.choices.map((c, j) => <button key={j} type="button" className="ht-choice" data-state={picked.includes(j) ? (j === it.answer ? 'right' : 'wrong') : undefined} disabled={right} onClick={() => setPicked(p => [...p, j])}>{c}</button>)}</div>
    <div aria-live="polite">{picked.length > 0 && (right ? <div className="ht-fb" data-ok="true">Yes!</div> : <div className="ht-fb" data-ok="false">{it.whyWrong || 'Not quite. Try again.'}</div>)}</div>
    {right && <div className="ht-row"><span/><Go onClick={() => { if (i < items.length - 1) { setI(i + 1); setPicked([]) } else onFinish() }}>{i < items.length - 1 ? 'Next question' : next} →</Go></div>}
  </>
}

/* ---------- Show Me: a worked example played on the tool ---------- */
function ShowMe({L, onNext, title = 'Show Me', nextLabel = 'Build it with me'}: {L: LessonSteps; onNext: () => void; title?: string; nextLabel?: string}) {
  const sm = L.showMe, [at, setAt] = useState(0), [playing, setPlaying] = useState(true)
  const scene = useMemo(() => sm.moves.slice(0, at + 1).reduce<Scene>((s, m) => applyMove(s, m), sm.start), [sm, at])
  useEffect(() => {
    if (!playing) return
    if (reduceMotion()) { setAt(sm.moves.length - 1); setPlaying(false); return }
    if (at >= sm.moves.length - 1) { setPlaying(false); return }
    const t = setTimeout(() => setAt(a => a + 1), 900); return () => clearTimeout(t)
  }, [playing, at, sm.moves.length])
  return <>
    <h2>{title}</h2>
    <div className="ht-cap" aria-live="polite">{sm.moves[at]?.caption ?? ''}</div>
    <div className="ht-mat"><ToolView scene={scene}/></div>
    <div className="ht-row"><Go soft onClick={() => { setAt(0); setPlaying(true) }}>▶ Play again</Go><Go onClick={onNext}>{nextLabel} →</Go></div>
  </>
}

/* ---------- Build together / Build it yourself, with the practice rules and the help ladder ---------- */
type Run = {p: Problem; result?: 'first' | 'help'; extra?: boolean}
function Practice({L, skill, guided, detours, addDetour, onStepBack, onNext}: {L: LessonSteps; skill: KhiSkill; guided: boolean; detours: number; addDetour: () => void; onStepBack: (why: string) => void; onNext: () => void}) {
  const part = guided ? L.together : L.yourself, R = L.rules, tool = part.tool as ToolCode
  const [runs, setRuns] = useState<Run[]>(() => part.problems.map(p => ({p}))), [i, setI] = useState(0), [extras, setExtras] = useState(0), [done, setDone] = useState(false)
  if (done) {
    const firsts = runs.filter(r => r.result === 'first').length
    return <>
      <h2>{guided ? 'Nice building!' : 'You did it!'}</h2>
      <p className="ht-prompt">{runs.length} problems · {firsts} on your own{runs.length > firsts ? ` · ${runs.length - firsts} with help` : ''}.</p>
      {extras > 0 && <p className="ht-note">You got {extras} extra problem{extras > 1 ? 's' : ''} of practice and finished with {R.finishStreak} right in a row.</p>}
      <div className="ht-row"><span/><Go onClick={onNext}>{guided ? 'Build it yourself' : 'Show what you know'} →</Go></div>
    </>
  }
  // A problem is finished: true if the student moves down a level instead.
  const finish = (first: boolean) => {
    const list = runs.slice(); list[i] = {...list[i], result: first ? 'first' : 'help'}
    if (!first) {
      const missed = list.slice(0, i + 1).filter(r => r.result === 'help').length
      let row = 0; for (let k = i; k >= 0 && list[k].result === 'help'; k--) row++
      if (row >= R.missRow) { onStepBack(`${R.missRow} problems in a row needed help`); return true }
      if (missed >= R.missTotal) { onStepBack(`${R.missTotal} problems in this step needed help`); return true }
      const add = Math.max(0, Math.min(R.addPerMiss, R.maxExtra - extras))
      list.splice(i + 1, 0, ...Array.from({length: add}, (_, k) => ({p: likeProblem(list[i].p, extras + k + 1), extra: true})))
      setExtras(extras + add)
    }
    setRuns(list); return false
  }
  const advance = () => {
    if (i < runs.length - 1) { setI(i + 1); return }
    const tail = runs.slice(-R.finishStreak)
    if (runs.length >= R.finishStreak && tail.every(r => r.result === 'first')) { setDone(true); return }
    if (extras >= R.maxExtra) { onStepBack(`${R.maxExtra} extra problems without ${R.finishStreak} right in a row`); return }
    setRuns([...runs, {p: likeProblem(runs[i].p, extras + 1), extra: true}]); setExtras(extras + 1); setI(i + 1)
  }
  const run = runs[i]
  return <>
    <h2>{guided ? 'Build it together' : 'Build it yourself'}</h2>
    <div className="ht-dots" aria-label={`Problem ${i + 1} of ${runs.length}`}>
      {runs.map((r, k) => <i key={k} data-state={r.result ?? (k === i ? 'now' : undefined)} data-extra={r.extra || undefined}/>)}
      <span>{run.extra ? 'One more like it · ' : ''}Finish with {R.finishStreak} right in a row</span>
    </div>
    <Problem1 key={run.p.id + ':' + i} p={run.p} tool={tool} L={L} skill={skill} guided={guided && L.together.prompts === 'guided'} detours={detours} addDetour={addDetour} onStepBack={onStepBack} finish={finish} onNext={advance}/>
  </>
}

function Problem1({p, tool, L, skill, guided, detours, addDetour, onStepBack, finish, onNext}: {p: Problem; tool: ToolCode; L: LessonSteps; skill: KhiSkill; guided: boolean; detours: number; addDetour: () => void; onStepBack: (why: string) => void; finish: (first: boolean) => boolean; onNext: () => void}) {
  const n = p.target
  const [scene, setScene] = useState<Scene>(() => blankScene(tool, n)), [typed, setTyped] = useState(''), [misses, setMisses] = useState(0)
  const [help, setHelp] = useState<React.ReactNode>(null), [solved, setSolved] = useState(false), [stop, setStop] = useState(false), [stepwise, setStepwise] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  if (stop) return <BuildingBlocks skill={skill} onBack={() => { setStop(false); setStepwise(true); setHelp(<Help title="Now try it again.">{guidePrompt(tool, blankScene(tool, n), n)}</Help>) }}/>
  const miss = (hint: string) => {
    const m = misses + 1; setMisses(m)
    if (m === 1) setHelp(<Help title="Not quite.">{hint}</Help>)
    else if (m === 2) setHelp(<Help title="Let’s look closer."><Closer tool={tool} scene={p.kind === 'build' ? scene : null} n={n}/></Help>)
    else if (detours > 0) onStepBack('still stuck after the Building blocks stop')
    else { addDetour(); setStop(true) }
  }
  const win = () => {
    setSolved(true)
    if (finish(misses === 0)) return
    setHelp(<div className="ht-fb" data-ok="true">Yes! That’s {n}.{misses ? ' Now 2 more like it for practice.' : ''}</div>)
  }
  const check = () => {
    if (solved) return
    if (p.kind === 'read') {
      const a = Number(typed)
      if (typed.trim() && a === n) win(); else miss(fillHint(L.hints[Math.abs(a - n) === 1 ? 'offByOne' : 'recount'], n, Number.isFinite(a) && typed.trim() ? a : null))
      return
    }
    const r = checkBuild(scene, n)
    if (r.right) win(); else miss(fillHint(L.hints[r.hint], n, r.have))
  }
  const prompt = p.kind === 'read' ? readPrompt(tool) : (guided || stepwise) ? guidePrompt(tool, scene, n) : buildPrompt(tool, n)
  return <div ref={ref}>
    <p className="ht-prompt">{prompt}</p>
    <div className="ht-mat">{p.kind === 'read' ? <ToolView scene={shownScene(tool, n)}/> : <ToolView scene={scene} onChange={s => { setScene(s); if (!solved && misses < 3) setHelp(h => h) }} label={`Build ${n}`}/>}</div>
    {p.kind === 'read' && <form className="ht-answer" onSubmit={e => { e.preventDefault(); check() }}><input value={typed} onChange={e => setTyped(e.target.value)} inputMode="numeric" aria-label="Your answer" disabled={solved}/><button className="ht-go" disabled={solved}>Check</button></form>}
    <div aria-live="polite">{help}</div>
    <div className="ht-row">
      {!solved && p.kind === 'build' ? <><Go soft onClick={() => { setMisses(m => Math.max(m, 1)); setHelp(<Help title="Hint">{guidePrompt(tool, scene, n)}</Help>) }}>Need a hint?</Go><Go onClick={check}>Check</Go></> : <span/>}
      {solved && <Go onClick={onNext}>Next →</Go>}
    </div>
  </div>
}

/** "Let's look closer": what the student made next to what the number needs. */
function Closer({tool, scene, n}: {tool: ToolCode; scene: Scene | null; n: number}) {
  const have = scene ? sceneNumber(scene) : null
  if (tool === 'TF') {
    const cells = scene && scene.tool === 'TF' ? scene.cells : null, first = cells ? cells.filter(c => c < 10).length : null, second = cells ? cells.filter(c => c >= 10).length : null
    const needFirst = Math.min(n, 10), needSecond = Math.max(0, n - 10)
    return <><table className="ht-cmp"><thead><tr><th/><th>First ten frame</th><th>Second ten frame</th></tr></thead><tbody>
      {cells && <tr><th>You have</th><td data-ok={first === needFirst}>{first}</td><td data-ok={second === needSecond}>{second}</td></tr>}
      <tr><th>{n} needs</th><td>{needFirst}</td><td>{needSecond}</td></tr></tbody></table>
      <p className="ht-expl">{n > 10 ? `${n} is 10 and ${n - 10} more: one full ten frame and ${n - 10} more.` : `Fill the top row of 5 first, then the bottom row.`}</p></>
  }
  if (tool === 'HB') {
    const row = Math.floor((n - 1) / 10) * 10 + 1
    return <p className="ht-expl">Each row is 10 more than the row above. Go down to the row that starts at {row}, then count across to {n}.</p>
  }
  if (tool === 'NL') {
    const at = scene && scene.tool === 'NL' ? scene.at : null
    return <p className="ht-expl">{at != null ? `Your marker is on ${at}. ` : ''}Start at the first number and count each jump out loud until you reach {n}.</p>
  }
  return <><table className="ht-cmp"><tbody>
    {have != null && <tr><th>You have</th><td data-ok={have === n}>{have}</td></tr>}
    <tr><th>You need</th><td>{n}</td></tr></tbody></table>
    <p className="ht-expl">{n > 10 ? `Make a group of 10 first, then ${n - 10} more.` : 'Touch each one as you count. Say one number for each.'}</p></>
}

/* ---------- Building blocks stop: the skill this one builds on ---------- */
function BuildingBlocks({skill, onBack}: {skill: KhiSkill; onBack: () => void}) {
  const pre = skill.prereqs[0] ? byCode.get(skill.prereqs[0]) : undefined
  const [part, setPart] = useState<'watch' | 'ask'>('watch')
  if (!pre) return <><h2>Let’s slow down</h2><p className="ht-prompt">Let’s build it one step at a time.</p><div className="ht-row"><span/><Go onClick={onBack}>Back to building →</Go></div></>
  const L = stepsFor(pre)
  if (part === 'watch') return <><span className="ht-eyebrow">Quick stop · Building blocks</span><ShowMe L={L} title={pre.name} nextLabel="Got it" onNext={() => setPart('ask')}/></>
  return <Items items={L.mastery.items.slice(0, 3)} eyebrow="Quick stop · Building blocks" title={pre.name} next="Back to building" onFinish={onBack}/>
}

/* ---------- Show what you know ---------- */
function Mastery({L, onPass, onRetry}: {L: LessonSteps; onPass: (pct: number) => void; onRetry: () => void}) {
  const build = useMemo(() => likeProblem(L.yourself.problems[0], 7), [L])
  const total = L.mastery.items.length + 1
  const [i, setI] = useState(0), [right, setRight] = useState(0), [answered, setAnswered] = useState<null | boolean>(null), [scene, setScene] = useState<Scene>(() => blankScene(L.yourself.tool as ToolCode, build.target))
  if (i >= total) {
    const pct = Math.round(right / total * 100), pass = pct >= L.mastery.passMark
    return <div className="ht-center">
      <h2>{pass ? 'Skill done!' : 'Almost there!'}</h2>
      <p className="ht-prompt">{right} of {total} on the first try.</p>
      <p className="ht-note">{pass ? 'This skill will come back in quick reviews so it stays strong.' : 'Watch Show Me again, then try one more time.'}</p>
      <div className="ht-row ht-row-center">{pass ? <Go onClick={() => onPass(pct)}>Back to my trail →</Go> : <Go onClick={onRetry}>Watch Show Me again →</Go>}</div>
    </div>
  }
  const answer = (ok: boolean) => { setAnswered(ok); if (ok) setRight(r => r + 1) }
  const next = () => { setI(i + 1); setAnswered(null) }
  const head = <><h2>Show what you know</h2><p className="ht-count">{i + 1} of {total}</p></>
  if (i < L.mastery.items.length) {
    const it = L.mastery.items[i]
    return <>{head}<p className="ht-prompt">{it.prompt}</p>{it.scene && <div className="ht-mat"><ToolView scene={it.scene}/></div>}
      <div className="ht-choices">{it.choices.map((c, j) => <button key={j} type="button" className="ht-choice" disabled={answered !== null} onClick={() => answer(j === it.answer)}>{c}</button>)}</div>
      <div aria-live="polite">{answered !== null && <div className="ht-fb" data-ok={answered}>{answered ? 'Got it!' : 'Not this time. That’s okay, keep going.'}</div>}</div>
      {answered !== null && <div className="ht-row"><span/><Go onClick={next}>{i < total - 1 ? 'Next' : 'Finish'} →</Go></div>}</>
  }
  const tool = L.yourself.tool as ToolCode
  return <>{head}<p className="ht-prompt">{buildPrompt(tool, build.target)}</p>
    <div className="ht-mat"><ToolView scene={scene} onChange={setScene} label={`Build ${build.target}`}/></div>
    <div aria-live="polite">{answered !== null && <div className="ht-fb" data-ok={answered}>{answered ? 'Got it!' : 'Not this time. That’s okay.'}</div>}</div>
    <div className="ht-row"><span/>{answered === null ? <Go onClick={() => answer(checkBuild(scene, build.target).right)}>Check</Go> : <Go onClick={next}>Finish →</Go>}</div></>
}

/* ---------- prompts (same wording as the CMS player) ---------- */
export function buildPrompt(tool: string, n: number) { return tool === 'NL' ? `Put the marker on ${n}.` : tool === 'HB' ? `Find ${n} on the hundreds board.` : tool === 'LC' ? `Make a train of ${n} cubes.` : tool === 'TF' ? `Show ${n} on the ten frames.` : `Show ${n} counters.` }
function readPrompt(tool: string) { return tool === 'NL' ? 'What number is the marker on?' : tool === 'HB' ? 'Which number is hidden?' : tool === 'LC' ? 'How many cubes?' : 'How many counters?' }
// Guided prompts coach how to build the number. They never say the tool is right, how many are left or that there are too many: only
// Check tells (November 27, 2026).
function guidePrompt(tool: string, scene: Scene, n: number) {
  if (tool === 'TF' && scene.tool === 'TF') { const first = scene.cells.filter(c => c < 10).length; return n > 10 && first < 10 && scene.cells.some(c => c >= 10) ? `Show ${n}. Fill the first ten frame first.` : n > 10 ? `Show ${n}. Fill the first ten frame, then count on.` : `Show ${n}. Count each one as you add it.` }
  if (tool === 'NL') return `Count the jumps from ${scene.tool === 'NL' ? scene.min : 0} to ${n}, then tap it.`
  if (tool === 'HB') return n > 10 ? `Find the row that starts at ${Math.floor((n - 1) / 10) * 10 + 1}, then count along it to ${n}.` : `Count along the first row to ${n}.`
  return `${buildPrompt(tool, n)} Count each one as you add it.`
}
