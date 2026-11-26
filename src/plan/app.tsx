import {Fragment,useCallback,useEffect,useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {setRefresh} from 'next/navigation'
import {LessonPreview,type StepNo} from '@/components/khi-player'
import {KhiLessonBuilder} from '@/components/khi-lesson-builder'
import {validateLesson} from '@/lib/khi-steps'
import {khiStatusLabel,type KhiSkill,type KhiStatus,type KhiNote} from '@/lib/khi-contract'
import {CC,TRAILS,baseMap,byCode,byId,file,loadSaved,stepsFor as savedStepsFor,writeSaved,type Saved} from '../shared/trail'
import './proto.css'
import {loadName} from '../shared/name'
import {knowHowStatus} from '@/lib/know-how-review'
import {AI_LOG,AI_PER_SKILL,BUILT,CC_DECIMALS_DAYS,DEPTHS,PICTURE_DAYS_PER_TOOL,TOOL_SIZE,WORST_CASE_MULT,aiPerSkill,toolDays,usd,type Depth} from './costs'

const LEVEL_NAMES=TRAILS.CC.levelNames

/* ---------- in-browser stand-in for the CMS save and review storage ---------- */
// Saved lessons live in this browser (shared with the student view), so a lesson saved here is the one students play.
const store=new Map<string,Saved>(Object.entries(loadSaved()));let flagId=1+Math.max(0,...[...store.values()].flatMap(x=>x.review.notes.map(n=>n.id)))
const persist=()=>writeSaved(Object.fromEntries(store))
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}})
const realFetch=window.fetch.bind(window)
window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
 const url=String(input instanceof Request?input.url:input)
 if(url!=='/api/knowhippo/intervention'&&url!=='/api/publisher-review')return realFetch(input,init)
 const {body}=JSON.parse(String(init?.body??'{}'))
 if(url==='/api/knowhippo/intervention'){
  const s=byId.get(body.skillId);if(!s)return reply(400,{error:'Choose a skill.'})
  const prev=store.get(s.code);if((prev?.version??0)!==body.version)return reply(409,{error:'This lesson changed. Reload before saving.'})
  try{validateLesson(body.steps)}catch(e){return reply(400,{error:e instanceof Error?e.message:'Check the lesson.'})}
  store.set(s.code,{steps:body.steps,version:(prev?.version??0)+1,review:prev?.review??{status:'to-review',approved:null,notes:[]}})
  persist();return reply(200,{skillId:s.id,version:(prev?.version??0)+1})
 }
 const s=byId.get(body.recordId),saved=s&&store.get(s.code);if(!saved)return reply(400,{error:'Save the lesson before reviewing it.'})
 const r=saved.review,notes:KhiNote[]=[...r.notes];let approved=r.approved
 if(body.action==='sign-off')approved={by:'You',on:new Date().toISOString()}
 else if(body.action==='withdraw')approved=null
 else if(body.action==='resolve'){const i=notes.findIndex(n=>n.id===body.flagId);if(i>=0)notes.splice(i,1)}
 else if(body.action==='flag')notes.push({id:flagId++,kind:body.assignedTo==='Stuck'?'stuck':'feedback',note:body.note,by:'You',on:new Date().toISOString()})
 saved.review={status:knowHowStatus(!!approved,notes),approved,notes}
 persist();return reply(200,{ok:true})
}
// The viewer has no confirm dialog; Redraft just redrafts here.
window.confirm=()=>true

const statusOf=(code:string):KhiStatus=>store.get(code)?.review.status??'none'
const stepsFor=(s:KhiSkill)=>store.get(s.code)?.steps??savedStepsFor(s)

/* ---------- page ---------- */
type Tab='build'|'ai'|'depths'|'first'
const TABS:[Tab,string,string][]=[['build','Publisher','Build and approve one'],['ai','AI cost','From the cost log'],['depths','Three depths','Time and AI per depth'],['first','Which path first','All 17 categories']]
const tabFromHash=():Tab=>{const h=location.hash.slice(1);return (TABS.some(t=>t[0]===h)?h:'build') as Tab}

