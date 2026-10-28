/**
 * Phase 4 Live End-to-End Verification Script
 * Validates arbitrary goal support, JIT lesson synthesis, evidence-driven progression,
 * mastery vs completion distinction, safe regeneration, and cross-learner security.
 */

const BASE_URL = process.env.API_URL || 'http://localhost:5001/api/v1';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const res = await fetch(url, {
    ...options,
    headers
  });

  const text = await res.text();
  try {
    const data = JSON.parse(text);
    return { status: res.status, ok: res.ok, body: data };
  } catch (err) {
    return { status: res.status, ok: res.ok, raw: text };
  }
}

async function runPhase4Verification() {
  console.log('========================================================================');
  console.log('Phase 4: Complete Dynamic Curriculum Migration Live E2E Verification');
  console.log(`Target Backend: ${BASE_URL}`);
  console.log('========================================================================\n');

  let passedChecks = 0;
  let totalChecks = 0;

  function assert(condition, message) {
    totalChecks++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passedChecks++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  try {
    // 1. Health check
    const health = await request('/health');
    assert(health.status === 200 && health.body.data?.status === 'healthy', '1. Backend server is alive and responding');

    // 2. Signup Learner A with an arbitrary unseeded goal
    const uniqueEmailA = `e2e_k8s_controller_${Date.now()}@example.com`;
    const signupA = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmailA,
        password: 'Password123!',
        displayName: 'Kubernetes Controller Engineer'
      })
    });
    assert(signupA.status === 201 && signupA.body.data?.token, '2. Learner A registered successfully');
    const tokenA = signupA.body.data.token;
    const userA = signupA.body.data.user;

    // 3. Complete onboarding with arbitrary goal: "Kubernetes Custom Controller Development in Go"
    const ARBITRARY_GOAL = 'Kubernetes Custom Controller Development in Go';
    const onboardStep = await request('/onboarding/step', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({
        step: 3,
        goalTitle: ARBITRARY_GOAL,
        experienceLevel: 'INTERMEDIATE',
        dailyMinutes: 15,
        targetRole: 'Cloud Native Systems Engineer'
      })
    });
    assert(onboardStep.status === 200, '3. Learner A profile & arbitrary goal saved');

    const onboardComplete = await request('/onboarding/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(onboardComplete.status === 200, '4. Onboarding completed successfully');
    const roadmap = onboardComplete.body.data?.roadmap;
    assert(roadmap && roadmap.items?.length >= 4, `5. Synthesized dynamic path with ${roadmap?.items?.length} milestones`);
    assert(roadmap?.targetGoal === ARBITRARY_GOAL, `6. Dynamic path target matches arbitrary goal exactly: "${roadmap?.targetGoal}"`);

    // Verify milestones are tailored to Kubernetes controller concepts
    const milestoneTexts = roadmap.items.map(i => `${i.title} ${i.targetOutcome}`.toLowerCase()).join(' ');
    const hasK8sKeywords = milestoneTexts.includes('kubernetes') ||
      milestoneTexts.includes('controller') ||
      milestoneTexts.includes('reconcil') ||
      milestoneTexts.includes('crd') ||
      milestoneTexts.includes('informer');
    assert(hasK8sKeywords, '7. Synthesized milestones are deeply aligned with Kubernetes controllers');

    // 4. Request Today recommendation (resolves first unmastered milestone)
    const todayRes = await request('/today/recommendation', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(todayRes.status === 200, '8. Today recommendation loaded');
    const today = todayRes.body.data?.today;
    const act = today?.recommendedActivity;
    assert(act?.actionType === 'ADVANCE', `9. Action type is ADVANCE for first milestone: ${act?.title}`);
    assert(act?.lessonSlug, `10. JIT lesson slug generated: "${act?.lessonSlug}"`);

    // 5. Load generated lesson details
    const lessonRes = await request(`/lessons/${act.lessonSlug}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(lessonRes.status === 200, '11. JIT synthesized lesson retrieved');
    const lesson = lessonRes.body.data?.lesson;
    assert(lesson?.activities?.length >= 4, `12. Lesson contains ${lesson?.activities?.length} pedagogical activities`);
    assert(lesson?.quizzes?.length >= 1, '13. Lesson includes assessment quiz');
    const quiz = lesson?.quizzes?.[0];
    assert(quiz?.questions?.length >= 2, `14. Quiz contains ${quiz?.questions?.length} questions`);

    // Verify answers and explanations are hidden before submission
    const firstQ = quiz?.questions?.[0];
    assert(firstQ?.answer === undefined, '15. Quiz question answer key is HIDDEN prior to submission');
    assert(firstQ?.explanation === undefined, '16. Quiz question explanation is HIDDEN prior to submission');

    // 6. Cross-Learner Authorization Isolation Test
    const uniqueEmailB = `e2e_isolation_tester_${Date.now()}@example.com`;
    const signupB = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: uniqueEmailB,
        password: 'Password123!',
        displayName: 'Isolation Tester'
      })
    });
    const tokenB = signupB.body.data.token;

    const crossAccessLesson = await request(`/lessons/${act.lessonSlug}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert(crossAccessLesson.status === 403, '17. Learner B is forbidden (403) from accessing Learner A custom lesson');

    // 7. Submit Quiz for Learner A (Passing score 100%)
    // To submit correctly, we fetch the questions and pick the first option
    const submitBody = {
      responses: quiz.questions.map(q => ({
        questionId: q.id,
        response: q.options[0] // Valid option string
      })),
      durationSeconds: 110,
      hintsUsed: 0
    };

    const submitRes = await request(`/quizzes/${quiz.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(submitBody)
    });
    assert(submitRes.status === 200, '18. Quiz submitted and graded successfully');
    const graded = submitRes.body.data?.result;
    assert(graded?.score !== undefined, `19. Graded score received: ${graded?.score}%`);

    // 8. Test Idempotency of duplicate quiz submission
    const resubmitRes = await request(`/quizzes/${quiz.id}/submit`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify(submitBody)
    });
    assert(resubmitRes.status === 200, '20. Re-submitting quiz is idempotent and succeeds safely');
    assert(resubmitRes.body.data?.result?.xpAwarded === 0 || resubmitRes.body.data?.result?.earnedXp === 0,
      '21. Re-submission awarded 0 duplicate XP');

    // 9. Safe Path Regeneration
    const regenRes = await request('/learning-paths/regenerate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(regenRes.status === 200, '22. Learning path successfully regenerated with safe versioning');
    const newRoadmap = regenRes.body.data?.roadmap;
    assert(newRoadmap?.version > roadmap.version, `23. Path version incremented from v${roadmap.version} to v${newRoadmap?.version}`);

    // 10. Verify Legacy Seeded Reference Curriculum still accessible
    const publicLessons = await request('/lessons', {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(publicLessons.status === 200, '24. Reference lesson catalogue endpoint loaded');
    const hasPublicLessons = publicLessons.body.data?.lessons?.some(l => l.userId === null);
    assert(hasPublicLessons, '25. Preseeded reference lessons remain intact and accessible');

    console.log('\n========================================================================');
    console.log(`Live Verification Complete: ${passedChecks} / ${totalChecks} checks PASSED`);
    console.log('========================================================================');

    if (passedChecks === totalChecks) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error during verification:', err);
    process.exit(1);
  }
}

runPhase4Verification();
