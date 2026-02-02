// Fire Shader v2 - Shared Context Architecture
// Uses a single WebGL context per shader type, blits to visible canvases via 2D drawImage.
// This avoids mobile WebGL context limits (typically 8-16 max).

// ========================================
// CONFIGURATION
// ========================================

const fireConfig = {
  duration: 2.5,
  spinRampTime: 0.4,
  spinStart: 0.5,
  spinMax: 4.0,
  rotationSpeed: 0.3,
  spinTightness: 4.0,
  wallThickness: 0.12,
  flameIntensity: 1.3,
  turbulence: 1.0,
  collapseSpeed: 1.0,
  coreHeat: 1.0,
  wallSpread: 0.30,
  wallInset: 0.09,
  wallPulse: 0.05,
  edgeSoftness: 0.36,
  edgeFade: 0.08,
};

const orbitConfig = {
  orbCount: 6,
  orbitSpeed: 1.1,
  orbitRadius: 0.32,
  orbSize: 0.11,
  tailLength: 0.3,
  intensity: 1.2,
  centerGlow: 0.15,
  flicker: 0.35,
  orbDrift: 0.44
};

// ========================================
// SHADER SOURCES
// ========================================

const fireVertexSrc = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fireFragmentSrc = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  
  uniform float u_time;
  uniform float u_phase;
  uniform float u_spin;
  uniform float u_collapse;
  uniform float u_dissipate;
  uniform float u_wallThickness;
  uniform float u_flameIntensity;
  uniform float u_turbulence;
  uniform float u_spinTightness;
  uniform float u_rotationSpeed;
  uniform float u_coreHeat;
  uniform float u_wallSpread;
  uniform float u_wallInset;
  uniform float u_wallPulse;
  uniform float u_edgeSoftness;
  uniform float u_edgeFade;
  
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
  
  float cornerFactor(vec2 p) {
    float cx = abs(p.x);
    float cy = abs(p.y);
    return 1.0 + smoothstep(0.2, 0.4, cx) * smoothstep(0.2, 0.4, cy) * 0.5;
  }
  
  float flameRadiusVariation(float angle, float t, float softness) {
    if (softness < 0.001) return 1.0;
    float wave1 = sin(angle * 3.0 + t * 0.8) * 0.15;
    float wave2 = sin(angle * 5.0 - t * 1.2) * 0.08;
    float flameLicks = fbm(vec2(angle * 4.0 + t * 2.0, t * 0.5)) * 0.2;
    return 1.0 + (wave1 + wave2 + flameLicks) * softness;
  }
  
  float cornerRounding(vec2 p, float softness) {
    if (softness < 0.001) return 0.0;
    float rectDist = max(abs(p.x), abs(p.y));
    float circleDist = length(p);
    float cornerPush = max(0.0, circleDist - rectDist * 0.9) * softness * 0.8;
    return cornerPush;
  }
  
  void main() {
    vec2 uv = v_uv;
    float t = u_time;
    float phase = u_phase;
    float spin = u_spin;
    float collapse = u_collapse;
    float dissipate = u_dissipate;
    float intensity = u_flameIntensity;
    float turb = u_turbulence;
    float tightness = u_spinTightness;
    float coreHeat = u_coreHeat;
    
    vec2 center = vec2(0.5, 0.5);
    vec2 p = uv - center;
    float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float dist = length(p);
    float angle = atan(p.y, p.x);
    
    float fire = 0.0;
    vec3 color = vec3(0.0);
    
    if (phase < 0.5) {
      float spread = 0.15;
      float fireNoise = fbm(uv * 6.0 + t * 0.5);
      float fireNoise2 = fbm(uv * 10.0 - t * 0.3);
      float burnRadius = spread * 0.6;
      float fireFront = edgeDist - burnRadius + fireNoise * 0.15 * turb + fireNoise2 * 0.08 * turb;
      
      float burning = smoothstep(0.05, -0.05, fireFront);
      float flameEdge = smoothstep(0.08, 0.0, abs(fireFront)) * (1.0 - smoothstep(0.0, 0.08, fireFront));
      float smolder = smoothstep(0.15, 0.0, fireFront) * (1.0 - burning);
      
      float flameDetail = fbm(vec2(uv.x * 12.0 + t * 2.0, uv.y * 12.0 - t * 3.0));
      flameEdge *= 0.6 + flameDetail * 0.6;
      
      float burnFlicker = fbm(uv * 8.0 + t * 4.0);
      burning *= 0.7 + burnFlicker * 0.4;
      
      vec3 smolderColor = vec3(0.6, 0.15, 0.02);
      color += smolderColor * smolder * 0.8;
      
      vec3 flameColor = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.85, 0.3), flameDetail);
      color += flameColor * flameEdge;
      
      vec3 burnColor = mix(vec3(0.9, 0.3, 0.05), vec3(1.0, 0.7, 0.2), burnFlicker);
      color += burnColor * burning * 0.8;
      
      fire = max(max(burning * 0.85, flameEdge), smolder * 0.6) * intensity;
    }
    else if (phase < 1.5) {
      float spread = u_wallSpread + sin(t * 1.5) * u_wallPulse;
      float fireNoise = fbm(uv * 6.0 + t * 0.5);
      float fireNoise2 = fbm(uv * 10.0 - t * 0.3);
      
      float radiusVar = flameRadiusVariation(angle, t, u_edgeSoftness);
      float cornerPush = cornerRounding(p, u_edgeSoftness);
      
      float burnRadius = spread * 0.6 * radiusVar;
      float adjustedEdgeDist = edgeDist - u_wallInset - cornerPush;
      float fireFront = adjustedEdgeDist - burnRadius + fireNoise * 0.15 * turb + fireNoise2 * 0.08 * turb;
      
      float burning = smoothstep(0.05, -0.05, fireFront);
      float flameEdge = smoothstep(0.08, 0.0, abs(fireFront)) * (1.0 - smoothstep(0.0, 0.08, fireFront));
      float smolder = smoothstep(0.15, 0.0, fireFront) * (1.0 - burning);
      
      float flameDetail = fbm(vec2(uv.x * 12.0 + t * 2.0, uv.y * 12.0 - t * 3.0));
      flameEdge *= 0.6 + flameDetail * 0.6;
      
      float burnFlicker = fbm(uv * 8.0 + t * 4.0);
      burning *= 0.7 + burnFlicker * 0.4;
      
      vec3 smolderColor = vec3(0.6, 0.15, 0.02);
      color += smolderColor * smolder * 0.8;
      
      vec3 flameColor = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.85, 0.3), flameDetail);
      color += flameColor * flameEdge;
      
      vec3 burnColor = mix(vec3(0.9, 0.3, 0.05), vec3(1.0, 0.7, 0.2), burnFlicker);
      color += burnColor * burning * 0.8;
      
      float hotSpot = pow(flameEdge * burning, 0.5);
      color += vec3(1.0, 1.0, 0.9) * hotSpot * 0.5;
      
      fire = max(max(burning * 0.85, flameEdge), smolder * 0.6) * intensity;
    }
    else {
      float spread = u_wallSpread + collapse * 0.65;
      float rotSpeed = u_rotationSpeed;
      float spiralAngle = angle + spin * dist * tightness + t * rotSpeed * spin;
      
      vec2 swirledP = p;
      if (spin > 0.01) {
        float swirl = spin * 0.15;
        float s = sin(spiralAngle * swirl);
        float c = cos(spiralAngle * swirl);
        swirledP = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
      }
      vec2 swirledUV = swirledP + center;
      
      float swirledEdgeDist = min(min(swirledUV.x, 1.0 - swirledUV.x), min(swirledUV.y, 1.0 - swirledUV.y));
      float effectiveEdgeDist = mix(edgeDist, swirledEdgeDist, min(spin / 2.0, 1.0));
      
      float fireNoise = fbm(vec2(spiralAngle * 0.5 + t * 0.5, dist * 6.0 - t * 0.3) * turb);
      float fireNoise2 = fbm(vec2(spiralAngle * 1.0 - t * 0.3, dist * 10.0 + t * 0.5) * turb);
      float burnRadius = spread * 0.6;
      float fireFront = effectiveEdgeDist - burnRadius + fireNoise * 0.15 * turb + fireNoise2 * 0.08 * turb;
      
      float burning = smoothstep(0.05, -0.05, fireFront);
      float flameEdge = smoothstep(0.08, 0.0, abs(fireFront)) * (1.0 - smoothstep(0.0, 0.08, fireFront));
      float smolder = smoothstep(0.15, 0.0, fireFront) * (1.0 - burning);
      
      float flameDetail = fbm(vec2(spiralAngle * 2.0 + t * 2.0, dist * 12.0 - t * 3.0) * turb);
      flameEdge *= 0.6 + flameDetail * 0.6;
      
      float burnFlicker = fbm(vec2(spiralAngle + t * 4.0, dist * 8.0) * turb);
      burning *= 0.7 + burnFlicker * 0.4;
      
      float chaos = sin(t * 8.0 + dist * 20.0) * 0.3 + sin(t * 13.0 + spiralAngle * 3.0) * 0.2;
      float pulse = 0.8 + chaos * min(spin / 3.0, 0.5);
      
      vec3 smolderColor = vec3(0.6, 0.15, 0.02);
      color += smolderColor * smolder * 0.8;
      
      vec3 flameColor = mix(vec3(1.0, 0.4, 0.1), vec3(1.0, 0.85, 0.3), flameDetail);
      color += flameColor * flameEdge;
      
      vec3 burnColor = mix(vec3(0.9, 0.3, 0.05), vec3(1.0, 0.7, 0.2), burnFlicker);
      color += burnColor * burning * 0.8;
      
      float hotSpot = pow(flameEdge * burning, 0.5) * (1.0 + collapse * coreHeat);
      color += vec3(1.0, 1.0, 0.9) * hotSpot * 0.5;
      
      float centerHeat = smoothstep(0.3, 0.0, dist) * collapse * coreHeat;
      color += vec3(1.0, 0.95, 0.8) * centerHeat * burning;
      
      fire = max(max(burning * 0.85, flameEdge), smolder * 0.6) * pulse * intensity;
      
      float emberRadius = 0.35 - collapse * 0.25;
      for (float i = 0.0; i < 5.0; i++) {
        float emberAngle = angle + i * 1.257 + t * (1.5 + i * 0.3) * (1.0 + spin * 0.5);
        float emberDist = emberRadius + sin(t * 5.0 + i * 2.0) * 0.03;
        vec2 emberPos = center + vec2(cos(emberAngle), sin(emberAngle)) * emberDist;
        float ember = smoothstep(0.02, 0.0, length(uv - emberPos));
        fire += ember * min(spin + 0.5, 2.0) * 0.5;
        color += vec3(1.0, 0.7, 0.3) * ember * 0.8;
      }
      
      fire *= (1.0 - dissipate);
      color *= (1.0 - dissipate * 0.5);
    }
    
    float edgeFadeAmount = smoothstep(0.0, u_edgeFade, edgeDist);
    fire *= edgeFadeAmount;
    
    fire = clamp(fire, 0.0, 1.0);
    fragColor = vec4(color * fire, fire);
  }
