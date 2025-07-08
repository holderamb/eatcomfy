// === SETTINGS ===
const canvas = document.getElementById('gameArea');
const ctx = canvas.getContext('2d');
const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const PARTICLE_COUNT = 120;
const PARTICLE_RADIUS = 8;
const PLAYER_START_RADIUS = 32;
const PLAYER_SPEED = 2.5;
const SKINS = [
    {name: 'Comfy', src: 'skins/skin1.png', price: 400},
    {name: 'Boxer', src: 'skins/skin2.png', price: 1000},
    {name: 'Tge Farmer', src: 'skins/skin3.png', price: 5000},
    {name: 'Incock', src: 'skins/skin4.png', price: 10000},
];
const BOT_NAMES = [
    'goblinmode', 'tupoy_4el', 'mishuura', 'Zippy', 'Blobster', 'CellKing', 'NomNom', 'Slurp', 'Boba', 'Chad', 'Pixel', 'Munch', 'Orbit', 'Fuzzy', 'Bloop', 'Wormy', 'Jelly', 'Squishy', 'Zoomer', 'Bingus'
];
const FIXED_BOT_NAMES = [
    'goblinmode', 'tupoy_4el', 'mishuura', 'drNikita', 'dnnod', 'Meri_gai', 'Oyari', 'Shorteramb', 'IHORmeister', 'Crynanz'
];

// === Game World Settings ===
const WORLD_SIZE = 5000;
const PARTICLE_RESPAWN_RADIUS = 600; // радиус вокруг игрока для генерации новых частиц
const BOT_COUNT = 7;
const MIN_SCALE = 0.4;
const MAX_SCALE = 1.0;
const BASE_SPEED = 2; // уменьшено для адекватной скорости

// === UI Elements ===
const mainMenu = document.getElementById('mainMenu');
const playBtn = document.getElementById('playBtn');
const shopBtn = document.getElementById('shopBtn');
const shopMenu = document.getElementById('shopMenu');
const shopBackBtn = document.getElementById('shopBackBtn');
const shopSkinList = document.getElementById('shopSkinList');
const shopPoints = document.getElementById('shopPoints');
const skinSelector = document.getElementById('skinSelector');
const leaderboard = document.getElementById('leaderboard');
const scoreDisplay = document.getElementById('scoreDisplay');
const scoreSpan = document.getElementById('score');
const nicknameMenu = document.getElementById('nicknameMenu');
const nicknameInput = document.getElementById('nicknameInput');
const nicknameBtn = document.getElementById('nicknameBtn');

let nickname = localStorage.getItem('nickname') || '';

function showNicknameMenu() {
    nicknameMenu.style.display = 'flex';
    mainMenu.style.display = 'none';
    shopMenu.style.display = 'none';
    skinSelector.style.display = 'none';
    leaderboard.style.display = 'none';
    scoreDisplay.style.display = 'none';
    nicknameInput.value = nickname;
    nicknameInput.focus();
}
function hideNicknameMenu() {
    nicknameMenu.style.display = 'none';
    mainMenu.style.display = 'flex';
}

nicknameBtn.onclick = () => {
    const value = nicknameInput.value.trim();
    if (value.length > 0) {
        nickname = value;
        localStorage.setItem('nickname', nickname);
        hideNicknameMenu();
    } else {
        nicknameInput.focus();
    }
};

nicknameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') nicknameBtn.onclick();
});

let gameState = 'menu'; // menu, shop, playing
let unlockedSkins = JSON.parse(localStorage.getItem('unlockedSkins') || '[true,false,false]');
let selectedSkin = 0;
let points = parseInt(localStorage.getItem('points') || '0');
let gameOver = false;
let sessionStartTime = null;
const SESSION_LIMIT = 480; // 8 минут в секундах
let sessionTimerId = null;
let player = null;
let bots = [];
let particles = [];
let camera = {x: 0, y: 0};
let mouse = {x: WIDTH/2, y: HEIGHT/2};
let firstMove = true;
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

