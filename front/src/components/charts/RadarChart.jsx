// Keep label room inside the SVG viewport. In particular, the lower-right
// "친밀감" label needs space to the right of its anchor point.
const cx = 143;
const cy = 132;
const maxR = 96;
// Mirrors the dashboard's "needsAttention" rule (score < 60) so the radar's
// dashed ring lines up with the same threshold used elsewhere in the app.
const ATTENTION_THRESHOLD = 60;

function polar(r, i, n) {
  const angle = ((i * 360) / n - 90) * (Math.PI / 180);
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

export default function RadarChart({ values, labels, activeIndex = null, onActiveChange }) {
  const n = values.length;
  const rings = [0.25, 0.5, 0.75, 1].map((f, ri) => {
    const pts = Array.from({ length: n }, (_, i) => polar(maxR * f, i, n).join(',')).join(' ');
    return (
      <polygon key={ri} points={pts} fill="none" stroke="rgba(196,182,255,0.16)" strokeWidth="1" />
    );
  });

  const axes = Array.from({ length: n }, (_, i) => {
    // Axis guides stop at their actual score point instead of extending past it.
    const score = Math.max(0, Math.min(100, values[i] ?? 0));
    const [x, y] = polar((maxR * score) / 100, i, n);
    return (
      <line
        key={i}
        className={`radar-axis${activeIndex === i ? ' is-active' : ''}`}
        x1={cx}
        y1={cy}
        x2={x.toFixed(1)}
        y2={y.toFixed(1)}
        stroke="rgba(196,182,255,0.14)"
      />
    );
  });

  const cutR = maxR * (ATTENTION_THRESHOLD / 100);
  const cutPts = Array.from({ length: n }, (_, i) => polar(cutR, i, n).join(',')).join(' ');

  const dataPts = values.map((v, i) => polar((maxR * v) / 100, i, n));
  const dataPoly = dataPts.map((p) => p.join(',')).join(' ');

  return (
    <svg className={`radar-chart${activeIndex !== null ? ' has-active' : ''}`} viewBox="0 0 286 276" style={{ width: '100%', height: 'auto' }}>
      {rings}
      <polygon
        points={cutPts}
        fill="none"
        stroke="var(--accent-amber)"
        strokeWidth="1.4"
        strokeDasharray="4 3"
        opacity="0.85"
      />
      {axes}
      <polygon
        className="radar-data-area"
        points={dataPoly}
        fill="rgba(226,160,201,0.28)"
        stroke="var(--accent-pink)"
        strokeWidth="2"
      />
      {dataPts.map((p, i) => {
        const low = values[i] < ATTENTION_THRESHOLD;
        return (
          <g key={i}>
            <circle
              className={`radar-data-point${activeIndex === i ? ' is-active' : ''}`}
              cx={p[0].toFixed(1)}
              cy={p[1].toFixed(1)}
              r="4"
              fill={low ? 'var(--accent-amber)' : 'var(--accent-pink)'}
              stroke={low ? '#2a1638' : 'none'}
            />
            {activeIndex === i && (
              <circle className="radar-focus-ring" cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r="8" />
            )}
          </g>
        );
      })}
      {labels.map((label, i) => {
        const [x, y] = polar(maxR + 22, i, n);
        const anchor = Math.abs(x - cx) < 6 ? 'middle' : x > cx ? 'start' : 'end';
        return (
          <text
            key={label}
            className={`radar-label${activeIndex === i ? ' is-active' : ''}`}
            x={x.toFixed(1)}
            y={y.toFixed(1)}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="11.5"
            fontWeight="700"
            fill="var(--text-secondary)"
            role="button"
            tabIndex="0"
            onMouseEnter={() => onActiveChange?.(i)}
            onMouseLeave={() => onActiveChange?.(null)}
            onFocus={() => onActiveChange?.(i)}
            onBlur={() => onActiveChange?.(null)}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
