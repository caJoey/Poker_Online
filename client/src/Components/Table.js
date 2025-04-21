import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Table.css';
// import plus from '../Images/plus.png';
import button from '../Images/crown.png';
import sparkle from '../Images/confetti.gif';
import trophy from '../Images/trophy.png';
import betSound from '../Sounds/bet.mp3'
import checkSound from '../Sounds/check.mp3'
import foldSound from '../Sounds/fold.mp3'
import audioOn from '../Images/audioOn.png';
import audioOff from '../Images/audioOff.png';

const BET = new Audio(betSound);
const CHECK = new Audio(checkSound);
const FOLD = new Audio(foldSound);
const BASE_URL = process.env.REACT_APP_SOCKET_URL || ''

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
    // roomName == code
    constructor(players, roomName, adminUser) {
        this.players = players;
        this.roomName = roomName;
        this.adminUser = adminUser;
    }
}

// stores location info for each player
class Location {
    constructor(top, left, betTop, betLeft) {
        this.top = top;
        this.left = left;
        this.betTop = betTop;
        this.betLeft = betLeft;
    }
}

export default function Table({ socket }) {
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

    // initialize dummy GameState
    const [gameState, setGameState] = useState(new GameState([]));
    const [heroSitting, setSitting] = useState(false);
    const [heroSittingOut, setSittingOut] = useState(false);
    // username
    const [user, setUser] = useState("");
    const [cards, setCards] = useState([]); // hero's hole cards
    // const [timerInfo, setTimerInfo] = useState({level:0, blind:0, minsLeft:0});
    const [muted, setMuted] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // initialize gameState and info about hero
        async function initializeState() {
            const query = `${BASE_URL}/playersInfo?socketID=${socket.id}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setGameState(dataJSON.gameState);
            setSitting(dataJSON.heroSitting);
            setSittingOut(dataJSON.heroSittingOut);
            setCards(dataJSON.cards);
        }
        async function getUsername() {
            const query = `${BASE_URL}/username?socketID=${socket.id}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setUser(dataJSON.username);
        }
        // ensures player sits out if they press back arrow
        function backArrow() {
            socket.emit('brexit');
        }
        // get username of hero and initialize stuff on table
        getUsername();
        initializeState();
        window.addEventListener('popstate', backArrow);
        return () => {
            window.removeEventListener('popstate', backArrow);
        }
    }, [socket]); // runs not that much

    useEffect(() => {
        // every time table gets updated, update table with updated info
        socket.on('updateTable', (gameState) => {
            setGameState(gameState);
        });
        // for updating hero's cards
        socket.on('updateCards', (cardsList) => {
            setCards(cardsList);
        });
        // for updating hero's sitting status
        socket.on('updateHeroSitting', (isSitting) => {
            setSitting(isSitting);
        });
        // for updating hero's sitting out status
        socket.on('updateHeroSittingOut', (isSittingOut) => {
            setSittingOut(isSittingOut);
        });
        // update blind timer
        // socket.on('updateTimer', (level, blind, minsLeft) => {
        //     setTimerInfo({level:level, blind:blind, minsLeft:minsLeft});
        // });
        return () => {
            socket.off('updateTable');
            socket.off('updateCards');
            socket.off('updateHeroSitting');
            socket.off('updateHeroSittingOut');
            socket.off('updateTimer');
        }
    }, [socket]);
    useEffect(() => {
        socket.on('playSound', (name) => {
            if (muted == true) {
                return;
            }
            if (name == 'bet') {
                BET.play();
            } else if (name == 'check') {
                CHECK.play();
            } else {
                FOLD.play();
            }
        });
        return () => {
            socket.off('playSound');
        }
    }, [socket, muted]);
    let actionButtons;
    // if its my turn, return true and assign action buttons, else false
    function itsMyTurn() {
        for (const player of gameState.players) {
            if (player.name === user && player.myTurn) {
                actionButtons = <ActionButtons socket={socket} heroInfo={player} 
                betSize={gameState.betSize} minRaise={gameState.minRaise}/>;
                return true;
            }
        }
        return false;
    }
    function toggleSittingOut() {
        socket.emit('sitOut');
    }
    function startGame() {
        socket.emit('startGame');
    }
    function BrexitButton({color}) {
        const brexit = () => {
            if (!window.confirm('Are you sure you want to brexit? Doing so may permanently delete you from the game!')) {
                    return;
            }
            socket.emit('brexit');
            navigate('/');
        }
        return (
            <button className='sitOutButton' onClick={brexit}style={{top:'3%', backgroundColor: color}}>
                Brexit
            </button>
        )
    }
    // bottom left sit out button
    function SittingOutButton() {
        // first determine if player is sitting at table
        // note: player cant sit out during their turn
        if (heroSitting && !itsMyTurn()) {
            let text = 'Sit Out'
            if (heroSittingOut) {
                text = 'Unsit Out'
            }
            return (<button className='sitOutButton' onClick={toggleSittingOut}>
                {text}</button>)
        }
        return <></>;
    }
    const seats = gameState.players.map(player =>
        <PlayerBox playerInfo={player} location={locations[player.seatnum]}
        socket={socket} heroUsername={user} heroCards={cards} heroSitting={heroSitting}/>
    );
    if (gameState.gameStarted) {
        return (
            <div className='everything'>
                {/* table */}
                <div className='tableBackground'>
                    <div className='table'>
                        {/* seats */}
                        {seats}
                        <CommunityCards cards={gameState.commCards}/>
                        <div className='potWrap'>
                            {gameState.pot > 0 && <h2 className='pot'>pot: {gameState.pot}</h2>}
                        </div>
                    </div>
                </div>
                {itsMyTurn() && actionButtons}
                {heroSitting && <SittingOutButton/>}
                <BrexitButton/>
                <div className='topRight'>
                    <h2>{gameState.timerInfo.minsLeft} minutes left at level {gameState.timerInfo.level} | 
                        Blinds {gameState.timerInfo.blind/2} / {gameState.timerInfo.blind}
                    </h2>
                    <h2>Spectator code: {gameState.roomName}</h2>
                    {!muted && <img className='muteButton' src={audioOn} onClick={() => {setMuted(true)}}></img>}
                    {muted && <img className='muteButton' src={audioOff} onClick={() => {setMuted(false)}}></img>}
                </div>
            </div>
        )   
    } else if (gameState.gameWinner) {
        return (
            <div className='tableBackground' style={{backgroundColor: 'rgb(165, 186, 187)'}}>
                <div className='preStart'>
                    <img src={trophy} className='trophy'></img>
                    <h2>Congrats to winner {gameState.gameWinner}</h2>
                    <h2>Final Rankings:</h2>
                    <ol>{gameState.losers.map(place => (<li>{place}</li>))}</ol>
                </div>
                {<BrexitButton color='rgb(190, 120, 215)'/>}
            </div>
        )
    }
    // pre start / loading screen
    return (
        <div className='tableBackground' style={{backgroundColor: 'rgb(165, 186, 187)'}}>
            <div className='preStart'>
                <h2>Share this code: {gameState.roomName}</h2>
                <h2>Waiting for "{gameState.adminUser}" to start</h2>
                <ol>{gameState.players.map(player => (<li>{player.name}</li>))}</ol>
                {gameState.adminUser == user &&
                <button className='sitOutButton' 
                    style={{backgroundColor: 'rgb(37, 211, 69)'}} onClick={startGame}>
                    start
                </button>}
            </div>
            {<BrexitButton color='rgb(190, 120, 215)'/>}
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
    return (<>{commCards}</>)
}

