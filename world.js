// world.js - lógica do mundo
let canvas
let ctx

// Player
let player = {
  x: 200,
  y: 200,
  width: 20,
  height: 20,
  speed: 5
}

// Inicializa o mundo
function startWorld() {
  canvas = document.getElementById("canvas")
  ctx = canvas.getContext("2d")

  // Adiciona os controles
  document.addEventListener("keydown", move)

  // Inicia o loop de jogo
  gameLoop()
}

// Função de movimento
function move(e) {
  if (e.key === "w") player.y -= player.speed
  if (e.key === "s") player.y += player.speed
  if (e.key === "a") player.x -= player.speed
  if (e.key === "d") player.x += player.speed

  // Limita player dentro do canvas
  if (player.x < 0) player.x = 0
  if (player.y < 0) player.y = 0
  if (player.x + player.width > canvas.width) player.x = canvas.width - player.width
  if (player.y + player.height > canvas.height) player.y = canvas.height - player.height
}

// Desenha o mundo
function draw() {
  // Fundo
  ctx.fillStyle = "#2e7d32"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Player
  ctx.fillStyle = "red"
  ctx.fillRect(player.x, player.y, player.width, player.height)
}

// Loop principal
function gameLoop() {
  draw()
  requestAnimationFrame(gameLoop)
}

// Inicia o mundo automaticamente
startWorld()ctx.fillStyle = "red"
ctx.fillRect(player.x,player.y,20,20)

}

function gameLoop(){

draw()
requestAnimationFrame(gameLoop)

}
