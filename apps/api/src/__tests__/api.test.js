require('dotenv').config({ path: __dirname + '/../../.env' });

const request = require('supertest');
const express = require('express');
const cors = require('cors');
const authRoutes = require('../routes/auth');
const mapsRoutes = require('../routes/maps');

// Minimal test app (same middleware as production)
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/maps', mapsRoutes);

// ── Shared state across tests ──────────────────────
let accessToken;
let refreshToken;
let mapId;
const TEST_USER = {
    email: `test_${Date.now()}@jest.com`,
    password: 'testpass99',
    username: `user_${Date.now()}`,
};

// ── AUTH TESTS ─────────────────────────────────────

describe('POST /api/auth/register', () => {
    it('registers a new user and returns tokens', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(TEST_USER)
            .expect(201);

        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        expect(res.body.user.email).toBe(TEST_USER.email);
        expect(res.body.user.username).toBe(TEST_USER.username);

        accessToken = res.body.accessToken;
        refreshToken = res.body.refreshToken;
    });

    it('rejects duplicate email', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(TEST_USER)
            .expect(409);
        expect(res.body).toHaveProperty('error');
    });

    it('rejects missing fields', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'no@fields.com' })
            .expect(400);
        expect(res.body).toHaveProperty('error');
    });

    it('rejects short password', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send({ email: 'pw@test.com', password: '123', username: 'shortpw' })
            .expect(400);
        expect(res.body.error).toMatch(/8 characters/);
    });
});

describe('POST /api/auth/login', () => {
    it('logs in with correct credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: TEST_USER.password })
            .expect(200);

        expect(res.body).toHaveProperty('accessToken');
        expect(res.body).toHaveProperty('refreshToken');
        accessToken = res.body.accessToken;
        refreshToken = res.body.refreshToken;
    });

    it('rejects wrong password', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: TEST_USER.email, password: 'wrongpass' })
            .expect(401);
        expect(res.body).toHaveProperty('error');
    });

    it('rejects unknown email', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'nobody@nothere.com', password: 'abc12345' })
            .expect(401);
        expect(res.body).toHaveProperty('error');
    });
});

describe('POST /api/auth/refresh', () => {
    it('issues a new access token with valid refresh token', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken })
            .expect(200);
        expect(res.body).toHaveProperty('accessToken');
        accessToken = res.body.accessToken;
        refreshToken = res.body.refreshToken;
    });

    it('rejects invalid refresh token', async () => {
        const res = await request(app)
            .post('/api/auth/refresh')
            .send({ refreshToken: 'fake.token.here' })
            .expect(401);
        expect(res.body).toHaveProperty('error');
    });
});

// ── MAPS TESTS ─────────────────────────────────────

describe('POST /api/maps', () => {
    it('creates a map for authenticated user', async () => {
        const res = await request(app)
            .post('/api/maps')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Test Dungeon', width: 20, height: 14, biome: 'dungeon' })
            .expect(201);

        expect(res.body.map).toHaveProperty('id');
        expect(res.body.map.name).toBe('Test Dungeon');
        expect(res.body.map.biome).toBe('dungeon');
        mapId = res.body.map.id;
    });

    it('rejects unauthenticated request', async () => {
        await request(app).post('/api/maps').send({ name: 'No auth' }).expect(401);
    });
});

describe('GET /api/maps', () => {
    it('returns list of user maps', async () => {
        const res = await request(app)
            .get('/api/maps')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);

        expect(res.body).toHaveProperty('maps');
        expect(Array.isArray(res.body.maps)).toBe(true);
        expect(res.body.maps.length).toBeGreaterThan(0);
    });

    it('rejects unauthenticated request', async () => {
        await request(app).get('/api/maps').expect(401);
    });
});

describe('GET /api/maps/:id', () => {
    it('returns a specific map by id', async () => {
        const res = await request(app)
            .get(`/api/maps/${mapId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
        expect(res.body.map.id).toBe(mapId);
    });

    it('returns 404 for non-existent map', async () => {
        await request(app)
            .get('/api/maps/nonexistent-id-xyz')
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(404);
    });
});

describe('PUT /api/maps/:id', () => {
    it('updates map name and data', async () => {
        const res = await request(app)
            .put(`/api/maps/${mapId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ name: 'Renamed Dungeon', data: { tiles: { '0,0': 'stone' } } })
            .expect(200);
        expect(res.body.map.name).toBe('Renamed Dungeon');
    });
});

describe('DELETE /api/maps/:id', () => {
    it('deletes a map', async () => {
        await request(app)
            .delete(`/api/maps/${mapId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(200);
    });

    it('returns 404 after deletion', async () => {
        await request(app)
            .get(`/api/maps/${mapId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .expect(404);
    });
});

describe('POST /api/auth/logout', () => {
    it('logs out successfully', async () => {
        const res = await request(app)
            .post('/api/auth/logout')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ refreshToken })
            .expect(200);
        expect(res.body.ok).toBe(true);
    });
});
