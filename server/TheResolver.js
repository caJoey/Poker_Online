// for determining who wins
class TheResolver {
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
        ['10', 'j'],
        ['J', 'k'],
        ['Q', 'l'],
        ['K', 'm'],
        ['A', 'n'],
    ]);
    // sorts players' cards based on strength descending
    resolve(activeCards, commCards) {
        this.commCards = commCards;
        let activeCards2 = activeCards.slice();
        // arrow function inherits 'this' from parent,
        // doesn't set it to undefined
        activeCards2.sort((a, b) => this.compare(a, b));
        return activeCards2;
    }
    // -1 if a < b; 0 if a == b; 1 if a > b
    // (a and b are hole cards of 2 players)
    compare(a, b) {
        console.log(a, b);
        const aStrength = this.strength(a);
        const bStrength = this.strength(b);
        console.log(aStrength, bStrength);
        if (aStrength < bStrength) {
            return 1;
        } else if (aStrength > bStrength) {
            return -1;
        }
        return 0;
    }
    // returns a string representing the strength of the player's cards
    strength(playerCards) {
        // 7 cards that can make up the hand
        const cardsSeven = [];
        // just the letters, represent hand strength
        const lettersSeven = [];
        const allCards = playerCards.concat(this.commCards);
        for (const card of allCards) {
            const number = this.ranks.get(card.substring(0, card.length - 1));
            const suit = card.substring(card.length - 1);
            cardsSeven.push(number + suit);
            lettersSeven.push(number);
        }
        cardsSeven.sort();
        lettersSeven.sort();
        const flush = this.flushes(lettersSeven, cardsSeven);
        const pair = this.pairs(lettersSeven);
        if (flush > pair) {
            return flush;
        }
        return pair;
    }

    // royal, straight flush, flush, straight
    flushes(lettersSeven, cardsSeven) {
        // clubs, diamonds, hearts, spades
        const indices = new Map([['c', 0], ['d', 1], ['h', 2], ['s', 3]]);
        const cardPools = [[], [], [], []];
        for (const card of cardsSeven) {
            const suit = card.substring(card.length - 1);
            // add just the card
            cardPools[indices.get(suit)].push(card.substring(0, card.length - 1));
        }
        for (const pool of cardPools) {
            pool.sort();
            const straightHigh = this.findStraight(pool);
            // royal or straight flush
            if (straightHigh) {
                if (straightHigh == 'n') {
                    return this.ROYAL
                }
                return this.STRFLUSH + straightHigh
            }
            // flush, return top 5 cards
            if (pool.length >= 5) {
                let returner = this.FLUSH;
                for (let i = pool.length - 1; i > pool.length - 6; i--) {
                    returner += pool[i];
                }
                return returner
            }
        }
        // check for normal straights
        const noDupes = [];
        const seen = new Set();
        for (const num of lettersSeven) {
            if (seen.has(num)) {
                continue;
            }
            seen.add(num);
            noDupes.push(num);
        }
        const straight = this.findStraight(noDupes);
        if (straight) {
            return this.STRAIGHT + straight;
        }
        return '';
    }

    // returns highest straight from sorted letters
    findStraight(letters) {
        let bestStraight = '';
        for (let i = 0; i < letters.length - 4; i++) {
            const first = letters[i].charCodeAt(0);
            const second = letters[i + 4].charCodeAt(0);
            // special case check for A-4 straight
            if (i == 0) {
                const tempSecond = letters[i + 3].charCodeAt(0);
                if (tempSecond == 'e'.charCodeAt(0) && tempSecond - first == 3
                && letters.includes('n')) {
                    bestStraight = letters[i + 3];
                }
            }
            if (second - first == 4) {
                bestStraight = letters[i + 4]
            }
        }
        return bestStraight;
    }

    // 4 of kind, full house, 3 of kind, 2pair, 1pair, high card
    pairs(lettersSeven) {
        const freqs = new Map();
        for (const letter of lettersSeven) {
            if (!freqs.has(letter)) {
                freqs.set(letter, 1);
            } else {
                freqs.set(letter, freqs.get(letter) + 1);
            }
        }
        const freqToLetter = new Map();
        for (const [letter, freq] of freqs) {
            if (!freqToLetter.has(freq)) {
                freqToLetter.set(freq, [letter]);
            } else {
                freqToLetter.get(freq).push(letter);
                freqToLetter.get(freq).sort().reverse();
            }
        }
        if (freqToLetter.has(4)) {
            // 4 of a kind
            const fourLetter = freqToLetter.get(4)[0];
            const kicker = this.findKicker(lettersSeven, [fourLetter]);
            return this.FOUR + fourLetter + kicker;
        } else if (freqToLetter.has(3)) {
            // full house
            if (freqToLetter.get(3).length == 2 || freqToLetter.has(2)) {
                const threeLetter = freqToLetter.get(3)[0];
                let twoLetter = '';
                if (freqToLetter.get(3).length == 2) {
                    twoLetter = freqToLetter.get(3)[1];
                }
                if (freqToLetter.has(2) && freqToLetter.get(2)[0] > twoLetter) {
                    twoLetter = freqToLetter.get(2)[0];
                }
                return this.FULL + threeLetter + twoLetter;
            } else { // 3 of a kind
                const threeLetter = freqToLetter.get(3);
                const noList = [threeLetter];
                const firstKicker = this.findKicker(lettersSeven, noList);
                noList.push(firstKicker);
                const secondKicker = this.findKicker(lettersSeven, noList);
                return this.THREE + threeLetter + firstKicker + secondKicker;
            }
        } else if (freqToLetter.has(2)) {
            // 2 pair
            if (freqToLetter.get(2).length > 1) {
                const firstTwo = freqToLetter.get(2)[0];
                const secondTwo = freqToLetter.get(2)[1];
                const kicker = this.findKicker(lettersSeven, [firstTwo, secondTwo]);
                return this.TWOPAIR + firstTwo + secondTwo + kicker;
            } else { // 1 pair
                const pair = freqToLetter.get(2)[0];
                let returner = this.ONEPAIR + pair;
                const noList = [pair];
                for (let i = 0; i < 3; i++) {
                    const nextKicker = this.findKicker(lettersSeven, noList);
                    returner += nextKicker;
                    noList.push(nextKicker);
                }
                return returner;
            }
        } else {
            // high card
            let returner = this.HIGHCARD;
            const noList = [];
            for (let i = 0; i < 5; i++) {
                const nextKicker = this.findKicker(lettersSeven, noList);
                returner += nextKicker;
                noList.push(nextKicker);
            }
            return returner;
        }
    }

    // returns highest card in letters that isnt in noList
    findKicker(letters, noList) {
        let kicker = '';
        for (const letter of letters) {
            if (letter > kicker && !noList.includes(letter)) {
                kicker = letter;
            }
        }
        return kicker;
    }
}

module.exports = TheResolver;
