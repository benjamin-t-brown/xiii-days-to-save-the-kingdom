// import { activateLoopAnimWithTimer } from './anim';
// import { BattleUnit, StatContext } from './battleUnit';
// import {
//   appendChild,
//   createElem,
//   createTextElem,
//   DialogWindow,
// } from './dialogWindow';
// import { drawRect, drawSprite, drawText, DrawTextParams } from './draw';
// import {
//   COLOR_SEMI_TRANSPARENT,
//   dist,
//   EV_MOUSEDOWN,
//   EV_MOUSEMOVE,
//   EV_MOUSEUP,
//   normalize,
//   Point,
//   pointRectCollides,
//   Rect,
//   rectanglesIntersect,
//   Timer,
//   utilsAddEventListener,
// } from './utils';
// import {
//   AutomatedControl,
//   AutomatedController,
//   createdAutomatedControl,
// } from './automatedController';
// import { createProjectile, Projectile } from './projectile';
// import { rand } from './zzfx';

// interface UnitWithFormation {
//   unit: BattleUnit;
//   formationInd: number;
// }

// export interface BattleHero {
//   attack: number;
//   defense: number;
//   speed: number;
//   magicPower: number;
//   mana: number;
//   maxMana: number;
// }

// export interface BattleSimulation {
//   leftUnits: BattleUnit[];
//   rightUnits: BattleUnit[];
//   leftHero: BattleHero | undefined;
//   rightHero: BattleHero | undefined;
//   onCompleted: (conclusion: 'win' | 'lose') => void;
//   getFormInd: (unit: BattleUnit) => number;

//   start(): void;
//   setCtx(
//     ctx: CanvasRenderingContext2D,
//     dialog: DialogWindow,
//     dialogBase: HTMLElement
//   ): void;
//   removeUnit(unit: BattleUnit): void;

//   update(dt: number): void;
//   draw(): void;
// }

// // fancy way to get minimizable private variables
// export const createBattleSimulation = (
//   leftUnitsA: UnitWithFormation[],
//   rightUnitsA: UnitWithFormation[],
//   leftHeroA?: BattleHero | undefined,
//   rightHeroA?: BattleHero | undefined
// ): BattleSimulation => {
//   let ctx: CanvasRenderingContext2D | undefined;
//   let hovUnit: BattleUnit | undefined;
//   let selUnit: UnitWithFormation | undefined;
//   let groupUnits: BattleUnit[] = [];
//   let battleConclusion: 'win' | 'lose' | undefined;
//   let dialog: DialogWindow | undefined;
//   let dialogBase: HTMLElement | undefined;
//   let okButton: HTMLElement | undefined;
//   let isBattleStarted = false;
//   // let combatLog: HTMLElement | undefined;
//   let isMouseDown = false;
//   let isDragging = false;
//   let lastMouseX = 0;
//   let lastMouseY = 0;
//   let mouseX = 0;
//   let mouseY = 0;
//   let lastDragUnitX = 0;
//   let lastDragUnitY = 0;
//   let hovFormationGridInd = -1;
//   const projectiles: Projectile[] = [];

//   const ac = new AutomatedController();

//   const createStatContext = (
//     attacker: BattleUnit,
//     victim: BattleUnit
//   ): StatContext => {
//     return {
//       attacker,
//       victim,
//     };
//   };

//   const getFormationGridsBounds = (
//     ctx: CanvasRenderingContext2D,
//     isRight?: boolean
//   ) => {
//     const rects: Rect[] = [];
//     for (let j = 0; j < 3; j++) {
//       for (let i = 0; i < 4; i++) {
//         const { width, height } = ctx.canvas;
//         const startXLeft = width / 2 - 64 / 2 - 100;
//         const startXRight = width / 2 - 64 / 2 + 100;
//         if (isRight) {
//           rects.push([startXRight + j * 64, 32 + i * 64, 64, 64]);
//         } else {
//           rects.push([startXLeft - j * 64, 32 + i * 64, 64, 64]);
//         }
//       }
//     }
//     return rects;
//   };

//   const createStatContextWithHero = (unit: BattleUnit): StatContext => {
//     return {
//       hero: getHeroForUnit(unit),
//     };
//   };

//   const getAllegiance = (unit: BattleUnit) => {
//     return getUnitIndAndArray(unit)[1] === cl.leftUnits ? 'left' : 'right';
//   };

