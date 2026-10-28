import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

export async function seedAdmin() {
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@gmail.com').toLowerCase().trim();
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin12345';
  const adminName = process.env.ADMIN_NAME || 'Platform Administrator';

  console.log(`Checking bootstrap administrator: ${adminEmail}...`);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  let adminUser;
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        profile: {
          create: {
            displayName: adminName,
            experienceLevel: 'ADVANCED',
            dailyMinutes: 30,
            onboardingCompleted: true,
            onboardingStep: 5
          }
        },
        streak: {
          create: {
            currentStreak: 1,
            longestStreak: 1
          }
        }
      }
    });
    console.log(`Created bootstrap admin: ${adminEmail}`);

    await prisma.auditLog.create({
      data: {
        actorId: adminUser.id,
        actorEmail: adminEmail,
        action: 'BOOTSTRAP_ADMIN_SEED',
        entityType: 'USER',
        entityId: adminUser.id,
        details: { message: 'Initial development administrator provisioned' },
        outcome: 'SUCCESS'
      }
    });
  } else {
    // Synchronize role as ADMIN and ensure password matches adminPassword
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    adminUser = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordHash
      }
    });
    console.log(`Administrator account refreshed: ${adminEmail} (role ADMIN, password synchronized)`);
  }

  // Ensure test admin admin@companion.ai exists for test suites
  const testAdmin = await prisma.user.findUnique({ where: { email: 'admin@companion.ai' } });
  const testHash = await bcrypt.hash('AdminSecurePass123!', 10);
  if (!testAdmin) {
    await prisma.user.create({
      data: {
        email: 'admin@companion.ai',
        passwordHash: testHash,
        role: 'ADMIN',
        status: 'ACTIVE',
        profile: {
          create: {
            displayName: 'Companion Test Admin',
            experienceLevel: 'ADVANCED',
            dailyMinutes: 30,
            onboardingCompleted: true,
            onboardingStep: 5
          }
        }
      }
    });
  } else {
    await prisma.user.update({
      where: { email: 'admin@companion.ai' },
      data: { role: 'ADMIN', status: 'ACTIVE', passwordHash: testHash }
    });
  }

  // Seed default system settings if not present
  const defaultSettings = [
    {
      key: 'platform_maintenance_mode',
      value: { enabled: false, message: 'Platform is operating normally.' },
      description: 'Controls public access and displays maintenance banner.'
    },
    {
      key: 'ai_roadmap_generation_mode',
      value: { provider: 'gemini', maxRetries: 3, temperature: 0.2, fallbackToDeterministic: true },
      description: 'Configures LLM parameters and fallback thresholds for path synthesis.'
    },
    {
      key: 'learning_session_duration_mins',
      value: { default: 15, min: 5, max: 60 },
      description: 'Target daily time commitment guidelines for new learners.'
    },
    {
      key: 'adaptive_review_interval_days',
      value: { miniReviewSessions: 3, fullReviewDays: 7, longTermDays: 30 },
      description: 'Trigger cadences for adaptive path re-evaluation.'
    }
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedBy: adminUser.id
      }
    });
  }

  // Seed historical RoadmapVersion records for all existing LearningPaths if they don't have one
  const learningPaths = await prisma.learningPath.findMany({
    include: {
      items: {
        include: { concept: true },
        orderBy: { sequenceOrder: 'asc' }
      },
      roadmapVersions: true
    }
  });

  let backfilledVersions = 0;
  for (const path of learningPaths) {
    if (path.roadmapVersions.length === 0) {
      await prisma.roadmapVersion.create({
        data: {
          learningPathId: path.id,
          userId: path.userId,
          versionNumber: path.version,
          snapshot: {
            id: path.id,
            title: path.title,
            targetGoal: path.targetGoal,
            pedagogicalApproach: path.pedagogicalApproach,
            status: path.status,
            version: path.version,
            items: path.items.map(i => ({
              id: i.id,
              conceptId: i.conceptId,
              conceptName: i.concept?.name,
              milestoneId: i.milestoneId,
              title: i.title,
              targetOutcome: i.targetOutcome,
              sequenceOrder: i.sequenceOrder,
              status: i.status,
              reason: i.reason,
              completedAt: i.completedAt
            }))
          },
          triggerSource: path.analysisType || 'INITIAL_AI_SYNTHESIS',
          changeReason: path.triggerReason || 'Initial learning path generated',
          structuredDiff: {
            action: path.version === 1 ? 'INITIAL_CREATION' : 'REVISION',
            topicCount: path.items.length
          },
          modelMetadata: (path.evidenceSummary && typeof path.evidenceSummary === 'object') ? path.evidenceSummary : {}
        }
      });
      backfilledVersions++;
    }
  }
  if (backfilledVersions > 0) {
    console.log(`Backfilled ${backfilledVersions} immutable RoadmapVersion snapshots.`);
  }

  console.log('Admin bootstrap and system settings complete.');
  return adminUser;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedAdmin()
    .catch((err) => {
      console.error('Seed admin failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
