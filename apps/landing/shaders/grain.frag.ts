/**
 * Film grain + an ember light leak. The canvas is composited with mix-blend-mode: screen over the painting,
 * so black = no change; grain lifts specks, the leak warms one edge and sweeps across on chapter enter.
 * GLSL ES 1.0 so it also compiles on WebGL1 contexts, but we only run it where WebGL2 exists (low-end filter).
 */
export const fragment = /* glsl */ `
precision mediump float;
uniform float uTime;
uniform float uEnter;   // seconds since this hero came into view
uniform vec2 uResolution;
uniform vec3 uEmber;
varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;

  // Grain: new noise every frame (quantised to 24 fps, like film), in device pixels.
  float t = floor(uTime * 24.0);
  float g = hash(gl_FragCoord.xy + t * 17.0);
  float grain = (g - 0.5) * 0.11;

  // Light leak: a soft ember bloom that enters from the right, sweeps left over ~2.4 s, then settles.
  float sweep = clamp(uEnter / 2.4, 0.0, 1.0);
  sweep = sweep * sweep * (3.0 - 2.0 * sweep);
  vec2 c = vec2(mix(1.25, 0.82, sweep) + 0.03 * sin(uTime * 0.35), 0.78 + 0.04 * cos(uTime * 0.27));
  vec2 d = (uv - c) * vec2(max(aspect, 1.0), max(1.0 / aspect, 1.0));
  float leak = exp(-dot(d, d) * 2.6);
  float flare = exp(-pow((uv.x - mix(1.1, 0.6, sweep)) * 6.0, 2.0)) * (1.0 - sweep) * 0.35;
  float strength = (leak * mix(0.42, 0.2, sweep) + flare * 0.8);

  vec3 col = uEmber * strength + vec3(max(grain, 0.0));
  gl_FragColor = vec4(col, 1.0);
}
`;
