import React, { useState, useEffect } from 'react';
import './Table.css';
import CommunityCards from './CommunityCards';
import ActionButtons from './ActionButtons';
import PlayerBox from './PlayerBox';

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

    useEffect(() => {
        async function getUsername() {
            const query = `http://localhost:4000/username?socketID=${socket.id}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            console.log('username object');
            console.log(dataJSON);
            setUser(dataJSON.username);
        }
        // TODO: fix
        async function initializeState() {
            const query = `http://localhost:4000/playersInfo`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setGameState(dataJSON.gameState);
            // setPlayers(dataJSON.gameState.players);
        }
        // get username of hero and initialize stuff on table
        getUsername();
        initializeState();
    }, [socket.id]); // only runs once

    useEffect(() => {
        // every time table gets updated, update table with updated info
        socket.on('updateTable', (gameState) => {
            setGameState(gameState);
            // setPlayers();
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
    }, [socket]);

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
    if (gameState.players.length == 9) {
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
            </div>
        )   
    }
    // display this while the initial player data loads in
    return (
        <div className='everything'>
        </div>
    )
}
