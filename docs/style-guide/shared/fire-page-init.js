// Fire Page Effects Initialization
// Uses the shared EffectsManager with fire and orbit shaders.

import { EffectsManager } from './webgl-effects.js';
import { fireShaderDef, fireConfig, triggerBurn } from './shaders/fire-shader.js';
import { orbitShaderDef, orbitConfig } from './shaders/orbit-shader.js';

// Wait for DOM before accessing elements
document.addEventListener('DOMContentLoaded', init);

function init() {

  // ========================================
  // MANAGER SETUP
  // ========================================

  const manager = new EffectsManager();

  // Register shaders (creates 2 WebGL contexts total)
  manager.registerShader('fire', fireShaderDef);
  manager.registerShader('orbit', orbitShaderDef);

  // ========================================
  // REGISTER DISPLAY CANVASES
  // ========================================

  // Live demo section
  manager.registerCanvas('fire-primed-1', 'fire', { mode: 'primed' });
  manager.registerCanvas('fire-primed-2', 'fire', { mode: 'primed' });
  manager.registerCanvas('fire-burn-1', 'fire', { mode: 'burn', origValue: 3 });
  manager.registerCanvas('fire-burn-2', 'fire', { mode: 'burn', origValue: 2 });
  manager.registerCanvas('orbit-target', 'orbit', {});

  // Tuning section
  manager.registerCanvas('tune-primed-1', 'fire', { mode: 'primed' });
  manager.registerCanvas('tune-primed-2', 'fire', { mode: 'primed' });
  manager.registerCanvas('tune-burn-1', 'fire', { mode: 'burn', origValue: 3 });
  manager.registerCanvas('tune-burn-2', 'fire', { mode: 'burn', origValue: 2 });
  manager.registerCanvas('tune-orbit', 'orbit', {});

  // ========================================
  // BIND VALUE ELEMENTS FOR BURN ANIMATIONS
  // ========================================

  function bindValueElement(canvasId, elementId) {
    const state = manager.getCanvasState(canvasId);
    if (state) {
      state.valueEl = document.getElementById(elementId);
    }
  }

  bindValueElement('fire-burn-1', 'burn-val-1');
  bindValueElement('fire-burn-2', 'burn-val-2');
  bindValueElement('tune-burn-1', 'tune-burn-val-1');
  bindValueElement('tune-burn-2', 'tune-burn-val-2');

  // ========================================
  // TUNING CONTROLS
  // ========================================

  function setupControls(controls) {
    controls.forEach(([inputId, labelId, setter, formatter]) => {
      const input = document.getElementById(inputId);
      const label = document.getElementById(labelId);
      if (input && label) {
        input.addEventListener('input', () => {
          const val = parseFloat(input.value);
          setter(val);
          label.textContent = formatter(val);
        });
      }
    });
  }

  // Firenado controls
  setupControls([
    ['fire-duration', 'fire-duration-val', v => fireConfig.duration = v, v => v.toFixed(1) + 's'],
    ['fire-ramp', 'fire-ramp-val', v => fireConfig.spinRampTime = v, v => Math.round(v * 100) + '%'],
    ['fire-spin-start', 'fire-spin-start-val', v => fireConfig.spinStart = v, v => v.toFixed(1)],
    ['fire-spin-max', 'fire-spin-max-val', v => fireConfig.spinMax = v, v => v.toFixed(1)],
    ['fire-rotation', 'fire-rotation-val', v => fireConfig.rotationSpeed = v, v => v.toFixed(2)],
    ['fire-tight', 'fire-tight-val', v => fireConfig.spinTightness = v, v => v.toFixed(1)],
    ['fire-wall', 'fire-wall-val', v => fireConfig.wallThickness = v, v => v.toFixed(2)],
    ['fire-intensity', 'fire-intensity-val', v => fireConfig.flameIntensity = v, v => v.toFixed(1)],
    ['fire-turb', 'fire-turb-val', v => fireConfig.turbulence = v, v => v.toFixed(1)],
    ['fire-collapse', 'fire-collapse-val', v => fireConfig.collapseSpeed = v, v => v.toFixed(1)],
    ['fire-heat', 'fire-heat-val', v => fireConfig.coreHeat = v, v => v.toFixed(1)],
  ]);

  // Orbit controls
  setupControls([
    ['orbit-count', 'orbit-count-val', v => orbitConfig.orbCount = v, v => v.toFixed(0)],
    ['orbit-speed', 'orbit-speed-val', v => orbitConfig.orbitSpeed = v, v => v.toFixed(2)],
    ['orbit-radius', 'orbit-radius-val', v => orbitConfig.orbitRadius = v, v => v.toFixed(2)],
    ['orbit-size', 'orbit-size-val', v => orbitConfig.orbSize = v, v => v.toFixed(2)],
    ['orbit-tail', 'orbit-tail-val', v => orbitConfig.tailLength = v, v => v.toFixed(2)],
    ['orbit-intensity', 'orbit-intensity-val', v => orbitConfig.intensity = v, v => v.toFixed(2)],
    ['orbit-glow', 'orbit-glow-val', v => orbitConfig.centerGlow = v, v => v.toFixed(2)],
    ['orbit-flicker', 'orbit-flicker-val', v => orbitConfig.flicker = v, v => v.toFixed(2)],
    ['orbit-drift', 'orbit-drift-val', v => orbitConfig.orbDrift = v, v => v.toFixed(2)],
  ]);

  // Wall controls
  setupControls([
    ['wall-spread', 'wall-spread-val', v => fireConfig.wallSpread = v, v => v.toFixed(2)],
    ['wall-inset', 'wall-inset-val', v => fireConfig.wallInset = v, v => v.toFixed(2)],
    ['wall-pulse', 'wall-pulse-val', v => fireConfig.wallPulse = v, v => v.toFixed(2)],
    ['edge-softness', 'edge-softness-val', v => fireConfig.edgeSoftness = v, v => v.toFixed(2)],
    ['edge-fade', 'edge-fade-val', v => fireConfig.edgeFade = v, v => v.toFixed(2)],
    ['wall-intensity', 'wall-intensity-val', v => fireConfig.flameIntensity = v, v => v.toFixed(1)],
    ['wall-turbulence', 'wall-turbulence-val', v => fireConfig.turbulence = v, v => v.toFixed(1)],
  ]);

  // ========================================
  // EVENT HANDLERS
  // ========================================

  document.getElementById('burn-demo-block')?.addEventListener('click', () => triggerBurn(manager));
  document.getElementById('tune-burn-demo-block')?.addEventListener('click', () => triggerBurn(manager));

  // Auto-trigger burn animation
  let lastAutoLoop = 0;
  const autoLoopDelay = 6000;

  function checkAutoLoop(time) {
    const anyBurnActive = [...manager.canvases.values()].some(
      e => e.params.mode === 'burn' && e.state.burnStart
    );
    if (!anyBurnActive && time - lastAutoLoop > autoLoopDelay) {
      triggerBurn(manager);
      lastAutoLoop = time;
    }
    requestAnimationFrame(checkAutoLoop);
  }

  // ========================================
  // START
  // ========================================

  manager.start();
  setTimeout(() => triggerBurn(manager), 2000);
  requestAnimationFrame(checkAutoLoop);
}
