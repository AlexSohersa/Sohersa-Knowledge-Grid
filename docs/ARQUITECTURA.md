# Arquitectura · Sohersa Knowledge Grid

Documento para quien vaya a tocar este código. Explica **por qué** está armado
así, no solo cómo.

---

## 1. La regla que lo gobierna todo

```
infrastructure  →  application  →  domain
```

Las dependencias apuntan **siempre hacia adentro**:

- **`domain/`** no importa nada de fuera. Ni Prisma, ni Next, ni `@/lib`. Todo lo
  que hay ahí se puede probar con un objeto literal.
- **`application/`** importa solo su dominio y sus `ports`. No sabe que existe
  una base de datos.
- **`infrastructure/`** importa todo y es la **única** capa que conoce Prisma.
- **La UI** (`src/app/`, `src/components/`) importa **solo** `wiring.ts`.

Se verifica con:

```bash
grep -rn "prisma\|server-only" src/modules/*/domain/ src/modules/*/application/
# no debe devolver nada
```

Es el mismo patrón que Deal Engine, y por la misma razón: permite probar un caso
de uso con un repositorio falso, y cambiar lo de abajo sin tocar las reglas.

---

## 2. Por qué dos bases de datos

| | `grid.prisma` | `portal.prisma` |
|---|---|---|
| Dueño | Knowledge Grid | Digital Core |
| Acceso | lectura + escritura | **solo lectura** |
| Contiene | capacitaciones, rutas, FAQ, comunidad, avances, guardados | manuales del cronograma, automatizaciones, el equipo |

Los manuales los sincroniza Digital Core desde el Cronograma de Estandarización
en Google Sheets. **Si Knowledge Grid los escribiera**, la siguiente
sincronización pisaría el cambio y la edición desaparecería sin explicación
—el peor tipo de fallo, porque no avisa—.

Se declara un espejo explícito en vez de compartir el cliente del portal porque
documenta exactamente qué campos se consumen: si Digital Core agrega una
columna, esta app no se entera y no se rompe.

---

## 3. Cómo se conectan los módulos sin acoplarse

Dos módulos necesitan algo de otro. En ambos casos, **el que necesita declara el
contrato y el que sabe hacerlo lo implementa**:

### Comunidad → FAQ

```
comunidad/application/ports.ts        declara  PromoverAFaq
faq/infrastructure/promover-desde-comunidad.ts   lo implementa
comunidad/infrastructure/wiring.ts    los junta
```

Comunidad **no conoce las tablas de FAQ**. Si mañana cambia cómo se crean las
preguntas frecuentes, Comunidad no se entera.

### Herramientas → todo lo demás

```
herramientas/application/ports.ts     declara  ConocimientoPorHerramienta
herramientas/infrastructure/conocimiento.adapter.ts   lo implementa
```

Cada herramienta muestra cuántos documentos, capacitaciones, FAQ y preguntas
tiene asociados —"cada herramienta es un pequeño centro de conocimiento"—. El
adaptador trae **una vez** lo que hay y cruza en memoria: la alternativa serían
24 consultas para seis herramientas.

El cruce es por NOMBRE y no por llave foránea a propósito: los documentos del
cronograma nombran el software en texto libre ("Revit 2024"), y exigir un id
capturado a mano haría que la relación nunca estuviera completa.

---

## 4. Decisiones de diseño

### Consulta y aprendizaje son dos cosas distintas

Es la decisión que más forma le da al producto:

| | **Capacitaciones** | **Mi ruta** |
|---|---|---|
| Qué es | material de consulta | un camino asignado |
| ¿Lleva avance? | **no** | **sí** |
| Quién decide qué ves | tú, buscando | quien te asignó la ruta |
| Etapas bloqueadas | no | sí |

Una capacitación es una fuente de información: alguien necesita el video de
revisiones o la presentación de Dynamo y viene a buscarlo. Marcar "leído" en
material de consulta no aporta nada y ensucia la pantalla con estado que a nadie
le importa.

El avance vive en `PathProgress`, y cuelga de la **asignación de ruta**, no de la
capacitación. La consecuencia buscada: si la misma capacitación está en dos
rutas, cada una lleva su propia cuenta —son dos encargos distintos—.

En la ruta se registra todo lo que importa: qué temas viste, qué material
descargaste y por dónde ibas en cada video.

