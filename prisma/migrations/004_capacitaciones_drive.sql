-- ════════════════════════════════════════════════════════════════════════════
-- 004 · Las capacitaciones, con código y con carpeta propia en Drive
-- ════════════════════════════════════════════════════════════════════════════
--
-- Las capacitaciones se grababan por Meet y cada una quedaba donde la dejó
-- quien la grabó: en su Drive personal, compartida con el resto. Basta con que
-- esa persona reorganice sus carpetas o deje la empresa para que el material
-- desaparezca sin que nadie sepa dónde estaba.
--
-- Esto añade lo que hace falta para juntarlas todas bajo una carpeta del
-- Centro, con la misma estructura para cada una:
--
--   Capacitaciones Centro de Conocimiento/
--   └── CAP-003 Design Thinking/
--       ├── 01 Video/
--       ├── 02 Materiales/
--       └── 03 Notas/
--
-- SE APLICA SOBRE LA BASE UNIFICADA, que comparten cuatro herramientas. Por eso
-- todo va con `IF NOT EXISTS` y nada borra ni reescribe: correrlo dos veces
-- tiene que ser tan inofensivo como correrlo una.
--
-- Uso:
--   CONFIRMAR=si DATABASE_URL="…" npm run db:migrate:prod
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- El código y la carpeta
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `code` es «CAP-001», y es lo que da nombre a la carpeta de Drive. Va aparte
-- del título porque el título se corrige y se acorta, y el código no cambia
-- nunca: con él delante, la carpeta sigue siendo reconocible aunque la ficha se
-- renombre. Mismo criterio que las fichas del FAQ.
--
-- Nulo al principio a propósito: las capacitaciones que ya existan no tienen
-- código hasta que se les asigne, y forzarlo aquí obligaría a inventarse uno.

ALTER TABLE "grid"."Training"
  ADD COLUMN IF NOT EXISTS "code" TEXT,
  -- La carpeta de esta capacitación dentro de «Capacitaciones Centro de
  -- Conocimiento». Se guarda para no tener que buscarla por nombre cada vez, y
  -- para que renombrar la ficha no deje huérfano su material.
  ADD COLUMN IF NOT EXISTS "driveFolderId" TEXT,
  -- De dónde salió, cuando se importó de unas notas de Gemini. Sirve para
  -- volver al documento original y para no importar dos veces lo mismo.
  ADD COLUMN IF NOT EXISTS "notasDocId" TEXT,
  -- Cuándo se impartió. `period` ya existía, pero es texto libre («2026-1»),
  -- y para ordenar por fecha hace falta una fecha de verdad.
  ADD COLUMN IF NOT EXISTS "impartidaEn" TIMESTAMP(3),
  -- Cuánta gente asistió. Da idea de si fue general o de un equipo concreto.
  ADD COLUMN IF NOT EXISTS "asistentes" INTEGER NOT NULL DEFAULT 0;

-- Dos capacitaciones no pueden compartir código: es lo que nombra su carpeta.
-- Parcial, porque las que aún no tienen código son todas NULL y un único
-- normal las consideraría distintas —cierto— pero además dejaría pasar un
-- segundo NULL sin avisar, que es lo que aquí no importa.
CREATE UNIQUE INDEX IF NOT EXISTS "Training_code_key"
  ON "grid"."Training" ("code")
  WHERE "code" IS NOT NULL;

-- Listar por fecha de impartición es la consulta natural: lo más reciente
-- primero.
CREATE INDEX IF NOT EXISTS "Training_impartidaEn_idx"
  ON "grid"."Training" ("impartidaEn" DESC NULLS LAST);

-- ─────────────────────────────────────────────────────────────────────────────
-- El material, con su sitio en Drive
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `TrainingMaterial` ya tenía `driveId`. Lo que falta es saber EN QUÉ
-- subcarpeta quedó, para poder reubicarlo si la capacitación se renombra sin
-- tener que adivinar dónde estaba.

ALTER TABLE "grid"."TrainingMaterial"
  ADD COLUMN IF NOT EXISTS "subcarpeta" TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- El video del tema
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `videoUrl` ya existía y guarda el enlace. Se añade el id de Drive aparte
-- porque el visor lo necesita suelto —el enlace trae basura alrededor— y
-- porque así se sabe si el video ya está copiado en la carpeta del Centro o
-- sigue apuntando al Drive de quien lo grabó.

ALTER TABLE "grid"."TrainingTopic"
  ADD COLUMN IF NOT EXISTS "videoDriveId" TEXT,
  -- `true` cuando el video ya vive en la carpeta del Centro. Mientras sea
  -- `false`, el material depende del Drive de otra persona.
  ADD COLUMN IF NOT EXISTS "videoPropio" BOOLEAN NOT NULL DEFAULT false;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- Comprobación
-- ════════════════════════════════════════════════════════════════════════════
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='grid' AND table_name='Training'
--      AND column_name IN ('code','driveFolderId','notasDocId','impartidaEn','asistentes');
--
-- Deben salir las cinco.
