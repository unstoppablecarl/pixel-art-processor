export class Mulberry32 {
  readonly initialSeed: number
  private _increment = 0

  constructor(
    public seed = 0,
  ) {
    this.initialSeed = seed
  }

  clone(): Mulberry32 {
    const cloned = new Mulberry32(this.seed)
    cloned._increment = this._increment
    return cloned
  }

  next(): number {
    this._increment++

    // Mulberry32
    let t = this.seed += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    this.seed = t

    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }

  reset() {
    this.seed = this.initialSeed
    this._increment = 0
  }

  get increment(): number {
    return this._increment
  }

  get id(): string {
    return `SEED_ID: ${this.seed}-${this.increment}`
  }
}