### El estado se deriva, nunca se guarda

| Concepto | Se calcula de |
|---|---|
| Estado de una pregunta | si tiene respuestas y si alguna está validada |
| Porcentaje de una ruta | contar los elementos completados |
| Si un elemento está hecho | que TODOS sus temas lo estén |
| Si una etapa está abierta | si la etapa anterior está completa |

Un porcentaje guardado se desfasa en cuanto la capacitación gana o pierde un
tema. Un estado guardado habría que recalcularlo en cada alta, cada validación y
cada borrado, y bastaría olvidar uno para que mintiera.

### Los permisos se aplican en el servidor

Los **campos internos** de la biblioteca —prioridad, notas, avance del
cronograma— se recortan en el repositorio, no en la interfaz. Un campo que no se
incluye en el objeto no viaja al navegador y no se puede leer en el código
fuente de la página. Ocultarlo con CSS sería solo apariencia.

Lo mismo con las acciones: **el correo siempre sale de la sesión**, nunca de un
parámetro. Si el cliente pudiera enviarlo, cualquiera marcaría temas como vistos
a nombre de otra persona o validaría respuestas sin ser administrador.

Administración se comprueba **dos veces**: en el layout de `/admin` (para que
ninguna pantalla se olvide) y dentro de cada acción (porque una ruta protegida
no protege una acción invocada a mano).

### Las escrituras propagan sus errores

Solo las **lecturas** caen a un valor neutro (`[]`, `null`). Una escritura que
silencia su error haría que alguien creyera tener un avance que no se guardó.

Las dos únicas excepciones son los contadores de vistas, y están comentadas
donde ocurren: perder una vista es preferible a romper la carga de la ficha que
la persona vino a leer.

### La búsqueda de texto se filtra en memoria

La comparación sin acentos que la gente espera —"cuantificacion" debe encontrar
"cuantificación"— exige la extensión `unaccent` de Postgres, que no está
garantizada en la instalación. El cronograma tiene decenas de documentos, no
millones.

La función `normalizar` vive en `biblioteca/domain/documento.ts` y la reutilizan
todos los módulos, para que el servidor y el cliente filtren igual.

### Varias soluciones por pregunta

Un administrador puede validar **más de una** respuesta. Se numeran "Solución
1", "Solución 2" por fecha de validación. A menudo hay más de un camino correcto
y esconder el segundo empobrece la respuesta.

Que solo administración pueda validar es lo que separa esta sección de un foro
cualquiera: si validara cualquiera, la marca no significaría nada.

---

## 5. El inicio de sesión único

```
Digital Core :3000 ─┐
Deal Engine  :3001 ─┼─  mismo AUTH_SECRET  +  prefijo de cookie `authjs.`
Evaluación   :3003 ─┤
Knowledge    :3004 ─┘
```

En localhost las cookies se comparten por dominio —el puerto no cuenta—, así que
la sesión que emite una app la reconocen las otras.

Dos requisitos:

1. **Mismo `AUTH_SECRET`** en las cuatro. Si difiere, cada app emite un JWT que
   las demás no pueden verificar.
2. **Resolver a la persona por CORREO**, no por id: las bases son distintas y
   los ids no coinciden.

El `refresh_token` de Google se guarda en `TeamMember.googleRefresh` —tabla del
portal— porque Google solo lo entrega cuando muestra la pantalla de permisos.
Guardándolo, esa pantalla se ve **una sola vez en la vida**, no una por
herramienta.

> En producción hace falta además un dominio común (`.sohersa.com`).

---

## 6. Dónde tocar según qué

| Quiero… | Voy a… |
|---|---|
| Cambiar una regla de negocio | `modules/<x>/domain/` |
| Cambiar qué hace una operación | `modules/<x>/application/` |
| Cambiar una consulta | `modules/<x>/infrastructure/*.repository.ts` |
| Añadir una operación a la UI | `modules/<x>/infrastructure/wiring.ts` |
| Cambiar un color o medida | `src/styles/tokens.css` |
| Cambiar una pantalla | `src/app/(app)/<ruta>/page.tsx` |

**Nunca** importes un repositorio desde una página. Si hace falta algo nuevo,
añade el caso de uso y expónlo por el `wiring`.
