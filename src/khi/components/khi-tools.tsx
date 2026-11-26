'use client'
/**
 * Hippo Trail manipulatives (docs/knowhippo-intervention.md). The tool's state is a Scene from src/lib/khi-steps.ts; this file only draws
 * it. Without onChange a tool is a picture (question images, read-the-tool problems, Show Me playback); with onChange it is the student's
 * hands-on tool, and every change hands back a new Scene within the limits validateScene enforces. size 'sm' is the compact CMS card
 * thumbnail; 'lg' is the student look with kid-sized tap targets.
 */
import {useRef, type KeyboardEvent, type MouseEvent} from 'react'
import type {Scene} from '@/lib/khi-steps'
import styles from './khi-tools.module.css'

type Size = 'sm' | 'lg'
type Of<T extends Scene['tool']> = Extract<Scene, {tool: T}>
type Props<T extends Scene['tool']> = {scene: Of<T>; onChange?: (s: Scene) => void}

/** validateScene's limits: counters and cubes up to 30, marked squares up to 60. */
const MAX_COUNT = 30, MAX_MARKED = 60
const TOOL_NAMES: Record<Scene['tool'], string> = {CTR: 'Counters', LC: 'Linking cubes', TF: 'Ten frames', NL: 'Number line', HB: 'Hundreds board'}
const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ')
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
/** Indexes 0..n-1 grouped in tens, so tens are easy to see. */
const tens = (n: number) => Array.from({length: Math.ceil(n / 10)}, (_, t) => Array.from({length: Math.min(10, n - t * 10)}, (_, i) => t * 10 + i))

/** Words for the tool: `full` names a picture for screen readers; the short form is what the live region announces while building. */
function describe(scene: Scene, full: boolean): string {
  switch (scene.tool) {
    case 'CTR': {
      const count = clamp(scene.count, 0, MAX_COUNT), red = clamp(scene.red, 0, count)
      return red > 0 ? `${plural(count, 'counter')}: ${red} red and ${count - red} yellow` : plural(count, 'counter')
    }
    case 'LC': { const cubes = plural(clamp(scene.count, 0, MAX_COUNT), 'cube'); return full ? `A train of ${cubes}` : cubes }
    case 'TF': {
      const frames = scene.frames === 2 ? 2 : 1, n = new Set(scene.cells.filter(c => c >= 0 && c < frames * 10)).size
      return full ? `${plural(n, 'counter')} in ${frames === 2 ? 'two ten frames' : 'a ten frame'}` : plural(n, 'counter')
    }
    case 'NL': {
      const where = scene.at === null ? 'no marker yet' : `marker on ${scene.at}`
      return full ? `Number line from ${scene.min} to ${scene.max}, ${where}` : where.charAt(0).toUpperCase() + where.slice(1)
    }
    case 'HB': {
      const hidden = new Set(scene.hidden), shown = [...new Set(scene.marked)].sort((a, b) => a - b).map(k => (hidden.has(k) ? 'a hidden square' : String(k)))
      const marks = shown.length === 0 ? 'no squares marked' : `marked: ${shown.join(', ')}`
      return full ? `Hundreds board from 1 to ${scene.max}${hidden.size ? `, ${plural(hidden.size, 'hidden square')}` : ''}, ${marks}` : marks.charAt(0).toUpperCase() + marks.slice(1)
    }
  }
}

/** One Hippo Trail tool. Interactive only when `onChange` is given; otherwise a picture. */
export function ToolView({scene, onChange, size = 'lg', label}: {scene: Scene; onChange?: (s: Scene) => void; size?: Size; label?: string}) {
  const view = (() => {
    switch (scene.tool) {
      case 'CTR': return <Counters scene={scene} onChange={onChange} />
      case 'LC': return <Cubes scene={scene} onChange={onChange} />
      case 'TF': return <TenFrames scene={scene} onChange={onChange} />
      case 'NL': return <NumberLine scene={scene} onChange={onChange} />
      case 'HB': return <HundredsBoard scene={scene} onChange={onChange} />
    }
  })()
  const className = cx(styles.tool, size === 'sm' ? styles.sm : styles.lg)
  if (!onChange) return <div className={className} data-tool={scene.tool} role="img" aria-label={label ? `${label}: ${describe(scene, true)}` : describe(scene, true)}>{view}</div>
  return (
    <div className={className} data-tool={scene.tool} role="group" aria-label={label ?? TOOL_NAMES[scene.tool]}>
      {view}
      <p className={styles.srOnly} role="status" aria-live="polite">{describe(scene, false)}</p>
    </div>
  )
}

