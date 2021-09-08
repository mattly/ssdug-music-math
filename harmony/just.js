import styled from '@emotion/styled'
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Fraction from 'fraction.js'
import useAudioContext from '../utils/useAudioContext'
import { useAnalyser, AnalyserDisplay } from '../timber/analyser'

const NoteContainer = styled.div({
  overflowX: 'scroll',
  backgroundColor: '#eee'
})

const NoteRow = styled.div({
  display: 'flex',
})

const Note = styled.div({
  minWidth: '5rem',
  textAlign: 'center',
  padding: '5px',
  margin: '5px 5px 5px 0',
  backgroundColor: 'white'
})

const OscButton = styled.button({
  margin: '0 1px',
  padding: '2px 3px',
  border: '2px solid #eee',
  borderRadius: '3px',
}, ({ running }) => ({
  backgroundColor: running ? '#eee' : 'white',
}))

const lineStyle = { strokeWidth: 2, fill: 'none' }

const NoteWheel = ({ notes, names={}, size = 200, }) => {
  const height = size * 0.75
  const middle= size/2
  return <svg width={size} height={height} style={{fontSize: '12px'}}>
    <circle cx={middle} cy={height / 2} r={size/4} {...lineStyle} stroke="#ddd" />
    <g>{notes.map(({ scale, ratio }) => {
      const pct = Math.log(scale)/Math.log(2)
      const textAlign = pct > 0.5 ? 'end' : 'start'
      return <g key={ratio} transform={`rotate(${pct * 360}, ${middle}, ${height/2})`}>
        <line key={ratio} {...lineStyle} stroke="#aaa" x1={middle} y1={height * 0.1} x2={middle} y2={height * 0.3} />
        <text x={middle} y={height * 0.1} textAnchor={textAlign}
          transform={`rotate(${pct * -360}, ${middle}, ${height * 0.08})`}>{names[ratio] || ratio}</text>
      </g>
    })}</g>
  </svg>
}

const snapFraction = fraction => {
  while (fraction.valueOf() < 1) {
    fraction = fraction.mul(2)
  }
  while (fraction.valueOf() >= 2) {
    fraction = fraction.div(2)
  }
  return fraction
}

const row = { borderBottom: '1px solid #ddd', margin: 0, fontSize: '12px', textAlign: 'right' }

const NoteTable = ({ notes, names, displayCents }) => {
  const sorted = notes.sort((a,b) => a.scale - b.scale)
  return <table>
    <thead>
      <tr>
        <th>&nbsp;</th>
        {sorted.map(n => <th key={n.ratio} style={row}>{names[n.ratio] || n.ratio}</th>)}
      </tr>
    </thead>
    <tbody>
      {sorted.map(m => <tr key={m.ratio}>
          <th style={row}>{names[m.ratio] || m.ratio}</th>
          {sorted.map(n => {
            let interval = snapFraction(new Fraction(m.scale / n.scale))
            return <td key={n.ratio} style={row}>{
              displayCents ?
                (Math.log(interval.valueOf()) / Math.log(2) * 1200).toFixed(2)
                : interval.toFraction()
            }</td>
          })}
        </tr>
      )}
    </tbody>
  </table>
}

const overToneMax = 6000
const OvertoneDisplay = ({ notes, width = 1024, height = 100 }) => {
  const freqs = useMemo(() =>
    notes.map(v => {
      const base = v.scale * v.mult * 100
      const tones = [base]
      let overtone = 2
      while (overtone * base < 6000) {
        tones.push(overtone * base)
        overtone++
      }
      return tones
    })
    , [notes])

  return <svg width={width} height={height}>
    <g>
      {freqs.map(series => <g key={series[0]}>
        {series.map((hz, i) =>
          <rect key={hz} x={hz / 6000 * width} y={0} height={height} width={1}
            fill={'rgb(V,V,V)'.replace(/V/g, i / series.length * 200)}
            fillOpacity={0.25}/>)}
      </g>) }
    </g>
  </svg>
}

const makeFifth = (baseRatio, distance) => {
  let ratio = new Fraction(baseRatio)
  let fifth = new Fraction(1.5)
  if (distance >= 0) {
    for (let i = 0; i < distance; i++) {
      ratio = ratio.mul(fifth)
    }
  } else {
    for (let i = 0; i > distance; i--) {
      ratio = ratio.div(fifth)
    }
  }
  ratio = snapFraction(ratio)
  return {
    distance,
    scale: ratio.valueOf(),
    ratio: ratio.toFraction(),
  }
}

const withNumber = f => event => event.target.validity.valid && f(event.target.valueAsNumber)
const withNameNumber = f => event => event.target.validity.valid && f(event.target.name, event.target.valueAsNumber)

const oscButtons = [0.25, 0.5, 1, 2, 4]

