import { Point, getNow, utilsAddEventListener } from './utils';

export interface DrawTextParams {
  font?: string;
  color?: string;
  size?: number;
  align?: 'left' | 'center' | 'right';
  strokeColor?: string;
}
const DEFAULT_TEXT_PARAMS = {
  font: 'monospace',
  color: '#fff',
  size: 14,
  align: 'center',
  strokeColor: 'black',
};

const IMAGE_SMOOTHING_ENABLED = 'imageSmoothingEnabled';

let fm = 1;
export const setFm = (n: number) => {
  fm = n;
};
export const getFm = () => fm;

export const clearScreen = () => {
  const canvas = getCanvas();
  drawRect(0, 0, canvas.width, canvas.height, '#333');
};

export const setOpacity = (opacity: number, ctx?: CanvasRenderingContext2D) => {
  ctx = ctx || getCtx();
  ctx.globalAlpha = opacity;
};

export const drawSprite = (
  sprite: string | Sprite,
  x: number,
  y: number,
  scale?: number,
  ctx?: CanvasRenderingContext2D
) => {
  scale = scale || 1;
  ctx = ctx || getCtx();
  const spriteObj = typeof sprite === 'string' ? getSprite(sprite) : sprite;
  if (!spriteObj) {
    throw new Error(`No sprite: "${sprite}"`);
  }
  const [image, sprX, sprY, sprW, sprH] = spriteObj;

  ctx.drawImage(
    image,
    sprX,
    sprY,
    sprW,
    sprH,
    x,
    y,
    sprW * scale,
    sprH * scale
  );
};

export const drawRect = (
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  stroke?: boolean,
  ctx?: CanvasRenderingContext2D
) => {
  ctx = ctx || getCtx();
  const strokeKey = stroke ? 'stroke' : 'fill';
  ctx[strokeKey + 'Style'] = color;
  ctx[strokeKey + 'Rect'](x, y, w, h);
};

export const drawText = (
  text: string,
  x: number,
  y: number,
  textParams?: DrawTextParams,
  ctx?: CanvasRenderingContext2D
) => {
  const { font, size, color, align, strokeColor } = {
    ...DEFAULT_TEXT_PARAMS,
    ...(textParams || {}),
  };
  ctx = ctx || getCtx();
  ctx.font = `${size}px ${font}`;
  ctx.textAlign = align as CanvasTextAlign;
  ctx.textBaseline = 'middle';
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 4;
    ctx.strokeText(text, x, y);
  }

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

type ImageCollection = { [key: string]: HTMLImageElement };
type Sprite = [HTMLCanvasElement, number, number, number, number];
type SpriteCollection = { [key: string]: Sprite };
type AnimCollection = { [key: string]: Animation };

let model_canvas: HTMLCanvasElement | null = null;
let model_images: ImageCollection | null = {};
let model_sprites: SpriteCollection | null = {};

// export const getDrawModel = () => {
//   return [model_canvas, model_images, model_sprites];
// };

const createFlippedImg = (
  inputCanvas: HTMLCanvasElement
): HTMLCanvasElement => {
  const [canvas, ctx, width] = createCanvas(
    inputCanvas.width,
    inputCanvas.height
  );
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(inputCanvas, 0, 0);
  return canvas;
};

export const spriteToCanvas = (sprite: Sprite): HTMLCanvasElement => {
  const [, , , spriteWidth, spriteHeight] = sprite;
  const [canvas, ctx] = createCanvas(spriteWidth, spriteHeight);
  drawSprite(sprite, 0, 0, 1, ctx);
  return canvas;
};

