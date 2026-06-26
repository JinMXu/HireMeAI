import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { InterviewerAgent } from '@/api/client';

export interface InterviewSetupProps {
  jdText: string;
  onStart: (mode: string, difficulty: string) => void;
  loading: boolean;
  interviewers?: InterviewerAgent[];
  onUpdateInterviewers?: (interviewers: InterviewerAgent[]) => void;
}

interface OptionItem {
  value: string;
  title: string;
  desc: string;
}

const MODES: OptionItem[] = [
  { value: '1v1', title: '1v1 单面', desc: '一位 AI 面试官贯穿全场，适合深度专项练习，对话连贯性最佳。' },
  { value: 'panel', title: '群面 · 多面官', desc: '多位面试官轮流提问，模拟真实评审会场景，覆盖技术、项目、行为多维。' },
];

const LEVELS: OptionItem[] = [
  { value: 'beginner', title: '初级', desc: '基础八股 + 项目讲述，节奏友好，适合首次彩排。' },
  { value: 'intermediate', title: '中级', desc: '含追问与场景题，需主动量化成果，接近真实社招。' },
  { value: 'advanced', title: '高级', desc: '压力面 + 系统设计 + 行为深挖，对标大厂终面。' },
];

function avatarColor(idx: number): React.CSSProperties {
  const palette = [
    { bg: 'var(--primary-tint)', color: 'var(--primary-strong)' },
    { bg: 'var(--accent-soft)', color: 'oklch(45% 0.1 68)' },
    { bg: 'oklch(92% 0.03 250)', color: 'var(--fg)' },
  ];
  return palette[idx % palette.length];
}

export default function InterviewSetup({ jdText, onStart, loading, interviewers }: InterviewSetupProps) {
  const [mode, setMode] = useState<'1v1' | 'panel'>('1v1');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');

  return (
    <div className="space-y-6">
      {/* 模式 */}
      <div>
        <div className="section-title">面试模式</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MODES.map((m) => (
            <div
              key={m.value}
              className={`option-card ${mode === m.value ? 'selected' : ''}`}
              onClick={() => setMode(m.value as '1v1' | 'panel')}
            >
              <div className="option-card-title">{m.title}</div>
              <div className="option-card-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 难度 */}
      <div>
        <div className="section-title">难度等级</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {LEVELS.map((l) => (
            <div
              key={l.value}
              className={`option-card ${difficulty === l.value ? 'selected' : ''}`}
              onClick={() => setDifficulty(l.value as 'beginner' | 'intermediate' | 'advanced')}
            >
              <div className="option-card-title">{l.title}</div>
              <div className="option-card-desc">{l.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 面试官阵容 */}
      {interviewers && interviewers.length > 0 && (
        <div>
          <div className="section-title">AI 面试官阵容 · 根据 JD 生成</div>
          <div className="card p-6 rounded-2xl border bg-card">
            {mode === 'panel' && (
              <div className="text-[13px] text-muted-foreground mb-4">
                群面模式下，多位面试官会在 SelectorGroupChat 中轮流发言，各司其职。
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {interviewers.map((iv, idx) => (
                <div key={iv.id} className="interviewer-card">
                  <div
                    className="interviewer-avatar"
                    style={avatarColor(idx)}
                  >
                    {iv.avatar || iv.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="interviewer-name">{iv.name}</div>
                    <div className="interviewer-role">{iv.title}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {interviewers.flatMap((iv) => iv.focus_areas).slice(0, 8).map((f, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>
              ))}
            </div>
            <div className="h-px my-4" style={{ background: 'var(--border)' }} />
            <div className="flex justify-between items-center">
              <div className="text-[12px] text-muted-foreground">
                最多 30 轮对话 · 上下文超 18 条自动摘要 · 检测到"【面试结束】"自动收尾
              </div>
              <Button size="lg" onClick={() => onStart(mode, difficulty)} disabled={loading || !jdText}>
                {loading ? '生成面试官中...' : '开始面试 →'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!interviewers && (
        <div className="text-center">
          <Button size="lg" onClick={() => onStart(mode, difficulty)} disabled={loading || !jdText}>
            {loading ? '生成面试官中...' : '开始面试 →'}
          </Button>
        </div>
      )}
    </div>
  );
}