// === Load Skins ===
let skinImages = [];
function loadSkinImages(callback) {
    let loaded = 0;
    SKINS.forEach((skin, i) => {
        const img = new Image();
        img.src = skin.src;
        img.onload = () => {
            skinImages[i] = img;
            loaded++;
            if (loaded === SKINS.length) callback();
        };
        img.onerror = () => {
            skinImages[i] = null;
            loaded++;
            if (loaded === SKINS.length) callback();
        };
    });
}

// === Main Menu ===
playBtn.onclick = () => {
    mainMenu.style.display = 'none';
    shopMenu.style.display = 'none';
    skinSelector.style.display = 'block';
    leaderboard.style.display = 'block';
    scoreDisplay.style.display = 'block';
    startGame();
};
shopBtn.onclick = () => {
    mainMenu.style.display = 'none';
    shopMenu.style.display = 'flex';
    updateShop();
};
shopBackBtn.onclick = () => {
    shopMenu.style.display = 'none';
    mainMenu.style.display = 'flex';
};

// === Магазин: покупка скинов за points ===
function updateShop() {
    shopSkinList.innerHTML = '';
    SKINS.forEach((skin, i) => {
        const div = document.createElement('div');
        div.className = 'shop-skin';
        // Картинка скина в круге
        const canvasSkin = document.createElement('canvas');
        canvasSkin.width = 80;
        canvasSkin.height = 80;
        canvasSkin.className = 'shop-skin-canvas';
        const cctx = canvasSkin.getContext('2d');
        cctx.save();
        cctx.beginPath();
        cctx.arc(40, 40, 40, 0, Math.PI*2);
        cctx.closePath();
        cctx.clip();
        if (skinImages[i])
            cctx.drawImage(skinImages[i], 0, 0, 80, 80);
        cctx.restore();
        div.appendChild(canvasSkin);
        // Название
        const name = document.createElement('div');
        name.className = 'shop-skin-name';
        name.textContent = skin.name;
        div.appendChild(name);
        // Кнопка покупки/выбора
        const btn = document.createElement('button');
        btn.className = 'shop-skin-btn';
        if (unlockedSkins[i]) {
            btn.textContent = 'Select';
            btn.disabled = selectedSkin === i;
            btn.onclick = () => {
                selectedSkin = i;
                localStorage.setItem('selectedSkin', selectedSkin);
                updateShop();
            };
        } else {
            btn.textContent = `Buy (${skin.price})`;
            btn.disabled = points < skin.price;
            btn.onclick = () => {
                if (points >= skin.price) {
                    points -= skin.price;
                    unlockedSkins[i] = true;
                    localStorage.setItem('unlockedSkins', JSON.stringify(unlockedSkins));
                    localStorage.setItem('points', points);
                    playSound(buySound);
                    updateShop();
                }
            };
        }
        div.appendChild(btn);
        shopSkinList.appendChild(div);
    });
    shopPoints.textContent = points;
}

// === Basic Game Start (player and particles) ===
function randomColor() {
    const colors = ['#ff5252','#ffb300','#43a047','#29b6f6','#ab47bc','#f06292','#ffd600','#00e676'];
    return colors[Math.floor(Math.random()*colors.length)];
}
function spawnParticlesAround(x, y, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * PARTICLE_RESPAWN_RADIUS + 200;
        const px = x + Math.cos(angle) * dist;
        const py = y + Math.sin(angle) * dist;
        if (px > 0 && px < WORLD_SIZE && py > 0 && py < WORLD_SIZE) {
            particles.push({
                x: px,
                y: py,
                radius: PARTICLE_RADIUS,
                color: randomColor(),
            });
        }
    }
}

function spawnInitialParticles() {
    particles = [];
    for (let i = 0; i < PARTICLE_COUNT * 10; i++) {
        particles.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            radius: PARTICLE_RADIUS,
            color: randomColor(),
        });
    }
}

