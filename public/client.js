const socket = io();

// estado
let currentUsername = null;
let playerId = null;
let currentTurn = null;
let classesData = {};
let playersData = {};
let loggedIn = false;

// emojis
const classEmojis = { "Lobisomem":"🐺","Vampiro":"🧛‍♂️","Bruxa":"🧙‍♀️" };

// elementos
const loginPanel = document.getElementById("loginPanel");
const menu = document.getElementById("menu");
const arena = document.getElementById("arena");
const friends = document.getElementById("friends");
const house = document.getElementById("house");





const chatInput = document.getElementById("chatInput");
const sendChat = document.getElementById("sendChat");
const chatMessages = document.getElementById("chatMessages");
const friendInput = document.getElementById("friendInput");
const addFriendBtn = document.getElementById("addFriendBtn");
const friendsListDiv = document.getElementById("friendsList");
const pendingInvitesDiv = document.getElementById("pendingInvites");

const classButtonsContainer = document.getElementById("classButtonsContainer");
const classDetails = document.getElementById("classDetails");
const houseClasseDisplay = document.getElementById("houseClasseDisplay");
const inventoryDiv = document.getElementById("inventory");

// CHAT - Safe HTML rendering
sendChat.addEventListener("click", () => {
  const msg = chatInput.value.trim();
  if (msg !== "") {
    socket.emit("playerChat", msg);
    chatInput.value = "";
  }
});

chatInput.addEventListener("keypress", e => {
  if (e.key === "Enter") sendChat.click();
});

socket.on("chatMessage", data => {
  const div = document.createElement("div");
  const nameSpan = document.createElement("b");
  nameSpan.style.color = "cyan";
  nameSpan.textContent = data.name + ": ";
  const textSpan = document.createElement("span");
  textSpan.textContent = data.text;
  div.appendChild(nameSpan);
  div.appendChild(textSpan);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// LOGIN / REGISTRO
document.getElementById("btnRegister").onclick = () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  if (!u || !p) return alert("Preencha usuário e senha!");
  socket.emit("register", { username: u, password: p });
};

document.getElementById("btnLogin").onclick = () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  if (!u || !p) return alert("Preencha usuário e senha!");
  socket.emit("login", { username: u, password: p });
};

socket.on("registerResponse", r => {
  const msg = document.getElementById("loginMsg");
  msg.style.color = r.success ? "#00ff00" : "#ff5555";
  msg.innerText = r.message;
});

socket.on("loginResponse", data => {
  const msg = document.getElementById("loginMsg");
  msg.style.color = data.success ? "#00ff00" : "#ff5555";
  msg.innerText = data.message;
  if (data.success) {
    loggedIn = true;
    currentUsername = document.getElementById("username").value.trim();
    loginPanel.style.display = "none";
    menu.style.display = "block";
    houseClasseDisplay.textContent = data.classe || "Nenhuma";
    updateInventoryUI(data.inventory || []);
    updateFriendsUI(data.friends || [], data.pending || []);
    socket.emit("setName", currentUsername);
  }
});

// MENU botões
document.getElementById("btnArena").onclick = () => {
  menu.style.display = "none";
  arena.style.display = "flex";
  friends.style.display = "none";
  house.style.display = "none";
  if (chatMessages) {
    chatMessages.innerHTML = "";
  }
};

document.getElementById("btnFriends").onclick = () => {
  menu.style.display = "none";
  arena.style.display = "none";
  friends.style.display = "flex";
  house.style.display = "none";
  if (loggedIn) socket.emit("requestFriendsData");
};

document.getElementById("btnHouse").onclick = () => {
  menu.style.display = "none";
  arena.style.display = "none";
  friends.style.display = "none";
  house.style.display = "flex";
  if (loggedIn) socket.emit("requestFriendsData");
  if (loggedIn) socket.emit("requestInventory");
};

// Exit arena button
const exitBtn = document.createElement("button");
exitBtn.id = "exitArenaBtn";
exitBtn.title = "Voltar ao menu";
exitBtn.textContent = "🏠";
exitBtn.style.position = "absolute";
exitBtn.style.left = "12px";
exitBtn.style.top = "12px";
exitBtn.style.padding = "8px 10px";
exitBtn.style.background = "linear-gradient(135deg,#222,#333)";
exitBtn.style.border = "1px solid #555";
exitBtn.style.borderRadius = "8px";
exitBtn.style.cursor = "pointer";
exitBtn.style.color = "#fff";
exitBtn.style.fontSize = "18px";
exitBtn.style.display = "none";
exitBtn.onclick = () => {
  arena.style.display = "none";
  menu.style.display = "block";
  exitBtn.style.display = "none";
};
document.body.appendChild(exitBtn);

function showExitBtn(show) {
  exitBtn.style.display = show ? "block" : "none";
}

