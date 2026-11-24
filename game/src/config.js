// Every tuning number, the city layout and the mission script for Solmar City.
// Nothing here is read from the network; the whole game is driven by these values.

export const WORLD_SIZE = 3200;
export const ROAD_LINES = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROAD_HALF = 34;
export const ROAD_WIDTH = 68;

export const START_MONEY = 250;
export const START_HEALTH = 100;
export const DEBT = 40000;
export const MAX_WANTED = 5;
export const WANTED_DECAY_SECONDS = 26;
export const POLICE_RAM_DAMAGE = 12;
export const POLICE_RAM_COOLDOWN = 0.9;
export const BUSTED_FINE = 200;
export const BUSTED_WAIT_SECONDS = 2.5;

export const WALK_SPEED = 175;
export const RUN_SPEED = 290;
export const CAR_ACCEL = 460;
export const CAR_BRAKE = 720;
export const CAR_REVERSE_ACCEL = 260;
export const CAR_MAX_SPEED = 540;
export const CAR_MAX_REVERSE = 200;
export const CAR_TURN_RATE = 2.5;

export const TRAFFIC_COUNT = 13;
export const PED_COUNT = 26;
export const PISTOL_DAMAGE = 20;
export const PISTOL_RANGE = 560;
export const PISTOL_COOLDOWN = 0.22;
export const POLICE_HP = 60;
export const COURIER_HP = 120;
export const CAR_PUSH_MIN = 38;

// The eight named landmarks. x/y are the top-left corner of the building.
export const LANDMARKS = [
  { id: 'garage', name: "Mara's Garage", x: 300, y: 300, w: 150, h: 100, color: '#c96f2e' },
  { id: 'docks', name: 'Puerto Viejo Docks', x: 280, y: 2680, w: 170, h: 110, color: '#7a6a4f' },
  { id: 'hotel', name: 'Neon Palms Hotel', x: 2330, y: 660, w: 190, h: 120, color: '#d84f8a' },
  { id: 'bank', name: 'Solmar National Bank', x: 1930, y: 1440, w: 180, h: 120, color: '#b8a24a' },
  { id: 'safehouse', name: 'Safehouse on Calle Luna', x: 640, y: 2260, w: 140, h: 100, color: '#4f7d5a' },
  { id: 'hospital', name: 'Solmar General Hospital', x: 2360, y: 2300, w: 180, h: 130, color: '#e8e4da' },
  { id: 'mercado', name: 'Mercado Central', x: 1040, y: 1840, w: 170, h: 110, color: '#e07b39' },
  { id: 'tower', name: "The Broker's Tower", x: 1960, y: 2660, w: 160, h: 150, color: '#3d4a6b' },
];

export const PARK = { x: 1440, y: 1440, w: 320, h: 320 };
export const POND = { x: 1600, y: 1600, r: 72 };
export const BEACH_X = 3040;
export const WATER_X = 3100;

export const CAR_NAMES = [
  'Comet GT', 'Solmar Cruiser', 'Viento Sedan', 'Palma Coupe', 'Duna Pickup',
  'Coral Hatchback', 'Breeze Van', 'Marlin Sport', 'Tide Runner', 'Luna Taxi',
  'Cactus 4x4', 'Rumba Compact',
];

export const CAR_COLORS = [
  '#d83a2e', '#2e7dd8', '#e8b93a', '#37b06a', '#8a5fd0',
  '#e06a1f', '#c0c8d0', '#22262e', '#3ab8b0', '#d84f8a',
];

export const PED_NAMES = [
  'Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Felix', 'Gabi', 'Hugo',
  'Ines', 'Jorge', 'Karla', 'Luis', 'Marta', 'Nico', 'Olga', 'Pablo',
  'Rosa', 'Sergio', 'Tania', 'Victor', 'Yara', 'Zoe',
];

// The story: Leo Marin owes The Broker $40,000. Five missions, in order.
export const MISSIONS = [
  {
    id: 'wheels',
    title: '1. Borrowed Wheels',
    intro: 'Mara needs wheels moved. Steal a car and bring it to her garage.',
    objective: 'Steal a car, then drive it to Mara\u2019s Garage.',
    pay: 150,
  },
  {
    id: 'pickup',
    title: '2. The Pickup',
    intro: 'A crate is waiting at Puerto Viejo Docks. Fetch it for the Neon Palms Hotel.',
    objective: 'Collect the crate at the docks, deliver it to the Neon Palms Hotel.',
    pay: 400,
  },
  {
    id: 'tail',
    title: '3. Tail Job',
    intro: 'The courier is carrying the Broker\u2019s briefcase. Stop the van and take it.',
    objective: 'Ram or shoot the courier van until it stalls, grab the briefcase, deliver it to the Broker\u2019s Tower.',
    pay: 800,
  },
  {
    id: 'heat',
    title: '4. Heat Wave',
    intro: 'Three stars and every cruiser in Solmar on your tail. Go quiet, then vanish.',
    objective: 'Lose the 3-star wanted level, then reach the safehouse on Calle Luna.',
    pay: 600,
  },
  {
    id: 'score',
    title: '5. The Last Score',
    intro: 'One bank, one bag, forty grand. This settles the debt — if you get out.',
    objective: 'Rob Solmar National Bank, then escape with 4 stars to the safehouse.',
    pay: 40000,
  },
];

export const PLAYER_START = { x: 600, y: 420 };
