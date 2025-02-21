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
        new Location("70%", "60%", "-40%", "-25%"),
        new Location("70%", "27.5%", "-40%", "110%"),
        new Location("52%", "13.5%", "-30%", "110%"),
        new Location("25%", "12%", "30%", "110%"),
        new Location("8%", "25%", "100%", "90%"),
        new Location("5%", "42%", "100%", "40%"),
        new Location("8%", "58%", "100%", "-10%"),
        new Location("25%", "72%", "33%", "-30%"),
        new Location("52%", "73%", "-20%", "-30%")
    ]

    // players[i] == info about ith player
    const [players, setPlayers] = useState([]);
    const [cards, setCards] = useState([]);
    // current highest bet
    const [betSize, setBet] = useState([]);

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
            console.log("set cards");
        });
        // for updating the current highest bet that people are facing
        socket.on('updateBet', (bet) => {
            setBet(bet);
            console.log("set bet");
        });
    }, [socket]);

    // buttons if we are facing a bet
    function ActionButtons() {
        return (
            <div className='actionButtons'>
                <button className='actionButton' style={{backgroundColor:'rgb(37, 211, 69)'}}>call</button>
                <button className='actionButton' style={{backgroundColor:'rgb(228, 136, 38)'}}>raise</button>
                <button className='actionButton' style={{backgroundColor:'rgb(225, 33, 33)'}}>fold</button>
            </div>
        )
    }

    let actionButtons;
    // if its my turn, return true and assign action buttons, else false
    function itsMyTurn() {
        for (const player of players) {
            if (player.name === user && player.myTurn) {
                actionButtons = <ActionButtons/>;
                return true;
            }
        }
        return false;
    }

    console.log(players);

    const seats = players.map(player =>
        <PlayerBox playerInfo={player} location={locations[player.seatnum]}
        socket={socket} heroUsername={user} heroCards={cards}/>
    );
    if (players.length == 9) {
        return (
            <div className='everything'>
    
                {/* table */}
                <div className='tableBackground'>
                    <div className='table'></div>
                </div>
    
                {/* seats */}
                {seats}
    
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

// box that holds info about player
function PlayerBox({ playerInfo, location, socket, heroUsername, heroCards}) {
    
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
                <h2 style={{ marginTop: "10%" }}>{playerInfo.name}</h2>
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

    // there is a player sitting here
    if (playerInfo.name) {
        let card1 = '';
        let card2 = '';
        if (playerInfo.name == heroUsername) {
            console.log("yes match=========");
            console.log(playerInfo.hasCards);
            console.log(heroCards);
        }
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
                <div className='seatCheese'></div>
                {playerInfo.isButton && <img className='button' src={button} />}
                <div className='bet' style={{ top: location.betTop, left: location.betLeft }}>
                    <h3>{playerInfo.betSize > 0 && playerInfo.betSize}</h3>
                    {/* <h3>{10000}</h3> */}
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
            {/* z-index wasnt working so this puts blue over card*/}
            <div className='seatCheese'></div>
            {!player_sitting && <Plus /> /* only show plus if player isnt sitting */}
        </div>
    )
}
