// Solmar City tuning: every number the simulation and the renderer share.
// The city is a square; roads are the grid lines, blocks are the gaps.
export const WORLD_SIZE = 3200;
export const ROAD_LINES = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROAD_HALF = 58;
export const BLOCK_GAP = 70;

export const PARK_RECT = { x: 1050, y: 1850, w: 300, h: 300 };
export const POND = { x: 1200, y: 2000, r: 68 };
export const BEACH_X = 2940;
export const WATER_X = 3060;

export const PLAYER_START = { x: 405, y: 560 };
export const PLAYER_START_MONEY = 250;
export const PLAYER_MAX_HP = 100;
export const WALK_SPEED = 175;
export const RUN_SPEED = 305;
export const PLAYER_RADIUS = 14;

export const CAR_ACCEL = 430;
export const CAR_BRAKE = 900;
export const CAR_REVERSE_MAX = 170;
export const CAR_MAX_SPEED = 470;
export const CAR_DRAG = 0.55;
export const CAR_TURN = 2.6;
export const CAR_RADIUS = 17;

export const TRAFFIC_COUNT = 13;
export const PED_COUNT = 26;
export const STEAL_RANGE = 78;
export const PICKUP_RANGE = 72;
export const MISSION_ARRIVE = 115;

export const WANTED_MAX = 5;
export const WANTED_DECAY_SECONDS = 26;
export const POLICE_RAM_DAMAGE = 12;
export const POLICE_RAM_COOLDOWN = 0.9;
export const POLICE_DESPAWN = 1300;
export const TRAFFIC_RESPAWN = 1500;

export const BULLET_SPEED = 920;
export const BULLET_LIFE = 1.1;
export const FIRE_COOLDOWN = 0.24;
export const SHOT_DAMAGE = 25;
export const CAR_HP = 100;
export const RAM_DAMAGE_SPEED = 150;

export const BUSTED_FINE = 200;
export const BUSTED_WAIT = 2.5;

export const DEBT_TOTAL = 40000;

// Named places. x/y/w/h are the building footprint; door is where the
// player stands to use it, target is where a mission wants the player.
export const LANDMARKS = [
  { key: 'garage', name: "Mara's Garage", x: 310, y: 310, w: 190, h: 130, door: { x: 405, y: 480 }, target: { x: 405, y: 520 } },
  { key: 'docks', name: 'Puerto Viejo Docks', x: 310, y: 2650, w: 220, h: 150, door: { x: 420, y: 2600 }, target: { x: 420, y: 2600 } },
  { key: 'hotel', name: 'Neon Palms Hotel', x: 1110, y: 310, w: 200, h: 140, door: { x: 1210, y: 480 }, target: { x: 1210, y: 520 } },
  { key: 'bank', name: 'Solmar National Bank', x: 1910, y: 1110, w: 210, h: 150, door: { x: 2015, y: 1290 }, target: { x: 2015, y: 1330 } },
  { key: 'safehouse', name: 'Safehouse on Calle Luna', x: 2710, y: 1910, w: 170, h: 120, door: { x: 2795, y: 2060 }, target: { x: 2795, y: 2100 } },
  { key: 'hospital', name: 'Solmar General Hospital', x: 310, y: 1910, w: 200, h: 140, door: { x: 410, y: 2080 }, target: { x: 410, y: 2120 } },
  { key: 'mercado', name: 'Mercado Central', x: 1510, y: 2710, w: 230, h: 140, door: { x: 1625, y: 2650 }, target: { x: 1625, y: 2620 } },
  { key: 'tower', name: "The Broker's Tower", x: 2710, y: 310, w: 180, h: 180, door: { x: 2800, y: 520 }, target: { x: 2800, y: 560 } },
];

export function landmark(key) {
  return LANDMARKS.find((l) => l.key === key);
}

// The five jobs, in order. targetKey names the landmark the job ends at;
// the step text is shown in the objective panel while the job runs.
export const MISSIONS = [
  {
    name: 'Borrowed Wheels',
    intro: 'Leo needs wheels. Take a car and bring it back to Mara.',
    payout: 150,
    steps: ['Steal a car', 'Drive it to Mara\u2019s Garage'],
  },
  {
    name: 'The Pickup',
    intro: 'A crate waits at the docks. Fetch it, then drop it at the hotel.',
    payout: 400,
    steps: ['Collect the crate at the docks', 'Deliver it to Neon Palms Hotel'],
  },
  {
    name: 'Tail Job',
    intro: 'A courier is carrying the Broker\u2019s papers. Stop the van.',
    payout: 800,
    steps: ['Stall the courier van', 'Take the briefcase', 'Deliver it to the Broker\u2019s Tower'],
  },
  {
    name: 'Heat Wave',
    intro: 'Three stars on your head. Go quiet, then slip home.',
    payout: 600,
    steps: ['Lose the wanted level', 'Reach the safehouse'],
  },
  {
    name: 'The Last Score',
    intro: 'Rob the bank, then vanish. Forty thousand clears the debt.',
    payout: 40000,
    steps: ['Grab the cash at the bank', 'Escape to the safehouse'],
  },
];

export const CAR_NAMES = [
  'Solmar Comet', 'Palma Cruiser', 'Viento GT', 'Calle Runner', 'Brisa Coupe',
  'Marlin Sedan', 'Tropic Hauler', 'Luna Cabrio', 'Coral Pickup', 'Duna Van',
];
export const CAR_COLORS = [
  '#d94f3d', '#3d7bd9', '#e8b73a', '#4fae5f', '#8a5fd0',
  '#d97fb0', '#e8e4da', '#3a3f4a', '#e07b2e', '#2ea8a0',
];
export const PED_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Felix', 'Gina', 'Hugo',
  'Ines', 'Jorge', 'Karla', 'Luis', 'Marta', 'Nico', 'Olga', 'Pablo',
  'Rosa', 'Tomas', 'Vera', 'Yago', 'Zoe', 'Ramon', 'Luz', 'Celia',
  'Omar', 'Nina',
];
export const BUILDING_COLORS = [
  '#e8c9a0', '#d9a06b', '#c98f7a', '#a8b8c8', '#e0d5b8',
  '#b8c4a8', '#d8b8c0', '#a0b8b0', '#e8d8a8', '#c0a890',
];
