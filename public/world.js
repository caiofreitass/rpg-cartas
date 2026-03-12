// configurações
const NUM_TREES = 50
const NUM_HOUSES = 3

// imagens
const treeImg = new Image()
treeImg.src = "/images/tree.png"

const villageImg = new Image()
villageImg.src = "/images/vila.png"

// --- Arvores ---
let trees = []
for(let i=0;i<NUM_TREES;i++){
    trees.push({
        x: Math.random()*1800+100,
        y: Math.random()*1800+100,
        width: 60,
        height: 80
    })
}

// --- Vilas ---
let villages = []
for(let i=0;i<NUM_HOUSES;i++){
    const w = 200
    const h = 150
    villages.push({
        x: Math.random()*(2000-w),
        y: Math.random()*(2000-h),
        width: w,
        height: h
    })
}

// função update
function update(){
    let speed = 5
    if(keys["w"]) player.y -= speed
    if(keys["s"]) player.y += speed
    if(keys["a"]) player.x -= speed
    if(keys["d"]) player.x += speed

    // colisão mapa (2000x2000)
    if(player.x < 0) player.x = 0
    if(player.y < 0) player.y = 0
    if(player.x > 2000-30) player.x = 2000-30
    if(player.y > 2000-30) player.y = 2000-30

    // colisão com árvores
    for(let t of trees){
        if(player.x+30 > t.x && player.x < t.x+t.width &&
           player.y+30 > t.y && player.y < t.y+t.height){
               // simples: trava jogador
               if(keys["w"]) player.y += speed
               if(keys["s"]) player.y -= speed
               if(keys["a"]) player.x += speed
               if(keys["d"]) player.x -= speed
           }
    }

    // colisão com porta das vilas
    for(let v of villages){
        const door = {
            x: v.x + v.width/2 - 20, // porta central embaixo
            y: v.y + v.height - 30,
            width: 40,
            height: 30
        }
        if(player.x + 30 > door.x && player.x < door.x + door.width &&
           player.y + 30 > door.y && player.y < door.y + door.height){
            window.location.href = "house.html"
        }
    }

    // envia posição para o servidor
    socket.emit("playerMove", player)
}

// função draw
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height)

    const offsetX = player.x - canvas.width/2
    const offsetY = player.y - canvas.height/2

    // chão verde
    ctx.fillStyle = "#3cb043"
    ctx.fillRect(-offsetX, -offsetY, 2000, 2000)

    // desenha árvores
    for(let t of trees){
        ctx.drawImage(treeImg, t.x - offsetX, t.y - offsetY, t.width, t.height)
    }

    // desenha vilas
    for(let v of villages){
        ctx.drawImage(villageImg, v.x - offsetX, v.y - offsetY, v.width, v.height)
    }

    // jogadores
    for(let id in worldPlayers){
        let p = worldPlayers[id]
        ctx.fillStyle = (id === socket.id) ? "blue" : "red"
        ctx.fillRect(p.x - offsetX, p.y - offsetY, 30, 30)
        ctx.fillStyle = "white"
        ctx.fillText(p.name || "Player", p.x - offsetX - 15, p.y - offsetY - 10)
    }
}
