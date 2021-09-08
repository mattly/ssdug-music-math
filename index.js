import React from 'react'
import ReactDOM from 'react-dom'
import { Global, css } from '@emotion/react'
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom'

import Beats from './rhythm/beats'
import Euclid from './rhythm/euclid'
import Poly from './rhythm/poly'
import Domains from './timber/domains'
import Overtones from './timber/additive'
import Pythagoras from './harmony/pythagoras'
import JustIntonation from './harmony/just'

const toc = [
  {
    name: "Intro",
  },
  {
    name: "Rhythm",
    pages: [
      { name: "Beats", comp: Beats },
      { name: "A Theory of Division", comp: Euclid },
      { name: "Grid Dimensions", comp: Poly }
    ],
  },
  {
    name: "Timbre",
    pages: [
      { name: "Domains", comp: Domains },
      { name: "Overtones", comp: Overtones }
    ]
  },
  {
    name: "Harmony",
    pages: [
      { name: "Pythagorean", comp: Pythagoras },
      { name: "Just Intonation", comp: JustIntonation }
    ]
  }
]

const pageStyles = css({
  body: {
    fontFamily: 'sans-serif'
  }
})

const slugify = (sectionName, name) => `/${sectionName.trim()}/${name.trim()}`.replace(/\s+/g, '-').toLowerCase()

const TOC = () => (
  <nav>
  {toc.map(({ name: sectionName, pages=[] }) => (<div key={sectionName}>
    <h2>{sectionName}</h2>
    <ol>
      {pages.map(({ name }) => (
        <li key={name}><Link to={slugify(sectionName, name)}>{name}</Link></li>
      ))}
    </ol>
  </div>))}
</nav>
)

const App = () => (
    <Router>
      <Global styles={pageStyles} />
      <Switch>
      {toc.map(({ name: sectionName, pages=[] }) =>
        pages.map(({ name, comp }) => (
          <Route path={slugify(sectionName,name)} exact component={comp}/>
        ))
      )}
      <Route path="/" exact><TOC /></Route>
      </Switch>
    </Router>
)

ReactDOM.render(<App />, document.getElementById('root'))

if (module.hot) {
  module.hot.accept()
}
