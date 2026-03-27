/**
 * Cartographer — Seeded Random (Mulberry32)
 *
 * Deterministic PRNG: same seed = same sequence.
 */

export class SeededRandom {
  constructor(seed) {
    this.seed = seed | 0;
  }

  next() {
    this.seed += 0x6D2B79F5;
    let t = this.seed;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min)) + min;
  }

  pick(array) {
    return array[this.int(0, array.length)];
  }

  bool(probability = 0.5) {
    return this.next() < probability;
  }
}