function ActionButtons({socket, heroInfo, betSize, minRaise}) {
    const [hideRaise, setHideRaise] = useState(false);
    const [raiseSlider, setRaiseSlider] =
        useState(Math.min(heroInfo.chips + heroInfo.betSize, minRaise + betSize));
    const [call, setCall] = useState(Math.min(betSize - heroInfo.betSize, heroInfo.chips));
    useEffect(() => {
        async function getAllIn() {
            const query = `${BASE_URL}/everyoneExceptOnePersonIsAllIn?socketID=${socket.id}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setHideRaise(dataJSON.everyoneExceptOnePersonIsAllIn);
        }
        getAllIn();
    }, [socket.id]); // only runs once
    useEffect(() => {
        setRaiseSlider(Math.min(heroInfo.chips + heroInfo.betSize, minRaise + betSize));
    }, [minRaise, betSize, heroInfo]);

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
        if (raiseSlider < Math.min(heroInfo.chips+heroInfo.betSize,minRaise+betSize)) {
            setRaiseSlider(Math.min(heroInfo.chips+heroInfo.betSize,minRaise+betSize));
            return;
        }
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
    let playerGottaGoAllIn = (betSize >= heroInfo.chips + heroInfo.betSize) || hideRaise;
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
                        {betSize == 0 && <h2 style={{ marginTop: '15%' }}>bet</h2>}
                        {betSize > 0 && <h2 style={{ marginTop: '15%' }}>raise to</h2>}
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
function PlayerBox({playerInfo, location, socket, heroUsername, heroCards, heroSitting}) {
    const [playerSitting, setSitting] = useState(false);
    // let player_sitting = false;
    // tell socket that a new player wants to join
    // function registerPlayer() {
    //     if (!heroUsername) {
    //         return;
    //     }
    //     setSitting(true);
    //     // if player isnt already sitting down, have them sit down and update server
    //     socket.emit('playerSit', heroUsername, 10000, playerInfo.seatnum);
    // }

    // name and chip count text
    function NameAndChips() {
        return (
            <div className='nameAndChips'>
                <h2 style={{ marginTop: "12.5%" }}>
                    {playerInfo.name}
                </h2>
                {playerInfo.sittingOut
                && <h2 style={{ marginTop: "-12.5%" }}>(sitting out)</h2>}
                <h2 style={{ marginTop: "-12.5%" }}>{playerInfo.chips}</h2>
            </div>
        )
    }

    // plus icon, click to join table at that spot
    // function Plus() {
    //     return (
    //         <div className='nameAndChips'>
    //             <img className='joinButton' src={plus} alt='join icon' onClick={registerPlayer}></img>
    //         </div>
    //     )
    // }

    // background of the player card
    function SeatCheese() {
        if (playerInfo.holeCards && playerInfo.myTurn) {
            return (<div className='seatCheese' style={{backgroundColor: 'rgb(14, 255, 243)'}}></div>)
        } else if (playerInfo.holeCards.length) {
            return (<div className='seatCheese'></div>)
        }
        return (<div className='seatCheese' style={{backgroundColor: 'rgb(132, 133, 133)'}}></div>)
    }

    function opacity() {
        if (playerInfo.sittingOut) {
            return .25;
        }
        return 1;
    }

    // there is a player sitting here
    if (playerInfo.name) {
        let card1 = '';
        let card2 = '';
        if (playerInfo.holeCards.length && playerInfo.name == heroUsername) {
            card1 = heroCards[0];
            card2 = heroCards[1];
        } else if (playerInfo.holeCards.length) {
            card1 = playerInfo.holeCards[0];
            card2 = playerInfo.holeCards[1];
        }
        return (
            <div className='seat' style={{
                /* css stuff */
                top: location.top,
                left: location.left,
                opacity: opacity()
            }}>
                {card1 && <img className='card' src={require(`../Images/Cards/${card1}.jpg`)} />}
                {card2 && <img className='card' style={{ left: '35%' }} src={require(`../Images/Cards/${card2}.jpg`)}/>}
                {/* z-index wasnt working so this puts blue over card*/}
                <SeatCheese/>
                {playerInfo.isButton && <img className='button' src={button} />}
                <div className='bet' style={{ top: location.betTop, left: location.betLeft }}>
                    <h3>{playerInfo.betSize > 0 && playerInfo.betSize}</h3>
                </div>
                <NameAndChips/>
                {playerInfo.winner && <img className='sparkle' src={sparkle}/>}
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
            {/* {!heroSitting && <Plus /> /* only show plus if player isnt sitting */}
        </div>
    )
}
