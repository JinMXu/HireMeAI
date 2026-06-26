import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { matchJD, optimizeForJD } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ResumeDownloadButtons } from '@/components/shared/ResumeDownloadButtons';

function matchColor(pct: number): string {
  if (pct >= 70) return 'var(--success)';
  if (pct >= 40) return 'var(--warn)';
  return 'var(--destructive)';
}

export default function JDMatchPage() {
  const {
    sessionId, jdText, matchResult, setJdText, setMatchResult,
    jdOptimizeResult, setJdOptimizeResult,
  } = useAppStore();
  const [input, setInput] = useState(jdText || '');
  const [loading, setLoading] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) navigate('/');
  }, [sessionId, navigate]);

  if (!sessionId) return null;

  const handleMatch = async () => {
    if (input.trim().length < 20) return;
    setLoading(true);
    setMatchError('');
    setJdText(input);
    try {
      const res = await matchJD(sessionId, input);
      setMatchResult(res);
      setJdOptimizeResult(null);
    } catch {
      setMatchError('JD 匹配分析失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    setOptimizeError('');
    try {
      const res = await optimizeForJD(sessionId, input);
      setJdOptimizeResult(res);
    } catch {
      setOptimizeError('针对 JD 优化失败，请重试');
    } finally {
      setOptimizing(false);
    }
  };

  const optimizeResult = jdOptimizeResult;

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <div className="eyebrow">STEP 03 · 职位匹配</div>
        <h1 className="page-title">把简历对齐目标岗位</h1>
        <p className="page-sub">粘贴目标 JD，系统会比对技能、经验、关键词，给出匹配度与差距清单，并可基于 JD 定向重写简历。</p>
      </div>

      {/* JD 输入 */}
      <div className="card p-6 rounded-2xl border bg-card">
        <div className="mb-4">
          <label className="block font-semibold text-[13px] mb-1.5">目标职位 JD</label>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴完整 JD 文本，包括岗位描述、职责、要求..."
            className="min-h-[160px] resize-y leading-relaxed"
          />
        </div>
        <div className="flex justify-between items-center">
          <div className="text-[12px] text-muted-foreground">
            {input.trim().length < 20
              ? `还需 ${20 - input.trim().length} 字即可分析`
              : `已输入 ${input.length} 字`}
          </div>
          <Button onClick={handleMatch} disabled={loading || input.trim().length < 20}>
            {loading ? '分析中...' : '开始匹配分析'}
          </Button>
        </div>
        {matchError && (
          <div className="flex items-center gap-3 text-sm text-destructive mt-3">
            <span>{matchError}</span>
            <Button onClick={handleMatch} variant="outline" size="sm" disabled={loading}>重试</Button>
          </div>
        )}
      </div>

      {matchResult && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-6 rounded-2xl border bg-card">
            <div className="section-title">整体匹配度</div>
            <div className="flex items-end gap-2 mb-2.5">
              <span
                className="font-bold"
                style={{ fontSize: 52, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--primary)' }}
              >
                {matchResult.match_percentage}
              </span>
              <span className="text-muted-foreground font-mono pb-1.5" style={{ fontSize: 16 }}>% 匹配</span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{ height: 8, background: 'var(--secondary)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${matchResult.match_percentage}%`,
                  background: matchColor(matchResult.match_percentage),
                }}
              />
            </div>
            <div className="text-[12px] text-muted-foreground mt-2">
              技能命中 {matchResult.matched_skills.length} 项 · 缺失 {matchResult.missing_skills.length} 项
            </div>

            <div className="h-px my-5" style={{ background: 'var(--border)' }} />
            <div className="section-title">技能差距</div>
            <div className="flex flex-wrap gap-1.5">
              {matchResult.matched_skills.map((s, i) => (
                <span key={`m${i}`} className="skill-tag matched">{s} ✓</span>
              ))}
              {matchResult.missing_skills.map((s, i) => (
                <span key={`x${i}`} className="skill-tag missing">{s} ✕</span>
              ))}
              {matchResult.matched_skills.length === 0 && matchResult.missing_skills.length === 0 && (
                <span className="text-[13px] text-muted-foreground">未检测到具体技能项</span>
              )}
            </div>
          </div>

          <div className="card p-6 rounded-2xl border bg-card">
            <div className="section-title">差距分析</div>
            <ul className="space-y-3.5">
              {matchResult.missing_skills.map((s, i) => (
                <li key={`g${i}`} className="flex items-start gap-2.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 shrink-0"
                    style={{ background: 'oklch(95% 0.04 28)', color: 'var(--destructive)' }}
                  >
                    缺失
                  </span>
                  <div>
                    <strong className="text-[13px]">{s}</strong>
                    <div className="text-[12px] text-muted-foreground mt-0.5">建议在简历中补充相关项目或经验。</div>
                  </div>
                </li>
              ))}
              {matchResult.experience_gaps.map((g, i) => (
                <li key={`e${i}`} className="flex items-start gap-2.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 shrink-0"
                    style={{ background: 'var(--accent-soft)', color: 'oklch(45% 0.1 68)' }}
                  >
                    偏弱
                  </span>
                  <div>
                    <strong className="text-[13px]">{g}</strong>
                  </div>
                </li>
              ))}
              {matchResult.matched_skills.slice(0, 3).map((s, i) => (
                <li key={`s${i}`} className="flex items-start gap-2.5">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-0.5 shrink-0"
                    style={{ background: 'oklch(95% 0.04 150)', color: 'var(--success)' }}
                  >
                    命中
                  </span>
                  <div>
                    <strong className="text-[13px]">{s}</strong>
                    <div className="text-[12px] text-muted-foreground mt-0.5">与 JD 高度契合，可作为简历亮点前置。</div>
                  </div>
                </li>
              ))}
              {matchResult.suggestions.length > 0 && (
                <li className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  <div className="text-[13px] font-semibold mb-1.5">改进建议</div>
                  <ul className="space-y-1 text-[13px] text-muted-foreground">
                    {matchResult.suggestions.map((s, i) => <li key={i}>· {s}</li>)}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* JD 定向优化 */}
      {matchResult && (
        <div className="card p-6 rounded-2xl border bg-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <div className="section-title m-0 mb-1">JD 定向优化结果</div>
              {optimizeResult ? (
                <div className="text-[12px] text-muted-foreground">
                  预计匹配度{' '}
                  <span className="font-semibold">{matchResult.match_percentage}%</span>
                  {' → '}
                  <span className="font-semibold" style={{ color: 'var(--success)' }}>
                    {optimizeResult.new_match_percentage}%
                  </span>
                </div>
              ) : (
                <div className="text-[12px] text-muted-foreground">基于 JD 重写简历，补足关键技能与经验描述。</div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {optimizeResult && (
                <ResumeDownloadButtons
                  text={optimizeResult.optimized_text}
                  baseFilename="optimized-resume-jd"
                  title="JD 优化后简历"
                />
              )}
              <Button onClick={handleOptimize} disabled={optimizing} size="sm" variant="outline">
                {optimizing ? '优化中...' : optimizeResult ? '重新优化' : '针对 JD 优化简历'}
              </Button>
            </div>
          </div>

          {optimizeError && (
            <div className="flex items-center gap-3 text-sm text-destructive mb-3">
              <span>{optimizeError}</span>
              <Button onClick={handleOptimize} variant="outline" size="sm" disabled={optimizing}>重试</Button>
            </div>
          )}

          {optimizeResult ? (
            <>
              {optimizeResult.changes.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  <h4 className="text-[13px] font-semibold">修改说明：</h4>
                  {optimizeResult.changes.map((c, i) => (
                    <p key={i} className="text-[13px] text-muted-foreground flex gap-2">
                      <span style={{ color: 'var(--primary)', marginTop: 1 }}>·</span>
                      <span>{c}</span>
                    </p>
                  ))}
                </div>
              )}
              <div className="resume-preview">{optimizeResult.optimized_text}</div>
            </>
          ) : (
            <div
              className="p-6 rounded-lg text-center text-[13px] text-muted-foreground"
              style={{ background: 'var(--secondary)' }}
            >
              点击"针对 JD 优化简历"，AI 会按 JD 优先级重写亮点、补足缺失技能描述。
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => navigate('/interview')} size="lg" disabled={!matchResult}>
          继续：模拟面试 →
        </Button>
      </div>
    </div>
  );
}
