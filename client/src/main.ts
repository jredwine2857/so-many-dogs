import Phaser from "phaser";
import { Client } from "colyseus.js";
import { GameScene, GiftMessage } from "./scenes/GameScene";

// Baked in at build time. CI sets VITE_SERVER_URL to the CloudFront
// distribution that fronts the game server (wss://…); local dev falls back
// to the server running on this machine.
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? "ws://localhost:2567";

async function boot() {
  const client = new Client(SERVER_URL);

  let room;
  try {
    room = await client.joinOrCreate("so-many-dogs");
  } catch (err) {
    console.error("Failed to connect to game server", err);
    document.getElementById("app")!.innerText =
      `Could not connect to the game server at ${SERVER_URL}. Is it running?`;
    return;
  }

  // Subscribe before the scene exists. Phaser takes a moment to boot, and a
  // gift broadcast landing in that gap would otherwise be dropped (with a
  // console warning) instead of reaching the player as a toast.
  const giftQueue: GiftMessage[] = [];
  room.onMessage("gift", (msg: GiftMessage) => giftQueue.push(msg));

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "app",
    width: 1024,
    height: 640,
    backgroundColor: "#4a6b3f",
    pixelArt: false,
    // Trait sounds run through our own Web Audio graph (see TraitAudio), so
    // Phaser's sound manager would only add a second, unused AudioContext —
    // and it's the one that trips the browser's "not allowed to start"
    // warning by being created before any user gesture.
    audio: { noAudio: true },
  });
  game.scene.add("GameScene", GameScene, true, { room, giftQueue });

  // Dev-only hook for manual/automated testing of the prototype in-browser.
  (window as any).game = game;
  (window as any).room = room;
}

boot();
