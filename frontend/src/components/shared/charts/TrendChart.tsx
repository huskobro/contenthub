import {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface TrendChartProps {
  data: Array<Record<string, unknown>>;
  xKey: string;
  yKey: string;
  yLabel?: string;
  color?: string;
  height?: number;
  showArea?: boolean;
  formatX?: (value: string) => string;
  formatY?: (value: number) => string;
  emptyMessage?: string;
  testId?: string;
}

export function TrendChart({
  data,
  xKey,
  yKey,
  yLabel,
  color = "#6366f1",
  height = 280,
  showArea = true,
  formatX,
  formatY,
  emptyMessage = "Veri bulunamadi",
  testId = "trend-chart",
}: TrendChartProps) {
  const gradientId = `trend-gradient-${testId}`;

  if (!data || data.length === 0) {
    return (
      <div
        data-testid={testId}
        className="flex items-center justify-center text-sm text-neutral-400"
        style={{ height }}
      >
        {emptyMessage}
      </div>
    );
  }

  const Chart = showArea ? AreaChart : LineChart;

  return (
    <div data-testid={testId} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <Chart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.15} />
              <stop offset="100%" stopColor={color} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={{ stroke: "#e5e7eb" }}
            tickFormatter={formatX}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            label={
              yLabel
                ? {
                    value: yLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12, fill: "#9ca3af" },
                  }
                : undefined
            }
            tickFormatter={formatY}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: 13,
            }}
            formatter={(value: unknown) => {
              const num = Number(value);
              return formatY ? [formatY(num), yLabel ?? yKey] : [num, yLabel ?? yKey];
            }}
            labelFormatter={formatX ? (label: unknown) => formatX(String(label)) : undefined}
          />
          {showArea ? (
            <Area
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: color }}
            />
          ) : (
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, fill: "#fff", stroke: color }}
            />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
