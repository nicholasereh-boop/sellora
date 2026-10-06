import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";

// Every analytics endpoint (seller + affiliate) returns the same
// {labels, values} shape - one chart component reads it directly rather
// than each page reshaping it into recharts' {name, value} convention.
export default function TrendChart({ labels = [], values = [], color = "#E4A427" }) {
  const data = labels.map((label, i) => ({ label, value: values[i] ?? 0 }));

  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-mist-soft">
        No data yet for this period.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="label"
          tick={{ fill: "rgb(var(--c-mist-soft))", fontSize: 11 }}
          axisLine={{ stroke: "rgb(var(--c-surface-line))" }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <Tooltip
          contentStyle={{
            background: "rgb(var(--c-surface))",
            border: "1px solid rgb(var(--c-surface-line))",
            borderRadius: 8,
            fontSize: 12,
            color: "rgb(var(--c-mist))",
          }}
          labelStyle={{ color: "rgb(var(--c-mist-soft))" }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#trendFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
