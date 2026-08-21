# Sohersa Knowledge Grid

La cuarta herramienta de la plataforma digital de SOHERSA. Reúne en un solo
sitio lo que la empresa sabe: manuales y estándares, las herramientas con las
que se trabaja, las capacitaciones del equipo, las rutas de formación, las
preguntas frecuentes y la comunidad de preguntas y respuestas.

```
Digital Core (:3000) · Deal Engine (:3001) · Evaluación 360 (:3003) · Knowledge Grid (:3004)
```

---

## Puesta en marcha

```bash
npm install                  # instala y genera el cliente de Prisma
cp .env.example .env.local   # y rellena los valores (ver abajo)
npm run db:migrate           # crea las tablas de Knowledge Grid
npm run db:seed:real         # carga el material REAL del cronograma
npm run dev                  # http://localhost:3004
```

> **Nunca uses `prisma db push` ni `prisma migrate` aquí.** La base es
> COMPARTIDA: este esquema declara solo una parte —las tablas de `grid`, más las
> de `core` y `public` que se leen—, así que Prisma trata todo lo demás como
> sobrante y quiere borrarlo. Al intentarlo avisó de eliminar más de 12,000
> filas reales de las otras herramientas, y el `diff` incluso proponía destruir
> las llaves foráneas del núcleo.
>
> Por eso `db:push` se retiró del `package.json`. Las tablas se crean con
> `db:migrate`, que ejecuta SQL explícito e idempotente y solo AÑADE.

> Los comandos `db:*` van envueltos con `dotenv-cli` porque la CLI de Prisma
> **no lee `.env.local`** —solo Next lo hace—. Sin eso habría que exportar las
> variables a mano en cada terminal.

### Instalación de esta máquina

- **Base propia**: PostgreSQL 18, puerto **5434**, base `knowledge_grid`.
- **Espejo del portal**: PostgreSQL 13, puerto **5432**, base `plataforma_sohersa`
  (152 documentos del cronograma, 45 personas). Solo lectura.
- **Google OAuth**: hay que agregar `http://localhost:3004/api/auth/callback/google`
  a las URIs de redirección autorizadas del cliente de OAuth del portal. Sin esa
  línea, Google responde `redirect_uri_mismatch`.

### Variables de entorno

| Variable | Para qué |
|---|---|
| `AUTH_SECRET` | **Debe ser el MISMO que el de las otras tres apps.** Es lo que hace que la sesión se comparta. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Credenciales de OAuth, las mismas del portal. |
| `DATABASE_URL` | La base **unificada** de SOHERSA. Una sola para toda la plataforma. |
| `ALLOWED_DOMAIN` | Dominio corporativo. Por omisión `gruposohersa.com`. |
| `ALLOWED_EMAILS` | Correos externos autorizados, separados por comas. |
| `GRID_ADMINS` | Administradores de arranque, separados por comas. Ver *Administración*. |

---

## Inicio de sesión único

El login es **el mismo mecanismo** que el de Digital Core, Deal Engine y
Evaluación 360: quien ya entró en cualquiera de ellas entra aquí sin volver a
autenticarse.

Funciona por dos piezas, ambas en `src/lib/auth/config.ts`:

1. **Prefijo de cookie compartido** (`authjs.`). En localhost las cookies se
   comparten por dominio —el puerto no cuenta—, así que la sesión que emite una
   app la reconocen las otras.
2. **El mismo `AUTH_SECRET`** en las cuatro. Sin esto, cada app emitiría un JWT
   que las demás no pueden verificar.

Además, la sesión resuelve a la persona **por correo**, no por id: las bases son
distintas y los ids no coinciden.

> En producción hace falta además un dominio común (`.sohersa.com`).

El `refresh_token` de Google se guarda en `TeamMember.googleRefresh` —la tabla
del portal— para que la pantalla de permisos se vea **una sola vez en la vida**,
no una por herramienta.

---

## Arquitectura

Misma que Deal Engine: **hexagonal por módulo**, tres capas y las dependencias
apuntando siempre hacia adentro.

```
src/modules/<contexto>/
  domain/          ← lógica PURA. No conoce Prisma, ni Next, ni la BD.
  application/     ← CASOS DE USO. Orquestan dominio + ports. Sin framework.
    ports.ts         interfaces (contratos) que la infraestructura implementa
  infrastructure/  ← implementación CONCRETA. La única capa que toca la BD.
    wiring.ts        "cablea" casos de uso + implementaciones
```

