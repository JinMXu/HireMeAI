interface CoachingTipProps {
  tip: string;
}

export default function CoachingTip({ tip }: CoachingTipProps) {
  return (
    <div className="coach-tip">
      <div className="coach-tip-label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" />
        </svg>
        教练实时提示
      </div>
      <div>{tip}</div>
    </div>
  );
}
