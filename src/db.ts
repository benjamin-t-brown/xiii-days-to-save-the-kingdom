import { loadImagesAndSprites } from './draw';
import { rand, zzfxPlaySound } from './zzfx';
import { map1 } from './maps';
import { Game } from './game';
import { normalize, playSound, Point, randInArr, shuffle } from './utils';
import {
  STAT_ATTACK,
  STAT_ATTACK_VAR_PCT,
  STAT_DEFENSE,
  STAT_HEALTH,
  STAT_MAX_HEALTH,
  STAT_SPEED,
} from './battleUnit';

export type LootId = number;

const dbSounds = new Map<string, (number | undefined)[]>();
const dbMaps = new Map<string, MapTemplate>();
const tileCosts = new Map<number, number>();
const roundToNearest5 = (n: number) => Math.ceil(n / 5) * 5;

export const EVENT_BATTLE = 0,
  EVENT_CHEST = 1,
  EVENT_PRESENT = 2,
  EVENT_CASTLE = 3,
  EVENT_VILLAGE = 4,
  EVENT_TOWER = 5,
  EVENT_WELL = 6,
  EVENT_OBELISK = 7,
  EVENT_DAY1 = 8,
  EVENT_DAY6 = 9,
  EVENT_DAY12 = 10,
  EVENT_DAY13 = 11,
  EVENT_DAY_LOSS = 12,
  EVENT_DAY_N = 13,
  EVENT_DAY_START = 14,
  EVENT_DAY_WIN = 15;

export const BATTLE_UNIT_CLASS_FOOTMAN1 = 0,
  BATTLE_UNIT_CLASS_FOOTMAN2 = 1,
  BATTLE_UNIT_CLASS_FOOTMAN3 = 2,
  BATTLE_UNIT_CLASS_ARCHER1 = 3,
  BATTLE_UNIT_CLASS_ARCHER2 = 4,
  BATTLE_UNIT_CLASS_ARCHER3 = 5,
  BATTLE_UNIT_CLASS_KNIGHT1 = 6,
  BATTLE_UNIT_CLASS_KNIGHT2 = 7,
  BATTLE_UNIT_CLASS_KNIGHT3 = 8,
  BATTLE_UNIT_CLASS_MAGE1 = 9,
  BATTLE_UNIT_CLASS_FIEND1 = 10,
  BATTLE_UNIT_CLASS_FIEND2 = 11,
  BATTLE_UNIT_CLASS_FIEND3 = 12,
  BATTLE_UNIT_CLASS_LONGNECK = 13;

export const initDb = async () => {
  initDbSounds();

  initTileCosts();
  initBattleUnitTemplates();
  initUnitTemplateLists();
  initEventTable();
  initItemTemplates();

  const promises = [
    loadImagesAndSprites([['ts', 'res/ts.png', 16, 16]]),
    initMapTemplates(),
  ];
  await Promise.all(promises);
};

export const getTilePathCost = (tileId: number) => {
  return tileCosts.get(tileId - 1) ?? 100;
};

export const getSound = (soundName: string) => {
  const s = dbSounds.get(soundName);
  if (!s) {
    // throw new Error('No sound: ' + soundName);
  }
  return s as (number | undefined)[];
};

export const getMapTemplate = (mapName: string) => {
  const m = dbMaps.get(mapName);
  if (!m) {
    console.log('templates', dbMaps);
    // throw new Error('No map template: ' + mapName);
  }
  return m as MapTemplate;
};

export const getEventTemplate = (eventEnumId: number) => {
  const ev = eventTable.get(eventEnumId);
  if (!ev) {
    // throw new Error('No event: ' + eventEnumId);
  }
  return ev as (...any) => Partial<EventTemplate>;
};

export const getUnitTemplate = (unitClassId: number) => {
  const unit = battleUnitTemplates.get(unitClassId);
  if (!unit) {
    // throw new Error('No unit: ' + unitClassId);
  }
  return unit as BattleUnitTemplate;
};

export const getItemTemplate = (itemId: number) => {
  const item = itemTemplates.get(itemId);
  if (!item) {
    // throw new Error('No item: ' + itemId);
  }
  return item as ItemTemplate;
};

