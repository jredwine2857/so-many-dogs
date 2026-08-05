import Phaser from "phaser";
import { PetDef } from "../../../shared/gameData";

const SIZE_SCALE = { small: 0.72, medium: 0.92, large: 1.18 } as const;

// A little vector animal, parameterized by species/coat/size so every pet
// reads as a visibly different creature. Origin is at the animal's feet.
export class PetSprite {
  readonly container: Phaser.GameObjects.Container;
  private tail: Phaser.GameObjects.Graphics;
  private body: Phaser.GameObjects.Graphics;
  private wagPhase = Math.random() * Math.PI * 2;
  private species: PetDef["species"];

  constructor(scene: Phaser.Scene, x: number, y: number, pet: PetDef) {
    this.species = pet.species;

    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.2);
    shadow.fillEllipse(0, 1, pet.species === "guineaPig" ? 26 : 34, 9);

    this.tail = scene.add.graphics();
    this.drawTail(this.tail, pet);
    this.tail.setPosition(-13, pet.species === "cat" ? -18 : -13);

    this.body = scene.add.graphics();
    if (pet.species === "cat") this.drawCat(this.body, pet);
    else if (pet.species === "guineaPig") this.drawGuineaPig(this.body, pet);
    else this.drawDog(this.body, pet);

    this.container = scene.add.container(x, y, [shadow, this.tail, this.body]);
    this.container.setScale(SIZE_SCALE[pet.size]);
  }

  private drawTail(g: Phaser.GameObjects.Graphics, pet: PetDef) {
    if (pet.species === "guineaPig") return; // guinea pigs have no visible tail
    g.fillStyle(pet.coat, 1);
    if (pet.species === "cat") {
      // long, upright, slightly tapered
      g.fillRoundedRect(-2, -18, 4.5, 20, 2.2);
      g.fillCircle(0, -18, 2.6);
    } else {
      g.fillRoundedRect(0, -3, 12, 5, 2.5);
    }
  }

  private drawDog(g: Phaser.GameObjects.Graphics, pet: PetDef) {
    const { coat, fluffy, floppyEars } = pet;
    const dark = Phaser.Display.Color.ValueToColor(coat).darken(18).color;

    g.fillStyle(dark, 1);
    [-11, -4, 4, 10].forEach((lx) => g.fillRoundedRect(lx, -9, 4.5, 9, 2));

    g.fillStyle(coat, 1);
    g.fillEllipse(0, -16, 30, 16);
    if (fluffy) {
      g.fillCircle(-10, -18, 7);
      g.fillCircle(0, -20, 7.5);
      g.fillCircle(10, -18, 7);
    }

    g.fillCircle(14, -25, 9);
    g.fillStyle(dark, 1);
    if (floppyEars) {
      g.fillEllipse(10, -25, 6, 13);
      g.fillEllipse(19, -25, 6, 13);
    } else {
      g.fillTriangle(9, -31, 12, -38, 15, -30);
      g.fillTriangle(17, -30, 20, -38, 23, -31);
    }

    g.fillStyle(coat, 1);
    g.fillEllipse(20, -22, 10, 7);
    g.fillStyle(0x2b2b33, 1);
    g.fillCircle(24, -23, 1.8);
    g.fillCircle(13, -27, 1.4);
    g.fillCircle(18, -27, 1.4);
  }

  private drawCat(g: Phaser.GameObjects.Graphics, pet: PetDef) {
    const { coat, fluffy } = pet;
    const dark = Phaser.Display.Color.ValueToColor(coat).darken(20).color;

    // dainty legs
    g.fillStyle(dark, 1);
    [-10, -3, 4, 10].forEach((lx) => g.fillRoundedRect(lx, -8, 3.6, 8, 1.8));

    // lower, sleeker body than a dog
    g.fillStyle(coat, 1);
    g.fillEllipse(0, -14, 28, 13);
    if (fluffy) {
      g.fillCircle(-8, -16, 6);
      g.fillCircle(2, -17, 6.5);
    }

    // head with tall pointed ears
    g.fillCircle(14, -23, 8);
    g.fillTriangle(8, -28, 9.5, -38, 16, -29);
    g.fillTriangle(15, -29, 21.5, -38, 22, -28);
    g.fillStyle(0xf2b8c6, 1);
    g.fillTriangle(10.5, -29, 11.5, -35, 15, -29.5);
    g.fillTriangle(16.5, -29.5, 20, -35, 20.5, -29);

    // face: slit eyes, small muzzle, whiskers
    g.fillStyle(0x2b2b33, 1);
    g.fillEllipse(11.5, -25, 2.4, 3.4);
    g.fillEllipse(17.5, -25, 2.4, 3.4);
    g.fillStyle(0xf2b8c6, 1);
    g.fillTriangle(14.5, -20.5, 13.2, -22.2, 15.8, -22.2);
    g.lineStyle(0.9, 0xf2f6fb, 0.85);
    g.lineBetween(16, -21, 26, -23);
    g.lineBetween(16, -20, 26, -19);
    g.lineBetween(13, -21, 4, -23);
    g.lineBetween(13, -20, 4, -19);
  }

  private drawGuineaPig(g: Phaser.GameObjects.Graphics, pet: PetDef) {
    const { coat, fluffy } = pet;
    const dark = Phaser.Display.Color.ValueToColor(coat).darken(22).color;
    const patch = Phaser.Display.Color.ValueToColor(coat).lighten(38).color;

    // stubby feet
    g.fillStyle(dark, 1);
    [-8, -2, 5, 9].forEach((lx) => g.fillRoundedRect(lx, -5, 3.4, 5, 1.6));

    // one continuous loaf — no neck
    g.fillStyle(coat, 1);
    g.fillEllipse(2, -12, 32, 18);
    g.fillStyle(patch, 1);
    g.fillEllipse(-6, -13, 13, 13);
    if (fluffy) {
      g.fillStyle(coat, 1);
      g.fillCircle(-11, -14, 5.5);
      g.fillCircle(-2, -18, 5.5);
      g.fillCircle(7, -17, 5);
    }

    // blunt face with tiny round ears
    g.fillStyle(coat, 1);
    g.fillEllipse(15, -14, 15, 14);
    g.fillStyle(dark, 1);
    g.fillEllipse(12, -21, 6, 5);
    g.fillEllipse(19, -21, 6, 5);
    g.fillStyle(0x2b2b33, 1);
    g.fillCircle(14, -16, 1.7);
    g.fillCircle(20, -16, 1.7);
    g.fillStyle(0xd98c9c, 1);
    g.fillEllipse(21.5, -11.5, 3.4, 2.6);
  }

  update(delta: number) {
    this.wagPhase += (delta / 1000) * (this.species === "dog" ? 7 : 3);
    if (this.species === "guineaPig") {
      // no tail to wag — just a small breathing bob
      this.body.y = Math.sin(this.wagPhase) * 0.5;
      return;
    }
    // cats sway their tail slowly, dogs wag fast
    this.tail.rotation = Math.sin(this.wagPhase) * (this.species === "cat" ? 0.25 : 0.55);
    this.body.y = Math.sin(this.wagPhase * 0.35) * 0.6;
  }

  setAlpha(alpha: number) {
    this.container.setAlpha(alpha);
  }

  setDepth(depth: number) {
    this.container.setDepth(depth);
  }
}
