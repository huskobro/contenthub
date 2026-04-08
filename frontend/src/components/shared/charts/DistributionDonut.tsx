import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
} from "recharts";

interface DonutItem {
  name: string;
  value: number;
  color?: string;
}

interface DistributionDonutProps {
  data: DonutItem[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  emptyMessage?: string;
  testId?: string;
}

const DEFAULT_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

export function DistributionDonut({
  data,
  height = 240,
  innerRadius = 55,
  outerRadius = 85,
  showLegend = true,
  showLabels = false,
  emptyMessage = "Veri bulunamadi",
  testId = "distribution-donut",
}: DistributionDonutProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data || data.length === 0 || total === 0) {
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

  const getColor = (index: number, item: DonutItem) =>
    item.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];

  return (
    <div data-testid={testId} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={
              showLabels
                ? (props: { name?: string; percent?: number }) =>
                    `${props.name ?? ""} ${((props.percent ?? 0) * 100).toFixed(0)}%`
                : false
            }
            labelLine={showLabels}
          >
            {data.map((item, index) => (
              <Cell key={`cell-${index}`} fill={getColor(index, item)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: 13,
            }}
            formatter={(value: unknown, name: unknown) => {
              const num = Number(value);
              const pct = total > 0 ? ((num / total) * 100).toFixed(1) : "0";
              return [`${num} (${pct}%)`, String(name)];
            }}
          />
          {showLegend && (
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ fontSize: 12, color: "#6b7280" }}>{value}</span>
              )}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
