const express = require('express');
const app = express();
const PORT = 4000;
const BLIND = 100;

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

// stores all info about a player (only if they are sitting)
class PlayerInfo {
  constructor(name, chips, seatnum) {
      this.name = name;
      this.chips = chips;
      this.betSize = 0; // how much this player is currently betting
      this.seatnum = seatnum;
      this.myTurn = false;
      this.sittingOut = false;
      this.isBB = false;
      this.isSB = false;
      this.isButton = false;
      this.hasCards = false; // true if player has cards
      this.timer = Infinity; // shot clock for this player
      // this.isPlaying = false; // whether or not player is playing in the current hand (turns to true every time we deal in)
  }
}

// whether or not the game is going or not (stops when <= 1 player remains, starts when >1 joined)
let gameStarted = false;
// true if we are playing heads up (different postflop and dealing rules)
let headsUp = false;

// maps socket id -> username
const users = new Map();
// maps username -> socket id
const ids = new Map();
// maps socket id -> the cards that this player holds
let cards = new Map();

// initialize player infos
const players = [];
for (let i = 0; i < 9; i++) {
  players.push(new PlayerInfo("", 0, i));
}
let activePlayers = [];
let BBSeat = -1;
let SBSeat = -1;
let BTNSeat = -1;
let betSize = 0;
let deck = [
  '2c','2d','2h','2s',
  '3c','3d','3h','3s',
  '4c','4d','4h','4s',
  '5c','5d','5h','5s',
  '6c','6d','6h','6s',
  '7c','7d','7h','7s',
  '8c','8d','8h','8s',
  '9c','9d','9h','9s',
  '10c','10d','10h','10s',
  'Jc','Jd','Jh','Js',
  'Qc','Qd','Qh','Qs',
  'Kc','Kd','Kh','Ks',
  'Ac','Ad','Ah','As'
];

function resetTable() {
  BBSeat = -1;
  SBSeat = -1;
  BTNSeat = -1;
  betSize = 0;
  gameStarted = false;
  headsUp = false;
}

// returns the active seat to the right of seat (precondition >= 2 active players)
function nextRight(seat) {
  for (const player of activePlayers) {
    if (player.seatnum > seat) {
      return player.seatnum;
    }
  }
  return activePlayers[0].seatnum;
}

// returns the active seat to the left of seat (precondition >= 2 active players)
function nextLeft(seat) {
  for (let i = activePlayers.length -1; i > -1; i--) {
    const player = activePlayers[i];
    if (player.seatnum < seat) {
      return player.seatnum;
    }
  }
  return activePlayers[activePlayers.length - 1].seatnum;
}

// picks random number between 0 and end exclusive
function randRange(end) {
  return Math.floor(Math.random() * end);
}

// returns a random card from the deck, and pops a card off
function randCard() {
  return deck.splice(randRange(deck.length), 1)[0];
}

// place a bet for the player if we can
function bet(player, betSize) {
  if (player.betSize + betSize > player.chips) {
    return;
  }
  player.betSize += betSize;
  player.chips -= betSize;
  updatePlayers();
}

// deal cards to each active player, returns remaining deck
function dealCards() {
  console.log('dealing cards');
  cards = new Map();
  deck = [
    '2c','2d','2h','2s',
    '3c','3d','3h','3s',
    '4c','4d','4h','4s',
    '5c','5d','5h','5s',
    '6c','6d','6h','6s',
    '7c','7d','7h','7s',
    '8c','8d','8h','8s',
    '9c','9d','9h','9s',
    '10c','10d','10h','10s',
    'Jc','Jd','Jh','Js',
    'Qc','Qd','Qh','Qs',
    'Kc','Kd','Kh','Ks',
    'Ac','Ad','Ah','As'
  ];
  for (const player of activePlayers) {
    const cardArr = [];
    cardArr.push(randCard());
    cardArr.push(randCard());
    const id = ids.get(player.name);
    // send cards to player
    cards.set(id, cardArr);
    socketIO.to(id).emit('updateCards', cardArr);
    players[player.seatnum].hasCards = true;
  }
}

// sets the blinds for the next round
function setBlinds() {
  console.log('setting blinds');
  if (BBSeat == -1) { // randomize BB / SB / BTN
    BBSeat = activePlayers[randRange(activePlayers.length)].seatnum;
    SBSeat = nextLeft(BBSeat);
    if (headsUp) {
      BTNSeat = SBSeat;
    } else {
      BTNSeat = nextLeft(SBSeat);
    }
  } else { // advance the blinds
    const BBSave = BBSeat;
    BBSeat = nextRight(BBSeat);
    // find next SB
    const SBmaybe = nextLeft(BBSeat);
    if (headsUp) {
      SBSeat = BTNSeat = SBmaybe;
    } else {
      // prevent SB from going backwards
      if (SBmaybe != BBSave) {
        SBSeat = -1;
        BTNSeat = SBmaybe;
      } else {
        SBSeat = SBmaybe;
        BTNSeat = nextLeft(SBSeat);
      }
    }
  }
  players[BBSeat].isBB = true;
  bet(players[BBSeat], BLIND);
  if (SBSeat > -1) {
    players[SBSeat].isSB = true;
    bet(players[SBSeat], BLIND / 2);
  }
  players[BTNSeat].isButton = true;
}

// returns how many players are at the table and not sitting out
function playerCount() {
  let count = 0;
  for (let i = 0; i < 9; i++) {
    if (players[i].name && !players[i].sittingOut) {
      count++;
    }
  }
  return count;
}

// set blinds, deal cards, give action to first player
function startStep() {
  // games already going
  if (gameStarted) {
    return;
  }
  console.log('Start step initiated');
  // initialize players for current hand
  activePlayers = [];
  for (let i = 0; i < 9; i++) {
    const player = players[i];
    if (player.name && !player.sittingOut) {
      activePlayers.push(player);
    }
  }
  if (activePlayers.length > 3) {
    gameStarted = true;
    if (activePlayers.length == 2) {
      headsUp = true;
    }
    // load the blinds
    setBlinds();
    // deal the cards, collect remaining part of deck
    dealCards();
    // put action onto first to act
    players[nextRight(BBSeat)].myTurn = true;
    updatePlayers();
  }
  // this will happen in the endstep, temporary
  console.log(activePlayers);
  console.log(`bb: ${BBSeat} sb: ${SBSeat} btn: ${BTNSeat}`);
  updatePlayers();
  resetTable();
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
  players[seatnum] = new PlayerInfo("", 0, players[seatnum].seatnum);
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
  ids.delete(username);
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
    if (users.has(socket.id)) { // player is already sitting, update their name
      players[playerSeat(users.get(socket.id))].name = username;
    }
    users.set(socket.id, username);
    ids.set(username, socket.id);
    updatePlayers();
  });

  // player sits at table
  socket.on('playerSit', (playerName, chipCount, seatNumber) => {
    if (!playerName) {
      return;
    }
    players[seatNumber] = new PlayerInfo(playerName, chipCount, seatNumber);
    // players[seatNumber].
    users.set(socket.id, playerName);
    ids.set(playerName, socket.id);
    updatePlayers();
    startStep();
  });

  socket.on('disconnect', () => {
    removePlayer(socket.id);
    console.log('🔥: A user disconnected');
  });

  socket.on('next', () => {
    
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
