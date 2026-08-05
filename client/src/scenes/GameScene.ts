import Phaser from "phaser";
import { Room, getStateCallbacks } from "colyseus.js";
import { CHARACTERS, PETS, TUNING } from "../../../shared/gameData";
import { CHARACTER_SLOTS, JOB_SITES, SCENERY, WORLD, rectContains, slotFor } from "../../../shared/world";
import { CharacterView, SyncedCharacter } from "../entities/CharacterView";
import { VisitorView, SyncedVisitor } from "../entities/VisitorView";
import { PetSprite } from "../entities/PetSprite";
import { TraitAudio } from "../audio/TraitAudio";
import { CharacterSelect } from "../ui/CharacterSelect";
import { TouchControls } from "../ui/TouchControls";
import { drawBuilding, drawHome, drawTerrain } from "../world/render";

const VIEW_W = 1024;
const VIEW_H = 640;
const DEPTH_HUD = 1000;

type MeterKey = "hunger" | "bladder" | "energy" | "happiness";
const METER_COLOR: Record<MeterKey, number> = {
  hunger: 0xd98c3f,
  bladder: 0x4fa3d9,
  energy: 0x7fd94f,
  happiness: 0xd94f8c,
};

interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface GiftMessage {
  pairId: string;
  pairLabel: string;
  emoji: string;
  characterId: string;
  characterName: string;
  amount: number;
}

export class GameScene extends Phaser.Scene {
  private room!: Room<any>;
  // Filled by main.ts's listener, drained here each frame.
  private giftQueue: GiftMessage[] = [];
  private views = new Map<string, CharacterView>();
  private visitorViews = new Map<string, VisitorView>();
  private pets = new Map<string, PetSprite>();
  private localCharacterId: string | null = null;
  private select: CharacterSelect | null = null;
  private gameOver = false;

  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyWork!: Phaser.Input.Keyboard.Key;
  private keyFeed!: Phaser.Input.Keyboard.Key;
  private keyWalk!: Phaser.Input.Keyboard.Key;
  private keyPlay!: Phaser.Input.Keyboard.Key;
  private lastSentInput: InputState = { up: false, down: false, left: false, right: false };

  // Freeze announcements — every client watches the shared state for a
  // player-controlled character flipping into a derail, so all players see
  // the same notice at the same time.
  private wasDerailed = new Map<string, boolean>();
  private toasts: Phaser.GameObjects.Text[] = [];

  // Trait sounds: each character re-triggers on its own randomized timer
  // while it's mid-trait, so the town babbles instead of pulsing in unison.
  private audio = new TraitAudio();
  private nextTraitSoundAt = new Map<string, number>();
  private keyMute!: Phaser.Input.Keyboard.Key;
  private muteText!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private touch: TouchControls | null = null;

  private moneyText!: Phaser.GameObjects.Text;
  private whoText!: Phaser.GameObjects.Text;
  private petText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private leaderboardText!: Phaser.GameObjects.Text;
  private meterFills: Record<MeterKey, Phaser.GameObjects.Rectangle> = {} as any;

  constructor() {
    super("GameScene");
  }

  init(data: { room: Room<any>; giftQueue: GiftMessage[] }) {
    this.room = data.room;
    this.giftQueue = data.giftQueue;
  }

  create() {
    this.cameras.main.setBackgroundColor("#4a6b3f");
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);

    drawTerrain(this);
    JOB_SITES.forEach((site) => drawBuilding(this, site));
    SCENERY.forEach((site) => drawBuilding(this, site));
    CHARACTER_SLOTS.forEach((slot) => {
      drawHome(this, slot);
      const pet = PETS[slot.petId];
      const sprite = new PetSprite(
        this,
        slot.homeZone.x + slot.homeZone.width - 66,
        slot.homeZone.y + slot.homeZone.height - 14,
        pet
      );
      sprite.setDepth(20);
      this.pets.set(slot.characterId, sprite);
      this.add
        .text(slot.homeZone.x + slot.homeZone.width - 38, slot.homeZone.y + slot.homeZone.height + 4, pet.name, {
          fontFamily: "system-ui, sans-serif",
          fontSize: "11px",
          color: "#ffffff",
        })
        .setOrigin(0.5, 0)
        .setDepth(21)
        .setStroke("#1b2330", 3);
    });

    const kb = this.input.keyboard!;
    this.keyUp = kb.addKey("W");
    this.keyDown = kb.addKey("S");
    this.keyLeft = kb.addKey("A");
    this.keyRight = kb.addKey("D");
    this.keyWork = kb.addKey("SPACE");
    this.keyFeed = kb.addKey("ONE");
    this.keyWalk = kb.addKey("TWO");
    this.keyPlay = kb.addKey("THREE");
    this.keyMute = kb.addKey("M");
    this.cursors = kb.createCursorKeys(); // arrow keys alongside WASD