function getPlayerSpeed(radius) {
    return BASE_SPEED * Math.pow(PLAYER_START_RADIUS / radius, 0.4);
}

function getCameraScale(radius) {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, 1.0 * Math.pow(PLAYER_START_RADIUS / radius, 0.35)));
}

function getCameraOffset() {
    // Камера следует за игроком, но не выходит за границы карты
    const scale = getCameraScale(player.radius);
    let camX = player.x - WIDTH / 2 / scale;
    let camY = player.y - HEIGHT / 2 / scale;
    camX = Math.max(0, Math.min(WORLD_SIZE - WIDTH / scale, camX));
    camY = Math.max(0, Math.min(WORLD_SIZE - HEIGHT / scale, camY));
    return {x: camX, y: camY, scale};
}

function update() {
    if (!player || !player.alive || gameOver) return;
    // Скорость зависит от размера
    const speed = getPlayerSpeed(player.radius);
    const dx = mouse.x - WIDTH / 2;
    const dy = mouse.y - HEIGHT / 2;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist > 10) {
        player.x += (dx/dist) * speed;
        player.y += (dy/dist) * speed;
    }
    // Ограничение по границам мира
    player.x = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(WORLD_SIZE - player.radius, player.y));

    // Сбор частиц игроком
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        const d = Math.hypot(player.x - p.x, player.y - p.y);
        if (d < player.radius + p.radius) {
            player.radius += 0.5;
            score++;
            player.score++;
            particles.splice(i, 1);
            playSound(popSound);
        }
    }
    // Генерация новых частиц вокруг игрока, если их мало в радиусе
    let nearCount = particles.filter(p => Math.abs(p.x - player.x) < PARTICLE_RESPAWN_RADIUS && Math.abs(p.y - player.y) < PARTICLE_RESPAWN_RADIUS).length;
    if (nearCount < PARTICLE_COUNT) {
        spawnParticlesAround(player.x, player.y, PARTICLE_COUNT - nearCount);
    }
    // Движение и сбор частиц ботами
    for (const bot of bots) {
        if (!bot.alive) continue;
        // Скорость бота зависит от размера
        const botSpeed = getPlayerSpeed(bot.radius) * 0.85;
        // Собираем всех других живых (игрока и ботов, кроме себя)
        const others = [player, ...bots.filter(b => b !== bot && b.alive)];
        // Ищем ближайшего меньшего и ближайшего большего цели
        let nearestSmaller = null, nearestSmallerDist = Infinity;
        let nearestBigger = null, nearestBiggerDist = Infinity;
        for (const other of others) {
            if (!other.alive) continue;
            const d = Math.hypot(bot.x - other.x, bot.y - other.y);
            if (other.radius < bot.radius / 1.15 && d < nearestSmallerDist) {
                nearestSmaller = other;
                nearestSmallerDist = d;
            }
            if (other.radius > bot.radius * 1.15 && d < nearestBiggerDist) {
                nearestBigger = other;
                nearestBiggerDist = d;
            }
        }
        let bdx, bdy, bdist;
        if (nearestSmaller) {
            // Преследует ближайшего меньшего
            bdx = nearestSmaller.x - bot.x;
            bdy = nearestSmaller.y - bot.y;
            bdist = Math.sqrt(bdx*bdx + bdy*bdy);
            if (bdist > 1) {
                bot.x += (bdx/bdist) * botSpeed;
                bot.y += (bdy/bdist) * botSpeed;
            }
        } else if (nearestBigger) {
            // Убегает от ближайшего большего
            bdx = bot.x - nearestBigger.x;
            bdy = bot.y - nearestBigger.y;
            bdist = Math.sqrt(bdx*bdx + bdy*bdy);
            if (bdist > 1) {
                bot.x += (bdx/bdist) * botSpeed;
                bot.y += (bdy/bdist) * botSpeed;
            }
        } else {
            // Двигается к случайной точке
            if (!bot.target || Math.hypot(bot.x - bot.target.x, bot.y - bot.target.y) < 10) {
                bot.target = {
                    x: Math.random() * WORLD_SIZE,
                    y: Math.random() * WORLD_SIZE
                };
            }
            bdx = bot.target.x - bot.x;
            bdy = bot.target.y - bot.y;
            bdist = Math.sqrt(bdx*bdx + bdy*bdy);
            if (bdist > 1) {
                bot.x += (bdx/bdist) * botSpeed;
                bot.y += (bdy/bdist) * botSpeed;
            }
        }
        // Ограничение по границам мира
        bot.x = Math.max(bot.radius, Math.min(WORLD_SIZE - bot.radius, bot.x));
        bot.y = Math.max(bot.radius, Math.min(WORLD_SIZE - bot.radius, bot.y));
        // Сбор частиц ботом
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            const d = Math.hypot(bot.x - p.x, bot.y - p.y);
            if (d < bot.radius + p.radius) {
                bot.radius += 0.5;
                bot.score++;
                particles.splice(i, 1);
            }
        }
    }
    // Поглощение: игрок и боты
    // Игрок поглощает ботов
    for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        if (!bot.alive) continue;
        const d = Math.hypot(player.x - bot.x, player.y - bot.y);
        if (player.radius > bot.radius * 1.15 && d < player.radius) {
            player.radius += bot.radius * 0.8;
            player.score += bot.score;
            score += bot.score;
            bot.alive = false;
            botRespawnTimeouts[i] = setTimeout(() => respawnBotAtIndex(i), BOT_RESPAWN_DELAY);
            playSound(eatSound);
        } else if (bot.radius > player.radius * 1.15 && d < bot.radius) {
            bot.radius += player.radius * 0.8;
            bot.score += player.score;
            player.alive = false;
            // Можно добавить экран поражения
            playSound(loseSound);
        }
    }
    // Боты поглощают друг друга
    for (let i = 0; i < bots.length; i++) {
        const a = bots[i];
        if (!a.alive) continue;
        for (let j = 0; j < bots.length; j++) {
            if (i === j) continue;
            const b = bots[j];
            if (!b.alive) continue;
            const d = Math.hypot(a.x - b.x, a.y - b.y);
            if (a.radius > b.radius * 1.15 && d < a.radius) {
                a.radius += b.radius * 0.8;
                a.score += b.score;
                b.alive = false;
                botRespawnTimeouts[j] = setTimeout(() => respawnBotAtIndex(j), BOT_RESPAWN_DELAY);
            }
        }
    }
    // Проверка конца игры
    const alivePlayers = [player, ...bots].filter(p => p && p.alive);
    if (alivePlayers.length === 1) {
        // Победитель — тот, кто остался
        showGameOver(alivePlayers[0].name, alivePlayers[0].score, true);
    } else if (!player.alive) {
        // Игрок погиб — экран поражения
        showGameOver(null, null, false);
    }
}

