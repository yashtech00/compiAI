import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { CURATED_LESSONS } from '../src/content/catalogue.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Subscription Plans
  console.log('Seeding subscription plans...');
  await prisma.subscriptionPlan.upsert({
    where: { code: 'FREE' },
    update: {},
    create: {
      name: 'Free Starter',
      code: 'FREE',
      monthlyPrice: 0,
      annualPrice: 0,
      currency: 'USD',
      features: [
        'Daily 10-15 minute learning session',
        'Initial skill diagnostic assessment',
        'Personalized roadmap view',
        'Core quiz evaluations',
        'Basic progress analytics'
      ],
      status: 'ACTIVE'
    }
  });

  await prisma.subscriptionPlan.upsert({
    where: { code: 'PRO' },
    update: {},
    create: {
      name: 'Pro Engineer',
      code: 'PRO',
      monthlyPrice: 19.0,
      annualPrice: 190.0,
      currency: 'USD',
      features: [
        'Unlimited daily learning sessions',
        'AI Socratic Tutor with lesson context',
        'Explain-Back AI Rubric Evaluation',
        'Spaced Repetition & Recall Queue',
        'Deep skill analytics & gap diagnostics',
        'Dynamic adaptive roadmap updates'
      ],
      status: 'ACTIVE'
    }
  });

  // 2. Achievements
  console.log('Seeding achievements...');
  const achievements = [
    { code: 'FIRST_STEP', name: 'First Step', description: 'Complete your first learning session', xp: 50, icon: 'Flag' },
    { code: 'QUIZ_ACE', name: 'Quiz Ace', description: 'Score 100% on a lesson quiz', xp: 100, icon: 'Award' },
    { code: 'THREE_DAY_STREAK', name: 'Consistent Learner', description: 'Maintain a 3-day learning streak', xp: 150, icon: 'Flame' },
    { code: 'EXPLAIN_MASTER', name: 'Deep Thinker', description: 'Complete an explain-back assessment', xp: 100, icon: 'Brain' },
    { code: 'SKILL_PRO', name: 'Skill Mastery', description: 'Achieve 80%+ mastery in any core skill', xp: 250, icon: 'CheckCircle' }
  ];

  for (const ach of achievements) {
    await prisma.achievement.upsert({
      where: { code: ach.code },
      update: ach,
      create: ach
    });
  }

  // 3. Admin Account
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@companion.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  console.log(`Seeding admin account: ${adminEmail}...`);
  const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE'
    },
    create: {
      email: adminEmail,
      passwordHash: adminPasswordHash,
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
          currentStreak: 5,
          longestStreak: 12
        }
      }
    }
  });

  // 4. Target Roles
  console.log('Seeding target roles...');
  const rolesData = [
    {
      name: 'Backend Developer',
      slug: 'backend-developer',
      description: 'Designs server-side logic, high-performance APIs, database architectures, and distributed systems.'
    },
    {
      name: 'Full Stack Developer',
      slug: 'full-stack-developer',
      description: 'Builds end-to-end web applications with modern frontend frameworks and robust backend services.'
    },
    {
      name: 'Frontend Developer',
      slug: 'frontend-developer',
      description: 'Creates responsive, accessible, and high-performance user interfaces and web applications.'
    },
    {
      name: 'AI Engineer',
      slug: 'ai-engineer',
      description: 'Builds AI-powered applications, prompt pipelines, RAG systems, and integrates LLM APIs into production.'
    },
    {
      name: 'DevOps / Cloud Engineer',
      slug: 'devops-engineer',
      description: 'Automates deployments, containerization, cloud infrastructure, and CI/CD pipelines.'
    },
    {
      name: 'Software Engineer (Generalist)',
      slug: 'software-engineer',
      description: 'Solves core algorithmic, system architecture, and software development problems.'
    }
  ];

  const roleMap = {};
  for (const role of rolesData) {
    const saved = await prisma.targetRole.upsert({
      where: { slug: role.slug },
      update: role,
      create: role
    });
    roleMap[role.slug] = saved;
  }

  // 5. Skills & Categories
  console.log('Seeding skills...');
  const skillsData = [
    { name: 'JavaScript', slug: 'javascript', category: 'Languages', difficulty: 1, description: 'Core asynchronous web programming language' },
    { name: 'TypeScript', slug: 'typescript', category: 'Languages', difficulty: 2, description: 'Static typing and robust type-system for JavaScript' },
    { name: 'React', slug: 'react', category: 'Frontend', difficulty: 2, description: 'Component-based UI architecture and state management' },
    { name: 'Node.js', slug: 'nodejs', category: 'Backend', difficulty: 2, description: 'Event-driven server-side runtime for JavaScript' },
    { name: 'REST APIs', slug: 'rest-apis', category: 'Backend', difficulty: 1, description: 'HTTP verbs, RESTful resource design, and status codes' },
    { name: 'SQL & PostgreSQL', slug: 'postgresql', category: 'Databases', difficulty: 2, description: 'Relational database schema design, indexing, and SQL queries' },
    { name: 'MongoDB', slug: 'mongodb', category: 'Databases', difficulty: 2, description: 'Document databases, flexible schema design, and aggregation pipelines' },
    { name: 'Redis', slug: 'redis', category: 'Databases', difficulty: 2, description: 'In-memory caching, key-value stores, and pub/sub patterns' },
    { name: 'Docker', slug: 'docker', category: 'DevOps', difficulty: 2, description: 'Containerization, Dockerfiles, and container orchestration basics' },
    { name: 'Git', slug: 'git', category: 'DevOps', difficulty: 1, description: 'Distributed version control, branching, and team workflows' },
    { name: 'Cloud Fundamentals', slug: 'cloud-fundamentals', category: 'DevOps', difficulty: 2, description: 'Compute, storage, VPC networking, and cloud services' },
    { name: 'System Design', slug: 'system-design', category: 'Architecture', difficulty: 3, description: 'Scalability, load balancing, caching tiers, and microservices' },
    { name: 'AI Engineering Fundamentals', slug: 'ai-engineering', category: 'AI', difficulty: 3, description: 'LLM APIs, prompt engineering, embeddings, and RAG architectures' }
  ];

  const skillMap = {};
  for (const s of skillsData) {
    const saved = await prisma.skill.upsert({
      where: { slug: s.slug },
      update: s,
      create: s
    });
    skillMap[s.slug] = saved;
  }

  // 6. Skill Prerequisites
  console.log('Seeding skill prerequisites...');
  const skillPrereqs = [
    { skill: 'typescript', prereq: 'javascript' },
    { skill: 'react', prereq: 'javascript' },
    { skill: 'nodejs', prereq: 'javascript' },
    { skill: 'nodejs', prereq: 'rest-apis' },
    { skill: 'system-design', prereq: 'postgresql' },
    { skill: 'system-design', prereq: 'redis' },
    { skill: 'cloud-fundamentals', prereq: 'docker' },
    { skill: 'ai-engineering', prereq: 'rest-apis' }
  ];

  for (const sp of skillPrereqs) {
    const skillId = skillMap[sp.skill]?.id;
    const prereqId = skillMap[sp.prereq]?.id;
    if (skillId && prereqId) {
      await prisma.skillPrerequisite.upsert({
        where: {
          skillId_prerequisiteSkillId: {
            skillId,
            prerequisiteSkillId: prereqId
          }
        },
        update: {},
        create: {
          skillId,
          prerequisiteSkillId: prereqId,
          strength: 2
        }
      });
    }
  }

  // 7. Role-Skill Mappings
  console.log('Seeding role skills...');
  const roleSkillMappings = [
    { role: 'backend-developer', skills: ['javascript', 'nodejs', 'rest-apis', 'postgresql', 'redis', 'docker', 'system-design'] },
    { role: 'full-stack-developer', skills: ['javascript', 'typescript', 'react', 'nodejs', 'rest-apis', 'postgresql', 'git'] },
    { role: 'frontend-developer', skills: ['javascript', 'typescript', 'react', 'git', 'rest-apis'] },
    { role: 'ai-engineer', skills: ['javascript', 'rest-apis', 'ai-engineering', 'postgresql', 'system-design'] },
    { role: 'devops-engineer', skills: ['git', 'docker', 'cloud-fundamentals', 'system-design'] },
    { role: 'software-engineer', skills: ['javascript', 'git', 'postgresql', 'system-design', 'rest-apis'] }
  ];

  for (const rsm of roleSkillMappings) {
    const roleId = roleMap[rsm.role]?.id;
    if (roleId) {
      for (const sSlug of rsm.skills) {
        const skillId = skillMap[sSlug]?.id;
        if (skillId) {
          await prisma.roleSkill.upsert({
            where: {
              targetRoleId_skillId: {
                targetRoleId: roleId,
                skillId
              }
            },
            update: { requiredLevel: 75, importance: 4 },
            create: {
              targetRoleId: roleId,
              skillId,
              requiredLevel: 75,
              importance: 4
            }
          });
        }
      }
    }
  }

  // 8. Concepts
  console.log('Seeding concepts...');
  const conceptsData = [
    // JavaScript
    { skill: 'javascript', name: 'Closures & Lexical Scope', slug: 'js-closures', difficulty: 'BEGINNER', order: 1, desc: 'Functions retaining access to variables from their lexical scope across execution contexts.' },
    { skill: 'javascript', name: 'Promises & Async/Await', slug: 'js-async-await', difficulty: 'BEGINNER', order: 2, desc: 'Managing asynchronous operations, error handling, and sequential vs parallel execution.' },
    { skill: 'javascript', name: 'Event Loop & Concurrency', slug: 'js-event-loop', difficulty: 'INTERMEDIATE', order: 3, desc: 'How JavaScript handles single-threaded asynchronous execution with microtask and macrotask queues.' },

    // Node.js
    { skill: 'nodejs', name: 'Event-Driven Architecture', slug: 'node-event-driven', difficulty: 'BEGINNER', order: 1, desc: 'Using EventEmitters and non-blocking I/O primitives in Node.js.' },
    { skill: 'nodejs', name: 'Express Middleware Pattern', slug: 'node-middleware', difficulty: 'BEGINNER', order: 2, desc: 'Composing request-response pipelines with authentication, validation, and error middlewares.' },
    { skill: 'nodejs', name: 'Streams & Buffer Management', slug: 'node-streams', difficulty: 'ADVANCED', order: 3, desc: 'Processing large files and data chunks with memory-efficient readable/writable streams.' },

    // REST APIs
    { skill: 'rest-apis', name: 'RESTful Resource Design', slug: 'rest-resource-design', difficulty: 'BEGINNER', order: 1, desc: 'Designing intuitive URIs, selecting correct HTTP verbs (GET, POST, PUT, DELETE, PATCH), and status codes.' },
    { skill: 'rest-apis', name: 'Idempotency & Safe Methods', slug: 'rest-idempotency', difficulty: 'INTERMEDIATE', order: 2, desc: 'Ensuring safe retry behavior using idempotency keys and understanding idempotent HTTP methods.' },

    // SQL & PostgreSQL
    { skill: 'postgresql', name: 'Relational Joins & Foreign Keys', slug: 'sql-joins-fks', difficulty: 'BEGINNER', order: 1, desc: 'Connecting related tables, maintaining referential integrity, and performing INNER/LEFT/FULL joins.' },
    { skill: 'postgresql', name: 'B-Tree Indexing Strategies', slug: 'sql-indexing', difficulty: 'INTERMEDIATE', order: 2, desc: 'Accelerating query lookups, composite indexes, and understanding query execution plans (EXPLAIN ANALYZE).' },
    { skill: 'postgresql', name: 'ACID Transactions & Isolation', slug: 'sql-acid-transactions', difficulty: 'ADVANCED', order: 3, desc: 'Atomic data modifications, rollback handling, and transaction isolation levels.' },

    // Redis
    { skill: 'redis', name: 'In-Memory Key-Value Caching', slug: 'redis-caching-basics', difficulty: 'BEGINNER', order: 1, desc: 'Storing key-value pairs with TTL (Time-To-Live) expiration to offload database reads.' },
    { skill: 'redis', name: 'Cache Invalidation Strategies', slug: 'redis-cache-invalidation', difficulty: 'INTERMEDIATE', order: 2, desc: 'Cache-aside, write-through, write-behind, and solving cache stampedes.' },

    // System Design
    { skill: 'system-design', name: 'Horizontal Scaling & Load Balancing', slug: 'sd-load-balancing', difficulty: 'INTERMEDIATE', order: 1, desc: 'Distributing incoming web traffic across stateless worker instances using Layer 4 and Layer 7 load balancers.' },
    { skill: 'system-design', name: 'Multi-Tier Caching Architecture', slug: 'sd-caching-tiers', difficulty: 'ADVANCED', order: 2, desc: 'Designing browser, CDN, reverse proxy, and application cache tiers for high availability.' },

    // AI Engineering
    { skill: 'ai-engineering', name: 'Prompt Engineering & Few-Shot Learning', slug: 'ai-prompt-engineering', difficulty: 'BEGINNER', order: 1, desc: 'Crafting effective system prompts, role constraints, structured output enforcement, and few-shot examples.' },
    { skill: 'ai-engineering', name: 'Embeddings & Vector Search', slug: 'ai-embeddings-search', difficulty: 'INTERMEDIATE', order: 2, desc: 'Transforming text into high-dimensional semantic vectors and computing cosine similarity.' },
    { skill: 'ai-engineering', name: 'RAG (Retrieval-Augmented Generation)', slug: 'ai-rag-architecture', difficulty: 'ADVANCED', order: 3, desc: 'Retrieving relevant contextual documents to ground LLM generation and minimize hallucinations.' }
  ];

  const conceptMap = {};
  for (const c of conceptsData) {
    const skillId = skillMap[c.skill]?.id;
    if (skillId) {
      const saved = await prisma.concept.upsert({
        where: { slug: c.slug },
        update: {
          name: c.name,
          skillId,
          description: c.desc,
          difficulty: c.difficulty,
          orderIndex: c.order
        },
        create: {
          name: c.name,
          slug: c.slug,
          skillId,
          description: c.desc,
          difficulty: c.difficulty,
          orderIndex: c.order
        }
      });
      conceptMap[c.slug] = saved;
    }
  }

  // 9. Concept Prerequisites
  console.log('Seeding concept prerequisites...');
  const conceptPrereqs = [
    { concept: 'js-async-await', prereq: 'js-closures' },
    { concept: 'js-event-loop', prereq: 'js-async-await' },
    { concept: 'node-middleware', prereq: 'js-async-await' },
    { concept: 'rest-idempotency', prereq: 'rest-resource-design' },
    { concept: 'sql-indexing', prereq: 'sql-joins-fks' },
    { concept: 'sql-acid-transactions', prereq: 'sql-indexing' },
    { concept: 'redis-cache-invalidation', prereq: 'redis-caching-basics' },
    { concept: 'sd-caching-tiers', prereq: 'redis-cache-invalidation' },
    { concept: 'sd-caching-tiers', prereq: 'sd-load-balancing' },
    { concept: 'ai-rag-architecture', prereq: 'ai-embeddings-search' },
    { concept: 'ai-embeddings-search', prereq: 'ai-prompt-engineering' }
  ];

  for (const cp of conceptPrereqs) {
    const conceptId = conceptMap[cp.concept]?.id;
    const prereqId = conceptMap[cp.prereq]?.id;
    if (conceptId && prereqId) {
      await prisma.conceptPrerequisite.upsert({
        where: {
          conceptId_prerequisiteConceptId: {
            conceptId,
            prerequisiteConceptId: prereqId
          }
        },
        update: {},
        create: {
          conceptId,
          prerequisiteConceptId: prereqId,
          strength: 2
        }
      });
    }
  }

  // 10. Initial Assessment & Questions
  console.log('Seeding diagnostic assessment...');
  const assessment = await prisma.assessment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      title: 'Full-Stack & Backend Engineering Diagnostic',
      type: 'INITIAL',
      difficulty: 'ADAPTIVE',
      status: 'ACTIVE'
    }
  });

  const diagnosticQuestions = [
    {
      conceptSlug: 'js-event-loop',
      type: 'MCQ',
      text: 'What is the console output order of the following code?\n```js\nconsole.log("A");\nsetTimeout(() => console.log("B"), 0);\nPromise.resolve().then(() => console.log("C"));\nconsole.log("D");\n```',
      options: ['A, B, C, D', 'A, D, C, B', 'A, D, B, C', 'A, C, D, B'],
      answer: 'A, D, C, B',
      explanation: 'Synchronous code executes first (A, D). Then the microtask queue (Promise callbacks) empties before macrotasks (setTimeout callback).',
      difficulty: 2
    },
    {
      conceptSlug: 'js-async-await',
      type: 'MCQ',
      text: 'What happens if an unhandled promise rejection occurs in modern Node.js?',
      options: [
        'Node.js ignores it silently',
        'The process logs a warning and exits with a non-zero code by default',
        'It automatically retries the operation 3 times',
        'It converts the rejection into an empty null value'
      ],
      answer: 'The process logs a warning and exits with a non-zero code by default',
      explanation: 'Modern Node.js crashes the process with a non-zero status code when an unhandled rejection occurs to prevent corrupted state.',
      difficulty: 2
    },
    {
      conceptSlug: 'rest-idempotency',
      type: 'MCQ',
      text: 'Which of the following HTTP methods is NOT idempotent according to RFC 7231?',
      options: ['GET', 'PUT', 'DELETE', 'POST'],
      answer: 'POST',
      explanation: 'POST is non-idempotent because multiple identical requests can create multiple distinct resources.',
      difficulty: 1
    },
    {
      conceptSlug: 'sql-indexing',
      type: 'MCQ',
      text: 'On a table with a composite B-Tree index on (tenant_id, created_at, status), which WHERE clause CANNOT use this index effectively?',
      options: [
        'WHERE tenant_id = 42 AND created_at > NOW()',
        'WHERE tenant_id = 42',
        'WHERE created_at > NOW() AND status = "ACTIVE"',
        'WHERE tenant_id = 42 AND created_at = NOW() AND status = "ACTIVE"'
      ],
      answer: 'WHERE created_at > NOW() AND status = "ACTIVE"',
      explanation: 'B-Tree composite indexes require matching from the leftmost prefix (tenant_id). Queries omitting tenant_id cannot traverse the index tree efficiently.',
      difficulty: 3
    },
    {
      conceptSlug: 'redis-cache-invalidation',
      type: 'MCQ',
      text: 'What is the primary risk of using the "Cache-Aside" pattern under heavy concurrent write loads?',
      options: [
        'Race conditions where stale data read from the DB overwrites newer cache entries',
        'Complete disk corruption in Redis',
        'Automatic dropping of foreign keys in SQL',
        'Increased CPU usage on the DNS server'
      ],
      answer: 'Race conditions where stale data read from the DB overwrites newer cache entries',
      explanation: 'Without cache invalidation locking or versioning, an overlapping concurrent read-and-write can write stale data back into the cache.',
      difficulty: 3
    },
    {
      conceptSlug: 'ai-prompt-engineering',
      type: 'MCQ',
      text: 'When prompting an LLM to produce JSON responses for backend consumption, what is the best practice?',
      options: [
        'Ask casually in conversational tone and hope for the best',
        'Provide the exact JSON schema, strict validation instructions, and few-shot examples',
        'Pass the text through a regex that replaces all quotes',
        'Use only uppercase letters in the prompt'
      ],
      answer: 'Provide the exact JSON schema, strict validation instructions, and few-shot examples',
      explanation: 'Structured outputs with explicit schemas, system constraints, and few-shot demonstrations maximize output reliability.',
      difficulty: 1
    }
  ];

  await prisma.assessmentQuestion.deleteMany({ where: { assessmentId: assessment.id } });

  for (const q of diagnosticQuestions) {
    const conceptId = conceptMap[q.conceptSlug]?.id;
    await prisma.assessmentQuestion.create({
      data: {
        assessmentId: assessment.id,
        conceptId,
        questionType: q.type,
        questionText: q.text,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        difficulty: q.difficulty
      }
    });
  }

  // 11. Curated Lessons with Activities & Quizzes
  console.log('Seeding curated lessons and quizzes...');
  const lessonsData = [
    {
      conceptSlug: 'js-event-loop',
      title: 'Mastering the JavaScript Event Loop',
      slug: 'mastering-the-javascript-event-loop',
      objective: 'Understand the Call Stack, Web APIs, Microtask Queue, and Macrotask Queue in modern JavaScript runtimes.',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 12,
      content: `## The JavaScript Concurrency Model

JavaScript is a **single-threaded**, non-blocking runtime. It runs code sequentially on a single **Call Stack**.

### How Asynchronous Code Runs

When you execute asynchronous operations like \`setTimeout\`, \`fetch\`, or file system calls:
1. The call stack hands off the operation to background worker threads (C++ Web APIs or libuv).
2. Once the operation finishes, its callback is placed into a queue:
   - **Microtask Queue:** \`Promise.then\`, \`queueMicrotask\`, \`process.nextTick\`
   - **Macrotask Queue:** \`setTimeout\`, \`setInterval\`, \`setImmediate\`, I/O callbacks
3. The **Event Loop** continuously checks if the Call Stack is empty.
4. When empty, it drains **ALL** microtasks first, before picking the next single macrotask.

\`\`\`javascript
console.log("1: Synchronous");

setTimeout(() => {
  console.log("4: Macrotask (setTimeout)");
}, 0);

Promise.resolve().then(() => {
  console.log("3: Microtask (Promise)");
});

console.log("2: Synchronous");
\`\`\`

**Output:**
\`\`\`
1: Synchronous
2: Synchronous
3: Microtask (Promise)
4: Macrotask (setTimeout)
\`\`\`
`,
      activities: [
        {
          type: 'RECALL',
          seq: 1,
          seconds: 90,
          content: {
            prompt: 'Quick recall: Is JavaScript natively multi-threaded in executing user script logic on the main thread?',
            answer: 'No, JavaScript execution on the main thread is single-threaded; concurrency is achieved via asynchronous non-blocking event loops.'
          }
        },
        {
          type: 'EXPLANATION',
          seq: 2,
          seconds: 240,
          content: {
            title: 'Call Stack vs Microtasks vs Macrotasks',
            keyTakeaways: [
              'Call Stack: Synchronous execution frame by frame.',
              'Microtask Queue: Priority queue cleared immediately after each stack frame.',
              'Macrotask Queue: Checked only after all microtasks have resolved.'
            ]
          }
        },
        {
          type: 'EXAMPLE',
          seq: 3,
          seconds: 180,
          content: {
            code: `// Why microtasks take priority\nPromise.resolve().then(() => console.log("Microtask 1"))\n  .then(() => console.log("Microtask 2"));\nsetTimeout(() => console.log("Macrotask"), 0);`,
            explanation: 'Chained promise resolutions continue adding to the microtask queue, which is completely emptied before the setTimeout callback executes.'
          }
        },
        {
          type: 'PRACTICE',
          seq: 4,
          seconds: 180,
          content: {
            task: 'Inspect what happens when a long-running while(true) loop executes on the call stack.',
            solution: 'It starves the event loop entirely; no microtasks or macrotasks can run and UI freezes.'
          }
        },
        {
          type: 'SUMMARY',
          seq: 5,
          seconds: 90,
          content: {
            summary: 'Always avoid blocking the main thread. Keep CPU-heavy computations in worker threads and use microtasks for quick asynchronous callbacks.'
          }
        }
      ],
      quiz: {
        title: 'Event Loop Mastery Check',
        questions: [
          {
            conceptSlug: 'js-event-loop',
            type: 'MCQ',
            text: 'Between a Promise resolution callback and a setTimeout(..., 0) callback, which executes first once the call stack is clear?',
            options: ['Promise callback', 'setTimeout callback', 'Randomly based on CPU load', 'Both run in parallel'],
            answer: 'Promise callback',
            explanation: 'Promise callbacks enter the microtask queue, which has absolute priority over the macrotask queue.',
            difficulty: 2
          },
          {
            conceptSlug: 'js-event-loop',
            type: 'MCQ',
            text: 'What happens if a microtask recursively schedules another microtask endlessly?',
            options: [
              'The macrotask queue takes over after 100ms',
              'The Event Loop is starved and never executes macrotasks or renders UI',
              'Node.js automatically converts it to a cluster process',
              'A memory leak occurs only in browser cache'
            ],
            answer: 'The Event Loop is starved and never executes macrotasks or renders UI',
            explanation: 'Because the event loop will not proceed to the next macrotask until the microtask queue is empty, infinite microtasks starve the loop.',
            difficulty: 3
          }
        ]
      }
    },
    {
      conceptSlug: 'redis-caching-basics',
      title: 'High-Performance In-Memory Caching with Redis',
      slug: 'high-performance-in-memory-caching-with-redis',
      objective: 'Learn how to reduce database latency by implementing Redis key-value caching with TTL expiration.',
      difficulty: 'BEGINNER',
      estimatedMinutes: 10,
      content: `## Why In-Memory Caching?

Relational databases like PostgreSQL read and write pages from disk (or OS page caches). Redis stores data in RAM, offering sub-millisecond read/write operations.

### The Cache-Aside Pattern

1. Application receives a request for user profile \`user:123\`.
2. Application checks Redis:
   - **Cache HIT:** Return cached JSON immediately.
   - **Cache MISS:** Query PostgreSQL, write result to Redis with a TTL (e.g. 3600 seconds), then return to client.

\`\`\`javascript
async function getUser(userId) {
  const cacheKey = \`user:\${userId}\`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user) {
    await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600);
  }
  return user;
}
\`\`\`
`,
      activities: [
        {
          type: 'RECALL',
          seq: 1,
          seconds: 90,
          content: {
            prompt: 'What does TTL stand for in Redis and why is it critical?',
            answer: 'Time-To-Live. It prevents memory from filling indefinitely with obsolete keys.'
          }
        },
        {
          type: 'EXPLANATION',
          seq: 2,
          seconds: 240,
          content: {
            title: 'Memory vs Disk Tradeoffs',
            keyTakeaways: [
              'RAM is 100x-1000x faster than disk I/O.',
              'Redis data structures: Strings, Hashes, Lists, Sets, Sorted Sets.',
              'Cache expiration ensures eventual consistency.'
            ]
          }
        },
        {
          type: 'EXAMPLE',
          seq: 3,
          seconds: 180,
          content: {
            code: `// Setting an expiring key\nawait redis.set('session:token_99', JSON.stringify({ userId: 1 }), 'EX', 86400);`,
            explanation: 'The EX flag sets TTL in seconds atomically, avoiding orphan keys if server restarts.'
          }
        },
        {
          type: 'SUMMARY',
          seq: 4,
          seconds: 90,
          content: {
            summary: 'Cache-aside is the foundation of high-scale backend architectures. Always set realistic TTLs and handle cache misses gracefully.'
          }
        }
      ],
      quiz: {
        title: 'Redis Caching Fundamentals Quiz',
        questions: [
          {
            conceptSlug: 'redis-caching-basics',
            type: 'MCQ',
            text: 'What is the main benefit of the Cache-Aside pattern over direct database queries?',
            options: [
              'It eliminates the need for any primary database',
              'Sub-millisecond retrieval of hot data and reduced load on the relational database',
              'It automatically generates SQL queries without code',
              'It encrypts database rows automatically'
            ],
            answer: 'Sub-millisecond retrieval of hot data and reduced load on the relational database',
            explanation: 'In-memory retrieval bypasses disk queries, scaling read throughput exponentially.',
            difficulty: 1
          }
        ]
      }
    },
    {
      conceptSlug: 'sql-indexing',
      title: 'Database Indexing & Query Optimization',
      slug: 'database-indexing-and-query-optimization',
      objective: 'Master B-Tree indexes, composite keys, and how to analyze slow queries with EXPLAIN ANALYZE.',
      difficulty: 'INTERMEDIATE',
      estimatedMinutes: 14,
      content: `## How B-Tree Indexes Work

Without an index, the database must perform a **Sequential Scan (Seq Scan)**: reading every single row on disk from start to finish.

A **B-Tree index** organizes table column values into a balanced tree of ordered leaf nodes. Lookups run in **O(log N)** time.

### The Leftmost Prefix Rule for Composite Indexes

If you create an index:
\`\`\`sql
CREATE INDEX idx_orders_user_created ON orders (user_id, created_at);
\`\`\`

- \`WHERE user_id = 5 AND created_at > '2026-01-01'\` -> Uses index efficiently.
- \`WHERE user_id = 5\` -> Uses index efficiently.
- \`WHERE created_at > '2026-01-01'\` -> **Cannot** use this index efficiently (leftmost column omitted).
`,
      activities: [
        {
          type: 'RECALL',
          seq: 1,
          seconds: 90,
          content: {
            prompt: 'What SQL command shows the execution cost and actual runtime of a query?',
            answer: 'EXPLAIN ANALYZE <query>'
          }
        },
        {
          type: 'EXPLANATION',
          seq: 2,
          seconds: 240,
          content: {
            title: 'Index Overheads and Tradeoffs',
            keyTakeaways: [
              'Indexes speed up reads (SELECTs).',
              'Indexes slow down writes (INSERT, UPDATE, DELETE) because index trees must be modified.',
              'Never index every column blindly.'
            ]
          }
        },
        {
          type: 'SUMMARY',
          seq: 3,
          seconds: 90,
          content: {
            summary: 'Use composite indexes for frequent multi-column filters, and always verify with EXPLAIN ANALYZE before deploying to production.'
          }
        }
      ],
      quiz: {
        title: 'SQL Indexing Quiz',
        questions: [
          {
            conceptSlug: 'sql-indexing',
            type: 'MCQ',
            text: 'Why do indexes incur a performance cost on INSERT and UPDATE statements?',
            options: [
              'They lock the entire database schema',
              'The database must update both the table rows and all associated index B-Trees',
              'They cause network retransmissions on each write',
              'They convert all integers to floating-point numbers'
            ],
            answer: 'The database must update both the table rows and all associated index B-Trees',
            explanation: 'Every index maintained on a table requires tree balancing and leaf writes on mutations.',
            difficulty: 2
          }
        ]
      }
    }
  ];

  for (const ld of lessonsData) {
    const concept = conceptMap[ld.conceptSlug];
    if (concept) {
      const lesson = await prisma.lesson.upsert({
        where: { slug: ld.slug },
        update: {
          conceptId: concept.id,
          title: ld.title,
          objective: ld.objective,
          content: ld.content,
          difficulty: ld.difficulty,
          estimatedMinutes: ld.estimatedMinutes
        },
        create: {
          conceptId: concept.id,
          title: ld.title,
          slug: ld.slug,
          objective: ld.objective,
          content: ld.content,
          difficulty: ld.difficulty,
          estimatedMinutes: ld.estimatedMinutes
        }
      });

      // Activities
      await prisma.lessonActivity.deleteMany({ where: { lessonId: lesson.id } });
      for (const act of ld.activities) {
        await prisma.lessonActivity.create({
          data: {
            lessonId: lesson.id,
            activityType: act.type,
            sequenceOrder: act.seq,
            estimatedSeconds: act.seconds,
            content: act.content
          }
        });
      }

      // Quiz
      if (ld.quiz) {
        await prisma.quiz.deleteMany({ where: { lessonId: lesson.id } });
        const quiz = await prisma.quiz.create({
          data: {
            lessonId: lesson.id,
            title: ld.quiz.title,
            status: 'ACTIVE'
          }
        });

        for (const qq of ld.quiz.questions) {
          const qConcept = conceptMap[qq.conceptSlug] || concept;
          await prisma.quizQuestion.create({
            data: {
              quizId: quiz.id,
              conceptId: qConcept.id,
              questionType: qq.type,
              questionText: qq.text,
              options: qq.options,
              answer: qq.answer,
              explanation: qq.explanation,
              difficulty: qq.difficulty
            }
          });
        }
      }
    }
  }

  // Seed Curated Lessons with 9-Stage Activities
  console.log('Seeding enriched curated lessons from catalogue...');
  for (const cl of CURATED_LESSONS) {
    const concept = conceptMap[cl.conceptSlug];
    if (concept) {
      const fullContent = `## ${cl.title}

### Learning Objective
${cl.objective}

### Intuitive Analogy
${cl.analogy}

### Technical Example
\`\`\`javascript
${cl.simpleExample}
\`\`\`

### Production Context & Tradeoffs
${cl.realProjectExample}

### Common Misconceptions
${cl.commonMisconceptions}
`;

      const lesson = await prisma.lesson.upsert({
        where: { slug: cl.slug },
        update: {
          conceptId: concept.id,
          title: cl.title,
          objective: cl.objective,
          content: fullContent,
          difficulty: cl.difficulty,
          estimatedMinutes: cl.estimatedMinutes
        },
        create: {
          conceptId: concept.id,
          title: cl.title,
          slug: cl.slug,
          objective: cl.objective,
          content: fullContent,
          difficulty: cl.difficulty,
          estimatedMinutes: cl.estimatedMinutes
        }
      });

      // Clear previous activities for this lesson
      await prisma.lessonActivity.deleteMany({ where: { lessonId: lesson.id } });

      // 9 Stages of Structured Learning
      const stageActivities = [
        {
          activityType: 'CONCEPT_OVERVIEW',
          sequenceOrder: 1,
          estimatedSeconds: 60,
          content: {
            title: cl.title,
            objective: cl.objective,
            domain: concept.name,
            estimatedMinutes: cl.estimatedMinutes,
            visualType: cl.visualType
          }
        },
        {
          activityType: 'EXPLAIN_SIMPLY',
          sequenceOrder: 2,
          estimatedSeconds: 120,
          content: {
            title: 'Intuitive Mental Model',
            analogy: cl.analogy,
            misconceptions: cl.commonMisconceptions,
            remediation: cl.remediation
          }
        },
        {
          activityType: 'VISUALIZATION',
          sequenceOrder: 3,
          estimatedSeconds: 150,
          content: {
            title: 'Interactive Conceptual Architecture',
            visualType: cl.visualType,
            description: `Visual walkthrough for ${cl.title}`
          }
        },
        {
          activityType: 'SIMPLE_EXAMPLE',
          sequenceOrder: 4,
          estimatedSeconds: 120,
          content: {
            title: 'Code Mechanics',
            code: cl.simpleExample
          }
        },
        {
          activityType: 'REAL_PROJECT',
          sequenceOrder: 5,
          estimatedSeconds: 150,
          content: {
            title: 'Production Scenario & Tradeoffs',
            scenario: cl.realProjectExample
          }
        },
        {
          activityType: 'PRACTICAL_APPLICATION',
          sequenceOrder: 6,
          estimatedSeconds: 180,
          content: {
            title: 'Practical Application Challenge',
            prompt: cl.practicalTask.prompt,
            hint: cl.practicalTask.hint,
            solution: cl.practicalTask.solution
          }
        },
        {
          activityType: 'SUMMARY',
          sequenceOrder: 7,
          estimatedSeconds: 60,
          content: {
            title: 'Core Synthesis',
            summary: cl.objective,
            remediation: cl.remediation
          }
        }
      ];

      for (const sa of stageActivities) {
        await prisma.lessonActivity.create({
          data: {
            lessonId: lesson.id,
            activityType: sa.activityType,
            sequenceOrder: sa.sequenceOrder,
            estimatedSeconds: sa.estimatedSeconds,
            content: sa.content
          }
        });
      }

      // Quiz
      if (cl.quiz) {
        await prisma.quiz.deleteMany({ where: { lessonId: lesson.id } });
        const quiz = await prisma.quiz.create({
          data: {
            lessonId: lesson.id,
            title: cl.quiz.title,
            status: 'ACTIVE'
          }
        });

        for (const qq of cl.quiz.questions) {
          await prisma.quizQuestion.create({
            data: {
              quizId: quiz.id,
              conceptId: concept.id,
              questionType: 'MCQ',
              questionText: qq.text,
              options: qq.options,
              answer: qq.answer,
              explanation: qq.explanation,
              difficulty: qq.difficulty
            }
          });
        }
      }
    }
  }

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
