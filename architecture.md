# DNDTiles — Arquitectura de Sistema
*Decisiones técnicas, base de datos, escalamiento y plataforma*

---

## 1. Visión y Contexto de Escala

Antes de elegir tecnologías, definimos los escenarios de uso:

| Horizonte | Usuarios concurrentes | Tamaño de mapa típico | Features activos |
|-----------|----------------------|----------------------|------------------|
| **MVP / Alpha** | 1–50 DMs (uso personal + amigos) | 30×30 tiles, ~5 tokens | Offline-first, sin multiplayer |
| **V1.0 Público** | 100–1.000 usuarios registrados | 50×50, ~20 tokens, assets | Auth + cloud save |
| **V2.0 Escala** | 10.000+ usuarios, salas multijugador | 100×100, capas, audio custom | Realtime WebSocket, CDN |

> **Decisión clave:** Diseñar para V1.0 desde el inicio, pero que el path a V2.0 no requiera reescribir nada.

---

## 2. Stack Tecnológico Definitivo

### Frontend
| Capa | Tecnología | Decisión |
|------|-----------|----------|
| Framework | **React 18 + Vite** | Ya en POC ✅ |
| Estado global | **Zustand** | Ya en POC ✅ |
| Renderer 2D | **PixiJS 8** | Ya en POC ✅ |
| Renderer 3D | **Three.js** | Ya en POC ✅ |
| Auth UI | **Supabase Auth SDK** | Magic link + Discord OAuth |
| HTTP client | **@supabase/supabase-js** | Todo el data layer |
| Audio | **Howler.js** | Ya en plan |
| Animaciones | **GSAP** | Tokens, transiciones |

### Backend / BaaS
| Capa | Tecnología | Explicación |
|------|-----------|-------------|
| **Base de datos** | **Supabase (PostgreSQL)** | Ver sección 3 |
| **Auth** | **Supabase Auth** | JWT, Row Level Security |
| **Realtime** | **Supabase Realtime** | Channels para multiplayer |
| **Storage** | **Supabase Storage** | Custom textures, audio, thumbnails |
| **Edge Functions** | **Supabase Edge Functions** (Deno) | Lógica server-side si se necesita |

### Infraestructura
| Servicio | Para qué |
|---------|---------|
| **Vercel** | Deploy del frontend (CDN global, preview por PR) |
| **Supabase Cloud** | Managed Postgres + Auth + Realtime + Storage |
| **Cloudflare R2** (V2+) | CDN de assets de alta demanda si Storage de Supabase no escala |

---

## 3. Base de Datos — PostgreSQL (Supabase)

### ¿Por qué PostgreSQL y no MongoDB / Firebase?

| Criterio | PostgreSQL + JSONB | MongoDB | Firebase Firestore |
|----------|-------------------|---------|--------------------|
| Datos relacionales (users, campaigns) | 🟢 Excelente | 🟡 Manual | 🟡 Manual |
| Map data (JSON flexible) | 🟢 JSONB nativo, indexable | 🟢 Natural | 🟡 Limitado |
| Realtime subscriptions | 🟢 Supabase Realtime (WebSocket) | 🟡 Change Streams (más complejo) | 🟢 Nativo |
| Auth nativa + RLS | 🟢 Supabase Auth + RLS | 🔴 Requiere stack separado | 🟢 Firebase Auth |
| File storage | 🟢 Supabase Storage | 🔴 Externo | 🟡 Firebase Storage |
| SQL queries avanzadas | 🟢 Full SQL | 🔴 No SQL | 🔴 No SQL |
| Open source / portabilidad | 🟢 Postgres estándar | 🟡 Vendor lock | 🔴 Google lock-in |
| Costo escala | 🟢 Predecible | 🟡 Variable | 🔴 Costoso a escala |

**Conclusión: Supabase + PostgreSQL + JSONB.**
Obtenemos lo mejor de relacional (users, campaigns) + documental (map data) en una sola base de datos, con Auth, Realtime y Storage incluidos.

---