`;

const orbitVertexSrc = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const orbitFragmentSrc = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  
  uniform float u_time;
  uniform float u_orbCount;
  uniform float u_orbitSpeed;
  uniform float u_orbitRadius;
  uniform float u_orbSize;
  uniform float u_tailLength;
  uniform float u_intensity;
  uniform float u_centerGlow;
  uniform float u_flicker;
  uniform float u_orbDrift;
  
  void main() {
    vec2 uv = v_uv;
    vec2 center = vec2(0.5, 0.5);
    float t = u_time;
    
    float fire = 0.0;
    vec3 color = vec3(0.0);
    
    for (float i = 0.0; i < 8.0; i++) {
      if (i >= u_orbCount) break;
      
      float speed = u_orbitSpeed;
      float phase = i * (6.283 / u_orbCount);
      float wobble = sin(t * 1.5 + i * 2.0) * u_orbDrift;
      float radius = u_orbitRadius + sin(t * 2.0 + i) * 0.05;
      
      float angle = t * speed + phase + wobble;
      vec2 flamePos = center + vec2(cos(angle), sin(angle)) * radius;
      
      vec2 toFlame = uv - flamePos;
      float dist = length(toFlame);
      
      float flickerVal = 1.0 - u_flicker + sin(t * 10.0 + i * 3.0) * u_flicker;
      float flameSize = u_orbSize * flickerVal;
      
      float flame = smoothstep(flameSize, 0.0, dist);
      
      float tailAngle = angle - u_tailLength;
      vec2 tailPos = center + vec2(cos(tailAngle), sin(tailAngle)) * radius;
      float tailDist = length(uv - tailPos);
      float tail = smoothstep(u_orbSize * 0.6, 0.0, tailDist) * 0.5;
      
      flame += tail;
      
      vec3 flameColor = mix(
        vec3(1.0, 0.4, 0.1),
        vec3(1.0, 0.7, 0.2),
        sin(t * 3.0 + i) * 0.5 + 0.5
      );
      
      color += flameColor * flame * u_intensity;
      fire += flame;
    }
    
    float centerDist = length(uv - center);
    float glow = smoothstep(0.5, 0.2, centerDist) * u_centerGlow;
    glow *= 0.7 + sin(t * 3.0) * 0.3;
    color += vec3(1.0, 0.5, 0.2) * glow * u_intensity;
    fire += glow;
    
    fire = clamp(fire, 0.0, 1.0);
    fragColor = vec4(color, fire);
  }
`;

