// Fire Shader - Burn Ability Effects
// Contains: Firenado animation, Primed state, Orbit targeting

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
  // Fire Wall specific (Primed/Burning states)
  wallSpread: 0.30,    // How wide the fire wall extends (lower = tighter to edge)
  wallInset: 0.09,     // Push wall inward from edge
  wallPulse: 0.05,     // Breathing animation amplitude
  edgeSoftness: 0.36,  // Organic edge distortion (0 = sharp square, higher = wavy flames)
  edgeFade: 0.08,      // Soft fade at canvas edges (higher = more fade, softer boundary)
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
// FIRE SHADER
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
  
  // Get corner softness multiplier (1.0 at edges, higher at corners)
  float cornerFactor(vec2 p) {
    // Corners are where both x and y are far from center
    float cx = abs(p.x);
    float cy = abs(p.y);
    return 1.0 + smoothstep(0.2, 0.4, cx) * smoothstep(0.2, 0.4, cy) * 0.5;
  }
  
  // Get organic radius variation based on angle and time
  // Returns a multiplier (0.7 to 1.3) for the burn radius
  float flameRadiusVariation(float angle, float t, float softness) {
    if (softness < 0.001) return 1.0;
    
    // Low frequency waves for overall shape variation
    float wave1 = sin(angle * 3.0 + t * 0.8) * 0.15;
    float wave2 = sin(angle * 5.0 - t * 1.2) * 0.08;
    
    // High frequency noise for flame licks
    float flameLicks = fbm(vec2(angle * 4.0 + t * 2.0, t * 0.5)) * 0.2;
    
    return 1.0 + (wave1 + wave2 + flameLicks) * softness;
  }
  
  // Get corner rounding offset - pushes fire inward at corners
  float cornerRounding(vec2 p, float softness) {
    if (softness < 0.001) return 0.0;
    
    // Distance from the inscribed circle vs rectangle edge
    float rectDist = max(abs(p.x), abs(p.y));
    float circleDist = length(p);
    
    // At corners, circle is further than rect - use this difference to round
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
      // Primed state: fire wall surrounds the number
      float spread = u_wallSpread + sin(t * 1.5) * u_wallPulse;
      float fireNoise = fbm(uv * 6.0 + t * 0.5);
      float fireNoise2 = fbm(uv * 10.0 - t * 0.3);
      
      // Apply organic shape modifiers
      float radiusVar = flameRadiusVariation(angle, t, u_edgeSoftness);
      float cornerPush = cornerRounding(p, u_edgeSoftness);
      
      // Calculate burn radius with organic variation
      float burnRadius = spread * 0.6 * radiusVar;
      
      // Apply inset and corner rounding to edge distance
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
      // Burning state: firenado collapses inward
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
    
    // Soft fade at canvas edges to avoid hard rectangular clipping
    float edgeFadeAmount = smoothstep(0.0, u_edgeFade, edgeDist);
    fire *= edgeFadeAmount;
    
    fire = clamp(fire, 0.0, 1.0);
    fragColor = vec4(color * fire, fire);
  }
