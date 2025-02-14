const express = require('express');
const app = express();
const PORT = 4000;

// wrap express app in an HTTP server which Socket.IO uses
const http = require('http').Server(app);
// enables cross-origin resource sharing, so 3000 <-> 4000
const cors = require('cors');

// allows comms between client and server
app.use(cors());

// initialize a Socket.IO instance on top of the http server
const socketIO = require('socket.io')(http, {
  cors: {
    // only requests from here are accepted
    origin: "http://localhost:3000"
  }
});

const positions = {
  BB: 0,
  SB: 1,
  OTHER: 2
};

// stores all info about a player (only if they are sitting)
class PlayerInfo {
  constructor(name, chips) {
      this.name = name;
      this.chips = chips;
      this.betSize = 0; // how much this player is currently betting
      this.seatNum = -1;
      this.myTurn = false;
      this.sittingOut = false;
      this.isPlaying = false; // whether or not player is playing in the current hand (turns to true every time we deal in)
      this.timer = Infinity; // shot clock for this player
      this.cards = []; // size 2, holds string form of players cards, empty if they have folded
  }
}

// whether or not the game is going or not (stops when <= 1 player remains, starts when >1 joined)
let gameStarted = false;
// true if we are playing heads up (different postflop and dealing rules)
let headsUp = false;
// seat positions of key spots
let BTN = -1;
let SB = -1;
let BB = -1;

// maps socket id -> username
const users = new Map();

// initialize player infos
const players = [];
for (let i = 0; i < 9; i++) {
  players.push(new PlayerInfo("", 0));
}
const activePlayers = [];

// set blinds
function setBlinds(currentBB) {
  // randomize blinds
  if (currentBB == undefined) {
    currentBB = Math.floor(Math.random() * (activePlayers.length+1));
  }
}

// returns number of players in the current hand
function currentPlayerCount() {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (players[i].name && !players[i].sittingOut && players[i].isPlaying) {
      count++;
    }
  }
  return count;
}

// returns how many players are at the table and participating
function playerCount() {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (players[i].name && !players[i].sittingOut) {
      count++;
    }
  }
  return count;
}

// starts the game when >= 2 players arent sitting out
function startGame(currentBB) {
  if (gameStarted) {
    return;
  }
  // initialize active players
  for (let i = 0; i < 9; i++) {
    if (!players[i].sittingOut) {
      players[i].isPlaying = true;
    }
  }
  setBlinds(currentBB);
}

// returns which seat player is at, or -1 if they arent sitting
function playerSeat(username) {
  for (let i = 0; i < 9; i++) {
    if (username == players[i].name) {
      return i;
    }
  }
  return -1;
}

// resets a seat when a player leaves
function reset(seatnum) {
  if (seatnum == -1) return;
  players[seatnum] = new PlayerInfo("", 0);
}

// updates all players of the current state of the table
// also checks for starting or stopping the game
function updatePlayers() {
  // sends to all connected clients
  socketIO.emit('updateTable', players);
  console.log("updating table");
}

// player leaving table.
function removePlayer(socketid) {
  const username = users.get(socketid);
  reset(playerSeat(username));
  users.delete(socketid);
  updatePlayers();
}

// listens for new websocket connection, socket is connected client
socketIO.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  // register new user
  socket.on('newUser', (username) => {
    if (!username) {
      return;
    }
    // allows user to change username, but not have multiple seats
    // (assuming same socketio connection)
    console.log(username);
    if (users.has(socket.id)) { // player is already sitting, update their name
      players[playerSeat(users.get(socket.id))].name = username;
    }
    users.set(socket.id, username);
    updatePlayers();
  });

  // player sits at table
  socket.on('playerSit', (playerName, chipCount, seatNumber) => {
    if (!playerName) {
      return;
    }
    console.log("player sit");
    players[seatNumber] = new PlayerInfo(playerName, chipCount);
    players[seatNumber].
    users.set(socket.id, playerName);
    count = playerCount();
    if (!gameStarted && count == 2) {
      gameStarted = true;
      headsUp = true;
      startGame();
    } else if (count == 3) {
      headsUp = false;
    }
    updatePlayers();
  });

  socket.on('disconnect', () => {
    removePlayer(socket.id);
    console.log('🔥: A user disconnected');
  });
});

// returns users username given their unique socket id
app.get('/username', (req, res) => {
  if (Object.entries(req.query).length == 0 || req.query.socketID == undefined) {
    res.send("🚨 no socketID specified");
  } else {
    const id = req.query.socketID;
    res.json({
      username: users.get(id)
    });
  }
});

app.get('/playersInfo', (req, res) => {
  res.json({
    players: players 
  });
});

http.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}/`);
});
