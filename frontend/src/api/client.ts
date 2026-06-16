import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export interface ResumeUploadResponse {
  session_id: string;
  filename: string;
  text: string;
  char_count: number;
}

export interface ScoreDimension {
  name: string;
  score: number;
  feedback: string;
}

export interface ScoreResult {
  overall: number;
  dimensions: ScoreDimension[];
  strengths: string[];
  weaknesses: string[];
}

export interface OptimizeResult {
  optimized_text: string;
  changes: string[];
}

export interface MatchResult {
  match_percentage: number;
  matched_skills: string[];
  missing_skills: string[];
  experience_gaps: string[];
  suggestions: string[];
}

export interface JDOptimizeResult {
  optimized_text: string;
  changes: string[];
  new_match_percentage: number;
}

export interface InterviewQuestion {
  category: string;
  question: string;
  difficulty: string;
  answer_strategy: string;
}

export interface CoverLetterResult {
  cover_letter: string;
}

export async function uploadResume(file: File): Promise<ResumeUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/resume/upload', form);
  return data;
}

export async function parseText(text: string): Promise<ResumeUploadResponse> {
  const { data } = await api.post('/resume/parse-text', { text });
  return data;
}

export async function scoreResume(session_id: string): Promise<ScoreResult> {
  const { data } = await api.post('/resume/score', { session_id });
  return data;
}

export async function optimizeResume(session_id: string): Promise<OptimizeResult> {
  const { data } = await api.post('/resume/optimize', { session_id });
  return data;
}

export async function matchJD(session_id: string, jd_text: string): Promise<MatchResult> {
  const { data } = await api.post('/jd/match', { session_id, jd_text });
  return data;
}

export async function optimizeForJD(session_id: string, jd_text: string): Promise<JDOptimizeResult> {
  const { data } = await api.post('/jd/optimize', { session_id, jd_text });
  return data;
}

export async function generateInterview(session_id: string, jd_text: string): Promise<{ questions: InterviewQuestion[] }> {
  const { data } = await api.post('/interview/generate', { session_id, jd_text });
  return data;
}

export async function generateCoverLetter(
  session_id: string, jd_text: string, company_name?: string, position_name?: string
): Promise<CoverLetterResult> {
  const { data } = await api.post('/cover-letter/generate', { session_id, jd_text, company_name, position_name });
  return data;
}

// ---- Interview Agent Types ----

export interface InterviewerAgent {
  id: string;
  name: string;
  title: string;
  style: string;
  focus_areas: string[];
  system_prompt: string;
  avatar: string;
}

export interface InterviewMessage {
  role: string;
  agent_id?: string;
  agent_name?: string;
  content: string;
  coaching_tip?: string;
}

export interface InterviewSetupResponse {
  interviewers: InterviewerAgent[];
}

export interface InterviewStartResponse {
  interview_id: string;
  first_message: InterviewMessage;
}

export interface InterviewMessageResponse {
  reply: InterviewMessage;
  coaching_tip?: string;
  is_complete: boolean;
  next_speaker_id?: string;
}

export interface EvalDimension {
  name: string;
  score: number;
  feedback: string;
}

export interface RoundReview {
  question_index: number;
  question: string;
  answer_summary: string;
  rating: string;
  feedback: string;
}

export interface EvaluationReport {
  overall_score: number;
  dimensions: EvalDimension[];
  strengths: string[];
  improvements: string[];
  round_reviews: RoundReview[];
  summary: string;
}

export interface InterviewEndResponse {
  interview_id: string;
  report: EvaluationReport;
}

// ---- Interview Agent API Calls ----

export async function setupInterview(
  session_id: string, jd_text: string, mode: string, difficulty: string
): Promise<InterviewSetupResponse> {
  const { data } = await api.post('/interview/setup', { session_id, jd_text, mode, difficulty });
  return data;
}

export async function startInterview(
  session_id: string, interviewers: InterviewerAgent[], mode: string, difficulty: string
): Promise<InterviewStartResponse> {
  const { data } = await api.post('/interview/start', { session_id, interviewers, mode, difficulty });
  return data;
}

export async function sendInterviewMessage(
  interview_id: string,
  content: string,
  onStatus: (msg: string) => void,
  onChunk: (content: string, agentId?: string) => void,
  onReply: (data: InterviewMessageResponse) => void,
  onCoachingTip: (tip: string) => void,
  onError: (err: string) => void,
): Promise<void> {
  const response = await fetch('/api/interview/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interview_id, content }),
  });

  if (!response.ok) {
    try {
      const err = await response.json();
      onError(err.detail || '请求失败');
    } catch {
      onError('请求失败');
    }
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const raw = line.slice(6);
        if (raw === '[DONE]') continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.type === 'status') {
            onStatus(parsed.message);
          } else if (parsed.type === 'chunk') {
            onChunk(parsed.content, parsed.agent_id);
          } else if (parsed.type === 'reply') {
            onReply(parsed);
          } else if (parsed.type === 'coaching_tip') {
            onCoachingTip(parsed.content);
          } else if (parsed.type === 'error') {
            onError(parsed.message);
          }
        } catch { /* skip unparseable lines */ }
      }
    }
  }
}

export async function endInterview(
  interview_id: string
): Promise<InterviewEndResponse> {
  const { data } = await api.post('/interview/end', { interview_id });
  return data;
}

// ── interview history ─────────────────────────────────────────────

export interface InterviewHistoryItem {
  id: string;
  mode: string;
  difficulty: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  overall_score: number | null;
  has_report: boolean;
  message_count: number;
  runtime_missing: boolean;
  can_continue: boolean;
  can_end: boolean;
  action: 'continue' | 'generate_report' | 'view_report' | 'unavailable';
}

export interface InterviewHistoryResponse {
  interviews: InterviewHistoryItem[];
}

export interface InterviewDetailResponse {
  interview_id: string;
  messages: InterviewMessage[];
  report: EvaluationReport | null;
  status: string;
  mode: string;
  difficulty: string;
  interviewers: InterviewerAgent[];
  has_report: boolean;
  message_count: number;
  runtime_missing: boolean;
  can_continue: boolean;
  can_end: boolean;
  action: 'continue' | 'generate_report' | 'view_report' | 'unavailable';
}

export async function getInterviewHistory(sessionId: string): Promise<InterviewHistoryResponse> {
  const { data } = await api.get('/interview/history', { params: { session_id: sessionId } });
  return data;
}

export async function getInterviewDetail(interviewId: string): Promise<InterviewDetailResponse> {
  const { data } = await api.get(`/interview/${interviewId}`);
  return data;
}

// ── session restore ────────────────────────────────────────────────

export interface SessionRestoreData {
  session_id: string;
  resume_text: string;
  resume_filename: string;
  jd_text: string;
  scores: ScoreResult | null;
  optimized_resume: string;
  jd_match_result: MatchResult | null;
  jd_optimized_text: string;
  cover_letter: string;
}

export async function getSessionData(sessionId: string): Promise<SessionRestoreData> {
  const { data } = await api.get(`/resume/session/${sessionId}`);
  return data;
}
