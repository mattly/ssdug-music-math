import React, { useState, useCallback, useMemo, useEffect } from 'react'
import styled from '@emotion/styled'

import useAudioContext from '../utils/useAudioContext'
import useBufferLoader from '../utils/useBufferLoader'
import soundDefs from '../utils/soundDefs'
import { css } from '@emotion/css'

const Container = styled.div({
  display: 'grid',
  gridTemplateColumns: '10em 640px',
  columnGap: '10px',
})

const Row = styled.div({
  display: 'flex',
})

const Left = styled.div({
  width: `10rem`,
  marginRight: `0.5rem`,
  textAlign: 'right',
})

const rightWidth = 640

const Right = styled.div({
  width: `${rightWidth}px`,
  position: 'relative',
}, ({ styles }) => ({
  ...styles,
}))

const PhaseDisplay = styled.div({
  backgroundColor: '#a22',
  height: '20px',
  width: `${rightWidth / 64}px`,
  position: 'absolute'
}, ({ phase }) => ({
  left: `${phase * 10}px`,
}))

const Player = ({ context, sounds }) => {
  const [barLength, setBarLength] = useState(2000)
  const [bar, setBar] = useState(0)
  const [phase, setPhase] = useState(0)

  useEffect(
    () => {
      let bars = 0
      let startClock = context.currentTime + 0.25
      let nextBarClock = startClock
      let scheduleAgainIn

      let timerID
      const scheduleBar = () => {
        const thisClock = nextBarClock
        nextBarClock = thisClock + (barLength / 1000)
        scheduleAgainIn = (nextBarClock - context.currentTime) * 1000
        console.log({ bars, thisClock, nextBarClock,  time: context.currentTime, scheduleAgainIn })
        timerID = setTimeout(scheduleBar, scheduleAgainIn - 10)
        const phaseTime = scheduleAgainIn / 64
        for (let i = 0; i < 64; i++) {
          setTimeout(() => setPhase(i), phaseTime*i)
        }
        setBar(b => b + 1)
        bars++
      }
      scheduleBar()
      return () => clearTimeout(timerID)
    },
    [barLength]
  )

  return <div>
    <div>
      <label>Bar Length (ms):
        <input type="number" value={barLength} onChange={e => setBarLength(e.target.value)} min={500} max={4000} step={10} />
      </label>
    </div>
    <div>
      <Row>
        <Left>Bars</Left>
        <Right>{bar}</Right>
      </Row>
      <Row>
        <Left>Phase</Left>
        <Right styles={{backgroundColor: '#ddd'}}>
          <PhaseDisplay phase={phase} />
        </Right>
      </Row>
    </div>
  </div>
}

export default () => {
  const context = useAudioContext()
  const sounds = useBufferLoader(context, soundDefs)

  if (!sounds) { return "loading" }
  return <Player context={context} sounds={sounds} />
}