// Consolidated event listeners - removed duplicates
document.getElementById("btnArena").addEventListener("click", () => showExitBtn(true));
document.getElementById("btnFriends").addEventListener("click", () => showExitBtn(true));
document.getElementById("btnHouse").addEventListener("click", () => showExitBtn(true));

// CLASSES DATA
socket.on("classesData", data => {
  classesData = data;
  if (classButtonsContainer) {
    classButtonsContainer.innerHTML = "";
    Object.keys(classesData).forEach(cls => {
      const btn = document.createElement("button");
      btn.className = "classButton";
      btn.textContent = `${classEmojis[cls] || ""} ${cls}`;
      btn.onclick = () => {
        socket.emit("setClass", cls);
        houseClasseDisplay.textContent = cls;
        alert(`Classe ${cls} escolhida!`);
      };
      classButtonsContainer.appendChild(btn);
    });
  }
});

function showClassDetails(cls){

const data = classesData[cls]

if(!data){
console.log("Classe não encontrada:", cls)
return
}

classDetails.innerHTML = ""

const title = document.createElement("h4")
title.textContent = cls
title.style.marginBottom = "6px"

classDetails.appendChild(title)

if(data.buffs?.length){

const buffsLabel = document.createElement("strong")
buffsLabel.textContent = "Buffs:"
classDetails.appendChild(buffsLabel)

const buffsList = document.createElement("ul")

data.buffs.forEach(buff=>{
const li = document.createElement("li")
li.textContent = `${buff.name}: ${buff.effect}`
buffsList.appendChild(li)
})

classDetails.appendChild(buffsList)

}

if(data.abilities?.length){

const abilitiesLabel = document.createElement("strong")
abilitiesLabel.textContent = "Habilidades:"
classDetails.appendChild(abilitiesLabel)

data.abilities.forEach(ability=>{

const div = document.createElement("div")
div.className = "ability"

div.textContent =
`${ability.name} [${ability.type.toUpperCase()}] ${ability.value ? "- "+ability.value : ""}`

classDetails.appendChild(div)

})

}

}

// ARENA integration
socket.on("init", data => {
  playerId = data.id;
  currentTurn = data.currentTurn;
  playersData = data.players;
  renderPlayers();
});

socket.on("updatePlayers", players => {
  playersData = players;
  renderPlayers();
});

socket.on("turnChanged", turnId => {
  currentTurn = turnId;
  for (const id in playersData) {
    const p = playersData[id];
    if (p.buffs) {
      p.buffs = p.buffs
        .map(b => ({ ...b, remaining: b.remaining - 1 }))
        .filter(b => b.remaining > 0);
    }
  }
  renderPlayers();
  renderTurnIndicator();
});

socket.on("message", msg => addMessage(msg));
socket.on("restartVotes", ({ votes, totalPlayers }) =>
  addMessage(`🌀 Reinício: ${votes}/${totalPlayers} votos.`)
);
socket.on("gameRestarted", () => addMessage("♻️ O jogo foi reiniciado!"));

