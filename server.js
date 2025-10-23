const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// --- Arquivo de usuários ---
const usersFile = path.join(__dirname, "users.json");
let users = {};
if (fs.existsSync(usersFile)) {
  users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
}
function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// --- Funções de registro/login ---
function registerUser(username, password) {
  if (users[username]) return { success: false, message: "Usuário já existe!" };
  const hashed = bcrypt.hashSync(password, 10);
  users[username] = { password: hashed };
  saveUsers();
  return { success: true, message: "Registrado com sucesso!" };
}

function loginUser(username, password) {
  const user = users[username];
  if (!user) return { success: false, message: "Usuário não encontrado!" };
  if (!bcrypt.compareSync(password, user.password)) return { success: false, message: "Senha incorreta!" };
  return { success: true, message: "Login bem-sucedido!" };
}

// --- Jogo ---
let players = {};
let turnOrder = [];
let currentTurnIndex = 0;
let restartVotes = {};

const classEmojis = {
  "Lobisomem": "🐺",
  "Vampiro": "🧛‍♂️",
  "Bruxa": "🧙‍♀️"
};

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

const initialHP = { "Lobisomem": 70, "Vampiro": 60, "Bruxa": 50 };

function nextTurn() {
  if (turnOrder.length === 0) return;
  do {
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
  } while (!players[turnOrder[currentTurnIndex]]?.alive);
  io.emit("turnChanged", turnOrder[currentTurnIndex]);
  for (const id in players) {
    const p = players[id];
    if (!p.buffs) continue;
    p.buffs = p.buffs.filter(b => { b.remaining--; return b.remaining > 0; });
  }
}

function resetGame() {
  for (let id in players) {
    const p = players[id];
    if (p.classe) { p.hp = initialHP[p.classe]; p.alive = true; p.buffs = []; }
  }
  currentTurnIndex = 0;
  restartVotes = {};
  io.emit("updatePlayers", players);
  io.emit("gameRestarted");
  io.emit("turnChanged", turnOrder[currentTurnIndex]);
}

io.on("connection", (socket) => {
  console.log("Novo jogador:", socket.id);

  // Registro/Login
  socket.on("register", ({ username, password }) => {
    const res = registerUser(username, password);
    socket.emit("registerResponse", res);
  });
  socket.on("login", ({ username, password }) => {
    const res = loginUser(username, password);
    if (res.success) socket.loggedInUser = username;
    socket.emit("loginResponse", res);
  });

  // Adiciona jogador
  players[socket.id] = { id: socket.id, name: "Jogador", displayName: "Jogador", classe: null, hp: 0, alive: true, buffs: [] };
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
    } else { players[socket.id].displayName = players[socket.id].name; }
    io.emit("updatePlayers", players);
  });

  // === NOVA VERSÃO DO SISTEMA DE HABILIDADES ===
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

    // === Buffs ===
    if (ability.type === "buff") {
      let buffType = "";
      if (player.classe === "Lobisomem" && ability.name === "Uivo Assustador") buffType = "absorbDamage";
      else if (player.classe === "Vampiro" && ability.name === "Encanto") buffType = "reduceDamage";
      else if (player.classe === "Bruxa" && ability.name === "Maldição") buffType = "curseReflect";
      else if (player.classe === "Vampiro" && ability.name === "Suga Vida") buffType = "lifeSteal";

      if (buffType) {
        player.buffs.push({ type: buffType, remaining: 3, value: 0 });
        message = `${player.displayName} usou ${ability.name} e ativou um efeito especial por 3 turnos!`;
        color = "gold";
      } else {
        player.buffs.push({ type: player.classe.toLowerCase(), remaining: 3 });
        message = `${player.displayName} usou ${ability.name}!`;
        color = "gold";
      }
    }

    // === Cura ===
    else if (ability.type === "heal") {
      player.hp += ability.value;
      message = `${player.displayName} usou ${ability.name} e recuperou ${ability.value} HP!`;
      color = "lime";
    }

    // === Ataque ===
    else if (ability.type === "atk") {
      let damage = ability.value;

      // Buff do Lobisomem: soma dano absorvido
      const absorbBuff = player.buffs?.find(b => b.type === "absorbDamage");
      if (absorbBuff && absorbBuff.value > 0) {
        damage += absorbBuff.value;
        absorbBuff.value = 0;
        message += `🔥 A fúria acumulada aumentou o dano! `;
      }

      // Redução de dano do Vampiro
      const reduceBuff = target.buffs?.find(b => b.type === "reduceDamage");
      if (reduceBuff) {
        damage = Math.floor(damage / 2);
      }

      // Dano no alvo
      target.hp -= damage;

      // Reflexo da Bruxa
      const reflectBuff = target.buffs?.find(b => b.type === "curseReflect");
      if (reflectBuff) {
        const reflected = Math.floor(damage / 2);
        player.hp -= reflected;
        io.emit("message", `<span style="color:violet;">${target.displayName} refletiu ${reflected} de dano com a Maldição!</span>`);
      }

      // Dano recebido ativa efeitos de buffs defensivos
      if (target.buffs) {
        target.buffs.forEach(b => {
          if (b.type === "absorbDamage") b.value += damage; // Lobisomem acumula
          if (b.type === "lifeSteal") {
            const healAmount = Math.floor((damage / 3) + Math.random() * (damage / 3));
            target.hp += healAmount;
            io.emit("message", `<span style="color:crimson;">${target.displayName} drenou ${healAmount} de vida com Suga Vida!</span>`);
          }
        });
      }

      // Morte
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        message = `💀 ${target.displayName} foi derrotado!`;
        color = "red";
      } else {
        message += `${player.displayName} atacou ${target.displayName} com ${ability.name}, causando ${damage} de dano!`;
      }
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