### Schema de Base de Datos

```sql
-- ─────────────────────────────────────
-- USERS (manejado por Supabase Auth)
-- ─────────────────────────────────────
-- auth.users existe automáticamente, extendemos con perfil:

CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'free', -- 'free' | 'pro'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- CAMPAIGNS
-- ─────────────────────────────────────
CREATE TABLE public.campaigns (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,        -- thumbnail de la campaña
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- MAPS (el core del producto)
-- ─────────────────────────────────────
CREATE TABLE public.maps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  thumbnail_url TEXT,

  -- Map data como JSONB (flexible, indexable)
  data          JSONB NOT NULL DEFAULT '{}',
  /*
    data schema:
    {
      "width": 30,
      "height": 30,
      "tileSize": 64,
      "renderer": "2d",
      "tiles": {
        "x,y": { "type": "grass", "variant": 2, "layer": "base" }
      },
      "tokens": [
        { "id": "uuid", "x": 5, "y": 3, "name": "Gandalf", "hp": 80, "maxHp": 100, "color": "#4c9eff" }
      ],
      "effects": {
        "rain": false, "clouds": true, "cloudSpeed": 0.5, "windIntensity": 0.3
      },
      "fogOfWar": {
        "enabled": true,
        "revealed": ["5,3", "5,4", "6,3"]
      },
      "lights": [],
      "notes": "",
      "biome": "plains"
    }
  */

  -- Metadata separada para queries rápidas sin parsear JSONB:
  width         INT NOT NULL DEFAULT 30,
  height        INT NOT NULL DEFAULT 30,
  biome         TEXT NOT NULL DEFAULT 'plains',

  is_public     BOOLEAN DEFAULT FALSE,   -- share via URL
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index para búsqueda rápida:
CREATE INDEX maps_owner_id_idx ON public.maps(owner_id);
CREATE INDEX maps_campaign_id_idx ON public.maps(campaign_id);
CREATE INDEX maps_data_gin ON public.maps USING GIN(data); -- búsqueda dentro del JSON

-- ─────────────────────────────────────
-- ASSETS (texturas/audio custom del usuario)
-- ─────────────────────────────────────
CREATE TABLE public.assets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL,   -- 'texture' | 'audio' | 'token_avatar'
  storage_path TEXT NOT NULL,   -- Supabase Storage bucket path
  size_bytes   BIGINT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────
-- SESSIONS (multiplayer, V2)
-- ─────────────────────────────────────
CREATE TABLE public.sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  map_id      UUID NOT NULL REFERENCES public.maps(id) ON DELETE CASCADE,
  host_id     UUID NOT NULL REFERENCES public.profiles(id),
  invite_code TEXT UNIQUE NOT NULL,  -- 6-char code (ej: "XKCD42")
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ DEFAULT NOW() + INTERVAL '12 hours'
);

-- ─────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────
ALTER TABLE public.maps ENABLE ROW LEVEL SECURITY;

-- Solo el owner puede ver/editar sus mapas (excepto públicos):
CREATE POLICY "maps_owner_policy" ON public.maps
  USING (owner_id = auth.uid() OR is_public = TRUE);

CREATE POLICY "maps_insert_policy" ON public.maps
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "maps_update_policy" ON public.maps
  FOR UPDATE USING (owner_id = auth.uid());

-- (Aplicar RLS similar a campaigns, assets, sessions)
```

---

## 4. Modelo de Datos del Mapa (JSONB)

El campo `data` en la tabla `maps` almacena todo el estado del mapa como un documento JSON. Esto es clave porque:

- **Flexible**: podemos agregar campos sin ALTER TABLE
- **Atómico**: guardamos el mapa completo en un PUT, sin joins
- **Indexable**: con GIN index podemos hacer queries dentro del JSON
- **Serializable**: el mismo objeto se usa en Zustand store del frontend

