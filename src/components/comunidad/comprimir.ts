/**
 * Encoge una imagen en el navegador, antes de mandarla.
 *
 * EL PROBLEMA QUE RESUELVE. Una captura viaja del equipo al servidor y del
 * servidor a Drive, y ese paso intermedio tiene un tope: Vercel corta las
 * peticiones grandes y no hay forma de subirlo desde el código. Por eso había
 * un límite de 2 MB por imagen, y por eso un logo en alta resolución —o una
 * captura de un monitor 4K— se rechazaba sin que quien la mandaba entendiera
 * qué tenía de malo.
 *
 * Encogerla aquí quita el problema en origen: una captura de 6 MB sale de este
 * módulo pesando unos cientos de kilobytes, sin que nadie tenga que abrir un
 * editor ni saber qué es «bajarle la calidad».
 *
 * QUÉ SE CONSERVA. El ancho máximo —1600 px— es de sobra para leer un mensaje
 * de error o reconocer un diálogo, que es para lo que sirve una captura en una
 * pregunta. Lo que se pierde es resolución que nadie iba a mirar.
 *
 * Los GIF se dejan pasar sin tocar: dibujarlos en un lienzo se queda con el
 * primer fotograma y mata la animación, que suele ser justo lo que se quiere
 * enseñar.
 */

/** A partir de aquí se encoge. Por debajo no vale la pena recodificar. */
const DESDE_BYTES = 1024 * 1024;

/** El ancho máximo que se conserva. */
const ANCHO_MAX = 1600;

/** A cuánto se aspira. Holgado respecto al tope real del servidor. */
const OBJETIVO_BYTES = 1.2 * 1024 * 1024;

/**
 * Devuelve la imagen lista para mandar: la misma si ya era pequeña, o una
 * versión encogida si no.
 *
 * NUNCA FALLA HACIA ATRÁS: si el navegador no puede procesarla —un formato
 * raro, un lienzo bloqueado— se devuelve la original y que decida el servidor.
 * Perder la imagen por intentar mejorarla sería peor que mandarla grande.
 */
export async function encoger(archivo: File): Promise<File> {
  if (archivo.size <= DESDE_BYTES) return archivo;
  if (archivo.type === "image/gif") return archivo;
  if (typeof document === "undefined") return archivo;

  try {
    const bitmap = await crearBitmap(archivo);

    const escala = Math.min(1, ANCHO_MAX / bitmap.width);
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;

    const ctx = lienzo.getContext("2d");
    if (!ctx) return archivo;

    /*
     * Fondo blanco antes de dibujar.
     *
     * Un PNG con transparencia —un logo, por ejemplo— pasado a JPEG deja el
     * fondo en negro, y el logo se vuelve ilegible. Pintar blanco debajo
     * conserva el aspecto que tenía.
     */
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    if ("close" in bitmap) bitmap.close();

    /*
     * Se baja la calidad hasta que quepa, sin pasarse de feo.
     *
     * Empieza en 0.85 —indistinguible del original a simple vista— y solo baja
     * si hace falta. Por debajo de 0.5 los bordes del texto se ensucian y una
     * captura deja de leerse, así que ahí se para: vale más mandarla algo
     * grande que ilegible.
     */
    let blob: Blob | null = null;
    for (const calidad of [0.85, 0.7, 0.55]) {
      blob = await aBlob(lienzo, calidad);
      if (blob && blob.size <= OBJETIVO_BYTES) break;
    }

    if (!blob) return archivo;

    // Si el resultado no es más pequeño, no se gana nada cambiándolo.
    if (blob.size >= archivo.size) return archivo;

    const nombre = archivo.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg", lastModified: Date.now() });
  } catch {
    return archivo;
  }
}

/** El mapa de bits de la imagen, por la vía que admita el navegador. */
async function crearBitmap(archivo: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(archivo);
  }

  // Safari antiguo: se pasa por un `<img>` y una dirección temporal.
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolver(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("no se pudo leer la imagen"));
    };
    img.src = url;
  });
}

/** `toBlob` como promesa. */
function aBlob(lienzo: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolver) => {
    lienzo.toBlob((b) => resolver(b), "image/jpeg", calidad);
  });
}

/** «2.4 MB», para decirle a alguien cuánto pesaba y cuánto pesa. */
export function peso(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
