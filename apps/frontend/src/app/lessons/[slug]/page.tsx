'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { LessonHeader } from '@/components/lessons/LessonHeader';
import { LessonStageNav } from '@/components/lessons/LessonStageNav';
import { StageRenderer } from '@/components/lessons/StageRenderer';
import { SessionCompletedView } from '@/components/lessons/SessionCompletedView';
import { AiTutorDrawer } from '@/components/tutor/AiTutorDrawer';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface LessonData {
  id: string;
  title: string;
  slug: string;
  objective: string;
  content: string;
  difficulty: string;
  estimatedMinutes: number;
  concept: {
    id: string;
    name: string;
    skill?: { name: string } | null;
  };
  activities: Array<{
    id: string;
    activityType: string;
    sequenceOrder: number;
    content: any;
    estimatedSeconds: number;
  }>;
  quizzes?: Array<{
    id: string;
    title: string;
    questions: Array<{
      id: string;
      questionType: string;
      questionText: string;
      options: string[];
      difficulty: number;
    }>;
  }>;
}

const STAGE_TITLES: Record<number, string> = {
  0: 'Concept & Foundations',
  1: 'Intuitive Mental Model',
  2: 'Interactive Architecture',
  3: 'Code Mechanics',
  4: 'Production Context & Trade-Offs',
  5: 'Practical Challenge',
  6: 'Mastery Verification',
  7: 'Active Synthesis',
  8: 'Session Summary & Key Takeaways',
};

