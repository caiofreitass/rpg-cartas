const socket = io()

// jogador local
let player = { x: 400, y: 400, name: "Eu", worldX: 0, worldY: 0 }

// recupera posição ao voltar da casa
const returnX = parseFloat(localStorage.getItem("returnX"))
const returnY = parseFloat(localStorage.getItem("returnY"))
if (!isNaN(returnX) && !isNaN(returnY)) {
  player.x = returnX + 20
  player.y = returnY
  localStorage.removeItem("returnX")
  localStorage.removeItem("returnY")
}

// multiplayer
let worldPlayers = {}

// canvas
let canvas = document.getElementById("worldCanvas")
let ctx = canvas.getContext("2d")

// teclado
const keys = {}
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)

// configurações
const MAP_SIZE = 2000
const NUM_TREES = 50
const NUM_HOUSES = 3

// imagens
const treeImg = new Image()
treeImg.src = "/images/tree.png"

const villageImg = new Image()
villageImg.src = "/images/vila.png"

let imagesLoaded = 0
const totalImages = 2

treeImg.onload = () => { imagesLoaded++; startGameIfReady() }
villageImg.onload = () => { imagesLoaded++; startGameIfReady() }

function startGameIfReady() {
  if (imagesLoaded === totalImages) {
    gameLoop()
  }
}

// cria árvores
let trees = []
for (let i = 0; i < NUM_TREES; i++) {
  trees.push({
    x: Math.random() * (MAP_SIZE - 100) + 50,
    y: Math.random() * (MAP_SIZE - 100) + 50,
    width: 60,
    height: 80
  })
}

// cria vilas
let villages = []
for (let i = 0; i < NUM_HOUSES; i++) {
  const w = 200
  const h = 150
  villages.push({
    x: Math.random() * (MAP_SIZE - w),
    y: Math.random() * (MAP_SIZE - h),
    width: w,
    height: h
  })
}

// recebe posição de todos os players
socket.on("worldPlayersUpdate", (data) => worldPlayers = data)

function update() {
  let speed = 5
  let nextX = player.x
  let nextY = player.y

  if (keys["w"]) nextY -= speed
  if (keys["s"]) nextY += speed
  if (keys["a"]) nextX -= speed
  if (keys["d"]) nextX += speed

  // colisão com bordas
  if (nextX < 0) nextX = 0
  if (nextY < 0) nextY = 0
  if (nextX > MAP_SIZE - 30) nextX = MAP_SIZE - 30
  if (nextY > MAP_SIZE - 30) nextY = MAP_SIZE - 30

  // colisão com árvores
  for (let t of trees) {
    if (nextX + 30 > t.x && nextX < t.x + t.width &&
        nextY + 30 > t.y && nextY < t.y + t.height) {
      if (keys["w"]) nextY += speed
      if (keys["s"]) nextY -= speed
      if (keys["a"]) nextX += speed
      if (keys["d"]) nextX -= speed
    }
  }

  player.x = nextX
  player.y = nextY

  // porta da vila → teleporte para casa
  for (let v of villages) {
    const door = {
      x: v.x + v.width/2 - 20,
      y: v.y + v.height - 30,
      width: 40,
      height: 30
    }
    if (player.x + 30 > door.x && player.x < door.x + door.width &&
        player.y + 30 > door.y && player.y < door.y + door.height) {

      localStorage.setItem("returnX", player.x)
      localStorage.setItem("returnY", player.y)

      window.location.href = "house.html"
    }
  }

  socket.emit("playerMove", player)
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const offsetX = player.x - canvas.width/2
  const offsetY = player.y - canvas.height/2

  // chão verde
  ctx.fillStyle = "#3cb043"
  ctx.fillRect(-offsetX, -offsetY, MAP_SIZE, MAP_SIZE)

  // árvores
  for (let t of trees) {
    if (treeImg.complete) {
      ctx.drawImage(treeImg, t.x - offsetX, t.y - offsetY, t.width, t.height)
    }
  }

  // vilas
  for (let v of villages) {
    if (villageImg.complete) {
      ctx.drawImage(villageImg, v.x - offsetX, v.y - offsetY, v.width, v.height)
    }
  }

  // outros jogadores
  for (let id in worldPlayers) {
    let p = worldPlayers[id]
    ctx.fillStyle = (id === socket.id) ? "blue" : "red"
    ctx.fillRect(p.x - offsetX, p.y - offsetY, 30, 30)
    ctx.fillStyle = "white"
    ctx.fillText(p.name || "Player", p.x - offsetX - 15, p.y - offsetY - 10)
  }
}

function gameLoop() {
  update()
  draw()
}
