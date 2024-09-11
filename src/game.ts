import {
  activateLoopAnimWithTimer,
  createLoopAnimWithTimer,
  LoopAnimWithTimer,
  updateLoopAnimWithTimer,
} from './anim';
import { AutomatedController } from './automatedController';
import {
  BattleHero,
  BattleSimulation,
  calculateUnitRating,
} from './battleSimulation';
import {
  BattleUnit,
  createBattleUnit,
  createBattleUnitFromTemplate,
  STAT_ATTACK,
  STAT_DEFENSE,
  STAT_SPEED,
} from './battleUnit';
import {
  BATTLE_UNIT_CLASS_ARCHER1,
  BATTLE_UNIT_CLASS_ARCHER2,
  BATTLE_UNIT_CLASS_FOOTMAN1,
  EVENT_DAY_LOSS,
  EVENT_DAY_START,
  EventTemplate,
  getEventTemplate,
  getItemTemplate,
  getMapTemplate,
  getTilePathCost,
  getUnitTemplate,
  LootId,
  removeEventAtTile,
  UnitWithStackSize,
} from './db';
import { createDialogWindow } from './dialogWindow';
import { drawRect, drawSprite, drawText, DrawTextParams, getCtx } from './draw';
import { focusOn, getPanZoom, lookAt } from './events';
import { getIndOfLastMoveableTile, playSound, Point, Timer } from './utils';
import { rand } from './zzfx';

export const getGame = (): Game => {
  return (window as any).game;
};

const tileIdToSpriteName = (id: number) => {
  return 'ts_' + (id - 1);
};

const getStackSizeAndRating = (
  unitNumbers: [number, number],
  hero: BattleHero
) => {
  const [unitClassId, stackSize] = unitNumbers;
  const unitTemplate = getUnitTemplate(unitClassId);
  const unit = createBattleUnitFromTemplate(unitTemplate, stackSize);
  const rating = calculateUnitRating(unit, { hero });
  return [rating, stackSize] as const;
};

const getTransform = () => {
  const panZoom = getPanZoom();
  return {
    x: panZoom.translateX,
    y: panZoom.translateY,
    scale: panZoom.scale,
  };
};

const getBattleDefFromEvent = (
  event: Partial<EventTemplate>,
  playerUnits: UnitWithStackSize[]
) => {
  if (!event.battle) {
    return;
  }

  const units: BattleUnit[] = [];
  const plUnits: BattleUnit[] = [];

  for (const [unitClassId, stackSize] of event.battle.units) {
    const t = getUnitTemplate(unitClassId);
    const battleUnit = createBattleUnitFromTemplate(t, stackSize);
    units.push(battleUnit);
  }
  for (const [unitClassId, stackSize] of playerUnits) {
    const t = getUnitTemplate(unitClassId);
    const battleUnit = createBattleUnitFromTemplate(t, stackSize);
    plUnits.push(battleUnit);
  }
  return {
    units,
    plUnits,
    hero: undefined,
  };
};

const stats = [STAT_ATTACK, STAT_DEFENSE, STAT_SPEED];

export class Player {
  x: number;
  y: number;
  flipped = false;
  path: Point[] = [];
  pathTarget: number | undefined;
  showPath = false;
  color = 'blue';
  flagAnim = createLoopAnimWithTimer(100, Infinity, 2);
  unit: [number, number];
  gold = 100;
  level = 0;
  exp = 0;
  spells: string[] = [];
  items: number[] = [];
  dayGauge = new Timer(20);
  day = 0;
  previewCost = 0;
  hero: BattleHero = {
    [STAT_ATTACK]: 0,
    [STAT_DEFENSE]: 0,
    [STAT_SPEED]: 0,
    // magicPower: 0,
    // mana: 10,
    // maxMana: 10,
  };
  constructor() {
    this.x = 5;
    this.y = 9;
    this.dayGauge.start();

    this.unit = [BATTLE_UNIT_CLASS_FOOTMAN1, 50];

    activateLoopAnimWithTimer(this.flagAnim);
  }
  updateDayGauge(cost: number) {
    const dg = this.dayGauge;
    const { s, ms } = dg;
    // let updateVal = cost;
    // if (cost + s > ms) {
    //   updateVal = ms - s;
    //   cost -= updateVal;
    // }
    dg.update(cost);
    if (dg.isDone()) {
      this.day++;
      dg.s = dg.s % ms;
      console.log('UPDATE DAY GUAGE', cost, s, ms);
      return true;
    }
    return false;
  }

