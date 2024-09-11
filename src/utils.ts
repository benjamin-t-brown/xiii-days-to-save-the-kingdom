import { getSound, getTilePathCost } from './db';
import { Game } from './game';
import { rand, zzfxPlaySound } from './zzfx';

export type Direction = 'l' | 'r';

export const COLOR_SEMI_TRANSPARENT = 'rgba(0,0,0,0.4)';

export const getNow = () => {
  return window.performance.now();
};

export type Point = [number, number];
export type Point3d = [number, number, number];
export type Vec4 = [number, number, number, number];
export type Circle = Point3d;
export type Rect = [number, number, number, number];

export const normalize = (
  x: number,
  a: number,
  b: number,
  c: number,
  d: number
) => {
  return c + ((x - a) * (d - c)) / (b - a);
};

export const dist = (p1: Point, p2: Point) => {
  return Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);
};

export const at = ([x, y]: Point, arr: any[], width: number) => {
  if (x < 0 || x >= width) {
    return -Infinity;
  }
  if (y < 0 || y >= width) {
    return -Infinity;
  }

  return arr[x + y * width];
};

export const pointsEq = (p1: Point, p2: Point) => {
  // return '' + p1 === '' + p2;
  return p1?.[0] === p2?.[0] && p1?.[1] === p2?.[1];
};

export const timeoutPromise = async (ms: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export class Timer {
  ms: number;
  s: number = -999;
  constructor(ms: number) {
    this.ms = ms;
  }
  start() {
    this.s = 0;
  }
  stop() {
    this.s = -1;
  }
  pct() {
    return Math.max(0, Math.min(1, this.s / this.ms));
  }
  complete() {
    this.s = -999;
  }
  isDone() {
    return this.s >= this.ms;
  }
  update(dt: number) {
    if (this.s >= 0) {
      this.s += dt;
    }
  }
}

const keys: Record<string, boolean> = {};

export const isKeyDown = (k: string) => {
  return keys[k];
};

export const playSound = (soundName: string) => {
  const s = getSound(soundName);
  zzfxPlaySound(s);
};

export const randInArr = (arr: any[]) => {
  return arr[Math.floor(rand() * arr.length)];
};

export const createAdjacentIterArrayHex = ([x, y]: Point): Point[] => {
  if (y % 2 === 0) {
    return [
      [x - 1, y],
      [x + 1, y],
      [x - 1, y - 1],
      [x, y - 1],
      [x - 1, y + 1],
      [x, y + 1],
    ];
  } else {
    return [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x + 1, y - 1],
      [x, y + 1],
      [x + 1, y + 1],
    ];
  }
};

export const printArr = (arr: number[], w: number) => {
  let str = '';
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < w; j++) {
      const v = arr[j + i * w];
      str += ' ';
      if (v >= 0) {
        str += ' ';
      }
      str += v + ',';
    }
    str += '\n';
  }

  console.log(str);
};

export const EV_MOUSEDOWN = 'mousedown';
export const EV_MOUSEUP = 'mouseup';
export const EV_MOUSEMOVE = 'mousemove';
export const EV_MOUSECLICK = 'click';
export const EV_KEYDOWN = 'keydown';
export const EV_KEYUP = 'keyup';

export const utilsAddEventListener = (
  elem: HTMLElement | Window,
  evName: string,
  cb: any
) => {
  elem.addEventListener(evName, cb);
};

export const pointRectCollides = (p: Point, r: Rect) => {
  return (
    p[0] >= r[0] && p[0] <= r[0] + r[2] && p[1] >= r[1] && p[1] <= r[1] + r[3]
  );
};

export const rectanglesIntersect = (rect1: Rect, rect2: Rect) => {
  const [x1, y1, width1, height1] = rect1;
  const [x2, y2, width2, height2] = rect2;

  return (
    x1 < x2 + width2 &&
    x1 + width1 > x2 &&
    y1 < y2 + height2 &&
    y1 + height1 > y2
  );
};

export const createHex = (rect: Rect): Hex => {
  const [x, y, w, h] = rect;
  const hw = w / 2;
  const th = h / 4;
  return [
    [x + hw, y],
    [x + w, y + th],
    [x + w, y + 3 * th],
    [x + hw, y + h],
    [x, y + 3 * th],
    [x, y + th],
  ];
};

export type Hex = Point[];
export const pointHexCollides = (p: Point, poly: Hex) => {
  let collision = false;
  let next = 0;
  for (let current = 0; current < poly.length; current++) {
    next = current + 1;
    if (next == poly.length) {
      next = 0;
    }
    const vc = poly[current];
    const vn = poly[next];
    if (
      ((vc[1] >= p[1] && vn[1] < p[1]) || (vc[1] < p[1] && vn[1] >= p[1])) &&
      p[0] < ((vn[0] - vc[0]) * (p[1] - vc[1])) / (vn[1] - vc[1]) + vc[0]
    ) {
      collision = !collision;
    }
  }

  return collision;
};

export const getIndOfLastMoveableTile = (path: Point[], game: Game) => {
  let lastI = 0;
  let dayGaugeCost = game.pl.dayGauge.s;
  for (lastI = 1; lastI < path.length; lastI++) {
    const [x, y] = path[lastI];
    const tile = game.map.tiles[x + y * game.map.w];
    const localCost = getTilePathCost(tile.id);
    dayGaugeCost += localCost;
    if (dayGaugeCost >= game.pl.dayGauge.ms) {
      break;
    }
  }
  return lastI >= path.length ? lastI - 1 : lastI;
};

export const shuffle = (arr: any[]) => {
  return arr
    .map((v) => ({ v, s: Math.random() }))
    .sort((a, b) => a.s - b.s)
    .map(({ v }) => v);
};

utilsAddEventListener(window, 'keydown', (e) => {
  keys[e.key] = true;
});
utilsAddEventListener(window, 'keyup', (e) => {
  keys[e.key] = false;
});

// export const pxPosToTilePos = (px: number, py: number): Point => {
//   const tileWidth = 16;
//   const tileHeight = 16;
//   const x = px / tileWidth;
//   const y = py / tileHeight;
//   return [x, y];
// };
