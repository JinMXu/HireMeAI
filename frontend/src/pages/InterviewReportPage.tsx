import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getInterviewDetail } from '@/api/client';
import type { EvaluationReport, InterviewerAgent, InterviewMessage } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import ChatBubble from '@/components/interview/ChatBubble';
import ReportChart from '@/components/interview/ReportChart';

export default function InterviewReportPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    report?: EvaluationReport;
    interviewers?: InterviewerAgent[];
    interviewId?: string;
  } | null;

  const interviewId = state?.interviewId;
  const [report, setReport] = useState<EvaluationReport | null>(state?.report || null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [loading, setLoading] = useState(!state?.report);

  useEffect(() => {
    if (report) return; // Already have report from state (post-interview flow)
    if (!interviewId) {
      navigate('/interview');
      return;
    }
    getInterviewDetail(interviewId)
      .then((res) => {
        setReport(res.report);
        setMessages(res.messages);
      })
      .catch(() => navigate('/interview'))
      .finally(() => setLoading(false));
  }, [interviewId, navigate, report]);

  if (loading) {
    return <div className="text-center text-muted-foreground py-20">加载中...</div>;
  }
  if (!report) {
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>面试评估报告</CardTitle>
            <div className="text-3xl font-bold text-primary">{report.overall_score}<span className="text-lg text-muted-foreground">/100</span></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <ReportChart dimensions={report.dimensions} />

          <div className="space-y-3">
            {report.dimensions.map((d) => (
              <div key={d.name} className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-24 shrink-0">{d.name}</span>
                <Progress value={d.score} className="flex-1" />
                <span className="text-sm font-medium w-8">{d.score}</span>
              </div>
            ))}
          </div>

          <p className="text-muted-foreground">{report.summary}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200 text-base">优势</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              {report.strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200 text-base">改进建议</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
              {report.improvements.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {report.round_reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>逐轮回顾</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.round_reviews.map((r, i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium">Q{r.question_index}: {r.question}</p>
                  <Badge variant={r.rating === '优秀' ? 'default' : r.rating === '良好' ? 'secondary' : 'outline'}>{r.rating}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{r.feedback}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>对话记录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[50vh] overflow-y-auto">
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                role={msg.role as 'interviewer' | 'candidate'}
                agentName={msg.agent_name}
                content={msg.content}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="text-center space-x-4">
        <Button onClick={() => navigate('/interview')} variant="outline" size="lg">
          重新面试
        </Button>
        <Button onClick={() => navigate('/cover-letter')} size="lg">
          下一步：生成求职信
        </Button>
      </div>
    </div>
  );
}
