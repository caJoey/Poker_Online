// const PlayerInfo = require('./PlayerInfo');

// state of the game, passed to all clients whenever there is a UI update
class GameState {
    players;
    // highest bet on the table
    betSize = 0;
    // min amount next person has to raise
    minRaise = 0;
    pot = 0;
    commCards = [];
    gameStarted = false;
    // username of the winning player
    gameWinner = '';
    everyoneExceptOnePersonIsAllIn = false;
    // roomName == code
    constructor(players, roomName, adminUser, losers, timerInfo, blind) {
        this.players = players;
        this.roomName = roomName;
        this.adminUser = adminUser;
        this.losers = losers;
        this.timerInfo = timerInfo;
        this.blind = blind;
    }
}

module.exports = GameState;
