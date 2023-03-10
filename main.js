const express = require('express');
const bodyParser = require('body-parser');
const { WebSocket, WebSocketServer } = require('ws');
const { parse } = require('url');

const app = express();
const server = require('http').createServer(app);
const port = process.env.PORT || 4399;
const wss = new WebSocketServer({ noServer: true });
const wss1 = new WebSocketServer({ noServer: true });
const ws = new WebSocket('ws://127.0.0.1:4399/ws');

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
  ws.on('error', console.error);

  console.log('User Connected to ws channel 0');

  ws.on('message', data => {
    console.log(`channel 0 data : ${data}`);

    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('User disconnect ws channel 0');
  });
});

wss1.on('connection', ws => {
  ws.on('error', console.error);

  console.log('User Connected on ws channel 1');

  ws.on('message', data => {
    console.log(`channel 1 data : ${data}`);

    wss1.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPE) {
        client.send(data.toString());
      }
    });
  });

  ws.on('close', () => {
    console.log('User disconnect ws channel 1');
  });
});

server.on('upgrade', (req, socket, head) => {
  const { pathname } = parse(req.url);
  if (pathname === '/ws') {
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
    });
  } else if (pathname === '/ws/1') {
    wss1.handleUpgrade(req, socket, head, ws => {
      wss1.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

server.on('error', (e) => {
  console.log("[Server] Error Message " + e);
});

server.listen(port, () => {
  console.log("[Server] Listening WebSocket and API on port " + port);
});