  addExp(exp: number) {
    let expDiff = exp + this.exp;
    let numLevelsGained = 0;
    const getNextThreshold = (level: number) => (level + 1) * 100 * 1.25;
    const originalStats = { ...this.hero };
    const levelUp = () => {
      for (const stat of stats) {
        this.hero[stat] += rand() > 0.25 ? 1 : 0;
      }
    };
    let nextThreshold = getNextThreshold(this.level);
    while (expDiff >= nextThreshold) {
      const expToNextLevel = this.exp - nextThreshold;
      this.exp += expToNextLevel;
      exp -= expToNextLevel;
      expDiff = exp + this.exp;
      this.level++;
      nextThreshold = getNextThreshold(this.level);
      numLevelsGained++;
      levelUp();
    }
    this.exp += exp;
    return [numLevelsGained, originalStats, this.hero] as const;
  }

  addItem(itemId: number) {
    this.items.push(itemId);
    const item = getItemTemplate(itemId);
    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      let bonus = 0;
      if (item.stats) {
        bonus += item.stats[stat] ?? 0;
        console.log('ADD BONUS STAT', stat, bonus);
      }
      this.hero[stat] += bonus;
    }
  }
  removeItem(itemId: number) {
    const ind = this.items.indexOf(itemId);
    if (ind > -1) {
      this.items.splice(ind, 1);
      for (let i = 0; i < stats.length; i++) {
        const stat = stats[i];
        let bonus = 0;
        const item = getItemTemplate(itemId);
        if (item.stats) {
          bonus += item.stats[stat] ?? 0;
        }
        this.hero[stat] -= bonus;
      }
    }
  }

  update(dt: number) {
    updateLoopAnimWithTimer(this.flagAnim, dt);
  }

  draw(x: number, y: number, scale: number) {
    drawSprite('ts_4' + (this.flipped ? '_f' : ''), x, y, scale);
    drawSprite(
      'ts_' + (25 + this.flagAnim.ind) + '_f',
      x - 4 * scale,
      y - 6 * scale,
      scale
    );
  }
}

export class HexTile {
  id: number;
  ind: number;
  x: number;
  y: number;
  spr: string;
  event: Partial<EventTemplate> | undefined;

  eventUsed = false;

  battleAnim = createLoopAnimWithTimer(500, Infinity, 1);

  px: number;
  py: number;
  // particle etc

  constructor() {
    activateLoopAnimWithTimer(this.battleAnim);
  }

  update(dt: number) {
    updateLoopAnimWithTimer(this.battleAnim, dt);
  }

  draw(
    x: number,
    y: number,
    scale: number,
    drawBlack = false,
    flagAnim: LoopAnimWithTimer
  ) {
    this.px = x;
    this.py = y;
    if (drawBlack) {
      drawSprite('ts_39', x, y, scale);
      return;
    }
    drawSprite(this.spr, x, y, scale);
    if (this.event?.battle) {
      const [unitClassId] = this.event.battle.units[0];
      const unit = getUnitTemplate(unitClassId);

      let yOffset = 0;
      if (this.battleAnim.ind) {
        yOffset = -1 * scale;
      }
      drawSprite('ts_' + unit.sprInd + '_r_f', x, y + yOffset, scale);
    }
    if (this.eventUsed) {
      drawSprite(
        'ts_' + (25 + flagAnim.ind) + '_r',
        x + scale / 2,
        y - 7 * scale,
        scale
      );
    }
  }
}

export class WorldMap {
  w: number;
  h: number;
  name: string;
  tiles: HexTile[] = [];
  fog: boolean[] = [];

