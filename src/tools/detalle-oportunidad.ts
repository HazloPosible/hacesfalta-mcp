import { z } from "zod";
import { getOpportunityDetail } from "../api/client.js";

export const schema = z.object({
  id: z.number().int().describe("ID de la oportunidad"),
});

export type DetalleParams = z.infer<typeof schema>;

const UTM = "utm_source=mcp&utm_medium=ai_agent";

function addUtm(url: string): string {
  return url + (url.includes("?") ? "&" : "?") + UTM;
}

function formatDays(d: {
  lunes: boolean;
  martes: boolean;
  miercoles: boolean;
  jueves: boolean;
  viernes: boolean;
  sabado: boolean;
  domingo: boolean;
}): string {
  const days = [];
  if (d.lunes) days.push("Lunes");
  if (d.martes) days.push("Martes");
  if (d.miercoles) days.push("Miércoles");
  if (d.jueves) days.push("Jueves");
  if (d.viernes) days.push("Viernes");
  if (d.sabado) days.push("Sábado");
  if (d.domingo) days.push("Domingo");
  return days.length > 0 ? days.join(", ") : "No especificado";
}

function formatDate(iso: string): string {
  if (!iso) return "No especificada";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/g, " ").trim();
}

export async function execute(params: DetalleParams): Promise<string> {
  const op = await getOpportunityDetail(params.id);

  const lines: string[] = [
    `# ${op.titulo.trim()}`,
    "",
    `**ONG**: ${op.ong.nombre}`,
    `**Ubicación**: ${op.localidad ? `${op.localidad}, ` : ""}${op.provincia}, ${op.pais}`,
    `**Modalidad**: ${op.categoriaTipo}`,
    `**Frecuencia**: ${op.frecuencia}`,
    `**Vacantes**: ${op.numeroVacantes}`,
    op.urgente ? "⚠️ **URGENTE**" : "",
    "",
    "## Descripción",
    stripHtml(op.descripcion),
    "",
    "## Perfil buscado",
    stripHtml(op.perfil),
    "",
    "## Detalles",
    `- **Fecha inicio**: ${formatDate(op.fechaInicio)}`,
    `- **Fecha fin**: ${formatDate(op.fechaFin)}`,
    `- **Días**: ${formatDays(op.dedicacion)}`,
    `- **Horario**: ${[op.dedicacion.mananas && "Mañanas", op.dedicacion.tardes && "Tardes"].filter(Boolean).join(", ") || "No especificado"}`,
    `- **Fin de semana**: ${op.dedicacion.soloFinesDeSemana ? "Sí" : "No"}`,
    `- **En grupo**: ${op.dedicacion.enGrupo ? "Sí" : "No"}`,
    `- **En familia**: ${op.dedicacion.enFamilia ? "Sí" : "No"}`,
  ];

  if (op.categorias.length > 0) {
    lines.push(
      `- **Categorías**: ${op.categorias.map((c) => c.nombre).join(", ")}`
    );
  }

  if (op.subcategorias.length > 0) {
    lines.push(
      `- **Subcategorías**: ${op.subcategorias.map((c) => c.nombre).join(", ")}`
    );
  }

  if (op.competencias.length > 0) {
    lines.push(
      `- **Competencias valoradas**: ${op.competencias.map((c) => c.nombre).join(", ")}`
    );
  }

  if (op.ods.length > 0) {
    lines.push(
      `- **ODS relacionados**: ${op.ods.map((o) => o.nombre).join(", ")}`
    );
  }

  lines.push("");
  lines.push(`## Inscripción`);
  lines.push(
    `Para inscribirte en esta oportunidad, visita: ${addUtm(op.urlSeo)}`
  );

  return lines.filter((l) => l !== undefined).join("\n");
}
