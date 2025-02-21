# Poker_Online

## Description
This is a website for playing online Texas Hold'Em poker with others. It uses React, Socket.IO, and Express to do this. It is currently being built.

## Technical description
The server contains the logic for the game, and sends table updates to each connected client through Socket.IO. When players make moves, this info is sent to the server which processes them.

## Stuff to add
 * Host it on a website
 * Private and public cash games
 * Custom tournaments / "sit n gos"
 * Handle reconnections using express-session or cookies
 * Chat
 * Hand replaying
 * Unique stuff
