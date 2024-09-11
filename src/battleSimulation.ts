import { activateLoopAnimWithTimer, deactivateLoopAnimWithTimer } from './anim';
import {
  AutomatedController,
  createdAutomatedControl,
} from './automatedController';
import {
  BattleUnit,
  createBattleUnit,
  STAT_ATTACK,
  STAT_ATTACK_VAR_PCT,
  STAT_DEFENSE,
  STAT_HEALTH,
  STAT_MAX_HEALTH,
  STAT_SPEED,
  StatContext,
} from './battleUnit';
import {
  appendChild,
  clickOkayOnKeyPress,
  createElem,
  createTextElem,
  DialogWindow,
} from './dialogWindow';
import { drawRect, drawText } from './draw';
import { normalize, playSound, randInArr } from './utils';
import { rand } from './zzfx';

export interface BattleHero {
  attack: number;
  defense: number;
  speed: number;
  // magicPower: number;
  // mana: number;
  // maxMana: number;
}

const UNIT_SPRITE_SIZE = 128;
const UNIT_SPRITE_HALF_SIZE = UNIT_SPRITE_SIZE / 2;

export const calculateUnitRating = (
  unit: BattleUnit,
  statContext: StatContext
) => {
  const att = unit.getStat(STAT_ATTACK, statContext) - 5;
  const def = unit.getStat(STAT_DEFENSE, statContext);
  const hp = 0;
  let rating = (1 + normalize(att + def + hp + 1, 1, 10, 0, 100) / 100).toFixed(
    2
  );
  let n = rating.split('.')[1];
  // console.log('WHAT IS THIS?', unit, statContext, rating, n, att, def, hp);
  while (n.length < 2) {
    rating += '0';
    n = rating.split('.')[1];
  }
  return rating;
};

export const createDepictUnit = (units: BattleUnit[]) => {
  const baseUnit = createBattleUnit(0);
  baseUnit.ro.scale = 8;
  for (const unit of units) {
    baseUnit.stackSize = unit.stackSize;
    // if (unit.attack > baseUnit.attack) {
    baseUnit[STAT_ATTACK] = unit[STAT_ATTACK];
    baseUnit[STAT_SPEED] = unit[STAT_SPEED];
    // }
    // if (unit.defense > baseUnit.defense) {
    baseUnit[STAT_DEFENSE] = unit[STAT_DEFENSE];
    // }
    // if (unit.maxHealth > baseUnit.maxHealth) {
    baseUnit[STAT_MAX_HEALTH] = unit[STAT_MAX_HEALTH];
    baseUnit[STAT_HEALTH] = unit[STAT_HEALTH];
    // }
    // if (unit.attackVarPct > baseUnit.attackVarPct) {
    baseUnit[STAT_ATTACK_VAR_PCT] = unit[STAT_ATTACK_VAR_PCT];
    // }
    baseUnit.ro.sprite = unit.ro.sprite;
    baseUnit.label = unit.label;
  }
  return baseUnit;
};

export class BattleSimulation {
  // leftUnits: BattleUnit[] = [];
  // rightUnits: BattleUnit[] = [];
  leftHero?: BattleHero;
  rightHero?: BattleHero;
  leftDepict: BattleUnit;
  rightDepict: BattleUnit;
  ac: AutomatedController = new AutomatedController();
  ctx: CanvasRenderingContext2D;
  battleConclusion: string = '';
  started: boolean = false;
  okButton: HTMLButtonElement;
  combatLog: HTMLElement;
  onCompleted = (c: string) => {};

  leftSpeed: number = 0;
  rightSpeed: number = 0;

  constructor(
    leftUnits: BattleUnit[],
    rightUnits: BattleUnit[],
    leftHero?: BattleHero,
    rightHero?: BattleHero
  ) {
    this.leftHero = leftHero;
    this.rightHero = rightHero;

    console.log('create sim', leftUnits, rightUnits);
    this.leftDepict = createDepictUnit(leftUnits);
    this.leftDepict.ro.sprite = 'ts_4';
    this.leftDepict.label = "Hero's Army";

    this.rightDepict = createDepictUnit(rightUnits);
    this.rightDepict.ro.flipped = true;
    this.rightDepict.ro.sprColor = 'r';

    const leftSpeedCtx = this.createStatContextWithHero(this.leftDepict);
    this.leftSpeed = this.leftDepict.getStat(STAT_SPEED, leftSpeedCtx);
    this.rightSpeed = this.rightDepict.getStat(STAT_SPEED, {});
  }

