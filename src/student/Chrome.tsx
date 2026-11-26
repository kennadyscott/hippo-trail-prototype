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

export function Header({onHome}: {onHome: () => void}) {
  return <header className="sw-header">
    <a className="sw-brand" href="./" onClick={e => { e.preventDefault(); onHome() }}><img src={logo} alt="Know Hippo"/></a>
    <nav className="sw-main-nav">
      <button className="active" type="button" onClick={onHome}><img className="sw-icon" src={navLearning} alt=""/>My Learning</button>
      <button type="button" disabled title="Not part of this prototype"><img className="sw-icon" src={navProgress} alt=""/>My Progress</button>
      <button type="button" disabled title="Not part of this prototype"><img className="sw-icon" src={navRewards} alt=""/>Rewards</button>
    </nav>
    <span className="sw-classcade"><img className="sw-classcade-logo" src={classcade} alt="ClassCade"/><span>↗</span></span>
    <details className="sw-profile">
      <summary>
        <span><Avatar/></span>
        <span><strong>Henry</strong><small>Grade 3 · Texas</small></span>
        <span className="sw-profile-chevron">⌄</span>
      </summary>
      <div className="sw-profile-menu"><strong>Henry</strong><p>Example student for this prototype.</p></div>
    </details>
  </header>
}

// Stand-in for the student's avatar picture (the live one loads from the ClassCade profile).
function Avatar() {
  return <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" style={{borderRadius: 10, background: '#ffd84d', display: 'block'}}>
    <rect x="7" y="11" width="26" height="18" rx="6" fill="none" stroke="#251653" strokeWidth="2.5"/><circle cx="15" cy="20" r="3.2" fill="#251653"/><circle cx="25" cy="20" r="3.2" fill="#251653"/>
  </svg>
}

export function Subjects() {
  return <nav className="sw-subjects">
    <button className="active" type="button"><img className="sw-icon" src={subjMath} alt=""/>Math</button>
    <button type="button" disabled title="Not part of this prototype"><img className="sw-icon" src={subjReading} alt=""/>Reading</button>
    <button type="button" disabled><img className="sw-icon" src={subjScience} alt=""/>Science<span>Soon</span></button>
  </nav>
}

/** "THE Hippo Trail" mark (or the picked name), built like the live "THE Know & Grow Cycle" mark. */
export function TrailMark({name}: {name: string}) {
  return <div className="kg-mark">
    <span className="kg-orbit"><img src={hugoHead} alt=""/></span>
    <span><small>THE</small><strong>Hippo <b>{nameWord(name)}</b></strong></span>
  </div>
}
