import { Timer } from './utils';

export interface LoopAnimWithTimer {
  timer: Timer;
  totalTimer: Timer;
  ind: number;
  maxInd: number;
  active: boolean;
}
export const createLoopAnimWithTimer = (
  ms: number,
  totalMs: number,
  maxInd: number
): LoopAnimWithTimer => {
  return {
    timer: new Timer(ms),
    totalTimer: new Timer(totalMs),
    ind: 0,
    maxInd,
    active: false,
  };
};
export const activateLoopAnimWithTimer = (anim: LoopAnimWithTimer) => {
  anim.active = true;
  anim.ind = 0;
  anim.timer.start();
  anim.totalTimer.start();
};
export const deactivateLoopAnimWithTimer = (anim: LoopAnimWithTimer) => {
  anim.active = false;
};
export const updateLoopAnimWithTimer = (
  anim: LoopAnimWithTimer,
  dt: number
) => {
  if (anim.active) {
    anim.timer.update(dt);
    anim.totalTimer.update(dt);
    if (anim.timer.isDone()) {
      anim.ind = (anim.ind + 1) % (anim.maxInd + 1);
      anim.timer.start();
    }
    if (anim.totalTimer.isDone()) {
      deactivateLoopAnimWithTimer(anim);
    }
  }
};
