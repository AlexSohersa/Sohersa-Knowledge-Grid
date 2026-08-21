const DEFAULT_DOMAIN = "gruposohersa.com";

function allowedDomain(): string {
  return (process.env.ALLOWED_DOMAIN ?? DEFAULT_DOMAIN).toLowerCase();
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