export default function LessonPlayerPage({ params }: { params?: { slug?: string } }) {
  const routerParams = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || (routerParams?.slug as string);

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  // Quiz state
  const [quizResponses, setQuizResponses] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);

  // Explain-Back state
  const [userExplanation, setUserExplanation] = useState('');
  const [explainEvaluation, setExplainEvaluation] = useState<any | null>(null);
  const [isEvaluatingExplain, setIsEvaluatingExplain] = useState(false);

  // Session completion state
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedXp, setEarnedXp] = useState(30);
  const [hintsUsedCount, setHintsUsedCount] = useState(0);

  useEffect(() => {
    async function initLesson() {
      try {
        const [lessonRes, userProfileRes] = await Promise.all([
          apiClient(`/lessons/${slug}`),
          apiClient('/auth/me').catch(() => null),
        ]);

        if (userProfileRes?.user?.profile?.dailyMinutes) {
          setDailyMinutes(userProfileRes.user.profile.dailyMinutes);
        }

        if (lessonRes?.lesson) {
          const lData = lessonRes.lesson;
          setLesson(lData);

          // Check for existing active resumable session
          const activeSessionRes = await apiClient(`/sessions/active/${lData.id}`).catch(() => null);

          if (activeSessionRes?.session) {
            setSessionId(activeSessionRes.session.id);
            if (activeSessionRes.session.currentStage > 0 && activeSessionRes.session.currentStage < 9) {
              setCurrentStageIndex(activeSessionRes.session.currentStage);
            }
          } else {
            // Start a new session
            const startRes = await apiClient('/sessions/start', {
              method: 'POST',
              body: JSON.stringify({
                lessonId: lData.id,
                sessionType: 'DAILY_LESSON',
              }),
            }).catch(() => null);

            if (startRes?.session) {
              setSessionId(startRes.session.id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load lesson:', err);
      } finally {
        setIsLoading(false);
      }
    }
    if (slug) initLesson();
  }, [slug]);

  // Stage configuration based on daily time budget
  const getEnabledStages = () => {
    if (dailyMinutes <= 5) {
      return [0, 1, 2, 6, 8]; // Overview, Simple explain, Visual, Quiz, Summary
    } else if (dailyMinutes <= 10) {
      return [0, 1, 2, 3, 4, 6, 8]; // Overview, Simple explain, Visual, Simple example, Real project, Quiz, Summary
    } else if (dailyMinutes <= 15) {
      return [0, 1, 2, 3, 4, 5, 6, 8]; // + Practical application
    } else {
      return [0, 1, 2, 3, 4, 5, 6, 7, 8]; // Full 9 stages (+ Explain back)
    }
  };

  const enabledStages = getEnabledStages();
  const currentStageNumber = enabledStages[currentStageIndex] ?? 0;
  const totalStagesCount = enabledStages.length;
  const progressPercent = Math.round(((currentStageIndex + 1) / totalStagesCount) * 100);

  const handleNextStage = async () => {
    const nextIdx = currentStageIndex + 1;
    if (nextIdx < enabledStages.length) {
      setCurrentStageIndex(nextIdx);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (sessionId) {
        // Persist session stage progress
        apiClient(`/sessions/${sessionId}/progress`, {
          method: 'PATCH',
          body: JSON.stringify({
            currentStage: nextIdx,
            durationSeconds: (nextIdx + 1) * 60,
          }),
        }).catch(() => null);
      }
    } else {
      handleFinishSession();
    }
  };

  const handlePrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleQuizSubmit = async () => {
    if (!lesson?.quizzes?.[0]) return;
    const quizId = lesson.quizzes[0].id;
    setIsSubmittingQuiz(true);

    try {
      const payload = {
        responses: Object.entries(quizResponses).map(([questionId, response]) => ({
          questionId,
          response,
        })),
        durationSeconds: 45,
        hintsUsed: hintsUsedCount,
      };

      const res = await apiClient(`/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res?.result) {
        setQuizResult(res.result);
        setEarnedXp((prev) => prev + (res.result.xpAwarded || 50));
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    } finally {
      setIsSubmittingQuiz(false);
    }
  };

  const handleExplainBackSubmit = async () => {
    if (!lesson?.concept?.id || !userExplanation.trim()) return;
    setIsEvaluatingExplain(true);

    try {
      const res = await apiClient('/ai/explain-back', {
        method: 'POST',
        body: JSON.stringify({
          conceptId: lesson.concept.id,
          userExplanation,
        }),
      });

      if (res?.result?.evaluation) {
        setExplainEvaluation(res.result.evaluation);
        setEarnedXp((prev) => prev + 40);
      }
    } catch (err) {
      console.error('Failed to evaluate explanation:', err);
    } finally {
      setIsEvaluatingExplain(false);
    }
  };

  const handleFinishSession = async () => {
    if (sessionId) {
      await apiClient(`/sessions/${sessionId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({
          durationSeconds: dailyMinutes * 60,
          hintsUsed: hintsUsedCount,
        }),
      }).catch(() => null);
    }
    setIsCompleted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <DashboardShell title="Daily Lesson">
        <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
          <div className="text-center text-[#686860]">
            <div className="animate-spin w-9 h-9 border-3 border-[#111111] border-t-transparent rounded-full mx-auto mb-3.5" />
            <p className="text-sm font-bold text-[#111111]">Preparing today&apos;s adaptive session...</p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  if (!lesson) {
    return (
      <DashboardShell title="Daily Lesson">
        <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
          <Card className="text-center p-8 max-w-md bg-white border border-[#E7E7E7] shadow-sm">
            <h2 className="text-lg font-bold text-[#171717] mb-2">Lesson Not Found</h2>
            <p className="text-xs text-[#626262] mb-6">
              We couldn&apos;t retrieve the requested milestone. It may still be generating or archived.
            </p>
            <Button onClick={() => router.push('/today')}>Back to Today&apos;s Learning</Button>
          </Card>
        </div>
      </DashboardShell>
    );
  }

  // Session Completed State
  if (isCompleted) {
    return (
      <DashboardShell title="Lesson Completed" conceptName={lesson.concept.name}>
        <SessionCompletedView
          conceptName={lesson.concept.name}
          earnedXp={earnedXp}
          quizResult={quizResult}
          onReturnToToday={() => router.push('/today')}
        />
      </DashboardShell>
    );
  }

  const currentStageTitle = STAGE_TITLES[currentStageNumber] || 'Learning Milestone';

  return (
    <DashboardShell
      title={lesson.concept?.skill?.name || lesson.concept.name || 'Daily Lesson'}
      conceptName={lesson.concept.name}
    >
      <div className="flex-1 flex flex-col max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 py-4 w-full">
        {/* Consistent Lesson Header */}
        <LessonHeader
          skillName={lesson.concept?.skill?.name}
          conceptName={lesson.concept.name}
          lessonTitle={lesson.title}
          stageTitle={currentStageTitle}
          stageNumber={currentStageIndex + 1}
          totalStages={totalStagesCount}
          progressPercent={progressPercent}
          dailyMinutes={dailyMinutes}
          onOpenTutor={() => {
            setIsTutorOpen(true);
            setHintsUsedCount((c) => c + 1);
          }}
        />

        {/* Content Container (Cardless or Adaptive Card based on stage) */}
        <div className="flex-1 flex flex-col">
          <StageRenderer
            currentStageNumber={currentStageNumber}
            lesson={lesson}
            quizResponses={quizResponses}
            onSelectOption={(questionId, option) => {
              if (!quizResult) {
                setQuizResponses((prev) => ({ ...prev, [questionId]: option }));
              }
            }}
            onSubmitQuiz={handleQuizSubmit}
            isSubmittingQuiz={isSubmittingQuiz}
            quizResult={quizResult}
            userExplanation={userExplanation}
            onExplanationChange={setUserExplanation}
            onSubmitExplainBack={handleExplainBackSubmit}
            isEvaluatingExplain={isEvaluatingExplain}
            explainEvaluation={explainEvaluation}
            onUseHint={() => setHintsUsedCount((c) => c + 1)}
            onAskTutor={() => {
              setIsTutorOpen(true);
              setHintsUsedCount((c) => c + 1);
            }}
          />

          {/* Consistent Stage Bottom Navigation */}
          <LessonStageNav
            currentStageIndex={currentStageIndex}
            totalStages={totalStagesCount}
            onPrev={handlePrevStage}
            onNext={handleNextStage}
            onComplete={handleFinishSession}
            isLoading={isSubmittingQuiz || isEvaluatingExplain}
          />
        </div>

        {/* AI Socratic Tutor Drawer */}
        <AiTutorDrawer
          isOpen={isTutorOpen}
          onClose={() => setIsTutorOpen(false)}
          lessonId={lesson.id}
          conceptName={lesson.concept.name}
        />
      </div>
    </DashboardShell>
  );
}
