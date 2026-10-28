'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';

interface TargetRole {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [roles, setRoles] = useState<TargetRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<TargetRole | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('BEGINNER');
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [knownSkills, setKnownSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Available skills from curated catalogue
  const skillOptions = [
    { slug: 'javascript', label: 'JavaScript' },
    { slug: 'nodejs', label: 'Node.js' },
    { slug: 'rest-apis', label: 'REST APIs' },
    { slug: 'postgresql', label: 'SQL & Databases' },
    { slug: 'redis', label: 'In-Memory Caching' },
    { slug: 'system-design', label: 'System Design' },
    { slug: 'ai-engineering', label: 'AI Engineering' }
  ];

  const experienceOptions = [
    { value: 'BEGINNER', label: 'Beginner', desc: 'Starting from fundamentals or transitioning into programming' },
    { value: 'INTERMEDIATE', label: 'Some practical experience', desc: 'Built side projects, understand core syntax and web concepts' },
    { value: 'ADVANCED', label: 'Working software engineer', desc: 'Writing production code; preparing for senior roles and system design' }
  ];

  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [rolesData, stateData] = await Promise.all([
          apiClient('/roles'),
          apiClient('/onboarding/state').catch(() => null)
        ]);

        if (rolesData?.roles) {
          setRoles(rolesData.roles);
          if (!selectedRole && rolesData.roles.length > 0) {
            setSelectedRole(rolesData.roles[0]);
            setGoalTitle(`Become a ${rolesData.roles[0].name}`);
          }
        }

        if (stateData) {
          if (stateData.currentStep && stateData.currentStep > 1) {
            setStep(Math.min(3, stateData.currentStep));
          }
          if (stateData.activeGoal?.targetRole) {
            setSelectedRole(stateData.activeGoal.targetRole);
            setGoalTitle(stateData.activeGoal.title);
          }
          if (stateData.profile?.experienceLevel) {
            setExperienceLevel(stateData.profile.experienceLevel);
          }
          if (stateData.profile?.dailyMinutes) {
            setDailyMinutes(stateData.profile.dailyMinutes);
          }
          if (stateData.knownSkills) {
            setKnownSkills(stateData.knownSkills);
          }
        }
      } catch (err) {
        console.error('Failed to load onboarding state:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  const handleNextStep = async () => {
    setIsSaving(true);
    try {
      await apiClient('/onboarding/step', {
        method: 'POST',
        body: JSON.stringify({
          step,
          goalTitle,
          targetRoleId: selectedRole?.id,
          experienceLevel,
          dailyMinutes,
          knownSkillSlugs: knownSkills
        })
      });

      if (step < 3) {
        setStep(step + 1);
      } else {
        // Complete onboarding and proceed to diagnostic assessment
        await apiClient('/onboarding/complete', { method: 'POST' });
        router.push('/assessment');
      }
    } catch (err) {
      console.error('Error saving onboarding step:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSkill = (slug: string) => {
    setKnownSkills(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const progressPercent = Math.round((step / 3) * 100);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-2xl mx-auto w-full">
      {/* Progress Bar & Header */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
          <span>Step {step} of 3</span>
          <span>{progressPercent}% Complete</span>
        </div>
        <ProgressBar value={progressPercent} color="indigo" size="sm" />
      </div>

      <Card className="w-full p-6 sm:p-8">
        {/* STEP 1: WHAT DO YOU WANT TO GET BETTER AT? */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <Badge variant="purple" className="mb-2">Goal Selection</Badge>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">What do you want to get better at?</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Choose your target focus. We will build an explainable concept dependency graph specifically tailored to your goal.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {roles.map(role => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <div
                    key={role.id}
                    onClick={() => {
                      setSelectedRole(role);
                      setGoalTitle(`Become a ${role.name}`);
                    }}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{role.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{role.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: EXPERIENCE & DAILY TIME PREFERENCE */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <Badge variant="purple" className="mb-2">Pacing & Experience</Badge>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Pacing and Current Background</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Learning is most effective when done consistently in bite-sized daily sessions that fit your real schedule.
              </p>
            </div>

            {/* Daily Time Preference: 10, 15, 20 */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Daily Time Preference
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[10, 15, 20].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDailyMinutes(mins)}
                    className={`py-3 px-3 rounded-xl border text-center transition-all ${
                      dailyMinutes === mins
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-300 hover:border-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="text-base font-bold">{mins} min</div>
                    <div className="text-[10px] opacity-80">per day</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Self-reported Experience Level */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Current Experience Level
              </label>
              <div className="space-y-2.5">
                {experienceOptions.map(exp => (
                  <div
                    key={exp.value}
                    onClick={() => setExperienceLevel(exp.value)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      experienceLevel === exp.value
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-white font-medium'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{exp.label}</span>
                      {experienceLevel === exp.value && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{exp.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: PRIOR EXPOSURE & LAUNCH */}
        {step === 3 && (
          <div>
            <div className="mb-6">
              <Badge variant="purple" className="mb-2">Baseline & Launch</Badge>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Which areas have you explored before?</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Optional: Select any topics you&apos;ve worked with. This calibrates your initial path difficulty without assuming unverified mastery.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-6">
              {skillOptions.map(skill => {
                const isSelected = knownSkills.includes(skill.slug);
                return (
                  <button
                    key={skill.slug}
                    type="button"
                    onClick={() => toggleSkill(skill.slug)}
                    className={`py-2.5 px-3 rounded-lg border text-left text-xs font-medium transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{skill.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-slate-800 dark:text-slate-200">How would you like to start?</span> You can begin your 10–15 min daily session immediately, or take a quick 2-minute diagnostic to place your baseline.
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-200 dark:border-slate-800 gap-3">
          {step > 1 ? (
            <Button
              variant="outline"
              size="md"
              onClick={() => setStep(step - 1)}
              className="gap-1.5 w-full sm:w-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              size="md"
              isLoading={isSaving}
              onClick={handleNextStep}
              className="gap-1.5 w-full sm:w-auto"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="md"
                isLoading={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await apiClient('/onboarding/step', {
                      method: 'POST',
                      body: JSON.stringify({
                        step: 3,
                        goalTitle,
                        targetRoleId: selectedRole?.id,
                        experienceLevel,
                        dailyMinutes,
                        knownSkillSlugs: knownSkills
                      })
                    });
                    await apiClient('/onboarding/complete', { method: 'POST' });
                    router.push('/assessment');
                  } catch (err) {
                    console.error('Error completing onboarding:', err);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="gap-1.5 text-xs order-2 sm:order-1"
              >
                Quick Diagnostic (2 min)
              </Button>
              <Button
                size="md"
                isLoading={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await apiClient('/onboarding/step', {
                      method: 'POST',
                      body: JSON.stringify({
                        step: 3,
                        goalTitle,
                        targetRoleId: selectedRole?.id,
                        experienceLevel,
                        dailyMinutes,
                        knownSkillSlugs: knownSkills
                      })
                    });
                    await apiClient('/onboarding/complete', { method: 'POST' });
                    router.push('/today');
                  } catch (err) {
                    console.error('Error completing onboarding:', err);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="gap-1.5 order-1 sm:order-2"
              >
                Start Daily Learning
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