//   const getHeroForUnit = (unit: BattleUnit) => {
//     const [, arr] = getUnitIndAndArray(unit);
//     return arr === cl.leftUnits ? cl.leftHero : cl.rightHero;
//   };

//   const getUnitIndAndArray = (unit: BattleUnit): [number, BattleUnit[]] => {
//     let arr = cl.leftUnits;
//     let ind = cl.leftUnits.indexOf(unit);
//     if (ind === -1) {
//       arr = cl.rightUnits;
//       ind = cl.rightUnits.indexOf(unit);
//     }
//     return [ind, arr];
//   };

//   const getUnitSize = (scale: number) => {
//     return 16 * scale;
//   };

//   const logCombat = (...args: any[]) => {
//     console.log('[COMBAT]', ...args);
//     // if (combatLog) {
//     //   const text = (args.join(' ') + '<br>').replace(/\s/g, '&nbsp;');
//     //   const p = createTextElem('span', text);
//     //   appendChild(combatLog, p);
//     //   combatLog.scrollTop = combatLog.scrollHeight;
//     // }
//   };

//   const updateUnitPosition = (unit: BattleUnit, nextInd: number) => {
//     const [ind, arr] = getUnitIndAndArray(unit);

//     arr.splice(ind, 1);
//     arr.splice(nextInd, 0, unit);
//   };

//   const alignUnits = () => {
//     if (!ctx) {
//       return;
//     }

//     const rects = getFormationGridsBounds(ctx);
//     for (const { unit, formationInd } of leftUnitsA) {
//       const rect = rects[formationInd];
//       unit.setPos(rect[0], rect[1]);
//       unit.ro.scale = 4;
//     }
//     const rects2 = getFormationGridsBounds(ctx, true);
//     for (const { unit, formationInd } of rightUnitsA) {
//       const rect = rects2[formationInd];
//       unit.setPos(rect[0], rect[1]);
//       unit.ro.scale = 4;
//       unit.ro.flipped = true;
//       unit.ro.sprColor = 'r';
//     }
//   };

//   const getUnitPointCollidesWith = (x: number, y: number) => {
//     for (const unit of cl.leftUnits.concat(cl.rightUnits)) {
//       const [unitX, unitY, w, h] = unit.getBounds();
//       if (pointRectCollides([x, y], [unitX, unitY, w, h])) {
//         return unit;
//       }
//       // if (unitX < x && x < unitX + w) {
//       //   if (unitY < y && y < unitY + h) {
//       //     return unit;
//       //   }
//       // }
//     }
//   };

//   const calculateNextStackSize = (target: BattleUnit, totalDamage: number) => {
//     const totalCurrentHealth =
//       target.health + (target.stackSize - 1) * target.maxHealth;
//     let nextHealth = (totalCurrentHealth - totalDamage) % target.maxHealth;
//     if (nextHealth === 0) {
//       nextHealth = target.maxHealth;
//     }
//     let nextStackSize = Math.ceil(
//       (totalCurrentHealth - totalDamage) / target.maxHealth
//     );
//     if (nextStackSize <= 0) {
//       nextStackSize = 0;
//     }
//     return {
//       nextHealth,
//       nextStackSize,
//     };
//   };

//   const calculateDamageVars = (attacker: BattleUnit, target: BattleUnit) => {
//     const statCtx = createStatContext(attacker, target);
//     const maxDmg = attacker.getStat('attack', {
//       ...statCtx,
//       hero: getHeroForUnit(attacker),
//     });
//     const minDmg = maxDmg - Math.floor(maxDmg * attacker.attackVarPct);
//     const def = target.getStat('defense', {
//       ...statCtx,
//       hero: getHeroForUnit(target),
//     });

//     const minNextStack = calculateNextStackSize(
//       target,
//       Math.max(1, minDmg - def) * attacker.stackSize
//     ).nextStackSize;
//     const maxNextStack = calculateNextStackSize(
//       target,
//       Math.max(1, maxDmg - def) * attacker.stackSize
//     ).nextStackSize;

//     return {
//       minDmg,
//       maxDmg,
//       minNextStack,
//       maxNextStack,
//     };
//   };

//   const checkDefeatedUnits = () => {};

//   const checkWinLossCondition = () => {
//     if (!battleConclusion) {
//       if (cl.rightUnits.length === 0) {
//         battleConclusion = 'win';

