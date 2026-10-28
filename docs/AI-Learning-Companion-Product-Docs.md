# AI Learning Companion --- Product Documentation

------------------------------------------------------------------------

# AI Learning Companion --- Product Requirements Document (PRD)

**Version:** 1.0\
**Status:** Draft for architecture and MVP planning\
**Product:** AI Learning Companion for Software Engineers

------------------------------------------------------------------------

## 1. Product Overview

### 1.1 Product Vision

AI Learning Companion is a personalized learning platform for software
engineers and aspiring software engineers.

The product does not behave like a traditional LMS where users browse
hundreds of courses. Instead, it continuously determines:

> **What should this learner learn next, based on their goal, current
> skill level, performance, knowledge gaps, available time, and learning
> history?**

The core experience is a short daily learning session, typically 10--15
minutes, combining explanation, interaction, assessment, practice, and
recall.

### 1.2 Product Positioning

**Traditional LMS:**

> Here are courses. Choose what you want to learn.

**AI Learning Companion:**

> Tell me what you want to become. I will decide what you should learn
> today.

### 1.3 Initial Target Market

The initial product focuses on:

-   Computer science students
-   B.Tech / BCA / MCA students
-   Junior software developers
-   Developers preparing for job switches
-   Developers preparing for interviews
-   Self-taught developers
-   Bootcamp learners

### 1.4 Initial Learning Domain

The MVP focuses on software engineering.

Initial skill domains:

-   JavaScript
-   TypeScript
-   React
-   Node.js
-   Backend Engineering
-   REST APIs
-   Databases
-   SQL
-   PostgreSQL
-   MongoDB
-   Redis
-   Docker
-   Git
-   Cloud fundamentals
-   AWS fundamentals
-   System Design
-   AI Engineering fundamentals

The architecture must support adding additional domains later without
redesigning the core learner model.

------------------------------------------------------------------------

# 2. Problem Statement

Most learning platforms make the learner responsible for deciding:

-   What to learn
-   In what order to learn it
-   How deeply to learn it
-   Whether they actually understand it
-   When to revise it
-   What to practice
-   When to move to the next topic

This creates several problems:

1.  Learners consume content without building mastery.
2.  Course completion does not necessarily mean skill acquisition.
3.  Learners often skip prerequisites.
4.  Learning paths are mostly static.
5.  Users do not know what to learn each day.
6.  Knowledge decay is not handled effectively.
7.  AI chat can answer questions but does not necessarily manage
    long-term learning.
8.  Learners receive little connection between learning progress and
    career goals.

AI Learning Companion addresses this by creating a continuously updated
learner model and using it to select the next best learning activity.

------------------------------------------------------------------------

# 3. Goals

## 3.1 Primary Goals

1.  Create a personalized learning path for each learner.
2.  Determine the learner's current skill level.
3.  Identify skill gaps and prerequisite gaps.
4.  Automatically select the next learning concept.
5.  Deliver short daily learning sessions.
6.  Combine learning with active recall and practice.
7.  Measure concept-level mastery.
8.  Adapt future lessons based on learner performance.
9.  Connect learning progress to a target software engineering role.
10. Create a subscription-worthy recurring learning experience.

## 3.2 Secondary Goals

1.  Provide AI conversational tutoring.
2.  Provide interactive explanations.
3.  Provide coding challenges.
4.  Provide explain-back assessment.
5.  Provide spaced repetition.
6.  Provide learning analytics.
7.  Provide streaks and lightweight gamification.
8.  Eventually connect GitHub activity to the learner model.
9.  Eventually provide interview and career readiness.

------------------------------------------------------------------------

# 4. Non-Goals for MVP

The MVP will NOT include:

-   A general-purpose course marketplace
-   User-generated course marketplace
-   Live classes
-   University ERP functionality
-   Social network/community
-   Full mobile native applications
-   Advanced GitHub analysis
-   Full job marketplace
-   AI avatars
-   AI video generation
-   100+ subject domains
-   Enterprise multi-tenant administration
-   Complex instructor authoring tools

These may be considered after product-market validation.

------------------------------------------------------------------------

# 5. Core Product Loop

``` text
User Goal
    ↓
Target Role
    ↓
Initial Skill Assessment
    ↓
Learner Model
    ↓
Skill Gap Analysis
    ↓
Personalized Learning Path
    ↓
Today's Learning Session
    ↓
Explanation
    ↓
Interaction / Practice
    ↓
Assessment
    ↓
Mastery Update
    ↓
Recall Scheduling
    ↓
Next Learning Decision
```

