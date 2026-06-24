import { create } from 'zustand';
import type { ScoreResult, MatchResult, JDOptimizeResult, OptimizeResult } from '../api/client';

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
  } catch {
    // localStorage can be unavailable in private browsing or restricted embeds.
  }
}

interface AppState {
  sessionId: string | null;
  resumeText: string | null;
  resumeFileName: string | null;
  jdText: string | null;
  scores: ScoreResult | null;
  optimizedResume: string | null;
  optimizeChanges: string[] | null;
  matchResult: MatchResult | null;
  jdOptimizeResult: JDOptimizeResult | null;
  coverLetter: string | null;
  recruitGreeting: string | null;
  currentStep: number;

  setSession: (id: string, text: string, filename: string) => void;
  restoreSession: (data: {
    session_id: string;
    resume_text: string;
    resume_filename: string;
    jd_text: string;
    scores: ScoreResult | null;
    optimized_resume: string;
    resume_optimize_result: OptimizeResult | null;
    matchResult: MatchResult | null;
    jd_optimize_result: JDOptimizeResult | null;
    cover_letter: string;
    recruit_greeting: string;
  }) => void;
  setScores: (scores: ScoreResult) => void;
  setOptimizedResume: (text: string) => void;
  setOptimizeChanges: (changes: string[]) => void;
  setJdText: (text: string) => void;
  setMatchResult: (result: MatchResult) => void;
  setJdOptimizeResult: (result: JDOptimizeResult | null) => void;
  setCoverLetter: (letter: string) => void;
  setRecruitGreeting: (greeting: string) => void;
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
  optimizeChanges: null,
  matchResult: null,
  jdOptimizeResult: null,
  coverLetter: null,
  recruitGreeting: null,
  currentStep: 0,

  setSession: (id, text, filename) => {
    saveSessionId(id);
    set({
      sessionId: id,
      resumeText: text,
      resumeFileName: filename,
      jdText: null,
      scores: null,
      optimizedResume: null,
      optimizeChanges: null,
      matchResult: null,
      jdOptimizeResult: null,
      coverLetter: null,
      recruitGreeting: null,
      currentStep: 0,
    });
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
      optimizeChanges: data.resume_optimize_result?.changes ?? null,
      matchResult: data.matchResult,
      jdOptimizeResult: data.jd_optimize_result || null,
      coverLetter: data.cover_letter || null,
      recruitGreeting: data.recruit_greeting || null,
    });
  },
  setScores: (scores) => set({ scores }),
  setOptimizedResume: (text) => set({ optimizedResume: text }),
  setOptimizeChanges: (changes) => set({ optimizeChanges: changes }),
  setJdText: (text) => set({ jdText: text }),
  setMatchResult: (result) => set({ matchResult: result }),
  setJdOptimizeResult: (result) => set({ jdOptimizeResult: result }),
  setCoverLetter: (letter) => set({ coverLetter: letter }),
  setRecruitGreeting: (greeting) => set({ recruitGreeting: greeting }),
  setStep: (step) => set({ currentStep: step }),
  reset: () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Keep the in-memory reset even if browser storage is unavailable.
    }
    set({
      sessionId: null, resumeText: null, resumeFileName: null,
      jdText: null, scores: null, optimizedResume: null, optimizeChanges: null,
      matchResult: null, jdOptimizeResult: null, coverLetter: null, recruitGreeting: null, currentStep: 0,
    });
  },
}));
