# DungeonGenerator

> D&D Interactive Map Editor & Live Board — designed for TV tabletop gaming

A 2D top-down map editor for Dungeon Masters. Design maps on a control tab while players see the result on a TV laid flat as a game table. Built with PixiJS 8, React 18, Express, and PostgreSQL.

---

## ✨ Features (Wave 1 — MVP)

- 🗺️ **Interactive tile board** — click & drag to paint biomes (Plains, Forest, Water, Dungeon, Lava, Snow)
- 🌊 **Animated effects** — water shaders, lava blobs, wind on grass, cloud particles, rain
- 🔐 **Auth** — register/login with JWT (access + refresh token rotation)
- 💾 **Cloud save** — maps auto-saved to PostgreSQL via REST API
- 📋 **Dashboard** — list, create, and open maps
- 👤 **Guest mode** — use the editor at `/editor-guest` without an account

---

## 🗂 Project Structure

```
dungeonGenerator/
├── src/                    # Frontend (React 18 + Vite + PixiJS + Tailwind)
│   ├── pages/              # Login, Register, Dashboard, Editor
│   ├── components/         # DMPanel (controls)
│   ├── renderers/          # PixiBoard (2D canvas)
│   ├── shaders/            # GLSL shaders (water, lava)
│   ├── store/              # Zustand stores (boardStore, authStore)
│   └── services/           # axios api.js
│
├── apps/api/               # Backend (Node.js + Express + Prisma)
│   ├── src/
│   │   ├── routes/         # auth.js, maps.js
│   │   ├── middleware/     # auth.js (JWT verify)
│   │   └── lib/            # prisma.js (singleton client)
│   └── prisma/
│       └── schema.prisma   # User, RefreshToken, Campaign, Map
│
├── epics.md                # Full user epic (13 epics, MVP → V2)
└── architecture.md         # System architecture decisions
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL (local or [neon.tech](https://neon.tech))

### 1. Clone & install

```bash
git clone https://github.com/jjairocj/dungeonGenerator.git
cd dungeonGenerator

# Frontend
npm install

# Backend
cd apps/api && npm install
```

### 2. Configure environment

```bash
# Frontend
cp .env.example .env
# Edit: VITE_API_URL=http://localhost:3001/api

# Backend
cd apps/api
cp .env.example .env
# Edit: DATABASE_URL, JWT_SECRET, REFRESH_SECRET
```

### 3. Set up database

```bash
cd apps/api
npm run db:push    # Creates tables from schema.prisma
```

### 4. Run locally

```bash
# Terminal 1 — Backend (port 3001)
cd apps/api && npm run dev

# Terminal 2 — Frontend (port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🧪 Tests

```bash
# Unit tests (backend — Jest + Supertest)
cd apps/api && npm test
# 19 tests: auth register/login/refresh/logout + maps CRUD
```

---

## 🔌 API Reference

Full docs: [`docs/api.md`](./docs/api.md)

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Create account |
| POST | `/api/auth/login`    | ❌ | Get access + refresh tokens |
| POST | `/api/auth/refresh`  | ❌ | Rotate refresh token |
| POST | `/api/auth/logout`   | ✅ | Invalidate refresh token |

### Maps
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET    | `/api/maps`        | ✅ | List my maps |
| POST   | `/api/maps`        | ✅ | Create map |
| GET    | `/api/maps/:id`    | ✅ | Get map + data |
| PUT    | `/api/maps/:id`    | ✅ | Save map state |
| DELETE | `/api/maps/:id`    | ✅ | Delete map |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 (custom DnD color palette) |
| Renderer | PixiJS 8 (2D WebGL top-down) |
| State | Zustand (boardStore + authStore + persist) |
| HTTP | axios with JWT interceptor |
| Routing | React Router v6 |
| Backend | Node.js + Express |
| ORM | Prisma 6 |
| Database | PostgreSQL (local / Neon) |
| Auth | JWT (bcryptjs + jsonwebtoken) |
| Tests | Jest + Supertest |

---

## 🗺 Roadmap

See [`epics.md`](./epics.md) for the full feature backlog.

| Wave | Status | Features |
|------|--------|---------|
| Wave 1 | ✅ Done | Auth, cloud save, dashboard, editor routing |
| Wave 2 | 🔜 Next | Auto-save editor → DB, undo/redo |
| Wave 3 | 📋 Planned | Tokens, initiative tracker |
| Wave 4 | 📋 Planned | Fog of War, Player View (TV mode) |
| Wave 5 | 📋 Planned | Name generators, DM notes |
| Wave 6 | 📋 Planned | Audio, soundscapes |
| Wave 7 | 📋 Planned | Export PNG/JSON |
| V2 | 🔮 Future | Multiplayer (Socket.io) |
