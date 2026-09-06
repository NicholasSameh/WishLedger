interface ProbabilityChartProps {
  cdf: number[]; // cdf[n] = P(success by pull n), index 0..maxPulls
  medianPulls: number;
  pullBudget: number;
}

const WIDTH = 640;
const HEIGHT = 280;
const PAD_LEFT = 44;
const PAD_BOTTOM = 28;
const PAD_TOP = 16;
const PAD_RIGHT = 16;

export function ProbabilityChart({ cdf, medianPulls, pullBudget }: ProbabilityChartProps) {
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxN = cdf.length - 1;

  const x = (n: number) => PAD_LEFT + (n / maxN) * plotW;
  const y = (p: number) => PAD_TOP + (1 - p) * plotH;

  const points = cdf.map((p, n) => `${x(n)},${y(p)}`).join(" ");
  const areaPoints = `${x(0)},${y(0)} ${points} ${x(maxN)},${y(0)}`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const budgetClamped = Math.min(pullBudget, maxN);
  const budgetProb = cdf[budgetClamped] ?? 0;

  return (
    <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Probability of success by pull count">
      {/* gridlines + y labels */}
      {gridLines.map((p) => (
        <g key={p}>
          <line x1={PAD_LEFT} y1={y(p)} x2={WIDTH - PAD_RIGHT} y2={y(p)} stroke="#2E2A54" strokeWidth={1} />
          <text x={PAD_LEFT - 10} y={y(p) + 4} textAnchor="end" fontSize={11} fill="#948FBE">
            {Math.round(p * 100)}%
          </text>
        </g>
      ))}

      {/* x axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((f) => {
        const n = Math.round(f * maxN);
        return (
          <text key={n} x={x(n)} y={HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#948FBE">
            {n}
          </text>
        );
      })}

      {/* area under curve */}
      <polygon points={areaPoints} fill="#E3B44C" fillOpacity={0.12} />

      {/* the curve itself */}
      <polyline points={points} fill="none" stroke="#E3B44C" strokeWidth={2.5} strokeLinejoin="round" />

      {/* median marker */}
      {medianPulls <= maxN && (
        <g>
          <line x1={x(medianPulls)} y1={PAD_TOP} x2={x(medianPulls)} y2={y(0)} stroke="#9C82E8" strokeWidth={1.5} strokeDasharray="4 4" />
          <text x={x(medianPulls)} y={PAD_TOP - 4} textAnchor="middle" fontSize={11} fill="#9C82E8">
            median: {medianPulls}
          </text>
        </g>
      )}

      {/* pull-budget marker */}
      <g>
        <circle cx={x(budgetClamped)} cy={y(budgetProb)} r={4} fill="#F3EFFC" />
        <text x={x(budgetClamped)} y={y(budgetProb) - 10} textAnchor="middle" fontSize={11} fill="#F3EFFC">
          {Math.round(budgetProb * 100)}% at {budgetClamped} pulls
        </text>
      </g>
    </svg>
  );
}