let animationFrameId = null;
let botRespawnTimerId = null;
const BOT_RESPAWN_INTERVAL = 20000; // 20 секунд
let botRespawnTimeouts = [];
const BOT_RESPAWN_DELAY = 20000; // 20 секунд

function gameLoop() {
    update();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function startGame() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    if (sessionTimerId) clearInterval(sessionTimerId);
    sessionTimerId = null;
    if (botRespawnTimerId) clearInterval(botRespawnTimerId);
    botRespawnTimerId = null;
    // Сброс индивидуальных таймеров респавна
    botRespawnTimeouts.forEach(id => clearTimeout(id));
    botRespawnTimeouts = [];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    mouse.x = WIDTH / 2;
    mouse.y = HEIGHT / 2;
    firstMove = true;
    bots = [];
    particles = [];
    player = {
        x: WORLD_SIZE / 2,
        y: WORLD_SIZE / 2,
        radius: PLAYER_START_RADIUS,
        skin: SKINS[selectedSkin],
        img: skinImages[selectedSkin],
        name: nickname || 'You',
        isBot: false,
        color: '#1976d2',
        score: 0,
        alive: true,
    };
    score = 0;
    spawnInitialParticles();
    spawnBots();
    gameOver = false;
    sessionStartTime = Date.now();
    sessionTimerId = setInterval(checkSessionTime, 1000);
    playSound(startSound);
    startMusic();
    animationFrameId = requestAnimationFrame(gameLoop);
    if (musicDropdownContainerFixed) {
        musicDropdownContainerFixed.classList.remove('music-fixed');
        musicDropdownContainerFixed.classList.add('music-absolute');
    }
}

