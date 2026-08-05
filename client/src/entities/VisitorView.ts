import Phaser from "phaser";
import { VISITOR_PEOPLE } from "../../../shared/gameData";
import { CharacterSprite } from "./CharacterSprite";
import { GhostSprite } from "./GhostSprite";
import { WheelchairSprite } from "./WheelchairSprite";

export interface SyncedVisitor {
  visitorId: string;
  pairId: string;
  x: number;
  y: number;
  active: boolean;
}

const DEPTH_VISITOR = 34;

interface Drawable {
  setPosition(x: number, y: number): void;
  setVisible(v: boolean): void;
  setDepth(d: number): void;
}

// One visiting grandparent: the right sprite for their kind, plus a name
// tag. John reuses the regular character sprite so he walks like everyone
// else; Judi and the ghosts have their own.
export class VisitorView {
  private sprite: Drawable;
  private walker?: CharacterSprite;
  private ghost?: GhostSprite;
  private wheelchair?: WheelchairSprite;
  private nameTag: Phaser.GameObjects.Text;
  private prevX: number;
  private prevY: number;

  constructor(scene: Phaser.Scene, state: SyncedVisitor) {
    const def = VISITOR_PEOPLE[state.visitorId];
    this.prevX = state.x;
    this.prevY = state.y;

    if (def.kind === "ghost") {
      this.ghost = new GhostSprite(scene, state.x, state.y, def);
      this.sprite = this.ghost;
    } else if (def.kind === "wheelchair") {
      this.wheelchair = new WheelchairSprite(scene, state.x, state.y, def);
      this.sprite = this.wheelchair;
    } else {
      this.walker = new CharacterSprite(scene, state.x, state.y, def.appearance!);
      this.sprite = {
        setPosition: (x, y) => this.walker!.setPosition(x, y),
        setVisible: (v) => this.walker!.container.setVisible(v),
        setDepth: (d) => this.walker!.setDepth(d),
      };
    }

    this.nameTag = scene.add
      .text(state.x, state.y - 76, def.name, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#ffe3ef",
      })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH_VISITOR + 5);
    this.nameTag.setStroke("#1b2330", 4);
  }

  render(state: SyncedVisitor, delta: number) {
    this.sprite.setVisible(state.active);
    this.nameTag.setVisible(state.active);
    if (!state.active) {
      this.prevX = state.x;
      this.prevY = state.y;
      return;
    }

    const moving = Math.abs(state.x - this.prevX) > 0.15 || Math.abs(state.y - this.prevY) > 0.15;
    this.sprite.setPosition(state.x, state.y);
    this.sprite.setDepth(DEPTH_VISITOR + state.y / 1000);
    this.nameTag.setPosition(state.x, state.y - 76);

    this.ghost?.update(delta);
    this.wheelchair?.update(delta);
    this.walker?.update(delta, moving);

    this.prevX = state.x;
    this.prevY = state.y;
  }
}
