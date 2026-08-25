-- =============================================================================
-- FAQ BIM · la ficha del problema, las propuestas y los avisos
-- =============================================================================
-- Añade lo que pide el borrador de Estandarización y Calidad:
--   · los campos de la ficha (código, plataforma, síntoma, causa, imagen…);
--   · `FaqPropuesta`, la bandeja de lo que el equipo propone;
--   · `FaqComentario`, los mensajes al área;
--   · `Notificacion`, los avisos dirigidos a una persona.
--
-- Se escribe a mano y no con `prisma migrate diff` porque ese comando compara
-- la base ENTERA: sobre una base compartida propone reconstruir `core` y las
-- tablas de las otras herramientas. Este archivo solo AÑADE.
--
-- Es IDEMPOTENTE: correrlo dos veces no rompe nada.
--
--   npm run db:migrate                                     # local
--   CONFIRMAR_PRODUCCION=si DATABASE_URL="…" npm run db:migrate:prod
-- =============================================================================

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. LA FICHA DEL PROBLEMA
-- ─────────────────────────────────────────────────────────────────────────────
-- Todas las columnas son opcionales: una FAQ escrita a mano no tiene código ni
-- captura de error, y sigue siendo válida. Solo las fichas del catálogo BIM las
-- llenan.

ALTER TABLE "grid"."FaqEntry"
  ADD COLUMN IF NOT EXISTS "code"            TEXT,
  ADD COLUMN IF NOT EXISTS "platform"        TEXT,
  ADD COLUMN IF NOT EXISTS "errorMessage"    TEXT,
  ADD COLUMN IF NOT EXISTS "symptom"         TEXT,
  ADD COLUMN IF NOT EXISTS "cause"           TEXT,
  ADD COLUMN IF NOT EXISTS "altSteps"        TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "recommendations" TEXT,
  ADD COLUMN IF NOT EXISTS "keywords"        TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "imageDriveId"    TEXT,
  ADD COLUMN IF NOT EXISTS "imageName"       TEXT,
  ADD COLUMN IF NOT EXISTS "relatedCodes"    TEXT[] NOT NULL DEFAULT '{}';

-- El código es único: dos fichas con el mismo `RVT-041` serían un error de
-- captura, y el equipo se refiere a ellas por ese código.
CREATE UNIQUE INDEX IF NOT EXISTS "FaqEntry_code_key" ON "grid"."FaqEntry"("code");

-- Los dos filtros de la pantalla principal, en el orden en que se aplican.
CREATE INDEX IF NOT EXISTS "FaqEntry_platform_category_idx"
  ON "grid"."FaqEntry"("platform", "category");


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. LAS PROPUESTAS
-- ─────────────────────────────────────────────────────────────────────────────
-- Separadas de `FaqEntry` a propósito: mezclarlas obligaría a filtrar por
-- estado en cada consulta pública, y bastaría olvidarlo una vez para publicar
-- un borrador sin revisar.

