-- =============================================================================
-- Sohersa Knowledge Grid · despliegue sobre la base unificada
-- =============================================================================
-- Crea el esquema `grid` y sus 20 tablas sobre una base que YA tiene `core`
-- (el padrón: persona, proyecto, cliente) y `public` (las tablas de las demás
-- herramientas: horas, catálogos, vacaciones, tickets…).
--
-- Por qué este archivo y no `prisma db push`:
--   `db push` compara el esquema con la base ENTERA y quiere BORRAR todo lo que
--   no esté declarado aquí —las 12,476 filas de las otras herramientas—. Este
--   archivo solo AÑADE: nunca hace DROP.
--
-- Sustituye a `001_knowledge_grid.sql`, que quedó obsoleto: creaba las tablas
-- sin esquema (caían en `public`) y las colgaba de `TeamMember`, que ya no es
-- el padrón. Las personas viven ahora en `core.persona`.
--
-- Es IDEMPOTENTE: correrlo dos veces no rompe nada ni duplica datos.
--
--   DATABASE_URL="postgres://…" npm run db:migrate
-- =============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "grid";

-- CreateTable
-- `public."SyncLog"` ya existe en producción: la comparten todas las
-- herramientas. Knowledge Grid solo escribe filas con target = 'recursos'.

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."Resource" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "fileName" TEXT,
    "driveId" TEXT,
    "url" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "author" TEXT,
    "training" TEXT,
    "priority" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "progress" DOUBLE PRECISION,
    "origin" TEXT NOT NULL DEFAULT 'sheet',
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."Automation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "mimeType" TEXT,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT,
    "version" TEXT,
    "compat" TEXT,
    "createdBy" TEXT NOT NULL,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."Tool" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT,
    "version" TEXT,
    "license" TEXT,
    "discipline" TEXT,
    "accent" TEXT NOT NULL DEFAULT '#32D66B',
    "status" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."Training" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "objectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "instructor" TEXT,
    "instructorRole" TEXT,
    "duration" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'Básico',
    "category" TEXT,
    "software" TEXT,
    "accent" TEXT NOT NULL DEFAULT '#32D66B',
    "status" TEXT NOT NULL DEFAULT 'BORRADOR',
    "period" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."TrainingTopic" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'Video',
    "duration" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "videoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."TrainingMaterial" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PDF',
    "url" TEXT,
    "driveId" TEXT,
    "sizeText" TEXT,
    "downloadable" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."LearningPath" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningPath_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."PathStage" (
    "id" TEXT NOT NULL,
    "pathId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PathStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."PathItem" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "trainingId" TEXT,
    "resourceId" TEXT,
    "resourceCode" TEXT,
    "title" TEXT NOT NULL,
    "duration" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PathItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."PathAssignment" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "persona_id" TEXT,
    "pathId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PathAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."PathProgress" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "topicId" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "downloadedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PathProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."FaqEntry" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resourceId" TEXT,
    "resourceCode" TEXT,
    "trainingId" TEXT,
    "toolId" TEXT,
    "fromQuestionId" TEXT,
    "helpful" INTEGER NOT NULL DEFAULT 0,
    "notHelpful" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaqEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."FaqVote" (
    "id" TEXT NOT NULL,
    "faqId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "persona_id" TEXT,
    "useful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaqVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."Question" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "persona_id" TEXT,
    "category" TEXT NOT NULL,
    "software" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "views" INTEGER NOT NULL DEFAULT 0,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."Answer" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "persona_id" TEXT,
    "validatedAt" TIMESTAMP(3),
    "validatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."AnswerVote" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "persona_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."AnswerComment" (
    "id" TEXT NOT NULL,
    "answerId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "persona_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnswerComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."Bookmark" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "persona_id" TEXT,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."ViewLog" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "persona_id" TEXT,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "grid"."GridAdmin" (
    "email" TEXT NOT NULL,
    "persona_id" TEXT,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GridAdmin_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_section_position_idx" ON "grid"."Resource"("section", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Resource_origin_idx" ON "grid"."Resource"("origin");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Resource_code_origin_key" ON "grid"."Resource"("code", "origin");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Automation_category_createdAt_idx" ON "grid"."Automation"("category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Tool_name_key" ON "grid"."Tool"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Tool_active_position_idx" ON "grid"."Tool"("active", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Training_status_category_idx" ON "grid"."Training"("status", "category");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingTopic_trainingId_position_idx" ON "grid"."TrainingTopic"("trainingId", "position");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TrainingTopic_trainingId_code_key" ON "grid"."TrainingTopic"("trainingId", "code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TrainingMaterial_topicId_position_idx" ON "grid"."TrainingMaterial"("topicId", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LearningPath_active_idx" ON "grid"."LearningPath"("active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PathStage_pathId_position_idx" ON "grid"."PathStage"("pathId", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PathItem_stageId_position_idx" ON "grid"."PathItem"("stageId", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PathAssignment_email_active_idx" ON "grid"."PathAssignment"("email", "active");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PathAssignment_email_pathId_key" ON "grid"."PathAssignment"("email", "pathId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PathProgress_assignmentId_completed_idx" ON "grid"."PathProgress"("assignmentId", "completed");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PathProgress_assignmentId_itemId_topicId_key" ON "grid"."PathProgress"("assignmentId", "itemId", "topicId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FaqEntry_category_position_idx" ON "grid"."FaqEntry"("category", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "FaqEntry_published_idx" ON "grid"."FaqEntry"("published");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "FaqVote_faqId_email_key" ON "grid"."FaqVote"("faqId", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Question_category_createdAt_idx" ON "grid"."Question"("category", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Question_email_idx" ON "grid"."Question"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Answer_questionId_validatedAt_idx" ON "grid"."Answer"("questionId", "validatedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AnswerVote_answerId_email_key" ON "grid"."AnswerVote"("answerId", "email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AnswerComment_answerId_createdAt_idx" ON "grid"."AnswerComment"("answerId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Bookmark_email_createdAt_idx" ON "grid"."Bookmark"("email", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Bookmark_email_kind_targetId_key" ON "grid"."Bookmark"("email", "kind", "targetId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ViewLog_email_viewedAt_idx" ON "grid"."ViewLog"("email", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ViewLog_email_kind_targetId_key" ON "grid"."ViewLog"("email", "kind", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "GridAdmin_persona_id_key" ON "grid"."GridAdmin"("persona_id");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingTopic_trainingId_fkey') THEN
    ALTER TABLE "grid"."TrainingTopic" ADD CONSTRAINT "TrainingTopic_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "grid"."Training"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TrainingMaterial_topicId_fkey') THEN
    ALTER TABLE "grid"."TrainingMaterial" ADD CONSTRAINT "TrainingMaterial_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "grid"."TrainingTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathStage_pathId_fkey') THEN
    ALTER TABLE "grid"."PathStage" ADD CONSTRAINT "PathStage_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "grid"."LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathItem_stageId_fkey') THEN
    ALTER TABLE "grid"."PathItem" ADD CONSTRAINT "PathItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "grid"."PathStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathItem_trainingId_fkey') THEN
    ALTER TABLE "grid"."PathItem" ADD CONSTRAINT "PathItem_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "grid"."Training"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathItem_resourceId_fkey') THEN
    ALTER TABLE "grid"."PathItem" ADD CONSTRAINT "PathItem_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "grid"."Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathAssignment_persona_id_fkey') THEN
    ALTER TABLE "grid"."PathAssignment" ADD CONSTRAINT "PathAssignment_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathAssignment_pathId_fkey') THEN
    ALTER TABLE "grid"."PathAssignment" ADD CONSTRAINT "PathAssignment_pathId_fkey" FOREIGN KEY ("pathId") REFERENCES "grid"."LearningPath"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathProgress_assignmentId_fkey') THEN
    ALTER TABLE "grid"."PathProgress" ADD CONSTRAINT "PathProgress_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "grid"."PathAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathProgress_itemId_fkey') THEN
    ALTER TABLE "grid"."PathProgress" ADD CONSTRAINT "PathProgress_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "grid"."PathItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PathProgress_topicId_fkey') THEN
    ALTER TABLE "grid"."PathProgress" ADD CONSTRAINT "PathProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "grid"."TrainingTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FaqEntry_resourceId_fkey') THEN
    ALTER TABLE "grid"."FaqEntry" ADD CONSTRAINT "FaqEntry_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "grid"."Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FaqEntry_trainingId_fkey') THEN
    ALTER TABLE "grid"."FaqEntry" ADD CONSTRAINT "FaqEntry_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "grid"."Training"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FaqEntry_toolId_fkey') THEN
    ALTER TABLE "grid"."FaqEntry" ADD CONSTRAINT "FaqEntry_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "grid"."Tool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FaqEntry_fromQuestionId_fkey') THEN
    ALTER TABLE "grid"."FaqEntry" ADD CONSTRAINT "FaqEntry_fromQuestionId_fkey" FOREIGN KEY ("fromQuestionId") REFERENCES "grid"."Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FaqVote_faqId_fkey') THEN
    ALTER TABLE "grid"."FaqVote" ADD CONSTRAINT "FaqVote_faqId_fkey" FOREIGN KEY ("faqId") REFERENCES "grid"."FaqEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FaqVote_persona_id_fkey') THEN
    ALTER TABLE "grid"."FaqVote" ADD CONSTRAINT "FaqVote_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Question_persona_id_fkey') THEN
    ALTER TABLE "grid"."Question" ADD CONSTRAINT "Question_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Answer_questionId_fkey') THEN
    ALTER TABLE "grid"."Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "grid"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Answer_persona_id_fkey') THEN
    ALTER TABLE "grid"."Answer" ADD CONSTRAINT "Answer_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnswerVote_answerId_fkey') THEN
    ALTER TABLE "grid"."AnswerVote" ADD CONSTRAINT "AnswerVote_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "grid"."Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnswerVote_persona_id_fkey') THEN
    ALTER TABLE "grid"."AnswerVote" ADD CONSTRAINT "AnswerVote_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnswerComment_answerId_fkey') THEN
    ALTER TABLE "grid"."AnswerComment" ADD CONSTRAINT "AnswerComment_answerId_fkey" FOREIGN KEY ("answerId") REFERENCES "grid"."Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnswerComment_persona_id_fkey') THEN
    ALTER TABLE "grid"."AnswerComment" ADD CONSTRAINT "AnswerComment_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bookmark_persona_id_fkey') THEN
    ALTER TABLE "grid"."Bookmark" ADD CONSTRAINT "Bookmark_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ViewLog_persona_id_fkey') THEN
    ALTER TABLE "grid"."ViewLog" ADD CONSTRAINT "ViewLog_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GridAdmin_persona_id_fkey') THEN
    ALTER TABLE "grid"."GridAdmin" ADD CONSTRAINT "GridAdmin_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Traslado de la biblioteca que ya existe en producción
-- ─────────────────────────────────────────────────────────────────────────────
-- La sección Recursos del portal vive en `public."Resource"` con ~152
-- documentos reales, sincronizados desde el cronograma. Al mudarse a Knowledge
-- Grid pasan a `grid."Resource"`, que es donde los busca esta aplicación.
--
-- Se COPIAN, no se mueven: la tabla vieja se queda intacta hasta que el portal
-- deje de leerla. Borrarla es un paso posterior y manual, cuando Alejandro
-- confirme que ya nadie la usa.
--
-- `ON CONFLICT DO NOTHING` hace el paso repetible: si la migración se corre dos
-- veces, la segunda no duplica ni pisa nada.

-- El SELECT va dentro de EXECUTE, no en un `WHERE EXISTS`: Postgres resuelve
-- los nombres de tabla al PLANIFICAR la sentencia, antes de evaluar ninguna
-- condición, así que una consulta que nombra `public."Resource"` falla con
-- "relation does not exist" aunque la condición la hubiera saltado. Y esa
-- tabla desaparece en cuanto el portal retira su sección de Recursos —ya pasó
-- en producción—, de modo que la migración dejaba de ser repetible.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Resource'
  ) THEN
    EXECUTE '
      INSERT INTO "grid"."Resource" (
        "id", "code", "title", "section", "position", "fileName", "driveId", "url",
        "mimeType", "sizeBytes", "author", "training", "priority", "required",
        "notes", "progress", "origin", "createdBy", "updatedAt", "createdAt"
      )
      SELECT
        "id", "code", "title", "section", "position", "fileName", "driveId", "url",
        "mimeType", "sizeBytes", "author", "training", "priority", "required",
        "notes", "progress", "origin", "createdBy", "updatedAt", "createdAt"
      FROM "public"."Resource"
      ON CONFLICT ("id") DO NOTHING';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- El puente al padrón
-- ─────────────────────────────────────────────────────────────────────────────
-- Las tablas con datos de personas llevan `persona_id`, que NO escribe la
-- aplicación: lo rellena el disparador `core.enlazar_persona()` a partir del
-- correo. Se instala aquí por si la base de destino todavía no lo tiene.

DO $$
DECLARE t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enlazar_persona') THEN
    RAISE NOTICE 'No existe core.enlazar_persona(): las columnas persona_id quedarán en NULL hasta que el núcleo la instale.';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY['Bookmark','ViewLog','PathAssignment','FaqVote','AnswerVote','GridAdmin','Question','Answer','AnswerComment']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_enlazar_' || lower(t)
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF email ON "grid".%I
           FOR EACH ROW EXECUTE FUNCTION core.enlazar_persona()',
        'trg_enlazar_' || lower(t), t
      );
    END IF;
  END LOOP;
END $$;
