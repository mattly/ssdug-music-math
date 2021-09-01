import React, { useState, useCallback, useMemo } from 'react'

import useAudioContext from '../utils/useAudioContext'
import useBufferLoader from '../utils/useBufferLoader'
import soundDefs from '../utils/soundDefs'

import player from './player'

const tempo = 120
const tempo2ms = (tempo) => 60000 / tempo


// --- example 1
const ex1_mayhem = (context, sounds) => {
  let players = []

  const play = () =>
    players = sounds.map(s => {
      const p = player(context, s)
      p.source.loop = true
      p.source.start()
      return p
    })

  return {
    start: () => play(),
    stop: () => players.forEach(s => s.source.stop())
  }
}

// --- example 2
const ex2_clock = (context, sounds, setClockState) => {
  let beats = 0
  let startClock
  let startTime
  let timerId
  const beatTime = tempo2ms(tempo) / 1000

  const playBeat = () => {
    let s = sounds[2]
    if (beats % 2 == 1) { s = sounds[0] }
    else { s = sounds[1] }
    const thisBeat = startClock + (beatTime * beats)
    player(context, s).source.start(thisBeat)
    player(context, sounds[2]).source.start(thisBeat + (beatTime / 2))
    setClockState({ beats, beatPhase: (beats % 4) })

    beats++
    const nextSchedule = startTime + (beats * beatTime * 1000) - Date.now()
    timerId = setTimeout(playBeat, nextSchedule - 10)
  }

  return {
    example: 2,
    start: () => {
      beats = 0
      startClock = context.currentTime + 0.1
      startTime = Date.now()
      playBeat()
    },
    stop: () => { clearTimeout(timerId) }
  }
}

// --- example 3

const ex3_bar = (context, sounds, setClockState) => {
  let bars = 0
  let startClock, startTime, timerId
  const beatTime = tempo2ms(tempo) / 1000
  const barTime = beatTime * 4
  const [kick, snare, hat] = sounds

  const playBar = () => {
    const barStart = startClock + (barTime * bars)
    const barCycle = bars % 4
    const phase = p => barStart + (p * barTime)
    player(context, kick).source.start(phase(0))
    if (barCycle == 1 || barCycle == 3) {
      player(context, kick).source.start(phase(1/4))
    }
    if (barCycle != 1) {
      player(context, kick).source.start(phase(3/8))
    }
    player(context, snare).source.start(phase(2 / 4))
    for (let i=0; i < 4; i++) {
      player(context, hat).source.start(phase((i*2+1)/8))
    }
    if (barCycle == 3) {
      player(context, hat).source.start(phase(6/8))
      player(context, hat).source.start(phase(15/16))
    }
    setClockState({ bars, barCycle })

    bars++
    const nextSchedule = startTime + (bars * barTime * 1000) - Date.now()
    timerId = setTimeout(playBar, nextSchedule - 10)
  }

  return {
    example: 3,
    start: () => {
      bars = 0
      startClock = context.currentTime + 0.1
      startTime = Date.now()
      playBar()
    },
    stop: () => { clearTimeout(timerId) }
  }
}

const Player = ({ context, sounds }) => {
  const [playing, setPlaying] = useState(false)
  const [clockState, setClockState] = useState(null)

  const src = ex1_mayhem
  // const src = ex2_clock
  // const src = ex3_bar

  const source = useMemo(() => src(context, sounds, setClockState), [])

  const togglePlaying = useCallback(
    () => {
      if (playing) { source.stop() }
      else { source.start() }
      setPlaying(!playing)
    }, [source, playing, setPlaying]
  )

  return <div>
    Hello: {sounds.length} sounds

    <form>
      <label>Playing: <input type="checkbox" checked={playing} onChange={togglePlaying} /></label>
    </form>

    {clockState && <div>
        {Object.keys(clockState).map(k =>
          <div key={k}>{k}: {clockState[k]}</div>
        )}
      </div>}
</div>
}

const Beats = () => {
  const context = useAudioContext()
  const sounds = useBufferLoader(context, soundDefs)

  if (!sounds) { return "loading" }
  return <Player {...{context, sounds}} />
}

export default Beats
