import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/css";

import useAudioContext from "../utils/useAudioContext";
import useBufferLoader from "../utils/useBufferLoader";
import soundDefs from "../utils/soundDefs";

import player from "./player";
import { pattern, PhaseDisplay, SequenceDisplay, lcm } from "./euclid_support";

const updatePattern = (p) => {
  console.log(`updating pattern`, p);
  p.steps = pattern(p);
  return p;
};

const makePattern = (sound, time, stepCount, pulseCount, offset = 1) =>
  updatePattern({ sound, time, stepCount, pulseCount, offset });

const ControlRow = styled.div({
  display: "grid",
  gridTemplateColumns: "6rem 3rem 3rem 3rem 3rem 3rem",
  columnGap: "0.5rem",
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
      readOnly
      value={seq.time / seq.stepCount}
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
    console.log(`updating from`, idx, field, value);
    const nextSeq = updatePattern({ ...seqs[idx], [field]: value });
    seqs[idx] = nextSeq;
    return { seqs };
  });

const extractChange = (sounds, f) => (event) => {
  console.log(event);
  const [idx, fieldName] = event.target.name.split(".");
  let value;
  if (event.target.type == "number" && event.target.valueAsNumber) {
    value = event.target.valueAsNumber;
  } else if (fieldName == "sound") {
    value = sounds.find(({ name }) => event.target.value == name);
  }
  f(parseInt(idx), fieldName, value);
};

const LCMCell = styled.td({
  textAlign: 'right',
  minWidth: '1rem',
})

const Sequencer = ({ context, sounds }) => {
  const [seqState, setSeqState] = useState(() => ({
    seqs: [
      makePattern(sounds[0], 2, 4, 2, 1),
      makePattern(sounds[1], 2, 4, 2, 0),
      makePattern(sounds[2], 4, 16, 11, 0),
      makePattern(sounds[3], 6, 24, 13, 0)
    ],
  }));
  const handleUpdate = useCallback(extractChange(sounds, updateSeq(setSeqState)), []);
  const [phasePos, setPhasePos] = useState([0, 0, 0, 0]);
  const longestTime = useMemo(
    () => Math.max.apply(null, seqState.seqs.map(({ time }) => time)), [seqState]);
  const [phaseReset, setPhaseReset] = useState(Date.now());

  const stateRef = useRef(seqState.seqs);

  useEffect(() => {
    let nextStart = context.currentTime + 0.25
    let timers = []
    let phases = stateRef.current.map(() => 0)
    let interval = 0.05

    const schedule = () => {
      const thisStart = nextStart
      nextStart = thisStart + interval
      timers = []
      setPhasePos([...phases])
      stateRef.current.forEach(({ sound, steps, time }, i) => {
        const startPhase = phases[i]
        const phaseLength = interval / time
        const endPhase = startPhase + phaseLength
        phases[i] = endPhase % 1
        steps.forEach((pulse, index) => {
          const stepPhase = index / steps.length
          if (pulse && stepPhase < endPhase && stepPhase > startPhase) {
            const playIn = (stepPhase - startPhase) * time
            player(context, sound).source.start(thisStart + playIn)
          }
        })
      })
      let nextSchedule = (nextStart - context.currentTime) * 1000
      timers.push(setTimeout(schedule, nextSchedule - 10))
    }
    schedule()
    return () => timers.forEach(id => clearTimeout(id))
  }, [context, phaseReset]);

  return (
    <div>
      <button onClick={() => setPhaseReset(Date.now())}>reset phases</button>
      <div className={css({ display: "grid", gridTemplateColumns: 'auto auto 1fr', columnGap: '1rem' })}>
        <div>
          <ControlRow>
            <div>sound</div>
            <div>time</div>
            <div>steps</div>
            <div>stime</div>
            <div>pulses</div>
            <div>offset</div>
          </ControlRow>
          {seqState.seqs.map((s, i) => (
            <SeqControl key={i} sounds={sounds} seq={s} idx={i} onChange={handleUpdate} />
          ))}
        </div>
        <div>
          <table>
            <thead>
              <tr>
                {seqState.seqs.map((s, i) => <th key={i}>{i}</th>)}
              </tr>
            </thead>
            <tbody>
            {seqState.seqs.map((s,i) => (
              <tr key={i}>
                {seqState.seqs.map((r, j) => <LCMCell key={j}>{lcm(s.time, r.time).toFixed(2)}</LCMCell>)}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
        <div>
          <svg width={650} height={100} className={css({ marginTop: "23px" })}>
            {seqState.seqs.map((s, i) => (
              <g key={i} transform={`translate(5,${i * 23})`}>
                <PhaseDisplay width={(640 * s.time) / longestTime} y={i * 23} height={23} phase={phasePos[i]} />
                <SequenceDisplay y={i * 23} width={(640 * s.time) / longestTime} {...s} />
              </g>
            ))}
          </svg>
        </div>
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
