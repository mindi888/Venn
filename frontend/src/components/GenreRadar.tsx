type Props = { data: { genre: string; score: number }[]; size?: number };

export default function GenreRadar({ data, size: sizeProp }: Props) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-xs text-center px-4">
        Watch more movies to build your taste profile
      </div>
    );
  }

  const size = sizeProp ?? 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const levels = 4;
  const n = data.length;

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, pct: number) => ({
    x: cx + r * pct * Math.cos(angle(i)),
    y: cy + r * pct * Math.sin(angle(i)),
  });

  const polygon = (pct: number) =>
    Array.from({ length: n }, (_, i) => `${pt(i, pct).x},${pt(i, pct).y}`).join(" ");

  const dataPath = data
    .map((d, i) => {
      const p = pt(i, d.score / 100);
      return `${i === 0 ? "M" : "L"}${p.x},${p.y}`;
    })
    .join(" ") + "Z";

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height={sizeProp ?? 220} aria-label="Genre taste radar">
      {/* Grid rings */}
      {Array.from({ length: levels }, (_, i) => (
        <polygon
          key={i}
          points={polygon((i + 1) / levels)}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {data.map((_, i) => {
        const p = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />;
      })}

      {/* Data fill */}
      <path d={dataPath} fill="#D4A017" fillOpacity="0.22" stroke="#D4A017" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Labels */}
      {data.map((d, i) => {
        const labelR = r + 18;
        const x = cx + labelR * Math.cos(angle(i));
        const y = cy + labelR * Math.sin(angle(i));
        const anchor = Math.cos(angle(i)) > 0.1 ? "start" : Math.cos(angle(i)) < -0.1 ? "end" : "middle";
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize="9.5"
            fill="#666666"
            fontFamily="Outfit, sans-serif"
          >
            {d.genre}
          </text>
        );
      })}

      {/* Data dots */}
      {data.map((d, i) => {
        const p = pt(i, d.score / 100);
        return <circle key={i} cx={p.x} cy={p.y} r="3" fill="#D4A017" />;
      })}
    </svg>
  );
}
