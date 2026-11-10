// small chart for "chat pulse" (messages per minute over the last few minutes)
export default function Sparkline({ values, height = 40, label }) {
  const width = 160;
  const max = Math.max(4, ...values);
  const step = width / Math.max(1, values.length - 1);
  const points = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 3 - (v / max) * (height - 6)).toFixed(1)}`);
  const line = `M${points.join(' L')}`;
  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={label}>
      <path className="spark-area" d={`${line} L${width},${height} L0,${height} Z`} />
      <path className="spark-line" d={line} />
    </svg>
  );
}