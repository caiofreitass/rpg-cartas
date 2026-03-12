const socket = io()

// jogador local
let player = { x: 200, y: 200, name: "Eu", width: 30, height: 30 }

// outros jogadores
let worldPlayers = {}

// canvas
let canvas = document.getElementById("worldCanvas")
let ctx = canvas.getContext("2d")

// mapa
const mapWidth = 3000
const mapHeight = 3000

// chão verde
const groundColor = "#4CAF50"

// teclado
const keys = {}
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)

// árvores
const treeImg = new Image()
treeImg.src = "tree.png" // coloque tree.png na pasta public
const trees = [
    { x: 400, y: 400, width: 60, height: 80 },
    { x: 800, y: 700, width: 60, height: 80 },
    { x: 1500, y: 1200, width: 60, height: 80 },
    { x: 2000, y: 1800, width: 60, height: 80 }
]

// colisão AABB simples
function collides(a, b){
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y
}

// recebe posição de todos jogadores do servidor
socket.on("worldPlayersUpdate", (data) => {
    worldPlayers = data
})

// atualização local
function update() {
    let speed = 5
    let newX = player.x
    let newY = player.y

    if(keys["w"]) newY -= speed
    if(keys["s"]) newY += speed
    if(keys["a"]) newX -= speed
    if(keys["d"]) newX += speed

    // colisão com bordas do mapa
    if(newX < 0) newX = 0
    if(newY < 0) newY = 0
    if(newX + player.width > mapWidth) newX = mapWidth - player.width
    if(newY + player.height > mapHeight) newY = mapHeight - player.height

    // colisão com árvores
    for(let tree of trees){
        if(collides({x:newX, y:newY, width:player.width, height:player.height}, tree)){
            // simples: bloqueia movimento
            newX = player.x
            newY = player.y
            break
        }
    }

    player.x = newX
    player.y = newY

    // envia posição para o servidor
    socket.emit("playerMove", player)
}

// desenha todos jogadores
function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height)

    // câmera centralizada no jogador local
    const offsetX = player.x - canvas.width/2
    const offsetY = player.y - canvas.height/2

    // chão verde
    ctx.fillStyle = groundColor
    ctx.fillRect(-offsetX, -offsetY, mapWidth, mapHeight)

    // árvores
    for(let tree of trees){
        ctx.drawImage(treeImg, tree.x - offsetX, tree.y - offsetY, tree.width, tree.height)
    }

    // jogadores
    for(let id in worldPlayers){
        let p = worldPlayers[id]
        ctx.fillStyle = (id === socket.id) ? "blue" : "red"
        ctx.fillRect(p.x - offsetX, p.y - offsetY, player.width, player.height)
        ctx.fillStyle = "white"
        ctx.fillText(p.name || "Player", p.x - offsetX - 15, p.y - offsetY - 10)
    }
}

// loop do jogo
function gameLoop() {
    update()
    draw()
    requestAnimationFrame(gameLoop)
}

treeImg.onload = () => {
    gameLoop()
}
