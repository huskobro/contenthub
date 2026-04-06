import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface ModuleData {
  module_type: string;
  total_jobs: number;
}

const COLORS = ["#6366f1", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6"];

export function ModuleDistributionChart({ data }: { data?: ModuleData[] }) {
  if (!data || data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: d.module_type,
    value: d.total_jobs,
  }));

  return (
    <div className="w-full h-64" data-testid="module-distribution-chart">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} is`, "Toplam"]} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
