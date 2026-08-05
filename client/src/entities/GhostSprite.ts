import Phaser from "phaser";
import { VisitorPersonDef } from "../../../shared/gameData";

// A translucent, floating grandparent ghost. Domed head, wavy hem, and a
// telltale accessory so Momo and Bobo read as individuals rather than two
// copies of the same sheet.
export class GhostSprite {
  readonly container: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Graphics;
  private bobPhase = Math.random() * Math.PI * 2;
  private lastX: number;

  constructor(scene: Phaser.Scene, x: number, y: number, def: VisitorPersonDef) {
    this.lastX = x;

    // faint glow pooled beneath them instead of a hard shadow
    const glow = scene.add.graphics();
    glow.fillStyle(def.tint, 0.16);
    glow.fillEllipse(0, 4, 46, 14);

    this.body = scene.add.graphics();
    this.draw(this.body, def);

    this.container = scene.add.container(x, y, [glow, this.body]);
    this.container.setScale(def.scale);
    this.container.setAlpha(0.82);
  }

  private draw(g: Phaser.GameObjects.Graphics, def: VisitorPersonDef) {
    const { tint } = def;

    // shroud: domed top over a body that frays into a wavy hem
    g.fillStyle(tint, 0.95);
    g.fillCircle(0, -44, 17);
    g.fillRect(-17, -44, 34, 30);
    const hemY = -14;
    g.fillTriangle(-17, hemY, -11, hemY, -14, hemY + 10);
    g.fillTriangle(-11, hemY, -5, hemY, -8, hemY + 12);
    g.fillTriangle(-5, hemY, 1, hemY, -2, hemY + 9);
    g.fillTriangle(1, hemY, 7, hemY, 4, hemY + 12);
    g.fillTriangle(7, hemY, 13, hemY, 10, hemY + 10);
    g.fillTriangle(13, hemY, 17, hemY, 15, hemY + 8);

    // inner shading so they aren't a flat blob
    g.fillStyle(0xffffff, 0.35);
    g.fillEllipse(-5, -48, 16, 12);

    if (def.accessory === "bun") {
      g.fillStyle(tint, 0.95);
      g.fillCircle(0, -62, 7.5);
      g.fillStyle(0xffffff, 0.3);
      g.fillCircle(-2, -63.5, 3.5);
    }

    // face
    g.fillStyle(0x3b3350, 0.9);
    g.fillEllipse(-6, -46, 4.5, 6);
    g.fillEllipse(6, -46, 4.5, 6);
    g.fillEllipse(0, -35, 7, 9);

    if (def.accessory === "glasses") {
      g.lineStyle(1.6, 0x4a4a55, 0.85);
      g.strokeCircle(-6, -46, 6.5);
      g.strokeCircle(6, -46, 6.5);
      g.lineBetween(-0.5, -46, 0.5, -46);
    }
  }

  setPosition(x: number, y: number) {
    if (Math.abs(x - this.lastX) > 0.4) {
      this.container.scaleX = Math.abs(this.container.scaleX) * (x < this.lastX ? -1 : 1);
      this.lastX = x;
    }
    this.container.setPosition(x, y);
  }

  update(delta: number) {
    this.bobPhase += (delta / 1000) * 2.1;
    this.body.y = Math.sin(this.bobPhase) * 3.2;
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  setDepth(depth: number) {
    this.container.setDepth(depth);
  }
}
