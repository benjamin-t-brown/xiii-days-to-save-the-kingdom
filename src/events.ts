import { createdAutomatedControl } from './automatedController';
import {
  EVENT_DAY1,
  EVENT_DAY13,
  EVENT_DAY_LOSS,
  EVENT_DAY_N,
  EventTemplate,
  getEventTemplate,
  getTilePathCost,
} from './db';
import { getCanvas } from './draw';
import { Game, HexTile } from './game';
import { createCostMap, findPath } from './path';
import {
  createAdjacentIterArrayHex,
  createHex,
  EV_MOUSEDOWN,
  EV_MOUSEMOVE,
  EV_MOUSEUP,
  getIndOfLastMoveableTile,
  Hex,
  playSound,
  Point,
  pointHexCollides,
  pointRectCollides,
  utilsAddEventListener,
} from './utils';

const isPanZoomEvent = (ev) => {
  const targetId = ev.target?.id;
  return targetId === 'canv';
};

const panZoom = {
  translateX: 0,
  translateY: 0,
  scale: 1,

  lastClickX: 0,
  lastClickY: 0,
  lastTranslateX: 0,
  lastTranslateY: 0,
  isDragging: false,
  mouseX: 0,
  mouseY: 0,
};

export const getPanZoom = () => {
  return panZoom;
};

export const resetPanZoom = () => {
  const panZoom = getPanZoom();
  panZoom.translateX = 0;
  panZoom.translateY = 0;
  panZoom.scale = 1;
};

const getCanvasBoundingClientRect = () => {
  return (
    getCanvas().getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    }
  );
};

export const focusOn = (
  xScreen: number,
  yScreen: number,
  nextScale: number
) => {
  const [focalX, focalY] = screenCoordsToCanvasCoords(xScreen, yScreen);

  const offsetX = Math.round(
    focalX - (nextScale / panZoom.scale) * (focalX - panZoom.translateX)
  );
  const offsetY = Math.round(
    focalY - (nextScale / panZoom.scale) * (focalY - panZoom.translateY)
  );

  panZoom.translateX = offsetX;
  panZoom.translateY = offsetY;
  panZoom.scale = nextScale;
};

export const lookAt = (x: number, y: number) => {
  const canvas = getCanvas();
  if (!canvas) {
    return;
  }

  const oldScale = panZoom.scale;

  const canvasW = canvas.width;
  const canvasH = canvas.height;

  const newScale = 1;
  const offsetX = canvasW / 2 - x;
  const offsetY = canvasH / 2 - y;

  panZoom.translateX = offsetX;
  panZoom.translateY = offsetY;
  panZoom.scale = newScale;
  focusOn(offsetX, offsetY, oldScale);
};

export const screenCoordsToCanvasCoords = (x: number, y: number) => {
  const { left, top } = getCanvasBoundingClientRect();

  const canvasX = x - left;
  const canvasY = y - top;

  return [canvasX, canvasY];
};

export const canvasCoordsToScreenCoords = (x: number, y: number) => {
  const { left, top } = getCanvasBoundingClientRect();

  const screenX = x + left;
  const screenY = y + top;

  return [screenX, screenY];
};
export const screenCoordsToMapCoords = (x: number, y: number, game: Game) => {
  const [canvasX, canvasY] = screenCoordsToCanvasCoords(x, y);
  const canvas = getCanvas();
  if (!canvas) {
    return [0, 0];
  }

  const canvasW = canvas.width;
  const canvasH = canvas.height;

  // const mapX =
  //   canvasX -
  //   panZoom.translateX -
  //   panZoom.scale * (canvasW / 2 - (game.map.w * 16) / 2);
  // const mapY =
  //   canvasY -
  //   panZoom.translateY -
  //   panZoom.scale * (canvasH / 2 - (game.map.h * 16) / 2);

  const mapX = canvasX - panZoom.translateX;
  const mapY = canvasY - panZoom.translateY;

  return [mapX / panZoom.scale, mapY / panZoom.scale];
};

