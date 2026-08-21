-- =============================================================================
-- OBSOLETA · NO EJECUTAR
-- =============================================================================
-- Este archivo describe el modelo ANTERIOR a la unificación de la base:
--   · creaba las tablas SIN esquema, así que caían en `public` en vez de `grid`;
--   · las colgaba de `TeamMember`, que ya no es el padrón de personas.
--
-- La migración vigente es `002_despliegue_grid.sql`. Se conserva este archivo
-- solo como registro de cómo estaba la base antes.
-- =============================================================================

-- =============================================================================
-- Sohersa Knowledge Grid · tablas propias sobre la base unificada
-- =============================================================================
-- Se ejecuta sobre `sohersa_unificada`, donde YA viven las tablas de las demás
-- herramientas (horas, catálogos, vacaciones, tickets…) y las compartidas
-- (`TeamMember`, `Resource`, `Automation`, `SyncLog`).
--
-- Por qué SQL y no `prisma db push`:
--   `db push` compara el esquema con la base ENTERA y quiere borrar todo lo que
--   no esté declarado. En una base compartida eso significa perder las tablas
--   de las otras apps —12,476 filas reales—. Este archivo solo AÑADE.
--
-- Es IDEMPOTENTE: `IF NOT EXISTS` en todo. Correrlo dos veces no rompe nada.
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. HERRAMIENTAS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Tool" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "kind"        TEXT NOT NULL,
  "description" TEXT,
  "version"     TEXT,
  "license"     TEXT,
  "discipline"  TEXT,
  "accent"      TEXT NOT NULL DEFAULT '#32D66B',
  -- DISPONIBLE · PILOTO · EN_EVALUACION · DESCONTINUADO
  "status"      TEXT NOT NULL DEFAULT 'DISPONIBLE',
  "position"    INTEGER NOT NULL DEFAULT 0,
  "active"      BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- El nombre es único: dos "Autodesk Revit" serían un error de captura, no dos
-- herramientas distintas.
CREATE UNIQUE INDEX IF NOT EXISTS "Tool_name_key" ON "Tool"("name");
CREATE INDEX IF NOT EXISTS "Tool_active_position_idx" ON "Tool"("active", "position");

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. CAPACITACIONES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Training" (
  "id"             TEXT PRIMARY KEY,
  "title"          TEXT NOT NULL,
  "summary"        TEXT,
  "objectives"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "instructor"     TEXT,
  "instructorRole" TEXT,
  "duration"       TEXT,
  "durationMin"    INTEGER NOT NULL DEFAULT 0,
  "level"          TEXT NOT NULL DEFAULT 'Básico',
  "category"       TEXT,
  "software"       TEXT,
  "accent"         TEXT NOT NULL DEFAULT '#32D66B',
  -- BORRADOR · PUBLICADA · ARCHIVADA
  "status"         TEXT NOT NULL DEFAULT 'BORRADOR',
  "period"         TEXT,
  "views"          INTEGER NOT NULL DEFAULT 0,
  "createdBy"      TEXT,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Training_status_category_idx" ON "Training"("status", "category");

