// Seeded random numbers for Solmar City. One seed fully determines a run:
// the same seed always deals the same city, traffic and pedestrians.
export function createRng(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(a, b) {
      return a + next() * (b - a);
    },
    int(a, b) {
      return Math.floor(a + next() * (b - a + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    chance(p) {
      return next() < p;
    },
  };
}
