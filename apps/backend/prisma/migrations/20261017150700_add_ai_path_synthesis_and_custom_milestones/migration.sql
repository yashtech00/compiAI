-- DropIndex
DROP INDEX IF EXISTS "learning_path_items_learning_path_id_concept_id_key";

-- AlterTable
ALTER TABLE "concepts" ADD COLUMN     "is_custom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "skill_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "learning_path_items" ADD COLUMN     "estimated_minutes" INTEGER DEFAULT 15,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "milestone_id" TEXT,
ADD COLUMN     "target_outcome" TEXT,
ADD COLUMN     "title" TEXT,
ALTER COLUMN "concept_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "learning_paths" ADD COLUMN     "pedagogical_approach" TEXT,
ADD COLUMN     "target_goal" TEXT;

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN     "generation_model" TEXT,
ADD COLUMN     "idempotency_key" TEXT,
ADD COLUMN     "is_ai_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "user_id" TEXT;

-- AlterTable
ALTER TABLE "quizzes" ADD COLUMN     "is_frozen" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "concepts_user_id_is_custom_idx" ON "concepts"("user_id", "is_custom");

-- CreateIndex
CREATE INDEX "learning_path_items_learning_path_id_concept_id_idx" ON "learning_path_items"("learning_path_id", "concept_id");

-- CreateIndex
CREATE UNIQUE INDEX "learning_path_items_learning_path_id_sequence_order_key" ON "learning_path_items"("learning_path_id", "sequence_order");

-- CreateIndex
CREATE UNIQUE INDEX "lessons_idempotency_key_key" ON "lessons"("idempotency_key");

-- CreateIndex
CREATE INDEX "lessons_user_id_is_ai_generated_idx" ON "lessons"("user_id", "is_ai_generated");

-- AddForeignKey
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
