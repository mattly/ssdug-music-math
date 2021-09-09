import styled from '@emotion/styled'
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import useAudioContext from '../utils/useAudioContext'
import { useAnalyser, AnalyserDisplay } from '../timber/analyser'

const notes = "CDEFGAB"

const height = 500
const width = 1200
const innerWidth = 1150
const innerHeight = height - 20

const latticeBase = [
  [null, 4, 1, 5, 2],
  [null, 2, 6, 3, 7, 4, 1],
  [   3, 7, 4, 1, 5, 2, 6, 3],
  [null, 5, 2, 6, 3, 7, 4]
]

const suffixes = (row, idx) => {
  switch (row) {
    case 0: return "#"
    case 1: return idx > 4 ? "#" : ""
    case 2: return idx < 2 ? "b" : ""
    case 3: return idx < 6 ? "b" : ""
  }
}

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

const noteName = (n, i, row) => `${notes[n-1]}${suffixes(row, i)}`

const notesIdx = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
const noteFreqs = {}
for (let i = 0; i < 12; i++) {
  noteFreqs[notesIdx[i]] = 440 * Math.pow(2, (i-9) / 12)
}

const chordNames = ["I", "II", "III", "IV", "V", "VI", "VII"]

const baseLine = { strokeWidth: 2 }

const noteCoords = (idx, row) => ({
  x: ((2 - row) * innerWidth / 20) + (innerWidth * idx / 8),
  y: ((innerHeight / 2) + ((row - 2) * (innerHeight / 4.1))) + ((1 - (idx - 3)) * 15),
  note: latticeBase[row] && latticeBase[row][idx] && noteName(latticeBase[row][idx], idx, row)
})

const neighbors = (i, row) => ({
  base: noteCoords(i, row),
  fifth: latticeBase[row][i+1] && noteCoords(i + 1, row),
  thirdUp: row > 0 && latticeBase[row - 1][i] && noteCoords(i, row - 1),
  thirdDown: row < 3 && latticeBase[row + 1][i + 1] && noteCoords(i + 1, row + 1),
  chord: `${suffixes(row, i)}${chordNames[(latticeBase[row][i]+chordNames.length-1) % chordNames.length]}`
})

const ChordLines = ({ ns, row, onChord, chordNotes }) => {
  const lines = []
  ns.forEach((n, i) => {
    if (n) {
      const { base, fifth, thirdUp, thirdDown } = neighbors(i, row)
      if (fifth) { lines.push({ base, other: fifth, stroke: "#88f", notes: [base.note, findEquivalence(fifth.note)] }) }
      if (thirdUp) { lines.push({ base, other: thirdUp, stroke: "#fa8", notes: [base.note, findEquivalence(thirdUp.note)] }) }
      if (thirdDown) { lines.push({ base, other: thirdDown, stroke: "#a84", notes: [base.note, findEquivalence(thirdDown.note)] }) }
    }
  })
  return <g>
      {lines.map(({ stroke, base, other, notes }, i) =>
        <line key={i} x1={base.x} x2={other.x} y1={base.y} y2={other.y}
          stroke={chordNotes == notes.sort().join(',') ? "#ff8" : stroke} strokeWidth="10"
          onClick={onChord} data-chord={notes.join(',')} />)}
  </g>
}

const pointer = {cursor:'pointer'}
const noPointer = {pointerEvents: 'none'}

