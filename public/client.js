const socket = io();
let playerId = null;
let currentTurn = null;
let classesData = {};
let selectedTarget = null;

// Emojis para classes
const classEmojis = {
  "Lobisomem": "🐺",
  "Vampiro": "🧛‍♂️",
  "Bruxa": "🧙‍♀️"
};

// Pergunta nome e classe
socket.on("classesData", (data) => {
  classesData = data;
  const name = prompt("Digite seu nome:");
  socket.emit("setName", name);

  const classe = prompt("Escolha sua classe: Lobisomem, Vampiro ou Bruxa");
  if (["Lobisomem", "Vampiro", "Bruxa"].includes(classe)) {
    socket.emit("setClass", classe);
  } else {
    alert("Classe inválida! Será atribuída aleatoriamente.");
    const randomClass = ["Lobisomem", "Vampiro", "Bruxa"][Math.floor(Math.random() * 3)];
    socket.emit("setClass", randomClass);
  }
});

socket.on("init", (data) => {
  playerId = data.id;
  currentTurn = data.currentTurn;
  renderPlayers(data.players);
});

socket.on("updatePlayers", (players) => renderPlayers(players));

socket.on("turnChanged", (turnId) => {
  currentTurn = turnId;
  renderTurnIndicator();
});

socket.on("message", (msg) => addMessage(msg));

socket.on("restartVotes", ({ votes, totalPlayers }) => {
  addMessage(`🌀 Reinício: ${votes}/${totalPlayers} votos.`);
});

socket.on("gameRestarted", () => {
  addMessage("♻️ O jogo foi reiniciado!");
});

function renderPlayers(players) {
  const container = document.getElementById("players");
  container.innerHTML = "";
  for (const id in players) {
    const p = players[id];
    const emoji = classEmojis[p.classe] || "❔";
    const turnPointer = (id === currentTurn) ? "👉 " : "";
    const style = `
      color: ${p.alive ? (id === currentTurn ? "#fff" : "#ccc") : "#777"};
      background: ${id === currentTurn ? "rgba(255,255,255,0.1)" : "none"};
      border-radius: 8px; padding: 6px; margin: 4px;
    `;
    container.innerHTML += `
      <div style="${style}">
        ${turnPointer}${emoji} <b>${p.name}</b> (${p.classe || "??"}) - ❤️ ${p.hp}
      </div>
    `;
  }
  renderActions(players);
}

function renderTurnIndicator() {
  const info = document.getElementById("turnInfo");
  info.textContent = currentTurn === playerId ? "✨ É sua vez!" : "⏳ Aguardando...";
}

function renderActions(players) {
  const me = players[playerId];
  const container = document.getElementById("actions");
  container.innerHTML = "";

  if (!me || !me.classe || !me.alive) return;
  if (currentTurn !== playerId) return;

  const abilitySelect = document.createElement("select");
  abilitySelect.id = "abilitySelect";
  for (let i = 0; i < classesData[me.classe].length; i++) {
    const a = classesData[me.classe][i];
    abilitySelect.innerHTML += `<option value="${i + 1}">${a.name}</option>`;
  }

  const targetSelect = document.createElement("select");
  targetSelect.id = "targetSelect";
  for (const id in players) {
    const p = players[id];
    if (p.alive && id !== playerId) {
      targetSelect.innerHTML += `<option value="${id}">${p.name}</option>`;
    }
  }

  const playBtn = document.createElement("button");
  playBtn.textContent = "Usar Habilidade";
  playBtn.onclick = () => {
    const abilityIndex = parseInt(abilitySelect.value);
    const targetId = targetSelect.value;
    socket.emit("playAbility", { targetId, abilityIndex });
  };

  container.appendChild(document.createTextNode("Habilidade: "));
  container.appendChild(abilitySelect);
  container.appendChild(document.createTextNode("  Alvo: "));
  container.appendChild(targetSelect);
  container.appendChild(playBtn);

  const restartBtn = document.createElement("button");
  restartBtn.textContent = "🔄 Reiniciar";
  restartBtn.onclick = () => socket.emit("restartVote");
  container.appendChild(document.createElement("br"));
  container.appendChild(restartBtn);
}

// Mensagens com cor
function addMessage(msg) {
  const log = document.getElementById("log");
  const entry = document.createElement("div");

  if (msg.includes("causando")) entry.style.color = "red"; // ataque
  else if (msg.includes("recuperou")) entry.style.color = "lightgreen"; // cura
  else if (msg.includes("fortaleceu")) entry.style.color = "gold"; // buff
  else entry.style.color = "#ccc";

  entry.innerHTML = msg;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}
