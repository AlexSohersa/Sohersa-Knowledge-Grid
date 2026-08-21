# Módulo: Biblioteca

Los manuales, instructivos, estándares, plantillas y familias de la empresa, más
las automatizaciones subidas a la plataforma.

Es la parte que **se migró de Recursos** (Digital Core) y se dejó igual en
comportamiento: mismas secciones, mismo orden del cronograma y misma regla de
campos internos.

## Arquitectura (3 capas)

```
biblioteca/
  domain/          ← lógica PURA. No conoce Prisma, ni Next, ni la BD.
    documento.ts     el documento, su estado, cómo se abre, cómo se busca
  application/     ← CASOS DE USO. Orquestan dominio + ports. Sin framework.
    ports.ts             interfaces (contratos) que la infra implementa
    listar-biblioteca.ts listar, agrupar, facetas, ver uno
  infrastructure/  ← implementación CONCRETA. La única capa que toca la BD.
    biblioteca.repository.ts  implementa los ports con Prisma
    wiring.ts                 "cablea" casos de uso + implementaciones
```

**Regla de dependencias (hacia adentro):**
`infrastructure → application → domain`. El dominio no importa nada de fuera; la
aplicación importa solo dominio y sus ports; la infraestructura conoce Prisma.
La UI importa SOLO `wiring.ts`.

## De dónde salen los datos

De la tabla `Resource` del **portal**, en modo espejo de **solo lectura**
(`prisma/portal.prisma`). Digital Core la sincroniza desde el "Cronograma de
Estandarización" en Google Sheets.

Knowledge Grid no escribe ahí a propósito: la siguiente sincronización pisaría
cualquier cambio hecho desde aquí y la edición desaparecería sin explicación.

## Campos internos

Prioridad, "necesario para iniciar", notas y avance son información de gestión.
Solo los recibe quien tiene `isAdmin` en `TeamMember`, y **el recorte ocurre en
el repositorio**: los campos que no corresponden no se incluyen en el objeto, así
que no viajan al navegador. Ocultarlos con CSS solo sería apariencia.

## Búsqueda

El filtro por sección y autor lo resuelve Postgres; el texto libre se filtra en
memoria. Es deliberado: la comparación sin acentos que la gente espera exige la
extensión `unaccent`, que no está garantizada en la base, y el cronograma tiene
decenas de documentos, no millones.
