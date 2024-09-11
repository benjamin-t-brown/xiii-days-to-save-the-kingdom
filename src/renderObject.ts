import { drawSprite, getCtx } from './draw';

export interface RenderObject {
  x: number;
  y: number;
  sprite: string;
  sprColor: string;
  scale: number;
  offsetX: number;
  offsetY: number;
  filter: string;
  flipped: boolean;
}

export const createRenderObject = (): RenderObject => {
  return {
    x: 0,
    y: 0,
    sprite: '',
    sprColor: '',
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    filter: '',
    flipped: false,
  };
};

export const drawRenderObject = (
  ro: RenderObject,
  ctx?: CanvasRenderingContext2D
) => {
  ctx = ctx ?? getCtx();
  ctx.save();
  if (ro.filter) {
    ctx.filter = ro.filter;
  }
  drawSprite(
    ro.sprite +
      (ro.sprColor ? '_' + ro.sprColor : '') +
      (ro.flipped ? '_f' : ''),
    ro.x + ro.offsetX,
    ro.y + ro.offsetY,
    ro.scale,
    ctx
  );
  ctx.restore();
};
