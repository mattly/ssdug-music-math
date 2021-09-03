import React, { useCallback, useMemo, useRef,  useEffect } from "react";
import { css } from "@emotion/css";

import useAudioContext from "../utils/useAudioContext";
import useBufferLoader from "../utils/useBufferLoader";
import { percDefs } from "../utils/soundDefs";
import player from "../rhythm/player";

const drawAnalyser = (analyser, timeRef, freqRef) => {
  if (!timeRef.current && !freqRef.current) { return }
  const times = new Uint8Array(analyser.frequencyBinCount)
  const freqs = new Uint8Array(analyser.frequencyBinCount)
  const width = timeRef.current.width
  const timeHeight = timeRef.current.height
  const freqHeight = freqRef.current.height
  const barWidth = width / analyser.frequencyBinCount

  const redraw = () => {
    if (!timeRef.current && !freqRef.current) { return  }
    analyser.smoothingTimeConstant = 0.8
    analyser.fftSize = 2048
    analyser.getByteTimeDomainData(times)
    analyser.getByteFrequencyData(freqs)
    let percent;
    let height;

    const timeCtx = timeRef.current.getContext('2d')
    timeCtx.fillStyle = 'white'
    timeCtx.fillRect(0, 0, width, timeHeight)
    timeCtx.fillStyle = 'black'
    for (var i = 0; i < times.length; i++) {
      percent = times[i] / 256
      timeCtx.fillRect(i * barWidth, timeHeight - (timeHeight * percent) - 1, 1, 2)
    }

    const freqCtx = freqRef.current.getContext('2d')
    freqCtx.fillStyle = 'white'
    freqCtx.fillRect(0, 0, width, freqHeight)
    freqCtx.fillStyle = 'black'
    for (var i = 0; i < freqs.length; i++) {
      percent = freqs[i] / 256
      height = (freqHeight * percent)
      freqCtx.fillRect(i * barWidth, freqHeight - height - 1, barWidth, height)
    }

    requestAnimationFrame(redraw)
  }

  requestAnimationFrame(redraw)
}

const Player = ({ context, sounds }) => {
  const soundDict = useMemo(() => sounds.reduce((m, s) => ({ ...m, [s.name]: s }), {}), [sounds])

  const analyser = useMemo(() => {
    let a = context.createAnalyser()
    a.minDecibels = -140
    a.maxDecibels = 0
    return a
  }, [context])

  const playSound = useCallback(
    event => {
      const sound = soundDict[event.target.dataset.name]
      const p = player(context, sound)
      p.source.connect(analyser)
      p.source.start(context.currentTime)
    }
    , [context])

  const timeRef = useRef(null)
  const freqRef = useRef(null)
  useEffect(() => {drawAnalyser(analyser, timeRef, freqRef)}, [context, analyser, timeRef.current, freqRef.current])

  const displayWidth = 1000

  return <div>
    <div>
      {sounds.map((s, i) => (
        <button key={i} data-name={s.name} onClick={playSound} className={css({marginRight: '0.5rem'})}>{s.name}</button>
      ))}
    </div>
    <canvas height={100} width={displayWidth} ref={timeRef} />
    <canvas height={500} width={displayWidth} ref={freqRef} />
  </div>
}

export default () => {
  const context = useAudioContext();
  const percussion = useBufferLoader(context, percDefs);

  if (!percussion) {
    return "loading";
  }
  return <Player context={context} sounds={[...percussion]} />
}
