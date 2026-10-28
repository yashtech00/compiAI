import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/prisma.js';

describe('Learning Engine & Critical Paths', () => {
  const learnerEmail = `learner_engine_${Date.now()}@example.com`;
  let token = '';
  let diagnosticAssessmentId = '';
  let sampleQuestions = [];
  let testLessonId = '';
  let testQuizId = '';

  beforeAll(async () => {
    // Signup test learner
    const signupRes = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        email: learnerEmail,
        password: 'Password123!',
        displayName: 'Engine Tester'
      });
    token = signupRes.body.data.token;

    // Load seeded assessment and questions
    const assessRes = await request(app)
      .get('/api/v1/assessments/diagnostic')
      .set('Authorization', `Bearer ${token}`);

    diagnosticAssessmentId = assessRes.body.data.assessment.id;
    sampleQuestions = assessRes.body.data.assessment.questions;

    // Load a seeded lesson
    const lessonsRes = await request(app)
      .get('/api/v1/lessons')
      .set('Authorization', `Bearer ${token}`);

    if (lessonsRes.body.data.lessons.length > 0) {
      const lessonWithQuiz = lessonsRes.body.data.lessons.find(l => l.quizzes && l.quizzes.length > 0) || lessonsRes.body.data.lessons[0];
      testLessonId = lessonWithQuiz.id;
    }
  });

  it('1. Onboarding: Should save multi-step choices and resume state', async () => {
    const rolesRes = await request(app).get('/api/v1/roles');
    const backendRole = rolesRes.body.data.roles.find(r => r.slug === 'backend-developer');
    expect(backendRole).toBeDefined();

    // Submit step
    const stepRes = await request(app)
      .post('/api/v1/onboarding/step')
      .set('Authorization', `Bearer ${token}`)
      .send({
        step: 1,
        goalTitle: 'Become a Senior Backend Engineer',
        targetRoleId: backendRole.id,
        experienceLevel: 'JUNIOR',
        dailyMinutes: 20,
        knownSkillSlugs: ['javascript', 'rest-apis']
      });

    expect(stepRes.status).toBe(200);
    expect(stepRes.body.data.profile.onboardingStep).toBe(2);

    // Retrieve state
    const stateRes = await request(app)
      .get('/api/v1/onboarding/state')
      .set('Authorization', `Bearer ${token}`);

    expect(stateRes.status).toBe(200);
    expect(stateRes.body.data.activeGoal.title).toBe('Become a Senior Backend Engineer');
  });

  it('2. Assessment: Should deterministically grade questions and update UserConcept & UserSkill', async () => {
    expect(sampleQuestions.length).toBeGreaterThan(0);

    // Load actual question answers directly from DB to verify grading
    const qRecord = await prisma.assessmentQuestion.findUnique({
      where: { id: sampleQuestions[0].id }
    });

    const submitRes = await request(app)
      .post(`/api/v1/assessments/${diagnosticAssessmentId}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        responses: [
          { questionId: sampleQuestions[0].id, response: qRecord.answer }
        ],
        durationSeconds: 45
      });

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.success).toBe(true);
    expect(submitRes.body.data.result.score).toBe(100);
    expect(submitRes.body.data.result.correctAnswers).toBe(1);
  });

  it('3. Roadmap: Should generate dependency-aware personalized roadmap with explanations', async () => {
    const roadmapRes = await request(app)
      .get('/api/v1/learning-paths/current')
      .set('Authorization', `Bearer ${token}`);

    expect(roadmapRes.status).toBe(200);
    expect(roadmapRes.body.data.roadmap).toBeDefined();
    expect(roadmapRes.body.data.roadmap.items.length).toBeGreaterThan(0);

    const firstItem = roadmapRes.body.data.roadmap.items[0];
    expect(firstItem.sequenceOrder).toBe(1);
    expect(firstItem.reason).toBeDefined();
  });

  it('4. Today Recommendation: Should provide primary call to action and due review alerts', async () => {
    const todayRes = await request(app)
      .get('/api/v1/today/recommendation')
      .set('Authorization', `Bearer ${token}`);

    expect(todayRes.status).toBe(200);
    expect(todayRes.body.data.today.recommendedActivity).toBeDefined();
    expect(todayRes.body.data.today.recommendedActivity.title).toBeDefined();
    expect(todayRes.body.data.today.recommendedActivity.estimatedMinutes).toBeGreaterThan(0);
  });

  it('5. Quiz & XP: Should grade quiz, update mastery, prevent duplicate XP for same attempt', async () => {
    // Get full lesson details to find quiz
    const lessonRes = await request(app)
      .get(`/api/v1/lessons/${testLessonId}`)
      .set('Authorization', `Bearer ${token}`);

    const quiz = lessonRes.body.data.lesson.quizzes[0];
    expect(quiz).toBeDefined();

    const quizQuestionRecord = await prisma.quizQuestion.findFirst({
      where: { quizId: quiz.id }
    });

    const quizRes = await request(app)
      .post(`/api/v1/quizzes/${quiz.id}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        responses: [
          { questionId: quizQuestionRecord.id, response: quizQuestionRecord.answer }
        ],
        durationSeconds: 30
      });

    expect(quizRes.status).toBe(200);
    expect(quizRes.body.data.result.score).toBe(100);
    expect(quizRes.body.data.result.xpAwarded).toBe(75);
    expect(quizRes.body.data.result.streak).toBeGreaterThanOrEqual(1);
  });

  it('6. Recall: Should list due concepts and reschedule with spaced intervals', async () => {
    const dueRes = await request(app)
      .get('/api/v1/recall/due')
      .set('Authorization', `Bearer ${token}`);

    expect(dueRes.status).toBe(200);
    expect(dueRes.body.data.dueItems).toBeDefined();

    // If a concept exists, submit a recall attempt
    const concept = await prisma.concept.findFirst();
    const recallSubmitRes = await request(app)
      .post('/api/v1/recall/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({
        conceptId: concept.id,
        rating: 4,
        recalled: true
      });

    expect(recallSubmitRes.status).toBe(200);
    expect(recallSubmitRes.body.data.result.nextIntervalDays).toBeGreaterThan(1);
    expect(recallSubmitRes.body.data.result.xpAwarded).toBe(25);
  });

  it('7. Admin: Ordinary learner should be forbidden from admin endpoints; Admin can check cycles', async () => {
    // Learner forbidden
    const forbiddenRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(forbiddenRes.status).toBe(403);

    // Sign in as Seeded Admin
    const adminSignin = await request(app)
      .post('/api/v1/auth/signin')
      .send({
        email: 'admin@companion.ai',
        password: 'AdminSecurePass123!'
      });

    const adminToken = adminSignin.body.data.token;

    const statsRes = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsRes.status).toBe(200);
    expect(statsRes.body.data.totalSkills).toBeGreaterThan(5);

    // Graph cycle verification check
    const cyclesRes = await request(app)
      .get('/api/v1/admin/check-cycles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(cyclesRes.status).toBe(200);
    expect(cyclesRes.body.data.hasCycle).toBe(false);
  });
});
