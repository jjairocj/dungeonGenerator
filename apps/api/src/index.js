require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const mapsRoutes = require('./routes/maps');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
}));
app.use(express.json({ limit: '2mb' })); // maps can be ~200KB JSON

// ── Routes ──────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/maps', mapsRoutes);

// ── Health check ────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── 404 ─────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// ── Error handler ───────────────────────────────
app.use((err, req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🏰 DungeonGenerator API running on http://localhost:${PORT}`);
});
