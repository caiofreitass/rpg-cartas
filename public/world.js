const socket = io();

// --- Jogador local ---
let player = { x: 200, y: 200, name: "Eu", width: 30, height: 30 };

// --- Outros jogadores ---
let worldPlayers = {};

// --- Canvas ---
let canvas = document.getElementById("worldCanvas");
let ctx = canvas.getContext("2d");

// --- Teclado ---
const keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- Mapa ---
const mapWidth = 3000;
const mapHeight = 3000;

// --- Árvores ---
const treeImg = new Image();
treeImg.src = "tree.png"; // PNG transparente
let trees = []; // começa vazio, será preenchido pelo servidor

// --- Recebe estado inicial do mundo ---
socket.on("worldState", data => {
    trees = data.trees || [];
    worldPlayers = data.worldPlayers || {};
});

// --- Atualização dos jogadores ---
socket.on("worldPlayersUpdate", data => {
    worldPlayers = data;
});

// --- Colisão com mapa e árvores ---
function checkCollision(newX, newY) {
    // Bordas do mapa
    if (newX < 0 || newX + player.width > mapWidth) return true;
    if (newY < 0 || newY + player.height > mapHeight) return true;

    // Árvores
    for (let t of (trees || [])) {
        if (newX + player.width > t.x && newX < t.x + t.width &&
            newY + player.height > t.y && newY < t.y + t.height) {
            return true;
        }
    }

    return false;
}

// --- Atualização local ---
function update() {
    let speed = 5;
    let newX = player.x;
    let newY = player.y;

    if (keys["w"]) newY -= speed;
    if (keys["s"]) newY += speed;
    if (keys["a"]) newX -= speed;
    if (keys["d"]) newX += speed;

    if (!checkCollision(newX, newY)) {
        player.x = newX;
        player.y = newY;
    }

    // Envia posição para o servidor
    socket.emit("playerMove", player);
}

// --- Desenhar tudo ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Câmera centralizada no jogador local
    const offsetX = player.x - canvas.width / 2;
    const offsetY = player.y - canvas.height / 2;

    // Chão verde
    ctx.fillStyle = "#2c8c2c";
    ctx.fillRect(-offsetX, -offsetY, mapWidth, mapHeight);

    // Árvores
    for (let t of (trees || [])) {
        ctx.drawImage(treeImg, t.x - offsetX, t.y - offsetY, 60, 80);
    }

    // Jogadores
    for (let id in worldPlayers) {
        let p = worldPlayers[id];
        ctx.fillStyle = (id === socket.id) ? "blue" : "red";
        ctx.fillRect(p.x - offsetX, p.y - offsetY, player.width, player.height);
        ctx.fillStyle = "white";
        ctx.fillText(p.name || "Player", p.x - offsetX - 15, p.y - offsetY - 10);
    }
}

// --- Loop do jogo ---
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// --- Começa o jogo ---
gameLoop();