const MajChord = ({ chord, base, fifth, thirdUp, onChord, chordNotes }) => {
  if (!fifth || !thirdUp) { return null }
  let x = (base.x + fifth.x + thirdUp.x) / 3
  let y = ((base.y + fifth.y + thirdUp.y) / 3) + ((base.y - thirdUp.y) / 5)
  let notes = [base.note, fifth.note, thirdUp.note].map(findEquivalence).sort().join(',')
  let baseNoteIdx = notesIdx.indexOf(findEquivalence(base.note))
  let seventh = notesIdx[(baseNoteIdx + 10) % 12]
  let notes7 = [base.note, fifth.note, thirdUp.note, seventh].map(findEquivalence).sort().join(',')
  let sevenM = notesIdx[(baseNoteIdx + 11) % 12]
  let notesM7 = [base.note, fifth.note, thirdUp.note, sevenM].map(findEquivalence).sort().join(',')
  return <g>
    <rect x={x - 35} y={y - 15} width={70} height={20} ry={5}
      fill={chordNotes == notes ? '#ff8' : "#eee"} style={pointer}
      data-chord={notes} onClick={onChord} />
    <text x={x} y={y} textAnchor="middle" style={noPointer}>{chord} / {base.note}M</text>
    <rect x={x - 22} y={y - 45} width={15} height={20} ry={5}
      fill={chordNotes == notes7 ? '#ff8' : '#eee'} style={pointer}
      data-chord={notes7} onClick={onChord} />
    <text x={x - 15} y={y - 30} textAnchor="middle" style={noPointer}>7</text>
    <rect x={x} y={y - 45}  width={25} height={20} ry={5}
      style={pointer} fill={chordNotes == notesM7 ? '#ff8' : '#eee'}
      data-chord={notesM7} onClick={onChord} />
    <text x={x + 12} y={y - 30} textAnchor="middle" style={noPointer}>M7</text>
  </g>
}

const MinChord = ({ chord, base, fifth, thirdDown, onChord, chordNotes }) => {
  if (!fifth || !thirdDown) { return null }
  let x = (base.x + fifth.x + thirdDown.x) / 3
  let y = ((base.y + fifth.y + thirdDown.y) / 3) - ((thirdDown.y - base.y) / 8)
  let notes = [base.note, fifth.note, thirdDown.note].map(findEquivalence).sort().join(',')
  let baseNoteIdx = notesIdx.indexOf(findEquivalence(base.note))
  let seventh = notesIdx[(baseNoteIdx + 10) % 12]
  let notes7 = [base.note, fifth.note, thirdDown.note, seventh].map(findEquivalence).sort().join(',')
  let sevenM = notesIdx[(baseNoteIdx + 11) % 12]
  let notesM7 = [base.note, fifth.note, thirdDown.note, sevenM].map(findEquivalence).sort().join(',')
  return <g>
    <rect x={x - 35} y={y - 15} width={70} height={20} ry={5}
      fill={chordNotes == notes ? '#ff8' : '#eee'} style={pointer}
      data-chord={notes} onClick={onChord} />
    <text x={x} y={y} textAnchor="middle" style={noPointer}>{chord.toLowerCase()} / {base.note}m</text>
    <rect x={x - 22} y={y + 15} width={15} height={20} ry={5}
      fill={chordNotes == notes7 ? '#ff8' : '#eee'} style={pointer}
      data-chord={notes7} onClick={onChord} />
    <text x={x - 15} y={y + 30} textAnchor="middle" style={noPointer}>7</text>
    <rect x={x} y={y + 15}  width={25} height={20} ry={5}
      style={pointer} fill={chordNotes == notesM7 ? '#ff8' : '#eee'}
      data-chord={notesM7} onClick={onChord} />
    <text x={x + 12} y={y + 30} textAnchor="middle" style={noPointer}>M7</text>
  </g>
}

const FifthRow = ({ ns, row, onNote, runningNotes, onChord, chordNotes }) => {
  return <g>
    {ns.map((n, i) => {
      if (!n) { return null }
      const { chord, base, fifth, thirdDown, thirdUp } = neighbors(i, row)
      const equiv = findEquivalence(base.note)
      const on = runningNotes[equiv]
      const chordOn = chordNotes.match(new RegExp(`${equiv},?`))
      return <g key={i}>
        <circle cx={base.x} cy={base.y} r={12}
          stroke={chordOn ? "black" : "#aaa"} {...baseLine} fill={on ? "#ff8" : "white"} style={pointer}
          data-note={equiv} onClick={onNote} />
        <text x={base.x} y={base.y + 5} textAnchor="middle" style={noPointer}>{base.note}</text>
        <MajChord {...{ base, fifth, thirdUp, onChord, chordNotes, chord }} />
        <MinChord {...{base, fifth, thirdDown, onChord, chordNotes, chord}} />
      </g>
    })}
  </g>
}

