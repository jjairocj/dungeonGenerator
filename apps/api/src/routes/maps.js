const express = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /api/maps — list user's maps
router.get('/', authenticate, async (req, res) => {
    try {
        const maps = await prisma.map.findMany({
            where: { ownerId: req.userId },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true, name: true, width: true, height: true,
                biome: true, thumbnailUrl: true, isPublic: true,
                createdAt: true, updatedAt: true,
            },
        });
        res.json({ maps });
    } catch (err) {
        console.error('[GET /maps]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/maps — create map
router.post('/', authenticate, async (req, res) => {
    try {
        const { name = 'New Map', width = 20, height = 14, biome = 'plains', campaignId } = req.body;
        const map = await prisma.map.create({
            data: {
                ownerId: req.userId,
                name,
                width,
                height,
                biome,
                campaignId: campaignId || null,
                data: {},
            },
        });
        res.status(201).json({ map });
    } catch (err) {
        console.error('[POST /maps]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/maps/:id — get single map
router.get('/:id', authenticate, async (req, res) => {
    try {
        const map = await prisma.map.findUnique({ where: { id: req.params.id } });
        if (!map) return res.status(404).json({ error: 'Map not found' });
        if (map.ownerId !== req.userId && !map.isPublic) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        res.json({ map });
    } catch (err) {
        console.error('[GET /maps/:id]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /api/maps/:id — save/update map
router.put('/:id', authenticate, async (req, res) => {
    try {
        const map = await prisma.map.findUnique({ where: { id: req.params.id } });
        if (!map) return res.status(404).json({ error: 'Map not found' });
        if (map.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

        const { name, data, biome, width, height, isPublic, thumbnailUrl } = req.body;

        const updated = await prisma.map.update({
            where: { id: req.params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(data !== undefined && { data }),
                ...(biome !== undefined && { biome }),
                ...(width !== undefined && { width }),
                ...(height !== undefined && { height }),
                ...(isPublic !== undefined && { isPublic }),
                ...(thumbnailUrl !== undefined && { thumbnailUrl }),
            },
        });
        res.json({ map: updated });
    } catch (err) {
        console.error('[PUT /maps/:id]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/maps/:id
router.delete('/:id', authenticate, async (req, res) => {
    try {
        const map = await prisma.map.findUnique({ where: { id: req.params.id } });
        if (!map) return res.status(404).json({ error: 'Map not found' });
        if (map.ownerId !== req.userId) return res.status(403).json({ error: 'Forbidden' });

        await prisma.map.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    } catch (err) {
        console.error('[DELETE /maps/:id]', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
