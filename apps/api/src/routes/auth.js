const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');

const router = express.Router();

function signAccess(userId) {
    return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

function signRefresh(userId) {
    return jwt.sign(
        { sub: userId, jti: crypto.randomUUID() },
        process.env.REFRESH_SECRET,
        { expiresIn: '7d' }
    );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, username } = req.body;
        if (!email || !password || !username) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const existing = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        });
        if (existing) {
            const field = existing.email === email ? 'Email' : 'Username';
            return res.status(409).json({ error: `${field} already in use` });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
            data: { email, username, passwordHash },
        });

        const accessToken = signAccess(user.id);
        const refreshToken = signRefresh(user.id);

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        res.status(201).json({
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, username: user.username },
        });
    } catch (err) {
        console.error('[register]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = signAccess(user.id);
        const refreshToken = signRefresh(user.id);

        await prisma.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        res.json({
            accessToken,
            refreshToken,
            user: { id: user.id, email: user.email, username: user.username },
        });
    } catch (err) {
        console.error('[login]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        let payload;
        try {
            payload = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
        } catch {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
        if (!stored || stored.expiresAt < new Date()) {
            return res.status(401).json({ error: 'Refresh token expired or revoked' });
        }

        // Rotate: delete old, issue new
        await prisma.refreshToken.delete({ where: { id: stored.id } });

        const newAccessToken = signAccess(payload.sub);
        const newRefreshToken = signRefresh(payload.sub);

        await prisma.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: payload.sub,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        console.error('[refresh]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (refreshToken) {
            await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
        }
        res.json({ ok: true });
    } catch {
        res.json({ ok: true });
    }
});

module.exports = router;
