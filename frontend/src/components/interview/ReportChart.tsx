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
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} />
          <Radar dataKey="score" stroke="oklch(0.488 0.243 264.376)" fill="oklch(0.488 0.243 264.376)" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
