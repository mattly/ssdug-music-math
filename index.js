import React from 'react'
import ReactDOM from 'react-dom'
import { Global, css } from '@emotion/react'
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom'

import Beats from './rhythm/beats'
import Euclid from './rhythm/euclid'
import Poly from './rhythm/poly'

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