function respawnBotAtIndex(i) {
    const name = FIXED_BOT_NAMES[i % FIXED_BOT_NAMES.length];
    const skinIdx = Math.floor(Math.random() * SKINS.length);
    const baseRadius = PLAYER_START_RADIUS + 8 + Math.random() * 40;
    const baseScore = Math.floor((baseRadius - PLAYER_START_RADIUS) * 1.5 + 10 + Math.random() * 30);
    bots[i] = {
        x: Math.random() * WORLD_SIZE,
        y: Math.random() * WORLD_SIZE,
        radius: baseRadius,
        skin: SKINS[skinIdx],
        img: skinImages[skinIdx],
        name,
        isBot: true,
        color: '#888',
        target: null,
        score: baseScore,
        alive: true,
    };
}

function checkSessionTime() {
    if (gameOver) return;
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    if (elapsed >= SESSION_LIMIT) {
        // Время вышло — победитель лидерборда
        const allAlive = [player, ...bots].filter(p => p && p.alive);
        allAlive.sort((a, b) => (b.score + Math.floor(b.radius)) - (a.score + Math.floor(a.radius)));
        const winner = allAlive[0];
        showGameOver(winner.name, winner.score, true);
    }
}

function spawnBots() {
    bots = [];
    for (let i = 0; i < BOT_COUNT; i++) {
        const name = FIXED_BOT_NAMES[i % FIXED_BOT_NAMES.length];
        const skinIdx = Math.floor(Math.random() * SKINS.length);
        const baseRadius = PLAYER_START_RADIUS + 8 + Math.random() * 40; // всегда относительно PLAYER_START_RADIUS
        const baseScore = Math.floor((baseRadius - PLAYER_START_RADIUS) * 1.5 + 10 + Math.random() * 30);
        bots.push({
            x: Math.random() * WORLD_SIZE,
            y: Math.random() * WORLD_SIZE,
            radius: baseRadius,
            skin: SKINS[skinIdx],
            img: skinImages[skinIdx],
            name,
            isBot: true,
            color: '#888',
            target: null,
            score: baseScore,
            alive: true,
        });
    }
}

function drawLeaderboard() {
    // Собираем всех живых игроков и ботов
    allPlayers = [player, ...bots].filter(p => p && p.alive);
    allPlayers.sort((a, b) => (b.score + Math.floor(b.radius)) - (a.score + Math.floor(a.radius)));
    let html = '<b>Leaderboard</b><br><ol style="margin:0;padding-left:18px;">';
    for (let i = 0; i < Math.min(10, allPlayers.length); i++) {
        const p = allPlayers[i];
        html += `<li>${p.name} <b>${p.score}</b></li>`;
    }
    html += '</ol>';
    leaderboard.innerHTML = html;
}

