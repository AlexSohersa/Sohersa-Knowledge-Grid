-- ════════════════════════════════════════════════════════════════════════════
-- 006 · Las herramientas, con su manual
-- ════════════════════════════════════════════════════════════════════════════
--
-- Una herramienta que se descarga necesita su manual AL LADO. Hasta ahora la
-- única forma de ligarlos era que el título del documento del Cronograma
-- mencionara el nombre de la herramienta: una coincidencia de texto que se
-- rompe en cuanto alguien renombra cualquiera de los dos, y que además no
-- aparecía en la ficha, solo en un contador.
--
-- Ahora el manual es un enlace de la propia herramienta, igual que su archivo.
--
-- SE APLICA SOBRE LA BASE UNIFICADA. Todo va con `IF NOT EXISTS`: correrlo dos
-- veces tiene que ser tan inofensivo como correrlo una.
--
-- Uso:
--   CONFIRMAR_PRODUCCION=si DATABASE_URL="…" npm run db:migrate:prod
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "grid"."Tool"
  -- El enlace del manual: un archivo de Drive o una dirección directa.
  ADD COLUMN IF NOT EXISTS "manualUrl" TEXT,

  -- El id de Drive suelto, cuando el manual vive ahí. Aparte del enlace por
  -- la misma razón que `driveFileId`: la plataforma lo trae con el id limpio.
  ADD COLUMN IF NOT EXISTS "manualDriveId" TEXT,

  -- Cómo se llama el archivo del manual, para enseñarlo en la ficha.
  ADD COLUMN IF NOT EXISTS "manualFileName" TEXT;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- Comprobación
-- ════════════════════════════════════════════════════════════════════════════
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='grid' AND table_name='Tool'
--      AND column_name IN ('manualUrl','manualDriveId','manualFileName');
--
-- Deben salir las tres.