function App(){
 const [tab,setTab]=useState<Tab>(tabFromHash),[,setTick]=useState(0)
 useEffect(()=>{setRefresh(()=>setTick(t=>t+1));const f=()=>setTab(tabFromHash());window.addEventListener('hashchange',f);return()=>window.removeEventListener('hashchange',f)},[])
 const go=(t:Tab)=>{if(location.hash!=='#'+t)location.hash=t;setTab(t);window.scrollTo(0,0)}
 return <>
  <header className="top">
   <div className="topIn">
    <div className="brand"><span className="mark" aria-hidden="true">▲</span><div><b>{loadName()}</b><small>KnowHippo math intervention · prototype</small></div></div>
    <nav className="tabs" aria-label="Prototype sections"><a className="tabLink" href="./"><b>Student view</b><small>Play it in KnowHippo</small></a>{TABS.map(([k,l,d])=><button key={k} type="button" aria-current={tab===k?'page':undefined} onClick={()=>go(k)}><b>{l}</b><small>{d}</small></button>)}</nav>
   </div>
  </header>
  <main className="wrap">
   {tab==='build'&&<Build/>}
   {tab==='ai'&&<AiCost/>}
   {tab==='depths'&&<Depths/>}
   {tab==='first'&&<First/>}
  </main>
  <footer className="foot wrap">Prototype. Nothing here is saved to the CMS or seen by students; edits and reviews stay in this browser tab, and a lesson you save here is the one the Student view plays. The lessons, tools and practice rules are the same code as the CMS build (on hold as a draft).</footer>
 </>
}

/* ---------- Publisher ---------- */
function Build(){
 const [code,setCode]=useState('CC2.3')
 const s=byCode.get(code)!,saved=store.get(code),pre=s.prereqs[0]?byCode.get(s.prereqs[0])??null:null
 const map=useMemo(()=>({...baseMap,skills:baseMap.skills.map(k=>({...k,status:statusOf(k.code)}))}),[saved?.version,saved?.review.status]) // eslint-disable-line
 const skill={...s,status:statusOf(code),lesson:saved?{version:saved.version,updatedOn:''}:null}
 const data={map,skill,prereq:pre,steps:saved?.steps??null,version:saved?.version??0,revision:saved?`proto-${saved.version}`:null,review:saved?.review??null}
 return <div className="buildGrid">
  <aside className="picker" aria-label="Choose a lesson">
   <p className="eyebrow">Counting &amp; Cardinality</p>
   {[1,2,3,4].map(l=><div key={l} className="pickLvl"><b>Level {l} · {LEVEL_NAMES[l]}</b>{CC.filter(k=>k.level===l).map(k=>{const st=statusOf(k.code)
    return <button key={k.code} type="button" aria-current={k.code===code} onClick={()=>setCode(k.code)}><span className="code">{k.code}</span><span>{k.name}</span><span className="pill" data-status={st}>{khiStatusLabel[st]}</span></button>})}</div>)}
   <p className="muted small">Each lesson starts as a draft made from the skill map. Saving and reviews stay in this tab.</p>
  </aside>
  <div className="cms"><KhiLessonBuilder key={code+':'+(saved?.version??0)} data={data} initial={stepsFor(s)} canEdit preview={false} startStep={1} openPreview={false}/></div>
 </div>
}