export const screenCoordsToTileIndex = (
  x: number,
  y: number,
  game: Game
): [number, number, number, number, number] => {
  const [mapX, mapY] = screenCoordsToMapCoords(x, y, game);
  // console.log('MAP COORDS', mapX, mapY);

  let tileX = Math.floor(mapX / 16);
  if (tileX % 2 === 1) {
    tileX = Math.floor((mapX - 8) / 16);
  }
  const tileY = Math.floor(mapY / 12);
  const iterArrayHex = [
    [tileX, tileY],
    ...createAdjacentIterArrayHex([tileX, tileY]),
  ];
  for (const [x, y] of iterArrayHex) {
    if (pointRectCollides([x, y], [0, 0, game.map.w, game.map.h])) {
      const hex =
        y % 2 === 0
          ? createHex([x * 16, y * 12, 16, 16])
          : createHex([8 + x * 16, y * 12, 16, 16]);
      // console.log('PUSH HEX AT', x, y, hex);
      if (pointHexCollides([Math.floor(mapX), Math.floor(mapY)], hex)) {
        // console.log('HEX FOUND!', hex);
        return [x + game.map.w * y, x, y, mapX, mapY];
        // console.log('Cost to', x, y, 'is', cost, path);
        break;
      }
      // hexList.push(hex);
    }
  }

  // const drawX = (x * tileSize + offsetAmount) * newScale;
  // const drawY = y * ((tileSize * 3) / 4) * newScale;

  // const tileX = Math.floor(mapX / 16);
  // const tileY = Math.floor(mapY / ((16 * 3) / 4));

  if (
    mapX > game.map.w * 16 ||
    mapY > game.map.h * 16 ||
    mapX < 0 ||
    mapY < 0
  ) {
    return [-1, tileX, tileY, mapX, mapY];
  }

  return [tileY * game.map.w + tileX, tileX, tileY, mapX, mapY];
};

