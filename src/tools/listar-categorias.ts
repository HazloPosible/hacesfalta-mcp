import { getCategorias } from "../utils/catalogs.js";

export async function execute(): Promise<string> {
  const categorias = await getCategorias();

  const lines: string[] = [
    `Categorías de voluntariado disponibles (${categorias.length}):`,
    "",
  ];

  for (const cat of categorias.sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    lines.push(`- **${cat.nombre.trim()}** (${cat.total} oportunidades)`);
  }

  return lines.join("\n");
}
