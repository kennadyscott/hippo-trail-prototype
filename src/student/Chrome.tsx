// The KnowHippo student chrome, rebuilt from the live site's markup (kh.cleark12.com, November 26, 2026) with its own classes and art.
import logo from './art/know-hippo-logo-transparent.png'
import navLearning from './art/nav-learning.png'
import navProgress from './art/nav-progress.png'
import navRewards from './art/nav-rewards.png'
import classcade from './art/classcade-logo-transparent.png'
import subjMath from './art/subject-math.png'
import subjReading from './art/subject-reading.png'
import subjScience from './art/subject-science.png'
import hugoHead from './art/hugo-head.png'
import {nameWord} from '../shared/name'

/** One slim bar (Option B, November 26, 2026): logo, the three main tabs, ClassCade as an icon and the avatar. Subjects sit with the page title. */
export function Header({onHome}: {onHome: () => void}) {
  return <header className="ht-top">
    <a className="ht-top-brand" href="./" onClick={e => { e.preventDefault(); onHome() }}><img src={logo} alt="Know Hippo"/></a>
    <nav className="ht-top-nav" aria-label="Main">
      <button className="on" type="button" aria-current="page" onClick={onHome}><img src={navLearning} alt=""/>My Learning</button>
      <button type="button" disabled title="Not part of this prototype"><img src={navProgress} alt=""/>My Progress</button>
      <button type="button" disabled title="Not part of this prototype"><img src={navRewards} alt=""/>Rewards</button>
    </nav>
    <span className="ht-top-cc" title="ClassCade"><img src={classcade} alt="ClassCade"/></span>
    <details className="ht-top-me">
      <summary aria-label="Henry, Grade 3, Texas"><Avatar/></summary>
      <div><strong>Henry</strong><small>Grade 3 · Texas</small><p>Example student for this prototype.</p></div>
    </details>
  </header>
}

// Stand-in for the student's avatar picture (the live one loads from the ClassCade profile).
function Avatar() {
  return <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" style={{borderRadius: 10, background: '#ffd84d', display: 'block'}}>
    <rect x="7" y="11" width="26" height="18" rx="6" fill="none" stroke="#251653" strokeWidth="2.5"/><circle cx="15" cy="20" r="3.2" fill="#251653"/><circle cx="25" cy="20" r="3.2" fill="#251653"/>
  </svg>
}

/** Subject chips that sit with the page title. */
export function Subjects() {
  return <div className="ht-subjects" role="group" aria-label="Subject">
    <button className="on" type="button" aria-pressed="true"><img src={subjMath} alt=""/>Math</button>
    <button type="button" disabled title="Not part of this prototype"><img src={subjReading} alt=""/>Reading</button>
    <button type="button" disabled><img src={subjScience} alt=""/>Science<small>soon</small></button>
  </div>
}

/** "THE Hippo Trail" mark (or the picked name), built like the live "THE Know & Grow Cycle" mark. */
export function TrailMark({name}: {name: string}) {
  return <div className="kg-mark">
    <span className="kg-orbit"><img src={hugoHead} alt=""/></span>
    <span><small>THE</small><strong>Hippo <b>{nameWord(name)}</b></strong></span>
  </div>
}