function Counters({scene, onChange}: Props<'CTR'>) {
  const count = clamp(scene.count, 0, MAX_COUNT), red = clamp(scene.red, 0, count)
  const set = (c: number, r: number) => onChange?.({tool: 'CTR', count: c, red: clamp(r, 0, c)})
  return (
    <>
      <div className={cx(styles.tray, styles.ctrField)}>
        {tens(count).map((ten, t) => (
          <div key={t} className={styles.ctrTen}>
            {ten.map(i => {
              const color = i < red ? 'red' : 'yellow'
              return onChange
                ? <button key={i} type="button" className={styles.counter} data-color={color} aria-label={`Counter ${i + 1}, ${color}`} onClick={() => set(count, i < red ? red - 1 : red + 1)} />
                : <span key={i} className={styles.counter} data-color={color} />
            })}
          </div>
        ))}
      </div>
      {onChange && (
        <div className={styles.controls}>
          <button type="button" className={styles.btn} aria-label="Add a counter" disabled={count >= MAX_COUNT} onClick={() => set(count + 1, red)}>+ Counter</button>
          <button type="button" className={styles.btn} aria-label="Take away a counter" disabled={count === 0} onClick={() => set(count - 1, red)}>− Counter</button>
          <button type="button" className={cx(styles.btn, styles.soft)} disabled={count === 0} onClick={() => set(0, 0)}>Clear</button>
        </div>
      )}
    </>
  )
}

function Cubes({scene, onChange}: Props<'LC'>) {
  const count = clamp(scene.count, 0, MAX_COUNT)
  const set = (c: number) => onChange?.({tool: 'LC', count: c})
  return (
    <>
      <div className={cx(styles.tray, styles.lcTrain)} role={onChange ? 'img' : undefined} aria-label={onChange ? `Cube train, ${plural(count, 'cube')}` : undefined}>
        {tens(count).map((ten, t) => (
          <div key={t} className={styles.lcTen}>
            {ten.map(i => <span key={i} className={styles.cube} data-ten={t} />)}
          </div>
        ))}
      </div>
      {onChange && (
        <div className={styles.controls}>
          <button type="button" className={styles.btn} aria-label="Add a cube" disabled={count >= MAX_COUNT} onClick={() => set(count + 1)}>+ Cube</button>
          <button type="button" className={styles.btn} aria-label="Take away a cube" disabled={count === 0} onClick={() => set(count - 1)}>− Cube</button>
          <button type="button" className={cx(styles.btn, styles.soft)} disabled={count === 0} onClick={() => set(0)}>Clear</button>
        </div>
      )}
    </>
  )
}

function TenFrames({scene, onChange}: Props<'TF'>) {
  const frames = scene.frames === 2 ? 2 : 1
  const cells = [...new Set(scene.cells.filter(c => Number.isInteger(c) && c >= 0 && c < frames * 10))].sort((a, b) => a - b)
  const filled = new Set(cells)
  const toggle = (k: number) => onChange?.({tool: 'TF', frames, cells: filled.has(k) ? cells.filter(c => c !== k) : [...cells, k].sort((a, b) => a - b)})
  return (
    <>
      <div className={styles.tfFrames}>
        {Array.from({length: frames}, (_, f) => (
          <div key={f} className={styles.frame}>
            {Array.from({length: 10}, (_, c) => {
              const k = f * 10 + c, on = filled.has(k)
              const dot = on ? <span className={styles.dot} /> : null
              return onChange
                ? <button key={k} type="button" className={styles.cell} aria-label={`${frames === 2 ? `Frame ${f + 1}, square` : 'Square'} ${c + 1}, ${on ? 'counter' : 'empty'}`} onClick={() => toggle(k)}>{dot}</button>
                : <span key={k} className={styles.cell}>{dot}</span>
            })}
          </div>
        ))}
      </div>
      {onChange && (
        <div className={styles.controls}>
          <button type="button" className={cx(styles.btn, styles.soft)} disabled={cells.length === 0} onClick={() => onChange({tool: 'TF', frames, cells: []})}>Clear</button>
        </div>
      )}
    </>
  )
}

