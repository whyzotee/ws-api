const express = require('express');
const bodyParser = require('body-parser');
const { WebSocket, WebSocketServer } = require('ws');

const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 4399;
const wss = new WebSocketServer({server:server});
const ws = new WebSocket('ws://127.0.0.1:4399')

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Hello World!");
  console.log(server);
});

app.get("/ws", (req, res) => {
  res.status(200).send("Websocket API");
});

app.post("/ws", (req, res) => {
  res.status(200).send(JSON.stringify(req.body));
  ws.send(JSON.stringify(req.body));
  ws.onerror = e => {
    res.send(e);
  }
});

wss.on('connection', ws => {
  console.log('user connected');

  ws.on('message',data => {
    console.log(data.toString());
   
    wss.clients.forEach(x => {
      if(x.readyState === WebSocket.OPEN){
        x.send(data.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('user disconnected');
  })
});

wss.on('error', (e) => {
  console.log("[WebSocket Server] Error Message " + e);
});

server.listen(port, () => {
  console.log("[Server] Listening WebSocket and API on port " + port);
});

server.on('error',(e)=>{
  console.log("[Server] Error Message " + e);
});