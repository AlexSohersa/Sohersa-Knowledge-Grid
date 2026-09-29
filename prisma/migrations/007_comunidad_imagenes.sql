-- ════════════════════════════════════════════════════════════════════════════
-- 007 · Las preguntas de la comunidad, con imágenes
-- ════════════════════════════════════════════════════════════════════════════
--
-- Una pregunta de soporte casi siempre tiene una pantalla detrás: el error que
-- salió, el modelo que no cuadra, el diálogo que pide algo raro. Sin poder
-- adjuntarla, quien pregunta la describe con palabras y quien responde tiene
-- que imaginársela.
--
-- POR QUÉ UNA TABLA Y NO UNA COLUMNA. Una pregunta puede traer varias capturas
-- —el antes y el después, dos vistas del mismo problema—, y con una columna
-- habría que guardar una lista separada por comas y partirla al leer. Una tabla
-- aparte deja que cada imagen tenga su orden y su nombre, y que se borre una
-- sin tocar las otras.
--
-- SE APLICA SOBRE LA BASE UNIFICADA, que comparten cuatro herramientas. Todo va
-- con `IF NOT EXISTS`: correrlo dos veces tiene que ser tan inofensivo como
-- correrlo una.
--
-- Uso:
--   CONFIRMAR_PRODUCCION=si DATABASE_URL="…" npm run db:migrate:prod
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS "grid"."QuestionImage" (
  "id"         TEXT NOT NULL,
  "questionId" TEXT NOT NULL,

  -- Dónde vive en Drive. La imagen se sirve desde el servidor con la cuenta de
  -- quien mira —igual que las capturas del FAQ—, así que basta con el id.
  "driveId"    TEXT NOT NULL,
  "fileName"   TEXT,
  "mimeType"   TEXT,
  "sizeBytes"  INTEGER,

  -- El orden en que se subieron: una secuencia de capturas cuenta una
  -- historia, y desordenarla la deshace.
  "position"   INTEGER NOT NULL DEFAULT 0,

  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QuestionImage_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  -- Al borrar una pregunta se van sus imágenes: una imagen sin pregunta no la
  -- reclama nadie y quedaría ocupando sitio sin que se sepa de qué era.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
     WHERE constraint_schema = 'grid'
       AND constraint_name = 'QuestionImage_questionId_fkey'
  ) THEN
    ALTER TABLE "grid"."QuestionImage"
      ADD CONSTRAINT "QuestionImage_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "grid"."Question"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "QuestionImage_questionId_position_idx"
  ON "grid"."QuestionImage" ("questionId", "position");

-- ─────────────────────────────────────────────────────────────────────────────
-- Quién editó por última vez
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `updatedAt` ya existe, pero se mueve con cualquier cambio —una respuesta
-- nueva, una vista— y no dice si el texto cambió. Esto marca las ediciones de
-- verdad, para poder enseñar «editada» sin mentir.

ALTER TABLE "grid"."Question"
  ADD COLUMN IF NOT EXISTS "editedAt" TIMESTAMP(3);

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- Comprobación
-- ════════════════════════════════════════════════════════════════════════════
--
--   SELECT COUNT(*) FROM information_schema.tables
--    WHERE table_schema='grid' AND table_name='QuestionImage';          -- 1
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='grid' AND table_name='Question'
--      AND column_name='editedAt';                                      -- 1
