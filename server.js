const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let players = {};
let turnOrder = [];
let currentTurnIndex = 0;

// Validação de classe
const classesList = ["Lobisomem", "Vampiro", "Bruxa"];

// Criar jogador com classe escolhida
function createPlayer(id, chosenClass) {
  const classe = classesList.includes(chosenClass) ? chosenClass : classesList[Math.floor(Math.random() * classesList.length)];
  let hp = 20;
  if(classe === "Lobisomem") hp = 25;
  if(classe === "Vampiro") hp = 20;
  if(classe === "Bruxa") hp = 18;

  return {
    id,
    name: `Player-${id.substring(0,4)}`,
    classe,
    hp,
    alive: true,
    effects: {} // buffs/debuffs temporários
  };
}

// Habilidades por classe (mesmo do anterior)
function playAbility(player, targetId, abilityIndex) {
  if(!player.alive) return "Você está morto!";
  if(!targetId || !players[targetId]?.alive) return "Nenhum alvo válido!";
  const target = players[targetId];

  let msg = "";

  if(player.classe === "Lobisomem") {
    switch(abilityIndex) {
      case 1: target.hp-=10; msg=`${player.name} usa Ataque Selvagem em ${target.name}, causando 10 de dano!`; break;
      case 2: target.hp-=6; target.effects.bleed=1; msg=`${player.name} usa Garras Rasgantes em ${target.name}, causando 6 de dano e sangramento!`; break;
      case 3: target.hp-=8; msg=`${player.name} usa Investida em ${target.name}, causando 8 de dano!`; break;
      case 4: target.effects.weaken=1; msg=`${player.name} usa Uivo Assustador em ${target.name}, reduzindo ataque no próximo turno!`; break;
      case 5: player.hp+=5; msg=`${player.name} usa Regeneração e recupera 5 HP!`; break;
      default: msg="Habilidade inválida!"; break;
    }
  }

  if(player.classe === "Vampiro") {
    switch(abilityIndex) {
      case 1: let dmg=Math.floor(Math.random()*6)+4; target.hp-=dmg; player.hp+=Math.floor(dmg/2); msg=`${player.name} usa Suga Vida em ${target.name}, causando ${dmg} de dano e recuperando ${Math.floor(dmg/2)} HP!`; break;
      case 2: target.hp-=6; player.effects.extraTurn=1; msg=`${player.name} usa Investida Noturna em ${target.name}, causando 6 de dano e ganhará turno extra!`; break;
      case 3: target.effects.skip=1; msg=`${player.name} usa Encanto em ${target.name}, fazendo ele perder o próximo turno!`; break;
      case 4: target.hp-=12; player.hp-=2; msg=`${player.name} usa Mordida Vampírica em ${target.name}, causando 12 de dano e recebe 2 de recuo!`; break;
      case 5: player.effects.defense=1; msg=`${player.name} usa Neblina Sombria, aumentando defesa até o próximo turno!`; break;
      default: msg="Habilidade inválida!"; break;
    }
  }

  if(player.classe === "Bruxa") {
    switch(abilityIndex) {
      case 1: target.hp-=7; msg=`${player.name} usa Bola de Fogo em ${target.name}, causando 7 de dano!`; break;
      case 2: target.hp-=5; target.effects.skip=1; msg=`${player.name} usa Raio Congelante em ${target.name}, causando 5 de dano e impedindo ação no próximo turno!`; break;
      case 3: target.effects.vulnerable=1; msg=`${player.name} usa Maldição em ${target.name}, aumentando dano recebido no próximo turno!`; break;
      case 4: player.hp+=12; msg=`${player.name} usa Poção Curativa, recuperando 12 HP!`; break;
      case 5: target.effects.poison=2; msg=`${player.name} usa Espinho Venenoso em ${target.name}, causando dano contínuo por 2 turnos!`; break;
      default: msg="Habilidade inválida!"; break;
    }
  }

  return msg;
}

// Próximo turno pulando mortos
function nextTurn() {
  if(turnOrder.length===0) return;
  let loops=0;
  do {
    currentTurnIndex=(currentTurnIndex+1)%turnOrder.length;
    loops++;
    if(loops>turnOrder.length) return;
  } while(!players[turnOrder[currentTurnIndex]]?.alive || players[turnOrder[currentTurnIndex]]?.effects?.skip);

  // Efeitos contínuos
  let p = players[turnOrder[currentTurnIndex]];
  if(p.effects.poison){ p.hp-=2; p.effects.poison--; io.emit("message",`${p.name} sofre 2 de dano de veneno!`);}
  if(p.effects.bleed){ p.hp-=2; p.effects.bleed--; io.emit("message",`${p.name} sofre 2 de dano de sangramento!`);}
  if(p.effects.skip){ delete p.effects.skip; io.emit("message",`${p.name} perde turno por efeito!`); nextTurn(); return;}

  io.emit("turnChanged", turnOrder[currentTurnIndex]);
}

io.on("connection",(socket)=>{
  console.log("Novo jogador:", socket.id);

  // Espera o cliente enviar classe escolhida
  socket.emit("chooseClass", classesList);

  socket.on("setClass",(chosenClass)=>{
    players[socket.id]=createPlayer(socket.id,chosenClass);
    turnOrder.push(socket.id);
    socket.emit("init",{id:socket.id,players,currentTurn:turnOrder[currentTurnIndex]});
    io.emit("updatePlayers",players);
  });

  socket.on("setName",(name)=>{
    if(players[socket.id]){
      players[socket.id].name=name;
      io.emit("updatePlayers",players);
    }
  });

  socket.on("playAbility",(data)=>{
    const {targetId, abilityIndex}=data;
    const player=players[socket.id];
    if(!player||!player.alive) return;
    if(turnOrder[currentTurnIndex]!==socket.id) return;

    const msg=playAbility(player,targetId,abilityIndex);

    // Verificar mortos
    for(let id in players){
      if(players[id].hp<=0 && players[id].alive){
        players[id].alive=false;
        players[id].hp=0;
        io.emit("message",`${players[id].name} morreu!`);
      }
    }

    io.emit("message",msg);
    io.emit("updatePlayers",players);
    nextTurn();
  });

  socket.on("disconnect",()=>{
    console.log("Jogador saiu:", socket.id);
    const wasCurrent=(turnOrder[currentTurnIndex]===socket.id);
    delete players[socket.id];
    turnOrder=turnOrder.filter(id=>id!==socket.id);

    if(turnOrder.length===0) return;
    if(wasCurrent) nextTurn();
    else if(currentTurnIndex>=turnOrder.length){
      currentTurnIndex=0;
      io.emit("turnChanged",turnOrder[currentTurnIndex]);
    }

    io.emit("updatePlayers",players);
  });
});

server.listen(3000,()=>console.log("Servidor rodando em http://localhost:3000"));
