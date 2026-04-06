import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface StepData {
  step_key: string;
  avg_elapsed_seconds: number | null;
}

export function StepDurationChart({ data }: { data?: StepData[] }) {
  if (!data || data.length === 0) return null;

  const chartData = data
    .filter((d) => d.avg_elapsed_seconds != null)
    .map((d) => ({
      name: d.step_key,
      duration: Math.round((d.avg_elapsed_seconds ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.duration - a.duration);

  if (chartData.length === 0) return null;

  return (
    <div className="w-full h-56" data-testid="step-duration-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
          <XAxis type="number" unit="s" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
          <Tooltip formatter={(v) => [`${v}s`, "Ort. Sure"]} />
          <Bar dataKey="duration" fill="#06b6d4" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
