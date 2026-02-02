import { EffectsManager } from './webgl-effects.js';
import { iceStageFrostShaderDef } from './shaders/ice-stage-frost-shader.js';

document.addEventListener('DOMContentLoaded', () => {
  const manager = new EffectsManager();
  manager.registerShader('ice-stage-frost', iceStageFrostShaderDef);

  manager.registerCanvas('frost-canvas', 'ice-stage-frost', {});
  const state = manager.getCanvasState('frost-canvas');

  if (!state) {
    return;
  }

  state.demoBlockEl = document.getElementById('demo-block');
  state.frostNumEl = document.getElementById('frost-num');
  state.autoCycleEl = document.getElementById('auto-cycle');
  state.statusEl = document.getElementById('status');

  if (state.autoCycleEl) {
    state.autoCycleEl.addEventListener('change', (e) => {
      state.autoCycleEnabled = Boolean(e.target.checked);
      if (state.autoCycleEnabled) {
        state.lastStageChange = performance.now();
      }
    });
  }

  window.setStage = function setStage(stage) {
    state.setStage(stage);
  };

  state.setStage(3);
  state.freezeProgress = 1.0;
  state.currentEdgeFrost = 1.0;

  manager.start();
});
