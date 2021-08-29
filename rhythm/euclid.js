import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import styled from "@emotion/styled";

import useAudioContext from "../utils/useAudioContext";
import useBufferLoader from "../utils/useBufferLoader";
import soundDefs from "../utils/soundDefs";
import { css } from "@emotion/css";

const Row = styled.div({
  display: "flex",
});

const Left = styled.div({
  width: `10rem`,
  marginRight: `0.5rem`,
  textAlign: "right",
});

const rightWidth = 640;

const Right = styled.div(
  {
    width: `${rightWidth}px`,
    position: "relative",
  },
  ({ styles }) => ({
    ...styles,
  })
);

const PhaseDisplay = styled.div(
  {
    backgroundColor: "#a22",
    height: "20px",
    width: `${rightWidth / 64}px`,
    position: "absolute",
  },
  ({ phase }) => ({
    left: `${phase * 10}px`,
  })
);

const stroke = "#ddd";
const seqStyle = {
  stroke: "#ddd",
  strokeWidth: 2,
};
const SequenceDisplay = ({ width, y=0, height=20, inset=10, steps }) => (
  <g transform={`translate(0,${y})`}>
    <line x1={inset/2} x2={width - (inset/2)} y1={height / 2} y2={height / 2} {...seqStyle} />
    <g transform={`translate(${inset})`}>
      {steps.map((pulsing, index) => (
        <g key={index} transform={`translate(${(index / steps.length) * (width - (inset * 2))})`}>
          {pulsing ? (
            <circle cx={0} cy={height / 2} r={5} {...seqStyle} fill="white" />
          ) : (
            <line x1={0} x2={0} y1={0} y2={height} {...seqStyle} />
          )}
        </g>
      ))}
    </g>
  </g>
);

const withNumber = (f) => (event) => f(event.target.valueAsNumber, event.target.name);

const pattern = ({ stepCount, pulseCount, offset }) => {
  let pile = 0;
  const arr = new Array(stepCount);
  for (let step = 0; step < stepCount; step++) {
    let stepIdx = (step + offset + stepCount) % stepCount;
    pile = pile + pulseCount;
    console.log(stepIdx, pile, pulseCount);
    if (pile >= stepCount) {
      pile = pile - stepCount;
      arr[stepIdx] = 1;
    } else {
      arr[stepIdx] = 0;
    }
  }
  console.log(arr);
  return arr;
};

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

const NumberInput = (props) => <input className={css({ width: "3rem" })} type="number" {...props} />;

const Player = ({ context, sounds }) => {
  const [barLength, setBarLength] = useState(2000);
  const handleBarLengthChange = useCallback(withNumber(setBarLength), []);

  const [sequence, setSequence] = useState({ stepCount: 4, pulseCount: 2, offset: 1, steps: [1, 0, 1, 0] });
  const handleSequenceChange = useCallback(withNumber(recomputeSeq(setSequence)), []);

  const [bar, setBar] = useState(0);
  const [phase, setPhase] = useState(0);
  const stateRef = useRef({ barLength, sequence });

  useEffect(() => {
    let bars = 0;
    let startClock = context.currentTime + 0.25;
    let nextBarClock = startClock;
    let scheduleAgainIn;

    let timerID;
    const scheduleBar = () => {
      const thisClock = nextBarClock;
      nextBarClock = thisClock + stateRef.current.barLength / 1000;
      scheduleAgainIn = (nextBarClock - context.currentTime) * 1000;
      // console.log({ bars, thisClock, nextBarClock,  time: context.currentTime, scheduleAgainIn })
      timerID = setTimeout(scheduleBar, scheduleAgainIn - 10);
      const phaseTime = scheduleAgainIn / 64;
      for (let i = 0; i < 64; i++) {
        setTimeout(() => setPhase(i), phaseTime * i);
      }
      setBar((b) => b + 1);
      bars++;
    };
    scheduleBar();
    return () => clearTimeout(timerID);
  }, [context]);

  useEffect(() => {
    stateRef.current = { barLength, sequence };
  }, [barLength, sequence]);

  return (
    <div>
      <div>
        <label>
          Bar Length (ms):
          <input type="number" value={barLength} onChange={handleBarLengthChange} min={500} max={4000} step={10} />
        </label>
      </div>
      <div>
        <Row>
          <Left>Bars</Left>
          <Right>{bar}</Right>
        </Row>
        <Row>
          <Left>Phase</Left>
          <Right styles={{ backgroundColor: "#ddd" }}>
            <PhaseDisplay phase={phase} />
          </Right>
        </Row>
      </div>
      <Row>
        <div>
          <EuclidRow>
            <label>
              steps
              <NumberInput name="stepCount" min={1} max={64} value={sequence.stepCount} onChange={handleSequenceChange} />
            </label>
            <label>
              pulses
              <NumberInput name="pulseCount" min={1} max={sequence.stepCount} value={sequence.pulseCount} onChange={handleSequenceChange} />
            </label>
            <label>
              offset
              <NumberInput name="offset" min={-1 * (sequence.stepCount - 1)} max={sequence.stepCount - 1} value={sequence.offset} onChange={handleSequenceChange} />
            </label>
          </EuclidRow>
        </div>
        <div>
          <svg width={rightWidth} height={100}>
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
