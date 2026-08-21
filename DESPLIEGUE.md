# Desplegar Sohersa Knowledge Grid

Guía verificada contra la base de producción real (Neon) el 21 de agosto de 2026.
El código ya está en GitHub; lo que queda son cuatro pasos, en este orden.

> **Los valores secretos no están en este archivo** —ni el `AUTH_SECRET`, ni la
> contraseña de Neon, ni el cliente de Google—. Todos están en tu `.env.local`,
> que nunca se sube. Cópialos de ahí cuando los pidan.

---

## Antes de empezar: lo que ya está hecho

La base de producción tiene la mitad del trabajo resuelto. Al inspeccionarla
aparecieron:

| | |
|---|---|
| `core.persona` | 53 personas, con sus 55 correos |
| `public."Resource"` | **152 documentos reales** — la sección Recursos del portal |
| `public."SyncLog"` | 58 sincronizaciones |
| esquema `grid` | **no existe todavía** — lo crea el paso 3 |

Esos 152 documentos son la biblioteca que Knowledge Grid hereda. El paso 3 los
copia a `grid."Resource"` **sin borrar el original**, para que el portal siga
funcionando hasta que retires su sección de Recursos.

---

## Paso 1 · Vercel

**Add New → Project**, elige `AlexSohersa/Sohersa-Knowledge-Grid`.
Rama de producción: `main`. El resto se detecta solo (Next.js).

**No despliegues todavía** — primero las variables, o el primer intento falla.

### Variables de entorno

En *Settings → Environment Variables*, con **Production** marcado:

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | La cadena de Neon. Está comentada al final de tu `.env.local`, bajo "PRODUCCIÓN (Neon)" — cópiala **sin** el `#` |
| `AUTH_SECRET` | El mismo de tu `.env.local`. **Tiene que ser idéntico** al de Digital Core, Deal Engine y Evaluación 360 |
| `AUTH_GOOGLE_ID` | El mismo de tu `.env.local` |
| `AUTH_GOOGLE_SECRET` | El mismo de tu `.env.local` |
| `AUTH_URL` | `https://TU-DOMINIO.vercel.app` — la URL que te dé Vercel |
| `GRID_ADMINS` | `a.rodriguez@gruposohersa.com` |

Seis. Ni una más hace falta.

**Por qué cada una importa:**

- `AUTH_SECRET` idéntico es lo que hace que la sesión sea **una sola** entre las
  cuatro herramientas. Si difiere, cada app emite un JWT que las demás no saben
  verificar, y entrar en una no te deja entrar en las otras.
- `AUTH_URL` no está en tu `.env.local` porque en local NextAuth lo deduce del
  propio servidor. En Vercel no puede: **sin él, el callback de Google vuelve a
  `localhost` y el inicio de sesión no cierra nunca.**
- `GRID_ADMINS` es la red de seguridad del primer día: la lista de
  administradores vive en la tabla `grid.GridAdmin`, que arranca vacía. Sin esta
  variable nadie podría entrar a Administración a dar de alta al primero.

### Opcionales — y de verdad opcionales

**Lo más limpio es NO crearlas.** Si no las necesitas, no las añadas en Vercel;
el código ya trae el valor correcto por omisión.

| Variable | Cuándo ponerla |
|---|---|
| `ALLOWED_EMAILS` | Solo si hay que dejar entrar correos de fuera del dominio, separados por comas |
| `ALLOWED_DOMAIN` | Solo si cambia el dominio corporativo; ya es `gruposohersa.com` |
| `CRONOGRAMA_SHEET_ID` | Solo para apuntar a otro cronograma; ya trae el real |

> **Crearlas y dejarlas en blanco no es lo mismo que no crearlas.** Vercel
> guarda la variable aunque el campo quede vacío, y el código la recibe como
> una cadena vacía. Antes eso tumbaba el inicio de sesión: `ALLOWED_DOMAIN`
> vacía comparaba todos los correos contra `""` y no dejaba entrar a nadie.
> Ya está corregido —una variable vacía cuenta como ausente—, pero si no la
> necesitas, bórrala del panel y queda más claro.

### Las que NO se ponen

Ninguna base de otras herramientas. Knowledge Grid saca del esquema `core` de la
misma base todo lo que necesita del padrón.

---

## Paso 2 · Google Cloud Console

**Sin esto no entra nadie**, ni tú: Google responde `redirect_uri_mismatch`.

Entra al cliente OAuth que comparte la plataforma (el mismo `AUTH_GOOGLE_ID`
que acabas de pegar en Vercel; en la consola lo identificas por ese número).

**Orígenes autorizados de JavaScript** — añadir:
```
https://TU-DOMINIO.vercel.app
```

**URIs de redirección autorizados** — añadir:
```
https://TU-DOMINIO.vercel.app/api/auth/callback/google
```

Y, si no está ya, para seguir trabajando en local:
```
http://localhost:3004/api/auth/callback/google
```

Las entradas de `localhost` de las otras herramientas se dejan como están.

> Los cambios en Google tardan a veces un par de minutos en surtir efecto. Si
> el primer intento falla con `redirect_uri_mismatch`, espera y reintenta antes
> de tocar nada más.

---

## Paso 3 · Crear las tablas en producción

Esto se corre **desde tu máquina**, una sola vez, con la terminal en la carpeta
del proyecto:

```bash
CONFIRMAR_PRODUCCION=si \
DATABASE_URL="<la cadena de Neon>" \
npm run db:migrate:prod
```

Aplica `prisma/migrations/002_despliegue_grid.sql`, que:

1. crea el esquema `grid` y sus **20 tablas**;
2. las enlaza al padrón (`core.persona`) con 9 claves foráneas;
3. **copia los 152 documentos** de `public."Resource"` a `grid."Resource"`;
4. instala los disparadores que rellenan `persona_id` desde el correo.

Debe terminar diciendo `Migración aplicada.`

**Es idempotente**: si lo corres dos veces no duplica nada. Y solo AÑADE —
nunca hace `DROP`, porque comparte base con las 12,476 filas de las demás
herramientas.

> Se probó sobre una base limpia que reproduce el estado de Neon: dos pasadas
> seguidas dejan 20 tablas, 152 documentos y `public."Resource"` intacto.

⚠️ **Nunca uses `prisma db push` contra esta base.** Compara el esquema con la
base entera y querría borrar todo lo que no esté declarado aquí: las horas, los
catálogos, las vacaciones y los tickets de las otras herramientas. Por eso el
comando ni siquiera existe en este proyecto.

El script se niega a tocar una base remota sin `CONFIRMAR_PRODUCCION=si`, para
que no se pueda migrar producción por accidente.

---

## Paso 4 · Dejar solo lo real  ✔ hecho

En producción se estrenan **dos** secciones, y las dos tienen contenido
verdadero:

- **La biblioteca** — 153 documentos sincronizados del cronograma.
- **Las capacitaciones** — 6, armadas desde ese mismo cronograma: sus 15
  materiales apuntan a archivos reales de Drive y 18 de sus 24 temas tienen
  grabación.

Lo demás eran datos de ejemplo, cargados para poder ver el diseño. **Ya se
borraron de producción** (62 filas: herramientas, la ruta, la FAQ y la
comunidad).

Si alguna vez hiciera falta repetirlo:

```bash
CONFIRMAR=si DATABASE_URL="<la cadena de Neon>" npm run db:limpiar:prod
```

Va en **una transacción** y cuenta antes y después: si el borrado tocara algo
que debía conservarse, deshace todo y aborta. Es idempotente — sobre una base
ya limpia borra 0 filas.

> Hay dos versiones del script: `db:limpiar` (local, vía Prisma) y
> `db:limpiar:prod` (producción, vía `pg` con SQL directo). No es un capricho:
> desde esta máquina el motor de Prisma no alcanza el servidor de Neon, ni por
> el pooler ni por el endpoint directo, mientras que `pg` conecta sin problema.

---

## Comprobar que quedó bien

1. Entra con tu cuenta. El inicio de sesión debe **cerrar** y dejarte dentro.
2. **Biblioteca**: deben salir los **153 documentos**, agrupados por sección.
   (Eran 152 al inspeccionar; el cronograma ganó uno por el camino.)
3. Abre uno: el visor de Drive debe cargarlo **con tu propia cuenta** — ves lo
   que ya tenías permiso de ver, ni más ni menos.
4. Pulsa **Sincronizar**: debe leer el cronograma y decir cuántos actualizó.
5. Si ya habías entrado en el portal o Deal Engine en ese navegador, **no debe
   pedirte cuenta otra vez**. Eso confirma que el `AUTH_SECRET` quedó bien.
6. **Capacitaciones**: deben salir **6**, con sus videos y materiales.
7. Herramientas, Mi ruta, FAQ y Comunidad saldrán **vacías**. Es lo esperado:
   su contenido se carga desde Administración cuando haga falta.

---

## Avisar a Alejandro

Dos cosas que dependen del portal, no de aquí:

- En `src/lib/apps.ts` del portal, cambiar Knowledge Grid de
  `status: "planned"` a `"live"`.
- Añadir `NEXT_PUBLIC_URL_KNOWLEDGE_GRID=https://TU-DOMINIO.vercel.app` a las
  variables del portal, para que el botón de Herramientas abra algo.

Y, cuando confirmes que el portal ya no lee su sección de Recursos, se puede
borrar `public."Resource"`. Hasta entonces se queda: la migración la **copió**,
no la movió.

---

## Si algo falla

| Síntoma | Causa casi segura |
|---|---|
| `redirect_uri_mismatch` | Falta el URI del paso 2, o aún no ha propagado |
| Inicia sesión y vuelve al login en bucle | `AUTH_URL` mal puesta o ausente |
| Entra, pero pide cuenta aunque ya entraste al portal | `AUTH_SECRET` distinto al de las otras apps |
| "Tu cuenta no tiene acceso" con un correo del dominio | Alguna variable opcional creada **en blanco**. El log dice cuál: busca `[login] rechazado:` |
| La biblioteca sale vacía | Falta el paso 3, o `DATABASE_URL` apunta a otra base |
| El visor de Drive no carga el documento | Permisos de ese archivo en Drive, no de la app |

---

## Lo que queda fuera del alcance

- **Las secciones vacías.** Capacitaciones, rutas, FAQ y comunidad funcionan,
  pero sin contenido hasta que se cargue desde Administración.
- **El aviso por correo** de la comunidad usa `gmail.send` con la cuenta de
  quien valida. Sin contenido en comunidad, no se ejercita.
