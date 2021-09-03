import React, { useRef, useMemo, useEffect } from 'react'


export const useAnalyser = (context) => useMemo(() => {
  let a = context.createAnalyser()
  a.minDecibels = -140
  a.maxDecibels = 0
  return a
}, [context])


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
    timeCtx.lineWidth = 2
    timeCtx.strokeStyle = '#000'
    timeCtx.beginPath()
    for (var i = 0; i < times.length; i++) {
      let x = i * barWidth
      let v = times[i] / 128
      let y = v * timeHeight / 2
      if (i == 0) {
        timeCtx.moveTo(x,y)
      } else {
        timeCtx.lineTo(x,y)
      }
    }
    timeCtx.lineTo(width, timeHeight / 2)
    timeCtx.stroke()


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

export const AnalyserDisplay = ({ width=1000, timeHeight=100, freqHeight=500, analyser }) => {
  const timeRef = useRef(null)
  const freqRef = useRef(null)

  useEffect(() => {
    drawAnalyser(analyser, timeRef, freqRef)
  }, [analyser, timeRef.current, freqRef.current])

  return <div>
    <canvas height={timeHeight} width={width} ref={timeRef} />
    <canvas height={freqHeight} width={width} ref={freqRef} />
  </div>
}
