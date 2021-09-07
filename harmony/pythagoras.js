import styled from '@emotion/styled'
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import Fraction from 'fraction.js'
import useAudioContext from '../utils/useAudioContext'
import { useAnalyser, AnalyserDisplay } from '../timber/analyser'

const NoteContainer = styled.div({
  overflowX: 'scroll',
  display: 'flex',
  backgroundColor: '#eee'
})

const Note = styled.div({
  width: '5rem',
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

const NoteRelations = ({ notes, logScale, size = 200, }) => {
  const height = size * 0.75
  const middle= size/2
  return <svg width={size} height={height} style={{'font-size': '12px'}}>
    <circle cx={middle} cy={height / 2} r={size/4} {...lineStyle} stroke="#ddd" />
    <g>{notes.map(({ scale, ratio }) => {
      const pct = scale - 1
      const textAlign = pct > 0.5 ? 'end' : 'start'
      return <g transform={`rotate(${pct * 360}, ${middle}, ${height/2})`}>
        <line key={ratio} {...lineStyle} stroke="#aaa" x1={middle} y1={height * 0.1} x2={middle} y2={height * 0.3} />
        <text x={middle} y={height*0.1} textAnchor={textAlign} transform={`rotate(${pct * -360}, ${middle}, ${height*0.08})`}>{ratio}</text>
      </g>
    })}</g>
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
  while (ratio < 1) {
    ratio = ratio.mul(2)
  }
  while (ratio > 2) {
    ratio = ratio.div(2)
  }
  return {
    distance,
    scale: ratio.valueOf(),
    ratio: ratio.toFraction(),
  }
}

const withNumber = f => event => event.target.valueAsNumber && f(event.target.valueAsNumber)

const oscButtons = [0.25, 0.5, 1, 2, 4]

export default () => {
  const ctx = useAudioContext()
  const analyser = useAnalyser(ctx)

  const oscillators = useRef(new Map())

  const [baseFreq, setBaseFreq] = useState(200)
  const handleBaseFreqChange = useCallback(withNumber(setBaseFreq))

  const [[lower, upper], setBounds] = useState([1, 1])
  const setLower = useCallback(withNumber(lower => setBounds(([old, upper]) => ([lower, upper]))))
  const setUpper = useCallback(withNumber(upper => setBounds(([lower, old]) => ([lower, upper]))))

  const fifthsRange = useMemo(() => {
    const range = []
    for (let acc = (lower * -1); acc <= upper; acc++) {
      range.push(makeFifth(1, acc))
    }
    return range
  }, [lower, upper])

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
        gain.gain.exponentialRampToValueAtTime(0.15, targetTime)
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
          <input type="number" min={0} max={10} value={lower} onChange={setLower} />
        </div>
        <div>
          fifths Up:
          <input type="number" min={1} max={10} value={upper} onChange={setUpper} />
        </div>
      </div>
      <NoteRelations notes={fifthsRange} />
    </div>
    <NoteContainer>
      {fifthsRange.map(n =>
        <Note key={n.distance}>
          <div><strong>{n.ratio}</strong>: {n.freq}</div>
          <div>
            {oscButtons.map(b =>
              <OscButton running={runningOscs.vals.has(Symbol.for([n.scale, b]))} key={b} name={b} value={n.scale} onClick={handleOscChange}>{b}</OscButton>
            )}
          </div>
        </Note>
      )}
    </NoteContainer>
    <AnalyserDisplay analyser={analyser} freqHeight={300} />
  </div>
}
