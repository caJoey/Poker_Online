const express = require('express');
const app = express();
const PORT =  8080;
const ROOM = 'room';
// wrap express app in an HTTP server which Socket.IO uses
const http = require('http').Server(app);
// enables cross-origin resource sharing, so 3000 <-> 8080
const cors = require('cors');
// allows comms between client and server
app.use(cors());
// initialize a Socket.IO instance on top of the http server

let origin = "http://localhost:3000";
if (process.env.NODE_ENV == 1) {
    origin = undefined;
}
const socketIO = require('socket.io')(http, {
    cors: {
        // only requests from here are accepted
        origin: origin
    }
});

const PlayerInfo = require('./PlayerInfo');
const GameController = require('./GameController');
// used for mapping socketID -> {username, GameController}
class UserInfo {
    constructor(username, gameController) {
        this.username = username;
        this.gameController = gameController;
    }
}

// maps code/room name -> set of socketIDs that are here
const rooms = new Map();
// maps socket id -> {username, GameController}
const users = new Map();
// maps code/room name -> GameController
const codeToGame = new Map();

// picks random number between 0 and end exclusive
function randRange(end) {
    return Math.floor(Math.random() * end);
}

function deleteGame(roomID) {
    if (rooms.has(roomID)) {
        rooms.delete(roomID);
    }
    for (const [id, ob] of users) {
        if (ob.gameController && ob.gameController.roomName == roomID) {
            users.delete(id);
        }
    }
}

// listens for new websocket connection, socket is connected client
socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    // sit us out if we are seated
    function sitUsOut() {
        // user didnt make it to the table
        if (!users.has(socket.id) || !users.get(socket.id).gameController
        || !users.get(socket.id).gameController.gameState.gameStarted) {
            return;
        }
        const info = users.get(socket.id);
        const playerSeat = info.gameController.playerSeat(info.username);
        // player isnt at the table so we dont need to reconnect them
        if (playerSeat == -1) {
            return;
        }
        // sit them out rn while theyre DC'd
        if (info.gameController.players[playerSeat].sittingOut == false) {
            info.gameController.sitOut(info.username);
        }
    }
    // safely exit the game while allowing reconnect
    function brexit() {
        // just sit player out if they are participating
        sitUsOut();
        const info = users.get(socket.id);
        if (!info || !info.gameController) {
            return;
        }
        // exiting when player isnt at the table, full delete
        const gameController = info.gameController;
        // remove from previous room
        socket.leave(gameController.gameState.roomName);
        const username = info.username;
        // game hasnt started, remove player from game
        // this auto cleans
        if (!gameController.gameState.gameStarted
            || gameController.playerSeat(username) == -1) {
            info.gameController.deletePlayer(username);
            // check for admin transfer
            if (gameController.players.length >= 1 && username == gameController.gameState.adminUser) {
                gameController.gameState.adminUser = gameController.players[0].name;
                gameController.updatePlayers();
            }
            users.delete(socket.id);
            // check for empty prestart array
            if (gameController.players.length == 0) {
                deleteGame(gameController.roomName);
            }
        }
    }
    // register new user
    socket.on('newUser', (username) => {
        // user has a game to reconnect to, dont override their gameController 
        if (!username || users.has(socket.id)) {
            return;
        }
        users.set(socket.id, new UserInfo(username, null));
    });
    // create a new sit n go lobby
    socket.on('createGame', () => {
        const info = users.get(socket.id);
        // user not registered, this shouldnt happen
        if (!info) {
            return;
        }
        const randoms = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let code = '';
        for (let i = 0; i < 5; i++) {
            code += randoms[randRange(26)];
        }
        socket.join(code);
        const gameController = new GameController(code, socketIO, info.username, deleteGame);
        gameController.addPlayer(info.username, socket.id);
        codeToGame.set(code, gameController);
        rooms.set(code, new Set(info.username));
        info.gameController = gameController;
    });
    // start the game
    socket.on('startGame', () => {
        const info = users.get(socket.id);
        if (!info) {
            return;
        }
        const gameController = info.gameController;
        const username = info.username;
        if (!gameController || !username
            || username != gameController.gameState.adminUser || gameController.players.length <= 1) {
            return;
        }
        gameController.startGame();
    });
    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
        brexit();
    });
    socket.on('fold', () => {
        const info = users.get(socket.id);
        info.gameController.fold(info.username);
        // fold(socketToPlayer(socket.id))
    });
    socket.on('callCheck', () => {
        const info = users.get(socket.id);
        info.gameController.callCheck(info.username);
        // callCheck(socketToPlayer(socket.id));
    });
    socket.on('raise', (amount) => {
        const info = users.get(socket.id);
        info.gameController.raise(info.username, amount);
        // raise(socketToPlayer(socket.id), amount);
    });
    socket.on('sitOut', () => {
        const info = users.get(socket.id);
        const res = info.gameController.sitOut(info.username);
        socket.emit('updateHeroSittingOut', res);
    });
    // exit table and return to home 
    socket.on('brexit', () =>  {
        brexit();
    });
});

