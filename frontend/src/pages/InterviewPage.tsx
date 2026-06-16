import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { setupInterview, startInterview, getInterviewHistory, getInterviewDetail, endInterview } from '@/api/client';
import type { InterviewerAgent, InterviewHistoryItem } from '@/api/client';
import InterviewSetup from '@/components/interview/InterviewSetup';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
      return { label: '可继续', variant: 'default' as const };
    }
    if (item.action === 'generate_report' && item.status === 'active') {
      return { label: item.runtime_missing ? '需生成报告' : '可结束', variant: 'secondary' as const };
    }
    if (item.action === 'view_report') {
      return { label: '已完成', variant: 'secondary' as const };
    }
    return { label: '报告缺失', variant: 'outline' as const };
  };

  const handleHistoryClick = async (item: InterviewHistoryItem) => {
    setError('');
    setHistoryLoadingId(item.id);
    try {
      if (item.action === 'continue') {
        const detail = await getInterviewDetail(item.id);
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
        const res = await endInterview(item.id);
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
    <div className="max-w-2xl mx-auto space-y-6">
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive text-sm">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">历史面试记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm">
                    {item.mode === '1v1' ? '1v1 面试' : '多角色群面'}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {item.difficulty === 'beginner' ? '初级' : item.difficulty === 'intermediate' ? '中级' : '高级'}
                    </Badge>
                    <Badge variant={historyBadge(item).variant} className="ml-2 text-xs">
                      {historyBadge(item).label}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(item.created_at).toLocaleString('zh-CN')} · {item.message_count} 条消息
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.overall_score != null ? (
                    <span className="text-lg font-bold text-primary">{item.overall_score}分</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{item.runtime_missing ? '运行状态已丢失' : '进行中'}</span>
                  )}
                  <Button
                    size="sm"
                    variant={item.action === 'continue' ? 'default' : 'outline'}
                    disabled={item.action === 'unavailable' || historyLoadingId === item.id}
                    onClick={() => handleHistoryClick(item)}
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
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
