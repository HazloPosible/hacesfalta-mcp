import { fetchCatalogs, type FilterOption } from "../api/client.js";

interface CatalogCache {
  categorias: FilterOption[];
  provincias: FilterOption[];
  frecuencias: FilterOption[];
  edades: FilterOption[];
  horario: FilterOption[];
  loadedAt: number;
}

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

let cache: CatalogCache | null = null;

async function ensureCache(): Promise<CatalogCache> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) {
    return cache;
  }

  const filtros = await fetchCatalogs();
  cache = {
    categorias: filtros.categorias,
    provincias: filtros.provincias,
    frecuencias: filtros.frecuencias,
    edades: filtros.edades,
    horario: filtros.horario,
    loadedAt: Date.now(),
  };
  return cache;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function findBestMatch(
  name: string,
  options: FilterOption[]
): FilterOption | undefined {
  const needle = normalize(name);
  return (
    options.find((o) => normalize(o.nombre) === needle) ??
    options.find((o) => normalize(o.nombre).includes(needle)) ??
    options.find((o) => needle.includes(normalize(o.nombre)))
  );
}

export async function resolveProvinciaId(
  name: string
): Promise<number | undefined> {
  const c = await ensureCache();
  return findBestMatch(name, c.provincias)?.valor;
}

export async function resolveCategoriaId(
  name: string
): Promise<number | undefined> {
  const c = await ensureCache();
  return findBestMatch(name, c.categorias)?.valor;
}

export async function resolveFrecuenciaId(
  name: string
): Promise<number | undefined> {
  const c = await ensureCache();
  const map: Record<string, string> = {
    puntual: "Puntual",
    continua: "Continua",
    vacaciones: "Vacaciones",
  };
  const mapped = map[normalize(name)] ?? name;
  return findBestMatch(mapped, c.frecuencias)?.valor;
}

export async function resolveEdadId(
  name: string
): Promise<number | undefined> {
  const c = await ensureCache();
  const map: Record<string, string> = {
    ninos: "Niños",
    adolescentes: "Adolescentes",
    adultos: "Adultos",
    mayores: "Mayores",
  };
  const mapped = map[normalize(name)] ?? name;
  return findBestMatch(mapped, c.edades)?.valor;
}

export async function resolveHorarioId(
  name: string
): Promise<number | undefined> {
  const c = await ensureCache();
  const map: Record<string, string> = {
    mananas: "Mañanas",
    tardes: "Tardes",
  };
  const mapped = map[normalize(name)] ?? name;
  return findBestMatch(mapped, c.horario)?.valor;
}

export async function getCategorias(): Promise<FilterOption[]> {
  const c = await ensureCache();
  return c.categorias;
}

export async function getProvincias(): Promise<FilterOption[]> {
  const c = await ensureCache();
  return c.provincias;
}