    // Touch controls appear on devices that actually have a touchscreen.
    // Desktop players never see them.
    if (this.sys.game.device.input.touch) {
      this.touch = new TouchControls(this, VIEW_W, VIEW_H, (action) => {
        if (!this.localCharacterId || this.gameOver) return;
        if (action === "work") this.room.send("work");
        else this.room.send("care", { action });
      });
      this.touch.setVisible(false); // hidden until a character is chosen
    }

    this.buildHud();

    const $ = getStateCallbacks(this.room);
    $(this.room.state).characters.onAdd((character: SyncedCharacter, characterId: string) => {
      const isLocal = character.controlledBy === this.room.sessionId;
      if (isLocal) this.localCharacterId = characterId;
      this.views.set(characterId, new CharacterView(this, character, isLocal));
    });
    $(this.room.state).characters.onRemove((_c: SyncedCharacter, characterId: string) => {
      this.views.get(characterId)?.destroy();
      this.views.delete(characterId);
    });
    $(this.room.state).visitors.onAdd((visitor: SyncedVisitor, visitorId: string) => {
      this.visitorViews.set(visitorId, new VisitorView(this, visitor));
    });
    $(this.room.state).listen("gameOver", (value: boolean) => {
      if (value) this.showEndOverlay();
    });

    // Nothing is claimed on join any more — you choose who to be.
    this.select = new CharacterSelect(this, (characterId) => {
      this.room.send("selectCharacter", { characterId });
    });
    this.room.onMessage("selectionRejected", (msg: { characterId: string }) => {
      const name = CHARACTERS[msg.characterId]?.name ?? "That character";
      this.select?.showMessage(`${name} was just taken — pick someone else.`);
    });

