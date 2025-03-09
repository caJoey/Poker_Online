const TheResolver = require('./TheResolver');

const resolver = new TheResolver();
ROYAL = '9';
STRFLUSH = '8';
FOUR = '7';
FULL = '6';
FLUSH = '5';
STRAIGHT = '4';
THREE = '3';
TWOPAIR = '2';
ONEPAIR = '1';
HIGHCARD = '0';

ranks = new Map([
    ['2', 'b'],
    ['3', 'c'],
    ['4', 'd'],
    ['5', 'e'],
    ['6', 'f'],
    ['7', 'g'],
    ['8', 'h'],
    ['9', 'i'],
    ['1', 'j'],
    ['J', 'k'],
    ['Q', 'l'],
    ['K', 'm'],
    ['A', 'n'],
]);

function translate(string) {
    returner = '';
    for (const char of string) {
        returner += ranks.get(char);
    }
    return returner
}

let hand;
let hands;
let commCards;
let res;

test('high card', () => {
    hand = ['2c', 'Js'];
    resolver.commCards = ['10c', 'Kd', 'Ac', '9s', '7c'];
    expect(resolver.strength(hand)).toBe(HIGHCARD+translate('AKJ19'));
    hand = ['7h', '3s'];
    resolver.commCards = ['Kd', '10d', '9d', '2s', 'Jc'];
    expect(resolver.strength(hand)).toBe(HIGHCARD+translate('KJ197'));
});

test('one pair', () => {
    hand = ['6d', '5s'];
    resolver.commCards = ['6h', '2s', 'Qh', 'Jc', '4s'];
    expect(resolver.strength(hand)).toBe(ONEPAIR+translate('6QJ5'));
    hand = ['As', 'Ad'];
    resolver.commCards = ['10h', '6h', '4c', '7c', '5s'];
    expect(resolver.strength(hand)).toBe(ONEPAIR+translate('A176'));
});

test('two pair', () => {
    hand = ['6d', '6s'];
    resolver.commCards = ['10h', 'Jc', '4c', '9h', '10c'];
    expect(resolver.strength(hand)).toBe(TWOPAIR+translate('16J'));
    hand = ['9s', '9d'];
    resolver.commCards = ['Ad', 'Kh', '8c', 'Kd', '3d'];
    expect(resolver.strength(hand)).toBe(TWOPAIR+translate('K9A'));
});

test('three of a kind', () => {
    hand = ['6d', 'Ac'];
    resolver.commCards = ['6h', '9s', 'Jd', '6s', 'Qs'];
    expect(resolver.strength(hand)).toBe(THREE+translate('6AQ'));
    hand = ['5s', '5d'];
    resolver.commCards = ['8h', '4c', '5c', '6c', 'Qc'];
    expect(resolver.strength(hand)).toBe(THREE+translate('5Q8'));
});

test('straight', () => {
    hand = ['Qh', '8d'];
    resolver.commCards = ['8h', '10d', 'Jd', '3d', '9s'];
    expect(resolver.strength(hand)).toBe(STRAIGHT+translate('Q'));
    hand = ['2d', '4c'];
    resolver.commCards = ['3c', '5s', 'Ks', 'As', 'Qd'];
    expect(resolver.strength(hand)).toBe(STRAIGHT+translate('5'));
    hand = ['Qc', 'Kc'];
    resolver.commCards = ['Jc', 'As', '8d', '8s', '10h'];
    expect(resolver.strength(hand)).toBe(STRAIGHT+translate('A'));
});

test('flush', () => {
    hand = ['Qc', '8c'];
    resolver.commCards = ['5c', 'Ac', '4c', '2c', '9c'];
    expect(resolver.strength(hand)).toBe(FLUSH+translate('AQ985'));
    hand = ['Kd', '8d'];
    resolver.commCards = ['Jd', '10d', '7h', 'Qd', '3c'];
    expect(resolver.strength(hand)).toBe(FLUSH+translate('KQJ18'));
    hand = ['Kd', '8d'];
    resolver.commCards = ['Jd', '10d', '7h', 'Qd', '3c'];
    expect(resolver.strength(hand)).toBe(FLUSH+translate('KQJ18'));
});

