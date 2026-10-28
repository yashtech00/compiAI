# AI Learning Companion --- Data Flow Diagrams

This document defines the logical data flows for the AI Learning
Companion.

------------------------------------------------------------------------

# 1. System Context / Level 0 DFD

``` mermaid
flowchart LR

    U[👤 Learner]
    A[AI Learning Companion]
    AI[🤖 AI Model Providers]
    DB[(PostgreSQL)]
    R[(Redis / Cache)]
    Q[Queue / Workers]
    PAY[Payment Provider]
    NOTIF[Notification Provider]

    U -->|Goals, profile, answers, code, feedback| A
    A -->|Lessons, recommendations, feedback, progress| U

    A -->|AI prompts / structured generation| AI
    AI -->|Lessons, evaluation, recommendations| A

    A -->|User, skill, learning, billing data| DB
    DB -->|Learner state and content| A

    A -->|Cache / sessions / rate limits| R
    R -->|Cached state| A

    A -->|Long-running jobs| Q
    Q -->|Generated content / analytics / notifications| A

    A -->|Payment / subscription events| PAY
    PAY -->|Webhook / payment status| A

    A -->|Reminder requests| NOTIF
    NOTIF -->|Delivery status| A
```

------------------------------------------------------------------------

# 2. Level 1 DFD --- Major System Components

``` mermaid
flowchart TB

    U[👤 Learner]

    AUTH[1. Authentication & Account]
    ONB[2. Onboarding & Goal Management]
    ASM[3. Assessment Engine]
    LMS[4. Learning Management]
    LEARNER[5. Learner Intelligence]
    REC[6. Recommendation Engine]
    CONTENT[7. AI Content Engine]
    TUTOR[8. AI Tutor]
    PRACTICE[9. Practice & Evaluation]
    RECALL[10. Recall & Spaced Repetition]
    ANALYTICS[11. Analytics]
    BILLING[12. Subscription & Billing]
    NOTIFICATION[13. Notification Engine]

    DB[(PostgreSQL)]
    CACHE[(Redis)]
    QUEUE[[Job Queue]]
    AI[AI Models]
    CODE[Code Execution Sandbox]
    PAY[Payment Provider]
    PUSH[Email / Push / Notification Provider]

    U --> AUTH
    U --> ONB
    U --> ASM
    U --> LMS
    U --> TUTOR
    U --> PRACTICE
    U --> RECALL
    U --> BILLING

    AUTH --> DB
    ONB --> DB
    ASM --> DB
    LMS --> DB
    LEARNER --> DB
    REC --> DB
    CONTENT --> DB
    TUTOR --> DB
    PRACTICE --> DB
    RECALL --> DB
    ANALYTICS --> DB
    BILLING --> DB
    NOTIFICATION --> DB

    ASM --> LEARNER
    PRACTICE --> LEARNER
    RECALL --> LEARNER
    TUTOR --> LEARNER
    LMS --> LEARNER

    LEARNER --> REC
    REC --> CONTENT
    CONTENT --> AI
    TUTOR --> AI
    ASM --> AI
    PRACTICE --> AI

    PRACTICE --> CODE

    REC --> CACHE
    LEARNER --> CACHE
    AUTH --> CACHE

    CONTENT --> QUEUE
    NOTIFICATION --> QUEUE
    ANALYTICS --> QUEUE
    RECALL --> QUEUE

    BILLING --> PAY
    PAY --> BILLING

    NOTIFICATION --> PUSH
    PUSH --> NOTIFICATION
```

------------------------------------------------------------------------

# 3. Level 2 --- Onboarding & Initial Assessment

``` mermaid
sequenceDiagram

    participant U as Learner
    participant FE as Frontend
    participant API as API
    participant GOAL as Goal Service
    participant ASM as Assessment Engine
    participant AI as AI Model
    participant LI as Learner Intelligence
    participant DB as PostgreSQL

    U->>FE: Sign up
    FE->>API: Create account
    API->>DB: Create USER

    U->>FE: Select learning goal
    FE->>API: Submit goal + target role
    API->>GOAL: Create learning goal
    GOAL->>DB: Save goal

    U->>FE: Select experience + existing skills
    FE->>API: Submit profile
    API->>DB: Save profile

    API->>ASM: Generate assessment
    ASM->>DB: Load target-role skills
    ASM->>AI: Generate/adapt questions
    AI-->>ASM: Assessment questions
    ASM-->>FE: Assessment

    U->>FE: Submit answers
    FE->>API: Assessment responses
    API->>ASM: Evaluate attempt
    ASM->>AI: Evaluate open-ended responses
    AI-->>ASM: Evaluation

    ASM->>LI: Update learner skill state
    LI->>DB: Save USER_SKILL / USER_CONCEPT

    LI-->>API: Initial skill profile
    API-->>FE: Skill profile + gaps
```