// ========================================
// SHARED CONTEXT MANAGER
// ========================================

// Single offscreen canvas + WebGL context for each shader type
let fireRenderer = null;
let orbitRenderer = null;

// All registered display canvases
const fireTargets = {};   // id -> { canvas, ctx2d, mode, burnStart, valueEl, origValue, valueDecremented }
const orbitTargets = {};  // id -> { canvas, ctx2d }

function debugLog(msg) {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    panel.innerHTML += msg + '<br>';
    panel.scrollTop = panel.scrollHeight;
  }
}

function createSharedFireRenderer() {
  const offscreen = document.createElement('canvas');
  offscreen.width = 38;
  offscreen.height = 34;
  
  const gl = offscreen.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
  if (!gl) {
    debugLog('[FIRE] Shared WebGL2 context FAILED');
    return null;
  }
  
  gl.viewport(0, 0, 38, 34);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, fireVertexSrc);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    debugLog('[FIRE] VS error: ' + gl.getShaderInfoLog(vs));
    return null;
  }
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fireFragmentSrc);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    debugLog('[FIRE] FS error: ' + gl.getShaderInfoLog(fs));
    return null;
  }
  
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    debugLog('[FIRE] Link error: ' + gl.getProgramInfoLog(program));
    return null;
  }
  
  gl.useProgram(program);
  
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  debugLog('[FIRE] Shared renderer created');
  
  return {
    canvas: offscreen,
    gl,
    program,
    uniforms: {
      uTime: gl.getUniformLocation(program, 'u_time'),
      uPhase: gl.getUniformLocation(program, 'u_phase'),
      uSpin: gl.getUniformLocation(program, 'u_spin'),
      uCollapse: gl.getUniformLocation(program, 'u_collapse'),
      uDissipate: gl.getUniformLocation(program, 'u_dissipate'),
      uWallThickness: gl.getUniformLocation(program, 'u_wallThickness'),
      uFlameIntensity: gl.getUniformLocation(program, 'u_flameIntensity'),
      uTurbulence: gl.getUniformLocation(program, 'u_turbulence'),
      uSpinTightness: gl.getUniformLocation(program, 'u_spinTightness'),
      uRotationSpeed: gl.getUniformLocation(program, 'u_rotationSpeed'),
      uCoreHeat: gl.getUniformLocation(program, 'u_coreHeat'),
      uWallSpread: gl.getUniformLocation(program, 'u_wallSpread'),
      uWallInset: gl.getUniformLocation(program, 'u_wallInset'),
      uWallPulse: gl.getUniformLocation(program, 'u_wallPulse'),
      uEdgeSoftness: gl.getUniformLocation(program, 'u_edgeSoftness'),
      uEdgeFade: gl.getUniformLocation(program, 'u_edgeFade'),
    }
  };
}