//         ac.addAutomatedControl(
//           createdAutomatedControl(
//             500,
//             () => {
//               logCombat('Battle won.');
//             },
//             () => {
//               okButton?.style.setProperty('visibility', 'visible');
//             }
//           )
//         );
//       } else if (cl.leftUnits.length === 0) {
//         battleConclusion = 'lose';
//         ac.addAutomatedControl(
//           createdAutomatedControl(
//             500,
//             () => {
//               logCombat('Battle lost.');
//             },
//             () => {}
//           )
//         );
//       }
//     }
//   };

//   const areInputEventsDisabled = () => {
//     return !!ac.getCurrent() || !!battleConclusion;
//   };

//   // const calculateMinRangeInd = (unit: BattleUnit, target: BattleUnit) => {
//   //   const range = unit.getStat('range', createStatContext(unit, target));
//   //   let [unitInd] = getUnitIndAndArray(unit);
//   //   const [targetInd] = getUnitIndAndArray(target);
//   //   let rangeDiff: number;
//   //   do {
//   //     rangeDiff = unitInd + 1 + (targetInd + 1) - 1;
//   //     if (range < rangeDiff) {
//   //       unitInd--;
//   //     }
//   //     if (unitInd < 0) {
//   //       return -1;
//   //     }
//   //   } while (range < rangeDiff);
//   //   return unitInd;
//   // };

//   // const drawUnitInfo = (unit: BattleUnit, ctx: CanvasRenderingContext2D) => {
//   //   const { x, y, scale } = unit.ro;
//   //   const allegiance = getAllegiance(unit);

//   //   const sz = getUnitSize(scale);
//   //   const boxW = 200;
//   //   let boxX = x - boxW;
//   //   let boxY = y;
//   //   if (y > ctx.canvas.height / 2) {
//   //     boxY = y - 120 + 32;
//   //   }
//   //   if (boxX < 0) {
//   //     boxX = x + 32;
//   //   }

//   //   drawRect(boxX, boxY, boxW, 120, COLOR_SEMI_TRANSPARENT, false, ctx);

//   //   const drawStat = (statName: string, value: any, i: number) => {
//   //     drawText(
//   //       statName + ': ' + value,
//   //       boxX + 8,
//   //       boxY + 18 * i,
//   //       textParams,
//   //       ctx
//   //     );
//   //   };

//   //   const textParams: DrawTextParams = {
//   //     align: 'left',
//   //     size: 18,
//   //     color: 'white',
//   //     strokeColor: '',
//   //   };
//   //   drawText(
//   //     unit.label,
//   //     boxX + 8,
//   //     boxY + 16 * 1,
//   //     {
//   //       ...textParams,
//   //       color: 'lightgrey',
//   //     },
//   //     ctx
//   //   );
//   //   const statCtx = createStatContextWithHero(unit);
//   //   drawStat('Health', unit.maxHealth, 2);
//   //   drawStat('Attack', unit.getStat('attack', statCtx), 3);
//   //   drawStat('Defense', unit.getStat('defense', statCtx), 4);
//   //   drawStat('Speed', unit.getStat('speed', statCtx), 5);
//   //   drawStat('Range', unit.getStat('range', statCtx), 6);
//   // };

//   const attackUnit = (attacker: BattleUnit, target: BattleUnit) => {
//     const [, arr] = getUnitIndAndArray(attacker);
//     const targetArr = arr === cl.leftUnits ? cl.rightUnits : cl.leftUnits;
//     let wasDefeated = false;
//     const statCtx = createStatContext(attacker, target);
//     statCtx.hero = getHeroForUnit(target);
//     const def = target.getStat('defense', statCtx);
//     const { minDmg, maxDmg } = calculateDamageVars(attacker, target);
//     const dmg = Math.round(
//       Math.max(1, normalize(rand(), 0, 1, minDmg, maxDmg) - def)
//     );
//     const totalDamage = dmg * attacker.stackSize;
//     const { nextStackSize, nextHealth } = calculateNextStackSize(
//       target,
//       totalDamage
//     );
//     const stackSizeDiff = target.stackSize - nextStackSize;
//     if (nextStackSize <= 0) {
//       wasDefeated = true;
//     }
//     console.log(
//       'attacker',
//       attacker.label,
//       'attacks',
//       target.label,
//       'dealt',
//       totalDamage,
//       'damage',
//       'defeated',
//       stackSizeDiff,
//       'units'
//     );
//     target.health = nextHealth;
//     target.stackSize = nextStackSize;
//     // console.log('ATTACK UNIT', attacker, target);
//     if (wasDefeated) {
//       console.log('Target defeated', target);
//       cl.removeUnit(target);
//     }
//   };

