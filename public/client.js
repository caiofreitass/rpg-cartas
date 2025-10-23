const socket = io();

let myId = null;
let players = {};
let currentTurn = null;

// Elementos HTML
const messagesEl = document.getElementById("messages");
const playersEl = document.getElementById("players");
const abilitiesEl = document.getElementById("abilities");
const targetEl = document.getElementById("target");
const sendBtn = document.getElementById("sendBtn");
const nameInput = document.getElementById("nameInput");

// Escolher classe
socket.on("chooseClass", (classes) => {
  let chosen = prompt(`Escolha sua classe: ${classes.join(", ")}`);
  while(!classes.includes(chosen)){
    chosen = prompt(`Classe inválida! Escolha entre: ${classes.join(", ")}`);
  }
  socket.emit("setClass", chosen);
});

// Inicialização
socket.on("init", (data) => {
  myId = data.id;
  players = data.players;
  currentTurn = data.currentTurn;
  renderPlayers();
});

// Atualização de jogadores
socket.on("updatePlayers", (data) => {
  players = data;
  renderPlayers();
});

// Atualização de turno
socket.on("turnChanged", (id)=>{
  currentTurn=id;
  renderPlayers();
});

// Mensagens
socket.on("message", (msg)=>{
  messagesEl.innerHTML += `<div>${msg}</div>`;
  messagesEl.scrollTop = messagesEl.scrollHeight;
});

// Renderizar jogadores
function renderPlayers(){
  playersEl.innerHTML = "";
  for(let id in players){
    const p = players[id];
    let label = `${p.name} (${p.classe}) - HP: ${p.hp} ${p.alive ? "" : "(Morto)"}`;
    if(id===currentTurn) label += " 🔹";
    playersEl.innerHTML += `<div>${label}</div>`;
  }

  // Atualizar opções de alvo
  targetEl.innerHTML = "";
  for(let id in players){
    if(players[id].alive && id !== myId){
      const opt = document.createElement("option");
      opt.value=id;
      opt.innerText=players[id].name;
      targetEl.appendChild(opt);
    }
  }
}

// Enviar habilidade
sendBtn.addEventListener("click", ()=>{
  if(currentTurn !== myId){
    alert("Não é sua vez!");
    return;
  }
  const ability = parseInt(document.getElementById("abilityInput").value);
  if(isNaN(ability) || ability<1 || ability>5){
    alert("Escolha uma habilidade entre 1 e 5!");
    return;
  }
  const targetId = targetEl.value;
  socket.emit("playAbility",{targetId, abilityIndex:ability});
});
