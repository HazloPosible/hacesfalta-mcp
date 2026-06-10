# HaceFalta MCP Server

Servidor MCP (Model Context Protocol) que expone el catálogo de oportunidades de voluntariado de [hacesfalta.org](https://www.hacesfalta.org) — la principal plataforma de voluntariado en España — para que agentes de IA puedan ayudar a las personas a encontrar oportunidades de voluntariado mediante conversación natural.

## Herramientas disponibles

| Herramienta | Descripción |
|---|---|
| `buscar_oportunidades` | Busca oportunidades por provincia, categoría, frecuencia, horario, edad, fin de semana, en familia o en grupo. Devuelve resultados paginados con enlaces de inscripción. |
| `detalle_oportunidad` | Obtiene el detalle completo de una oportunidad: descripción, perfil buscado, fechas, horarios, competencias, ODS y enlace de inscripción. |
| `listar_categorias` | Lista todas las categorías de voluntariado disponibles con el número de oportunidades en cada una. |
| `listar_provincias` | Lista todas las provincias españolas con oportunidades de voluntariado. |

## Conexión remota (Claude, ChatGPT, Gemini)

URL del servidor MCP:

```
https://hacesfalta-mcp.hacesfalta.workers.dev/mcp
```

### Claude (web y móvil)

1. Ve a **Settings** → **Connectors** → **Add MCP Server**
2. Introduce la URL: `https://hacesfalta-mcp.hacesfalta.workers.dev/mcp`

### ChatGPT

1. Ve a **Settings** → **Developer Mode** → **Add MCP Server**
2. Introduce la URL: `https://hacesfalta-mcp.hacesfalta.workers.dev/mcp`

## Conexión local (Claude Desktop)

Añade a tu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "hacesfalta": {
      "command": "node",
      "args": ["path/to/hacesfalta-mcp/dist/index.js"],
      "env": {
        "HACESFALTA_API_URL": "https://api.hacesfalta.org",
        "HACESFALTA_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Ejemplo de uso

Un usuario le dice a su agente de IA:

> "Quiero hacer voluntariado con personas mayores en Madrid los fines de semana"

El agente usa `buscar_oportunidades` con los filtros `provincia: "Madrid"`, `categoria: "Mayores"`, `fin_de_semana: true` y devuelve oportunidades relevantes con enlaces directos a hacesfalta.org para inscribirse.

## Sobre hacesfalta.org

[hacesfalta.org](https://www.hacesfalta.org) es la plataforma de referencia de voluntariado en España, gestionada por la [Fundación HazloPosible](https://www.hazloposible.org). Conecta a personas con ganas de ayudar con organizaciones que necesitan voluntarios.

## Licencia

MIT
