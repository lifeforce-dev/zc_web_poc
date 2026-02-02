// WebGL Effects Manager
// Central system for managing shader effects across multiple canvases.
// Uses shared offscreen WebGL contexts to avoid mobile context limits (8-16 max).
//
// Usage:
//   import { EffectsManager } from './webgl-effects.js';
//   const manager = new EffectsManager();
//   manager.registerShader('fire', fireShaderDef);
//   manager.registerCanvas('my-canvas', 'fire', { mode: 'primed' });
//   manager.start();

// ========================================
// EFFECTS MANAGER
// ========================================

export class EffectsManager {
  constructor() {
    this.shaders = new Map();      // shaderName -> { renderer, definition }
    this.canvases = new Map();     // canvasId -> { canvas, ctx2d, shaderName, params, state }
    this.running = false;
    this.animationId = null;
    this._anonCanvasId = 0;
  }

  /**
   * Register a shader definition. Creates the shared offscreen WebGL context.
   * @param {string} name - Unique shader name (e.g., 'fire', 'orbit', 'ice')
   * @param {ShaderDefinition} definition - Shader definition object
   */
  registerShader(name, definition) {
    if (this.shaders.has(name)) {
      console.warn(`[Effects] Shader '${name}' already registered, skipping`);
      return;
    }

    const renderer = this._createRenderer(definition);
    if (!renderer) {
      console.error(`[Effects] Failed to create renderer for shader '${name}'`);
      return;
    }

    this.shaders.set(name, { renderer, definition });
  }

  /**
   * Register a display canvas to show a shader effect.
   * @param {string} canvasId - DOM element ID
   * @param {string} shaderName - Name of registered shader
   * @param {object} params - Effect parameters (mode, config overrides, etc.)
   */
  registerCanvas(canvasId, shaderName, params = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.warn(`[Effects] Canvas not found: ${canvasId}`);
      return null;
    }

    return this.registerCanvasElement(canvas, shaderName, params, canvasId);
  }

  /**
   * Register a display canvas by element reference (useful when canvases don't have stable IDs).
   * @param {HTMLCanvasElement} canvas
   * @param {string} shaderName
   * @param {object} params
   * @param {string=} preferredId
   */
  registerCanvasElement(canvas, shaderName, params = {}, preferredId = undefined) {
    if (!canvas) {
      console.warn('[Effects] registerCanvasElement called with null canvas');
      return null;
    }

    const shader = this.shaders.get(shaderName);
    if (!shader) {
      console.error(`[Effects] Shader '${shaderName}' not registered`);
      return null;
    }

    const dimensions = shader.definition.dimensions;
    if (!dimensions || typeof dimensions.width !== 'number' || typeof dimensions.height !== 'number') {
      console.error(`[Effects] Shader '${shaderName}' is missing valid dimensions`);
      return null;
    }

    const { width, height } = dimensions;
    canvas.width = width;
    canvas.height = height;

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) {
      console.error('[Effects] Failed to get 2D context for canvas element');
      return null;
    }

    const entryId = preferredId || canvas.id || `__effects_canvas_${++this._anonCanvasId}`;
    const entry = {
      canvas,
      ctx2d,
      shaderName,
      params,
      state: shader.definition.createState ? shader.definition.createState(params) : {},
    };

    this.canvases.set(entryId, entry);
    return entry;
  }

  /**
   * Unregister a canvas (cleanup when component unmounts in Vue).
   */
  unregisterCanvas(canvasId) {
    this.canvases.delete(canvasId);
  }

  /**
   * Get canvas state for external manipulation (e.g., triggering animations).
   */
  getCanvasState(canvasId) {
    return this.canvases.get(canvasId)?.state;
  }

  /**
   * Start the animation loop.
   */
  start() {
    if (this.running) return;
    this.running = true;
    this._animate(performance.now());
  }

  /**
   * Stop the animation loop.
   */
  stop() {
    this.running = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Destroy all resources.
   */
  destroy() {
    this.stop();
    this.canvases.clear();
    for (const { renderer } of this.shaders.values()) {
      const ext = renderer.gl.getExtension('WEBGL_lose_context');
      if (ext) ext.loseContext();
    }
    this.shaders.clear();
  }

  // ========================================
  // PRIVATE METHODS
  // ========================================

  _createRenderer(definition) {
    const { dimensions, vertexSrc, fragmentSrc, uniforms } = definition;
    const { width, height } = dimensions;

    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;

    const gl = offscreen.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
    if (!gl) {
      console.error('[Effects] WebGL2 not available');
      return null;
    }

    gl.viewport(0, 0, width, height);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, vertexSrc);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('[Effects] Vertex shader error:', gl.getShaderInfoLog(vs));
      return null;
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, fragmentSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('[Effects] Fragment shader error:', gl.getShaderInfoLog(fs));
      return null;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[Effects] Program link error:', gl.getProgramInfoLog(program));
      return null;
    }

    gl.useProgram(program);

    // Setup geometry
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const uniformLocs = {};
    for (const name of uniforms) {
      uniformLocs[name] = gl.getUniformLocation(program, name);
    }

    return { canvas: offscreen, gl, program, uniformLocs };
  }

  _animate(time) {
    if (!this.running) return;

    const t = time * 0.001;

    // Group canvases by shader for efficient batching
    const byShader = new Map();
    for (const [id, entry] of this.canvases) {
      if (!byShader.has(entry.shaderName)) {
        byShader.set(entry.shaderName, []);
      }
      byShader.get(entry.shaderName).push({ id, ...entry });
    }

    // Render each shader's canvases
    for (const [shaderName, entries] of byShader) {
      const shader = this.shaders.get(shaderName);
      if (!shader) continue;

      const { renderer, definition } = shader;

      for (const entry of entries) {
        // Let the shader definition compute uniforms from state
        const uniformValues = definition.computeUniforms(t, time, entry.state, entry.params);

        // Render to offscreen
        this._renderToOffscreen(renderer, uniformValues);

        // Blit to display canvas
        entry.ctx2d.clearRect(0, 0, entry.canvas.width, entry.canvas.height);
        entry.ctx2d.drawImage(renderer.canvas, 0, 0);

        if (typeof definition.onFrame === 'function') {
          definition.onFrame(t, time, entry.state, entry.params, entry.canvas);
        }
      }
    }

    this.animationId = requestAnimationFrame((t) => this._animate(t));
  }

  _renderToOffscreen(renderer, uniformValues) {
    const { gl, program, uniformLocs } = renderer;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    for (const [name, value] of Object.entries(uniformValues)) {
      const loc = uniformLocs[name];
      if (loc !== null && loc !== undefined) {
        gl.uniform1f(loc, value);
      }
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// ========================================
// SHADER DEFINITION INTERFACE
// ========================================
// Each shader type exports a definition object like:
//
// export const fireShaderDef = {
//   dimensions: { width: 38, height: 34 },
//   vertexSrc: `...`,
//   fragmentSrc: `...`,
//   uniforms: ['u_time', 'u_phase', ...],
//   config: { duration: 2.5, ... },
//   createState: (params) => ({ burnStart: null, ... }),
//   computeUniforms: (t, time, state, params) => ({ u_time: t, ... }),
// };

// ========================================
// SINGLETON INSTANCE (optional convenience)
// ========================================

let globalManager = null;

export function getEffectsManager() {
  if (!globalManager) {
    globalManager = new EffectsManager();
  }
  return globalManager;
}
