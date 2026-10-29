'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  description: string;
  slug: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [goalTitle, setGoalTitle] = useState('');
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [experienceLevel, setExperienceLevel] = useState('INTERMEDIATE');
  const [knownSkills, setKnownSkills] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInitialData() {
      try {
        const rolesRes = await apiClient('/roles');
        if (rolesRes && rolesRes.roles) {
          setRoles(rolesRes.roles);
          if (rolesRes.roles.length > 0) {
            setSelectedRole(rolesRes.roles[0]);
            setGoalTitle(`Become a ${rolesRes.roles[0].name}`);
          }
        }
      } catch (err) {
        console.error('Failed to load roles during onboarding:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInitialData();
  }, []);

  const experienceOptions = [
    {
      value: 'BEGINNER',
      label: 'Beginner / Transitioning',
      desc: 'Building my foundation. I want step-by-step guidance without skipping core basics.'
    },
    {
      value: 'INTERMEDIATE',
      label: 'Practicing Engineer',
      desc: 'Comfortable with programming. Looking for deeper system depth and production intuition.'
    },
    {
      value: 'ADVANCED',
      label: 'Senior / Staff Track',
      desc: 'Focus on high-leverage trade-offs, scalability, distributed failures, and technical leadership.'
    }
  ];

  const skillOptions = [
    { slug: 'system-design', label: 'System Design & Distributed Architectures' },
    { slug: 'databases', label: 'Database Indexing, Sharding & Query Optimization' },
    { slug: 'concurrency', label: 'Event Loops, Concurrency & Async I/O' },
    { slug: 'caching', label: 'Caching Strategies, Invalidation & CDNs' },
    { slug: 'networking', label: 'HTTP/3, gRPC, WebSockets & TCP Fundamentals' },
    { slug: 'security', label: 'Auth, Encryption, OWASP & API Gateway Security' }
  ];

  const handleNextStep = async () => {
    setIsSaving(true);
    try {
      if (step === 1) {
        await apiClient('/onboarding/step', {
          method: 'POST',
          body: JSON.stringify({
            step: 1,
            targetRoleId: selectedRole?.id,
            goalTitle
          })
        });
        setStep(2);
      } else if (step === 2) {
        await apiClient('/onboarding/step', {
          method: 'POST',
          body: JSON.stringify({
            step: 2,
            experienceLevel,
            dailyMinutes
          })
        });
        setStep(3);
      }
    } catch (err) {
      console.error('Failed to persist onboarding step:', err);
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
        <div className="animate-spin w-8 h-8 border-2 border-[#111111] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 max-w-md mx-auto text-center">
        <div className="w-16 h-16 rounded-3xl bg-[#d8ff19]/30 border border-[#111111]/20 flex items-center justify-center mb-6 shadow-sm">
          <Sparkles className="w-8 h-8 text-[#111111] animate-pulse" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight mb-2">
          Calibrating Your Personalized Path
        </h2>
        <p className="text-xs sm:text-sm text-[#686860] mb-6 leading-relaxed font-medium">
          Our curriculum architect is synthesizing your prerequisite graph and milestones for{' '}
          <span className="font-bold text-[#111111]">{selectedRole?.name || goalTitle}</span>.
        </p>
        <div className="flex items-center gap-2.5 text-xs font-bold text-[#111111] bg-[#F8F8F4] px-4 py-2.5 rounded-full border border-[#d9d9d2]">
          <div className="animate-spin w-3.5 h-3.5 border-2 border-[#111111] border-t-transparent rounded-full" />
          Setting up Today&apos;s Learning session...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 max-w-2xl mx-auto w-full">
      {/* Step Indicators & Progress */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-between text-xs font-bold text-[#686860] mb-2">
          <span className="flex items-center gap-1.5 text-[#111111]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#d8ff19] border border-[#111111]" />
            Step {step} of 3
          </span>
          <span className="text-[#111111] font-black">{progressPercent}% Calibrated</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#F1F1EC] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#111111] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <Card className="w-full p-6 sm:p-9 bg-white border border-[#d9d9d2] shadow-sm rounded-3xl">
        {/* STEP 1: TARGET ROLE & GOAL */}
        {step === 1 && (
          <div>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d8ff19]/30 text-[#111111] text-xs font-black mb-2.5 border border-[#111111]/20">
                <Sparkles className="w-3 h-3 text-[#111111]" />
                Target Direction
              </span>
              <h2 className="text-2xl sm:text-[26px] font-black text-[#111111] tracking-tight">
                What role do you want to master?
              </h2>
              <p className="text-sm text-[#686860] mt-1.5 leading-relaxed font-medium">
                Choose your focus. Our adaptive engine constructs a prerequisite graph tailored specifically to your goal so you stand out.
              </p>
            </div>

            {roles.length > 0 ? (
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
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#111111] bg-[#d8ff19]/20 shadow-sm ring-1 ring-[#111111]'
                          : 'border-[#d9d9d2] hover:border-[#111111] bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-black text-sm text-[#111111]`}>
                          {role.name}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#111111] flex items-center justify-center text-[#d8ff19]">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#686860] mt-1 leading-relaxed font-medium">{role.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-[#F8F8F4] rounded-2xl border border-[#d9d9d2] mb-6">
                <p className="text-xs text-[#686860] mb-3 font-medium">
                  No predefined roles published yet. Enter your custom learning target or career objective below:
                </p>
                <input
                  type="text"
                  placeholder="e.g. Full-Stack Web Development, Data Science, AI Systems"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-[#d9d9d2] bg-white text-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111]"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 2: EXPERIENCE & DAILY TIME PREFERENCE */}
        {step === 2 && (
          <div>
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d8ff19]/30 text-[#111111] text-xs font-black mb-2.5 border border-[#111111]/20">
                Pacing &amp; Experience
              </span>
              <h2 className="text-2xl sm:text-[26px] font-black text-[#111111] tracking-tight">
                Pacing and Current Background
              </h2>
              <p className="text-sm text-[#686860] mt-1.5 leading-relaxed font-medium">
                Adaptive learning thrives on sustainable daily micro-sessions that fit into your actual schedule without burnout.
              </p>
            </div>

            {/* Daily Time Preference: 10, 15, 20 */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5">
                Daily Learning Commitment
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[10, 15, 20].map(mins => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setDailyMinutes(mins)}
                    className={`py-3 px-3 rounded-2xl border text-center transition-all ${
                      dailyMinutes === mins
                        ? 'bg-[#111111] border-[#111111] text-[#d8ff19] font-black shadow-sm'
                        : 'border-[#d9d9d2] bg-white text-[#111111] hover:border-[#111111] hover:bg-[#F8F8F4]'
                    }`}
                  >
                    <div className="text-base font-black">{mins} min</div>
                    <div className={`text-[10px] ${dailyMinutes === mins ? 'text-[#d8ff19]/80' : 'text-[#686860]'}`}>
                      per day
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Self-reported Experience Level */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-[#111111] uppercase tracking-wider mb-2.5">
                Current Practical Experience
              </label>
              <div className="space-y-2.5">
                {experienceOptions.map(exp => (
                  <div
                    key={exp.value}
                    onClick={() => setExperienceLevel(exp.value)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      experienceLevel === exp.value
                        ? 'border-[#111111] bg-[#d8ff19]/20 shadow-sm ring-1 ring-[#111111]'
                        : 'border-[#d9d9d2] bg-white hover:border-[#111111] hover:bg-[#F8F8F4]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className="text-[#111111]">
                        {exp.label}
                      </span>
                      {experienceLevel === exp.value && (
                        <div className="w-4 h-4 rounded-full bg-[#111111] flex items-center justify-center text-[#d8ff19]">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[#686860] mt-0.5 font-medium">{exp.desc}</p>
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d8ff19]/30 text-[#111111] text-xs font-black mb-2.5 border border-[#111111]/20">
                Baseline Calibration
              </span>
              <h2 className="text-2xl sm:text-[26px] font-black text-[#111111] tracking-tight">
                Which areas have you explored before?
              </h2>
              <p className="text-sm text-[#686860] mt-1.5 leading-relaxed font-medium">
                Optional: Select concepts you&apos;ve touched. This personalizes your entry point so you never waste time on basics you already understand.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
              {skillOptions.map(skill => {
                const isSelected = knownSkills.includes(skill.slug);
                return (
                  <button
                    key={skill.slug}
                    type="button"
                    onClick={() => toggleSkill(skill.slug)}
                    className={`py-3 px-3.5 rounded-xl border text-left text-xs font-bold transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#d8ff19] border-[#111111] text-[#111111] shadow-xs'
                        : 'border-[#d9d9d2] bg-white text-[#111111] hover:border-[#111111]'
                    }`}
                  >
                    <span>{skill.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-[#111111] shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F8F4] border border-[#d9d9d2] text-xs text-[#686860] leading-relaxed font-medium">
              <span className="font-bold text-[#111111]">How would you like to start?</span> You can begin your {dailyMinutes} min daily session immediately, or take a 2-minute diagnostic to map your exact strengths.
            </div>
          </div>
        )}

        {/* Navigation Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-[#d9d9d2] gap-3">
          {step > 1 ? (
            <Button
              variant="outline"
              size="md"
              onClick={() => setStep(step - 1)}
              className="gap-1.5 w-full sm:w-auto border-[#d9d9d2] text-[#111111] hover:bg-[#F1F1EC] font-bold"
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
              className="gap-1.5 w-full sm:w-auto bg-[#111111] hover:bg-black text-[#d8ff19] font-bold shadow-sm"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              {generationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
                  {generationError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="md"
                  isLoading={isSaving}
                  onClick={async () => {
                    setIsSaving(true);
                    setGenerationError(null);
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
                      setIsGenerating(true);
                      await apiClient('/onboarding/complete', { method: 'POST' });
                      const goalId = selectedRole?.slug || selectedRole?.id || 'system-design';
                      router.push(`/problem?goalId=${goalId}&mode=diagnostic`);
                    } catch (err: any) {
                      console.error('Error completing onboarding with diagnostic:', err);
                      setGenerationError(err?.message || 'Failed to complete path setup. Please retry.');
                      setIsGenerating(false);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="gap-1.5 text-xs order-2 sm:order-1 border-[#d9d9d2] text-[#111111] hover:bg-[#F1F1EC] font-bold"
                >
                  Quick Diagnostic (2 min)
                </Button>
                <Button
                  size="md"
                  isLoading={isSaving || isGenerating}
                  onClick={async () => {
                    setIsSaving(true);
                    setGenerationError(null);
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
                      setIsGenerating(true);
                      await apiClient('/onboarding/complete', { method: 'POST' });
                      router.push('/today');
                    } catch (err: any) {
                      console.error('Error completing onboarding:', err);
                      setGenerationError(err?.message || 'Failed to initialize your learning session. Please click Retry.');
                      setIsGenerating(false);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="gap-1.5 order-1 sm:order-2 bg-[#111111] hover:bg-black text-[#d8ff19] font-bold shadow-sm"
                >
                  Start Daily Learning
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