export const loadSpritesheet = (
  spriteMap: SpriteCollection,
  image: HTMLImageElement,
  spritePrefix: string,
  spriteWidth: number,
  spriteHeight: number
) => {
  const createSprite = (
    name: string,
    image: HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    w: number,
    h: number
  ) => {
    const [canvas, ctx] = createCanvas(w, h);
    ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
    return (spriteMap[name] = [canvas, 0, 0, w, h]);
  };

  const createReplaceColorSprite = (
    sprite: Sprite,
    newName: string,
    colors: Map<string, string>
  ): Sprite => {
    const [canvas, ctx] = createCanvas(sprite[3], sprite[4]);
    drawSprite(sprite, 0, 0, 1, ctx);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const color = `${data[i]},${data[i + 1]},${data[i + 2]}`;
      const c = colors.get(color);
      if (c) {
        const [r, g, b, a] = c.split(',').map((s) => parseInt(s));
        data[i + 0] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = a;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    return createSprite(newName, canvas, 0, 0, sprite[3], sprite[4]);
  };

  const numSpritesX = image.width / spriteWidth;
  const numSpritesY = image.height / spriteHeight;
  for (let i = 0; i < numSpritesY; i++) {
    for (let j = 0; j < numSpritesX; j++) {
      const spriteName = `${spritePrefix}_${i * numSpritesX + j}`;
      const s1 = createSprite(
        spriteName,
        image,
        j * spriteWidth,
        i * spriteHeight,
        spriteWidth,
        spriteHeight
      );
      // const whiteMap = new Map();
      // const WHITE = '255,255,255';
      // whiteMap.set(WHITE, WHITE + ',0');
      // const s = createReplaceColorSprite(s1, spriteName, whiteMap);
      const flipped = createFlippedImg(spriteToCanvas(s1));
      const flippedSprite = createSprite(
        `${spriteName}_f`,
        flipped,
        0,
        0,
        spriteWidth,
        spriteHeight
      );
      const blueToRedColorMap = new Map();
      blueToRedColorMap.set('47,191,218', '255,83,74,255');
      blueToRedColorMap.set('77,97,156', '169,59,59,255');
      createReplaceColorSprite(s1, `${spriteName}_r`, blueToRedColorMap);
      createReplaceColorSprite(
        flippedSprite,
        `${spriteName}_r_f`,
        blueToRedColorMap
      );
    }
  }
};

type ImageDef = [string, string, number, number];
export const loadImagesAndSprites = async (images: ImageDef[]) => {
  getCanvas();
  const imageMap = {};
  const spriteMap = {};
  await Promise.all(
    images.map(([imageName, imagePath, spriteWidth, spriteHeight], i) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          imageMap[imageName] = img;
          loadSpritesheet(spriteMap, img, imageName, spriteWidth, spriteHeight);
          resolve();
        };
        img.src = imagePath;
      });
    })
  );

  model_images = imageMap;
  model_sprites = spriteMap;

  console.log(model_sprites);
};

export const createCanvas = (
  width: number,
  height: number
): [HTMLCanvasElement, CanvasRenderingContext2D, number, number] => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx[IMAGE_SMOOTHING_ENABLED] = false;
  return [canvas, ctx, width, height];
};

export const getCanvas = (): HTMLCanvasElement => {
  if (model_canvas) {
    return model_canvas as HTMLCanvasElement;
  } else {
    // const [canvas, ctx] = createCanvas(512, 512);
    const [canvas, ctx] = createCanvas(576, 576);
    canvas.id = 'canv';
    ctx.lineWidth = 2;
    // canvas.style.transform = 'scale(4)';
    (window as any).cdv.appendChild(canvas);
    const setCanvasSize = () => {
      const [canvas2, ctx2] = createCanvas(canvas.width, canvas.height);
      ctx2.drawImage(canvas, 0, 0);
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx[IMAGE_SMOOTHING_ENABLED] = false;
      ctx.drawImage(canvas2, 0, 0);
    };
    // window.addEventListener('resize', setCanvasSize);
    utilsAddEventListener(window as any, 'resize', setCanvasSize);
    setCanvasSize();
    model_canvas = canvas;
    return canvas;
  }
};

export const getCtx = (): CanvasRenderingContext2D => {
  return getCanvas().getContext('2d') as CanvasRenderingContext2D;
};

const getImage = (imageName: string): HTMLImageElement =>
  (model_images as ImageCollection)[imageName];
export const getSprite = (spriteName: string): Sprite =>
  (model_sprites as SpriteCollection)[spriteName];
