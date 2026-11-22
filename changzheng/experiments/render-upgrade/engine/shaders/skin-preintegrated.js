export function createPreintegratedSkinLut(T) {
  const size = 64;
  const data = new Uint8Array(size * size * 4);
  const widths = [1.35, 0.9, 0.6];
  const samples = 24;
  for (let y = 0; y < size; y++) {
    const roughness = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const theta = Math.acos(Math.max(-1, Math.min(1, (x / (size - 1)) * 2 - 1)));
      const offset = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel++) {
        const sigma = (0.07 + roughness * 0.23) * widths[channel];
        let sum = 0;
        let norm = 0;
        for (let i = 0; i < samples; i++) {
          const angle = -Math.PI * 0.5 + (i + 0.5) / samples * Math.PI;
          const weight = Math.exp(-0.5 * (angle / sigma) ** 2);
          sum += Math.max(0, Math.cos(theta + angle)) * weight;
          norm += weight;
        }
        data[offset + channel] = Math.round(255 * (norm > 0 ? sum / norm : 0));
      }
      data[offset + 3] = 255;
    }
  }
  const texture = new T.DataTexture(data, size, size, T.RGBAFormat, T.UnsignedByteType);
  texture.name = 'HeWen_PreintegratedSkinLUT';
  texture.minFilter = T.LinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.wrapS = T.ClampToEdgeWrapping;
  texture.wrapT = T.ClampToEdgeWrapping;
  texture.colorSpace = T.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const preintegratedSkinPars = `
uniform sampler2D uHwSkinLut;
vec3 hwPreintegratedSkin(float ndl, float roughness, float curvature) {
  vec2 lutUv = vec2(clamp(ndl * 0.5 + 0.5, 0.0, 1.0), clamp(roughness * 0.75 + curvature * 0.25, 0.0, 1.0));
  return texture2D(uHwSkinLut, lutUv).rgb;
}`;