const initTileCosts = () => {
  const MAX_COST = 100;
  const costKeys = [0, 1, 2, 3, 8, 9, 10, 11, 16, 17, 18, 19, 24];
  const costValues = [
    1, // grass
    MAX_COST, // trees
    2, // bush
    MAX_COST, // mountain
    0.5, // road
    1, // chest
    1, // present
    1, // castle
    1, // village
    1, // tower
    1, // well
    MAX_COST, // castle wall
    1, // obelisk
  ];
  for (let i = 0; i < costKeys.length; i++) {
    tileCosts.set(costKeys[i], costValues[i]);
  }
};

const initDbSounds = () => {
  // prettier-ignore
  dbSounds.set('item', [,,397,.02,.05,.18,1,2.3,,-23,465,.06,.06,,,,,.56,.02]);
  // prettier-ignore
  // dbSounds.set('army_defeated', [,0,855,.37,.03,.21,4,3,-1,85,-124,.79,.13,,,,.23,.84,.02,.15,891]);
  // prettier-ignore
  dbSounds.set('lose', [1.3,,31,,.19,.004,3,4,,,-329,.33,,,35,,.37,,.4,.03]);
  // prettier-ignore
  dbSounds.set('exp', [1.4,0,667,.03,.31,.41,,2.1,.4,-0.3,125,.05,.08,,,,.09,.98,,.08]);
  // prettier-ignore
  dbSounds.set('horse_step', [1.2,,750,.01,,.008,3,1.4,15,,,,,,62,,.06,.53]);
  // prettier-ignore
  dbSounds.set('attack', [1.4,,101,.02,.06,.05,4,2.8,,,,,.09,1.8,,.4,.05,.74,.09,.49,1660]);
  // prettier-ignore
  dbSounds.set('flicker_enemy', [2.3,,456,,,.28,,1.7,4,,,,.07,1.7,,.1,.15,.66,.04,.44]);
  // prettier-ignore
  dbSounds.set('gold', [,,975,.03,.01,.008,1,4.9,,,290,.03,.02,,,,,.74,.32]);
  // prettier-ignore
  dbSounds.set('gain_level', [,,44,.09,,.01,3,3.3,,8,,.11,,,9.7,,,.97,.43]);
  // prettier-ignore
  dbSounds.set('battle_win', [2,,9,.28,.09,.06,,3.3,,-77,73,.24,,,,,.38,.54,.01,,-1333]);
  // prettier-ignore
  dbSounds.set('blip', [,,1008,,.01,.01,4,2,,-25,,,,.1,,.6,,.69,.02]);
  // prettier-ignore
  dbSounds.set('fight', [,,737,,.01,0,1,.3,,49,247,.03,,.5,184,,,.8,.02,.05]);
  // prettier-ignore
  dbSounds.set('ready_to_fight', [1.9,,330,.32,.36,.29,,2.7,,,46,,,,53,,.35,.91,.03]);
  // prettier-ignore
  // dbSounds.set('visit_tower', [1.1,,640,.02,.03,.01,2,1.2,-4,,-225,.09,.06,,26,,.19,.52,.03,.05,725]);
  // prettier-ignore
  dbSounds.set('visit_village', [1.1,,640,.02,.03,.01,2,1.2,-4,,-225,.09,.06,,26,,.19,.52,.03,.05,725]);
  // prettier-ignore
  dbSounds.set('new_turn', [2.8,,100,.07,.01,.23,1,3.2,,,,,,,,,.18,.67,.28,.41,105]);
};

interface MapTemplateLayer {
  data: number[];
  events: Map<string, string>;
}
interface MapTemplate {
  width: number;
  height: number;
  data: number[];
  events: Map<number, [number, number]>;
}

const initMapTemplates = async () => {
  console.log('loading map templates...');
  const data: number[] = [];
  const events: Map<number, [number, number]> = new Map();
  for (const elem of map1.data) {
    const elemNum = Number(elem);
    if (isNaN(elemNum)) {
      const [id, eventLevel] = elem.split(',').map((n) => +n);
      data.push(id);
      const eventMap = {
        0: EVENT_BATTLE,
        9: EVENT_CHEST,
        10: EVENT_PRESENT,
        11: EVENT_CASTLE,
        16: EVENT_VILLAGE,
        17: EVENT_TOWER,
        18: EVENT_WELL,
        24: EVENT_OBELISK,
      };
      eventMap[8] = eventMap[0];
      eventMap[19] = eventMap[11];
      const eventEnumId: number = eventMap[id - 1];
      console.log('push event', data.length - 1, eventEnumId);
      events.set(data.length - 1, [eventEnumId, eventLevel]);
    } else {
      data.push(elemNum);
    }
  }
  dbMaps.set('map', {
    width: map1.width,
    height: map1.height,
    data,
    events,
  });
  console.log('loaded map', dbMaps.get('map'));
};