//   const onHoverUnitDrag = (
//     ctx: CanvasRenderingContext2D,
//     selUnit: UnitWithFormation,
//     setUnit: boolean
//   ) => {
//     const rects = getFormationGridsBounds(ctx);
//     const point: Point = [selUnit.unit.ro.x + 32, selUnit.unit.ro.y + 32];
//     let foundInd = false;
//     for (const rect of rects) {
//       if (pointRectCollides(point, rect)) {
//         const ind = rects.indexOf(rect);
//         if (ind > -1) {
//           if (setUnit) {
//             const existingUnit = leftUnitsA.find((u) => u.formationInd === ind);
//             if (!existingUnit) {
//               selUnit.formationInd = ind;
//             }
//           }
//           hovFormationGridInd = ind;
//           foundInd = true;
//         }
//       }
//     }
//     if (!foundInd) {
//       hovFormationGridInd = -1;
//     }
//   };

//   const spawnProjectile = (unit: BattleUnit, target: BattleUnit) => {
//     const startPos = unit.getBounds() as any as Point;
//     const endPos = target.getBounds() as any as Point;
//     startPos[0] += 32;
//     startPos[1] += 32;
//     endPos[0] += 32;
//     endPos[1] += 32;
//     const isRangeAttack = unit.getStat('range', {}) > 1;
//     const height = isRangeAttack ? 50 : 0;
//     const ms = isRangeAttack ? 500 : 100;
//     projectiles.push(
//       createProjectile(startPos, endPos, ms, height, () => {
//         attackUnit(unit, target);
//         // apply damage
//       })
//     );
//   };

//   const localBattleSimulation = {
//     leftUnits: leftUnitsA.map((u) => u.unit),
//     rightUnits: rightUnitsA.map((u) => {
//       u.unit.owner = 'cpu';
//       return u.unit;
//     }),
//     leftHero: leftHeroA,
//     rightHero: rightHeroA,
//     // unitOrder: [] as BattleUnit[],
//     // unitOrder2: [] as BattleUnit[],
//     unitOrderIndex: 0,
//     onCompleted: (c: 'win' | 'lose') => {},
//   };

//   const cl = {
//     ...localBattleSimulation,
//     ...{
//       start() {
//         console.trace('start');
//         logCombat('Battle started.');
//         isBattleStarted = true;
//       },
//       setCtx(
//         _ctx: CanvasRenderingContext2D,
//         _dialog: DialogWindow,
//         _dialogBase: HTMLElement
//       ) {
//         ctx = _ctx;
//         dialog = _dialog;
//         dialogBase = _dialogBase;

//         // const _combatLog = createElem('div');
//         // Object.assign(_combatLog.style, {
//         //   height: '100px',
//         //   overflowY: 'scroll',
//         //   background: '#333',
//         //   color: 'white',
//         // });
//         // appendChild(dialogBase, _combatLog);
//         // combatLog = _combatLog;

//         const buttonsElem = createElem('p');
//         Object.assign(buttonsElem.style, {
//           textAlign: 'right',
//         });
//         const _okButton = createTextElem('button', 'OK');
//         _okButton.onclick = () => {
//           dialog?.remove();
//           cl.onCompleted(battleConclusion!);
//         };
//         _okButton.style.visibility = 'hidden';
//         okButton = _okButton;
//         appendChild(buttonsElem, okButton);
//         appendChild(dialogBase, buttonsElem);

//         utilsAddEventListener(ctx.canvas, EV_MOUSEDOWN, (ev) => {
//           if (areInputEventsDisabled()) {
//             return;
//           }
//           ev.preventDefault();
//           const x = ev.offsetX;
//           const y = ev.offsetY;
//           if (ev.button === 0) {
//             lastMouseX = x;
//             lastMouseY = y;
//             isMouseDown = true;

