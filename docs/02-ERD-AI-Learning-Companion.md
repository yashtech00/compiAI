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
