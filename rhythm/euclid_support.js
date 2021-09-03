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
  fill: 'white',
};
export const SequenceDisplay = ({ width, height = 20, steps }) => (
  <g>
    <line x1={0} x2={width} y1={height / 2} y2={height / 2} {...seqStyle} />
    <g>
      {steps.map((pulsing, index) => (
        <g key={index} transform={`translate(${(index / steps.length) * width})`}>
          {pulsing ? (
            <circle cx={0} cy={height/2} r={4} {...seqStyle} />
          ) : (
              <circle cx={0} cy={height / 2} r={2} {...seqStyle} fill={seqStyle.stroke} />
          )}
        </g>
      ))}
    </g>
  </g>
);

export const PhaseDisplay = ({ width, height = 20, phase = 0 }) => {
  const pos = (width * phase)
  return <line y1={0} y2={height} x1={pos} x2={pos} {...seqStyle} stroke="#faa" />
}

export const gcd = (a, b) => {
  if (b == 0) { return a }
  return gcd(b, a % b)
}

export const lcm = (a, b) => {
  if (b == 0) { return 0 }
  return (a * b) / gcd(a, b)
}
