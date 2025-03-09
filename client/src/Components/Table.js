import React, { useState, useEffect } from 'react';
import './Table.css';
import plus from '../Images/plus.png';
import button from '../Images/crown.png';

// stores location info for each player
class Location {
    constructor(top, left, betTop, betLeft) {
        this.top = top;
        this.left = left;
        this.betTop = betTop;
        this.betLeft = betLeft;
    }
}

let player_sitting = false;

export default function Table({ socket }) {
    // username
    const [user, setUser] = useState("");

    // stores hardcoded location data for player boxes
    const locations = [
        new Location("90%", "65%", "-40%", "-25%"),
        new Location("90%", "15%", "-40%", "110%"),
        new Location("60%", "-7.5%", "-30%", "110%"),
        new Location("20%", "-7.5%", "30%", "110%"),
        new Location("-7.5%", "12.5%", "100%", "90%"),
        new Location("-15%", "40%", "100%", "40%"),
        new Location("-7.5%", "67.5%", "100%", "-10%"),
        new Location("20%", "87.5%", "33%", "-30%"),
        new Location("60%", "87.5%", "-20%", "-30%")
    ]

    // players[i] == info about ith player
    const [players, setPlayers] = useState([]);
    const [cards, setCards] = useState([]);
    // current highest bet
    const [betSize, setBet] = useState(0);
    // min amount the next person can raise
    const [minRaise, setMinRaise] = useState(0);
    const [communityCards, setCommunityCards] = useState([]);

    useEffect(() => {
        async function getUsername() {
            const query = `http://localhost:4000/username?socketID=${socket.id}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setUser(dataJSON.username);
        }
        async function initializePlayers() {
            const query = `http://localhost:4000/playersInfo`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setPlayers(dataJSON.players);
        }
        // get username of hero and initialize stuff on table
        getUsername();
        initializePlayers();
    }, [socket.id]); // only runs once since socket.id wont change

    useEffect(() => {
        // every time table gets updated, update table with updated info
        socket.on('updateTable', (playersList) => {
            setPlayers(playersList);
        });
        // for updating hero's cards
        socket.on('updateCards', (cardsList) => {
            setCards(cardsList);
        });
        // for updating the current highest bet that people are facing
        socket.on('updateBet', (bet) => {
            setBet(bet);
        });
        // for updating the current minimum amount the next player can raise
        socket.on('updateMinRaise', (raise) => {
            setMinRaise(raise);
        });
        socket.on('updateCommunityCards', (cards) => {
            setCommunityCards(cards);
        });
    }, [socket]);

    let actionButtons;
    // if its my turn, return true and assign action buttons, else false
    function itsMyTurn() {
        for (const player of players) {
            if (player.name === user && player.myTurn) {
                actionButtons = <ActionButtons socket={socket} heroInfo={player} 
                betSize={betSize} minRaise={minRaise}/>;
                return true;
            }
        }
        return false;
    }

    const seats = players.map(player =>
        <PlayerBox playerInfo={player} location={locations[player.seatnum]}
        socket={socket} heroUsername={user} heroCards={cards}/>
    );
    if (players.length == 9) {
        return (
            <div className='everything'>
                {/* table */}
                <div className='tableBackground'>
                    <div className='table'>
                        {/* seats */}
                        {seats}
                        <CommunityCards cards={communityCards}/>
                    </div>
                </div>
                {itsMyTurn() && actionButtons}
            </div>
        )   
    }
    // display this while the initial player data loads in
    return (
        <div className='everything'>
        </div>
    )
}

// cards in middle
function CommunityCards({cards}) {
    // cards = ['2c','6h','10s','Jd','Ah']
    const lefts = ['23%','34%','45%','56%','67%'];
    let index = 0;
    const commCards = cards.map(card =>
        <img className='commCard' src={require(`../Images/Cards/${card}.jpg`)}
        style={{top: '32.5%', left: lefts[index++]}}/>
    );
    console.log(index);
    return (<>{commCards}</>)
}

