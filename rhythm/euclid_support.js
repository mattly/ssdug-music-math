import React from 'react'

export const pattern = ({ stepCount, pulseCount, offset }) => {
  console.log('calcing pattern', { stepCount, pulseCount, offset });
  let pile = 0;
  const arr = new Array(stepCount);
  for (let step = 0; step < stepCount; step++) {
    let stepIdx = (step + offset + stepCount) % stepCount;
    pile = pile + pulseCount;
    if (pile >= stepCount) {
      pile = pile - stepCount;
      arr[stepIdx] = true;
    } else {
      arr[stepIdx] = false;
    }
  }
  return arr;
};

export const seqStyle = {
  stroke: "#ddd",
  strokeWidth: 2,
};
export const SequenceDisplay = ({ width, y = 0, height = 20, inset = 10, steps }) => (
  <g transform={`translate(0,${y})`}>
    <line x1={inset / 2} x2={width - inset / 2} y1={height / 2} y2={height / 2} {...seqStyle} />
    <g transform={`translate(${inset})`}>
      {steps.map((pulsing, index) => (
        <g key={index} transform={`translate(${(index / steps.length) * (width - inset * 2)})`}>
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

export const PhaseDisplay = ({ width, y = 0, height = 20, inset = 10, phase = 0 }) => {
  const pos = inset + ((width - inset) * phase)
  return <line y1={y} y2={height} x1={pos} x2={pos} {...seqStyle} stroke="#faa" />
}
