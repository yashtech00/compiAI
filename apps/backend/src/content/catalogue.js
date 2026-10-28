/**
 * Curated Content Catalogue for Companion.ai
 *
 * Source of truth for reviewed technical concepts, 9-stage lessons,
 * curated visualizations, practical scenarios, and verified quiz answer keys.
 * Spanning 5 core domains:
 * 1. Programming Fundamentals
 * 2. Backend Development
 * 3. System Design
 * 4. Databases
 * 5. AI Engineering
 */

export const CURATED_SKILLS = [
  { name: 'Programming Fundamentals', slug: 'javascript', category: 'Programming Fundamentals', difficulty: 1, description: 'Core asynchronous execution, lexical scope, error handling, and debugging' },
  { name: 'Backend Development', slug: 'backend-dev', category: 'Backend Development', difficulty: 2, description: 'REST APIs, HTTP protocols, middleware architecture, and server reliability' },
  { name: 'System Design', slug: 'system-design', category: 'System Design', difficulty: 3, description: 'Load balancing, multi-tier caching, scalability, and distributed trade-offs' },
  { name: 'Databases', slug: 'databases', category: 'Databases', difficulty: 2, description: 'Relational joins, B-Tree indexes, ACID transactions, and query optimization' },
  { name: 'AI Engineering', slug: 'ai-engineering', category: 'AI Engineering', difficulty: 3, description: 'Prompt engineering, vector embeddings, semantic search, and RAG architectures' }
];

export const CURATED_CONCEPTS = [
  // 1. Programming Fundamentals
  {
    skillSlug: 'javascript',
    slug: 'js-closures',
    name: 'Closures & Lexical Scope',
    difficulty: 'BEGINNER',
    order: 1,
    desc: 'How functions retain access to their outer lexical environment across execution scopes.',
    prerequisites: []
  },
  {
    skillSlug: 'javascript',
    slug: 'js-async-await',
    name: 'Promises & Async/Await',
    difficulty: 'BEGINNER',
    order: 2,
    desc: 'Managing asynchronous operations, non-blocking execution, and promise rejection handling.',
    prerequisites: ['js-closures']
  },
  {
    skillSlug: 'javascript',
    slug: 'js-event-loop',
    name: 'Event Loop & Concurrency',
    difficulty: 'INTERMEDIATE',
    order: 3,
    desc: 'How single-threaded JavaScript orchestrates call stack, microtasks, and macrotasks.',
    prerequisites: ['js-async-await']
  },
  {
    skillSlug: 'javascript',
    slug: 'js-error-handling',
    name: 'Async Error Handling & Boundaries',
    difficulty: 'INTERMEDIATE',
    order: 4,
    desc: 'Structured try/catch patterns, unhandled rejection management, and defensive boundaries.',
    prerequisites: ['js-event-loop']
  },

  // 2. Backend Development
  {
    skillSlug: 'backend-dev',
    slug: 'rest-resource-design',
    name: 'RESTful Resource Design',
    difficulty: 'BEGINNER',
    order: 1,
    desc: 'Designing intuitive HTTP URIs, selecting correct HTTP verbs, and standard status codes.',
    prerequisites: []
  },
  {
    skillSlug: 'backend-dev',
    slug: 'rest-idempotency',
    name: 'HTTP Idempotency & Safe Methods',
    difficulty: 'INTERMEDIATE',
    order: 2,
    desc: 'Ensuring safe retry behaviors with idempotency keys across mutating API endpoints.',
    prerequisites: ['rest-resource-design']
  },
  {
    skillSlug: 'backend-dev',
    slug: 'node-middleware',
    name: 'Express Middleware Pipelines',
    difficulty: 'BEGINNER',
    order: 3,
    desc: 'Composing request-response lifecycles, authentication guards, and centralized error handlers.',
    prerequisites: ['js-async-await', 'rest-resource-design']
  },

  // 3. System Design
  {
    skillSlug: 'system-design',
    slug: 'sd-load-balancing',
    name: 'Horizontal Scaling & Load Balancing',
    difficulty: 'INTERMEDIATE',
    order: 1,
    desc: 'Distributing traffic across stateless worker instances using Layer 4 and Layer 7 balancers.',
    prerequisites: ['rest-idempotency']
  },
  {
    skillSlug: 'system-design',
    slug: 'sd-caching-tiers',
    name: 'Multi-Tier Caching Architecture',
    difficulty: 'ADVANCED',
    order: 2,
    desc: 'Designing CDN, gateway, in-memory, and application caching with invalidation strategies.',
    prerequisites: ['sd-load-balancing']
  },

  // 4. Databases
  {
    skillSlug: 'databases',
    slug: 'sql-joins-fks',
    name: 'Relational Joins & Foreign Keys',
    difficulty: 'BEGINNER',
    order: 1,
    desc: 'Connecting related tables, referential integrity, and INNER versus LEFT joins.',
    prerequisites: []
  },
  {
    skillSlug: 'databases',
    slug: 'sql-indexing',
    name: 'B-Tree Indexing Strategies',
    difficulty: 'INTERMEDIATE',
    order: 2,
    desc: 'Accelerating query lookups, composite indexes, and leftmost prefix mechanics.',
    prerequisites: ['sql-joins-fks']
  },
  {
    skillSlug: 'databases',
    slug: 'sql-acid-transactions',
    name: 'ACID Transactions & Isolation Levels',
    difficulty: 'ADVANCED',
    order: 3,
    desc: 'Atomic data modifications, rollback safety, dirty reads, and transaction isolation.',
    prerequisites: ['sql-indexing']
  },

  // 5. AI Engineering
  {
    skillSlug: 'ai-engineering',
    slug: 'ai-prompt-engineering',
    name: 'Prompt Engineering & Few-Shot Learning',
    difficulty: 'BEGINNER',
    order: 1,
    desc: 'Crafting system prompts, structured JSON output constraints, and few-shot exemplars.',
    prerequisites: []
  },
  {
    skillSlug: 'ai-engineering',
    slug: 'ai-embeddings-search',
    name: 'Embeddings & Vector Similarity',
    difficulty: 'INTERMEDIATE',
    order: 2,
    desc: 'Converting text to high-dimensional semantic vectors and cosine similarity search.',
    prerequisites: ['ai-prompt-engineering']
  },
  {
    skillSlug: 'ai-engineering',
    slug: 'ai-rag-architecture',
    name: 'Retrieval-Augmented Generation (RAG)',
    difficulty: 'ADVANCED',
    order: 3,
    desc: 'Grounding LLM completions with contextual retrieved chunks to eliminate hallucinations.',
    prerequisites: ['ai-embeddings-search']
  }
];

