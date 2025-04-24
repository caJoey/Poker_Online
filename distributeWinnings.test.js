const GameController = require('./GameController');
const gameController = new GameController();

// thing we need in gameController
// winnningOrder: [[player1, player2], [player3]]
// Each player must have: maxWin(Num), betSize(Num), winner(Bool)
// gameState.pot

// basic player for testing purposes
class BasicPlayer{
    betSize = 0;
    winner = false;
    constructor(maxWin) {
        this.maxWin = maxWin;
    }
}

test('dw1', () => {
    const player1 = new BasicPlayer(4000);
    const player2 = new BasicPlayer(4000);
    gameController.gameState.pot = 4000;
    const winningOrder = [[player1], [player2]];
    gameController.distributeWinnings(winningOrder);
    expect(player1.betSize).toBe(4000);
    expect(player2.betSize).toBe(0);
});

test('dw2', () => {
    const player1 = new BasicPlayer(4000);
    const player2 = new BasicPlayer(2000);
    const player3 = new BasicPlayer(8000);
    gameController.gameState.pot = 8000;
    const winningOrder = [[player1], [player2], [player3]];
    gameController.distributeWinnings(winningOrder);
    expect(player1.betSize).toBe(4000);
    expect(player2.betSize).toBe(0);
    expect(player3.betSize).toBe(4000);
});

test('dw3', () => {
    const player1 = new BasicPlayer(2000);
    const player2 = new BasicPlayer(4000);
    const player3 = new BasicPlayer(8000);
    gameController.gameState.pot = 8000;
    const winningOrder = [[player1], [player2], [player3]];
    gameController.distributeWinnings(winningOrder);
    expect(player1.betSize).toBe(2000);
    expect(player2.betSize).toBe(2000);
    expect(player3.betSize).toBe(4000);
});

test('dw4', () => {
    const player1 = new BasicPlayer(1000);
    const player2 = new BasicPlayer(4000);
    const player3 = new BasicPlayer(6000);
    const player4 = new BasicPlayer(6000);
    gameController.gameState.pot = 6000;
    const winningOrder = [[player1], [player2], [player3], [player4]];
    gameController.distributeWinnings(winningOrder);
    expect(player1.betSize).toBe(1000);
    expect(player2.betSize).toBe(3000);
    expect(player3.betSize).toBe(2000);
    expect(player4.betSize).toBe(0);
});

test('dw5', () => {
    const player1 = new BasicPlayer(4000);
    const player2 = new BasicPlayer(2000);
    const player3 = new BasicPlayer(8000);
    gameController.gameState.pot = 8000;
    const winningOrder = [[player1, player2], [player3]];
    gameController.distributeWinnings(winningOrder);
    expect(player1.betSize).toBe(3000);
    expect(player2.betSize).toBe(1000);
    expect(player3.betSize).toBe(4000);
});

test('dw6', () => {
    const player1 = new BasicPlayer(3000);
    const player2 = new BasicPlayer(7000);
    const player3 = new BasicPlayer(10000);
    gameController.gameState.pot = 10000;
    const winningOrder = [[player1, player2, player3]];
    gameController.distributeWinnings(winningOrder);
    expect(player1.betSize).toBe(1000);
    expect(player2.betSize).toBe(3000);
    expect(player3.betSize).toBe(6000);
});
