import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { matchJD, optimizeForJD } from '@/api/client';
import type { JDOptimizeResult } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ResumeDownloadButtons } from '@/components/shared/ResumeDownloadButtons';

export default function JDMatchPage() {
  const { sessionId, jdText, matchResult, setJdText, setMatchResult } = useAppStore();
  const [input, setInput] = useState(jdText || '');
  const [loading, setLoading] = useState(false);
  const [matchError, setMatchError] = useState('');
  const [optimizeResult, setOptimizeResult] = useState<JDOptimizeResult | null>(null);
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
      setOptimizeResult(res);
    } catch {
      setOptimizeError('针对 JD 优化失败，请重试');
    } finally {
      setOptimizing(false);
    }
  };

  const matchColor = matchResult
    ? matchResult.match_percentage >= 70 ? 'bg-green-500' : matchResult.match_percentage >= 40 ? 'bg-yellow-500' : 'bg-red-500'
    : '';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>职位描述 (JD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="粘贴目标职位的JD..."
            className="h-40 resize-none"
          />
          <Button
            onClick={handleMatch}
            disabled={loading || input.trim().length < 20}
          >
            {loading ? '分析中...' : '匹配分析'}
          </Button>
          {matchError && (
            <div className="flex items-center gap-3 text-sm text-destructive">
              <span>{matchError}</span>
              <Button onClick={handleMatch} variant="outline" size="sm" disabled={loading}>
                重试
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {matchResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>匹配结果</CardTitle>
              <div className="text-2xl font-bold text-primary">{matchResult.match_percentage}%</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={matchResult.match_percentage} className={`h-3 [&>div]:${matchColor}`} />
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">已匹配技能</h4>
                <div className="flex flex-wrap gap-2">
                  {matchResult.matched_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-200">{s}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">缺失技能</h4>
                <div className="flex flex-wrap gap-2">
                  {matchResult.missing_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border-red-200">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>
            {matchResult.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">改进建议</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {matchResult.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                </ul>
              </div>
            )}
            <Button
              onClick={handleOptimize}
              disabled={optimizing}
              size="sm"
            >
              {optimizing ? '优化中...' : '针对JD优化简历'}
            </Button>
            {optimizeError && (
              <div className="flex items-center gap-3 text-sm text-destructive">
                <span>{optimizeError}</span>
                <Button onClick={handleOptimize} variant="outline" size="sm" disabled={optimizing}>
                  重试
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {optimizeResult && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>优化后简历 (预估匹配度: {optimizeResult.new_match_percentage}%)</CardTitle>
              <ResumeDownloadButtons
                text={optimizeResult.optimized_text}
                baseFilename="optimized-resume-jd"
                title="JD 优化后简历"
              />
            </div>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">{optimizeResult.optimized_text}</pre>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button onClick={() => navigate('/interview')} size="lg">
          下一步：面试准备
        </Button>
      </div>
    </div>
  );
}
