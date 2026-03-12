const socket = io()

// jogador local
let player = { x: 400, y: 400, name: "Eu" }

// multiplayer dentro da casa
let housePlayers = {}

// canvas
let canvas = document.getElementById("houseCanvas")
let ctx = canvas.getContext("2d")

// teclado
const keys = {}
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)

// recebe posição de todos jogadores do servidor
socket.on("housePlayersUpdate", (data) => {
    housePlayers = data
})

// atualização local
function update() {
    let speed = 5
    let nextX = player.x
    let nextY = player.y

    if(keys["w"]) nextY -= speed
    if(keys["s"]) nextY += speed
    if(keys["a"]) nextX -= speed
    if(keys["d"]) nextX += speed

    if(!checkCollision(nextX, nextY)) {
        player.x = nextX
        player.y = nextY
    }

    // detecta porta de saída (parte de baixo da casa)
    if(player.y >= 460){
        // salva posição para retornar um pouco à frente
        localStorage.setItem("returnX", player.x)
        localStorage.setItem("returnY", player.y + 50)
        window.location.href = "world.html"
    }

    // envia posição para o servidor
    socket.emit("houseMove", player)
}

// desenha todos jogadores
function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height)

    // chão azul
    ctx.fillStyle = "blue"
    ctx.fillRect(0,0,canvas.width,canvas.height)

    // paredes pretas
    ctx.fillStyle = "black"
    ctx.fillRect(0,0,10,500)    // esquerda
    ctx.fillRect(790,0,10,500)  // direita
    ctx.fillRect(0,0,800,10)    // topo
    ctx.fillRect(0,0,800,500)   // base

    // jogadores (local + outros)
    for(let id in housePlayers){
        let p = housePlayers[id]
        ctx.fillStyle = (id === socket.id) ? "green" : "red"
        ctx.fillRect(p.x - 15, p.y - 15, 30, 30)
        ctx.fillStyle = "white"
        ctx.fillText(p.name || "Player", p.x - 15, p.y - 20)
    }
}

// loop do jogo
function gameLoop() {
    update()
    draw()
    requestAnimationFrame(gameLoop)
}

gameLoop()

// --- função de colisão (paredes internas) ---
function checkCollision(x, y){
    const padding = 10
    if(x < padding) return true
    if(x > 770) return true
    if(y < padding) return true
    if(y > 470) return true
    return false
}
