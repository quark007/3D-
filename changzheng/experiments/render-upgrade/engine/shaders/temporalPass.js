import * as T from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

export class ThreeFrameTemporalPass extends Pass {
  constructor() {
    super();
    this.historyTarget = new T.WebGLRenderTarget(1, 1, { type: T.HalfFloatType, depthBuffer: false });
    this.historyTarget.texture.name = 'HeWen_TAA_History';
    this.historyValid = false;
    this.sampleCount = 0;
    this.frameIndex = 0;
    this.currentWeight = 1;
    this.moving = false;
    this.material = new T.ShaderMaterial({
      uniforms: {
        tCurrent: { value: null },
        tHistory: { value: this.historyTarget.texture },
        currentWeight: { value: 1 }
      },
      vertexShader: `varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
      fragmentShader: `uniform sampler2D tCurrent;
uniform sampler2D tHistory;
uniform float currentWeight;
varying vec2 vUv;
void main() {
  vec4 current = texture2D(tCurrent, vUv);
  vec4 history = texture2D(tHistory, vUv);
  gl_FragColor = mix(history, current, currentWeight);
}`,
      depthTest: false,
      depthWrite: false
    });
    this.copyMaterial = new T.ShaderMaterial(CopyShader);
    this.quad = new FullScreenQuad(this.material);
    this.copyQuad = new FullScreenQuad(this.copyMaterial);
  }

  setMotion(moving) {
    if (moving && !this.moving) this.sampleCount = 0;
    this.moving = moving;
  }

  reset() {
    this.historyValid = false;
    this.sampleCount = 0;
    this.currentWeight = 1;
  }

  beginFrame(camera, width, height) {
    const jitter = [[0, 0], [0.35, -0.35], [-0.35, 0.35]][this.frameIndex % 3];
    camera.setViewOffset(width, height, jitter[0], jitter[1], width, height);
  }

  endFrame(camera) {
    camera.clearViewOffset();
  }

  render(renderer, writeBuffer, readBuffer) {
    this.currentWeight = this.historyValid ? (this.moving ? 0.85 : 1 / Math.min(this.sampleCount + 1, 3)) : 1;
    this.material.uniforms.tCurrent.value = readBuffer.texture;
    this.material.uniforms.currentWeight.value = this.currentWeight;
    this.quad.material = this.material;
    renderer.setRenderTarget(writeBuffer);
    this.quad.render(renderer);
    this.copyMaterial.uniforms.tDiffuse.value = writeBuffer.texture;
    this.copyMaterial.uniforms.opacity.value = 1;
    renderer.setRenderTarget(this.historyTarget);
    this.copyQuad.render(renderer);
    this.historyValid = true;
    this.sampleCount = this.moving ? 0 : Math.min(this.sampleCount + 1, 2);
    this.frameIndex++;
  }

  setSize(width, height) {
    this.historyTarget.setSize(width, height);
    this.reset();
  }

  dispose() {
    this.historyTarget.dispose();
    this.material.dispose();
    this.copyMaterial.dispose();
    this.quad.dispose();
    this.copyQuad.dispose();
  }
}