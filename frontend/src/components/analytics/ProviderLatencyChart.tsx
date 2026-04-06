import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface ProviderData {
  provider_name: string;
  avg_latency_ms: number | null;
}

export function ProviderLatencyChart({ data }: { data?: ProviderData[] }) {
  if (!data || data.length === 0) return null;

  const chartData = data
    .filter((d) => d.avg_latency_ms != null)
    .map((d) => ({
      name: d.provider_name,
      latency: Math.round((d.avg_latency_ms ?? 0) / 1000 * 100) / 100,
    }));

  if (chartData.length === 0) return null;

  return (
    <div className="w-full h-56" data-testid="provider-latency-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 80, right: 20 }}>
          <XAxis type="number" unit="s" tick={{ fontSize: 12 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
          <Tooltip formatter={(v) => [`${v}s`, "Ort. Gecikme"]} />
          <Bar dataKey="latency" fill="#6366f1" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