  setCtx(
    _ctx: CanvasRenderingContext2D,
    _dialog: DialogWindow,
    _dialogBase: HTMLElement
  ) {
    this.ctx = _ctx;

    const { width, height } = _ctx.canvas;

    // this.leftDepict.setPos(width / 4 - UNIT_SPRITE_HALF_SIZE, height / 2 - UNIT_SPRITE_HALF_SIZE);
    // this.rightDepict.setPos((3 * width) / 4 - UNIT_SPRITE_HALF_SIZE, height / 2 - UNIT_SPRITE_HALF_SIZE);
    // this.dialog = _dialog;
    // this.dialogBase = _dialogBase;

    this.leftDepict.setPos(
      width / 2 - UNIT_SPRITE_HALF_SIZE * 1.5 - UNIT_SPRITE_HALF_SIZE,
      height / 2 - UNIT_SPRITE_HALF_SIZE
    );
    this.rightDepict.setPos(
      width / 2 + UNIT_SPRITE_HALF_SIZE * 1.5 - UNIT_SPRITE_HALF_SIZE,
      height / 2 - UNIT_SPRITE_HALF_SIZE
    );

    const _combatLog = createElem('div');
    Object.assign(_combatLog.style, {
      height: '100px',
      overflowY: 'scroll',
      background: '#333',
      color: 'white',
    });
    appendChild(_dialogBase, _combatLog);
    this.combatLog = _combatLog;

    const buttonsElem = createElem('p');
    Object.assign(buttonsElem.style, {
      textAlign: 'right',
    });
    const _okButton = createTextElem('button', 'OK');
    _okButton.onclick = () => {
      _dialog?.remove();
      this.onCompleted(this.battleConclusion!);
    };
    _okButton.style.visibility = 'hidden';
    this.okButton = _okButton;
    appendChild(buttonsElem, _okButton);
    appendChild(_dialogBase, buttonsElem);
  }

  createStatContext(attacker: BattleUnit, victim: BattleUnit): StatContext {
    return {
      attacker,
      victim,
    };
  }

  createStatContextWithHero(unit: BattleUnit): StatContext {
    return {
      hero: this.getHeroForUnit(unit),
    };
  }

  logCombat(...args: any[]) {
    console.log('[COMBAT]', ...args);
    if (this.combatLog) {
      const text = (args.join(' ') + '<br>').replace(/\s/g, '&nbsp;');
      const p = createTextElem('span', text);
      appendChild(this.combatLog, p);
      this.combatLog.scrollTop = this.combatLog.scrollHeight;
    }
  }

  getAllegiance(unit: BattleUnit) {
    return unit === this.leftDepict ? 'left' : 'right';
  }

  getHeroForUnit(unit: BattleUnit) {
    return unit === this.leftDepict ? this.leftHero : this.rightHero;
  }

  // getUnitIndAndArray(unit: BattleUnit): [number, BattleUnit[]] {
  //   let arr = this.leftUnits;
  //   let ind = this.leftUnits.indexOf(unit);
  //   if (ind === -1) {
  //     arr = this.rightUnits;
  //     ind = this.rightUnits.indexOf(unit);
  //   }
  //   return [ind, arr];
  // }

  calculateDamageVars(attacker: BattleUnit, target: BattleUnit) {
    const statCtx = this.createStatContext(attacker, target);
    const def = target.getStat(STAT_DEFENSE, {
      ...statCtx,
      hero: this.getHeroForUnit(target),
    });
    const maxDmg = Math.max(
      1,
      attacker.getStat(STAT_ATTACK, {
        ...statCtx,
        hero: this.getHeroForUnit(attacker),
      }) - def
    );
    const minDmg = Math.max(
      1,
      maxDmg - Math.floor(maxDmg * attacker[STAT_ATTACK_VAR_PCT]) - def
    );

    const minNextStack = this.calculateNextStackSize(
      target,
      minDmg * attacker.stackSize
    ).nextStackSize;
    const maxNextStack = this.calculateNextStackSize(
      target,
      maxDmg * attacker.stackSize
    ).nextStackSize;

    return {
      minDmg,
      maxDmg,
      minNextStack,
      maxNextStack,
    };
  }

