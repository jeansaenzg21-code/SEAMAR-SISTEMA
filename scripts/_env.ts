// =============================================================================
// Carga las variables de entorno para la ejecución CLI (fuera de Next.js).
// Lee .env.local y .env del directorio del proyecto. No sobreescribe variables
// ya definidas en el entorno (precedencia al shell / scheduler).
// =============================================================================
import fs from "fs";
import path from "path";

export function cargarEntorno(rootDir?: string): void {
  const root = rootDir ?? path.resolve(__dirname, "..");
  for (const nombre of [".env.local", ".env"]) {
    const ruta = path.join(root, nombre);
    if (!fs.existsSync(ruta)) continue;

    const contenido = fs.readFileSync(ruta, "utf8");
    for (const linea of contenido.split(/\r?\n/)) {
      const match = linea.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
      if (!match) continue;
      const clave = match[1];
      if (process.env[clave] !== undefined) continue;

      let valor = match[2].trim();
      if (
        (valor.startsWith('"') && valor.endsWith('"')) ||
        (valor.startsWith("'") && valor.endsWith("'"))
      ) {
        valor = valor.slice(1, -1);
      }
      process.env[clave] = valor;
    }
  }
}

cargarEntorno();