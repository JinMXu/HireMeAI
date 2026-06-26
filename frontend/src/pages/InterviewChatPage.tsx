import { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { sendInterviewMessage, endInterview } from '@/api/client';
import type { InterviewMessage, InterviewerAgent } from '@/api/client';
import { Button } from '@/components/ui/button';
import ChatBubble from '@/components/interview/ChatBubble';
import CoachingTip from '@/components/interview/CoachingTip';

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};
const MODE_LABEL: Record<string, string> = { '1v1': '1v1 单面', panel: '群面' };

export default function InterviewChatPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useAppStore();

  const state = location.state as {
    interviewId: string;
    firstMessage?: InterviewMessage;
    initialMessages?: InterviewMessage[];
    interviewers: InterviewerAgent[];
    mode?: string;
    difficulty?: string;
  } | null;

  const [messages, setMessages] = useState<InterviewMessage[]>(
    state?.initialMessages?.length ? state.initialMessages : state?.firstMessage ? [state.firstMessage] : []
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingStatus, setTypingStatus] = useState<string | null>(null);
  const [streaming, setStreaming] = useState<{ content: string; agentId?: string } | null>(null);
  const [coachingTip, setCoachingTip] = useState<string | null>(null);
  const [coachTipCount, setCoachTipCount] = useState(0);
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

  // 对话节奏统计（基于已落定的消息，不含正在流式的那条）
  const stats = useMemo(() => {
    const interviewerMsgs = messages.filter((m) => m.role === 'interviewer');
    const candidateMsgs = messages.filter((m) => m.role === 'candidate');
    const candChars = candidateMsgs.reduce((n, m) => n + m.content.length, 0);
    const totalChars = candChars + interviewerMsgs.reduce((n, m) => n + m.content.length, 0);
    const share = totalChars > 0 ? Math.round((candChars / totalChars) * 100) : 0;
    return { rounds: interviewerMsgs.length, share, tips: coachTipCount };
  }, [messages, coachTipCount]);

  const currentSpeaker = useMemo(() => {
    const agentId = streaming?.agentId;
    if (!agentId || !state) return null;
    return state.interviewers.find((i) => i.id === agentId) || null;
  }, [streaming, state]);

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
        sessionId!,
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
          if (data.coaching_tip) {
            setCoachingTip(data.coaching_tip);
            setCoachTipCount((n) => n + 1);
          }
          setTypingStatus(null);
          setStreaming(null);
          setSending(false);
        },
        (tip) => {
          setCoachingTip(tip);
          setCoachTipCount((n) => n + 1);
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
      const res = await endInterview(state.interviewId, sessionId!);
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

  if (!state) return null;

  const metaBits = [
    state.mode ? MODE_LABEL[state.mode] || state.mode : null,
    state.difficulty ? DIFFICULTY_LABEL[state.difficulty] || state.difficulty : null,
    `第 ${stats.rounds + (streaming ? 1 : 0)} 轮`,
  ].filter(Boolean);

  return (
    <div className="max-w-[1180px] mx-auto" style={{ padding: 0 }}>
      {/* 头部 */}
      <div className="flex justify-between items-end mb-4 gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="eyebrow">STEP 05 · 面试进行中</div>
          <h1 className="page-title" style={{ marginBottom: 4 }}>
            {state.interviewers.map((i) => i.name).join('、')}
          </h1>
          <div className="text-muted-foreground text-[13px]">
            {metaBits.join(' · ')}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleEnd}>
          提前结束 → 报告
        </Button>
      </div>

      <div className="chat-wrap">
        {/* 对话区 */}
        <div className="chat-stream">
          <div className="chat-messages">
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
                agentName={currentSpeaker ? `${currentSpeaker.name}` : streaming.agentId}
                content={streaming.content}
                streaming
              />
            )}
            {typingStatus && !streaming && (
              <div className="text-sm text-muted-foreground italic px-1 animate-pulse">
                {typingStatus}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入栏 */}
          <div className="chat-input-bar">
            <textarea
              className="chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="回答面试官的问题...（Enter 发送，Shift+Enter 换行）"
              disabled={sending || isComplete}
            />
            <Button variant="outline" size="sm" onClick={handleEnd} disabled={isComplete}>
              结束
            </Button>
            <Button onClick={handleSend} disabled={sending || !input.trim() || isComplete}>
              {sending ? '...' : '发送'}
            </Button>
          </div>
        </div>

        {/* 侧栏 */}
        <div className="flex flex-col" style={{ gap: 16 }}>
          {coachingTip ? (
            <CoachingTip tip={coachingTip} />
          ) : (
            <div className="coach-tip" style={{ opacity: 0.55 }}>
              <div className="coach-tip-label">教练实时提示</div>
              <div>回答后，教练会针对压力点给出结构化建议。</div>
            </div>
          )}

          <div className="rounded-2xl border bg-card p-[18px]">
            <div className="section-title" style={{ marginBottom: 10 }}>当前面官</div>
            {currentSpeaker ? (
              <>
                <div
                  className="interviewer-card"
                  style={{ borderColor: 'var(--primary-tint)', background: 'var(--primary-soft)' }}
                >
                  <div className="interviewer-avatar">
                    {currentSpeaker.avatar || currentSpeaker.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="interviewer-name">{currentSpeaker.name}</div>
                    <div className="interviewer-role">{currentSpeaker.title}</div>
                  </div>
                </div>
                <div className="text-muted-foreground mt-2" style={{ fontSize: 11 }}>
                  焦点：{currentSpeaker.focus_areas.slice(0, 3).join('、') || '—'}
                </div>
              </>
            ) : (
              <div className="interviewer-card">
                <div className="interviewer-avatar">?</div>
                <div className="min-w-0">
                  <div className="interviewer-name">等待发言</div>
                  <div className="interviewer-role">
                    {state.interviewers.length > 1 ? '群面 · 多面官轮流' : '1v1 单面'}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-[18px]">
            <div className="section-title" style={{ marginBottom: 10 }}>对话节奏</div>
            <div className="score-row" style={{ gridTemplateColumns: '1fr auto' }}>
              <div className="score-row-label">已对话</div>
              <div className="score-row-val">{stats.rounds} 轮</div>
            </div>
            <div className="score-row" style={{ gridTemplateColumns: '1fr auto' }}>
              <div className="score-row-label">我发言占比</div>
              <div className="score-row-val">{stats.share}%</div>
            </div>
            <div className="score-row" style={{ gridTemplateColumns: '1fr auto', borderBottom: 0 }}>
              <div className="score-row-label">教练提示</div>
              <div className="score-row-val">{stats.tips} 条</div>
            </div>
          </div>
        </div>
      </div>

      {streamError && (
        <div
          className="mt-4 p-3 rounded-lg text-sm text-center"
          style={{ background: 'oklch(95% 0.04 28)', color: 'var(--destructive)' }}
        >
          {streamError}
          {isComplete && (
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={handleEnd}>重试生成报告</Button>
            </div>
          )}
        </div>
      )}

      {isComplete && !streamError && (
        <div className="text-center mt-6 space-y-3">
          <p className="text-muted-foreground">面试已结束，可查看评估报告。</p>
          <Button size="lg" onClick={handleEnd}>查看评估报告 →</Button>
        </div>
      )}
    </div>
  );
}
