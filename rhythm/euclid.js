import React, { useState, useCallback, useEffect, useRef } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/css";

import useAudioContext from "../utils/useAudioContext";
import useBufferLoader from "../utils/useBufferLoader";
import soundDefs from "../utils/soundDefs";

import player from "./player";
import { pattern, PhaseDisplay, seqStyle, SequenceDisplay } from './euclid_support'

const Row = styled.div({
  display: "flex",
});

const rightWidth = 640;

const withNumber = (f) => (event) => f(event.target.valueAsNumber, event.target.name);

const recomputeSeq = (updateFn) => (v, k) => {
  updateFn((seq) => {
    const nextSeq = { ...seq, [k]: v };
    nextSeq.steps = pattern(nextSeq);
    return nextSeq;
  });
};

const EuclidRow = styled.div({
  width: "11rem",
  display: "grid",
  gridTemplateColumns: "3rem 3rem 3rem",
  columnGap: "0.5rem",
});

const rhythm = (pulseCount, stepCount, offset, notes) => ({ stepCount, pulseCount, offset, notes });

const rhythms = [
  rhythm(2, 4, 0, "basic"),
  rhythm(2, 3, 1, "Conga, Latin American"),
  rhythm(2, 5, -2, "Persian khafif-e-ramal, take five"),
  rhythm(3, 4, 1, "Cumbia, Calpyso, Persian khalif-e-saghil, Greek trochoid choreic"),
  rhythm(3, 5, 1, "Russian folk"),
  rhythm(3, 7, -2, "Bulgarian folk dance, Pink Floyd's Money"),
  rhythm(3, 8, 1, "Cuban tresillo"),
  rhythm(4, 7, 1, "Bulgarian folk dance"),
  rhythm(4, 9, -2, "Turkish Aksak rhythm"),
  rhythm(4, 11, 1, "Frank Zappa's Outside Now"),
  rhythm(5, 6, 1, "Arabic York-Samai"),
  rhythm(5, 7, 1, "Arabic Nawakhat"),
  rhythm(5, 8, -1, "Cuban Cinquillo, Tango, Persian Al-saghil-al-sani"),
  rhythm(5, 9, 1, "Arabic Agsag-Samai, South African Venda, Rumanian folk dance"),
  rhythm(5, 11, -2, "Moussorgsky's Pictures at an Exhibition"),
  rhythm(5, 12, 1, "South African Venda (children's song)"),
  rhythm(5, 16, 7, "Brazilian Bossa Nova"),
  rhythm(7, 8, 1, "Tuaregian frame-drum rhythm"),
  rhythm(7, 12, -3, "common West African bell pattern"),
  rhythm(7, 16, 3, "Brazilian Samba, Ghanan clapping pattern"),
  rhythm(9, 16, 4, "various African, Brazilian Samba"),
  rhythm(11, 24, 1, "Aka pygmies of Central Africa"),
  rhythm(13, 24, -9, "Aka pygmies of upper Sangha")
];

const NumberInput = (props) => <input className={css({ width: "3rem" })} type="number" {...props} />;

const Player = ({ context, sounds }) => {
  const [barLength, setBarLength] = useState(2000);
  const handleBarLengthChange = useCallback(withNumber(setBarLength), []);

  const [sequence, setSequence] = useState({
    stepCount: 4,
    pulseCount: 2,
    offset: 1,
    steps: [true, false, true, false],
  });
  const handleSequenceChange = useCallback(withNumber(recomputeSeq(setSequence)), []);

  const selectPreset = useCallback((e) => {
    const preset = rhythms[e.target.value];
    if (preset) {
      const steps = pattern(preset);
      setSequence({ ...preset, steps });
    }
  });

  const [phasePos, setPhasePos] = useState(0);
  const stateRef = useRef({ barLength, sequence });

  useEffect(() => {
    let startClock = context.currentTime + 0.25;
    let nextBarClock = startClock;
    let scheduleAgainIn;

    let timerID;
    const scheduleBar = () => {
      const thisClock = nextBarClock;
      nextBarClock = thisClock + stateRef.current.barLength / 1000;
      scheduleAgainIn = (nextBarClock - context.currentTime) * 1000;
      timerID = setTimeout(scheduleBar, scheduleAgainIn - 10);
      const sixtyFourth = scheduleAgainIn / 64;
      for (let i = 0; i < 64; i++) {
        setTimeout(() => setPhasePos(i/64), sixtyFourth * i);
      }
      const { steps } = stateRef.current.sequence;
      const phase = (p) => thisClock + (p * stateRef.current.barLength) / 1000;
      steps.forEach((pulse, index) => {
        if (pulse) {
          player(context, sounds[3]).source.start(phase(index / steps.length));
        }
      });
    };
    scheduleBar();
    return () => clearTimeout(timerID);
  }, [context]);

  useEffect(() => {
    stateRef.current = { barLength, sequence };
  }, [barLength, sequence]);

  const canvasHeight = 100;

  return (
    <div>
      <div>
        <label>
          Bar Length (ms):
          <input type="number" value={barLength} onChange={handleBarLengthChange} min={500} max={4000} step={10} />
        </label>
      </div>
      <Row>
        <div>
          <select onChange={selectPreset}  className={css({width: '10rem'})}>
            {rhythms.map((r, i) => (
              <option key={r.notes} value={i}>
                {r.stepCount}/{r.pulseCount} : {r.notes}
              </option>
            ))}
          </select>
          <EuclidRow>
            <label>
              steps
              <NumberInput
                name="stepCount"
                min={1}
                max={64}
                value={sequence.stepCount}
                onChange={handleSequenceChange}
              />
            </label>
            <label>
              pulses
              <NumberInput
                name="pulseCount"
                min={1}
                max={sequence.stepCount}
                value={sequence.pulseCount}
                onChange={handleSequenceChange}
              />
            </label>
            <label>
              offset
              <NumberInput
                name="offset"
                min={-1 * (sequence.stepCount - 1)}
                max={sequence.stepCount - 1}
                value={sequence.offset}
                onChange={handleSequenceChange}
              />
            </label>
          </EuclidRow>
        </div>
        <div>
          <svg width={rightWidth} height={canvasHeight}>
            <PhaseDisplay width={rightWidth} y={0} height={100} phase={phasePos} />
            <SequenceDisplay y={20} width={rightWidth} {...sequence} />
          </svg>
        </div>
      </Row>
    </div>
  );
};

export default () => {
  const context = useAudioContext();
  const sounds = useBufferLoader(context, soundDefs);

  if (!sounds) {
    return "loading";
  }
  return <Player context={context} sounds={sounds} />;
};