  calculateNextStackSize(target: BattleUnit, totalDamage: number) {
    const totalCurrentHealth =
      target[STAT_HEALTH] + (target.stackSize - 1) * target[STAT_MAX_HEALTH];
    let nextHealth =
      (totalCurrentHealth - totalDamage) % target[STAT_MAX_HEALTH];
    if (nextHealth === 0) {
      nextHealth = target[STAT_MAX_HEALTH];
    }
    let nextStackSize = Math.ceil(
      (totalCurrentHealth - totalDamage) / target[STAT_MAX_HEALTH]
    );
    if (nextStackSize <= 0) {
      nextStackSize = 0;
    }
    return {
      nextHealth,
      nextStackSize,
    };
  }

  // calculateTurnOrder() {
  //   const allUnits = [...this.leftUnits, ...this.rightUnits];
  //   allUnits.sort((a, b) => {
  //     if (a.speed === b.speed) {
  //       return allUnits.indexOf(a) - allUnits.indexOf(b);
  //     }
  //     const ctxA = this.createStatContext(a, a);
  //     ctxA.hero = this.getHeroForUnit(a);
  //     const ctxB = this.createStatContext(b, b);
  //     ctxB.hero = this.getHeroForUnit(b);
  //     return a.getStat('speed', ctxA) > b.getStat('speed', ctxB) ? -1 : 1;
  //   });
  //   return allUnits;
  // }

  // removeUnit(unit: BattleUnit) {
  //   const [ind, arr] = this.getUnitIndAndArray(unit);
  //   if (ind > -1) {
  //     arr.splice(ind, 1);
  //   }
  // }

  attackUnit(attacker: BattleUnit, target: BattleUnit) {
    let wasDefeated = false;
    const statCtx = this.createStatContext(attacker, target);
    statCtx.hero = this.getHeroForUnit(target);
    // const def = target.getStat('defense', statCtx);
    const { minDmg, maxDmg, minNextStack, maxNextStack } =
      this.calculateDamageVars(attacker, target);
    const dmg = Math.round(
      Math.max(1, normalize(rand(), 0, 1, minDmg, maxDmg))
    );
    const totalDamage = dmg * attacker.stackSize;
    const { nextStackSize, nextHealth } = this.calculateNextStackSize(
      target,
      totalDamage
    );
    const stackSizeDiff = target.stackSize - nextStackSize;
    if (nextStackSize <= 0) {
      wasDefeated = true;
    }
    this.logCombat(
      attacker.label,
      'attacks',
      target.label,
      'for',
      totalDamage,
      'damage, defeating',
      stackSizeDiff,
      'units.'
    );
    this.logCombat(
      ' -->',
      `min damage was ${minDmg * attacker.stackSize} (defeating ${
        target.stackSize - minNextStack
      })`
    );
    this.logCombat(
      ' -->',
      `max damage was ${maxDmg * attacker.stackSize} (defeating ${
        target.stackSize - maxNextStack
      })`
    );
    target[STAT_HEALTH] = nextHealth;
    target.stackSize = nextStackSize;
    // console.log('ATTACK UNIT', attacker, target);
    if (wasDefeated) {
      console.log('Target defeated', target);
      // this.removeUnit(target);
    }
  }

  checkCompletion() {
    if (this.battleConclusion) {
      return true;
    }

    if (this.leftDepict.stackSize === 0) {
      this.battleConclusion = 'lose';
      this.leftDepict.visible = false;
      this.okButton?.style.setProperty('visibility', 'visible');
      clickOkayOnKeyPress(this.okButton);
      playSound('lose');
      return true;
    }
    if (this.rightDepict.stackSize === 0) {
      this.battleConclusion = 'win';
      this.rightDepict.visible = false;
      this.okButton?.style.setProperty('visibility', 'visible');
      clickOkayOnKeyPress(this.okButton);
      playSound('battle_win');
      return true;
    }
    return;
  }

