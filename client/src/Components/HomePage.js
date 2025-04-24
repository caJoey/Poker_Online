import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./HomePage.css";
import "./Table.css";
import create from '../Images/create.png';
import join from '../Images/join.png';
import rejoin from '../Images/reconnect.png';

export default function HomePage ({ socket }) {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [progress, setProgress] = useState(0);
    const MIN_LEN = 1;
    const MAX_LEN = 10;
    // deprecated: moved to reconnect()
    // useEffect(() => {
    //     async function tryReconnect() {
    //         const query = `/reconnectCheck?socketID=${socket.id}&oldId=${localStorage.getItem('id')}`;
    //         const data = await fetch(query);
    //         const dataJSON = await data.json();
    //         localStorage.setItem('id', socket.id);
    //         if (dataJSON.alreadyConnected) {
    //             navigate('/play');
    //         } 
    //     }
    //     socket.on('connect', tryReconnect);
    // }, [socket, navigate]);

    function onSubmit(event) {
        // prevent page from refreshing
        event.preventDefault();
        if (userName.length < MIN_LEN) {
            alert(`minimum username length is ${MIN_LEN}`);
            return;
        } else if (userName.length > MAX_LEN) {
            alert(`maximum username length is ${MAX_LEN}`);
            return;
        }
        // new user registered when user types in name
        socket.emit('newUser', userName); // userName maps to self
        setProgress(progress+1);
    }
    // userrname
    if (progress == 0) {
        return (
            <div id="login">
                <h1>Welcome to <code>poker-online</code></h1>
                <h2 style={{marginTop:'5%'}}>Enter Display Name</h2>
                <form onSubmit={onSubmit}>
                    <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    />
                    <button><code>{"->"}</code></button>
                </form>
                <a href="https://github.com/caJoey/Poker_Online"
                target="_blank" rel="noopener noreferrer"><button className="git_btn"></button></a>
            </div>
        )
    } else if (progress == 1) { // create or join
        return (
            <div id="login">
                <CreateOrJoin setProgress={setProgress} socket={socket}></CreateOrJoin>
            </div>
        )
    }
}

function CreateOrJoin({setProgress, socket}) {
    const BASE_URL = process.env.REACT_APP_SOCKET_URL || ''
    const navigate = useNavigate();
    async function joinGame() {
        const code = prompt('Enter the game code');
        if (code == null || code == "") {
            return;
        }
        const query = `${BASE_URL}/joinGame?socketID=${socket.id}&guess=${code}`;
        const data = await fetch(query);
        const dataJSON = await data.json();
        if (dataJSON.success) {
            localStorage.setItem('id', socket.id);
            navigate('/play');
        }
    }
    function createGame() {
        localStorage.setItem('id', socket.id);
        socket.emit('createGame');
        navigate('/play');
    }
    // try to reconnect to a previous game with localStorage
    async function reconnect() {
        const oldID = localStorage.getItem('id');
        if (oldID) {
            const query = `${BASE_URL}/reconnectCheck?socketID=${socket.id}&oldId=${oldID}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            if (dataJSON.alreadyConnected) {
                localStorage.setItem('id', socket.id);
                navigate('/play');
            } else {
                alert('No game found to reconect to!');
            }
        }
    }
    return (
        <div className='createOrJoin'>
            <button className='sitOutButton' onClick={()=>setProgress(0)}
            style={{top:'3%', backgroundColor: 'rgb(91, 195, 195)'}}>
                <h2>Back</h2>
            </button>
            <button className='choiceButton' onClick={createGame}>
                <h2>Create</h2>
                <img src={create}></img>
            </button>
            <button className='choiceButton' onClick={joinGame}>
                <h2>Join</h2>
                <img src={join}></img>
            </button>
            <button className='choiceButton' onClick={reconnect}>
                <h2>Reconnect</h2>
                <img src={rejoin}></img>
            </button>
        </div>
    )
}