/* ---------- Three depths ---------- */
const ccSkills=CC.length
const ccNewTools=[...new Set(CC.map(s=>s.tools[0]))].filter(t=>!BUILT.includes(t))
function depthCost(d:Depth){
 const platform=d.platform.reduce((a,[,n])=>a+n,0)
 const tools=d.toolMode==='pictures'?ccNewTools.length*PICTURE_DAYS_PER_TOOL:ccNewTools.reduce((a,t)=>a+toolDays(t),0)+CC_DECIMALS_DAYS
 const devDays=platform+tools,pubHours=ccSkills*d.pubHoursPerSkill,ai=ccSkills*aiPerSkill(d.key),aiAll=baseMap.skills.length*aiPerSkill(d.key)
 return {platform,tools,devDays,pubHours,ai,aiAll,weeks:devDays/5}
}
const nowMonth=AI_LOG.months[AI_LOG.months.length-1]
function Depths(){
 const rows=DEPTHS.map(d=>({d,c:depthCost(d)}))
 return <div className="doc">
  <header className="docHead"><p className="eyebrow">Compare by depth · one path</p><h1>Counting &amp; Cardinality at three depths</h1>
   <p className="lede">One category, all 7 levels and {ccSkills} skills, built three ways. AI cost comes from the CMS AI cost log; time is in developer days and publisher hours.</p></header>
  <div className="depthCards">{rows.map(({d,c})=><article key={d.key} className="depth" data-pick={!!d.pick}>
   <div className="depthTop"><h2>{d.name}</h2>{d.pick&&<span className="tagPick">What the prototype shows</span>}<p>{d.tag}</p></div>
   <div className="big"><b>{usd(c.ai)}</b><span>AI to draft this path · {usd(c.aiAll)} for all 219 skills</span></div>
   <dl className="nums"><div><dt>Time to build</dt><dd>about {Math.round(c.weeks)} weeks</dd></div><div><dt>Developer</dt><dd>{c.devDays} days</dd></div><div><dt>Publishers</dt><dd>{c.pubHours.toFixed(1)} hours</dd></div><div><dt>AI per student</dt><dd>$0</dd></div></dl>
   <h3>Students get</h3><ul>{d.student.map(x=><li key={x}>{x}</li>)}</ul>
   <h3>Teachers get</h3><ul>{d.teacher.map(x=><li key={x}>{x}</li>)}</ul>
   <h3>Publishers do</h3><p className="small">{d.publisher} About {d.pubHoursPerSkill<1?`${Math.round(d.pubHoursPerSkill*60)} minutes`:`${d.pubHoursPerSkill} hours`} per skill.</p>
   <details><summary>Developer days, line by line</summary><table className="lines"><tbody>{d.platform.map(([l,n])=><tr key={l}><td>{l}</td><td>{n}</td></tr>)}
    <tr><td>{d.toolMode==='pictures'?`Pictures of the ${ccNewTools.length} tools not built yet`:`Tools not built yet: place value chart and table, plus decimals`}</td><td>{c.tools}</td></tr><tr className="tot"><td>Total</td><td>{c.devDays}</td></tr></tbody></table></details>
   <p className="risk"><b>Watch out:</b> {d.risk}</p>
  </article>)}</div>
  <section className="facts">
   <h2>Already done</h2>
   <ul className="done"><li><b>Skill map:</b> 17 categories, 219 K–5 skills, prerequisites, tools and Texas tags.</li><li><b>CMS authoring:</b> the lesson builder and review in this prototype (on hold as a draft until you decide).</li><li><b>5 manipulatives</b> working: counters, linking cubes, ten frames, number lines, hundreds board.</li><li><b>Practice rules and hints</b>, tested.</li></ul>
   <h2>How these numbers are made</h2>
   <ul className="small"><li>AI cost per skill is measured, not guessed: see the AI cost tab.</li>
    <li>Developer days are rough and meant for JV to correct. The student app work is the biggest unknown.</li>
    <li>A new tool takes 3, 5 or 10 developer days (small, medium, large) to be ready for students: drag and tap on iPads, read-aloud, keyboard, checking and hints.</li>
    <li>Calendar weeks assume one developer at 5 days a week, with publishers working alongside.</li></ul>
  </section>
 </div>
}

