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
    res.status(404).send('[ws-serverAPI]: No have Room');
  } else {
    let full_room = [];
    for (let i in all_key) {
      if (tempData[room_id][all_key[i]].length != 0) {
        full_room.push(all_key[i])
      }
    }
    if (full_room.length == all_key.length) {
      res.status(500).send('[ws-serverAPI]: Room is not empty');
    } else {
      res.status(200).send('[ws-serverAPI]: Pass');
    }
  }
});

app.get("/msg/new/:id", (req, res) => {
  let room_id = req.params.id;
  if (!(room_id in tempData)) {
    if (get_one_person_room().length > 1) {
      res.status(200).send(get_one_person_room());
    }
    else {
      res.status(201).send('[ws-serverAPI]: Pass create new room');
    }
  } else {
    res.status(500).send('[ws-serverAPI]: Cannot create room');
  }
});


// ********************************* Websocket API ********************************* //


wss.on('connection', (ws, req) => {
  /*          URL stucture
  ws://domain:port/msg/channel_new!name=Z0TEExt@A0B1C2D

  _create !name=      @room    
      |     |           |
  _create!name=Z0TEExt@A0B1C2D  
    
  */

  let roomCH = parse(req.url, true).pathname.split('@')[1].toString();
  let createRoom = parse(req.url, true).pathname.split('create')[1];
  let userName = parse(req.url, true).pathname.split('name=')[1].split('@')[0];

  if (!(roomCH in tempData)) {
    if (createRoom != undefined) {
      tempData[roomCH] = {};
      tempCheck[roomCH] = {};

      for (let i in all_key) {
        tempData[roomCH][all_key[i]] = [];
        tempCheck[roomCH][all_key[i]] = false;
      }
    } else {
      return ws.close();
    }
  }

  let full_room = [];
  for (let i in all_key) {
    if (tempData[roomCH][all_key[i]].length != 0) {
      full_room.push(all_key[i]);
    }
  }

  let empty_room = all_key.filter(x => !full_room.includes(x));
  let target = empty_room[Math.floor(empty_room.length * Math.random())];

  if (tempData[roomCH][target] == undefined) {
    return ws.close();
  } else {
    tempData[roomCH][target].push(ws);
    tempCheck[roomCH][target] = true;

    const clientId = uuidv4();
    ws.clientId = clientId;
    ws.clientName = userName;
    ws.send(JSON.stringify({ "id": clientId, "name": userName, "pos": tempCheck[roomCH] }));

    console.log(`[ws-server] ${userName} is connect to CH ${roomCH}`);
  }



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
    let userInroom = 0;

    for (let i in all_key) {
      const index = tempData[roomCH][all_key[i]].indexOf(ws);
      if (index !== -1) {
        tempData[roomCH][all_key[i]].splice(index, 1);
        tempCheck[roomCH][all_key[i]] = false;
        console.log('[ws-server] User is disconnected');
      }

      tempData[roomCH][all_key[i]].forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ "leave": ws.clientName, 'uuid': ws.clientId }));
          userInroom++;
        }
      });
    }

    if (userInroom == 0) {
      delete tempData[roomCH]
    }

    console.log(tempData);
  });
});

function get_one_person_room() {
  let result = [];

  for (const key in tempData) {
    let count = 0
    for (i in all_key) {
      tempData[key][all_key[i]].forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          count++;
        }
      });
    }
    if (count >= 1) {
      result.push(key);
    }
  }

  return result;
}

// ********************************* Server log ********************************* //


server.on('error', e => {
  console.log(`[server] Error Message ${e}`);
});

server.listen(port, () => {
  console.log(`[server] Listening ws-api on port ${port}`);
});