```
MapData {
  width, height, tileSize
  renderer: "2d" | "3d"
  biome: string
  tiles: { "x,y": TileData }
  tokens: Token[]
  effects: EffectsConfig
  fogOfWar: { enabled, revealed: string[] }
  lights: Light[]
  notes: string (markdown)
  initiativeOrder: CombatantEntry[]
  layers: LayerConfig[]   // V2
}
```

---

## 5. Autenticación

### Flujo de Auth

```
Usuario llega → Login con:
  ├── Magic Link (email) → sin contraseña, más simple
  ├── Discord OAuth → ideal para comunidad D&D/gaming
  └── Google OAuth → alternativa general

→ Supabase emite JWT (HS256)
→ Frontend guarda JWT en localStorage (via Supabase SDK)
→ Todas las queries a Supabase llevan el JWT → RLS automático
```

### Planes de acceso (futuro monetización)

| Plan | Límite mapas | Mapa máximo | Assets storage | Multiplayer |
|------|-------------|-------------|----------------|-------------|
| **Free** | 5 mapas | 30×30 | 100 MB | ❌ |
| **Pro** ($5/mes) | Ilimitados | 100×100 | 5 GB | ✅ |
| **Team** ($15/mes) | Ilimitados | 200×200 | 20 GB | ✅ hasta 8 jugadores |

> Estos límites se verifican en Edge Functions (server-side), no en el frontend.

---

## 6. Persistencia — Estrategia Offline-First

Para el MVP, la estrategia es **local-first con sync opcional**:

```
Sesión de edición:
  Zustand (RAM) ←→ Auto-save cada 30seg ←→ Supabase (cloud)
                ←→ localStorage (fallback offline)

Al abrir la app:
  1. Cargar desde Supabase (si hay auth + internet)
  2. Fallback a localStorage (sin internet o sin auth)
  3. Al recuperar internet → sync con Supabase
```

**¿Por qué no guardar tile por tile en la DB?**
Guardar `tiles` como filas individuales (30×30 = 900 filas) sería lento y costoso. El JSONB blob es más eficiente: un solo UPDATE guarda un mapa completo. Para mapas 100×100 = ~10.000 tiles, el JSON comprimido es ~50–200 KB — perfectamente manejable.

---

## 7. Assets y Storage

| Tipo | Bucket | Límite size | Visibilidad |
|------|--------|-------------|-------------|
| Texturas custom | `user-assets/textures/` | 2 MB/archivo | Private (owner only) |
| Audio custom | `user-assets/audio/` | 10 MB/archivo | Private |
| Token avatars | `user-assets/tokens/` | 512 KB/archivo | Private |
| Map thumbnails | `map-thumbnails/` | 1 MB | Public (para share) |
| Assets comunitarios | `community-assets/` | N/A | Public |

**CDN:** Supabase Storage usa CloudFront internamente, por lo que los assets ya tienen CDN global.

---

## 8. Multiplayer (V2) — Realtime Architecture

```
DM (host)                  Supabase Realtime              Jugadores (clients)
   │                            │                              │
   │  JOIN channel              │                              │
   │  "session:{invite_code}"   │                              │
   │─────────────────────────▶ │                              │
   │                            │                              │
   │  BROADCAST: map_patch      │   ── forward ──▶            │
   │  { type: "tile_update",    │                              │
   │    x, y, tile }            │                              │
   │─────────────────────────▶ │─────────────────────────────▶│
   │                            │                              │
   │  BROADCAST: token_move     │                              │
   │─────────────────────────▶ │─────────────────────────────▶│
   │                            │                              │
   │  PRESENCE: online users    │                              │
   │─────────────────────────▶ │ ←───────────────────────────│
```

**Supabase Realtime** maneja WebSockets nativamente con `BROADCAST` (peer-to-peer) y `PRESENCE` (usuarios online). No necesitamos correr nuestro propio server de sockets.

**Conflictos:** Para V2, usamos el approach "DM is the truth" — solo el host puede modificar el mapa; los jugadores solo mueven sus propios tokens.

---

## 9. Escalamiento — Consideraciones

### Cuellos de botella potenciales y soluciones