type PartialStats = Partial<{
  att: number;
  def: number;
  hp: number;
  spd: number;
}>;
export interface ItemTemplate {
  name: string;
  cost: number;
  sellCost: number;
  stats?: PartialStats;
}

const itemTemplates = new Map<number, ItemTemplate>();
const giftItemTemplates: number[] = [];
const storeItemTemplates: number[] = [];

const resortItemTemplates = (arr: number[]) => {
  const tmp = Array.from(itemTemplates.keys());
  arr.length = 0;
  // Crown of Light not in map
  tmp.shift();
  while (tmp.length) {
    const ind = Math.floor(rand() * tmp.length);
    const r = tmp.splice(ind, 1)[0];
    arr.push(r);
  }
};

const initItemTemplates = () => {
  const createItemTemplate = (
    ...[name, cost, sellCost, stats]: (string | number | PartialStats)[]
  ) => {
    itemTemplates.set(itemTemplates.size, {
      name: name as string,
      cost: cost as number,
      sellCost: sellCost as number,
      stats: stats as PartialStats | undefined,
    });
  };
  createItemTemplate('Crown of Light', 0, 0);
  for (let i = 0; i < 2; i++) {
    createItemTemplate('Bronze Sword', 75, 15, { [STAT_ATTACK]: 1 });
    createItemTemplate('Iron Sword', 100, 25, { [STAT_ATTACK]: 2 });
    createItemTemplate('Steel Sword', 150, 50, { [STAT_ATTACK]: 3 });
    createItemTemplate('Sturdy Boots', 70, 15, { [STAT_SPEED]: 1 });
    createItemTemplate('Swift Boots', 90, 25, { [STAT_SPEED]: 2 });
    createItemTemplate('Magic Boots', 140, 50, { [STAT_SPEED]: 3 });
    createItemTemplate('Light Shield', 75, 15, { [STAT_DEFENSE]: 1 });
    createItemTemplate('Medium Shield', 100, 25, { [STAT_DEFENSE]: 2 });
    createItemTemplate('Heavy Shield', 150, 50, { [STAT_DEFENSE]: 3 });
    // createItemTemplate('Thick Plate', 30, 5, { health: 1 });
    // createItemTemplate('Forged Plate', 50, 15, { health: 2 });
    // createItemTemplate('Diamond Plate', 100, 45, { health: 3 });
    createItemTemplate('Power Pendant', 125, 75, {
      [STAT_ATTACK]: 1,
      [STAT_SPEED]: 1,
      // [STAT_DEFENSE]: 1,
    });
    createItemTemplate('Defense Charm', 125, 75, {
      // [STAT_ATTACK]: 1,
      [STAT_SPEED]: 1,
      [STAT_DEFENSE]: 1,
    });
    createItemTemplate('Yin Yang', 125, 75, {
      [STAT_ATTACK]: 1,
      // [STAT_SPEED]: 1,
      [STAT_DEFENSE]: 1,
    });
    createItemTemplate('Omni Flower', 500, 100, {
      [STAT_ATTACK]: 2,
      [STAT_SPEED]: 2,
      [STAT_DEFENSE]: 2,
    });
  }
  resortItemTemplates(storeItemTemplates);

  // for (let i = 0; i < 3; i++) {
  createItemTemplate('Small Supply Stash', 0, 50);
  createItemTemplate('Big Supply Stash', 0, 100);
  // }
  resortItemTemplates(giftItemTemplates);
};

export interface BattleUnitTemplate {
  classEnumId: number;
  sprInd: any; //number
  label: string;

  // speed: number;
  // range: number;
  attack: number;
  attackVarPct: number;
  defense: number;
  health: number;
  maxHealth: number;
}

const battleUnitTemplates = new Map<number, BattleUnitTemplate>();