/* ---------- AI cost ---------- */
function AiCost(){
 const std=aiPerSkill('standard'),all=baseMap.skills.length
 const logRows:[string,string,string,string][]=[
  ['Fill breakout (closest match to a Hippo Trail lesson)','Opus 5.5',`${AI_LOG.fillOpus.calls} calls · ${AI_LOG.fillOpus.items} breakouts`,`${usd(AI_LOG.fillOpus.perCall)} a call · ${usd(AI_LOG.fillOpus.perItem)} a breakout`],
  ['Fill breakout','Sonnet 5',`${AI_LOG.fillSonnet.calls} calls · ${AI_LOG.fillSonnet.items} breakouts`,`${usd(AI_LOG.fillSonnet.perCall)} a call · ${usd(AI_LOG.fillSonnet.perItem)} a breakout`],
  ['Passage Generator writing set','Opus 5.5',`${AI_LOG.pgSet.calls} calls`,`${usd(AI_LOG.pgSet.perCall)} a call`],
  ['Question picture','gpt-image-2',`${AI_LOG.questionPicture.calls} pictures`,`${usd(AI_LOG.questionPicture.perCall)} a picture`],
  ['Lesson video','Higgsfield',`${AI_LOG.lessonVideo.calls} videos`,`${usd(AI_LOG.lessonVideo.perCall)} a video`]]
 const paths=catRows.map(r=>({...r,ai:r.skills*std})),maxAi=Math.max(...paths.map(p=>p.ai))
 return <div className="doc">
  <header className="docHead"><p className="eyebrow">From the CMS AI cost log</p><h1>All of K–5 math costs about {usd(all*std)} in AI</h1>
   <p className="lede">AI is only used to draft lessons in the CMS. Students never cause AI spend: answers are checked by rules, and the manipulatives and Show Me are drawn by code, not generated.</p></header>
  <div className="kpis"><div><b>{usd(std)}</b><span>AI per lesson at the Standard depth, measured from the cost log</span></div><div><b>{usd(ccSkills*std)}</b><span>Counting &amp; Cardinality, all {ccSkills} lessons</span></div><div><b>{usd(all*std)}</b><span>all 17 paths, {all} lessons · worst case {usd(all*std*WORST_CASE_MULT)} at twice the redrafts</span></div></div>
  <section className="facts two">
   <div><h2>Against what the CMS spends now</h2><table className="lines"><tbody>{AI_LOG.months.map(m=><tr key={m.month}><td>{m.month}, whole CMS</td><td>{usd(m.cost)}</td></tr>)}<tr className="tot"><td>Hippo Trail, all of K–5 math, once</td><td>{usd(all*std)}</td></tr></tbody></table>
    <p className="small muted">The whole Hippo Trail build is about {Math.round(all*std/nowMonth.cost*100)}% of one month of the CMS’s current AI spend, paid once as lessons are drafted. Adding students adds nothing.</p></div>
   <div><h2>One lesson, line by line</h2><table className="lines"><tbody>{(['lean','standard','full'] as const).map(k=><Fragment key={k}><tr className="tot"><td>{k==='lean'?'Lean':k==='standard'?'Standard':'Full'}</td><td>{usd(aiPerSkill(k))}</td></tr>{AI_PER_SKILL[k].map(l=><tr key={k+l.what}><td>{l.what}<small className="basis">{l.basis}</small></td><td>{usd(l.cost)}</td></tr>)}</Fragment>)}</tbody></table></div>
  </section>
  <section className="facts"><h2>AI cost by path, Standard depth</h2>
   <div className="tblWrap flat"><table className="cats"><thead><tr><th>Category</th><th>Lessons</th><th>AI to draft the path</th></tr></thead><tbody>{paths.map(p=><tr key={p.code} data-first={p.code==='CC'}><td><b>{p.name}</b><small>{p.zone}</small></td><td>{p.skills}</td><td><div className="reach"><i style={{width:`${p.ai/maxAi*100}%`}}/><span>{usd(p.ai)}</span></div></td></tr>)}</tbody></table></div></section>
  <section className="facts two">
   <div><h2>The real numbers it is built on</h2><table className="lines"><tbody>{logRows.map(([a,b,c,d])=><tr key={a+b}><td>{a}<small className="basis">{b} · {c}</small></td><td>{d}</td></tr>)}</tbody></table>
    <p className="small muted">CMS AI cost log, read November 26, 2026. Fill breakouts average {Math.round(AI_LOG.fillOpus.avgIn/1000)}k tokens in and {Math.round(AI_LOG.fillOpus.avgOut/1000)}k out, about the size of a five-step lesson. Opus 5.5 is ${AI_LOG.prices.opus[0]} / ${AI_LOG.prices.opus[1]} per million tokens in / out; Sonnet is ${AI_LOG.prices.sonnet[0]} / ${AI_LOG.prices.sonnet[1]}.</p></div>
   <div><h2>What keeps it low</h2><ul className="small">
    <li><b>No pictures or videos.</b> A lesson video in the log cost {usd(AI_LOG.lessonVideo.perCall)}; a Hippo Trail Show Me plays on the tool for $0.</li>
    <li><b>No AI for students.</b> Rules check every answer, so cost stays flat as schools sign up.</li>
    <li><b>Drafts can start from rules.</b> The CMS build drafts every lesson from the skill map for $0; AI only makes the wording richer.</li>
    <li><b>Bulk drafting at half price</b> is possible with the Batch API when a whole path is drafted at once.</li>
    <li><b>Logged like everything else.</b> When AI drafting is turned on it writes to the same cost log, so spend shows next to Fill and Passage Generator.</li></ul>
    <p className="small muted">Not in this log: the cost of building the code itself with Claude Code.</p></div>
  </section>
 </div>
}

