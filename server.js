
// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- Mundo aberto ---
const mapWidth = 3000;
const mapHeight = 3000;
let trees = [];

function generateTrees(qty = 50) {
    trees = [];
    for (let i = 0; i < qty; i++) {
        const x = Math.random() * (mapWidth - 60) + 30;
        const y = Math.random() * (mapHeight - 60) + 30;
        trees.push({ x, y, width: 40, height: 60 });
    }
}
generateTrees(50);

app.use(express.static("public"));



// --- Arquivo de usuários ---
const usersFile = path.join(__dirname, "users.json");
let users = {};
if (fs.existsSync(usersFile)) {
  try {
    users = JSON.parse(fs.readFileSync(usersFile, "utf8"));
  } catch (e) {
    console.error("Erro ao ler users.json:", e);
    users = {};
  }
}
function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// --- Funções de registro/login ---
function registerUser(username, password) {
  if (users[username]) return { success: false, message: "Usuário já existe!" };
  const hashed = bcrypt.hashSync(password, 10);
  users[username] = { password: hashed, friends: [], pending: [], classe: null, inventory: [] };
  saveUsers();
  return { success: true, message: "Registrado com sucesso!" };
}

function loginUser(username, password) {
  const user = users[username];
  if (!user) return { success: false, message: "Usuário não encontrado!" };
  if (!bcrypt.compareSync(password, user.password)) return { success: false, message: "Senha incorreta!" };
  return { success: true, message: "Login bem-sucedido!", friends: user.friends || [], pending: user.pending || [], classe: user.classe || null, inventory: user.inventory || [] };
}

// --- Jogo ---
let players = {};
let turnOrder = [];
let currentTurnIndex = 0;
let restartVotes = {};
let hunter = null;
let worldPlayers = {}

const classEmojis = { "Lobisomem": "🐺", "Vampiro": "🧛‍♂️", "Bruxa": "🧙‍♀️" };
const classes = {
  "Lobisomem": [
    { name: "Ataque Selvagem", type: "atk", value: 8 },
    { name: "Garras Rasgantes", type: "atk", value: 7 },
    { name: "Investida", type: "atk", value: 6 },
    { name: "Uivo Assustador", type: "buff", value: 0 },
    { name: "Regeneração", type: "heal", value: 5 }
  ],
  "Vampiro": [
    { name: "Suga Vida", type: "buff", value: 0 },
    { name: "Investida Noturna", type: "atk", value: 8 },
    { name: "Encanto", type: "buff", value: 3 },
    { name: "Mordida Vampírica", type: "atk", value: 7 },
    { name: "Neblina Sombria", type: "heal", value: 6 }
  ],
  "Bruxa": [
    { name: "Bola de Fogo", type: "atk", value: 6 },
    { name: "Raio Congelante", type: "atk", value: 5 },
    { name: "Maldição", type: "buff", value: 0 },
    { name: "Poção Curativa", type: "heal", value: 8 },
    { name: "Espinho Venenoso", type: "atk", value: 7 }
  ]
};
const initialHP = { "Lobisomem": 70, "Vampiro": 60, "Bruxa": 50 };

// Map de username -> socket.id (última sessão)
const usernameToSocket = {};

// --- Função para remover Caçador ---
function removeHunter() {
  if (hunter) {
    delete players["hunter"];
    turnOrder = turnOrder.filter(id => id !== "hunter");
    io.emit("message", `<span style="color:red;">💀 O Caçador foi removido do campo de batalha!</span>`);
    io.emit("updatePlayers", players);
    hunter = null;
  }
}

