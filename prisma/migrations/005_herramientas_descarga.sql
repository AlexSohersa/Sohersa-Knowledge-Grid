-- ════════════════════════════════════════════════════════════════════════════
-- 005 · Las herramientas, con archivo descargable
-- ════════════════════════════════════════════════════════════════════════════
--
-- Había dos sitios para lo mismo y se pisaban:
--
--   · «Herramientas» era un catálogo de fichas —Revit, ACC, Navisworks— que
--     solo se consultaba.
--   · «Biblioteca › Automatizaciones» eran los archivos descargables: scripts
--     de Dynamo, plantillas, complementos.
--
-- La confusión estaba en el nombre: «Automatización» era además uno de los
-- tipos de Herramienta, así que Dynamo salía en un sitio y un script hecho con
-- Dynamo en el otro.
--
-- Ahora es una sola sección. Una herramienta puede traer su archivo, y quien
-- entra lo descarga de ahí. Esto añade lo que hace falta para eso.
--
-- SE APLICA SOBRE LA BASE UNIFICADA, que comparten cuatro herramientas. Todo va
-- con `IF NOT EXISTS`: correrlo dos veces tiene que ser tan inofensivo como
-- correrlo una. No se borra `Automation` —la mantiene otra herramienta— solo
-- se deja de leer desde aquí.
--
-- Uso:
--   CONFIRMAR_PRODUCCION=si DATABASE_URL="…" npm run db:migrate:prod
-- ════════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE "grid"."Tool"
  -- El enlace de descarga: un archivo de Drive o una dirección directa.
  --
  -- Texto y no un id de Drive, porque las dos formas tienen que caber: un
  -- `.dyn` guardado en Drive y la página de descarga de un fabricante son
  -- ambas «de dónde sale esto», aunque se abran distinto.
  ADD COLUMN IF NOT EXISTS "downloadUrl" TEXT,

  -- El id de Drive suelto, cuando el archivo vive ahí.
  --
  -- Se guarda aparte del enlace porque Drive necesita una dirección distinta
  -- para DESCARGAR que para VER, y construirla exige el id limpio, sin el
  -- resto del enlace alrededor.
  ADD COLUMN IF NOT EXISTS "driveFileId" TEXT,

  -- Cómo se llama el archivo, para enseñarlo antes de descargar. Nadie pulsa
  -- «descargar» a ciegas sin saber si le llega un .zip o un .dyn.
  ADD COLUMN IF NOT EXISTS "fileName" TEXT,

  -- «2.4 MB». Texto ya formateado: el tamaño se enseña, no se calcula con él.
  ADD COLUMN IF NOT EXISTS "fileSizeText" TEXT,

  -- Con qué funciona: «Revit 2023–2025», «Power BI». Lo que evita que alguien
  -- descargue un script que no le va a servir.
  ADD COLUMN IF NOT EXISTS "compat" TEXT,

  -- Cuántas veces se descargó. Es la señal de qué se usa de verdad, que no se
  -- puede deducir de ninguna otra cosa.
  ADD COLUMN IF NOT EXISTS "downloads" INTEGER NOT NULL DEFAULT 0,

  -- Quién la registró, para saber a quién preguntarle.
  ADD COLUMN IF NOT EXISTS "createdBy" TEXT;

-- Listar primero lo descargable es la consulta natural de la sección: quien
-- entra viene a bajarse algo.
CREATE INDEX IF NOT EXISTS "Tool_descargable_idx"
  ON "grid"."Tool" ("active", "downloads" DESC)
  WHERE "downloadUrl" IS NOT NULL;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════
-- Comprobación
-- ════════════════════════════════════════════════════════════════════════════
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_schema='grid' AND table_name='Tool'
--      AND column_name IN ('downloadUrl','driveFileId','fileName',
--                          'fileSizeText','compat','downloads','createdBy');
--
-- Deben salir las siete.
