const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Game State
const players = {};
const bullets = [];
const MAP_SIZE = 2000;
const BULLET_SPEED = 10;
const PLAYER_SPEED = 5;
const PLAYER_RADIUS = 20;
const BULLET_RADIUS = 5;

io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Initialize new player
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * (MAP_SIZE - 100) + 50,
        y: Math.random() * (MAP_SIZE - 100) + 50,
        angle: 0,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        score: 0,
        hp: 100
    };

    // Send initial state
    socket.emit('init', { id: socket.id, players, mapSize: MAP_SIZE });

    // Handle movement and rotation
    socket.on('updateInput', (data) => {
        const player = players[socket.id];
        if (!player) return;

        // Move player based on joystick vector
        if (data.move) {
            player.x += data.move.x * PLAYER_SPEED;
            player.y += data.move.y * PLAYER_SPEED;
        }

        // Constraints
        player.x = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, player.x));
        player.y = Math.max(PLAYER_RADIUS, Math.min(MAP_SIZE - PLAYER_RADIUS, player.y));

        // Update angle
        if (data.angle !== undefined) {
            player.angle = data.angle;
        }

        // Shooting logic
        if (data.shooting) {
            const now = Date.now();
            if (!player.lastShot || now - player.lastShot > 200) {
                bullets.push({
                    id: Math.random().toString(36).substr(2, 9),
                    ownerId: socket.id,
                    x: player.x + Math.cos(player.angle) * PLAYER_RADIUS,
                    y: player.y + Math.sin(player.angle) * PLAYER_RADIUS,
                    vx: Math.cos(player.angle) * BULLET_SPEED,
                    vy: Math.sin(player.angle) * BULLET_SPEED,
                    distance: 0
                });
                player.lastShot = now;
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`Player disconnected: ${socket.id}`);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

// Game Logic Loop (60 FPS)
setInterval(() => {
    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.distance += BULLET_SPEED;

        // Remove old bullets
        if (b.distance > 1000 || b.x < 0 || b.x > MAP_SIZE || b.y < 0 || b.y > MAP_SIZE) {
            bullets.splice(i, 1);
            continue;
        }

        // Collision detection
        for (const id in players) {
            const p = players[id];
            if (b.ownerId === id) continue;

            const dx = b.x - p.x;
            const dy = b.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < PLAYER_RADIUS + BULLET_RADIUS) {
                p.hp -= 10;
                bullets.splice(i, 1);

                if (p.hp <= 0) {
                    if (players[b.ownerId]) players[b.ownerId].score += 1;
                    p.hp = 100;
                    p.x = Math.random() * (MAP_SIZE - 100) + 50;
                    p.y = Math.random() * (MAP_SIZE - 100) + 50;
                }
                break;
            }
        }
    }

    io.emit('gameState', { players, bullets });
}, 1000 / 60);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