  constructor(game: Game, mapName: string) {
    this.name = mapName;
    const mapTemplate = getMapTemplate(mapName);
    this.w = mapTemplate.width;
    this.h = mapTemplate.height;
    for (let i = 0; i < this.w * this.h; i++) {
      const hexTile = new HexTile();
      hexTile.id = mapTemplate.data[i];
      hexTile.spr = tileIdToSpriteName(hexTile.id);
      hexTile.ind = i;
      hexTile.x = i % this.w;
      hexTile.y = Math.floor(i / this.w);
      const eventObj = mapTemplate.events.get(i);
      if (eventObj) {
        const [eventEnumId, eventLevel] = eventObj;
        const createEventTemplate = getEventTemplate(eventEnumId);
        hexTile.event = createEventTemplate(game, eventLevel, i);
      }
      this.tiles.push(hexTile);
    }
    this.fog = new Array(this.w * this.h).fill(true);
  }

  translateCtx(ctx: CanvasRenderingContext2D) {
    const { x, y, scale } = getTransform();
    // console.log('translate ctx', x, y);
    const newScale = scale * 1;
    const canvas = ctx.canvas;
    const tileSize = 16;
    const mapWidth = this.w;
    const mapHeight = this.h;

    const focalX = canvas.width / 2;
    const focalY = canvas.height / 2;

    const offsetX = focalX - (newScale / scale) * (focalX - x);
    const offsetY = focalY - (newScale / scale) * (focalY - y);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    // ctx.translate(
    //   (canvas.width * newScale) / 2,
    //   (canvas.height * newScale) / 2
    // );
    // ctx.translate(
    //   -(mapWidth * tileSize * newScale) / 2,
    //   -(mapHeight * tileSize * newScale) / 2
    // );
  }

  determineVision([x, y]: Point) {
    const range = 3;
    for (let i = -range; i <= range; i++) {
      for (let j = -range; j <= range; j++) {
        const tx = x + i;
        const ty = y + j;
        if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) {
          this.fog[ty * this.w + tx] = false;
        }
      }
    }
  }

  update(dt: number) {
    for (const tile of this.tiles) {
      tile.update(dt);
    }
  }

  draw(pl: Player, game: Game) {
    this.translateCtx(getCtx());
    const { scale } = getTransform();
    const tileSize = 16;
    const newScale = scale * 1;
    const mapWidth = this.w;
    const mapHeight = this.h;
    let plDrawX = -1;
    let plDrawY = -1;

    for (let y = 0; y < mapHeight; y++) {
      const isOffset = y % 2 === 1;
      const offsetAmount = isOffset ? tileSize / 2 : 0;
      for (let x = 0; x < mapWidth; x++) {
        const tileIndex = y * mapWidth + x;
        const refTile = this.tiles[tileIndex];
        const drawX = (x * tileSize + offsetAmount) * newScale;
        const drawY = y * ((tileSize * 3) / 4) * newScale;
        refTile.draw(drawX, drawY, newScale, this.fog[tileIndex], pl.flagAnim);

        // debug
        // drawText(
        //   refTile.x + ',' + refTile.y,
        //   // getTilePathCost(refTile.id) + '',
        //   drawX + 8 * newScale,
        //   drawY + 16 * newScale - 4 * newScale,
        //   {
        //     color: 'white',
        //     size: 8,
        //   }
        // );

        if (pl.showPath) {
          const ind = pl.path.findIndex(([px, py]) => px === x && py === y);
          if (ind > -1) {
            let outerColor = 'white';
            const lastI = getIndOfLastMoveableTile(pl.path, game);
            if (ind > lastI) {
              outerColor = 'black';
            }
            // maybe just a sprite here saves space...
            let rectSz = 8;
            drawRect(
              drawX + 8 * newScale - rectSz / 2,
              drawY + 8 * newScale - rectSz / 2,
              rectSz,
              rectSz,
              outerColor
            );
            rectSz = 4;
            drawRect(
              drawX + 8 * newScale - rectSz / 2,
              drawY + 8 * newScale - rectSz / 2,
              rectSz,
              rectSz,
              ind === pl.path.length - 1
                ? refTile.event?.battle
                  ? 'red'
                  : outerColor
                : 'green'
            );
          }
        }
        if (pl.x === x && pl.y === y) {
          plDrawX = drawX;
          plDrawY = drawY;
        }
      }
      if (plDrawX > 0 && plDrawY > 0) {
        pl.draw(plDrawX, plDrawY, newScale);
      }
    }
    getCtx().restore();
  }
}

