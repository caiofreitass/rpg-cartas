const socket = io();

let myId = null;
let currentTurn = null;
let classesData = {};
let selectedClass = null;

const playersDiv = document.getElementById("players");
const turnDiv = document.getElementById("turn");
const classSelect = document.getElementById("classSelect");
const abilitySelect = document.getElementById("abilitySelect");
const targetSelect = document.getElementById("targetSelect");
const actionButton = document.getElementById("actionButton");
const restartButton = document.getElementById("restartButton");
const logDiv = document.getElementById("log");
const nameInput = document.getElementById("nameInput");
const nameButton = document.getElementById("nameButton");

socket.on("init", (data) => {
  myId = data.id;
  updatePlayers(data.players);
  currentTurn = data.currentTurn;
});

socket.on("classesData", (data) => {
  classesData = data;
});

socket.on("chooseClass", (classes) => {
  classSelect.innerHTML = "";
  classes.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    classSelect.appendChild(opt);
  });
  document.getElementById("classArea").style.display = "block";
});

document.getElementById("chooseClassBtn").onclick = () => {
  const classe = classSelect.value;
  socket.emit("setClass", classe);
  document.getElementById("classArea").style.display = "none";
};

nameButton.onclick = () => {
  const name = nameInput.value.trim();
  if(name) socket.emit("setName", name);
  document.getElementById("nameArea").style.display = "none";
};

socket.on("updatePlayers", (players) => {
  updatePlayers(players);
  updateTargets(players);
});

socket.on("turnChanged", (turnId) => {
  currentTurn = turnId;
  updateTurnDisplay();
});

socket.on("message", (msg) => {
  const p = document.createElement("p");
  p.textContent = msg;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
  console.log("📢 " + msg);
});

socket.on("gameRestarted", () => {
  logDiv.innerHTML = "<p>🔄 O jogo foi reiniciado!</p>";
});

socket.on("restartVotes", ({ votes, totalPlayers }) => {
  logDiv.innerHTML += `<p>🗳️ Votos para reiniciar: ${votes}/${totalPlayers}</p>`;
});

function updatePlayers(players) {
  playersDiv.innerHTML = "";
  for (const id in players) {
    const p = players[id];
    const div = document.createElement("div");
    div.className = "player";
    div.style.border = id === currentTurn ? "2px solid gold" : "1px solid gray";
    div.style.background = p.alive ? "#222" : "#333";
    div.style.color = p.alive ? "white" : "red";
    div.innerHTML = `<strong>${p.name}</strong> (${p.classe || "?"})<br>❤️ ${p.hp}`;
    playersDiv.appendChild(div);
  }
}

function updateTargets(players) {
  targetSelect.innerHTML = "";
  for (const id in players) {
    if (id !== myId && players[id].alive) {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = players[id].name;
      targetSelect.appendChild(opt);
    }
  }

  const me = Object.values(players).find(p => p.id === myId);
  if(me && me.classe && classesData[me.classe]) {
    abilitySelect.innerHTML = "";
    classesData[me.classe].forEach((a, i) => {
      const opt = document.createElement("option");
      opt.value = i+1;
      opt.textContent = `${a.name} (${a.type === "atk" ? "⚔️" : a.type === "heal" ? "💖" : "✨"})`;
      abilitySelect.appendChild(opt);
    });
  }
}

function updateTurnDisplay() {
  const allPlayers = document.querySelectorAll(".player");
  allPlayers.forEach(p => p.style.opacity = "1");

  if (currentTurn === myId) {
    turnDiv.textContent = "👉 É sua vez!";
  } else {
    turnDiv.textContent = "⏳ Aguardando o turno de outro jogador...";
  }

  // Marcar o jogador da vez com emoji
  const turnPlayer = [...allPlayers].find(div => div.innerHTML.includes(playersDiv.children.namedItem));
}

actionButton.onclick = () => {
  if (currentTurn !== myId) return alert("Não é sua vez!");
  const targetId = targetSelect.value;
  const abilityIndex = abilitySelect.value;
  if (!targetId || !abilityIndex) return;
  socket.emit("playAbility", { targetId, abilityIndex });
};

restartButton.onclick = () => {
  socket.emit("restartVote");
};