export const CURATED_LESSONS = [
  // --- 1. Programming Fundamentals: Event Loop ---
  {
    conceptSlug: 'js-event-loop',
    title: 'Mastering the JavaScript Event Loop',
    slug: 'mastering-the-javascript-event-loop',
    objective: 'Understand how single-threaded JavaScript coordinates the Call Stack, Microtasks, and Macrotasks.',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 12,
    visualType: 'event-loop',
    analogy: 'Imagine a restaurant with one master chef (Call Stack). When an order requires slow simmering, an assistant timer watches it (Web APIs/libuv). Urgent notes from the chef go on a VIP ticket spike (Microtask Queue) and get prepared before any new customer orders (Macrotasks).',
    simpleExample: `console.log('1: Sync');
setTimeout(() => console.log('4: Macrotask (Timer)'), 0);
Promise.resolve().then(() => console.log('3: Microtask (Promise)'));
console.log('2: Sync');`,
    realProjectExample: 'In an Express API handler, performing synchronous CPU encryption on the main thread blocks all incoming requests. Offloading heavy work or understanding microtask priority prevents API p99 latency spikes.',
    practicalTask: {
      prompt: 'Given code chaining `Promise.resolve().then(...)` twice alongside a `setTimeout(..., 0)`, what order do the callbacks run in?',
      hint: 'The microtask queue must be completely emptied before the next macrotask is dequeued.',
      solution: 'Both chained promise callbacks execute in the microtask queue before the setTimeout macrotask callback runs.'
    },
    commonMisconceptions: 'Believing setTimeout(fn, 0) runs immediately after 0ms. In reality, it merely schedules a macrotask which must wait until the call stack and all pending microtasks are completely clear.',
    remediation: 'Review the distinction between Microtasks (Promises, queueMicrotask) and Macrotasks (setTimeout, setInterval, I/O callbacks).',
    quiz: {
      title: 'Event Loop & Concurrency Assessment',
      questions: [
        {
          text: 'Between a Promise resolution callback and a setTimeout(..., 0) callback, which executes first once the call stack empties?',
          options: ['Promise callback (Microtask)', 'setTimeout callback (Macrotask)', 'Whichever was registered first', 'They execute in parallel on separate threads'],
          answer: 'Promise callback (Microtask)',
          explanation: 'Promise callbacks populate the microtask queue, which has strict priority over the macrotask queue whenever the call stack is clear.',
          difficulty: 2
        },
        {
          text: 'What is the immediate consequence if a microtask recursively schedules another microtask indefinitely?',
          options: [
            'The runtime falls back to macrotasks after 50ms',
            'The Event Loop is starved: macrotasks never run and the UI/I/O freezes',
            'Node.js automatically spawns a child worker process',
            'It throws a synchronous syntax error during compilation'
          ],
          answer: 'The Event Loop is starved: macrotasks never run and the UI/I/O freezes',
          explanation: 'Because the event loop completely drains the microtask queue before moving on, infinite microtasks starve all macrotasks and I/O.',
          difficulty: 3
        }
      ]
    }
  },

  // --- 2. Programming Fundamentals: Closures ---
  {
    conceptSlug: 'js-closures',
    title: 'Closures & Lexical Scope in Practice',
    slug: 'closures-and-lexical-scope-in-practice',
    objective: 'Master how inner functions retain permanent access to outer lexical environments.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 10,
    visualType: 'closure-scope',
    analogy: 'A closure is like a backpack a function wears when it is created. Wherever that function travels, it keeps whatever variables were inside that backpack.',
    simpleExample: `function createCounter(initial = 0) {
  let count = initial; // Stored in closure backpack
  return {
    increment: () => ++count,
    getValue: () => count
  };
}
const counter = createCounter(10);
counter.increment(); // 11
console.log(counter.getValue()); // 11`,
    realProjectExample: 'Production rate limiters and token bucket implementations use closures to maintain private mutable token balances without polluting global state.',
    practicalTask: {
      prompt: 'Create a function `createIdGenerator(prefix)` that returns a function generating sequential strings like "user_1", "user_2".',
      hint: 'Maintain an internal integer counter inside the outer function.',
      solution: 'function createIdGenerator(prefix) { let id = 0; return () => `${prefix}_${++id}`; }'
    },
    commonMisconceptions: 'Thinking closures copy variable values at definition time. Closures retain live references to variable bindings, not static copies.',
    remediation: 'Practice identifying the lexical parent scope at function creation time versus invocation time.',
    quiz: {
      title: 'Closures & Lexical Scope Quiz',
      questions: [
        {
          text: 'What variable reference does a JavaScript closure preserve?',
          options: [
            'A static snapshot of primitive values only',
            'A live reference to the outer lexical environment variables',
            'Only variables explicitly declared with const',
            'A copy of the global window or process object'
          ],
          answer: 'A live reference to the outer lexical environment variables',
          explanation: 'Closures hold references to variables in their surrounding lexical scope, enabling functions to read and mutate them across invocations.',
          difficulty: 1
        },
        {
          text: 'In the classic loop `for (var i = 0; i < 3; i++) { setTimeout(() => console.log(i), 10); }`, why does it log 3 three times?',
          options: [
            'Because setTimeout runs before the loop starts',
            'Because `var` is function-scoped, so all closures share the single mutated `i` reference',
            'Because JavaScript arrays are 0-indexed',
            'Because setTimeout forces global variable evaluation'
          ],
          answer: 'Because `var` is function-scoped, so all closures share the single mutated `i` reference',
          explanation: 'With `var`, there is only one shared variable `i` across all loop iterations. By the time the callbacks fire, `i` is 3. `let` creates block scope per iteration.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 3. Backend Development: REST Idempotency ---
  {
    conceptSlug: 'rest-idempotency',
    title: 'HTTP Idempotency & Safe Network Retries',
    slug: 'http-idempotency-and-safe-network-retries',
    objective: 'Implement resilient API retries using idempotent HTTP methods and idempotency keys.',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 12,
    visualType: 'idempotency-key',
    analogy: 'Pressing an elevator call button 10 times is idempotent (the elevator still comes to your floor once). Swiping your credit card 10 times without an idempotency key would charge you 10 times.',
    simpleExample: `// Client sends an Idempotency-Key header
// POST /api/v1/payments
// Header: Idempotency-Key: uuid-7718-4912
// Body: { amount: 50.00, customerId: "cust_12" }

// If network drops and client retries with the same key,
// the server returns the cached initial response without charging twice!`,
    realProjectExample: 'Stripe, PayPal, and cloud billing systems require an `Idempotency-Key` header on all payment intent creation endpoints to ensure network timeouts never trigger double billing.',
    practicalTask: {
      prompt: 'Which HTTP methods are idempotent by RFC 7231 specification, and why is DELETE considered idempotent?',
      hint: 'Idempotent means repeating the request N times produces the same system state as repeating it once.',
      solution: 'GET, PUT, DELETE, HEAD, and OPTIONS are idempotent. DELETE is idempotent because deleting an existing resource once leaves it deleted; subsequent deletes result in the same final state (resource absent).'
    },
    commonMisconceptions: 'Assuming idempotency means the HTTP status code must be identical on repeat calls. Status codes can differ (e.g. 200 OK vs 404 Not Found on repeated DELETE), as long as server resource state remains unchanged.',
    remediation: 'Differentiate between "Safe" (does not mutate state) and "Idempotent" (mutating N times yields same state as 1 time).',
    quiz: {
      title: 'HTTP Idempotency Mastery Check',
      questions: [
        {
          text: 'Which of the following HTTP methods is NOT idempotent according to RFC 7231?',
          options: ['POST', 'PUT', 'DELETE', 'GET'],
          answer: 'POST',
          explanation: 'POST is non-idempotent because repeated submissions typically create multiple distinct resources (e.g., creating duplicate orders).',
          difficulty: 1
        },
        {
          text: 'How does a backend payment service safely handle duplicate POST requests with the same Idempotency-Key?',
          options: [
            'It ignores the key and processes the charge again',
            'It looks up the key in a database/cache; if already processed, it returns the stored result without re-executing',
            'It deletes the original record and recreates it from scratch',
            'It returns an immediate 500 Internal Server Error'
          ],
          answer: 'It looks up the key in a database/cache; if already processed, it returns the stored result without re-executing',
          explanation: 'Idempotency keys allow the server to recognize duplicate retry attempts, bypass the mutating business logic, and return the original response.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 4. Databases: B-Tree Indexing ---
  {
    conceptSlug: 'sql-indexing',
    title: 'Database Indexing & Query Optimization',
    slug: 'database-indexing-and-query-optimization',
    objective: 'Master how B-Tree indexes accelerate queries and apply the Leftmost Prefix Rule.',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 14,
    visualType: 'b-tree-indexing',
    analogy: 'Searching a 1,000-page book without an index requires reading every page (Sequential Scan, O(N)). An alphabetical index in the back lets you jump directly to the target page in seconds (B-Tree lookup, O(log N)).',
    simpleExample: `CREATE INDEX idx_users_org_created 
ON users (org_id, created_at);

-- Query A: Uses index efficiently (matches leftmost prefix org_id)
SELECT * FROM users WHERE org_id = 'acme' AND created_at > '2026-01-01';

-- Query B: CANNOT use this index effectively (omits leftmost column org_id)
SELECT * FROM users WHERE created_at > '2026-01-01';`,
    realProjectExample: 'A multi-tenant SaaS application with 20 million user rows suffered from 4-second dashboard queries. Adding a composite index on `(tenant_id, status, created_at)` dropped query times to 2 milliseconds.',
    practicalTask: {
      prompt: 'If you have an index on `(country, city, postal_code)`, can a query filtering `WHERE city = "Paris"` use the index effectively?',
      hint: 'Remember B-Trees are sorted hierarchically starting strictly from the first column.',
      solution: 'No, because the leftmost prefix `country` is omitted. The engine must perform a sequential scan or index full scan.'
    },
    commonMisconceptions: 'Thinking you should index every column in a table. Indexes accelerate SELECT reads but penalize every INSERT, UPDATE, and DELETE because index trees must be modified and rebalanced.',
    remediation: 'Always run EXPLAIN ANALYZE before and after adding an index to verify the query planner actually chooses an Index Scan over a Seq Scan.',
    quiz: {
      title: 'SQL Indexing & Optimization Quiz',
      questions: [
        {
          text: 'Given a composite index on (tenant_id, created_at, status), which WHERE clause CANNOT use this index effectively?',
          options: [
            'WHERE created_at > NOW() AND status = "ACTIVE"',
            'WHERE tenant_id = 42 AND created_at > NOW()',
            'WHERE tenant_id = 42',
            'WHERE tenant_id = 42 AND created_at = NOW() AND status = "ACTIVE"'
          ],
          answer: 'WHERE created_at > NOW() AND status = "ACTIVE"',
          explanation: 'B-Tree composite indexes require matching from the leftmost prefix (tenant_id). Queries that omit tenant_id cannot traverse the index tree efficiently.',
          difficulty: 3
        },
        {
          text: 'Why do database indexes incur a write performance overhead on INSERT statements?',
          options: [
            'They lock the entire database schema temporarily',
            'The engine must write the row to the table heap AND update every index B-Tree on that table',
            'They force the database to re-compile all stored procedures',
            'They convert all string columns to base64 encoding'
          ],
          answer: 'The engine must write the row to the table heap AND update every index B-Tree on that table',
          explanation: 'Each index creates an auxiliary data structure that must be updated and balanced during row additions and mutations.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 5. System Design: Load Balancing ---
  {
    conceptSlug: 'sd-load-balancing',
    title: 'Horizontal Scaling & Load Balancing Patterns',
    slug: 'horizontal-scaling-and-load-balancing-patterns',
    objective: 'Distribute client traffic across stateless servers using Layer 4 and Layer 7 load balancing algorithms.',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 12,
    visualType: 'load-balancer',
    analogy: 'A load balancer is like a bank teller dispatcher. When customers enter a busy bank, the dispatcher directs the next customer to the teller with the shortest queue, ensuring no single teller gets overwhelmed.',
    simpleExample: `// Round-Robin, Least Connections, or IP Hash algorithms
// Client Request -> Load Balancer (NGINX / AWS ALB)
//                    ├── Server A (Active: 12 conn)
//                    ├── Server B (Active: 4 conn)  <-- Selected!
//                    └── Server C (Active: 15 conn)`,
    realProjectExample: 'When an e-commerce platform runs a flash sale, auto-scaling groups spin up 20 additional stateless container instances behind a Layer 7 Application Load Balancer with health checks to evenly distribute spikes.',
    practicalTask: {
      prompt: 'What is the key architectural requirement for backend application servers to scale horizontally behind a load balancer?',
      hint: 'Where should user sessions and temporary files be stored?',
      solution: 'Application servers must be stateless. Session state should be stored in an external distributed store like Redis, not in server process memory.'
    },
    commonMisconceptions: 'Believing Layer 4 and Layer 7 load balancers operate the same way. L4 operates at the TCP level without inspecting HTTP headers; L7 can inspect HTTP paths, cookies, and headers to route traffic intelligently.',
    remediation: 'Compare TCP connection proxying (L4) with HTTP reverse proxying (L7).',
    quiz: {
      title: 'Load Balancing & Scalability Quiz',
      questions: [
        {
          text: 'What is the primary difference between Layer 4 and Layer 7 load balancers?',
          options: [
            'Layer 4 routes based on IP and port; Layer 7 can inspect HTTP headers, cookies, and URL paths',
            'Layer 4 is for cloud only, Layer 7 is for physical servers only',
            'Layer 4 balances database queries, Layer 7 balances network cables',
            'Layer 4 cannot handle SSL encryption'
          ],
          answer: 'Layer 4 routes based on IP and port; Layer 7 can inspect HTTP headers, cookies, and URL paths',
          explanation: 'L4 operates at the transport layer (TCP/UDP), while L7 operates at the application layer with deep inspection of HTTP protocol details.',
          difficulty: 2
        },
        {
          text: 'Why must backend application servers be stateless to scale smoothly behind a load balancer?',
          options: [
            'Because stateful servers cannot connect to PostgreSQL',
            'Because any server instance must be able to serve any incoming request without depending on local memory',
            'Because HTTP/2 forbids local disk writes',
            'Because modern browsers reject responses from stateful servers'
          ],
          answer: 'Because any server instance must be able to serve any incoming request without depending on local memory',
          explanation: 'Stateless servers enable traffic to be routed freely to any node without session loss if an instance crashes or scales down.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 6. AI Engineering: RAG Architecture ---
  {
    conceptSlug: 'ai-rag-architecture',
    title: 'RAG Architecture: Grounding LLMs with Vector Search',
    slug: 'rag-architecture-grounding-llms-with-vector-search',
    objective: 'Build Retrieval-Augmented Generation systems that eliminate hallucinations by injecting relevant contextual documents.',
    difficulty: 'ADVANCED',
    estimatedMinutes: 15,
    visualType: 'rag-pipeline',
    analogy: 'An open-book exam. Instead of forcing an LLM to memorize every obscure internal company memo (closed-book), RAG looks up the exact relevant pages from a library (Retrieval) and hands them to the student to write the answer (Generation).',
    simpleExample: `// 1. User asks question: "What is our company refund policy for enterprise?"
// 2. Vector search finds top 3 policy chunks:
const context = await vectorDb.query({ vector: userEmbedding, topK: 3 });

// 3. Grounded Prompt passed to LLM:
const prompt = \`
You are a helpful assistant. Answer the user question strictly using the provided context:
Context: \${context.map(c => c.text).join('\\n')}
Question: \${userQuestion}
\`;`,
    realProjectExample: 'An enterprise knowledge assistant for internal software documentation embeds GitHub repositories into pgvector and grounds responses, cutting documentation lookup times from 15 minutes to 10 seconds.',
    practicalTask: {
      prompt: 'What are the three main failure modes in a basic RAG pipeline?',
      hint: 'Think about chunking, vector similarity limitations, and LLM adherence.',
      solution: '1) Retrieval failure (relevant document not in top-K), 2) Context fragmentation (chunk cutoff loses critical meaning), 3) LLM hallucination despite provided context (ignoring constraints).'
    },
    commonMisconceptions: 'Assuming vector search understands complex logical rules. Vector cosine similarity measures semantic similarity, not logical truth or recency.',
    remediation: 'Combine semantic vector search with keyword/BM25 search (Hybrid Search) and re-ranking for enterprise RAG.',
    quiz: {
      title: 'RAG Architecture Quiz',
      questions: [
        {
          text: 'What is the core purpose of Retrieval-Augmented Generation (RAG)?',
          options: [
            'To train new foundational models from scratch using reinforcement learning',
            'To ground LLM responses in verified external domain knowledge, minimizing hallucinations and outdated information',
            'To automatically compile Python code into WebAssembly',
            'To generate synthetic images from user voice commands'
          ],
          answer: 'To ground LLM responses in verified external domain knowledge, minimizing hallucinations and outdated information',
          explanation: 'RAG retrieves contextually relevant document snippets at query time and passes them into the prompt window to ground model responses.',
          difficulty: 2
        },
        {
          text: 'In a RAG system, what role does a Vector Database play?',
          options: [
            'It stores high-dimensional embeddings and performs rapid nearest-neighbor semantic search (e.g. Cosine similarity)',
            'It replaces the primary PostgreSQL database for all ACID transactions',
            'It serves as a reverse proxy for DNS traffic',
            'It compiles TypeScript into machine bytecode'
          ],
          answer: 'It stores high-dimensional embeddings and performs rapid nearest-neighbor semantic search (e.g. Cosine similarity)',
          explanation: 'Vector databases index high-dimensional numeric arrays and execute fast cosine/dot-product similarity queries to find relevant text chunks.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 7. Programming Fundamentals: Promises & Async/Await ---
  {
    conceptSlug: 'js-async-await',
    title: 'Promises & Async/Await in Production',
    slug: 'promises-and-async-await-in-production',
    objective: 'Master promise states, sequential vs parallel execution with Promise.all, and modern async/await syntax.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 10,
    visualType: 'event-loop',
    analogy: 'Ordering food at a food truck. A Promise is the buzzer ticket you receive immediately. While waiting, you can check your phone (non-blocking). When the food is ready, the buzzer vibrates (settled promise) and you collect your meal (await resolution).',
    simpleExample: `// Parallel vs Sequential
const [user, posts] = await Promise.all([
  fetchUser(userId),
  fetchPosts(userId)
]); // Runs in parallel! Takes max(time(user), time(posts))`,
    realProjectExample: 'Optimizing API response times in a GraphQL resolver by parallelizing independent database lookups with Promise.allSettled instead of sequential awaits, reducing endpoint latency from 600ms to 180ms.',
    practicalTask: {
      prompt: 'If you have two independent database calls, why is `await fetchA(); await fetchB();` an anti-pattern?',
      hint: 'Think about unnecessary sequential blocking.',
      solution: 'It creates an artificial serial dependency. Using Promise.all([fetchA(), fetchB()]) allows both network requests to execute concurrently in the background.'
    },
    commonMisconceptions: 'Thinking await pauses the entire Node.js server thread. Await only pauses execution of the local async function; the main event loop continues serving other concurrent requests.',
    remediation: 'Contrast synchronous sleep with asynchronous promise awaiting in non-blocking runtimes.',
    quiz: {
      title: 'Async/Await & Promises Mastery Check',
      questions: [
        {
          text: 'What is the primary performance benefit of Promise.all over sequential await statements for independent asynchronous operations?',
          options: [
            'It runs operations concurrently, bound by the slowest operation rather than their sum',
            'It compresses database rows to save memory',
            'It prevents all network timeout errors automatically',
            'It converts asynchronous code to synchronous thread blocks'
          ],
          answer: 'It runs operations concurrently, bound by the slowest operation rather than their sum',
          explanation: 'Promise.all triggers all promises simultaneously so their network/IO wait times overlap rather than accumulate sequentially.',
          difficulty: 2
        },
        {
          text: 'What happens if one promise in Promise.all rejects without custom catch handling?',
          options: [
            'The entire Promise.all immediately rejects with that error, ignoring other pending promises',
            'It retries the failed promise up to 3 times',
            'It returns undefined for the failed operation and resolves the rest',
            'It pauses the Node.js event loop until fixed'
          ],
          answer: 'The entire Promise.all immediately rejects with that error, ignoring other pending promises',
          explanation: 'Promise.all has fail-fast behavior: if any single promise rejects, the returned promise immediately rejects with that rejection reason.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 8. Programming Fundamentals: Async Error Handling ---
  {
    conceptSlug: 'js-error-handling',
    title: 'Async Error Handling & Defensive Boundaries',
    slug: 'async-error-handling-and-defensive-boundaries',
    objective: 'Safeguard Node.js and browser applications against unhandled promise rejections and boundary crashes.',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 12,
    visualType: 'event-loop',
    analogy: 'A circuit breaker in a house electrical panel. When an unexpected surge occurs in one appliance, the breaker trips locally instead of burning down the entire electrical grid.',
    simpleExample: `try {
  const result = await riskyAsyncOperation();
} catch (error) {
  logger.error('Operation failed gracefully:', { error, context });
  throw new AppError('Service temporarily unavailable', 503);
}`,
    realProjectExample: 'Wrapping Express asynchronous route handlers in an asyncBoundary or error-handling middleware to prevent unhandled promise rejections from crashing the server process in Node.js 16+.',
    practicalTask: {
      prompt: 'Why does a standard synchronous try/catch block fail to catch errors thrown inside a traditional setTimeout callback?',
      hint: 'Where has the call stack moved when the setTimeout callback actually executes?',
      solution: 'Because the try/catch block has already finished executing and popped off the call stack by the time the timer macrotask callback is invoked.'
    },
    commonMisconceptions: 'Assuming empty catch blocks (catch (e) {}) are safe in production. Swallowing errors creates silent data corruption and makes system debugging nearly impossible.',
    remediation: 'Always log errors with contextual metadata and re-throw or return structured error responses.',
    quiz: {
      title: 'Async Error Boundaries Quiz',
      questions: [
        {
          text: 'What occurs in modern Node.js runtimes when an unhandled promise rejection is triggered?',
          options: [
            'The process crashes with a non-zero exit code by default',
            'Node.js silently ignores it',
            'It logs an error and automatically restarts the operating system',
            'It automatically retries the operation in a worker thread'
          ],
          answer: 'The process crashes with a non-zero exit code by default',
          explanation: 'Since Node.js v15, unhandled rejections terminate the process to prevent executing in an inconsistent, corrupt state.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 9. Backend Development: RESTful Resource Design ---
  {
    conceptSlug: 'rest-resource-design',
    title: 'RESTful Resource Design & API Standards',
    slug: 'restful-resource-design-and-api-standards',
    objective: 'Design intuitive, standard HTTP URIs, select correct status codes, and structure scalable API contracts.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 10,
    visualType: 'idempotency-key',
    analogy: 'A library indexing system. Nouns represent books and sections (e.g., /authors/12/books), while actions are represented by standard verbs (GET to read, POST to add, DELETE to archive), not custom ad-hoc URL verbs.',
    simpleExample: `// Good RESTful URI Design:
GET    /api/v1/orders/7821        // 200 OK
POST   /api/v1/orders             // 201 Created (Location: /orders/7822)
PUT    /api/v1/orders/7821        // 200 OK (Full replace)
PATCH  /api/v1/orders/7821        // 200 OK (Partial update)
DELETE /api/v1/orders/7821        // 204 No Content`,
    realProjectExample: 'Refactoring inconsistent legacy RPC endpoints like `/getAllUsers_v2` and `/deleteUserById?id=5` into clean resource-oriented `/api/v1/users` routes adhering to RFC 7231 standards.',
    practicalTask: {
      prompt: 'What is the semantic difference between PUT and PATCH in HTTP resource updates?',
      hint: 'One represents a complete entity replacement, while the other represents partial modifications.',
      solution: 'PUT replaces the target resource entirely with the request payload. PATCH applies a partial delta update to specific fields.'
    },
    commonMisconceptions: 'Using 200 OK for every single response including errors and resource creations. Using correct status codes (201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict) allows clients and proxies to react predictably.',
    remediation: 'Review standard HTTP status code ranges: 2xx success, 3xx redirection, 4xx client errors, 5xx server errors.',
    quiz: {
      title: 'REST API Design Quiz',
      questions: [
        {
          text: 'Which HTTP status code should be returned when a resource is successfully created via a POST request?',
          options: ['201 Created', '200 OK', '204 No Content', '202 Accepted'],
          answer: '201 Created',
          explanation: 'RFC 7231 specifies 201 Created as the standard response when an HTTP request leads to the creation of a new resource.',
          difficulty: 1
        }
      ]
    }
  },

  // --- 10. Backend Development: Express Middleware ---
  {
    conceptSlug: 'node-middleware',
    title: 'Express Middleware Architecture & Pipelines',
    slug: 'express-middleware-architecture-and-pipelines',
    objective: 'Compose modular request-response pipelines for authentication, validation, rate limiting, and centralized error handling.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 10,
    visualType: 'idempotency-key',
    analogy: 'An airport security line. Each checkpoint (ticket scanner, bag X-ray, metal detector) is a middleware. If all pass, next() is called to send you to the departure gate. If a checkpoint fails, you are turned back with an error response.',
    simpleExample: `// Request Pipeline Flow
app.use(corsMiddleware);
app.use(authMiddleware);
app.use(validationMiddleware);
app.use('/api/v1', apiRouter);
app.use(centralErrorHandler); // 4 parameters: (err, req, res, next)`,
    realProjectExample: 'Implementing a centralized JWT authentication guard that attaches `req.user` to incoming requests and halts unauthorized requests before they hit database query handlers.',
    practicalTask: {
      prompt: 'What happens if a middleware does not call `next()` and does not send a response (`res.json()`)?',
      hint: 'Think about client request socket timeouts.',
      solution: 'The request hangs indefinitely until the client or gateway times out (typically after 30-60 seconds).'
    },
    commonMisconceptions: 'Forgetting that Express error-handling middleware MUST accept exactly 4 arguments: (err, req, res, next). If you omit the first parameter, Express treats it as a standard middleware.',
    remediation: 'Inspect how Express uses function.length arity checks to identify error handlers.',
    quiz: {
      title: 'Middleware Architecture Quiz',
      questions: [
        {
          text: 'How does Express differentiate between a standard route middleware and a centralized error-handling middleware?',
          options: [
            'By checking the number of declared function arguments: error handlers have 4 arguments (err, req, res, next)',
            'By checking if the function name starts with "handleError"',
            'By requiring error handlers to be written in TypeScript only',
            'By requiring error handlers to return a Promise'
          ],
          answer: 'By checking the number of declared function arguments: error handlers have 4 arguments (err, req, res, next)',
          explanation: 'Express inspects function.length: 4 parameters identifies an error-handling middleware.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 11. System Design: Multi-Tier Caching Architecture ---
  {
    conceptSlug: 'sd-caching-tiers',
    title: 'Multi-Tier Caching & Invalidation Architecture',
    slug: 'multi-tier-caching-and-invalidation-architecture',
    objective: 'Design distributed multi-tier caching architectures across CDN, API Gateway, and Redis tiers while preventing cache stampedes.',
    difficulty: 'ADVANCED',
    estimatedMinutes: 14,
    visualType: 'cache-aside',
    analogy: 'Water reservoirs at different elevations. A household water pitcher (in-memory) is fastest for one person. A rooftop tank (Redis) serves the building. The municipal reservoir (Database) is authoritative but slow. Proper plumbing ensures stale water is flushed when the main supply updates.',
    simpleExample: `// Cache-Aside with Mutex Lock to prevent Cache Stampede
async function getCachedProduct(id) {
  let val = await redis.get(\`prod:\${id}\`);
  if (!val) {
    const lock = await acquireLock(\`lock:\${id}\`);
    if (lock) {
      val = await db.product.findUnique({ where: { id } });
      await redis.set(\`prod:\${id}\`, JSON.stringify(val), 'EX', 300);
      await releaseLock(lock);
    }
  }
  return JSON.parse(val);
}`,
    realProjectExample: 'Preventing cache stampede on viral e-commerce product pages during Black Friday by implementing probabilistic early expiration (XFetch algorithm) in Redis and Cloudflare CDN caching.',
    practicalTask: {
      prompt: 'What is a "Cache Stampede" (Thundering Herd) problem and how does mutex locking prevent it?',
      hint: 'What happens when a popular hot cache key with 10,000 req/sec expires at the exact same millisecond?',
      solution: 'When a hot key expires, thousands of concurrent requests all get a cache MISS simultaneously and bombard the database. A distributed mutex lock ensures only one worker queries the database to repopulate the cache while others wait.'
    },
    commonMisconceptions: 'Assuming setting TTL = 0 means infinite cache. In Redis, TTL = 0 or negative numbers indicate immediate expiration or key absence.',
    remediation: 'Review TTL mechanics and probabilistic early expiration algorithms.',
    quiz: {
      title: 'Multi-Tier Caching Quiz',
      questions: [
        {
          text: 'What causes a Cache Stampede (Thundering Herd) in high-throughput systems?',
          options: [
            'A heavily accessed cache key expires, causing thousands of concurrent requests to simultaneously hit the database',
            'Redis runs out of disk space during persistence snapshots',
            'PostgreSQL locks tables during background vacuuming',
            'Network routers drop UDP packets during peak traffic'
          ],
          answer: 'A heavily accessed cache key expires, causing thousands of concurrent requests to simultaneously hit the database',
          explanation: 'When high-concurrency keys expire without synchronization, all threads miss simultaneously and overwhelm the backend database.',
          difficulty: 3
        }
      ]
    }
  },

  // --- 12. Databases: Relational Joins & Foreign Keys ---
  {
    conceptSlug: 'sql-joins-fks',
    title: 'Relational Joins & Foreign Key Integrity',
    slug: 'relational-joins-and-foreign-key-integrity',
    objective: 'Enforce relational data integrity using foreign keys and master INNER, LEFT, and FULL outer joins.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 10,
    visualType: 'b-tree-indexing',
    analogy: 'A Venn diagram of two overlapping circles. INNER JOIN is the exact middle intersection (only rows matching both sides). LEFT JOIN takes the entire left circle and includes whatever matches from the right circle (or NULL if no match).',
    simpleExample: `SELECT 
  u.id, u.email, o.id as order_id, o.amount
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.status = 'ACTIVE';`,
    realProjectExample: 'Designing user and subscription relationships in PostgreSQL where ON DELETE CASCADE safely removes subscription records if a test account is purged, while maintaining referential consistency.',
    practicalTask: {
      prompt: 'When should you choose LEFT JOIN over INNER JOIN in a user reporting query?',
      hint: 'Do all users necessarily have orders?',
      solution: 'Use LEFT JOIN when you want to include all users in the result set, including users who have never placed an order (their order columns will contain NULL).'
    },
    commonMisconceptions: 'Assuming foreign keys automatically create B-Tree indexes in PostgreSQL. PostgreSQL enforces foreign key constraints but does NOT automatically index the foreign key column; you must create the index manually to optimize JOIN lookups.',
    remediation: 'Always add explicit indexes on foreign key columns (e.g. user_id) in child tables.',
    quiz: {
      title: 'Relational Joins & Integrity Quiz',
      questions: [
        {
          text: 'Does PostgreSQL automatically create an index on a child table column when you define a FOREIGN KEY constraint?',
          options: [
            'No, PostgreSQL does not automatically index foreign key columns; you must create the index manually',
            'Yes, PostgreSQL always creates a composite index on all foreign keys',
            'Only if the column type is UUID',
            'Only in production environments'
          ],
          answer: 'No, PostgreSQL does not automatically index foreign key columns; you must create the index manually',
          explanation: 'Foreign keys enforce referential integrity constraints, but do not create indexes. Indexing the foreign key column is necessary to prevent slow cascading deletes and joins.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 13. Databases: ACID Transactions ---
  {
    conceptSlug: 'sql-acid-transactions',
    title: 'ACID Transactions & Concurrency Isolation',
    slug: 'acid-transactions-and-concurrency-isolation',
    objective: 'Implement atomic multi-table mutations and understand transaction isolation levels against dirty and phantom reads.',
    difficulty: 'ADVANCED',
    estimatedMinutes: 14,
    visualType: 'b-tree-indexing',
    analogy: 'A bank wire transfer between two accounts. Subtracting $100 from Account A and adding $100 to Account B must be Atomic. If the server crashes after step 1, the entire transaction rolls back so money cannot vanish into thin air.',
    simpleExample: `BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 'A';
UPDATE accounts SET balance = balance + 100 WHERE id = 'B';
COMMIT; -- If any step errors, ROLLBACK is called automatically`,
    realProjectExample: 'Using Prisma $transaction to complete a learning session, award XP, update concept mastery, and recalculate continuous streaks atomically, ensuring learner records cannot become desynchronized.',
    practicalTask: {
      prompt: 'What does "Dirty Read" mean in database concurrency and which isolation level prevents it?',
      hint: 'Reading uncommitted data from an ongoing transaction.',
      solution: 'A dirty read occurs when Transaction 1 reads data modified by Transaction 2 before Transaction 2 commits. The READ COMMITTED isolation level (PostgreSQL default) prevents dirty reads.'
    },
    commonMisconceptions: 'Believing higher isolation levels (like SERIALIZABLE) have zero performance cost. Higher isolation increases lock contention, serialization failures, and requires explicit retry handling in application code.',
    remediation: 'Evaluate the tradeoff between concurrency throughput and anomaly protection across Read Committed, Repeatable Read, and Serializable.',
    quiz: {
      title: 'ACID Transactions Quiz',
      questions: [
        {
          text: 'What does the "A" (Atomicity) in ACID guarantee for a database transaction?',
          options: [
            'All operations in the transaction succeed together, or all are rolled back with no partial state persisted',
            'The database executes queries in alphabetical order',
            'Data is stored in atomic molecular particles on disk',
            'Queries run in sub-atomic nanosecond speeds'
          ],
          answer: 'All operations in the transaction succeed together, or all are rolled back with no partial state persisted',
          explanation: 'Atomicity ensures all-or-nothing execution: if any statement in the transaction fails, the entire transaction is rolled back.',
          difficulty: 2
        }
      ]
    }
  },

  // --- 14. AI Engineering: Prompt Engineering ---
  {
    conceptSlug: 'ai-prompt-engineering',
    title: 'Prompt Engineering & Structured Output Contracts',
    slug: 'prompt-engineering-and-structured-output-contracts',
    objective: 'Design reliable LLM prompts with system roles, few-shot examples, and strict JSON schema contracts for backend integration.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 10,
    visualType: 'rag-pipeline',
    analogy: 'Writing a strict API specification for an enthusiastic contractor. If you give vague instructions ("tell me about users"), you get random essays. If you supply an exact JSON schema and clear constraints, you get deterministic, machine-readable output every time.',
    simpleExample: `const prompt = {
  systemInstruction: "You are an expert pedagogical auditor. Return JSON strictly matching the schema.",
  responseSchema: zodToJsonSchema(analysisSchema),
  contents: "Analyze learner evidence: 3 sessions completed, 1 misconception on closures."
};`,
    realProjectExample: 'Prompting Google Gemini using structured JSON schema response constraints to generate pedagogical path revisions that can be validated directly with Zod without parsing markdown codeblocks.',
    practicalTask: {
      prompt: 'Why are few-shot demonstrations more reliable than verbose negative constraints (e.g. "do not do X") in prompt engineering?',
      hint: 'LLMs predict next tokens based on pattern completion.',
      solution: 'Few-shot examples show the concrete input-output pattern for the model to emulate, whereas negative constraints can inadvertently increase attention on the forbidden concept.'
    },
    commonMisconceptions: 'Believing prompt engineering is just asking casually. Production prompt engineering requires temperature calibration, schema enforcement, boundary tests, and deterministic validation.',
    remediation: 'Always parse and validate model responses with strict runtime validators like Zod.',
    quiz: {
      title: 'Prompt Engineering Quiz',
      questions: [
        {
          text: 'What is the most robust way to ensure an LLM returns parseable JSON for a backend service?',
          options: [
            'Using structured outputs with an enforced JSON schema (or Zod validator) and deterministic system instructions',
            'Adding "PLEASE RESPOND IN JSON" in all capital letters',
            'Decreasing the model context window to 50 tokens',
            'Running the prompt through a regex cleaner after output'
          ],
          answer: 'Using structured outputs with an enforced JSON schema (or Zod validator) and deterministic system instructions',
          explanation: 'Structured output schemas supported by modern APIs constrain model decoding directly to valid JSON matching the schema.',
          difficulty: 1
        }
      ]
    }
  },

  // --- 15. AI Engineering: Semantic Search & Embeddings ---
  {
    conceptSlug: 'ai-embeddings-search',
    title: 'Semantic Search & Vector Embeddings',
    slug: 'semantic-search-and-vector-embeddings',
    objective: 'Transform technical concepts and text into high-dimensional vector representations and compute cosine similarity for semantic retrieval.',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 12,
    visualType: 'rag-pipeline',
    analogy: 'A 3D coordinate space for language. "Dog" and "puppy" sit close together at coordinates (1.2, 5.8, 9.1), while "database index" sits far away at (88.4, 2.1, 0.4). Distance measures meaning, not just exact keyword matches.',
    simpleExample: `// Cosine Similarity between vector A and B
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dot / (magA * magB); // Returns value between -1.0 and 1.0
}`,
    realProjectExample: 'Matching a software learner whose query mentions "functions remembering variables" to the concept "Closures & Lexical Scope" even when the word "closure" was never typed.',
    practicalTask: {
      prompt: 'How does semantic vector search overcome the fundamental limitation of traditional SQL `LIKE %query%` searches?',
      hint: 'Think about synonyms, misspellings, and conceptual intent.',
      solution: 'Vector search captures conceptual meaning in high-dimensional embedding space, finding conceptually related documents even when different vocabulary or synonyms are used.'
    },
    commonMisconceptions: 'Thinking higher vector dimensions always means better search. Higher dimensions increase memory and compute latency. 768 to 1536 dimensions usually provide an optimal tradeoff for code and text.',
    remediation: 'Compare keyword search (lexical BM25) with semantic search (dense vector embeddings).',
    quiz: {
      title: 'Vector Embeddings Quiz',
      questions: [
        {
          text: 'What does a text embedding model output for a given string of text?',
          options: [
            'A dense array of floating-point numbers representing semantic position in high-dimensional space',
            'A cryptographic SHA-256 hash string',
            'A compressed ZIP archive of the input characters',
            'An SQL table creation script'
          ],
          answer: 'A dense array of floating-point numbers representing semantic position in high-dimensional space',
          explanation: 'Embeddings convert text into dense numeric vectors where geometric proximity corresponds to semantic similarity.',
          difficulty: 2
        }
      ]
    }
  }
];