// returns users username given their unique socket id
app.get('/username', (req, res) => {
    if (Object.entries(req.query).length == 0 || req.query.socketID == undefined) {
        res.send("🚨 no socketID specified");
    } else if(!users.has(req.query.socketID)) {
        res.send("no username");
    }
    else {
        const id = req.query.socketID;
        res.json({
            username: users.get(id).username
        });
    }
});
app.get('/everyoneExceptOnePersonIsAllIn', (req, res) => {
    if (Object.entries(req.query).length == 0 || req.query.socketID == undefined) {
        res.send("🚨 no socketID specified");
    } else if(!users.has(req.query.socketID)) {
        res.send("no username");
    } else {
        const info = users.get(req.query.socketID);
        res.json({
            everyoneExceptOnePersonIsAllIn: info.gameController.everyoneExceptOnePersonIsAllIn()
        });
    }
});
// return info about the player
app.get('/playersInfo', (req, res) => {
    if (Object.entries(req.query).length == 0 || req.query.socketID == undefined) {
        res.send("🚨 no socketID specified");
    } else if(!users.has(req.query.socketID)) {
        res.send("no username");
    } else {
        const info = users.get(req.query.socketID);
        res.json(info.gameController.playerInformation(info.username));
        // return info.gameController.playerInformation(info.username);
    }
});
// return true if player was at a table when they left
app.get('/reconnectCheck', (req, res) => {
    if (Object.entries(req.query).length == 0 || req.query.socketID == undefined) {
        res.send("no socketID specified");
    } else {
        const newId = req.query.socketID;
        const oldId = req.query.oldId;
        const socket = socketIO.sockets.sockets.get(newId);
        // player is returning
        if (oldId && users.has(oldId) && users.get(oldId).gameController) {
            // change the socket over to new one
            const info = users.get(oldId);
            info.gameController.socketChange(info.username, newId);
            // join new room
            socket.join(info.gameController.gameState.roomName);
            users.delete(oldId);
            users.set(newId, info);
            res.json({
                alreadyConnected: true
            });
        } else {
            res.json({
                alreadyConnected: false
            });
        }
    }
});
// user attempts to join a game with code
app.get('/joinGame', (req, res) => {
    const socketID = req.query.socketID;
    const socket = socketIO.sockets.sockets.get(socketID);
    const guess = req.query.guess;
    const gameController = codeToGame.get(guess);
    const info = users.get(socketID);
    if (!gameController || !info ||
        (gameController.ids.has(info.username))) {
        res.json({
            success: false
        });
        return;
    }
    // join this game
    info.gameController = gameController;
    socket.join(guess);
    info.gameController.addPlayer(info.username, socketID);
    res.json({
        success: true
    });
});
// stolen from https://www.youtube.com/watch?v=INVodizZQCY
// breaks developmen
console.log('process.env.NODE_ENV == 1')
console.log(process.env.NODE_ENV == 1)
console.log('process.env.NODE_ENV')
console.log(process.env.NODE_ENV)
console.log('process.env.SOCKET_URL')
console.log(process.env.SOCKET_URL)
// TODO: uncomment
if (process.env.NODE_ENV == 1) {
    const path = require('path');
    app.use(express.static(path.join(__dirname, 'client', 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'))
    });
}
http.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/`);
});
