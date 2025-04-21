import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './Components/HomePage';
import Table from "./Components/Table"
import socketIO from 'socket.io-client';

console.log('process.env.SOCKET_URL')
console.log(process.env.SOCKET_URL)
const socket = socketIO.connect('http://localhost:8080');
// const socket = socketIO.connect(process.env.SOCKET_URL || 'http://localhost:8080');
function App() {
  return (
    <BrowserRouter>
      <div>
        <Routes>
          <Route path="/" element={<HomePage socket={socket} />}></Route>
          <Route path="/play" element={<Table socket={socket} />}></Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
