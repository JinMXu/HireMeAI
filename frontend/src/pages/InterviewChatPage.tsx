import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { sendInterviewMessage, endInterview } from '@/api/client';
import type { InterviewMessage, InterviewerAgent } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ChatBubble from '@/components/interview/ChatBubble';
import CoachingTip from '@/components/interview/CoachingTip';

export default function InterviewChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useAppStore();

  const state = location.state as {
    interviewId: string;
    firstMessage?: InterviewMessage;
    initialMessages?: InterviewMessage[];
    interviewers: InterviewerAgent[];
  } | null;

  const [messages, setMessages] = useState<InterviewMessage[]>(
    state?.initialMessages?.length ? state.initialMessages : state?.firstMessage ? [state.firstMessage] : []
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  const [streaming, setStreaming] = useState<{ content: string; agentId?: string } | null>(null);
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state) navigate('/interview');
    if (!sessionId) navigate('/');
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [state, sessionId, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const handleSend = async () => {
    if (!input.trim() || !state || sending) return;
    const content = input.trim();
    setInput('');
    setCoachingTip(null);
    setTypingStatus(null);
    setStreaming(null);
    setStreamError(null);
    setSending(true);

    const userMsg: InterviewMessage = { role: 'candidate', content };
    setMessages((prev) => [...prev, userMsg]);

    // Stream timeout — 65s, slightly longer than backend's 60s
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStreamError('面试官回复超时，请重试');
      setTypingStatus(null);
      setStreaming(null);
      setSending(false);
    }, 65_000);

    try {
      await sendInterviewMessage(
        state.interviewId,
        content,
        (msg) => setTypingStatus(msg),
        (chunk, agentId) => {
          setStreaming((prev) => ({
            content: (prev?.content || '') + chunk,
            agentId: prev?.agentId || agentId,
          }));
        },
        (data) => {
          if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
          setMessages((prev) => [...prev, data.reply]);
          if (data.is_complete) setIsComplete(true);
          setTypingStatus(null);
          setStreaming(null);
          setSending(false);
        },
        (tip) => {
          setCoachingTip(tip);
        },
        (err) => {
          if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
          setStreamError(err);
          setTypingStatus(null);
          setStreaming(null);
          setSending(false);
        },
      );
    } catch {
      if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
      setStreamError('网络连接中断，请重试');
      setTypingStatus(null);
      setStreaming(null);
      setSending(false);
    }
  };

  const handleEnd = async () => {
    if (!state) return;
    try {
      const res = await endInterview(state.interviewId);
      navigate('/interview/report', { state: { report: res.report, interviewers: state.interviewers } });
    } catch {
      setStreamError('生成评估报告失败，请重试');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {state?.interviewers.map((i) => i.name).join('、')} — 面试进行中
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto p-4">
          {messages.map((msg, i) => (
            <ChatBubble
              key={i}
              role={msg.role as 'interviewer' | 'candidate'}
              agentName={msg.agent_name}
              content={msg.content}
            />
          ))}
          {streaming && (
            <ChatBubble
              role="interviewer"
              agentName={(() => {
                const iv = state?.interviewers.find((i) => i.id === streaming.agentId);
                return iv ? `${iv.name}（${iv.title}）` : streaming.agentId;
              })()}
              content={streaming.content}
            />
          )}
          {typingStatus && (
            <div className="text-sm text-muted-foreground italic px-4 py-2 animate-pulse">
              {typingStatus}
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {coachingTip && <CoachingTip tip={coachingTip} />}

      {streamError && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm text-center">
          {streamError}
        </div>
      )}

      {isComplete ? (
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">面试已结束</p>
          <Button onClick={handleEnd} size="lg">查看评估报告</Button>
        </div>
      ) : (
        <div className="flex gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的回答...（Enter 发送，Shift+Enter 换行）"
            className="flex-1 resize-none"
            rows={2}
            disabled={sending}
          />
          <Button onClick={handleSend} disabled={sending || !input.trim()} className="self-end">
            {sending ? '...' : '发送'}
          </Button>
        </div>
      )}
      {streamError && isComplete && (
        <div className="text-center mt-3">
          <Button onClick={handleEnd} variant="outline" size="sm">
            重试生成报告
          </Button>
        </div>
      )}
    </div>
  );
}
