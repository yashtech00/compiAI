import prisma from './src/config/prisma.js';

async function verifyPhase3AdaptiveIntelligence() {
  console.log('=== STARTING PHASE 3 LIVE ADAPTIVE INTELLIGENCE E2E VERIFICATION ===');
  const baseUrl = 'http://localhost:5001/api/v1';

  // -------------------------------------------------------------
  // Test 1: Advancement & Duplicate Submission Deduplication
  // -------------------------------------------------------------
  console.log('\n--- 1. Testing Advancement & XP Deduplication (Learner 1: 100% Quiz Pass) ---');
  const email1 = `p3_adv_${Date.now()}@test.com`;
  const signup1 = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email1, password: 'Password123!', displayName: 'Advancer Learner' })
  });
  const { data: { token: token1, user: user1 } } = await signup1.json();

  // Complete onboarding
  await fetch(`${baseUrl}/onboarding/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
    body: JSON.stringify({ step: 3, goalTitle: 'Distributed Systems & Go Raft', experienceLevel: 'ADVANCED', dailyMinutes: 15 })
  });
  await fetch(`${baseUrl}/onboarding/complete`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token1}` }
  });

  // Today recommendation 1: Should be ADVANCE for Milestone 1
  const todayRes1 = await fetch(`${baseUrl}/today/recommendation`, { headers: { 'Authorization': `Bearer ${token1}` } });
  const today1 = (await todayRes1.json()).data.today;
  console.log(`[Learner 1] Initial recommendation: actionType=${today1.recommendedActivity.actionType}, title="${today1.recommendedActivity.title}"`);
  if (today1.recommendedActivity.actionType !== 'ADVANCE') {
    throw new Error(`Expected ADVANCE for initial recommendation, got ${today1.recommendedActivity.actionType}`);
  }

  // Load lesson and quiz
  const lesson1Res = await fetch(`${baseUrl}/lessons/${today1.recommendedActivity.lessonSlug}`, { headers: { 'Authorization': `Bearer ${token1}` } });
  const lesson1 = (await lesson1Res.json()).data.lesson;
  const quiz1Id = lesson1.quizzes[0].id;
  const dbQuestions1 = await prisma.quizQuestion.findMany({ where: { quizId: quiz1Id } });

  // Submit 100% correct answers
  const submit1 = await fetch(`${baseUrl}/quizzes/${quiz1Id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
    body: JSON.stringify({
      responses: dbQuestions1.map(q => ({ questionId: q.id, response: String(q.answer) })),
      durationSeconds: 90
    })
  });
  const subResult1 = (await submit1.json()).data.result;
  console.log(`[Learner 1] Quiz 1 submission: Score=${subResult1.score}%, Passed=${subResult1.isPassed}, XP=+${subResult1.xpAwarded}`);
  if (!subResult1.isPassed || subResult1.score !== 100) {
    throw new Error('Expected 100% quiz pass');
  }

  // Submit same quiz again: XP should be 0 (idempotent / deduplicated)
  const submitDup = await fetch(`${baseUrl}/quizzes/${quiz1Id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token1}` },
    body: JSON.stringify({
      responses: dbQuestions1.map(q => ({ questionId: q.id, response: String(q.answer) })),
      durationSeconds: 90
    })
  });
  const subDupResult = (await submitDup.json()).data.result;
  console.log(`[Learner 1] Duplicate submission check: XP Awarded=+${subDupResult.xpAwarded}`);
  if (subDupResult.xpAwarded !== 0) {
    throw new Error(`Expected 0 XP on duplicate submission, got +${subDupResult.xpAwarded}`);
  }

  // Next recommendation: Must ADVANCE to Milestone 2 (regression fix verified!)
  const todayRes2 = await fetch(`${baseUrl}/today/recommendation`, { headers: { 'Authorization': `Bearer ${token1}` } });
  const today2 = (await todayRes2.json()).data.today;
  console.log(`[Learner 1] Post-100% pass recommendation: actionType=${today2.recommendedActivity.actionType}, title="${today2.recommendedActivity.title}"`);
  if (today2.recommendedActivity.actionType !== 'ADVANCE') {
    throw new Error(`REGRESSION: Expected ADVANCE to Milestone 2, got ${today2.recommendedActivity.actionType}`);
  }
  if (today2.recommendedActivity.title === today1.recommendedActivity.title) {
    throw new Error(`REGRESSION: Recommended same milestone title after 100% pass!`);
  }

  // -------------------------------------------------------------
  // Test 2: Struggle, Targeted Remediation & Loop Exit
  // -------------------------------------------------------------
  console.log('\n--- 2. Testing Struggle, Targeted Remediation & Loop Exit (Learner 2) ---');
  const email2 = `p3_struggle_${Date.now()}@test.com`;
  const signup2 = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email2, password: 'Password123!', displayName: 'Struggling Learner' })
  });
  const { data: { token: token2, user: user2 } } = await signup2.json();

  // Complete onboarding
  await fetch(`${baseUrl}/onboarding/step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
    body: JSON.stringify({ step: 3, goalTitle: 'Distributed Systems & Go Raft', experienceLevel: 'BEGINNER', dailyMinutes: 15 })
  });
  await fetch(`${baseUrl}/onboarding/complete`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token2}` }
  });

  // Get Milestone 1 session
  const l2Today1 = (await (await fetch(`${baseUrl}/today/recommendation`, { headers: { 'Authorization': `Bearer ${token2}` } })).json()).data.today;
  const l2Lesson1Res = await fetch(`${baseUrl}/lessons/${l2Today1.recommendedActivity.lessonSlug}`, { headers: { 'Authorization': `Bearer ${token2}` } });
  const l2Lesson1 = (await l2Lesson1Res.json()).data.lesson;
  const l2Quiz1Id = l2Lesson1.quizzes[0].id;
  const l2DbQuestions1 = await prisma.quizQuestion.findMany({ where: { quizId: l2Quiz1Id } });

  // First failing attempt (0% score)
  console.log('[Learner 2] Submitting failing attempt 1...');
  await fetch(`${baseUrl}/quizzes/${l2Quiz1Id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
    body: JSON.stringify({
      responses: l2DbQuestions1.map(q => ({ questionId: q.id, response: q.options.find(o => o !== q.answer) })),
      durationSeconds: 60
    })
  });

  // Recommendation after first failure should be REINFORCE
  const l2Today2 = (await (await fetch(`${baseUrl}/today/recommendation`, { headers: { 'Authorization': `Bearer ${token2}` } })).json()).data.today;
  console.log(`[Learner 2] Recommendation after attempt 1: actionType=${l2Today2.recommendedActivity.actionType}, title="${l2Today2.recommendedActivity.title}"`);
  if (l2Today2.recommendedActivity.actionType !== 'REINFORCE') {
    throw new Error(`Expected REINFORCE after first failure, got ${l2Today2.recommendedActivity.actionType}`);
  }

  // Second failing attempt with misconceptions
  console.log('[Learner 2] Submitting failing attempt 2...');
  await fetch(`${baseUrl}/quizzes/${l2Quiz1Id}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
    body: JSON.stringify({
      responses: l2DbQuestions1.map(q => ({ questionId: q.id, response: q.options.find(o => o !== q.answer) })),
      durationSeconds: 80
    })
  });

  // Recommendation after repeated failure should be REMEDIATE
  const l2Today3 = (await (await fetch(`${baseUrl}/today/recommendation`, { headers: { 'Authorization': `Bearer ${token2}` } })).json()).data.today;
  console.log(`[Learner 2] Recommendation after repeated failure: actionType=${l2Today3.recommendedActivity.actionType}, title="${l2Today3.recommendedActivity.title}"`);
  if (l2Today3.recommendedActivity.actionType !== 'REMEDIATE') {
    throw new Error(`Expected REMEDIATE after repeated failure, got ${l2Today3.recommendedActivity.actionType}`);
  }

  // Pass remediation session quiz
  console.log('[Learner 2] Successfully passing remediation quiz...');
  const remLessonRes = await fetch(`${baseUrl}/lessons/${l2Today3.recommendedActivity.lessonSlug}`, { headers: { 'Authorization': `Bearer ${token2}` } });
  const remLesson = (await remLessonRes.json()).data.lesson;
  const remQuizId = remLesson.quizzes[0].id;
  const remDbQuestions = await prisma.quizQuestion.findMany({ where: { quizId: remQuizId } });

  const remSubmit = await fetch(`${baseUrl}/quizzes/${remQuizId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token2}` },
    body: JSON.stringify({
      responses: remDbQuestions.map(q => ({ questionId: q.id, response: String(q.answer) })),
      durationSeconds: 100
    })
  });
  const remResult = (await remSubmit.json()).data.result;
  console.log(`[Learner 2] Remediation quiz passed: Score=${remResult.score}%, Passed=${remResult.isPassed}`);

  // Recommendation after passing remediation: Must exit remediation loop and ADVANCE to next milestone!
  const l2Today4 = (await (await fetch(`${baseUrl}/today/recommendation`, { headers: { 'Authorization': `Bearer ${token2}` } })).json()).data.today;
  console.log(`[Learner 2] Post-remediation recommendation: actionType=${l2Today4.recommendedActivity.actionType}, title="${l2Today4.recommendedActivity.title}"`);
  if (l2Today4.recommendedActivity.actionType !== 'ADVANCE') {
    throw new Error(`Expected ADVANCE after passing remediation, got ${l2Today4.recommendedActivity.actionType}`);
  }

  // Cleanup
  await prisma.user.delete({ where: { id: user1.id } });
  await prisma.user.delete({ where: { id: user2.id } });

  console.log('\n=== ALL PHASE 3 LIVE ADAPTIVE INTELLIGENCE CHECKS PASSED PERFECTLY ===');
}

verifyPhase3AdaptiveIntelligence()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Phase 3 E2E Verification Failed:', err);
    process.exit(1);
  });
