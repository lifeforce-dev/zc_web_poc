// Ice Stage Frost Shader Definition
// Implements the freeze stage demo from style-guide/ice.html.

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
  uniform float u_edgeFrost;
  uniform float u_freezeProgress;
  uniform float u_melt;

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
    float t = u_time * 0.5;

    float edgeDist = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));

    float frostNoise = fbm(uv * 8.0 + t * 0.1);
    float frostNoise2 = fbm(uv * 12.0 - t * 0.15);

    float frostDepth = u_edgeFrost * 0.35;
    float frostBoundary = edgeDist - frostDepth + frostNoise * 0.06 + frostNoise2 * 0.04;

    float frost = smoothstep(0.08, 0.0, frostBoundary) * u_freezeProgress;

    if (u_melt > 0.0) {
      float meltLine = 1.0 - u_melt + frostNoise * 0.15;
      float meltMask = smoothstep(meltLine, meltLine + 0.1, uv.y);
      frost *= meltMask;
    }

    float crystalDetail = pow(fbm(uv * 20.0), 2.0);
    frost += crystalDetail * 0.2 * frost;

    float sparkle = pow(noise(uv * 50.0 + t * 2.0), 8.0);
    frost += sparkle * 0.35 * frost;

    float edgeGlow = smoothstep(0.12, 0.0, frostBoundary) - smoothstep(0.02, 0.0, frostBoundary);

    vec3 iceColor = mix(
      vec3(0.65, 0.88, 1.0),
      vec3(0.85, 0.95, 1.0),
      frostNoise
    );
    iceColor += vec3(0.25, 0.3, 0.35) * edgeGlow;

    float pulse = 0.92 + sin(t * 2.0) * 0.08;
    float alpha = frost * 0.55 * pulse;

    fragColor = vec4(iceColor, alpha);
  }
`;

const stageDescriptions = {
  3: 'Turn 3 - Full freeze, edge frost at maximum',
  2: 'Turn 2 - Frost receding, thaw beginning',
  1: 'Turn 1 - Minimal frost, almost thawed',
  0: 'Thawed - Block returns to normal',
};

const STAGE_DURATION_MS = 3000;

export const iceStageFrostShaderDef = {
  dimensions: { width: 120, height: 120 },
  vertexSrc,
  fragmentSrc,
  uniforms: ['u_time', 'u_edgeFrost', 'u_freezeProgress', 'u_melt'],

  createState(params) {
    return {
      currentStage: 3,
      targetEdgeFrost: 1.0,
      currentEdgeFrost: 0.0,
      freezeProgress: 0.0,
      meltProgress: 0.0,
      autoCycleEnabled: true,
      lastStageChange: 0,

      demoBlockEl: null,
      frostNumEl: null,
      autoCycleEl: null,
      statusEl: null,

      setStage(stage) {
        this.currentStage = stage;
        this.lastStageChange = performance.now();

        if (this.statusEl) {
          this.statusEl.textContent = 'Stage: ' + stageDescriptions[stage];
        }

        if (stage > 0) {
          if (this.frostNumEl) {
            this.frostNumEl.textContent = String(stage);
            this.frostNumEl.setAttribute('data-num', String(stage));
          }

          if (this.demoBlockEl) {
            this.demoBlockEl.classList.add('frozen');
          }

          this.meltProgress = 0;
        } else {
          if (this.demoBlockEl) {
            this.demoBlockEl.classList.remove('frozen');
          }
        }

        this.targetEdgeFrost = stage / 3;
      },
    };
  },

  computeUniforms(t, time, state, params) {
    if (state.autoCycleEnabled && time - state.lastStageChange > STAGE_DURATION_MS) {
      const nextStage = state.currentStage > 0 ? state.currentStage - 1 : 3;
      state.setStage(nextStage);
    }

    const transitionSpeed = 0.04;
    state.currentEdgeFrost += (state.targetEdgeFrost - state.currentEdgeFrost) * transitionSpeed;

    const targetProgress = state.currentStage > 0 ? 1.0 : 0.0;
    state.freezeProgress += (targetProgress - state.freezeProgress) * transitionSpeed;

    if (state.currentStage === 0) {
      state.meltProgress = Math.min(state.meltProgress + 0.015, 1.0);
    }

    return {
      u_time: t,
      u_edgeFrost: state.currentEdgeFrost,
      u_freezeProgress: state.freezeProgress,
      u_melt: state.currentStage === 0 ? state.meltProgress : 0.0,
    };
  },

  onFrame(t, time, state, params) {
    if (state.frostNumEl) {
      state.frostNumEl.style.opacity = String(state.freezeProgress * (1 - state.meltProgress));
    }
  },
};
