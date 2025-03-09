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

const TheResolver = require('./TheResolver');

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
        this.timer = Infinity; // shot clock for player
        this.maxWin = Infinity; // most they can win from this pot (for sidepot)
    }
}

// keeps track of current turn 
class Turns {
    turn;
    turns;
    cards;
    constructor() {
        this.turns = ['preflop', 'showdown', 'flop', 'turn', 'river', 'showdown'];
        this.turn = 0;
        this.cards = [];
    }
    isShowdown() {
        return this.turns[this.turn] === 'showdown';
    }
    nextTurn() {
        this.turn++;
        // flop
        if (this.turn == 1) {
            for (let i = 0; i < 5; i++) {
                this.cards.push(randCard());
            }
        } else if (this.turn <= 3) {
            this.cards.push(randCard());
        }
        // TODO: remove
        updatePlayers();
        return this.turn;
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
// like activePlayers but holds the cards
let activeCards = [];
let BBSeat = -1;
let SBSeat = -1;
let BTNSeat = -1;
// current highest bet
let betSize = 0;
// min amount next person has to raise
let minRaise = 0;
// when progress == threshold, we may go to the next turn
let nextProgress;
let nextThreshold;
let turns = new Turns();
const resolver = new TheResolver();
let deck = [
    '2c', '2d', '2h', '2s',
    '3c', '3d', '3h', '3s',
    '4c', '4d', '4h', '4s',
    '5c', '5d', '5h', '5s',
    '6c', '6d', '6h', '6s',
    '7c', '7d', '7h', '7s',
    '8c', '8d', '8h', '8s',
    '9c', '9d', '9h', '9s',
    '10c', '10d', '10h', '10s',
    'Jc', 'Jd', 'Jh', 'Js',
    'Qc', 'Qd', 'Qh', 'Qs',
    'Kc', 'Kd', 'Kh', 'Ks',
    'Ac', 'Ad', 'Ah', 'As'
];

// returns active player seat with socketID
function socketToPlayer(socketID) {
    return players[playerSeat(users.get(socketID))];
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

function resetTable() {
    // BBSeat = -1;
    // SBSeat = -1;
    // BTNSeat = -1;
    // betSize = 0;
    // minRaise = 0;
    gameStarted = false;
    headsUp = false;
}

// returns the active seat to the right of seat (precondition >= 2 active players)
function nextRight(seat) {
    for (let i = activePlayers.length - 1; i > -1; i--) {
        const player = activePlayers[i];
        if (player.seatnum < seat) {
            return player.seatnum;
        }
    }
    return activePlayers[activePlayers.length - 1].seatnum;
}

// returns the active seat to the left of seat (precondition >= 2 active players)
function nextLeft(seat) {
    for (const player of activePlayers) {
        if (player.seatnum > seat) {
            return player.seatnum;
        }
    }
    return activePlayers[0].seatnum;
}

// picks random number between 0 and end exclusive
function randRange(end) {
    return Math.floor(Math.random() * end);
}

// returns a random card from the deck, and pops a card off
function randCard() {
    return deck.splice(randRange(deck.length), 1)[0];
}

// place a bet for the player if we can (on top of their current bet)
function bet(player, betSize) {
    if (betSize > player.chips) {
        return;
    }
    player.betSize += betSize;
    player.chips -= betSize;
    updatePlayers();
}

// raises to the raiseSize, taking into account chips player already has
function raiseTo(player, raiseSize) {
    if (raiseSize > player.chips + player.betSize) {
        return;
    }
    const raiseAmount = raiseSize - player.betSize;
    // calculate new betSize and minRaise
    if (raiseSize > betSize) {
        minRaise = raiseSize - betSize;
        betSize = raiseSize;
    }
    bet(player, raiseAmount);
}

function raise(player, raiseSize) {
    raiseTo(player, raiseSize);
    nextProgress = 0;
    passTurn(player);
    updatePlayers();
}

// player folds
function fold(player) {
    if (player == -1) {
        return;
    }
    // maybe do blinds / button?
    player.hasCards = false;
    const foldIndex = activePlayers.indexOf(player);
    activePlayers.splice(foldIndex, 1);
    activeCards.splice(foldIndex, 1);
    // TODO check for win condition (len of activePlayers is 1)
    nextThreshold--;
    nextProgress--;
    passTurn(player);
    updatePlayers();
}

// player either calls or checks
function callCheck(player) {
    // check
    if (betSize == 0) {

    } else { // call
        raiseTo(player, betSize);
    }
    passTurn(player);
    updatePlayers();
}

// pass the turn to the next active player given previous seat
function passTurn(player) {
    player.myTurn = false;
    nextProgress++;
    while (nextProgress < nextThreshold) {
        player = players[nextLeft(player.seatnum)];
        // players[nextLeft(player.seatnum)] = nextLeft(player.seatnum);
        if (player.chips > 0) {
            break;
        }
        nextProgress++;
    }
    // everyone good, go to next step
    if (nextProgress == nextThreshold) {
        turns.nextTurn();
        // run resolver
        if (turns.isShowdown()) {
            resolver.resolve();
        }
        nextProgress = 0;
        players[nextLeft(BTNSeat)].myTurn = true;
    } else {
        player.myTurn = true;
    }
    updatePlayers();
    // players[nextLeft(player.seatnum)].myTurn = true;
}

// deal cards to each active player, returns remaining deck
function dealCards() {
    cards = new Map();
    deck = [
        '2c', '2d', '2h', '2s',
        '3c', '3d', '3h', '3s',
        '4c', '4d', '4h', '4s',
        '5c', '5d', '5h', '5s',
        '6c', '6d', '6h', '6s',
        '7c', '7d', '7h', '7s',
        '8c', '8d', '8h', '8s',
        '9c', '9d', '9h', '9s',
        '10c', '10d', '10h', '10s',
        'Jc', 'Jd', 'Jh', 'Js',
        'Qc', 'Qd', 'Qh', 'Qs',
        'Kc', 'Kd', 'Kh', 'Ks',
        'Ac', 'Ad', 'Ah', 'As'
    ];
    for (const player of activePlayers) {
        const cardArr = [];
        cardArr.push(randCard());
        cardArr.push(randCard());
        activeCards.push(cardArr);
        const id = ids.get(player.name);
        // send cards to player
        cards.set(id, cardArr);
        socketIO.to(id).emit('updateCards', cardArr);
        players[player.seatnum].hasCards = true;
    }
}

// sets the blinds for the next round
function setBlinds() {
    if (BBSeat == -1) { // randomize BB / SB / BTN
        BBSeat = activePlayers[randRange(activePlayers.length)].seatnum;
        SBSeat = nextRight(BBSeat);
        if (headsUp) {
            BTNSeat = SBSeat;
        } else {
            BTNSeat = nextRight(SBSeat);
        }
    } else { // advance the blinds
        const BBSave = BBSeat;
        BBSeat = nextLeft(BBSeat);
        // find next SB
        const SBmaybe = nextRight(BBSeat);
        if (headsUp) {
            SBSeat = BTNSeat = SBmaybe;
        } else {
            // prevent SB from going backwards
            if (SBmaybe != BBSave) {
                SBSeat = -1;
                BTNSeat = SBmaybe;
            } else {
                SBSeat = SBmaybe;
                BTNSeat = nextRight(SBSeat);
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

// set blinds, deal cards, give action to first player
function startStep() {
    // games already going
    if (gameStarted) {
        return;
    }
    betSize = minRaise = BLIND;
    // initialize players for current hand
    activePlayers = [];
    activeCards = [];
    for (let i = 0; i < 9; i++) {
        const player = players[i];
        if (player.name && !player.sittingOut) {
            activePlayers.push(player);
        }
    }
    nextThreshold = activePlayers.length;
    nextProgress = 0;
    turns = new Turns();
    if (activePlayers.length > 2) {
        gameStarted = true;
        if (activePlayers.length == 2) {
            headsUp = true;
        }
        // load the blinds
        setBlinds();
        // deal the cards, collect remaining part of deck
        dealCards();
        // put action onto first to act
        players[nextLeft(BBSeat)].myTurn = true;
        updatePlayers();
    }
    // this will happen in the endstep, temporary
    updatePlayers();
    resetTable();
}

// resets a seat when a player leaves
function reset(seatnum) {
    if (seatnum == -1) return;
    players[seatnum] = new PlayerInfo('', 0, players[seatnum].seatnum);
}

// updates all players of the current state of the table
// also checks for starting or stopping the game
function updatePlayers() {
    // sends to all connected clients
    socketIO.emit('updateTable', players);
    socketIO.emit('updateBet', betSize);
    socketIO.emit('updateMinRaise', minRaise);
    socketIO.emit('updateCommunityCards', turns.cards);
}

// player leaving table
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

    socket.on('fold', () => {
        fold(socketToPlayer(socket.id));
    });

    socket.on('callCheck', () => {
        callCheck(socketToPlayer(socket.id));
    });
    socket.on('raise', (amount) => {
        raise(socketToPlayer(socket.id), amount);
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
