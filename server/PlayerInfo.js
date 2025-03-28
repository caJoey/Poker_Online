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
        this.holeCards = []; // everyone sees these cards
        this.timer = Infinity; // shot clock for the player
        this.maxWin = Infinity; // most they can win from this pot (for sidepot)
        this.winner = false;
    }
}

// module.exports = { PlayerInfo };
module.exports = PlayerInfo;
