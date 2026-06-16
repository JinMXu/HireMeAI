import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';

const steps = [
  { path: '/', label: '上传简历' },
  { path: '/score', label: '评分优化' },
  { path: '/jd-match', label: 'JD匹配' },
  { path: '/interview', label: '面试准备' },
  { path: '/cover-letter', label: '求职信' },
];

export default function Header() {
  const location = useLocation();
  const sessionId = useAppStore((s) => s.sessionId);

  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-primary no-underline">
          HireMe.AI <span className="text-sm text-muted-foreground font-normal">职得</span>
        </Link>
        <nav className="flex gap-1">
          {steps.map((step) => {
            const active = location.pathname === step.path;
            const disabled = !sessionId && step.path !== '/';
            return (
              <Button
                key={step.path}
                variant={active ? 'secondary' : 'ghost'}
                size="sm"
                disabled={disabled}
                asChild
              >
                <Link to={disabled ? '#' : step.path}>
                  {step.label}
                </Link>
              </Button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
