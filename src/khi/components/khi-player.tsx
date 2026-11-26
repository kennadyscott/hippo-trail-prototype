'use client'
import {useEffect,useMemo,useRef,useState} from 'react'
import {ToolView} from './khi-tools'
import {STEP_NAMES,applyMove,blankScene,checkBuild,fillHint,likeProblem,sceneNumber,shownScene,type Item,type LessonSteps,type Problem,type Scene} from '@/lib/khi-steps'
import styles from './khi.module.css'
/**
 * KnowHippo intervention lesson player (docs/knowhippo-intervention.md): plays a lesson the way students will see it. Used for the full
 * student preview (Kennady, November 26, 2026: "show a preview like how it would look in the live site … then we could approve or edit")
 * and for the builder's quick preview of one step. It plays the lesson data only; nothing is scored or saved.
 */
export type StepNo=1|2|3|4|5
export function StepView({steps,step,compact=false,onNext}:{steps:LessonSteps;step:StepNo;compact?:boolean;onNext?:()=>void}){
 if(step===1||step===5)return <ItemsStep key={step} items={step===1?steps.warmup.items:steps.mastery.items} title={STEP_NAMES[step-1]} mastery={step===5} passMark={steps.mastery.passMark} compact={compact} onNext={onNext}/>
 if(step===2)return <ShowMeStep key="show" steps={steps} compact={compact} onNext={onNext}/>
 return <PracticeStep key={step} steps={steps} together={step===3} compact={compact} onNext={onNext}/>
}
function Next({label,onClick}:{label:string;onClick?:()=>void}){return onClick?<div className={styles.kRow}><span/><button type="button" className={styles.kGo} onClick={onClick}>{label} →</button></div>:null}

function ItemsStep({items,title,mastery,passMark,compact,onNext}:{items:Item[];title:string;mastery:boolean;passMark:number;compact:boolean;onNext?:()=>void}){
 const [i,setI]=useState(0),[picked,setPicked]=useState<number|null>(null),[tries,setTries]=useState(0),[right,setRight]=useState(0)
 if(!items.length)return <p className={styles.kSub}>Add a question to preview it.</p>
 if(i>=items.length){
  if(!mastery)return <><h2 className={styles.kTitle}>Warm-up done!</h2><p className={styles.kPrompt}>Now watch how it works.</p><Next label="On to Show Me" onClick={onNext}/></>
  const pct=Math.round(right/items.length*100),pass=pct>=passMark
  return <><h2 className={styles.kTitle}>{pass?'Skill done!':'Almost there!'}</h2><p className={styles.kPrompt}>{right} of {items.length} on the first try ({pct}%). Pass mark {passMark}%.</p><p className={styles.kSub}>{pass?'The student moves on to the next skill.':'The student watches Show Me again, then tries once more. Two misses move them down a level.'}</p></>
 }
 const it=items[i],done=picked!==null&&(picked===it.answer||mastery)
 const choose=(j:number)=>{if(done)return;setPicked(j);if(tries===0&&j===it.answer)setRight(r=>r+1);setTries(t=>t+1)}
 const next=()=>{setI(i+1);setPicked(null);setTries(0)}
 return <>
  <h2 className={styles.kTitle}>{title}</h2><p className={styles.kCount}>{i+1} of {items.length}</p>
  <p className={styles.kPrompt}>{it.prompt}</p>
  {it.scene&&<div className={styles.kVis}><ToolView scene={it.scene} size={compact?'sm':'lg'}/></div>}
  <div className={styles.kChoices}>{it.choices.map((c,j)=><button key={j} type="button" className={styles.kChoice} data-state={picked===j?(j===it.answer?'right':'wrong'):undefined} disabled={done} onClick={()=>choose(j)}>{c}</button>)}</div>
  <div aria-live="polite">{picked!==null&&<div className={styles.kFb} data-ok={picked===it.answer}>{picked===it.answer?'Yes!':mastery?'Not this time. That’s okay, keep going.':it.whyWrong||'Not quite. Try again.'}</div>}</div>
  {done&&<div className={styles.kRow}><span/><button type="button" className={styles.kGo} onClick={next}>{i<items.length-1?'Next question':mastery?'Finish':'Next'} →</button></div>}
 </>
}

function ShowMeStep({steps,compact,onNext}:{steps:LessonSteps;compact:boolean;onNext?:()=>void}){
 const s=steps.showMe,[at,setAt]=useState(0),[playing,setPlaying]=useState(true)
 const scene=useMemo(()=>s.moves.slice(0,at+1).reduce<Scene>((sc,m)=>applyMove(sc,m),s.start),[s,at])
 const reduce=useRef(false)
 useEffect(()=>{reduce.current=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches},[])
 useEffect(()=>{
  if(!playing)return
  if(reduce.current){const t=setTimeout(()=>{setAt(s.moves.length-1);setPlaying(false)},0);return()=>clearTimeout(t)}
  if(at>=s.moves.length-1){const t=setTimeout(()=>setPlaying(false),0);return()=>clearTimeout(t)}
  const t=setTimeout(()=>setAt(a=>a+1),750);return()=>clearTimeout(t)
 },[playing,at,s.moves.length])
 return <>
  <h2 className={styles.kTitle}>Show Me</h2>
  <div className={styles.kCap} aria-live="polite">{s.moves[at]?.caption??''}</div>
  <div className={styles.kMat}><ToolView scene={scene} size={compact?'sm':'lg'}/></div>
  <div className={styles.kRow}><button type="button" className={styles.kSoft} onClick={()=>{setAt(0);setPlaying(true)}}>▶ Play again</button>{onNext&&<button type="button" className={styles.kGo} onClick={onNext}>Build it with me →</button>}</div>
 </>
}

