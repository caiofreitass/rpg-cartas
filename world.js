const btnWorld = document.getElementById("btnWorld")
const worldScreen = document.getElementById("world")

btnWorld.onclick = () => {

 document.querySelectorAll(".screen").forEach(s=>{
   s.style.display="none"
 })

 worldScreen.style.display="flex"

 startWorld()

}

const canvas = document.getElementById("worldCanvas")
const ctx = canvas.getContext("2d")

let player = {x:100,y:100}

function startWorld(){
 draw()
}

function draw(){

 ctx.clearRect(0,0,canvas.width,canvas.height)

 ctx.fillStyle="green"
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
