'use client'
import Link from 'next/link'
import {useCallback,useMemo,useState} from 'react'
import {useRouter} from 'next/navigation'
import {ToolView} from './khi-tools'
import {LessonPreview,StepView,type StepNo} from './khi-player'
import {BUILT_TOOLS,DEFAULT_HINTS,HINT_KEYS,HINT_LABELS,MOVE_OPTIONS,STEP_NAMES,TRAIL_NAME,draftItem,draftLesson,draftMoves,isBuiltTool,sceneNumber,shownScene,blankScene,type Item,type LessonSteps,type Move,type Problem,type ToolCode} from '@/lib/khi-steps'
import {KHI_REVIEW_KIND,khiStatusLabel,type KhiLessonDetail,type KhiMap,type KhiSkill} from '@/lib/khi-contract'
import {knowHowSteps} from '@/lib/know-how-review'
import styles from './khi.module.css'
/**
 * KnowHippo intervention lesson builder (docs/knowhippo-intervention.md). Kennady, November 26, 2026, on how a publisher builds a lesson:
 * the draft comes from the skill map, the publisher plays it the way students will see it, fixes what is off, then approves.
 * Left: the five steps. Middle: the step's editor. Right: a quick preview of the step. "Preview lesson" opens the full student look with
 * Approve / Feedback / Stuck / Edit this step on top.
 */
type Data=KhiLessonDetail&{map:KhiMap}
const draftOf=(s:KhiSkill)=>({code:s.code,name:s.name,levelNo:s.level,categoryCode:s.category,tools:s.tools})
const nid=(p:string)=>`${p}${Math.random().toString(36).slice(2,9)}`
const toolName=(map:KhiMap,code:string)=>map.tools.find(t=>t.code===code)?.name??code
async function post(url:string,body:unknown){const r=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),body})});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'Could not save. Try again in a moment.');return j}