CREATE TABLE IF NOT EXISTS "TrainingTopic" (
  "id"         TEXT PRIMARY KEY,
  "trainingId" TEXT NOT NULL,
  "code"       TEXT NOT NULL,
  "title"      TEXT NOT NULL,
  "summary"    TEXT,
  "kind"       TEXT NOT NULL DEFAULT 'Video',
  "duration"   TEXT,
  "position"   INTEGER NOT NULL DEFAULT 0,
  "videoUrl"   TEXT,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "TrainingTopic_trainingId_code_key"
  ON "TrainingTopic"("trainingId", "code");
CREATE INDEX IF NOT EXISTS "TrainingTopic_trainingId_position_idx"
  ON "TrainingTopic"("trainingId", "position");

CREATE TABLE IF NOT EXISTS "TrainingMaterial" (
  "id"           TEXT PRIMARY KEY,
  "topicId"      TEXT NOT NULL,
  "title"        TEXT NOT NULL,
  "kind"         TEXT NOT NULL DEFAULT 'PDF',
  "url"          TEXT,
  "driveId"      TEXT,
  "sizeText"     TEXT,
  "downloadable" BOOLEAN NOT NULL DEFAULT true,
  "position"     INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "TrainingMaterial_topicId_position_idx"
  ON "TrainingMaterial"("topicId", "position");

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RUTAS DE APRENDIZAJE
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "LearningPath" (
  "id"        TEXT PRIMARY KEY,
  "name"      TEXT NOT NULL,
  "objective" TEXT,
  "active"    BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "LearningPath_active_idx" ON "LearningPath"("active");

CREATE TABLE IF NOT EXISTS "PathStage" (
  "id"          TEXT PRIMARY KEY,
  "pathId"      TEXT NOT NULL,
  "code"        TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "description" TEXT,
  "position"    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "PathStage_pathId_position_idx" ON "PathStage"("pathId", "position");

CREATE TABLE IF NOT EXISTS "PathItem" (
  "id"           TEXT PRIMARY KEY,
  "stageId"      TEXT NOT NULL,
  "trainingId"   TEXT,
  "resourceId"   TEXT,
  -- El código del cronograma se conserva junto a la FK: la resincronización
  -- puede regenerar ids, y el código no cambia.
  "resourceCode" TEXT,
  "title"        TEXT NOT NULL,
  "duration"     TEXT,
  "position"     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "PathItem_stageId_position_idx" ON "PathItem"("stageId", "position");

CREATE TABLE IF NOT EXISTS "PathAssignment" (
  "id"         TEXT PRIMARY KEY,
  "email"      TEXT NOT NULL,
  "pathId"     TEXT NOT NULL,
  "assignedBy" TEXT,
  "startedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "active"     BOOLEAN NOT NULL DEFAULT true,
  "updatedAt"  TIMESTAMP(3) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathAssignment_email_pathId_key"
  ON "PathAssignment"("email", "pathId");
CREATE INDEX IF NOT EXISTS "PathAssignment_email_active_idx"
  ON "PathAssignment"("email", "active");

CREATE TABLE IF NOT EXISTS "PathProgress" (
  "id"           TEXT PRIMARY KEY,
  "assignmentId" TEXT NOT NULL,
  "itemId"       TEXT NOT NULL,
  "topicId"      TEXT,
  "completed"    BOOLEAN NOT NULL DEFAULT false,
  "completedAt"  TIMESTAMP(3),
  "seconds"      INTEGER NOT NULL DEFAULT 0,
  "downloaded"   BOOLEAN NOT NULL DEFAULT false,
  "downloadedAt" TIMESTAMP(3),
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "PathProgress_assignmentId_itemId_topicId_key"
  ON "PathProgress"("assignmentId", "itemId", "topicId");
CREATE INDEX IF NOT EXISTS "PathProgress_assignmentId_completed_idx"
  ON "PathProgress"("assignmentId", "completed");

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. FAQ
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "FaqEntry" (
  "id"             TEXT PRIMARY KEY,
  "category"       TEXT NOT NULL,
  "question"       TEXT NOT NULL,
  "answer"         TEXT NOT NULL,
  "steps"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "resourceId"     TEXT,
  "resourceCode"   TEXT,
  "trainingId"     TEXT,
  "toolId"         TEXT,
  "fromQuestionId" TEXT,
  "helpful"        INTEGER NOT NULL DEFAULT 0,
  "notHelpful"     INTEGER NOT NULL DEFAULT 0,
  "position"       INTEGER NOT NULL DEFAULT 0,
  "published"      BOOLEAN NOT NULL DEFAULT true,
  "createdBy"      TEXT,
  "updatedAt"      TIMESTAMP(3) NOT NULL,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FaqEntry_category_position_idx" ON "FaqEntry"("category", "position");
CREATE INDEX IF NOT EXISTS "FaqEntry_published_idx" ON "FaqEntry"("published");

CREATE TABLE IF NOT EXISTS "FaqVote" (
  "id"        TEXT PRIMARY KEY,
  "faqId"     TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "useful"    BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "FaqVote_faqId_email_key" ON "FaqVote"("faqId", "email");

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. COMUNIDAD
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Question" (
  "id"         TEXT PRIMARY KEY,
  "title"      TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorRole" TEXT,
  "category"   TEXT NOT NULL,
  "software"   TEXT,
  "tags"       TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "views"      INTEGER NOT NULL DEFAULT 0,
  "closed"     BOOLEAN NOT NULL DEFAULT false,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Question_category_createdAt_idx" ON "Question"("category", "createdAt");
CREATE INDEX IF NOT EXISTS "Question_email_idx" ON "Question"("email");

CREATE TABLE IF NOT EXISTS "Answer" (
  "id"          TEXT PRIMARY KEY,
  "questionId"  TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "email"       TEXT NOT NULL,
  "authorName"  TEXT NOT NULL,
  "authorRole"  TEXT,
  "validatedAt" TIMESTAMP(3),
  "validatedBy" TEXT,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Answer_questionId_validatedAt_idx"
  ON "Answer"("questionId", "validatedAt");

CREATE TABLE IF NOT EXISTS "AnswerVote" (
  "id"        TEXT PRIMARY KEY,
  "answerId"  TEXT NOT NULL,
  "email"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "AnswerVote_answerId_email_key"
  ON "AnswerVote"("answerId", "email");

CREATE TABLE IF NOT EXISTS "AnswerComment" (
  "id"         TEXT PRIMARY KEY,
  "answerId"   TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "AnswerComment_answerId_createdAt_idx"
  ON "AnswerComment"("answerId", "createdAt");

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. LO PERSONAL
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "Bookmark" (
  "id"        TEXT PRIMARY KEY,
  "email"     TEXT NOT NULL,
  "kind"      TEXT NOT NULL,
  "targetId"  TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Bookmark_email_kind_targetId_key"
  ON "Bookmark"("email", "kind", "targetId");
CREATE INDEX IF NOT EXISTS "Bookmark_email_createdAt_idx" ON "Bookmark"("email", "createdAt");

CREATE TABLE IF NOT EXISTS "ViewLog" (
  "id"       TEXT PRIMARY KEY,
  "email"    TEXT NOT NULL,
  "kind"     TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "title"    TEXT NOT NULL,
  "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "ViewLog_email_kind_targetId_key"
  ON "ViewLog"("email", "kind", "targetId");
CREATE INDEX IF NOT EXISTS "ViewLog_email_viewedAt_idx" ON "ViewLog"("email", "viewedAt");

CREATE TABLE IF NOT EXISTS "GridAdmin" (
  "email"     TEXT PRIMARY KEY,
  "grantedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. LLAVES FORÁNEAS
-- ─────────────────────────────────────────────────────────────────────────────
-- Lo que la unificación hace posible: antes, con dos bases, un avance podía
-- apuntar a una persona inexistente y nada lo impedía.
--
-- Las políticas de borrado dicen qué pasa cuando desaparece lo referenciado:
--   CASCADE   — el hijo no tiene sentido sin el padre (temas de un curso).
--   SET NULL  — el hijo sigue siendo útil sin él (un elemento de ruta conserva
--               su título aunque se retire el documento).
--
-- `DO $$ ... $$` con comprobación previa hace el archivo idempotente: Postgres
-- no admite `ADD CONSTRAINT IF NOT EXISTS`.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      -- Capacitaciones
      ('Training',         'Training_createdBy_fkey',       '"createdBy"',    'TeamMember',     'email', 'SET NULL'),
      ('TrainingTopic',    'TrainingTopic_trainingId_fkey', '"trainingId"',   'Training',       'id',    'CASCADE'),
      ('TrainingMaterial', 'TrainingMaterial_topicId_fkey', '"topicId"',      'TrainingTopic',  'id',    'CASCADE'),

      -- Biblioteca
      ('Resource',         'Resource_createdBy_fkey',       '"createdBy"',    'TeamMember',     'email', 'SET NULL'),

      -- Rutas
      ('LearningPath',     'LearningPath_createdBy_fkey',   '"createdBy"',    'TeamMember',     'email', 'SET NULL'),
      ('PathStage',        'PathStage_pathId_fkey',         '"pathId"',       'LearningPath',   'id',    'CASCADE'),
      ('PathItem',         'PathItem_stageId_fkey',         '"stageId"',      'PathStage',      'id',    'CASCADE'),
      ('PathItem',         'PathItem_trainingId_fkey',      '"trainingId"',   'Training',       'id',    'SET NULL'),
      ('PathItem',         'PathItem_resourceId_fkey',      '"resourceId"',   'Resource',       'id',    'SET NULL'),
      ('PathAssignment',   'PathAssignment_email_fkey',     '"email"',        'TeamMember',     'email', 'CASCADE'),
      ('PathAssignment',   'PathAssignment_pathId_fkey',    '"pathId"',       'LearningPath',   'id',    'CASCADE'),
      ('PathProgress',     'PathProgress_assignmentId_fkey','"assignmentId"', 'PathAssignment', 'id',    'CASCADE'),
      ('PathProgress',     'PathProgress_itemId_fkey',      '"itemId"',       'PathItem',       'id',    'CASCADE'),
      ('PathProgress',     'PathProgress_topicId_fkey',     '"topicId"',      'TrainingTopic',  'id',    'CASCADE'),

      -- FAQ
      ('FaqEntry',         'FaqEntry_resourceId_fkey',      '"resourceId"',   'Resource',       'id',    'SET NULL'),
      ('FaqEntry',         'FaqEntry_trainingId_fkey',      '"trainingId"',   'Training',       'id',    'SET NULL'),
      ('FaqEntry',         'FaqEntry_toolId_fkey',          '"toolId"',       'Tool',           'id',    'SET NULL'),
      ('FaqEntry',         'FaqEntry_fromQuestionId_fkey',  '"fromQuestionId"','Question',      'id',    'SET NULL'),
      ('FaqVote',          'FaqVote_faqId_fkey',            '"faqId"',        'FaqEntry',       'id',    'CASCADE'),
      ('FaqVote',          'FaqVote_email_fkey',            '"email"',        'TeamMember',     'email', 'CASCADE'),

      -- Comunidad
      ('Answer',           'Answer_questionId_fkey',        '"questionId"',   'Question',       'id',    'CASCADE'),
      ('AnswerVote',       'AnswerVote_answerId_fkey',      '"answerId"',     'Answer',         'id',    'CASCADE'),
      ('AnswerVote',       'AnswerVote_email_fkey',         '"email"',        'TeamMember',     'email', 'CASCADE'),
      ('AnswerComment',    'AnswerComment_answerId_fkey',   '"answerId"',     'Answer',         'id',    'CASCADE'),

      -- Lo personal
      ('Bookmark',         'Bookmark_email_fkey',           '"email"',        'TeamMember',     'email', 'CASCADE'),
      ('ViewLog',          'ViewLog_email_fkey',            '"email"',        'TeamMember',     'email', 'CASCADE'),
      ('GridAdmin',        'GridAdmin_email_fkey',          '"email"',        'TeamMember',     'email', 'CASCADE')
    ) AS t(tabla, nombre, columna, ref_tabla, ref_col, on_delete)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = fk.nombre
    ) THEN
      EXECUTE format(
        'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%s) REFERENCES %I(%I) ON DELETE %s ON UPDATE CASCADE',
        fk.tabla, fk.nombre, fk.columna, fk.ref_tabla, fk.ref_col, fk.on_delete
      );
    END IF;
  END LOOP;
END $$;

COMMIT;
