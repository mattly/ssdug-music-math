import { css } from '@emotion/css'
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import Fraction from 'fraction.js'

import useAudioContext from '../utils/useAudioContext'
import { AnalyserDisplay, useAnalyser } from './analyser'


const drawbar = (ratio, gain) => ({ ratio, gain })

const withNameNumber = f => ({ target }) => target.valueAsNumber && f(target.name, target.valueAsNumber)

const baseRatio = n => {
  if (n <= 0) { return NaN }
  if (!isFinite(n)) { return NaN }
  if (n < 1) { return baseRatio(n * 2) }
  if (n >= 2) { return baseRatio(n / 2) }
  return new Fraction(n).toFraction()
}

export default () => {
  const context = useAudioContext()
  const analyser = useAnalyser(context)

  const [playing, setPlaying] = useState(false)
  const togglePlayingState = useCallback(() => setPlaying(p => !p), [])

  const [baseFreq, setBaseFreq] = useState(100)
  const handleBaseFreqChange = useCallback(withNameNumber((name, val) => setBaseFreq(val)), [])

  const [drawBars, setDrawBars] = useState(() => ({
    vals: [
      drawbar(0.5, 0), drawbar(0.75, 0), drawbar(1, 20),
      drawbar(2, 0), drawbar(3, 0), drawbar(4, 0),
      drawbar(5, 0), drawbar(6, 0), drawbar(8, 0)
    ]
  }))
  const handleDrawBarChange = useCallback(withNameNumber((name, val) => {
    const [idx, fieldName] = name.split('.')
    setDrawBars(({ vals }) => {
      vals[parseInt(idx)][fieldName] = val
      return { vals }
    })
  }), [])

  const mainGainMax = 0.2
  const mainGain = useMemo(() => {
    const g = context.createGain()
    g.gain.setValueAtTime(mainGainMax, context.currentTime)
    g.connect(analyser)
    g.connect(context.destination)
    return g
  }, [context])

  const oscGainScale = 0.025
  const oscillatorBank = useMemo(() =>
    drawBars.vals.map(bar => {
      const osc = context.createOscillator()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(baseFreq * bar.ratio, context.currentTime)
      const gain = context.createGain()
      gain.gain.setValueAtTime(Math.max(bar.gain * oscGainScale, 0.0001), context.currentTime)
      osc.connect(gain)
      gain.connect(mainGain)
      osc.start()
      return { osc, gain }
    })
  , [context, analyser])

  useEffect(() => {
    mainGain.gain.exponentialRampToValueAtTime(playing ? mainGainMax : 0.0001, context.currentTime + 0.5)
  }, [oscillatorBank, playing])

  useEffect(() => {
    const now = context.currentTime
    oscillatorBank.forEach((o, i) => {
      o.osc.frequency.linearRampToValueAtTime(baseFreq * drawBars.vals[i].ratio, now + 0.1)
      o.gain.gain.exponentialRampToValueAtTime(Math.max(drawBars.vals[i].gain * oscGainScale, 0.0001), now + 0.1)
    })
  }, [oscillatorBank, baseFreq, drawBars])

  return <div>
    <div>
      <button onClick={togglePlayingState}>{playing ? 'Stop' : 'Play'}</button>
    </div>
    <div>
      Base Frequency: <input type="number" value={baseFreq} min={25} max={3000} onChange={handleBaseFreqChange} />
    </div>
    <div>
      {drawBars.vals.map((bar, i) =>
        <div key={i} className={css({display: 'grid', gridTemplateColumns: `5rem 5rem 10rem`, gap: '1rem'})}>
          <input type="number" value={bar.ratio} min={0} max={16} step={0.025} name={`${i}.ratio`} onChange={handleDrawBarChange} />
          <div>{baseRatio(bar.ratio)}</div>
          <input type="range" value={bar.gain} min={-1} max={20} name={`${i}.gain`} onChange={handleDrawBarChange} />
        </div>
      )}
    </div>
    <AnalyserDisplay analyser={analyser} />
  </div>
}