export function KhiLessonBuilder({data,initial,canEdit,preview,startStep,openPreview}:{data:Data;initial:LessonSteps;canEdit:boolean;preview:boolean;startStep:StepNo;openPreview:boolean}){
 const router=useRouter(),{skill,map}=data
 const fresh=useCallback(()=>draftLesson(draftOf(skill),data.prereq?draftOf(data.prereq):null),[skill,data.prereq])
 const [steps,setSteps]=useState<LessonSteps>(initial),[step,setStep]=useState<StepNo>(startStep),[dirty,setDirty]=useState(!data.steps)
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState<{text:string;error?:boolean}|null>(null),[full,setFull]=useState(openPreview),[note,setNote]=useState<null|'feedback'|'stuck'>(null),[noteText,setNoteText]=useState('')
 const cat=map.categories.find(c=>c.code===skill.category),grade=cat?.levels.find(l=>l.levelNo===skill.level)?.grade
 const built=skill.tools.filter(isBuiltTool) as ToolCode[],toolChoices=(built.length?built:[...BUILT_TOOLS]) as ToolCode[]
 const edit=(f:(s:LessonSteps)=>LessonSteps)=>{setSteps(s=>f(structuredClone(s)));setDirty(true);setMsg(null)}
 const status=data.review?.status??'none'
 async function save(){
  setBusy(true);setMsg(null)
  try{await post('/api/knowhippo/intervention',{action:'save',kind:'lesson',skillId:skill.id,version:data.version,steps});setDirty(false);setMsg({text:'Saved. It is now To review.'});router.refresh()}
  catch(e){setMsg({text:e instanceof Error?e.message:'Could not save.',error:true})}finally{setBusy(false)}
 }
 async function decide(decision:'approved'|'feedback'|'stuck',text=''){
  if(!data.review||!data.revision)return
  setBusy(true);setMsg(null)
  try{
   const plan=decision==='approved'?knowHowSteps(data.review,{to:'approved',revision:data.revision}):knowHowSteps(data.review,{to:decision,note:text})
   for(const s of plan)await post('/api/publisher-review',{kind:KHI_REVIEW_KIND,recordId:skill.id,...s})
   setNote(null);setNoteText('');setMsg({text:decision==='approved'?'Approved.':`Marked ${decision==='stuck'?'Stuck':'Feedback'}.`});router.refresh()
  }catch(e){setMsg({text:e instanceof Error?e.message:'Could not save the review.',error:true})}finally{setBusy(false)}
 }
 const reviewBlocked=!canEdit?'Only V2 editors can review lessons.':dirty?'Save your changes before reviewing.':!data.review?'Save the lesson before reviewing it.':null
 const reviewButtons=(dark:boolean)=><div className={styles.revActions}>
  <span className={styles.statusPill} data-status={status}>{khiStatusLabel[status]}</span>
  <button type="button" className={styles.btnGood} disabled={busy||!!reviewBlocked} title={reviewBlocked??undefined} onClick={()=>decide('approved')}>Approve lesson</button>
  <button type="button" className={styles.btnWarn} disabled={busy||!!reviewBlocked} title={reviewBlocked??undefined} onClick={()=>setNote('feedback')}>Feedback</button>
  <button type="button" className={styles.btnBad} disabled={busy||!!reviewBlocked} title={reviewBlocked??undefined} onClick={()=>setNote('stuck')}>Stuck</button>
  {reviewBlocked&&<span className={dark?styles.revWhyDark:styles.revWhy}>{reviewBlocked}</span>}
  {note&&<form className={styles.noteBox} onSubmit={e=>{e.preventDefault();if(noteText.trim())void decide(note,noteText.trim())}}><input autoFocus value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder={note==='stuck'?'What is it stuck on, and who needs to help?':`What should change in ${STEP_NAMES[step-1]}?`} aria-label="Note" maxLength={2000}/><button className={styles.btnPrimary} disabled={busy||!noteText.trim()}>Save {note==='stuck'?'Stuck':'Feedback'}</button><button type="button" className={styles.btn} onClick={()=>setNote(null)}>Cancel</button></form>}
 </div>
 return <div className={styles.page}>
  <p className={styles.eyebrow}><Link href={`/knowhippo/intervention/paths?cat=${skill.category}`}>← {cat?.name??skill.category} path</Link></p>
  <div className={styles.titleRow}><h1>{skill.code} · {skill.name}</h1><span className={styles.gradeTag}>Level {skill.level}{grade?` · Texas grade ${grade==='K'?'K':grade} (hidden)`:''}</span>{skill.standards.filter(s=>s.main).map(s=><b key={s.code} className={styles.teks} title={s.description}>{s.code}</b>)}{!skill.standards.some(s=>s.main)&&<span className={styles.sup}>Supporting skill</span>}</div>
  {data.review?.notes.map(n=><p key={n.id} className={styles.notice} data-kind={n.kind}><b>{n.kind==='stuck'?'Stuck':'Feedback'}</b> · {n.by}: {n.note}</p>)}
  <section className={styles.wf} aria-label="How a publisher builds this lesson">
   <div><b>How a publisher builds this lesson</b><ol><li><b>Start from the draft.</b> {data.steps?'This lesson is saved; edit it here.':'This draft comes from the skill map. Nothing is saved until you press Save.'}</li><li><b>Preview the lesson</b> the way students see it.</li><li><b>Fix what’s off</b> in the middle: numbers, words, choices, moves.</li><li><b>Save</b>, then <b>Approve</b>, or mark Feedback or Stuck with a note.</li></ol></div>
   <div className={styles.wfActions}>
    <div className={styles.revActions}><button type="button" className={styles.btnPrimary} onClick={()=>setFull(true)}>▶ Preview lesson</button>{canEdit&&<button type="button" className={styles.btnPrimary} disabled={busy||!dirty} onClick={save}>{busy?'Saving…':dirty?'Save lesson':'Saved'}</button>}{!data.steps&&canEdit&&<button type="button" className={styles.btn} disabled={busy} onClick={()=>{if(window.confirm('Start over from the draft? Your unsaved changes go away.')){setSteps(fresh());setDirty(true)}}}>Redraft</button>}</div>
    {reviewButtons(false)}
    {!canEdit&&<p className={styles.hint}>{preview?'Local preview: changes stay on this page and are not saved.':'You can preview this lesson. Editing is for V2 editors.'}</p>}
    <div aria-live="polite">{msg&&<p className={msg.error?styles.err:styles.ok}>{msg.text}</p>}</div>
   </div>
  </section>
  <div className={styles.builder}>
   <nav className={styles.card+' '+styles.steps} aria-label="Lesson steps"><p className={styles.eyebrow}>Five-step lesson</p>{STEP_NAMES.map((n,k)=><button key={n} type="button" className={styles.stepBtn} aria-current={step===k+1} onClick={()=>setStep((k+1) as StepNo)}><span className={styles.stepDot}>{k+1}</span><span><b>{n}</b><small>{['Questions on the skill it builds on','Worked example on the tool','Guided, with prompts','Same tool, no prompts','Mastery check'][k]}</small></span></button>)}</nav>
   <section className={styles.card+' '+styles.editor} aria-label="Step editor">
    <p className={styles.eyebrow}>Step {step} · {STEP_NAMES[step-1]}</p>
    {(step===1||step===5)&&<ItemsEditor items={step===1?steps.warmup.items:steps.mastery.items} tools={toolChoices} map={map} base={step===1?data.prereq??skill:skill} warm={step===1}
      passMark={steps.mastery.passMark} setPass={n=>edit(s=>{s.mastery.passMark=n;return s})}
      onChange={items=>edit(s=>{if(step===1)s.warmup.items=items;else s.mastery.items=items;return s})}/>}
    {step===2&&<ShowMeEditor steps={steps} tools={toolChoices} map={map} edit={edit}/>}
    {(step===3||step===4)&&<PracticeEditor steps={steps} together={step===3} tools={toolChoices} map={map} edit={edit}/>}
   </section>
   <section className={styles.card+' '+styles.quick} aria-label="Quick preview"><div className={styles.quickHead}><b>Quick preview</b> · this step<button type="button" className={styles.linkBtn} onClick={()=>setFull(true)}>Full student preview ↗</button></div><div className={styles.kCard+' '+styles.kCompact}><StepView key={step+JSON.stringify(steps).length} steps={steps} step={step} compact/></div></section>
  </div>
  {full&&<LessonPreview steps={steps} skillLabel={skill.name} levelLabel={`Level ${skill.level}`} step={step} setStep={setStep} onClose={()=>setFull(false)}
   bar={<><div className={styles.spWho}><b>Student preview</b><span>{TRAIL_NAME} · {cat?.name} · Level {skill.level} · {skill.code} {skill.name}{dirty?' · unsaved changes':''}</span></div>
    <div className={styles.spActions}><button type="button" className={styles.btn} onClick={()=>setFull(false)}>✎ Edit this step</button>{reviewButtons(true)}<button type="button" className={styles.btn} onClick={()=>setFull(false)} aria-label="Close preview">✕ Close</button></div></>}/>}
 </div>
}

