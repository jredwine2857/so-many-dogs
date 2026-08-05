import Phaser from "phaser";
import { Appearance } from "../../../shared/gameData";

// A little vector person, drawn from primitives — no art assets. Built as a
// container of Graphics parts so the limbs can be animated independently:
// legs and arms pivot from hip/shoulder, everything else is one static body
// layer. Origin is at the character's feet.
export class CharacterSprite {
  readonly container: Phaser.GameObjects.Container;

  private leftLeg: Phaser.GameObjects.Graphics;
  private rightLeg: Phaser.GameObjects.Graphics;
  private leftArm: Phaser.GameObjects.Graphics;
  private rightArm: Phaser.GameObjects.Graphics;
  private body: Phaser.GameObjects.Graphics;

  private walkPhase = 0;
  private idlePhase = Math.random() * Math.PI * 2;
  private lastX: number;

  constructor(scene: Phaser.Scene, x: number, y: number, look: Appearance) {
    this.lastX = x;
    const scale = look.child ? 0.72 : 1;

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.22);
    shadow.fillEllipse(0, 2, 28, 9);

    const backHair = scene.add.graphics();
    this.drawBackHair(backHair, look);

    this.leftLeg = scene.add.graphics();
    this.rightLeg = scene.add.graphics();
    this.drawLeg(this.leftLeg, look);
    this.drawLeg(this.rightLeg, look);
    this.leftLeg.setPosition(-4.5, -20);
    this.rightLeg.setPosition(4.5, -20);

    this.body = scene.add.graphics();
    this.drawBody(this.body, look);

    this.leftArm = scene.add.graphics();
    this.rightArm = scene.add.graphics();
    this.drawArm(this.leftArm, look);
    this.drawArm(this.rightArm, look);
    this.leftArm.setPosition(-9.5, -41);
    this.rightArm.setPosition(9.5, -41);

    this.container = scene.add.container(x, y, [
      shadow,
      backHair,
      this.leftLeg,
      this.rightLeg,
      this.body,
      this.leftArm,
      this.rightArm,
    ]);
    this.container.setScale(scale);
  }

  private drawLeg(g: Phaser.GameObjects.Graphics, look: Appearance) {
    g.fillStyle(look.bottom, 1);
    g.fillRoundedRect(-2.6, 0, 5.2, 17, 2);
    g.fillStyle(look.shoes, 1);
    g.fillRoundedRect(-3.4, 14, 7, 6, 2);
  }

  private drawArm(g: Phaser.GameObjects.Graphics, look: Appearance) {
    g.fillStyle(look.top, 1);
    g.fillRoundedRect(-2.4, 0, 4.8, 11, 2);
    g.fillStyle(look.skin, 1);
    g.fillRoundedRect(-2.2, 10, 4.4, 9, 2);
  }

  private drawBackHair(g: Phaser.GameObjects.Graphics, look: Appearance) {
    const { hairStyle, hair } = look;
    g.fillStyle(hair, 1);
    if (hairStyle === "long") {
      g.fillEllipse(0, -49, 23, 30);
    } else if (hairStyle === "wavy") {
      g.fillEllipse(0, -49, 24, 28);
      g.fillCircle(-10, -37, 5.5);
      g.fillCircle(0, -35, 5.5);
      g.fillCircle(10, -37, 5.5);
    } else if (hairStyle === "ponytail") {
      g.fillEllipse(0, -53, 19, 18);
      g.fillEllipse(12, -46, 9, 18);
      g.fillCircle(13, -37, 4.5);
    }
  }

  private drawBody(g: Phaser.GameObjects.Graphics, look: Appearance) {
    const { skin, hair, hairStyle, top, accessory } = look;

    // torso
    g.fillStyle(top, 1);
    g.fillRoundedRect(-9.5, -43, 19, 24, 5);

    // accessories that sit on the torso
    if (accessory === "beltGi") {
      g.fillStyle(0x1b1f27, 1);
      g.fillRect(-9.5, -27, 19, 4);
    } else if (accessory === "tie") {
      g.fillStyle(0xc0392b, 1);
      g.fillTriangle(0, -41, -2.6, -35, 2.6, -35);
      g.fillTriangle(0, -35, -3, -26, 3, -26);
    } else if (accessory === "scarf") {
      g.fillStyle(0xf2f6fb, 1);
      g.fillRoundedRect(-8, -44, 16, 5, 2);
    } else if (accessory === "tutu") {
      g.fillStyle(0xffd9e8, 0.95);
      g.fillEllipse(0, -20, 32, 11);
    }

    // neck + head
    g.fillStyle(skin, 1);
    g.fillRect(-3, -46, 6, 5);
    g.fillCircle(0, -53, 9);
    g.fillCircle(-8.8, -53, 2.2);
    g.fillCircle(8.8, -53, 2.2);

    // hair cap
    g.fillStyle(hair, 1);
    if (hairStyle === "buzz") {
      g.fillEllipse(0, -57.5, 17.5, 9);
    } else if (hairStyle === "bun") {
      g.fillEllipse(0, -57.5, 18.5, 10);
      g.fillCircle(0, -65, 5.2);
    } else {
      g.fillEllipse(0, -58, 19, 11);
      if (hairStyle === "long" || hairStyle === "wavy") {
        g.fillRect(-9.5, -58, 3.4, 12);
        g.fillRect(6.1, -58, 3.4, 12);
      }
    }
    if (look.accessory === "headband") {
      g.fillStyle(0xf2f6fb, 1);
      g.fillRect(-9, -58.5, 18, 3);
    }

    // face
    g.fillStyle(0x2b2b33, 1);
    g.fillCircle(-3.2, -53.5, 1.3);
    g.fillCircle(3.2, -53.5, 1.3);
    g.lineStyle(1.2, 0x2b2b33, 0.75);
    g.beginPath();
    g.arc(0, -51, 3.6, Phaser.Math.DegToRad(25), Phaser.Math.DegToRad(155));
    g.strokePath();
  }

  setPosition(x: number, y: number) {
    // Face the direction of travel by flipping horizontally.
    if (Math.abs(x - this.lastX) > 0.4) {
      this.container.scaleX = Math.abs(this.container.scaleX) * (x < this.lastX ? -1 : 1);
      this.lastX = x;
    }
    this.container.setPosition(x, y);
  }

  update(delta: number, moving: boolean) {
    const dt = delta / 1000;
    if (moving) {
      this.walkPhase += dt * 9;
      const swing = Math.sin(this.walkPhase) * 0.5;
      this.leftLeg.rotation = swing;
      this.rightLeg.rotation = -swing;
      this.leftArm.rotation = -swing * 0.7;
      this.rightArm.rotation = swing * 0.7;
      this.body.y = -Math.abs(Math.sin(this.walkPhase)) * 1.4;
    } else {
      this.idlePhase += dt * 2.2;
      const ease = 0.82;
      this.leftLeg.rotation *= ease;
      this.rightLeg.rotation *= ease;
      this.leftArm.rotation *= ease;
      this.rightArm.rotation *= ease;
      this.body.y = Math.sin(this.idlePhase) * 0.5;
    }
  }

  setAlpha(alpha: number) {
    this.container.setAlpha(alpha);
  }

  setDepth(depth: number) {
    this.container.setDepth(depth);
  }

  destroy() {
    this.container.destroy(true);
  }
}
