import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useAppStore } from '@/store/appStore';
import { scoreResume, optimizeResume } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function ResumePage() {
  const { sessionId, scores, optimizedResume, setScores, setOptimizedResume } = useAppStore();
  const [loading, setLoading] = useState(() => Boolean(sessionId && !scores));
  const [optimizing, setOptimizing] = useState(false);
  const [changes, setChanges] = useState<string[]>([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId) { navigate('/'); return; }
    if (scores) return;

    let cancelled = false;
    Promise.resolve()
      .then(() => {
        if (!cancelled) setLoading(true);
        return scoreResume(sessionId);
      })
      .then((result) => {
        if (!cancelled) setScores(result);
      })
      .catch(() => {
        if (!cancelled) setError('简历评分失败，请重试');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId, scores, navigate, setScores]);

  const handleOptimize = async () => {
    if (!sessionId) return;
    setOptimizing(true);
    try {
      const res = await optimizeResume(sessionId);
      setOptimizedResume(res.optimized_text);
      setChanges(res.changes);
    } finally {
      setOptimizing(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">正在评分中...</div>;
  if (error) return <div className="text-center py-12 text-destructive">{error}</div>;
  if (!scores) return null;

  const chartData = scores.dimensions.map((d) => ({ name: d.name, score: d.score }));

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>简历评分</CardTitle>
            <div className="text-3xl font-bold text-primary">{scores.overall}<span className="text-lg text-muted-foreground">/100</span></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-1/2 h-64">
              <ResponsiveContainer>
                <RadarChart data={chartData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar dataKey="score" stroke="oklch(0.488 0.243 264.376)" fill="oklch(0.488 0.243 264.376)" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3">
              {scores.dimensions.map((d) => (
                <div key={d.name} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-24 shrink-0">{d.name}</span>
                  <Progress value={d.score} className="flex-1" />
                  <span className="text-sm font-medium w-8">{d.score}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200 text-base">优势</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-green-700 dark:text-green-300">
              {scores.strengths.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-800 dark:text-orange-200 text-base">待改进</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm text-orange-700 dark:text-orange-300">
              {scores.weaknesses.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>AI 优化</CardTitle>
            <Button
              onClick={handleOptimize}
              disabled={optimizing}
              size="sm"
            >
              {optimizing ? '优化中...' : optimizedResume ? '重新优化' : '一键优化'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {changes.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">修改说明：</h4>
              {changes.map((c, i) => <p key={i} className="text-sm text-muted-foreground">• {c}</p>)}
            </div>
          )}
          {optimizedResume && (
            <pre className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
              {optimizedResume}
            </pre>
          )}
        </CardContent>
      </Card>

      <div className="text-center">
        <Button onClick={() => navigate('/jd-match')} size="lg">
          下一步：JD 匹配分析
        </Button>
      </div>
    </div>
  );
}