| Problema | Cuándo ocurre | Solución |
|---------|--------------|---------|
| Mapas muy grandes (100×100) | V2+ | Chunk-based JSONB (dividir en sectores), cargar tiles visibles only |
| Muchas sessiones realtime | >500 sesiones concurrentes | Supabase escala Realtime horizontalmente (plan Pro) |
| Storage lleno | Muchos assets custom | Migrar a Cloudflare R2 (mucho más barato a escala: $0.015/GB vs $0.09/GB) |
| Latencia en saves | Mapa grande + conexión lenta | Differential saves (guardar solo el PATCH del mapa, no el JSON completo) |
| Auth tokens expirados | Sesión larga (6h+ de juego) | Supabase auto-refresh, refresh token silencioso |

### Costo estimado por fase

| Fase | Usuarios | Supabase plan | Costo/mes |
|------|---------|--------------|-----------|
| Alpha | <50 | Free tier | $0 |
| V1.0 Público | <1.000 | Supabase Pro | $25 |
| V2.0 | >10.000 | Supabase Team | $599 (o self-host en Railway) |

> A >10k usuarios activos conviene evaluar **self-hosting Supabase** en Railway/Fly.io (~$50/mes con mucho más control).

---

## 10. Diagrama de Arquitectura Completa

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Vercel CDN)                       │
│                                                                      │
│  ┌───────────────────┐          ┌────────────────────────────────┐  │
│  │   DM Panel Tab    │          │     Player View Tab (TV)       │  │
│  │  (React + Zustand)│ ──sync── │   (React, canvas only)         │  │
│  │  - PixiJS Board   │          │   - PixiJS Board (read-only)   │  │
│  │  - Three.js Board │          │   - Fog of War overlay         │  │
│  │  - Controls Panel │          │                                │  │
│  └────────┬──────────┘          └────────────────────────────────┘  │
│           │ @supabase/supabase-js                                    │
└───────────┼──────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     SUPABASE (BaaS)                                   │
│                                                                      │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────┐  ┌──────────┐  │
│  │  Auth       │  │  PostgreSQL │  │   Realtime    │  │ Storage  │  │
│  │  JWT + RLS  │  │  + JSONB    │  │   WebSockets  │  │  CDN     │  │
│  │  OAuth      │  │  maps table │  │   Broadcast   │  │Textures  │  │
│  │  Magic Link │  │  users      │  │   Presence    │  │Audio     │  │
│  └────────────┘  └─────────────┘  └───────────────┘  └──────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 11. Decisiones de Arquitectura — Resumen

| Decisión | Elegido | Descartado | Razón |
|---------|--------|-----------|-------|
| Base de datos | **PostgreSQL + JSONB** | MongoDB, Firebase | Relacional + documental, open source |
| BaaS | **Supabase** | Firebase, Appwrite | Postgres real, RLS, Realtime, Storage en uno |
| Map data format | **JSONB blob** | Filas por tile | Performance, atomicidad, flexibilidad |
| Auth | **Supabase Auth** (Discord OAuth) | Auth0, Firebase Auth | Integrado con DB + RLS |
| Realtime | **Supabase Realtime** | Socket.io propio | Sin server adicional |
| Frontend deploy | **Vercel** | Netlify, AWS S3 | Preview por PR, Edge network, CI/CD |
| Asset storage | **Supabase Storage** → luego **R2** | AWS S3 | Simple ahora, R2 más barato a escala |
| Primeros saves | **Local-first** (localStorage) | Solo cloud | Funciona offline, sin auth requerida para empezar |

---

## 12. Orden de Implementación (Arquitectura)

```
Fase 0 (ahora):     POC local (Zustand + localStorage) ✅
Fase 1 (Wave 1-2):  Integrar Supabase Auth + cloud save de mapas
Fase 2 (Wave 3):    Supabase Storage para thumbnails
Fase 3 (V2):        Supabase Realtime para multiplayer
Fase 4 (escala):    Evaluar self-host Supabase o migración parcial a R2
```

---

*Última actualización: Marzo 2026*
