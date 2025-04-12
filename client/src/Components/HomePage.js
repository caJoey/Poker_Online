import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./HomePage.css";
import "./Table.css";
import create from '../Images/create.png';
import join from '../Images/join.png';



export default function HomePage ({ socket }) {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const [progress, setProgress] = useState(0);
    const MIN_LEN = 1;
    const MAX_LEN = 10;
    useEffect(() => {
        async function tryReconnect() {
            console.log(`socket : ${socket}`)
            console.log(`socket.id : ${socket.id}`)
            const query = `http://localhost:4000/reconnectCheck?socketID=${socket.id}&oldId=${localStorage.getItem('id')}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            localStorage.setItem('id', socket.id);
            if (dataJSON.alreadyConnected) {
                navigate('/play');
            } 
        }
        socket.on('connect', tryReconnect);
    }, [socket, navigate]);

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
    const navigate = useNavigate();
    async function enterCode() {
        const code = prompt('Enter the game code');
        if (code == null || code == "") {
            return;
        }
        const query = `http://localhost:4000/joinGame?socketID=${socket.id}&guess=${code}`;
        const data = await fetch(query);
        const dataJSON = await data.json();
        if (dataJSON.success) {
            navigate('/play');
        }
    }
    function createGame() {
        socket.emit('createGame');
        navigate('/play');
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
            <button className='choiceButton' onClick={enterCode}>
                <h2>Join</h2>
                <img src={join}></img>
            </button>
        </div>
    )
}