function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // сброс перед каждым кадром
    // Камера и масштаб
    const cam = getCameraOffset();
    ctx.setTransform(cam.scale, 0, 0, cam.scale, -cam.x * cam.scale, -cam.y * cam.scale);
    ctx.clearRect(cam.x, cam.y, WIDTH / cam.scale, HEIGHT / cam.scale);
    ctx.fillStyle = '#b3e5fc';
    ctx.fillRect(cam.x, cam.y, WIDTH / cam.scale, HEIGHT / cam.scale);
    // Границы карты
    ctx.strokeStyle = '#1976d2';
    ctx.lineWidth = 8 / cam.scale;
    ctx.strokeRect(0, 0, WORLD_SIZE, WORLD_SIZE);
    // Частицы
    for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
    }
    // Боты
    for (const bot of bots) {
        if (!bot.alive) continue;
        ctx.save();
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        if (bot.img) {
            ctx.drawImage(bot.img, bot.x - bot.radius, bot.y - bot.radius, bot.radius * 2, bot.radius * 2);
        } else {
            ctx.fillStyle = bot.color;
            ctx.fill();
        }
        ctx.restore();
        // Контур
        ctx.beginPath();
        ctx.arc(bot.x, bot.y, bot.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 2 / cam.scale;
        ctx.stroke();
        // Ник
        ctx.font = `${Math.max(14, bot.radius/2)}px sans-serif`;
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.fillText(bot.name, bot.x, bot.y - bot.radius - 8);
    }
    // Игрок
    if (player && player.img && player.alive) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(player.img, player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.strokeStyle = '#1976d2';
        ctx.lineWidth = 3 / cam.scale;
        ctx.stroke();
        // Ник
        ctx.font = `${Math.max(14, player.radius/2)}px sans-serif`;
        ctx.fillStyle = '#1976d2';
        ctx.textAlign = 'center';
        ctx.fillText(player.name, player.x, player.y - player.radius - 8);
    }
    // Сброс трансформации
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // Очки
    scoreSpan.textContent = player && player.alive ? player.score : score;
    // Лидерборд
    drawLeaderboard();
}

// === Game Over Screen ===
function showGameOver(winnerName, winnerScore, isVictory) {
    gameOver = true;
    if (sessionTimerId) clearInterval(sessionTimerId);
    sessionTimerId = null;
    if (botRespawnTimerId) clearInterval(botRespawnTimerId);
    botRespawnTimerId = null;
    // Добавляем очки за игру к points
    if (player && player.alive) {
        points += player.score;
    } else if (player && !player.alive) {
        points += player.score;
    }
    localStorage.setItem('points', points);
    // Показываем экран
    let overlay = document.getElementById('gameOverOverlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'gameOverOverlay';
        overlay.style.position = 'absolute';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.right = '0';
        overlay.style.bottom = '0';
        overlay.style.background = 'rgba(255,255,255,0.95)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '100';
        overlay.innerHTML = '';
        document.body.appendChild(overlay);
    }
    let html = '';
    if (isVictory) {
        html += `<h2>Game Over</h2>
            <div style='font-size:1.3em;margin-bottom:10px;'>Winner: <b>${winnerName}</b> (${winnerScore} pts)</div>
            <div style='margin-bottom:18px;'>Your score: <b>${player ? player.score : 0}</b></div>`;
        playSound(winSound);
    } else {
        html += `<h2>You lost!</h2>
            <div style='margin-bottom:18px;'>Your score: <b>${player ? player.score : 0}</b></div>`;
        playSound(loseSound);
    }
    html += `<div style='display:flex;gap:16px;'>
        <button id='restartBtn' class='menu-btn'>Restart</button>
        <button id='mainMenuBtn' class='menu-btn'>Main Menu</button>
    </div>`;
    overlay.innerHTML = html;
    document.getElementById('restartBtn').onclick = () => {
        overlay.remove();
        gameOver = false;
        startGame();
        leaderboard.style.display = 'block';
        scoreDisplay.style.display = 'block';
        mainMenu.style.display = 'none';
        shopMenu.style.display = 'none';
        skinSelector.style.display = 'block';
    };
    document.getElementById('mainMenuBtn').onclick = () => {
        overlay.remove();
        // Полный сброс состояния игры
        gameOver = false;
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
        if (sessionTimerId) clearInterval(sessionTimerId);
        sessionTimerId = null;
        if (botRespawnTimerId) clearInterval(botRespawnTimerId);
        botRespawnTimerId = null;
        botRespawnTimeouts.forEach(id => clearTimeout(id));
        botRespawnTimeouts = [];
        bots = [];
        particles = [];
        player = null;
        score = 0;
        firstMove = true;
        stopMusic();
        mainMenu.style.display = 'flex';
        shopMenu.style.display = 'none';
        skinSelector.style.display = 'none';
        leaderboard.style.display = 'none';
        scoreDisplay.style.display = 'none';
        if (musicDropdownContainerFixed) {
            musicDropdownContainerFixed.classList.remove('music-absolute');
            musicDropdownContainerFixed.classList.add('music-fixed');
        }
    };
}

