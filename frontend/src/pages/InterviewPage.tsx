import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { setupInterview, startInterview, getInterviewHistory, getInterviewDetail, endInterview } from '@/api/client';
import type { InterviewerAgent, InterviewHistoryItem } from '@/api/client';
import InterviewSetup from '@/components/interview/InterviewSetup';
import { Button } from '@/components/ui/button';

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '初级',
  intermediate: '中级',
  advanced: '高级',
};

export default function InterviewPage() {
  const { sessionId, jdText } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [interviewers, setInterviewers] = useState<InterviewerAgent[] | null>(null);
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
    } else if (!jdText) {
      navigate('/jd-match');
    }
  }, [sessionId, jdText, navigate]);

  useEffect(() => {
    if (!sessionId) return;
    getInterviewHistory(sessionId)
      .then((res) => setHistory(res.interviews))
      .catch(() => setHistory([]));
  }, [sessionId]);

  if (!sessionId || !jdText) return null;

  const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = (error as { response?: { data?: { detail?: string } } }).response;
      return response?.data?.detail || fallback;
    }
    return fallback;
  };

  const handleSetup = async (mode: string, difficulty: string): Promise<InterviewerAgent[] | null> => {
    setLoading(true);
    setError('');
    try {
      const res = await setupInterview(sessionId, jdText, mode, difficulty);
      setInterviewers(res.interviewers);
      return res.interviewers;
    } catch (error: unknown) {
      setError(getErrorMessage(error, '面试准备失败，请重试'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (mode: string, difficulty: string) => {
    const activeInterviewers = interviewers ?? await handleSetup(mode, difficulty);
    if (!activeInterviewers) return;

    setLoading(true);
    setError('');
    try {
      const res = await startInterview(sessionId, activeInterviewers, mode, difficulty);
      navigate('/interview/chat', {
        state: {
          interviewId: res.interview_id,
          firstMessage: res.first_message,
          interviewers: activeInterviewers,
          mode,
        },
      });
    } catch (error: unknown) {
      setError(getErrorMessage(error, '面试启动失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const historyBadge = (item: InterviewHistoryItem) => {
    if (item.action === 'continue') {
      return { label: '可继续', bg: 'var(--primary-soft)', color: 'var(--primary-strong)' };
    }
    if (item.action === 'generate_report') {
      return { label: item.runtime_missing ? '需生成报告' : '可结束', bg: 'var(--accent-soft)', color: 'oklch(45% 0.1 68)' };
    }
    if (item.action === 'view_report') {
      return { label: '已完成', bg: 'oklch(95% 0.04 150)', color: 'var(--success)' };
    }
    return { label: '报告缺失', bg: 'var(--secondary)', color: 'var(--muted-foreground)' };
  };

  const handleHistoryClick = async (item: InterviewHistoryItem) => {
    setError('');
    setHistoryLoadingId(item.id);
    try {
      if (item.action === 'continue') {
        const detail = await getInterviewDetail(item.id, sessionId!);
        navigate('/interview/chat', {
          state: {
            interviewId: item.id,
            initialMessages: detail.messages,
            interviewers: detail.interviewers,
            mode: detail.mode,
          },
        });
        return;
      }

      if (item.action === 'generate_report') {
        const res = await endInterview(item.id, sessionId!);
        navigate('/interview/report', { state: { report: res.report, interviewId: item.id } });
        return;
      }

      if (item.action === 'view_report') {
        navigate('/interview/report', { state: { interviewId: item.id } });
      }
    } catch (error: unknown) {
      setError(getErrorMessage(error, '历史面试操作失败，请重试'));
    } finally {
      setHistoryLoadingId(null);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      <div className="mb-2">
        <div className="eyebrow">STEP 04 · 模拟面试</div>
        <h1 className="page-title">配置你的模拟面试</h1>
        <p className="page-sub">选择模式与难度，AI 会基于目标 JD 生成面试官阵容。1v1 适合专项练习，群面模拟真实多面官场景。</p>
      </div>

      {error && (
        <div
          className="p-3 rounded-lg text-sm"
          style={{ background: 'oklch(95% 0.04 28)', color: 'var(--destructive)' }}
        >
          {error}
        </div>
      )}

      <InterviewSetup
        jdText={jdText}
        onStart={handleStart}
        loading={loading}
        interviewers={interviewers || undefined}
      />

      {history.length > 0 && (
        <div>
          <div className="section-title">历史面试</div>
          <div className="space-y-2.5">
            {history.map((item) => {
              const badge = historyBadge(item);
              return (
                <div
                  key={item.id}
                  className="history-item"
                  onClick={() => handleHistoryClick(item)}
                  style={item.action === 'unavailable' ? { opacity: 0.55, cursor: 'default' } : undefined}
                >
                  <div className="min-w-0">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-semibold text-[14px]">
                        {item.mode === '1v1' ? '1v1 面试' : '多角色群面'}
                      </span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                      >
                        {DIFFICULTY_LABEL[item.difficulty] || item.difficulty}
                      </span>
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="history-meta">
                      {new Date(item.created_at).toLocaleString('zh-CN')} · {item.message_count} 条消息
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.overall_score != null ? (
                      <span className="text-lg font-bold text-primary">{item.overall_score}分</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {item.runtime_missing ? '运行状态已丢失' : '进行中'}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant={item.action === 'continue' ? 'default' : 'outline'}
                      disabled={item.action === 'unavailable' || historyLoadingId === item.id}
                      onClick={(e) => { e.stopPropagation(); handleHistoryClick(item); }}
                    >
                      {historyLoadingId === item.id
                        ? '处理中...'
                        : item.action === 'continue'
                          ? '继续'
                          : item.action === 'generate_report'
                            ? '生成报告'
                            : item.action === 'view_report'
                              ? '查看'
                              : '不可用'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
