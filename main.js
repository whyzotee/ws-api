const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');

const { parse } = require('url');
const { WebSocket, WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 4399;
const wss = new WebSocketServer({ server: server });


app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/ws", (req, res) => {
  res.status(200).send("Websocket API");
});

app.post("/msg/:id", (req, res) => {
  const ws = new WebSocket(`ws://127.0.0.1:4399/msg/channel@${req.params.id}`).send('hi');
  // ws.send(JSON.stringify(req.body));
  // ws.onerror = e => res.send(e);
  // ws.close();

  res.status(200).send(JSON.stringify(req.body));

  const updateIndex = req.params.id;
  res.send(updateIndex);
});

var temp = {};

wss.on('connection', (ws, req) => {
  const location = parse(req.url, true);

  roomCH = location.pathname.split('@')[1];

  console.log('[ws-server] User is connect to CH ' + roomCH);

  const clientId = uuidv4();
  ws.clientId = clientId;
  ws.send(`Welcome ${ws.clientID} to server`)

  if (roomCH in temp) {
    temp[roomCH].push(ws);
  } else {
    temp[roomCH] = [ws];
  }

  console.log(temp);

  ws.on('message', (data, isBinary) => {
    console.log(`[ws-server CH ${roomCH}] : ${data}`);

    temp[roomCH].forEach(function each(client) {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });

  ws.on('close', () => {
    for (const groupId in temp) {
      if (temp.hasOwnProperty(groupId)) {
        const group = temp[groupId];
        const index = group.indexOf(ws);
        if (index !== -1) {
          group.splice(index, 1);
          console.log('[ws server] User is disconnected');
        }
      }
    }
  });
});

wss.on('error', (e) => {
  console.log("[ws server] Error Message " + e);
});

server.on('error', (e) => {
  console.log("[server] Error Message " + e);
});

server.listen(port, () => {
  console.log("[server] Listening ws-api on port " + port);
});