The core loop must operate continuously.

------------------------------------------------------------------------

# 6. Personas

## 6.1 Student Developer

Example:

-   21 years old
-   B.Tech student
-   Knows basic JavaScript
-   Wants a software engineering job
-   Does not know what to learn next

Primary needs:

-   Structured roadmap
-   Short daily learning
-   Interview preparation
-   Skill assessment
-   Practice

## 6.2 Junior Developer

Example:

-   0--2 years experience
-   Knows framework basics
-   Wants to become a stronger backend/full-stack engineer

Primary needs:

-   Identify engineering gaps
-   Learn advanced concepts
-   Improve architecture understanding
-   Practice real-world problems

## 6.3 Job Switcher

Example:

-   Existing developer
-   Preparing for product-company interviews

Primary needs:

-   Target-role skill gap
-   System design
-   Coding practice
-   Interview readiness
-   Efficient learning with limited time

------------------------------------------------------------------------

# 7. User Roles

## 7.1 Learner

Can:

-   Create account
-   Set goals
-   Select target role
-   Take assessments
-   Follow learning path
-   Complete lessons
-   Ask AI questions
-   Complete quizzes
-   Complete coding challenges
-   Review concepts
-   Track progress
-   Manage subscription

## 7.2 Admin

Can:

-   Manage users
-   Manage skills
-   Manage concepts
-   Manage learning content
-   Manage assessments
-   Review AI-generated content
-   Monitor AI quality
-   Monitor product analytics
-   Manage plans
-   Manage reported content

------------------------------------------------------------------------

# 8. Feature Requirements

# 8.1 Authentication & Account

### Features

-   Email/password authentication
-   Google OAuth
-   Email verification
-   Password reset
-   Session management
-   Logout from current session
-   Logout from all sessions
-   Account deletion
-   Privacy settings

### Acceptance Criteria

-   Unauthenticated users cannot access protected application routes.
-   Sessions expire according to configured security policy.
-   Account deletion removes or anonymizes user-owned learning data
    according to retention policy.

------------------------------------------------------------------------

# 8.2 Onboarding

The onboarding experience establishes the learner model.

### Step 1 --- Learning Goal

Examples:

-   Become a backend engineer
-   Become a full-stack engineer
-   Prepare for interviews
-   Learn system design
-   Improve JavaScript
-   Learn AI engineering

### Step 2 --- Target Role

Examples:

-   Frontend Developer
-   Backend Developer
-   Full Stack Developer
-   Software Engineer
-   AI Engineer
-   DevOps Engineer

### Step 3 --- Current Experience

Options:

-   Beginner
-   Student
-   Junior
-   Intermediate
-   Advanced

### Step 4 --- Daily Availability

-   5 minutes
-   10 minutes
-   15 minutes
-   20 minutes
-   30+ minutes

### Step 5 --- Existing Skills

User can select known technologies.

### Step 6 --- Assessment

AI-generated or curated assessment determines initial skill levels.

### Step 7 --- Roadmap

The system generates a personalized learning roadmap.

------------------------------------------------------------------------

# 8.3 Skill Assessment

Assessment determines the learner's initial knowledge state.

### Assessment types

-   Multiple choice
-   Short answer
-   Code output questions
-   Debugging questions
-   Code writing
-   Explain-a-concept
-   Scenario questions

### Assessment behavior

The system should eventually support adaptive difficulty.

Example:

``` text
Easy → Correct
       ↓
Medium → Correct
       ↓
Hard → Incorrect
       ↓
Evaluate prerequisite
```

### Assessment output

For each skill:

-   Score
-   Confidence
-   Evidence
-   Weak concepts
-   Strong concepts
-   Recommended next concepts

------------------------------------------------------------------------

# 8.4 Learner Skill Profile

Every learner has a continuously updated skill profile.

Example:

``` text
JavaScript       82%
React            73%
Node.js          67%
SQL              54%
Redis            31%
System Design    22%
Docker           48%
```

Each skill should support:

-   Mastery score
-   Confidence score
-   Last assessed time
-   Last practiced time
-   Number of attempts
-   Correct attempts
-   Incorrect attempts
-   Prerequisite status
-   Evidence history

------------------------------------------------------------------------

