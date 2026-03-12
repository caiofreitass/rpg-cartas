const socket = io();

// Jogador local
let player = { x: 400, y: 400, width: 30, height: 30 };

// Canvas
let canvas = document.getElementById("houseCanvas");
let ctx = canvas.getContext("2d");

// Teclado
const keys = {};
document.addEventListener("keydown", e => keys[e.key] = true);
document.addEventListener("keyup", e => keys[e.key] = false);

// Paredes da casa (x, y, largura, altura)
const walls = [
    { x: 0, y: 0, width: 800, height: 20 },  // topo
    { x: 0, y: 480, width: 800, height: 20 }, // fundo
    { x: 0, y: 0, width: 20, height: 500 }, // esquerda
    { x: 780, y: 0, width: 20, height: 500 } // direita
];

// Porta de saída (centro da parede inferior)
const door = { x: 380, y: 480, width: 40, height: 20 };

// Função para colisão retângulo
function checkCollision(a, b) {
    return !(a.x + a.width < b.x || a.x > b.x + b.width ||
             a.y + a.height < b.y || a.y > b.y + b.height);
}

// Atualização do jogador
function update() {
    let speed = 5;
    let nextPos = { ...player };

    if(keys["w"]) nextPos.y -= speed;
    if(keys["s"]) nextPos.y += speed;
    if(keys["a"]) nextPos.x -= speed;
    if(keys["d"]) nextPos.x += speed;

    // Checa colisão com paredes
    let collided = walls.some(wall => checkCollision(nextPos, wall));
    if(!collided) player = nextPos;

    // Checa colisão com porta (saida)
    if(checkCollision(player, door)) {
        window.location.href = "world.html"; // volta para o mundo
    }

    // Envia posição para servidor se quiser multiplayer dentro da casa
    // socket.emit("playerMoveInHouse", player);
}

// Desenhar a casa
function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // chão (já azul pelo background)
    
    // paredes
    ctx.fillStyle = "black";
    walls.forEach(wall => ctx.fillRect(wall.x, wall.y, wall.width, wall.height));

    // porta
    ctx.fillStyle = "brown";
    ctx.fillRect(door.x, door.y, door.width, door.height);

    // jogador
    ctx.fillStyle = "blue";
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

// Loop
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
