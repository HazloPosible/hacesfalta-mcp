import { getProvincias } from "../utils/catalogs.js";

export async function execute(): Promise<string> {
  const provincias = await getProvincias();

  const lines: string[] = [
    `Provincias con oportunidades de voluntariado (${provincias.length}):`,
    "",
  ];

  for (const prov of provincias.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    lines.push(`- **${prov.nombre}** (${prov.total} oportunidades)`);
  }

  return lines.join("\n");
}
