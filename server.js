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
let restartVotes = {};

const classEmojis = {
  "Lobisomem": "🐺",
  "Vampiro": "🧛‍♂️",
  "Bruxa": "🧙‍♀️"
};

// Classes e habilidades balanceadas
const classes = {
  "Lobisomem": [
    { name: "Ataque Selvagem", type: "atk", value: 8 },
    { name: "Garras Rasgantes", type: "atk", value: 7 },
    { name: "Investida", type: "atk", value: 6 },
    { name: "Uivo Assustador", type: "buff", value: 0 },
    { name: "Regeneração", type: "heal", value: 5 }
  ],
  "Vampiro": [
    { name: "Suga Vida", type: "atk", value: 9 },
    { name: "Investida Noturna", type: "atk", value: 8 },
    { name: "Encanto", type: "buff", value: 3 },
    { name: "Mordida Vampírica", type: "atk", value: 7 },
    { name: "Neblina Sombria", type: "heal", value: 6 }
  ],
  "Bruxa": [
    { name: "Bola de Fogo", type: "atk", value: 6 },
    { name: "Raio Congelante", type: "atk", value: 5 },
    { name: "Maldição", type: "buff", value: 0 },
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
  if (turnOrder.length === 0) return;
  do {
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
  } while (!players[turnOrder[currentTurnIndex]]?.alive);

  io.emit("turnChanged", turnOrder[currentTurnIndex]);

  // Reduz duração dos buffs
  for (const id in players) {
    const p = players[id];
    if (!p.buffs) continue;
    p.buffs = p.buffs.filter(b => {
      b.remaining--;
      return b.remaining > 0;
    });
  }
}

function resetGame() {
  for (let id in players) {
    const p = players[id];
    if (p.classe) {
      p.hp = initialHP[p.classe];
      p.alive = true;
      p.buffs = [];
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
    displayName: "Jogador",
    classe: null,
    hp: 0,
    alive: true,
    buffs: []
  };
  turnOrder.push(socket.id);

  socket.emit("classesData", classes);
  socket.emit("init", { id: socket.id, players, currentTurn: turnOrder[currentTurnIndex] });
  socket.emit("chooseClass", Object.keys(classes));

  socket.on("setClass", (classe) => {
    if (classes[classe]) {
      players[socket.id].classe = classe;
      players[socket.id].hp = initialHP[classe];
      const emoji = classEmojis[classe] || "";
      players[socket.id].displayName = `${emoji} ${players[socket.id].name}`;
      io.emit("updatePlayers", players);
    }
  });

  socket.on("setName", (name) => {
    players[socket.id].name = name || "Jogador";
    if (players[socket.id].classe) {
      const emoji = classEmojis[players[socket.id].classe] || "";
      players[socket.id].displayName = `${emoji} ${players[socket.id].name}`;
    } else {
      players[socket.id].displayName = players[socket.id].name;
    }
    io.emit("updatePlayers", players);
  });

  socket.on("playAbility", ({ targetId, abilityIndex }) => {
    const player = players[socket.id];
    if (!player.alive) return;
    if (turnOrder[currentTurnIndex] !== socket.id) return;
    const target = players[targetId];
    if (!target || !target.alive) return;

    const ability = classes[player.classe][abilityIndex - 1];
    if (!ability) return;

    let color = "white";
    let message = "";

    // Aplica buffs antes de ataques
    if (ability.type === "buff") {
      let buff = null;
      if (player.classe === "Lobisomem") {
        buff = { type: "lobisomem", remaining: 3, value: 0 };
        message = `${player.displayName} usou ${ability.name} e absorverá o dano recebido para somar ao próximo ataque!`;
      } else if (player.classe === "Vampiro") {
        buff = { type: "vampiro", remaining: 3, value: 3 };
        message = `${player.displayName} usou ${ability.name} e aumentará o próximo ataque em 3 por 3 rodadas!`;
      } else if (player.classe === "Bruxa") {
        buff = { type: "bruxa", remaining: 3, value: 0 };
        message = `${player.displayName} lançou ${ability.name}! Quem atacar nos próximos 3 turnos sofrerá penalidade!`;
      }
      if (!player.buffs) player.buffs = [];
      player.buffs.push(buff);
      color = "gold";
    } else if (ability.type === "heal") {
      player.hp += ability.value;
      color = "lime";
      message = `${player.displayName} usou ${ability.name} e recuperou ${ability.value} HP!`;
    } else if (ability.type === "atk") {
      let damage = ability.value;

      // Buffs do atacante
      if (player.buffs) {
        for (let b of player.buffs) {
          if (player.classe === "Lobisomem" && b.type === "lobisomem") {
            damage += b.value;
            b.value = 0;
          }
          if (player.classe === "Vampiro" && b.type === "vampiro") {
            damage += b.value;
          }
        }
      }

      // Buffs do alvo
      if (target.buffs) {
        for (let b of target.buffs) {
          if (target.classe === "Bruxa" && b.type === "bruxa") {
            const reflected = Math.floor(damage / 2);
            player.hp -= reflected;
            io.emit("message", `<span style="color:red;">${target.displayName} refletiu ${reflected} de dano em ${player.displayName} por causa da Maldição!</span>`);
          }
          if (target.classe === "Lobisomem" && b.type === "lobisomem") {
            b.value += damage;
          }
        }
      }

      target.hp -= damage;
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        io.emit("message", `<span style="color:red;">💀 ${target.displayName} morreu!</span>`);
      }

      color = "red";
      message = `${player.displayName} atacou ${target.displayName} com ${ability.name} causando ${damage} de dano!`;
    }

    io.emit("message", `<span style="color:${color};">${message}</span>`);
    io.emit("updatePlayers", players);
    nextTurn();
  });

  socket.on("restartVote", () => {
    restartVotes[socket.id] = true;
    const totalPlayers = Object.keys(players).length;
    const votes = Object.keys(restartVotes).length;
    io.emit("restartVotes", { votes, totalPlayers });
    if (votes === totalPlayers) resetGame();
  });

  socket.on("disconnect", () => {
    console.log("Jogador saiu:", socket.id);
    delete players[socket.id];
    turnOrder = turnOrder.filter(id => id !== socket.id);
    delete restartVotes[socket.id];
    if (currentTurnIndex >= turnOrder.length) currentTurnIndex = 0;
    io.emit("updatePlayers", players);
    if (turnOrder.length > 0) io.emit("turnChanged", turnOrder[currentTurnIndex]);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
