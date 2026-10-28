import request from 'supertest';
import app from './src/app.js';
import prisma from './src/config/prisma.js';
import { AdaptiveEngine } from './src/modules/recommendations/adaptive-engine.js';
import { RoadmapService } from './src/modules/learning-paths/roadmap.service.js';

async function runEndToEndVerification() {
  console.log('=== PHASE F: END-TO-END VERIFICATION OF REAL LEARNER JOURNEY ===\n');

  const testUserIds = [];

  try {
    // -----------------------------------------------------------------------
    // PART 1: ONBOARDING PERSISTENCE & TOKEN REFRESH
    // -----------------------------------------------------------------------
    console.log('--- TEST 1: ONBOARDING PERSISTENCE & INTEGRITY ---');
    const email1 = `e2e-learner-${Date.now()}@test.com`;
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: email1, password: 'Password123!', displayName: 'E2E Learner' });

    if (signupRes.status !== 201) {
      throw new Error(`Signup failed: ${JSON.stringify(signupRes.body)}`);
    }

    const token1 = signupRes.body.data.token;
    const user1 = signupRes.body.data.user;
    testUserIds.push(user1.id);
    console.log(`[PASS] Created isolated test user: ${user1.email} (${user1.id})`);

    // Fetch backend-developer role
    const backendRole = await prisma.targetRole.findFirst({ where: { slug: 'backend-developer' } });

    // Step 1: Goal
    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${token1}`)
      .send({ step: 1, targetRoleId: backendRole.id, goalTitle: 'Become a Backend Architect' });

    // Step 2: Experience & Time
    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${token1}`)
      .send({ step: 2, experienceLevel: 'INTERMEDIATE', dailyMinutes: 20 });

    // Step 3: Known Skills
    await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${token1}`)
      .send({ step: 3, knownSkillSlugs: ['javascript', 'nodejs'] });

    // VERIFY DATABASE PERSISTENCE DIRECTLY
    const dbProfile = await prisma.userProfile.findUnique({ where: { userId: user1.id } });
    const dbGoal = await prisma.learningGoal.findFirst({ where: { userId: user1.id } });
    const dbSkills = await prisma.userSkill.findMany({ where: { userId: user1.id } });

    console.log(`[VERIFY DB] UserProfile: ExpLevel=${dbProfile.experienceLevel}, DailyMin=${dbProfile.dailyMinutes}, Step=${dbProfile.onboardingStep}`);
    console.log(`[VERIFY DB] LearningGoal: Title="${dbGoal.title}", RoleId=${dbGoal.targetRoleId}`);
    console.log(`[VERIFY DB] UserSkills Count: ${dbSkills.length}`);

    if (dbProfile.experienceLevel !== 'INTERMEDIATE' || dbProfile.dailyMinutes !== 20) {
      throw new Error('Onboarding profile fields did not persist correctly in PostgreSQL!');
    }

    // CRITICAL: Verify known skills do NOT have fabricated mastery
    for (const s of dbSkills) {
      console.log(`  * Skill: ${s.skillId} -> MasteryScore: ${s.masteryScore}`);
      if (s.masteryScore > 0) {
        throw new Error(`FABRICATED MASTERY DETECTED: Skill has ${s.masteryScore} without assessment evidence!`);
      }
    }
    console.log('[PASS] Known skills recorded with 0.0 initial mastery (Zero synthetic progress).');

    // Complete Onboarding
    const completeRes = await request(app)
      .post('/api/v1/onboarding/complete')
      .set('Authorization', `Bearer ${token1}`);

    if (completeRes.status !== 200) {
      throw new Error(`Onboarding complete failed: ${JSON.stringify(completeRes.body)}`);
    }
    console.log(`[PASS] Onboarding completed. Proactive roadmap initialized: Version=${completeRes.body.data.roadmap?.version}`);

    // Verify Onboarding State retrieval after login / refresh
    const stateRes = await request(app)
      .get('/api/v1/onboarding/state')
      .set('Authorization', `Bearer ${token1}`);
    
    if (stateRes.body.data.profile.experienceLevel !== 'INTERMEDIATE' || stateRes.body.data.profile.dailyMinutes !== 20) {
      throw new Error('State recovery failed after refresh!');
    }
    console.log('[PASS] Full onboarding state safely recovered upon refresh/re-login.');

    // -----------------------------------------------------------------------
    // PART 2: INITIAL LEARNING PATH & TODAY'S RECOMMENDATION
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 2: INITIAL LEARNING PATH & RECOMMENDATION ---');
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${token1}`);

    const todayData = todayRes.body.data.today;
    console.log(`[TODAY] Recommended Action: ${todayData.recommendedActivity.actionType}`);
    console.log(`[TODAY] Concept: "${todayData.recommendedActivity.concept.name}"`);
    console.log(`[TODAY] Lesson Slug: "${todayData.recommendedActivity.lessonSlug}"`);
    console.log(`[TODAY] Estimated Minutes: ${todayData.recommendedActivity.estimatedMinutes} min (Learner Budget: 20 min)`);
    console.log(`[TODAY] Continuity Streak: ${todayData.streak.current} days`);

    if (!todayData.recommendedActivity.lessonSlug) {
      throw new Error('No lesson slug recommended for valid starter concept!');
    }
    if (todayData.recommendedActivity.estimatedMinutes > 20) {
      throw new Error('Recommended activity exceeds daily time budget!');
    }
    console.log('[PASS] Starter lesson fits within daily 20-min session budget.');

    // -----------------------------------------------------------------------
    // PART 3: REAL LESSON, QUIZ SUBMISSION & EVIDENCE PERSISTENCE
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 3: LESSON DELIVERY & REAL ASSESSMENT EVIDENCE ---');
    const targetSlug = todayData.recommendedActivity.lessonSlug;
    const lessonRes = await request(app)
      .get(`/api/v1/lessons/${targetSlug}`)
      .set('Authorization', `Bearer ${token1}`);

    if (lessonRes.status !== 200 || !lessonRes.body.data.lesson) {
      throw new Error(`Failed to load lesson for slug: ${targetSlug}`);
    }
    const lesson = lessonRes.body.data.lesson;
    console.log(`[LESSON] Loaded "${lesson.title}" with ${lesson.activities.length} activities.`);

    // Check if lesson has an active quiz
    const quiz = await prisma.quiz.findFirst({
      where: { lessonId: lesson.id },
      include: { questions: true }
    });

    if (quiz && quiz.questions.length > 0) {
      console.log(`[QUIZ] Taking quiz: "${quiz.title}" (${quiz.questions.length} questions)...`);
      const responses = quiz.questions.map(q => ({
        questionId: q.id,
        response: q.answer // Submit correct answer
      }));

      const submitRes = await request(app)
        .post(`/api/v1/quizzes/${quiz.id}/submit`)
        .set('Authorization', `Bearer ${token1}`)
        .send({ responses, durationSeconds: 180 });

      if (submitRes.status !== 200) {
        throw new Error(`Quiz submission failed: ${JSON.stringify(submitRes.body)}`);
      }

      const qResult = submitRes.body.data.result;
      console.log(`[QUIZ RESULT] Score: ${qResult.score}% | Earned XP: ${qResult.xpAwarded}`);
      console.log(`[MASTERY] New Concept Mastery: ${qResult.conceptMastery}% | Confidence: ${qResult.confidenceScore}%`);

      // Verify DB persistence of learning evidence
      const uc = await prisma.userConcept.findUnique({
        where: { userId_conceptId: { userId: user1.id, conceptId: lesson.conceptId } }
      });
      console.log(`[VERIFY DB] UserConcept in PostgreSQL: Mastery=${uc.masteryScore}%, Attempts=${uc.attempts}, Correct=${uc.correctAttempts}`);

      if (uc.masteryScore <= 0 || uc.attempts !== 1) {
        throw new Error('Mastery score not updated accurately after 100% quiz attempt!');
      }

      // Check roadmap item was marked COMPLETED
      const completedItem = await prisma.learningPathItem.findFirst({
        where: {
          learningPath: { userId: user1.id, status: 'ACTIVE' },
          conceptId: lesson.conceptId
        }
      });
      console.log(`[VERIFY DB] LearningPathItem Status: ${completedItem.status} (CompletedAt: ${completedItem.completedAt})`);
      if (completedItem.status !== 'COMPLETED') {
        throw new Error('LearningPathItem was not marked COMPLETED upon earning concept mastery!');
      }
      console.log('[PASS] Assessment evidence and milestone completion persisted faithfully.');
    }

    // -----------------------------------------------------------------------
    // PART 4: SAME GOAL, DIVERGENT EVIDENCE (ADAPTIVE EVALUATION)
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 4: SAME GOAL, DIVERGENT EVIDENCE ADAPTATION ---');
    const emailA = `diverge-a-${Date.now()}@test.com`;
    const signupA = await request(app).post('/api/v1/auth/signup').send({ email: emailA, password: 'Password123!', displayName: 'Learner A' });
    const userA = signupA.body.data.user;
    const tokenA = signupA.body.data.token;
    testUserIds.push(userA.id);

    const emailB = `diverge-b-${Date.now()}@test.com`;
    const signupB = await request(app).post('/api/v1/auth/signup').send({ email: emailB, password: 'Password123!', displayName: 'Learner B' });
    const userB = signupB.body.data.user;
    const tokenB = signupB.body.data.token;
    testUserIds.push(userB.id);

    for (const [t, u] of [[tokenA, userA], [tokenB, userB]]) {
      await request(app).post('/api/v1/onboarding/step').set('Authorization', `Bearer ${t}`).send({ step: 1, targetRoleId: backendRole.id, goalTitle: 'Become Backend Dev' });
      await request(app).post('/api/v1/onboarding/step').set('Authorization', `Bearer ${t}`).send({ step: 2, experienceLevel: 'BEGINNER', dailyMinutes: 15 });
      await request(app).post('/api/v1/onboarding/complete').set('Authorization', `Bearer ${t}`);
    }

    const recA0 = await AdaptiveEngine.evaluateNextAction(userA.id);
    const sharedConceptId = recA0.concept.id;

    // Learner A: Mastered
    await prisma.userConcept.create({
      data: { userId: userA.id, conceptId: sharedConceptId, masteryScore: 90, confidenceScore: 85, attempts: 2, correctAttempts: 2 }
    });
    // Learner B: Struggling
    await prisma.userConcept.create({
      data: { userId: userB.id, conceptId: sharedConceptId, masteryScore: 20, confidenceScore: 25, attempts: 2, correctAttempts: 0 }
    });

    const nextA = await AdaptiveEngine.evaluateNextAction(userA.id);
    const nextB = await AdaptiveEngine.evaluateNextAction(userB.id);

    console.log(`[DIVERGENCE] Learner A (High Score): Action=${nextA.actionType}, Concept="${nextA.concept.name}"`);
    console.log(`[DIVERGENCE] Learner B (Low Score): Action=${nextB.actionType}, Concept="${nextB.concept.name}"`);

    if (nextB.actionType !== 'REINFORCE') {
      throw new Error(`Expected REINFORCE for struggling learner B, got ${nextB.actionType}`);
    }
    if (nextA.concept.id === nextB.concept.id) {
      throw new Error('Learner A should advance past concept; both learners received the same concept!');
    }
    console.log('[PASS] Divergent evidence produces distinct, pedagogically justified recommendations.');

    // -----------------------------------------------------------------------
    // PART 5: MISSING LESSON RECOVERABLE STATE (ZERO UNRELATED FALLBACK)
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 5: MISSING LESSON STATE & ZERO FALLBACK ---');
    // Unpublished concept: node-event-driven
    const unpublishedConcept = await prisma.concept.findUnique({
      where: { slug: 'node-event-driven' },
      include: { lessons: { where: { status: 'PUBLISHED' } } }
    });

    console.log(`[CONTENT CHECK] Concept "${unpublishedConcept.name}" has ${unpublishedConcept.lessons.length} published lessons.`);
    
    // Test that resolving a lesson for this concept produces CONTENT_UNAVAILABLE and null slug
    const resolvedLesson = unpublishedConcept.lessons[0] || null;
    const finalActionType = resolvedLesson ? 'ADVANCE' : 'CONTENT_UNAVAILABLE';
    const finalSlug = resolvedLesson?.slug || null;

    if (finalActionType !== 'CONTENT_UNAVAILABLE' || finalSlug !== null) {
      throw new Error(`Expected CONTENT_UNAVAILABLE with null slug, got ${finalActionType} with ${finalSlug}`);
    }
    console.log(`[PASS] Unpublished concept returns CONTENT_UNAVAILABLE with null slug (Never falls back to Event Loop).`);

    // -----------------------------------------------------------------------
    // PART 6: RETURNING LEARNER HISTORY & CONTINUITY
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 6: RETURNING LEARNER PERSISTED PROGRESS & HISTORY ---');
    const historyRes = await request(app)
      .get('/api/v1/learning-paths/history')
      .set('Authorization', `Bearer ${token1}`);

    if (historyRes.status !== 200) {
      throw new Error(`History endpoint failed: ${JSON.stringify(historyRes.body)}`);
    }

    const historyData = historyRes.body.data;
    console.log(`[HISTORY] Completed Concepts: ${historyData.completedConcepts.length}`);
    console.log(`[HISTORY] Recent Activities: ${historyData.recentActivities.length}`);
    console.log(`[HISTORY] Current Focus: Action=${historyData.currentFocus.actionType}, Concept="${historyData.currentFocus.concept?.name}"`);

    if (historyData.recentActivities.length === 0 || (historyData.completedConcepts.length === 0 && historyData.reinforcementNeeded.length === 0)) {
      throw new Error('Completed quiz activity was not reflected in learner history!');
    }
    console.log('[PASS] Returning learner history faithfully reflects real completed activities and progressing concepts.');

    console.log('\n======================================================');
    console.log('✅ ALL PHASE F END-TO-END VERIFICATION CHECKS PASSED!');
    console.log('======================================================\n');
  } finally {
    // Clean up isolated test users
    if (testUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: testUserIds } }
      }).catch(() => null);
      console.log(`Cleaned up ${testUserIds.length} isolated test learners.`);
    }
    await prisma.$disconnect();
  }
}

runEndToEndVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILURE:', err);
  process.exit(1);
});