let storeUnitTemplates: [number, number, number, number][] = [];
let eventUnitTemplates: [number, UnitWithStackSize[]][] = [];

const initUnitTemplateLists = () => {
  const addStoreTemplate = (...[level, unitId, stackSize, cost]) => {
    storeUnitTemplates.push([level, unitId, stackSize, cost]);
  };
  // level, unit, stack, cost
  for (let i = 0; i < 4; i++) {
    addStoreTemplate(1, BATTLE_UNIT_CLASS_FOOTMAN1, 10 + i * 15, 75 + i * 35);
  }
  for (let i = 0; i < 5; i++) {
    addStoreTemplate(2, BATTLE_UNIT_CLASS_FOOTMAN1, 50 + i * 15, 100 + i * 45);
  }
  for (let i = 0; i < 4; i++) {
    addStoreTemplate(3, BATTLE_UNIT_CLASS_FOOTMAN1, 100 + i * 25, 100 + i * 55);
  }
  // addStoreTemplate(1, BATTLE_UNIT_CLASS_FOOTMAN1, 10, 75);
  // addStoreTemplate(1, BATTLE_UNIT_CLASS_FOOTMAN1, 25, 100);
  // addStoreTemplate(1, BATTLE_UNIT_CLASS_FOOTMAN1, 35, 110);
  // addStoreTemplate(1, BATTLE_UNIT_CLASS_FOOTMAN1, 50, 200);
  // addStoreTemplate(2, BATTLE_UNIT_CLASS_FOOTMAN1, 75, 225);
  // addStoreTemplate(2, BATTLE_UNIT_CLASS_FOOTMAN1, 75, 225);
  // addStoreTemplate(2, BATTLE_UNIT_CLASS_FOOTMAN1, 100, 250);
  // addStoreTemplate(2, BATTLE_UNIT_CLASS_FOOTMAN1, 125, 375);
  // addStoreTemplate(3, BATTLE_UNIT_CLASS_FOOTMAN1, 250, 500);

  const addEventUnitTemplate = (...[level, ...arr]) => {
    eventUnitTemplates.push([level, arr]);
  };
  const normalizeRand = (min: number, max: number) => {
    return roundToNearest5(normalize(rand(), 0, 1, min, max));
  };
  // level, [unit, stack]
  for (let i = 0; i < 4; i++) {
    // level 1
    addEventUnitTemplate(1, [BATTLE_UNIT_CLASS_KNIGHT1, normalizeRand(35, 65)]);
    addEventUnitTemplate(1, [
      BATTLE_UNIT_CLASS_FOOTMAN1,
      normalizeRand(35, 65),
    ]);
    addEventUnitTemplate(1, [BATTLE_UNIT_CLASS_ARCHER1, normalizeRand(35, 65)]);
    addEventUnitTemplate(1, [BATTLE_UNIT_CLASS_FIEND1, normalizeRand(35, 65)]);

    // level 2
    addEventUnitTemplate(2, [
      BATTLE_UNIT_CLASS_FIEND1,
      normalizeRand(100, 200),
    ]);
    addEventUnitTemplate(2, [
      BATTLE_UNIT_CLASS_LONGNECK,
      normalizeRand(50, 100),
    ]);
    addEventUnitTemplate(2, [BATTLE_UNIT_CLASS_FIEND3, normalizeRand(40, 60)]);
    addEventUnitTemplate(2, [
      BATTLE_UNIT_CLASS_KNIGHT2,
      normalizeRand(50, 100),
    ]);
    addEventUnitTemplate(2, [
      BATTLE_UNIT_CLASS_FOOTMAN2,
      normalizeRand(75, 125),
    ]);
    addEventUnitTemplate(2, [
      BATTLE_UNIT_CLASS_ARCHER2,
      normalizeRand(75, 125),
    ]);

    // level 3
    addEventUnitTemplate(3, [BATTLE_UNIT_CLASS_FIEND2, normalizeRand(25, 40)]);
    addEventUnitTemplate(3, [BATTLE_UNIT_CLASS_FIEND3, normalizeRand(50, 80)]);
    addEventUnitTemplate(3, [
      BATTLE_UNIT_CLASS_LONGNECK,
      normalizeRand(100, 175),
    ]);
    addEventUnitTemplate(2, [
      BATTLE_UNIT_CLASS_FOOTMAN2,
      normalizeRand(150, 175),
    ]);
    addEventUnitTemplate(3, [BATTLE_UNIT_CLASS_KNIGHT3, normalizeRand(50, 90)]);
    addEventUnitTemplate(3, [
      BATTLE_UNIT_CLASS_FOOTMAN3,
      normalizeRand(75, 100),
    ]);
    addEventUnitTemplate(3, [
      BATTLE_UNIT_CLASS_ARCHER3,
      normalizeRand(75, 125),
    ]);
  }

  addEventUnitTemplate(4, [BATTLE_UNIT_CLASS_MAGE1, 300]);
  addEventUnitTemplate(4, [BATTLE_UNIT_CLASS_FIEND3, 200]);
  addEventUnitTemplate(4, [BATTLE_UNIT_CLASS_FIEND2, 100]);

  storeUnitTemplates = shuffle(storeUnitTemplates);
  eventUnitTemplates = shuffle(eventUnitTemplates);
};