export class Game {
  map: WorldMap;
  sim: BattleSimulation | undefined;
  pl: Player = new Player();
  ac = new AutomatedController();

  hovTile: HexTile | undefined;

  constructor() {
    this.map = new WorldMap(this, 'map');
    this.map.determineVision([this.pl.x, this.pl.y]);
    this.pl.addItem(0);
    getPanZoom().scale = 4;
    lookAt(this.pl.x * 16 * 4, this.pl.y * 16 * 4);
    this.doEvent(getEventTemplate(EVENT_DAY_START)(this, 0, 0));
  }

  areInputEventsDisabled() {
    return (
      !!this.ac.getCurrent() ||
      !!this.sim ||
      !!document.getElementById('dialog')
    );
  }

  doEvent(event: Partial<EventTemplate>) {
    console.log('Do event', event.label);
    if (event.soundName) {
      playSound(event.soundName);
    }
    getPanZoom().isDragging = false;
    if (event.battle) {
      const battleDef = getBattleDefFromEvent(event, [this.pl.unit])!;
      // for (const u of battleDef.plUnits) {
      //   u[0].hero = this.pl.hero;
      //   // Do these go on units or heroes?  Heroes, right?
      //   // for (const itemId of this.pl.items) {
      //   //   const item = getItemTemplate(itemId);
      //   //   if (item.stats) {
      //   //     for (const stat in item.stats) {
      //   //       u[0][stat] += item.stats[stat];
      //   //     }
      //   //   }
      //   // }
      // }
      const sim = new BattleSimulation(
        battleDef.plUnits.map((u) => u),
        battleDef.units.map((u) => u),
        this.pl.hero
      );
      console.log('NEW BATTLE SIM', sim, battleDef);
      const d = createDialogWindow(
        'battle',
        {
          sim,
        },
        this
      );
      const ind = (event.battle as any).tileInd;
      const tile = this.map.tiles[ind];
      lookAt(tile.px, tile.py);
      this.sim = sim;
      sim.onCompleted = (c: 'win' | 'lose' | 'retreat') => {
        this.sim = undefined;
        // const ind = (event.battle as any).tileInd;
        if (c === 'win') {
          removeEventAtTile(this, ind);
          this.pl.unit[1] = sim.leftDepict.stackSize;
          playSound('blip');
        }
        if (c === 'retreat') {
          const secondLastPath = this.pl.path[this.pl.path.length - 2];
          this.pl.x = secondLastPath[0];
          this.pl.y = secondLastPath[1];
        }
        // const tile = this.map.tiles[ind];
        // lookAt(tile.px, tile.py);
        if (c === 'lose') {
          this.doEvent(getEventTemplate(EVENT_DAY_LOSS)(this, 0, 0));
        }
        console.log('battle concluded.', c);
      };
      d.show();
    }
    if (event.dialog) {
      const d = createDialogWindow(
        event.dialog.type,
        {
          title: event.dialog.title,
          text: event.dialog.text,
          sprite: event.dialog.sprite,
          onOk: event.dialog.onOk,
        },
        this
      );
      d.show();
    }
    if (event.store) {
      const d = createDialogWindow(
        'store',
        {
          title: 'Vendor',
          store: event.store,
          onOk: () => void 0,
        },
        this
      );
      d.show();
    }
  }