# 8.5 Knowledge Graph

The system maintains a graph of:

-   Skills
-   Concepts
-   Sub-concepts
-   Prerequisites
-   Related concepts
-   Learning resources
-   Assessments

Example:

``` text
Backend Engineering
    ├── HTTP
    ├── REST APIs
    ├── Databases
    │     ├── Indexes
    │     ├── Transactions
    │     └── Query Optimization
    └── Caching
          └── Redis
                ├── Pub/Sub
                └── Streams
```

### Requirements

Each concept must support:

-   Difficulty
-   Description
-   Prerequisites
-   Learning objectives
-   Common misconceptions
-   Related skills
-   Assessment mapping

------------------------------------------------------------------------

# 8.6 Personalized Learning Roadmap

The roadmap is generated from:

-   User goal
-   Target role
-   Initial skill assessment
-   Skill prerequisites
-   Current mastery
-   Desired proficiency
-   Available daily time

The roadmap should not be permanently static.

It must change when learner performance changes.

Example:

``` text
Original:
Redis → Redis Streams → Distributed Systems

After assessment:
Redis → Cache Invalidation → Pub/Sub → Redis Streams
```

------------------------------------------------------------------------

# 8.7 Daily Learning Recommendation

This is the central feature.

Every day the recommendation engine determines:

-   Main concept
-   Review concept
-   Practice activity
-   Estimated duration
-   Difficulty
-   Reason for recommendation

Example:

> You struggled with cache invalidation yesterday, so today's session
> revisits it before moving to Redis Streams.

### Recommendation inputs

-   Goal
-   Target role
-   Skill graph
-   Mastery
-   Recent mistakes
-   Recall schedule
-   Time availability
-   Learning history
-   User preferences

------------------------------------------------------------------------

# 8.8 Daily Learning Session

A session should normally take 10--15 minutes.

### Structure

``` text
1. Quick recall
2. Concept explanation
3. Interactive example
4. Practice
5. Assessment
6. Explain-back
7. Summary
```

### Session completion

A session is complete when the required activities are completed or the
user intentionally exits.

------------------------------------------------------------------------

# 8.9 Microlearning Content

Lessons should be short and focused.

Each lesson contains:

-   Learning objective
-   Explanation
-   Example
-   Visual/interactive component where useful
-   Common mistake
-   Practice
-   Recall question

A lesson should avoid unnecessary information.

------------------------------------------------------------------------

# 8.10 Interactive Learning

Where appropriate, concepts should be interactive.

Examples:

### Redis

User changes request volume and cache hit rate.

### Networking

User sends packets through a simulated network.

### Algorithms

User manipulates array elements.

### Databases

User changes indexes and observes query performance.

The architecture should allow future interactive simulations.

------------------------------------------------------------------------

# 8.11 AI Tutor

Learners can ask questions during a lesson.

The tutor must use the learner's context.

Instead of generic:

> Explain Redis.

It should understand:

-   Current lesson
-   Previous concepts
-   Skill level
-   Previous mistakes

The AI should prefer Socratic teaching over immediately giving answers.

------------------------------------------------------------------------

# 8.12 Explain-Back Assessment

The learner is asked to explain a concept in their own words.

Example:

> Explain why Redis can be faster than a relational database for some
> read-heavy workloads.

AI evaluates:

-   Accuracy
-   Completeness
-   Conceptual understanding
-   Misconceptions
-   Clarity

The result updates the learner model.

------------------------------------------------------------------------

# 8.13 Quiz Engine

Supports:

-   MCQ
-   Multiple select
-   True/false
-   Short answer
-   Scenario-based questions

Each attempt records:

-   Answer
-   Correctness
-   Difficulty
-   Time
-   Skill
-   Concept

------------------------------------------------------------------------

# 8.14 Coding Challenges

MVP can start with basic coding challenges.

Requirements:

-   Problem statement
-   Starter code
-   Test cases
-   Execution sandbox
-   Submission
-   Result
-   Hints
-   AI feedback

Security requirements:

-   Sandboxed execution
-   CPU limits
-   Memory limits
-   Execution timeout
-   Network restrictions

------------------------------------------------------------------------

# 8.15 Spaced Repetition

The system schedules review based on:

-   Mastery
-   Last review
-   Recall accuracy
-   Difficulty
-   Forgetting risk

Example:

``` text
Day 1 → Learn
Day 2 → Recall
Day 5 → Recall
Day 12 → Recall
Day 30 → Recall
```

The schedule should adapt based on performance.

------------------------------------------------------------------------

# 8.16 Knowledge Decay

A concept should not remain permanently mastered.

The learner model can estimate confidence decay over time.

Example:

``` text
Mastery:
Day 1   90%
Day 7   82%
Day 21  68%
```

A review can restore confidence.

------------------------------------------------------------------------

# 8.17 Progress Dashboard

Display:

-   Overall learning progress
-   Target-role readiness
-   Skill mastery
-   Weekly learning time
-   Concepts mastered
-   Concepts needing review
-   Streak
-   Recent achievements

Avoid vanity metrics as the primary KPI.

------------------------------------------------------------------------

# 8.18 Skill Dashboard

Display a skill graph.

Example:

``` text
Backend Engineering     72%

HTTP                    91%
REST APIs               83%
PostgreSQL              74%
Caching                 52%
Redis                   31%
System Design           24%
```

Users should be able to drill into a skill and understand why their
score is what it is.

------------------------------------------------------------------------

# 8.19 Roadmap

Roadmap should show:

-   Completed concepts
-   Current concepts
-   Upcoming concepts
-   Blocked concepts
-   Recommended review
-   Estimated time

------------------------------------------------------------------------

# 8.20 Streaks & Gamification

Features:

-   Daily streak
-   XP
-   Levels
-   Achievements
-   Weekly goal
-   Learning milestones

Gamification must never reward meaningless activity over actual
learning.

------------------------------------------------------------------------

# 8.21 Notifications

Notification types:

-   Daily learning reminder
-   Scheduled recall
-   Streak reminder
-   Weekly progress
-   Milestone
-   Incomplete session
-   Subscription events

The system should avoid excessive notifications.

------------------------------------------------------------------------

# 8.22 Audio Learning

V2 feature.

Users can listen to generated lessons.

Features:

-   TTS lesson
-   Play/pause
-   Speed control
-   Resume
-   Voice questions
-   AI spoken responses

Audio should complement visual/interactive learning rather than replace
it for technical concepts.

------------------------------------------------------------------------

# 8.23 Voice Tutor

V2 feature.

User can speak naturally with the tutor.

Flow:

``` text
User Voice
   ↓
Speech-to-Text
   ↓
AI Tutor
   ↓
Text Response
   ↓
Text-to-Speech
```

Conversation context should be retained.

------------------------------------------------------------------------

# 8.24 AI Content Generation

AI can generate:

-   Lessons
-   Examples
-   Questions
-   Quizzes
-   Coding challenges
-   Hints
-   Explanations
-   Recall questions
-   Audio scripts

Generated content should pass automated validation before publication.

------------------------------------------------------------------------

# 8.25 Content Validation

Validation should check:

-   Factual consistency
-   Required learning objectives
-   Difficulty
-   Duplicate content
-   Broken examples
-   Code validity
-   Assessment alignment

High-risk or low-confidence content should be flagged for human review.

------------------------------------------------------------------------

# 8.26 GitHub Integration --- V2

User connects GitHub.

System analyzes:

-   Languages
-   Repositories
-   Project types
-   Commit activity
-   Testing practices
-   Architecture patterns
-   Dependency usage

Example recommendation:

> You build Node.js APIs regularly, but your repositories have limited
> automated testing. Your next learning activity should be integration
> testing.

------------------------------------------------------------------------

# 8.27 Career Readiness --- V2

For a target role, calculate:

-   Skill readiness
-   Interview readiness
-   Project readiness
-   Coding readiness
-   System design readiness

Eventually support:

-   Job description import
-   Skill matching
-   Personalized preparation

------------------------------------------------------------------------

# 8.28 Subscription & Billing

### Free

-   Limited daily learning
-   Basic assessment
-   Limited AI tutor usage
-   Basic progress

### Pro

-   Unlimited learning
-   Personalized roadmap
-   AI tutor
-   Recall
-   Advanced progress
-   Audio

### Premium / Future

-   Coding practice
-   Career readiness
-   Interview preparation
-   GitHub analysis
-   Advanced AI features

Pricing is subject to validation.

------------------------------------------------------------------------

# 8.29 Admin Platform

Admin features:

