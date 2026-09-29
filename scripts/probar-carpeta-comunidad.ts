/**
 * Comprueba que se puede escribir en la carpeta «Comunidad» de Drive.
 *
 * Una subida que falla desde la aplicación da un mensaje y poco más. Esto hace
 * el mismo recorrido —ver la carpeta, crear la subcarpeta del mes, subir un
 * archivo, borrarlo— y dice en qué paso exacto se rompe, que es lo que permite
 * arreglarlo en vez de adivinar.
 *
 * USA EL TOKEN DE UNA PERSONA REAL, el que guarda el padrón al iniciar sesión.
 * Es la misma credencial con la que sube la aplicación, así que lo que pase
 * aquí es lo que le pasará a esa persona.
 *
 *   DATABASE_URL="…" npx tsx scripts/probar-carpeta-comunidad.ts correo@gruposohersa.com
 */

import { Client } from "pg";
import { google } from "googleapis";
import { Readable } from "node:stream";

const CARPETA_COMUNIDAD = "1TKfxmuJX9SpmAH6Dsmyfr0BW2aRZyARa";

async function main() {
  const correo = process.argv[2];
  const url = process.env.DATABASE_URL;

  if (!correo || !url) {
    console.error(
      'Uso:\n  DATABASE_URL="…" npx tsx scripts/probar-carpeta-comunidad.ts correo@gruposohersa.com',
    );
    process.exit(1);
  }

  const idCliente = process.env.AUTH_GOOGLE_ID;
  const secreto = process.env.AUTH_GOOGLE_SECRET;
  if (!idCliente || !secreto) {
    console.error("Faltan AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET.");
    process.exit(1);
  }

  /* ── 1 · El token de esa persona ──────────────────────────────────── */

  const c = new Client({ connectionString: url });
  await c.connect();

  const r = await c.query(
    `SELECT p.google_refresco AS token
       FROM core.persona p
       JOIN core.persona_correo pc ON pc.persona_id = p.id
      WHERE pc.correo = $1`,
    [correo.toLowerCase()],
  );
  await c.end();

  const token = r.rows[0]?.token;
  if (!token) {
    console.error(
      `  ✗ ${correo} no tiene token de Google guardado.\n` +
        "    Esa persona tiene que haber iniciado sesión en la plataforma al menos una vez.",
    );
    process.exit(1);
  }

  console.log(`  ✓ token de ${correo} encontrado\n`);

  const oauth = new google.auth.OAuth2(idCliente, secreto);
  oauth.setCredentials({ refresh_token: token });
  const drive = google.drive({ version: "v3", auth: oauth });

  /* ── 2 · ¿Se ve la carpeta? ───────────────────────────────────────── */

  try {
    const meta = await drive.files.get({
      fileId: CARPETA_COMUNIDAD,
      fields: "name,mimeType,capabilities(canAddChildren,canEdit),owners(emailAddress)",
      supportsAllDrives: true,
    });

    console.log(`  ✓ carpeta: «${meta.data.name}»`);
    console.log(`    dueño  : ${meta.data.owners?.[0]?.emailAddress ?? "—"}`);

    const puede = meta.data.capabilities?.canAddChildren;
    console.log(`    ¿puede escribir en ella? ${puede ? "SÍ" : "NO"}\n`);

    if (!puede) {
      console.error(
        "  ✗ AQUÍ ESTÁ EL PROBLEMA: esa cuenta ve la carpeta pero no puede escribir.\n" +
          "    Hace falta permiso de EDITOR sobre «Comunidad», no de lector.",
      );
      process.exit(1);
    }
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ no se pudo abrir la carpeta: ${m}`);
    console.error(
      "\n    Si dice «not found», puede ser que no exista o que no esté compartida\n" +
        `    con ${correo}.`,
    );
    process.exit(1);
  }

  /* ── 3 · La subcarpeta del mes ────────────────────────────────────── */

  const mes = new Intl.DateTimeFormat("es-MX", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .replace("/", "-");

  let subcarpeta: string;
  try {
    const hay = await drive.files.list({
      q: `name = '${mes}' and '${CARPETA_COMUNIDAD}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
      pageSize: 1,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });

    if (hay.data.files?.[0]?.id) {
      subcarpeta = hay.data.files[0].id!;
      console.log(`  ✓ subcarpeta «${mes}» ya existía`);
    } else {
      const creada = await drive.files.create({
        requestBody: {
          name: mes,
          mimeType: "application/vnd.google-apps.folder",
          parents: [CARPETA_COMUNIDAD],
        },
        fields: "id",
        supportsAllDrives: true,
      });
      subcarpeta = creada.data.id!;
      console.log(`  ✓ subcarpeta «${mes}» creada`);
    }
  } catch (e) {
    console.error(`  ✗ no se pudo crear la subcarpeta: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  /* ── 4 · Subir un archivo de verdad ───────────────────────────────── */

  // Un PNG de 1×1 píxel: pesa 70 bytes y es una imagen válida, así que recorre
  // exactamente el mismo camino que una captura real.
  const PNG_1PX = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );

  let subidoId: string | null = null;
  try {
    const subido = await drive.files.create({
      requestBody: { name: `PRUEBA borrar ${Date.now()}.png`, parents: [subcarpeta] },
      media: { mimeType: "image/png", body: Readable.from(PNG_1PX) },
      fields: "id,name,size",
      supportsAllDrives: true,
    });

    subidoId = subido.data.id ?? null;
    console.log(`  ✓ imagen subida: «${subido.data.name}» (${subido.data.size} bytes)`);
  } catch (e) {
    console.error(`  ✗ LA SUBIDA FALLÓ: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }

  /* ── 5 · Retirar la prueba ────────────────────────────────────────── */

  if (subidoId) {
    try {
      await drive.files.delete({ fileId: subidoId, supportsAllDrives: true });
      console.log("  ✓ prueba retirada de Drive");
    } catch {
      console.log(`  ! la prueba quedó en Drive (id ${subidoId}); bórrala a mano`);
    }
  }

  console.log("\n  Todo bien: esa cuenta puede subir capturas desde la plataforma.");
}

main().catch((e) => {
  console.error("Falló:", e instanceof Error ? e.message : e);
  process.exit(1);
});