//             // drag unit
//             const unit = getUnitPointCollidesWith(x, y);
//             if (!isBattleStarted && unit) {
//               const ind = cl.leftUnits.indexOf(unit);
//               if (ind > -1) {
//                 selUnit = leftUnitsA[ind];
//                 lastDragUnitX = selUnit.unit.ro.x;
//                 lastDragUnitY = selUnit.unit.ro.y;
//               }
//             }
//           }
//         });
//         utilsAddEventListener(ctx.canvas, EV_MOUSEMOVE, (ev) => {
//           if (areInputEventsDisabled()) {
//             return;
//           }
//           const x = ev.offsetX;
//           const y = ev.offsetY;
//           mouseX = x;
//           mouseY = y;
//           if (!isDragging && isMouseDown) {
//             if (dist([x, y], [lastMouseX, lastMouseY]) > 3) {
//               isDragging = true;
//             }
//           }

//           if (isDragging) {
//             if (isBattleStarted) {
//               // select units with group select.  Might need to keep this out for space
//               // for (let i = 0; i < cl.leftUnits.length; i++) {
//               //   const unit = cl.leftUnits[i];
//               //   const bounds = unit.getBounds() as Rect;
//               //   const unitInd = groupUnits.indexOf(unit);
//               //   if (
//               //     rectanglesIntersect(
//               //       [
//               //         Math.min(lastMouseX, mouseX),
//               //         Math.min(lastMouseY, mouseY),
//               //         Math.abs(mouseX - lastMouseX),
//               //         Math.abs(mouseY - lastMouseY),
//               //       ],
//               //       bounds
//               //     )
//               //   ) {
//               //     if (unitInd === -1) {
//               //       groupUnits.push(unit);
//               //     }
//               //   } else {
//               //     if (unitInd !== -1) {
//               //       groupUnits.splice(unitInd, 1);
//               //     }
//               //   }
//               // }
//             }
//             if (selUnit) {
//               // const rects = getFormationGridsBounds(_ctx);
//               // const [x, y] = rects[selUnit.formationInd];
//               selUnit.unit.ro.x = lastDragUnitX + x - lastMouseX;
//               selUnit.unit.ro.y = lastDragUnitY + y - lastMouseY;

//               onHoverUnitDrag(_ctx, selUnit, false);
//             }
//           }

//           const unit = getUnitPointCollidesWith(x, y);
//           if (unit) {
//             if (isBattleStarted) {
//               const [, arr] = getUnitIndAndArray(unit);
//               if (arr === cl.leftUnits) {
//                 hovUnit = unit;
//               } else {
//                 hovUnit = undefined;
//               }
//             } else {
//               hovUnit = unit;
//             }
//           } else {
//             hovUnit = undefined;
//           }
//         });
//         utilsAddEventListener(ctx.canvas, EV_MOUSEUP, (ev) => {
//           isMouseDown = false;
//           const x = ev.offsetX;
//           const y = ev.offsetY;
//           if (isBattleStarted) {
//             const unit = getUnitPointCollidesWith(x, y);
//             const didClickLeftUnit = cl.leftUnits.includes(unit as BattleUnit);
//             const isUnitSelectedAlready = groupUnits.includes(
//               unit as BattleUnit
//             );

//             if (
//               isBattleStarted &&
//               (!didClickLeftUnit || isUnitSelectedAlready)
//             ) {
//               if (groupUnits.length) {
//                 groupUnits[0].setWalkTarget([x - 32, y - 32]);
//               }
//             } else {
//               if (didClickLeftUnit) {
//                 groupUnits = [unit as BattleUnit];
//               } else {
//                 groupUnits = [];
//               }
//             }
//           }
//           if (isDragging && !selUnit) {
//             isDragging = false;
//             // select units in box
//           } else if (isDragging && selUnit) {
//             isDragging = false;
//             onHoverUnitDrag(_ctx, selUnit, true);
//             alignUnits();
//             selUnit = undefined;
//             // move units
//           }
//         });
//         utilsAddEventListener(ctx.canvas, 'contextmenu', (ev) => {
//           ev.preventDefault();
//         });

//         alignUnits();
//       },
//       getFormInd: (unit: BattleUnit) => {
//         const ind = cl.leftUnits.indexOf(unit);
//         if (ind > -1) {
//           return leftUnitsA[ind].formationInd;
//         }
//         return -1;
//       },
//       removeUnit(unit: BattleUnit) {
//         const [ind, arr] = getUnitIndAndArray(unit);
//         if (ind > -1) {
//           arr.splice(ind, 1);
//         }
//         // const indOrder = cl.unitOrder.indexOf(unit);
//         // cl.unitOrder.splice(indOrder, 1);
//         // const indOrder2 = cl.unitOrder2.indexOf(unit);
//         // cl.unitOrder2.splice(indOrder2, 1);
//         // if (cl.unitOrderIndex > indOrder) {
//         //   cl.unitOrderIndex--;
//         // }
//       },
//       update(dt: number) {
//         // checkDefeatedUnits();
//         checkWinLossCondition();

