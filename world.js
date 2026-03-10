const btnWorld = document.getElementById("btnWorld")
const worldScreen = document.getElementById("world")

let canvas
let ctx

let player = {x:100,y:100}

function startWorld(){

canvas = document.getElementById("worldCanvas")
ctx = canvas.getContext("2d")

draw()

}

function draw(){

ctx.fillStyle="#2e7d32"
ctx.fillRect(0,0,canvas.width,canvas.height)

ctx.fillStyle="red"
ctx.fillRect(player.x,player.y,20,20)

}

document.addEventListener("keydown",e=>{

if(e.key=="w") player.y-=10
if(e.key=="s") player.y+=10
if(e.key=="a") player.x-=10
if(e.key=="d") player.x+=10

draw()


})
