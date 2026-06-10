import { z } from "zod";
import { searchOpportunities, type SearchFilters } from "../api/client.js";
import {
  resolveProvinciaId,
  resolveCategoriaId,
  resolveFrecuenciaId,
  resolveEdadId,
  resolveHorarioId,
} from "../utils/catalogs.js";

export const schema = z.object({
  provincia: z
    .string()
    .optional()
    .describe("Nombre de la provincia (ej: Madrid, Barcelona, Valencia)"),
  categoria: z
    .string()
    .optional()
    .describe(
      "Tipo de causa o colectivo (ej: Mayores, Infancia, Medio Ambiente, Personas con discapacidad)"
    ),
  frecuencia: z
    .enum(["puntual", "continua", "vacaciones"])
    .optional()
    .describe("Tipo de compromiso temporal"),
  fin_de_semana: z
    .boolean()
    .optional()
    .describe("Solo oportunidades disponibles en fin de semana"),
  en_familia: z
    .boolean()
    .optional()
    .describe("Oportunidades aptas para hacer en familia"),
  en_grupo: z
    .boolean()
    .optional()
    .describe("Oportunidades para hacer en grupo"),
  edad: z
    .enum(["ninos", "adolescentes", "adultos", "mayores"])
    .optional()
    .describe("Rango de edad del voluntario"),
  horario: z
    .enum(["mananas", "tardes"])
    .optional()
    .describe("Preferencia de horario"),
  pagina: z.number().int().min(1).default(1).describe("Número de página"),
});

export type BuscarParams = z.infer<typeof schema>;

const UTM = "utm_source=mcp&utm_medium=ai_agent";

function addUtm(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + UTM;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

export async function execute(params: BuscarParams): Promise<string> {
  const filters: SearchFilters = {
    page: params.pagina,
    pageSize: 5,
  };

  if (params.provincia) {
    const id = await resolveProvinciaId(params.provincia);
    if (id === undefined) {
      return `No se encontró la provincia "${params.provincia}". Usa la herramienta listar_provincias para ver las disponibles.`;
    }
    filters.idProvincia = id;
  }

  if (params.categoria) {
    const id = await resolveCategoriaId(params.categoria);
    if (id === undefined) {
      return `No se encontró la categoría "${params.categoria}". Usa la herramienta listar_categorias para ver las disponibles.`;
    }
    filters.idCategoria = id;
  }

  if (params.frecuencia) {
    filters.idFrecuencia = await resolveFrecuenciaId(params.frecuencia);
  }

  if (params.edad) {
    filters.idEdad = await resolveEdadId(params.edad);
  }

  if (params.horario) {
    filters.idHorario = await resolveHorarioId(params.horario);
  }

  if (params.fin_de_semana) filters.finSemana = 1;
  if (params.en_familia) filters.enFamilia = 1;
  if (params.en_grupo) filters.enGrupo = 1;

  const data = await searchOpportunities(filters);

  if (data.total === 0) {
    return "No se encontraron oportunidades con esos criterios. Prueba ampliando los filtros.";
  }

  const lines: string[] = [
    `Se encontraron ${data.total} oportunidades (mostrando página ${data.page} de ${Math.ceil(data.total / 5)}):`,
    "",
  ];

  for (const op of data.items) {
    lines.push(`### ${op.titulo.trim()}`);
    lines.push(`- **ONG**: ${op.nombreOng}`);
    lines.push(`- **Ubicación**: ${op.provincia}`);
    lines.push(`- **Categoría**: ${op.categoria.trim()}`);
    lines.push(`- **Modalidad**: ${op.categoriaTipo}`);
    if (op.urgente) lines.push(`- ⚠️ **URGENTE**`);
    lines.push(`- **Descripción**: ${truncate(op.descripcion.replace(/\r?\n/g, " "), 200)}`);
    lines.push(`- **Inscripción**: ${addUtm(op.urlSeo)}`);
    lines.push(`- **ID**: ${op.idOportunidad} (usa detalle_oportunidad para más info)`);
    lines.push("");
  }

  if (data.total > data.page * 5) {
    lines.push(
      `Hay más resultados. Pide la página ${data.page + 1} para ver los siguientes.`
    );
  }

  return lines.join("\n");
}
