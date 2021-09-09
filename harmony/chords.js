import styled from '@emotion/styled'
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import useAudioContext from '../utils/useAudioContext'
import { useAnalyser, AnalyserDisplay } from '../timber/analyser'

const notes = "CDEFGAB"

const height = 600
const width = 1200
const innerWidth = 1150
const innerHeight = height - 20

const latticeBase = [
  [null, 4, 1, 5, 2],
  [null, 2, 6, 3, 7, 4, 1],
  [   3, 7, 4, 1, 5, 2, 6, 3],
  [null, 5, 2, 6, 3, 7, 4]
]

const noteCoords = (idx, row) => ({
  x: ((2 - row) * innerWidth / 20) + (innerWidth * idx / 8),
  y: ((innerHeight / 2) + ((row - 2) * (innerHeight / 5))) + ((1 - (idx - 3)) * 15)
})

const suffixes = (row, idx) => {
  switch (row) {
    case 0: return "#"
    case 1: return idx > 4 ? "#" : ""
    case 2: return idx < 2 ? "b" : ""
    case 3: return "b"
  }
}

const baseLine = { strokeWidth: 2 }

const ChordLines = ({ ns, row }) => <g>
  {ns.map((n, i) => {
    if (!n) { return null }
    const base = noteCoords(i, row)
    const fifth = i < ns.length-1 && noteCoords(i + 1, row)
    const thirdUp = row > 0 && latticeBase[row - 1][i] && noteCoords(i, row - 1)
    const thirdDown = row < 3 && latticeBase[row+1][i+1] && noteCoords(i+1, row+1)
    return <g key={i}>
      {fifth && <line x1={base.x} x2={fifth.x} y1={base.y} y2={fifth.y} stroke="#88f" {...baseLine} />}
      {thirdUp && <line x1={base.x} x2={thirdUp.x} y1={base.y} y2={thirdUp.y} stroke="#fa8" {...baseLine} />}
      {thirdDown && <line x1={base.x} x2={thirdDown.x} y1={base.y} y2={thirdDown.y} stroke="#a84" {...baseLine} />}
    </g>
  })}
</g>

const equivalences = [
  new Set(["Db", "C#"]),
  new Set(["Eb", "D#"]),
  new Set(["E", "Ff"]),
  new Set(["Gb", "F#"]),
  new Set(["Ab", "G#"]),
  new Set(["Bb", "A#"])
]

const standalone = new Set(["C", "D", "F", "G", "A", "B"])

const findEquivalence = note => {
  if (standalone.has(note)) { return note }
  const e = equivalences.find(s => s.has(note))
  if (!e) { return note }
  return Array.from(e)[0]
}

const FifthRow = ({ ns, row, onClick, running }) => {
  return <g>
    {ns.map((n, i) => {
      if (!n) { return null }
      const { x, y } = noteCoords(i, row)
      const note = `${notes[n - 1]}${suffixes(row, i)}`
      const equiv = findEquivalence(note)
      const on = running[equiv]
      return <g key={i}>
        <circle cx={x} cy={y} r={12} stroke={on ? "#333" : "#aaa"} {...baseLine} fill={on ? "#ff8" : "white"} style={{cursor: 'pointer'}} data-note={equiv} onClick={onClick} />
        <text x={x} y={y + 5} textAnchor="middle" stroke="#888" style={{pointerEvents: 'none'}}>{note}</text>
      </g>
    })}
  </g>
}

const notesIdx = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
const noteFreqs = {}
for (let i = 0; i < 12; i++) {
  noteFreqs[notesIdx[i]] = 440 * Math.pow(2, (i-9) / 12)
}

const overToneMax = 6000
const OvertoneDisplay = ({ notes, width = 1024, height = 100 }) => {
  const freqs = useMemo(() =>
    Object.keys(notes).filter(k => notes[k]).map(k => {
      const base = noteFreqs[k]
      const tones = [base]
      let overtone = 2
      while (overtone * base < overToneMax) {
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
          <rect key={hz} x={hz / overToneMax * width} y={0} height={height} width={1}
            fill={'rgb(V,V,V)'.replace(/V/g, i / series.length * 200)}
            fillOpacity={0.25}/>)}
      </g>) }
    </g>
  </svg>
}

export default () => {
  const ctx = useAudioContext()
  const analyser = useAnalyser(ctx)
  const oscillators = useRef(new Map())

  const [runningNotes, setRunningNotes] = useState({ })
  const handleNoteChange = useCallback(event => {
    const note = event.target.dataset.note
    setRunningNotes(({ ...notes }) => ({ ...notes, [note]: !notes[note]}))
  }, [ctx])

  const panic = useCallback(() => { setRunningNotes({}) })

  useEffect(() => {
    const targetTime = ctx.currentTime + 0.25
    oscillators.current.forEach((v, k) => {
      if (!runningNotes[k]) {
        const { osc, gain } = oscillators.current.get(k)
        osc.stop(targetTime)
        gain.gain.exponentialRampToValueAtTime(0.00001, targetTime)
        oscillators.current.delete(k)
      }
    })
    Object.keys(runningNotes).filter(k => runningNotes[k]).forEach(k => {
      if (!oscillators.current.has(k)) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(noteFreqs[k], ctx.currentTime)
        osc.start()
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.00001, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.1, targetTime)
        osc.connect(gain)
        gain.connect(analyser)
        gain.connect(ctx.destination)
        oscillators.current.set(k, { osc, gain })
      }
    })
  }, [ctx, analyser, runningNotes])


  return <div>
    <div>
    <button onClick={panic}>silence!</button>
    </div>

    <svg width={width} height={height}>
     <g transform={`translate(${(width - innerWidth) / 2}, ${(height - innerHeight) / 2})`}>
       {latticeBase.map((notes, i) => <ChordLines key={i}  ns={notes} row={i} />)}
       {latticeBase.map((notes, rowIdx) => <FifthRow  key={rowIdx} ns={notes} row={rowIdx} onClick={handleNoteChange} running={runningNotes} />)}
     </g>
    </svg>

    <OvertoneDisplay notes={runningNotes} />
    <AnalyserDisplay analyser={analyser} freqHeight={100} />
  </div>
}
