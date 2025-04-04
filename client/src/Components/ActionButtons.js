import React, { useState, useEffect } from 'react';
import './Table.css';

// buttons if we are facing a bet
export default function ActionButtons({socket, heroInfo, betSize, minRaise}) {
    const [hideRaise, setHideRaise] = useState(false);
    useEffect(() => {
        async function getAllIn() {
            const query = `http://localhost:4000/everyoneExceptOnePersonIsAllIn?socketID=${socket.id}`;
            const data = await fetch(query);
            const dataJSON = await data.json();
            setHideRaise(dataJSON.everyoneExceptOnePersonIsAllIn);
        }
        console.log('running getAllIn in actionButtons...')
        getAllIn();
        console.log(`hideRaise ${hideRaise}`);
    }, [socket.id]); // only runs once
    const [raiseSlider, setRaiseSlider] =
        useState(Math.min(heroInfo.chips + heroInfo.betSize, minRaise + betSize));
    const [call, setCall] = useState(Math.min(betSize - heroInfo.betSize, heroInfo.chips));

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