type Run={p:Problem;result?:'first'|'help'}
function PracticeStep({steps,together,compact,onNext}:{steps:LessonSteps;together:boolean;compact:boolean;onNext?:()=>void}){
 const part=together?steps.together:steps.yourself,rules=steps.rules,guided=together&&steps.together.prompts==='guided'
 const [runs,setRuns]=useState<Run[]>(()=>part.problems.map(p=>({p}))),[i,setI]=useState(0),[extras,setExtras]=useState(0),[stop,setStop]=useState<string|null>(null)
 if(!part.problems.length)return <p className={styles.kSub}>Add a problem to preview it.</p>
 if(stop)return <><h2 className={styles.kTitle}>Let’s go back a step</h2><p className={styles.kFb} data-ok="false">Why: {stop}.</p><p className={styles.kSub}>In the student app this opens a review stop one level down, saves this level’s progress, and tells the teacher.</p></>
 if(i>=runs.length){const firsts=runs.filter(r=>r.result==='first').length
  return <><h2 className={styles.kTitle}>{together?'Nice building!':'You did it!'}</h2><p className={styles.kPrompt}>{runs.length} problems · {firsts} on your own{runs.length>firsts?` · ${runs.length-firsts} with help`:''}.</p>{extras>0&&<p className={styles.kSub}>{extras} extra problem{extras>1?'s':''} of practice, finished with {rules.finishStreak} right in a row.</p>}<Next label={together?'Build it yourself':'Show what you know'} onClick={onNext}/></>}
 const finish=(first:boolean)=>{
  const list=runs.slice();list[i]={...list[i],result:first?'first':'help'}
  if(!first){
   const missed=list.slice(0,i+1).filter(r=>r.result==='help').length
   let row=0;for(let k=i;k>=0&&list[k].result==='help';k--)row++
   if(row>=rules.missRow){setStop(`${rules.missRow} problems in a row needed help`);return}
   if(missed>=rules.missTotal){setStop(`${rules.missTotal} problems in this step needed help`);return}
   const add=Math.min(rules.addPerMiss,rules.maxExtra-extras);list.splice(i+1,0,...Array.from({length:Math.max(0,add)},(_,k)=>({p:likeProblem(list[i].p,extras+k+1)})));setExtras(extras+Math.max(0,add))
  }
  setRuns(list)
 }
 const advance=()=>{
  if(i<runs.length-1){setI(i+1);return}
  const tail=runs.slice(-rules.finishStreak)
  if(runs.length>=rules.finishStreak&&tail.every(r=>r.result==='first')){setI(i+1);return}
  if(extras>=rules.maxExtra){setStop(`${rules.maxExtra} extra problems without ${rules.finishStreak} right in a row`);return}
  setRuns([...runs,{p:likeProblem(runs[i].p,extras+1)}]);setExtras(extras+1);setI(i+1)
 }
 return <Problem1 key={runs[i].p.id+':'+i} run={runs[i]} index={i} total={runs.length} runs={runs} steps={steps} tool={part.tool} guided={guided} title={together?STEP_NAMES[2]:STEP_NAMES[3]} compact={compact} onDone={finish} onNext={advance}/>
}
function Problem1({run,index,total,runs,steps,tool,guided,title,compact,onDone,onNext}:{run:Run;index:number;total:number;runs:Run[];steps:LessonSteps;tool:LessonSteps['together']['tool'];guided:boolean;title:string;compact:boolean;onDone:(first:boolean)=>void;onNext:()=>void}){
 const p=run.p,[scene,setScene]=useState<Scene>(()=>blankScene(tool,p.target)),[typed,setTyped]=useState(''),[misses,setMisses]=useState(0),[msg,setMsg]=useState<{ok:boolean;text:string}|null>(null),[solved,setSolved]=useState(false)
 const prompt=p.kind==='read'?(tool==='NL'?'What number is the marker on?':tool==='HB'?'Which number is hidden?':tool==='LC'?'How many cubes?':'How many counters?')
  :guided?guidePrompt(tool,scene,p.target):buildPrompt(tool,p.target)
 const check=()=>{
  if(solved)return
  if(p.kind==='read'){const a=Number(typed);if(typed.trim()&&a===p.target){setSolved(true);setMsg({ok:true,text:`Yes! That’s ${p.target}.`});onDone(misses===0)}else{setMisses(m=>m+1);setMsg({ok:false,text:fillHint(steps.hints[Math.abs(a-p.target)===1?'offByOne':'recount'],p.target,Number.isFinite(a)?a:null)})};return}
  const r=checkBuild(scene,p.target)
  if(r.right){setSolved(true);setMsg({ok:true,text:`Yes! That’s ${p.target}.`});onDone(misses===0)}else{setMisses(m=>m+1);setMsg({ok:false,text:fillHint(steps.hints[r.hint],p.target,r.have)})}
 }
 return <>
  <h2 className={styles.kTitle}>{title}</h2>
  <div className={styles.kDots} aria-label={`Problem ${index+1} of ${total}`}>{runs.map((r,k)=><i key={k} data-state={r.result??(k===index?'now':'')}/>)}<span>Finish with {steps.rules.finishStreak} right in a row</span></div>
  <p className={styles.kPrompt}>{prompt}</p>
  <div className={styles.kMat}>{p.kind==='read'?<ToolView scene={shownScene(tool,p.target)} size={compact?'sm':'lg'}/>:<ToolView scene={scene} onChange={s=>{setScene(s);setMsg(null)}} size={compact?'sm':'lg'} label={`Build ${p.target}`}/>}</div>
  {p.kind==='read'&&<form className={styles.kTray} onSubmit={e=>{e.preventDefault();check()}}><input className={styles.kNum} value={typed} onChange={e=>setTyped(e.target.value)} inputMode="numeric" aria-label="Your answer" disabled={solved}/><button className={styles.kGo} disabled={solved}>Check</button></form>}
  <div aria-live="polite">{msg&&<div className={styles.kFb} data-ok={msg.ok}>{msg.ok?msg.text:<><b>Not quite.</b> {msg.text}</>}</div>}</div>
  <div className={styles.kRow}>{p.kind==='build'&&!solved?<><span/><button type="button" className={styles.kGo} onClick={check}>Check</button></>:<span/>}{solved&&<button type="button" className={styles.kGo} onClick={onNext}>Next →</button>}</div>
 </>
}
function buildPrompt(tool:string,n:number){return tool==='NL'?`Put the marker on ${n}.`:tool==='HB'?`Find ${n} on the hundreds board.`:tool==='LC'?`Make a train of ${n} cubes.`:tool==='TF'?`Show ${n} on the ten frames.`:`Show ${n} counters.`}
function guidePrompt(tool:string,scene:Scene,n:number){
 const have=sceneNumber(scene)??0
 if(tool==='TF'&&scene.tool==='TF'){const first=scene.cells.filter(c=>c<10).length;return have>n?'Too many. Tap one to take it away.':n>10&&first<10?`Show ${n}. Fill the first ten frame first.`:have<n?`Now ${n-have} more.`:'Ready? Press Check.'}
 if(tool==='NL')return scene.tool==='NL'&&scene.at===n?'Ready? Press Check.':`Count the jumps from ${scene.tool==='NL'?scene.min:0} to ${n}, then tap it.`
 if(tool==='HB')return scene.tool==='HB'&&scene.marked.length===1&&scene.marked[0]===n?'Ready? Press Check.':n>10?`Find the row that starts at ${Math.floor((n-1)/10)*10+1}, then count along it.`:`Count along the first row to ${n}.`
 return have>n?'Too many. Take one away.':have<n?`${buildPrompt(tool,n)} Count each one as you add it.`:'Ready? Press Check.'
}

