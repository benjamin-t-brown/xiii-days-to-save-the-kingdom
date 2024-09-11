import {
  activateLoopAnimWithTimer,
  createLoopAnimWithTimer,
  deactivateLoopAnimWithTimer,
  LoopAnimWithTimer,
  updateLoopAnimWithTimer,
} from './anim';
import {
  AutomatedController,
  createdAutomatedControl,
} from './automatedController';
import { BattleHero } from './battleSimulation';
import {
  BATTLE_UNIT_CLASS_ARCHER1,
  BATTLE_UNIT_CLASS_ARCHER2,
  BATTLE_UNIT_CLASS_ARCHER3,
  BATTLE_UNIT_CLASS_FIEND1,
  BATTLE_UNIT_CLASS_FIEND2,
  BATTLE_UNIT_CLASS_FIEND3,
  BATTLE_UNIT_CLASS_FOOTMAN1,
  BATTLE_UNIT_CLASS_FOOTMAN2,
  BATTLE_UNIT_CLASS_FOOTMAN3,
  BATTLE_UNIT_CLASS_KNIGHT1,
  BATTLE_UNIT_CLASS_KNIGHT2,
  BATTLE_UNIT_CLASS_KNIGHT3,
  BATTLE_UNIT_CLASS_LONGNECK,
  BATTLE_UNIT_CLASS_MAGE1,
  BattleUnitTemplate,
} from './db';
import { drawRect, drawText } from './draw';
import {
  createRenderObject,
  drawRenderObject,
  RenderObject,
} from './renderObject';
import { COLOR_SEMI_TRANSPARENT, dist, Point, Rect, Timer } from './utils';

export const isFootman = (unitClassId: number) => {
  return [
    BATTLE_UNIT_CLASS_FOOTMAN1,
    BATTLE_UNIT_CLASS_FOOTMAN2,
    BATTLE_UNIT_CLASS_FOOTMAN3,
  ].includes(unitClassId);
};
export const isArcher = (unitClassId: number) => {
  return [
    BATTLE_UNIT_CLASS_ARCHER1,
    BATTLE_UNIT_CLASS_ARCHER2,
    BATTLE_UNIT_CLASS_ARCHER3,
  ].includes(unitClassId);
};
export const isKnight = (unitClassId: number) => {
  return [
    BATTLE_UNIT_CLASS_KNIGHT1,
    BATTLE_UNIT_CLASS_KNIGHT2,
    BATTLE_UNIT_CLASS_KNIGHT3,
  ].includes(unitClassId);
};
export const isEvil = (unitClassId: number) => {
  return [
    BATTLE_UNIT_CLASS_FIEND1,
    BATTLE_UNIT_CLASS_FIEND2,
    BATTLE_UNIT_CLASS_FIEND3,
    BATTLE_UNIT_CLASS_LONGNECK,
  ].includes(unitClassId);
};
export const isMagical = (unitClassId: number) => {
  return [BATTLE_UNIT_CLASS_MAGE1].includes(unitClassId);
};

// const attack = 'attack';
// const defense = 'defense';
// const health = 'health';
// const maxHealth = 'maxHealth';
// const speed = 'speed';
// const attackVarPct = 'attackVarPct';
export const STAT_ATTACK = 'att',
  STAT_DEFENSE = 'def',
  STAT_HEALTH = 'hp',
  STAT_MAX_HEALTH = 'mhp',
  STAT_SPEED = 'spd',
  STAT_ATTACK_VAR_PCT = 'avp';

type BattleUnitOwner = 'player' | 'cpu';

interface AnimationSubState {
  vBump: LoopAnimWithTimer;
  hBump: LoopAnimWithTimer;
  flicker: LoopAnimWithTimer;
}

const createAnimationSubState = (): AnimationSubState => {
  return {
    vBump: createLoopAnimWithTimer(50, 100, 1),
    hBump: createLoopAnimWithTimer(75, 75 * 3, 1),
    flicker: createLoopAnimWithTimer(100, 300, 1),
  };
};

export interface StatContext {
  attacker?: BattleUnit;
  victim?: BattleUnit;
  hero?: BattleHero;
  statuses?: string[];
}

export interface BattleUnit {
  classId: number;
  spr: string;
  label: string;
  pos: Point;

  stackSize: number;
  att: number;
  avp: number;
  def: number;
  hp: number;
  mhp: number;
  spd: number;

  owner: BattleUnitOwner;
  hero?: BattleHero;
  animState: AnimationSubState;
  visible: boolean;
  defeated: boolean;
  ro: RenderObject;
  ac: AutomatedController;

