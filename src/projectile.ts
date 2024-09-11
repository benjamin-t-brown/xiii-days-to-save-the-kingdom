import { drawRect } from './draw';
import { normalize, Point, Timer } from './utils';

export interface Projectile {
  remV: boolean;
  cb: () => void;
  update(dt: number): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

export const createProjectile = (
  startPos: Point,
  endPos: Point,
  ms: number,
  heightMult: number,
  cb: () => void
) => {
  const [startX, startY] = startPos;
  const [endX, endY] = endPos;
  let x = startX;
  let y = startY;
  const timer = new Timer(ms);
  timer.start();

  console.log('CREATE PROJECTILE', startX, startY, endX, endY, ms);

  const cl = {
    remV: false,
    cb,
    update(dt: number) {
      const t = timer.pct();
      x = normalize(t, 0, 1, startX, endX);
      y = normalize(t, 0, 1, startY, endY) - heightMult * Math.sin(t * Math.PI);
      // console.log('UDPATE POS', t, x, y);
      timer.update(dt);
      if (timer.isDone()) {
        cl.remV = true;
      }
    },
    draw(ctx: CanvasRenderingContext2D) {
      drawRect(x, y, 4, 4, 'white', false, ctx);
    },
  };

  return cl;
};