-   User management
-   Skill management
-   Concept management
-   Content management
-   Assessment management
-   AI content review
-   Reported content
-   Analytics
-   Subscription analytics
-   AI usage monitoring
-   System health

------------------------------------------------------------------------

# 9. Non-Functional Requirements

## Performance

-   API p95 target: \< 500 ms for normal non-AI APIs
-   AI response latency should be minimized through streaming where
    appropriate.
-   Daily lesson should load progressively.
-   Heavy generation should use background jobs.

## Availability

Target initial production availability:

-   99.5%+

## Security

-   Secure authentication
-   Authorization
-   Rate limiting
-   Input validation
-   Secret management
-   Encryption in transit
-   Secure database access
-   Secure code execution

## Scalability

Architecture should support:

-   10k users
-   100k users
-   Background AI processing
-   Queue-based workloads
-   Horizontal API scaling

## Observability

Track:

-   API latency
-   AI latency
-   AI token usage
-   Errors
-   Queue failures
-   Database performance
-   Subscription events

------------------------------------------------------------------------

# 10. Core Product Metrics

## Activation

-   Signup → onboarding completion
-   Assessment completion
-   First lesson completion

## Engagement

-   D1 retention
-   D7 retention
-   D30 retention
-   Lessons/user/week
-   Learning minutes/user/week

## Learning

-   Concept mastery improvement
-   Recall accuracy
-   Assessment improvement
-   Skill progression

## Monetization

-   Free → paid conversion
-   MRR
-   ARPU
-   Churn
-   Renewal rate
-   LTV

------------------------------------------------------------------------

# 11. MVP Scope

### Must Have

-   Authentication
-   Onboarding
-   Goal selection
-   Target role
-   Initial assessment
-   Skill profile
-   Skill graph
-   Personalized roadmap
-   Daily lesson
-   AI tutor
-   Quiz
-   Explain-back
-   Progress
-   Basic streak
-   Subscription

### Should Have

-   Coding challenges
-   Spaced repetition
-   Recall
-   Notifications

### Later

-   Voice
-   Audio
-   GitHub
-   Career matching
-   Advanced simulations
-   Mobile apps

------------------------------------------------------------------------

# 12. MVP Success Criteria

The MVP should not be considered successful merely because users sign
up.

Initial validation targets:

-   Strong onboarding completion
-   Strong first-session completion
-   Meaningful Day-7 retention
-   Users completing multiple learning sessions
-   Users reporting measurable improvement
-   First paying users
-   Evidence that users are willing to pay for continued personalization

Exact targets should be established after the first controlled beta.

------------------------------------------------------------------------

# 13. Product Risks

## Risk 1 --- ChatGPT substitution

Mitigation:

-   Learner model
-   Skill graph
-   Long-term progression
-   Spaced repetition
-   Assessment
-   Personalized recommendation

## Risk 2 --- Low retention

Mitigation:

-   Goal-driven learning
-   Daily recommendation
-   Short sessions
-   Measurable skill progression
-   Career relevance

## Risk 3 --- AI hallucination

Mitigation:

-   Curated source content
-   Content validation
-   Structured generation
-   Human review
-   Technical benchmarks

## Risk 4 --- AI cost

Mitigation:

-   Model routing
-   Caching
-   Structured prompts
-   Small models for simple tasks
-   Usage limits
-   Background processing

## Risk 5 --- Weak learning outcomes

Mitigation:

-   Active recall
-   Explain-back
-   Coding practice
-   Adaptive assessment
-   Knowledge decay tracking

------------------------------------------------------------------------

# 14. Future Vision

The long-term product evolves into:

``` text
             AI LEARNING COMPANION
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
     LEARNING        CAREER       ENGINEERING
        │              │              │
    Lessons         Job Skills      GitHub
    Practice        Interviews      Projects
    Recall          Resume          Code
    Assessment      Matching        Architecture
        │              │              │
        └──────────────┼──────────────┘
                       ↓
              PERSONAL AI CAREER OS
```

The long-term objective is not to become another content library.

It is to become the learner's continuously updated:

> **AI Learning + Skill Development + Career Intelligence System.**

------------------------------------------------------------------------

# AI Learning Companion --- ERD

This document defines the proposed relational data model for the MVP and
near-term V2 architecture.

> The schema is intentionally modular. Some implementation details such
> as audit logs, provider-specific payment tables, and infrastructure
> metadata can be added without changing the core learning model.

## Mermaid ERD

