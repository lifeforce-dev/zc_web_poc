import { EffectsManager } from './webgl-effects.js';
import { voidStormShaderDef, voidStormConfig } from './shaders/void-storm-shader.js';

const DEFAULTS = {
  freqMin: 0.05,
  freqMax: 0.25,
  brightMin: 0.20,
  brightMax: 0.60,
  swirlSpeed: 0.20,
  driftSpeed: 0.22,
};

document.addEventListener('DOMContentLoaded', () => {
  Object.assign(voidStormConfig, DEFAULTS);

  const manager = new EffectsManager();
  manager.registerShader('void-storm', voidStormShaderDef);

  const canvases = document.querySelectorAll('.wall canvas');
  canvases.forEach((canvas, i) => {
    const seed = i * 8.91 + Math.random() * 100;
    manager.registerCanvasElement(canvas, 'void-storm', { seed });
  });

  const sliders = {
    'freq-min': 'freqMin',
    'freq-max': 'freqMax',
    'bright-min': 'brightMin',
    'bright-max': 'brightMax',
    'swirl-speed': 'swirlSpeed',
    'drift-speed': 'driftSpeed',
  };

  Object.entries(sliders).forEach(([id, key]) => {
    const slider = document.getElementById(id);
    const display = document.getElementById(id + '-val');
    if (!slider || !display) {
      return;
    }

    slider.addEventListener('input', () => {
      voidStormConfig[key] = parseFloat(slider.value);
      display.textContent = slider.value;
    });
  });

  window.resetDefaults = function resetDefaults() {
    Object.assign(voidStormConfig, DEFAULTS);

    Object.entries(sliders).forEach(([id, key]) => {
      const slider = document.getElementById(id);
      const display = document.getElementById(id + '-val');
      if (!slider || !display) {
        return;
      }

      slider.value = String(voidStormConfig[key]);
      display.textContent = Number(voidStormConfig[key]).toFixed(2);
    });
  };

  manager.start();
});