**Regla de dependencias:** `infrastructure → application → domain`.
La UI (`src/app/`) importa **solo** `wiring.ts`, nunca un repositorio ni un port.

### Los siete módulos

| Módulo | De qué responde |
|---|---|
| `biblioteca` | Manuales, instructivos, estándares, plantillas y automatizaciones. |
| `herramientas` | El catálogo de software y su **estado de adopción**. |
| `capacitaciones` | Cursos, temas, materiales y el **avance por persona**. |
| `rutas` | Rutas de aprendizaje con **etapas que se desbloquean**. |
| `faq` | Las preguntas frecuentes: la respuesta oficial de la empresa. |
| `comunidad` | Preguntas y respuestas del equipo, con **soluciones validadas**. |
| `personal` | Guardados e historial de cada quien. |

### Módulos que se conectan sin acoplarse

Dos cruces, ambos resueltos con **ports**, igual que Leads ↔ Oportunidades en
Deal Engine:

- **Comunidad → FAQ.** Comunidad declara `PromoverAFaq`; FAQ lo implementa en
  `faq/infrastructure/promover-desde-comunidad.ts`. Comunidad no conoce las
  tablas de FAQ.
- **Rutas → Capacitaciones.** Rutas declara `AvanceDeCapacitaciones`;
  Capacitaciones lo implementa en
  `capacitaciones/infrastructure/avance-para-rutas.ts`. Rutas no sabe cómo se
  guarda el avance.

---

## Los datos

Una sola base (`sohersa_unificada`) para las cinco herramientas, organizada en
**tres secciones**:

| Sección | Qué contiene | Quién la escribe |
|---|---|---|
| **`core`** | `persona` (53), `persona_correo`, proyectos, clientes | el núcleo |
| **`grid`** | las 20 tablas de esta herramienta, incluidas `Resource` (152) y `Automation` | esta app |
| **`public`** | `TeamMember` (credenciales) y `SyncLog` (bitácora compartida) | el portal |

### La regla

**El núcleo es dueño de personas, proyectos y clientes. Las herramientas los
referencian por llave foránea; nunca guardan su propia copia.**

Declarar aquí un directorio propio sería una cuarta copia del padrón —el
problema que la unificación vino a resolver—.

### Cómo se enlaza una persona

Las tablas de `grid` guardan el `email` de la sesión **y** una columna
`persona_id`. Esa columna **no se escribe desde la app**: un disparador
(`core.enlazar_persona`) la rellena al insertar, buscando el correo en el
padrón.

Funciona también con los correos alternos, así que quien entra con su Gmail en
una herramienta y con el corporativo en otra queda apuntando a la misma ficha.

Las tablas enlazadas: `GridAdmin`, `Bookmark`, `ViewLog`, `PathAssignment`,
`FaqVote`, `AnswerVote`, `Question`, `Answer`, `AnswerComment`.

Comprobar que todo quedó ligado:

```sql
SELECT * FROM core.v_sin_enlazar;   -- vacía es lo normal
```

### Política de borrado

- **`CASCADE`** para lo personal —guardados, historial, avance—: si alguien deja
  la empresa, su rastro personal se va con él.
- **`SET NULL`** para lo aportado a la comunidad —preguntas, respuestas,
  comentarios—: borrarlas dejaría preguntas mancas para todos.

### Si añades una tabla

```sql
CREATE TABLE grid."MiTabla" (
  id          text PRIMARY KEY,
  email       text,
  persona_id  text REFERENCES core.persona(id) ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER enlazar_persona
  BEFORE INSERT OR UPDATE OF email ON grid."MiTabla"
  FOR EACH ROW EXECUTE FUNCTION core.enlazar_persona();
```

### Campos internos de la biblioteca

Prioridad, "necesario para iniciar", notas y avance son información de gestión.
Solo los recibe quien tiene `isAdmin` en `TeamMember`, y **el recorte ocurre en
el repositorio**: los campos que no corresponden no se incluyen en el objeto, así
que no viajan al navegador. Ocultarlos con CSS sería solo apariencia.

---

## Las 18 pantallas

