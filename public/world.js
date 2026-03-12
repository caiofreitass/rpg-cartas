const socket = io();

// --- Canvas ---
const canvas = document.getElementById("worldCanvas");
const ctx = canvas.getContext("2d");

// --- Player local (com classe) ---
const playerClass = localStorage.getItem("playerClass") || "humano";
const playerImg = new Image();
playerImg.src = `./${playerClass}.png`; // ou "./images/${playerClass}.png" se usar pasta images

let player = {
  x: 200,
  y: 200,
  width: 48,
  height: 48,
  name: "Eu",
  direction: "right",
  class: playerClass
};

// --- Outros jogadores ---
let worldPlayers = {};

// --- Árvores ---
const treeImg = new Image();
treeImg.src = "tree.png";
let trees = [];

// --- Teclado ---
const keys = {};
document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// --- Mapa ---
const mapWidth = 3000;
const mapHeight = 3000;

// --- Movimentar e enviar pro servidor ---
function movePlayer() {
  let speed = 5;
  let newX = player.x;
  let newY = player.y;

  if (keys["w"]) newY -= speed;
  if (keys["s"]) newY += speed;
  if (keys["a"]) { newX -= speed; player.direction = "left"; }
  if (keys["d"]) { newX += speed; player.direction = "right"; }

  if (!checkCollision(newX, newY)) {
    player.x = newX;
    player.y = newY;
  }

  // envia para o servidor, incluindo a classe
  socket.emit("playerMove", {
    x: player.x,
    y: player.y,
    direction: player.direction,
    class: player.class  // <-- importante, sua classe/skin
  });
}

function checkCollision(newX, newY) {
  if (newX < 0 || newX + player.width > mapWidth) return true;
  if (newY < 0 || newY + player.height > mapHeight) return true;

  for (let t of trees) {
    if (newX + player.width > t.x && newX < t.x + t.width &&
        newY + player.height > t.y && newY < t.y + t.height) {
      return true;
    }
  }

  return false;
}

// --- Desenhar jogador com espelhamento ---
function drawPlayer(px, py, pImg, pDir) {
  ctx.save();
  if (pDir === "left") {
    ctx.translate(px + player.width / 2, py + player.height / 2);
    ctx.scale(-1, 1);
    ctx.drawImage(pImg, -player.width / 2, -player.height / 2, player.width, player.height);
  } else {
    ctx.drawImage(pImg, px, py, player.width, player.height);
  }
  ctx.restore();
}

// --- Desenhar mundo ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const offsetX = player.x - canvas.width / 2;
  const offsetY = player.y - canvas.height / 2;

  // chão
  ctx.fillStyle = "#2c8c2c";
  ctx.fillRect(-offsetX, -offsetY, mapWidth, mapHeight);

  // árvores
  for (let t of trees) {
    ctx.drawImage(treeImg, t.x - offsetX, t.y - offsetY, 60, 80);
  }

  // todos os jogadores
  for (let id in worldPlayers) {
  let p = worldPlayers[id];

  // usar a imagem já carregada para o jogador local
  let imgToDraw = (id === socket.id) ? playerImg : new Image();
  if (id !== socket.id) imgToDraw.src = `./${p.class || "humano"}.png`;

  drawPlayer(p.x - offsetX, p.y - offsetY, imgToDraw, p.direction || "right");
  ctx.fillStyle = "white";
  ctx.fillText(p.name || "Player", p.x - offsetX - 15, p.y - offsetY - 10);
}
}

// --- socket.io ---
socket.on("worldState", data => {
  trees = data.trees || [];
  worldPlayers = data.worldPlayers || {};
});

socket.on("worldPlayersUpdate", data => {
  worldPlayers = data;
});

// --- loop ---
function gameLoop() {
  movePlayer();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
