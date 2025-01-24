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

// stores all info about each player
class PlayerInfo {
    name = ""; // default
    constructor(location, chips, name) {
        this.location = location;
        this.name = name;
        this.chips = chips;
    }
}

// stores all info about each player
// class PlayerInfo {
//     name = ""; // default
//     constructor(top, left, chips, name) {
//         this.top = top;
//         this.top = top;
//         this.left = left;
//         this.name = name;
//         this.chips = chips;
//     }
// }

// ith spot is info about ith seat's position
const players = [
    new PlayerInfo(new Location("70%","60%","61.5%","57.5%"),10000,"a"),
    new PlayerInfo(new Location("70%","25%","61.5%","37.5%"),0,"bb"),
    new PlayerInfo(new Location("52%", "11%","49%","27%"), 0, "ccc"),
    new PlayerInfo(new Location("25%", "12%","34%","27%"), 0, "dddd"),
    new PlayerInfo(new Location("8%", "25%","22.5%","36%"), 0, "eeeee"),
    new PlayerInfo(new Location("5%", "42%","20.5%","47%"), 0, "ffffff"),
    new PlayerInfo(new Location("8%", "58%","22.5%","59.5%"), 0, "ggggggg"),
    new PlayerInfo(new Location("25%", "72%","33%","66.5%"), 0, "hhhhhhhhh"),
    new PlayerInfo(new Location("52%", "73%","47.5%","66.5%"), 0, "iiiiiiii")
];

export default function Table({ socket }) {
    // username
    const [user, setUser] = useState("");

    useEffect(() => {
        async function getUsername() {
            const query = `http://localhost:4000/username?socketID=${socket.id}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setUser(dataJSON.username);
        }
        getUsername();
    }, [socket.id]); // only runs once since socket.id wont change

    // useEffect(() => {
    //     socket.on("")
    // }, [socket]);

    const seats = players.map(player =>
        <PlayerBox playerInfo={player} />
    );
    console.log(seats);

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
function PlayerBox({ playerInfo }) {

    // name and chip count text
    function NameAndChips() {
        return (
            <div className='nameAndChips'>
                <h2 style={{ marginTop: "10%" }}>{playerInfo.name}</h2>
                <h2 style={{ marginTop: "-10%" }}>{playerInfo.chips}</h2>
            </div>
        )
    }

    // plus icon, click to join table at that spot
    function Plus() {
        return (
            <div className='nameAndChips'>
                <img src={plus} alt='join icon'
                    style={{
                        height: 100,
                        width: 100
                }}></img>
            </div>
        )
    }
    const location = playerInfo.location;
    let content = <NameAndChips />;

    // let content = <Plus />;
    return (
        <div className='seat' style={{
                /* css stuff */
                top: location.top,
                left: location.left
            }}>
            <img className='button' src={button}></img>
            <div className='bet' style={{top: location.betTop, left: location.betLeft, }}>
                <h3>10000</h3>
            </div>
            {content}
            {/* <div className='nameAndChips'>
                <h2 style={{marginTop: "10%"}}>{playerInfo.name}</h2>
                <h2 style={{marginTop: "-10%"}}>{playerInfo.chips}</h2>
            </div> */}
        </div>
    )
}