test('full house', () => {
    hand = ['Ad', '10h'];
    resolver.commCards = ['10c', '5s', '10s', '5c', '5h'];
    expect(resolver.strength(hand)).toBe(FULL+translate('15'));
    hand = ['Kh', '10h'];
    resolver.commCards = ['Ks', '10c', 'Kd', '6s', '6h'];
    expect(resolver.strength(hand)).toBe(FULL+translate('K1'));
    hand = ['2s', '9c'];
    resolver.commCards = ['8h', '2h', '9h', '6d', '2c'];
    expect(resolver.strength(hand)).toBe(FULL+translate('29'));
    hand = ['2s', '9c'];
    resolver.commCards = ['8h', '2h', '9h', '9d', '2c'];
    expect(resolver.strength(hand)).toBe(FULL+translate('92'));
});

test('four of a kind', () => {
    hand = ['7s', '10h'];
    resolver.commCards = ['7c', '7h', '5d', '7d', '5h'];
    expect(resolver.strength(hand)).toBe(FOUR+translate('71'));
    hand = ['As', 'Ah'];
    resolver.commCards = ['Ac', 'Kh', '7d', 'Ad', '6h'];
    expect(resolver.strength(hand)).toBe(FOUR+translate('AK'));
});

test('straight flush', () => {
    hand = ['Qs', '10s'];
    resolver.commCards = ['Js', 'Ks', '9s', '8s', '7s'];
    expect(resolver.strength(hand)).toBe(STRFLUSH+translate('K'));
    hand = ['Qs', '10s'];
    resolver.commCards = ['Js', 'Ks', '9s', '8h', '6d'];
    expect(resolver.strength(hand)).toBe(STRFLUSH+translate('K'));
    hand = ['Ah', '4h'];
    resolver.commCards = ['Jh', 'Kh', '5h', '2h', '3h'];
    expect(resolver.strength(hand)).toBe(STRFLUSH+translate('5'));
    hand = ['Ah', '4h'];
    resolver.commCards = ['Jh', 'Ks', '5h', '2h', '3h'];
    expect(resolver.strength(hand)).toBe(STRFLUSH+translate('5'));
});

test('royal flush', () => {
    hand = ['Qc', '10c'];
    resolver.commCards = ['Jc', 'Kc', '9s', '8s', 'Ac'];
    expect(resolver.strength(hand)).toBe(ROYAL);
    hand = ['Ah', '3h'];
    resolver.commCards = ['Qh', 'Kh', '3s', 'Jh', '10h'];
    expect(resolver.strength(hand)).toBe(ROYAL);
});

test('resolve', () => {
    commCards = ['2h', '4h', '8h', 'Js', '10s'];
    hands = [['As', '9c'], ['5s', 'Qd'], ['Ac', '5h']];
    res = resolver.resolve(hands, commCards);
    expect(res).toEqual([['As', '9c'], ['Ac', '5h'], ['5s', 'Qd']]);
    
    commCards = ['2h', '7h', '3c', '9d', 'As'];
    hands = [['Ks', '6s'], ['Ad', 'Js']];
    res = resolver.resolve(hands, commCards);
    expect(res).toEqual([['Ad', 'Js'], ['Ks', '6s']]);
    
    commCards = ['Qh', '5h', 'Qc', 'Ah', '3d'];
    hands = [['Jh', '9d'], ['Qh', '5s'], ['Ac', 'Kd'], ['4d', '9c']];
    res = resolver.resolve(hands, commCards);
    expect(res).toEqual([['Qh', '5s'], ['Ac', 'Kd'], ['Jh', '9d'], ['4d', '9c']]);

    commCards = ['Kd', 'Qd', '9s', 'Jd', '2c'];
    hands = [['Ah', '10h'], ['Ad', '10d'], ['Qh', '2s']];
    res = resolver.resolve(hands, commCards);
    expect(res).toEqual([['Ad', '10d'], ['Ah', '10h'], ['Qh', '2s']]);
});
