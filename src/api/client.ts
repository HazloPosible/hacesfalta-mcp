import { getAccessToken } from "./auth.js";

export interface HacesfaltaConfig {
  apiUrl: string;
  apiKey: string;
}

let config: HacesfaltaConfig | null = null;

export function initClient(cfg: HacesfaltaConfig) {
  config = cfg;
}

function getConfig(): HacesfaltaConfig {
  if (!config) throw new Error("API client not initialized. Call initClient() first.");
  return config;
}

async function apiFetch<T>(path: string): Promise<T> {
  const cfg = getConfig();
  const token = await getAccessToken(cfg.apiUrl, cfg.apiKey);

  const res = await fetch(`${cfg.apiUrl}${path}`, {
    headers: {
      "X-Api-Key": cfg.apiKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`API ${path}: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export interface OpportunityListItem {
  idOportunidad: number;
  titulo: string;
  descripcion: string;
  urlSeo: string;
  provincia: string;
  localidad?: string;
  categoria: string;
  categoriaTipo: string;
  nombreOng: string;
  fechaFin: string;
  urgente?: boolean;
  ods: { idOds: number; nombre: string }[];
}

export interface FilterOption {
  nombre: string;
  valor: number;
  total: number;
}

export interface OpportunitiesResponse {
  items: OpportunityListItem[];
  total: number;
  page: number;
  pageSize: number;
  filtros: {
    categorias: FilterOption[];
    paises: FilterOption[];
    provincias: FilterOption[];
    localidades: FilterOption[];
    frecuencias: FilterOption[];
    dias: FilterOption[];
    edades: FilterOption[];
    horario: FilterOption[];
    ods: FilterOption[];
    finSemana: FilterOption[];
    grupo: FilterOption[];
    familia: FilterOption[];
  };
}

export interface OpportunityDetail {
  idOportunidad: number;
  titulo: string;
  descripcion: string;
  perfil: string;
  urlSeo: string;
  provincia: string;
  localidad: string;
  pais: string;
  fechaInicio: string;
  fechaFin: string;
  fechaFinActividad: string;
  numeroVacantes: number;
  urgente: boolean;
  frecuencia: string;
  categoriaTipo: string;
  dedicacion: {
    lunes: boolean;
    martes: boolean;
    miercoles: boolean;
    jueves: boolean;
    viernes: boolean;
    sabado: boolean;
    domingo: boolean;
    soloFinesDeSemana: boolean;
    mananas: boolean;
    tardes: boolean;
    enGrupo: boolean;
    enFamilia: boolean;
    textoDedicacion: string | null;
  };
  ong: {
    nombre: string;
    logo: string;
    numValoraciones: number;
    valoracion: number;
  };
  categorias: { id: number; nombre: string }[];
  subcategorias: { id: number; nombre: string }[];
  competencias: { id: number; nombre: string }[];
  ods: { idOds: number; nombre: string }[];
}

export interface SearchFilters {
  idProvincia?: number;
  idCategoria?: number;
  idFrecuencia?: number;
  idEdad?: number;
  idHorario?: number;
  finSemana?: number;
  enFamilia?: number;
  enGrupo?: number;
  page?: number;
  pageSize?: number;
}

export async function searchOpportunities(
  filters: SearchFilters
): Promise<OpportunitiesResponse> {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null) {
      params.set(key, String(val));
    }
  }
  if (!params.has("pageSize")) params.set("pageSize", "5");

  return apiFetch(`/api/v1/opportunities?${params}`);
}

export async function getOpportunityDetail(
  id: number
): Promise<OpportunityDetail> {
  return apiFetch(`/api/v1/opportunities/${id}`);
}

export async function fetchCatalogs(): Promise<OpportunitiesResponse["filtros"]> {
  const res = await searchOpportunities({ pageSize: 1 });
  return res.filtros;
}
