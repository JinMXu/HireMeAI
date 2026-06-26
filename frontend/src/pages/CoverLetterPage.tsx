import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { generateCoverLetter, generateRecruitGreeting } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string } } }).response;
    return response?.data?.detail || fallback;
  }
  return fallback;
}

type Tab = 'letter' | 'greeting';

const TAB_LABEL: Record<Tab, string> = {
  letter: '求职信',
  greeting: '招聘打招呼',
};

export default function CoverLetterPage() {
  const {
    sessionId, jdText, coverLetter, setCoverLetter,
    recruitGreeting, setRecruitGreeting,
    resumeFileName, matchResult,
  } = useAppStore();
  const [companyName, setCompanyName] = useState('');
  const [positionName, setPositionName] = useState('');
  const [tab, setTab] = useState<Tab>('letter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) {
      navigate('/');
    } else if (!jdText) {
      navigate('/jd-match');
    }
  }, [sessionId, jdText, navigate]);

  if (!sessionId || !jdText) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'letter') {
        const res = await generateCoverLetter(sessionId, jdText, companyName || undefined, positionName || undefined);
        setCoverLetter(res.cover_letter);
      } else {
        const res = await generateRecruitGreeting(sessionId, jdText, companyName || undefined, positionName || undefined);
        setRecruitGreeting(res.greeting);
      }
    } catch (e) {
      setError(getErrorMessage(e, '生成失败，请重试'));
    } finally {
      setLoading(false);
    }
  };

  const currentText = tab === 'letter' ? coverLetter : recruitGreeting;

  const handleCopy = async () => {
    if (!currentText) return;
    try {
      await navigator.clipboard.writeText(currentText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setError('复制失败，请手动选择文本');
    }
  };

  const handleDownload = () => {
    if (!currentText) return;
    const ext = tab === 'letter' ? 'md' : 'txt';
    const blob = new Blob([currentText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${TAB_LABEL[tab]}-${companyName || 'HireMe'}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateLabel = (() => {
    if (loading) return '生成中...';
    if (currentText) return `重新生成${TAB_LABEL[tab]}`;
    return `生成${TAB_LABEL[tab]}`;
  })();

  return (
    <div className="max-w-[960px] mx-auto">
      <div className="mb-6">
        <div className="eyebrow">STEP 07 · 求职信</div>
        <h1 className="page-title">生成个性化求职信与打招呼</h1>
        <p className="page-sub">
          基于已上传的简历与目标 JD，生成贴合岗位的中文求职信，或用于招聘平台首次联系的短打招呼。可填入公司名与职位名让措辞更精准。
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-[1fr_1.4fr] items-start">
        {/* 左：参数 */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border bg-card p-6">
            <div className="section-title">参数</div>
            <div className="mb-4">
              <label className="block font-semibold text-[13px] mb-1.5">目标公司</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例如：字节跳动"
              />
            </div>
            <div className="mb-4">
              <label className="block font-semibold text-[13px] mb-1.5">目标职位</label>
              <Input
                value={positionName}
                onChange={(e) => setPositionName(e.target.value)}
                placeholder="例如：高级前端工程师"
              />
            </div>
            <Button onClick={handleGenerate} disabled={loading} className="w-full">
              {generateLabel}
            </Button>
          </div>

          <div className="rounded-2xl border bg-card p-[18px]">
            <div className="section-title" style={{ marginBottom: 8 }}>输入来源</div>
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'var(--primary-soft)', color: 'var(--primary-strong)' }}
              >
                简历 · {resumeFileName || '已粘贴文本'}
              </span>
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{ background: 'var(--primary-soft)', color: 'var(--primary-strong)' }}
              >
                JD · {jdText.length > 12 ? `${jdText.slice(0, 12)}…` : jdText}
              </span>
              {matchResult && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ background: 'var(--secondary)', color: 'var(--muted-foreground)' }}
                >
                  匹配度 {matchResult.match_percentage}%
                </span>
              )}
            </div>
          </div>

          {tab === 'greeting' && (
            <div className="coach-tip">
              <div className="coach-tip-label">使用提示</div>
              <div>
                打招呼文案适合在 Boss直聘、脉脉、LinkedIn 等平台首次联系招聘方时发送。建议先看一眼 JD 再微调开头，让"为何关注该岗位"更具体。
              </div>
            </div>
          )}
        </div>

        {/* 右：预览 */}
        <div className="rounded-2xl border bg-card p-6">
          {/* tab 切换 */}
          <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
            <div
              className="inline-flex p-1 rounded-full"
              style={{ background: 'var(--secondary)' }}
            >
              {(['letter', 'greeting'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setError(''); setCopied(false); }}
                  className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
                  style={
                    tab === t
                      ? { background: 'var(--card)', color: 'var(--primary)' }
                      : { background: 'transparent', color: 'var(--muted-foreground)' }
                  }
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} disabled={!currentText}>
                {copied ? '已复制 ✓' : '复制'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={!currentText}>
                下载
              </Button>
            </div>
          </div>

          {currentText ? (
            <>
              {tab === 'letter' ? (
                <div
                  className="resume-preview"
                  style={{ lineHeight: 1.85, fontSize: 14, whiteSpace: 'pre-wrap' }}
                >
                  {currentText}
                </div>
              ) : (
                <div
                  className="rounded-xl p-5 fade-up"
                  style={{ background: 'var(--secondary)', lineHeight: 1.75 }}
                >
                  <div
                    className="font-semibold mb-2"
                    style={{ fontSize: 13, color: 'var(--muted-foreground)' }}
                  >
                    招聘平台打招呼
                  </div>
                  <div style={{ fontSize: 15 }}>{currentText}</div>
                </div>
              )}
              <div className="text-muted-foreground mt-4" style={{ fontSize: 12 }}>
                已生成 {currentText.length} 字 · 基于 Resume + JD · 可在左侧调整参数后重新生成
              </div>
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl"
              style={{ background: 'var(--secondary)' }}
            >
              <div
                className="grid place-items-center mb-4"
                style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: 'var(--primary-soft)', color: 'var(--primary)',
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="font-semibold text-[15px] mb-1">还没有{TAB_LABEL[tab]}</div>
              <div className="text-muted-foreground text-[13px] max-w-xs">
                填好左侧参数后点击"生成{TAB_LABEL[tab]}",系统会基于简历与 JD 生成{tab === 'letter' ? '贴合岗位的中文求职信' : '适合招聘平台首次联系的短打招呼'}。
              </div>
            </div>
          )}

          {error && (
            <div
              className="mt-4 p-3 rounded-lg text-sm text-center"
              style={{ background: 'oklch(95% 0.04 28)', color: 'var(--destructive)' }}
            >
              {error}
              <div className="mt-2">
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
                  重试生成
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