// --- Função de turno ---
function nextTurn() {
  if (turnOrder.length === 0) return;

  // Chance do caçador aparecer
  const hunterAlive = hunter?.alive;
  if (!hunterAlive && Math.random() < 0.1) { // 10% de chance
    hunter = { id: "hunter", name: "Caçador", displayName: "🗡️ Caçador", hp: 24, alive: true };
    turnOrder.push("hunter");
    players["hunter"] = hunter;
    io.emit("message", `<span style="color:purple;">🗡️ Um Caçador apareceu no campo de batalha!</span>`);
    io.emit("updatePlayers", players);
  }

  // Passa para o próximo jogador vivo
  do {
    currentTurnIndex = (currentTurnIndex + 1) % turnOrder.length;
  } while (!players[turnOrder[currentTurnIndex]]?.alive);

  const currentId = turnOrder[currentTurnIndex];
  io.emit("turnChanged", currentId);

  // === Turno do Caçador ===
  if (currentId === "hunter" && hunter?.alive) {
    const alivePlayers = Object.values(players).filter(p => p.alive && p.id !== "hunter");
    if (alivePlayers.length > 0) {
      const target = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
      const vaiPrender = Math.random() < 0.2;
      if (vaiPrender) {
        if (!target.debuffs) target.debuffs = [];
        target.debuffs.push({ type: "prisioneiro", remaining: 3 });
        io.emit("message", `<span style="color:orange;">⚔️ O Caçador prendeu ${target.displayName} por 3 turnos! Ele não poderá agir!</span>`);
      } else {
        const damage = Math.floor(Math.random() * 10) + 1;
        target.hp -= damage;
        let msg = "";
        if (target.hp <= 0) {
          target.hp = 0;
          target.alive = false;
          msg = `💀 ${target.displayName} foi morto pelo Caçador!`;
        } else {
          msg = `🗡️ Caçador atacou ${target.displayName}, causando ${damage} de dano!`;
        }
        io.emit("message", `<span style="color:red;">${msg}</span>`);
      }
      io.emit("updatePlayers", players);
    }
    if (hunter.hp <= 0) removeHunter();
    return nextTurn();
  }

  // Atualiza buffs/debuffs
  for (const id in players) {
    const p = players[id];
    if (p.buffs) {
      p.buffs.forEach(b => b.remaining--);
      p.buffs = p.buffs.filter(b => b.remaining > 0);
    }
    if (p.debuffs) {
      p.debuffs.forEach(d => d.remaining--);
      p.debuffs = p.debuffs.filter(d => d.remaining > 0);
    }
  }

  const player = players[turnOrder[currentTurnIndex]];
  if (player?.debuffs?.some(d => d.type === "prisioneiro")) {
    io.emit("message", `<span style="color:gray;">🔒 ${player.displayName} está preso e perdeu o turno!</span>`);
    return nextTurn();
  }
}

// --- Reinício de jogo ---
function resetGame() {
  removeHunter();
  for (let id in players) {
    const p = players[id];
    if (p.classe) { p.hp = initialHP[p.classe]; p.alive = true; p.buffs = []; p.debuffs = []; }
  }
  currentTurnIndex = 0;
  restartVotes = {};
  io.emit("updatePlayers", players);
  io.emit("gameRestarted");
  if (turnOrder.length > 0) io.emit("turnChanged", turnOrder[currentTurnIndex]);
}