//         // check unit attacks
//         if (isBattleStarted) {
//           for (const unit of cl.leftUnits) {
//             unit.update(dt, cl.rightUnits);
//             if (unit.flagAttack) {
//               spawnProjectile(unit, unit.flagAttack);
//               unit.flagAttack = undefined;
//             }
//           }
//           for (const unit of cl.rightUnits) {
//             unit.update(dt, cl.leftUnits);
//             if (unit.flagAttack) {
//               spawnProjectile(unit, unit.flagAttack);
//               unit.flagAttack = undefined;
//             }
//           }
//         }

//         ac.update(dt);

//         for (let i = 0; i < projectiles.length; i++) {
//           const proj = projectiles[i];
//           proj.update(dt);
//           if (proj.remV) {
//             projectiles.splice(i, 1);
//             i--;
//             proj.cb();
//           }
//         }

//         if (ac.getCurrent()) {
//           hovUnit = undefined;
//         }
//       },
//       draw() {
//         if (!ctx) {
//           return;
//         }

//         const grassSize = 19;
//         drawRect(0, 0, ctx.canvas.width, ctx.canvas.height, '#555', false, ctx);
//         const nTilesWide = Math.ceil(
//           (ctx.canvas.width + grassSize) / grassSize
//         );
//         for (let i = 0; i < nTilesWide ** 2; i++) {
//           // lovely square grass plains
//           drawRect(
//             (i % nTilesWide) * grassSize - grassSize,
//             Math.floor(i / nTilesWide) * grassSize,
//             grassSize,
//             grassSize,
//             `rgba(50, 200, 50, ${normalize(
//               Math.abs(Math.sin(i * grassSize * 3)),
//               0,
//               1,
//               0.3,
//               0.5
//             )}`,
//             false,
//             ctx
//           );
//         }

//         // grid
//         if (!isBattleStarted) {
//           const rects = getFormationGridsBounds(ctx);
//           for (let i = 0; i < rects.length; i++) {
//             const rect = rects[i];
//             const c = COLOR_SEMI_TRANSPARENT;
//             drawRect(...rect, c, true, ctx);
//             if (hovFormationGridInd === i) {
//               drawRect(...rect, c, false, ctx);
//             }
//             // debug
//             // const ind = rects.indexOf(rect);
//             // drawText(
//             //   ind + '',
//             //   rect[0] + 48,
//             //   rect[1] + 64 / 2,
//             //   {
//             //     color: 'orange',
//             //   },
//             //   ctx
//             // );
//           }
//         }

//         for (const unit of cl.leftUnits.concat(cl.rightUnits)) {
//           unit.draw(ctx, isBattleStarted && groupUnits.includes(unit));
//         }

//         if (isDragging) {
//           // select rect
//           // if (!selUnit && isBattleStarted) {
//           //   drawRect(
//           //     lastMouseX,
//           //     lastMouseY,
//           //     mouseX - lastMouseX,
//           //     mouseY - lastMouseY,
//           //     '#fff',
//           //     true,
//           //     ctx
//           //   );
//           // }
//         } else if (hovUnit) {
//           const allegiance = getAllegiance(hovUnit);
//           // drawIndicator(hovUnit, allegiance === 'left' ? 'blue' : 'red', ctx);
//           drawRect(
//             hovUnit.ro.x,
//             hovUnit.ro.y,
//             64,
//             64,
//             COLOR_SEMI_TRANSPARENT,
//             false,
//             ctx
//           );
//           // drawUnitInfo(hovUnit, ctx);
//         }
//         for (let i = 0; i < projectiles.length; i++) {
//           const proj = projectiles[i];
//           proj.draw(ctx);
//         }

//         if (battleConclusion === 'win') {
//           drawText('Victory!', ctx.canvas.width / 2, 30, { size: 32 }, ctx);
//         }
//         if (battleConclusion === 'lose') {
//           drawText('Defeat...', ctx.canvas.width / 2, 30, { size: 32 }, ctx);
//         }
//       },
//     },
//   };

//   return cl;
// };