// === Start ===
loadSkinImages(() => {
    if (!nickname) {
        showNicknameMenu();
    } else {
        mainMenu.style.display = 'flex';
        shopMenu.style.display = 'none';
        skinSelector.style.display = 'none';
        leaderboard.style.display = 'none';
        scoreDisplay.style.display = 'none';
    }
});

// === Audio ===
const bgMusic = document.getElementById('bgMusic');
const popSound = document.getElementById('popSound');
const eatSound = document.getElementById('eatSound');
const loseSound = document.getElementById('loseSound');
const winSound = document.getElementById('winSound');
const startSound = document.getElementById('startSound');
const buySound = document.getElementById('buySound');

function playSound(audio) {
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
}

const musicFiles = {
    anime: 'sounds/music_anime.mp3',
    jazz: 'sounds/music_jazz.mp3',
    rock: 'sounds/music_rock.mp3',
    phonk: 'sounds/music_phonk.mp3',
    classic: 'sounds/music_classic.mp3',
};
let selectedMusic = localStorage.getItem('selectedMusic') || 'anime';
let musicMuted = selectedMusic === 'off';

function setMusic(musicKey) {
    selectedMusic = musicKey;
    localStorage.setItem('selectedMusic', selectedMusic);
    musicMuted = (musicKey === 'off');
    if (bgMusic) {
        if (musicMuted) {
            bgMusic.pause();
        } else {
            bgMusic.src = musicFiles[selectedMusic] || musicFiles['anime'];
            bgMusic.load();
        }
    }
}

// Применяем выбранную музыку при загрузке
setMusic(selectedMusic);

// Обработчик выбора музыки (теперь только для фиксированного меню)
const musicDropdown = document.getElementById('musicDropdown');
function updateMusicMenuHighlight() {
    const opts = musicDropdown.querySelectorAll('.music-option');
    opts.forEach(opt => {
        if (opt.getAttribute('data-music') === selectedMusic) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
}
updateMusicMenuHighlight();

musicDropdown.addEventListener('click', e => {
    const opt = e.target.closest('.music-option');
    if (opt) {
        setMusic(opt.getAttribute('data-music'));
        updateMusicMenuHighlight();
        if (opt.getAttribute('data-music') === 'off') {
            stopMusic();
        } else {
            startMusic();
        }
    }
});

// При смене музыки через setMusic тоже обновлять выделение
const origSetMusic = setMusic;
setMusic = function(musicKey) {
    origSetMusic(musicKey);
    updateMusicMenuHighlight();
};

function startMusic() {
    if (bgMusic && !musicMuted) {
        bgMusic.volume = 0.25;
        bgMusic.currentTime = 0;
        bgMusic.play();
    }
}
function stopMusic() {
    if (bgMusic) bgMusic.pause();
}

const musicDropdownContainerFixed = document.getElementById('musicDropdownContainerFixed');
// По умолчанию фиксированное меню
if (musicDropdownContainerFixed) {
    musicDropdownContainerFixed.classList.add('music-fixed');
    musicDropdownContainerFixed.classList.remove('music-absolute');
}
const musicDropdownBtn = document.getElementById('musicDropdownBtn');

// Открытие/закрытие меню по клику
musicDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    musicDropdownContainerFixed.classList.toggle('open');
});
// Закрытие меню при клике вне меню
window.addEventListener('click', (e) => {
    if (!musicDropdownContainerFixed.contains(e.target)) {
        musicDropdownContainerFixed.classList.remove('open');
    }
});