function ToolSelect({value,tools,map,onChange,id}:{value:string;tools:ToolCode[];map:KhiMap;onChange:(t:ToolCode)=>void;id:string}){
 return <select id={id} value={value} onChange={e=>onChange(e.target.value as ToolCode)}>{tools.map(t=><option key={t} value={t}>{toolName(map,t)}</option>)}</select>
}
function ItemsEditor({items,tools,map,base,warm,passMark,setPass,onChange}:{items:Item[];tools:ToolCode[];map:KhiMap;base:KhiSkill;warm:boolean;passMark:number;setPass:(n:number)=>void;onChange:(items:Item[])=>void}){
 const set=(i:number,f:(it:Item)=>Item)=>onChange(items.map((it,k)=>k===i?f(structuredClone(it)):it))
 return <>
  <p className={styles.srcNote}>{warm?<>Warm-up questions practice the skill this lesson builds on: <b>{base.code} {base.name}</b>. For now they are drafted from the skill map; later they come from the question bank tagged to it.</>:<>Mastery questions check <b>{base.code}</b> itself. The student app adds 2 hands-on tasks like Build it yourself.</>}</p>
  {!warm&&<label className={styles.field}>Pass mark (first try, %)<input type="number" min={50} max={100} value={passMark} onChange={e=>setPass(Math.max(50,Math.min(100,Number(e.target.value)||80)))}/></label>}
  {items.map((it,i)=><div key={it.id} className={styles.itemCard}>
   <div className={styles.itemHead}><b>Question {i+1}</b><span className={styles.srcPill} data-src={it.source}>{it.source==='bank'?`Question bank · ${base.code}`:'Draft · needs review'}</span>{items.length>1&&<button type="button" className={styles.linkBtn} onClick={()=>onChange(items.filter((_,k)=>k!==i))}>Remove</button>}</div>
   <label className={styles.field}>Question<input value={it.prompt} maxLength={200} onChange={e=>set(i,x=>({...x,prompt:e.target.value}))}/></label>
   <div className={styles.row2}>
    <label className={styles.field}>Picture<select value={it.scene?.tool??''} onChange={e=>set(i,x=>({...x,scene:e.target.value?shownScene(e.target.value as ToolCode,Number(x.choices[x.answer])||5):null}))}><option value="">No picture</option>{tools.map(t=><option key={t} value={t}>{toolName(map,t)}</option>)}</select></label>
    {it.scene&&<label className={styles.field}>Shows the number<input type="number" min={0} max={1200} value={sceneNumber(it.scene)??(it.scene.tool==='HB'?it.scene.hidden[0]??0:0)} onChange={e=>set(i,x=>({...x,scene:shownScene(x.scene!.tool as ToolCode,Math.max(0,Math.min(1200,Number(e.target.value)||0)))}))}/></label>}
   </div>
   {it.scene&&<div className={styles.thumb}><ToolView scene={it.scene} size="sm"/></div>}
   <div className={styles.field}>Choices <small>· select the right one</small>{it.choices.map((c,j)=><label key={j} className={styles.crow}><input type="radio" name={`ans-${it.id}`} checked={it.answer===j} onChange={()=>set(i,x=>({...x,answer:j as 0|1|2}))} aria-label={`Choice ${j+1} is right`}/><input value={c} maxLength={40} onChange={e=>set(i,x=>{const ch=[...x.choices] as Item['choices'];ch[j]=e.target.value;return {...x,choices:ch}})} aria-label={`Choice ${j+1}`}/></label>)}</div>
   <label className={styles.field}>If a student picks a wrong choice, show<input value={it.whyWrong} maxLength={200} onChange={e=>set(i,x=>({...x,whyWrong:e.target.value}))}/></label>
  </div>)}
  {items.length<(warm?8:10)&&<button type="button" className={styles.btn} onClick={()=>{const n=Number(items[items.length-1]?.choices[items[items.length-1]?.answer??0])||5;onChange([...items,draftItem(items[0]?.scene?.tool as ToolCode??tools[0],n+1,items.length,'draft')])}}>+ Add question</button>}
 </>
}
function ShowMeEditor({steps,tools,map,edit}:{steps:LessonSteps;tools:ToolCode[];map:KhiMap;edit:(f:(s:LessonSteps)=>LessonSteps)=>void}){
 const s=steps.showMe,target=useMemo(()=>{const last=[...s.moves].reverse().find(m=>m.act!=='say');return last?.act==='jump'||last?.act==='mark'?last.value:s.moves.filter(m=>m.act==='add').reduce((a,m)=>a+m.value,0)},[s.moves])
 const [n,setN]=useState(target||5)
 const redraw=(tool:ToolCode,k:number)=>edit(x=>{x.showMe.tool=tool;x.showMe.start=blankScene(tool,k);x.showMe.moves=draftMoves(tool,k);return x})
 const setMove=(i:number,f:(m:Move)=>Move)=>edit(x=>{x.showMe.moves[i]=f(x.showMe.moves[i]);return x})
 return <>
  <div className={styles.row2}><label className={styles.field}>Tool<ToolSelect id="sm-tool" value={s.tool} tools={tools} map={map} onChange={t=>redraw(t,n)}/></label>
   <label className={styles.field}>Example number<span className={styles.inline}><input type="number" min={0} max={1200} value={n} onChange={e=>setN(Math.max(0,Math.min(1200,Number(e.target.value)||0)))}/><button type="button" className={styles.btn} onClick={()=>redraw(s.tool,n)}>Redraw moves</button></span></label></div>
  <p className={styles.hint}>The moves are drafted from the skill. Change the number and redraw, or edit any move or caption.</p>
  <div className={styles.field}>Moves · one thing happens on screen per move
   <table className={styles.probs}><thead><tr><th>#</th><th>On screen</th><th>Value</th><th>Caption the student reads</th><th/></tr></thead><tbody>
    {s.moves.map((m,i)=><tr key={m.id}><td>{i+1}</td><td><select value={m.act} onChange={e=>setMove(i,x=>({...x,act:e.target.value as Move['act']}))} aria-label={`Move ${i+1}`}>{MOVE_OPTIONS[s.tool].map(([a,l])=><option key={a} value={a}>{l}</option>)}</select></td>
     <td>{m.act==='say'?'':<input type="number" min={0} max={1200} value={m.value} onChange={e=>setMove(i,x=>({...x,value:Math.max(0,Math.min(1200,Number(e.target.value)||0))}))} aria-label={`Move ${i+1} value`}/>}</td>
     <td><input value={m.caption} maxLength={160} onChange={e=>setMove(i,x=>({...x,caption:e.target.value}))} aria-label={`Move ${i+1} caption`}/></td>
     <td>{s.moves.length>1&&<button type="button" className={styles.linkBtn} onClick={()=>edit(x=>{x.showMe.moves.splice(i,1);return x})}>Remove</button>}</td></tr>)}
   </tbody></table>
   {s.moves.length<60&&<button type="button" className={styles.btn} onClick={()=>edit(x=>{x.showMe.moves.push({id:nid('m'),act:'say',value:0,caption:'New caption'});return x})}>+ Add move</button>}
  </div>
  <label className={styles.crow}><input type="checkbox" checked={s.readAloud} onChange={e=>edit(x=>{x.showMe.readAloud=e.target.checked;return x})}/> Read each caption aloud</label>
 </>
}
function PracticeEditor({steps,together,tools,map,edit}:{steps:LessonSteps;together:boolean;tools:ToolCode[];map:KhiMap;edit:(f:(s:LessonSteps)=>LessonSteps)=>void}){
 const part=together?steps.together:steps.yourself
 const setPart=(f:(p:typeof part)=>void)=>edit(x=>{f(together?x.together:x.yourself);return x})
 const setP=(i:number,f:(p:Problem)=>Problem)=>setPart(p=>{p.problems[i]=f(p.problems[i])})
 const r=steps.rules
 return <>
  <div className={styles.row2}><label className={styles.field}>Tool<ToolSelect id="pr-tool" value={part.tool} tools={tools} map={map} onChange={t=>setPart(p=>{p.tool=t})}/></label>
   {together&&<label className={styles.field}>Prompts<select value={steps.together.prompts} onChange={e=>edit(x=>{x.together.prompts=e.target.value==='none'?'none':'guided';return x})}><option value="guided">Guide step by step</option><option value="none">No prompts</option></select></label>}</div>
  <div className={styles.field}>Problems
   <table className={styles.probs}><thead><tr><th>#</th><th>Type</th><th>Number</th><th/></tr></thead><tbody>
    {part.problems.map((p,i)=><tr key={p.id}><td>{i+1}</td><td><select value={p.kind} onChange={e=>setP(i,x=>({...x,kind:e.target.value==='read'?'read':'build'}))} aria-label={`Problem ${i+1} type`}><option value="build">Build it</option><option value="read">Read it (type the number)</option></select></td>
     <td><input type="number" min={0} max={1200} value={p.target} onChange={e=>setP(i,x=>({...x,target:Math.max(0,Math.min(1200,Number(e.target.value)||0))}))} aria-label={`Problem ${i+1} number`}/></td>
     <td>{part.problems.length>1&&<button type="button" className={styles.linkBtn} onClick={()=>setPart(x=>{x.problems.splice(i,1)})}>Remove</button>}</td></tr>)}
   </tbody></table>
   {part.problems.length<12&&<button type="button" className={styles.btn} onClick={()=>setPart(x=>{x.problems.push({id:nid('p'),kind:'build',target:(x.problems[x.problems.length-1]?.target??5)+1})})}>+ Add problem</button>}
  </div>
  {together?<>
   <div className={styles.field}>More practice and moving down <small>(the whole lesson)</small><div className={styles.rules}>
    {([['addPerMiss','Each missed problem adds','more like it',0,5],['finishStreak','Finish with','right in a row',1,5],['missRow','Move down a level after','missed in a row',2,9],['missTotal','…or after','missed in one step',2,12],['maxExtra','…or after','extra problems without finishing',2,20]] as const).map(([k,a,b,lo,hi])=><label key={k}>{a}<span><input type="number" min={lo} max={hi} value={r[k]} onChange={e=>edit(x=>{x.rules[k]=Math.max(lo,Math.min(hi,Number(e.target.value)||lo));return x})}/> {b}</span></label>)}
   </div><span className={styles.hint}>“Missed” = not right on the first try. Each extra problem keeps the same tricky part (a teen stays a teen).</span></div>
   <div className={styles.field}>Hint wording, by mistake <small>(the tool spots the mistake; this is what students read)</small>{HINT_KEYS.map(k=><label key={k} className={styles.hintRow}><span>{HINT_LABELS[k]}</span><input value={steps.hints[k]} maxLength={200} onChange={e=>edit(x=>{x.hints[k]=e.target.value;return x})} placeholder={DEFAULT_HINTS[k]}/></label>)}<span className={styles.hint}>{'{n}'} is the number; {'{have}'} is what the student made.</span></div>
  </>:<p className={styles.hint}>The practice rules and hint wording are on Build it together and apply to both practice steps.</p>}
  <p className={styles.srcNote}><b>When a student misses:</b> 1st miss, the hint for that mistake · 2nd, look closer · 3rd, a Building blocks stop on the skill this builds on · still stuck, a review stop one level down that the teacher sees.</p>
 </>
}