  doRound() {
    if (this.checkCompletion() || this.ac.currentControl) {
      return;
    }

    // const turnOrder = this.calculateTurnOrder();
    const turnOrder =
      this.leftSpeed >= this.rightSpeed
        ? [this.leftDepict, this.rightDepict]
        : [this.rightDepict, this.leftDepict];
    let turnInd = 0;
    const doTurn = () => {
      if (turnInd >= turnOrder.length) {
        return;
      }
      const unit = turnOrder[turnInd];
      const isLeftAllegiance = this.getAllegiance(unit) === 'left';
      const attackerDepict = isLeftAllegiance
        ? this.leftDepict
        : this.rightDepict;
      const target: BattleUnit = isLeftAllegiance
        ? this.rightDepict
        : this.leftDepict;
      turnInd++;
      console.log('Unit', unit.label, 'attacks', target.label);
      this.ac.addAutomatedControl(
        createdAutomatedControl(
          300,
          () => {
            activateLoopAnimWithTimer(attackerDepict.animState.hBump);
          },
          () => {
            this.attackUnit(unit, target);
            playSound('attack');
            if (target.stackSize === 0) {
              playSound('flicker_enemy');
              activateLoopAnimWithTimer(target.animState.flicker);
            }
            deactivateLoopAnimWithTimer(attackerDepict.animState.hBump);
          }
        )
      );
      this.ac.addAutomatedControl(
        createdAutomatedControl(
          300,
          () => {},
          () => {
            if (target.stackSize === 0) {
              deactivateLoopAnimWithTimer(target.animState.flicker);
              target.defeated = true;
            }
            if (!this.checkCompletion()) {
              doTurn();
            }
          }
        )
      );
    };
    doTurn();
  }

  start() {
    this.started = true;
  }

  update(dt: number) {
    // const powerLevelLeft = calculatePowerLevel(
    //   this.leftUnits,
    //   this.createStatContextWithHero(this.leftUnits[0])
    // );
    // const powerLevelRight = calculatePowerLevel(
    //   this.rightUnits,
    //   this.createStatContextWithHero(this.rightUnits[0])
    // );

    // this.leftDepict.stackSize = powerLevelLeft;
    this.leftDepict.update(dt);
    // this.rightDepict.stackSize = powerLevelRight;
    this.rightDepict.update(dt);

    this.ac.update(dt);

    if (!this.ac.currentControl && this.started) {
      this.doRound();
    }
  }

  draw() {
    const ctx = this.ctx;
    if (!ctx) {
      return;
    }

    const grassSize = 19;
    drawRect(0, 0, ctx.canvas.width, ctx.canvas.height, '#555', false, ctx);
    const nTilesWide = Math.ceil((ctx.canvas.width + grassSize) / grassSize);
    for (let i = 0; i < nTilesWide ** 2; i++) {
      // lovely square grass plains
      drawRect(
        (i % nTilesWide) * grassSize - grassSize,
        Math.floor(i / nTilesWide) * grassSize,
        grassSize,
        grassSize,
        `rgba(52,221,5,${normalize(
          Math.abs(Math.sin(i * grassSize * 3)),
          0,
          1,
          0.3,
          0.5
        )})`,
        false,
        ctx
      );
    }

    this.leftDepict.draw(this.ctx, this.started ? '' : this.leftSpeed);
    this.rightDepict.draw(this.ctx, this.started ? '' : this.rightSpeed);
    if (!this.started) {
      const startingUnit =
        this.leftSpeed >= this.rightSpeed ? this.leftDepict : this.rightDepict;
      const color = this.leftSpeed >= this.rightSpeed ? 'lightgreen' : 'red';
      drawText(
        startingUnit.label + ' will go first!',
        ctx.canvas.width / 2,
        ctx.canvas.height - 50,
        { size: 22, color },
        ctx
      );
    }

    const leftCtx = this.createStatContextWithHero(this.leftDepict);
    const leftUnitRating = calculateUnitRating(this.leftDepict, leftCtx);
    const rightUnitRating = calculateUnitRating(this.rightDepict, {});
    if (!this.battleConclusion) {
      drawText(
        `Troop Rating: ${leftUnitRating}`,
        12,
        12,
        { size: 14, align: 'left', strokeColor: '' },
        ctx
      );
      drawText(
        `Troop Rating: ${rightUnitRating}`,
        ctx.canvas.width - 12,
        12,
        { size: 14, align: 'right', strokeColor: '' },
        ctx
      );
    }

    if (this.battleConclusion === 'win') {
      drawText('Victory!', ctx.canvas.width / 2, 30, { size: 28 }, ctx);
    }
    if (this.battleConclusion === 'lose') {
      drawText('Defeat...', ctx.canvas.width / 2, 30, { size: 28 }, ctx);
    }
  }
}
