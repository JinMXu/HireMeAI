import { create } from 'zustand';
import type { ScoreResult, MatchResult } from '../api/client';

const SESSION_KEY = 'hireme_session_id';

function loadSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

function saveSessionId(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {}
}

interface AppState {
  sessionId: string | null;
  resumeText: string | null;
  resumeFileName: string | null;
  jdText: string | null;
  scores: ScoreResult | null;
  optimizedResume: string | null;
  matchResult: MatchResult | null;
  coverLetter: string | null;
  currentStep: number;

  setSession: (id: string, text: string, filename: string) => void;
  restoreSession: (data: {
    session_id: string;
    resume_text: string;
    resume_filename: string;
    jd_text: string;
    scores: ScoreResult | null;
    optimized_resume: string;
    matchResult: MatchResult | null;
  }) => void;
  setScores: (scores: ScoreResult) => void;
  setOptimizedResume: (text: string) => void;
  setJdText: (text: string) => void;
  setMatchResult: (result: MatchResult) => void;
  setCoverLetter: (letter: string) => void;
  setStep: (step: number) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  sessionId: loadSessionId(),
  resumeText: null,
  resumeFileName: null,
  jdText: null,
  scores: null,
  optimizedResume: null,
  matchResult: null,
  coverLetter: null,
  currentStep: 0,

  setSession: (id, text, filename) => {
    saveSessionId(id);
    set({ sessionId: id, resumeText: text, resumeFileName: filename });
  },
  restoreSession: (data) => {
    saveSessionId(data.session_id);
    set({
      sessionId: data.session_id,
      resumeText: data.resume_text,
      resumeFileName: data.resume_filename,
      jdText: data.jd_text || null,
      scores: data.scores,
      optimizedResume: data.optimized_resume || null,
      matchResult: data.matchResult,
    });
  },
  setScores: (scores) => set({ scores }),
  setOptimizedResume: (text) => set({ optimizedResume: text }),
  setJdText: (text) => set({ jdText: text }),
  setMatchResult: (result) => set({ matchResult: result }),
  setCoverLetter: (letter) => set({ coverLetter: letter }),
  setStep: (step) => set({ currentStep: step }),
  reset: () => {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    set({
      sessionId: null, resumeText: null, resumeFileName: null,
      jdText: null, scores: null, optimizedResume: null,
      matchResult: null, coverLetter: null, currentStep: 0,
    });
  },
}));
