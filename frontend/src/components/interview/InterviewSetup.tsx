import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { InterviewerAgent } from '@/api/client';

export interface InterviewSetupProps {
  jdText: string;
  onStart: (mode: string, difficulty: string) => void;
  loading: boolean;
  interviewers?: InterviewerAgent[];
  onUpdateInterviewers?: (interviewers: InterviewerAgent[]) => void;
}

export default function InterviewSetup({ jdText, onStart, loading, interviewers }: InterviewSetupProps) {
  const [mode, setMode] = useState<'1v1' | 'panel'>('1v1');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>面试设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">面试模式</label>
            <div className="flex gap-3">
              <Button variant={mode === '1v1' ? 'default' : 'outline'} onClick={() => setMode('1v1')}>
                1v1 单独面试
              </Button>
              <Button variant={mode === 'panel' ? 'default' : 'outline'} onClick={() => setMode('panel')}>
                多角色群面
              </Button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">面试难度</label>
            <div className="flex gap-3">
              {(['beginner', 'intermediate', 'advanced'] as const).map((d) => (
                <Button
                  key={d}
                  variant={difficulty === d ? 'default' : 'outline'}
                  onClick={() => setDifficulty(d)}
                  size="sm"
                >
                  {d === 'beginner' ? '初级友好' : d === 'intermediate' ? '中级标准' : '高级压力'}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {interviewers && interviewers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>面试官团队</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {interviewers.map((iv) => (
                <div key={iv.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="text-2xl">{iv.avatar || '👤'}</div>
                  <div className="flex-1">
                    <div className="font-medium">{iv.name} — {iv.title}</div>
                    <div className="text-sm text-muted-foreground">{iv.style}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {iv.focus_areas.map((f) => (
                        <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-center">
        <Button size="lg" onClick={() => onStart(mode, difficulty)} disabled={loading || !jdText}>
          {loading ? '生成面试官中...' : '开始面试'}
        </Button>
      </div>
    </div>
  );
}
