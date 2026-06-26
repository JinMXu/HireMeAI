import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { getInterviewDetail } from '@/api/client';
import type { EvaluationReport, InterviewerAgent, InterviewMessage, RoundReview } from '@/api/client';
import { Button } from '@/components/ui/button';
import ChatBubble from '@/components/interview/ChatBubble';
import ReportChart from '@/components/interview/ReportChart';

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--success)';
  if (score >= 60) return 'var(--warn)';
  return 'var(--destructive)';
}

function ratingStyle(rating: string): { bg: string; color: string; mark: string } {
  if (rating.includes('优秀')) return { bg: 'oklch(95% 0.04 150)', color: 'var(--success)', mark: '★' };
  if (rating.includes('良好')) return { bg: 'var(--primary-soft)', color: 'var(--primary-strong)', mark: '◆' };
  if (rating.includes('一般')) return { bg: 'var(--accent-soft)', color: 'oklch(45% 0.1 68)', mark: '○' };
  return { bg: 'oklch(95% 0.04 28)', color: 'var(--destructive)', mark: '!' };
}

function overallBand(score: number): { label: string; bg: string; color: string } {
  if (score >= 85) return { label: '优秀 · 强势冲刺', bg: 'oklch(95% 0.04 150)', color: 'var(--success)' };
  if (score >= 75) return { label: '良好 · 可冲刺', bg: 'oklch(95% 0.04 150)', color: 'var(--success)' };
  if (score >= 60) return { label: '合格 · 需补强', bg: 'var(--accent-soft)', color: 'oklch(45% 0.1 68)' };
  return { label: '偏弱 · 建议重练', bg: 'oklch(95% 0.04 28)', color: 'var(--destructive)' };
}

export default function InterviewReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sessionId } = useAppStore();

  const state = location.state as {
    report?: EvaluationReport;
    interviewers?: InterviewerAgent[];
    interviewId?: string;
  } | null;

  const interviewId = state?.interviewId;
  const [report, setReport] = useState<EvaluationReport | null>(state?.report || null);
  const [interviewers, setInterviewers] = useState<InterviewerAgent[]>(state?.interviewers || []);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [loading, setLoading] = useState(!state?.report);

  useEffect(() => {
    if (report) return;
    if (!interviewId || !sessionId) {
      navigate('/interview');
      return;
    }
    getInterviewDetail(interviewId, sessionId)
      .then((res) => {
        setReport(res.report);
        setMessages(res.messages);
        setInterviewers(res.interviewers);
      })
      .catch(() => navigate('/interview'))
      .finally(() => setLoading(false));
  }, [interviewId, sessionId, navigate, report]);

  if (loading) {
    return <div className="text-center text-muted-foreground py-20">加载中...</div>;
  }
  if (!report) return null;

  const band = overallBand(report.overall_score);
  const metaBits = [
    interviewers.length > 0 ? interviewers.map((i) => i.name).join('、') : null,
    `${messages.length || report.round_reviews.length} 轮对话`,
  ].filter(Boolean);

  return (
    <div className="max-w-[960px] mx-auto space-y-6">
      {/* 头部 */}
      <div className="mb-2">
        <div className="eyebrow">STEP 06 · 面试报告</div>
        <h1 className="page-title">面试评估报告</h1>
        <p className="page-sub">{metaBits.join(' · ')}</p>
      </div>

      {/* 综合分 + 雷达 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-6">
          <div className="section-title">综合评分</div>
          <div className="flex items-end gap-2 mb-2">
            <span
              className="font-bold leading-none"
              style={{ fontSize: 56, letterSpacing: '-0.03em', color: 'var(--primary)' }}
            >
              {report.overall_score}
            </span>
            <span className="text-muted-foreground font-mono mb-2" style={{ fontSize: 18 }}>/ 100</span>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mb-3 ml-2"
              style={{ background: band.bg, color: band.color }}
            >
              {band.label}
            </span>
          </div>
          <div
            className="rounded-full overflow-hidden"
            style={{ height: 6, background: 'var(--secondary)' }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${report.overall_score}%`, background: 'var(--primary)' }}
            />
          </div>
          <div className="text-muted-foreground mt-2" style={{ fontSize: 12 }}>
            四维度：{report.dimensions.map((d) => d.name).join(' · ')}
          </div>

          <div className="my-5 h-px" style={{ background: 'var(--border)' }} />
          <div className="section-title">维度明细</div>
          {report.dimensions.map((d) => (
            <div key={d.name} className="score-row">
              <div className="score-row-label">{d.name}</div>
              <div className="score-row-bar">
                <div
                  className="score-row-fill"
                  style={{ width: `${d.score}%`, background: scoreColor(d.score) }}
                />
              </div>
              <div className="score-row-val">{d.score}</div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <div className="section-title">评估雷达</div>
          <ReportChart dimensions={report.dimensions} />
        </div>
      </div>

      {/* 优势 / 改进 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="section-title" style={{ margin: 0 }}>优势</div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'oklch(95% 0.04 150)', color: 'var(--success)' }}
            >
              {report.strengths.length} 项
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {report.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                <span style={{ color: 'var(--success)', marginTop: 2 }}>✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="section-title" style={{ margin: 0 }}>改进建议</div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'oklch(95% 0.04 28)', color: 'var(--destructive)' }}
            >
              {report.improvements.length} 项
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {report.improvements.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed">
                <span style={{ color: 'var(--destructive)', marginTop: 2 }}>!</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 逐轮回顾 */}
      {report.round_reviews.length > 0 && (
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="section-title" style={{ margin: 0 }}>逐轮回顾 · 摘选</div>
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
            >
              共 {report.round_reviews.length} 轮
            </span>
          </div>
          <div className="flex flex-col gap-3.5">
            {report.round_reviews.map((r: RoundReview, i) => {
              const rs = ratingStyle(r.rating);
              return (
                <div
                  key={i}
                  className="rounded-xl border p-3.5"
                  style={{ background: 'var(--secondary)', borderColor: 'var(--border)' }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: 'var(--primary-soft)', color: 'var(--primary-strong)' }}
                    >
                      第 {r.question_index} 轮
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{ background: rs.bg, color: rs.color }}
                    >
                      {rs.mark} {r.rating}
                    </span>
                  </div>
                  <div className="text-[13px] mb-1.5">
                    <strong>问：</strong>{r.question}
                  </div>
                  <div className="text-[13px] text-muted-foreground">
                    <strong>答：</strong>{r.answer_summary}
                  </div>
                  {r.feedback && (
                    <div className="text-[12px] mt-1.5" style={{ color: rs.color }}>
                      {r.feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 对话记录 */}
      {messages.length > 0 && (
        <div className="rounded-2xl border bg-card p-6">
          <div className="section-title">完整对话记录</div>
          <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto">
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                role={msg.role as 'interviewer' | 'candidate'}
                agentName={msg.agent_name}
                content={msg.content}
              />
            ))}
          </div>
        </div>
      )}

      {/* 整体总结 */}
      <div
        className="rounded-2xl border p-6"
        style={{ background: 'var(--primary-soft)', borderColor: 'var(--primary-tint)' }}
      >
        <div className="section-title" style={{ color: 'var(--primary-strong)' }}>整体总结</div>
        <p className="text-[14px] leading-relaxed">{report.summary}</p>
        <div className="flex flex-wrap gap-2.5 mt-4">
          <Button onClick={() => navigate('/interview')}>再练一次</Button>
          <Button variant="outline" onClick={() => navigate('/cover-letter')}>生成求职信 →</Button>
        </div>
      </div>
    </div>
  );
}
