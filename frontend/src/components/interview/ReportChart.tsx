import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import type { EvalDimension } from '@/api/client';

interface ReportChartProps {
  dimensions: EvalDimension[];
}

export default function ReportChart({ dimensions }: ReportChartProps) {
  const data = dimensions.map((d) => ({ name: d.name, score: d.score }));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} stroke="var(--border)" />
          <Radar dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
