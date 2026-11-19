// Tuning, city layout and the mission script for Solmar City.
// Everything here is original: a fictional sun-soaked coastal city, its own
// people, vehicles and story. No Rockstar / GTA names, art or assets.

export const WORLD = 3200;
export const ROADS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROAD_HALF = 34;          // asphalt half-width
export const BEACH_X = 3040;          // sand starts here
export const WATER_X = 3130;          // sea starts here
export const PARK = { x: 1440, y: 1440, w: 320, h: 320 };

export const TUNE = {
  walkSpeed: 165,
  runSpeed: 265,
  carAccel: 620,
  carBrake: 900,
  carReverse: 320,
  carMaxSpeed: 560,
  carTurn: 2.7,
  carDrag: 0.55,
  playerHp: 100,
  startMoney: 250,
  bustedFine: 200,
  wantedDecaySeconds: 26,   // one star per quiet interval
  policeRamDamage: 12,
  policeRamCooldown: 0.9,
  bulletSpeed: 950,
  bulletDamage: 11,
  bulletLife: 0.9,
  fireCooldown: 0.24,
  punchDamage: 18,
  punchRange: 62,
  punchCooldown: 0.45,
  trafficCount: 13,
  pedCount: 26,
  parkedCount: 10,
};

export const CAR_TYPES = [
  { name: 'Veloz GT',   color: '#e8b90c', top: 600, accel: 700 },
  { name: 'Camión',     color: '#3f7d4e', top: 480, accel: 520 },
  { name: 'Solmar Taxi', color: '#e8c832', top: 540, accel: 600 },
  { name: 'Palmera',    color: '#c94f6d', top: 560, accel: 640 },
  { name: 'Furgón',     color: '#7d8a99', top: 460, accel: 480 },
  { name: 'Brisa',      color: '#4f7ec9', top: 580, accel: 660 },
];

// Landmarks: rect is the building footprint, door is the mission target
// point on the nearest road. All inside city blocks, never across a road.
export const LANDMARKS = [
  { id: 'garage',   name: "Mara's Garage",        x: 860,  y: 430,  w: 240, h: 160, color: '#b4762a', door: { x: 980,  y: 600 } },
  { id: 'docks',    name: 'Puerto Viejo Docks',   x: 2720, y: 420,  w: 220, h: 150, color: '#5a6d7d', door: { x: 3000, y: 500 } },
  { id: 'hotel',    name: 'Neon Palms Hotel',     x: 1460, y: 660,  w: 240, h: 170, color: '#c94f9d', door: { x: 1580, y: 1000 } },
  { id: 'bank',     name: 'Solmar National Bank', x: 1060, y: 1460, w: 240, h: 170, color: '#8a7d4f', door: { x: 1180, y: 1400 } },
  { id: 'safehouse', name: 'Safehouse — Calle Luna', x: 2260, y: 2260, w: 200, h: 150, color: '#4f8a6d', door: { x: 2360, y: 2200 } },
  { id: 'hospital', name: 'Solmar General Hospital', x: 660, y: 2260, w: 240, h: 170, color: '#d8d8d0', door: { x: 780,  y: 2200 } },
  { id: 'mercado',  name: 'Mercado Central',      x: 2260, y: 1060, w: 240, h: 170, color: '#c97a2a', door: { x: 2380, y: 1000 } },
  { id: 'tower',    name: "The Broker's Tower",   x: 1860, y: 260,  w: 220, h: 200, color: '#3a3f4a', door: { x: 1970, y: 600 } },
];

export function landmark(id) { return LANDMARKS.find((l) => l.id === id); }

// The story: Leo Marín owes The Broker $40,000. Five missions pay it off.
// Step kinds: steal (enter any car), goto (reach a door), collect (grab a
// pickup), chase (stall the courier van), escape (lose all wanted stars).
export const MISSIONS = [
  {
    name: 'Borrowed Wheels',
    reward: 150,
    intro: "Leo Marín owes The Broker $40,000. It starts small: borrow a car. Any car. Mara's Garage will pay for the delivery.",
    steps: [
      { kind: 'steal', text: 'Steal a car — walk up to one and press E' },
      { kind: 'goto', target: 'garage', text: "Drive to Mara's Garage" },
    ],
  },
  {
    name: 'The Pickup',
    reward: 400,
    intro: "A crate came in at Puerto Viejo Docks. The Neon Palms Hotel is expecting it. No questions, no stops.",
    steps: [
      { kind: 'collect', target: 'docks', pickup: 'crate', text: 'Pick up the crate at the docks' },
      { kind: 'goto', target: 'hotel', text: 'Deliver the crate to the Neon Palms Hotel' },
    ],
  },
  {
    name: 'Tail Job',
    reward: 800,
    intro: "A courier is carrying the Broker's ledger across town. Stop his van — ram it or shoot it out — and bring the briefcase home.",
    steps: [
      { kind: 'chase', target: 'tower', text: 'Stop the courier van — ram it or shoot it' },
      { kind: 'collect', pickup: 'briefcase', text: 'Grab the briefcase' },
      { kind: 'goto', target: 'tower', text: "Deliver the briefcase to The Broker's Tower" },
    ],
  },
  {
    name: 'Heat Wave',
    reward: 600,
    intro: 'The whole city is looking for you. Three stars. Stay out of sight until the heat dies, then slip to the safehouse on Calle Luna.',
    steps: [
      { kind: 'escape', wanted: 3, text: 'Lose the heat — stay clean until the stars fade' },
      { kind: 'goto', target: 'safehouse', text: 'Reach the safehouse on Calle Luna' },
    ],
  },
  {
    name: 'The Last Score',
    reward: 40000,
    intro: 'Solmar National Bank. Forty thousand dollars, one vault, and every cop in the city. Grab the cash and run — this ends the debt.',
    steps: [
      { kind: 'collect', target: 'bank', pickup: 'cash', text: 'Grab the cash from the bank' },
      { kind: 'escape', wanted: 4, text: 'Escape the 4-star heat' },
      { kind: 'goto', target: 'safehouse', text: 'Reach the safehouse — finish the debt' },
    ],
  },
];

export const PED_NAMES = [
  'Rosa', 'Mateo', 'Lucía', 'Diego', 'Carmen', 'Jorge', 'Ana', 'Pablo',
  'Sofía', 'Luis', 'Elena', 'Carlos', 'Marta', 'Andrés', 'Isabel', 'Tomás',
  'Nina', 'Rafael', 'Lola', 'Hugo', 'Valeria', 'Óscar', 'Paula', 'Bruno',
  'Iris', 'Marco', 'Dana', 'Emilio',
];

export const PED_COLORS = ['#d94f4f', '#4f7ed9', '#e0a53c', '#4fd98a', '#a54fd9', '#d97ab0', '#5fd0c9', '#e06a2c'];