CREATE TABLE IF NOT EXISTS "grid"."FaqPropuesta" (
  "id"           TEXT PRIMARY KEY,
  "title"        TEXT NOT NULL,
  "description"  TEXT NOT NULL,
  "platform"     TEXT,
  "solution"     TEXT,
  "imageDriveId" TEXT,
  "imageName"    TEXT,

  "email"      TEXT NOT NULL,
  "persona_id" TEXT,
  "authorName" TEXT NOT NULL,
  "authorArea" TEXT,

  -- PENDIENTE · APROBADA · RECHAZADA
  "status"     TEXT NOT NULL DEFAULT 'PENDIENTE',
  "reviewedBy" TEXT,
  "reviewNote" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "faqId"      TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- La consulta de la bandeja: lo pendiente primero, lo más antiguo arriba.
CREATE INDEX IF NOT EXISTS "FaqPropuesta_status_createdAt_idx"
  ON "grid"."FaqPropuesta"("status", "createdAt");


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. LOS COMENTARIOS AL ÁREA
-- ─────────────────────────────────────────────────────────────────────────────
-- No son preguntas de la comunidad —que se responden en público— sino mensajes
-- dirigidos a Estandarización y Calidad. Por eso no llevan respuestas ni votos.

CREATE TABLE IF NOT EXISTS "grid"."FaqComentario" (
  "id"      TEXT PRIMARY KEY,
  "message" TEXT NOT NULL,
  "faqId"   TEXT,

  "email"      TEXT NOT NULL,
  "persona_id" TEXT,
  "authorName" TEXT NOT NULL,
  "authorArea" TEXT,

  "resolved"   BOOLEAN NOT NULL DEFAULT false,
  "resolvedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FaqComentario_resolved_createdAt_idx"
  ON "grid"."FaqComentario"("resolved", "createdAt");


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. LOS AVISOS
-- ─────────────────────────────────────────────────────────────────────────────
-- Tabla y no cálculo al vuelo: los avisos que hacen falta aquí son de cosas que
-- pasaron mientras la persona NO estaba mirando —respondieron su pregunta, hay
-- una propuesta esperando—. Eso no se deriva de la pantalla actual, y guardar
-- lo leído en el navegador lo perdería al cambiar de equipo.

CREATE TABLE IF NOT EXISTS "grid"."Notificacion" (
  "id"         TEXT PRIMARY KEY,
  "email"      TEXT NOT NULL,
  "persona_id" TEXT,

  "kind"  TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body"  TEXT,
  "href"  TEXT,

  -- La clave que evita duplicados y permite REVIVIR un aviso: incluye aquello
  -- que, si cambia, lo convierte en un aviso nuevo.
  "dedupeKey" TEXT NOT NULL,

  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Un aviso por persona y hecho.
CREATE UNIQUE INDEX IF NOT EXISTS "Notificacion_email_dedupeKey_key"
  ON "grid"."Notificacion"("email", "dedupeKey");

-- La consulta de la campana: lo de esta persona, lo no leído primero.
CREATE INDEX IF NOT EXISTS "Notificacion_email_readAt_createdAt_idx"
  ON "grid"."Notificacion"("email", "readAt", "createdAt");


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. EL PUENTE AL PADRÓN
-- ─────────────────────────────────────────────────────────────────────────────
-- `persona_id` NO la escribe la aplicación: la rellena el disparador
-- `core.enlazar_persona()` a partir del correo.
--
-- Las propuestas y los comentarios sobreviven a la baja de quien los escribió
-- —son conocimiento del equipo—, así que van con SET NULL. Los avisos no: solo
-- le sirven a su destinatario.

DO $$
DECLARE
  fk RECORD;
BEGIN
  FOR fk IN
    SELECT * FROM (VALUES
      ('FaqPropuesta',  'FaqPropuesta_persona_id_fkey',  'SET NULL'),
      ('FaqComentario', 'FaqComentario_persona_id_fkey', 'SET NULL'),
      ('Notificacion',  'Notificacion_persona_id_fkey',  'CASCADE')
    ) AS t(tabla, nombre, on_delete)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = fk.nombre) THEN
      EXECUTE format(
        'ALTER TABLE "grid".%I ADD CONSTRAINT %I
           FOREIGN KEY ("persona_id") REFERENCES "core"."persona"("id")
           ON DELETE %s ON UPDATE CASCADE',
        fk.tabla, fk.nombre, fk.on_delete
      );
    END IF;
  END LOOP;
END $$;

-- Los disparadores que rellenan `persona_id` desde el correo.
DO $$
DECLARE t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'enlazar_persona') THEN
    RAISE NOTICE 'No existe core.enlazar_persona(): persona_id quedará en NULL hasta que el núcleo la instale.';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY['FaqPropuesta','FaqComentario','Notificacion']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enlazar_' || lower(t)) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF email ON "grid".%I
           FOR EACH ROW EXECUTE FUNCTION core.enlazar_persona()',
        'trg_enlazar_' || lower(t), t
      );
    END IF;
  END LOOP;
END $$;

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. EL ESTADO DE UN COMENTARIO
-- ─────────────────────────────────────────────────────────────────────────────
-- `resolved` solo decía si el área ya lo había mirado, y eso no basta: un
-- comentario ACEPTADO se publica bajo su ficha —es la aportación de alguien del
-- equipo— y uno RECHAZADO no. Sin distinguirlos, aceptar y rechazar dejaban la
-- misma huella y no había forma de saber cuáles mostrar.

ALTER TABLE "grid"."FaqComentario"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
  ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;

-- Los que ya estaban resueltos de antes se dan por aceptados: es lo que
-- significaba «atendido» cuando se marcaron.
UPDATE "grid"."FaqComentario"
   SET "status" = 'ACEPTADO'
 WHERE "resolved" = true AND "status" = 'PENDIENTE';

-- La consulta de la ficha: los aceptados de un documento, los recientes antes.
CREATE INDEX IF NOT EXISTS "FaqComentario_faqId_status_idx"
  ON "grid"."FaqComentario"("faqId", "status");

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. LOS PERMISOS, POR PERSONA
-- ─────────────────────────────────────────────────────────────────────────────
-- `GridAdmin` guardaba solo «esta persona administra». Ahora guarda los tres
-- permisos que existen: administrar, revisar el FAQ y qué secciones ve.
--
-- Se amplía esta tabla en vez de crear otra porque una segunda tabla de
-- permisos por correo obligaría a mirar en dos sitios para responder «¿qué
-- puede hacer esta persona?».

ALTER TABLE "grid"."GridAdmin"
  ADD COLUMN IF NOT EXISTS "esAdmin"   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "revisaFaq" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "secciones" TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Quien ya estaba en la tabla era administrador por definición, y un
-- administrador revisa el FAQ salvo que se le quite a mano.
UPDATE "grid"."GridAdmin" SET "revisaFaq" = true WHERE "esAdmin" = true;
