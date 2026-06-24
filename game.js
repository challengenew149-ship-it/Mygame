const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const socket = io();

const hpSpan = document.getElementById('hp-val');
const scoreSpan = document.getElementById('score-val');
const scoreList = document.getElementById('score-list');

// Joysticks
const moveJoystick = new Joystick('left-joystick-zone', 'left-joystick-base', 'left-joystick-stick');
const aimJoystick = new Joystick('right-joystick-zone', 'right-joystick-base', 'right-joystick-stick');

let myId = null;
let players = {};
let bullets = [];
let mapSize = 2000;

// Resize handling
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Socket events
socket.on('init', (data) => {
    myId = data.id;
    players = data.players;
    mapSize = data.mapSize;
});

socket.on('gameState', (data) => {
    players = data.players;
    bullets = data.bullets;
    
    // Update local UI
    if (players[myId]) {
        hpSpan.innerText = players[myId].hp;
        scoreSpan.innerText = players[myId].score;
    }
    
    updateLeaderboard();
});

function updateLeaderboard() {
    const sorted = Object.values(players).sort((a, b) => b.score - a.score).slice(0, 5);
    scoreList.innerHTML = sorted.map(p => `<li>${p.id.substr(0,5)}: ${p.score}</li>`).join('');
}

// Input Loop (60 FPS)
setInterval(() => {
    if (!myId || !players[myId]) return;

    const input = {
        move: moveJoystick.active ? moveJoystick.vector : null,
        shooting: aimJoystick.active,
        angle: aimJoystick.active ? Math.atan2(aimJoystick.vector.y, aimJoystick.vector.x) : players[myId].angle
    };

    socket.emit('updateInput', input);
}, 1000 / 60);

// Render Loop
function draw() {
    if (!myId || !players[myId]) {
        requestAnimationFrame(draw);
        return;
    }

    const me = players[myId];
    
    // Clear
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Camera transform
    ctx.save();
    ctx.translate(canvas.width / 2 - me.x, canvas.height / 2 - me.y);

    // Draw Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    for (let x = 0; x <= mapSize; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapSize); ctx.stroke();
    }
    for (let y = 0; y <= mapSize; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mapSize, y); ctx.stroke();
    }
    
    // Draw Border
    ctx.strokeStyle = '#ff4444';
    ctx.strokeRect(0, 0, mapSize, mapSize);

    // Draw Bullets
    ctx.fillStyle = 'yellow';
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Players
    Object.values(players).forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        
        // HP Bar background
        ctx.fillStyle = 'red';
        ctx.fillRect(-20, -35, 40, 5);
        // HP Bar foreground
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(-20, -35, (p.hp / 100) * 40, 5);

        // Player Body
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Player Gun (triangle)
        ctx.beginPath();
        ctx.moveTo(15, -5);
        ctx.lineTo(25, 0);
        ctx.lineTo(15, 5);
        ctx.fill();

        ctx.restore();
    });

    ctx.restore();
    requestAnimationFrame(draw);
}

draw();
