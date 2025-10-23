const socket = io();
let playerId = null;
let currentTurn = null;
let classesData = {};
let playersData = {};

// Emojis das classes
const classEmojis = {
  "Lobisomem": "🐺",
  "Vampiro": "🧛‍♂️",
  "Bruxa": "🧙‍♀️"
};

// Recebe lista de classes do servidor
socket.on("classesData", (data) => {
  classesData = data;

  const name = prompt("Digite seu nome:");
  socket.emit("setName", name);

  const classe = prompt("Escolha sua classe: Lobisomem, Vampiro ou Bruxa");
  const validClasses = ["Lobisomem", "Vampiro", "Bruxa"];
  const chosen = validClasses.includes(classe) ? classe : validClasses[Math.floor(Math.random() * 3)];
  socket.emit("setClass", chosen);
});

socket.on("init", (data) => {
  playerId = data.id;
  currentTurn = data.currentTurn;
  playersData = data.players;
  renderPlayers();
});

socket.on("updatePlayers", (players) => {
  playersData = players;
  renderPlayers();
});

socket.on("turnChanged", (turnId) => {
  currentTurn = turnId;
  renderPlayers();
  renderTurnIndicator();
});

socket.on("message", (msg) => addMessage(msg));

socket.on("restartVotes", ({ votes, totalPlayers }) => {
  addMessage(`🌀 Reinício: ${votes}/${totalPlayers} votos.`);
});

socket.on("gameRestarted", () => {
  addMessage("♻️ O jogo foi reiniciado!");
});

function renderPlayers() {
  const container = document.getElementById("players");
  container.innerHTML = "";

  for (const id in playersData) {
    const p = playersData[id];
    const emoji = classEmojis[p.classe] || "❔";
    const turnPointer = id === currentTurn ? "👉 " : "";
    const style = `
      color: ${p.alive ? "#fff" : "#777"};
      background: ${id === currentTurn ? "rgba(255,255,255,0.1)" : "none"};
      border-radius: 8px; padding: 6px; margin: 4px;
    `;
    container.innerHTML += `
      <div style="${style}">
        ${turnPointer}${emoji} <b>${p.name}</b> (${p.classe || "??"}) - ❤️ ${p.hp}
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
  const container = document.getElementById("actions");
  container.innerHTML = "";

  const me = playersData[playerId];
  if (!me || !me.classe || !me.alive) return;
  if (currentTurn !== playerId) return;
  if (!classesData[me.classe]) return;

  const abilitySelect = document.createElement("select");
  abilitySelect.id = "abilitySelect";
  abilitySelect.style.marginRight = "8px";
  abilitySelect.style.padding = "4px";

  classesData[me.classe].forEach((a, i) => {
    abilitySelect.innerHTML += `<option value="${i + 1}">${a.name}</option>`;
  });

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

  const restartBtn = document.createElement("button");
  restartBtn.textContent = "🔄 Reiniciar";
  restartBtn.style.marginLeft = "8px";
  restartBtn.onclick = () => socket.emit("restartVote");

  container.appendChild(document.createTextNode("Habilidade: "));
  container.appendChild(abilitySelect);
  container.appendChild(document.createTextNode("  Alvo: "));
  container.appendChild(targetSelect);
  container.appendChild(playBtn);
  container.appendChild(restartBtn);
}

// Mensagens coloridas e emojis
function addMessage(msg) {
  const log = document.getElementById("log");
  const entry = document.createElement("div");

  if (msg.includes("causando")) entry.style.color = "red"; // ataque
  else if (msg.includes("recuperou")) entry.style.color = "lightgreen"; // cura
  else if (msg.includes("fortaleceu")) entry.style.color = "gold"; // buff
  else if (msg.includes("morreu")) entry.style.color = "#ff5555"; // morte
  else entry.style.color = "#ccc";

  // Renderiza HTML corretamente
  entry.innerHTML = msg;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}
