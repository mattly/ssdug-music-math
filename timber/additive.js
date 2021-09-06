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

  const [baseFreq, setBaseFreq] = useState(375)
  const handleBaseFreqChange = useCallback(withNameNumber((name, val) => setBaseFreq(val)), [])

  const [waveType, setWaveType] = useState('sine')
  const handleWaveTypeChange = useCallback(e => setWaveType(e.target.value))

  const [drawBars, setDrawBars] = useState(() => ({
    vals: [
      drawbar(1, 20), drawbar(2, 0), drawbar(3, 0),
      drawbar(4, 0), drawbar(5, 0), drawbar(6, 0),
      drawbar(7, 0), drawbar(8, 0), drawbar(9, 0),
      drawbar(10, 0), drawbar(11, 0), drawbar(12, 0),
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
  const outGainMax = 0.12
  const [mainGain, outGain] = useMemo(() => {
    const g = context.createGain()
    g.gain.setValueAtTime(mainGainMax, context.currentTime)
    g.connect(analyser)
    const out = context.createGain()
    out.gain.setValueAtTime(outGainMax, context.currentTime)
    out.connect(context.destination)
    g.connect(out)
    return [g, out]
  }, [context])

  const oscGainScale = 0.025
  const oscillatorBank = useMemo(() =>
    drawBars.vals.map(bar => {
      const osc = context.createOscillator()
      osc.type = waveType
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
    outGain.gain.exponentialRampToValueAtTime(playing ? outGainMax : 0.0001, context.currentTime + 0.5)
  }, [oscillatorBank, playing])

  useEffect(() => {
    const now = context.currentTime
    oscillatorBank.forEach((o, i) => {
      o.osc.frequency.linearRampToValueAtTime(baseFreq * drawBars.vals[i].ratio, now + 0.1)
      o.gain.gain.exponentialRampToValueAtTime(Math.max(drawBars.vals[i].gain * oscGainScale, 0.0001), now + 0.1)
    })
  }, [oscillatorBank, baseFreq, drawBars])

  useEffect(() => {
    oscillatorBank.forEach((o, i) => {
      o.osc.type = waveType
    })
  }, [oscillatorBank, waveType])

  return <div>
    <div>
      <button onClick={togglePlayingState}>{playing ? 'Mute' : 'UnMute'}</button>
    </div>
    <div>
      Base Frequency: <input type="number" value={baseFreq} min={25} max={3000} step={5} onChange={handleBaseFreqChange} />
      <select value={waveType} onChange={handleWaveTypeChange}>
        {['sine', 'triangle', 'sawtooth', 'square'].map(wave => <option key={wave} value={wave}>{wave}</option>)}
      </select>
    </div>
    <div>
      {drawBars.vals.map((bar, i) =>
        <div key={i} className={css({display: 'grid', gridTemplateColumns: `5rem 5rem 6rem 10rem`, gap: '1rem' })}>
          <input type="number" value={bar.ratio} min={0} max={16} step={0.01} name={`${i}.ratio`} onChange={handleDrawBarChange} />
          <div>{baseRatio(bar.ratio)}</div>
          <div className={css({ textAlign: 'right' })}>{(bar.ratio * baseFreq).toFixed(2)} hz</div>
          <input type="range" value={bar.gain} min={-1} max={20} name={`${i}.gain`} onChange={handleDrawBarChange} />
        </div>
      )}
    </div>
    <AnalyserDisplay analyser={analyser} />
  </div>
}
