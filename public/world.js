const socket = io()

let canvas = document.getElementById("worldCanvas")
let ctx = canvas.getContext("2d")

let player = {x:200,y:200}

document.addEventListener("keydown", e => {

if(e.key=="w") player.y-=5
if(e.key=="s") player.y+=5
if(e.key=="a") player.x-=5
if(e.key=="d") player.x+=5

})

function loop(){

ctx.clearRect(0,0,canvas.width,canvas.height)

ctx.fillStyle="cyan"
ctx.fillRect(player.x,player.y,20,20)

requestAnimationFrame(loop)

}

loop()
