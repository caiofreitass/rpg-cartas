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

// Reinício
let restartVotes = {};

// Classes e habilidades balanceadas
const classes = {
  "Lobisomem": [
    { name: "Ataque Selvagem", type: "atk", value: 8 },
    { name: "Garras Rasgantes", type: "atk", value: 7 },
    { name: "Investida", type: "atk", value: 6 },
    { name: "Uivo Assustador", type: "buff", value: 2 },
    { name: "Regeneração", type: "heal", value: 5 }
  ],
  "Vampiro": [
    { name: "Suga Vida", type: "atk", value: 9 },
    { name: "Investida Noturna", type: "atk", value: 8 },
    { name: "Encanto", type: "buff", value: 2 },
    { name: "Mordida Vampírica", type: "atk", value: 7 },
    { name: "Neblina Sombria", type: "heal", value: 6 }
  ],
  "Bruxa": [
    { name: "Bola de Fogo", type: "atk", value: 6 },
    { name: "Raio Congelante", type: "atk", value: 5 },
    { name: "Maldição", type: "buff", value: 2 },
    { name: "Poção Curativa", type: "heal", value: 10 },
    { name: "Espinho Venenoso", type: "atk", value: 7 }
  ]
};

const initialHP = {
  "Lobisomem": 70,
  "Vampiro": 60,
  "Bruxa": 50
};

function nextTurn() {
  if(turnOrder.length === 0) return;
  do {
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
  } while(!players[turnOrder[currentTurnIndex]]?.alive);
  io.emit("turnChanged", turnOrder[currentTurnIndex]);
}

function resetGame() {
  for (let id in players) {
    const p = players[id];
    if(p.classe){
      p.hp = initialHP[p.classe];
      p.alive = true;
    }
  }
  currentTurnIndex = 0;
  restartVotes = {};
  io.emit("updatePlayers", players);
  io.emit("gameRestarted");
  io.emit("turnChanged", turnOrder[currentTurnIndex]);
}

io.on("connection", (socket) => {
  console.log("Novo jogador:", socket.id);

  players[socket.id] = {
    id: socket.id,
    name: "Jogador",
    classe: null,
    hp: 0,
    alive: true
  };
  turnOrder.push(socket.id);

  // Envia classes para o client
  socket.emit("classesData", classes);

  // Inicializa player
  socket.emit("init", { id: socket.id, players, currentTurn: turnOrder[currentTurnIndex] });

  // Pergunta classe ao jogador
  socket.emit("chooseClass", Object.keys(classes));

  // Recebe classe escolhida
  socket.on("setClass", (classe) => {
    if(classes[classe]){
      players[socket.id].classe = classe;
      players[socket.id].hp = initialHP[classe];
      io.emit("updatePlayers", players);
    }
  });

  // Recebe nome do jogador
  socket.on("setName", (name)=>{
    players[socket.id].name = name || "Jogador";
    io.emit("updatePlayers", players);
  });

  // Jogar habilidade
  socket.on("playAbility", ({ targetId, abilityIndex }) => {
    const player = players[socket.id];
    if(!player.alive) return;
    if(turnOrder[currentTurnIndex] !== socket.id) return;
    const target = players[targetId];
    if(!target || !target.alive) return;

    const ability = classes[player.classe][abilityIndex-1];
    if(!ability) return;

    if(ability.type === "atk"){
      target.hp -= ability.value;
      if(target.hp <= 0){
        target.hp = 0;
        target.alive = false;
        io.emit("message", `${target.name} morreu!`);
      }
      io.emit("message", `${player.name} atacou ${target.name} com ${ability.name} causando ${ability.value} de dano!`);
    } else if(ability.type === "heal"){
      player.hp += ability.value;
      io.emit("message", `${player.name} usou ${ability.name} e recuperou ${ability.value} HP!`);
    } else if(ability.type === "buff"){
      io.emit("message", `${player.name} usou ${ability.name} e se fortaleceu!`);
    }

    io.emit("updatePlayers", players);
    nextTurn();
  });

  // Chat global
  socket.on("chatMessage", (msg) => {
    if(!msg) return;
    io.emit("message", `${players[socket.id].name}: ${msg}`);
  });

  // Voto para reiniciar
  socket.on("restartVote", () => {
    restartVotes[socket.id] = true;
    const totalPlayers = Object.keys(players).length;
    const votes = Object.keys(restartVotes).length;
    io.emit("restartVotes", { votes, totalPlayers });
    if(votes === totalPlayers){
      resetGame();
    }
  });

  // Desconexão
  socket.on("disconnect", () => {
    console.log("Jogador saiu:", socket.id);
    delete players[socket.id];
    turnOrder = turnOrder.filter(id => id !== socket.id);
    delete restartVotes[socket.id];
    if(currentTurnIndex >= turnOrder.length) currentTurnIndex = 0;
    io.emit("updatePlayers", players);
    if(turnOrder.length>0) io.emit("turnChanged", turnOrder[currentTurnIndex]);
  });
});

// Porta dinâmica para Render
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
