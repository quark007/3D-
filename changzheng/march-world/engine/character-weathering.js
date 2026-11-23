/* march-world 内部模块：独立人物的做旧与面部年龄感（WebGL / MeshStandardMaterial）。
   王贵的贴图全是可平铺的小块材质（没有按 UV 展开的整张贴图），所以皱纹、胡茬、泥渍不能画在贴图上，
   这里改为在「绑定空间」——蒙皮之前的 position / normal——里程序化生成：
     · 跟着骨骼动画一起动，不会滑；不依赖 UV；同一套参数对所有实例生效
     · 面部特征点（眼、眉、鼻、口、下巴）在加载时从网格里自动测出，测不出时用 FALLBACK
   用法：M.characterWeathering.apply(T, gltfScene, profileKey) → 返回 { frame, materials }
   调试：localStorage.cz_weathering = '0' 关闭；控制台 CZMarchWorld._.characterWeathering.last 看测到的特征点。
   WebGPU 渲染器（NodeMaterial）不走 onBeforeCompile，本模块会被静默跳过。 */
(() => {
  'use strict';
  const NS = window.CZMarchWorld = window.CZMarchWorld || {};
  const M = NS._ = NS._ || {};

  // glTF 坐标（米）：x 向角色左侧，y 向上，z 向前。数值来自 wang-gui-web.glb 的网格包围盒与骨骼绑定姿势
  const PROFILES = {
    wang_gui: {
      fallback: {
        socketX: .025, eye: [0, 1.600, .090], brow: [0, 1.625, .088], nose: [0, 1.566, .118],
        mouth: [0, 1.530, .100], chin: [0, 1.492, .088],
        elbow: [.347, 1.155, .008], wrist: [.478, 1.031, .192], knee: [.150, .476, .019]
      },
      skin: { tan: .2, furrow: 1, forehead: 1, naso: 1.15, crow: 1, stubble: 1, redness: .8 },
      cloth: { mud: 1, fade: 1, folds: 1, grime: 1 }
    }
  };

  const enabled = () => { try { return localStorage.getItem('cz_weathering') !== '0'; } catch { return true; } };

  // ---------- 特征点测量（绑定空间） ----------
  function boxCenter(T, meshes) {
    const box = new T.Box3();
    for (const mesh of meshes) { mesh.geometry.computeBoundingBox(); box.union(mesh.geometry.boundingBox); }
    return box.isEmpty() ? null : box.getCenter(new T.Vector3());
  }
  function measureFace(T, root, fallback) {
    const meshes = [];
    root.traverse(node => { if (node.isMesh && node.geometry?.attributes?.position) meshes.push(node); });
    const byName = re => meshes.filter(mesh => re.test(mesh.name) || re.test(mesh.geometry.name || ''));
    const f = JSON.parse(JSON.stringify(fallback)), found = [];
    const iris = byName(/iris/i);
    if (iris.length >= 2) {
      const centers = iris.map(mesh => boxCenter(T, [mesh]));
      f.eye = [0, (centers[0].y + centers[1].y) / 2, (centers[0].z + centers[1].z) / 2];
      f.socketX = Math.abs(centers[0].x - centers[1].x) / 2;
      found.push('eye');
    }
    const brows = byName(/brow/i);
    if (brows.length) { const c = boxCenter(T, brows); f.brow = [0, c.y, c.z]; found.push('brow'); }
    const head = meshes.find(mesh => mesh.morphTargetDictionary && 'jawOpen' in mesh.morphTargetDictionary);
    if (head) {
      const pos = head.geometry.attributes.position, morph = head.geometry.morphAttributes.position?.[head.morphTargetDictionary.jawOpen];
      const relative = head.geometry.morphTargetsRelative;
      let maxMove = 0;
      const moves = new Float32Array(pos.count);
      if (morph) for (let i = 0; i < pos.count; i++) {
        const dx = morph.getX(i) - (relative ? 0 : pos.getX(i)), dy = morph.getY(i) - (relative ? 0 : pos.getY(i)), dz = morph.getZ(i) - (relative ? 0 : pos.getZ(i));
        moves[i] = Math.hypot(dx, dy, dz); maxMove = Math.max(maxMove, moves[i]);
      }
      let chinY = Infinity, mouthY = -Infinity, nose = null;
      const eyeY = f.eye[1], eyeZ = f.eye[2];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (Math.abs(x) > .008 || z < eyeZ - .03 || y > eyeY) continue;
        chinY = Math.min(chinY, y);
        if (maxMove > 0 && moves[i] > maxMove * .3) mouthY = Math.max(mouthY, y);
      }
      if (Number.isFinite(mouthY)) for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        if (Math.abs(x) > .008 || y < mouthY + .01 || y > eyeY - .005) continue;
        if (!nose || z > nose[2]) nose = [0, y, z];
      }
      if (Number.isFinite(chinY) && Number.isFinite(mouthY) && nose && chinY < mouthY && mouthY < nose[1] && nose[1] < eyeY) {
        f.chin = [0, chinY + .004, f.chin[2]]; f.mouth = [0, mouthY + .002, f.mouth[2]]; f.nose = nose;
        found.push('mouth', 'chin', 'nose');
      }
    }
    // 肘、腕、膝：骨骼绑定矩阵的逆即骨骼在绑定空间里的位置
    const skinned = meshes.find(mesh => mesh.isSkinnedMesh && mesh.skeleton);
    if (skinned) {
      const at = name => {
        const index = skinned.skeleton.bones.findIndex(bone => bone.name === name);
        if (index < 0) return null;
        const m = skinned.skeleton.boneInverses[index].clone().invert();
        return new T.Vector3().setFromMatrixPosition(m).toArray();
      };
      for (const [key, bone] of [['elbow', 'lowerarm_l'], ['wrist', 'hand_l'], ['knee', 'calf_l']]) {
        const p = at(bone); if (p && Math.abs(p[0]) > .05) { f[key] = [Math.abs(p[0]), p[1], p[2]]; found.push(key); }
      }
    }
    f.found = found;
    return f;
  }

  // ---------- GLSL ----------
  const COMMON = `
varying vec3 czB;
varying vec3 czBN;
uniform vec3 czEye; uniform vec3 czBrow; uniform vec3 czNose; uniform vec3 czMouth; uniform vec3 czChin;
uniform float czSocket;
uniform vec3 czElbow; uniform vec3 czWrist; uniform vec3 czKnee;
uniform vec4 czSkinK; uniform vec4 czSkinK2; uniform vec4 czClothK;
float czG( float v, float c, float w ) { float t = ( v - c ) / w; return exp( - t * t ); }
float czSeg( vec2 p, vec2 a, vec2 b ) { vec2 pa = p - a, ba = b - a; float h = clamp( dot( pa, ba ) / dot( ba, ba ), 0.0, 1.0 ); return length( pa - ba * h ); }
float czH( vec3 p ) { p = fract( p * 0.3183099 + 0.1 ); p *= 17.0; return fract( p.x * p.y * p.z * ( p.x + p.y + p.z ) ); }
float czN( vec3 x ) {
  vec3 i = floor( x ), f = fract( x ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( mix( czH( i ), czH( i + vec3( 1, 0, 0 ) ), f.x ), mix( czH( i + vec3( 0, 1, 0 ) ), czH( i + vec3( 1, 1, 0 ) ), f.x ), f.y ),
              mix( mix( czH( i + vec3( 0, 0, 1 ) ), czH( i + vec3( 1, 0, 1 ) ), f.x ), mix( czH( i + vec3( 0, 1, 1 ) ), czH( i + vec3( 1, 1, 1 ) ), f.x ), f.y ), f.z );
}
// 屏幕空间导数做凹凸（同 three 的 perturbNormalArb），h 单位为米
vec3 czBump( vec3 n, float h, float faceDir ) {
  vec3 sx = dFdx( - vViewPosition ), sy = dFdy( - vViewPosition );
  vec3 r1 = cross( sy, n ), r2 = cross( n, sx );
  float det = dot( sx, r1 ) * faceDir;
  vec3 grad = sign( det ) * ( dFdx( h ) * r1 + dFdy( h ) * r2 );
  return normalize( abs( det ) * n - grad );
}`;
  const VERTEX = ['#include <common>', '#include <common>\nvarying vec3 czB;\nvarying vec3 czBN;',
    '#include <begin_vertex>', '#include <begin_vertex>\nczB = position;\nczBN = normal;'];

  // 面部：czSkinK = (tan, furrow, forehead, naso)  czSkinK2 = (crow, stubble, redness, 0)
  const SKIN_MASKS = `
vec3 czP = czB; float czAx = abs( czP.x );
float czFront = smoothstep( czEye.z - 0.055, czEye.z - 0.02, czP.z );
float czHead = smoothstep( czChin.y - 0.03, czChin.y + 0.004, czP.y ) * ( 1.0 - smoothstep( czBrow.y + 0.065, czBrow.y + 0.09, czP.y ) );
float czFace = czFront * czHead;
float czBy = czBrow.y;
// 眉间「川」字纹：两道竖纹 + 中间一道浅纹
float czFurrow = ( czG( czAx, 0.0048, 0.0011 ) + 0.5 * czG( czP.x, 0.0, 0.0009 ) )
  * smoothstep( czBy - 0.008, czBy - 0.002, czP.y ) * ( 1.0 - smoothstep( czBy + 0.010, czBy + 0.018, czP.y ) );
// 抬头纹：三道略带起伏的横纹，越往两侧越浅
float czWave = 0.0016 * sin( czP.x * 95.0 ) + 0.0008 * sin( czP.x * 230.0 + 1.3 );
float czForehead = ( czG( czP.y, czBy + 0.020 + czWave, 0.0011 ) + czG( czP.y, czBy + 0.030 - czWave, 0.0011 ) + 0.7 * czG( czP.y, czBy + 0.040 + czWave, 0.0012 ) )
  * ( 1.0 - smoothstep( 0.030, 0.052, czAx ) );
// 法令纹：鼻翼外侧到嘴角外下方
float czNaso = czG( czSeg( vec2( czAx, czP.y ), vec2( czSocket * 0.66, czNose.y - 0.004 ), vec2( czSocket * 1.18, czMouth.y - 0.008 ) ), 0.0, 0.0017 );
// 嘴角下方的短纹
float czMarion = czG( czSeg( vec2( czAx, czP.y ), vec2( czSocket * 0.92, czMouth.y - 0.003 ), vec2( czSocket * 0.98, czChin.y + 0.014 ) ), 0.0, 0.0012 ) * 0.6;
// 鱼尾纹：外眼角向外放射的三道
vec2 czCanthus = vec2( czSocket + 0.017, czEye.y );
vec2 czQ = vec2( czAx, czP.y ) - czCanthus;
float czCrowR = smoothstep( 0.0, 0.003, czQ.x ) * ( 1.0 - smoothstep( 0.010, 0.016, czQ.x ) );
float czCrow = ( czG( czQ.y - czQ.x * 0.45, 0.0, 0.0008 ) + czG( czQ.y, 0.0, 0.0008 ) + czG( czQ.y + czQ.x * 0.5, 0.0, 0.0008 ) ) * czCrowR;
// 眼袋
float czUnderEye = czG( czP.y, czEye.y - 0.011, 0.0016 ) * czG( czAx, czSocket, 0.010 );
float czGroove = czFace * ( czSkinK.y * czFurrow + czSkinK.z * czForehead + czSkinK.w * ( czNaso + czMarion ) + czSkinK2.x * czCrow + 0.6 * czUnderEye );
// 短硬胡茬：下颌、下巴、上唇、两腮下部；嘴唇本身不长
float czSide = 1.0 - smoothstep( czSocket * 1.9, czSocket * 2.6, czAx );
float czJaw = czG( czP.y, ( czMouth.y + czChin.y ) * 0.5 - 0.002, 0.020 ) * czSide;
float czUpperLip = czG( czP.y, czMouth.y + 0.009, 0.0045 ) * ( 1.0 - smoothstep( 0.017, 0.026, czAx ) );
float czCheekLow = czG( czP.y, czMouth.y + 0.006, 0.013 ) * smoothstep( czSocket * 0.95, czSocket * 1.35, czAx ) * czSide;
float czLip = czG( czP.y, czMouth.y + 0.001, 0.0035 ) * ( 1.0 - smoothstep( 0.014, 0.022, czAx ) );
float czStubbleZone = clamp( max( max( czJaw, czUpperLip ), czCheekLow * 0.8 ) - czLip * 1.4, 0.0, 1.0 )
  * czHead * smoothstep( czEye.z - 0.09, czEye.z - 0.05, czP.z );
float czDots = step( 0.42, czH( floor( czP * 2400.0 ) ) );
float czStubble = czStubbleZone * czSkinK2.y;
// 颧骨、鼻头晒红
float czRed = ( czG( czAx, czSocket * 1.1, 0.013 ) * czG( czP.y, czNose.y + 0.012, 0.011 ) + 0.7 * czG( czAx, 0.0, 0.008 ) * czG( czP.y, czNose.y, 0.008 ) ) * czFace * czSkinK2.z;`;
  const SKIN_COLOR = `
{
  float czL = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  // 晒黑：压掉偏橙的饱和度，整体往深暖褐走（全身皮肤都受影响，手和脸色调一致）
  diffuseColor.rgb = mix( diffuseColor.rgb, czL * vec3( 1.08, 0.90, 0.78 ), czSkinK.x ) * ( 1.0 - 0.07 * czSkinK.x );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.10, 0.90, 0.86 ), czRed * 0.55 );
  diffuseColor.rgb *= 1.0 - 0.16 * clamp( czGroove, 0.0, 1.0 );
  diffuseColor.rgb *= 1.0 - 0.07 * czG( distance( vec2( czAx, czP.y ), vec2( czSocket, czEye.y ) ), 0.0, 0.016 ) * czFace;  // 眼窝略深
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.12, 0.11, 0.11 ), czStubble * ( 0.22 + 0.42 * czDots ) );
  // 穿草鞋的光脚：脚面和脚趾缝的泥
  float czFeet = ( 1.0 - smoothstep( 0.03, 0.15, czP.y ) ) * czClothK.x;
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.27, 0.21, 0.16 ), czFeet * ( 0.35 + 0.35 * czN( czP * 60.0 ) ) );
}`;
  const SKIN_NORMAL = `
normal = czBump( normal, - 0.00055 * clamp( czGroove, 0.0, 1.6 ) + 0.00006 * czStubble * czDots, faceDirection );`;
  const SKIN_ROUGH = `
roughnessFactor = clamp( roughnessFactor + 0.10 * czStubble - 0.07 * czFace * czG( czP.y, czBy + 0.03, 0.02 ), 0.25, 1.0 );`;

  // 布料：czClothK = (mud, fade, folds, grime)。czCloth.w = 1 表示主衣料（衣裤），会加褶皱
  const CLOTH_MASKS = `
vec3 czP = czB;
float czN1 = czN( czP * vec3( 34.0, 20.0, 34.0 ) ), czN2 = czN( czP * vec3( 110.0, 70.0, 110.0 ) + 7.0 );
// 泥：脚面最重，往上到小腿中部渐无；溅点状边缘
float czMudH = 1.0 - smoothstep( 0.04, 0.40, czP.y + ( czN1 - 0.5 ) * 0.16 );
float czMud = smoothstep( 0.30, 0.62, czMudH + ( czN2 - 0.5 ) * 0.35 ) * czClothK.x;
float czDust = smoothstep( 0.0, 0.5, czMudH ) * ( 1.0 - czMud ) * czClothK.x;
// 日晒褪色：朝上（肩、帽顶）和背面
float czFade = ( smoothstep( 0.3, 0.9, czBN.y ) * smoothstep( 1.10, 1.38, czP.y ) + 0.45 * ( 1.0 - smoothstep( - 0.75, - 0.2, czBN.z ) ) * smoothstep( 0.9, 1.3, czP.y ) ) * czClothK.y;
// 袖口、领口的汗渍油污；肘、膝磨亮
vec3 czMir = vec3( abs( czP.x ), czP.yz );
float czCuff = 1.0 - smoothstep( 0.03, 0.10, distance( czMir, czWrist ) );
float czCollar = czG( czP.y, czEye.y - 0.17, 0.03 ) * ( 1.0 - smoothstep( - 0.06, 0.02, abs( czP.x ) - 0.09 ) );
float czGrime = clamp( czCuff + czCollar * 0.8, 0.0, 1.0 ) * czClothK.w;
float czWear = ( 1.0 - smoothstep( 0.02, 0.07, distance( czMir, czElbow ) ) ) + ( 1.0 - smoothstep( 0.03, 0.08, distance( czMir, czKnee + vec3( 0.0, 0.0, 0.04 ) ) ) );`;
  const CLOTH_FOLDS = `
float czFold = 0.0;
{
  // 肘弯：沿前臂方向的环状压褶
  vec3 czArm = normalize( czWrist - czElbow );
  float czT = dot( czMir - czElbow, czArm );
  float czR = length( ( czMir - czElbow ) - czArm * czT );
  czFold += sin( czT * 230.0 + czN1 * 5.0 ) * czG( czT, 0.0, 0.05 ) * ( 1.0 - smoothstep( 0.05, 0.09, czR ) );
  // 腰带上下的横向堆褶
  czFold += 0.8 * sin( czP.y * 310.0 + sin( czP.x * 45.0 ) * 2.2 + czN1 * 3.0 ) * ( czG( czP.y, 0.975, 0.03 ) + czG( czP.y, 1.075, 0.025 ) ) * ( 1.0 - smoothstep( 0.17, 0.22, abs( czP.x ) ) );
  // 膝窝和膝前的横褶
  czFold += 0.9 * sin( czP.y * 260.0 + czN1 * 4.0 ) * czG( czP.y, czKnee.y + 0.02, 0.045 ) * ( 1.0 - smoothstep( 0.06, 0.11, length( czMir.xz - czKnee.xz ) ) );
  // 大腿到膝盖的竖向垂褶
  float czLeg = atan( czMir.x - czKnee.x, czP.z - czKnee.z );
  czFold += 0.5 * sin( czLeg * 7.0 + czP.y * 6.0 + czN1 * 2.0 ) * smoothstep( 0.52, 0.62, czP.y ) * ( 1.0 - smoothstep( 0.78, 0.88, czP.y ) ) * step( abs( czP.x ), 0.2 );
  // 整体不平整，去掉「毛毡」的均匀感
  czFold += 0.7 * ( czN( czP * vec3( 26.0, 14.0, 26.0 ) ) - 0.5 );
}`;
  const CLOTH_COLOR = `
{
  float czL = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  diffuseColor.rgb = mix( diffuseColor.rgb, czL * vec3( 1.06, 1.03, 0.97 ) * 1.16, clamp( czFade, 0.0, 1.0 ) * 0.38 );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * 1.08 + 0.015, clamp( czWear, 0.0, 1.0 ) * 0.5 * czClothK.w );
  diffuseColor.rgb *= 1.0 - 0.28 * czGrime;
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.53, 0.48, 0.40 ) * ( 0.9 + 0.2 * czN2 ), czDust * 0.32 );
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( 0.25, 0.20, 0.15 ) * ( 0.85 + 0.3 * czN1 ), czMud * 0.82 );
}`;
  const CLOTH_ROUGH = `
roughnessFactor = clamp( roughnessFactor + 0.12 * czMud + 0.05 * czDust - 0.06 * czGrime - 0.05 * clamp( czWear, 0.0, 1.0 ), 0.3, 1.0 );`;

  const SKIN_RE = /skin/i, IGNORE_RE = /iris|sclera|eye|brass|canteen|star/i;
  const MAIN_CLOTH_RE = /cotton|puttee|linen/i;

  function uniformsFor(T, frame, profile) {
    const v = a => new T.Vector3(...a);
    const s = profile.skin, c = profile.cloth;
    return {
      czEye: { value: v([frame.socketX, frame.eye[1], frame.eye[2]]) }, czBrow: { value: v(frame.brow) }, czNose: { value: v(frame.nose) },
      czMouth: { value: v(frame.mouth) }, czChin: { value: v(frame.chin) }, czSocket: { value: frame.socketX },
      czElbow: { value: v(frame.elbow) }, czWrist: { value: v(frame.wrist) }, czKnee: { value: v(frame.knee) },
      czSkinK: { value: new T.Vector4(s.tan, s.furrow, s.forehead, s.naso) },
      czSkinK2: { value: new T.Vector4(s.crow, s.stubble, s.redness, 0) },
      czClothK: { value: new T.Vector4(c.mud, c.fade, c.folds, c.grime) }
    };
  }

  function patch(T, mat, kind, uniforms, key) {
    if (!mat?.isMeshStandardMaterial || mat.userData.czWeathered) return false;
    const C = T.ShaderChunk;
    if (!C.normal_fragment_maps || !C.roughnessmap_fragment) return false;
    mat.userData.czWeathered = kind;
    const main = kind === 'cloth' && MAIN_CLOTH_RE.test(mat.name || '');
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader.replace(VERTEX[0], VERTEX[1]).replace(VERTEX[2], VERTEX[3]);
      let fs = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + COMMON);
      if (kind === 'skin') {
        fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' + SKIN_MASKS + SKIN_COLOR)
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + SKIN_NORMAL)
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + SKIN_ROUGH);
      } else {
        fs = fs.replace('#include <color_fragment>', '#include <color_fragment>\n' + CLOTH_MASKS + (main ? CLOTH_FOLDS : 'float czFold = 0.0;') + CLOTH_COLOR)
          .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + (main ? 'normal = czBump( normal, 0.0011 * czClothK.z * czFold, faceDirection );' : ''))
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n' + CLOTH_ROUGH);
      }
      shader.fragmentShader = fs;
    };
    mat.customProgramCacheKey = () => `cz-weather-${key}-${kind}${main ? '-main' : ''}-v1`;
    mat.needsUpdate = true;
    return true;
  }

  function apply(T, root, key) {
    const profile = PROFILES[key];
    if (!profile || !root || !enabled()) return null;
    const frame = measureFace(T, root, profile.fallback);
    const uniforms = uniformsFor(T, frame, profile);
    const patched = [];
    root.traverse(node => {
      if (!node.isMesh) return;
      for (const mat of [].concat(node.material || [])) {
        const name = mat?.name || '';
        if (!name || IGNORE_RE.test(name) || /hair/i.test(name)) continue;
        const kind = SKIN_RE.test(name) ? 'skin' : 'cloth';
        if (patch(T, mat, kind, uniforms, key)) patched.push(kind + ':' + name);
      }
    });
    const result = { key, frame, materials: patched };
    M.characterWeathering.last = result;
    console.info('[人物做旧]', key, '测到的特征点：', frame.found.join(', ') || '（全部使用预设）', '材质：', patched.length);
    return result;
  }

  M.characterWeathering = { apply, measureFace, PROFILES, last: null };
})();
