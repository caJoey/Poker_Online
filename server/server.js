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

// maps socket id -> username
const users = new Map();
// map of users to their seat
// const seats = new Map();

// listens for new websocket connection, socket is connected client
socketIO.on('connection', (socket) => {
  console.log(`⚡: ${socket.id} user just connected!`);

  // register new user
  socket.on('newUser', (userObject) => {
    users.set(userObject.socketID, userObject["userName"]);
    console.log('new user');
    //Sends the list of users to the client 
    socket.emit('updateTable', {1:"one"});
  });

  // player sits at table
  socket.on('playerSit', (playerInfo) => {

  });

  socket.on('disconnect', () => {
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

http.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}/`);
});
