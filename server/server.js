const express = require('express');
const app = express();
const PORT = 4000;
const ROOM = 'room';
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

const PlayerInfo = require('./PlayerInfo');
const GameController = require('./GameController');
// used for mapping socketID -> {username, GameController}
class UserInfo {
    constructor(username, gameController) {
        this.username = username;
        this.gameController = gameController;
    }
}

// GameControllers for each game
// const rooms = [];
// maps socket id -> {username, GameController}
users = new Map();
const masterController = new GameController(ROOM, socketIO);

// picks random number between 0 and end exclusive
function randRange(end) {
    return Math.floor(Math.random() * end);
}

// listens for new websocket connection, socket is connected client
socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    // register new user
    socket.on('newUser', (username) => {
        if (!username) {
            return;
        }
        if (!users.has(socket.id)) { // player not is already ingame, add them
            users.set(socket.id, new UserInfo(username, masterController));
            // join room
            socket.join(ROOM);
        }
    });

    // player sits at table
    socket.on('playerSit', (username, chipCount, seatNumber) => {
        if (!username) {
            return;
        }
        const gameController = users.get(socket.id).gameController;
        const playerInfo = new PlayerInfo(username, randRange(10001), seatNumber);
        socket.emit('updateHeroSitting', true);
        // TODO: uncomment
        // const playerInfo = new PlayerInfo(username, chipCount, seatNumber);
        // TODO: remove (sitting out test)
        // playerInfo.sittingOut = true;
        gameController.playerSit(playerInfo, socket.id);
    });
    socket.on('disconnect', () => {
        if (users.has(socket.id)) {
            const info = users.get(socket.id);
            info.gameController.removePlayer(info.username);
            users.delete(socket.id);
        }
        console.log('🔥: A user disconnected');
    });
    socket.on('fold', () => {
        const info = users.get(socket.id);
        info.gameController.fold(info.username);
        // fold(socketToPlayer(socket.id));
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
// TODO: fix
app.get('/playersInfo', (req, res) => {
    res.json({
        gameState: masterController.gameState
    });
});
http.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/`);
});
