const PORT = process.env.PORT || 3000;

const io = require("socket.io")(PORT, {
  cors: {
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "https://illustrious-malabi-00e954.netlify.app"
    ],
    methods: ["GET", "POST"]
  }
});

const rooms = {};

const TAKE_COLORS = ["Red", "Green", "Blue", "Black", "White"];
const ALL_COLORS = ["Red", "Green", "Blue", "Black", "White", "Wild"];
const BONUS_COLORS = ["Red", "Green", "Blue", "Black", "White"];

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

function createEmptyColorMap(colors, value = 0) {
  return Object.fromEntries(colors.map(color => [color, value]));
}

function createGamePlayer(roomPlayer) {
  return {
    socketId: roomPlayer.socketId,
    name: roomPlayer.name,
    playerIndex: roomPlayer.playerIndex,
    type: "human",
    chips: createEmptyColorMap(ALL_COLORS, 0),
    victoryPoints: 0,
    bonusChip: createEmptyColorMap(BONUS_COLORS, 0),
    ownedCards: [],
    reservedCards: [],
    nobles: []
  };
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

function getNobleCount(playerCount) {
  return playerCount + 1;
}

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

function buildInitialMarketBoard(marketDecks) {
  const marketBoard = { 1: [], 2: [], 3: [] };

  for (let i = 0; i < 4; i++) {
    for (const tier of [1, 2, 3]) {
      const card = marketDecks[tier].shift() || null;
      if (card) marketBoard[tier].push(card);
    }
  }

  return marketBoard;
}

function createInitialGameState(roomPlayers) {
  const playerCount = roomPlayers.length;
  const marketDecks = buildShuffledMarketDecks();
  const marketBoard = buildInitialMarketBoard(marketDecks);
  const nobles = shuffleArray(ALL_NOBLES).slice(0, getNobleCount(playerCount));

  return {
    playerCount,
    players: roomPlayers.map(createGamePlayer),
    currentPlayerIndex: 0,
    bank: createBank(playerCount),
    marketDecks,
    marketBoard,
    nobles,
    currentAction: "take",
    gameEnding: false,
    endGameTriggeredBy: null,
    gameOver: false,
    log: ["Game started in Multiplayer mode. Player 1's turn."]
  };
}

function totalChip(obj) {
  return Object.values(obj).reduce((sum, value) => sum + value, 0);
}

function getPlayerBySocketId(gameState, socketId) {
  return gameState.players.find(player => player.socketId === socketId);
}

function isValidTakeSelectionForServer(gameState, chips) {
  if (!chips || typeof chips !== "object") return false;

  const selected = {};
  for (const color of TAKE_COLORS) {
    selected[color] = Number(chips[color] || 0);

    if (!Number.isInteger(selected[color])) return false;
    if (selected[color] < 0) return false;
    if (selected[color] > 2) return false;
    if (selected[color] > gameState.bank[color]) return false;
  }

  const totalSel = totalChip(selected);
  if (totalSel === 0) return false;

  const pickedColors = TAKE_COLORS.filter(color => selected[color] > 0);
  const distinct = pickedColors.length;
  const maxPerColor = Math.max(...TAKE_COLORS.map(color => selected[color]));

  const threeChipDistinct = totalSel <= 3 && maxPerColor === 1;

  const twoSame =
    totalSel === 2 &&
    distinct === 1 &&
    gameState.bank[pickedColors[0]] >= 4;

  return threeChipDistinct || twoSame;
}

function applyTakeChipsOnServer(gameState, playerIndex, chips) {
  const player = gameState.players[playerIndex];

  const selected = {};
  for (const color of TAKE_COLORS) {
    selected[color] = Number(chips[color] || 0);
  }

  if (totalChip(player.chips) + totalChip(selected) > 10) {
    return { ok: false, message: "You cannot have more than 10 chips." };
  }

  for (const color of TAKE_COLORS) {
    const amount = selected[color];
    if (amount <= 0) continue;

    gameState.bank[color] -= amount;
    player.chips[color] += amount;
  }

  const takenParts = TAKE_COLORS
    .filter(color => selected[color] > 0)
    .map(color => `${color} x${selected[color]}`);

  const currentPlayerName = player.name || `Player ${playerIndex + 1}`;
  const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
  const nextPlayer = gameState.players[nextPlayerIndex];
  const nextPlayerName = nextPlayer.name || `Player ${nextPlayerIndex + 1}`;

  gameState.log.unshift(
    `${currentPlayerName} took ${takenParts.join(", ")}. ${nextPlayerName}'s turn.`
  );

  advanceTurnOnServer(gameState);
  trimLog(gameState);

  return { ok: true };
}

function canAffordCardOnServer(player, card) {
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

function payForCardOnServer(gameState, player, card) {
  for (const color of BONUS_COLORS) {
    const cost = card.cost[color] || 0;
    const bonus = player.bonusChip[color] || 0;

    const discountedCost = Math.max(0, cost - bonus);
    const useNormalChips = Math.min(player.chips[color], discountedCost);

    player.chips[color] -= useNormalChips;
    gameState.bank[color] += useNormalChips;

    const stillMissing = discountedCost - useNormalChips;

    if (stillMissing > 0) {
      player.chips.Wild -= stillMissing;
      gameState.bank.Wild += stillMissing;
    }
  }
}

function applyCardRewardOnServer(player, card) {
  player.victoryPoints += card.points;
  player.bonusChip[card.color] += 1;
}

function canClaimNobleOnServer(player, noble) {
  return BONUS_COLORS.every(color => {
    return (player.bonusChip[color] || 0) >= (noble.requiredBonuses[color] || 0);
  });
}

function claimAvailableNobleOnServer(gameState, player) {
  const nobleIndex = gameState.nobles.findIndex(noble => canClaimNobleOnServer(player, noble));
  if (nobleIndex === -1) return null;

  const noble = gameState.nobles[nobleIndex];
  gameState.nobles.splice(nobleIndex, 1);

  player.nobles.push(noble);
  player.victoryPoints += noble.points;

  return noble;
}

function advanceTurnOnServer(gameState) {
  gameState.currentPlayerIndex =
    (gameState.currentPlayerIndex + 1) % gameState.players.length;

  gameState.currentAction = "take";
}

function trimLog(gameState) {
  if (gameState.log.length > 100) {
    gameState.log = gameState.log.slice(0, 100);
  }
}

function normalizeRoomId(roomId) {
  return String(roomId || "").trim().toUpperCase();
}

function isValidRoomId(roomId) {
  return /^[A-Z0-9]{3,12}$/.test(roomId);
}

function normalizePlayers(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.players = room.players.map((player, index) => {
    return {
      ...player,
      name: player.name || `Player ${index + 1}`,
      playerIndex: index,
      isHost: player.socketId === room.hostSocketId
    };
  });
}

function updateRoomStatus(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  if (room.status === "playing") return;

  if (room.players.length >= room.minPlayersToStart) {
    room.status = "ready";
  } else {
    room.status = "waiting";
  }
}

function sendRoomState(roomId) {
  const room = rooms[roomId];
  if (!room) return;

  io.to(roomId).emit("room-state", {
    roomId,
    maxPlayers: room.maxPlayers,
    minPlayersToStart: room.minPlayersToStart,
    status: room.status,
    hostSocketId: room.hostSocketId,
    players: room.players
  });
}

function sendRoomList() {
  const roomList = Object.entries(rooms).map(([roomId, room]) => {
    return {
      roomId,
      status: room.status,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers
    };
  });

  io.emit("room-list", roomList);
}

function removeSocketFromRoom(socket, roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.players = room.players.filter(player => player.socketId !== socket.id);
  socket.leave(roomId);

  if (room.players.length === 0) {
    delete rooms[roomId];
    sendRoomList();
    return;
  }

  if (room.hostSocketId === socket.id) {
    room.hostSocketId = room.players[0].socketId;
  }

  normalizePlayers(roomId);
  updateRoomStatus(roomId);
  sendRoomState(roomId);
  sendRoomList();
}

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("join-room", payload => {
    const roomId = normalizeRoomId(
      typeof payload === "string" ? payload : payload?.roomId
    );

    const playerName = String(
      typeof payload === "string" ? "" : payload?.playerName || ""
    ).trim().slice(0, 20) || "Player";

    const requestedMaxPlayers = Number(
      typeof payload === "string" ? 4 : payload?.maxPlayers
    );

    const maxPlayers = [2, 3, 4].includes(requestedMaxPlayers)
      ? requestedMaxPlayers
      : 4;

    if (!isValidRoomId(roomId)) {
      socket.emit("room-message", {
        roomId,
        message: "Invalid room ID. Use 3-12 letters/numbers."
      });
      return;
    }

    const oldRoomId = socket.data.roomId;

    if (oldRoomId && oldRoomId !== roomId) {
      removeSocketFromRoom(socket, oldRoomId);
    }

    if (!rooms[roomId]) {
      rooms[roomId] = {
        maxPlayers,
        minPlayersToStart: 2,
        status: "waiting",
        hostSocketId: socket.id,
        players: [],
        gameState: null
      };
    }

    const room = rooms[roomId];

    if (room.status === "playing") {
      socket.emit("room-message", {
        roomId,
        message: `Room ${roomId} is already playing.`
      });
      return;
    }

    const alreadyInRoom = room.players.some(player => {
      return player.socketId === socket.id;
    });

    if (!alreadyInRoom && room.players.length >= room.maxPlayers) {
      socket.emit("room-message", {
        roomId,
        message: `Room ${roomId} is full.`
      });

      sendRoomState(roomId);
      sendRoomList();
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!alreadyInRoom) {
      const playerIndex = room.players.length;

      room.players.push({
        socketId: socket.id,
        name: playerName,
        playerIndex,
        isHost: socket.id === room.hostSocketId
      });
    }

    normalizePlayers(roomId);
    updateRoomStatus(roomId);

    console.log(`${socket.id} joined room ${roomId}`);

    socket.emit("room-message", {
      roomId,
      message: `You joined room ${roomId}`
    });

    socket.to(roomId).emit("room-message", {
      roomId,
      message: `A new player joined room ${roomId}`
    });

    sendRoomState(roomId);
    sendRoomList();
  });

  socket.on("start-game", () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];

    if (room.status === "playing") {
      socket.emit("room-message", { roomId, message: "Game already started." });
      return;
    }

    if (socket.id !== room.hostSocketId) {
      socket.emit("room-message", { roomId, message: "Only the host can start the game." });
      return;
    }

    if (room.players.length < room.minPlayersToStart) {
      socket.emit("room-message", { roomId, message: `Need at least ${room.minPlayersToStart} players to start.` });
      return;
    }

    if (room.players.length > room.maxPlayers) {
      socket.emit("room-message", { roomId, message: "Too many players in this room." });
      return;
    }

    room.gameState = createInitialGameState(room.players);
    room.status = "playing";

    io.to(roomId).emit("game-started", {
      roomId,
      players: room.players,
      playerCount: room.players.length
    });

    io.to(roomId).emit("game-state", room.gameState);
    sendRoomState(roomId);
    sendRoomList();

    console.log(`Game started in room ${roomId}`);
  });

  socket.on("take-chips", data => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];
    const gameState = room.gameState;

    if (room.status !== "playing" || !gameState) {
      socket.emit("room-message", { roomId, message: "Game has not started yet." });
      return;
    }

    if (gameState.gameOver) return;

    const player = getPlayerBySocketId(gameState, socket.id);

    if (!player) {
      socket.emit("room-message", { roomId, message: "You are not a player in this game." });
      return;
    }

    if (player.playerIndex !== gameState.currentPlayerIndex) {
      socket.emit("room-message", { roomId, message: "It is not your turn." });
      return;
    }

    if (!isValidTakeSelectionForServer(gameState, data?.chips)) {
      socket.emit("room-message", { roomId, message: "Invalid chip selection." });
      return;
    }

    const result = applyTakeChipsOnServer(gameState, player.playerIndex, data.chips);

    if (!result.ok) {
      socket.emit("room-message", { roomId, message: result.message });
      return;
    }

    io.to(roomId).emit("game-state", gameState);
  });

  socket.on("reserve-card", data => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];
    const gameState = room.gameState;

    if (room.status !== "playing" || !gameState) {
      socket.emit("room-message", { roomId, message: "Game has not started yet." });
      return;
    }

    const player = getPlayerBySocketId(gameState, socket.id);

    if (!player) {
      socket.emit("room-message", { roomId, message: "You are not a player in this game." });
      return;
    }

    if (player.playerIndex !== gameState.currentPlayerIndex) {
      socket.emit("room-message", { roomId, message: "It is not your turn." });
      return;
    }

    if (player.reservedCards.length >= 3) {
      socket.emit("room-message", { roomId, message: "You cannot reserve more than 3 cards." });
      return;
    }

    const tier = Number(data?.tier);

    if (![1, 2, 3].includes(tier)) {
      socket.emit("room-message", { roomId, message: "Invalid card tier." });
      return;
    }

    let card = null;
    let reservedFromDeck = false;

    if (data?.fromDeck) {
      card = gameState.marketDecks[tier].shift() || null;
      reservedFromDeck = true;

      if (!card) {
        socket.emit("room-message", { roomId, message: `No cards left in Tier ${tier} deck.` });
        return;
      }
    } else {
      const cardId = String(data?.cardId || "");
      const cardIndex = gameState.marketBoard[tier].findIndex(card => card.id === cardId);

      if (cardIndex === -1) {
        socket.emit("room-message", { roomId, message: "Selected card was not found." });
        return;
      }

      card = gameState.marketBoard[tier].splice(cardIndex, 1)[0];

      const replacement = gameState.marketDecks[tier].shift() || null;
      if (replacement) gameState.marketBoard[tier].push(replacement);
    }

    player.reservedCards.push(card);

    if (gameState.bank.Wild > 0 && totalChip(player.chips) < 10) {
      player.chips.Wild += 1;
      gameState.bank.Wild -= 1;
    }

    const currentPlayerName = player.name || `Player ${player.playerIndex + 1}`;
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const nextPlayer = gameState.players[nextPlayerIndex];
    const nextPlayerName = nextPlayer.name || `Player ${nextPlayerIndex + 1}`;

    if (reservedFromDeck) {
      gameState.log.unshift(`${currentPlayerName} reserved a face-down Tier ${tier} card. ${nextPlayerName}'s turn.`);
    } else {
      gameState.log.unshift(`${currentPlayerName} reserved a ${card.color} level ${card.tier} card. ${nextPlayerName}'s turn.`);
    }

    advanceTurnOnServer(gameState);
    trimLog(gameState);

    io.to(roomId).emit("game-state", gameState);
  });

  socket.on("list-rooms", () => {
    sendRoomList();
  });

  socket.on("buy-card", data => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];
    const gameState = room.gameState;

    if (room.status !== "playing" || !gameState) {
      socket.emit("room-message", { roomId, message: "Game has not started yet." });
      return;
    }

    const player = getPlayerBySocketId(gameState, socket.id);

    if (!player) {
      socket.emit("room-message", { roomId, message: "You are not a player in this game." });
      return;
    }

    if (player.playerIndex !== gameState.currentPlayerIndex) {
      socket.emit("room-message", { roomId, message: "It is not your turn." });
      return;
    }

    let card = null;
    let sourceText = "";

    if (data?.fromReserved) {
      const reservedIndex = Number(data.reservedIndex);

      if (!Number.isInteger(reservedIndex) || reservedIndex < 0 || reservedIndex >= player.reservedCards.length) {
        socket.emit("room-message", { roomId, message: "Invalid reserved card." });
        return;
      }

      card = player.reservedCards[reservedIndex];

      if (!canAffordCardOnServer(player, card)) {
        socket.emit("room-message", { roomId, message: "You do not have enough chips to buy this reserved card." });
        return;
      }

      player.reservedCards.splice(reservedIndex, 1);
      sourceText = "reserved ";
    } else {
      const tier = Number(data?.tier);

      if (![1, 2, 3].includes(tier)) {
        socket.emit("room-message", { roomId, message: "Invalid card tier." });
        return;
      }

      const cardId = String(data?.cardId || "");
      const cardIndex = gameState.marketBoard[tier].findIndex(card => card.id === cardId);

      if (cardIndex === -1) {
        socket.emit("room-message", { roomId, message: "Selected card was not found." });
        return;
      }

      card = gameState.marketBoard[tier][cardIndex];

      if (!canAffordCardOnServer(player, card)) {
        socket.emit("room-message", { roomId, message: "You do not have enough chips to buy this card." });
        return;
      }

      gameState.marketBoard[tier].splice(cardIndex, 1);

      const replacement = gameState.marketDecks[tier].shift() || null;
      if (replacement) gameState.marketBoard[tier].push(replacement);
    }

    payForCardOnServer(gameState, player, card);
    applyCardRewardOnServer(player, card);
    player.ownedCards.push(card);

    const claimedNoble = claimAvailableNobleOnServer(gameState, player);
    const currentPlayerName = player.name || `Player ${player.playerIndex + 1}`;
    const nextPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    const nextPlayer = gameState.players[nextPlayerIndex];
    const nextPlayerName = nextPlayer.name || `Player ${nextPlayerIndex + 1}`;

    if (claimedNoble) {
      gameState.log.unshift(
        `${currentPlayerName} bought a ${sourceText}${card.color} card (${card.points} VP), claimed ${claimedNoble.id}. ${nextPlayerName}'s turn.`
      );
    } else {
      gameState.log.unshift(
        `${currentPlayerName} bought a ${sourceText}${card.color} card (${card.points} VP). ${nextPlayerName}'s turn.`
      );
    }

    advanceTurnOnServer(gameState);
    trimLog(gameState);

    io.to(roomId).emit("game-state", gameState);
  });

  socket.on("room-test-message", data => {
    if (!data || !data.roomId) return;

    const roomId = normalizeRoomId(data.roomId);
    if (!rooms[roomId]) return;

    io.to(roomId).emit("room-message", {
      roomId,
      message: String(data.message || "").slice(0, 200)
    });
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (!roomId) return;

    removeSocketFromRoom(socket, roomId);
    console.log("Disconnected:", socket.id);
  });
});

console.log(`Socket.IO server running on port ${PORT}`);
