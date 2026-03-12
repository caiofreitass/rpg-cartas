const socket = io()

// jogador local
let player = { x: 200, y: 200, name: "Eu" }

// outros jogadores
let worldPlayers = {}

// canvas
let canvas = document.getElementById("worldCanvas")
let ctx = canvas.getContext("2d")

// teclado
const keys = {}
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)

// recebe posição de todos jogadores do servidor
socket.on("worldPlayersUpdate", (data) => {
    worldPlayers = data
})

// atualização local
function update() {
    let speed = 5
    if(keys["w"]) player.y -= speed
    if(keys["s"]) player.y += speed
    if(keys["a"]) player.x -= speed
    if(keys["d"]) player.x += speed

    // envia posição para o servidor
    socket.emit("playerMove", player)
}

// desenha todos jogadores
function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height)

    // câmera centralizada no jogador local
    const offsetX = player.x - canvas.width/2
    const offsetY = player.y - canvas.height/2

    // mapa simples
    ctx.fillStyle = "#444"
    ctx.fillRect(-offsetX, -offsetY, 2000, 2000)

    // jogadores
    for(let id in worldPlayers){
        let p = worldPlayers[id]
        ctx.fillStyle = (id === socket.id) ? "blue" : "red"
        ctx.fillRect(p.x - offsetX, p.y - offsetY, 30, 30)
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
