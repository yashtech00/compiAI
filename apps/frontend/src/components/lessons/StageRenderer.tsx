'use client';

import React from 'react';
import { ConceptRenderer } from './ConceptRenderer';
import { ExplanationRenderer } from './ExplanationRenderer';
import { ArchitectureRenderer } from './ArchitectureRenderer';
import { CodeWalkthroughRenderer } from './CodeWalkthroughRenderer';
import { RealWorldApplicationRenderer } from './RealWorldApplicationRenderer';
import { PracticalChallengeRenderer } from './PracticalChallengeRenderer';
import { QuizRenderer } from './QuizRenderer';
import { ExplainBackRenderer } from './ExplainBackRenderer';
import { SummaryRenderer } from './SummaryRenderer';
import { HelpCircle } from 'lucide-react';

interface StageRendererProps {
  currentStageNumber: number;
  lesson: {
    id: string;
    title: string;
    slug: string;
    objective: string;
    content: string;
    difficulty: string;
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
  };
  quizResponses: Record<string, string>;
  onSelectOption: (questionId: string, option: string) => void;
  onSubmitQuiz: () => void;
  isSubmittingQuiz: boolean;
  quizResult: any;
  userExplanation: string;
  onExplanationChange: (val: string) => void;
  onSubmitExplainBack: () => void;
  isEvaluatingExplain: boolean;
  explainEvaluation: any;
  onUseHint: () => void;
  onAskTutor: () => void;
}

export function StageRenderer({
  currentStageNumber,
  lesson,
  quizResponses,
  onSelectOption,
  onSubmitQuiz,
  isSubmittingQuiz,
  quizResult,
  userExplanation,
  onExplanationChange,
  onSubmitExplainBack,
  isEvaluatingExplain,
  explainEvaluation,
  onUseHint,
  onAskTutor,
}: StageRendererProps) {
  // Extract activity contents safely by activityType
  const conceptAct = lesson.activities?.find((a) => a.activityType === 'CONCEPT_OVERVIEW')?.content || {};
  const explainAct = lesson.activities?.find((a) => a.activityType === 'EXPLAIN_SIMPLY')?.content || {};
  const visualAct = lesson.activities?.find((a) => a.activityType === 'VISUALIZATION')?.content || {};
  const exampleAct = lesson.activities?.find((a) => a.activityType === 'SIMPLE_EXAMPLE')?.content || {};
  const realProjectAct = lesson.activities?.find((a) => a.activityType === 'REAL_PROJECT')?.content || {};
  const practicalAct = lesson.activities?.find((a) => a.activityType === 'PRACTICAL_APPLICATION')?.content || {};
  const summaryAct = lesson.activities?.find((a) => a.activityType === 'SUMMARY')?.content || {};

  // Infer visualType
  let visualType = visualAct?.visualType || 'event-loop';
  if (lesson.slug.includes('event-loop')) visualType = 'event-loop';
  else if (lesson.slug.includes('load-balanc')) visualType = 'load-balancer';
  else if (lesson.slug.includes('index')) visualType = 'b-tree-indexing';
  else if (lesson.slug.includes('idempotenc') || lesson.slug.includes('redis')) visualType = 'cache-aside';
  else if (lesson.slug.includes('rag')) visualType = 'rag-pipeline';
  else if (lesson.slug.includes('closure')) visualType = 'closure-scope';

  // Delegate rendering based on stage number
  switch (currentStageNumber) {
    case 0:
      // Stage 1: Concept & Foundations
      return (
        <ConceptRenderer
          title={lesson.title}
          objective={lesson.objective}
          content={lesson.content}
          activityContent={conceptAct}
        />
      );

    case 1:
      // Stage 2: Intuitive Mental Model
      return (
        <ExplanationRenderer
          analogy={explainAct?.analogy}
          misconceptions={explainAct?.misconceptions}
          intuition={explainAct?.intuition}
          remediation={explainAct?.remediation}
        />
      );

    case 2:
      // Stage 3: Interactive Architecture Visualization
      return (
        <ArchitectureRenderer
          conceptTitle={lesson.concept.name}
          visualType={visualType}
          diagram={visualAct?.diagram}
          explanation={visualAct?.explanation || visualAct?.description}
        />
      );

    case 3:
      // Stage 4: Code Mechanics & Technical Walkthrough
      return (
        <CodeWalkthroughRenderer
          language={exampleAct?.language || 'typescript'}
          code={
            exampleAct?.code ||
            lesson.content.match(/```(?:javascript|typescript|python|sql|json)?\n([\s\S]*?)```/)?.[1] ||
            '// Technical snippet'
          }
          explanation={exampleAct?.explanation || exampleAct?.title}
          onAskTutor={onAskTutor}
        />
      );

    case 4:
      // Stage 5: Production Context & Trade-Offs
      return (
        <RealWorldApplicationRenderer
          scenario={realProjectAct?.scenario || realProjectAct?.title}
          tradeoffs={realProjectAct?.tradeoffs}
          failureMode={realProjectAct?.failureMode}
        />
      );

    case 5:
      // Stage 6: Practical Challenge
      return (
        <PracticalChallengeRenderer
          prompt={practicalAct?.prompt || practicalAct?.title}
          hint={practicalAct?.hint}
          solution={practicalAct?.solution}
          explanation={practicalAct?.explanation}
          onUseHint={onUseHint}
        />
      );

    case 6:
      // Stage 7: Knowledge Verification / Quiz
      return (
        <QuizRenderer
          quiz={lesson.quizzes?.[0]}
          quizResponses={quizResponses}
          onSelectOption={onSelectOption}
          onSubmitQuiz={onSubmitQuiz}
          isSubmitting={isSubmittingQuiz}
          quizResult={quizResult}
        />
      );

    case 7:
      // Stage 8: Active Synthesis / Explain-Back
      return (
        <ExplainBackRenderer
          conceptName={lesson.concept.name}
          userExplanation={userExplanation}
          onExplanationChange={onExplanationChange}
          onSubmit={onSubmitExplainBack}
          isEvaluating={isEvaluatingExplain}
          evaluation={explainEvaluation}
        />
      );

    case 8:
      // Stage 9: Session Summary & Synthesis
      return (
        <SummaryRenderer
          summary={summaryAct?.summary || lesson.objective}
          takeaways={summaryAct?.takeaways}
          remediation={summaryAct?.remediation}
          conceptName={lesson.concept.name}
        />
      );

    default:
      // Graceful fallback for unknown stage type
      return (
        <div className="p-8 rounded-2xl bg-white dark:bg-slate-900 border border-[#E3E7F0] dark:border-slate-800 text-center">
          <HelpCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Stage {currentStageNumber + 1}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            This milestone stage is preparing its adaptive content. You can proceed to the next stage.
          </p>
        </div>
      );
  }
}
