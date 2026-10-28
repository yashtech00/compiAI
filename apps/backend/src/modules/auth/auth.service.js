import bcrypt from 'bcrypt';
import prisma from '../../config/prisma.js';
import { AppError } from '../../middlewares/errorHandler.js';

export class AuthService {
  static async signup({ email, password, displayName }) {
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (existing) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          role: 'LEARNER',
          status: 'ACTIVE',
          profile: {
            create: {
              displayName,
              experienceLevel: 'BEGINNER',
              dailyMinutes: 15,
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
        include: {
          profile: true,
          streak: true
        }
      });

      // Default Free Plan Subscription
      const freePlan = await tx.subscriptionPlan.findUnique({
        where: { code: 'FREE' }
      });

      if (freePlan) {
        await tx.subscription.create({
          data: {
            userId: newUser.id,
            planId: freePlan.id,
            provider: 'MANUAL',
            status: 'ACTIVE'
          }
        });
      }

      return newUser;
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async signin({ email, password }) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        profile: true,
        streak: true,
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1
        }
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        streak: true,
        learningGoals: {
          where: { status: 'ACTIVE' },
          include: { targetRole: true },
          take: 1
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: { plan: true },
          take: 1
        }
      }
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  static async updateProfile(userId, updateData) {
    const updated = await prisma.userProfile.update({
      where: { userId },
      data: updateData
    });

    return updated;
  }
}
