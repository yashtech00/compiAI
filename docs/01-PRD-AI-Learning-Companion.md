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
