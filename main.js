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

var tempData = {};
var tempCheck = {};
var all_key = ['L', 'R'];


// ********************************* http API ********************************* //


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
  let room_id = req.params.id;
  if (!(room_id in tempData)) {
    console.log(1);
    res.status(200).send('ว่าง');
  } else {
    let full_room = [];
    for (let i in all_key) {
      if (tempData[room_id][all_key[i]].length != 0) {
        full_room.push(all_key[i])
      }
    }
    if (full_room.length == all_key.length) {
      console.log(2);
      res.status(500).send('ไม่ว่าง');
    } else {
      console.log(3);
      res.status(200).send('ว่าง');
    }
  }
});


// ********************************* Websocket API ********************************* //


wss.on('connection', (ws, req) => {
  let roomCH = parse(req.url, true).pathname.split('@')[1];
  console.log(`[ws-server] User is connect to CH ${roomCH}`);

  if (!(roomCH in tempData)) {
    tempData[roomCH] = {};
    tempCheck[roomCH] = {};

    for (let i in all_key) {
      tempData[roomCH][all_key[i]] = [];
      tempCheck[roomCH][all_key[i]] = false;
    }
  }

  let full_room = [];
  for (let i in all_key) {
    if (tempData[roomCH][all_key[i]].length != 0) {
      full_room.push(all_key[i])
    }
  }

  let empty_room = all_key.filter(x => !full_room.includes(x));
  let target = empty_room[Math.floor(empty_room.length * Math.random())]

  if (tempData[roomCH][target] == undefined) {
    ws.close();
  } else {
    tempData[roomCH][target].push(ws);
    tempCheck[roomCH][target] = true;

    const clientId = uuidv4();
    ws.clientId = clientId;
    ws.send(JSON.stringify({ "id": clientId, "pos": tempCheck[roomCH] }));
  }

  console.log(tempData);

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
        tempData[roomCH][all_key[i]].splice(index, 1);
        tempCheck[roomCH][all_key[i]] = false;
        console.log('[ws-server] User is disconnected');
      }
    }
  });
});


// ********************************* Server log ********************************* //


server.on('error', e => {
  console.log(`[server] Error Message ${e}`);
});

server.listen(port, () => {
  console.log(`[server] Listening ws-api on port ${port}`);
});