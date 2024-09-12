import { initDb } from './db';
import { clearScreen, getCanvas, loadImagesAndSprites, setFm } from './draw';
import { initEvents } from './events';
import { Game } from './game';
import { getNow, normalize, utilsAddEventListener } from './utils';
import { setVolume } from './zzfx';

// utilsAddEventListener(window, 'load', () => {
//   start();
//   // setVolume(0);
// });
window.addEventListener('load', () => {
  start();
  // setVolume(0);
});

const EXPECTED_FS = 10;
export const start = async () => {
  await load();
  console.log('done loading');
  const game = new Game();
  initEvents(game);
  loop(game);
};

const load = async () => {
  console.log('loading...');
  await initDb();
};

const loop = (game: Game) => {
  const startTime = getNow();
  let prevNow = startTime;

  const msPerUpdate = 22;
  const targetMult = normalize(msPerUpdate, 16, 30, 1, 2);

  const _loop = () => {
    const now = getNow();
    let frameTime = now - prevNow;
    // let prevFrameTime = Math.floor(frameTime);
    prevNow = now;
    const dt = frameTime;

    if (frameTime > 4) {
      frameTime = 4;
    }
    const deltaTime = frameTime;
    frameTime -= deltaTime;
    const fm = (deltaTime * targetMult) / EXPECTED_FS;
    setFm(fm);

    game.update(Math.min(dt, 33));
    (window as any).game = game;

    // draw.drawText('FS: ' + prevFrameTime, draw.width - 100, 50, {
    //   align: 'left',
    // });
  };

  const _loopRender = () => {
    clearScreen();
    game.draw();
    requestAnimationFrame(_loopRender);
  };

  setInterval(_loop, msPerUpdate);
  _loopRender();
};

(window as any).vol = (input: HTMLInputElement) => {
  const v = (Number(input.value) * 0.3) / 100;
  setVolume(v);
  console.log('SET VOL', v);
};
