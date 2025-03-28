import './Table.css';

// cards in middle
export default function CommunityCards({cards}) {
    // cards = ['2c','6h','10s','Jd','Ah']
    const lefts = ['23%','34%','45%','56%','67%'];
    let index = 0;
    const commCards = cards.map(card =>
        <img className='commCard' src={require(`../Images/Cards/${card}.jpg`)}
        style={{top: '32.5%', left: lefts[index++]}}/>
    );
    console.log(index);
    return (<>{commCards}</>)
}
