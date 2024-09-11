import {
  Point,
  at,
  createAdjacentIterArrayHex,
  pointRectCollides,
  pointsEq,
} from './utils';
import { getTilePathCost } from './db';
import { WorldMap } from './game';

const pointToKey = ([x, y]: Point) => `${x},${y}`;
const indToKey = (i: number, w: number) => `${i % w},${Math.floor(i / w)}`;

export const createCostMap = (room: WorldMap, end?: Point) => {
  const arr: number[] = [];
  for (const hexTile of room.tiles) {
    let cost = getTilePathCost(hexTile.id);
    if (hexTile.event && !pointsEq([hexTile.x, hexTile.y], end ?? [-1, -1])) {
      cost = 100;
    }
    arr.push(cost);
  }

  return arr;
};

// simple Dijkstra
export const findPath = (
  costMap: number[],
  w: number,
  start: Point,
  end: Point
): { path: Point[]; cost: number; costs: number[] } => {
  const h = costMap.length / w;
  // const isValid = (x: number, y: number) => x >= 0 && x < w && y >= 0 && y < h;
  const isValid = (x: number, y: number) =>
    pointRectCollides([x, y], [0, 0, w, h]);

  const dist = new Map<string, number>();
  const prev = new Map<string, Point>();

  const pq: [number, Point][] = [[0, start]];
  for (let i = 0; i < costMap.length; i++) {
    dist.set(indToKey(i, w), Infinity);
    // prev.set(indToKey(i, w), undefined);
  }

  dist.set(pointToKey(start), 0);

  while (pq.length > 0) {
    pq.sort((a, b) => a[0] - b[0]);
    const [currentCost, [x, y]] = pq.shift()!;
    const adjacentTiles = createAdjacentIterArrayHex([x, y]);
    for (const [nx, ny] of adjacentTiles) {
      if (isValid(nx, ny)) {
        const newCost = currentCost + at([nx, ny], costMap, w);
        if (newCost < dist.get(pointToKey([nx, ny]))!) {
          dist.set(pointToKey([nx, ny]), newCost);
          prev.set(pointToKey([nx, ny]), [x, y]);
          pq.push([newCost, [nx, ny]]);
        }
      }
    }
  }

  const startPoint = prev.get(pointToKey(end));
  const costs: number[] = [];
  if (startPoint) {
    const path: Point[] = [];
    let curr: Point | undefined = end;
    while (curr) {
      path.push(curr);
      costs.push(dist.get(pointToKey(curr))!);
      curr = prev.get(pointToKey(curr));
    }
    return {
      path: path.reverse(),
      cost: dist.get(pointToKey(end))!,
      costs: costs.reverse(),
    };
  }

  return { path: [], cost: Infinity, costs }; // No path found
};