function renderPlayers() {
  const container = document.getElementById("players");
  if (!container) return;
  
  container.innerHTML = "";
  
  for (const id in playersData) {
    const p = playersData[id];
    const emoji = p.id === "hunter" ? "🗡️" : (classEmojis[p.classe] || "❔");
    const turnPointer = id === currentTurn ? "👉 " : "";
    const isCurrentTurn = id === currentTurn;
    const textColor = p.alive ? "#fff" : "#777";
    const bgColor = isCurrentTurn ? "rgba(255,255,255,0.04)" : "none";
    
    const playerDiv = document.createElement("div");
    playerDiv.style.color = textColor;
    playerDiv.style.background = bgColor;
    playerDiv.style.borderRadius = "8px";
    playerDiv.style.padding = "12px";
    playerDiv.style.margin = "8px";
    playerDiv.style.minWidth = "160px";
    playerDiv.style.textAlign = "left";
    
    // Buffs
    if (p.buffs && p.buffs.length > 0) {
      const buffsDiv = document.createElement("div");
      buffsDiv.style.textAlign = "center";
      buffsDiv.style.color = "#FFD700";
      buffsDiv.style.fontSize = "0.9em";
      buffsDiv.style.marginBottom = "6px";
      
      buffsDiv.textContent = p.buffs.map(b => {
        let bEmoji = "";
        if (b.type === "lobisomem") bEmoji = "🐺";
        else if (b.type === "vampiro") bEmoji = "🧛‍♂️";
        else if (b.type === "bruxa") bEmoji = "🧙‍♀️";
        else if (b.type === "sugavida") bEmoji = "✨";
        return `${bEmoji}(${b.remaining})`;
      }).join(" ");
      
      playerDiv.appendChild(buffsDiv);
    }
    
    // Player info
    const infoDiv = document.createElement("div");
    infoDiv.textContent = `${turnPointer}${emoji} `;
    const nameSpan = document.createElement("b");
    nameSpan.textContent = p.name;
    infoDiv.appendChild(nameSpan);
    const classeSpan = document.createElement("span");
    const classeDisplay = p.classe || (p.id === "hunter" ? "Caçador" : "??");
    classeSpan.textContent = ` (${classeDisplay})`;
    infoDiv.appendChild(classeSpan);
    playerDiv.appendChild(infoDiv);
    
    // HP
    const hpDiv = document.createElement("div");
    hpDiv.style.marginTop = "6px";
    hpDiv.textContent = `❤️ ${p.hp}`;
    playerDiv.appendChild(hpDiv);
    
    container.appendChild(playerDiv);
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
  if (!container) return;
  
  container.innerHTML = "";
  
  const me = playersData[playerId];
  if (!me || !me.classe || !me.alive) return;
  
  if (currentTurn === playerId && classesData[me.classe]) {
    const classData = classesData[me.classe];
    const abilities = classData.abilities || [];
    
    // Ability select
    const abilitySelect = document.createElement("select");
    abilitySelect.style.marginRight = "8px";
    abilitySelect.style.padding = "6px";
    
    abilities.forEach((a, i) => {
      const opt = document.createElement("option");
      opt.value = i + 1;
      opt.textContent = a.name;
      abilitySelect.appendChild(opt);
      classDetails.appendChild(abilitySelect);
    });
    
    // Target select
    const targetSelect = document.createElement("select");
    targetSelect.style.marginRight = "8px";
    targetSelect.style.padding = "6px";
    
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
    
    // Play button
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
    container.appendChild(document.createTextNode(" Alvo: "));
    container.appendChild(targetSelect);
    container.appendChild(playBtn);
  }
  
  // Restart button
  const restartBtn = document.createElement("button");
  restartBtn.textContent = "🔄 Reiniciar";
  restartBtn.style.marginLeft = "8px";
  restartBtn.onclick = () => socket.emit("restartVote");
  container.appendChild(restartBtn);
}

function addMessage(msg) {
  const log = document.getElementById("log");
  if (!log) return;
  
  const entry = document.createElement("div");
  entry.textContent = msg;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// AMIGOS
addFriendBtn.onclick = () => {
  const name = friendInput.value.trim();
  if (!name) return alert("Digite um nome.");
  socket.emit("sendFriendRequest", name);
  friendInput.value = "";
};

socket.on("friendError", (text) => alert(text));
socket.on("friendRequestSent", (name) => alert("Convite enviado para " + name));
socket.on("incomingFriendRequest", (from) => {
  if (friends.style.display === "flex") {
    socket.emit("requestFriendsData");
  } else {
    alert(`Novo convite de ${from}`);
  }
});
socket.on("friendAccepted", (name) => socket.emit("requestFriendsData"));
socket.on("friendAcceptedByTarget", (who) => {
  alert(`${who} aceitou seu convite!`);
  socket.emit("requestFriendsData");
});
socket.on("friendDeclined", (name) => socket.emit("requestFriendsData"));

socket.on("friendsData", ({ friends, pending, classe, inventory }) => {
  updateFriendsUI(friends || [], pending || []);
  if (classe) {
    houseClasseDisplay.textContent = classe;
  }
  updateInventoryUI(inventory || []);
});

function updateFriendsUI(friendsArr, pendingArr) {
  friendsListDiv.innerHTML = "";
  pendingInvitesDiv.innerHTML = "";
  
  (pendingArr || []).forEach(p => {
    const div = document.createElement("div");
    div.className = "friendItem";
    
    const left = document.createElement("div");
    left.textContent = p;
    
    const right = document.createElement("div");
    
    const accept = document.createElement("button");
    accept.textContent = "Aceitar";
    accept.onclick = () => socket.emit("acceptFriendRequest", p);
    
    const decline = document.createElement("button");
    decline.textContent = "Recusar";
    decline.onclick = () => socket.emit("declineFriendRequest", p);
    
    right.appendChild(accept);
    right.appendChild(decline);
    
    div.appendChild(left);
    div.appendChild(right);
    
    pendingInvitesDiv.appendChild(div);
  });
  
  (friendsArr || []).forEach(f => {
    const div = document.createElement("div");
    div.className = "friendItem";
    div.textContent = f;
    friendsListDiv.appendChild(div);
  });
}

// CASA: inventário
socket.on("inventoryData", (arr) => updateInventoryUI(arr || []));

function updateInventoryUI(arr) {
  inventoryDiv.innerHTML = "";
  
  if (!arr || arr.length === 0) {
    inventoryDiv.textContent = "Inventário vazio.";
    return;
  }
  
  arr.forEach(item => {
    const d = document.createElement("div");
    d.textContent = "• " + item;
    inventoryDiv.appendChild(d);
  });
}

// Inicializar visibilidade
if (loginPanel) loginPanel.style.display = "flex";
if (menu) menu.style.display = "none";
if (arena) arena.style.display = "none";
if (friends) friends.style.display = "none";
if (house) house.style.display = "none";
