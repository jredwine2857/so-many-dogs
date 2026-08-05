import Phaser from "phaser";
import { CHARACTERS } from "../../../shared/gameData";
import { CharacterSlot, JobSite, STREET, WORLD } from "../../../shared/world";

const DEPTH_GROUND = -20;
const DEPTH_DECOR = -10;
const DEPTH_BUILDING = 10;

function label(scene: Phaser.Scene, x: number, y: number, text: string, size: number, color: string, bold = false) {
  return scene.add
    .text(x, y, text, {
      fontFamily: "system-ui, sans-serif",
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? "bold" : "normal",
    })
    .setOrigin(0.5, 0.5)
    .setDepth(DEPTH_BUILDING + 1);
}

function tree(g: Phaser.GameObjects.Graphics, x: number, y: number, scale = 1) {
  g.fillStyle(0x000000, 0.16);
  g.fillEllipse(x, y + 2, 34 * scale, 10 * scale);
  g.fillStyle(0x6b4a2f, 1);
  g.fillRect(x - 4 * scale, y - 26 * scale, 8 * scale, 26 * scale);
  g.fillStyle(0x3f7d42, 1);
  g.fillCircle(x - 11 * scale, y - 32 * scale, 14 * scale);
  g.fillCircle(x + 11 * scale, y - 32 * scale, 14 * scale);
  g.fillCircle(x, y - 44 * scale, 16 * scale);
  g.fillStyle(0x4d9450, 1);
  g.fillCircle(x - 4 * scale, y - 42 * scale, 10 * scale);
}

export function drawTerrain(scene: Phaser.Scene) {
  const g = scene.add.graphics().setDepth(DEPTH_GROUND);

  // grass
  g.fillStyle(0x5c9e54, 1);
  g.fillRect(0, 0, WORLD.width, WORLD.height);
  g.fillStyle(0x69a95f, 1);
  for (let i = 0; i < 90; i++) {
    const x = (i * 197) % WORLD.width;
    const y = (i * 331) % WORLD.height;
    g.fillEllipse(x, y, 90, 40);
  }

  // sidewalks + street
  g.fillStyle(0xcfd3d8, 1);
  g.fillRect(0, STREET.y - 16, WORLD.width, STREET.height + 32);
  g.fillStyle(0x4a4f57, 1);
  g.fillRect(0, STREET.y, WORLD.width, STREET.height);

  // lane markings
  g.fillStyle(0xe8e2c8, 0.85);
  for (let x = 20; x < WORLD.width; x += 90) {
    g.fillRect(x, STREET.y + STREET.height / 2 - 3, 48, 6);
  }

  // crosswalks
  g.fillStyle(0xe8e8ea, 0.9);
  [520, 1180, 1840].forEach((cx) => {
    for (let i = 0; i < 7; i++) {
      g.fillRect(cx + i * 14, STREET.y + 8, 8, STREET.height - 16);
    }
  });

  const decor = scene.add.graphics().setDepth(DEPTH_DECOR);

  // park east of the residential blocks, with a pond
  decor.fillStyle(0x4d8f4a, 1);
  decor.fillRoundedRect(1940, 790, 800, 640, 18);
  decor.fillStyle(0x3f7fbf, 1);
  decor.fillEllipse(2300, 1060, 260, 160);
  decor.fillStyle(0x5aa0d6, 1);
  decor.fillEllipse(2300, 1056, 238, 142);
  [
    [2010, 860], [2130, 830], [2560, 870], [2680, 1150], [2020, 1180],
    [2150, 1330], [2450, 1370], [2700, 900],
  ].forEach(([x, y]) => tree(decor, x, y));

  // street trees along the sidewalks
  for (let x = 120; x < WORLD.width - 100; x += 260) {
    tree(decor, x, STREET.y - 22, 0.72);
    tree(decor, x + 130, STREET.y + STREET.height + 22, 0.72);
  }
}

