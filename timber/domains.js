import React, { useCallback, useMemo } from "react";
import { css } from "@emotion/css";

import useAudioContext from "../utils/useAudioContext";
import useBufferLoader from "../utils/useBufferLoader";
import { etcDefs, percDefs } from "../utils/soundDefs";
import player from "../rhythm/player";

import { AnalyserDisplay, useAnalyser } from "./analyser";

const Player = ({ context, sounds }) => {
  const soundDict = useMemo(() => sounds.reduce((m, s) => ({ ...m, [s.name]: s }), {}), [sounds])
  const analyser = useAnalyser(context)

  const playSound = useCallback(
    event => {
      const sound = soundDict[event.target.dataset.name]
      const p = player(context, sound)
      p.source.connect(analyser)
      p.source.start(context.currentTime)
    }
    , [context])

  return <div>
    <div>
      {sounds.map((s, i) => (
        <button key={i} data-name={s.name} onClick={playSound} className={css({marginRight: '0.5rem'})}>{s.name}</button>
      ))}
    </div>
    <AnalyserDisplay analyser={analyser} width={1024} withHistory />
  </div>
}

export default () => {
  const context = useAudioContext();
  const percussion = useBufferLoader(context, percDefs);
  const etc = useBufferLoader(context, etcDefs)

  if (!percussion || !etc) {
    return "loading";
  }
  console.log('we have sounds')
  return <Player context={context} sounds={[...percussion, ...etc]} />
}
