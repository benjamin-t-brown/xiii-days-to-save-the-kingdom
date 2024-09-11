import { BattleSimulation } from './battleSimulation';
import {
  BATTLE_UNIT_CLASS_ARCHER1,
  BATTLE_UNIT_CLASS_ARCHER2,
  BATTLE_UNIT_CLASS_ARCHER3,
  BATTLE_UNIT_CLASS_FOOTMAN1,
  BATTLE_UNIT_CLASS_FOOTMAN2,
  BATTLE_UNIT_CLASS_FOOTMAN3,
  BATTLE_UNIT_CLASS_KNIGHT1,
  BATTLE_UNIT_CLASS_KNIGHT2,
  BATTLE_UNIT_CLASS_KNIGHT3,
  BattleUnitTemplate,
  getItemTemplate,
  getStatsDialogText,
  getUnitTemplate,
  ItemTemplate,
  StoreTemplate,
  UnitWithStackSize,
} from './db';
import { createCanvas, getSprite, spriteToCanvas } from './draw';
import { Game } from './game';
import { playSound } from './utils';

type UnitWithStackSizeAndCost = [number, number, number];

interface DialogWindowParams {
  title: string;
  text: string;
  sprite: string;
  onOk?: () => void;
  sim: BattleSimulation;
  store: StoreTemplate;
}

export type DialogWindowType = 'info' | 'store' | 'battle';

export interface DialogWindow {
  show(): void;
  remove(): void;
}

export const createElem = (e) => document.createElement(e);
const elemCache: Record<string, any> = {};
export const createCachedElem = (e, id, p) => {
  if (!elemCache[id]) {
    elemCache[id] = createElem(e);
    appendChild(p, elemCache[id]);
  }
  return elemCache[id];
};
export const appendChild = (p, c) => p.appendChild(c);
export const createTextElem = (elemName: string, text: string, ...r: any[]) => {
  const elem = createElem(elemName);
  elem.innerHTML = text;
  // if (r?.length) {
  for (const child of r) {
    appendChild(elem, child);
  }
  // }
  return elem;
};
export const clickOkayOnKeyPress = (btn: any) => {
  const localClick = btn.onclick;
  btn.onclick = (e) => {
    removeEventListener('keydown', listener);
    if (localClick) {
      localClick.call(this, e);
    }
  };
  const listener = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      btn.onclick(e);
    }
  };
  addEventListener('keydown', listener);
};

const setDisabled = (elem: HTMLButtonElement, disabled: boolean) => {
  elem.disabled = disabled;
  elem.style.background = disabled ? 'grey' : '';
};

const getUpgradeForUnit = (unitId: number) => {
  if (unitId === BATTLE_UNIT_CLASS_ARCHER1) {
    return [BATTLE_UNIT_CLASS_ARCHER2, 2];
  }
  if (unitId === BATTLE_UNIT_CLASS_ARCHER2) {
    return [BATTLE_UNIT_CLASS_ARCHER3, 2];
  }
  if (unitId === BATTLE_UNIT_CLASS_FOOTMAN1) {
    return [BATTLE_UNIT_CLASS_FOOTMAN2, 2];
  }
  if (unitId === BATTLE_UNIT_CLASS_FOOTMAN2) {
    return [BATTLE_UNIT_CLASS_FOOTMAN3, 2];
  }
  if (unitId === BATTLE_UNIT_CLASS_KNIGHT1) {
    return [BATTLE_UNIT_CLASS_KNIGHT2, 2];
  }
  if (unitId === BATTLE_UNIT_CLASS_KNIGHT2) {
    return [BATTLE_UNIT_CLASS_KNIGHT3, 2];
  }
};