export function drawBuilding(scene: Phaser.Scene, site: JobSite) {
  const g = scene.add.graphics().setDepth(DEPTH_BUILDING);
  const { x, y, width: w, height: h } = site.rect;
  const cx = x + w / 2;
  const bodyY = y + 44;
  const bodyH = h - 44;

  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(x + 6, y + h - 14, w, 18, 8);

  switch (site.style) {
    case "office": {
      g.fillStyle(0x2c4a6e, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 5);
      g.fillStyle(0x1f3550, 1);
      g.fillRect(x - 6, bodyY - 14, w + 12, 16);
      g.fillStyle(0x6fc3e8, 0.9);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 6; c++) {
          g.fillRect(x + 18 + c * 43, bodyY + 18 + r * 34, 30, 22);
        }
      }
      g.fillStyle(0x9aa6b5, 1);
      g.fillRect(cx - 3, y + 6, 6, 26);
      g.fillCircle(cx, y + 6, 5);
      break;
    }
    case "hospital": {
      g.fillStyle(0xeef3f8, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 5);
      g.fillStyle(0xd8e0ea, 1);
      g.fillRect(x - 6, bodyY - 14, w + 12, 16);
      g.fillStyle(0x7fb3e0, 0.9);
      for (let c = 0; c < 6; c++) {
        g.fillRect(x + 18 + c * 43, bodyY + 22, 30, 26);
        g.fillRect(x + 18 + c * 43, bodyY + 62, 30, 26);
      }
      g.fillStyle(0xd94f4f, 1);
      g.fillRect(cx - 8, y + 6, 16, 32);
      g.fillRect(cx - 16, y + 14, 32, 16);
      g.fillStyle(0xb9c6d4, 1);
      g.fillRect(cx - 46, y + h - 44, 92, 44);
      break;
    }
    case "church": {
      g.fillStyle(0xd9cbb0, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 4);
      g.fillStyle(0x8a5f45, 1);
      g.fillTriangle(x - 8, bodyY + 4, cx, y - 4, x + w + 8, bodyY + 4);
      g.fillStyle(0xd9cbb0, 1);
      g.fillRect(cx - 22, y - 40, 44, 60);
      g.fillStyle(0x8a5f45, 1);
      g.fillTriangle(cx - 26, y - 38, cx, y - 74, cx + 26, y - 38);
      g.fillStyle(0xe8d98a, 1);
      g.fillRect(cx - 3, y - 100, 6, 28);
      g.fillRect(cx - 12, y - 92, 24, 6);
      g.fillStyle(0x6b8fd4, 0.95);
      [-80, 0, 80].forEach((off) => {
        g.fillRoundedRect(cx + off - 16, bodyY + 40, 32, 46, 16);
      });
      break;
    }
    case "realty": {
      g.fillStyle(0xb5654a, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 4);
      g.fillStyle(0x8f4a35, 1);
      g.fillRect(x - 8, bodyY - 16, w + 16, 18);
      g.fillStyle(0xf2e6d8, 0.95);
      for (let c = 0; c < 4; c++) g.fillRect(x + 26 + c * 62, bodyY + 26, 40, 34);
      g.fillStyle(0x2f3b4a, 1);
      g.fillRect(cx - 26, y + h - 52, 52, 52);
      // for-sale sign in the yard
      g.fillStyle(0xf2f6fb, 1);
      g.fillRect(x + 18, y + h - 58, 54, 34);
      g.fillStyle(0x8a8f98, 1);
      g.fillRect(x + 42, y + h - 26, 5, 26);
      break;
    }
    case "boutique": {
      g.fillStyle(0xf6d9e4, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 5);
      for (let i = 0; i < 8; i++) {
        g.fillStyle(i % 2 === 0 ? 0xd94f8c : 0xfdf3f7, 1);
        g.fillRect(x + i * (w / 8), bodyY - 4, w / 8, 22);
      }
      g.fillStyle(0xbfe0f0, 0.95);
      g.fillRoundedRect(x + 22, bodyY + 40, 110, 78, 4);
      g.fillRoundedRect(x + 158, bodyY + 40, 110, 78, 4);
      // dress form in the window
      g.fillStyle(0xd94f8c, 1);
      g.fillTriangle(x + 77, bodyY + 62, x + 60, bodyY + 116, x + 94, bodyY + 116);
      g.fillCircle(x + 77, bodyY + 56, 7);
      break;
    }
    case "pharma": {
      g.fillStyle(0xeaf4ee, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 5);
      g.fillStyle(0x2f8f5b, 1);
      g.fillRect(x - 6, bodyY - 16, w + 12, 18);
      g.fillStyle(0x2f8f5b, 1);
      g.fillRect(cx - 7, y + 4, 14, 34);
      g.fillRect(cx - 17, y + 14, 34, 14);
      g.fillStyle(0x9fd4c0, 0.9);
      for (let c = 0; c < 5; c++) g.fillRect(x + 22 + c * 52, bodyY + 30, 38, 30);
      // capsule sign
      g.fillStyle(0xd94f6b, 1);
      g.fillRoundedRect(cx - 34, bodyY + 84, 34, 20, 10);
      g.fillStyle(0xf2f6fb, 1);
      g.fillRoundedRect(cx, bodyY + 84, 34, 20, 10);
      break;
    }
    case "salon": {
      g.fillStyle(0xf7c9dd, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 5);
      g.fillStyle(0xe8a8c6, 1);
      g.fillRect(x - 6, bodyY - 14, w + 12, 16);
      // vanity bulbs
      g.fillStyle(0xfff3b0, 1);
      for (let c = 0; c < 9; c++) g.fillCircle(x + 20 + c * 31, bodyY + 14, 5);
      g.fillStyle(0xdff0f7, 0.95);
      g.fillRoundedRect(x + 30, bodyY + 36, 96, 76, 6);
      g.fillRoundedRect(x + 164, bodyY + 36, 96, 76, 6);
      // lipstick
      g.fillStyle(0x8a3a55, 1);
      g.fillRect(cx - 8, bodyY + 120, 16, 26);
      g.fillStyle(0xd94f6b, 1);
      g.fillRect(cx - 6, bodyY + 106, 12, 16);
      break;
    }
    case "concert": {
      g.fillStyle(0x4a2f45, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 5);
      g.fillStyle(0x352130, 1);
      g.fillRect(x - 10, bodyY - 20, w + 20, 22);
      // marquee bulbs
      g.fillStyle(0xffd75e, 1);
      for (let c = 0; c < 11; c++) g.fillCircle(x + 16 + c * 26, bodyY - 9, 4.5);
      // columns
      g.fillStyle(0xd9cbb0, 1);
      [0, 1, 2, 3].forEach((i) => g.fillRect(x + 24 + i * 78, bodyY + 34, 18, 90));
      // piano key band
      g.fillStyle(0xf2f6fb, 1);
      g.fillRect(x + 10, y + h - 26, w - 20, 22);
      g.fillStyle(0x1b1620, 1);
      for (let c = 0; c < 16; c++) g.fillRect(x + 20 + c * 17, y + h - 26, 7, 14);
      break;
    }
    case "dojo": {
      g.fillStyle(0xe8dcc4, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 4);
      // tiered tile roof
      g.fillStyle(0x8a3a35, 1);
      g.fillTriangle(x - 18, bodyY + 6, cx, y - 6, x + w + 18, bodyY + 6);
      g.fillStyle(0xa8494a, 1);
      g.fillRect(x - 12, bodyY + 2, w + 24, 12);
      // shoji panels
      g.fillStyle(0xf7f1e0, 1);
      for (let c = 0; c < 4; c++) g.fillRect(x + 26 + c * 62, bodyY + 40, 46, 62);
      g.lineStyle(2, 0x6b4a2f, 1);
      for (let c = 0; c < 4; c++) {
        g.strokeRect(x + 26 + c * 62, bodyY + 40, 46, 62);
        g.lineBetween(x + 26 + c * 62, bodyY + 71, x + 72 + c * 62, bodyY + 71);
      }
      // red banner
      g.fillStyle(0xc0392b, 1);
      g.fillRect(cx - 12, bodyY + 8, 24, 64);
      break;
    }
    case "bank": {
      g.fillStyle(0xdfd9c8, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 4);
      // pediment on columns
      g.fillStyle(0xc9c2ae, 1);
      g.fillTriangle(x - 10, bodyY + 6, cx, y - 8, x + w + 10, bodyY + 6);
      g.fillStyle(0xf2eddf, 1);
      [0, 1, 2, 3, 4].forEach((i) => g.fillRect(x + 24 + i * 58, bodyY + 22, 20, 96));
      // vault door
      g.fillStyle(0x6b7280, 1);
      g.fillCircle(cx, y + h - 34, 26);
      g.fillStyle(0x9aa3af, 1);
      g.fillCircle(cx, y + h - 34, 18);
      g.fillStyle(0x4b5563, 1);
      g.fillCircle(cx, y + h - 34, 5);
      // gold coins stacked out front
      g.fillStyle(0xe8c14a, 1);
      [0, 1, 2].forEach((i) => g.fillEllipse(x + 40, y + h - 12 - i * 6, 22, 8));
      break;
    }
    case "workshop": {
      g.fillStyle(0xb8bec7, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 4);
      // corrugated roof
      g.fillStyle(0x7b838f, 1);
      g.fillRect(x - 10, bodyY - 14, w + 20, 18);
      g.fillStyle(0x69707a, 1);
      for (let c = 0; c < 18; c++) g.fillRect(x - 8 + c * 17, bodyY - 14, 7, 18);
      // roll-up bay door
      g.fillStyle(0x8a9099, 1);
      g.fillRect(cx - 62, y + h - 82, 124, 82);
      g.fillStyle(0x6f757e, 1);
      for (let r = 0; r < 7; r++) g.fillRect(cx - 62, y + h - 80 + r * 11, 124, 5);
      // tools on the wall
      g.fillStyle(0x3f4654, 1);
      g.fillRect(x + 22, bodyY + 30, 6, 44);
      g.fillRect(x + 18, bodyY + 26, 14, 8);
      g.fillStyle(0xd98c3f, 1);
      g.fillRect(x + w - 44, bodyY + 30, 7, 46);
      g.fillStyle(0x3f4654, 1);
      g.fillTriangle(x + w - 52, bodyY + 30, x + w - 30, bodyY + 30, x + w - 41, bodyY + 18);
      break;
    }
    case "machineyard": {
      // open gravel lot rather than a building
      g.fillStyle(0x9a9285, 1);
      g.fillRoundedRect(x, bodyY - 10, w, bodyH + 10, 4);
      g.fillStyle(0x8b8377, 1);
      for (let i = 0; i < 24; i++) {
        g.fillCircle(x + 18 + ((i * 79) % (w - 36)), bodyY + 14 + ((i * 53) % (bodyH - 30)), 4);
      }
      // chain-link fence
      g.lineStyle(2, 0x6f757e, 1);
      g.strokeRoundedRect(x, bodyY - 10, w, bodyH + 10, 4);
      // dirt pile
      g.fillStyle(0x7a5c3e, 1);
      g.fillTriangle(x + 18, y + h - 8, x + 76, y + h - 62, x + 134, y + h - 8);
      // excavator: tracks, cab, boom
      g.fillStyle(0x33383f, 1);
      g.fillRoundedRect(cx + 4, y + h - 46, 96, 20, 8);
      g.fillStyle(0xe8b13f, 1);
      g.fillRoundedRect(cx + 20, y + h - 84, 58, 40, 5);
      g.fillStyle(0x2b3a4a, 1);
      g.fillRect(cx + 30, y + h - 76, 24, 20);
      g.fillStyle(0xe8b13f, 1);
      g.fillTriangle(cx + 74, y + h - 78, cx + 132, y + h - 116, cx + 124, y + h - 104);
      g.fillTriangle(cx + 124, y + h - 106, cx + 132, y + h - 116, cx + 140, y + h - 74);
      g.fillStyle(0x9aa3af, 1);
      g.fillTriangle(cx + 128, y + h - 80, cx + 152, y + h - 78, cx + 136, y + h - 58);
      break;
    }
    case "school": {
      g.fillStyle(0xc9563f, 1); // red brick schoolhouse
      g.fillRoundedRect(x, bodyY, w, bodyH, 4);
      g.fillStyle(0x8f3a2b, 1);
      g.fillTriangle(x - 12, bodyY + 4, cx, y - 10, x + w + 12, bodyY + 4);
      // bell tower
      g.fillStyle(0xe8dcc4, 1);
      g.fillRect(cx - 16, y - 46, 32, 42);
      g.fillStyle(0x8f3a2b, 1);
      g.fillTriangle(cx - 20, y - 44, cx, y - 74, cx + 20, y - 44);
      g.fillStyle(0xe8c14a, 1);
      g.fillCircle(cx, y - 26, 7);
      // classroom windows
      g.fillStyle(0xbfe0f0, 0.95);
      for (let c = 0; c < 5; c++) {
        g.fillRect(x + 22 + c * 52, bodyY + 34, 36, 30);
        g.fillRect(x + 22 + c * 52, bodyY + 76, 36, 30);
      }
      // flagpole
      g.fillStyle(0x9aa6b5, 1);
      g.fillRect(x + 16, y + h - 84, 4, 84);
      g.fillStyle(0x3b6fd4, 1);
      g.fillRect(x + 20, y + h - 84, 26, 16);
      break;
    }
    case "ballpark": {
      // open diamond rather than a building
      g.fillStyle(0x5c9e54, 1);
      g.fillRoundedRect(x, bodyY - 10, w, bodyH + 10, 6);
      // infield dirt
      g.fillStyle(0xb5875a, 1);
      g.fillTriangle(cx, y + h - 22, cx - 92, y + h - 96, cx + 92, y + h - 96);
      g.fillStyle(0x5c9e54, 1);
      g.fillTriangle(cx, y + h - 40, cx - 62, y + h - 92, cx + 62, y + h - 92);
      // bases + mound
      g.fillStyle(0xf2f6fb, 1);
      g.fillRect(cx - 4, y + h - 28, 8, 8);
      g.fillRect(cx - 96, y + h - 100, 8, 8);
      g.fillRect(cx + 88, y + h - 100, 8, 8);
      g.fillCircle(cx, y + h - 70, 7);
      // backstop fence
      g.lineStyle(2, 0x9aa6b5, 0.9);
      for (let i = 0; i <= 8; i++) g.lineBetween(cx - 60 + i * 15, y + h - 8, cx - 60 + i * 15, y + h - 40);
      g.lineBetween(cx - 60, y + h - 40, cx + 60, y + h - 40);
      // bleachers
      g.fillStyle(0x8a8f98, 1);
      for (let r = 0; r < 3; r++) g.fillRect(x + 14, bodyY + 16 + r * 12, 92, 8);
      break;
    }
    case "dairybar": {
      // little roadside ice cream stand
      g.fillStyle(0xf7f2e4, 1);
      g.fillRoundedRect(x + 30, bodyY + 24, w - 60, bodyH - 24, 5);
      for (let i = 0; i < 7; i++) {
        g.fillStyle(i % 2 === 0 ? 0xd94f6b : 0xfdf3f7, 1);
        g.fillRect(x + 30 + i * ((w - 60) / 7), bodyY + 12, (w - 60) / 7, 20);
      }
      // service window + counter
      g.fillStyle(0x8fd0e0, 0.95);
      g.fillRoundedRect(x + 60, bodyY + 52, w - 120, 54, 4);
      g.fillStyle(0xc9a227, 1);
      g.fillRect(x + 50, bodyY + 106, w - 100, 10);
      // giant cone sign on the roof
      g.fillStyle(0xd9a24a, 1);
      g.fillTriangle(cx - 20, y + 22, cx + 20, y + 22, cx, y + 78);
      g.fillStyle(0xf7e7ef, 1);
      g.fillCircle(cx - 8, y + 16, 12);
      g.fillCircle(cx + 9, y + 18, 11);
      g.fillStyle(0xf2b8c6, 1);
      g.fillCircle(cx, y + 5, 12);
      g.fillStyle(0xc0392b, 1);
      g.fillCircle(cx, y - 6, 4);
      // picnic bench
      g.fillStyle(0x8a5f45, 1);
      g.fillRect(x + 14, y + h - 34, 56, 8);
      g.fillRect(x + 20, y + h - 26, 6, 20);
      g.fillRect(x + 58, y + h - 26, 6, 20);
      break;
    }
    case "ballet": {
      g.fillStyle(0xe6ddf2, 1);
      g.fillRoundedRect(x, bodyY, w, bodyH, 5);
      g.fillStyle(0xcbbde4, 1);
      g.fillTriangle(x - 10, bodyY + 4, cx, y + 2, x + w + 10, bodyY + 4);
      g.fillStyle(0xf7f2fb, 1);
      [0, 1, 2, 3].forEach((i) => g.fillRect(x + 26 + i * 76, bodyY + 30, 16, 96));
      // arched windows with pink drapes
      g.fillStyle(0xbfe0f0, 0.95);
      [-64, 64].forEach((off) => g.fillRoundedRect(cx + off - 26, bodyY + 40, 52, 62, 24));
      g.fillStyle(0xff9ec9, 0.9);
      [-64, 64].forEach((off) => {
        g.fillRect(cx + off - 28, bodyY + 36, 12, 66);
        g.fillRect(cx + off + 16, bodyY + 36, 12, 66);
      });
      break;
    }
  }

  // Front door — skipped for the open equipment lot and the walk-up stand,
  // which have no building face to put one on.
  if (site.style !== "machineyard" && site.style !== "dairybar" && site.style !== "ballpark") {
    g.fillStyle(0x3a2f28, 1);
    g.fillRoundedRect(cx - 20, y + h - 40, 40, 40, 3);
    g.fillStyle(0xe8d98a, 1);
    g.fillCircle(cx + 12, y + h - 20, 2.5);
  }

  label(scene, cx, y + h + 18, `${site.icon}  ${site.label}`, 15, "#ffffff", true).setStroke("#1b2330", 5);
  if (site.career) label(scene, cx, y + h + 38, site.career, 12, "#cfe0ff").setStroke("#1b2330", 4);
}

