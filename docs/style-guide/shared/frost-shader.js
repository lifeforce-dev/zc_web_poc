// Frost Shader - Ice/Frozen Effect
// Contains: Frost overlay effect for frozen blocks

// ========================================
// CONFIGURATION
// ========================================

const frostConfig = {
  density: 1.0,
  intensity: 0.8,
  pulseSpeed: 0.5,
  edgeFrost: 0.15,
  shimmer: 0.3
};

// ========================================
// FROST SHADER
// ========================================

const frostVertexSrc = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const frostFragmentSrc = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  
  uniform float u_time;
  uniform float u_density;
  uniform float u_intensity;
  uniform float u_pulseSpeed;
  uniform float u_edgeFrost;
  uniform float u_shimmer;
  
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  
  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      sum += noise(p) * amp;
      p *= 2.0;
      amp *= 0.5;
    }
    return sum;
  }
  
  void main() {
    vec2 uv = v_uv;
    float t = u_time * u_pulseSpeed;
    
    float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    
    float frostNoise = fbm(uv * 8.0 * u_density + t * 0.1);
    float frostNoise2 = fbm(uv * 12.0 * u_density - t * 0.15);
    
    float frostEdge = edgeDist * 2.5;
    float frostBoundary = frostEdge - frostNoise * 0.3 - frostNoise2 * 0.15 - u_edgeFrost;
    float frost = smoothstep(0.25, 0.0, frostBoundary);
    
    // Crystal detail
    float crystalDetail = pow(fbm(uv * 20.0 * u_density), 2.0);
    frost += crystalDetail * 0.3 * frost;
    
    // Sparkle/shimmer
    float sparkle = pow(noise(uv * 50.0 + t * 2.0), 8.0);
    frost += sparkle * u_shimmer * frost;
    
    // Edge glow
    float edgeGlow = smoothstep(0.2, 0.0, frostBoundary) - smoothstep(0.05, 0.0, frostBoundary);
    
    // Ice color
    vec3 iceColor = mix(
      vec3(0.65, 0.88, 1.0),
      vec3(0.85, 0.95, 1.0),
      frostNoise
    );
    iceColor += vec3(0.3, 0.35, 0.4) * edgeGlow;
    
    // Pulse effect
    float pulse = 0.9 + sin(t * 2.0) * 0.1;
    
    float alpha = frost * u_intensity * pulse * 0.65;
    
    fragColor = vec4(iceColor, alpha);
  }
`;

// ========================================
// INITIALIZATION
// ========================================

const frostInstances = {};

function initFrostCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
  if (!gl) return null;
  
  // Fixed size matching block dimensions (100x100 CSS pixels)
  canvas.width = 100;
  canvas.height = 100;
  gl.viewport(0, 0, 100, 100);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, frostVertexSrc);
  gl.compileShader(vs);
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, frostFragmentSrc);
  gl.compileShader(fs);
  
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);
  
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  frostInstances[canvasId] = {
    gl,
    program,
    uTime: gl.getUniformLocation(program, 'u_time'),
    uDensity: gl.getUniformLocation(program, 'u_density'),
    uIntensity: gl.getUniformLocation(program, 'u_intensity'),
    uPulseSpeed: gl.getUniformLocation(program, 'u_pulseSpeed'),
    uEdgeFrost: gl.getUniformLocation(program, 'u_edgeFrost'),
    uShimmer: gl.getUniformLocation(program, 'u_shimmer')
  };
  
  return frostInstances[canvasId];
}

// ========================================
// CONTROLS
// ========================================

function setupFrostControls() {
  const controls = [
    ['frost-density', 'frost-density-val', v => frostConfig.density = v, v => v.toFixed(1)],
    ['frost-intensity', 'frost-intensity-val', v => frostConfig.intensity = v, v => v.toFixed(2)],
    ['frost-pulse', 'frost-pulse-val', v => frostConfig.pulseSpeed = v, v => v.toFixed(1)],
    ['frost-edge', 'frost-edge-val', v => frostConfig.edgeFrost = v, v => v.toFixed(2)],
    ['frost-shimmer', 'frost-shimmer-val', v => frostConfig.shimmer = v, v => v.toFixed(2)],
  ];
  
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

// ========================================
// ANIMATION
// ========================================

function animateFrost(time) {
  const t = time * 0.001;
  
  for (const [id, state] of Object.entries(frostInstances)) {
    const gl = state.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(state.program);
    
    gl.uniform1f(state.uTime, t);
    gl.uniform1f(state.uDensity, frostConfig.density);
    gl.uniform1f(state.uIntensity, frostConfig.intensity);
    gl.uniform1f(state.uPulseSpeed, frostConfig.pulseSpeed);
    gl.uniform1f(state.uEdgeFrost, frostConfig.edgeFrost);
    gl.uniform1f(state.uShimmer, frostConfig.shimmer);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  requestAnimationFrame(animateFrost);
}

// ========================================
// INITIALIZE ON LOAD
// ========================================

// Wait for canvas elements to be sized by CSS
setTimeout(() => {
  // Initialize all frost canvases
  initFrostCanvas('frost-1');
  initFrostCanvas('frost-2');
  initFrostCanvas('frost-tuning');
  
  // Frost number demos
  initFrostCanvas('frost-num-3');
  initFrostCanvas('frost-num-2');
  initFrostCanvas('frost-num-1');
  
  // Setup controls
  setupFrostControls();
  
  // Start animation
  requestAnimationFrame(animateFrost);
}, 100);
