import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import "./HomePage.css"

export default function HomePage ({ socket }) {
    const navigate = useNavigate();
    const [userName, setUserName] = useState('');
    const MIN_LEN = 1

    function onSubmit(event){
        // prevent page from refreshing
        event.preventDefault();
        if (userName.length < MIN_LEN) {
            alert(`minimum username length is ${MIN_LEN}`);
            return;
        }
        // new user registered when user types in name
        socket.emit('newUser', userName); // userName maps to self
        navigate('/play');
    }
    return (
        <div id="login">
            <h1>Welcome to <code>poker-online</code></h1>
            <h2>Enter Display Name</h2>
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
}
