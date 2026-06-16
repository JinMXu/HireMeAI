import { Lightbulb } from 'lucide-react';

interface CoachingTipProps {
  tip: string;
}

export default function CoachingTip({ tip }: CoachingTipProps) {
  return (
    <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
      <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{tip}</span>
    </div>
  );
}