------------------------------------------------------------------------

# 4. Level 2 --- Personalized Roadmap Generation

``` mermaid
flowchart TD

    GOAL[Learning Goal]
    ROLE[Target Role]
    SKILL[Current Skill State]
    GRAPH[Knowledge Graph]
    HISTORY[Learning History]
    TIME[Daily Time]

    INPUT[Recommendation Inputs]

    ENGINE[Recommendation Engine]
    GAP[Skill Gap Analysis]
    PREREQ[Prerequisite Resolver]
    PRIORITY[Concept Prioritization]
    PATH[Learning Path Generator]

    DB[(PostgreSQL)]

    GOAL --> INPUT
    ROLE --> INPUT
    SKILL --> INPUT
    GRAPH --> INPUT
    HISTORY --> INPUT
    TIME --> INPUT

    INPUT --> GAP
    GAP --> PREREQ
    PREREQ --> PRIORITY
    PRIORITY --> ENGINE
    ENGINE --> PATH

    PATH --> DB
    DB --> PATH

    PATH --> OUTPUT[Personalized Learning Roadmap]
```

------------------------------------------------------------------------

# 5. Level 2 --- Daily Learning Recommendation

``` mermaid
flowchart TD

    START[User Opens App]

    GOAL[Learning Goal]
    ROLE[Target Role]
    MASTERY[Current Mastery]
    HISTORY[Recent Learning]
    MISTAKES[Recent Mistakes]
    RECALL[Due Reviews]
    TIME[Available Time]
    PREREQ[Prerequisites]

    DECISION[Recommendation Engine]

    REVIEW[Review Concept]
    NEW[New Concept]
    PRACTICE[Practice Activity]
    CODING[Coding Challenge]

    LESSON[Generate / Select Lesson]
    OUTPUT[Today's Learning Session]

    START --> DECISION

    GOAL --> DECISION
    ROLE --> DECISION
    MASTERY --> DECISION
    HISTORY --> DECISION
    MISTAKES --> DECISION
    RECALL --> DECISION
    TIME --> DECISION
    PREREQ --> DECISION

    DECISION --> REVIEW
    DECISION --> NEW
    DECISION --> PRACTICE
    DECISION --> CODING

    REVIEW --> LESSON
    NEW --> LESSON
    PRACTICE --> LESSON
    CODING --> LESSON

    LESSON --> OUTPUT
```

------------------------------------------------------------------------

# 6. Level 2 --- Daily Learning Session

``` mermaid
sequenceDiagram

    participant U as Learner
    participant FE as Frontend
    participant API as API
    participant REC as Recommendation Engine
    participant LI as Learner Intelligence
    participant CONTENT as Content Engine
    participant AI as AI
    participant DB as PostgreSQL

    U->>FE: Open Today's Learning
    FE->>API: Request today's session

    API->>REC: Determine next activity
    REC->>LI: Read learner state
    LI->>DB: Load mastery + history
    DB-->>LI: Learner state
    LI-->>REC: Current state

    REC->>CONTENT: Select/generate lesson
    CONTENT->>AI: Generate lesson if needed
    AI-->>CONTENT: Structured lesson
    CONTENT-->>REC: Lesson

    REC-->>API: Today's session
    API-->>FE: Lesson

    U->>FE: Complete lesson activities
    FE->>API: Activity results

    API->>LI: Update learner state
    LI->>DB: Save activity + mastery

    LI-->>API: Updated mastery
    API-->>FE: Progress + next activity
```

------------------------------------------------------------------------

# 7. Level 2 --- Quiz / Assessment Flow

