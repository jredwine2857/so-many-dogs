import Phaser from "phaser";
import { VisitorPersonDef } from "../../../shared/gameData";

// Judi, seated in her wheelchair. Drawn as a single unit — seated figure,
// big rear wheel with spokes, small caster in front — with the wheel
// rotating as she rolls so it doesn't look like she's being dragged.
export class WheelchairSprite {
  readonly container: Phaser.GameObjects.Container;
  private wheel: Phaser.GameObjects.Graphics;
  private lastX: number;

  constructor(scene: Phaser.Scene, x: number, y: number, def: VisitorPersonDef) {
    this.lastX = x;

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.22);
    shadow.fillEllipse(0, 2, 40, 10);

    const chair = scene.add.graphics();
    this.drawChairAndRider(chair, def);

    this.wheel = scene.add.graphics();
    this.drawWheel(this.wheel);
    this.wheel.setPosition(-2, -13);

    this.container = scene.add.container(x, y, [shadow, chair, this.wheel]);
    this.container.setScale(def.scale);
  }

  private drawWheel(g: Phaser.GameObjects.Graphics) {
    g.lineStyle(2.4, 0x3a3f48, 1);
    g.strokeCircle(0, 0, 13);
    g.lineStyle(1, 0x6b7280, 0.9);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI * i) / 3;
      g.lineBetween(-Math.cos(a) * 11, -Math.sin(a) * 11, Math.cos(a) * 11, Math.sin(a) * 11);
    }
    g.fillStyle(0x4a4f57, 1);
    g.fillCircle(0, 0, 3);
  }

  private drawChairAndRider(g: Phaser.GameObjects.Graphics, def: VisitorPersonDef) {
    // frame + footplate + small front caster
    g.fillStyle(0x4a4f57, 1);
    g.fillRoundedRect(-4, -30, 22, 4, 2);
    g.fillRoundedRect(14, -22, 4, 16, 2);
    g.fillRoundedRect(12, -8, 12, 3.5, 1.5);
    g.fillCircle(20, -5, 4.5);
    g.fillStyle(0x2b2f38, 1);
    g.fillCircle(20, -5, 2);
    // push handles at the back for John
    g.fillStyle(0x3a3f48, 1);
    g.fillRoundedRect(-14, -46, 4, 20, 2);
    g.fillRoundedRect(-18, -47, 8, 4, 2);

    // seat back
    g.fillStyle(0x2f3440, 1);
    g.fillRoundedRect(-12, -50, 8, 26, 3);

    // rider: lap blanket, torso, arms, head
    g.fillStyle(def.tint, 1);
    g.fillRoundedRect(-8, -48, 16, 24, 5);
    g.fillStyle(0x8f6fb5, 1);
    g.fillRoundedRect(-6, -30, 22, 8, 4); // blanket over the knees
    g.fillStyle(0xe8b48c, 1);
    g.fillRoundedRect(4, -40, 10, 4, 2); // forearm resting on the armrest
    g.fillCircle(0, -58, 8.5);

    // silver hair in a bun
    g.fillStyle(0xd8d8dc, 1);
    g.fillEllipse(0, -62.5, 18, 10);
    g.fillCircle(-7, -68, 5);

    // face
    g.fillStyle(0x2b2b33, 1);
    g.fillCircle(-2.6, -58.5, 1.3);
    g.fillCircle(3.4, -58.5, 1.3);
    g.lineStyle(1.1, 0x2b2b33, 0.75);
    g.beginPath();
    g.arc(0.4, -56, 3.2, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155));
    g.strokePath();
  }

  setPosition(x: number, y: number) {
    const dx = x - this.lastX;
    if (Math.abs(dx) > 0.4) {
      this.container.scaleX = Math.abs(this.container.scaleX) * (dx < 0 ? -1 : 1);
    }
    // roll the wheel in proportion to distance travelled
    this.wheel.rotation += dx / 13;
    this.lastX = x;
    this.container.setPosition(x, y);
  }

  update(_delta: number) {
    // motion is driven entirely by setPosition
  }

  setVisible(visible: boolean) {
    this.container.setVisible(visible);
  }

  setDepth(depth: number) {
    this.container.setDepth(depth);
  }
}
