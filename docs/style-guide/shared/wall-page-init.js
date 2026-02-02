import { EffectsManager } from './webgl-effects.js';
import { voidStormShaderDef } from './shaders/void-storm-shader.js';

document.addEventListener('DOMContentLoaded', () => {
  const manager = new EffectsManager();
  manager.registerShader('void-storm', voidStormShaderDef);

  const canvases = document.querySelectorAll('.wall canvas');
  canvases.forEach((canvas, i) => {
    const seed = i * 8.91 + Math.random() * 100;
    manager.registerCanvasElement(canvas, 'void-storm', { seed });
  });

  manager.start();
});
