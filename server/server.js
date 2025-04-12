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
const users = new Map();
// maps code/room name -> GameController
const codeToGame = new Map();
const masterController = new GameController(ROOM, socketIO);

// picks random number between 0 and end exclusive
function randRange(end) {
    return Math.floor(Math.random() * end);
}

// listens for new websocket connection, socket is connected client
socketIO.on('connection', (socket) => {
    console.log(`⚡: ${socket.id} user just connected!`);

    // sit us out if we are seated
    function sitUsOut() {
        // user didnt make it to the table
        if (!users.has(socket.id)) {
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
    // register new user
    socket.on('newUser', (username) => {
        if (!username) {
            return;
        }
        users.set(socket.id, new UserInfo(username, null));
        // join room
        // socket.join(ROOM);
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
        const gameController = new GameController(code, socketIO, info.username);
        codeToGame.set(code, gameController);
        info.gameController = gameController;
    });
    // join the game with given code
    socket.on('joinGame', (code) => {
        const gameController = codeToGame.get(code);
        const info = users.get(socket.id);
        if (!gameController || !info) {
            return;
        }
        info.gameController = gameController;
        socket.join(code);

    });
    // player sits at table
    // socket.on('playerSit', (username, chipCount, seatNumber) => {
    //     if (!username) {
    //         return;
    //     }
    //     const gameController = users.get(socket.id).gameController;
    //     const playerInfo = new PlayerInfo(username, randRange(10001), seatNumber);
    //     socket.emit('updateHeroSitting', true);
    //     // TODO: uncomment
    //     // const playerInfo = new PlayerInfo(username, chipCount, seatNumber);
    //     gameController.playerSit(playerInfo, socket.id);
    // });
    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
        sitUsOut();
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
        sitUsOut();
        // mark for deletion
        const info = users.get(socket.id);
        info.gameController.removePlayer(info.username);
        users.delete(socket.id);
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
    // TODO: remove (vibe testing purposes)
    res.json({
        alreadyConnected: false
    });
    return;
    if (Object.entries(req.query).length == 0 || req.query.socketID == undefined) {
        res.send("no socketID specified");
    } else {
        const newId = req.query.socketID;
        const oldId = req.query.oldId;
        const socket = socketIO.sockets.sockets.get(newId);
        // player is returning
        if (oldId && users.has(oldId)) {
            // change the socket over to new one
            const info = users.get(oldId);
            // const info = users.get(req.query.socketID);
            info.gameController.socketChange(info.username, newId);
            users.set(newId, info);
            users.delete(oldId);
            socket.join(ROOM);
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
    if (!gameController) {
        res.json({
            success: false
        });
        return;
    }
    // join this game
    socket.emit('joinGame', guess);
    res.json({
        success: true
    });
});
http.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}/`);
});
