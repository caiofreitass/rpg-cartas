const socket = io();

const playersDiv = document.getElementById("players");
const abilitiesDiv = document.getElementById("abilities");
const restartBtn = document.getElementById("restartBtn");
const restartDiv = document.getElementById("restartVotes");

let playerId;
let currentTurn;
let targetId = null;
let classesData = {};
let playersData = {};

// Inicialização
socket.on("init", ({ id, players, currentTurn: ct }) => {
  playerId = id;
  currentTurn = ct;
  playersData = players;
  renderPlayers(players);

  // Solicita nome do jogador
  let nome = "";
  while(!nome.trim()){
    nome = prompt("Digite seu nome de jogador:");
  }
  socket.emit("setName", nome);
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
  playersData = players;
  renderPlayers(players);
});

// Mudança de turno
socket.on("turnChanged", (id) => {
  currentTurn = id;
  renderPlayersDivHighlight();
});

// Votos para reiniciar
socket.on("restartVotes", ({ votes, totalPlayers }) => {
  restartDiv.textContent = `${votes}/${totalPlayers} jogadores prontos para reiniciar`;
});

// Partida reiniciada
socket.on("gameRestarted", () => {
  targetId = null;
  restartDiv.textContent = "";
  renderPlayers(playersData);
});

// Botão de reiniciar
restartBtn.addEventListener("click", () => {
  socket.emit("restartVote");
});

// Renderiza jogadores
function renderPlayers(players) {
  playersDiv.innerHTML = "";
  const targetSelect = document.createElement("select");
  targetSelect.id = "targetSelect";

  for (let id in players) {
    const p = players[id];
    const div = document.createElement("div");
    div.className = "player";
    if(!p.alive) div.classList.add("dead");
    div.innerHTML = `<strong>${p.name}</strong> (${p.classe || "?"})<br>HP: ${p.hp}`;

    playersDiv.appendChild(div);

    // Preenche select apenas com inimigos vivos
    if(id !== playerId && p.alive){
      const option = document.createElement("option");
      option.value = id;
      option.textContent = p.name;
      targetSelect.appendChild(option);
    }
  }

  playersDiv.appendChild(document.createElement("hr"));
  playersDiv.appendChild(targetSelect);

  renderAbilities();
  renderPlayersDivHighlight();
}

// Destaque do jogador ativo
function renderPlayersDivHighlight() {
  const children = playersDiv.children;
  for(let div of children){
    div.style.background = "";
  }
  const playerDivs = Array.from(children).filter(d=>d.className==="player");
  playerDivs.forEach(div=>{
    if(div.textContent.includes(currentTurn)){
      div.style.background = "lightyellow";
    }
  });
}

// Renderiza habilidades
function renderAbilities() {
  abilitiesDiv.innerHTML = "";
  if(!playersData[playerId] || !playersData[playerId].classe || !classesData) return;
  const player = playersData[playerId];
  const abilities = classesData[player.classe] || [];
  const targetSelect = document.getElementById("targetSelect");

  abilities.forEach((ab, i)=>{
    const btn = document.createElement("button");
    btn.textContent = `${ab.name} (${ab.type}${ab.type==="atk"||ab.type==="heal"?" "+ab.value:""})`;
    btn.disabled = currentTurn !== playerId || (ab.type==="atk" && targetSelect.options.length===0);
    btn.onclick = () => {
      const selectedTarget = targetSelect.value;
      socket.emit("playAbility", { targetId: selectedTarget, abilityIndex: i+1 });
    };
    abilitiesDiv.appendChild(btn);
  });
}