export function drawHome(scene: Phaser.Scene, slot: CharacterSlot) {
  const character = CHARACTERS[slot.characterId];
  const g = scene.add.graphics().setDepth(DEPTH_BUILDING);
  const { x, y, width: w, height: h } = slot.homeZone;
  const cx = x + w / 2;

  // yard
  g.fillStyle(0x63a85a, 1);
  g.fillRoundedRect(x, y, w, h, 8);
  g.lineStyle(3, 0xe8e2d0, 1);
  g.strokeRoundedRect(x, y, w, h, 8);

  // house
  const hx = x + 22;
  const hy = y + 34;
  const hw = w - 44;
  const hh = h - 74;
  g.fillStyle(0x000000, 0.16);
  g.fillRoundedRect(hx + 5, hy + hh - 6, hw, 14, 6);
  g.fillStyle(0xf2ece0, 1);
  g.fillRoundedRect(hx, hy, hw, hh, 4);
  g.fillStyle(character.accent, 1);
  g.fillTriangle(hx - 12, hy + 4, hx + hw / 2, hy - 32, hx + hw + 12, hy + 4);

  // windows + door
  g.fillStyle(0x8fc4e8, 1);
  g.fillRect(hx + 14, hy + 20, 30, 26);
  g.fillRect(hx + hw - 44, hy + 20, 30, 26);
  g.fillStyle(character.accent, 1);
  g.fillRoundedRect(hx + hw / 2 - 15, hy + hh - 40, 30, 40, 3);
  g.fillStyle(0xe8d98a, 1);
  g.fillCircle(hx + hw / 2 + 9, hy + hh - 20, 2.2);

  // doghouse in the yard
  g.fillStyle(0x8a5f45, 1);
  g.fillRoundedRect(x + w - 60, y + h - 46, 44, 34, 3);
  g.fillStyle(0x6b4a33, 1);
  g.fillTriangle(x + w - 66, y + h - 44, x + w - 38, y + h - 62, x + w - 10, y + h - 44);
  g.fillStyle(0x2b2118, 1);
  g.fillRoundedRect(x + w - 48, y + h - 38, 20, 26, 8);

  label(scene, cx, y - 14, `${character.name}'s home`, 13, "#ffffff", true).setStroke("#1b2330", 4);
}