  flagAttack: BattleUnit | undefined;

  setPos(x: number, y: number): void;
  getBounds: () => Rect;
  getStat: (statName: keyof BattleUnit, context: StatContext) => number;
  // setWalkTarget: (target: Point) => void;
  // getPxRange: () => number;

  update: (dt: number) => void;
  draw: (ctx: CanvasRenderingContext2D, showSpeed?: any) => void;
}

export const createBattleUnitFromTemplate = (
  t: BattleUnitTemplate,
  stackSize: number
): BattleUnit => {
  const unit = createBattleUnit(t.classEnumId);
  unit.stackSize = stackSize;
  Object.assign(unit, t);
  unit.spr = 'ts_' + t.sprInd;
  unit.ro.sprite = unit.spr;
  return unit;
};

export const createBattleUnit = (
  classId: number = BATTLE_UNIT_CLASS_FOOTMAN1
): BattleUnit => {
  const ro = createRenderObject();

  const battleUnitVars: any = {
    classId,
    label: 'Footman',
    stackSize: 0,
    spr: 'ts_20',
    pos: [0, 0] as Point,
    // range: 1,
    hero: undefined as BattleHero | undefined,
    owner: 'player' as BattleUnitOwner,
    visible: true,
    defeated: false,
    flagAttack: undefined as BattleUnit | undefined,
    animState: createAnimationSubState(),
    ac: new AutomatedController(),
    ro,
  };
  battleUnitVars[STAT_ATTACK] = 1;
  battleUnitVars[STAT_DEFENSE] = 1;
  battleUnitVars[STAT_HEALTH] = 1;
  battleUnitVars[STAT_MAX_HEALTH] = 1;
  battleUnitVars[STAT_SPEED] = 1;
  battleUnitVars[STAT_ATTACK_VAR_PCT] = 0;

  // console.log('created vars', battleUnitVars);
  ro.sprite = battleUnitVars.spr;

  // let walkTarget: Point | undefined;
  // let attackTimer = new Timer(1000);
  // const aiWalkTimer = new Timer(1000);
  // aiWalkTimer.start();
  // aiWalkTimer.s = 1000;

  // const restartAttackTimer = () => {
  //   // (Base Attack Speed + Attack Speed Bonuses) / (100 * Base Attack Time)
  //   const attacksPerMSecond =
  //     (100 +
  //       cl.getStat('atSpeed', {
  //         hero: cl.hero,
  //       })) /
  //     (100 * 1000);
  //   attackTimer = new Timer(1 / attacksPerMSecond);
  //   attackTimer.start();
  // };

  // const attackUnit = (target: BattleUnit) => {
  //   // const ms = 300 / cl.getStat('atSpeed', {});
  //   const ms = 300;
  //   cl.ac.addAutomatedControl(
  //     createdAutomatedControl(
  //       ms,
  //       () => {
  //         cl.animState.hBump.timer.ms = ms;
  //         activateLoopAnimWithTimer(cl.animState.hBump);
  //       },
  //       () => {
  //         cl.flagAttack = target;
  //         restartAttackTimer();
  //       }
  //     )
  //   );
  // };

  // const getClosestUnitAndDist = (enemyUnits: BattleUnit[]) => {
  //   let closestUnit: BattleUnit | undefined;
  //   let closestDist = Infinity;
  //   for (const enemyUnit of enemyUnits) {
  //     const d = dist(cl.pos, enemyUnit.pos);
  //     if (d < closestDist) {
  //       closestDist = d;
  //       closestUnit = enemyUnit;
  //     }
  //   }
  //   return [closestUnit as BattleUnit, closestDist as number] as const;
  // };

  const battleUnitFuncs = {
    setPos(x: number, y: number) {
      cl.pos = [x, y];
      cl.ro.x = x;
      cl.ro.y = y;
    },
    getBounds: (): Rect => {
      return [cl.ro.x, cl.ro.y, 64, 64];
    },
    // getPxRange: () => {
    //   return cl.getStat('range', {}) * 64;
    // },
    getStat: (statName: keyof BattleUnit, context: StatContext) => {
      const heroBonus = context.hero?.[statName] ?? 0;
      const base = Number(cl[statName]);

      const bonus = 0;
      // if (statName === 'attack') {
      //   if (cl === context.attacker && context.victim) {
      //     const attackerClassName = cl.classId;
      //     const victimClassName = context.victim.classId;
      //     if (isArcher(attackerClassName) && isFootman(victimClassName)) {
      //       bonus = 2;
      //     }
      //     if (isFootman(attackerClassName) && isKnight(victimClassName)) {
      //       bonus = 2;
      //     }
      //     if (isKnight(attackerClassName) && isArcher(victimClassName)) {
      //       bonus = 2;
      //     }
      //   }
      // }
      // if (statName === 'defense') {
      //   if (cl === context.victim && context.attacker) {
      //     const attackerClassName = context.attacker.classId;
      //     const victimClassName = cl.classId;
      //     if (isMagical(attackerClassName)) {
      //       return 0;
      //     }
      //   }
      // }

      return Math.max(0, base + heroBonus + bonus);
    },
    // setWalkTarget: (target: Point) => {
    //   walkTarget = target;
    //   activateLoopAnimWithTimer(cl.animState.vBump);
    // },
    update: (dt: number) => {
      cl.ac.update(dt);
      // attackTimer.update(dt);

      // if (walkTarget) {
      //   const [x, y] = cl.pos;
      //   const [tx, ty] = walkTarget;
      //   const dx = tx - x;
      //   const dy = ty - y;
      //   // const d = dist([dx, 0], [dy, 0]); //Math.sqrt(dx * dx + dy * dy);
      //   const d = Math.sqrt(dx * dx + dy * dy);
      //   if (d < 5) {
      //     walkTarget = undefined;
      //     deactivateLoopAnimWithTimer(cl.animState.vBump);
      //     // cl.animState.vBump.active = false;
      //   } else {
      //     const speed = cl.getStat('speed', {});
      //     const fm = dt / 100;
      //     cl.setPos(x + (dx / d) * speed * fm, y + (dy / d) * speed * fm);
      //   }
      // }

      // aiWalkTimer.update(dt);
      // if (cl.owner === 'cpu') {
      //   if (aiWalkTimer.isDone()) {
      //     aiWalkTimer.start();
      //     const [closestUnit, closestDist] = getClosestUnitAndDist(enemyUnits);
      //     if (closestDist > cl.getPxRange()) {
      //       cl.setWalkTarget(closestUnit.pos);
      //     }
      //   }
      // }

      // if (attackTimer.isDone() && !cl.ac.currentControl) {
      //   const [closestUnit, closestDist] = getClosestUnitAndDist(enemyUnits);
      //   const range = cl.getPxRange();
      //   const canAttack = closestDist <= range;
      //   if (canAttack) {
      //     attackUnit(closestUnit);
      //   }
      // }

      // updateLoopAnimWithTimer(cl.animState.vBump, dt);
      // if (cl.animState.vBump.active) {
      //   cl.ro.offsetY = !cl.animState.vBump.ind ? -4 : 0;
      // } else {
      //   cl.ro.offsetY = 0;
      // }
      updateLoopAnimWithTimer(cl.animState.hBump, dt);
      if (cl.animState.hBump.active) {
        const mult = cl.ro.flipped ? -1 : 1;
        cl.ro.offsetX = (!cl.animState.hBump.ind ? -4 : 0) * mult;
      } else {
        cl.ro.offsetX = 0;
      }
      updateLoopAnimWithTimer(cl.animState.flicker, dt);
      if (cl.animState.flicker.active) {
        cl.visible = !!cl.animState.flicker.ind;
      } else {
        cl.visible = true;
      }
    },
    draw: (ctx: CanvasRenderingContext2D, showSpeed?: any) => {
      if (!cl.visible || cl.defeated) {
        return;
      }
      drawRenderObject(cl.ro, ctx);
      // if (isSelected) {
      //   drawRect(
      //     cl.ro.x,
      //     cl.ro.y,
      //     16 * cl.ro.scale,
      //     16 * cl.ro.scale,
      //     COLOR_SEMI_TRANSPARENT,
      //     true,
      //     ctx
      //   );
      // }
      drawText(
        `${cl.stackSize}`,
        cl.ro.x + (!cl.ro.sprColor ? 16 * cl.ro.scale - 8 : 8),
        cl.ro.y,
        {
          size: 28,
        },
        ctx
      );
      if (showSpeed) {
        drawText(
          'Speed: ' + showSpeed,
          cl.ro.x + (16 * cl.ro.scale) / 2,
          cl.ro.y + 16 * cl.ro.scale,
          {
            size: 16,
          },
          ctx
        );
      }
    },
  };

  const cl = {
    ...battleUnitVars,
    ...battleUnitFuncs,
  };

  // restartAttackTimer();

  // switch (className) {
  // }

  return cl;
};