`;

// ========================================
// ORBIT SHADER
// ========================================

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
// INITIALIZATION
// ========================================

const fireInstances = {};
const orbitInstances = {};

function initFireCanvas(canvasId, mode) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
  if (!gl) return null;
  
  canvas.width = 38;
  canvas.height = 34;
  gl.viewport(0, 0, 38, 34);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, fireVertexSrc);
  gl.compileShader(vs);
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fireFragmentSrc);
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
  
  fireInstances[canvasId] = {
    gl,
    program,
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
    mode,
    burnStart: null,
    valueEl: null,
    origValue: 0,
    valueDecremented: false
  };
  
  return fireInstances[canvasId];
}

function initOrbitCanvas(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false });
  if (!gl) return;
  
  canvas.width = 50;
  canvas.height = 46;
  gl.viewport(0, 0, 50, 46);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, orbitVertexSrc);
  gl.compileShader(vs);
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, orbitFragmentSrc);
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
  
  orbitInstances[canvasId] = {
    gl,
    program,
    uTime: gl.getUniformLocation(program, 'u_time'),
    uOrbCount: gl.getUniformLocation(program, 'u_orbCount'),
    uOrbitSpeed: gl.getUniformLocation(program, 'u_orbitSpeed'),
    uOrbitRadius: gl.getUniformLocation(program, 'u_orbitRadius'),
    uOrbSize: gl.getUniformLocation(program, 'u_orbSize'),
    uTailLength: gl.getUniformLocation(program, 'u_tailLength'),
    uIntensity: gl.getUniformLocation(program, 'u_intensity'),
    uCenterGlow: gl.getUniformLocation(program, 'u_centerGlow'),
    uFlicker: gl.getUniformLocation(program, 'u_flicker'),
    uOrbDrift: gl.getUniformLocation(program, 'u_orbDrift')
  };
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
// ANIMATION
// ========================================

function triggerBurnAnimation() {
  const now = performance.now();
  
  // Trigger overview demos
  if (fireInstances['fire-burn-1']) {
    fireInstances['fire-burn-1'].burnStart = now;
    fireInstances['fire-burn-1'].valueDecremented = false;
  }
  if (fireInstances['fire-burn-2']) {
    fireInstances['fire-burn-2'].burnStart = now;
    fireInstances['fire-burn-2'].valueDecremented = false;
  }
  const el1 = document.getElementById('burn-val-1');
  const el2 = document.getElementById('burn-val-2');
  if (el1) el1.textContent = '3';
  if (el2) el2.textContent = '2';
  
  // Trigger tuning demos
  if (fireInstances['tune-burn-1']) {
    fireInstances['tune-burn-1'].burnStart = now;
    fireInstances['tune-burn-1'].valueDecremented = false;
  }
  if (fireInstances['tune-burn-2']) {
    fireInstances['tune-burn-2'].burnStart = now;
    fireInstances['tune-burn-2'].valueDecremented = false;
  }
  const tel1 = document.getElementById('tune-burn-val-1');
  const tel2 = document.getElementById('tune-burn-val-2');
  if (tel1) tel1.textContent = '3';
  if (tel2) tel2.textContent = '2';
}

let lastAutoLoop = 0;
const autoLoopDelay = 6000;

function animateFire(time) {
  const t = time * 0.001;
  
  // Auto-loop logic
  if (!fireInstances['fire-burn-1']?.burnStart && time - lastAutoLoop > autoLoopDelay) {
    triggerBurnAnimation();
    lastAutoLoop = time;
  }
  
  for (const [id, state] of Object.entries(fireInstances)) {
    let phase, spin, collapse, dissipate;
    
    if (state.mode === 'target') {
      phase = 0.0;
      spin = 0.0;
      collapse = 0.0;
      dissipate = 0.0;
    } else if (state.mode === 'primed') {
      phase = 1.0;
      spin = 0.0;
      collapse = 0.0;
      dissipate = 0.0;
    } else {
      if (state.burnStart) {
        const elapsed = time - state.burnStart;
        const duration = fireConfig.duration * 1000;
        const resetDelay = 2000;
        const progress = elapsed / duration;
        
        if (progress >= 1.0 && elapsed < duration + resetDelay) {
          phase = 1.0;
          spin = 0.0;
          collapse = 0.0;
          dissipate = 0.0;
        } else if (progress >= 1.0) {
          state.burnStart = null;
          if (state.valueEl) {
            state.valueEl.textContent = state.origValue;
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
          
          if (progress > 0.5 && state.valueEl && !state.valueDecremented) {
            state.valueEl.textContent = state.origValue - 1;
            state.valueDecremented = true;
          }
        }
      } else {
        phase = 1.0;
        spin = 0.0;
        collapse = 0.0;
        dissipate = 0.0;
      }
    }
    
    const gl = state.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(state.program);
    
    gl.uniform1f(state.uTime, t);
    gl.uniform1f(state.uPhase, phase);
    gl.uniform1f(state.uSpin, spin);
    gl.uniform1f(state.uCollapse, collapse);
    gl.uniform1f(state.uDissipate, dissipate);
    gl.uniform1f(state.uWallThickness, fireConfig.wallThickness);
    gl.uniform1f(state.uFlameIntensity, fireConfig.flameIntensity);
    gl.uniform1f(state.uTurbulence, fireConfig.turbulence);
    gl.uniform1f(state.uSpinTightness, fireConfig.spinTightness);
    gl.uniform1f(state.uRotationSpeed, fireConfig.rotationSpeed);
    gl.uniform1f(state.uCoreHeat, fireConfig.coreHeat);
    gl.uniform1f(state.uWallSpread, fireConfig.wallSpread);
    gl.uniform1f(state.uWallInset, fireConfig.wallInset);
    gl.uniform1f(state.uWallPulse, fireConfig.wallPulse);
    gl.uniform1f(state.uEdgeSoftness, fireConfig.edgeSoftness);
    gl.uniform1f(state.uEdgeFade, fireConfig.edgeFade);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  // Render all orbit targeting effects
  for (const canvasId in orbitInstances) {
    const instance = orbitInstances[canvasId];
    const gl = instance.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(instance.program);
    gl.uniform1f(instance.uTime, t);
    gl.uniform1f(instance.uOrbCount, orbitConfig.orbCount);
    gl.uniform1f(instance.uOrbitSpeed, orbitConfig.orbitSpeed);
    gl.uniform1f(instance.uOrbitRadius, orbitConfig.orbitRadius);
    gl.uniform1f(instance.uOrbSize, orbitConfig.orbSize);
    gl.uniform1f(instance.uTailLength, orbitConfig.tailLength);
    gl.uniform1f(instance.uIntensity, orbitConfig.intensity);
    gl.uniform1f(instance.uCenterGlow, orbitConfig.centerGlow);
    gl.uniform1f(instance.uFlicker, orbitConfig.flicker);
    gl.uniform1f(instance.uOrbDrift, orbitConfig.orbDrift);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  
  requestAnimationFrame(animateFire);
}

// ========================================
// INITIALIZE ON LOAD
// ========================================

// Initialize overview demo canvases
initFireCanvas('fire-primed-1', 'primed');
initFireCanvas('fire-primed-2', 'primed');
initFireCanvas('fire-burn-1', 'burn');
initFireCanvas('fire-burn-2', 'burn');

// Initialize tuning section demo canvases
initFireCanvas('tune-primed-1', 'primed');
initFireCanvas('tune-primed-2', 'primed');
initFireCanvas('tune-burn-1', 'burn');
initFireCanvas('tune-burn-2', 'burn');

// Setup burn demo (overview)
if (fireInstances['fire-burn-1']) {
  fireInstances['fire-burn-1'].valueEl = document.getElementById('burn-val-1');
  fireInstances['fire-burn-1'].origValue = 3;
}
if (fireInstances['fire-burn-2']) {
  fireInstances['fire-burn-2'].valueEl = document.getElementById('burn-val-2');
  fireInstances['fire-burn-2'].origValue = 2;
}

// Setup burn demo (tuning section)
if (fireInstances['tune-burn-1']) {
  fireInstances['tune-burn-1'].valueEl = document.getElementById('tune-burn-val-1');
  fireInstances['tune-burn-1'].origValue = 3;
}
if (fireInstances['tune-burn-2']) {
  fireInstances['tune-burn-2'].valueEl = document.getElementById('tune-burn-val-2');
  fireInstances['tune-burn-2'].origValue = 2;
}

// Initialize orbit canvases
initOrbitCanvas('orbit-target');
initOrbitCanvas('tune-orbit');

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
