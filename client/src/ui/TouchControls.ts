import Phaser from "phaser";

const DEPTH = 1500;

export interface TouchState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * On-screen controls for phones and tablets: a d-pad on the left, action
 * buttons on the right. Held directions stay pressed until released, so it
 * behaves like a keyboard rather than firing once per tap.
 */
export class TouchControls {
  readonly state: TouchState = { up: false, down: false, left: false, right: false };

  private scene: Phaser.Scene;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private onAction: (action: "work" | "feed" | "walk" | "play") => void;

  constructor(
    scene: Phaser.Scene,
    viewW: number,
    viewH: number,
    onAction: (action: "work" | "feed" | "walk" | "play") => void
  ) {
    this.scene = scene;
    this.onAction = onAction;
    this.build(viewW, viewH);
  }

  private padButton(x: number, y: number, size: number, label: string, dir: keyof TouchState) {
    const btn = this.scene.add
      .rectangle(x, y, size, size, 0x16263a, 0.72)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setStrokeStyle(2, 0x5b9bff, 0.9)
      .setInteractive({ useHandCursor: true });

    const text = this.scene.add
      .text(x, y, label, { fontFamily: "system-ui, sans-serif", fontSize: "24px", color: "#cfe0ff" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    const press = () => {
      this.state[dir] = true;
      btn.setFillStyle(0x2f6fd0, 0.85);
    };
    const release = () => {
      this.state[dir] = false;
      btn.setFillStyle(0x16263a, 0.72);
    };

    btn.on("pointerdown", press);
    btn.on("pointerup", release);
    // Releasing outside the button, or dragging off it, must not leave the
    // character walking forever.
    btn.on("pointerout", release);
    btn.on("pointerupoutside", release);

    this.objects.push(btn, text);
  }

  private actionButton(x: number, y: number, w: number, h: number, label: string, action: "work" | "feed" | "walk" | "play", color: number) {
    const btn = this.scene.add
      .rectangle(x, y, w, h, 0x16263a, 0.72)
      .setScrollFactor(0)
      .setDepth(DEPTH)
      .setStrokeStyle(2, color, 0.9)
      .setInteractive({ useHandCursor: true });

    const text = this.scene.add
      .text(x, y, label, { fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH + 1);

    btn.on("pointerdown", () => {
      btn.setFillStyle(color, 0.6);
      this.onAction(action);
    });
    const reset = () => btn.setFillStyle(0x16263a, 0.72);
    btn.on("pointerup", reset);
    btn.on("pointerout", reset);

    this.objects.push(btn, text);
  }

  private build(viewW: number, viewH: number) {
    // d-pad, bottom left
    const s = 56;
    const cx = 86;
    const cy = viewH - 96;
    this.padButton(cx, cy - s, s, "▲", "up");
    this.padButton(cx, cy + s, s, "▼", "down");
    this.padButton(cx - s, cy, s, "◀", "left");
    this.padButton(cx + s, cy, s, "▶", "right");

    // actions, bottom right
    const bw = 92;
    const bh = 44;
    const rx = viewW - 62;
    this.actionButton(rx, viewH - 168, bw, bh, "WORK", "work", 0x5b9bff);
    this.actionButton(rx, viewH - 118, bw, bh, "FEED", "feed", 0xd98c3f);
    this.actionButton(rx, viewH - 68, bw, bh, "WALK", "walk", 0x4fa3d9);
    this.actionButton(rx, viewH - 18, bw, bh, "PLAY", "play", 0xd94f8c);
  }

  setVisible(visible: boolean) {
    this.objects.forEach((o) => (o as any).setVisible(visible));
    if (!visible) {
      this.state.up = this.state.down = this.state.left = this.state.right = false;
    }
  }

  destroy() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }
}
