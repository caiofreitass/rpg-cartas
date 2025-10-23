const socket = io();

// Elementos da tela
const playersDiv = document.getElementById("players");
const abilitiesDiv = document.getElementById("abilities");
const messagesDiv = document.getElementById("messages");
const chatInput = document.getElementById("chatInput");
const chatBtn = document.getElementById("chatBtn");
const restartBtn = document.getElementById("restartBtn");
const restartDiv = document.getElementById("restartVotes");

let playerId;
let currentTurn;
let targetId = null;
let classesData = {};

// Inicialização
socket.on("init", ({ id, players, currentTurn: ct }) => {
  playerId = id;
  currentTurn = ct;
  renderPlayers(players);
});

// Recebe classes do servidor
socket.on("classesData", (data) => {
  classesData = data;
  renderAbilities();
});

// Escolha de classe
socket.on("chooseClass", (classes) => {
  let escolha = "";
  while(!classes.includes(escolha)){
    escolha = prompt("Escolha sua classe: " + classes.join(", "));
  }
  socket.emit("setClass", escolha);
});

// Atualização de jogadores
socket.on("updatePlayers", (players) => {
  window.players = players;
  renderPlayers(players);
});

// Mudança de turno
socket.on("turnChanged", (id) => {
  currentTurn = id;
  renderPlayersDivHighlight();
});

// Mensagens do jogo
socket.on("message", (msg) => {
  const p = document.createElement("p");
  p.textContent = msg;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});

// Votos para reiniciar
socket.on("restartVotes", ({ votes, totalPlayers }) => {
  restartDiv.textContent = `${votes}/${totalPlayers} jogadores prontos para reiniciar`;
});

// Partida reiniciada
socket.on("gameRestarted", () => {
  messagesDiv.innerHTML = "";
  targetId = null;
  restartDiv.textContent = "";
});

// Botão de chat
chatBtn.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  const p = document.createElement("p");
  p.textContent = `Você: ${msg}`;
  messagesDiv.appendChild(p);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  chatInput.value = "";
});

// Botão de reiniciar
restartBtn.addEventListener("click", () => {
  socket.emit("restartVote");
});

// Renderiza jogadores
function renderPlayers(players) {
  playersDiv.innerHTML = "";
  for (let id in players) {
    const p = players[id];
    const div = document.createElement("div");
    div.className = "player";
    if(!p.alive) div.classList.add("dead");
    div.innerHTML = `<strong>${p.name}</strong> (${p.classe || "?"})<br>HP: ${p.hp}`;
    
    // Permitir escolher alvo clicando
    if(id !== playerId && p.alive) {
      div.style.cursor = "pointer";
      div.onclick = () => {
        targetId = id;
        renderPlayersDivHighlight();
      };
    }
    if(targetId === id) div.style.border = "2px solid red";
    playersDiv.appendChild(div);
  }
  renderAbilities();
  renderPlayersDivHighlight();
}

// Destaque do jogador ativo
function renderPlayersDivHighlight() {
  const children = playersDiv.children;
  for(let div of children){
    div.style.background = "";
    if(div.textContent.includes(currentTurn)){
      div.style.background = "lightyellow";
    }
    if(div.textContent.includes(playerId) && currentTurn===playerId){
      div.style.background = "#c8ffc8";
    }
  }
}

// Renderiza habilidades
function renderAbilities() {
  abilitiesDiv.innerHTML = "";
  if(!window.players || !classesData) return;
  const player = window.players[playerId];
  if(!player || !player.classe) return;
  const abilities = classesData[player.classe] || [];

  abilities.forEach((ab, i)=>{
    const btn = document.createElement("button");
    btn.textContent = `${ab.name} (${ab.type}${ab.type==="atk"||ab.type==="heal"?" "+ab.value:""})`;
    btn.disabled = currentTurn !== playerId || (!targetId && ab.type==="atk");
    btn.onclick = () => {
      socket.emit("playAbility", { targetId, abilityIndex: i+1 });
      targetId = null;
    };
    abilitiesDiv.appendChild(btn);
  });
}
