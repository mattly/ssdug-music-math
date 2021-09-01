import React, { useState, useCallback, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/css";

import useAudioContext from "../utils/useAudioContext";
import useBufferLoader from "../utils/useBufferLoader";
import soundDefs from "../utils/soundDefs";

import player from "./player";
import { pattern, PhaseDisplay, SequenceDisplay } from "./euclid_support";

const updatePattern = (p) => {
  console.log(`updating pattern`, p)
  p.steps = pattern(p);
  return p;
};

const makePattern = (sound, time, stepCount, pulseCount, offset = 1) =>
  updatePattern({ sound, time, stepCount, pulseCount, offset });

const ControlRow = styled.div({
  display: "grid",
  gridTemplateColumns: "6rem 5rem 3rem 3rem 3rem",
  columnGap: "0.5rem",
  width: "23rem",
  height: "23px",
});

const SeqControl = ({ sounds, seq, idx, onChange }) => (
  <ControlRow>
    <select name={`${idx}.sound`} value={seq.sound.name} onChange={onChange}>
      {sounds.map((s) => (
        <option key={s.name} value={s.name}>
          {s.name}
        </option>
      ))}
    </select>
    <input type="number" name={`${idx}.time`} min="0.2" max="20" step={0.1} value={seq.time} onChange={onChange} />
    <input
      type="number"
      name={`${idx}.stepCount`}
      min="1"
      max="32"
      step={1}
      value={seq.stepCount}
      onChange={onChange}
    />
    <input
      type="number"
      name={`${idx}.pulseCount`}
      min="1"
      max={seq.stepCount}
      step={1}
      value={seq.pulseCount}
      onChange={onChange}
    />
    <input
      type="number"
      name={`${idx}.offset`}
      min={seq.stepCount * -1 + 1}
      max={seq.stepCount - 1}
      step={1}
      value={seq.offset}
      onChange={onChange}
    />
  </ControlRow>
);

const updateSeq = (updater) => (idx, field, value) =>
  updater(({ seqs }) => {
    console.log(`updating from`, idx, field, value)
    const nextSeq = updatePattern({ ...seqs[idx], [field]: value });
    seqs[idx] = nextSeq;
    return { seqs };
  });

const extractChange = (f) => (event) => {
  console.log(event)
  const [idx, fieldName] = event.target.name.split(".");
  const value = event.target.type == "number" ? event.target.valueAsNumber : event.target.value;
  f(parseInt(idx), fieldName, value);
};

const Sequencer = ({ context, sounds }) => {
  const [seqState, setSeqState] = useState(() => ({
    seqs: [makePattern(sounds[0], 2, 4, 2, 1), makePattern(sounds[1], 2, 4, 2, 0)],
  }));
  const handleUpdate = useCallback(extractChange(updateSeq(setSeqState)), []);
  const [phasePos, setPhasePos] = useState([0, 0, 0, 0]);
  const updatePhase = useCallback((i,v) => setPhasePos(p => {
    p[i] = v;
    return [...p]
  }), [])

  const stateRef = useRef(seqState.seqs);

  useEffect(() => {
    let nextStarts = stateRef.current.map(() => context.currentTime + 0.25);
    let timerIds = [];

    const schedule = (i) => {
      const thisStart = nextStarts[i];
      nextStarts[i] = thisStart + stateRef.current[i].time;
      const scheduleAgainIn = (nextStarts[i] - context.currentTime) * 1000;
      timerIds[i] = setTimeout(schedule, scheduleAgainIn - 20, i);
      const redrawTime = scheduleAgainIn / 64;
      for (let j = 0; j < scheduleAgainIn / redrawTime; j++) {
        setTimeout(
          updatePhase,
          redrawTime * j + (thisStart - context.currentTime) * 1000,
          i, j/64
        );
      }
    };
    stateRef.current.forEach((s, i) => schedule(i));
    return () => timerIds.forEach((id) => clearTimeout(id));
  }, [context]);

  return (
    <div className={css({ display: "flex" })}>
      <div>
        <ControlRow>
          <div>sound</div>
          <div>time</div>
          <div>steps</div>
          <div>pulses</div>
          <div>offset</div>
        </ControlRow>
        {seqState.seqs.map((s, i) => (
          <SeqControl key={i} sounds={sounds} seq={s} idx={i} onChange={handleUpdate} />
        ))}
      </div>
      <div>
        <svg width={640} height={100} className={css({ marginTop: "23px" })}>
          {seqState.seqs.map((s, i) => (
            <g key={i}>
              <PhaseDisplay width={640} y={i * 23} height={23} phase={phasePos[i]} />
              <SequenceDisplay y={i * 23} width={640} {...s} />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};

export default () => {
  const context = useAudioContext();
  const sounds = useBufferLoader(context, soundDefs);

  if (!sounds) {
    return "loading";
  }
  return <Sequencer context={context} sounds={sounds} />;
};
