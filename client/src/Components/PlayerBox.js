import React, { useState, useEffect } from 'react';
import './Table.css';
import plus from '../Images/plus.png';
import button from '../Images/crown.png';
import sparkle from '../Images/confetti.gif';

// box that holds info about player
export default function PlayerBox({playerInfo, location, socket, heroUsername, heroCards, heroSitting}) {
    const [playerSitting, setSitting] = useState(false);
    // let player_sitting = false;
    // tell socket that a new player wants to join
    function registerPlayer() {
        if (!heroUsername) {
            return;
        }
        console.log('registerPlayer');
        setSitting(true);
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
        if (playerInfo.holeCards && playerInfo.myTurn) {
            return (<div className='seatCheese' style={{backgroundColor: 'rgb(14, 255, 243)'}}></div>)
        } else if (playerInfo.holeCards.length) {
            return (<div className='seatCheese'></div>)
        }
        return (<div className='seatCheese' style={{backgroundColor: 'rgb(132, 133, 133)'}}></div>)
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
                {playerInfo.winner && <img className='sparkle' src={sparkle}/>}
            </div>
        )
    }
    console.log('no player here');
    // there is no player sitting here
    return (
        <div className='seat' style={{
            /* css stuff */
            top: location.top,
            left: location.left
        }}>
            <SeatCheese/>
            {!heroSitting && <Plus /> /* only show plus if player isnt sitting */}
        </div>
    )
}
