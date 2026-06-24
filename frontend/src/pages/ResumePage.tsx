import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useAppStore } from '@/store/appStore';
import { scoreResume, optimizeResume } from '@/api/client';
import { Button } from '@/components/ui/button';
import { ResumeDownloadButtons } from '@/components/shared/ResumeDownloadButtons';

function scoreColor(score: number): string {
  if (score >= 75) return 'var(--success)';
  if (score >= 60) return 'var(--warn)';
  return 'var(--destructive)';
}

function overallBadge(score: number): { label: string; cls: string } {
  if (score >= 85) return { label: '优秀 · 直接投递', cls: 'badge-success' };
  if (score >= 70) return { label: '中等偏上 · 可优化', cls: 'badge-warn' };
  if (score >= 50) return { label: '中等 · 建议优化', cls: 'badge-warn' };
  return { label: '偏弱 · 需重写', cls: 'badge-danger' };
}

export default function ResumePage() {
  const { sessionId, scores, optimizedResume, optimizeChanges, setScores, setOptimizedResume, setOptimizeChanges } = useAppStore();
  const [loading, setLoading] = useState(() => Boolean(sessionId && !scores));
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const runScore = async () => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const result = await scoreResume(sessionId);
      setScores(result);
    } catch {
      setError('简历评分失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    if (scores) return;

    let cancelled = false;
    setLoading(true);
    scoreResume(sessionId)
      .then((result) => {
        if (!cancelled) {
          setScores(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('简历评分失败，请重试');
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [sessionId]);

  const handleOptimize = async () => {
    if (!sessionId) return;
    setOptimizing(true);
    try {
      const res = await optimizeResume(sessionId);
      setOptimizedResume(res.optimized_text);
      setOptimizeChanges(res.changes);
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[760px] mx-auto py-20 text-center text-muted-foreground">
        正在评分中...
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-[760px] mx-auto py-20 text-center space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={runScore} variant="outline">重试评分</Button>
      </div>
    );
  }
  if (!scores) return null;

  const chartData = scores.dimensions.map((d) => ({ name: d.name, score: d.score }));
  const overall = overallBadge(scores.overall);

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="eyebrow">STEP 02 · 简历评分</div>
        <h1 className="page-title">六维度诊断你的简历</h1>
        <p className="page-sub">基于内容完整度、量化程度、动词力度、相关性、结构可读性、专业语言六个维度给出诊断，并标注优势与短板。</p>
      </div>

      {/* 总分 + 维度明细 / 雷达图 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6 rounded-2xl border bg-card">
          <div className="section-title">综合得分</div>
          <div className="flex items-end gap-2 mb-2">
            <span
              className="font-bold"
              style={{ fontSize: 56, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--primary)' }}
            >
              {scores.overall}
            </span>
            <span className="text-muted-foreground font-mono pb-2" style={{ fontSize: 18 }}>/ 100</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${overall.cls}`}
              style={{ marginBottom: 12, marginLeft: 8 }}
            >
              {overall.label}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--secondary)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${scores.overall}%`, background: 'var(--primary)' }}
            />
          </div>

          <div className="h-px my-5" style={{ background: 'var(--border)' }} />
          <div className="section-title">维度明细</div>
          {scores.dimensions.map((d) => (
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

        <div className="card p-6 rounded-2xl border bg-card">
          <div className="section-title">维度雷达</div>
          <div className="grid place-items-center p-2 h-64">
            <ResponsiveContainer>
              <RadarChart data={chartData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  stroke="var(--primary)"
                  fill="var(--primary)"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {scores.dimensions.some((d) => d.feedback) && (
            <div className="mt-4 space-y-2 text-[13px]">
              {scores.dimensions.filter((d) => d.feedback).map((d) => (
                <div key={d.name} className="flex gap-2">
                  <span className="font-semibold shrink-0">{d.name}：</span>
                  <span className="text-muted-foreground">{d.feedback}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 优势 / 短板 */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-6 rounded-2xl border bg-card">
          <div className="flex justify-between items-center mb-4">
            <div className="section-title m-0">优势</div>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'oklch(95% 0.04 150)', color: 'var(--success)' }}
            >
              {scores.strengths.length} 项
            </span>
          </div>
          <ul className="space-y-2.5">
            {scores.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px]">
                <span style={{ color: 'var(--success)', marginTop: 2 }}>✓</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-6 rounded-2xl border bg-card">
          <div className="flex justify-between items-center mb-4">
            <div className="section-title m-0">短板</div>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
              style={{ background: 'oklch(95% 0.04 28)', color: 'var(--destructive)' }}
            >
              {scores.weaknesses.length} 项
            </span>
          </div>
          <ul className="space-y-2.5">
            {scores.weaknesses.map((w, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px]">
                <span style={{ color: 'var(--destructive)', marginTop: 2 }}>!</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI 优化 */}
      <div className="card p-6 rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <div className="section-title m-0 mb-1">AI 优化结果</div>
            {optimizedResume && optimizeChanges && optimizeChanges.length > 0 && (
              <div className="text-[12px] text-muted-foreground">已重写 {optimizeChanges.length} 处描述</div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {optimizedResume && (
              <ResumeDownloadButtons
                text={optimizedResume}
                baseFilename="optimized-resume-score"
                title="优化后简历"
              />
            )}
            <Button onClick={handleOptimize} disabled={optimizing} size="sm" variant="outline">
              {optimizing ? '优化中...' : optimizedResume ? '重新优化' : '一键优化'}
            </Button>
          </div>
        </div>

        {optimizeChanges && optimizeChanges.length > 0 && (
          <div className="space-y-1.5 mb-4">
            <h4 className="text-[13px] font-semibold">修改说明：</h4>
            {optimizeChanges.map((c, i) => (
              <p key={i} className="text-[13px] text-muted-foreground flex gap-2">
                <span style={{ color: 'var(--primary)', marginTop: 1 }}>·</span>
                <span>{c}</span>
              </p>
            ))}
          </div>
        )}

        {optimizedResume ? (
          <div className="resume-preview">{optimizedResume}</div>
        ) : (
          <div
            className="p-6 rounded-lg text-center text-[13px] text-muted-foreground"
            style={{ background: 'var(--secondary)' }}
          >
            点击"一键优化"，AI 会重写弱动词、补足量化、对齐行业表达。
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => navigate('/jd-match')} size="lg">
          继续：JD 匹配 →
        </Button>
      </div>
    </div>
  );
}
