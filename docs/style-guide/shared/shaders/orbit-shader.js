// Orbit Shader Definition
// Provides shader source, uniforms, and animation logic for orbiting flame effects.
// Used with EffectsManager from webgl-effects.js

// ========================================
// CONFIGURATION (mutable for tuning controls)
// ========================================

export const orbitConfig = {
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
// SHADER DEFINITION
// ========================================

export const orbitShaderDef = {
  dimensions: { width: 50, height: 46 },
  vertexSrc,
  fragmentSrc,
  uniforms: [
    'u_time', 'u_orbCount', 'u_orbitSpeed', 'u_orbitRadius',
    'u_orbSize', 'u_tailLength', 'u_intensity',
    'u_centerGlow', 'u_flicker', 'u_orbDrift'
  ],

  createState(params) {
    return {};
  },

  computeUniforms(t, time, state, params) {
    return {
      u_time: t,
      u_orbCount: orbitConfig.orbCount,
      u_orbitSpeed: orbitConfig.orbitSpeed,
      u_orbitRadius: orbitConfig.orbitRadius,
      u_orbSize: orbitConfig.orbSize,
      u_tailLength: orbitConfig.tailLength,
      u_intensity: orbitConfig.intensity,
      u_centerGlow: orbitConfig.centerGlow,
      u_flicker: orbitConfig.flicker,
      u_orbDrift: orbitConfig.orbDrift,
    };
  }
};
