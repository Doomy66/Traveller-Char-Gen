import { clone, emptyTraveller, type Possession, type Traveller } from "../engine/character";
import { Abort, Ctx, DEFAULT_SETTINGS, type Answerer, type Settings, type Step } from "../engine/context";
import { createTraveller } from "../engine/creation";
import { newSeed, seededRandom } from "../engine/dice";

/**
 * One Traveller being made: who they are at the start, the settings, and the
 * transcript of every die and decision. The Traveller itself is never stored
 * while being made; it is rebuilt by replaying the transcript, which is what
 * makes undo exact. CharSpec 5.3.
 */

export interface SavedTraveller {
  format: "traveller-char-gen";
  version: 1;
  setup: Traveller;
  settings: Settings;
  transcript: Step[];
  /** What was typed or bought after creation finished. */
  post: { name: string; goal: string; notes: string; purchases: Possession[] };
  /** The finished Traveller, for readers that do not replay. */
  traveller?: Traveller;
}

export class Session {
  transcript: Step[] = [];
  ctx: Ctx | undefined;
  t: Traveller;
  running = false;
  error: unknown;
  post: SavedTraveller["post"] = { name: "", goal: "", notes: "", purchases: [] };

  constructor(
    public setup: Traveller = emptyTraveller(),
    public settings: Settings = { ...DEFAULT_SETTINGS },
  ) {
    this.t = clone(setup);
  }

  /** Run creation, replaying `replay` first, then asking `answerer`. Resolves when finished or aborted. */
  async run(answerer: Answerer, replay: Step[], onChange: () => void, seed = newSeed()): Promise<void> {
    if (this.ctx) this.ctx.aborted = true;
    this.t = clone(this.setup);
    const ctx = new Ctx(this.t, this.settings, answerer, seededRandom(seed), replay);
    this.ctx = ctx;
    ctx.onChange = () => {
      if (this.ctx === ctx) {
        this.transcript = ctx.transcript;
        onChange();
      }
    };
    this.running = true;
    this.error = undefined;
    try {
      await createTraveller(ctx);
      if (this.ctx === ctx) this.applyPost();
    } catch (e) {
      if (!(e instanceof Abort)) {
        this.error = e;
        console.error(e);
      }
    } finally {
      if (this.ctx === ctx) {
        this.running = false;
        this.transcript = ctx.transcript;
        onChange();
      }
    }
  }

  /** The transcript with the last decision removed, for undo. */
  undoTranscript(): Step[] | undefined {
    const tr = this.ctx?.transcript ?? this.transcript;
    for (let i = tr.length - 1; i >= 0; i--) if ("c" in tr[i]!) return tr.slice(0, i);
    return undefined;
  }

  get decisions(): number {
    return (this.ctx?.transcript ?? this.transcript).filter((s) => "c" in s).length;
  }

  applyPost(): void {
    const t = this.t;
    if (this.post.name) t.name = this.post.name;
    t.goal = this.post.goal;
    t.notes = this.post.notes;
    for (const p of this.post.purchases) {
      t.possessions.push(p);
      t.cash -= p.cost ?? 0;
    }
  }

  capturePost(): void {
    this.post.name = this.t.name;
    this.post.goal = this.t.goal;
    this.post.notes = this.t.notes;
  }

  save(): SavedTraveller {
    this.capturePost();
    return {
      format: "traveller-char-gen",
      version: 1,
      setup: this.setup,
      settings: this.settings,
      transcript: this.ctx?.transcript ?? this.transcript,
      post: this.post,
      traveller: this.t,
    };
  }

  static load(s: SavedTraveller): Session {
    if (s.format !== "traveller-char-gen") throw new Error("Not a Traveller Generator file.");
    const x = new Session(s.setup, { ...DEFAULT_SETTINGS, ...s.settings });
    x.transcript = s.transcript;
    x.post = s.post ?? { name: "", goal: "", notes: "", purchases: [] };
    return x;
  }
}
