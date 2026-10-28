-- AlterTable
ALTER TABLE "learning_paths" ADD COLUMN     "analysis_type" TEXT,
ADD COLUMN     "confidence" DOUBLE PRECISION DEFAULT 1.0,
ADD COLUMN     "evidence_summary" JSONB,
ADD COLUMN     "previous_path_id" TEXT,
ADD COLUMN     "trigger_reason" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "learning_sessions" ADD COLUMN     "explain_attempt_id" TEXT,
ADD COLUMN     "final_mastery" DOUBLE PRECISION,
ADD COLUMN     "hints_used" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "initial_mastery" DOUBLE PRECISION,
ADD COLUMN     "quiz_attempt_id" TEXT;

-- AlterTable
ALTER TABLE "user_concepts" ADD COLUMN     "assisted_successes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "hints_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "independent_successes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN     "last_full_review_active_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_long_term_active_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_mini_analysis_session_count" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "learning_activities_user_id_created_at_idx" ON "learning_activities"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "learning_sessions_user_id_status_idx" ON "learning_sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "learning_sessions_user_id_lesson_id_status_idx" ON "learning_sessions"("user_id", "lesson_id", "status");

-- CreateIndex
CREATE INDEX "recall_schedules_user_id_scheduled_at_status_idx" ON "recall_schedules"("user_id", "scheduled_at", "status");

-- CreateIndex
CREATE INDEX "user_concepts_user_id_mastery_score_idx" ON "user_concepts"("user_id", "mastery_score");

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_previous_path_id_fkey" FOREIGN KEY ("previous_path_id") REFERENCES "learning_paths"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_quiz_attempt_id_fkey" FOREIGN KEY ("quiz_attempt_id") REFERENCES "quiz_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learning_sessions" ADD CONSTRAINT "learning_sessions_explain_attempt_id_fkey" FOREIGN KEY ("explain_attempt_id") REFERENCES "explain_back_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