const getOverTonesFor = freq => {
  const tones = [freq]
  let overtone = 2
  while (overtone * freq < overToneMax) {
    tones.push(overtone * freq)
    overtone++
  }
  return tones
}

const overToneMax = 6000
const OvertoneDisplay = ({ notes, chord, width = 1024, height = 100 }) => {
  const freqs = useMemo(() => {
    const noteTones = Object.keys(notes).filter(k => notes[k]).map(k => getOverTonesFor(noteFreqs[k]))
    const chordTones = chord.map(n => getOverTonesFor(noteFreqs[n]/2))
    return [...noteTones, ...chordTones]
  }, [notes, chord])

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

const stopOscillator = ({ osc, gain }, ctx) => {
  osc.stop(ctx.currentTime + 0.25)
  gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.25)
}

const startOscillator = (ctx, analyser, freq) => {
  const osc = ctx.createOscillator()
  osc.type = 'sawtooth'
  osc.frequency.setValueAtTime(freq, ctx.currentTime)
  osc.start()
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.00001, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.1, ctx.currentTime + 0.25)
  osc.connect(gain)
  gain.connect(analyser)
  gain.connect(ctx.destination)
  return { osc, gain }
}

export default () => {
  const ctx = useAudioContext()
  const analyser = useAnalyser(ctx)
  const oscillators = useRef(new Map())
  const chordOscillators = useRef([])

  const [runningNotes, setRunningNotes] = useState({ })
  const handleNoteChange = useCallback(event => {
    const note = event.target.dataset.note
    setRunningNotes(({ ...notes }) => ({ ...notes, [note]: !notes[note]}))
  }, [ctx])
  const [activeChord, setActiveChord] = useState([])
  const handleChordChange = useCallback(event => {
    let next = event.target.dataset.chord.split(',').sort()
    setActiveChord(val => val.join(',') == next.join(',') ? [] : next)
  })

  const panic = useCallback(() => { setRunningNotes({}) })

  useEffect(() => {
    oscillators.current.forEach((v, k) => {
      if (!runningNotes[k]) {
        stopOscillator(oscillators.current.get(k), ctx)
        oscillators.current.delete(k)
      }
    })
    Object.keys(runningNotes).filter(k => runningNotes[k]).forEach(k => {
      if (!oscillators.current.has(k)) {
        oscillators.current.set(k, startOscillator(ctx, analyser, noteFreqs[k]))
      }
    })
  }, [ctx, analyser, runningNotes])

  useEffect(() => {
    chordOscillators.current.forEach(o => stopOscillator(o, ctx))
    chordOscillators.current = activeChord.map(note => startOscillator(ctx, analyser, noteFreqs[note] / 2))
  }, [ctx, analyser, activeChord])

  return <div>
    <div>
    <button onClick={panic}>silence!</button>
    </div>

    <svg width={width} height={height}>
      <g transform={`translate(${(width - innerWidth) / 2}, 20)`}>
        {latticeBase.map((notes, i) =>
          <ChordLines key={i} ns={notes} row={i} onChord={handleChordChange} chordNotes={activeChord.join(',')} />)}
        {latticeBase.map((notes, rowIdx) =>
          <FifthRow key={rowIdx} ns={notes} row={rowIdx}
            onNote={handleNoteChange} runningNotes={runningNotes}
            chordNotes={activeChord.join(',')} onChord={handleChordChange} />)}
      </g>
    </svg>

    <OvertoneDisplay notes={runningNotes} chord={activeChord} />
    <AnalyserDisplay analyser={analyser} freqHeight={100} />
  </div>
}
