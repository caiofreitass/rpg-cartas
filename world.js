const btnWorld = document.getElementById("btnWorld")
const worldScreen = document.getElementById("world")

let canvas
let ctx

let player = {
x:100,
y:100,
speed:10
}

function startWorld(){

canvas = document.getElementById("canvas")
ctx = canvas.getContext("2d")

gameLoop()

}

function gameLoop(){

draw()

requestAnimationFrame(gameLoop)

}

function draw(){

ctx.fillStyle="#2e7d32"
ctx.fillRect(0,0,canvas.width,canvas.height)

ctx.fillStyle="red"
ctx.fillRect(player.x,player.y,20,20)

}

document.addEventListener("keydown",(e)=>{

if(e.key=="w") player.y-=player.speed
if(e.key=="s") player.y+=player.speed
if(e.key=="a") player.x-=player.speed
if(e.key=="d") player.x+=player.speed

draw()

})
