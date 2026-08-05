import Phaser from "phaser";
import { CHARACTERS } from "../../../shared/gameData";
import { CharacterSprite } from "./CharacterSprite";

export interface SyncedCharacter {
  characterId: string;
  petId: string;
  controlledBy: string;
  x: number;
  y: number;
  money: number;
  hunger: number;
  bladder: number;
  energy: number;
  happiness: number;
  working: boolean;
  workProgress: number;
  derailed: boolean;
  derailRemainingMs: number;
  activity: string;
  eliminated: boolean;
  eliminationReason: string;
}

const DEPTH_CHARACTER = 30;
const DEPTH_OVERLAY = 40;

// Everything drawn for one character: their sprite, name tag, emote bubble,
// and work progress bar. Pure rendering — all state comes from the server.
export class CharacterView {
  private scene: Phaser.Scene;
  private sprite: CharacterSprite;
  private nameTag: Phaser.GameObjects.Text;
  private emote: Phaser.GameObjects.Text;
  private workBarBg: Phaser.GameObjects.Rectangle;
  private workBarFill: Phaser.GameObjects.Rectangle;

  private prevX: number;
  private prevY: number;
  private isLocal: boolean;
  private lastMoney: number;

  constructor(scene: Phaser.Scene, state: SyncedCharacter, isLocal: boolean) {
    this.scene = scene;
    this.isLocal = isLocal;
    this.prevX = state.x;
    this.prevY = state.y;
    this.lastMoney = state.money;

    const character = CHARACTERS[state.characterId];
    this.sprite = new CharacterSprite(scene, state.x, state.y, character.appearance);
    this.sprite.setDepth(DEPTH_CHARACTER);

    const tagColor = isLocal ? "#ffd75e" : "#ffffff";
    this.nameTag = scene.add
      .text(state.x, state.y - 74, isLocal ? `▼ ${character.name} (you)` : character.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: isLocal ? "14px" : "12px",
        color: tagColor,
        fontStyle: isLocal ? "bold" : "normal",
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_OVERLAY);
    this.nameTag.setStroke("#1b2330", 4);

    this.emote = scene.add
      .text(state.x, state.y - 92, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#2b2b33",
        backgroundColor: "#fdf6e3",
        padding: { x: 7, y: 4 },
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_OVERLAY)
      .setVisible(false);

    this.workBarBg = scene.add.rectangle(state.x, state.y - 84, 46, 7, 0x1b2330).setDepth(DEPTH_OVERLAY).setVisible(false);
    this.workBarFill = scene.add
      .rectangle(state.x - 23, state.y - 84, 0, 7, 0x5b9bff)
      .setOrigin(0, 0.5)
      .setDepth(DEPTH_OVERLAY)
      .setVisible(false);
  }

  render(state: SyncedCharacter, delta: number) {
    const moving = Math.abs(state.x - this.prevX) > 0.15 || Math.abs(state.y - this.prevY) > 0.15;
    this.sprite.setPosition(state.x, state.y);
    this.sprite.update(delta, moving && !state.working);
    this.sprite.setAlpha(state.eliminated ? 0.25 : state.derailed ? 0.55 : 1);
    // Depth-sort by Y so characters lower on screen draw in front.
    this.sprite.setDepth(DEPTH_CHARACTER + state.y / 1000);

    this.nameTag.setPosition(state.x, state.y - 74);
    this.nameTag.setAlpha(state.eliminated ? 0.4 : 1);

    // Money popup when a shift pays out.
    if (state.money > this.lastMoney) {
      this.showPayout(state.money - this.lastMoney, state.x, state.y);
    }
    this.lastMoney = state.money;

    const bubble = this.bubbleText(state);
    if (bubble) {
      this.emote.setText(bubble);
      this.emote.setPosition(state.x, state.y - (state.working ? 100 : 92));
      this.emote.setVisible(true);
    } else {
      this.emote.setVisible(false);
    }

    this.workBarBg.setVisible(state.working).setPosition(state.x, state.y - 84);
    this.workBarFill.setVisible(state.working).setPosition(state.x - 23, state.y - 84);
    if (state.working) this.workBarFill.width = 46 * state.workProgress;

    this.prevX = state.x;
    this.prevY = state.y;
  }

  private bubbleText(state: SyncedCharacter): string | null {
    if (state.eliminated) return "💔 out of the game";
    if (state.derailed) {
      const secs = Math.ceil(state.derailRemainingMs / 1000);
      return `😤 ${state.activity} (${secs}s)`;
    }
    if (state.controlledBy === "" && state.activity) return `💤 ${state.activity}`;
    return null;
  }

  private showPayout(amount: number, x: number, y: number) {
    const doubled = amount > 0 && amount >= 150_000;
    const text = this.scene.add
      .text(x, y - 100, doubled ? `★ 2x MONEY!  +$${amount.toLocaleString()}` : `+$${amount.toLocaleString()}`, {
        fontFamily: "system-ui, sans-serif",
        fontSize: doubled ? "18px" : "14px",
        color: doubled ? "#ffd75e" : "#d8e4f2",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_OVERLAY + 5);
    text.setStroke("#1b2330", 5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 46,
      alpha: 0,
      duration: 1300,
      ease: "Cubic.easeOut",
      onComplete: () => text.destroy(),
    });

    if (doubled && this.isLocal) this.showStarBurst(x, y);
  }

  private showStarBurst(x: number, y: number) {
    for (let i = 0; i < 7; i++) {
      const star = this.scene.add
        .text(x, y - 60, "★", { fontFamily: "system-ui, sans-serif", fontSize: "17px", color: "#ffd75e" })
        .setOrigin(0.5)
        .setDepth(DEPTH_OVERLAY + 5);
      const angle = (Math.PI * 2 * i) / 7;
      this.scene.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * 55,
        y: y - 60 + Math.sin(angle) * 45,
        alpha: 0,
        scale: 0.4,
        duration: 900,
        ease: "Cubic.easeOut",
        onComplete: () => star.destroy(),
      });
    }
  }

  destroy() {
    this.sprite.destroy();
    this.nameTag.destroy();
    this.emote.destroy();
    this.workBarBg.destroy();
    this.workBarFill.destroy();
  }
}
