import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

const steps = [
  { path: '/', label: '上传简历' },
  { path: '/score', label: '简历评分' },
  { path: '/jd-match', label: '职位匹配' },
  { path: '/interview', label: '模拟面试' },
  { path: '/cover-letter', label: '求职信' },
];

export default function Header() {
  const location = useLocation();
  const sessionId = useAppStore((s) => s.sessionId);

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{ background: 'oklch(99% 0.002 240 / 0.85)' }}
    >
      <div className="max-w-[1180px] mx-auto px-7 py-3.5 flex items-center gap-8">
        <Link to="/" className="flex items-center gap-2.5 no-underline">
          <span
            className="grid place-items-center text-white font-bold"
            style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--primary)', fontSize: 14,
            }}
          >
            职
          </span>
          <span className="font-semibold text-[17px]" style={{ letterSpacing: '-0.01em' }}>
            职得
            <span className="text-muted-foreground font-normal text-[13px] ml-1">HireMe.AI</span>
          </span>
        </Link>
        <nav className="flex gap-1 ml-auto items-center">
          {steps.map((step) => {
            const active = location.pathname === step.path
              || (step.path !== '/' && location.pathname.startsWith(step.path));
            const disabled = !sessionId && step.path !== '/';
            return (
              <Link
                key={step.path}
                to={disabled ? '#' : step.path}
                onClick={disabled ? (e) => e.preventDefault() : undefined}
                className={cn(
                  'px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors',
                  active
                    ? 'text-primary bg-[var(--primary-soft)] font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[var(--secondary)]',
                  disabled && 'opacity-40 pointer-events-none',
                )}
                style={active ? { background: 'var(--primary-soft)' } : undefined}
              >
                {step.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
