const socket = typeof io === "function"
  ? io("https://splendor-online-production-4c74.up.railway.app")
  : {
    on() { },
    emit() {
      console.warn("Socket.IO server is not running.");
    }
  };

const messageContainer = document.querySelector("#messageContainer");

function displayMessage(message) {
  const logEl = document.querySelector("#gameLog");

  if (logEl) {
    const div = document.createElement("div");
    div.textContent = message;
    div.className = "log-entry";

    logEl.prepend(div);

    while (logEl.children.length > 100) {
      logEl.removeChild(logEl.lastChild);
    }

    return;
  }

  const div = document.createElement("div");
  div.textContent = message;
  div.style.whiteSpace = "pre-line";
  messageContainer.appendChild(div);
}

socket.on("connect", () => {
  displayMessage(`You connected with id: ${socket.id}`);
  socket.emit("list-rooms");
});

socket.on("receive-command", data => {
  displayMessage(data)
})

const roomInput = document.querySelector("#roomInput");
const joinRoomButton = document.querySelector("#joinRoomButton");
const startRoomGameButton = document.querySelector("#startRoomGameButton");
const backToSetupButton = document.querySelector("#backToSetupButton");
const lobbyInfoEl = document.querySelector("#lobbyInfo");
const playerNameInput = document.querySelector("#playerNameInput");
const roomPlayerCountSelect = document.querySelector("#roomPlayerCountSelect");
const roomListEl = document.querySelector("#roomList");
const refreshRoomListButton = document.querySelector("#refreshRoomListButton");

let currentRoomId = null;
let latestRoomState = null;
let isCurrentUserHost = false;
let myPlayerIndex = 0;

if (joinRoomButton) {
  joinRoomButton.addEventListener("click", () => {
    const roomId = roomInput.value.trim().toUpperCase();
    const playerName = playerNameInput.value.trim() || "Player";
    const maxPlayers = Number(roomPlayerCountSelect.value);

    if (!roomId) {
      displayMessage("Please enter a room ID.");
      return;
    }

    currentRoomId = roomId;

    socket.emit("join-room", {
      roomId,
      playerName,
      maxPlayers
    });

    displayMessage(`Joining room: ${currentRoomId}`);
  });
}

socket.on("room-message", data => {
  displayMessage(`[Room ${data.roomId}] ${data.message}`);
});

socket.on("room-state", data => {
  latestRoomState = data;

  const me = data.players.find(player => player.socketId === socket.id);
  isCurrentUserHost = !!me && me.isHost;

  if (me) {
    myPlayerIndex = me.playerIndex;
  }

  const playerList = data.players
    .map(player => {
      return `- ${player.name}${player.isHost ? " (Host)" : ""}`;
    })
    .join("\n");

  if (lobbyInfoEl) {
    lobbyInfoEl.innerHTML = `
    <div class="room-current-card">
      <div><strong>Room:</strong> ${data.roomId}</div>
      <div><strong>Status:</strong> ${data.status}</div>
      <div><strong>Players:</strong> ${data.players.length}/${data.maxPlayers}</div>
      <div class="room-player-list">
        ${data.players.map(player => `
          <div class="room-player-item">
            ${player.name}${player.isHost ? " 👑 Host" : ""}
          </div>
        `).join("")}
      </div>
    </div>
  `;
  }

  if (startRoomGameButton) {
    startRoomGameButton.disabled =
      !isCurrentUserHost ||
      data.status !== "ready";
  }
});

socket.on("room-list", rooms => {
  if (!roomListEl) return;

  if (!rooms || rooms.length === 0) {
    roomListEl.innerHTML = `<div class="emptyText">No rooms available.</div>`;
    return;
  }

  roomListEl.innerHTML = rooms.map(room => {
    const disabled = room.status === "playing" || room.playerCount >= room.maxPlayers;

    return `
      <div class="room-list-item">
        <div>
          <strong>${room.roomId}</strong>
          <div class="room-small-text">
            ${room.status} · ${room.playerCount}/${room.maxPlayers} players
          </div>
        </div>

        <button
          class="quickJoinRoomButton"
          data-room-id="${room.roomId}"
          ${disabled ? "disabled" : ""}
        >
          Join
        </button>
      </div>
    `;
  }).join("");
});

if (roomListEl) {
  roomListEl.addEventListener("click", e => {
    const btn = e.target.closest(".quickJoinRoomButton");
    if (!btn) return;

    roomInput.value = btn.dataset.roomId;
    joinRoomButton.click();
  });
}

if (refreshRoomListButton) {
  refreshRoomListButton.addEventListener("click", () => {
    socket.emit("list-rooms");
  });
}

socket.on("game-started", data => {
  displayMessage(`Game started in room ${data.roomId} with ${data.playerCount} players.`);

  if (startRoomGameButton) {
    startRoomGameButton.disabled = true;
  }
});

socket.on("game-state", gameState => {
  console.log("GAME STATE FROM SERVER:", gameState);
  console.log("Tier 1 cards:", gameState.marketBoard[1].map(card => card.id));
  console.log("Nobles:", gameState.nobles.map(noble => noble.id));

  applyServerGameState(gameState);
  showGameScreen();
  render();
});

if (startRoomGameButton) {
  startRoomGameButton.addEventListener("click", () => {
    if (!currentRoomId) {
      displayMessage("Join a room first.");
      return;
    }

    socket.emit("start-game");
  });
}

const rooms = {};

const TAKE_COLORS = ["Red", "Green", "Blue", "Black", "White"];
const ALL_COLORS = ["Red", "Green", "Blue", "Black", "White", "Wild"];

const BONUS_COLORS = ["Red", "Green", "Blue", "Black", "White"];

function createPlayer(type = "human") {
  return {
    type,
    chips: Object.fromEntries(ALL_COLORS.map(c => [c, 0])),
    victoryPoints: 0,
    bonusChip: Object.fromEntries(BONUS_COLORS.map(c => [c, 0])),
    ownedCards: [],
    reservedCards: [],
    nobles: []
  };
}

function createPlayers(playerCount) {
  return Array.from({ length: playerCount }, (_, index) => {
    return createPlayer(index === 0 ? "human" : "bot");
  });
}

const state = {
  players: [],
  currentPlayerIndex: 0,
  playerCount: 3,
  humanPlayerIndex: 0,
  gameMode: "bot",
  bank: {},
  currentAction: "take",
  screen: "setup",
  selectedReserveIndex: null,
  selectedBuyIndex: null,
  selectedReservedCardIndex: null,
  selectedDeckTier: null,
  gameEnding: false,
  endGameTriggeredBy: null,
  gameOver: false
};

//setup phase
function showSetupScreen() {
  document.querySelector("#setupScreen").style.display = "flex";
  document.querySelector("#multiplayerLobbyScreen").style.display = "none";
  document.querySelector("#gameScreen").style.display = "none";
}

function showGameScreen() {
  document.querySelector("#setupScreen").style.display = "none";
  document.querySelector("#multiplayerLobbyScreen").style.display = "none";
  document.querySelector("#gameScreen").style.display = "grid";
}

function showMultiplayerLobbyScreen() {
  document.querySelector("#setupScreen").style.display = "none";
  document.querySelector("#multiplayerLobbyScreen").style.display = "block";
  document.querySelector("#gameScreen").style.display = "none";
}

function renderLogHistory() {
  gameLogEl.innerHTML = logHistory
    .map(item => `<div class="log-entry">${item}</div>`)
    .join("");

  gameLogEl.scrollTop = 0;
}

function applyServerGameState(gameState) {
  logHistory = gameState.log || [];

  state.players = gameState.players;
  state.currentPlayerIndex = gameState.currentPlayerIndex;
  state.playerCount = gameState.playerCount;

  const serverPlayerIndex = gameState.players.findIndex(player => {
    return player.socketId === socket.id;
  });

  if (serverPlayerIndex !== -1) {
    myPlayerIndex = serverPlayerIndex;
  }

  state.humanPlayerIndex = myPlayerIndex;
  state.gameMode = "multiplayer";
  state.bank = gameState.bank;
  state.currentAction = gameState.currentAction || "take";
  state.screen = "game";
  state.selectedReserveIndex = null;
  state.selectedBuyIndex = null;
  state.selectedReservedCardIndex = null;
  state.selectedDeckTier = null;
  state.gameEnding = gameState.gameEnding || false;
  state.endGameTriggeredBy = gameState.endGameTriggeredBy ?? null;
  state.gameOver = gameState.gameOver || false;

  marketDecks = gameState.marketDecks;
  marketBoard = gameState.marketBoard;
  nobles = gameState.nobles;

  for (const color of TAKE_COLORS) {
    selected[color] = 0;
  }

  renderLogHistory();
}

//support for bot
function isBotTurn() {
  return isBotMode() && getCurrentPlayer().type === "bot";
}

function isBotMode() {
  return state.gameMode === "bot";
}

