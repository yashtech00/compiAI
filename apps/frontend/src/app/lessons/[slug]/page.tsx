'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ConceptVisualizer } from '@/components/visualizations/ConceptVisualizer';
import { AiTutorDrawer } from '@/components/tutor/AiTutorDrawer';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Bot,
  Trophy,
  HelpCircle,
  Eye
} from 'lucide-react';

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
    skill: { name: string };
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

export default function LessonPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [isTutorOpen, setIsTutorOpen] = useState(false);

  // Practical task reveal state
  const [showPracticalSolution, setShowPracticalSolution] = useState(false);

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
          apiClient('/auth/me').catch(() => null)
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
            if (activeSessionRes.session.currentStage > 0 && activeSessionRes.session.currentStage < 8) {
              setCurrentStageIndex(activeSessionRes.session.currentStage);
            }
          } else {
            // Start a new session
            const startRes = await apiClient('/sessions/start', {
              method: 'POST',
              body: JSON.stringify({
                lessonId: lData.id,
                sessionType: 'DAILY_LESSON'
              })
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
      if (sessionId) {
        // Persist session stage progress
        apiClient(`/sessions/${sessionId}/progress`, {
          method: 'PATCH',
          body: JSON.stringify({
            currentStage: nextIdx,
            durationSeconds: (nextIdx + 1) * 60
          })
        }).catch(() => null);
      }
    } else {
      handleFinishSession();
    }
  };

  const handlePrevStage = () => {
    if (currentStageIndex > 0) {
      setCurrentStageIndex(currentStageIndex - 1);
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
          response
        })),
        durationSeconds: 45,
        hintsUsed: hintsUsedCount
      };

      const res = await apiClient(`/quizzes/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res?.result) {
        setQuizResult(res.result);
        setEarnedXp(prev => prev + (res.result.xpAwarded || 50));
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
          userExplanation
        })
      });

      if (res?.result?.evaluation) {
        setExplainEvaluation(res.result.evaluation);
        setEarnedXp(prev => prev + 40);
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
          hintsUsed: hintsUsedCount
        })
      }).catch(() => null);
    }
    setIsCompleted(true);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-500 dark:text-slate-400">
          <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" />
          Preparing today&apos;s adaptive session...
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="text-center p-8 max-w-md">
          <p className="text-slate-500 dark:text-slate-400 mb-4">Lesson not found.</p>
          <Button onClick={() => router.push('/today')}>Back to Today</Button>
        </Card>
      </div>
    );
  }

  const explainAct = lesson.activities?.find(a => a.activityType === 'EXPLAIN_SIMPLY')?.content || {};
  const visualAct = lesson.activities?.find(a => a.activityType === 'VISUALIZATION')?.content || {};
  const exampleAct = lesson.activities?.find(a => a.activityType === 'SIMPLE_EXAMPLE')?.content || {};
  const realProjectAct = lesson.activities?.find(a => a.activityType === 'REAL_PROJECT')?.content || {};
  const practicalAct = lesson.activities?.find(a => a.activityType === 'PRACTICAL_APPLICATION')?.content || {};
  const summaryAct = lesson.activities?.find(a => a.activityType === 'SUMMARY')?.content || {};

  // Infer visualType from slug or activity
  let visualType = visualAct?.visualType || 'event-loop';
  if (slug.includes('event-loop')) visualType = 'event-loop';
  else if (slug.includes('load-balanc')) visualType = 'load-balancer';
  else if (slug.includes('index')) visualType = 'b-tree-indexing';
  else if (slug.includes('idempotenc') || slug.includes('redis')) visualType = 'cache-aside';
  else if (slug.includes('rag')) visualType = 'rag-pipeline';
  else if (slug.includes('closure')) visualType = 'closure-scope';

  // SESSION COMPLETED STATE
  if (isCompleted) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-2xl mx-auto w-full">
        <Card className="w-full p-8 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500 dark:text-emerald-400 mb-4">
            <Trophy className="w-8 h-8" />
          </div>

          <Badge variant="success" className="mb-2">Daily Session Completed</Badge>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Outstanding Progress!</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-md mx-auto">
            You completed today&apos;s focused session on <span className="text-indigo-600 dark:text-indigo-300 font-semibold">{lesson.concept.name}</span>.
          </p>

          <div className="my-8 p-6 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-around">
            <div>
              <div className="text-3xl font-bold text-amber-500 dark:text-amber-400">+{earnedXp} XP</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Evidence Earned</div>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">Spaced Recall</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Scheduled in 3 days</div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-left mb-6">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 block mb-1">
              What happens next?
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Your concept mastery has been recorded. Tomorrow, your adaptive engine will determine whether to reinforce this concept, practice retrieval, or advance forward. Future roadmap remains hidden to keep daily focus singular.
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => router.push('/today')}
            className="w-full gap-2 text-base font-semibold shadow-lg shadow-indigo-600/20"
          >
            Return to Today
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-10 w-full flex-1 flex flex-col">
      {/* Top Header & Pacing Bar */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              {lesson.concept.skill.name} • {lesson.concept.name}
            </span>
            <span className="text-xs text-slate-400">• {dailyMinutes}m session</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{lesson.title}</h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsTutorOpen(true);
            setHintsUsedCount(c => c + 1);
          }}
          className="gap-2 shrink-0 border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
        >
          <Bot className="w-4 h-4 text-indigo-500" />
          Ask AI Tutor
        </Button>
      </div>

      {/* Session Stage Progress Bar */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
          <span>Stage {currentStageIndex + 1} of {totalStagesCount}</span>
          <span>{progressPercent}% completed</span>
        </div>
        <ProgressBar value={progressPercent} color="indigo" size="sm" />
      </div>

      {/* STAGE 0: CONCEPT OVERVIEW (Stage 1) */}
      {currentStageNumber === 0 && (
        <Card className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <Badge variant="purple" className="mb-3">Stage 1: Today&apos;s Concept</Badge>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{lesson.title}</h2>
            <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block mb-1">
                Learning Objective
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{lesson.objective}</p>
            </div>

            <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {lesson.content.slice(0, 500)}...
            </div>
          </div>
        </Card>
      )}

      {/* STAGE 1: EXPLAIN SIMPLY (Stage 2) */}
      {currentStageNumber === 1 && (
        <Card className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <Badge variant="info" className="mb-3">Stage 2: Intuitive Mental Model</Badge>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Explain Simply</h2>

            {explainAct?.analogy ? (
              <div className="p-5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 block mb-1">
                  Relatable Analogy
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{explainAct.analogy}</p>
              </div>
            ) : null}

            {explainAct?.misconceptions ? (
              <div className="p-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 block mb-1">
                  Common Misconceptions
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{explainAct.misconceptions}</p>
              </div>
            ) : null}
          </div>
        </Card>
      )}

      {/* STAGE 2: VISUALIZE THE CONCEPT (Stage 3) */}
      {currentStageNumber === 2 && (
        <div className="flex-1 flex flex-col">
          <Badge variant="purple" className="mb-3 self-start">Stage 3: Interactive Architecture</Badge>
          <ConceptVisualizer
            visualType={visualType}
            conceptTitle={lesson.concept.name}
            diagram={visualAct?.diagram}
            explanation={visualAct?.explanation}
          />
        </div>
      )}

      {/* STAGE 3: SIMPLE EXAMPLE (Stage 4) */}
      {currentStageNumber === 3 && (
        <Card className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <Badge variant="default" className="mb-3">Stage 4: Code Mechanics</Badge>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Technical Walkthrough</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Inspect how this concept works line by line in actual code.
            </p>

            <pre className="p-5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-sky-300 font-mono overflow-x-auto leading-relaxed">
              {exampleAct?.code || lesson.content.match(/```(?:javascript|sql|json)?\n([\s\S]*?)```/)?.[1] || '// Technical snippet'}
            </pre>
          </div>
        </Card>
      )}

      {/* STAGE 4: REAL-PROJECT EXAMPLE (Stage 5) */}
      {currentStageNumber === 4 && (
        <Card className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <Badge variant="purple" className="mb-3">Stage 5: Production Context</Badge>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Real-World Application & Tradeoffs</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              How engineers encounter this in high-scale systems.
            </p>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {realProjectAct?.scenario || 'Production architecture implementation details.'}
            </div>
          </div>
        </Card>
      )}

      {/* STAGE 5: PRACTICAL APPLICATION (Stage 6) */}
      {currentStageNumber === 5 && (
        <Card className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <Badge variant="warning" className="mb-3">Stage 6: Practical Challenge</Badge>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Apply Your Knowledge</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Solve this practical architectural scenario to verify your understanding.
            </p>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 mb-6">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide block mb-1">
                Challenge Prompt
              </span>
              <p className="text-sm font-medium text-slate-900 dark:text-white leading-relaxed">
                {practicalAct?.prompt || 'Inspect the system design tradeoff.'}
              </p>
              {practicalAct?.hint && (
                <div className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Hint: {practicalAct.hint}</span>
                </div>
              )}
            </div>

            {showPracticalSolution ? (
              <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide block mb-1">
                  Verified Engineering Solution
                </span>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-mono">
                  {practicalAct?.solution || 'Solution details verified.'}
                </p>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPracticalSolution(true);
                  setHintsUsedCount(c => c + 1);
                }}
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Check Solution & Explanation
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* STAGE 6: MINI QUIZ (Stage 7) */}
      {currentStageNumber === 6 && (
        <Card className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <Badge variant="purple" className="mb-2">Stage 7: Mastery Verification</Badge>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
              {lesson.quizzes?.[0]?.title || 'Practice Quiz'}
            </h2>

            {lesson.quizzes?.[0]?.questions?.map((q, idx) => (
              <div key={q.id} className="mb-6 p-5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  {idx + 1}. {q.questionText}
                </p>

                <div className="space-y-2.5">
                  {q.options?.map((opt, optIdx) => {
                    const isSelected = quizResponses[q.id] === opt;
                    return (
                      <div
                        key={optIdx}
                        onClick={() => !quizResult && setQuizResponses(prev => ({ ...prev, [q.id]: opt }))}
                        className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-white font-medium'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{opt}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                          isSelected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-300 dark:border-slate-700'
                        }`}>
                          {isSelected && '✓'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {quizResult ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Evaluation Result</span>
                  <Badge variant={quizResult.isPassed ? 'success' : 'warning'}>
                    {quizResult.score}% Score
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                  {quizResult.isPassed
                    ? 'Great job! Concept mastery has been updated in your profile.'
                    : 'Review the explanations below to strengthen your understanding.'}
                </p>
                {quizResult.evaluatedResponses?.map((er: any, i: number) => (
                  <div key={i} className="text-xs border-t border-slate-200 dark:border-slate-800 pt-2 mt-2">
                    <span className={er.isCorrect ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-amber-600 dark:text-amber-400 font-semibold'}>
                      Q{i + 1}: {er.isCorrect ? 'Correct' : 'Needs Review'}
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">{er.explanation}</p>
                  </div>
                ))}
              </div>
            ) : (
              <Button
                onClick={handleQuizSubmit}
                isLoading={isSubmittingQuiz}
                disabled={Object.keys(quizResponses).length === 0}
                className="w-full"
              >
                Submit Quiz
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* STAGE 7: EXPLAIN-BACK ASSESSMENT (Stage 8) */}
      {currentStageNumber === 7 && (
        <Card className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <Badge variant="purple" className="mb-2">Stage 8: Active Synthesis</Badge>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Explain-Back Assessment</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              In your own words, explain how <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{lesson.concept.name}</span> works and what engineering tradeoffs it presents.
            </p>

            <textarea
              rows={5}
              value={userExplanation}
              onChange={(e) => setUserExplanation(e.target.value)}
              placeholder="For example: When JavaScript executes asynchronous code, the call stack hands off tasks to..."
              className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 mb-4"
            />

            {explainEvaluation ? (
              <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">Rubric Evaluation</span>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Overall: {explainEvaluation.overallScore}%
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Accuracy</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{explainEvaluation.accuracyScore}%</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Completeness</span>
                    <span className="font-bold text-sky-600 dark:text-sky-400">{explainEvaluation.completenessScore}%</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Clarity</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{explainEvaluation.clarityScore}%</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {explainEvaluation.feedback}
                </p>
              </div>
            ) : (
              <Button
                onClick={handleExplainBackSubmit}
                isLoading={isEvaluatingExplain}
                disabled={userExplanation.trim().length < 10}
                className="w-full"
              >
                Evaluate Synthesis
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* STAGE 8: CORE SYNTHESIS / SUMMARY (Stage 9) */}
      {currentStageNumber === 8 && (
        <Card className="p-8 flex-1 flex flex-col justify-between">
          <div>
            <Badge variant="success" className="mb-3">Stage 9: Session Summary</Badge>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Key Takeaways</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Review today&apos;s synthesis before completing the session.
            </p>

            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
              {summaryAct?.summary || lesson.objective}
            </div>

            {summaryAct?.remediation && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-300">
                <span className="font-bold block mb-1">Retention Tip:</span>
                {summaryAct.remediation}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Stage Navigation Controls */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-200 dark:border-slate-800">
        <Button
          variant="outline"
          size="md"
          disabled={currentStageIndex === 0}
          onClick={handlePrevStage}
          className="gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous Stage
        </Button>

        {currentStageIndex < enabledStages.length - 1 ? (
          <Button
            size="md"
            onClick={handleNextStage}
            className="gap-1.5"
          >
            Next Stage
            <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="md"
            onClick={handleFinishSession}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-600/20"
          >
            Complete Session
            <CheckCircle2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* AI Tutor Drawer */}
      <AiTutorDrawer
        isOpen={isTutorOpen}
        onClose={() => setIsTutorOpen(false)}
        lessonId={lesson.id}
        conceptName={lesson.concept.name}
      />
    </div>
  );
}
