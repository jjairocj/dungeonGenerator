# DNDTiles — Arquitectura de Sistema V1.0
*Renderer: **solo PixiJS 2D top-down** — Three.js descartado (TV horizontal como mesa de juego)*
*Stack self-hosted · Auth propia · Sin costos de BaaS*

---

## 1. Visión y Escala

| Horizonte | Usuarios | Features |
|-----------|---------|---------|
| **V1.0 MVP** | 1–500 usuarios | Auth propia, cloud save, map editor completo |
| **V2.0** | 1.000–10.000 | Multiplayer realtime, assets custom, export avanzado |
| **V3.0** | 10.000+ | Escala horizontal, CDN, self-host completo |

---

## 2. Stack Tecnológico

### Frontend — `/apps/web`
| Capa | Tech |
|------|------|
| Framework | React 18 + Vite |
| Estado global | Zustand | Ya en POC ✅ |
| Renderer 2D | **PixiJS 8** (único renderer) | Top-down perfecto para TV mesa |
| HTTP client | axios / fetch nativo |
| Auth state | JWT en localStorage + Zustand |
| Audio | Howler.js |
| Animaciones | GSAP |
| Estilo | Vanilla CSS (dark gold theme) |

### Backend — `/apps/api`
| Capa | Tech | Razón |
|------|------|-------|
| Runtime | **Node.js + Express** | Simple, conocido, rápido de implementar |
| ORM | **Prisma** | Ya familiar del proyecto Nexo |
| Base de datos | **Neon (PostgreSQL)** | Free tier generoso, ya conocido |
| Auth | **JWT propio** (jsonwebtoken + bcrypt) | Sin dependencia de terceros |
| Validación | **Zod** | Schemas para endpoints |
| File storage | **Local en V1** → Cloudflare R2 en V2 | Sin costo inicial |

### Infraestructura
| Servicio | Para qué | Costo |
|---------|---------|-------|
| **Neon** | PostgreSQL managed | Free (512 MB, 1 branch) |
| **Render / Railway** | Host del backend API | Free tier (750h/mes) |
| **Vercel** | Frontend | Free |
| **Cloudflare R2** | Assets en V2+ | Free (10 GB/mes) |

> **Costo en V1.0: $0/mes** ✅

---

## 3. Arquitectura General

```
┌────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                           │
│                                                                │
│  ┌──────────────────┐           ┌──────────────────────────┐  │
│  │   DM Panel Tab   │           │  Player View Tab (TV)    │  │
│  │  - PixiJS Board  │  shared   │  React + canvas only     │  │
│  │  (2D top-down)   │  state    │  FOW overlay             │  │
│  └────────┬─────────┘           └──────────────────────────┘  │
│           │ REST API (JWT)                                     │
└───────────┼────────────────────────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────────────────────────┐
│                    BACKEND (Render/Railway)                    │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                Node.js + Express                        │  │
│  │                                                         │  │
│  │  POST /auth/register   POST /auth/login                 │  │
│  │  GET  /maps            POST /maps                       │  │
│  │  GET  /maps/:id        PUT  /maps/:id                   │  │
│  │  DELETE /maps/:id                                       │  │
│  │  GET  /campaigns       POST /campaigns                  │  │
│  └────────────────┬────────────────────────────────────────┘  │
│                   │ Prisma Client                              │
└───────────────────┼────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────────┐
│                    Neon PostgreSQL                             │
│  users · campaigns · maps · assets · sessions (V2)            │
└────────────────────────────────────────────────────────────────┘
```

---

## 4. Auth — JWT Propio

### Flujo completo

```
Register:
  POST /auth/register { email, password, username }
  → hash password con bcrypt (cost 12)
  → crear user en DB
  → devolver { accessToken, refreshToken }

Login:
  POST /auth/login { email, password }
  → buscar user por email
  → bcrypt.compare(password, hash)
  → si ok: generar JWT
  → devolver { accessToken (15min), refreshToken (7d) }

Request autenticado:
  Authorization: Bearer <accessToken>
  → middleware verifica JWT con secret
  → inyecta req.user = { id, email }

Refresh:
  POST /auth/refresh { refreshToken }
  → verificar refresh token (guardado en DB)
  → emitir nuevo accessToken

Logout:
  POST /auth/logout
  → invalidar refreshToken en DB
```

### Tokens
```js
// accessToken: corto, sin persistencia en DB
jwt.sign({ sub: user.id, email }, JWT_SECRET, { expiresIn: "15m" })

// refreshToken: largo, guardado en tabla refresh_tokens
jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, REFRESH_SECRET, { expiresIn: "7d" })
```

---

## 5. Schema de Base de Datos (Prisma)

```prisma
// schema.prisma

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  username     String   @unique
  passwordHash String
  displayName  String?
  avatarUrl    String?
  plan         String   @default("free") // "free" | "pro"
  createdAt    DateTime @default(now())

  campaigns    Campaign[]
  maps         Map[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Campaign {
  id          String   @id @default(cuid())
  ownerId     String
  name        String
  description String?
  coverUrl    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  owner User  @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  maps  Map[]
}

model Map {
  id           String   @id @default(cuid())
  ownerId      String
  campaignId   String?
  name         String
  thumbnailUrl String?

  // Todo el estado del mapa como JSON
  // { width, height, tiles, tokens, effects, fogOfWar, lights, notes }
  data         Json     @default("{}")

  // Metadata separada para queries rápidas
  width        Int      @default(30)
  height       Int      @default(30)
  biome        String   @default("plains")
  isPublic     Boolean  @default(false)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  owner    User      @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  campaign Campaign? @relation(fields: [campaignId], references: [id])
}

model Asset {
  id          String   @id @default(cuid())
  ownerId     String
  name        String
  type        String   // "texture" | "audio" | "token_avatar"
  storagePath String
  sizeBytes   Int?
  createdAt   DateTime @default(now())
}
```

