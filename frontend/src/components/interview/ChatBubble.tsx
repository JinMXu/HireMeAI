interface ChatBubbleProps {
  role: 'interviewer' | 'candidate' | 'system';
  agentName?: string;
  content: string;
  streaming?: boolean;
}

export default function ChatBubble({ role, agentName, content, streaming }: ChatBubbleProps) {
  const isCandidate = role === 'candidate';
  const roleLabel = isCandidate ? '我' : agentName || '面试官';

  return (
    <div className={`chat-bubble ${isCandidate ? 'candidate' : 'interviewer'}`}>
      <div className="chat-role">{roleLabel}{streaming ? ' · 正在输入' : ''}</div>
      <div>
        {content}
        {streaming && <span className="typing-cursor" />}
      </div>
    </div>
  );
}
