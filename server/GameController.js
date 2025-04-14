const PlayerInfo = require('./PlayerInfo');
const TheResolver = require('./TheResolver');
const GameState = require('./GameState');

class GameController {
    PREFLOP = 0;
    FLOP = 1;
    TURN = 2;
    RIVER = 3;
    SHOWDOWN = 4;
    BLIND = 100;
    // true if we are playing heads up (different postflop and dealing rules)
    headsUp = false;
    // maps username -> socket id
    ids = new Map();
    // maps username -> hole cards
    cards = new Map();
    players = [];
    activePlayers = [];
    activeCards = [];
    // last known seats for important positions
    BBSeat = -1;
    SBSeat = -1;
    BTNSeat = -1;
    gameState;
    // showdown when turn == 4 (preflop, flop, turn, river, showdown)
    turn = 0;
    // when progress == threshold, we may go to the next turn
    nextProgress = 0;
    nextThreshold = 0;
    resolver = new TheResolver();
    // list of players that are all in this turn
    sidePots = [];
    foldQueue = [];
    deck = [];
    constructor(roomName, socketIO, adminUser) {
        this.socketIO = socketIO;
        // add initial player to the list
        this.gameState = new GameState(this.players, roomName, adminUser);
    }
    // set blinds, deal cards, give action to first player
    startStep() {
        // sets the blinds for the next round
        const setBlinds = () => {
            if (this.BBSeat == -1) { // randomize BB / SB / BTN
                this.BBSeat =
                this.activePlayers[this.randRange(this.activePlayers.length)].seatnum;
                this.SBSeat = this.nextRight(this.BBSeat);
                if (this.headsUp) {
                    this.BTNSeat = this.SBSeat;
                } else {
                    this.BTNSeat = this.nextRight(this.SBSeat);
                }
            } else { // advance the blinds
                const BBSave = this.BBSeat;
                this.BBSeat = this.nextLeft(this.BBSeat);
                // find next SB
                const SBmaybe = this.nextRight(this.BBSeat);
                if (this.headsUp) {
                    this.SBSeat = this.BTNSeat = SBmaybe;
                } else {
                    // prevent SB from going backwards
                    if (SBmaybe != BBSave) {
                        this.SBSeat = -1;
                        this.BTNSeat = SBmaybe;
                    } else {
                        this.SBSeat = SBmaybe;
                        this.BTNSeat = this.nextRight(this.SBSeat);
                    }
                }
            }
            this.players[this.BBSeat].isBB = true;
            this.bet(this.players[this.BBSeat], this.BLIND);
            if (this.SBSeat > -1) {
                this.players[this.SBSeat].isSB = true;
                this.bet(this.players[this.SBSeat], this.BLIND / 2);
            }
            this.players[this.BTNSeat].isButton = true;
        };
        // deal cards to each active player, returns remaining deck
        const dealCards = () => {
            this.cards = new Map();
            this.deck = [
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
            console.log(this.players);
            for (const player of this.activePlayers) {
                const cardArr = [];
                cardArr.push(this.randCard());
                cardArr.push(this.randCard());
                this.activeCards.push(cardArr);
                const id = this.ids.get(player.name);
                // send cards to player
                this.cards.set(player.name, cardArr);
                // TODO: make it specifically go to player
                this.socketIO.to(id).emit('updateCards', cardArr);
                this.players[player.seatnum].holeCards = ['back', 'back'];
            }
        };
        // initialize everything for next hand
        this.gameState.betSize = this.gameState.minRaise = this.BLIND;
        this.activePlayers = [];
        this.activeCards = [];
        for (const player of this.players) {
            player.myTurn = false;
            player.isBB = false;
            player.isSb = false;
            player.isButton = false;
            player.holeCards = [];
            player.maxWin = Infinity;
            player.winner = false;
            if (player.name && !player.sittingOut) {
                this.activePlayers.push(player);
            }
        }
        this.nextThreshold = this.activePlayers.length;
        this.nextProgress = 0;
        this.turn = this.PREFLOP;
        this.gameState.commCards = [];
        this.updatePlayers();
        if (this.activePlayers.length > 1) {
            if (this.activePlayers.length == 2) {
                this.headsUp = true;
            }
            // load the blinds
            setBlinds();
            // deal the cards, collect remaining part of deck
            dealCards();
            // put action onto first to act
            this.players[this.nextLeft(this.BBSeat)].myTurn = true;
            this.updatePlayers();
        }
    }
    // reveal cards, deal remaining streets, choose winner,
    // reset, start next round
    async endStep() {
        let winningOrder = [];
        // non-showdown win
        if (this.activePlayers.length == 1) {
            winningOrder = [[this.activePlayers[0]]]
            // this.distributeWinnings([[this.activePlayers[0]]]);
        }
        else {
            while (this.turn != this.SHOWDOWN) {
                await this.sleep(2000);
                this.nextTurn();
                this.updatePlayers();
            }
            // reveal everyones cards
            for (let i = 0; i < this.activePlayers.length; i++) {
                const player = this.activePlayers[i];
                const holeCards = this.activeCards[i];
                player.holeCards = holeCards;
            }
            winningOrder = this.resolver.resolve(this.activePlayers, this.gameState.commCards);
            await this.sleep(3000);
        }
        this.updatePlayers();
        // sort players based on hand strength
        this.distributeWinnings(winningOrder);
        this.updatePlayers();
        await this.sleep(3000);
        // add players chips to their stack (visual purposes)
        for (const player of this.activePlayers) {
            player.chips += player.betSize;
            player.betSize = 0;
            // player loses
            if (player.chips <= 0) {
                this.removePlayer(player.name);
            }
        }
        this.updatePlayers();
        await this.sleep(3000);
        this.startStep();
    }
    // returns the active seat to the right of seat (precondition >= 2 active players)
    nextRight(seat) {
        for (let i = this.activePlayers.length - 1; i > -1; i--) {
            const player = this.activePlayers[i];
            if (player.seatnum < seat) {
                return player.seatnum;
            }
        }
        return this.activePlayers[this.activePlayers.length - 1].seatnum;
    }
    // returns the active seat to the left of seat (precondition >= 2 active players)
    nextLeft(seat) {
        for (const player of this.activePlayers) {
            if (player.seatnum > seat) {
                return player.seatnum;
            }
        }
        return this.activePlayers[0].seatnum;
    }
    // updates all players of the current state of the table
    updatePlayers() {
        this.socketIO.to(this.gameState.roomName).emit('updateTable', this.gameState);
    }
    // picks random number between 0 and end exclusive
    randRange(end) {
        return Math.floor(Math.random() * end);
    }
    // returns a random card from the deck, and pops a card off
    randCard() {
        return this.deck.splice(this.randRange(this.deck.length), 1)[0];
    }
    // place a bet for the player if we can (on top of their current bet)
    bet(player, betSize) {
        player.betSize += betSize;
        player.chips -= betSize;
        // check for all in player for sidepots
        if (player.chips == 0) {
            this.sidePots.push(player);
        }
        this.updatePlayers();
    }
    // raises to the raiseSize, taking into account chips player already has
    raiseTo(player, raiseSize) {
        if (raiseSize > player.chips + player.betSize) {
            return;
        }
        const raiseAmount = raiseSize - player.betSize;
        // calculate new betSize and minRaise
        if (raiseSize > this.gameState.betSize) {
            this.gameState.minRaise = raiseSize - this.gameState.betSize;
            this.gameState.betSize = raiseSize;
        }
        this.bet(player, raiseAmount);
    }
    raise(username, raiseSize) {
        const player = this.players[this.playerSeat(username)];
        this.raiseTo(player, raiseSize);
        this.nextProgress = 0;
        this.passTurn(player);
        this.updatePlayers();
    }
    // player folds
    fold(username) {
        const player = this.players[this.playerSeat(username)];
        if (!player) {
            return;
        }
        // maybe do blinds / button?
        player.holeCards = [];
        const foldIndex = this.activePlayers.indexOf(player);
        this.activePlayers.splice(foldIndex, 1);
        this.activeCards.splice(foldIndex, 1);
        this.nextThreshold--;
        this.nextProgress--;
        this.foldQueue.push(player);
        this.passTurn(player);
        this.updatePlayers();
    }
    callCheck(username) {
        console.log(this.players)
        const player = this.players[this.playerSeat(username)];
        // call
        if (this.gameState.betSize > 0) {
            if (player.chips + player.betSize < this.gameState.betSize) {
                this.bet(player, player.chips);
            } else {
                this.raiseTo(player, this.gameState.betSize);
            }
        }
        this.passTurn(player);
        this.updatePlayers();
    }
    // toggle the sitting out status of player + return resulting status
    sitOut(username) {
        const player = this.players[this.playerSeat(username)];
        player.sittingOut = !player.sittingOut;
        if (player.myTurn) {
            this.fold(player.name);
        }
        this.updatePlayers();
        return player.sittingOut;
    }
    // pass the turn to the next active player given previous player
    passTurn(player) {
        player.myTurn = false;
        this.nextProgress++;
        while (this.nextProgress < this.nextThreshold) {
            player = this.players[this.nextLeft(player.seatnum)];
            if (player.chips > 0 && !player.sittingOut) {
                break;
            } else if (player.chips > 0 && player.sittingOut) { // sitting out, auto move
                if (this.gameState.betSize > player.betSize) {
                    this.fold(player.name);
                } else {
                    this.callCheck(player.name);
                }
                return;
            }
            this.nextProgress++;
        }
        // everyone good, go to next step
        if (this.nextProgress == this.nextThreshold || this.activePlayers.length == 1) {
            // last round
            if (!this.everyoneExceptOnePersonIsAllIn()) {
                this.nextTurn();
            }
            this.handleSidepots();
            // showdown street
            if (this.turn == this.SHOWDOWN || this.everyoneExceptOnePersonIsAllIn()) {
                // give highest bettor spare chips
                let secondHighestBet = 0;
                for (const player of this.activePlayers) {
                    if (player.betSize > secondHighestBet && player.betSize < this.gameState.betSize) {
                        secondHighestBet = player.betSize;
                    }
                }
                for (const player of this.activePlayers) {
                    if (player.betSize > secondHighestBet) {
                        const diff = player.betSize - secondHighestBet;
                        player.chips += diff;
                        player.betSize -= diff;
                    }
                }
                this.collectBets();
                this.endStep();
            } else { // next street
                this.collectBets();
                this.gameState.minRaise = this.BLIND;
                this.gameState.betSize = 0;
                this.nextProgress = 0;
                let startSeat = this.nextLeft(this.BTNSeat);
                // skip the players that have no chips left
                while (this.players[startSeat].chips <= 0) {
                    startSeat = this.nextLeft(startSeat);
                    this.nextProgress++;
                }
                this.players[startSeat].myTurn = true;
            }
        } else {
            player.myTurn = true;
        }
        this.updatePlayers();
    }
    nextTurn() {
        this.turn++;
        // flop
        if (this.turn == this.FLOP) {
            for (let i = 0; i < 3; i++) {
                this.gameState.commCards.push(this.randCard());
            }
        } else if (this.turn <= this.RIVER) {
            this.gameState.commCards.push(this.randCard());
        }
    }
    // set the maxWin for each player in sidePots array
    handleSidepots() {
        for (const player of this.sidePots) {
            player.maxWin = this.gameState.pot;
            for (const opponent of this.players) {
                player.maxWin += Math.min(opponent.betSize, player.betSize);
            }
        }
        this.sidePots.length = 0;
    }
    // collect all outstanding bets and clear fold queue
    collectBets() {
        for (const player of this.players) {
            this.gameState.pot += player.betSize;
            player.betSize = 0;
        }
        for (const player of this.foldQueue) {
            player.betSize = 0;
        }
        this.foldQueue.length = 0;
        // TODO: check for people who bet but left the table
        // (set them to sitting out until
        // next street starts)
    }
    // returns true if everyoneExceptOnePersonIsAllIn
    everyoneExceptOnePersonIsAllIn() {
        let notAllIn = 0;
        for (const player of this.activePlayers) {
            if (player.chips > 0) {
                notAllIn++;
            }
        }
        return notAllIn <= 1;
    }
    // player leaving table
    removePlayer(username) {
        this.reset(this.playerSeat(username));
        this.ids.delete(username);
        this.cards.delete(username);
        this.updatePlayers();
    }
    // player left before game started
    deletePlayer(username) {
        this.players.splice(this.playerSeat(username), 1);
        this.ids.delete(username);
        this.updatePlayers();
    }
    // add player to the sitngo
    addPlayer(username, socketID) {
        // player can only spectate
        if (this.gameState.gameStarted || this.players.length >= 9) {
            return;
        }
        this.ids.set(username, socketID);
        this.players.push(new PlayerInfo(username, 10000, this.players.length));
        this.updatePlayers();
    }
    // resets a seat when a player leaves, may leave bet out there
    reset(seatnum) {
        if (seatnum == -1) return;
        const betSize = this.players[seatnum].betSize;
        this.players[seatnum] = new PlayerInfo('', 0, seatnum);
        this.players[seatnum].betSize = betSize;
    }
    // returns which seat player is at, or -1 if they arent sitting
    playerSeat(username) {
        for (let i = 0; i < this.players.length; i++) {
            if (username == this.players[i].name) {
                return i;
            }
        }
        return -1;
    }
    // distributes winnings given order of players
    // TODO: test
    distributeWinnings(winningOrder) {
        // highest max win we have seen so far, prevents people
        // with lower maxWin to win chips after losing their sidepot
        let maxMaxWin = 0;
        // each playerGroup is a tie
        for (const playerGroup of winningOrder) {
            // sort group on maxWin ascending
            playerGroup.sort((a, b) => a.maxWin - b.maxWin);
            while (playerGroup.length) {
                const nextMaxWin = playerGroup[0].maxWin;
                let sidepot = nextMaxWin - maxMaxWin;
                // someone already won their sidepot
                if (sidepot <= 0) {
                    playerGroup.splice(0, 1);
                    continue;
                }
                // in case sidepot is infinity
                sidepot = Math.min(sidepot, this.gameState.pot);
                let split = sidepot / playerGroup.length;
                // split chips amongst tied players
                for (const player of playerGroup) {
                    player.betSize += split;
                    player.winner = true;
                }
                maxMaxWin = nextMaxWin;
                this.gameState.pot -= sidepot;
                playerGroup.splice(0, 1);
            }
            if (this.gameState.pot == 0) {
                break;
            }
        }
    }
    // player comes back 
    socketChange(username, newSocketID) {
        this.ids.set(username, newSocketID);
        console.log(this.ids);
        this.updatePlayers();
    }
    // returns info about player to initialize their frontend
    playerInformation(username) {
        let heroSitting = false;
        let heroSittingOut = false;
        let cards = [];
        const seat = this.playerSeat(username);
        if (seat > -1) {
            const player = this.players[seat];
            heroSitting = true;
            heroSittingOut = player.sittingOut;
            cards = player.holeCards;
        }
        // gameState
        return {
            gameState: this.gameState,
            heroSitting: heroSitting,
            heroSittingOut: heroSittingOut,
            cards: cards
        }
    }
    // starts the sitngo
    startGame() {
        // pops and returns a random element from arr
        const popRandom = (arr) => {
            return arr.splice(this.randRange(arr.length), 1)[0];
        }
        while (this.players.length <= 9) {
            this.players.push(new PlayerInfo('', 0, 0));
        }
        // randomly shuffle the players around
        const shuffledPlayers = [];
        for (let i = 0; i < 9; i++) {
            shuffledPlayers.push(popRandom(this.players));
        }
        // set players == shuffledPlayers
        for (let i = 0; i < 9; i++) {
            this.players.push(shuffledPlayers[i]);
            this.players[i].seatnum = i;
        }
        this.gameState.gameStarted = true;
        this.startStep();
        this.updatePlayers();
    }
    // sit the player at the table
    // playerSit(playerInfo, socketID) {
    //     this.ids.set(playerInfo.name, socketID);
    //     const seat = playerInfo.seatnum;
    //     // player already sitting here
    //     if (this.players[seat].name) {
    //         return;
    //     }
    //     this.players[seat] = playerInfo;
    //     this.updatePlayers();
    // }

    // schedule player for deletion
    // scheduleForDeletion(username) {
    //     const seat = this.playerSeat(username);
    //     // player actively in the hand, dont insta remove
    //     if (seat > -1 && this.activePlayers.includes(this.players[seat])
    //     && this.players[seat].holeCards) {
    //         this.players[seat].scheduledForDeletion = true;
    //     } else {
    //         this.removePlayer(username);
    //     }
    // }
    // sleeps for ms milliseconds
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = GameController;
