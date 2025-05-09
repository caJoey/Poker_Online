# Poker Online
![](https://github.com/caJoey/Poker_Online/blob/main/client/src/Images/HomePage.PNG)

![](https://github.com/caJoey/Poker_Online/blob/main/client/src/Images/JoinPage.PNG)

![](https://github.com/caJoey/Poker_Online/blob/main/client/src/Images/Table.PNG)

![](https://github.com/caJoey/Poker_Online/blob/main/client/src/Images/EndScreen.PNG)

## Description
This is a website for playing online NoLimit Texas Hold'Em poker with others online. It uses Node, React, Socket.IO, and Express to do this. It currently supports private Sit & Gos (mini tournaments) for up to 9 players, and the blind structure should make games take around 1-2 hours.

## [Website Link](https://pokeronline.azurewebsites.net/)

## Technical description
The server (root folder) contains the logic for the game, and sends table updates to each connected client through Socket.IO. When players make moves, this info is sent to the server which processes them.

## Stuff to add
 * Private and public cash games
 * Chat
 * Hand replaying
 * Larger tournmanets
 * Custom blind structure

## How to run
1. Clone the repository
2. To run the server, do npm run dev
3. To run the client, cd to client directory and do npm start
4. Multiple tabs in the same browser act as separate players, but you may only use the reconnect feature for the tab you most recently joined with