function createSharedOrbitRenderer() {
  const offscreen = document.createElement('canvas');
  offscreen.width = 50;
  offscreen.height = 46;
  
  const gl = offscreen.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
  if (!gl) {
    debugLog('[ORBIT] Shared WebGL2 context FAILED');
    return null;
  }
  
  gl.viewport(0, 0, 50, 46);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, orbitVertexSrc);
  gl.compileShader(vs);
  if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
    debugLog('[ORBIT] VS error: ' + gl.getShaderInfoLog(vs));
    return null;
  }
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, orbitFragmentSrc);
  gl.compileShader(fs);
  if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
    debugLog('[ORBIT] FS error: ' + gl.getShaderInfoLog(fs));
    return null;
  }
  
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    debugLog('[ORBIT] Link error: ' + gl.getProgramInfoLog(program));
    return null;
  }
  
  gl.useProgram(program);
  
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  debugLog('[ORBIT] Shared renderer created');
  
  return {
    canvas: offscreen,
    gl,
    program,
    uniforms: {
      uTime: gl.getUniformLocation(program, 'u_time'),
      uOrbCount: gl.getUniformLocation(program, 'u_orbCount'),
      uOrbitSpeed: gl.getUniformLocation(program, 'u_orbitSpeed'),
      uOrbitRadius: gl.getUniformLocation(program, 'u_orbitRadius'),
      uOrbSize: gl.getUniformLocation(program, 'u_orbSize'),
      uTailLength: gl.getUniformLocation(program, 'u_tailLength'),
      uIntensity: gl.getUniformLocation(program, 'u_intensity'),
      uCenterGlow: gl.getUniformLocation(program, 'u_centerGlow'),
      uFlicker: gl.getUniformLocation(program, 'u_flicker'),
      uOrbDrift: gl.getUniformLocation(program, 'u_orbDrift'),
    }
  };
}