/** Full-screen student-look preview with the review bar on top. */
export function LessonPreview({steps,skillLabel,levelLabel,step,setStep,bar,onClose}:{steps:LessonSteps;skillLabel:string;levelLabel:string;step:StepNo;setStep:(s:StepNo)=>void;bar:React.ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDivElement>(null)
 useEffect(()=>{const prev=document.body.style.overflow;document.body.style.overflow='hidden';ref.current?.focus();const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose()};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=prev;window.removeEventListener('keydown',key)}},[onClose])
 return <div className={styles.sp} role="dialog" aria-modal="true" aria-label="Student preview" ref={ref} tabIndex={-1}>
  <div className={styles.spBar}>{bar}</div>
  <div className={styles.spWorld}>
   <div className={styles.spHead}><span className={styles.spLogo}>KnowHippo</span><span className={styles.spNav}>My Learning</span><span className={styles.spSubj}>Math</span></div>
   <div className={styles.spStage}>
    <span className={styles.spBack}>← {levelLabel}</span>
    <div className={styles.spSteps}>{STEP_NAMES.map((n,k)=><button key={n} type="button" className={styles.spStep} data-state={k+1<step?'done':k+1===step?'now':undefined} onClick={()=>setStep((k+1) as StepNo)}><i>{k+1<step?'✓':k+1}</i>{n}</button>)}</div>
    <section className={styles.kCard} aria-label={skillLabel}><StepView steps={steps} step={step} onNext={step<5?()=>setStep((step+1) as StepNo):undefined}/></section>
   </div>
  </div>
 </div>
}
