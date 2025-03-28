// const PlayerInfo = require('./PlayerInfo');

// state of the game, passed to all clients whenver there is a UI update
class GameState {
    players;
    // highest bet on the table
    betSize = 0;
    // min amount next person has to raise
    minRaise = 0;
    pot = 0;
    commCards = [];
    constructor(players) {
        this.players = players;
    }
}

module.exports = GameState;
