const socket = io();
let playerId = null;
let currentTurn = null;
let classesData = {}; // dados do servidor
let playersData = {};
let loggedIn = false;

// Emojis das classes
const classEmojis = {
  "Lobisomem": "🐺",
  "Vampiro": "🧛‍♂️",
  "Bruxa": "🧙‍♀️"
};

// -------------------- LOGIN/REGISTRO --------------------
document.getElementById("btnRegister").onclick = () => {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  const c = document.getElementById("classSelect").value;
  if (!u || !p || !c) return alert("Preencha usuário, senha e escolha uma classe!");
  socket.emit("register", { username: u, password: p });
  socket.emit("setClass", c);
};

document.getElementById("btnLogin").onclick = () => {
  const u = document.getElementById("username").value;
  const p = document.getElementById("password").value;
  const c = document.getElementById("classSelect").value;
  if (!u || !p || !c) return alert("Preencha usuário, senha e escolha uma classe!");
  socket.emit("login", { username: u, password: p });
  socket.emit("setClass", c);
};

socket.on("registerResponse", r => {
  const msg = document.getElementById("loginMsg");
  msg.style.color = r.success ? "#00ff00" : "#ff5555";
  msg.innerText = r.message;
});

socket.on("loginResponse", r => {
  const msg = document.getElementById("loginMsg");
  msg.style.color = r.success ? "#00ff00" : "#ff5555";
  msg.innerText = r.message;

  if (r.success) {
    loggedIn = true;
    document.getElementById("loginPanel").style.display = "none";
    const username = document.getElementById("username").value;
    socket.emit("setName", username);
  }
});

// -------------------- RECEBENDO DADOS --------------------
socket.on("classesData", (data) => { classesData = data; });

socket.on("init", (data) => {
  playerId = data.id;
  currentTurn = data.currentTurn;
  playersData = data.players;
  renderPlayers();
});

socket.on("updatePlayers", (players) => { playersData = players; renderPlayers(); });

socket.on("turnChanged", (turnId) => {
  currentTurn = turnId;
  for (const id in playersData) {
    const p = playersData[id];
    if (p.buffs) {
      p.buffs = p.buffs.map(b => ({ ...b, remaining: b.remaining - 1 })).filter(b => b.remaining > 0);
    }
  }
  renderPlayers();
  renderTurnIndicator();
});

socket.on("message", (msg) => addMessage(msg));
socket.on("restartVotes", ({ votes, totalPlayers }) => addMessage(`🌀 Reinício: ${votes}/${totalPlayers} votos.`));
socket.on("gameRestarted", () => addMessage("♻️ O jogo foi reiniciado!"));

// -------------------- RENDER --------------------
function renderPlayers() {
  const container = document.getElementById("players");
  container.innerHTML = "";

  for (const id in playersData) {
    const p = playersData[id];

    // Emoji correto do Caçador
    const emoji = p.id === "hunter" ? "🗡️" : classEmojis[p.classe] || "❔";
    const turnPointer = id === currentTurn ? "👉 " : "";
    const style = `
      color: ${p.alive ? "#fff" : "#777"};
      background: ${id === currentTurn ? "rgba(255,255,255,0.1)" : "none"};
      border-radius: 8px; padding: 6px; margin: 4px; min-width: 120px;
    `;

    // Buffs
    let buffsText = "";
    if (p.buffs && p.buffs.length > 0) {
      buffsText = p.buffs.map(b => {
        let bEmoji = "";
        if (b.type === "lobisomem") bEmoji = "🐺";
        else if (b.type === "vampiro") bEmoji = "🧛‍♂️";
        else if (b.type === "bruxa") bEmoji = "🧙‍♀️";
        else if (b.type === "lifeSteal") bEmoji = "吸"; // Suga Vida
        return `${bEmoji}(${b.remaining})`;
      }).join(" ");
      buffsText = `<div style="text-align:center; color:gold; font-size:0.9em; margin-bottom:3px;">${buffsText}</div>`;
    }

    // Nome do Caçador
    const classeDisplay = p.classe || (p.id === "hunter" ? "Caçador" : "??");

    container.innerHTML += `
      <div style="${style}">
        ${buffsText}
        ${turnPointer}${emoji} <b>${p.name}</b> (${classeDisplay}) - ❤️ ${p.hp}
      </div>
    `;
  }

  renderActions();
}

function renderTurnIndicator() {
  const info = document.getElementById("turnInfo");
  if (!info) return;
  info.textContent = currentTurn === playerId ? "✨ É sua vez!" : "⏳ Aguardando...";
}

function renderActions() {
  if (!loggedIn) return;

  const container = document.getElementById("actions");
  container.innerHTML = "";

  const me = playersData[playerId];
  if (!me || !me.classe || !me.alive) return;

  // Só criamos as ações de ataque se for a sua vez
  if (currentTurn === playerId && classesData[me.classe]) {
    const abilitySelect = document.createElement("select");
    abilitySelect.id = "abilitySelect";
    abilitySelect.style.marginRight = "8px";
    abilitySelect.style.padding = "4px";
    classesData[me.classe].forEach((a, i) => abilitySelect.innerHTML += `<option value="${i + 1}">${a.name}</option>`);

    const targetSelect = document.createElement("select");
    targetSelect.id = "targetSelect";
    targetSelect.style.marginRight = "8px";
    targetSelect.style.padding = "4px";

    const targets = Object.values(playersData).filter(p => p.alive && p.id !== playerId);
    if (targets.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "Nenhum alvo vivo";
      opt.disabled = true;
      targetSelect.appendChild(opt);
    } else {
      targets.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        targetSelect.appendChild(opt);
      });
    }

    const playBtn = document.createElement("button");
    playBtn.textContent = "⚔️ Usar Habilidade";
    playBtn.onclick = () => {
      const abilityIndex = parseInt(abilitySelect.value);
      const targetId = targetSelect.value;
      if (!targetId) return alert("Selecione um alvo!");
      socket.emit("playAbility", { targetId, abilityIndex });
    };

    container.appendChild(document.createTextNode("Habilidade: "));
    container.appendChild(abilitySelect);
    container.appendChild(document.createTextNode("  Alvo: "));
    container.appendChild(targetSelect);
    container.appendChild(playBtn);
  }

  // Botão de reiniciar **sempre**
  const restartBtn = document.createElement("button");
  restartBtn.textContent = "🔄 Reiniciar";
  restartBtn.style.marginLeft = "8px";
  restartBtn.onclick = () => socket.emit("restartVote");
  container.appendChild(restartBtn);
}

// -------------------- MENSAGENS --------------------
function addMessage(msg) {
  const log = document.getElementById("log");
  const entry = document.createElement("div");
  entry.innerHTML = msg;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}