// buttons if we are facing a bet
function ActionButtons({socket, heroInfo, betSize, minRaise}) {
    const [raiseSlider, setRaiseSlider] = useState(minRaise+betSize);
    const [call, setCall] = useState(betSize - heroInfo.betSize);
    
    const handleSlider = (event) => {
        let betVal = Number(event.target.value);
        if (Number.isNaN(betVal)) {
            betVal = minRaise+betSize;
        }
        betVal = Math.min(heroInfo.chips + heroInfo.betSize, betVal);
        // TODO: check for raise that is less than minRaise
        // betVal = Math.max(minRaise, betVal);
        setRaiseSlider(betVal);
    }

    // hero calls or checks
    function callCheck() {
        socket.emit('callCheck');
    }

    // hero raises
    function raise() {
        socket.emit('raise', raiseSlider);
    }

    // hero folds
    function fold() {
        socket.emit('fold');
    }

    // returns slider props
    function sliderProps() {
        const props = {
            className: 'slider',
            type: 'range',
            min: minRaise + betSize,
            max: heroInfo.chips + heroInfo.betSize,
            step: 1,
            value: raiseSlider,
            onChange: handleSlider
        }
        return props;
    }
    const slideProps = sliderProps();
    let playerGottaGoAllIn = betSize >= heroInfo.chips + heroInfo.betSize;
    return (
        <div className='buttonsAndSlider'>
            {!playerGottaGoAllIn &&
                <div className='sliderAndBentry'>
                    <input {...slideProps} />
                    <input type='text' className='bentry' value={raiseSlider} onChange={handleSlider}></input>
                </div>
            }
            <div className='actionButtons'>
                <button className='actionButton' onClick={callCheck}
                    style={{ backgroundColor: 'rgb(37, 211, 69)' }}>
                    {betSize == heroInfo.betSize && <h2 style={{marginTop:'15%'}}>check</h2>}
                    {betSize > heroInfo.betSize && <h2 style={{marginTop:'15%'}}>call</h2>}
                    {betSize > heroInfo.betSize && <h2 style={{marginTop:'-10%'}}>{call}</h2>}
                </button>
                {!playerGottaGoAllIn && 
                    <button className='actionButton' onClick={raise}
                        style={{ backgroundColor: 'rgb(228, 136, 38)' }}>
                        <h2 style={{ marginTop: '15%' }}>raise to</h2>
                        <h2 style={{ marginTop: '-10%' }}>{raiseSlider}</h2>
                    </button>
                }
                <button className='actionButton' onClick={fold}
                    style={{ backgroundColor: 'rgb(225, 33, 33)' }}>
                    <h2>fold</h2>
                </button>
            </div>
        </div>
    )
}

// box that holds info about player
function PlayerBox({playerInfo, location, socket, heroUsername, heroCards}) {
    
    // tell socket that a new player wants to join
    function registerPlayer() {
        if (!heroUsername) {
            return;
        }
        player_sitting = true;
        // if player isnt already sitting down, have them sit down and update server
        socket.emit('playerSit', heroUsername, 10000, playerInfo.seatnum);
    }

    // name and chip count text
    function NameAndChips() {
        return (
            <div className='nameAndChips'>
                <h2 style={{ marginTop: "12.5%" }}>{playerInfo.name}</h2>
                {/* <h2 style={{ marginTop: "10%" }}>{playerInfo.name}</h2> */}
                <h2 style={{ marginTop: "-10%" }}>{playerInfo.chips}</h2>
            </div>
        )
    }

    // plus icon, click to join table at that spot
    function Plus() {
        return (
            <div className='nameAndChips'>
                <img className='joinButton' src={plus} alt='join icon' onClick={registerPlayer}></img>
            </div>
        )
    }

    // background of the player card
    function SeatCheese() {
        if (playerInfo.hasCards && playerInfo.myTurn) {
            return (<div className='seatCheese' style={{backgroundColor: 'rgb(14, 255, 243)'}}></div>)
        } else if (playerInfo.hasCards) {
            return (<div className='seatCheese'></div>)
        }
        return (<div className='seatCheese' style={{backgroundColor: 'rgb(132, 133, 133)'}}></div>)
    }

    // there is a player sitting here
    if (playerInfo.name) {
        let card1 = '';
        let card2 = '';
        if (playerInfo.hasCards && playerInfo.name == heroUsername) {
            card1 = heroCards[0];
            card2 = heroCards[1];
        } else if (playerInfo.hasCards) {
            card1 = card2 = 'back';
        }
        return (
            <div className='seat' style={{
                /* css stuff */
                top: location.top,
                left: location.left
            }}>
                {card1 && <img className='card' src={require(`../Images/Cards/${card1}.jpg`)} />}
                {card2 && <img className='card' style={{ left: '35%' }} src={require(`../Images/Cards/${card2}.jpg`)}/>}
                {/* z-index wasnt working so this puts blue over card*/}
                <SeatCheese/>
                {playerInfo.isButton && <img className='button' src={button} />}
                <div className='bet' style={{ top: location.betTop, left: location.betLeft }}>
                    <h3>{playerInfo.betSize > 0 && playerInfo.betSize}</h3>
                </div>
                <NameAndChips />
            </div>
        )
    }
    // there is no player sitting here
    return (
        <div className='seat' style={{
            /* css stuff */
            top: location.top,
            left: location.left
        }}>
            <SeatCheese/>
            {!player_sitting && <Plus /> /* only show plus if player isnt sitting */}
        </div>
    )
}