``` mermaid
erDiagram

    USER {
        uuid id PK
        string email UK
        string password_hash
        string auth_provider
        string status
        datetime created_at
        datetime updated_at
    }

    USER_PROFILE {
        uuid id PK
        uuid user_id FK
        string display_name
        string experience_level
        int daily_minutes
        string timezone
        string avatar_url
        datetime created_at
        datetime updated_at
    }

    LEARNING_GOAL {
        uuid id PK
        uuid user_id FK
        uuid target_role_id FK
        string title
        string status
        int target_readiness
        datetime started_at
        datetime target_date
        datetime created_at
    }

    TARGET_ROLE {
        uuid id PK
        string name
        string description
        string status
        datetime created_at
    }

    ROLE_SKILL {
        uuid id PK
        uuid target_role_id FK
        uuid skill_id FK
        int required_level
        int importance
    }

    SKILL {
        uuid id PK
        uuid parent_skill_id FK
        string name
        string description
        string category
        int difficulty
        datetime created_at
    }

    SKILL_PREREQUISITE {
        uuid id PK
        uuid skill_id FK
        uuid prerequisite_skill_id FK
        int strength
    }

    CONCEPT {
        uuid id PK
        uuid skill_id FK
        string name
        string description
        string difficulty
        string status
        datetime created_at
    }

    CONCEPT_PREREQUISITE {
        uuid id PK
        uuid concept_id FK
        uuid prerequisite_concept_id FK
        int strength
    }

    USER_SKILL {
        uuid id PK
        uuid user_id FK
        uuid skill_id FK
        decimal mastery_score
        decimal confidence_score
        datetime last_assessed_at
        datetime last_practiced_at
        datetime updated_at
    }

    USER_CONCEPT {
        uuid id PK
        uuid user_id FK
        uuid concept_id FK
        decimal mastery_score
        decimal confidence_score
        int attempts
        int correct_attempts
        datetime last_seen_at
        datetime next_review_at
        datetime updated_at
    }

    ASSESSMENT {
        uuid id PK
        string title
        string type
        uuid skill_id FK
        string difficulty
        string status
        datetime created_at
    }

    ASSESSMENT_QUESTION {
        uuid id PK
        uuid assessment_id FK
        uuid concept_id FK
        string question_type
        text question_text
        json options
        json answer
        int difficulty
    }

    ASSESSMENT_ATTEMPT {
        uuid id PK
        uuid user_id FK
        uuid assessment_id FK
        decimal score
        int duration_seconds
        datetime started_at
        datetime completed_at
    }

    ASSESSMENT_RESPONSE {
        uuid id PK
        uuid attempt_id FK
        uuid question_id FK
        text response
        boolean is_correct
        decimal confidence
        text feedback
        datetime created_at
    }

    LEARNING_PATH {
        uuid id PK
        uuid user_id FK
        uuid learning_goal_id FK
        string title
        string status
        decimal completion_percentage
        datetime created_at
        datetime updated_at
    }

    LEARNING_PATH_ITEM {
        uuid id PK
        uuid learning_path_id FK
        uuid concept_id FK
        int sequence_order
        string status
        string reason
        datetime completed_at
    }

    LESSON {
        uuid id PK
        uuid concept_id FK
        string title
        text objective
        text content
        string difficulty
        int estimated_minutes
        string content_version
        string status
        datetime created_at
        datetime updated_at
    }

    LESSON_ACTIVITY {
        uuid id PK
        uuid lesson_id FK
        string activity_type
        int sequence_order
        json content
        int estimated_seconds
    }

    LEARNING_SESSION {
        uuid id PK
        uuid user_id FK
        uuid lesson_id FK
        string session_type
        string status
        int duration_seconds
        datetime started_at
        datetime completed_at
    }

    QUIZ {
        uuid id PK
        uuid lesson_id FK
        string title
        string status
    }

    QUIZ_QUESTION {
        uuid id PK
        uuid quiz_id FK
        uuid concept_id FK
        string question_type
        text question_text
        json options
        json answer
        int difficulty
    }

    QUIZ_ATTEMPT {
        uuid id PK
        uuid user_id FK
        uuid quiz_id FK
        decimal score
        int duration_seconds
        datetime started_at
        datetime completed_at
    }

    QUIZ_RESPONSE {
        uuid id PK
        uuid attempt_id FK
        uuid question_id FK
        text response
        boolean is_correct
        decimal confidence
        text feedback
    }

    CODING_CHALLENGE {
        uuid id PK
        uuid concept_id FK
        string title
        text problem_statement
        text starter_code
        json test_cases
        string language
        string difficulty
        string status
    }

    CODE_SUBMISSION {
        uuid id PK
        uuid user_id FK
        uuid challenge_id FK
        text code
        string language
        string status
        decimal score
        int execution_time_ms
        int memory_kb
        text ai_feedback
        datetime submitted_at
    }

    EXPLAIN_BACK_ATTEMPT {
        uuid id PK
        uuid user_id FK
        uuid concept_id FK
        text response_text
        decimal accuracy_score
        decimal completeness_score
        decimal clarity_score
        decimal overall_score
        json misconceptions
        text feedback
        datetime created_at
    }

    RECALL_SCHEDULE {
        uuid id PK
        uuid user_id FK
        uuid concept_id FK
        datetime scheduled_at
        int interval_days
        decimal predicted_recall
        string status
    }

    RECALL_ATTEMPT {
        uuid id PK
        uuid schedule_id FK
        uuid user_id FK
        uuid concept_id FK
        int rating
        boolean recalled
        decimal confidence
        datetime attempted_at
    }

    AI_CONVERSATION {
        uuid id PK
        uuid user_id FK
        uuid lesson_id FK
        string context_type
        datetime created_at
        datetime updated_at
    }

    AI_MESSAGE {
        uuid id PK
        uuid conversation_id FK
        string role
        text content
        string model
        int input_tokens
        int output_tokens
        datetime created_at
    }

    LEARNING_ACTIVITY {
        uuid id PK
        uuid user_id FK
        uuid concept_id FK
        string activity_type
        string source_type
        uuid source_id
        decimal score
        int duration_seconds
        datetime created_at
    }

    STREAK {
        uuid id PK
        uuid user_id FK
        int current_streak
        int longest_streak
        date last_activity_date
        datetime updated_at
    }

    ACHIEVEMENT {
        uuid id PK
        string code UK
        string name
        string description
        int xp
    }

    USER_ACHIEVEMENT {
        uuid id PK
        uuid user_id FK
        uuid achievement_id FK
        datetime earned_at
    }

    XP_TRANSACTION {
        uuid id PK
        uuid user_id FK
        string source_type
        uuid source_id
        int amount
        datetime created_at
    }

    NOTIFICATION {
        uuid id PK
        uuid user_id FK
        string type
        string title
        text body
        string status
        datetime scheduled_at
        datetime sent_at
        datetime read_at
    }

    SUBSCRIPTION_PLAN {
        uuid id PK
        string name
        string code UK
        decimal monthly_price
        decimal annual_price
        string currency
        json features
        string status
    }

    SUBSCRIPTION {
        uuid id PK
        uuid user_id FK
        uuid plan_id FK
        string provider
        string provider_customer_id
        string provider_subscription_id
        string status
        datetime current_period_start
        datetime current_period_end
        datetime canceled_at
        datetime created_at
    }

    PAYMENT {
        uuid id PK
        uuid user_id FK
        uuid subscription_id FK
        string provider
        string provider_payment_id
        decimal amount
        string currency
        string status
        datetime paid_at
        datetime created_at
    }

    USER ||--|| USER_PROFILE : has
    USER ||--o{ LEARNING_GOAL : creates
    TARGET_ROLE ||--o{ LEARNING_GOAL : selected_for
    TARGET_ROLE ||--o{ ROLE_SKILL : requires
    SKILL ||--o{ ROLE_SKILL : required_by

    SKILL ||--o{ SKILL : contains
    SKILL ||--o{ SKILL_PREREQUISITE : requires
    SKILL ||--o{ SKILL_PREREQUISITE : prerequisite_for

    SKILL ||--o{ CONCEPT : contains
    CONCEPT ||--o{ CONCEPT_PREREQUISITE : requires
    CONCEPT ||--o{ CONCEPT_PREREQUISITE : prerequisite_for

    USER ||--o{ USER_SKILL : develops
    SKILL ||--o{ USER_SKILL : tracked_for

    USER ||--o{ USER_CONCEPT : learns
    CONCEPT ||--o{ USER_CONCEPT : tracked_for

    SKILL ||--o{ ASSESSMENT : assesses
    ASSESSMENT ||--o{ ASSESSMENT_QUESTION : contains
    CONCEPT ||--o{ ASSESSMENT_QUESTION : tests

    USER ||--o{ ASSESSMENT_ATTEMPT : makes
    ASSESSMENT ||--o{ ASSESSMENT_ATTEMPT : attempted_as
    ASSESSMENT_ATTEMPT ||--o{ ASSESSMENT_RESPONSE : contains
    ASSESSMENT_QUESTION ||--o{ ASSESSMENT_RESPONSE : answered_by

    USER ||--o{ LEARNING_PATH : owns
    LEARNING_GOAL ||--o{ LEARNING_PATH : produces
    LEARNING_PATH ||--o{ LEARNING_PATH_ITEM : contains
    CONCEPT ||--o{ LEARNING_PATH_ITEM : appears_in

    CONCEPT ||--o{ LESSON : taught_by
    LESSON ||--o{ LESSON_ACTIVITY : contains
    USER ||--o{ LEARNING_SESSION : completes
    LESSON ||--o{ LEARNING_SESSION : used_in

    LESSON ||--o{ QUIZ : has
    QUIZ ||--o{ QUIZ_QUESTION : contains
    CONCEPT ||--o{ QUIZ_QUESTION : tests
    USER ||--o{ QUIZ_ATTEMPT : makes
    QUIZ ||--o{ QUIZ_ATTEMPT : attempted_as
    QUIZ_ATTEMPT ||--o{ QUIZ_RESPONSE : contains
    QUIZ_QUESTION ||--o{ QUIZ_RESPONSE : answered_by

    CONCEPT ||--o{ CODING_CHALLENGE : tests
    USER ||--o{ CODE_SUBMISSION : submits
    CODING_CHALLENGE ||--o{ CODE_SUBMISSION : receives

    USER ||--o{ EXPLAIN_BACK_ATTEMPT : performs
    CONCEPT ||--o{ EXPLAIN_BACK_ATTEMPT : evaluates

    USER ||--o{ RECALL_SCHEDULE : owns
    CONCEPT ||--o{ RECALL_SCHEDULE : scheduled_for
    RECALL_SCHEDULE ||--o{ RECALL_ATTEMPT : produces
    USER ||--o{ RECALL_ATTEMPT : performs
    CONCEPT ||--o{ RECALL_ATTEMPT : recalls

    USER ||--o{ AI_CONVERSATION : starts
    LESSON ||--o{ AI_CONVERSATION : contextualizes
    AI_CONVERSATION ||--o{ AI_MESSAGE : contains

    USER ||--o{ LEARNING_ACTIVITY : performs
    CONCEPT ||--o{ LEARNING_ACTIVITY : relates_to

    USER ||--|| STREAK : owns
    USER ||--o{ USER_ACHIEVEMENT : earns
    ACHIEVEMENT ||--o{ USER_ACHIEVEMENT : awarded_as
    USER ||--o{ XP_TRANSACTION : earns

    USER ||--o{ NOTIFICATION : receives

    SUBSCRIPTION_PLAN ||--o{ SUBSCRIPTION : selected_by
    USER ||--o{ SUBSCRIPTION : has
    SUBSCRIPTION ||--o{ PAYMENT : generates
    USER ||--o{ PAYMENT : makes
```

## Core ERD Design Principles

### User model

`USER` contains authentication/account identity. `USER_PROFILE` contains
learning-related profile information.

### Skill model

`SKILL` represents broad competencies such as Backend Engineering or
Redis.

`CONCEPT` represents teachable units such as Cache Invalidation or Redis
Pub/Sub.

### Learner model

`USER_SKILL` and `USER_CONCEPT` are the primary learner-state tables.

They should store evidence-derived mastery rather than a single static
"level".

### Assessment model

Assessments and quiz attempts are separate because:

-   Initial assessments determine baseline knowledge.
-   Quizzes are recurring learning activities.

### Learning model

`LEARNING_PATH` is the current personalized roadmap.

`LEARNING_PATH_ITEM` stores the sequence and current status.

The roadmap can be regenerated or reordered without deleting historical
learning activity.

### History

`LEARNING_ACTIVITY`, attempts, submissions, and recall records preserve
evidence used by the recommendation engine.

### Billing

Subscription provider identifiers are stored separately from internal
subscription state so payment-provider changes do not require
redesigning the learning model.

------------------------------------------------------------------------

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