export const initEvents = (game: Game) => {
  utilsAddEventListener(window, EV_MOUSEDOWN, (ev) => {
    if (ev.target.id !== 'canv') {
      return;
    }
    ev.preventDefault();
    if (
      (ev.button === 1 || ev.button === 2 || ev.button === 0) &&
      isPanZoomEvent(ev)
    ) {
      panZoom.lastClickX = ev.clientX;
      panZoom.lastClickY = ev.clientY;
      panZoom.lastTranslateX = panZoom.translateX;
      panZoom.lastTranslateY = panZoom.translateY;
      panZoom.isDragging = true;
    }
  });
  utilsAddEventListener(window, EV_MOUSEMOVE, (ev) => {
    panZoom.mouseX = ev.clientX;
    panZoom.mouseY = ev.clientY;

    if (panZoom.isDragging) {
      panZoom.translateX =
        panZoom.lastTranslateX + ev.clientX - panZoom.lastClickX;
      panZoom.translateY =
        panZoom.lastTranslateY + ev.clientY - panZoom.lastClickY;
    } else {
      const [ind, x, y] = screenCoordsToTileIndex(ev.clientX, ev.clientY, game);
      // console.log('HOVER TILE', ind, x, y);
      const nextHovTile = game.map.tiles[ind];
      if (nextHovTile !== game.hovTile) {
        game.hovTile = nextHovTile;
      }
    }
  });
  utilsAddEventListener(window, EV_MOUSEUP, (ev) => {
    if (panZoom.isDragging) {
      const nextX = panZoom.lastTranslateX + ev.clientX - panZoom.lastClickX;
      const nextY = panZoom.lastTranslateY + ev.clientY - panZoom.lastClickY;
      const dx = panZoom.lastClickX - ev.clientX;
      const dy = panZoom.lastClickY - ev.clientY;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        if (ev.button === 0) {
          if (game.areInputEventsDisabled()) {
            return;
          }
          const [ind, x, y] = screenCoordsToTileIndex(
            ev.clientX,
            ev.clientY,
            game
          );
          const costMap = createCostMap(game.map, [x, y]);
          const { x: plX, y: plY } = game.pl;
          const { path, cost } = findPath(
            costMap,
            game.map.w,
            [plX, plY],
            [x, y]
          );

          if (cost < 100) {
            if (game.pl.pathTarget === ind) {
              // game.pl.updateDayGauge(cost);
              game.pl.showPath = false;
              game.pl.previewCost = 0;
              let isNewDay = false;
              const lastI = getIndOfLastMoveableTile(path, game);
              const lastTarget = path[lastI];
              const lastTile =
                game.map.tiles[lastTarget[0] + lastTarget[1] * game.map.w];

              let eventTemplate: any;

              for (let i = 1; i < path.length; i++) {
                const [x, y] = path[i];

                game.ac.addAutomatedControl(
                  createdAutomatedControl(
                    50,
                    () => {
                      // TODO figure this out when you have an epiphany
                      // game.pl.flipped = y % 2 == 0 ? x < game.pl.x : x <= game.pl.x;
                      // console.log('check flipped', game.pl.flipped, x, game.pl.x);
                    },
                    () => {
                      const tile = game.map.tiles[x + y * game.map.w];
                      const localCost = getTilePathCost(tile.id);
                      game.pl.x = x;
                      game.pl.y = y;
                      isNewDay = game.pl.updateDayGauge(localCost);
                      game.map.determineVision([x, y]);
                      playSound('horse_step');

                      if (isNewDay) {
                        const daysLeft = 13 - game.pl.day;
                        const eventId = (() => {
                          if (daysLeft === 12) {
                            return EVENT_DAY1;
                          }
                          if (daysLeft === 1) {
                            return EVENT_DAY13;
                          }
                          if (daysLeft === 0) {
                            return EVENT_DAY_LOSS;
                          }
                          return EVENT_DAY_N;
                        })();
                        eventTemplate = getEventTemplate(eventId)(game, 0, 0);
                      }
                    }
                  )
                );
                if (i >= lastI) {
                  break;
                }
              }

              game.ac.addAutomatedControl(
                createdAutomatedControl(
                  50,
                  () => {},
                  () => {
                    const ev = (lastTile as HexTile).event;
                    if (ev) {
                      if (eventTemplate) {
                        eventTemplate.dialog.onOk = () => {
                          game.doEvent(ev as EventTemplate);
                        };
                        game.doEvent(eventTemplate);
                      } else {
                        game.doEvent(ev as EventTemplate);
                      }
                    } else if (eventTemplate) {
                      game.doEvent(eventTemplate);
                    }
                  }
                )
              );
            } else {
              game.pl.pathTarget = ind;
              game.pl.path = path;
              game.pl.previewCost = cost;
              game.pl.showPath = true;
            }
          } else {
            console.log('Path too long', cost);
          }
        }
      }
      panZoom.translateX = nextX;
      panZoom.translateY = nextY;
      panZoom.isDragging = false;
    }
  });
  utilsAddEventListener(window, 'contextmenu', (ev) => {
    if (isPanZoomEvent(ev)) {
      ev.preventDefault();
    }
  });
  utilsAddEventListener(window, 'wheel', (ev) => {
    if (isPanZoomEvent(ev)) {
      let nextScale = panZoom.scale;
      const scaleStep = 1;
      if (ev.deltaY > 0) {
        // zoom out
        nextScale -= scaleStep;
      } else {
        // zoom in
        nextScale += scaleStep;
      }
      if (nextScale > 10) {
        nextScale = 10;
      } else if (nextScale < 1) {
        nextScale = 1;
      }
      focusOn(ev.clientX, ev.clientY, nextScale);
    }
  });
  addEventListener('keydown', (ev) => {
    if (game.areInputEventsDisabled()) {
      return;
    }
    if (ev.key === ' ') {
      const currentTile = game.map.tiles[game.pl.x + game.pl.y * game.map.w];
      const ev = (currentTile as HexTile).event;
      if (ev) {
        game.doEvent(ev as EventTemplate);
      }
    }
  });

  // focusOn(window.innerWidth / 2, window.innerHeight / 2, 4);
};
