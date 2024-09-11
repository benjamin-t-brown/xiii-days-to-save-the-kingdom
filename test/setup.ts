(window as any).TEST = true;

async function setup() {
  window.AudioContext = function () {};
}

setup();
