const io = require("socket.io")(3000, {
  cors: {
    origin: [
      "http://localhost:5500",
      "http://127.0.0.1:5500"
    ]
  }
});

const rooms = {};

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
      name: `Player ${index + 1}`,
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

function removeSocketFromRoom(socket, roomId) {
  const room = rooms[roomId];
  if (!room) return;

  room.players = room.players.filter(player => {
    return player.socketId !== socket.id;
  });

  socket.leave(roomId);

  if (room.players.length === 0) {
    delete rooms[roomId];
    return;
  }

  if (room.hostSocketId === socket.id) {
    room.hostSocketId = room.players[0].socketId;
  }

  normalizePlayers(roomId);
  updateRoomStatus(roomId);
  sendRoomState(roomId);
}

io.on("connection", socket => {
  console.log("Connected:", socket.id);

  socket.on("join-room", rawRoomId => {
    const roomId = normalizeRoomId(rawRoomId);

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
        maxPlayers: 4,
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
      return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!alreadyInRoom) {
      const playerIndex = room.players.length;

      room.players.push({
        socketId: socket.id,
        name: `Player ${playerIndex + 1}`,
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
  });

  socket.on("start-game", () => {
    const roomId = socket.data.roomId;
    if (!roomId || !rooms[roomId]) return;

    const room = rooms[roomId];

    if (room.status === "playing") {
      socket.emit("room-message", {
        roomId,
        message: "Game already started."
      });
      return;
    }

    if (socket.id !== room.hostSocketId) {
      socket.emit("room-message", {
        roomId,
        message: "Only the host can start the game."
      });
      return;
    }

    if (room.players.length < room.minPlayersToStart) {
      socket.emit("room-message", {
        roomId,
        message: `Need at least ${room.minPlayersToStart} players to start.`
      });
      return;
    }

    if (room.players.length > room.maxPlayers) {
      socket.emit("room-message", {
        roomId,
        message: "Too many players in this room."
      });
      return;
    }

    room.status = "playing";

    io.to(roomId).emit("game-started", {
      roomId,
      players: room.players,
      playerCount: room.players.length
    });

    sendRoomState(roomId);

    console.log(`Game started in room ${roomId}`);
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