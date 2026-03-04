/**
 * seed.js — Inserta usuarios de prueba en la BD
 * Run: node apps/api/seed.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const users = [
        { email: 'dm@dndtiles.com', username: 'DungeonMaster', password: 'dm123', displayName: 'Dungeon Master' },
        { email: 'admin@admin.com', username: 'Admin', password: 'admin123', displayName: 'Administrador' },
        { email: 'player@dndtiles.com', username: 'Player1', password: 'player123', displayName: 'Jugador 1' },
    ];

    for (const u of users) {
        const hash = await bcrypt.hash(u.password, 10);
        // Delete existing user with same username (different email) first
        await prisma.user.deleteMany({ where: { username: u.username } });
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: { passwordHash: hash, displayName: u.displayName, username: u.username },
            create: {
                email: u.email,
                username: u.username,
                passwordHash: hash,
                displayName: u.displayName,
            },
        });
        console.log(`✅  ${user.email} (${user.username}) — password: ${u.password}`);
    }
}

main()
    .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