function isMultiplayerMode() {
  return state.gameMode === "multiplayer";
}

function getCurrentPlayer() {
  return state.players[state.currentPlayerIndex];
}

function getPlayerDisplayName(index) {
  const player = state.players[index];

  if (isMultiplayerMode()) {
    if (index === state.humanPlayerIndex) {
      return "You";
    }

    return player && player.name ? player.name : `Player ${index + 1}`;
  }

  if (player.type === "human") {
    return "You";
  }

  const botNumber = state.players
    .slice(0, index + 1)
    .filter(p => p.type === "bot").length;

  return `Bot ${botNumber}`;
}

//basic card
const ALL_MARKET_CARDS = [

  //black
  {
    id: "black_1",
    tier: 1,
    color: "Black",
    points: 0,
    cost: { Black: 0, White: 1, Red: 1, Blue: 1, Green: 1 }
  },
  {
    id: "black_2",
    tier: 1,
    color: "Black",
    points: 0,
    cost: { Black: 0, White: 0, Red: 1, Blue: 0, Green: 2 }
  },
  {
    id: "black_3",
    tier: 1,
    color: "Black",
    points: 0,
    cost: { Black: 0, White: 2, Red: 0, Blue: 0, Green: 2 }
  },
  {
    id: "black_4",
    tier: 1,
    color: "Black",
    points: 0,
    cost: { Black: 1, White: 0, Red: 3, Blue: 0, Green: 1 }
  },
  {
    id: "black_5",
    tier: 1,
    color: "Black",
    points: 0,
    cost: { Black: 0, White: 0, Red: 0, Blue: 0, Green: 3 }
  },
  {
    id: "black_6",
    tier: 1,
    color: "Black",
    points: 0,
    cost: { Black: 0, White: 1, Red: 1, Blue: 2, Green: 1 }
  },
  {
    id: "black_7",
    tier: 1,
    color: "Black",
    points: 0,
    cost: { Black: 0, White: 2, Red: 1, Blue: 2, Green: 0 }
  },
  {
    id: "black_8",
    tier: 1,
    color: "Black",
    points: 1,
    cost: { Black: 0, White: 0, Red: 0, Blue: 4, Green: 0 }
  },

  {
    id: "black_9",
    tier: 2,
    color: "Black",
    points: 1,
    cost: { Black: 0, White: 3, Red: 0, Blue: 2, Green: 2 }
  },
  {
    id: "black_10",
    tier: 2,
    color: "Black",
    points: 1,
    cost: { Black: 2, White: 3, Red: 0, Blue: 0, Green: 3 }
  },
  {
    id: "black_11",
    tier: 2,
    color: "Black",
    points: 2,
    cost: { Black: 0, White: 0, Red: 2, Blue: 1, Green: 4 }
  },
  {
    id: "black_12",
    tier: 2,
    color: "Black",
    points: 2,
    cost: { Black: 0, White: 5, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "black_13",
    tier: 2,
    color: "Black",
    points: 2,
    cost: { Black: 0, White: 0, Red: 3, Blue: 0, Green: 5 }
  },

  {
    id: "black_14",
    tier: 2,
    color: "Black",
    points: 3,
    cost: { Black: 6, White: 0, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "black_15",
    tier: 3,
    color: "Black",
    points: 3,
    cost: { Black: 0, White: 3, Red: 3, Blue: 3, Green: 5 }
  },
  {
    id: "black_16",
    tier: 3,
    color: "Black",
    points: 4,
    cost: { Black: 0, White: 0, Red: 7, Blue: 0, Green: 0 }
  },
  {
    id: "black_17",
    tier: 3,
    color: "Black",
    points: 4,
    cost: { Black: 3, White: 0, Red: 6, Blue: 0, Green: 3 }
  },
  {
    id: "black_18",
    tier: 3,
    color: "Black",
    points: 5,
    cost: { Black: 3, White: 0, Red: 7, Blue: 0, Green: 0 }
  },
  //blue
  {
    id: "blue_1",
    tier: 1,
    color: "Blue",
    points: 0,
    cost: { Black: 2, White: 1, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "blue_2",
    tier: 1,
    color: "Blue",
    points: 0,
    cost: { Black: 1, White: 1, Red: 2, Blue: 0, Green: 1 }
  },
  {
    id: "blue_3",
    tier: 1,
    color: "Blue",
    points: 0,
    cost: { Black: 1, White: 1, Red: 1, Blue: 0, Green: 1 }
  },
  {
    id: "blue_4",
    tier: 1,
    color: "Blue",
    points: 0,
    cost: { Black: 0, White: 0, Red: 1, Blue: 1, Green: 3 }
  },
  {
    id: "blue_5",
    tier: 1,
    color: "Blue",
    points: 0,
    cost: { Black: 3, White: 0, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "blue_6",
    tier: 1,
    color: "Blue",
    points: 0,
    cost: { Black: 0, White: 1, Red: 2, Blue: 0, Green: 2 }
  },
  {
    id: "blue_7",
    tier: 1,
    color: "Blue",
    points: 0,
    cost: { Black: 2, White: 0, Red: 0, Blue: 0, Green: 2 }
  },
  {
    id: "blue_8",
    tier: 1,
    color: "Blue",
    points: 1,
    cost: { Black: 0, White: 0, Red: 4, Blue: 0, Green: 0 }
  },

  {
    id: "blue_9",
    tier: 2,
    color: "Blue",
    points: 1,
    cost: { Black: 0, White: 0, Red: 3, Blue: 2, Green: 2 }
  },
  {
    id: "blue_10",
    tier: 2,
    color: "Blue",
    points: 1,
    cost: { Black: 3, White: 0, Red: 0, Blue: 2, Green: 3 }
  },
  {
    id: "blue_11",
    tier: 2,
    color: "Blue",
    points: 2,
    cost: { Black: 0, White: 5, Red: 0, Blue: 3, Green: 0 }
  },
  {
    id: "blue_12",
    tier: 2,
    color: "Blue",
    points: 2,
    cost: { Black: 0, White: 0, Red: 0, Blue: 5, Green: 0 }
  },
  {
    id: "blue_13",
    tier: 2,
    color: "Blue",
    points: 2,
    cost: { Black: 4, White: 2, Red: 1, Blue: 0, Green: 0 }
  },

  {
    id: "blue_14",
    tier: 2,
    color: "Blue",
    points: 3,
    cost: { Black: 0, White: 0, Red: 0, Blue: 6, Green: 0 }
  },
  {
    id: "blue_15",
    tier: 3,
    color: "Blue",
    points: 3,
    cost: { Black: 5, White: 3, Red: 3, Blue: 0, Green: 3 }
  },
  {
    id: "blue_16",
    tier: 3,
    color: "Blue",
    points: 4,
    cost: { Black: 0, White: 7, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "blue_17",
    tier: 3,
    color: "Blue",
    points: 4,
    cost: { Black: 3, White: 6, Red: 0, Blue: 3, Green: 0 }
  },
  {
    id: "blue_18",
    tier: 3,
    color: "Blue",
    points: 5,
    cost: { Black: 0, White: 7, Red: 0, Blue: 3, Green: 0 }
  },
  //green
  {
    id: "green_1",
    tier: 1,
    color: "Green",
    points: 0,
    cost: { Black: 0, White: 2, Red: 0, Blue: 1, Green: 0 }
  },
  {
    id: "green_2",
    tier: 1,
    color: "Green",
    points: 0,
    cost: { Black: 0, White: 0, Red: 2, Blue: 2, Green: 0 }
  },
  {
    id: "green_3",
    tier: 1,
    color: "Green",
    points: 0,
    cost: { Black: 0, White: 1, Red: 0, Blue: 3, Green: 1 }
  },
  {
    id: "green_4",
    tier: 1,
    color: "Green",
    points: 0,
    cost: { Black: 1, White: 1, Red: 1, Blue: 1, Green: 0 }
  },
  {
    id: "green_5",
    tier: 1,
    color: "Green",
    points: 0,
    cost: { Black: 2, White: 1, Red: 1, Blue: 1, Green: 0 }
  },
  {
    id: "green_6",
    tier: 1,
    color: "Green",
    points: 0,
    cost: { Black: 2, White: 0, Red: 2, Blue: 1, Green: 0 }
  },
  {
    id: "green_7",
    tier: 1,
    color: "Green",
    points: 0,
    cost: { Black: 0, White: 0, Red: 3, Blue: 0, Green: 0 }
  },
  {
    id: "green_8",
    tier: 1,
    color: "Green",
    points: 1,
    cost: { Black: 4, White: 0, Red: 0, Blue: 0, Green: 0 }
  },

  {
    id: "green_9",
    tier: 2,
    color: "Green",
    points: 1,
    cost: { Black: 0, White: 3, Red: 3, Blue: 0, Green: 2 }
  },
  {
    id: "green_10",
    tier: 2,
    color: "Green",
    points: 1,
    cost: { Black: 2, White: 2, Red: 0, Blue: 3, Green: 0 }
  },
  {
    id: "green_11",
    tier: 2,
    color: "Green",
    points: 2,
    cost: { Black: 1, White: 4, Red: 0, Blue: 2, Green: 0 }
  },
  {
    id: "green_12",
    tier: 2,
    color: "Green",
    points: 2,
    cost: { Black: 0, White: 0, Red: 0, Blue: 0, Green: 5 }
  },
  {
    id: "green_13",
    tier: 2,
    color: "Green",
    points: 2,
    cost: { Black: 0, White: 0, Red: 0, Blue: 5, Green: 3 }
  },
  {
    id: "green_14",
    tier: 2,
    color: "Green",
    points: 3,
    cost: { Black: 0, White: 0, Red: 0, Blue: 0, Green: 6 }
  },

  {
    id: "green_15",
    tier: 3,
    color: "Green",
    points: 3,
    cost: { Black: 3, White: 5, Red: 3, Blue: 3, Green: 0 }
  },
  {
    id: "green_16",
    tier: 3,
    color: "Green",
    points: 4,
    cost: { Black: 0, White: 3, Red: 0, Blue: 6, Green: 3 }
  },
  {
    id: "green_17",
    tier: 3,
    color: "Green",
    points: 4,
    cost: { Black: 0, White: 0, Red: 0, Blue: 7, Green: 0 }
  },
  {
    id: "green_18",
    tier: 3,
    color: "Green",
    points: 5,
    cost: { Black: 0, White: 0, Red: 0, Blue: 7, Green: 3 }
  },
  //red
  {
    id: "red_1",
    tier: 1,
    color: "Red",
    points: 0,
    cost: { Black: 0, White: 3, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "red_2",
    tier: 1,
    color: "Red",
    points: 0,
    cost: { Black: 3, White: 1, Red: 1, Blue: 0, Green: 0 }
  },
  {
    id: "red_3",
    tier: 1,
    color: "Red",
    points: 0,
    cost: { Black: 0, White: 0, Red: 0, Blue: 2, Green: 1 }
  },
  {
    id: "red_4",
    tier: 1,
    color: "Red",
    points: 0,
    cost: { Black: 2, White: 2, Red: 0, Blue: 0, Green: 1 }
  },
  {
    id: "red_5",
    tier: 1,
    color: "Red",
    points: 0,
    cost: { Black: 1, White: 2, Red: 0, Blue: 1, Green: 1 }
  },
  {
    id: "red_6",
    tier: 1,
    color: "Red",
    points: 0,
    cost: { Black: 1, White: 1, Red: 0, Blue: 1, Green: 1 }
  },
  {
    id: "red_7",
    tier: 1,
    color: "Red",
    points: 0,
    cost: { Black: 0, White: 2, Red: 2, Blue: 0, Green: 0 }
  },
  {
    id: "red_8",
    tier: 1,
    color: "Red",
    points: 1,
    cost: { Black: 0, White: 4, Red: 0, Blue: 0, Green: 0 }
  },

  {
    id: "red_9",
    tier: 2,
    color: "Red",
    points: 1,
    cost: { Black: 3, White: 0, Red: 2, Blue: 3, Green: 0 }
  },
  {
    id: "red_10",
    tier: 2,
    color: "Red",
    points: 1,
    cost: { Black: 3, White: 2, Red: 2, Blue: 0, Green: 0 }
  },
  {
    id: "red_11",
    tier: 2,
    color: "Red",
    points: 2,
    cost: { Black: 0, White: 1, Red: 0, Blue: 4, Green: 2 }
  },
  {
    id: "red_12",
    tier: 2,
    color: "Red",
    points: 2,
    cost: { Black: 5, White: 3, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "red_13",
    tier: 2,
    color: "Red",
    points: 2,
    cost: { Black: 5, White: 0, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "red_14",
    tier: 2,
    color: "Red",
    points: 3,
    cost: { Black: 0, White: 0, Red: 6, Blue: 0, Green: 0 }
  },

  {
    id: "red_15",
    tier: 3,
    color: "Red",
    points: 3,
    cost: { Black: 3, White: 3, Red: 0, Blue: 5, Green: 3 }
  },
  {
    id: "red_16",
    tier: 3,
    color: "Red",
    points: 4,
    cost: { Black: 0, White: 0, Red: 0, Blue: 0, Green: 7 }
  },
  {
    id: "red_17",
    tier: 3,
    color: "Red",
    points: 4,
    cost: { Black: 0, White: 0, Red: 3, Blue: 3, Green: 6 }
  },
  {
    id: "red_18",
    tier: 3,
    color: "Red",
    points: 5,
    cost: { Black: 0, White: 0, Red: 3, Blue: 0, Green: 7 }
  },
  //white
  {
    id: "white_1",
    tier: 1,
    color: "White",
    points: 0,
    cost: { Black: 1, White: 0, Red: 0, Blue: 2, Green: 2 }
  },
  {
    id: "white_2",
    tier: 1,
    color: "White",
    points: 0,
    cost: { Black: 1, White: 0, Red: 2, Blue: 0, Green: 0 }
  },
  {
    id: "white_3",
    tier: 1,
    color: "White",
    points: 0,
    cost: { Black: 1, White: 0, Red: 1, Blue: 1, Green: 1 }
  },
  {
    id: "white_4",
    tier: 1,
    color: "White",
    points: 0,
    cost: { Black: 0, White: 0, Red: 0, Blue: 3, Green: 0 }
  },
  {
    id: "white_5",
    tier: 1,
    color: "White",
    points: 0,
    cost: { Black: 0, White: 0, Red: 0, Blue: 2, Green: 2 }
  },
  {
    id: "white_6",
    tier: 1,
    color: "White",
    points: 0,
    cost: { Black: 1, White: 0, Red: 1, Blue: 1, Green: 2 }
  },
  {
    id: "white_7",
    tier: 1,
    color: "White",
    points: 0,
    cost: { Black: 1, White: 3, Red: 0, Blue: 1, Green: 0 }
  },
  {
    id: "white_8",
    tier: 1,
    color: "White",
    points: 1,
    cost: { Black: 0, White: 0, Red: 0, Blue: 0, Green: 4 }
  },

  {
    id: "white_9",
    tier: 2,
    color: "White",
    points: 1,
    cost: { Black: 2, White: 0, Red: 2, Blue: 0, Green: 3 }
  },
  {
    id: "white_10",
    tier: 2,
    color: "White",
    points: 1,
    cost: { Black: 0, White: 2, Red: 3, Blue: 3, Green: 0 }
  },
  {
    id: "white_11",
    tier: 2,
    color: "White",
    points: 2,
    cost: { Black: 2, White: 0, Red: 4, Blue: 0, Green: 1 }
  },
  {
    id: "white_12",
    tier: 2,
    color: "White",
    points: 2,
    cost: { Black: 0, White: 0, Red: 5, Blue: 0, Green: 0 }
  },
  {
    id: "white_13",
    tier: 2,
    color: "White",
    points: 2,
    cost: { Black: 3, White: 0, Red: 5, Blue: 0, Green: 0 }
  },
  {
    id: "white_14",
    tier: 2,
    color: "White",
    points: 3,
    cost: { Black: 0, White: 6, Red: 0, Blue: 0, Green: 0 }
  },

  {
    id: "white_15",
    tier: 3,
    color: "White",
    points: 3,
    cost: { Black: 3, White: 0, Red: 5, Blue: 3, Green: 3 }
  },
  {
    id: "white_16",
    tier: 3,
    color: "White",
    points: 4,
    cost: { Black: 7, White: 0, Red: 0, Blue: 0, Green: 0 }
  },
  {
    id: "white_17",
    tier: 3,
    color: "White",
    points: 4,
    cost: { Black: 6, White: 3, Red: 3, Blue: 0, Green: 0 }
  },
  {
    id: "white_18",
    tier: 3,
    color: "White",
    points: 5,
    cost: { Black: 7, White: 3, Red: 0, Blue: 0, Green: 0 }
  }
];

//nobles
const ALL_NOBLES = [
  {
    id: "noble_1",
    points: 3,
    requiredBonuses: {
      White: 3,
      Blue: 3,
      Black: 0,
      Red: 0,
      Green: 3
    }
  },
  {
    id: "noble_2",
    points: 3,
    requiredBonuses: {
      White: 0,
      Blue: 3,
      Black: 0,
      Red: 3,
      Green: 3
    }
  },
  {
    id: "noble_3",
    points: 3,
    requiredBonuses: {
      White: 3,
      Blue: 0,
      Black: 3,
      Red: 3,
      Green: 0
    }
  },
  {
    id: "noble_4",
    points: 3,
    requiredBonuses: {
      White: 3,
      Blue: 3,
      Black: 3,
      Red: 0,
      Green: 0
    }
  },
  {
    id: "noble_5",
    points: 3,
    requiredBonuses: {
      White: 0,
      Blue: 0,
      Black: 3,
      Red: 3,
      Green: 3
    }
  },
  {
    id: "noble_6",
    points: 3,
    requiredBonuses: {
      White: 0,
      Blue: 0,
      Black: 4,
      Red: 4,
      Green: 0
    }
  },
  {
    id: "noble_7",
    points: 3,
    requiredBonuses: {
      White: 4,
      Blue: 0,
      Black: 4,
      Red: 0,
      Green: 0
    }
  },
  {
    id: "noble_8",
    points: 3,
    requiredBonuses: {
      White: 0,
      Blue: 0,
      Black: 0,
      Red: 4,
      Green: 4
    }
  },
  {
    id: "noble_9",
    points: 3,
    requiredBonuses: {
      White: 4,
      Blue: 4,
      Black: 0,
      Red: 0,
      Green: 0
    }
  },
  {
    id: "noble_10",
    points: 3,
    requiredBonuses: {
      White: 0,
      Blue: 4,
      Black: 0,
      Red: 0,
      Green: 4
    }
  }
];

let marketDecks = {
  1: [],
  2: [],
  3: []
};

let marketBoard = {
  1: [],
  2: [],
  3: []
};


// nobles and decks
let nobles = [];

function shuffleArray(array) {
  const copy = [...array];

  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function buildShuffledMarketDecks() {
  return {
    1: shuffleArray(ALL_MARKET_CARDS.filter(card => card.tier === 1)),
    2: shuffleArray(ALL_MARKET_CARDS.filter(card => card.tier === 2)),
    3: shuffleArray(ALL_MARKET_CARDS.filter(card => card.tier === 3))
  };
}

function buildShuffledNobles() {
  return shuffleArray(ALL_NOBLES);
}

function drawCardFromTier(tier) {
  return marketDecks[tier].shift() || null;
}

function setupMarketBoard() {
  marketBoard[1] = [];
  marketBoard[2] = [];
  marketBoard[3] = [];

  for (let i = 0; i < 4; i++) {
    const c1 = drawCardFromTier(1);
    const c2 = drawCardFromTier(2);
    const c3 = drawCardFromTier(3);

    if (c1) marketBoard[1].push(c1);
    if (c2) marketBoard[2].push(c2);
    if (c3) marketBoard[3].push(c3);
  }
}

//setup
const startBotModeButton = document.querySelector("#startBotMode");
const startMultiplayerModeButton = document.querySelector("#startMultiplayerMode");
const playerCountSelect = document.querySelector("#playerCountSelect");

//take chips
const selected = Object.fromEntries(TAKE_COLORS.map(c => [c, 0]));

const currentPlayerSection = document.querySelector("#currentPlayerPanel");
const selectedTextEl = document.querySelector("#selectedText");
const playersOverviewEl = document.querySelector("#playersOverview");

const confirmButton = document.querySelector("#confirmTake");
const clearButton = document.querySelector("#clearTake");

const buyModeButton = document.querySelector("#buyModeButton");

const reserveModeButton = document.querySelector("#reserveModeButton");
const confirmReserveButton = document.querySelector("#confirmReserve");
const cancelActionButton = document.querySelector("#cancelAction");
const selectedReserveTextEl = document.querySelector("#selectedReserveText");
const currentPlayerLabelEl = document.querySelector("#currentPlayerLabel");

//bonusChip
const currentPlayerVictoryPointsEl = document.querySelector("#currentPlayerVictoryPoints");

const bonusChipEl = document.querySelector("#bonusChip");
const currentPlayerRedBonusEl = document.querySelector("#currentPlayerRedBonus");
const currentPlayerGreenBonusEl = document.querySelector("#currentPlayerGreenBonus");
const currentPlayerBlueBonusEl = document.querySelector("#currentPlayerBlueBonus");
const currentPlayerBlackBonusEl = document.querySelector("#currentPlayerBlackBonus");
const currentPlayerWhiteBonusEl = document.querySelector("#currentPlayerWhiteBonus");

//debug purpose
const debugEndGameButton = document.querySelector("#debugEndGame");

//for bot purposes
const modeBotButton = document.querySelector("#modeBot");
const modeMultiplayerButton = document.querySelector("#modeMultiplayer");
const currentModeLabelEl = document.querySelector("#currentModeLabel");

//log
const gameLogEl = document.querySelector("#gameLog");
let logHistory = [];

function startConfiguredGame(mode) {
  state.playerCount = playerCountSelect
    ? Number(playerCountSelect.value)
    : 3;

  state.gameMode = mode;
  state.screen = "game";

  resetGameForMode(mode);
  showGameScreen();
}

startBotModeButton.addEventListener("click", () => {
  startConfiguredGame("bot");
});

startMultiplayerModeButton.addEventListener("click", () => {
  showMultiplayerLobbyScreen();
  socket.emit("list-rooms");
});

if (backToSetupButton) {
  backToSetupButton.addEventListener("click", () => {
    currentRoomId = null;
    latestRoomState = null;
    isCurrentUserHost = false;
    myPlayerIndex = 0;

    if (lobbyInfoEl) {
      lobbyInfoEl.textContent = "Join a room to begin.";
    }

    if (startRoomGameButton) {
      startRoomGameButton.disabled = true;
    }

    showSetupScreen();
  });
}

function setLog(message) {
  logHistory.unshift(message);

  if (logHistory.length > 100) {
    logHistory.pop();
  }

  renderLogHistory();
}

function debugSetNearEndGame() {
  if (state.gameOver) return;
  const player = getCurrentPlayer();

  player.victoryPoints = 14;

  player.bonusChip.Red = 3;
  player.bonusChip.Green = 3;
  player.bonusChip.Blue = 3;
  player.bonusChip.Black = 3;
  player.bonusChip.White = 3;

  player.chips.Red = 3;
  player.chips.Green = 3;
  player.chips.Blue = 3;
  player.chips.Black = 3;
  player.chips.White = 3;
  player.chips.Wild = 2;

  setLog(`Debug: Player ${state.currentPlayerIndex + 1} is now near end game.`);
  render();
}

function totalChip(obj) {
  return Object.values(obj).reduce((a, b) => a + b, 0);
}

function getNobleCount(playerCount) {
  return playerCount + 1;
}

function createBank(playerCount) {
  let colorChipCount = 7;

  if (playerCount === 2) colorChipCount = 4;
  else if (playerCount === 3) colorChipCount = 5;
  else if (playerCount === 4) colorChipCount = 7;

  return {
    Red: colorChipCount,
    Green: colorChipCount,
    Blue: colorChipCount,
    Black: colorChipCount,
    White: colorChipCount,
    Wild: 5
  };
}

function renderActionStatus() {
  const actionModeTextEl = document.querySelector("#actionModeText");
  const actionHintTextEl = document.querySelector("#actionHintText");

  if (!actionModeTextEl || !actionHintTextEl) return;

  if (state.currentAction === "take") {
    actionModeTextEl.textContent = "Take Chips";
    actionHintTextEl.textContent = "Pick chips from Bank, then press Take Chips.";
    return;
  }

  if (state.currentAction === "reserve") {
    actionModeTextEl.textContent = "Reserve Card";

    if (state.selectedReserveIndex === null && state.selectedDeckTier === null) {
      actionHintTextEl.textContent = "Click a market card or deck stack, then press Reserve Card again.";
    } else {
      actionHintTextEl.textContent = "Selection is highlighted. Press Reserve Card to confirm, or Cancel.";
    }

    return;
  }

  if (state.currentAction === "buy") {
    actionModeTextEl.textContent = "Buy Card";

    if (state.selectedBuyIndex === null && state.selectedReservedCardIndex === null) {
      actionHintTextEl.textContent = "Click a market card or reserved card, then press Buy Card again.";
    } else {
      actionHintTextEl.textContent = "Selected card is highlighted. Press Buy Card to confirm, or Cancel.";
    }

    return;
  }
}

function render() {
  const currentTurnPlayer = getCurrentPlayer();
  const player = state.players[state.humanPlayerIndex];

  for (const c of TAKE_COLORS) {
    document.querySelector(`#currentPlayer${c}Chip`).textContent = player.chips[c];
    document.querySelector(`#bankRemaining${c}Chip`).textContent = state.bank[c];
  }

  document.querySelector("#currentPlayerWildChip").textContent = player.chips.Wild;
  document.querySelector("#bankRemainingWildChip").textContent = state.bank.Wild;

  const parts = [];
  for (const c of TAKE_COLORS) {
    if (selected[c] > 0) parts.push(`${c} x${selected[c]}`);
  }
  selectedTextEl.textContent = parts.length ? parts.join(", ") : "none";

  const playerTotalChip = totalChip(player.chips);
  const selectedTotalChip = totalChip(selected);

  const isMyTurn =
    !isMultiplayerMode() ||
    state.currentPlayerIndex === state.humanPlayerIndex;

  confirmButton.disabled =
    !isMyTurn ||
    (state.currentAction !== "take") ||
    (selectedTotalChip === 0) ||
    (playerTotalChip + selectedTotalChip > 10) ||
    (!isValidTakeSelection());

  clearButton.disabled = (selectedTotalChip === 0);

  document.querySelectorAll("#currentPlayerPanel .chipButton").forEach(btn => {
    const action = btn.dataset.action;
    const color = btn.dataset.color;

    if (color === "Wild") {
      btn.disabled = true;
      return;
    }

    if (action === "add") {
      const noSpace = playerTotalChip >= 10;
      const remainingToSelect = state.bank[color] - selected[color];
      btn.disabled = !isMyTurn || noSpace || (remainingToSelect <= 0);
    }

    if (action === "remove") {
      btn.disabled = !isMyTurn || player.chips[color] <= 0;
    }
  });

  if (state.selectedReserveIndex === null) {
    selectedReserveTextEl.textContent = "none";

  }

  else {
    const { cardId, tier } = state.selectedReserveIndex;
    const card = marketBoard[tier].find(card => card.id === cardId);

    selectedReserveTextEl.textContent = card
      ? `${card.color} | Level ${card.tier} | ${card.points} VP`
      : "none";
  }

  confirmReserveButton.disabled =
    state.currentAction !== "reserve" ||
    state.selectedReserveIndex === null ||
    player.reservedCards.length >= 3;

  const hasSelectedChips = selectedTotalChip > 0;
  const hasSelectedReserveCard = state.selectedReserveIndex !== null;
  const hasSelectedBuyCard = state.selectedBuyIndex !== null;
  const isNotDefaultAction = state.currentAction !== "take";
  const hasSelectedReservedCard = state.selectedReservedCardIndex !== null;
  const hasSelectedDeck = state.selectedDeckTier !== null;

  cancelActionButton.disabled =
    !hasSelectedChips &&
    !hasSelectedReserveCard &&
    !hasSelectedBuyCard &&
    !hasSelectedReservedCard &&
    !hasSelectedDeck &&
    !isNotDefaultAction;

  reserveModeButton.disabled = false;

  currentPlayerVictoryPointsEl.textContent = player.victoryPoints;

  currentPlayerRedBonusEl.textContent = player.bonusChip.Red;
  currentPlayerGreenBonusEl.textContent = player.bonusChip.Green;
  currentPlayerBlueBonusEl.textContent = player.bonusChip.Blue;
  currentPlayerBlackBonusEl.textContent = player.bonusChip.Black;
  currentPlayerWhiteBonusEl.textContent = player.bonusChip.White;

  currentPlayerLabelEl.textContent = getPlayerDisplayName(state.humanPlayerIndex);
  currentModeLabelEl.textContent = isBotMode() ? "Vs Bot" : "Multiplayer";

  document.querySelectorAll(".deck-stack").forEach(deckEl => {
    const tier = Number(deckEl.dataset.tier);

    deckEl.classList.toggle(
      "is-selected-deck",
      state.currentAction === "reserve" && state.selectedDeckTier === tier
    );
  });

  renderMarket();
  // renderOwnedCards();
  renderReservedCards();
  renderNobles();
  renderPlayersOverview();
  renderActionStatus();

  if (state.gameOver) {
    confirmButton.disabled = true;
    clearButton.disabled = true;
    confirmReserveButton.disabled = true;
    reserveModeButton.disabled = true;
    cancelActionButton.disabled = true;
    debugEndGameButton.disabled = true;
  }

  if (isBotTurn()) {
    confirmButton.disabled = true;
    clearButton.disabled = true;
    confirmReserveButton.disabled = true;
    reserveModeButton.disabled = true;
    cancelActionButton.disabled = true;
  }

}

function isValidTakeSelection() {
  const totalSel = totalChip(selected);
  if (totalSel === 0) return true;

  const pickedColors = TAKE_COLORS.filter(c => selected[c] > 0);
  const distinct = pickedColors.length;
  const maxPerColor = Math.max(...TAKE_COLORS.map(c => selected[c]));

  const threeChipDistinct = totalSel <= 3 && maxPerColor === 1;

  const twoSame =
    totalSel === 2 &&
    distinct === 1 &&
    state.bank[pickedColors[0]] >= 4;

  return threeChipDistinct || twoSame;
}

function finishGame() {
  state.gameOver = true;

  const rankedPlayers = state.players
    .map((player, index) => ({ player, index }))
    .sort((a, b) => {
      if (b.player.victoryPoints !== a.player.victoryPoints) {
        return b.player.victoryPoints - a.player.victoryPoints;
      }

      return a.player.ownedCards.length - b.player.ownedCards.length;
    });

  const best = rankedPlayers[0];

  const winners = rankedPlayers.filter(({ player }) => {
    return (
      player.victoryPoints === best.player.victoryPoints &&
      player.ownedCards.length === best.player.ownedCards.length
    );
  });

  if (winners.length === 1) {
    const winner = winners[0];
    const label = getPlayerDisplayName(winner.index);

    setLog(
      `Game over. ${label} wins with ${winner.player.victoryPoints} points and ${winner.player.ownedCards.length} owned cards.`
    );
  } else {
    const labels = winners.map(({ index }) => getPlayerDisplayName(index));

    setLog(
      `Game over. Draw between ${labels.join(", ")} with ${best.player.victoryPoints} points and ${best.player.ownedCards.length} owned cards.`
    );
  }

  render();
}

function endTurn() {
  const playerJustFinishedIndex = state.currentPlayerIndex;
  const playerJustFinished = state.players[playerJustFinishedIndex];

  if (!state.gameEnding && playerJustFinished.victoryPoints >= 15) {
    state.gameEnding = true;
    state.endGameTriggeredBy = playerJustFinishedIndex;
  }

  clearSelectionOnly();
  state.selectedBuyIndex = null;
  state.selectedReserveIndex = null;
  state.selectedReservedCardIndex = null;
  state.selectedDeckTier = null;
  state.currentAction = "take";

  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

  if (state.gameEnding && nextPlayerIndex === state.endGameTriggeredBy) {
    finishGame();
    return;
  }

  state.currentPlayerIndex = nextPlayerIndex;
  render();

  if (isBotTurn() && !state.gameOver) {
    setTimeout(() => {
      runBotTurn();
    }, 1000);
  }
}

function clearSelectionOnly() {
  for (const c of TAKE_COLORS) selected[c] = 0;
}

function applyTakeSelection() {
  const player = getCurrentPlayer();

  for (const c of TAKE_COLORS) {
    const k = selected[c];
    if (k <= 0) continue;
    if (state.bank[c] < k) continue;

    state.bank[c] -= k;
    player.chips[c] += k;
    selected[c] = 0;
  }
}

function confirmTake() {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  if (isMultiplayerMode()) {
    if (state.currentPlayerIndex !== state.humanPlayerIndex) {
      setLog("It is not your turn.");
      return;
    }

    const takenChips = {};

    for (const color of TAKE_COLORS) {
      if (selected[color] > 0) {
        takenChips[color] = selected[color];
      }
    }

    socket.emit("take-chips", {
      chips: takenChips
    });

    return;
  }

  const player = getCurrentPlayer();
  const playerTotalChip = totalChip(player.chips);
  const selectedTotalChip = totalChip(selected);

  const currentPlayerName = getPlayerDisplayName(state.currentPlayerIndex);
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayerName = getPlayerDisplayName(nextPlayerIndex);

  const takenParts = TAKE_COLORS
    .filter(color => selected[color] > 0)
    .map(color => `${color} x${selected[color]}`);

  if (playerTotalChip + selectedTotalChip > 10) {
    setLog(`Player ${state.currentPlayerIndex + 1} cannot take more than 10 chips.`);
    return;
  }

  applyTakeSelection();

  setLog(`${currentPlayerName} took ${takenParts.join(", ")}. ${nextPlayerName}'s turn.`);
  endTurn();
}

function clearSelection() {
  clearSelectionOnly();
  render();
}

function trySelectChip(color) {
  if (state.gameOver) return;
  if (isBotTurn()) return;
  if (state.currentAction !== "take") return;
  if (!TAKE_COLORS.includes(color)) return;

  if (isMultiplayerMode() && state.currentPlayerIndex !== state.humanPlayerIndex) {
    setLog("It is not your turn.");
    return;
  }

  if ((state.bank[color] - selected[color]) <= 0) return;

  selected[color] += 1;

  if (!isValidTakeSelection()) {
    selected[color] -= 1;
    return;
  }

  render();
}

currentPlayerSection.addEventListener("click", (e) => {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  const btn = e.target.closest(".chipButton");
  if (!btn) return;

  if (state.currentAction !== "take") return;

  const action = btn.dataset.action;
  const color = btn.dataset.color;

  if (action === "add") {
    trySelectChip(color);
  }

  if (action === "remove") {
    const player = getCurrentPlayer();
    if (player.chips[color] <= 0) return;
    player.chips[color] -= 1;
    state.bank[color] += 1;
    render();
  }
});

const bankChipsEl = document.querySelector("#bankChips");

bankChipsEl.addEventListener("click", (e) => {
  const chipEl = e.target.closest(".bank-chip");
  if (!chipEl) return;

  const color = chipEl.dataset.color;
  trySelectChip(color);
});

// mode changes
function resetGameForMode(mode) {
  logHistory = [];
  state.players = createPlayers(state.playerCount);
  state.currentPlayerIndex = 0;
  state.gameMode = mode;
  state.bank = createBank(state.playerCount);
  state.currentAction = "take";
  state.selectedBuyIndex = null;
  state.selectedReserveIndex = null;
  state.selectedReservedCardIndex = null;
  state.selectedDeckTier = null;
  state.gameEnding = false;
  state.endGameTriggeredBy = null;
  state.gameOver = false;

  marketDecks = buildShuffledMarketDecks();
  setupMarketBoard();
  nobles = buildShuffledNobles().slice(0, getNobleCount(state.playerCount));

  for (const color of TAKE_COLORS) {
    selected[color] = 0;
  }

  setLog(
    mode === "bot"
      ? "Game started in Vs Bot mode. Player 1's turn."
      : "Game started in Multiplayer mode. Player 1's turn."
  );

  render();
}

function setGameMode(mode) {
  resetGameForMode(mode);
}

function createColorPieceHTML(color, value, type) {
  return `
    <span class="color-piece ${type}-piece ${color.toLowerCase()}" title="${color}">
      <strong>${value}</strong>
    </span>
  `;
}

function createCardHTML(card, index, tier) {
  const costHTML = Object.entries(card.cost)
    .filter(([color, amount]) => amount > 0)
    .map(([color, amount]) => {
      return createColorPieceHTML(color, amount, "chip");
    })
    .join("");

  const isSelectedReserve =
    state.currentAction === "reserve" &&
    state.selectedReserveIndex &&
    state.selectedReserveIndex.cardId === card.id &&
    state.selectedReserveIndex.tier === tier;

  const isSelectedBuy =
    state.currentAction === "buy" &&
    state.selectedBuyIndex &&
    state.selectedBuyIndex.cardId === card.id &&
    state.selectedBuyIndex.tier === tier;

  const selectedClass = isSelectedReserve || isSelectedBuy ? "is-selected-card" : "";

  return `
    <div class="card ${selectedClass}" data-id="${card.id}" data-tier="${tier}">
      <div class="card-top">
        <span class="card-points">${card.points}</span>
        <span class="card-bonus ${card.color.toLowerCase()}">${card.color}</span>
      </div>
      <div class="card-middle">
        <div>Level ${card.tier}</div>
      </div>
      <div class="card-costs">
        ${costHTML}    
      </div>
    </div>
  `;
}

function createDeckStackHTML(tier) {
  const selectedClass =
    state.currentAction === "reserve" &&
      state.selectedDeckTier === tier
      ? "is-selected-deck"
      : "";

  return `
    <button class="deck-stack ${selectedClass}" data-tier="${tier}">
      <strong>L${tier}</strong>
      <span>${marketDecks[tier].length}</span>
    </button>
  `;
}

function renderNobles() {
  const noblesEl = document.querySelector("#noblesArea");
  noblesEl.innerHTML = nobles.map(createNobleHTML).join("");
}

// function renderCollectedNobles(){
//   const player = state.players[state.humanPlayerIndex];
//   const collectedNoblesEl = document.querySelector("#currentPlayerCollectedNobles");

//   if (!collectedNoblesEl) return;

//   if (player.nobles.length === 0){
//     collectedNoblesEl.innerHTML = `<div class="emptyText">No nobles yet</div>`;
//     return;
//   }

//   collectedNoblesEl.innerHTML = player.nobles
//   .map(noble => {
//     const reqText = Object.entries(noble.requiredBonuses)
//       .filter(([_, amount]) => amount > 0)
//       .map(([color, amount]) => `${color}: ${amount}`)
//       .join(" | ");

//     return `
//       <div class="mini-noble">
//         <div class="mini-noble-title">${noble.id}</div>
//         <div class="mini-noble-points">${noble.points} VP</div>
//         <div class="mini-noble-req">${reqText}</div>
//       </div>
//     `;
//   })
//   .join("");
// }

function createMiniTokenHTML(color, value) {
  const shortName = {
    Red: "Red",
    Green: "Green",
    Blue: "Blue",
    Black: "Black",
    White: "White",
    Wild: "Wild"
  };

  return `
    <span class="mini-token ${color.toLowerCase()}">
      ${shortName[color]}${value}
    </span>
  `;
}

function createPlayerPieceHTML(color, value, type) {
  return `
    <span class="player-piece ${type}-piece ${color.toLowerCase()}" title="${color}">
      <strong>${value}</strong>
    </span>
  `;
}

function createPlayerPieceGroupHTML(values, colors, type) {
  return colors
    .map(color => createPlayerPieceHTML(color, values[color] || 0, type))
    .join("");
}

function renderPlayersOverview() {
  if (!playersOverviewEl) return;

  playersOverviewEl.innerHTML = state.players
    .map((player, index) => ({ player, index }))
    .filter(({ index }) => index !== state.humanPlayerIndex)
    .map(({ player, index }) => {
      const roleLabel = getPlayerDisplayName(index);

      const bonusHTML = createPlayerPieceGroupHTML(
        player.bonusChip,
        ["Red", "Green", "Blue", "Black", "White"],
        "bonus"
      );

      const chipsHTML = createPlayerPieceGroupHTML(
        player.chips,
        ["Red", "Green", "Blue", "Black", "White", "Wild"],
        "chip"
      );

      return `
        <div class="player-overview-card">
          <div class="player-card-header">
            <strong>${roleLabel}</strong>
            <span class="player-vp">★ ${player.victoryPoints}</span>
          </div>

          <div class="player-card-row">
            <span class="player-row-label">Bonus</span>
            <div class="piece-group bonus-group">${bonusHTML}</div>
          </div>

          <div class="player-card-row">
            <span class="player-row-label">Chips</span>
            <div class="piece-group chip-group">${chipsHTML}</div>
          </div>

          <div class="player-card-footer">
            <span>Reserved ${player.reservedCards.length}</span>
            <span>Nobles ${player.nobles.length}</span>
          </div>
        </div>
      `;
    }).join("");
}

function createNobleHTML(noble) {
  const requirementHTML = Object.entries(noble.requiredBonuses)
    .filter(([color, amount]) => amount > 0)
    .map(([color, amount]) => {
      return createColorPieceHTML(color, amount, "bonus");
    })
    .join("");

  return `
    <div class="card noble-card">
      <div class="card-top">
        <span class="card-points">${noble.points}</span>
        <span class="noble-badge">Noble</span>
      </div>
      <div class="card-middle">
        <div class="noble-title">${noble.id}</div>
      </div>
      <div class="card-costs noble-costs">
        ${requirementHTML}
      </div>
    </div>
  `;
}

const marketAreaEl = document.querySelector("#marketArea");
const marketTier3El = document.querySelector("#marketTier3");
const marketTier2El = document.querySelector("#marketTier2");
const marketTier1El = document.querySelector("#marketTier1");
const reservedCardsEl = document.querySelector("#currentPlayerReservedCards");

//important
function buyMarketCardById(cardId, tier) {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  if (isMultiplayerMode()) {
    if (state.currentPlayerIndex !== state.humanPlayerIndex) {
      setLog("It is not your turn.");
      return;
    }

    socket.emit("buy-card", {
      fromReserved: false,
      cardId,
      tier
    });

    return;
  }

  const card = marketBoard[tier].find(card => card.id === cardId);
  if (!card) return;

  if (!canAffordCard(card)) {
    setLog(`${getPlayerDisplayName(state.currentPlayerIndex)} does not have enough chips to buy this card.`);
    return;
  }

  const player = getCurrentPlayer();
  const currentPlayerName = getPlayerDisplayName(state.currentPlayerIndex);
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayerName = getPlayerDisplayName(nextPlayerIndex);

  payForCard(card);
  applyCardReward(card);

  const cardIndex = marketBoard[tier].findIndex(card => card.id === cardId);
  if (cardIndex === -1) return;

  marketBoard[tier].splice(cardIndex, 1);

  const replacement = drawCardFromTier(tier);
  if (replacement) marketBoard[tier].push(replacement);

  player.ownedCards.push(card);

  const claimedNoble = claimAvailableNoble(player);

  if (claimedNoble) {
    setLog(`${currentPlayerName} bought a ${card.color} card (${card.points} VP), claimed ${claimedNoble.id}. ${nextPlayerName}'s turn.`);
  } else {
    setLog(`${currentPlayerName} bought a ${card.color} card (${card.points} VP). ${nextPlayerName}'s turn.`);
  }

  endTurn();
}

marketAreaEl.addEventListener("click", (e) => {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  const deckEl = e.target.closest(".deck-stack");

  if (deckEl) {
    if (state.currentAction !== "reserve") return;

    const tier = Number(deckEl.dataset.tier);

    if (marketDecks[tier].length <= 0) {
      setLog(`No cards left in Tier ${tier} deck.`);
      return;
    }

    state.selectedDeckTier = tier;
    state.selectedReserveIndex = null;
    state.selectedBuyIndex = null;

    render();
    return;
  }

  const cardEl = e.target.closest(".card");
  if (!cardEl) return;

  const cardId = cardEl.dataset.id;
  const tier = Number(cardEl.dataset.tier);

  if (state.currentAction === "reserve") {
    state.selectedReserveIndex = { cardId, tier };
    state.selectedDeckTier = null;
    state.selectedBuyIndex = null;
    render();
    return;
  }

  if (state.currentAction === "buy") {
    state.selectedBuyIndex = { cardId, tier };
    state.selectedReserveIndex = null;
    state.selectedDeckTier = null;
    render();
    return;
  }
});

function buyReservedCardByIndex(index) {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  if (isMultiplayerMode()) {
    if (state.currentPlayerIndex !== state.humanPlayerIndex) {
      setLog("It is not your turn.");
      return;
    }

    socket.emit("buy-card", {
      fromReserved: true,
      reservedIndex: index
    });

    return;
  }

  const player = getCurrentPlayer();
  const card = player.reservedCards[index];

  if (!card) return;

  if (!canAffordCard(card)) {
    setLog(`${getPlayerDisplayName(state.currentPlayerIndex)} does not have enough chips to buy this reserved card.`);
    return;
  }

  payForCard(card);
  applyCardReward(card);

  player.ownedCards.push(card);
  player.reservedCards.splice(index, 1);

  const claimedNoble = claimAvailableNoble(player);

  const currentPlayerName = getPlayerDisplayName(state.currentPlayerIndex);
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayerName = getPlayerDisplayName(nextPlayerIndex);

  if (claimedNoble) {
    setLog(`${currentPlayerName} bought a reserved ${card.color} card (${card.points} VP), claimed ${claimedNoble.id}. ${nextPlayerName}'s turn.`);
  } else {
    setLog(`${currentPlayerName} bought a reserved ${card.color} card (${card.points} VP). ${nextPlayerName}'s turn.`);
  }

  endTurn();
}

reservedCardsEl.addEventListener("click", (e) => {
  if (state.gameOver) return;
  if (isBotTurn()) return;
  if (state.currentAction !== "buy") return;

  const cardEl = e.target.closest(".reserved-card");
  if (!cardEl) return;

  const index = Number(cardEl.dataset.index);

  state.selectedReservedCardIndex = index;
  state.selectedBuyIndex = null;
  state.selectedReserveIndex = null;
  state.selectedDeckTier = null;

  render();
});

buyModeButton.addEventListener("click", () => {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  if (isMultiplayerMode() && state.currentPlayerIndex !== state.humanPlayerIndex) {
    setLog("It is not your turn.");
    return;
  }

  if (state.currentAction === "buy" && state.selectedBuyIndex !== null) {
    const { cardId, tier } = state.selectedBuyIndex;
    buyMarketCardById(cardId, tier);
    return;
  }

  if (state.currentAction === "buy" && state.selectedReservedCardIndex !== null) {
    buyReservedCardByIndex(state.selectedReservedCardIndex);
    return;
  }

  state.currentAction = "buy";
  state.selectedBuyIndex = null;
  state.selectedReservedCardIndex = null;
  state.selectedReserveIndex = null;
  state.selectedDeckTier = null;
  clearSelectionOnly();

  setLog(`${getPlayerDisplayName(state.currentPlayerIndex)} is choosing a card to buy.`);
  render();
});

function canAffordCard(card) {
  const player = getCurrentPlayer();
  let wildNeeded = 0;

  for (const color of BONUS_COLORS) {
    const cost = card.cost[color] || 0;
    const bonus = player.bonusChip[color] || 0;
    const chips = player.chips[color] || 0;

    const discountedCost = Math.max(0, cost - bonus);
    const missing = Math.max(0, discountedCost - chips);

    wildNeeded += missing;
  }

  return wildNeeded <= player.chips.Wild;
}

function getVisibleMarketCards() {
  return [...marketBoard[1], ...marketBoard[2], ...marketBoard[3]];
}

function getAffordableMarketCards() {
  return getVisibleMarketCards().filter(card => canAffordCard(card));
}

function payForCard(card) {
  const player = getCurrentPlayer();

  for (const color of BONUS_COLORS) {
    const cost = card.cost[color] || 0;
    const bonus = player.bonusChip[color] || 0;

    const discountedCost = Math.max(0, cost - bonus);

    const useNormalChips = Math.min(player.chips[color], discountedCost);
    player.chips[color] -= useNormalChips;
    state.bank[color] += useNormalChips;

    const stillMissing = discountedCost - useNormalChips;

    if (stillMissing > 0) {
      player.chips.Wild -= stillMissing;
      state.bank.Wild += stillMissing;
    }
  }
}

// botv1
function getCardTotalCost(card) {
  return BONUS_COLORS.reduce((sum, color) => {
    return sum + (card.cost[color] || 0);
  }, 0);
}

function chooseBestAffordableCard(cards) {
  if (cards.length === 0) return null;

  const sortedCards = [...cards].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return getCardTotalCost(a) - getCardTotalCost(b);
  });

  return sortedCards[0];
}

function chooseTargetCardForBot() {
  const unavailableCards = getVisibleMarketCards().filter(card => !canAffordCard(card));

  if (unavailableCards.length === 0) return null;

  const sortedCards = [...unavailableCards].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    return getCardTotalCost(a) - getCardTotalCost(b);
  });

  return sortedCards[0];
}

function getNeededColorsForCard(player, card) {
  const neededColors = [];

  for (const color of BONUS_COLORS) {
    const cost = card.cost[color] || 0;
    const bonus = player.bonusChip[color] || 0;
    const chips = player.chips[color] || 0;
    const discountedCost = Math.max(0, cost - bonus);
    const missing = Math.max(0, discountedCost - chips);

    if (missing > 0 && state.bank[color] > 0) {
      neededColors.push(color);
    }
  }

  return neededColors;
}

function botTakeChips() {
  const player = getCurrentPlayer();

  if (totalChip(player.chips) >= 10) {
    return false;
  }

  const targetCard = chooseTargetCardForBot();

  let colorsToTake = [];

  if (targetCard) {
    colorsToTake = getNeededColorsForCard(player, targetCard).slice(0, 3);
  }

  if (colorsToTake.length === 0) {
    colorsToTake = TAKE_COLORS
      .filter(color => state.bank[color] > 0)
      .slice(0, 3);
  }

  for (const color of TAKE_COLORS) {
    selected[color] = 0;
  }

  for (const color of colorsToTake) {
    selected[color] = 1;
  }

  if (
    !isValidTakeSelection() ||
    totalChip(player.chips) + totalChip(selected) > 10
  ) {
    for (const color of TAKE_COLORS) {
      selected[color] = 0;
    }

    const fallbackColors = TAKE_COLORS
      .filter(color => state.bank[color] > 0)
      .slice(0, Math.min(3, 10 - totalChip(player.chips)));

    for (const color of fallbackColors) {
      selected[color] = 1;
    }
  }

  if (
    !isValidTakeSelection() ||
    totalChip(selected) === 0 ||
    totalChip(player.chips) + totalChip(selected) > 10
  ) {
    for (const color of TAKE_COLORS) {
      selected[color] = 0;
    }

    return false;
  }

  const takenParts = TAKE_COLORS
    .filter(c => selected[c] > 0)
    .map(c => `${c} x${selected[c]}`);

  applyTakeSelection();

  const botName = getPlayerDisplayName(state.currentPlayerIndex);
  setLog(`${botName} took ${takenParts.join(", ")}.`);

  endTurn();
  return true;
}

function botBuyCard() {
  const affordableCards = getAffordableMarketCards();
  const chosenCard = chooseBestAffordableCard(affordableCards);

  if (!chosenCard) return false;

  const player = getCurrentPlayer();

  payForCard(chosenCard);
  applyCardReward(chosenCard);

  const tier = chosenCard.tier;
  const cardIndex = marketBoard[tier].findIndex(card => card.id === chosenCard.id);

  if (cardIndex !== -1) {
    marketBoard[tier].splice(cardIndex, 1);
    const replacement = drawCardFromTier(tier);
    if (replacement) marketBoard[tier].push(replacement);
  }

  player.ownedCards.push(chosenCard);

  const claimedNoble = claimAvailableNoble(player);

  const botName = getPlayerDisplayName(state.currentPlayerIndex);

  if (claimedNoble) {
    setLog(`${botName} bought ${chosenCard.color} (${chosenCard.points} VP) and claimed ${claimedNoble.id}.`);
  } else {
    setLog(`${botName} bought ${chosenCard.color} (${chosenCard.points} VP).`);
  }

  endTurn();
  return true;
}

//run bot
function runBotTurn() {
  if (state.gameOver) return;
  if (!isBotTurn()) return;

  const bought = botBuyCard();
  if (bought) return;

  const tookChips = botTakeChips();
  if (tookChips) return;

  const botName = getPlayerDisplayName(state.currentPlayerIndex);
  setLog(`${botName} has no valid action and skips this turn.`);

  endTurn();
}

function applyCardReward(card) {
  const player = getCurrentPlayer();
  player.victoryPoints += card.points;
  player.bonusChip[card.color] += 1;
}

function canClaimNoble(player, noble) {
  return BONUS_COLORS.every(color =>
    (player.bonusChip[color] || 0) >= (noble.requiredBonuses[color] || 0)
  );
}

function claimAvailableNoble(player) {
  const nobleIndex = nobles.findIndex(noble => canClaimNoble(player, noble));
  if (nobleIndex === -1) return null;

  const noble = nobles[nobleIndex];
  nobles.splice(nobleIndex, 1);
  player.nobles.push(noble);
  player.victoryPoints += noble.points;

  return noble;
}

// reserve card, as well as putting index for easier find
function renderOwnedCards() {
  const player = state.players[state.humanPlayerIndex];
  const ownedEl = document.querySelector("#currentPlayerOwnedCards");

  ownedEl.innerHTML = player.ownedCards
    .map((card, index) => {
      return `
        <div class="card">
          <div class="card-top">
            <span class="card-points">${card.points}</span>
            <span class="card-bonus ${card.color.toLowerCase()}">${card.color}</span>
          </div>
          <div class="card-middle">
            <div>Level ${card.tier}</div>
          </div>
        </div>
      `;
    })
    .join("");
}

function enterReserveMode() {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  if (isMultiplayerMode() && state.currentPlayerIndex !== state.humanPlayerIndex) {
    setLog("It is not your turn.");
    return;
  }

  state.currentAction = "reserve";
  state.selectedReserveIndex = null;
  setLog(`Player ${state.currentPlayerIndex + 1} is choosing a card to reserve.`);
  render();
}

function reserveCardById(cardId, tier) {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  const player = getCurrentPlayer();

  if (state.currentAction !== "reserve") return;
  if (player.reservedCards.length >= 3) {
    setLog(`${getPlayerDisplayName(state.currentPlayerIndex)} cannot reserve more than 3 cards.`);
    return;
  }

  const card = marketBoard[tier].find(card => card.id === cardId);
  if (!card) return;

  player.reservedCards.push(card);

  const cardIndex = marketBoard[tier].findIndex(card => card.id === cardId);
  if (cardIndex === -1) return;

  marketBoard[tier].splice(cardIndex, 1);

  const replacement = drawCardFromTier(tier);
  if (replacement) marketBoard[tier].push(replacement);

  if (state.bank.Wild > 0 && totalChip(player.chips) < 10) {
    player.chips.Wild += 1;
    state.bank.Wild -= 1;
  }

  const currentPlayerName = getPlayerDisplayName(state.currentPlayerIndex);
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayerName = getPlayerDisplayName(nextPlayerIndex);

  setLog(`${currentPlayerName} reserved a ${card.color} level ${card.tier} card. ${nextPlayerName}'s turn.`);

  endTurn();
}

function confirmReserveCard() {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  if (isMultiplayerMode()) {
    if (state.currentPlayerIndex !== state.humanPlayerIndex) {
      setLog("It is not your turn.");
      return;
    }

    if (state.currentAction !== "reserve") return;

    if (state.selectedReserveIndex === null && state.selectedDeckTier === null) {
      return;
    }

    const player = state.players[state.humanPlayerIndex];

    if (player.reservedCards.length >= 3) {
      setLog("You cannot reserve more than 3 cards.");
      return;
    }

    if (state.selectedDeckTier !== null) {
      socket.emit("reserve-card", {
        fromDeck: true,
        tier: state.selectedDeckTier
      });

      return;
    }

    const { cardId, tier } = state.selectedReserveIndex;

    socket.emit("reserve-card", {
      fromDeck: false,
      cardId,
      tier
    });

    return;
  }

  const player = getCurrentPlayer();

  if (state.currentAction !== "reserve") return;

  if (state.selectedReserveIndex === null && state.selectedDeckTier === null) {
    return;
  }

  if (player.reservedCards.length >= 3) {
    setLog(`${getPlayerDisplayName(state.currentPlayerIndex)} cannot reserve more than 3 cards.`);
    return;
  }

  let card = null;
  let tier = null;
  let reservedFromDeck = false;

  if (state.selectedReserveIndex !== null) {
    const { cardId } = state.selectedReserveIndex;
    tier = state.selectedReserveIndex.tier;

    card = marketBoard[tier].find(card => card.id === cardId);
    if (!card) return;

    const cardIndex = marketBoard[tier].findIndex(card => card.id === cardId);
    if (cardIndex === -1) return;

    marketBoard[tier].splice(cardIndex, 1);

    const replacement = drawCardFromTier(tier);
    if (replacement) marketBoard[tier].push(replacement);
  }

  if (state.selectedDeckTier !== null) {
    tier = state.selectedDeckTier;
    card = drawCardFromTier(tier);
    reservedFromDeck = true;

    if (!card) {
      setLog(`No cards left in Tier ${tier} deck.`);
      return;
    }
  }

  player.reservedCards.push(card);

  if (state.bank.Wild > 0 && totalChip(player.chips) < 10) {
    player.chips.Wild += 1;
    state.bank.Wild -= 1;
  }

  const currentPlayerName = getPlayerDisplayName(state.currentPlayerIndex);
  const nextPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  const nextPlayerName = getPlayerDisplayName(nextPlayerIndex);

  if (reservedFromDeck) {
    setLog(`${currentPlayerName} reserved a face-down Tier ${tier} card. ${nextPlayerName}'s turn.`);
  } else {
    setLog(`${currentPlayerName} reserved a ${card.color} level ${card.tier} card. ${nextPlayerName}'s turn.`);
  }

  endTurn();
}

function renderReservedCards() {
  const player = state.players[state.humanPlayerIndex];
  const reservedEl = document.querySelector("#currentPlayerReservedCards");

  reservedEl.innerHTML = player.reservedCards
    .map((card, index) => {
      const costHTML = Object.entries(card.cost)
        .filter(([color, amount]) => amount > 0)
        .map(([color, amount]) => {
          return createColorPieceHTML(color, amount, "chip");
        })
        .join("");

      const isSelectedReserved =
        state.currentAction === "buy" &&
        state.selectedReservedCardIndex === index;

      const selectedClass = isSelectedReserved ? "is-selected-card" : "";

      return `
        <div class="card reserved-card ${selectedClass}" data-index="${index}">
          <div class="card-top">
            <span class="card-points">${card.points}</span>
            <span class="card-bonus ${card.color.toLowerCase()}">${card.color}</span>
          </div>
          <div class="card-middle">
            <div>Level ${card.tier}</div>
          </div>
          <div class="card-costs">
            ${costHTML}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderMarket() {
  marketTier3El.innerHTML =
    createDeckStackHTML(3) +
    marketBoard[3]
      .map((card, index) => createCardHTML(card, index, 3))
      .join("");

  marketTier2El.innerHTML =
    createDeckStackHTML(2) +
    marketBoard[2]
      .map((card, index) => createCardHTML(card, index, 2))
      .join("");

  marketTier1El.innerHTML =
    createDeckStackHTML(1) +
    marketBoard[1]
      .map((card, index) => createCardHTML(card, index, 1))
      .join("");
}

function cancelAction() {
  if (state.gameOver) return;
  if (isBotTurn()) return;

  state.currentAction = "take";
  state.selectedReserveIndex = null;
  state.selectedReservedCardIndex = null;
  state.selectedBuyIndex = null;
  state.selectedDeckTier = null;
  clearSelectionOnly();

  setLog(`${getPlayerDisplayName(state.currentPlayerIndex)} cancelled the current action.`);
  render();
}

confirmButton.addEventListener("click", confirmTake);
clearButton.addEventListener("click", clearSelection);

reserveModeButton.addEventListener("click", () => {
  if (
    state.currentAction === "reserve" &&
    (state.selectedReserveIndex !== null || state.selectedDeckTier !== null)
  ) {
    confirmReserveCard();
    return;
  }

  enterReserveMode();
});

confirmReserveButton.addEventListener("click", confirmReserveCard);
cancelActionButton.addEventListener("click", cancelAction);

modeBotButton.addEventListener("click", () => setGameMode("bot"));
modeMultiplayerButton.addEventListener("click", () => setGameMode("multiplayer"));

debugEndGameButton.addEventListener("click", debugSetNearEndGame);

showSetupScreen();