export const createDialogWindow = (
  type: DialogWindowType,
  params: Partial<DialogWindowParams>,
  game: Game
) => {
  const DIV = 'div';
  const P = 'p';
  const SPAN = 'span';

  const anyParams = params as any;
  const bg = createElem(DIV);
  Object.assign(bg.style, {
    width: '100%',
    height: '100%',
    position: 'fixed',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    top: 0,
    left: 0,
  });
  bg.id = 'dialog';
  const base = createElem(DIV);
  Object.assign(base.style, {
    width: '650px',
    backgroundColor: 'black',
    padding: '20px',
  });
  appendChild(bg, base);

  const cl: DialogWindow = {
    show: () => {
      document.body.appendChild(bg);
    },
    remove: () => {
      bg.remove();
    },
  };
  const store = anyParams.store as StoreTemplate;
  if (store) {
    anyParams.text = store.text;
    anyParams.sprite = store.sprite;
  }

  const createImgElem = (sprite: string) => {
    const imgElem = createElem('img');
    const canv = spriteToCanvas(getSprite(sprite));
    imgElem.src = canv.toDataURL();
    Object.assign(imgElem.style, {
      width: '64px',
      height: '64px',
      imageRendering: 'pixelated',
    });
    return imgElem;
  };

  const addBodyTextImage = () => {
    const { title, text, sprite } = anyParams;
    const titleElem = createTextElem('b', title + '<br><br>');
    appendChild(base, titleElem);
    const imgElem = createImgElem(sprite);
    appendChild(base, imgElem);
    const bodyElem = createTextElem(P, text);
    appendChild(base, bodyElem);
  };

  const createSpanGoldElem = () => {
    const spanElemGold = createElem(DIV);
    spanElemGold.style.position = 'relative';
    spanElemGold.style.display = 'inline-block';
    const imageElemGold = createImgElem('ts_18');
    imageElemGold.style.position = 'absolute';
    imageElemGold.style.transform = 'translate(-12px, -38px)';
    appendChild(spanElemGold, imageElemGold);
    return spanElemGold;
  };

  switch (type) {
    case 'info': {
      addBodyTextImage();
      const buttonsElem = createElem(P);
      Object.assign(buttonsElem.style, {
        textAlign: 'right',
      });
      const okButton = createTextElem('button', 'OK');
      okButton.onclick = () => {
        cl.remove();
        // playSound('blip');
        if (params.onOk) {
          params.onOk();
        }
      };
      clickOkayOnKeyPress(okButton);

      appendChild(buttonsElem, okButton);
      appendChild(base, buttonsElem);
      break;
    }
    case 'store': {
      addBodyTextImage();

      const storeArea = createElem(DIV);

      const renderButtonList = (
        items: number[],
        buttonText: string,
        getCost: (item: ItemTemplate) => number,
        onClick: (
          itemId: number,
          item: ItemTemplate,
          elem: HTMLButtonElement
        ) => void
      ) => {
        const storeSubArea = createElem(DIV);
        storeSubArea.style.height = '150px';
        storeSubArea.style.overflowY = 'auto';
        for (const itemId of items) {
          const item = getItemTemplate(itemId);
          const itemElem = createElem(P);
          itemElem.id = 'div_' + itemId;
          const cost = getCost(item);
          const canBuy = game.pl.gold >= cost;
          const itemText = '<b>' + item.name + '</b> - ' + cost + ' gold';

          const span = createTextElem(SPAN, itemText, createSpanGoldElem());
          if (item.stats) {
            const itemStatText = getStatsDialogText(item.stats);
            const itemStatElem = createTextElem(SPAN, itemStatText);
            itemStatElem.style.marginLeft = '54px';
            appendChild(span, itemStatElem);
          }

          // appendChild(itemElem, itemTextElem);
          const button = createTextElem('button', buttonText);
          button.style.marginRight = '16px';
          button.onclick = () => {
            onClick(itemId, item, itemElem);
            storeRenderInner.remove();
            renderInner();
            playSound('blip');
          };
          if (!canBuy || !itemId) {
            setDisabled(button, true);
          }
          // const itemTextElem = createTextElem(DIV, '', button, span);
          appendChild(itemElem, button);
          appendChild(itemElem, span);
          appendChild(storeSubArea, itemElem);
        }
        appendChild(storeRenderInner, storeSubArea);
      };

      const renderRecruitList = (recruitList: UnitWithStackSizeAndCost[]) => {
        const storeSubArea = createElem(DIV);

        storeSubArea.style.height = '154px';
        // storeSubArea.style.overflowY = 'auto';
        for (const [unitId, stackSize, cost] of recruitList) {
          const unit = getUnitTemplate(unitId);
          const unitElem = createElem(DIV);
          const unitText = `Units (${stackSize}) - ` + cost + ' gold';
          const canBuy = game.pl.gold >= cost;
          const unitTextElem = createTextElem(
            P,
            unitText,
            createSpanGoldElem()
          );
          // unitTextElem.style.transform = 'translateY(32px)';
          appendChild(unitElem, unitTextElem);

          const divButton = createElem(DIV);
          divButton.style.display = 'flex';
          divButton.style.flexDirection = 'column';
          divButton.style.alignItems = 'flex-start';

          const imageElemRecruit = createImgElem('ts_' + unit.sprInd);
          // imageElemRecruit.style.transform = 'translate(101px, 16px)';

          const button = createTextElem('button', 'Recruit');
          button.style.marginTop = '8px';
          // button.style.transform = 'translateX(280px)';

          button.onclick = () => {
            if (game.pl.gold >= cost) {
              game.pl.gold -= cost;
              game.pl.unit[1] += stackSize;
              recruitList.splice(0, 1);
              storeRenderInner.remove();
              renderInner();
              playSound('blip');
            }
          };

          if (!canBuy) {
            setDisabled(button, true);
          }

          appendChild(divButton, imageElemRecruit);
          appendChild(divButton, button);
          appendChild(unitElem, divButton);
          appendChild(storeSubArea, unitElem);
        }

        if (!recruitList.length) {
          const itemTextElem = createTextElem(
            P,
            'You have already recruited these units.'
          );
          itemTextElem.style.color = 'red';
          appendChild(storeSubArea, itemTextElem);
        }

        appendChild(storeRenderInner, storeSubArea);
      };

      let storeRenderInner;
      const renderInner = () => {
        storeRenderInner = createElem(DIV);
        const goldTextElem = createTextElem(
          DIV,
          'You have ' + game.pl.gold + ' gold',
          createSpanGoldElem()
        );
        goldTextElem.style.color = 'yellow';
        appendChild(storeRenderInner, goldTextElem);
        if (store.items) {
          appendChild(storeRenderInner, createTextElem(P, '<b>BUY ITEMS</b>'));
          renderButtonList(
            store.items,
            'Buy',
            (item) => item.cost,
            (itemId, item, elem) => {
              if (game.pl.gold >= item.cost) {
                game.pl.gold -= item.cost;
                game.pl.addItem(itemId);
                store.items = (store as any).items.filter((i) => i !== itemId);
                elem.remove();
              }
            }
          );

          appendChild(storeRenderInner, createTextElem(P, '<b>SELL ITEMS</b>'));
          renderButtonList(
            game.pl.items,
            'Sell',
            (item) => item.sellCost,
            (itemId, item, elem) => {
              game.pl.gold += item.sellCost;
              game.pl.removeItem(itemId);
              elem.remove();
            }
          );
        }
        if (store.recruit) {
          // appendChild(storeRenderInner, createTextElem(P, 'Hire Recruits.'));
          console.log('RENDER RECRUIT', store.recruit);
          renderRecruitList(store.recruit);
          // renderUpgList(game.pl.units);
        }
        appendChild(storeArea, storeRenderInner);
      };
      renderInner();

      // if (!store.items.length) {
      //   const itemTextElem = createTextElem(P, 'No items!');
      //   appendChild(storeArea, itemTextElem);
      // }
      appendChild(base, storeArea);

      const buttonsElem = createElem(P);
      Object.assign(buttonsElem.style, {
        textAlign: 'right',
      });
      const okButton = createTextElem('button', 'OK');
      okButton.onclick = () => {
        cl.remove();
      };
      clickOkayOnKeyPress(okButton);
      appendChild(buttonsElem, okButton);
      appendChild(base, buttonsElem);
      break;
    }
    case 'battle': {
      const titleElem = createTextElem('b', 'Battle' + '<br><br>');
      appendChild(base, titleElem);

      const actionsArea = createElem(DIV);
      // const infoArea = createTextElem(P, 'Drag units to change formation.');
      // appendChild(actionsArea, infoArea);
      // const waitButton = createTextElem('button', 'Fight!');
      // waitButton.onclick = () => {
      //   anyParams.sim.start();
      //   // anyParams.sim.wait();
      // };
      // appendChild(actionsArea, waitButton);
      // const defendButton = createTextElem('button', 'Defend');
      // defendButton.onclick = () => {
      //   // anyParams.sim.defend();
      // };
      // appendChild(actionsArea, defendButton);
      appendChild(base, actionsArea);

      const [canv, ctx] = createCanvas(650, 350);
      appendChild(base, canv);

      const fightArea = createElem(DIV);
      Object.assign(fightArea.style, {
        display: 'flex',
        justifyContent: 'center',
        marginTop: '4px',
        // alignItems: 'center',
      });
      const retreatButton = createTextElem('button', 'Retreat');
      retreatButton.onclick = () => {
        sim.onCompleted('retreat');
        cl.remove();
      };
      retreatButton.style['margin-right'] = '16px';
      appendChild(fightArea, retreatButton);
      const fightButton = createTextElem('button', 'FIGHT!');
      fightButton.onclick = () => {
        anyParams.sim.start();
        const s = (b) => {
          b.style.visibility = 'hidden';
        };
        s(fightButton);
        s(retreatButton);
        playSound('fight');
        // infoArea.innerHTML = 'Select unit and click to move.';
        // anyParams.sim.wait();
      };
      appendChild(fightArea, fightButton);
      appendChild(base, fightArea);

      const sim: BattleSimulation = anyParams.sim;
      sim.setCtx(ctx, cl, base);
    }
  }

  return cl;
};
