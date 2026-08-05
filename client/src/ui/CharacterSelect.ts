import Phaser from "phaser";
import { CHARACTERS, CHARACTER_ORDER, PETS } from "../../../shared/gameData";

const DEPTH = 2000;
const VIEW_W = 1024;
const VIEW_H = 640;

const COLS = 5;
const CARD_W = 186;
const CARD_H = 104;
const GAP_X = 10;
const GAP_Y = 10;

interface Card {
  characterId: string;
  bg: Phaser.GameObjects.Rectangle;
  texts: Phaser.GameObjects.Text[];
  taken: boolean;
}

/**
 * Pick-your-character screen, shown until the server confirms you own one.
 * Availability is driven by the live room state, so cards grey out the
 * instant someone else takes them.
 */
export class CharacterSelect {
  private scene: Phaser.Scene;
  private onPick: (characterId: string) => void;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private cards: Card[] = [];
  private status!: Phaser.GameObjects.Text;
  private visible = true;

  constructor(scene: Phaser.Scene, onPick: (characterId: string) => void) {
    this.scene = scene;
    this.onPick = onPick;
    this.build();
  }

  private build() {
    const scrim = this.scene.add
      .rectangle(0, 0, VIEW_W, VIEW_H, 0x0b1420, 0.93)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH);
    this.objects.push(scrim);

    this.objects.push(
      this.scene.add
        .text(VIEW_W / 2, 22, "So Many Dogs!", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "30px",
          color: "#ffd75e",
          fontStyle: "bold",
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1)
    );

    this.objects.push(
      this.scene.add
        .text(VIEW_W / 2, 60, "Pick your character — race to $1,000,000 without losing your pet", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: "#8fa3bd",
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1)
    );

    const gridW = COLS * CARD_W + (COLS - 1) * GAP_X;
    const startX = (VIEW_W - gridW) / 2;
    const startY = 96;

    CHARACTER_ORDER.forEach((characterId, i) => {
      const def = CHARACTERS[characterId];
      const pet = PETS[def.petId];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * (CARD_W + GAP_X);
      const y = startY + row * (CARD_H + GAP_Y);

      const bg = this.scene.add
        .rectangle(x, y, CARD_W, CARD_H, 0x16263a, 1)
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(DEPTH + 1)
        .setStrokeStyle(2, def.accent)
        .setInteractive({ useHandCursor: true });

      const texts = [
        this.scene.add.text(x + 10, y + 8, def.name, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "17px",
          color: "#ffffff",
          fontStyle: "bold",
        }),
        this.scene.add.text(x + 10, y + 30, def.career, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "11px",
          color: `#${def.accent.toString(16).padStart(6, "0")}`,
        }),
        this.scene.add.text(x + 10, y + 48, `Pet: ${pet.name} (${pet.species === "guineaPig" ? "guinea pig" : pet.species})`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "11px",
          color: "#c8d4e3",
        }),
        this.scene.add.text(x + 10, y + 66, `😤 ${def.annoyingTrait}`, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "10px",
          color: "#8fa3bd",
          wordWrap: { width: CARD_W - 20 },
        }),
      ];
      texts.forEach((t) => t.setScrollFactor(0).setDepth(DEPTH + 2));

      bg.on("pointerover", () => {
        if (!this.isTaken(characterId)) bg.setFillStyle(0x22384f, 1);
      });
      bg.on("pointerout", () => {
        if (!this.isTaken(characterId)) bg.setFillStyle(0x16263a, 1);
      });
      bg.on("pointerdown", () => {
        if (this.isTaken(characterId)) return;
        this.status.setText(`Claiming ${def.name}…`);
        this.onPick(characterId);
      });

      this.cards.push({ characterId, bg, texts, taken: false });
      this.objects.push(bg, ...texts);
    });

    this.status = this.scene.add
      .text(VIEW_W / 2, VIEW_H - 30, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#ffb84f",
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 2);
    this.objects.push(this.status);
  }

  private takenIds = new Set<string>();

  private isTaken(characterId: string) {
    return this.takenIds.has(characterId);
  }

  /** Called each frame with the live set of claimed characters. */
  refresh(takenIds: Set<string>) {
    if (!this.visible) return;
    this.takenIds = takenIds;
    this.cards.forEach((card) => {
      const taken = takenIds.has(card.characterId);
      if (taken === card.taken) return;
      card.taken = taken;
      card.bg.setFillStyle(taken ? 0x0e1620 : 0x16263a, 1);
      card.bg.setAlpha(taken ? 0.45 : 1);
      card.texts.forEach((t) => t.setAlpha(taken ? 0.4 : 1));
    });
  }

  showMessage(message: string) {
    this.status.setText(message);
  }

  hide() {
    this.visible = false;
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    this.cards = [];
  }

  get isVisible() {
    return this.visible;
  }
}
