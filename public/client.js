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

// CHAT
sendChat.addEventListener("click", ()=> {
  const msg = chatInput.value.trim();
  if (msg !== "") {
    socket.emit("playerChat", msg);
    chatInput.value = "";
  }
});
chatInput.addEventListener("keypress", e => { if (e.key === "Enter") sendChat.click(); });
socket.on("chatMessage", data => {
  const div = document.createElement("div");
  div.innerHTML = `<b style="color:cyan;">${data.name}:</b> ${data.text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// LOGIN / REGISTRO
document.getElementById("btnRegister").onclick = () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  if (!u || !p) return alert("Preencha usuário e senha!");
  socket.emit("register",{ username: u, password: p });
};
document.getElementById("btnLogin").onclick = () => {
  const u = document.getElementById("username").value.trim();
  const p = document.getElementById("password").value.trim();
  if (!u || !p) return alert("Preencha usuário e senha!");
  socket.emit("login",{ username: u, password: p });
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
    // atualizar casa/inventory/friends
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
  if (chatMessages) chatMessages.innerHTML = "";
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
exitBtn.innerHTML = "🏠";
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
document.getElementById("btnArena").addEventListener("click", ()=> showExitBtn(true));
document.getElementById("btnFriends").addEventListener("click", ()=> showExitBtn(true));
document.getElementById("btnHouse").addEventListener("click", ()=> showExitBtn(true));

// CLASSES DATA: botões escolhem direto
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

function showClassDetails(cls) {
  const data = classesData[cls];
  if (!data) return;
  let html = `<h4 style="margin:0 0 6px 0">${cls}</h4>`;
  if (data.buffs && data.buffs.length > 0) {
    html += "<strong>Buffs:</strong><ul>";
    data.buffs.forEach(b => html += `<li>${b.name}: ${b.effect}</li>`);
    html += "</ul>";
  }
  if (data.abilities && data.abilities.length > 0) {
    html += "<strong>Habilidades:</strong><div>";
    data.abilities.forEach(a => html += `<div class="ability">${a.name} [${a.type.toUpperCase()}] ${a.value ? '- ' + a.value : ''}</div>`);
    html += "</div>";
  }
  classDetails.innerHTML = html;
}

// ARENA integration
socket.on("init", data => {
  playerId = data.id;
  currentTurn = data.currentTurn;
  playersData = data.players;
  renderPlayers();
});
socket.on("updatePlayers", players => { playersData = players; renderPlayers(); });
socket.on("turnChanged", turnId => {
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
socket.on("message", msg => addMessage(msg));
socket.on("restartVotes", ({ votes, totalPlayers }) => addMessage(`🌀 Reinício: ${votes}/${totalPlayers} votos.`));
socket.on("gameRestarted", () => addMessage("♻️ O jogo foi reiniciado!"));

function renderPlayers() {
  const container = document.getElementById("players");
  if (!container) return;
  container.innerHTML = "";
  for (const id in playersData) {
    const p = playersData[id];
    const emoji = p.id === "hunter" ? "🗡️" : (classEmojis[p.classe] || "❔");
    const turnPointer = id === currentTurn ? "👉 " : "";
    const style = `color:${p.alive ? "#fff" : "#777"};background:${id === currentTurn ? "rgba(255,255,255,0.04)" : "none"};border-radius:8px;padding:12px;margin:8px;min-width:160px;text-align:left;`;
    let buffsText = "";
    if (p.buffs && p.buffs.length > 0) {
      buffsText = p.buffs.map(b => {
        let bEmoji = "";
        if (b.type === "lobisomem") bEmoji = "🐺";
        else if (b.type === "vampiro") bEmoji = "🧛‍♂️";
        else if (b.type === "bruxa") bEmoji = "🧙‍♀️";
        else if (b.type === "sugavida") bEmoji = "✨";
        return `${bEmoji}(${b.remaining})`;
      }).join(" ");
      buffsText = `<div style="text-align:center;color:#FFD700;font-size:0.9em;margin-bottom:6px;">${buffsText}</div>`;
    }
    const classeDisplay = p.classe || (p.id === "hunter" ? "Caçador" : "??");
    container.innerHTML += `<div style="${style}">${buffsText}${turnPointer}${emoji} <b>${p.name}</b> (${classeDisplay})<div style="margin-top:6px">❤️ ${p.hp}</div></div>`;
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
    const abilitySelect = document.createElement("select");
    abilitySelect.style.marginRight = "8px"; abilitySelect.style.padding = "6px";
    classesData[me.classe].forEach((a, i) => {
      const opt = document.createElement("option");
      opt.value = i + 1;
      opt.textContent = a.name;
      abilitySelect.appendChild(opt);
    });
    const targetSelect = document.createElement("select");
    targetSelect.style.marginRight = "8px"; targetSelect.style.padding = "6px";
    const targets = Object.values(playersData).filter(p => p.alive && p.id !== playerId);
    if (targets.length === 0) {
      const opt = document.createElement("option"); opt.textContent = "Nenhum alvo vivo"; opt.disabled = true; targetSelect.appendChild(opt);
    } else {
      targets.forEach(p => { const opt = document.createElement("option"); opt.value = p.id; opt.textContent = p.name; targetSelect.appendChild(opt); });
    }
    const playBtn = document.createElement("button"); playBtn.textContent = "⚔️ Usar Habilidade";
    playBtn.onclick = () => { const abilityIndex = parseInt(abilitySelect.value); const targetId = targetSelect.value; if (!targetId) return alert("Selecione um alvo!"); socket.emit("playAbility", { targetId, abilityIndex }); };
    container.appendChild(document.createTextNode("Habilidade: ")); container.appendChild(abilitySelect);
    container.appendChild(document.createTextNode(" Alvo: ")); container.appendChild(targetSelect); container.appendChild(playBtn);
  }
  const restartBtn = document.createElement("button"); restartBtn.textContent = "🔄 Reiniciar"; restartBtn.style.marginLeft = "8px"; restartBtn.onclick = () => socket.emit("restartVote");
  container.appendChild(restartBtn);
}

function addMessage(msg) { const log = document.getElementById("log"); if (!log) return; const entry = document.createElement("div"); entry.innerHTML = msg; log.appendChild(entry); log.scrollTop = log.scrollHeight; }

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
  if (friends.style.display === "flex") socket.emit("requestFriendsData");
  else alert(`Novo convite de ${from}`);
});
socket.on("friendAccepted", (name) => socket.emit("requestFriendsData"));
socket.on("friendAcceptedByTarget", (who) => { alert(`${who} aceitou seu convite!`); socket.emit("requestFriendsData"); });
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
    const left = document.createElement("div"); left.textContent = p;
    const right = document.createElement("div");
    const accept = document.createElement("button"); accept.textContent = "Aceitar"; accept.onclick = () => socket.emit("acceptFriendRequest", p);
    const decline = document.createElement("button"); decline.textContent = "Recusar"; decline.onclick = () => socket.emit("declineFriendRequest", p);
    right.appendChild(accept); right.appendChild(decline);
    div.appendChild(left); div.appendChild(right);
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

// esconder/mostrar inicialmente
if (loginPanel) loginPanel.style.display = "flex";
if (menu) menu.style.display = "none";
if (arena) arena.style.display = "none";
if (friends) friends.style.display = "none";
if (house) house.style.display = "none";
