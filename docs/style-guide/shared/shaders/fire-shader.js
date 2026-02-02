// Fire Shader Definition
// Provides shader source, uniforms, and animation logic for fire effects.
// Used with EffectsManager from webgl-effects.js

// ========================================
// CONFIGURATION (mutable for tuning controls)
// ========================================

export const fireConfig = {
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

// ========================================
// SHADER SOURCE
// ========================================

const vertexSrc = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSrc = `#version 300 es
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
      // Target phase
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
      // Primed phase - fire wall surrounds
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
      // Burning phase - firenado collapse
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

// ========================================
// SHADER DEFINITION
// ========================================

export const fireShaderDef = {
  dimensions: { width: 38, height: 34 },
  vertexSrc,
  fragmentSrc,
  uniforms: [
    'u_time', 'u_phase', 'u_spin', 'u_collapse', 'u_dissipate',
    'u_wallThickness', 'u_flameIntensity', 'u_turbulence',
    'u_spinTightness', 'u_rotationSpeed', 'u_coreHeat',
    'u_wallSpread', 'u_wallInset', 'u_wallPulse',
    'u_edgeSoftness', 'u_edgeFade'
  ],

  createState(params) {
    return {
      burnStart: null,
      valueEl: null,
      origValue: params.origValue || 0,
      valueDecremented: false
    };
  },

  computeUniforms(t, time, state, params) {
    const mode = params.mode || 'primed';
    let phase, spin, collapse, dissipate;

    if (mode === 'target') {
      phase = 0.0;
      spin = 0.0;
      collapse = 0.0;
      dissipate = 0.0;
    } else if (mode === 'primed') {
      phase = 1.0;
      spin = 0.0;
      collapse = 0.0;
      dissipate = 0.0;
    } else {
      // burn mode
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

    return {
      u_time: t,
      u_phase: phase,
      u_spin: spin,
      u_collapse: collapse,
      u_dissipate: dissipate,
      u_wallThickness: fireConfig.wallThickness,
      u_flameIntensity: fireConfig.flameIntensity,
      u_turbulence: fireConfig.turbulence,
      u_spinTightness: fireConfig.spinTightness,
      u_rotationSpeed: fireConfig.rotationSpeed,
      u_coreHeat: fireConfig.coreHeat,
      u_wallSpread: fireConfig.wallSpread,
      u_wallInset: fireConfig.wallInset,
      u_wallPulse: fireConfig.wallPulse,
      u_edgeSoftness: fireConfig.edgeSoftness,
      u_edgeFade: fireConfig.edgeFade,
    };
  }
};

// ========================================
// HELPER: Trigger burn animation on all burn-mode canvases
// ========================================

export function triggerBurn(manager) {
  const now = performance.now();
  for (const [id, entry] of manager.canvases) {
    if (entry.params.mode === 'burn') {
      entry.state.burnStart = now;
      entry.state.valueDecremented = false;
      if (entry.state.valueEl) {
        entry.state.valueEl.textContent = entry.state.origValue;
      }
    }
  }
}
