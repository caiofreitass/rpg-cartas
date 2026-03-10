const btnWorld = document.getElementById("btnWorld")
const worldScreen = document.getElementById("world")

let canvas
let canvas
let ctx

let player = {
x:200,
y:200
}

function startWorld(){

canvas = document.getElementById("canvas")
ctx = canvas.getContext("2d")

document.addEventListener("keydown", move)

gameLoop()

}

function move(e){

if(e.key=="w") player.y -= 5
if(e.key=="s") player.y += 5
if(e.key=="a") player.x -= 5
if(e.key=="d") player.x += 5

}

function draw(){

ctx.fillStyle = "#2e7d32"
ctx.fillRect(0,0,canvas.width,canvas.height)

ctx.fillStyle = "red"
ctx.fillRect(player.x,player.y,20,20)

}

function gameLoop(){

draw()
requestAnimationFrame(gameLoop)

}
