const socket = io()

// jogador local
let player = { x: 200, y: 200, name: "Eu", width: 30, height: 30 }

// outros jogadores
let worldPlayers = {}

// canvas
let canvas = document.getElementById("worldCanvas")
let ctx = canvas.getContext("2d")

// teclado
const keys = {}
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)

// mapa
const mapWidth = 3000
const mapHeight = 3000

// árvores
const treeImg = new Image()
treeImg.src = "tree.png" // PNG com fundo transparente
let trees = []

// função para gerar árvores aleatórias
function generateTrees(qty = 50) {
    trees = []
    for(let i=0;i<qty;i++){
        const x = Math.random() * (mapWidth - 60) + 30
        const y = Math.random() * (mapHeight - 60) + 30
        trees.push({ x, y, width: 40, height: 60 }) // hitbox menor que imagem
    }
}

// gerar 50 árvores por padrão
generateTrees(50)

// recebe posição de todos jogadores do servidor
socket.on("worldPlayersUpdate", (data) => {
    worldPlayers = data
})

// colisão com mapa e árvores
function checkCollision(newX, newY) {
    // bordas do mapa
    if(newX < 0 || newX + player.width > mapWidth) return true
    if(newY < 0 || newY + player.height > mapHeight) return true

    // árvores
    for(let t of trees){
        if(newX + player.width > t.x && newX < t.x + t.width &&
           newY + player.height > t.y && newY < t.y + t.height){
            return true
        }
    }
    return false
}

// atualização local
function update() {
    let speed = 5
    let newX = player.x
    let newY = player.y

    if(keys["w"]) newY -= speed
    if(keys["s"]) newY += speed
    if(keys["a"]) newX -= speed
    if(keys["d"]) newX += speed

    if(!checkCollision(newX, newY)){
        player.x = newX
        player.y = newY
    }

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
    ctx.fillStyle = "#2c8c2c"
    ctx.fillRect(-offsetX, -offsetY, mapWidth, mapHeight)

    // desenhar árvores
    for(let t of trees){
        ctx.drawImage(treeImg, t.x - offsetX, t.y - offsetY, 60, 80) // tamanho da imagem maior
        // ctx.strokeStyle = "red"; ctx.strokeRect(t.x - offsetX, t.y - offsetY, t.width, t.height) // opcional: ver hitbox
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

gameLoop()