// ========================================
// REGISTRATION API
// ========================================

function registerFireCanvas(canvasId, mode) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    debugLog('[FIRE] Canvas not found: ' + canvasId);
    return null;
  }
  
  // Set canvas size
  canvas.width = 38;
  canvas.height = 34;
  
  // Get 2D context for blitting
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) {
    debugLog('[FIRE] 2D context failed: ' + canvasId);
    return null;
  }
  
  fireTargets[canvasId] = {
    canvas,
    ctx2d,
    mode,
    burnStart: null,
    valueEl: null,
    origValue: 0,
    valueDecremented: false
  };
  
  debugLog('[FIRE] Registered: ' + canvasId + ' (' + mode + ')');
  return fireTargets[canvasId];
}

function registerOrbitCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    debugLog('[ORBIT] Canvas not found: ' + canvasId);
    return null;
  }
  
  canvas.width = 50;
  canvas.height = 46;
  
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) {
    debugLog('[ORBIT] 2D context failed: ' + canvasId);
    return null;
  }
  
  orbitTargets[canvasId] = { canvas, ctx2d };
  
  debugLog('[ORBIT] Registered: ' + canvasId);
  return orbitTargets[canvasId];
}

// ========================================
// RENDERING
// ========================================

function renderFireEffect(t, phase, spin, collapse, dissipate) {
  if (!fireRenderer) return;
  
  const gl = fireRenderer.gl;
  const u = fireRenderer.uniforms;
  
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(fireRenderer.program);
  
  gl.uniform1f(u.uTime, t);
  gl.uniform1f(u.uPhase, phase);
  gl.uniform1f(u.uSpin, spin);
  gl.uniform1f(u.uCollapse, collapse);
  gl.uniform1f(u.uDissipate, dissipate);
  gl.uniform1f(u.uWallThickness, fireConfig.wallThickness);
  gl.uniform1f(u.uFlameIntensity, fireConfig.flameIntensity);
  gl.uniform1f(u.uTurbulence, fireConfig.turbulence);
  gl.uniform1f(u.uSpinTightness, fireConfig.spinTightness);
  gl.uniform1f(u.uRotationSpeed, fireConfig.rotationSpeed);
  gl.uniform1f(u.uCoreHeat, fireConfig.coreHeat);
  gl.uniform1f(u.uWallSpread, fireConfig.wallSpread);
  gl.uniform1f(u.uWallInset, fireConfig.wallInset);
  gl.uniform1f(u.uWallPulse, fireConfig.wallPulse);
  gl.uniform1f(u.uEdgeSoftness, fireConfig.edgeSoftness);
  gl.uniform1f(u.uEdgeFade, fireConfig.edgeFade);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function renderOrbitEffect(t) {
  if (!orbitRenderer) return;
  
  const gl = orbitRenderer.gl;
  const u = orbitRenderer.uniforms;
  
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(orbitRenderer.program);
  
  gl.uniform1f(u.uTime, t);
  gl.uniform1f(u.uOrbCount, orbitConfig.orbCount);
  gl.uniform1f(u.uOrbitSpeed, orbitConfig.orbitSpeed);
  gl.uniform1f(u.uOrbitRadius, orbitConfig.orbitRadius);
  gl.uniform1f(u.uOrbSize, orbitConfig.orbSize);
  gl.uniform1f(u.uTailLength, orbitConfig.tailLength);
  gl.uniform1f(u.uIntensity, orbitConfig.intensity);
  gl.uniform1f(u.uCenterGlow, orbitConfig.centerGlow);
  gl.uniform1f(u.uFlicker, orbitConfig.flicker);
  gl.uniform1f(u.uOrbDrift, orbitConfig.orbDrift);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function blitToTarget(sourceCanvas, target) {
  target.ctx2d.clearRect(0, 0, target.canvas.width, target.canvas.height);
  target.ctx2d.drawImage(sourceCanvas, 0, 0);
}

// ========================================
// CONTROLS
// ========================================

function setupFireControls() {
  const controls = [
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

function setupOrbitControls() {
  const controls = [
    ['orbit-count', 'orbit-count-val', v => orbitConfig.orbCount = v, v => v.toFixed(0)],
    ['orbit-speed', 'orbit-speed-val', v => orbitConfig.orbitSpeed = v, v => v.toFixed(2)],
    ['orbit-radius', 'orbit-radius-val', v => orbitConfig.orbitRadius = v, v => v.toFixed(2)],
    ['orbit-size', 'orbit-size-val', v => orbitConfig.orbSize = v, v => v.toFixed(2)],
    ['orbit-tail', 'orbit-tail-val', v => orbitConfig.tailLength = v, v => v.toFixed(2)],
    ['orbit-intensity', 'orbit-intensity-val', v => orbitConfig.intensity = v, v => v.toFixed(2)],
    ['orbit-glow', 'orbit-glow-val', v => orbitConfig.centerGlow = v, v => v.toFixed(2)],
    ['orbit-flicker', 'orbit-flicker-val', v => orbitConfig.flicker = v, v => v.toFixed(2)],
    ['orbit-drift', 'orbit-drift-val', v => orbitConfig.orbDrift = v, v => v.toFixed(2)],
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

function setupWallControls() {
  const controls = [
    ['wall-spread', 'wall-spread-val', v => fireConfig.wallSpread = v, v => v.toFixed(2)],
    ['wall-inset', 'wall-inset-val', v => fireConfig.wallInset = v, v => v.toFixed(2)],
    ['wall-pulse', 'wall-pulse-val', v => fireConfig.wallPulse = v, v => v.toFixed(2)],
    ['edge-softness', 'edge-softness-val', v => fireConfig.edgeSoftness = v, v => v.toFixed(2)],
    ['edge-fade', 'edge-fade-val', v => fireConfig.edgeFade = v, v => v.toFixed(2)],
    ['wall-intensity', 'wall-intensity-val', v => fireConfig.flameIntensity = v, v => v.toFixed(1)],
    ['wall-turbulence', 'wall-turbulence-val', v => fireConfig.turbulence = v, v => v.toFixed(1)],
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
// ANIMATION LOOP
// ========================================

function triggerBurnAnimation() {
  const now = performance.now();
  
  // Reset all burn targets
  for (const id of Object.keys(fireTargets)) {
    const target = fireTargets[id];
    if (target.mode === 'burn') {
      target.burnStart = now;
      target.valueDecremented = false;
      if (target.valueEl) {
        target.valueEl.textContent = target.origValue;
      }
    }
  }
}

let lastAutoLoop = 0;
const autoLoopDelay = 6000;

function animateFire(time) {
  const t = time * 0.001;
  
  // Auto-loop burn animation
  const anyBurnActive = Object.values(fireTargets).some(tgt => tgt.mode === 'burn' && tgt.burnStart);
  if (!anyBurnActive && time - lastAutoLoop > autoLoopDelay) {
    triggerBurnAnimation();
    lastAutoLoop = time;
  }
  
  // Group targets by their computed state to minimize shader switches
  // But since we have one shared context, we just iterate and render+blit
  
  for (const [id, target] of Object.entries(fireTargets)) {
    let phase, spin, collapse, dissipate;
    
    if (target.mode === 'target') {
      phase = 0.0;
      spin = 0.0;
      collapse = 0.0;
      dissipate = 0.0;
    } else if (target.mode === 'primed') {
      phase = 1.0;
      spin = 0.0;
      collapse = 0.0;
      dissipate = 0.0;
    } else {
      // burn mode
      if (target.burnStart) {
        const elapsed = time - target.burnStart;
        const duration = fireConfig.duration * 1000;
        const resetDelay = 2000;
        const progress = elapsed / duration;
        
        if (progress >= 1.0 && elapsed < duration + resetDelay) {
          phase = 1.0;
          spin = 0.0;
          collapse = 0.0;
          dissipate = 0.0;
        } else if (progress >= 1.0) {
          target.burnStart = null;
          if (target.valueEl) {
            target.valueEl.textContent = target.origValue;
          }
          phase = 1.0;
          spin = 0.0;
          collapse = 0.0;
          dissipate = 0.0;
        } else {
          phase = 2.0;
          
          const rampEnd = fireConfig.spinRampTime;
          const collapseEnd = 0.7;
          
          if (progress < rampEnd) {
            const rampProgress = progress / rampEnd;
            spin = fireConfig.spinStart + (fireConfig.spinMax - fireConfig.spinStart) * Math.pow(rampProgress, 1.5);
            collapse = rampProgress * 0.6 * fireConfig.collapseSpeed;
            dissipate = 0.0;
          } else if (progress < collapseEnd) {
            spin = fireConfig.spinMax + Math.sin(progress * 40) * 0.3;
            const collapseProgress = (progress - rampEnd) / (collapseEnd - rampEnd);
            collapse = (0.6 + collapseProgress * 0.4) * fireConfig.collapseSpeed;
            collapse = Math.min(collapse, 1.0);
            dissipate = 0.0;
          } else {
            const fadeProgress = (progress - collapseEnd) / (1.0 - collapseEnd);
            spin = fireConfig.spinMax * (1.0 - fadeProgress * 0.7);
            collapse = 1.0;
            dissipate = fadeProgress;
          }
          
          if (progress > 0.5 && target.valueEl && !target.valueDecremented) {
            target.valueEl.textContent = target.origValue - 1;
            target.valueDecremented = true;
          }
        }
      } else {
        phase = 1.0;
        spin = 0.0;
        collapse = 0.0;
        dissipate = 0.0;
      }
    }
    
    // Render to offscreen, then blit
    renderFireEffect(t, phase, spin, collapse, dissipate);
    blitToTarget(fireRenderer.canvas, target);
  }
  
  // Render orbit effect once, blit to all orbit targets
  if (orbitRenderer && Object.keys(orbitTargets).length > 0) {
    renderOrbitEffect(t);
    for (const target of Object.values(orbitTargets)) {
      blitToTarget(orbitRenderer.canvas, target);
    }
  }
  
  requestAnimationFrame(animateFire);
}

// ========================================
// INITIALIZATION
// ========================================

function init() {
  // Create shared renderers (only 2 WebGL contexts total)
  fireRenderer = createSharedFireRenderer();
  orbitRenderer = createSharedOrbitRenderer();
  
  if (!fireRenderer) {
    debugLog('[INIT] Fire renderer failed - effects will not work');
  }
  if (!orbitRenderer) {
    debugLog('[INIT] Orbit renderer failed - orbit effects will not work');
  }
  
  // Register all fire canvases
  ['fire-primed-1', 'fire-primed-2'].forEach(id => registerFireCanvas(id, 'primed'));
  ['fire-burn-1', 'fire-burn-2'].forEach(id => registerFireCanvas(id, 'burn'));
  ['tune-primed-1', 'tune-primed-2'].forEach(id => registerFireCanvas(id, 'primed'));
  ['tune-burn-1', 'tune-burn-2'].forEach(id => registerFireCanvas(id, 'burn'));
  
  // Register orbit canvases
  registerOrbitCanvas('orbit-target');
  registerOrbitCanvas('tune-orbit');
  
  // Setup burn demo value elements
  if (fireTargets['fire-burn-1']) {
    fireTargets['fire-burn-1'].valueEl = document.getElementById('burn-val-1');
    fireTargets['fire-burn-1'].origValue = 3;
  }
  if (fireTargets['fire-burn-2']) {
    fireTargets['fire-burn-2'].valueEl = document.getElementById('burn-val-2');
    fireTargets['fire-burn-2'].origValue = 2;
  }
  if (fireTargets['tune-burn-1']) {
    fireTargets['tune-burn-1'].valueEl = document.getElementById('tune-burn-val-1');
    fireTargets['tune-burn-1'].origValue = 3;
  }
  if (fireTargets['tune-burn-2']) {
    fireTargets['tune-burn-2'].valueEl = document.getElementById('tune-burn-val-2');
    fireTargets['tune-burn-2'].origValue = 2;
  }
  
  // Setup controls
  setupFireControls();
  setupOrbitControls();
  setupWallControls();
  
  // Click to replay burn animations
  document.getElementById('burn-demo-block')?.addEventListener('click', triggerBurnAnimation);
  document.getElementById('tune-burn-demo-block')?.addEventListener('click', triggerBurnAnimation);
  
  // Start first burn animation after 2 seconds
  setTimeout(triggerBurnAnimation, 2000);
  
  // Start animation loop
  requestAnimationFrame(animateFire);
  
  debugLog('[INIT] Complete - Fire targets: ' + Object.keys(fireTargets).length + ', Orbit targets: ' + Object.keys(orbitTargets).length);
}

// Run on load
init();