/** The line's length in the drawing, the space before the first tick, and the size across the line. */
const NL_LENGTH = 640, NL_PAD = 36, NL_ACROSS_H = 124, NL_ACROSS_V = 160

function NumberLine({scene, onChange}: Props<'NL'>) {
  const ref = useRef<SVGSVGElement>(null)
  const {min} = scene, max = Math.max(scene.max, min + 1), span = max - min
  const step = Math.max(1, scene.step, Math.ceil(span / 40)), n = Math.max(1, Math.floor(span / step)), last = min + n * step
  const vertical = scene.orient === 'v', at = scene.at === null ? null : clamp(scene.at, min, max)
  const usable = NL_LENGTH - 2 * NL_PAD
  /** Distance along the line from its start (left, or bottom when vertical). */
  const along = (x: number) => NL_PAD + ((x - min) / span) * usable
  const place = (x: number) => (vertical ? NL_LENGTH - along(x) : along(x))
  const every = n <= 20 ? 1 : 5
  const gap = (usable / n) * every, digits = Math.max(String(min).length, String(last).length)
  const fontSize = Math.round(clamp(vertical ? gap / 1.3 : gap / (digits * 0.62 + 0.4), 11, 22))
  const set = (x: number) => onChange?.({...scene, at: clamp(x, min, max)})

  const pick = (e: MouseEvent<SVGSVGElement>) => {
    const m = ref.current?.getScreenCTM()
    if (!onChange || !m) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse())
    const d = vertical ? NL_LENGTH - p.y : p.x
    set(min + clamp(Math.round(((d - NL_PAD) / usable) * (span / step)), 0, n) * step)
  }
  const key = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); set(e.key === 'Home' ? min : last); return }
    const dir = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    if (at === null) { set(min); return }
    // The next tick in that direction (a marker between ticks snaps onto one).
    const k = (at - min) / step, next = min + clamp(dir > 0 ? Math.floor(k) + 1 : Math.ceil(k) - 1, 0, n) * step
    set(dir > 0 ? Math.max(at, next) : Math.min(at, next))
  }

  const across = vertical ? NL_ACROSS_V : NL_ACROSS_H
  const lineAt = vertical ? 64 : 76
  const ticks = Array.from({length: n + 1}, (_, k) => {
    const x = min + k * step, p = place(x), major = k % every === 0 || k === n, len = major ? 16 : 10
    return (
      <g key={k}>
        {vertical
          ? <line x1={lineAt - len} x2={lineAt + len} y1={p} y2={p} className={styles.nlTick} />
          : <line x1={p} x2={p} y1={lineAt - len} y2={lineAt + len} className={styles.nlTick} />}
        {major && (vertical
          ? <text x={lineAt + 26} y={p} dominantBaseline="central" fontSize={fontSize} className={styles.nlLabel}>{x}</text>
          : <text x={p} y={lineAt + 26 + fontSize * 0.8} textAnchor="middle" fontSize={fontSize} className={styles.nlLabel}>{x}</text>)}
      </g>
    )
  })
  const lo = 10, hi = NL_LENGTH - 10
  const live = onChange
    ? {role: 'slider', tabIndex: 0, onClick: pick, onKeyDown: key, 'aria-label': `Number line from ${min} to ${max}`, 'aria-orientation': vertical ? 'vertical' as const : 'horizontal' as const,
      'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': at ?? min, 'aria-valuetext': at === null ? 'No marker yet' : `Marker on ${at}`}
    : {'aria-hidden': true}
  return (
    <div className={styles.tray}>
      <svg ref={ref} className={cx(styles.nl, vertical ? styles.nlV : styles.nlH)} data-live={!!onChange} viewBox={vertical ? `0 0 ${across} ${NL_LENGTH}` : `0 0 ${NL_LENGTH} ${across}`} {...live}>
        <rect x={0} y={0} width={vertical ? across : NL_LENGTH} height={vertical ? NL_LENGTH : across} fill="transparent" />
        {vertical ? (
          <>
            <line x1={lineAt} x2={lineAt} y1={lo + 8} y2={hi - 8} className={styles.nlLine} />
            <polygon points={`${lineAt},${lo} ${lineAt - 8},${lo + 14} ${lineAt + 8},${lo + 14}`} className={styles.nlArrow} />
            <polygon points={`${lineAt},${hi} ${lineAt - 8},${hi - 14} ${lineAt + 8},${hi - 14}`} className={styles.nlArrow} />
          </>
        ) : (
          <>
            <line x1={lo + 8} x2={hi - 8} y1={lineAt} y2={lineAt} className={styles.nlLine} />
            <polygon points={`${lo},${lineAt} ${lo + 14},${lineAt - 8} ${lo + 14},${lineAt + 8}`} className={styles.nlArrow} />
            <polygon points={`${hi},${lineAt} ${hi - 14},${lineAt - 8} ${hi - 14},${lineAt + 8}`} className={styles.nlArrow} />
          </>
        )}
        {ticks}
        {at !== null && (
          <g className={styles.marker} style={{transform: vertical ? `translate(0px, ${place(at)}px)` : `translate(${place(at)}px, 0px)`}}>
            {vertical
              ? <polygon points={`${lineAt - 48},-14 ${lineAt - 48},14 ${lineAt - 18},0`} className={styles.nlPointer} />
              : <polygon points={`-14,${lineAt - 48} 14,${lineAt - 48} 0,${lineAt - 18}`} className={styles.nlPointer} />}
            <circle cx={vertical ? lineAt : 0} cy={vertical ? 0 : lineAt} r={8} className={styles.nlDot} />
          </g>
        )}
      </svg>
    </div>
  )
}

