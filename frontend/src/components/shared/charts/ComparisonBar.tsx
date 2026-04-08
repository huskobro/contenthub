import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface ComparisonBarProps {
  data: Array<Record<string, unknown>>;
  nameKey: string;
  valueKeys: string[];
  colors?: string[];
  height?: number;
  layout?: "vertical" | "horizontal";
  formatValue?: (value: number) => string;
  emptyMessage?: string;
  testId?: string;
}

const DEFAULT_COLORS = ["#6366f1", "#10b981", "#f59e0b"];

export function ComparisonBar({
  data,
  nameKey,
  valueKeys,
  colors = DEFAULT_COLORS,
  height = 300,
  layout = "vertical",
  formatValue,
  emptyMessage = "Veri bulunamadi",
  testId = "comparison-bar",
}: ComparisonBarProps) {
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

  const isHorizontal = layout === "horizontal";

  return (
    <div data-testid={testId} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout={isHorizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="#f0f0f0" strokeDasharray="3 3" />
          {isHorizontal ? (
            <>
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
                tickFormatter={formatValue}
              />
              <YAxis
                type="category"
                dataKey={nameKey}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey={nameKey}
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={{ stroke: "#e5e7eb" }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatValue}
              />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: 13,
            }}
            formatter={(value: unknown, name: unknown) => [
              formatValue ? formatValue(Number(value)) : String(value),
              String(name),
            ]}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="rect"
            iconSize={10}
            formatter={(value: string) => (
              <span style={{ fontSize: 12, color: "#6b7280" }}>{value}</span>
            )}
          />
          {valueKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={isHorizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
              barSize={valueKeys.length === 1 ? 32 : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
