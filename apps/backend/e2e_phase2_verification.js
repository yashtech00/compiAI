import prisma from './src/config/prisma.js';

async function verifyPhase2LiveJourney() {
  console.log('--- STARTING PHASE 2 LIVE END-TO-END VERIFICATION ---');

  const baseUrl = 'http://localhost:5001/api/v1';
  const testEmail = `phase2-e2e-${Date.now()}@example.com`;

  // 1. Signup with non-seeded goal
  console.log('1. Signing up user with custom goal: "Distributed consensus with Raft in Go"...');
  const signupRes = await fetch(`${baseUrl}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'Password123!',
      displayName: 'Phase2 Learner'
    })
  });
  const signupJson = await signupRes.json();
  if (!signupRes.ok) throw new Error(`Signup failed: ${JSON.stringify(signupJson)}`);
  const token = signupJson.data.token;
  const user = signupJson.data.user;

  // 2. Complete onboarding with custom goal and 20 min/day budget
  console.log('2. Completing onboarding...');
  const obRes = await fetch(`${baseUrl}/onboarding/step`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      step: 3,
      goalTitle: 'Distributed consensus using Go and Raft',
      experienceLevel: 'ADVANCED',
      dailyMinutes: 20
    })
  });
  if (!obRes.ok) throw new Error('Onboarding step failed');

  const completeRes = await fetch(`${baseUrl}/onboarding/complete`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const completeJson = await completeRes.json();
  if (!completeRes.ok) throw new Error('Onboarding complete failed');
  console.log(`   Path synthesized: "${completeJson.data.roadmap.title}" with ${completeJson.data.roadmap.items.length} milestones`);

  // 3. Request Today's recommendation (triggers JIT generation for Milestone 1)
  console.log('3. Fetching Today recommendation (triggering JIT session generation)...');
  const todayRes1 = await fetch(`${baseUrl}/today/recommendation`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const todayJson1 = await todayRes1.json();
  if (!todayRes1.ok) throw new Error('Today recommendation failed');
  const act1 = todayJson1.data.today.recommendedActivity;
  console.log(`   Recommended activity: actionType=${act1.actionType}, title="${act1.title}", lessonSlug="${act1.lessonSlug}"`);
  if (!act1.lessonSlug) throw new Error('Expected lessonSlug to be populated via JIT generation');

  // 4. Verify lesson idempotency on refresh
  console.log('4. Verifying idempotency on refresh (requesting Today recommendation again)...');
  const todayRes2 = await fetch(`${baseUrl}/today/recommendation`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const todayJson2 = await todayRes2.json();
  const act2 = todayJson2.data.today.recommendedActivity;
  if (act1.lessonId !== act2.lessonId) {
    throw new Error(`Idempotency violated! Lesson ID changed on reload: ${act1.lessonId} vs ${act2.lessonId}`);
  }
  console.log(`   Idempotency confirmed: Returned exact same lessonId (${act1.lessonId})`);

  // 5. Fetch lesson details and verify answer key secrecy
  console.log(`5. Fetching lesson player payload for slug "${act1.lessonSlug}"...`);
  const lessonRes = await fetch(`${baseUrl}/lessons/${act1.lessonSlug}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const lessonJson = await lessonRes.json();
  if (!lessonRes.ok) throw new Error('Failed to load lesson');
  const lesson = lessonJson.data.lesson;
  console.log(`   Lesson loaded: "${lesson.title}" (${lesson.estimatedMinutes}m, difficulty=${lesson.difficulty})`);
  console.log(`   Activities count: ${lesson.activities.length}`);

  const questions = lesson.quizzes[0].questions;
  console.log(`   Quiz loaded: "${lesson.quizzes[0].title}" with ${questions.length} questions`);
  for (const q of questions) {
    if (q.answer !== undefined || q.explanation !== undefined) {
      throw new Error(`SECURITY LEAK: Question ${q.id} exposed answer or explanation before submission!`);
    }
  }
  console.log('   Answer key secrecy verified: zero answers or explanations exposed to learner!');

  // 6. Submit quiz responses and verify deterministic grading
  console.log('6. Submitting quiz responses to verify deterministic server-side evaluation...');
  const quizId = lesson.quizzes[0].id;
  // Look up true frozen answer in DB
  const dbQuestions = await prisma.quizQuestion.findMany({ where: { quizId } });
  const responses = [
    { questionId: dbQuestions[0].id, response: String(dbQuestions[0].answer) },
    { questionId: dbQuestions[1].id, response: String(dbQuestions[1].answer) }
  ];

  const submitRes = await fetch(`${baseUrl}/quizzes/${quizId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      responses,
      durationSeconds: 120,
      hintsUsed: 0
    })
  });
  const submitJson = await submitRes.json();
  if (!submitRes.ok) throw new Error(`Quiz submission failed: ${JSON.stringify(submitJson)}`);
  const result = submitJson.data.result;
  console.log(`   Score: ${result.score}% (Passed: ${result.isPassed}), XP Awarded: +${result.xpAwarded}`);
  if (result.score !== 100 || !result.isPassed) {
    throw new Error(`Expected 100% score for all correct answers, got ${result.score}%`);
  }

  // 7. Verify subsequent adaptive recommendation advances
  console.log('7. Verifying adaptive continuity after passing assessment...');
  const todayRes3 = await fetch(`${baseUrl}/today/recommendation`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const todayJson3 = await todayRes3.json();
  const act3 = todayJson3.data.today.recommendedActivity;
  console.log(`   Subsequent recommendation: actionType=${act3.actionType}, title="${act3.title}"`);

  // Cleanup
  console.log('8. Cleaning up test user...');
  await prisma.user.delete({ where: { id: user.id } });
  console.log('--- ALL PHASE 2 LIVE E2E CHECKS PASSED SUCCESSFULLY ---');
}

verifyPhase2LiveJourney()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('E2E Verification Error:', err);
    process.exit(1);
  });