  update(dt: number) {
    this.ac.update(dt);
    this.pl.update(dt);
    this.map.update(dt);
    if (this.sim) {
      this.sim.update(dt);
    }
  }
  draw() {
    const drawPlayerInfo = () => {
      const ctx = getCtx();
      const x = 50;
      const y = ctx.canvas.height - 250;
      const lineHeight = 18;
      const textParams: Partial<DrawTextParams> = {
        align: 'left',
        size: 16,
      };
      for (let i = 0; i < this.pl.items.length; i++) {
        const itemId = this.pl.items[i];
        const item = getItemTemplate(itemId);
        drawText(item.name, x, y + lineHeight * -1 * (i + 2), textParams);
      }
      drawText('Gold: ' + this.pl.gold, x + 32, y + lineHeight * 0, textParams);
      drawSprite('ts_18', x - 22, y + lineHeight * 0 - 33, 4);
      drawText(
        'Level: ' + (this.pl.level + 1),
        x,
        y + lineHeight * 2,
        textParams
      );
      const stats = [STAT_ATTACK, STAT_DEFENSE, STAT_SPEED];
      for (let i = 0; i < stats.length; i++) {
        const stat = stats[i];
        drawText(
          stat.toUpperCase() + ': ' + this.pl.hero[stat],
          x,
          y + lineHeight * (i + 3),
          textParams
        );
      }

      // const [unitClassId, stackSize] = this.pl.unit;
      // const unitTemplate = getUnitTemplate(unitClassId);
      // const unit = createBattleUnitFromTemplate(unitTemplate, stackSize);
      // const rating = calculateUnitRating(unit, { hero: this.pl.hero });
      const [rating, stackSize] = getStackSizeAndRating(
        this.pl.unit,
        this.pl.hero
      );
      const xx = x;
      const yy = y + lineHeight * 7;

      drawText('Troop Rating: ' + rating, x, yy - 16, {
        align: 'left',
      });
      drawSprite('ts_4', xx, yy, 4);
      drawText(stackSize + '', xx + 42, yy + 16 * 4);

      // const rectSize = 14;
      const drawDays = (x: number, y: number) => {
        const rectHeight = 16;
        const rectWidth = 200;
        const rectInnerPadding = 2;
        const rectOffset = 16;
        drawText('Day: ' + (this.pl.day + 1) + '/13', x, y, {
          align: 'left',
          // size: 16,
          // color: 'white',
        });
        drawRect(
          x - rectInnerPadding,
          y + rectOffset,
          rectWidth,
          rectHeight,
          'black'
        );
        const maxRectWidth = rectWidth - rectInnerPadding * 2;
        drawRect(
          x - rectInnerPadding + rectInnerPadding,
          y + rectOffset + rectInnerPadding,
          maxRectWidth * (1 - this.pl.dayGauge.pct()),
          rectHeight - rectInnerPadding * 2,
          'grey'
        );
        const lastS = this.pl.dayGauge.s;
        this.pl.dayGauge.s = lastS + this.pl.previewCost;
        const previewPct = this.pl.dayGauge.pct();
        this.pl.dayGauge.s = lastS;
        drawRect(
          x - rectInnerPadding + rectInnerPadding,
          y + rectOffset + rectInnerPadding,
          maxRectWidth * (1 - previewPct),
          rectHeight - rectInnerPadding * 2,
          'white'
        );
      };
      drawDays(x, 40);
    };

    this.map.draw(this.pl, this);
    drawPlayerInfo();

    if (this.sim) {
      this.sim.draw();
    }

    if (this.hovTile && !this.map.fog[this.hovTile.ind]) {
      let text = this.hovTile.event?.label ?? '';
      let text2 = '';
      let text1Color = 'white';
      const { scale } = getTransform();
      this.map.translateCtx(getCtx());
      if (this.hovTile.x === this.pl.x && this.hovTile.y === this.pl.y) {
        const [plRating] = getStackSizeAndRating(this.pl.unit, this.pl.hero);
        text2 = 'Heros Army (' + this.pl.unit[1] + ')';
        text = 'Troop Rating: ' + plRating;
      }
      if (text) {
        if (this.hovTile.event?.battle) {
          const def = getBattleDefFromEvent(this.hovTile.event, [])!;
          text +=
            ': ' +
            def.units.map((u) => u.label + ` (${u.stackSize})`).join(', ');
          const rating = calculateUnitRating(def.units[0], {});
          text2 = 'Troop Rating: ' + rating;
          const tmp = text2;
          text2 = text;
          text = tmp;

          const [plRating] = getStackSizeAndRating(this.pl.unit, this.pl.hero);

          if (rating > plRating) {
            text1Color = '#F33';
          } else if (rating < plRating) {
            text1Color = '#3F3';
          }
        }
        drawText(text, this.hovTile.px + (16 / 2) * scale, this.hovTile.py, {
          color: text1Color,
        });
        if (text2) {
          drawText(
            text2,
            this.hovTile.px + (16 / 2) * scale,
            this.hovTile.py - 16
          );
        }
      }
      getCtx().restore();
    }
  }
}
// (window as any).game = new Game();