/* ---------- Which path first ---------- */
type CatRow={code:string;name:string;zone:string;levels:number;grades:string;skills:number;tagged:number;reach:number;newTools:string[];toolDays:number;pubHours:number;cumDays:number}
const catRows:CatRow[]=(()=>{
 const rev=new Map<string,string[]>();for(const s of baseMap.skills)for(const p of s.prereqs)rev.set(p,[...(rev.get(p)??[]),s.code])
 const reach=(cat:string)=>{const seen=new Set<string>(),stack=baseMap.skills.filter(s=>s.category===cat).map(s=>s.code);while(stack.length){const c=stack.pop()!;for(const d of rev.get(c)??[])if(!seen.has(d)){seen.add(d);stack.push(d)}}return [...seen].filter(c=>byCode.get(c)!.category!==cat).length}
 const std=DEPTHS.find(d=>d.key==='standard')!
 const rows=file.categories.map(c=>{const sk=baseMap.skills.filter(s=>s.category===c.code),g=Object.values(c.texasGrades)
  return {code:c.code,name:c.name,zone:c.zone,levels:g.length,grades:g[0]===g[g.length-1]?g[0]:`${g[0]}–${g[g.length-1]}`,skills:sk.length,tagged:sk.filter(s=>s.standards.some(x=>x.main)).length,reach:reach(c.code),mains:[...new Set(sk.map(s=>s.tools[0]))]}})
 rows.sort((a,b)=>b.reach-a.reach||a.code.localeCompare(b.code))
 const have=new Set(BUILT);let cumDays=std.platform.reduce((a,[,n])=>a+n,0)
 return rows.map(r=>{const nt=r.mains.filter(t=>!have.has(t));nt.forEach(t=>have.add(t))
  const td=nt.reduce((a,t)=>a+toolDays(t),0)+(r.code==='CC'?CC_DECIMALS_DAYS:0);cumDays+=td
  return {code:r.code,name:r.name,zone:r.zone,levels:r.levels,grades:r.grades,skills:r.skills,tagged:r.tagged,reach:r.reach,newTools:nt,toolDays:td,pubHours:r.skills*std.pubHoursPerSkill,cumDays}})
})()
const toolName=(c:string)=>baseMap.tools.find(t=>t.code===c)?.name.replace(/ \(.*\)$/,'').replace(/:.*$/,'')??c
function First(){
 const stdD=DEPTHS.find(d=>d.key==='standard')!,platform=stdD.platform.reduce((a,[,n])=>a+n,0),std=aiPerSkill('standard'),maxReach=Math.max(...catRows.map(r=>r.reach)),last=catRows[catRows.length-1]
 return <div className="doc">
  <header className="docHead"><p className="eyebrow">Compare by category · which path first</p><h1>Start where the most later skills depend on it</h1>
   <p className="lede">Each category is a path. Sorted by how many skills in <em>other</em> categories build on it, so the first paths unlock the most of the rest. Time is at the Standard depth, in this order, so a tool built for one path is free for the next.</p></header>
  <div className="kpis"><div><b>{platform} days</b><span>one-time developer build, done with the first path</span></div><div><b>{catRows.slice(0,3).reduce((a,r)=>a+r.toolDays,0)} days · {usd(catRows.slice(0,3).reduce((a,r)=>a+r.skills,0)*std)} AI</b><span>tools and lessons for the first 3 paths: Counting &amp; Cardinality, Place Value, Fact Fluency</span></div><div><b>{Math.round(last.cumDays/5)} weeks · {usd(baseMap.skills.length*std)} AI</b><span>all 17 paths, 219 skills, every tool, with 1 developer</span></div></div>
  <div className="tblWrap"><table className="cats"><thead><tr><th>#</th><th>Category</th><th>Levels</th><th>Skills</th><th>Skills in other categories that build on it</th><th>New tools to build</th><th className="r">AI to draft</th><th className="r">Developer weeks so far</th></tr></thead>
   <tbody>{catRows.map((r,i)=><tr key={r.code} data-first={r.code==='CC'}>
    <td>{i+1}</td><td><b>{r.name}</b><small>{r.zone} · Texas grades {r.grades}</small></td><td>{r.levels}</td><td>{r.skills}<small>{r.skills-r.tagged?`${r.skills-r.tagged} supporting`:'all tagged'}</small></td>
    <td><div className="reach"><i style={{width:`${r.reach/maxReach*100}%`}}/><span>{r.reach}</span></div></td>
    <td>{r.newTools.length?r.newTools.map(t=><span key={t} className="tool" title={`${TOOL_SIZE[t]==='S'?'Small':TOOL_SIZE[t]==='M'?'Medium':'Large'}: ${toolDays(t)} developer days`}>{toolName(t)}</span>):<span className="muted">None: uses tools already built</span>}{r.code==='CC'&&<span className="tool">Decimals</span>}<small>{r.toolDays?`${r.toolDays} developer days · `:''}{r.pubHours.toFixed(1)} publisher hours</small></td>
    <td className="r">{usd(r.skills*std)}</td><td className="r">{(r.cumDays/5).toFixed(1)}</td></tr>)}</tbody></table></div>
  <section className="facts"><h2>Reading the table</h2><ul className="small"><li>“Developer weeks so far” starts with the one-time Standard build ({platform} days) and adds each path’s new tools.</li><li>“New tools” are each skill’s main tool. The alternates on the skill map can come later.</li><li>Supporting skills have no Texas standard but still get a lesson, as decided.</li><li>AI to draft uses the measured {usd(std)} per lesson from the AI cost tab.</li></ul></section>
 </div>
}

createRoot(document.getElementById('root')!).render(<App/>)