| Ruta | Pantalla |
|---|---|
| `/login` | Acceso con Google |
| `/` | Inicio — qué tengo a medias |
| `/buscar` | Búsqueda global en los 6 tipos de conocimiento |
| `/biblioteca` | Manuales y estándares |
| `/biblioteca/[code]` | Ficha del documento + visor incrustado |
| `/biblioteca/automatizaciones` | Scripts y paquetes |
| `/herramientas` · `/herramientas/[id]` | Catálogo y ficha |
| `/capacitaciones` | Biblioteca de formación con filtros |
| `/capacitaciones/[id]` | Ficha + reproductor + temario |
| `/ruta` | Mi ruta, con etapas que se desbloquean |
| `/faq` | Preguntas frecuentes en acordeón |
| `/comunidad` · `/comunidad/[id]` · `/comunidad/preguntar` | Preguntas y respuestas |
| `/guardados` · `/historial` · `/aprendizaje` | Lo personal |
| `/admin` + 5 subpantallas | Administración |

El diseño sale de `Centro de Conocimiento.dc.html` (Claude Design). Los tokens
están en `src/styles/tokens.css`, tomados **tal cual** del diseño.

---

## Decisiones que conviene conocer

**El estado se deriva, no se guarda.** El avance de una capacitación, el estado
de una pregunta y el porcentaje de una ruta se calculan cada vez a partir de lo
que hay. Un número guardado se desfasa en cuanto cambia el contenido, y entonces
miente.

**Varias soluciones por pregunta.** Un administrador puede validar más de una
respuesta; se numeran "Solución 1", "Solución 2" por fecha de validación. A
menudo hay más de un camino correcto y esconder el segundo empobrece la
respuesta.

**Las escrituras propagan sus errores.** Solo las lecturas caen a un valor
neutro. Un `catch` silencioso en una escritura haría que alguien creyera tener un
avance que no se guardó. Las dos excepciones —contadores de vistas— están
comentadas donde ocurren.

**La búsqueda de texto se filtra en memoria.** La comparación sin acentos que la
gente espera exige la extensión `unaccent` de Postgres, que no está garantizada.
El cronograma tiene decenas de documentos, no millones.

---

## Administración

Administrar aquí significa publicar capacitaciones, armar rutas, mantener las FAQ
y validar respuestas. **No es lo mismo que administrar el portal**, y por eso es
una lista propia (`GridAdmin`).

Para el primer arranque, cuando la tabla está vacía, la variable `GRID_ADMINS`
rompe el círculo: sin ella nadie podría entrar a dar de alta al primero.

---

## Comandos

```bash
npm run dev          # desarrollo en :3004
npm run build        # compila para producción
npm run start        # sirve lo compilado
npm run typecheck    # TypeScript sin emitir
npm run lint         # ESLint
npm run db:migrate   # crea las tablas de `grid` (idempotente, solo añade)
npm run db:seed:real # arma capacitaciones y ruta con el material REAL del portal
npm run db:seed      # datos de ejemplo del diseño (alternativa)
npm run db:limpiar   # borra los datos de ejemplo, conserva la biblioteca
npm run db:studio    # explorar la base a mano
```

Los tres comandos que tocan la base tienen su variante `:prod`
(`db:migrate:prod`, `db:limpiar:prod`) para apuntar a Neon. Van por separado
a propósito: los de arriba cargan `.env.local`, y dotenv **pisa** cualquier
`DATABASE_URL` que se pase por delante, así que sin la variante uno creería
estar tocando producción mientras migra su base local. Ver [DESPLIEGUE.md](DESPLIEGUE.md).

### Las dos semillas

`db:seed:real` es la buena para trabajar: lee el cronograma del portal y **arma
las capacitaciones con los videos y PDF que ya existen en Drive**. Empareja las
grabaciones de la sección 10 con las presentaciones de la 9 y los instructivos
de la 1 y 2, usando el CÓDIGO del cronograma —la llave que el equipo ya usa y
que no cambia aunque alguien reescriba un título—.

`db:seed` carga los datos ficticios del diseño. Sirve para ver las pantallas sin
conexión al portal.

Las dos son idempotentes: correrlas dos veces no duplica nada.

> `npm run build` puede necesitar más memoria en equipos con poca RAM:
> `NODE_OPTIONS="--max-old-space-size=6144" npm run build`
