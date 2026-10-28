import bcrypt from 'bcrypt';
import prisma from '../../config/prisma.js';
import { AuditService } from './audit.service.js';
import { AppError } from '../../middlewares/errorHandler.js';

export class AdminStudentsService {
  /**
   * Searchable, filterable, sortable, paginated student directory
   */
  static async listStudents({
    page = 1,
    limit = 15,
    search = '',
    status = null,
    targetRoleId = null,
    sortField = 'createdAt',
    sortOrder = 'desc'
  } = {}) {
    const take = Math.min(100, Math.max(1, Number(limit)));
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const where = {
      role: 'LEARNER'
    };

    if (status) {
      where.status = status;
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      where.OR = [
        { email: { contains: q, mode: 'insensitive' } },
        { profile: { displayName: { contains: q, mode: 'insensitive' } } }
      ];
    }

    if (targetRoleId) {
      where.learningGoals = {
        some: { targetRoleId, status: 'ACTIVE' }
      };
    }

    // Determine order
    const orderBy = [];
    if (sortField === 'displayName') {
      orderBy.push({ profile: { displayName: sortOrder } });
    } else if (sortField === 'email') {
      orderBy.push({ email: sortOrder });
    } else {
      orderBy.push({ createdAt: sortOrder });
    }

    const [total, studentsRaw] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        take,
        skip,
        orderBy,
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
          profile: {
            select: {
              displayName: true,
              experienceLevel: true,
              dailyMinutes: true,
              onboardingCompleted: true
            }
          },
          learningGoals: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: {
              title: true,
              targetRole: { select: { id: true, name: true } }
            }
          },
          learningPaths: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: {
              id: true,
              version: true,
              completionPercentage: true,
              status: true
            }
          },
          streak: {
            select: { currentStreak: true, lastActivityDate: true }
          },
          _count: {
            select: {
              learningSessions: true,
              assessmentAttempts: true
            }
          }
        }
      })
    ]);

    // Format students with aggregated progress
    const students = studentsRaw.map((s) => ({
      id: s.id,
      email: s.email,
      displayName: s.profile?.displayName || 'Learner',
      experienceLevel: s.profile?.experienceLevel || 'BEGINNER',
      status: s.status,
      createdAt: s.createdAt,
      onboardingCompleted: s.profile?.onboardingCompleted || false,
      careerGoal: s.learningGoals?.[0]?.targetRole?.name || s.learningGoals?.[0]?.title || 'Undecided',
      currentRoadmapVersion: s.learningPaths?.[0]?.version || 0,
      roadmapProgress: s.learningPaths?.[0]?.completionPercentage || 0,
      totalSessions: s._count?.learningSessions || 0,
      totalAssessments: s._count?.assessmentAttempts || 0,
      currentStreak: s.streak?.currentStreak || 0,
      lastActiveAt: s.streak?.lastActivityDate || null
    }));

    return {
      total,
      page: Number(page),
      limit: take,
      totalPages: Math.ceil(total / take),
      students
    };
  }

  /**
   * Retrieves deep student intelligence profile
   */
  static async getStudentDetail(studentId) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: {
        profile: true,
        streak: true,
        learningGoals: {
          include: { targetRole: true },
          orderBy: { createdAt: 'desc' }
        },
        learningPaths: {
          include: {
            items: {
              include: { concept: true },
              orderBy: { sequenceOrder: 'asc' }
            },
            roadmapVersions: {
              select: { id: true, versionNumber: true, createdAt: true, triggerSource: true, changeReason: true },
              orderBy: { versionNumber: 'asc' }
            }
          },
          orderBy: { version: 'desc' }
        },
        userSkills: {
          include: { skill: true },
          orderBy: { masteryScore: 'desc' }
        },
        assessmentAttempts: {
          include: {
            assessment: true,
            responses: { take: 5 }
          },
          orderBy: { startedAt: 'desc' },
          take: 10
        },
        learningSessions: {
          include: {
            lesson: { select: { id: true, title: true, slug: true, difficulty: true } },
            quizAttempt: { select: { id: true, score: true } }
          },
          orderBy: { startedAt: 'desc' },
          take: 15
        },
        learningActivities: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!student) {
      throw new AppError('Student account not found', 404, 'NOT_FOUND');
    }

    // Active roadmap & history
    const activePath = student.learningPaths.find(p => p.status === 'ACTIVE') || student.learningPaths[0] || null;
    const allVersions = student.learningPaths.map(p => ({
      id: p.id,
      version: p.version,
      status: p.status,
      title: p.title,
      targetGoal: p.targetGoal,
      completionPercentage: p.completionPercentage,
      analysisType: p.analysisType,
      triggerReason: p.triggerReason,
      itemCount: p.items.length,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));

    // Build unified chronological activity timeline
    const timeline = [];

    // Onboarding event
    timeline.push({
      id: 'reg',
      type: 'ACCOUNT_CREATED',
      title: 'Joined AI Learning Companion',
      timestamp: student.createdAt,
      details: `Account registered via ${student.authProvider}`
    });

    if (student.profile?.onboardingCompleted) {
      timeline.push({
        id: 'onboard',
        type: 'ONBOARDING_COMPLETED',
        title: 'Completed Diagnostic Onboarding',
        timestamp: student.profile.updatedAt,
        details: `Configured ${student.profile.dailyMinutes}m/day pacing, ${student.profile.experienceLevel} track`
      });
    }

    // Roadmaps
    for (const p of student.learningPaths) {
      timeline.push({
        id: `path_${p.id}`,
        type: 'ROADMAP_GENERATED',
        title: `Roadmap Version ${p.version} Activated`,
        timestamp: p.createdAt,
        details: `${p.title} (${p.triggerReason || 'Adaptive progression'})`
      });
    }

    // Sessions
    for (const s of student.learningSessions) {
      timeline.push({
        id: `sess_${s.id}`,
        type: 'LEARNING_SESSION',
        title: `${s.status === 'COMPLETED' ? 'Completed' : 'Started'} Lesson: ${s.lesson?.title || 'Learning Module'}`,
        timestamp: s.completedAt || s.startedAt,
        details: `Duration: ${Math.round((s.durationSeconds || 0) / 60)} mins${s.quizAttempt ? ` | Quiz Score: ${s.quizAttempt.score}%` : ''}`
      });
    }

    // Assessments
    for (const a of student.assessmentAttempts) {
      timeline.push({
        id: `assess_${a.id}`,
        type: 'ASSESSMENT_COMPLETED',
        title: `Diagnostic Assessment (${a.assessment?.title || 'Diagnostic'})`,
        timestamp: a.completedAt || a.startedAt,
        details: `Score: ${a.score}%`
      });
    }

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      student: {
        id: student.id,
        email: student.email,
        role: student.role,
        status: student.status,
        createdAt: student.createdAt,
        profile: student.profile,
        streak: student.streak,
        activeGoal: student.learningGoals.find(g => g.status === 'ACTIVE') || null
      },
      skills: student.userSkills.map(us => ({
        id: us.id,
        name: us.skill.name,
        category: us.skill.category,
        masteryScore: us.masteryScore,
        confidenceScore: us.confidenceScore,
        lastPracticedAt: us.lastPracticedAt
      })),
      activeRoadmap: activePath,
      roadmapVersions: allVersions,
      sessions: student.learningSessions,
      assessments: student.assessmentAttempts,
      timeline: timeline.slice(0, 30)
    };
  }

  /**
   * Creates a student account with validation, password hashing, and audit logging
   */
  static async createStudent({
    email,
    password,
    displayName,
    targetRoleId = null,
    experienceLevel = 'BEGINNER',
    dailyMinutes = 15
  }, adminUser, req) {
    const cleanEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });
    if (existing) {
      throw new AppError('An account with this email address already exists', 400, 'CONFLICT');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newStudent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: 'LEARNER',
          status: 'ACTIVE',
          profile: {
            create: {
              displayName: displayName || 'New Learner',
              experienceLevel,
              dailyMinutes: Number(dailyMinutes) || 15,
              onboardingCompleted: false,
              onboardingStep: 1
            }
          },
          streak: {
            create: {
              currentStreak: 0,
              longestStreak: 0
            }
          }
        },
        include: { profile: true }
      });

      if (targetRoleId) {
        const role = await tx.targetRole.findUnique({ where: { id: targetRoleId } });
        if (role) {
          await tx.learningGoal.create({
            data: {
              userId: user.id,
              targetRoleId: role.id,
              title: `${role.name} Competency`,
              status: 'ACTIVE'
            }
          });
        }
      }

      return user;
    });

    await AuditService.logAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'STUDENT_CREATE',
      entityType: 'USER',
      entityId: newStudent.id,
      details: { email: cleanEmail, displayName, experienceLevel },
      outcome: 'SUCCESS',
      req
    });

    return newStudent;
  }

  /**
   * Updates student profile fields with audit trail
   */
  static async updateStudent(studentId, updateData, adminUser, req) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      include: { profile: true }
    });
    if (!student) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (updateData.status && ['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(updateData.status)) {
        await tx.user.update({
          where: { id: studentId },
          data: { status: updateData.status }
        });
      }

      const profileData = {};
      if (updateData.displayName) profileData.displayName = updateData.displayName.trim();
      if (updateData.experienceLevel) profileData.experienceLevel = updateData.experienceLevel;
      if (updateData.dailyMinutes) profileData.dailyMinutes = Number(updateData.dailyMinutes);

      if (Object.keys(profileData).length > 0) {
        await tx.userProfile.update({
          where: { userId: studentId },
          data: profileData
        });
      }

      return await tx.user.findUnique({
        where: { id: studentId },
        include: { profile: true }
      });
    });

    await AuditService.logAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'STUDENT_UPDATE',
      entityType: 'USER',
      entityId: studentId,
      details: { before: student.profile, changes: updateData },
      outcome: 'SUCCESS',
      req
    });

    return updated;
  }

  /**
   * Safely updates student status (deactivate / reactivate)
   */
  static async setStudentStatus(studentId, status, adminUser, req) {
    if (!['ACTIVE', 'SUSPENDED', 'DEACTIVATED'].includes(status)) {
      throw new AppError('Invalid status value', 400, 'BAD_REQUEST');
    }

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.user.update({
      where: { id: studentId },
      data: { status }
    });

    await AuditService.logAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: status === 'ACTIVE' ? 'STUDENT_REACTIVATE' : 'STUDENT_DEACTIVATE',
      entityType: 'USER',
      entityId: studentId,
      details: { previousStatus: student.status, newStatus: status },
      outcome: 'SUCCESS',
      req
    });

    return updated;
  }

  /**
   * Safely deletes student with cascade protection and audit logging
   */
  static async deleteStudent(studentId, adminUser, req) {
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, email: true, role: true }
    });

    if (!student) {
      throw new AppError('Student not found', 404, 'NOT_FOUND');
    }

    if (student.role === 'ADMIN') {
      throw new AppError('Cannot delete an administrator account', 403, 'FORBIDDEN');
    }

    await prisma.user.delete({
      where: { id: studentId }
    });

    await AuditService.logAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'STUDENT_DELETE',
      entityType: 'USER',
      entityId: studentId,
      details: { deletedEmail: student.email },
      outcome: 'SUCCESS',
      req
    });

    return { success: true, message: `Student account ${student.email} deleted.` };
  }

  /**
   * Bulk actions for students (deactivate, reactivate, export data)
   */
  static async bulkAction({ studentIds, action, value }, adminUser, req) {
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw new AppError('No students selected for bulk operation', 400, 'BAD_REQUEST');
    }

    let affectedCount = 0;
    if (action === 'STATUS_CHANGE') {
      const result = await prisma.user.updateMany({
        where: {
          id: { in: studentIds },
          role: 'LEARNER'
        },
        data: { status: value }
      });
      affectedCount = result.count;
    }

    await AuditService.logAction({
      actorId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'BULK_ACTION',
      entityType: 'USER',
      details: { action, studentIdsCount: studentIds.length, affectedCount, value },
      outcome: 'SUCCESS',
      req
    });

    return { affectedCount };
  }
}
