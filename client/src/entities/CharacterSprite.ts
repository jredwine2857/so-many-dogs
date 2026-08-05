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
  private traitAnim: string | null = null;
  private traitPhase = 0;

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
    } else if (accessory === "apron") {
      g.fillStyle(0xf2ede2, 1);
      g.fillRoundedRect(-7.5, -36, 15, 20, 2);
      g.fillRect(-6, -41, 12, 5);
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
    } else if (look.accessory === "cap") {
      g.fillStyle(look.top, 1);
      g.fillEllipse(0, -59, 19.5, 10);
      g.fillRoundedRect(2, -60.5, 13, 3.5, 1.5); // brim
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

  /**
   * Play a trait animation instead of the walk/idle cycle. Pass null to go
   * back to normal. Anything unrecognised falls back to idle rather than
   * freezing the character mid-pose.
   */
  setTraitAnimation(trait: string | null) {
    if (trait === this.traitAnim) return;
    this.traitAnim = trait;
    this.traitPhase = 0;
    if (trait === null) this.resetPose();
  }

  private resetPose() {
    this.container.rotation = 0;
    this.body.setPosition(0, 0);
    this.body.rotation = 0;
    [this.leftLeg, this.rightLeg].forEach((l, i) => {
      l.rotation = 0;
      l.setPosition(i === 0 ? -4.5 : 4.5, -20);
    });
    [this.leftArm, this.rightArm].forEach((a, i) => {
      a.rotation = 0;
      a.setPosition(i === 0 ? -9.5 : 9.5, -41);
    });
  }

  update(delta: number, moving: boolean) {
    const dt = delta / 1000;

    if (this.traitAnim) {
      this.traitPhase += dt;
      this.animateTrait(this.traitAnim, this.traitPhase);
      return;
    }

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

  // One case per trait. Each drives the same five parts — body, two legs,
  // two arms — plus the container's own rotation for whole-body tilts.
  private animateTrait(trait: string, p: number) {
    const L = this.leftLeg;
    const R = this.rightLeg;
    const LA = this.leftArm;
    const RA = this.rightArm;
    const B = this.body;

    switch (trait) {
      case "sleeping": {
        // Tipped over on their side, breathing slowly.
        const breathe = Math.sin(p * 1.6) * 0.8;
        this.container.rotation = -Math.PI / 2.1;
        B.setPosition(breathe, 0);
        L.rotation = 0.35;
        R.rotation = 0.2;
        LA.rotation = -0.5;
        RA.rotation = 0.3;
        break;
      }
      case "busy working out": {
        // Squats: drop the body, bend the legs, arms held out front.
        const squat = (Math.sin(p * 3.4) + 1) / 2; // 0..1
        B.setPosition(0, squat * 9);
        L.setPosition(-4.5, -20 + squat * 9);
        R.setPosition(4.5, -20 + squat * 9);
        L.rotation = squat * 0.5;
        R.rotation = -squat * 0.5;
        LA.setPosition(-9.5, -41 + squat * 9);
        RA.setPosition(9.5, -41 + squat * 9);
        LA.rotation = -1.5;
        RA.rotation = 1.5;
        break;
      }
      case "chewing really loud": {
        // Jaw working away — quick vertical head-bob, body mostly still.
        B.setPosition(0, Math.abs(Math.sin(p * 7)) * 1.6);
        this.container.rotation = Math.sin(p * 7) * 0.03;
        LA.rotation = -0.25;
        RA.rotation = 0.25;
        break;
      }
      case "yelling":
      case "yelling at anyone who is nearby": {
        // Leaning in, arms flung out, jabbing forward on each shout.
        const shout = Math.max(0, Math.sin(p * 3.2));
        this.container.rotation = 0.12 + shout * 0.09;
        B.setPosition(shout * 2.5, -shout * 1.5);
        LA.rotation = -2.1 - shout * 0.5;
        RA.rotation = 2.1 + shout * 0.5;
        L.rotation = 0.18;
        R.rotation = -0.28;
        break;
      }
      case "sucking on her toe": {
        // Crouched right down with one leg hauled up.
        B.setPosition(0, 14);
        this.container.rotation = 0.2;
        L.setPosition(-4.5, -8);
        L.rotation = -2.4;
        R.setPosition(4.5, -8);
        R.rotation = 0.5;
        LA.setPosition(-9.5, -28);
        LA.rotation = -2.6 + Math.sin(p * 4) * 0.08;
        RA.setPosition(9.5, -28);
        RA.rotation = 2.4;
        break;
      }
      case "making TikTok videos": {
        // One arm up holding the phone, hips swaying to the beat.
        const sway = Math.sin(p * 3.6);
        this.container.rotation = sway * 0.1;
        B.setPosition(sway * 1.5, 0);
        RA.rotation = 2.9;
        LA.rotation = -0.6 + sway * 0.4;
        L.rotation = sway * 0.2;
        R.rotation = -sway * 0.2;
        break;
      }
      case "singing": {
        // Chest out, arms opening wide, swaying on the long notes.
        const sway = Math.sin(p * 1.9);
        this.container.rotation = sway * 0.07 - 0.05;
        B.setPosition(0, -Math.abs(Math.sin(p * 1.9)) * 1.2);
        LA.rotation = -1.9 - Math.abs(sway) * 0.5;
        RA.rotation = 1.9 + Math.abs(sway) * 0.5;
        break;
      }
      case "begging for ice cream": {
        // Bouncing on the spot with both arms up, pleading.
        const hop = Math.max(0, Math.sin(p * 5.5));
        B.setPosition(0, -hop * 5);
        L.setPosition(-4.5, -20 - hop * 5);
        R.setPosition(4.5, -20 - hop * 5);
        L.rotation = -hop * 0.3;
        R.rotation = hop * 0.3;
        LA.setPosition(-9.5, -41 - hop * 5);
        RA.setPosition(9.5, -41 - hop * 5);
        LA.rotation = -2.7;
        RA.rotation = 2.7;
        break;
      }
      case "playing video games": {
        // Hunched forward, elbows in, thumbs going.
        this.container.rotation = 0.16;
        B.setPosition(0, 5);
        L.setPosition(-4.5, -15);
        R.setPosition(4.5, -15);
        L.rotation = -1.4;
        R.rotation = -1.4;
        LA.setPosition(-7, -36);
        RA.setPosition(7, -36);
        LA.rotation = -1.3 + Math.sin(p * 14) * 0.12;
        RA.rotation = 1.3 - Math.sin(p * 14) * 0.12;
        break;
      }
      case "getting drunk": {
        // Big slow wobble, arms loose, never quite steady.
        const wobble = Math.sin(p * 1.7) + Math.sin(p * 2.6) * 0.4;
        this.container.rotation = wobble * 0.22;
        B.setPosition(wobble * 2.5, 0);
        LA.rotation = -0.7 + wobble * 0.5;
        RA.rotation = 0.7 + wobble * 0.5;
        L.rotation = wobble * 0.2;
        R.rotation = -wobble * 0.15;
        break;
      }
      case "working at the Dairy Bar": {
        // Scooping: lean over, one arm digging in circles.
        const scoop = p * 4;
        this.container.rotation = 0.14;
        B.setPosition(0, 2);
        RA.rotation = 1.6 + Math.sin(scoop) * 0.7;
        RA.setPosition(9.5 + Math.cos(scoop) * 2, -38);
        LA.rotation = -0.9;
        break;
      }
      case "cooking food": {
        // Stirring a pot: one arm circling, the other steadying it.
        const stir = p * 5;
        this.container.rotation = 0.08;
        B.setPosition(0, 1);
        RA.rotation = 1.5 + Math.sin(stir) * 0.45;
        RA.setPosition(9.5 + Math.cos(stir) * 2.5, -38 + Math.sin(stir) * 1.5);
        LA.rotation = -1.35;
        break;
      }
      case "scolding people": {
        // Finger wagging, leaning in — full teacher energy.
        const wag = Math.sin(p * 8);
        this.container.rotation = 0.14;
        B.setPosition(1.5, 0);
        RA.rotation = 2.6 + wag * 0.25;
        LA.rotation = -0.5;
        L.rotation = 0.15;
        R.rotation = -0.2;
        break;
      }
      case "turning into a monkey and eating bananas": {
        // Hunched monkey bounce, arms swinging low and wide.
        const hop = Math.abs(Math.sin(p * 4.2));
        const swing = Math.sin(p * 4.2);
        this.container.rotation = 0.22 + swing * 0.06;
        B.setPosition(0, 6 - hop * 4);
        L.setPosition(-4.5, -16 - hop * 4);
        R.setPosition(4.5, -16 - hop * 4);
        L.rotation = -0.55 + swing * 0.2;
        R.rotation = -0.55 - swing * 0.2;
        LA.setPosition(-10.5, -38 - hop * 4);
        RA.setPosition(10.5, -38 - hop * 4);
        LA.rotation = -2.4 + swing * 0.6;
        RA.rotation = 2.4 + swing * 0.6;
        break;
      }
      case "asking Hey a bunch": {
        // Waving to get your attention, over and over.
        const wave = Math.sin(p * 6.5);
        this.container.rotation = wave * 0.05;
        B.setPosition(0, Math.abs(wave) * -1);
        RA.rotation = 2.75 + wave * 0.35;
        LA.rotation = -0.4;
        break;
      }
      default: {
        // Unknown trait: gentle idle rather than a frozen T-pose.
        this.idlePhase += 0.02;
        B.setPosition(0, Math.sin(this.idlePhase) * 0.5);
      }
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