    // Park the camera over the middle of town while choosing.
    this.cameras.main.setScroll(WORLD.width / 2 - VIEW_W / 2, 430);
  }

  private buildHud() {
    const panel = this.add.rectangle(16, VIEW_H - 150, 300, 134, 0x111a26, 0.82).setOrigin(0, 0);
    panel.setStrokeStyle(2, 0x2f4358);
    panel.setScrollFactor(0).setDepth(DEPTH_HUD);

    this.whoText = this.add
      .text(30, VIEW_H - 142, "", { fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffd75e", fontStyle: "bold" })
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1);
    this.moneyText = this.add
      .text(30, VIEW_H - 122, "", { fontFamily: "system-ui, sans-serif", fontSize: "22px", color: "#ffffff", fontStyle: "bold" })
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1);
    this.petText = this.add
      .text(30, VIEW_H - 94, "", { fontFamily: "system-ui, sans-serif", fontSize: "11px", color: "#8fa3bd" })
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1);

    (["hunger", "bladder", "energy", "happiness"] as MeterKey[]).forEach((key, i) => {
      const y = VIEW_H - 76 + i * 17;
      this.add
        .text(30, y, key, { fontFamily: "system-ui, sans-serif", fontSize: "10px", color: "#c8d4e3" })
        .setScrollFactor(0)
        .setDepth(DEPTH_HUD + 1);
      this.add
        .rectangle(96, y + 6, 200, 9, 0x0b1a2b)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH_HUD + 1);
      this.meterFills[key] = this.add
        .rectangle(96, y + 6, 200, 9, METER_COLOR[key])
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(DEPTH_HUD + 2);
    });

    this.promptText = this.add
      .text(VIEW_W / 2, VIEW_H - 34, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        color: "#ffffff",
        backgroundColor: "#111a26cc",
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1)
      .setVisible(false);

    this.leaderboardText = this.add
      .text(VIEW_W - 16, 14, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#d8e4f2",
        align: "right",
        backgroundColor: "#111a26aa",
        padding: { x: 10, y: 8 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1);

    this.add
      .text(16, 14, "WASD or arrows move · SPACE work · 1 feed · 2 walk · 3 play", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#cfe0ff",
        backgroundColor: "#111a26aa",
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1);

    this.muteText = this.add
      .text(16, 42, "", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "12px",
        color: "#cfe0ff",
        backgroundColor: "#111a26aa",
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 1);
  }

  private updateTraitSound(character: SyncedCharacter, characterId: string, localX: number, localY: number) {
    // A character is "doing their thing" either as an idle NPC or while a
    // player is frozen by their derail.
    const doingTrait = character.derailed || (character.controlledBy === "" && !!character.activity);
    if (!doingTrait || character.eliminated) {
      this.nextTraitSoundAt.delete(characterId);
      return;
    }

    const now = this.time.now;
    const dueAt = this.nextTraitSoundAt.get(characterId);
    if (dueAt === undefined) {
      // Stagger the first hit so everyone doesn't fire at once on load.
      this.nextTraitSoundAt.set(characterId, now + Phaser.Math.Between(200, 2600));
      return;
    }
    if (now < dueAt) return;

    const dx = character.x - localX;
    const dy = character.y - localY;
    this.audio.play(CHARACTERS[characterId].annoyingTrait, Math.hypot(dx, dy), dx);
    this.nextTraitSoundAt.set(characterId, now + Phaser.Math.Between(2600, 5200));
  }

  update(_time: number, delta: number) {
    // Phaser starts calling update() the moment the scene is created, which
    // can be several frames before the first state patch arrives and decodes.
    // Until then the schema collections don't exist yet — touching them
    // throws, and a throw here kills the render loop for good, leaving a
    // blank screen. Wait for state rather than assuming it's there.
    const state = this.room.state as any;
    if (!state?.characters || !state?.visitors) return;

    // The server confirms ownership; until then the select screen is up.
    if (!this.localCharacterId) this.resolveLocalCharacter();

    if (this.select?.isVisible) {
      if (this.localCharacterId) {
        this.select.hide();
        this.select = null;
        this.touch?.setVisible(true);
      } else {
        const taken = new Set<string>();
        state.characters.forEach((c: SyncedCharacter, id: string) => {
          if (c.controlledBy !== "") taken.add(id);
        });
        this.select.refresh(taken);
      }
    }

    // No character yet means no input to send — just watch the town.
    if (!this.gameOver && this.localCharacterId) {
      this.sendInput();
      this.sendActions();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyMute)) this.audio.toggleMute();

    while (this.giftQueue.length > 0) {
      const gift = this.giftQueue.shift()!;
      this.showToast(`${gift.emoji} ${gift.pairLabel} slipped ${gift.characterName} $${gift.amount.toLocaleString()}`);
    }

    const local = this.localCharacterId
      ? (this.room.state.characters.get(this.localCharacterId) as SyncedCharacter | undefined)
      : undefined;

    this.room.state.characters.forEach((character: SyncedCharacter, characterId: string) => {
      this.views.get(characterId)?.render(character, delta);
      const pet = this.pets.get(characterId);
      if (pet) {
        pet.update(delta);
        pet.setAlpha(character.eliminated ? 0.25 : 1);
      }
      this.checkFreezeAnnouncement(character, characterId);
      if (local) this.updateTraitSound(character, characterId, local.x, local.y);
    });

    this.room.state.visitors.forEach((visitor: SyncedVisitor, visitorId: string) => {
      this.visitorViews.get(visitorId)?.render(visitor, delta);
    });

    this.followLocal();
    this.refreshHud();
  }

  private checkFreezeAnnouncement(character: SyncedCharacter, characterId: string) {
    const was = this.wasDerailed.get(characterId) ?? false;
    // Only announce real players freezing — idle NPCs are always doing their
    // trait, so announcing those would be constant noise.
    const isPlayerFrozen = character.derailed && character.controlledBy !== "";
    if (isPlayerFrozen && !was) {
      const def = CHARACTERS[characterId];
      this.showToast(`${def.name} can't move because ${def.pronoun} is ${def.annoyingTrait}`);
    }
    this.wasDerailed.set(characterId, isPlayerFrozen);
  }

  private showToast(message: string) {
    const toast = this.add
      .text(VIEW_W / 2, 0, message, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#ffe08a",
        fontStyle: "bold",
        align: "center",
        backgroundColor: "#1b2330ee",
        padding: { x: 16, y: 10 },
        wordWrap: { width: 620 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 20);

    this.toasts.push(toast);
    this.layoutToasts();

    this.tweens.add({
      targets: toast,
      alpha: 0,
      delay: 5200,
      duration: 700,
      onComplete: () => {
        this.toasts = this.toasts.filter((t) => t !== toast);
        toast.destroy();
        this.layoutToasts();
      },
    });
  }

  private layoutToasts() {
    this.toasts.forEach((toast, i) => toast.setY(56 + i * 46));
  }

  private resolveLocalCharacter() {
    this.room.state.characters.forEach((character: SyncedCharacter, characterId: string) => {
      if (character.controlledBy === this.room.sessionId) {
        if (this.localCharacterId !== characterId) {
          this.localCharacterId = characterId;
          // Rebuild the view so it picks up the local styling (name tag etc).
          this.views.get(characterId)?.destroy();
          this.views.set(characterId, new CharacterView(this, character, true));
          const cam = this.cameras.main;
          cam.setScroll(character.x - VIEW_W / 2, character.y - VIEW_H / 2);
        }
      }
    });
  }

  private followLocal() {
    if (!this.localCharacterId) return;
    const local = this.room.state.characters.get(this.localCharacterId) as SyncedCharacter | undefined;
    if (!local) return;
    const cam = this.cameras.main;
    cam.setScroll(
      Phaser.Math.Linear(cam.scrollX, local.x - VIEW_W / 2, 0.12),
      Phaser.Math.Linear(cam.scrollY, local.y - VIEW_H / 2, 0.12)
    );
  }

  private sendInput() {
    // WASD, arrow keys and the on-screen d-pad are all equivalent.
    const t = this.touch?.state;
    const input: InputState = {
      up: this.keyUp.isDown || !!this.cursors.up?.isDown || !!t?.up,
      down: this.keyDown.isDown || !!this.cursors.down?.isDown || !!t?.down,
      left: this.keyLeft.isDown || !!this.cursors.left?.isDown || !!t?.left,
      right: this.keyRight.isDown || !!this.cursors.right?.isDown || !!t?.right,
    };
    if (
      input.up !== this.lastSentInput.up ||
      input.down !== this.lastSentInput.down ||
      input.left !== this.lastSentInput.left ||
      input.right !== this.lastSentInput.right
    ) {
      this.room.send("move", input);
      this.lastSentInput = input;
    }
  }

  private sendActions() {
    if (Phaser.Input.Keyboard.JustDown(this.keyWork)) this.room.send("work");
    if (Phaser.Input.Keyboard.JustDown(this.keyFeed)) this.room.send("care", { action: "feed" });
    if (Phaser.Input.Keyboard.JustDown(this.keyWalk)) this.room.send("care", { action: "walk" });
    if (Phaser.Input.Keyboard.JustDown(this.keyPlay)) this.room.send("care", { action: "play" });
  }

  private refreshHud() {
    this.muteText.setText(
      !this.audio.isReady
        ? "🔇 click or press a key to enable sound"
        : this.audio.isMuted
          ? "🔇 sound off — M to unmute"
          : "🔊 sound on — M to mute"
    );

    const lines: string[] = ["— caretakers —"];
    this.room.state.characters.forEach((c: SyncedCharacter) => {
      if (c.controlledBy === "") return;
      const name = CHARACTERS[c.characterId].name;
      const status = c.eliminated ? "💔 out" : `${PETS[c.petId].name} ${Math.round(c.happiness)}%`;
      lines.push(`${name}  $${Math.floor(c.money).toLocaleString()}  ·  ${status}`);
    });
    this.leaderboardText.setText(lines.length > 1 ? lines.join("\n") : "");

    if (!this.localCharacterId) {
      this.whoText.setText("joining…");
      return;
    }
    const local = this.room.state.characters.get(this.localCharacterId) as SyncedCharacter | undefined;
    if (!local) return;

    const character = CHARACTERS[local.characterId];
    this.whoText.setText(`${character.name} · ${character.career}`);
    this.moneyText.setText(`$${Math.floor(local.money).toLocaleString()}`);
    this.petText.setText(`Pet: ${PETS[local.petId].name}  —  goal $${TUNING.winTargetMoney.toLocaleString()}`);
    (["hunger", "bladder", "energy", "happiness"] as MeterKey[]).forEach((key) => {
      this.meterFills[key].width = 200 * (local[key] / TUNING.meterMax);
    });

    this.promptText.setVisible(false);
    if (local.eliminated || this.gameOver) return;

    if (local.derailed) {
      this.promptText
        .setText(`😤 ${character.name} is ${character.annoyingTrait} — no control for ${Math.ceil(local.derailRemainingMs / 1000)}s`)
        .setVisible(true);
      return;
    }
    const site = JOB_SITES.find((s) => rectContains(s.rect, local.x, local.y));
    if (site) {
      const bonus = site.career === character.career ? "  ★ 2x — your career!" : "  (not your career — normal pay)";
      this.promptText.setText(`SPACE: work a shift at ${site.label}${bonus}`).setVisible(true);
      return;
    }
    if (rectContains(slotFor(local.characterId).homeZone, local.x, local.y)) {
      this.promptText.setText(`1: Feed ($${TUNING.feedCost})   2: Walk   3: Play with ${PETS[local.petId].name}`).setVisible(true);
    }
  }

  private showEndOverlay() {
    if (this.gameOver) return;
    this.gameOver = true;

    const title = (this.room.state as any).endTitle as string;
    const message = (this.room.state as any).endMessage as string;

    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.8).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH_HUD + 50);
    this.add
      .text(VIEW_W / 2, VIEW_H / 2 - 50, title, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "30px",
        color: "#ffd75e",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: 760 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 51);
    this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 12, message, {
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: 640 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 51);
    this.add
      .text(VIEW_W / 2, VIEW_H / 2 + 70, "Refresh the page to play again.", {
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
        color: "#8fa3bd",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH_HUD + 51);
  }
}
