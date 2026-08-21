const DEFAULT_DOMAIN = "gruposohersa.com";

/**
 * El dominio corporativo.
 *
 * Una variable declarada PERO VACÍA cuenta como ausente. No es una sutileza:
 * `??` solo cae al valor por omisión con `null` o `undefined`, nunca con `""`,
 * y los paneles de configuración —Vercel entre ellos— guardan la variable
 * aunque se deje el campo en blanco. Con la versión anterior, `ALLOWED_DOMAIN=`
 * comparaba todos los correos contra la cadena vacía y no dejaba entrar a
 * NADIE, con un mensaje que además culpaba a la cuenta.
 *
 * Se recorta también el espacio en blanco: un valor pegado con un salto de
 * línea al final es invisible en el panel y rompe la comparación igual.
 */
function allowedDomain(): string {
  const declarado = process.env.ALLOWED_DOMAIN?.trim();
  return (declarado || DEFAULT_DOMAIN).toLowerCase();
}

function csvEnv(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function extractDomain(email: string): string {
  return email.toLowerCase().split("@")[1] ?? "";
}

/**
 * Quién puede entrar: cualquiera del dominio corporativo, más los correos
 * externos que se listen en `ALLOWED_EMAILS`.
 *
 * Mismo criterio que el portal y las demás herramientas, para que Knowledge
 * Grid no sea ni más permisivo ni más restrictivo que ellas.
 */
export function isAllowedEmail(email: string): boolean {
  const normalized = email.toLowerCase();
  if (extractDomain(normalized) === allowedDomain()) return true;
  return csvEnv("ALLOWED_EMAILS").includes(normalized);
}

/**
 * Administradores declarados por variable de entorno.
 *
 * Es la red de seguridad: la lista de verdad vive en la tabla `GridAdmin`, pero
 * si la base está vacía —el día del despliegue— nadie podría entrar a
 * Administración para dar de alta al primero. Esta variable rompe ese círculo.
 */
export function isEnvAdmin(email: string): boolean {
  return csvEnv("GRID_ADMINS").includes(email.toLowerCase());
}
