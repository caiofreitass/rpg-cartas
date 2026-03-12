const socket = io()

// jogador local
let player = { x: 400, y: 400, width:30, height:30, name:"Eu" }

// outros jogadores
let housePlayers = {}

// porta de saída
const door = { x: 370, y: 480, width:60, height:20 }

// canvas
const canvas = document.getElementById("houseCanvas")
const ctx = canvas.getContext("2d")

// teclado
const keys = {}
document.addEventListener("keydown", e => keys[e.key] = true)
document.addEventListener("keyup", e => keys[e.key] = false)

// envia posição do jogador local pro servidor
function sendPosition(){
    socket.emit("houseMove", player)
}

// recebe posição de todos jogadores do servidor
socket.on("housePlayersUpdate", (data) => {
    housePlayers = data
})

// update do jogador
function update(){
    let speed = 5
    let newX = player.x
    let newY = player.y
    if(keys["w"]) newY -= speed
    if(keys["s"]) newY += speed
    if(keys["a"]) newX -= speed
    if(keys["d"]) newX += speed

    // colisão com bordas
    if(newX >=0 && newX + player.width <= canvas.width) player.x = newX
    if(newY >=0 && newY + player.height <= canvas.height) player.y = newY

    // porta de saída
    if(player.x + player.width > door.x &&
       player.x < door.x + door.width &&
       player.y + player.height > door.y &&
       player.y < door.y + door.height){
        window.location.href = "world.html"
    }

    sendPosition()
}

// desenha todos jogadores
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height)

    // chão azul
    ctx.fillStyle = "#0000aa"
    ctx.fillRect(0,0,canvas.width,canvas.height)

    // parede preta
    ctx.strokeStyle = "black"
    ctx.lineWidth = 20
    ctx.strokeRect(0,0,canvas.width,canvas.height)

    // porta
    ctx.fillStyle = "brown"
    ctx.fillRect(door.x, door.y, door.width, door.height)

    // jogadores
    for(let id in housePlayers){
        let p = housePlayers[id]
        ctx.fillStyle = (id === socket.id) ? "blue" : "red"
        ctx.fillRect(p.x, p.y, p.width, p.height)
        ctx.fillStyle = "white"
        ctx.fillText(p.name || "Player", p.x - 10, p.y - 5)
    }
}

// loop do jogo
function loop(){
    update()
    draw()
    requestAnimationFrame(loop)
}
loop()