// --- Conexões Socket.IO ---
io.on("connection", (socket) => {
  console.log("Novo jogador:", socket.id);

  // envia estado do mundo para o cliente
socket.emit("worldState", { trees, worldPlayers });
    
  // quando jogador entra no mundo aberto
worldPlayers[socket.id] = { 
  x: 200, 
  y: 200, 
  name: "Jogador", 
  class: "humano", // default, pode mudar pelo client
  direction: "right" 
};

// Recebe movimentação e envia para todos
socket.on("playerMove", (data) => {
  if (!worldPlayers[socket.id]) return;
  worldPlayers[socket.id].x = data.x;
  worldPlayers[socket.id].y = data.y;
  worldPlayers[socket.id].direction = data.direction || "right";
  worldPlayers[socket.id].class = data.class || worldPlayers[socket.id].class;
  io.emit("worldPlayersUpdate", worldPlayers); // todos recebem
});

// Remove jogador ao desconectar
socket.on("disconnect", () => {
  delete worldPlayers[socket.id];
  io.emit("worldPlayersUpdate", worldPlayers);
});
   
  

  // CHAT
  socket.on("playerChat", (msg) => {
    const player = players[socket.id];
    if (!player || !player.alive) return;
    io.emit("chatMessage", { name: player.displayName, text: msg });
  });

  // Registro/Login
  socket.on("register", ({ username, password }) => {
    const res = registerUser(username, password);
    socket.emit("registerResponse", res);
  });
  socket.on("login", ({ username, password }) => {
    const res = loginUser(username, password);
    if (res.success) {
      socket.loggedInUser = username;
      usernameToSocket[username] = socket.id;
      socket.emit("loginResponse", { success: true, message: res.message, friends: res.friends, pending: res.pending, classe: res.classe, inventory: res.inventory });
    } else {
      socket.emit("loginResponse", res);
    }
  });

  // Adiciona jogador local
  players[socket.id] = { id: socket.id, name: "Jogador", displayName: "Jogador", classe: null, hp: 0, alive: true, buffs: [], debuffs: [] };
  turnOrder.push(socket.id);

  socket.emit("classesData", classes);
  socket.emit("init", { id: socket.id, players, currentTurn: turnOrder[currentTurnIndex] });
  socket.emit("chooseClass", Object.keys(classes));

  // setClass
  socket.on("setClass", (classe) => {
    if (classes[classe]) {
      players[socket.id].classe = classe;
      players[socket.id].hp = initialHP[classe];
      const emoji = classEmojis[classe] || "";
      players[socket.id].displayName = `${emoji} ${players[socket.id].name}`;
      io.emit("updatePlayers", players);
      if (socket.loggedInUser && users[socket.loggedInUser]) {
        users[socket.loggedInUser].classe = classe;
        saveUsers();
      }
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

  // Habilidades (mantive igual)
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
    if (!player.buffs) player.buffs = [];
    if (!target.buffs) target.buffs = [];

    if (ability.type === "buff") {
      if (ability.name === "Uivo Assustador") {
        player.buffs.push({ type: "uivo", remaining: 3, absorbed: 0 });
        message = `${player.displayName} usou Uivo Assustador! Acumula dano para liberar Fúria no próximo ataque!`;
      } else if (ability.name === "Suga Vida") {
        player.buffs.push({ type: "sugavida", remaining: 3 });
        message = `${player.displayName} usou Suga Vida! Cura entre 30% e 80% do dano causado ou recebido!`;
      } else if (ability.name === "Encanto") {
        player.buffs.push({ type: "encanto", remaining: 3 });
        message = `${player.displayName} usou Encanto! Inimigos têm 50% de chance de errar ataques contra ele!`;
      } else if (ability.name === "Maldição") {
        player.buffs.push({ type: "maldição", remaining: 3 });
        message = `${player.displayName} lançou Maldição! 50% do dano recebido será refletido!`;
      } else {
        player.buffs.push({ type: ability.name.toLowerCase().replace(/\s/g, ""), remaining: 3 });
        message = `${player.displayName} usou ${ability.name}!`;
      }
      color = "gold";
    } else if (ability.type === "heal") {
      player.hp += ability.value;
      message = `${player.displayName} usou ${ability.name} e recuperou ${ability.value} HP!`;
      color = "lime";
    } else if (ability.type === "atk") {
      const alvoEncanto = target.buffs.find(b => b.type === "encanto");
      if (alvoEncanto && Math.random() < 0.65) {
        message = `${player.displayName} tentou atacar ${target.displayName}, mas Encanto fez errar! ❌`;
        dano = 0;
      } else {
        let dano = ability.value;
        const uivoAtt = player.buffs.find(b => b.type === "uivo");
        if (uivoAtt) {
          dano += uivoAtt.absorbed;
          uivoAtt.absorbed = 0;
          player.buffs = player.buffs.filter(b => b !== uivoAtt);
          message = `💥 ${player.displayName} liberou a FÚRIA do Uivo Assustador, causando ${dano} de dano em ${target.displayName}!`;
          color = "orange";
        }
        const critico = Math.random() < 0.15;
        if (critico) {
          dano *= 2;
          message = `💥 ${player.displayName} acertou um GOLPE CRÍTICO com ${ability.name}, causando ${dano} de dano em ${target.displayName}!`;
          color = "orange";
        } else if (!uivoAtt) {
          message = `${player.displayName} atacou ${target.displayName} com ${ability.name}, causando ${dano} de dano!`;
        }
        const maldicaoBuff = target.buffs.find(b => b.type === "maldição");
        if (maldicaoBuff) {
          const reflect = Math.floor(dano * 0.5);
          player.hp -= reflect;
          message += ` 🔄 Maldição refletiu ${reflect} de dano para ${player.displayName}!`;
        }
        const sugaVidaAtt = player.buffs.find(b => b.type === "sugavida");
        if (sugaVidaAtt) {
          const heal = Math.floor(dano * (0.3 + Math.random() * 0.5));
          player.hp += heal;
          message += ` ✨ Suga Vida curou ${heal} HP de ${player.displayName}!`;
        }
        const sugaVidaAlvo = target.buffs.find(b => b.type === "sugavida");
        if (sugaVidaAlvo) {
          const heal = Math.floor(dano * (0.3 + Math.random() * 0.5));
          target.hp += heal;
          message += ` ✨ Suga Vida curou ${heal} HP de ${target.displayName}!`;
        }
        const uivoBuff = target.buffs.find(b => b.type === "uivo");
        if (uivoBuff) {
          uivoBuff.absorbed += dano;
          message += ` 🐺 ${target.displayName} absorveu ${dano} de dano para Fúria!`;
          dano = 0;
        }
        target.hp -= dano;
        if (target.hp <= 0) {
          target.hp = 0;
          target.alive = false;
          message = `💀 ${target.displayName} foi derrotado por ${player.displayName} com ${ability.name}!`;
          color = "red";
          if (target.id === "hunter") removeHunter();
        }
      }
    }

    io.emit("message", `<span style="color:${color};">${message}</span>`);
    io.emit("updatePlayers", players);
    nextTurn();
  });

  // Reinício
  socket.on("restartVote", () => {
    if (socket.id === "hunter") return;
    restartVotes[socket.id] = true;
    const totalPlayers = Object.keys(players).filter(id => id !== "hunter").length;
    const votes = Object.keys(restartVotes).length;
    io.emit("restartVotes", { votes, totalPlayers });
    if (votes === totalPlayers) resetGame();
  });

  // --- SISTEMA DE AMIGOS ---
  socket.on("sendFriendRequest", (targetName) => {
    if (!socket.loggedInUser) return socket.emit("friendError", "Faça login para enviar convites.");
    if (!targetName || typeof targetName !== "string") return socket.emit("friendError", "Nome inválido.");
    if (!users[targetName]) return socket.emit("friendError", "Usuário não encontrado.");
    const me = socket.loggedInUser;
    if (users[me].friends && users[me].friends.includes(targetName)) return socket.emit("friendError", "Já é seu amigo.");
    if (!users[targetName].pending) users[targetName].pending = [];
    if (users[targetName].pending.includes(me)) return socket.emit("friendError", "Convite já enviado.");
    users[targetName].pending.push(me);
    saveUsers();
    socket.emit("friendRequestSent", targetName);
    const targetSocketId = usernameToSocket[targetName];
    if (targetSocketId && io.sockets.sockets.get(targetSocketId)) {
      io.to(targetSocketId).emit("incomingFriendRequest", me);
    }
  });

  socket.on("acceptFriendRequest", (friendName) => {
    if (!socket.loggedInUser) return;
    const me = socket.loggedInUser;
    if (!users[me] || !users[friendName]) return socket.emit("friendError", "Usuário inválido.");
    const idx = (users[me].pending || []).indexOf(friendName);
    if (idx === -1) return socket.emit("friendError", "Convite não encontrado.");
    users[me].pending.splice(idx, 1);
    if (!users[me].friends) users[me].friends = [];
    if (!users[friendName].friends) users[friendName].friends = [];
    if (!users[me].friends.includes(friendName)) users[me].friends.push(friendName);
    if (!users[friendName].friends.includes(me)) users[friendName].friends.push(me);
    saveUsers();
    socket.emit("friendAccepted", friendName);
    const friendSock = usernameToSocket[friendName];
    if (friendSock && io.sockets.sockets.get(friendSock)) {
      io.to(friendSock).emit("friendAcceptedByTarget", me);
    }
  });

  socket.on("declineFriendRequest", (friendName) => {
    if (!socket.loggedInUser) return;
    const me = socket.loggedInUser;
    if (!users[me] || !users[friendName]) return socket.emit("friendError", "Usuário inválido.");
    const idx = (users[me].pending || []).indexOf(friendName);
    if (idx !== -1) {
      users[me].pending.splice(idx, 1);
      saveUsers();
      socket.emit("friendDeclined", friendName);
    } else {
      socket.emit("friendError", "Convite não encontrado.");
    }
  });

  socket.on("requestFriendsData", () => {
    if (!socket.loggedInUser) return;
    const u = users[socket.loggedInUser];
    socket.emit("friendsData", { friends: u.friends || [], pending: u.pending || [], classe: u.classe || null, inventory: u.inventory || [] });
  });

  socket.on("requestInventory", () => {
    if (!socket.loggedInUser) return;
    const u = users[socket.loggedInUser];
    socket.emit("inventoryData", u.inventory || []);
  });

  socket.on("addInventoryItem", (item) => {
    if (!socket.loggedInUser) return;
    if (!item) return;
    const u = users[socket.loggedInUser];
    if (!u.inventory) u.inventory = [];
    u.inventory.push(item);
    saveUsers();
    socket.emit("inventoryData", u.inventory);
  });

  // nextTurn (manual)
  socket.on("nextTurn", () => nextTurn());

  // Disconnect
  socket.on("disconnect", () => {
    console.log("Desconectou:", socket.id);
    if (socket.loggedInUser) {
      const name = socket.loggedInUser;
      if (usernameToSocket[name] === socket.id) delete usernameToSocket[name];
    }
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
