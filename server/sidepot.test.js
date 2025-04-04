const GameController = require('./GameController');
let gameController;

beforeEach(() => {
    gameController = new GameController();
    // gameController.updatePlayers = jest.fn(() => {
    //     console.log('updatePlayers called');
    // });
    gameController.updatePlayers = jest.fn();
});

test('a', () => {
    expect('a').toBe('a');
});
