import { RenderPipeline, VolumeNodeMaterial, Mesh, BoxGeometry, Layers, PointLight } from 'three/webgpu';
import { Fn, pass, screenUV, screenCoordinate, smoothstep, float, vec3, uniform } from 'three/tsl';
import { bayer16 } from 'three/addons/tsl/math/Bayer.js';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { gaussianBlur } from 'three/addons/tsl/display/GaussianBlurNode.js';

/** True low-resolution ray-marched fog, depth-occluded by the terrain pass. */
export function createGPUEffects(renderer, scene, camera, { width, depth, maxHeight, anchor }) {
  let volume, glow, scenePass, volumePass, blurred, bloomPass, pipeline, material, cleaned = false;
  const dispose = () => {
    if (cleaned) return; cleaned = true;
    if (volume) { scene.remove(volume); volume.geometry?.dispose(); }
    if (glow) scene.remove(glow);
    for (const item of [material, pipeline, bloomPass, blurred, volumePass, scenePass]) { try { item?.dispose(); } catch { /* Finish cleaning the remaining allocations. */ } }
  };
  try {
  const phase = uniform(0);
  material = new VolumeNodeMaterial();
  material.steps = 12;
  material.offsetNode = bayer16(screenCoordinate);
  material.scatteringNode = Fn(({ positionRay }) => {
    const x = positionRay.x.div(width).mul(7).add(phase.mul(.08));
    const z = positionRay.z.div(depth).mul(9);
    const strata = x.sin().mul(z.cos()).mul(.25).add(.75);
    const heightMask = float(1).sub(smoothstep(float(maxHeight * .15), float(maxHeight * .9), positionRay.y));
    const boundsX = float(1).sub(smoothstep(float(width * .38), float(width * .5), positionRay.x.abs()));
    const boundsZ = float(1).sub(smoothstep(float(depth * .38), float(depth * .5), positionRay.z.abs()));
    return vec3(strata.mul(heightMask).mul(boundsX).mul(boundsZ).mul(.012));
  });
  volume = new Mesh(new BoxGeometry(width, Math.max(20, maxHeight), depth), material);
  volume.position.y = maxHeight * .45; volume.layers.set(1); scene.add(volume);
  glow = new PointLight(0xe3f3ff, width * width * .025, width * 1.8, 2);
  glow.position.set(-width * .2, maxHeight * 1.2 + 25, depth * .12);
  glow.layers.enable(1); scene.add(glow);
  scenePass = pass(scene, camera);
  material.depthNode = scenePass.getTextureNode('depth').sample(screenUV);
  const layers = new Layers(); layers.set(1);
  volumePass = pass(scene, camera, { depthBuffer: false });
  volumePass.setLayers(layers); volumePass.setResolutionScale(.25);
  blurred = gaussianBlur(volumePass, uniform(.6));
  const composite = scenePass.getTextureNode('output').add(blurred);
  bloomPass = bloom(composite, .18, .35, 1.15);
  pipeline = new RenderPipeline(renderer);
  pipeline.outputNode = composite.add(bloomPass);
  return {
    render(now) { phase.value = now / 1000; pipeline.render(); },
    dispose
  };
  } catch (error) { dispose(); throw error; }
}
