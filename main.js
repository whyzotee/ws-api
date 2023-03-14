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

function randomChoice(arr) {
  return arr[Math.floor(arr.length * Math.random())];
}

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/ws", (req, res) => {
  try {
    res.status(200).send('[server]: path /ws');
  } catch (e) {
    console.error(e);
    res.status(500).send('[server]: Error to connect server');
  }
});

app.get("/msg/:id", (req, res) => {
  try {
    const wss = new WebSocket(`ws://127.0.0.1:4399/msg/channel@${req.params.id}`);
    let data;

    wss.on('message', ws => {
      data = JSON.parse(ws);

      if (data["status"]) {
        res.status(200).send(`[api-server] : ok`);
        wss.close();
      } else {
        res.status(500).send(`[api-server] : full`);
        wss.close();
      }
    });

    wss.on('error', (e) => {
      console.error(e);
      res.status(500).send('[api-server] : Error connection WebSocket server')
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('[api-server] : Error opening WebSocket connection');
  }
});

app.post("/msg/:id", (req, res) => {
  try {
    const ws = new WebSocket(`ws://127.0.0.1:4399/msg/channel@${req.params.id}`);
    ws.on('open', () => {
      ws.send(JSON.stringify(req.body));
      res.status(200).send(`[api-server] : send message complete`);
    });

    ws.on('error', (e) => {
      console.error(e);
      res.status(500).send('[api-server] : Error sending message to WebSocket server')
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('[api-server] : Error opening WebSocket connection');
  }
});

var tempData = {};
var all_key = ['L', 'R'];
var full_room = [];

wss.on('connection', (ws, req) => {
  let roomCH = parse(req.url, true).pathname.split('@')[1];

  console.log(`[ws-server] User is connect to CH ${roomCH}`);

  if (!(roomCH in tempData)) {
    tempData[roomCH] = {};

    for (let i in all_key) {
      tempData[roomCH][all_key[i]] = [];
    }
  }

  for (let i in all_key) {
    if (tempData[roomCH][all_key[i]].length != 0) {
      full_room.push(all_key[i])
    }
  }

  empty_room = all_key.filter(x => !full_room.includes(x));
  target = empty_room[Math.floor(empty_room.length * Math.random())]

  if (tempData[roomCH][target] == undefined) {
    return ws.send(JSON.stringify({ "status": false }));
  }

  tempData[roomCH][target].push(ws);

  console.log(tempData);

  const clientId = uuidv4();
  ws.clientId = clientId;
  ws.send(JSON.stringify({ "status": true, "id": clientId }));

  ws.on('message', (data, isBinary) => {
    console.log(`[ws ch ${roomCH}] : ${data}`);

    for (let i in all_key) {
      tempData[roomCH][all_key[i]].forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data, { binary: isBinary });
        }
      });
    }
  });

  ws.on('close', () => {
    for (let i in all_key) {
      const index = tempData[roomCH][all_key[i]].indexOf(ws);
      if (index !== -1) {
        // tempData[roomCH][all_key[i]].forEach(client => {
        //   client.send(`bye bye`);
        // })
        tempData[roomCH][all_key[i]].splice(index, 1);
        console.log(tempData);
      }
    }
  });
});

wss.on('error', e => {
  console.log(`[ws server] Error Message ${e}`);
});

server.on('error', e => {
  console.log(`[server] Error Message ${e}`);
});

server.listen(port, () => {
  console.log(`[server] Listening ws-api on port ${port}`);
});