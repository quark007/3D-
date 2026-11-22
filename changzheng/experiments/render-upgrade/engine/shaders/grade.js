export const GradeShader = {
  name: 'HeWen_CinematicGrade',
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    contrast: { value: 1.05 },
    saturation: { value: 0.95 },
    vignette: { value: 0.15 },
    grain: { value: 0.03 }
  },
  vertexShader: `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
  fragmentShader: `uniform sampler2D tDiffuse;
uniform float time;
uniform float contrast;
uniform float saturation;
uniform float vignette;
uniform float grain;
varying vec2 vUv;
float hwLuma(vec3 color) {
  return dot(color, vec3(0.2126, 0.7152, 0.0722));
}
float hwNoise(vec2 point) {
  return fract(sin(dot(point, vec2(12.9898, 78.233))) * 43758.5453);
}
void main() {
  vec4 source = texture2D(tDiffuse, vUv);
  vec3 color = mix(vec3(hwLuma(source.rgb)), source.rgb, saturation);
  color = (color - 0.5) * contrast + 0.5;
  float edge = smoothstep(0.20, 0.72, length((vUv - 0.5) * vec2(1.0, 0.82)));
  color *= 1.0 - edge * vignette;
  color += (hwNoise(gl_FragCoord.xy + time * 17.0) - 0.5) * grain;
  gl_FragColor = vec4(clamp(color, 0.0, 1.0), source.a);
}`
};

export function gradeTSL(TSL, input) {
  const { vec2, vec3, vec4, float, mix, clamp, smoothstep, fract, sin, dot, screenUV, time } = TSL;
  const source = input.rgb;
  const luma = dot(source, vec3(0.2126, 0.7152, 0.0722));
  let color = mix(vec3(luma), source, 0.95).sub(0.5).mul(1.05).add(0.5);
  const edge = smoothstep(0.20, 0.72, screenUV.sub(0.5).mul(vec2(1.0, 0.82)).length());
  color = color.mul(float(1.0).sub(edge.mul(0.15)));
  const noise = fract(sin(dot(screenUV.mul(vec2(1920, 1080)).add(time.mul(17)), vec2(12.9898, 78.233))).mul(43758.5453));
  color = color.add(noise.sub(0.5).mul(0.03));
  return vec4(clamp(color, 0, 1), input.a);
}