import { Timer } from './utils';

export interface AutomatedControl {
  init: () => void;
  commit: () => void;
  timer: Timer;
}

export class AutomatedController {
  controls: AutomatedControl[] = [];
  currentControl: AutomatedControl | undefined;

  getCurrent() {
    return this.currentControl;
  }

  addAutomatedControl(automatedControl: AutomatedControl) {
    this.controls.push(automatedControl);
  }

  update(dt: number) {
    const currentAutomatedControl = this.currentControl;
    if (currentAutomatedControl) {
      currentAutomatedControl.timer.update(dt);
      if (currentAutomatedControl.timer.isDone()) {
        currentAutomatedControl.commit();
        this.controls.shift();
        this.currentControl = undefined;
      }
    }

    if (this.controls.length) {
      const aControl = this.controls[0];
      if (!this.currentControl) {
        this.currentControl = aControl;
        aControl.init();
        aControl.timer.start();
      }
    }
  }
}

export const createdAutomatedControl = (
  ms = 100,
  init = () => void 0,
  commit = () => void 0
): AutomatedControl => {
  return {
    init,
    commit,
    timer: new Timer(ms),
  };
};