``` mermaid
flowchart TD

    START[Start Quiz]
    QUESTIONS[Load Questions]
    ANSWERS[User Answers]
    EVAL[Evaluation Engine]

    MCQ[Objective Evaluation]
    AI_EVAL[AI Evaluation]
    RUBRIC[Evaluation Rubric]

    SCORE[Calculate Score]
    MISCONCEPTIONS[Detect Misconceptions]
    UPDATE[Update Learner Model]

    MASTERY[(User Concept / Skill)]
    NEXT[Recommendation Engine]

    START --> QUESTIONS
    QUESTIONS --> ANSWERS
    ANSWERS --> EVAL

    EVAL --> MCQ
    EVAL --> AI_EVAL
    AI_EVAL --> RUBRIC

    MCQ --> SCORE
    RUBRIC --> SCORE

    SCORE --> MISCONCEPTIONS
    MISCONCEPTIONS --> UPDATE

    UPDATE --> MASTERY
    MASTERY --> NEXT
    NEXT --> FOLLOWUP[Next Learning Activity]
```

------------------------------------------------------------------------

# 8. Level 2 --- Explain-Back Flow

``` mermaid
sequenceDiagram

    participant U as Learner
    participant FE as Frontend
    participant API as API
    participant AI as AI Evaluator
    participant LI as Learner Intelligence
    participant DB as PostgreSQL

    U->>FE: Explain concept in own words
    FE->>API: Submit explanation

    API->>AI: Evaluate explanation
    Note over AI: Accuracy + completeness + misconceptions + clarity

    AI-->>API: Evaluation + feedback

    API->>LI: Update concept mastery
    LI->>DB: Save explain-back attempt
    LI->>DB: Update USER_CONCEPT

    LI-->>API: Updated mastery
    API-->>FE: Feedback + next recommendation
```

------------------------------------------------------------------------

# 9. Level 2 --- Coding Challenge Flow

``` mermaid
sequenceDiagram

    participant U as Learner
    participant FE as Frontend
    participant API as API
    participant SANDBOX as Code Sandbox
    participant AI as AI Evaluator
    participant LI as Learner Intelligence
    participant DB as PostgreSQL

    U->>FE: Submit code
    FE->>API: Code submission

    API->>SANDBOX: Execute in isolated environment
    SANDBOX-->>API: Test results + execution metrics

    API->>AI: Analyze solution
    AI-->>API: Code feedback

    API->>DB: Save CODE_SUBMISSION
    API->>LI: Update skill evidence

    LI->>DB: Update USER_SKILL / USER_CONCEPT

    API-->>FE: Result + feedback + next action
```

------------------------------------------------------------------------

# 10. Level 2 --- Spaced Repetition Flow

``` mermaid
flowchart TD

    EVENT[Learning / Quiz / Coding / Explain-back Result]

    MASTERY[Current Concept Mastery]
    RECALL_SCORE[Recall Performance]
    LAST_REVIEW[Last Review]
    DECAY[Knowledge Decay Model]

    SCHEDULER[Recall Scheduler]

    NEXT_DATE[Next Review Date]
    QUEUE[Recall Queue]
    NOTIFICATION[Notification Engine]

    EVENT --> MASTERY
    EVENT --> RECALL_SCORE
    EVENT --> LAST_REVIEW
    LAST_REVIEW --> DECAY

    MASTERY --> SCHEDULER
    RECALL_SCORE --> SCHEDULER
    DECAY --> SCHEDULER

    SCHEDULER --> NEXT_DATE
    NEXT_DATE --> QUEUE
    QUEUE --> NOTIFICATION
    NOTIFICATION --> USER[👤 Learner]
```

------------------------------------------------------------------------

# 11. Level 2 --- AI Tutor Flow

``` mermaid
sequenceDiagram

    participant U as Learner
    participant FE as Frontend
    participant API as API
    participant CONTEXT as Learning Context
    participant AI as AI Tutor
    participant DB as PostgreSQL

    U->>FE: Ask question
    FE->>API: Question

    API->>CONTEXT: Build learner context
    CONTEXT->>DB: Load current lesson
    CONTEXT->>DB: Load skill state
    CONTEXT->>DB: Load recent mistakes
    DB-->>CONTEXT: Learning context

    CONTEXT->>AI: Question + learner context
    AI-->>CONTEXT: Personalized response

    CONTEXT->>DB: Save conversation
    CONTEXT-->>API: Response
    API-->>FE: Tutor response
```

------------------------------------------------------------------------

# 12. Level 2 --- Subscription Flow

