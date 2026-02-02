// Wall Shader - Void Storm Effect
// Used for wall tiles on the game board

const vertexShaderSrc = `#version 300 es
  in vec2 a_position;
  out vec2 v_uv;
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentShaderSrc = `#version 300 es
  precision highp float;
  in vec2 v_uv;
  out vec4 fragColor;
  
  uniform float u_time;
  uniform float u_seed;
  
  const float LIGHTNING_FREQ_MIN = 0.05;
  const float LIGHTNING_FREQ_MAX = 0.25;
  const float LIGHTNING_BRIGHT_MIN = 0.2;
  const float LIGHTNING_BRIGHT_MAX = 0.6;
  const float CLOUD_SWIRL_SPEED = 0.2;
  const float CLOUD_DRIFT_SPEED = 0.22;
  
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
  
  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }
  
  void main() {
    vec2 uv = v_uv;
    float t = u_time * CLOUD_DRIFT_SPEED;
    vec2 offset = vec2(sin(u_seed * 12.34) * 100.0, cos(u_seed * 56.78) * 100.0);
    vec3 color = vec3(0.0);
    
    vec2 p = (uv + offset) * 2.0;
    vec2 center = vec2(0.5);
    vec2 fromCenter = uv - center;
    float dist = length(fromCenter);
    float angle = atan(fromCenter.y, fromCenter.x);
    float swirlAmount = (1.0 - dist) * 0.3;
    angle += t * (CLOUD_SWIRL_SPEED / CLOUD_DRIFT_SPEED) * 0.5 + swirlAmount;
    vec2 swirled = center + vec2(cos(angle), sin(angle)) * dist;
    
    float cloud1 = snoise((swirled + offset) * 3.0 + vec2(t * 0.2, t * 0.15));
    float cloud2 = snoise((swirled + offset) * 4.5 + vec2(-t * 0.15, t * 0.1) + 30.0);
    float cloud3 = snoise((swirled + offset) * 2.0 + vec2(t * 0.1, -t * 0.12) + 60.0);
    float clouds = cloud1 * 0.5 + cloud2 * 0.3 + cloud3 * 0.2;
    clouds = clouds * 0.5 + 0.5;
    clouds = smoothstep(0.3, 0.7, clouds);
    
    vec3 cloudColor = vec3(0.08, 0.04, 0.12);
    color += cloudColor * clouds * 0.8;
    
    float totalGlow = 0.0;
    for (int i = 0; i < 4; i++) {
      float fi = float(i);
      float glowSeed = u_seed + fi * 5.17;
      
      // Random timing for each glow using frequency range
      float flashSpeed = LIGHTNING_FREQ_MIN + hash(glowSeed) * (LIGHTNING_FREQ_MAX - LIGHTNING_FREQ_MIN);
      float flashPhase = fract(t * (flashSpeed / CLOUD_DRIFT_SPEED) + hash(glowSeed + 1.0));
      
      // Sharp flash envelope
      float flash = smoothstep(0.0, 0.05, flashPhase) * smoothstep(0.2, 0.08, flashPhase);
      flash = pow(flash, 0.5);
      
      // Random brightness per flash
      float brightness = LIGHTNING_BRIGHT_MIN + hash(glowSeed + 10.0) * (LIGHTNING_BRIGHT_MAX - LIGHTNING_BRIGHT_MIN);
      flash *= brightness;
      
      if (flash > 0.01) {
        // Random position for glow center
        vec2 glowPos = vec2(
          hash(glowSeed + 2.0 + floor(t * flashSpeed)),
          hash(glowSeed + 3.0 + floor(t * flashSpeed))
        );
        
        // Soft radial glow
        float glowDist = length(uv - glowPos);
        float glow = exp(-glowDist * 4.0) * flash;
        
        // Only glow where there are clouds
        glow *= clouds * 1.5;
        
        totalGlow += glow;
      }
    }
    
    // Lightning glow color - purple/magenta
    vec3 glowColor = vec3(0.4, 0.15, 0.6);
    color += totalGlow * glowColor * 0.6;
    
    // Brighter core of glow
    color += totalGlow * vec3(0.6, 0.3, 0.8) * 0.3;
    
    // Ambient illumination during flashes
    float ambientFlash = totalGlow * 0.2;
    color += vec3(0.03, 0.01, 0.05) * ambientFlash;
    
    // Subtle vignette
    float vignette = 1.0 - length(uv - 0.5) * 0.4;
    color *= vignette;
    
    fragColor = vec4(color, 1.0);
  }
`;

function initWall(canvas, seed) {
  const gl = canvas.getContext('webgl2');
  if (!gl) return;
  
  canvas.width = 100;
  canvas.height = 100;
  gl.viewport(0, 0, 100, 100);
  
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vertexShaderSrc);
  gl.compileShader(vs);
  
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fragmentShaderSrc);
  gl.compileShader(fs);
  
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);
  
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  
  const aPos = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  
  const uTime = gl.getUniformLocation(program, 'u_time');
  const uSeed = gl.getUniformLocation(program, 'u_seed');
  gl.uniform1f(uSeed, seed);
  
  function render(time) {
    gl.uniform1f(uTime, time * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

// Initialize all wall canvases on page load
document.querySelectorAll('.wall canvas').forEach((canvas, i) => {
  initWall(canvas, i * 8.91 + Math.random() * 100);
});
