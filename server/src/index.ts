import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { SoManyDogsRoom } from "./rooms/SoManyDogsRoom";

const port = Number(process.env.PORT) || 2567;

// CloudFront sits in front of this in AWS and needs a cheap, unauthenticated
// endpoint it can hit for health checks — and it's handy for confirming a
// deploy actually took. Everything else on this server is Colyseus's own
// matchmaking + WebSocket traffic.
const httpServer = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define("so-many-dogs", SoManyDogsRoom);

// Bind on all interfaces so the container is reachable from outside it.
gameServer.listen(port, "0.0.0.0");
console.log(`So Many Dogs! server listening on port ${port}`);