const initBattleUnitTemplates = () => {
  const createUnitTemplate = (
    // ...[
    classEnumId,
    label,
    sprInd,
    overrideRecord
    // ]
  ) => {
    const baseTemplate = {
      classEnumId,
      label,
      sprInd,
      [STAT_ATTACK]: 5,
      [STAT_ATTACK_VAR_PCT]: 0.5,
      [STAT_DEFENSE]: 0,
      [STAT_HEALTH]: 10,
      [STAT_MAX_HEALTH]: 10,
    };
    const obj = Object.assign(
      {
        ...baseTemplate,
      },
      overrideRecord
    );
    obj[STAT_MAX_HEALTH] = obj[STAT_HEALTH];

    battleUnitTemplates.set(classEnumId, obj);
  };
  const attack = STAT_ATTACK;
  const speed = STAT_SPEED;
  const defense = STAT_DEFENSE;
  const health = STAT_HEALTH;

  createUnitTemplate(BATTLE_UNIT_CLASS_FOOTMAN1, 'Militia', 20, {});
  createUnitTemplate(BATTLE_UNIT_CLASS_FOOTMAN2, 'Footmen', 21, {
    [attack]: 7,
    [defense]: 5,
    [health]: 25,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_FOOTMAN3, 'Champions', 22, {
    [attack]: 11,
    [defense]: 9,
    [health]: 45,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_ARCHER1, 'Archers', 28, {
    [speed]: 5,
    [health]: 8,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_ARCHER2, 'Crossbows', 29, {
    [attack]: 6,
    [speed]: 10,
    [health]: 8,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_ARCHER3, 'Arbalists', 30, {
    [attack]: 12,
    [speed]: 15,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_KNIGHT1, 'Scouts', 12, {
    [speed]: 3,
    [defense]: 1,
    [health]: 15,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_KNIGHT2, 'Knights', 13, {
    [attack]: 8,
    [speed]: 7,
    [defense]: 2,
    [health]: 40,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_KNIGHT3, 'Cavaliers', 14, {
    [attack]: 10,
    [speed]: 10,
    [defense]: 8,
    [health]: 50,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_MAGE1, 'Mages', 36, {
    [speed]: 16,
    [attack]: 12,
    [defense]: 4,
    [health]: 75,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_FIEND1, 'Goblins', 31, {
    [attack]: 4,
    [defense]: 1,
    [health]: 6,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_FIEND2, 'Beasts', 15, {
    [attack]: 12,
    [defense]: 5,
    [health]: 300,
    [speed]: 5,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_FIEND3, 'Skulls', 37, {
    [attack]: 15,
    [defense]: 3,
    [health]: 25,
    [speed]: 20,
  });
  createUnitTemplate(BATTLE_UNIT_CLASS_LONGNECK, 'Longnecks', 23, {
    [attack]: 10,
    [speed]: 4,
    [defense]: 5,
    [health]: 35,
  });
};

// unit class, stack size
export type UnitWithStackSize = [number, number];
export interface StoreTemplate {
  text: string;
  items?: number[];
  sprite: string;
  upg?: Point[];
  recruit?: [number, number, number][];
}
export interface EventTemplate {
  label: string;
  soundName?: string;
  dialog: {
    type: 'info' | 'store' | 'battle';
    title: string;
    text: string;
    sprite: string;
    onOk?: () => void;
    onCancel?: () => void;
  };
  store: StoreTemplate;
  battle: {
    units: UnitWithStackSize[];
    tileInd: number;
    hero?: number;
  };
}

const eventTable: Map<
  number,
  (game: Game, level: number, tileInd: number) => Partial<EventTemplate>
> = new Map();

export const removeEventAtTile = (game: Game, tileInd: number) => {
  const tile = game.map.tiles[tileInd];
  tile.event = undefined;
  tile.id = 1;
  tile.spr = 'ts_0';
};

export const getStatsDialogText = (stats: PartialStats) => {
  return Object.entries(stats)
    .map(([key, val]) => `${key.toUpperCase()}: ${val}`)
    .join(' ');
};

const initEventTable = () => {
  const spliceFirstOfLevel = (arr: any[][], level: number) => {
    let v;
    for (let i = 0; i < arr.length; i++) {
      const obj = arr[i];
      if (level === obj[0]) {
        v = [...obj.slice(1)] as any;
        arr.splice(i, 1);
        break;
      }
    }
    return v;
  };

  const DIALOG_INFO = 'info';

  eventTable.set(EVENT_BATTLE, (game, level, tileInd) => {
    const unitTemplates: UnitWithStackSize[][] = spliceFirstOfLevel(
      eventUnitTemplates,
      level
    );
    console.log('SET EVENT TABLE BATTLE', {
      label: 'Battle',
      battle: {
        tileInd,
        units: unitTemplates[0],
      },
    });
    return {
      label: 'Battle',
      soundName: 'ready_to_fight',
      battle: {
        tileInd,
        units: unitTemplates[0],
      },
    };
  });
  eventTable.set(EVENT_CHEST, (game, level, tileInd) => {
    const goldAmt = roundToNearest5(
      normalize(rand(), 0, 1, level * 20, level * 100)
    );
    return {
      label: 'Chest',
      soundName: 'gold',
      dialog: {
        type: DIALOG_INFO,
        title: 'Chest',
        sprite: 'ts_9',
        text: `You found ${goldAmt} <b>GOLD</b>!`,
        onOk: () => {
          removeEventAtTile(game, tileInd);
          game.pl.gold += goldAmt;
          console.log('chest opened');
        },
      },
    };
  });
  eventTable.set(EVENT_PRESENT, (game, level, tileInd) => {
    const itemId = giftItemTemplates.shift()!;
    const item = getItemTemplate(itemId);
    let statStr = '';
    if (item.stats) {
      statStr = getStatsDialogText(item.stats);
    }

    return {
      label: 'Present',
      soundName: 'item',
      dialog: {
        type: DIALOG_INFO,
        title: 'Present',
        sprite: 'ts_10',
        text: `You found: ${item.name}!  ${statStr}`,
        onOk: () => {
          removeEventAtTile(game, tileInd);
          game.pl.addItem(itemId);
        },
      },
    };
  });
  eventTable.set(EVENT_CASTLE, (game, level, tileInd) => {
    return {
      label: 'Castle',
      soundName: 'battle_win',
      dialog: {
        ...basicDialogEvent,
        text: `You made it!  You brought us the <b>Crown of Light</b> and the Kingdom is saved!`,
        onOk: () => {
          window.location.reload();
        },
      },
    };
  });
  eventTable.set(EVENT_VILLAGE, (game, level, tileInd) => {
    const items = [storeItemTemplates.shift()!, storeItemTemplates.shift()!];
    return {
      label: 'Village',
      soundName: 'visit_village',
      store: {
        text: 'You found a village! Need to buy or sell items?',
        items,
        sprite: 'ts_16',
        // upg: [],
        // recruit: [],
      },
    };
  });
  eventTable.set(EVENT_TOWER, (game, level, tileInd) => {
    const unitTemplate: UnitWithStackSize = spliceFirstOfLevel(
      storeUnitTemplates,
      level
    );
    console.log('SET EVENT TABLE TOWER', unitTemplate, level);
    return {
      label: 'Tower',
      soundName: 'visit_village',
      store: {
        text: 'The Tower can provide you with fresh recruits.',
        sprite: 'ts_17',
        // upg: [],
        recruit: [[...unitTemplate, 10]] as any,
      },
    };
  });
  // eventTable.set(EVENT_WELL, (game, level, tileInd) => {
  //   return {
  //     label: 'Well',
  //     dialog: {
  //       type: DIALOG_INFO,
  //       title: 'Well',
  //       sprite: 'ts_18',
  //       text: 'The well rejuvenates your mana!',
  //       onOk: () => {
  //         // removeEventAtTile(game, tileInd);
  //       },
  //     },
  //   };
  // });
  eventTable.set(EVENT_OBELISK, (game, level, tileInd) => {
    const expAmt = roundToNearest5(
      normalize(rand(), 0, 1, level * 50, level * 100)
    );
    return {
      label: 'Obelisk',
      soundName: 'exp',
      dialog: {
        type: DIALOG_INFO,
        title: 'Obelisk',
        sprite: 'ts_24',
        text: `The obelisk grants you ${expAmt} experience!`,
        onOk: () => {
          removeEventAtTile(game, tileInd);
          const [numLevelsGained, prevStats, newStats] = game.pl.addExp(expAmt);
          let statDiffText = '';
          if (prevStats) {
            statDiffText = Object.entries(newStats)
              .map(([key, val]) => {
                const prevVal = prevStats[key];
                const diff = val - prevVal;
                if (diff > 0) {
                  return `${key.toUpperCase()}: ${val} (+${diff})`;
                }
              })
              .filter((s) => s)
              .join('<br/>');
          }
          const levelUpText = numLevelsGained
            ? `You gained ${numLevelsGained} level(s)!<br/>${statDiffText}`
            : '';
          if (levelUpText) {
            // levelUpText +=
            game.doEvent({
              soundName: 'gain_level',
              dialog: {
                type: DIALOG_INFO,
                title: 'Level Up!',
                sprite: 'ts_4',
                text: `${levelUpText}`,
                onOk: () => {},
              },
            });
          }
        },
      },
    };
  });

  const TITLE_TIME = 'Time is of the Essence';
  const basicDialogEvent = {
    type: DIALOG_INFO as any,
    title: TITLE_TIME,
    sprite: 'ts_4',
  };
  eventTable.set(EVENT_DAY1, (game, level, tileInd) => {
    return {
      soundName: 'new_turn',
      dialog: {
        ...basicDialogEvent,
        text: `The first day is done, and 12 days remain. Is there still enough time? The Kingdom is counting on you.`,
      },
    };
  });
  eventTable.set(EVENT_DAY_N, (game, level, tileInd) => {
    return {
      soundName: 'new_turn',
      dialog: {
        ...basicDialogEvent,
        text: `Dawn of the next day... ${
          13 - game.pl.day
        } days remain to save the kingdom.`,
      },
    };
  });
  eventTable.set(EVENT_DAY13, (game, level, tileInd) => {
    return {
      soundName: 'blip',
      dialog: {
        ...basicDialogEvent,
        text: `Dawn of the FINAL day. You MUST save the Kingdom by day's end or all is lost.`,
      },
    };
  });
  eventTable.set(EVENT_DAY_LOSS, (game, level, tileInd) => {
    return {
      soundName: 'fight',
      dialog: {
        ...basicDialogEvent,
        text: `You have failed to save the Kingdom. We are lost.`,
        onOk: () => {
          window.location.reload();
        },
      },
    };
  });

  eventTable.set(EVENT_DAY_START, (game, level, tileInd) => {
    return {
      dialog: {
        ...basicDialogEvent,
        text: `Hero! The kingdom is in peril!<br><br> You have 13 days to bring the <b>Crown of Light</b> to the capital city in the EAST.  The land is in chaos, and many of evil intent will try to stop you, but you must persevere.<br><br>If you fail in your quest, we will be lost.  Godspeed.`,
        onOk: () => {
          playSound('new_turn');
        },
      },
    };
  });

  // eventTable.set(EVENT_DAY_WIN, (game, level, tileInd) => {
  //   return {
  //     soundName: 'battle_win',
  //     dialog: {
  //       ...basicDialogEvent,
  //       text: `You made it!  You brought us the <b>Crown of Light</b> and the kingdom is saved!`,
  //     },
  //   };
  // });
};