``` mermaid
sequenceDiagram

    participant U as Learner
    participant FE as Frontend
    participant API as API
    participant BILL as Billing Service
    participant PAY as Payment Provider
    participant DB as PostgreSQL

    U->>FE: Select plan
    FE->>API: Create checkout request

    API->>BILL: Create checkout
    BILL->>PAY: Create payment/subscription
    PAY-->>BILL: Checkout information
    BILL-->>FE: Checkout

    U->>PAY: Complete payment

    PAY->>BILL: Payment webhook
    BILL->>DB: Update SUBSCRIPTION
    BILL->>DB: Create PAYMENT

    BILL-->>API: Subscription active
    API-->>FE: Unlock plan entitlements
```

------------------------------------------------------------------------

# 13. Overall Learning Intelligence Flow

This is the most important logical flow in the system.

``` mermaid
flowchart LR

    ACTIVITY[User Activity]
    ASSESS[Assessments]
    QUIZ[Quiz Results]
    CODE[Code Performance]
    EXPLAIN[Explain-Back]
    RECALL[Recall Results]
    CHAT[AI Tutor Signals]

    EVIDENCE[Learning Evidence]

    LEARNER[ Learner Intelligence Engine ]

    USER_SKILL[Skill Mastery]
    USER_CONCEPT[Concept Mastery]
    MISCONCEPTIONS[Misconceptions]
    CONFIDENCE[Confidence]
    DECAY[Knowledge Decay]

    GAP[Skill Gap Engine]
    PREREQ[Prerequisite Engine]
    PRIORITY[Learning Priority]

    RECOMMEND[Recommendation Engine]

    LESSON[Lesson]
    PRACTICE[Practice]
    REVIEW[Recall]
    CODE_TASK[Coding Challenge]

    ACTIVITY --> EVIDENCE
    ASSESS --> EVIDENCE
    QUIZ --> EVIDENCE
    CODE --> EVIDENCE
    EXPLAIN --> EVIDENCE
    RECALL --> EVIDENCE
    CHAT --> EVIDENCE

    EVIDENCE --> LEARNER

    LEARNER --> USER_SKILL
    LEARNER --> USER_CONCEPT
    LEARNER --> MISCONCEPTIONS
    LEARNER --> CONFIDENCE
    LEARNER --> DECAY

    USER_SKILL --> GAP
    USER_CONCEPT --> GAP
    MISCONCEPTIONS --> GAP
    DECAY --> GAP

    GAP --> PREREQ
    PREREQ --> PRIORITY
    PRIORITY --> RECOMMEND

    RECOMMEND --> LESSON
    RECOMMEND --> PRACTICE
    RECOMMEND --> REVIEW
    RECOMMEND --> CODE_TASK

    LESSON --> ACTIVITY
    PRACTICE --> ACTIVITY
    REVIEW --> ACTIVITY
    CODE_TASK --> ACTIVITY
```

------------------------------------------------------------------------

# 14. Data Classification

The system handles several classes of data.

  Data                Examples                          Primary Storage
  ------------------- --------------------------------- -------------------------------
  Identity            email, profile                    PostgreSQL
  Learning goals      target role, goals                PostgreSQL
  Skill state         mastery, confidence               PostgreSQL
  Knowledge graph     skills, concepts, prerequisites   PostgreSQL
  Learning history    attempts, sessions                PostgreSQL
  AI conversations    prompts, responses                PostgreSQL
  Generated content   lessons, questions                PostgreSQL / Object Storage
  Temporary state     sessions, cache                   Redis
  Background work     generation, notifications         Queue
  Code execution      submissions, results              Sandbox + PostgreSQL
  Billing             subscriptions, payments           PostgreSQL + Payment Provider

------------------------------------------------------------------------

# 15. Important Data Flow Principles

1.  The AI model should not be the system of record.
2.  PostgreSQL remains the source of truth for learner state.
3.  AI outputs should be structured and validated.
4.  Recommendation decisions should combine deterministic rules with AI
    reasoning.
5.  Long-running AI generation should use background workers.
6.  Code must execute in an isolated sandbox.
7.  Subscription state should be driven by verified payment-provider
    webhooks.
8.  Learning evidence should be preserved so recommendation decisions
    can be explained.
9.  User data should be minimized and protected.
10. The system should be designed so an AI provider can be replaced
    without rewriting the core product.