function HundredsBoard({scene, onChange}: Props<'HB'>) {
  const max = scene.max === 120 ? 120 : 100
  const marked = new Set(scene.marked), hidden = new Set(scene.hidden), full = scene.marked.length >= MAX_MARKED
  const toggle = (k: number) => {
    if (!onChange) return
    if (marked.has(k)) onChange({tool: 'HB', max, marked: scene.marked.filter(m => m !== k), hidden: [...scene.hidden]})
    else if (!full) onChange({tool: 'HB', max, marked: [...scene.marked, k], hidden: [...scene.hidden]})
  }
  return (
    <>
      <div className={styles.tray}>
        <div className={styles.board}>
          {Array.from({length: max}, (_, i) => {
            const k = i + 1, isHidden = hidden.has(k), isMarked = marked.has(k)
            const face = isHidden ? <span aria-hidden="true">?</span> : k
            return onChange
              ? <button key={k} type="button" className={styles.sq} data-marked={isMarked} data-hidden={isHidden} aria-pressed={isMarked}
                  aria-label={isHidden ? `Hidden square, row ${Math.ceil(k / 10)}, column ${((k - 1) % 10) + 1}` : `Square ${k}`} onClick={() => toggle(k)}>{face}</button>
              : <span key={k} className={styles.sq} data-marked={isMarked} data-hidden={isHidden}>{face}</span>
          })}
        </div>
      </div>
      {onChange && (
        <div className={styles.controls}>
          {full && <p className={styles.note}>You can mark up to {MAX_MARKED} squares. Tap a marked square to take its mark off.</p>}
          <button type="button" className={cx(styles.btn, styles.soft)} disabled={scene.marked.length === 0} onClick={() => onChange({tool: 'HB', max, marked: [], hidden: [...scene.hidden]})}>Clear</button>
        </div>
      )}
    </>
  )
}
