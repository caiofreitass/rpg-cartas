const socket = io();

const playersDiv = document.getElementById("players");
const abilitySelect = document.getElementById("abilitySelect");
const targetSelect = document.getElementById("targetSelect");
const restartBtn = document.getElementById("restartBtn");
const restartDiv = document.getElementById("restartVotes");
const gameConsole = document.getElementById("console");

let playerId;
let currentTurn;
let classesData = {};
let playersData = {};

// Inicialização
socket.on("init", ({ id, players, currentTurn: ct }) => {
  playerId = id;
  currentTurn = ct;
  playersData = players;

  // Solicita nome do jogador
  let nome = "";
  while(!nome.trim()){
    nome = prompt("Digite seu nome de jogador:");
  }
  socket.emit("setName", nome);

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
  playersData = players;
  renderPlayers(players);
  renderAbilities();
});

// Mudança de turno
socket.on("turnChanged", (id) => {
  currentTurn = id;
  renderPlayersDivHighlight();
  renderAbilities();
});

// Mensagens de ações
socket.on("message", (msg) => {
  const p = document.createElement("div");
  p.textContent = msg;
  gameConsole.appendChild(p);
  gameConsole.scrollTop = gameConsole.scrollHeight;
});

// Votos para reiniciar
socket.on("restartVotes", ({ votes, totalPlayers }) => {
  restartDiv.textContent = `${votes}/${totalPlayers} jogadores prontos para reiniciar`;
});

// Partida reiniciada
socket.on("gameRestarted", () => {
  restartDiv.textContent = "";
  gameConsole.innerHTML = "";
  renderPlayers(playersData);
});

// Botão de reiniciar
restartBtn.addEventListener("click", () => {
  socket.emit("restartVote");
});

// Renderiza jogadores e select de alvo
function renderPlayers(players) {
  playersDiv.innerHTML = "";
  targetSelect.innerHTML = "";

  for (let id in players) {
    const p = players[id];
    const div = document.createElement("div");
    div.className = "player";
    if(!p.alive) div.classList.add("dead");

    if(id === currentTurn){
      const span = document.createElement("span");
      span.className = "turn-indicator";
      span.textContent = "👉";
      div.appendChild(span);
    }

    div.innerHTML += `<strong>${p.name}</strong> (${p.classe || "?"})<br>HP: ${p.hp}`;
    playersDiv.appendChild(div);

    // Preenche select apenas com inimigos vivos
    if(id !== playerId && p.alive){
      const option = document.createElement("option");
      option.value = id;
      option.textContent = p.name;
      targetSelect.appendChild(option);
    }
  }

  renderPlayersDivHighlight();
}

// Destaque do jogador ativo
function renderPlayersDivHighlight() {
  const children = playersDiv.children;
  for(let div of children){
    div.style.background = "";
  }
  const playerDivs = Array.from(children).filter(d=>d.className.includes("player"));
  playerDivs.forEach(div=>{
    const name = div.textContent.split(" ")[0];
    if(playersData[currentTurn] && name === playersData[currentTurn].name){
      div.style.background = "lightyellow";
    }
  });
}

// Renderiza habilidades no select
function renderAbilities() {
  abilitySelect.innerHTML = "";
  if(!playersData[playerId] || !playersData[playerId].classe || !classesData) return;
  const player = playersData[playerId];
  const abilities = classesData[player.classe] || [];

  abilities.forEach((ab, i)=>{
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${ab.name} (${ab.type}${ab.type==="atk"||ab.type==="heal"?" "+ab.value:""})`;
    abilitySelect.appendChild(option);
  });
}

// Enviar ação ao mudar habilidade ou alvo
abilitySelect.addEventListener("change", sendAction);
targetSelect.addEventListener("change", sendAction);

function sendAction(){
  const abilityIndex = parseInt(abilitySelect.value);
  const selectedTarget = targetSelect.value;

  if(currentTurn !== playerId) return;
  if(!selectedTarget) return;

  socket.emit("playAbility", { targetId: selectedTarget, abilityIndex: abilityIndex+1 });
}
