import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { setupInterview, startInterview, getInterviewHistory } from '@/api/client';
import type { InterviewerAgent, InterviewHistoryItem } from '@/api/client';
import InterviewSetup from '@/components/interview/InterviewSetup';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function InterviewPage() {
  const { sessionId, jdText } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [interviewers, setInterviewers] = useState<InterviewerAgent[] | null>(null);
  const [history, setHistory] = useState<InterviewHistoryItem[]>([]);
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
                className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate('/interview/report', { state: { interviewId: item.id } })}
              >
                <div>
                  <div className="font-medium text-sm">
                    {item.mode === '1v1' ? '1v1 面试' : '多角色群面'}
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {item.difficulty === 'beginner' ? '初级' : item.difficulty === 'intermediate' ? '中级' : '高级'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {new Date(item.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="text-right">
                  {item.overall_score != null ? (
                    <span className="text-lg font-bold text-primary">{item.overall_score}分</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">进行中</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
