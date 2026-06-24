import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { getSessionData } from '@/api/client';
import Header from '@/components/layout/Header';
import HomePage from '@/pages/HomePage';

const ResumePage = lazy(() => import('@/pages/ResumePage'));
const JDMatchPage = lazy(() => import('@/pages/JDMatchPage'));
const InterviewPage = lazy(() => import('@/pages/InterviewPage'));
const InterviewChatPage = lazy(() => import('@/pages/InterviewChatPage'));
const InterviewReportPage = lazy(() => import('@/pages/InterviewReportPage'));
const CoverLetterPage = lazy(() => import('@/pages/CoverLetterPage'));

function SessionRestore() {
  const { sessionId, resumeText, restoreSession } = useAppStore();

  useEffect(() => {
    if (!sessionId || resumeText) return;
    getSessionData(sessionId)
      .then((data) => restoreSession({
        session_id: data.session_id,
        resume_text: data.resume_text,
        resume_filename: data.resume_filename,
        jd_text: data.jd_text,
        scores: data.scores,
        optimized_resume: data.optimized_resume,
        resume_optimize_result: data.resume_optimize_result,
        matchResult: data.jd_match_result,
        jd_optimize_result: data.jd_optimize_result,
        cover_letter: data.cover_letter,
        recruit_greeting: data.recruit_greeting,
      }))
      .catch(() => {}); // session expired or never existed
  }, [sessionId, resumeText, restoreSession]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <SessionRestore />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-[1180px] mx-auto px-7 py-9 pb-20">
          <Suspense fallback={<div className="text-center py-12 text-muted-foreground">加载中...</div>}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/score" element={<ResumePage />} />
              <Route path="/jd-match" element={<JDMatchPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/interview/chat" element={<InterviewChatPage />} />
              <Route path="/interview/report" element={<InterviewReportPage />} />
              <Route path="/cover-letter" element={<CoverLetterPage />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