export default () => {
  const ctx = useAudioContext()
  const analyser = useAnalyser(ctx)

  const oscillators = useRef(new Map())

  const [baseFreq, setBaseFreq] = useState(200)
  const handleBaseFreqChange = useCallback(withNumber(setBaseFreq))

  const [bounds, setBounds] = useState({ downX: 1, upX: 2, downY: 0, upY: 0 })
  const handleBoundsChange = useCallback(withNameNumber((name, value) => setBounds(({ ...vals }) => ({ ...vals, [name]: value }))))

  const [displayCents, setDisplayCents] = useState(false)
  const handleDisplayCents = useCallback(() => setDisplayCents(v => !v))

  const grid = useMemo(() => {
    let rows = []
    let base = 1
    for (let y = 0; y <= bounds.upY; y++) {
      const cells = []
      for (let x = (bounds.downX * -1); x <= bounds.upX; x++) {
        cells.push(makeFifth(base, x))
      }
      rows = [cells, ...rows]
      base = base * 5/4
    }
    base = 8/5
    for (let y = 0; y < bounds.downY; y++) {
      const cells = []
      for (let x = (bounds.downX * -1); x <= bounds.upX; x++) {
        cells.push(makeFifth(base, x))
      }
      rows.push(cells)
      base = base * 8/5
    }
    return rows
  }, [bounds])
  const notes = useMemo(() => grid.flatMap(row => row), [grid])

  const [noteNames, setNoteNames] = useState({})
  const handleNoteNameChange = useCallback(event => {
    setNoteNames(({...vals}) => ({...vals, [event.target.name]: event.target.value }))
  }, [])

  const [runningOscs, setRunningOscs] = useState({ vals: new Map() })
  const handleOscChange = useCallback(event => {
    const scale = parseFloat(event.target.value)
    const mult = parseFloat(event.target.name)
    const key = Symbol.for([scale, mult])
    setRunningOscs(({ vals }) => {
      if (vals.has(key)) { vals.delete(key) } else { vals.set(key, { scale, mult }) }
      return { vals }
    })
  }, [ctx])

  useEffect(() => {
    const availNotes = new Set(notes.map(({ scale }) => scale))
    const { vals } = runningOscs
    let changed = false
    vals.forEach(({ scale }, k) => {
      if (!availNotes.has(scale)) { vals.delete(k); changed = true }
    })
    changed && setRunningOscs({ vals })
  }, [notes, runningOscs])

  const panic = useCallback(() => setRunningOscs({ vals: new Map() }))

  useEffect(() => {
    const targetTime = ctx.currentTime + 0.25
    oscillators.current.forEach((v, k) => {
      if (!runningOscs.vals.has(k)) {
        const { osc, gain } = oscillators.current.get(k)
        osc.stop(targetTime)
        gain.gain.exponentialRampToValueAtTime(0.00001, targetTime)
        oscillators.current.delete(k)
      }
    })
    runningOscs.vals.forEach(({ scale, mult }, k) => {
      const targetFreq = baseFreq * scale * mult
      if (!oscillators.current.has(k)) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(targetFreq, ctx.currentTime)
        osc.start()
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.00001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.1, targetTime)
        osc.connect(gain)
        gain.connect(analyser)
        gain.connect(ctx.destination)
        oscillators.current.set(k, { osc, gain })
      } else {
        const { osc } = oscillators.current.get(k)
        if (osc.frequency.value != targetFreq) {
          osc.frequency.linearRampToValueAtTime(targetFreq, targetTime)
        }
      }
    })
  }, [ctx, analyser, runningOscs, baseFreq])

  return <div>
    <div style={{display: 'flex'}}>
      <div>
        <div>
          base frequency:
          <input type="number" min={20} max={2000} value={baseFreq} onChange={handleBaseFreqChange} />
        </div>
        <div>
          fifths Down:
          <input type="number" min={0} max={12} value={bounds.downX} name="downX" onChange={handleBoundsChange} />
        </div>
        <div>
          fifths Up:
          <input type="number" min={1} max={12} value={bounds.upX} name="upX" onChange={handleBoundsChange} />
        </div>
        <div>
          thirds Down:
          <input type="number" min={0} max={4} value={bounds.downY} name="downY" onChange={handleBoundsChange} />
        </div>
        <div>
          thirds Up:
          <input type="number" min={1} max={4} value={bounds.upY} name="upY" onChange={handleBoundsChange} />
        </div>
        <div>
          display cents:
          <input type="checkbox" checked={displayCents} onChange={handleDisplayCents} />
        </div>
        <div>
          <button onClick={panic}>silence!</button>
        </div>
      </div>
      <NoteWheel notes={notes} names={noteNames} />
    </div>
    <NoteTable notes={notes} names={noteNames} displayCents={displayCents} />

    <NoteContainer>
      {grid.map((row, idx) =>
        <NoteRow key={idx}>
          {row.map(n =>
            <Note key={n.distance}>
              <input type="text" style={{ width: '3rem', textAlign: 'center' }}
                name={n.ratio} value={noteNames[n.ratio] || ''} onChange={handleNoteNameChange} />
              <div><strong>{n.ratio}</strong></div>
              <div>{(baseFreq * n.scale).toFixed(2)}</div>
              <div>
                {oscButtons.map(b =>
                  <OscButton running={runningOscs.vals.has(Symbol.for([n.scale, b]))} key={b} name={b} value={n.scale} onClick={handleOscChange}>{b}</OscButton>
                )}
              </div>
            </Note>)}
        </NoteRow>
      )}
    </NoteContainer>
    <OvertoneDisplay notes={Array.from(runningOscs.vals.values())} />
    <AnalyserDisplay analyser={analyser} freqHeight={100} />
  </div>
}