---

## 6. API Endpoints

```
AUTH
  POST   /api/auth/register        { email, password, username }
  POST   /api/auth/login           { email, password }
  POST   /api/auth/refresh         { refreshToken }
  POST   /api/auth/logout          🔒

CAMPAIGNS
  GET    /api/campaigns            🔒 — mis campañas
  POST   /api/campaigns            🔒 { name, description }
  DELETE /api/campaigns/:id        🔒

MAPS
  GET    /api/maps                 🔒 — mis mapas (paginado)
  POST   /api/maps                 🔒 { name, campaignId?, width, height, biome }
  GET    /api/maps/:id             🔒 (o público si isPublic)
  PUT    /api/maps/:id             🔒 { data, name, biome, ... }
  DELETE /api/maps/:id             🔒
  GET    /api/maps/:id/share       🔒 — generar URL pública temporal

🔒 = requiere Bearer token
```

---

## 7. Estructura del Monorepo

```
dungeonGenerator/
├── apps/
│   ├── web/                  ← Frontend React/Vite (actual /src)
│   │   ├── src/
│   │   │   ├── components/   ← DMPanel, etc.
│   │   │   ├── renderers/    ← PixiBoard, ThreeBoard
│   │   │   ├── store/        ← Zustand (boardStore + authStore)
│   │   │   ├── services/     ← api.js (HTTP client)
│   │   │   └── pages/        ← Login, Register, Dashboard, Editor
│   │   └── package.json
│   │
│   └── api/                  ← Backend Node.js/Express
│       ├── src/
│       │   ├── routes/       ← auth.js, maps.js, campaigns.js
│       │   ├── middleware/   ← auth.js (JWT verify)
│       │   ├── prisma/       ← schema.prisma
│       │   └── index.js
│       └── package.json
│
├── epics.md
├── architecture.md
└── README.md
```

---

## 8. Persistencia — Estrategia Local-First

```
Editar mapa (sin auth):
  Zustand (RAM) ←→ localStorage (auto-save cada 30s)

Editar mapa (con auth):
  Zustand (RAM) ←→ localStorage (cache offline)
                ←→ PUT /api/maps/:id (auto-save cada 30s, debounced)

Abrir mapa:
  1. GET /api/maps/:id (si hay auth + internet)
  2. fallback a localStorage si offline
  3. Al reconectar → PUT sync
```

---

## 9. Multiplayer en V2 (WebSockets)

Cuando lleguemos a V2, agregamos **Socket.io** al backend:

```
socket.join(`session:${inviteCode}`)

// DM emite:
socket.emit("tile_update", { x, y, tile })
socket.emit("token_move", { tokenId, x, y })
socket.emit("fow_reveal", { x, y })

// Servidor hace broadcast a todos en la sala
io.to(`session:${inviteCode}`).emit("tile_update", data)
```

No es necesario reescribir nada — Socket.io se agrega como middleware en el mismo servidor Express.

---

## 10. Variables de Entorno

```bash
# apps/api/.env
DATABASE_URL="postgresql://..."   # Neon connection string
JWT_SECRET="..."                   # secret para access tokens
REFRESH_SECRET="..."               # secret para refresh tokens
PORT=3001
CORS_ORIGIN="http://localhost:5173" # en prod: https://dungeongenerator.vercel.app

# apps/web/.env
VITE_API_URL="http://localhost:3001"
```

---

## 11. Decisiones — Resumen

| Decisión | Elegido | Descartado | Razón |
|---------|---------|-----------|-------|
| Auth | **JWT propio (bcrypt + jsonwebtoken)** | Supabase Auth | Sin costo, control total |
| Base de datos | **Neon PostgreSQL + Prisma** | Supabase, MongoDB | Ya conocido, free, open |
| Backend | **Node.js + Express** | Supabase Edge, Next.js API | Simple, conocido |
| Realtime V2 | **Socket.io** | Supabase Realtime | Sin vendor lock-in |
| Storage V1 | **Local filesystem** | Supabase Storage | Costo $0 |
| Storage V2+ | **Cloudflare R2** | AWS S3 | Free 10 GB, barato a escala |
| Frontend deploy | **Vercel** | Netlify | Edge CDN, preview por PR |
| Backend deploy | **Render / Railway** | Heroku | Free tier activo |

---

## 12. Roadmap de Implementación

```
Wave 0 (hecho ✅): POC PixiJS 2D + Zustand (Three.js removido)
Wave 1: Estructura monorepo + backend Express + Prisma + Neon
Wave 2: Auth (register/login/JWT) + páginas Login/Register/Dashboard
Wave 3: Cloud save (PUT /maps/:id) + load de mapas
Wave 4: Tokens + Initiative tracker en el editor
Wave 5: Fog of War + Player View URL
Wave 6: Name generators
Wave 7: Audio system
Wave 8: Export PNG/JSON
Wave V2: Multiplayer con Socket.io
```

---

*Última actualización: Marzo 2026 — V1.0 Self-Hosted*
