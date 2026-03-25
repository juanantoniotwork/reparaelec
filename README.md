# Reparaelec — Asistente IA para Técnicos de Electrodomésticos

Aplicación web RAG (Retrieval-Augmented Generation) que permite a técnicos de reparación consultar manuales técnicos de electrodomésticos mediante lenguaje natural. Los administradores suben los manuales en PDF y la IA responde con citas exactas del documento.

![Dark mode dashboard](https://img.shields.io/badge/stack-Laravel%2011%20%2B%20Next.js-blue)
![Embeddings](https://img.shields.io/badge/embeddings-Ollama%20nomic--embed--text-purple)
![IA](https://img.shields.io/badge/IA-Claude%20Haiku%20%2F%20Sonnet-orange)

---

## Arquitectura

```
Admin sube PDF
    → Job ProcessDocument (extrae texto, genera chunks, embeddings con Ollama)
    → Vectores guardados en PostgreSQL + pgvector

Técnico escribe pregunta
    → Embedding de la pregunta (Ollama)
    → Búsqueda caché semántica (threshold configurable)
    → Si miss: búsqueda vectorial en pgvector filtrando por categoría
    → Detección automática de categoría (Claude Haiku)
    → RAG multi-nivel: resúmenes de documentos + chunks específicos
    → Streaming SSE con Claude → respuesta con citas [Fuente N]
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Laravel 11 (PHP 8.2) + Sanctum |
| Frontend | Next.js 14 + Tailwind CSS |
| Base de datos | PostgreSQL 17 + pgvector |
| IA respuestas | Claude API (Haiku por defecto, Sonnet opcional) |
| IA embeddings | Ollama local — nomic-embed-text (768 dims) |
| Colas | Redis + Laravel Queue Worker |
| Infraestructura | Docker Compose |

---

## Funcionalidades implementadas

### Panel Técnico
- Chat con streaming de respuestas (SSE)
- Citas de fuentes colapsables con preview del chunk
- Filtro por categoría de electrodoméstico
- Detección automática de categoría si no se selecciona ninguna
- Sugerencias de preguntas frecuentes desde caché semántica
- Botón "Respuesta avanzada" con Claude Sonnet
- Feedback 👍/👎 por respuesta
- Historial de conversaciones con opción de continuar sesión
- Modo oscuro

### Panel Admin
- CRUD de usuarios (roles: admin / técnico)
- CRUD de categorías
- Subida y procesamiento de documentos PDF/Word
- Dashboard con KPIs en tiempo real: consultas, satisfacción, cache hit rate, coste estimado en €
- Página de interacciones con filtros y exportar CSV
- Página de configuración del sistema (parámetros RAG desde BD)
- Modo oscuro

### Motor RAG
- Chunking configurable con overlap
- Embeddings locales con Ollama (sin coste por API)
- Caché semántica con similitud coseno configurable
- RAG multi-nivel: resúmenes de documentos + chunks específicos
- Filtrado por categoría en búsqueda vectorial

---

## Requisitos previos

- Docker Desktop
- Ollama instalado localmente con el modelo `nomic-embed-text`
- Cuenta en Anthropic con API key

```bash
ollama pull nomic-embed-text
```

---

## Instalación y arranque

```bash
# Clonar el repositorio
git clone https://github.com/juanantoniotwork/reparaelec.git
cd reparaelec

# Copiar y configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tu ANTHROPIC_API_KEY y credenciales de BD

# Arrancar todos los servicios
docker compose up -d

# Ejecutar migraciones y seeders
docker exec reparaelec_php php artisan migrate
docker exec reparaelec_php php artisan db:seed

# La app estará disponible en http://localhost
```

---

## Credenciales de prueba

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Admin | admin@reparaelec.com | password123 |
| Técnico | tecnico1@reparaelec.com | 123456789 |

---

## Estructura del proyecto

```
reparaelec/
├── backend/                    # Laravel 11
│   ├── app/
│   │   ├── Http/Controllers/   # AuthController, ChatController, DocumentController...
│   │   ├── Jobs/               # ProcessDocument (chunking + embeddings)
│   │   ├── Models/             # Document, Chunk, Interaction, SemanticCache...
│   │   └── Services/           # RagService, EmbeddingService
│   └── tests/Feature/          # ApiTest (9 tests)
├── frontend/                   # Next.js 14
│   └── src/app/
│       ├── admin/              # Dashboard, Usuarios, Categorías, Documentos, Interacciones, Configuración
│       └── tecnico/            # Chat, Historial
├── nginx/                      # Configuración nginx
└── docker-compose.yml
```

---

## Variables de entorno principales (backend/.env)

```env
ANTHROPIC_API_KEY=sk-ant-...
OLLAMA_BASE_URL=http://host.docker.internal:11434
DB_CONNECTION=pgsql
DB_HOST=postgres
DB_DATABASE=reparaelec
DB_USERNAME=reparaelec
DB_PASSWORD=...
QUEUE_CONNECTION=database
```

---

## Tests

```bash
docker exec reparaelec_php php artisan test --filter ApiTest
```

9 tests cubriendo: autenticación, permisos por rol, subida de documentos, acceso al chat y estadísticas.

---

## Desarrollado con

- [Laravel](https://laravel.com)
- [Next.js](https://nextjs.org)
- [pgvector](https://github.com/pgvector/pgvector)
- [Ollama](https://ollama.ai)
- [Anthropic Claude](https://anthropic.com)
