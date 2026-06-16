import { cn } from '@/lib/utils';

interface ChatBubbleProps {
  role: 'interviewer' | 'candidate' | 'system';
  agentName?: string;
  content: string;
}

export default function ChatBubble({ role, agentName, content }: ChatBubbleProps) {
  const isInterviewer = role === 'interviewer';

  return (
    <div className={cn('flex gap-3', isInterviewer ? '' : 'flex-row-reverse')}>
      <div className={cn(
        'rounded-full w-8 h-8 flex items-center justify-center text-sm shrink-0',
        isInterviewer ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
      )}>
        {isInterviewer ? agentName?.charAt(0) || '面' : '我'}
      </div>
      <div className="max-w-[75%]">
        {agentName && <div className="text-xs text-muted-foreground mb-1">{agentName}</div>}
        <div className={cn(
          'rounded-xl px-4 py-2.5 text-sm',
          isInterviewer ? 'bg-muted rounded-tl-sm' : 'bg-primary text-primary-foreground rounded-tr-sm',
        )}>
          {content}
        </div>
      </div>
    </div>
  );
}
