import { money } from "@/lib/admin";

// Daily bar chart rendered as plain SVG on the server (no chart library, no client JS).
// Hovering a bar shows the date and amount via the native <title> tooltip.
export default function RevenueChart({ days }: { days: { date: Date; amount: number }[] }) {
  const width = 720;
  const height = 180;
  const top = 18;
  const bottom = 22;
  const left = 0;
  const plotHeight = height - top - bottom;
  const max = Math.max(...days.map((d) => d.amount), 0);
  // Round the axis up to a tidy number so gridlines land on readable values.
  const step = max <= 0 ? 1 : 10 ** Math.floor(Math.log10(max));
  const axisMax = max <= 0 ? 100 : Math.ceil(max / step) * step;
  const slot = (width - left) / Math.max(days.length, 1);
  const barWidth = Math.max(2, slot * 0.62);
  const label = (date: Date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Daily net revenue">
        {[0, 0.5, 1].map((f) => {
          const y = top + plotHeight * (1 - f);
          return (
            <g key={f}>
              <line x1={left} x2={width} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray={f === 0 ? undefined : "3 3"} />
              {f > 0 && (
                <text x={width} y={y - 4} textAnchor="end" className="fill-slate-400 text-[10px]">
                  {money(axisMax * f).replace(/\.00$/, "")}
                </text>
              )}
            </g>
          );
        })}
        {days.map((d, i) => {
          const h = axisMax ? (Math.max(d.amount, 0) / axisMax) * plotHeight : 0;
          const x = left + i * slot + (slot - barWidth) / 2;
          return (
            <g key={d.date.toISOString()}>
              <rect x={left + i * slot} y={top} width={slot} height={plotHeight} fill="transparent">
                <title>{`${label(d.date)}: ${money(d.amount)}`}</title>
              </rect>
              <rect
                x={x}
                y={top + plotHeight - h}
                width={barWidth}
                height={Math.max(h, d.amount > 0 ? 1.5 : 0)}
                rx={1.5}
                className={i === days.length - 1 ? "fill-[#ff5a1f]" : "fill-slate-800"}
                pointerEvents="none"
              />
              {(i === 0 || i === days.length - 1 || (i % 7 === 0 && days.length - 1 - i >= 4)) && (
                <text
                  x={x + barWidth / 2}
                  y={height - 6}
                  textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"}
                  className="fill-slate-400 text-[10px]"
                >
                  {label(d.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
