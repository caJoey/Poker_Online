import React, { useState, useEffect } from 'react';
import './Table.css';
import plus from '../Images/plus.png';
import button from '../Images/crown.png';

// stores location info for each player
class Location {
    constructor(top, left, betTop, betLeft, btnTop, btnLeft) {
        this.top = top;
        this.left = left;
        this.betTop = betTop;
        this.betLeft = betLeft;
        this.btnTop = btnTop;
        this.btnLeft = btnLeft;
    }
}

// stores all info about each player
class PlayerInfo {
    name = ""; // default
    constructor(chips, name) {
        this.name = name;
        this.chips = chips;
    }
}

export default function Table({ socket }) {
    // username
    const [user, setUser] = useState("");

    // stores hardcoded location data for player boxes
    const locations = [
        new Location("70%", "60%", "61.5%", "55%"),
        new Location("70%", "27.5%", "61.5%", "40%"),
        new Location("52%", "13.5%", "49%", "27%"),
        new Location("25%", "12%", "34%", "27%"),
        new Location("8%", "25%", "22.5%", "36%"),
        new Location("5%", "42%", "20.5%", "47%"),
        new Location("8%", "58%", "22.5%", "59.5%"),
        new Location("25%", "72%", "33%", "66.5%"),
        new Location("52%", "73%", "47.5%", "66.5%")
    ]

    // players[i] == info about ith player
    const [players, setPlayers] = useState([
        // let players = [
        new PlayerInfo(10000, ""),
        new PlayerInfo(10000, "bb"),
        new PlayerInfo(10000, "ccc"),
        new PlayerInfo(10000, "dddd"),
        new PlayerInfo(10000, "eeeee"),
        new PlayerInfo(10000, "ffffff"),
        new PlayerInfo(10000, ""),
        new PlayerInfo(10000, ""),
        new PlayerInfo(10000, "iiiiiiii")
    ]);

    useEffect(() => {
        async function getUsername() {
            const query = `http://localhost:4000/username?socketID=${socket.id}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setUser(dataJSON.username);
        }
        getUsername();
    }, [socket.id]); // only runs once since socket.id wont change

    useEffect(() => {
        socket.on('updateTable', (message) => {
            console.log("POGUSERS: " + message[1]);
            console.log(message);
        });
    }, [socket]);

    let seatNumber = 0;
    const seats = players.map(player =>
        <PlayerBox playerInfo={player} location={locations[seatNumber]} seatNumber={seatNumber++} socket={socket} heroUsername={user}/>
    );

    return (
        <div className="everything">

            {/* table */}
            <div className='tableBackground'>
                <div className='table'></div>
            </div>

            {/* seats */}
            {seats}

            {/* button */}


        </div>
    )
}

// box that holds info about player
function PlayerBox({ playerInfo, location, seatNumber, socket, heroUsername}) {
    
    // tell socket that a new player wants to join
    function registerPlayer() {
        // socket.emit
    }

    // name and chip count text
    function NameAndChips() {
        return (
            <div className='nameAndChips'>
                <h2 style={{ marginTop: "10%" }}>{heroUsername}</h2>
                {/* <h2 style={{ marginTop: "10%" }}>{playerInfo.name}</h2> */}
                <h2 style={{ marginTop: "-10%" }}>{playerInfo.chips}</h2>
            </div>
        )
    }

    // plus icon, click to join table at that spot
    function Plus() {
        return (
            <div className='nameAndChips'>
                <img className='joinButton' src={plus} alt='join icon' onclick={registerPlayer}></img>
            </div>
        )
    }

    return (
        <div className='seat' style={{
                /* css stuff */
                top: location.top,
                left: location.left
            }}>
            {/* conditionally render players based on if spots are filled or not*/}
            {playerInfo.name && <img className='card' src={require('../Images/Cards/2c.jpg')}/>}
            {playerInfo.name && <img style={{left: '35%'}}className='card' src={require('../Images/Cards/Ah.jpg')}/>}
            {/* z-index wasnt working so this puts blue over card*/}
            <div className='seatCheese'></div>
            {playerInfo.name && <img className='button' src={button}/>}
            {playerInfo.name && <div className='bet' style={{top: location.betTop, left: location.betLeft}}>
                <h3>{playerInfo.chips}</h3>
            </div>}
            {/* only renders if player has no name (nobody sitting here) and:
            user is not sitting at a table*/}
            {!playerInfo.name && false && <Plus/>}
            {playerInfo.name && <NameAndChips/>}
        </div>
    )
}
