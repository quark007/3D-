(() => {
  'use strict';
  const M = window.CZMarchWorld._;

  async function create(container, logicalScene, options = {}) {
    const T = await import('three');
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const environment = M.visual3d.environment(logicalScene);
    const snowy = environment.terrain === 'snow';
    const staging = M.visual3d.staging(logicalScene);
    const assets = await M.assets3d.load(T, options.signal, logicalScene.streetModel);
    let renderer = null, worldRoot = null, disposeView = null;
    const materials = new Map();
    function releaseResources() {
      const geometries = new Set(), mats = new Set(), textures = new Set(), images = new Set();
      assets?.collect(geometries, mats, textures);
      for (const mat of materials.values()) mats.add(mat);
      worldRoot?.traverse(object => {
        if (object.isInstancedMesh) object.dispose();
        if (object.geometry) geometries.add(object.geometry);
        for (const mat of Array.isArray(object.material) ? object.material : [object.material]) {
          if (!mat) continue;
          mats.add(mat);
          for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
        }
      });
      for (const geometry of geometries) geometry.dispose();
      for (const mat of mats) mat.dispose();
      for (const texture of textures) { texture.dispose(); if (texture.image?.close) images.add(texture.image); }
      for (const image of images) image.close();
    }
    try {
    options.signal?.throwIfAborted();
    renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    const canvas = renderer.domElement;
    canvas.className = 'czmw-canvas czmw-canvas3d';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', logicalScene.title + ' · 实时三维可行走场景');
    container.append(canvas);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = staging.exposure;
    const mobile = navigator.maxTouchPoints > 0 || innerWidth < 760;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap;

    const scene = new T.Scene();
    scene.background = new T.Color(staging.sky);
    scene.fog = new T.Fog(staging.fog, environment.fogNear, environment.fogFar);
    const camera = new T.PerspectiveCamera(52, 1, 0.1, 650);
    worldRoot = new T.Group();
    scene.add(worldRoot);
    const cam = { viewW: 0, viewH: 0, zoom: 12.5 };
    const stats = { frames: 0, renderMs: 0, dpr: 1, adaptive: false, backend: 'three', artReady: false, propsReady: false, unsupportedProps: [], environment: environment.terrain };
    const world = logicalScene.world;
    const toWorld = (x, y, height = 0) => new T.Vector3(x - world.w / 2, height, y - world.h / 2);
    const props = logicalScene.props.map(alignedProp);
    const terrain = M.visual3d.terrain(logicalScene, props);
    const surfaceHeight = terrain.support;
    const onSurface = (x, y, offset = 0) => toWorld(x, y, surfaceHeight(x, y) + offset);
    const pickSurfaces = [];
    const street = assets?.models?.street;
    if (street) {
      const [x, y] = logicalScene.streetModel.origin;
      street.position.copy(onSurface(x, y, .04));
      street.name = 'zunyi-realscan';
      // 街景氛围：渐变天穹 + 与地平线同色的雾，远处房屋自然融进雾里，不再是"白盒子贴在灰幕上"
      const SKY = { zenith: '#8b9da7', horizon: '#c4cac3', ground: '#a7a596' };
      scene.fog.color.set(SKY.horizon);
      scene.fog.near = 28; scene.fog.far = 210;
      scene.background = new T.Color(SKY.horizon);
      const skyGeometry = radius => {
        const geometry = new T.SphereGeometry(radius, 32, 16), positions = geometry.attributes.position, colors = [];
        const zenith = new T.Color(SKY.zenith), horizon = new T.Color(SKY.horizon), below = new T.Color(SKY.ground), c = new T.Color();
        for (let i = 0; i < positions.count; i++) {
          const h = positions.getY(i) / radius;
          if (h >= 0) c.copy(horizon).lerp(zenith, Math.pow(h, .55));
          else c.copy(horizon).lerp(below, Math.min(1, -h * 4));
          colors.push(c.r, c.g, c.b);
        }
        geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
        return geometry;
      };
      // 天穹半径 520 < 相机远裁剪面 650（地图半径约 100），不用每帧跟随相机
      const sky = new T.Mesh(skyGeometry(520), new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
      sky.name = 'zunyi-sky'; sky.renderOrder = -1; sky.frustumCulled = false;
      worldRoot.add(sky);
      // 用同一片天空生成环境光照，暗部（木立面、檐下）不再死黑，玻璃能映出天色
      let envTexture = null;
      try {
        const pmrem = new T.PMREMGenerator(renderer), envScene = new T.Scene();
        const envSky = new T.Mesh(skyGeometry(40), new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide }));
        envScene.add(envSky);
        envTexture = pmrem.fromScene(envScene, .02).texture;
        pmrem.dispose(); envSky.geometry.dispose(); envSky.material.dispose();
      } catch (error) { console.warn('[zunyi] 环境光照生成失败，回退为无环境贴图', error); }
      street.userData.envTexture = envTexture;

      // ---- 贴图去重复：石板路、青砖、灰瓦、白灰墙（只改街景模型的这四种材质）----
      // 原贴图每 2.4m 平铺一次，路面、墙面、屋面都能看出整齐的格子。按贴图结构分三种做法：
      //  free   石板、白灰墙：Inigo Quilez「texture repetition」方法 3，低频噪声决定每片区域的贴图偏移，
      //         相邻两种偏移按颜色差做窄过渡，接缝顺着石缝走
      //  grid   灰瓦：瓦垄每张贴图 16 列、10 行（频谱实测），偏移取 (1/16, 1/10) 的整数倍，瓦垄和瓦口始终对齐
      //  course 青砖：每张贴图 12 层砖，但每层砖块数 8~9 不等（扫描贴图不规整），任何区域过渡都会切出半块砖。
      //         改为每层砖整层随机错开（竖向按整层、横向任意），并且每层每约 4.8m 换一段，断点各层错开
      //  plank  木板：竖向板，每张贴图 9 块，板缝位置实测（宽度 109~117px，不完全等距，所以按实测位置分块）。
      //         每块板随机换成贴图里的另一块、上下随机错开，约每 4.8m 换一段（断口看起来就是木板接头）
      // 颜色、法线、粗糙度共用同一组偏移和权重。之后按世界坐标叠大尺度变化：路面深浅/潮湿斑，
      // 墙根返潮、雨水竖向污痕，屋面深浅和青苔斑。关闭对比：localStorage.cz_zunyi_notile = '0' 后刷新
      const NOTILE_PROFILES = {
        stone:   { mode: 0, region: .9, guide: .1, edge: [.4, .6], macro: 0 },
        plaster: { mode: 0, region: .7, guide: .1, edge: [.35, .65], macro: 2 },
        roof:    { mode: 1, region: .8, guide: .3, edge: [.42, .58], q: [1 / 16, 1 / 10], macro: 3 },
        brick:   { mode: 2, courses: 12, phase: .0017, cell: .5, macro: 1 },
        wood:    { mode: 3, cell: .5, macro: 4, seams: [0.060547, 0.166992, 0.279297, 0.393555, 0.503906, 0.616211, 0.728516, 0.840820, 0.951172, 1.060547] }
      };
      const glslFloat = value => Number(value).toFixed(6);
      const NOTILE_PARS = `
varying vec3 czWorldPos;
vec2 czOffA = vec2( 0.0 ), czOffB = vec2( 0.0 ), czDx = vec2( 0.0 ), czDy = vec2( 0.0 );
float czF = 0.0, czMix = 0.0, czWet = 1.0, czTone = 0.5;
float czHash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
float czNoise( vec2 p ) {
  vec2 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( czHash( i ), czHash( i + vec2( 1.0, 0.0 ) ), u.x ), mix( czHash( i + vec2( 0.0, 1.0 ) ), czHash( i + vec2( 1.0, 1.0 ) ), u.x ), u.y );
}
void czNoTileSetup( vec2 uv ) {
  czDx = dFdx( uv ); czDy = dFdy( uv );   // 用未偏移 UV 的导数采样，偏移跳变处不会出现 mipmap 接缝
#if CZ_MODE == 2
  float course = floor( ( uv.y - CZ_PHASE ) * CZ_COURSES );
  float segment = floor( uv.x * CZ_CELL + czHash( vec2( course, 91.7 ) ) );
  vec2 key = vec2( course, segment );
  czOffA = vec2( czHash( key + vec2( 17.0, 3.0 ) ), floor( czHash( key + vec2( 53.0, 11.0 ) ) * CZ_COURSES ) / CZ_COURSES );
  czOffB = czOffA; czF = 0.0; czMix = 0.0;
#elif CZ_MODE == 3
  // 板缝表 CZ_SEAMS：贴图里 9 块板的左边界（第 10 个是下一张贴图第 1 块的左边界）
  float ux = uv.x - CZ_SEAMS[ 0 ], tile = floor( ux ), fu = ux - tile;
  int j = 0;
  for ( int k = 1; k < 9; k ++ ) if ( fu >= CZ_SEAMS[ k ] - CZ_SEAMS[ 0 ] ) j = k;
  float j0 = CZ_SEAMS[ j ] - CZ_SEAMS[ 0 ], j1 = CZ_SEAMS[ j + 1 ] - CZ_SEAMS[ 0 ];
  float plank = tile * 9.0 + float( j );
  float segment = floor( uv.y * CZ_CELL + czHash( vec2( plank, 13.1 ) ) );
  int s = int( floor( czHash( vec2( plank + 5.0, segment + 1.0 ) ) * 8.999 ) );
  float t = ( fu - j0 ) / ( j1 - j0 );
  float srcU = CZ_SEAMS[ s ] + t * ( CZ_SEAMS[ s + 1 ] - CZ_SEAMS[ s ] );
  czOffA = vec2( srcU - uv.x, czHash( vec2( plank + 29.0, segment + 7.0 ) ) );
  czOffB = czOffA; czF = 0.0; czMix = 0.0;
  czTone = czHash( vec2( plank + 41.0, segment + 2.0 ) );
#else
  float l = czNoise( uv * CZ_REGION ) * 8.0, ia = floor( l );
  czF = l - ia;
  czOffA = sin( vec2( 3.0, 7.0 ) * ia );
  czOffB = sin( vec2( 3.0, 7.0 ) * ( ia + 1.0 ) );
  #if CZ_MODE == 1
  czOffA = floor( czOffA / CZ_Q ) * CZ_Q;
  czOffB = floor( czOffB / CZ_Q ) * CZ_Q;
  #endif
  czMix = smoothstep( CZ_EDGE0, CZ_EDGE1, czF );
#endif
}
vec4 czNoTile( sampler2D tex, vec2 uv ) {
#if CZ_MODE >= 2
  return textureGrad( tex, uv + czOffA, czDx, czDy );
#else
  return mix( textureGrad( tex, uv + czOffA, czDx, czDy ), textureGrad( tex, uv + czOffB, czDx, czDy ), czMix );
#endif
}
vec4 czNoTileMap( sampler2D tex, vec2 uv ) {
#if CZ_MODE >= 2
  return textureGrad( tex, uv + czOffA, czDx, czDy );
#else
  vec4 a = textureGrad( tex, uv + czOffA, czDx, czDy ), b = textureGrad( tex, uv + czOffB, czDx, czDy );
  czMix = smoothstep( CZ_EDGE0, CZ_EDGE1, czF - CZ_GUIDE * dot( a.rgb - b.rgb, vec3( 1.0 ) ) );
  return mix( a, b, czMix );
#endif
}`;
      const NOTILE_MACRO = `
{
  vec3 cw = czWorldPos;
#if CZ_MACRO == 0
  float broad = czNoise( cw.xz * 0.07 ) * 0.65 + czNoise( cw.xz * 0.23 ) * 0.35;
  float warm = smoothstep( 0.5, 0.85, czNoise( cw.xz * 0.05 + 5.1 ) ) * 0.6;
  float wet = smoothstep( 0.62, 0.8, czNoise( cw.xz * 0.11 + 17.3 ) );
  diffuseColor.rgb *= mix( 0.84, 1.1, broad );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.05, 0.99, 0.9 ), warm );
  diffuseColor.rgb *= 1.0 - 0.16 * wet;
  czWet = 1.0 - 0.3 * wet;   // 潮湿处更光滑，阴天里会有一点反光
#elif CZ_MACRO == 3
  float broad = czNoise( cw.xz * 0.09 + 2.3 ) * 0.7 + czNoise( cw.xz * 0.31 ) * 0.3;
  float moss = smoothstep( 0.6, 0.84, czNoise( cw.xz * 0.16 + 3.7 ) );
  diffuseColor.rgb *= mix( 0.86, 1.08, broad );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.82, 0.93, 0.72 ), moss * 0.7 );
#elif CZ_MACRO == 4
  // 木作：每块板深浅不一；每间铺面整体色调不同（沿街开间宽 4m，分界在逻辑 x = 21 + 4k，即世界 x = 4k - 59），
  // 部分铺面日晒褪成灰褐，越往上越明显；墙根 0.6m 内溅水发暗
  float h = cw.y - CZ_BASE_Y;
  float bay = floor( ( cw.x + 59.0 ) / 4.0 ), side = step( 1.5, cw.z );
  float bayTone = czHash( vec2( bay, side * 7.0 + 3.0 ) );
  diffuseColor.rgb *= ( 0.86 + 0.26 * czTone ) * ( 0.88 + 0.22 * bayTone );
  float grey = dot( diffuseColor.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );
  float bleach = smoothstep( 0.55, 0.95, bayTone ) * 0.35 + smoothstep( 1.5, 4.5, h ) * 0.12;
  diffuseColor.rgb = mix( diffuseColor.rgb, vec3( grey ) * vec3( 1.06, 1.02, 0.95 ) * 1.08, bleach );
  diffuseColor.rgb *= 1.0 - 0.22 * ( 1.0 - smoothstep( 0.05, 0.6, h ) );
#else
  // 墙面：沿墙方向用 x+z，竖向压扁，得到横向成片、竖向拉长的变化
  vec2 wall = vec2( cw.x + cw.z, cw.y );
  float h = cw.y - CZ_BASE_Y;
  float broad = czNoise( wall * vec2( 0.16, 0.1 ) ) * 0.7 + czNoise( wall * vec2( 0.5, 0.3 ) ) * 0.3;
  float damp = 1.0 - smoothstep( 0.05, CZ_DAMP_H, h );                    // 墙根返潮
  float streak = smoothstep( 0.55, 0.9, czNoise( wall * vec2( 2.6, 0.12 ) + 7.1 ) ); // 雨水竖向污痕
  diffuseColor.rgb *= mix( CZ_BROAD_LO, CZ_BROAD_HI, broad );
  diffuseColor.rgb = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 0.78, 0.82, 0.74 ), damp * CZ_DAMP );
  diffuseColor.rgb *= 1.0 - CZ_STREAK * streak * smoothstep( 0.4, 1.6, h );
#endif
}`;
      const noTileEnabled = (() => { try { return localStorage.getItem('cz_zunyi_notile') !== '0'; } catch { return true; } })();
      const noTileApplied = [];
      const antiTile = (mat, kind) => {
        const p = NOTILE_PROFILES[kind];
        if (!p || !noTileEnabled || !mat.map || mat.userData.czNoTile) return false;
        const C = T.ShaderChunk;
        const mapChunk = C.map_fragment?.includes('texture2D( map, vMapUv )') ? C.map_fragment.replace('texture2D( map, vMapUv )', 'czNoTileMap( map, vMapUv )') : null;
        if (!mapChunk) { console.warn('[zunyi] 当前 three.js 的 map_fragment 结构不同，贴图去重复已跳过'); return false; }
        const roughChunk = C.roughnessmap_fragment.replace('texture2D( roughnessMap, vRoughnessMapUv )', 'czNoTile( roughnessMap, vRoughnessMapUv )');
        const normalChunk = C.normal_fragment_maps.split('texture2D( normalMap, vNormalMapUv )').join('czNoTile( normalMap, vNormalMapUv )');
        const wallTune = kind === 'plaster' ? { lo: .86, hi: 1.05, damp: .55, dampH: 1.1, streak: .14 } : { lo: .88, hi: 1.08, damp: .35, dampH: .8, streak: .08 };
        const defines = [
          ['CZ_MODE', p.mode], ['CZ_MACRO', p.macro],
          ['CZ_REGION', glslFloat(p.region ?? .9)], ['CZ_GUIDE', glslFloat(p.guide ?? .1)],
          ['CZ_EDGE0', glslFloat(p.edge?.[0] ?? .4)], ['CZ_EDGE1', glslFloat(p.edge?.[1] ?? .6)],
          ['CZ_Q', `vec2( ${glslFloat(p.q?.[0] ?? 1)}, ${glslFloat(p.q?.[1] ?? 1)} )`],
          ['CZ_COURSES', glslFloat(p.courses ?? 1)], ['CZ_PHASE', glslFloat(p.phase ?? 0)], ['CZ_CELL', glslFloat(p.cell ?? 1)],
          ['CZ_BASE_Y', glslFloat(street.position.y)],
          ['CZ_BROAD_LO', glslFloat(wallTune.lo)], ['CZ_BROAD_HI', glslFloat(wallTune.hi)],
          ['CZ_DAMP', glslFloat(wallTune.damp)], ['CZ_DAMP_H', glslFloat(wallTune.dampH)], ['CZ_STREAK', glslFloat(wallTune.streak)]
        ].map(([name, value]) => `#define ${name} ${value}`).join('\n')
          + (p.seams ? `\nconst float CZ_SEAMS[ ${p.seams.length} ] = float[ ${p.seams.length} ]( ${p.seams.map(glslFloat).join(', ')} );` : '');
        mat.userData.czNoTile = kind;
        mat.onBeforeCompile = shader => {
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 czWorldPos;')
            .replace('#include <project_vertex>', `#include <project_vertex>
{
  vec4 czP = vec4( transformed, 1.0 );
  #ifdef USE_BATCHING
  czP = batchingMatrix * czP;
  #endif
  #ifdef USE_INSTANCING
  czP = instanceMatrix * czP;
  #endif
  czWorldPos = ( modelMatrix * czP ).xyz;
}`);
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\n' + defines + '\n' + NOTILE_PARS)
            .replace('#include <map_fragment>', '#ifdef USE_MAP\nczNoTileSetup( vMapUv );\n#endif\n' + mapChunk + '\n' + NOTILE_MACRO)
            .replace('#include <roughnessmap_fragment>', roughChunk + '\nroughnessFactor *= czWet;')
            .replace('#include <normal_fragment_maps>', normalChunk);
        };
        mat.customProgramCacheKey = () => 'cz-zunyi-notile-' + kind + '-v3';
        noTileApplied.push(kind);
        return true;
      };
      stats.stoneNoTile = false;
      const tuned = new Set();
      street.traverse(node => {
        if (!node.isMesh) return;
        node.receiveShadow = true;
        for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
          if (!mat) continue;
          const name = mat.name || '';
          // 贴地的接触阴影片、告示纸、小草不投影，其余房屋和道具投影
          if (!/contact|notice|grass/i.test(name)) node.castShadow = true;
          if (tuned.has(mat)) continue;
          tuned.add(mat);
          if (envTexture && 'envMap' in mat) { mat.envMap = envTexture; mat.envMapIntensity = .55; }
          if (/glass/i.test(name)) { mat.roughness = .18; mat.envMapIntensity = 1.1; mat.color.multiplyScalar(.7); }
          if (/stone/i.test(name) && mat.normalScale) mat.normalScale.multiplyScalar(1.25);   // 石板缝更清楚
          const tileKind = /stone/i.test(name) ? 'stone' : /brick/i.test(name) ? 'brick' : /roof/i.test(name) ? 'roof' : /plaster/i.test(name) ? 'plaster' : /wood/i.test(name) ? 'wood' : null;
          if (tileKind && antiTile(mat, tileKind) && tileKind === 'stone') stats.stoneNoTile = true;
          mat.needsUpdate = true;
        }
      });
      stats.noTile = noTileApplied.slice();
      worldRoot.add(street);
      // 原来加载街景后整个关掉阴影，房子不投影、街面没有明暗，画面发平。桌面端重新打开，移动端保持关闭
      renderer.shadowMap.enabled = !mobile;
      stats.streetShadows = !mobile;
    }

    // ---- 街市生活：摊位、招幌（静态，按材质合并成 4 个网格）。只在街景章节且配置了 streetLife 时生成 ----
    const STALL_DIRS = { s: [0, 1], n: [0, -1], e: [1, 0], w: [-1, 0] };
    // 摊位局部坐标 → 逻辑坐标：lx 沿摊位宽度，lz 朝摊位正面（街道一侧）
    function stallPoint(s, lx, lz) {
      const f = STALL_DIRS[s.face] || STALL_DIRS.s, r = [f[1], -f[0]];
      return [s.x + r[0] * lx + f[0] * lz, s.y + r[1] * lx + f[1] * lz];
    }
    const STEAM_AT = { tea: [-.98, .05, .82], food: [-.62, 0, .86] };   // [lx, lz, 高度]，与下方炉灶、锅的位置一致
    if (street && logicalScene.streetLife) {
      try { buildStreetLife(logicalScene.streetLife); }
      catch (error) { console.warn('[zunyi] 街市装饰生成失败，已跳过', error); }
    }
    function buildStreetLife(life) {
      let seed = 1935;
      const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const parts = { wood: [], paint: [], cloth: [], sign: [] };
      const BOX = new T.BoxGeometry(1, 1, 1), CYL = new T.CylinderGeometry(1, 1, 1, 10), BALL = new T.SphereGeometry(1, 10, 7), CONE = new T.ConeGeometry(1, 1, 14, 1, true);
      const m4 = new T.Matrix4(), q = new T.Quaternion(), euler = new T.Euler(), size = new T.Vector3(), at3 = new T.Vector3(), tint = new T.Color();
      function colorize(geometry, color) {
        tint.set(color);
        const count = geometry.attributes.position.count, colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) { colors[i * 3] = tint.r; colors[i * 3 + 1] = tint.g; colors[i * 3 + 2] = tint.b; }
        geometry.setAttribute('color', new T.BufferAttribute(colors, 3));
        return geometry;
      }
      // x,y 为逻辑坐标，h 为世界高度；bucket 为 wood / paint / cloth
      function add(bucket, base, color, x, y, h, yaw, sx, sy, sz, rx = 0) {
        const geometry = base.clone();
        geometry.applyMatrix4(m4.compose(at3.set(x - world.w / 2, h, y - world.h / 2), q.setFromEuler(euler.set(rx, yaw, 0)), size.set(sx, sy, sz)));
        if (bucket !== 'wood') colorize(geometry, color);
        parts[bucket].push(geometry);
      }
      function frame(s) {
        const f = STALL_DIRS[s.face] || STALL_DIRS.s, r = [f[1], -f[0]];
        const g0 = surfaceHeight(s.x, s.y), yaw = Math.atan2(-r[1], r[0]);
        const P = (lx, lz) => stallPoint(s, lx, lz);
        return {
          g0,
          box: (bucket, color, lx, lz, h, sx, sy, sz, rx = 0) => add(bucket, BOX, color, ...P(lx, lz), g0 + h, yaw, sx, sy, sz, rx),
          cyl: (bucket, color, lx, lz, h, radius, height) => add(bucket, CYL, color, ...P(lx, lz), g0 + h, yaw, radius, height, radius),
          ball: (bucket, color, lx, lz, h, rx, ry = rx, rz = rx) => add(bucket, BALL, color, ...P(lx, lz), g0 + h, yaw, rx, ry, rz),
          cone: (color, lx, lz, h, radius, height) => add('cloth', CONE, color, ...P(lx, lz), g0 + h, yaw, radius, height, radius),
          P
        };
      }
      function table(F, w, d, h = .78, ox = 0) {
        F.box('wood', null, ox, 0, h, w, .05, d);
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.box('wood', null, ox + sx * (w / 2 - .07), sz * (d / 2 - .07), (h - .03) / 2, .06, h - .03, .06);
      }
      // 布篷：后高前低、中间微垂，前沿有一道垂边；四根竹竿
      function awning(F, s, color, w = s.w + .3) {
        const back = -s.d / 2 - .05, front = s.d / 2 + .4, hb = 2.36, hf = 2.04;
        for (const side of [-1, 1]) {
          F.cyl('paint', '#8a7a4e', side * w / 2, back, hb / 2, .022, hb);
          F.cyl('paint', '#8a7a4e', side * w / 2, front, hf / 2, .022, hf);
        }
        const us = 7, rows = [0, .34, .67, 1, 'flap'], positions = [], uvs = [], index = [];
        rows.forEach((row, j) => {
          const t = row === 'flap' ? 1 : row, v = back + (front - back) * t;
          for (let i = 0; i < us; i++) {
            const u = -w / 2 + w * i / (us - 1);
            const sag = .07 * Math.sin(Math.PI * i / (us - 1)) * Math.sin(Math.PI * Math.min(t, 1)) ;
            const h = hb + (hf - hb) * t - sag - (row === 'flap' ? .2 : 0) + .015;
            const [x, y] = F.P(u, v);
            positions.push(x - world.w / 2, F.g0 + h, y - world.h / 2); uvs.push(i / (us - 1), j / (rows.length - 1));
          }
        });
        for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < us - 1; i++) {
          const a = j * us + i, b = a + 1, c = a + us, d = c + 1;
          index.push(a, c, b, b, c, d);
        }
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(index); geometry.computeVertexNormals();
        parts.cloth.push(colorize(geometry, color));
      }
      function umbrella(F, lx, lz, color) {
        F.cyl('wood', null, lx, lz, 1.02, .02, 2.04);
        F.cone(color, lx, lz, 2.06 + .19, 1.05, .38);
      }
      const pick = list => list[Math.floor(rnd() * list.length)];
      const BUILD = {
        produce(F, s) {
          table(F, s.w, s.d);
          const heaps = [['#6f8a46', .1, 5], ['#c0702c', .06, 8], ['#8a2a1c', .045, 10]];
          heaps.forEach(([color, radius, count], i) => {
            const lx = (i - 1) * s.w * .3;
            F.cyl('paint', '#8a6a3c', lx, 0, .88, .23, .13);
            for (let k = 0; k < count; k++) F.ball('paint', color, lx + (rnd() - .5) * .26, (rnd() - .5) * .26, .95 + rnd() * .05, radius * (.85 + rnd() * .3));
          });
          for (const lx of [-.45, .45]) { F.cyl('paint', '#7d6036', lx, 0, .15, .24, .3); for (let k = 0; k < 3; k++) F.ball('paint', '#6f8a46', lx + (rnd() - .5) * .2, (rnd() - .5) * .2, .34, .14); }
          awning(F, s, '#4a5a6c');
        },
        sandals(F, s) {
          table(F, s.w * .5, s.d, .7, -s.w * .25);
          for (let k = 0; k < 8; k++) F.box('paint', '#b39a5e', -s.w * .25 + (rnd() - .5) * .7, (rnd() - .5) * .5, .74 + k * .012, .1, .025, .26);
          for (const side of [-1, 1]) F.box('wood', null, s.w * .22 + side * .55, -.15, .85, .05, 1.7, .05);
          for (const h of [.95, 1.3, 1.65]) {
            F.box('wood', null, s.w * .22, -.15, h, 1.16, .03, .03);
            for (let k = 0; k < 5; k++) F.box('paint', pick(['#b39a5e', '#a38a50', '#c2a96a']), s.w * .22 - .44 + k * .22, -.13, h - .14, .09, .25, .02);
          }
        },
        tea(F, s) {
          table(F, 1.0, .82, .76, .35);
          for (const lz of [-.52, .52]) {
            F.box('wood', null, .35, lz, .42, 1.0, .05, .2);
            for (const side of [-1, 1]) F.box('wood', null, .35 + side * .42, lz, .2, .05, .4, .16);
          }
          F.ball('paint', '#3b3430', .35, 0, .86, .1, .085, .1);
          for (let k = 0; k < 4; k++) F.cyl('paint', '#d3cbb8', .05 + k * .2, (k % 2 ? .22 : -.22), .8, .045, .035);
          F.cyl('paint', '#6b5646', STEAM_AT.tea[0], STEAM_AT.tea[1], .27, .22, .54);
          F.ball('paint', '#2f2c2a', STEAM_AT.tea[0], STEAM_AT.tea[1], .64, .14, .12, .14);
          awning(F, s, '#7d7466');
        },
        pottery(F, s) {
          F.box('paint', '#a8925f', 0, 0, .008, s.w, .016, s.d);
          const slots = [-.85, -.42, 0, .42, .85];
          slots.forEach((lx, i) => {
            const lz = (i % 2 ? .18 : -.15);
            if (i % 3 === 0) { F.ball('paint', '#5b4130', lx, lz, .3, .24, .29, .24); F.cyl('paint', '#4d372a', lx, lz, .62, .11, .08); }
            else if (i % 3 === 1) F.cyl('paint', pick(['#6e4e36', '#7d5a3e']), lx, lz, .18, .15, .36);
            else for (let k = 0; k < 3; k++) F.cyl('paint', '#7c6a55', lx, lz, .035 + k * .055, .15 - k * .012, .05);
          });
          umbrella(F, s.w / 2 - .15, -.25, '#a2723e');
        },
        cloth(F, s) {
          table(F, s.w, s.d);
          const colors = ['#2f3d55', '#46566b', '#c9bd9f', '#7b7d78', '#6b4f3a', '#3b4a63'];
          for (const lx of [-s.w / 3, 0, s.w / 3]) {
            const n = 3 + Math.floor(rnd() * 2);
            for (let k = 0; k < n; k++) F.box('paint', pick(colors), lx + (rnd() - .5) * .05, (rnd() - .5) * .08, .86 + k * .095, .46, .09, .32);
          }
          awning(F, s, '#8b6f4e');
        },
        food(F, s) {
          for (const side of [-1, 1]) F.box('wood', null, side * .62, 0, .31, .5, .62, .42);
          F.box('wood', null, 0, -.05, 1.0, 1.9, .05, .05);
          for (const side of [-1, 1]) F.box('wood', null, side * .62, -.05, .82, .03, .34, .03);
          F.cyl('paint', '#2e2b28', STEAM_AT.food[0], STEAM_AT.food[1], .71, .2, .18);
          for (let k = 0; k < 6; k++) F.cyl('paint', '#d3cbb8', .52 + (k % 3) * .1, (k < 3 ? -.08 : .1), .66 + (k % 2) * .03, .05, .03);
          for (const lx of [-.9, .9]) F.cyl('paint', '#6b5038', lx, .42, .16, .13, .32);
          umbrella(F, 0, -.32, '#9a5a32');
        },
        grain(F, s) {
          for (let k = 0; k < 4; k++) {
            const lx = (k - 1.5) * s.w * .24;
            F.ball('paint', k % 2 ? '#b8a47c' : '#a8946c', lx, -.05, .36, .27, .36, .25);
            F.cyl('paint', pick(['#e7dfc9', '#c9a24a', '#d8cfb4']), lx, -.05, .7, .19, .04);
          }
          F.box('wood', null, .2, .32, .1, .28, .2, .28);
          awning(F, s, '#8b8a7e');
        },
        herbs(F, s) {
          table(F, s.w, s.d);
          for (const lx of [-s.w / 3, 0, s.w / 3]) {
            F.cyl('paint', '#a6874e', lx, 0, .82, .29, .035);
            F.ball('paint', pick(['#6e6a3a', '#7a4e32', '#5a4a30']), lx, 0, .85, .21, .05, .21);
          }
          for (let k = 0; k < 5; k++) F.ball('paint', pick(['#5c5a34', '#6e5a3a']), -s.w / 2 + .2 + k * (s.w - .4) / 4, s.d / 2 + .3, 1.72, .07, .13, .07);
          awning(F, s, '#5a4c3e');
        }
      };
      for (const s of life.stalls || []) BUILD[s.kind]?.(frame(s), s);

      // 招幌：竖向木牌 / 布幌，垂直于墙面挂在铺面立柱上，两面都能正读
      const signs = (life.signs || []).slice(0, 16);
      if (signs.length) {
        const CELL_W = 128, CELL_H = 448, COLS = 8, atlas = document.createElement('canvas');
        atlas.width = atlas.height = 1024;
        const ctx = atlas.getContext('2d');
        const FONT = '"KaiTi","STKaiti","Kaiti SC","SimSun","Songti SC","Noto Serif CJK SC",serif';
        const STYLES = { dark: ['#2b211b', '#5a4330', '#d2ae63'], light: ['#b79f78', '#5b4632', '#2a1d16'], flag: ['#d8ccb0', '#2f2620', '#2a1d16'] };
        signs.forEach((sign, i) => {
          const x0 = (i % COLS) * CELL_W, y0 = Math.floor(i / COLS) * CELL_H, [bg, edge, ink] = STYLES[sign.style] || STYLES.dark;
          ctx.fillStyle = edge; ctx.fillRect(x0, y0, CELL_W, CELL_H);
          ctx.fillStyle = bg; ctx.fillRect(x0 + 9, y0 + 9, CELL_W - 18, CELL_H - 18);
          for (let k = 0; k < 320; k++) { ctx.fillStyle = `rgba(0,0,0,${(rnd() * .09).toFixed(3)})`; ctx.fillRect(x0 + 9 + rnd() * (CELL_W - 18), y0 + 9 + rnd() * (CELL_H - 18), 1 + rnd() * 4, 1); }
          const chars = [...sign.text], fontSize = chars.length === 1 ? 104 : chars.length === 2 ? 92 : 80;
          ctx.fillStyle = ink; ctx.font = `bold ${fontSize}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const step = Math.min(fontSize * 1.14, (CELL_H - 60) / chars.length);
          chars.forEach((ch, k) => ctx.fillText(ch, x0 + CELL_W / 2, y0 + CELL_H / 2 + (k - (chars.length - 1) / 2) * step));
        });
        const base = street.position.y, W = .4, H = 1.3;
        signs.forEach((sign, i) => {
          const u0 = (i % COLS) * CELL_W / 1024, u1 = u0 + CELL_W / 1024;
          const vTop = 1 - Math.floor(i / COLS) * CELL_H / 1024, vBottom = vTop - CELL_H / 1024;
          const flag = sign.style === 'flag', out = flag ? .3 : .22;
          const centerY = sign.front + sign.face * (out + W / 2), centerH = base + (flag ? 2.62 : 2.7);
          const wx = sign.x - world.w / 2, wz = centerY - world.h / 2;
          for (const side of [1, -1]) {
            const plane = new T.PlaneGeometry(W, H);
            const uv = plane.attributes.uv;
            for (let k = 0; k < uv.count; k++) uv.setXY(k, u0 + uv.getX(k) * (u1 - u0), vBottom + uv.getY(k) * (vTop - vBottom));
            plane.rotateY(side * Math.PI / 2);
            plane.translate(wx + side * (flag ? .004 : .026), centerH, wz);
            parts.sign.push(plane);
          }
          if (!flag) add('paint', BOX, '#3a2b20', sign.x, centerY, centerH, 0, .05, H + .04, W + .04);
          // 挑杆：从墙内 0.1m 伸出到牌外 0.15m，墙面位置有误差也不会悬空
          const armOut = out + W + .15, armMid = sign.front + sign.face * (armOut - .1) / 2;
          add('wood', BOX, null, sign.x, armMid, base + 3.42, 0, .06, .07, armOut + .1);
          const top = centerH + H / 2, cord = base + 3.42 - top;
          for (const t of [.12, W - .12]) add('paint', BOX, '#2a221c', sign.x, sign.front + sign.face * (out + t), top + cord / 2, 0, .012, cord, .012);
          if (flag) add('wood', BOX, null, sign.x, centerY, top + .02, 0, .03, .03, W + .06);
          if (sign.lantern) {
            const ly = sign.front + sign.face * (armOut - .05);
            add('paint', CYL, '#2a221c', sign.x, ly, base + 3.3, 0, .005, .24, .005);
            add('paint', BALL, '#a8321f', sign.x, ly, base + 3.02, 0, .17, .22, .17);
            add('paint', CYL, '#2a221c', sign.x, ly, base + 3.25, 0, .07, .04, .07);
            add('paint', CYL, '#2a221c', sign.x, ly, base + 2.79, 0, .07, .04, .07);
          }
        });
        var signTexture = new T.CanvasTexture(atlas);
        signTexture.colorSpace = T.SRGBColorSpace; signTexture.anisotropy = 4;
      }
      for (const g of [BOX, CYL, BALL, CONE]) g.dispose();

      function merge(list) {
        let vertices = 0, indices = 0;
        for (const g of list) { vertices += g.attributes.position.count; indices += g.index ? g.index.count : g.attributes.position.count; }
        const names = Object.keys(list[0].attributes).filter(name => list.every(g => g.attributes[name]));
        const arrays = {}, index = new Uint32Array(indices);
        for (const name of names) arrays[name] = new Float32Array(vertices * list[0].attributes[name].itemSize);
        let vo = 0, io = 0;
        for (const g of list) {
          for (const name of names) arrays[name].set(g.attributes[name].array, vo * g.attributes[name].itemSize);
          const count = g.attributes.position.count;
          if (g.index) for (let i = 0; i < g.index.count; i++) index[io++] = g.index.getX(i) + vo;
          else for (let i = 0; i < count; i++) index[io++] = vo + i;
          vo += count; g.dispose();
        }
        const out = new T.BufferGeometry();
        for (const name of names) out.setAttribute(name, new T.BufferAttribute(arrays[name], list[0].attributes[name].itemSize));
        out.setIndex(new T.BufferAttribute(index, 1));
        out.computeBoundingSphere();
        return out;
      }
      let woodMaterial = null;
      street.traverse(node => { if (!woodMaterial && node.isMesh) for (const m of [].concat(node.material)) if (/wood/i.test(m?.name || '')) { woodMaterial = m; break; } });
      const env = street.userData.envTexture || null;
      const lifeMaterials = {
        wood: woodMaterial || new T.MeshStandardMaterial({ color: '#6b5038', roughness: .86 }),
        paint: new T.MeshStandardMaterial({ vertexColors: true, roughness: .86, envMap: env, envMapIntensity: .55 }),
        cloth: new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: T.DoubleSide, envMap: env, envMapIntensity: .45 }),
        sign: new T.MeshStandardMaterial({ map: signTexture || null, roughness: .78, envMap: env, envMapIntensity: .4 })
      };
      let triangles = 0;
      for (const [key, list] of Object.entries(parts)) {
        if (!list.length) continue;
        const object = new T.Mesh(merge(list), lifeMaterials[key]);
        object.name = 'zunyi-life-' + key;
        object.castShadow = key !== 'sign'; object.receiveShadow = true;
        triangles += object.geometry.index.count / 3;
        worldRoot.add(object);
      }
      for (const [key, mat] of Object.entries(lifeMaterials)) if (!parts[key].length && mat !== woodMaterial) mat.dispose();
      stats.streetLife = { stalls: (life.stalls || []).length, signs: signs.length, triangles: Math.round(triangles) };
    }
    stats.landform = staging.name;
    stats.terrainVertices = terrain.heights.length;
    stats.terrainMin = Math.min(...terrain.heights);
    stats.terrainMax = Math.max(...terrain.heights);
    const markers = new Map();
    const waters = [], flags = [], smokeColumns = [], fires = [];
    const guideLine = new T.Line(new T.BufferGeometry(), new T.LineDashedMaterial({ color: '#f4db98', dashSize: .7, gapSize: .4, toneMapped: false }));
    guideLine.name = 'march-guide-route';
    guideLine.visible = false;
    guideLine.frustumCulled = false;
    worldRoot.add(guideLine);
    let guideRoute = null;
    let actors = null;
    let dead = false;
    let raf = 0;
    let last = 0;
    let slow = 0;
    let dprCap = mobile ? 1.15 : 1.6;
    let focus = null;
    let orbitYaw = 0, orbitTarget = 0, orbitPitch = 0, orbitPitchTarget = 0, movementYaw = null, locomotionScale = 1;
    let intro = null;
    let introOverlay = null;
    const FOCUS_HEIGHT = 1.52, HEAD_POINT_HEIGHT = 1.92, MIN_CAM_DIST = 1.1;
    // 肩后机位：缩短通用场景距离；街景保留前方街道视野。鼠标可同时控制水平与俯仰。
    const STREET_CAM = { distance: 6.2, pitch: .32, focusScale: 1.12, lookAhead: 1.8, alignRate: 1.6, alignMaxAngle: 1.3, manualHold: 2.5, fov: 50 };
    const BASE_HEADING = Math.atan2(staging.offset[0], staging.offset[2]);
    const BASE_DISTANCE = street ? STREET_CAM.distance : Math.hypot(...staging.offset) * .68;
    const BASE_PITCH = street ? STREET_CAM.pitch : Math.atan2(staging.offset[1], Math.hypot(staging.offset[0], staging.offset[2]));
    orbitPitch = orbitPitchTarget = BASE_PITCH;
    const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
    const behindYaw = facing => wrapAngle(Math.atan2(-Math.cos(facing), -Math.sin(facing)) - BASE_HEADING);
    const lookAhead = new T.Vector3(), lookAheadGoal = new T.Vector3();
    let followCamReady = false, lastManualLook = -Infinity;
    stats.cameraMode = 'shoulder';
    if (street) { camera.fov = STREET_CAM.fov; camera.updateProjectionMatrix(); stats.streetCamera = true; }
    let followTarget = onSurface(logicalScene.spawn.x, logicalScene.spawn.y, FOCUS_HEIGHT);
    let graphicsLost = false;

    function material(color, roughness = 0.9, metalness = 0) {
      const key = `${color}:${roughness}:${metalness}`;
      if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness, metalness }));
      return materials.get(key);
    }

    function surface(key, tint = '#ffffff', meters = 2, strength = .7) {
      if (!assets) return material(tint);
      const cacheKey = `pbr:${key}:${tint}:${meters}:${strength}`;
      if (!materials.has(cacheKey)) {
        const maps = assets.textures[key];
        const mat = new T.MeshStandardMaterial({ color: tint, map: maps.diffuse, normalMap: maps.normal, roughnessMap: maps.roughness, roughness: 1, normalScale: new T.Vector2(strength, strength) });
        mat.userData.meters = meters;
        materials.set(cacheKey, mat);
      }
      return materials.get(cacheKey);
    }

    function snowSurface() {
      if (!materials.has('snow')) {
        const mat = new T.MeshStandardMaterial({ color: environment.groundTint, normalMap: assets.textures.earth.normal, normalScale: new T.Vector2(.16, .16), roughness: .94 });
        mat.userData.meters = 2;
        materials.set('snow', mat);
      }
      return materials.get('snow');
    }

    function mesh(geometry, mat, x = 0, y = 0, z = 0, parent = worldRoot) {
      if (mat.userData.meters && geometry.attributes.normal) {
        const positions = geometry.attributes.position, normals = geometry.attributes.normal;
        const uv = new Float32Array(positions.count * 2), scale = mat.userData.meters;
        for (let i = 0; i < positions.count; i++) {
          const nx = Math.abs(normals.getX(i)), ny = Math.abs(normals.getY(i)), nz = Math.abs(normals.getZ(i));
          uv[i * 2] = (nx > nz && nx > ny ? positions.getZ(i) : positions.getX(i)) / scale;
          uv[i * 2 + 1] = (ny > nx && ny > nz ? positions.getZ(i) : positions.getY(i)) / scale;
        }
        geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
      }
      const object = new T.Mesh(geometry, mat);
      object.position.set(x, y, z);
      object.castShadow = true;
      object.receiveShadow = true;
      parent.add(object);
      return object;
    }

    function groundTexture() {
      const cv = document.createElement('canvas');
      cv.width = 1536;
      cv.height = Math.max(512, Math.round(cv.width * world.h / world.w));
      const ctx = cv.getContext('2d');
      const sx = cv.width / world.w;
      const sy = cv.height / world.h;
      ctx.fillStyle = logicalScene.palette.ground;
      ctx.fillRect(0, 0, cv.width, cv.height);
      let seed = logicalScene.seed || 1;
      const random = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      for (let i = 0; i < 22000; i++) {
        const light = random() > 0.48;
        ctx.fillStyle = light ? 'rgba(244,234,194,.055)' : 'rgba(33,40,26,.045)';
        const size = 0.5 + random() * 2.2;
        ctx.fillRect(random() * cv.width, random() * cv.height, size, size);
      }
      for (const patch of logicalScene.terrain?.patches || []) {
        ctx.save();
        ctx.globalAlpha = patch.alpha ?? 0.5;
        ctx.fillStyle = patch.color;
        ctx.beginPath();
        ctx.ellipse(patch.x * sx, patch.y * sy, patch.rx * sx, patch.ry * sy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const road of logicalScene.terrain?.roads || []) {
        for (const [color, extra] of [[logicalScene.palette.roadEdge, 1.1], [logicalScene.palette.road, 0]]) {
          ctx.strokeStyle = color;
          ctx.lineWidth = (road.w + extra) * sx;
          ctx.beginPath();
          road.pts.forEach(([x, y], index) => index ? ctx.lineTo(x * sx, y * sy) : ctx.moveTo(x * sx, y * sy));
          ctx.stroke();
        }
      }
      for (const water of [...(logicalScene.terrain?.waters || []), ...terrain.crossings.map(b => ({ pts: [[b.x - b.w / 2, b.min], [b.x + b.w / 2, b.min], [b.x + b.w / 2, b.max], [b.x - b.w / 2, b.max]] }))]) {
        ctx.fillStyle = logicalScene.palette.waterDeep;
        ctx.beginPath();
        water.pts.forEach(([x, y], index) => index ? ctx.lineTo(x * sx, y * sy) : ctx.moveTo(x * sx, y * sy));
        ctx.closePath();
        ctx.fill();
      }
      const texture = new T.CanvasTexture(cv);
      texture.colorSpace = T.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    }

    if (assets) for (const maps of Object.values(assets.textures)) for (const texture of Object.values(maps)) texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    function terrainPatch(width, depth, x, y, cols, rows, offset = 0) {
      const positions = [], uv = [], indices = [];
      for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) {
        const px = x - width / 2 + col * width / cols, py = y - depth / 2 + row * depth / rows;
        positions.push(px - world.w / 2, terrain.height(px, py) + offset, py - world.h / 2);
        uv.push(col / cols, 1 - row / rows);
      }
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        const a = row * (cols + 1) + col, c = a + cols + 1;
        indices.push(a, c, a + 1, a + 1, c, c + 1);
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geometry.setIndex(indices); geometry.computeVertexNormals();
      return geometry;
    }
    function zunyiGroundColors(geometry) {
      const positions = geometry.attributes.position;
      const colors = [];
      const clay = new T.Color('#c1b19c'), gravel = new T.Color('#9e9a8c');
      const grass = new T.Color('#8caa73'), shade = new T.Color();
      const footprints = (logicalScene.streetBlocked || []).flatMap(({rect}) => rect ? [rect] : []);
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) + world.w / 2, y = positions.getZ(i) + world.h / 2;
        const roadY = 58 - Math.max(0, x - 40) * .05;
        const pattern = Math.sin(x * .53 + Math.sin(y * .42)) * Math.cos(y * .35 + x * .12);
        const distance = Math.abs(y - roadY);
        shade.copy(clay).lerp(gravel, .32 + .24 * pattern + .26 * Math.exp(-distance * .19));
        shade.lerp(grass, T.MathUtils.clamp((distance - 6) / 27 + .22 * pattern, 0, .86));
        const yardTrail = Math.min(
          Math.abs(x - 61.5 - Math.sin(y * .22)) * .76 + Math.max(0,y-44,13-y),
          Math.abs(y - 74 - Math.sin(x * .19)) + Math.max(0,36-x,x-136)
        );
        if (yardTrail < 3) shade.lerp(gravel, .64 * (1 - yardTrail / 3));
        let contact = 0;
        for (const [left, top, width, depth] of footprints) {
          const d = Math.hypot(Math.max(left - x, x - left - width, 0), Math.max(top - y, y - top - depth, 0));
          contact = Math.max(contact, 1 - Math.min(1, d / 1.4));
        }
        shade.multiplyScalar(1 - .24 * contact);
        colors.push(shade.r, shade.g, shade.b);
      }
      geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    }
    const ground = mesh(
      terrainPatch(world.w, world.h, world.w / 2, world.h / 2, terrain.cols, terrain.rows),
      snowy ? snowSurface() : assets ? (street ? surface('earth', '#e4dad0', 2.2, .72) : surface('earth', environment.groundTint, 3, .8)) : new T.MeshStandardMaterial({ map: groundTexture(), roughness: 0.98, metalness: 0 })
    );
    ground.name = 'march-pbr-ground';
    if (street) {
      ground.material.vertexColors = true;
      zunyiGroundColors(ground.geometry);
    }
    ground.castShadow = false;
    pickSurfaces.push(ground);
    if (assets) {
      const divisor = street ? 6 : 3;
      const geometry = terrainPatch(world.w * 3, world.h * 3, world.w / 2, world.h / 2,
        Math.ceil(terrain.cols / divisor) * 3, Math.ceil(terrain.rows / divisor) * 3);
      const positions = geometry.attributes.position, indices = [];
      for (let i = 0; i < geometry.index.count; i += 3) {
        const triangle = [geometry.index.getX(i), geometry.index.getX(i + 1), geometry.index.getX(i + 2)];
        const x = triangle.reduce((sum, vertex) => sum + positions.getX(vertex), 0) / 3;
        const z = triangle.reduce((sum, vertex) => sum + positions.getZ(vertex), 0) / 3;
        if (Math.abs(x) > world.w / 2 || Math.abs(z) > world.h / 2) indices.push(...triangle);
      }
      geometry.setIndex(indices);
      const outskirts = mesh(geometry, ground.material);
      outskirts.name = 'march-terrain-outskirts';
      outskirts.castShadow = false;
    }

    const featherCanvas = document.createElement('canvas');
    featherCanvas.width = featherCanvas.height = 128;
    const featherContext = featherCanvas.getContext('2d');
    const gradient = featherContext.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, '#ffffff'); gradient.addColorStop(.65, '#bbbbbb'); gradient.addColorStop(1, '#000000');
    featherContext.fillStyle = gradient;
    featherContext.fillRect(0, 0, 128, 128);
    const feather = new T.CanvasTexture(featherCanvas);
    feather.channel = 1;
    for (const patch of logicalScene.terrain?.patches || []) {
      const left = Math.max(0, Math.floor((patch.x - patch.rx) / terrain.dx)), right = Math.min(terrain.cols, Math.ceil((patch.x + patch.rx) / terrain.dx));
      const top = Math.max(0, Math.floor((patch.y - patch.ry) / terrain.dy)), bottom = Math.min(terrain.rows, Math.ceil((patch.y + patch.ry) / terrain.dy));
      const geometry = terrainPatch((right - left) * terrain.dx, (bottom - top) * terrain.dy, (left + right) * terrain.dx / 2, (top + bottom) * terrain.dy / 2, right - left, bottom - top, .018);
      geometry.setAttribute('uv1', geometry.attributes.uv.clone());
      const mat = (snowy ? snowSurface() : surface('earth', patch.color, 2.8, .45)).clone();
      if (snowy) mat.color.set('#c7d3da');
      mat.alphaMap = feather; mat.transparent = true; mat.depthWrite = false;
      mat.opacity = snowy ? .32 : patch.alpha ?? .5;
      const object = mesh(geometry, mat);
      object.name = 'march-ground-patch';
      object.castShadow = false;
    }

    function polygonObject(points, mat, height) {
      const contour = points.map(([x, y]) => new T.Vector2(x - world.w / 2, y - world.h / 2));
      const triangles = T.ShapeUtils.triangulateShape(contour, []);
      const positions = [];
      for (const point of contour) positions.push(point.x, height, point.y);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      geometry.setIndex(triangles.flat());
      geometry.computeVertexNormals();
      return mesh(geometry, mat);
    }

    for (const water of [...(logicalScene.terrain?.waters || []), ...terrain.crossings.map(b => ({ pts: [[b.x - b.w / 2, b.min], [b.x + b.w / 2, b.min], [b.x + b.w / 2, b.max], [b.x - b.w / 2, b.max]] }))]) {
      const mat = new T.MeshPhysicalMaterial({
        color: logicalScene.palette.water,
        roughness: 0.2,
        metalness: 0.05,
        clearcoat: 0.8,
        clearcoatRoughness: 0.16,
        transparent: true,
        opacity: 0.92,
        side: T.DoubleSide
      });
      const flow = { value: 0 };
      mat.userData.flow = flow;
      mat.onBeforeCompile = shader => {
        shader.uniforms.marchFlow = flow;
        shader.vertexShader = 'varying vec2 vMarchWater;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvMarchWater = position.xz;');
        shader.fragmentShader = 'varying vec2 vMarchWater;\nuniform float marchFlow;\n' + shader.fragmentShader.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
          vec2 p = vMarchWater;
          vec3 ripple = vec3(.10 * sin(p.x * 2.1 + p.y * .7 - marchFlow * 1.9) + .035 * sin(p.y * 6.1 - marchFlow * 3.0), 0.0, .08 * cos(p.y * 2.7 - p.x * .5 - marchFlow * 1.4));
          normal = normalize(normal + mat3(viewMatrix) * ripple);`);
      };
      const object = polygonObject(water.pts, mat, terrain.waterLevel);
      object.name = 'march-river-water';
      object.castShadow = false;
      waters.push(object);
    }

    const roadEdge = assets ? (() => {
      const canvas = document.createElement('canvas');
      canvas.width = 64; canvas.height = 256;
      const ctx = canvas.getContext('2d'), image = ctx.createImageData(64, 256);
      for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x++) {
        const noise = Math.sin(y * .13) * 1.7 + Math.cos(y * .31 + x * .27) * 1.4;
        const shade = Math.max(0, Math.min(1, (Math.min(x, 63 - x) - 2 - noise) / 9));
        const offset = (y * 64 + x) * 4;
        image.data[offset] = image.data[offset + 1] = image.data[offset + 2] = shade * 255;
        image.data[offset + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
      const texture = new T.CanvasTexture(canvas);
      texture.wrapT = T.RepeatWrapping;
      texture.channel = 1;
      return texture;
    })() : null;

    function roadRibbon(road) {
      const geometry = ground.geometry.clone(), positions = geometry.attributes.position;
      const edgeUV = [], distances = [], indices = [];
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) + world.w / 2, y = positions.getZ(i) + world.h / 2;
        let nearest = Infinity, along = 0, signed = 0, travelled = 0;
        for (let j = 1; j < road.pts.length; j++) {
          const a = road.pts[j - 1], b = road.pts[j], dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy);
          const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (length * length)));
          const px = x - a[0] - dx * t, py = y - a[1] - dy * t, distance = Math.hypot(px, py);
          if (distance < nearest) { nearest = distance; along = travelled + length * t; signed = distance * (dx * py - dy * px < 0 ? -1 : 1); }
          travelled += length;
        }
        distances.push(nearest);
        edgeUV.push(Math.max(0, Math.min(1, .5 + signed / road.w)), along / 6);
        positions.setY(i, positions.getY(i) + .03);
      }
      for (let i = 0; i < ground.geometry.index.count; i += 3) {
        const a = ground.geometry.index.getX(i), b = ground.geometry.index.getX(i + 1), c = ground.geometry.index.getX(i + 2);
        if (Math.min(distances[a], distances[b], distances[c]) <= road.w * .6) indices.push(a, b, c);
      }
      geometry.setIndex(indices);
      const roadMaterial = snowy ? snowSurface().clone() : assets ? surface('earth', '#c1b49a', 2.3, .22) : new T.MeshStandardMaterial({ color: logicalScene.palette.road, roughness: 1 });
      if (snowy) roadMaterial.color.set('#b4c4cc');
      roadMaterial.side = T.DoubleSide;
      if (roadEdge) {
        geometry.setAttribute('uv1', new T.Float32BufferAttribute(edgeUV, 2));
        roadMaterial.alphaMap = roadEdge;
        roadMaterial.transparent = true;
        roadMaterial.depthWrite = false;
      }
      const object = mesh(geometry, roadMaterial);
      object.castShadow = false;
    }
    for (const road of logicalScene.terrain?.roads || []) roadRibbon(road);

    function groupAt(prop, height = 0) {
      const group = new T.Group();
      group.name = `march-prop-${prop.type || 'decoration'}-${prop.seed || 1}`;
      group.position.copy(toWorld(prop.x, prop.y, terrain.height(prop.x, prop.y) + height));
      worldRoot.add(group);
      return group;
    }

    function house(prop, wooden = false) {
      const group = groupAt(prop);
      const width = prop.w || 10, depth = prop.depth || width * .68;
      const chapter = Number(logicalScene.chapterId), seed = prop.seed || 1;
      const meeting = chapter === 3 && wooden && seed === 4;
      const barracks = chapter === 7 && prop.x < (logicalScene.ironBridge?.x0 ?? 62);
      const loess = chapter === 11 || chapter === 12;
      const wall = surface('plaster', loess ? '#b7a080' : '#c3bcaa', 2.5, .6);
      const earth = surface('earth', loess ? '#ae9067' : '#9b8564', 2, .55);
      const roof = surface('roof', loess ? '#8c8270' : '#777c7c', 2.6, .85);
      const wood = surface('wood', '#76614d', 1.8);
      const boards = surface('wood', '#aa9272', 1.8, .65);
      const stone = surface('rock', '#8a8375', 1.6, .65);
      const dark = material('#262a26');
      const parts = new Map(), cube = new T.BoxGeometry(1, 1, 1);
      const transform = new T.Object3D(), point = new T.Vector3();
      const vertices = mat => {
        if (!parts.has(mat)) parts.set(mat, []);
        return parts.get(mat);
      };
      function triangle(mat, a, b, c) { vertices(mat).push(...a, ...b, ...c); }
      function quad(mat, a, b, c, d) { triangle(mat, a, b, c); triangle(mat, a, c, d); }
      function solid(w, h, d, mat, x = 0, y = h / 2, z = 0, tilt = 0) {
        transform.position.set(x, y, z); transform.rotation.set(tilt, 0, 0); transform.scale.set(w, h, d); transform.updateMatrix();
        const out = vertices(mat);
        for (const index of cube.index.array) {
          point.fromBufferAttribute(cube.attributes.position, index).applyMatrix4(transform.matrix);
          out.push(point.x, point.y, point.z);
        }
      }
      function room(x, z, w, d, bottom, top, mat = wall) {
        solid(w, top - bottom, d, mat, x, (bottom + top) / 2, z);
      }
      function pitched(x, z, w, d, height, rise, overhang = .18, wear = 0, gable = wall) {
        const count = wear ? Math.ceil(w / 1.1) : 1, half = d / 2;
        const down = p => [p[0], p[1] - .12, p[2]];
        const section = i => {
          const px = x - w / 2 - overhang + (w + 2 * overhang) * i / count;
          return [-half - overhang, -half, 0, half, half + overhang].map((pz, j) => {
            const edge = j === 0 || j === 4;
            const uneven = edge ? wear * Math.sin(seed * 2.3 + i * 1.7 + j) : 0;
            const py = j === 2 ? rise : edge ? -overhang * rise / half * .55 + uneven : 0;
            return [px, height + .12 + py, z + pz + (edge ? uneven * .5 : 0)];
          });
        };
        for (let i = 0; i < count; i++) {
          const a = section(i), b = section(i + 1);
          for (let j = 0; j < 4; j++) {
            quad(roof, a[j], a[j + 1], b[j + 1], b[j]);
            quad(wood, down(b[j]), down(b[j + 1]), down(a[j + 1]), down(a[j]));
            if (!i) quad(roof, a[j], down(a[j]), down(a[j + 1]), a[j + 1]);
            if (i === count - 1) quad(roof, b[j], b[j + 1], down(b[j + 1]), down(b[j]));
          }
          quad(roof, b[0], down(b[0]), down(a[0]), a[0]);
          quad(roof, a[4], down(a[4]), down(b[4]), b[4]);
        }
        for (const side of [-1, 1]) {
          const gx = x + side * w / 2;
          triangle(gable, [gx, height, z - side * half], [gx, height + rise, z], [gx, height, z + side * half]);
        }
        solid(w + overhang * 2, .16, .22, roof, x, height + rise + .17, z);
      }
      function canopy(x, w, back, front, high, low) {
        solid(w, .13, Math.hypot(front - back, high - low), roof, x, (high + low) / 2, (front + back) / 2, Math.atan2(high - low, front - back));
      }
      function door(x, bottom, z, w = 1.4, h = 2.05) {
        solid(w + .22, h + .18, .1, wood, x, bottom + h / 2, z + .055);
        solid(w, h, .035, dark, x, bottom + h / 2, z + .115);
        for (const side of [-1, 1]) {
          solid(w / 2 - .035, h - .06, .055, boards, x + side * w / 4, bottom + h / 2, z + .145);
          for (const y of [.24, h - .28]) solid(w / 2 - .1, .09, .04, wood, x + side * w / 4, bottom + y, z + .18);
        }
      }
      function windowBay(x, y, z, w = 1.1, h = 1, lattice = false, facing = 1) {
        solid(w + .16, h + .16, .09, wood, x, y, z + facing * .05);
        solid(w, h, .035, dark, x, y, z + facing * .11);
        if (lattice) {
          for (const dx of [-.3, 0, .3]) solid(.065, h, .045, wood, x + dx * w, y, z + facing * .145);
          solid(w, .065, .045, wood, x, y, z + facing * .145);
        } else {
          for (const side of [-1, 1]) solid(w / 2 - .035, h - .05, .045, boards, x + side * w / 4, y, z + facing * .145);
          for (const dy of [-.28, .28]) solid(w, .075, .035, wood, x, y + dy * h, z + facing * .18);
        }
      }
      function frame(x, z, w, bottom, top, bays = 3) {
        for (let i = 0; i <= bays; i++) solid(.16, top - bottom, .15, wood, x - w / 2 + .1 + (w - .2) * i / bays, (bottom + top) / 2, z);
        for (const y of [bottom + .12, top - .12]) solid(w, .17, .16, wood, x, y, z);
      }
      function steps(x, z, w, height, count = 2, run = .5) {
        for (let i = 0; i < count; i++) {
          const h = height * (count - i) / count;
          solid(w, h, run / count, stone, x, h / 2, z + (i + .5) * run / count);
        }
      }

      if ((chapter === 3 && seed === 3) || (chapter === 12 && prop.y > 80)) group.rotation.y = Math.PI;
      if (meeting) {
        const gallery = Math.min(1.15, depth * .14), bodyW = width - 2 * gallery, bodyD = depth - 2 * gallery;
        const floor = 3.08, eave = 5.95, px = width / 2 - .18, pz = depth / 2 - .18;
        solid(width, .34, depth, stone);
        room(0, 0, bodyW, bodyD, .34, eave);
        solid(width - .12, .2, depth - .12, wood, 0, floor, 0);
        for (const side of [-1, 1]) {
          frame(0, side * pz, width - .2, .34, eave, 5);
          for (let i = 0; i <= 5; i++) solid(.32, .2, .32, stone, -px + 2 * px * i / 5, .44, side * pz);
          for (const y of [floor + .27, floor + .94]) solid(width - .3, .1, .12, wood, 0, y, side * pz);
          for (let i = 0; i <= 28; i++) solid(.065, .65, .065, wood, -px + 2 * px * i / 28, floor + .59, side * pz);
          for (const y of [floor + .27, floor + .94, eave - .12]) solid(.12, .1, depth - .3, wood, side * px, y, 0);
          for (let i = 1; i < 18; i++) solid(.065, .65, .065, wood, side * px, floor + .59, -pz + 2 * pz * i / 18);
          for (const z of [-depth * .17, depth * .17]) solid(.17, eave - .34, .17, wood, side * px, (eave + .34) / 2, z);
          for (let i = -2; i <= 2; i++) {
            const x = i * bodyW / 5;
            windowBay(x, floor + 1.4, side * bodyD / 2, 1.35, 1.7, true, side);
            if (i) windowBay(x, 1.85, side * bodyD / 2, 1.3, 1.45, true, side);
          }
          beam([side * px, eave - .66, pz], [side * (px - .6), eave - .15, pz], .065, wood, group);
        }
        door(0, .34, bodyD / 2, 1.7, 2.3);
        steps(0, bodyD / 2 + .22, 2.25, .34, 2, gallery - .28);
        pitched(0, 0, width - .12, depth - .12, eave, 1.42, .22, 0, wall);
      } else if (loess) {
        const archive = chapter === 11 && wooden, side = seed % 2 ? -1 : 1;
        const base = .22, eave = archive ? 2.8 : 2.42 + (seed % 3) * .1;
        const rearD = depth * .57, rearZ = -depth / 2 + rearD / 2 + .06, front = rearZ + rearD / 2;
        solid(width, .16, depth, earth);
        room(0, rearZ, width - .14, rearD, base, eave);
        solid(width - .14, .22, rearD, stone, 0, .11, rearZ);
        pitched(0, rearZ, width - .14, rearD, eave, .64 + (seed % 2) * .13, .13);
        const wingW = width * .25, wingD = depth - rearD - .28, wingX = side * (width / 2 - wingW / 2 - .07);
        const wingZ = front + wingD / 2, wingTop = eave - .4;
        room(wingX, wingZ, wingW, wingD, base, wingTop);
        canopy(wingX, wingW + .12, front - .06, front + wingD + .08, wingTop + .48, wingTop + .08);
        solid(wingW, .4, .1, wall, wingX, wingTop + .2, front);
        for (const s of [-1, 1]) {
          const x = wingX + s * wingW / 2;
          triangle(wall, [x, wingTop, wingZ - s * wingD / 2], [x, wingTop + .4, front], [x, wingTop, wingZ + s * wingD / 2]);
        }
        door(0, base, front, archive ? 1.55 : 1.25, 1.95);
        windowBay(-side * width * .29, base + 1.4, front, archive ? 1.45 : .85, .95, archive || wooden);
        if (archive) frame(0, front + .11, width - .2, base, eave, 4);
        const gateX = -side * width * .1, gateW = 1.55, fenceZ = depth / 2 - .16;
        const left = gateX - gateW / 2 - .12, right = gateX + gateW / 2 + .12;
        solid(left + width / 2, 1.18, .28, wall, (left - width / 2) / 2, .59, fenceZ);
        solid(width / 2 - right, 1.18, .28, wall, (right + width / 2) / 2, .59, fenceZ);
        solid(.24, 1.18, depth - rearD - .12, wall, -side * (width / 2 - .12), .59, front + (depth - rearD - .12) / 2);
        for (const s of [-1, 1]) solid(.24, 2.04, .4, wall, gateX + s * (gateW / 2 + .12), 1.02, depth / 2 - .22);
        door(gateX, .12, depth / 2 - .42, gateW, 1.8);
        solid(gateW + .52, .14, .52, roof, gateX, 2.05, depth / 2 - .28);
      } else if (chapter === 4) {
        const floor = wooden ? 1.02 + (seed % 2) * .25 : .66;
        const eave = floor + (wooden ? 2.95 : 2.65), bodyD = depth - 1.18, bodyZ = -.51, front = bodyZ + bodyD / 2;
        solid(width, .13, depth, stone);
        solid(width - .1, .42, depth * .38, stone, 0, .21, -depth * .3);
        solid(width - .12, .2, depth - .12, boards, 0, floor, 0);
        room(0, bodyZ, width - .24, bodyD, floor + .1, eave, boards);
        frame(0, front + .07, width - .24, .13, eave, 4);
        for (const side of [-1, 1]) {
          const x = side * (width / 2 - .26), z = depth / 2 - .22;
          solid(.32, .22, .34, stone, x, .24, z);
          solid(.2, eave - .95, .2, wood, x, (eave - .95) / 2, z);
          beam([x, .23, z], [x - side * 1.15, floor - .1, z], .09, wood, group);
          solid(.13, .12, depth - .35, wood, x, floor + .92, 0);
          const railW = width / 2 - 1.08;
          solid(railW, .12, .13, wood, side * (1 + railW / 2), floor + .9, z);
          for (let i = 0; i < 6; i++) solid(.075, .7, .075, wood, side * (1.08 + railW * i / 6), floor + .52, z);
          windowBay(side * width * .27, floor + 1.65, front, 1.25, 1.25, true);
        }
        door(0, floor + .1, front, 1.5, 2.15);
        steps(0, front + .23, 1.65, floor + .1, 4, depth / 2 - front - .28);
        pitched(0, bodyZ, width - .24, bodyD, eave, 1.25, .22, .02, boards);
        canopy(0, width - .06, front - .22, depth / 2 + .14, eave - .48, eave - 1.05);
      } else if (chapter === 1) {
        const warehouse = seed === 3, publicHall = seed === 2, archive = seed === 5;
        const base = .38 + (seed % 2) * .06, front = depth / 2 - (warehouse || publicHall || wooden ? 1 : .64), back = -depth / 2 + .08;
        const bodyD = front - back, bodyZ = (front + back) / 2;
        const eave = warehouse ? 3.65 : publicHall ? 3.4 : archive ? 3.25 : 2.78 + (seed % 3) * .18;
        solid(width, base, depth, earth);
        const annexW = warehouse || publicHall || archive || wooden ? 0 : width * .25, side = seed % 2 ? 1 : -1;
        const mainW = width - annexW - .14, mainX = -side * annexW / 2;
        room(mainX, bodyZ, mainW, bodyD, base, eave, wooden ? boards : wall);
        pitched(mainX, bodyZ, mainW, bodyD, eave, warehouse ? 1.5 : 1.18 + (seed % 2) * .18, .22, .055, wooden ? boards : wall);
        if (annexW) {
          const x = side * (width - annexW) / 2, d = bodyD * .83, z = back + d / 2;
          room(x, z, annexW - .14, d, base, eave - .52);
          pitched(x, z, annexW - .14, d, eave - .52, .72, .16, .04);
          windowBay(x, base + 1.3, z + d / 2, .72, .82);
        }
        door(mainX, base, front, warehouse ? 2.45 : publicHall ? 1.8 : 1.35, warehouse ? 2.6 : 2.08);
        for (const s of [-1, 1]) windowBay(mainX + s * mainW * .31, warehouse ? 2.94 : base + 1.5, front, warehouse ? 1.15 : .95, warehouse ? .52 : 1.05, archive || publicHall || wooden);
        steps(mainX, front + .23, warehouse ? 2.7 : 1.75, base, 2, depth / 2 - front - .3);
        if (warehouse || publicHall || wooden) {
          const z = depth / 2 - .18;
          canopy(0, width - .1, front - .14, depth / 2 + .13, eave - .26, eave - .67);
          for (const s of [-1, 1]) solid(.18, eave - .61 - base, .18, wood, s * width * .36, (eave - .61 + base) / 2, z);
          if (wooden) frame(0, front + .08, width - .2, base, eave, 4);
        }
      } else if (chapter === 6) {
        const base = .4, eave = 2.96 + ((prop.h || 7) - 6.6) * .2, front = depth / 2 - 1.02;
        const bodyD = depth - 1.14, bodyZ = -.45, postZ = depth / 2 - .18;
        solid(width, base, depth, stone);
        room(0, bodyZ, width - .24, bodyD, base, eave, boards);
        frame(0, front + .07, width - .24, base, eave, 4);
        for (const s of [-1, 1]) {
          const x = s * (width / 2 - .24);
          solid(.19, eave - base, .19, wood, x, (eave + base) / 2, postZ);
          solid(.14, .16, depth - .3, wood, x, 1.12, -.03);
          beam([x, eave - .62, postZ], [x - s * .6, eave - .14, postZ], .07, wood, group);
          windowBay(s * width * .27, 1.9, front, 1.3, 1.18);
        }
        solid(width - .3, .19, .18, wood, 0, eave - .14, postZ);
        door(0, base, front, 1.6, 2.08);
        steps(0, front + .23, 1.9, base, 2, .65);
        pitched(0, 0, width - .16, depth - .16, eave, 1.38 + (seed % 2) * .16, .2, 0, boards);
      } else if (barracks) {
        const base = .28, eave = 2.46 + (seed % 2) * .12, front = depth / 2 - .52;
        solid(width, base, depth, stone);
        room(0, -.22, width - .16, depth - .6, base, eave);
        pitched(0, 0, width - .16, depth - .14, eave, .78, .14, 0, boards);
        for (const s of [-1, 1]) {
          door(s * width * .22, base, front, 1.08, 1.98);
          windowBay(s * width * .39, 1.92, front, .55, .48);
          steps(s * width * .22, front + .22, 1.3, base, 1, .25);
        }
        solid(width - .2, .17, .15, wood, 0, eave - .12, front + .07);
      } else if (chapter === 7 && wooden) {
        const base = .35, floor = 2.86, eave = 5.12, front = depth / 2 - .6;
        solid(width, base, depth, stone);
        room(0, -.34, width - .54, depth - .94, base, floor, boards);
        room(0, -.2, width - .2, depth - .6, floor, eave);
        solid(width - .16, .2, depth - .42, wood, 0, floor, -.16);
        frame(0, front - .14, width - .6, base, floor, 3);
        door(0, base, front - .21, 1.7, 2.18);
        for (const s of [-1, 1]) {
          windowBay(s * width * .29, 1.7, front - .21, 1.65, 1.45);
          windowBay(s * width * .3, 4.05, depth / 2 - .5, 1.35, 1.35, true);
        }
        windowBay(0, 4.05, depth / 2 - .5, 1.35, 1.35, true);
        frame(0, depth / 2 - .43, width - .22, floor, eave, 3);
        canopy(0, width - .14, front - .26, depth / 2 + .13, floor - .04, floor - .43);
        pitched(0, -.14, width - .16, depth - .32, eave, 1.18, .18, 0, boards);
        steps(0, front + .02, 1.95, base, 2, .48);
      } else {
        const shop = chapter === 3 && wooden;
        const base = .32, eave = shop ? 3.2 + (seed % 2) * .18 : 2.84 + Math.max(0, (prop.h || 7) - 6.6) * .23;
        const recess = shop ? .88 : .52, front = depth / 2 - recess;
        const bodyD = depth - recess - .08, bodyZ = (.08 - recess) / 2;
        solid(width, base, depth, stone);
        room(0, bodyZ, width - .16, bodyD, base, eave, shop || wooden ? boards : wall);
        pitched(0, 0, width - .16, depth - .16, eave, shop ? 1.38 : 1.05, .18, 0, shop || wooden ? boards : wall);
        door(shop ? -width * .26 : 0, base, front, shop ? 1.55 : 1.3, 2.08);
        if (shop) {
          frame(0, front + .08, width - .2, base, eave, 3);
          for (const x of [0, width * .28]) windowBay(x, base + 1.14, front, width * .22, 1.95);
          for (const s of [-1, 1]) solid(.17, eave - base, .17, wood, s * (width / 2 - .2), (eave + base) / 2, depth / 2 - .16);
        } else {
          for (const s of [-1, 1]) windowBay(s * width * .29, base + 1.45, front, 1.05, 1.04, chapter === 3 || chapter === 7);
        }
        steps(shop ? -width * .26 : 0, front + .23, 1.7, base, 2, recess - .29);
      }
      cube.dispose();
      for (const [mat, positions] of parts) {
        const geometry = new T.BufferGeometry();
        geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        mesh(geometry, mat, 0, 0, 0, group);
      }
    }

    function scannedProp(key, prop, height) {
      const model = assets.models[key].clone(true);
      const bounds = new T.Box3().setFromObject(model);
      const size = bounds.getSize(new T.Vector3()), center = bounds.getCenter(new T.Vector3());
      const scale = height / size.y;
      model.scale.setScalar(scale);
      model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
      const group = groupAt(prop);
      model.name = 'march-scan-' + key;
      group.add(model);
      group.rotation.y = (prop.seed || 1) * 2.39996;
      model.traverse(object => {
        if (!object.isMesh) return;
        object.castShadow = true; object.receiveShadow = true;
      });
      if (key === 'rock' && snowy) {
        const cap = mesh(new T.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), snowSurface(), 0, height * .7, 0, group);
        cap.scale.set(size.x * scale * .37, height * .31, size.z * scale * .37);
      }
      return group;
    }

    function tree(prop, pine = false) {
      if (!pine) return snowy ? deadTree(prop, true) : scannedProp('tree', prop, (prop.h || 9) * .85);
      const group = groupAt(prop), height = prop.h || 9, width = prop.w || 7;
      const wood = surface('wood', '#7b6b58', 1.2);
      mesh(new T.CylinderGeometry(.045, width * .047, height, 12), wood, 0, height / 2, 0, group);
      const branches = new T.InstancedMesh(new T.CylinderGeometry(.018, .07, 1, 6), wood, 48);
      const needles = new T.BufferGeometry(), vertices = [];
      for (let i = 0; i < 12; i++) {
        const angle = i * 2.39996, x = Math.cos(angle), z = Math.sin(angle), y = i * .055;
        vertices.push(0, y, 0, x * .7, y + .13, z * .7, x * .24 - z * .075, y + .055, z * .24 + x * .075);
      }
      needles.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); needles.computeVertexNormals();
      const leaf = material(logicalScene.palette.pine); leaf.side = T.DoubleSide;
      const tufts = new T.InstancedMesh(needles, leaf, 48 * 9);
      const caps = snowy ? new T.InstancedMesh(new T.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), snowSurface(), 48) : null;
      const dummy = new T.Object3D(), up = new T.Vector3(0, 1, 0);
      for (let i = 0; i < 48; i++) {
        const level = Math.floor(i / 6), angle = i * 2.39996 + (prop.seed || 1);
        const reach = width * .45 * (1 - level / 9);
        const start = new T.Vector3(0, height * (.25 + level * .09), 0);
        const end = new T.Vector3(Math.cos(angle) * reach, start.y + .2, Math.sin(angle) * reach);
        const direction = end.clone().sub(start);
        dummy.position.copy(start).addScaledVector(direction, .5);
        dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize()); dummy.scale.set(1, direction.length(), 1); dummy.updateMatrix(); branches.setMatrixAt(i, dummy.matrix);
        for (let j = 0; j < 9; j++) {
          dummy.position.copy(start).addScaledVector(direction, (j + 1) / 10);
          dummy.rotation.set(0, angle + j * 1.7, .15); dummy.scale.setScalar(.55 + (1 - j / 9) * .55); dummy.updateMatrix(); tufts.setMatrixAt(i * 9 + j, dummy.matrix);
        }
        if (caps) {
          dummy.position.copy(start).addScaledVector(direction, .62); dummy.position.y += .11;
          dummy.rotation.set(0, -angle, 0); dummy.scale.set(reach * .42, .13, .28); dummy.updateMatrix(); caps.setMatrixAt(i, dummy.matrix);
        }
      }
      for (const object of [branches, tufts, caps].filter(Boolean)) { object.castShadow = true; object.receiveShadow = true; group.add(object); }
    }

    function gate(prop) {
      const group = groupAt(prop);
      const width = prop.w || 7;
      const height = Math.max(3.6, (prop.h || 7) * .65);
      const wood = assets ? surface('wood', '#847468', 1.4) : material('#5c402a');
      for (const side of [-1, 1]) mesh(new T.CylinderGeometry(0.18, 0.24, height, 8), wood, side * width / 2, height / 2, 0, group);
      mesh(new T.BoxGeometry(width + 1, 0.35, 0.4), wood, 0, height - 0.3, 0, group);
      const flag = mesh(new T.PlaneGeometry(width * 0.55, height * 0.25, 8, 2), new T.MeshStandardMaterial({ color: logicalScene.palette.flag, roughness: 0.82, side: T.DoubleSide }), 0, height * 0.73, 0.06, group);
      flags.push(flag);
    }

    function boat(prop) {
      const group = groupAt(prop);
      group.position.y = terrain.waterLevel + .12;
      const width = prop.w || 6;
      const hull = mesh(new T.SphereGeometry(1, 16, 8), material('#4d3625'), 0, 0, 0, group);
      hull.scale.set(width * 0.48, 0.42, 1.15);
      mesh(new T.BoxGeometry(width * 0.78, 0.14, 1.55), material('#806142'), 0, 0.26, 0, group);
    }

    function bridgeDepth(prop) {
      const gaps = props.filter(other => other.type === 'bridge' && other.x === prop.x && other.y !== prop.y).map(other => Math.abs(other.y - prop.y));
      const gap = Math.min(...gaps);
      return Number.isFinite(gap) && gap <= (prop.h || 4) * 2 ? gap + .02 : prop.h || 4;
    }

    function bridge(prop) {
      const group = groupAt(prop), width = prop.w || 12, depth = bridgeDepth(prop);
      group.position.y = .145;
      const count = Math.ceil(depth / .55), wood = surface('wood', '#a29780', 2);
      const deck = new T.InstancedMesh(new T.BoxGeometry(width, .16, depth / count), wood, count);
      deck.name = 'march-wood-bridge-deck';
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) { dummy.position.set(0, 0, -depth / 2 + (i + .5) * depth / count); dummy.updateMatrix(); deck.setMatrixAt(i, dummy.matrix); }
      deck.castShadow = true; deck.receiveShadow = true; group.add(deck); pickSurfaces.push(deck);
      for (const side of [-1, 1]) {
        beam([side * width / 2, .8, -depth / 2], [side * width / 2, .8, depth / 2], .045, wood, group);
        for (const end of [-1, 1]) beam([side * width / 2, 0, end * depth / 2], [side * width / 2, 1, end * depth / 2], .065, wood, group);
      }
    }

    function beam(a, b, radius, mat, parent) {
      const start = new T.Vector3(...a), end = new T.Vector3(...b), direction = end.sub(start);
      const object = mesh(new T.CylinderGeometry(radius * .8, radius, direction.length(), 8), mat, 0, 0, 0, parent);
      object.position.copy(start).addScaledVector(direction, .5);
      object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
      return object;
    }

    function cable(parent, width, height, z, sag) {
      const count = Math.ceil(width / .3), iron = material('#55564f', .48, .75);
      const links = new T.InstancedMesh(new T.TorusGeometry(.12, .025, 5, 12), iron, count);
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        dummy.position.set((t - .5) * width, height - sag * 4 * t * (1 - t), z);
        dummy.rotation.set(i % 2 ? Math.PI / 2 : 0, 0, Math.atan2(-sag * 4 * (1 - 2 * t), width));
        dummy.scale.set(1.7, 1, 1); dummy.updateMatrix(); links.setMatrixAt(i, dummy.matrix);
      }
      links.castShadow = true; links.receiveShadow = true; parent.add(links);
    }

    function chainBridge(prop) {
      const group = groupAt(prop), width = prop.w || 12;
      if (logicalScene.ironBridge) { group.position.y = 0; group.position.z = logicalScene.ironBridge.y + (prop.seed % 2 ? -3 : 3) - world.h / 2; }
      for (const level of [.65, 1.45]) cable(group, width, level, 0, .22);
      for (const side of [-1, 1]) beam([side * width / 2, 0, 0], [side * width / 2, 1.65, 0], .1, surface('wood', '#837264'), group);
    }

    if (logicalScene.ironBridge) {
      const bridge = logicalScene.ironBridge, width = bridge.x1 - bridge.x0;
      const group = groupAt({ type: 'ironBridge', x: (bridge.x0 + bridge.x1) / 2, y: bridge.y });
      group.position.y = 0;
      const count = Math.ceil(width / .65), plankWidth = width / count;
      const deck = new T.InstancedMesh(new T.BoxGeometry(plankWidth, .16, 6), surface('wood', '#a29780', 2), count);
      deck.name = 'march-iron-bridge-deck';
      const dummy = new T.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.set(-width / 2 + (i + .5) * plankWidth, -.055, 0); dummy.updateMatrix(); deck.setMatrixAt(i, dummy.matrix);
      }
      deck.castShadow = true; deck.receiveShadow = true; group.add(deck); pickSurfaces.push(deck);
      for (let i = 0; i < bridge.deckChains; i++) cable(group, width, -.15, (i / (bridge.deckChains - 1) - .5) * bridge.width, .08);
    }

    function archedWall(group, width, height, depth, opening, mat) {
      const spring = height * .4, radius = opening / 2;
      const shape = new T.Shape();
      shape.moveTo(-width / 2, 0); shape.lineTo(-width / 2, height); shape.lineTo(width / 2, height); shape.lineTo(width / 2, 0);
      shape.lineTo(radius, 0); shape.lineTo(radius, spring); shape.absarc(0, spring, radius, 0, Math.PI, false); shape.lineTo(-radius, 0); shape.closePath();
      return mesh(new T.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: .035, bevelThickness: .035, bevelSegments: 2, curveSegments: 24, steps: 1 }), mat, 0, 0, -depth / 2, group);
    }

    function archGate(prop) {
      const group = groupAt(prop), width = prop.w || 12, height = (prop.h || 9) * .7, depth = prop.depth || 4;
      const stone = surface('rock', environment.rockTint, 2.3);
      const opening = Math.min(width * .4, 8);
      archedWall(group, width, height, depth, opening, stone);
      const door = mesh(new T.BoxGeometry(opening, height * .4 + opening / 2, .25), surface('wood', '#75654f', 2), 0, (height * .4 + opening / 2) / 2, depth / 2 - .18, group);
      door.name = 'march-arch-closed-door';
      for (const y of [height * .18, height * .42]) mesh(new T.BoxGeometry(opening, .16, .08), material('#4e4c42', .65, .65), 0, y, depth / 2, group);
      mesh(new T.BoxGeometry(width + .45, .4, depth + .5), stone, 0, height, 0, group);
      for (let i = 0; i < Math.ceil(width / 1.5); i++) {
        const x = -width / 2 + (i + .5) * width / Math.ceil(width / 1.5);
        for (const side of [-1, 1]) mesh(new T.BoxGeometry(.75, .75, .55), stone, x, height + .53, side * depth * .46, group);
      }
      const roof = mesh(new T.ConeGeometry(width * .32, 1.8, 4), surface('roof', '#8a8b80'), 0, height + 1.65, 0, group);
      roof.rotation.y = Math.PI / 4; roof.scale.z = .6;
      mesh(new T.BoxGeometry(width * .38, 1.25, depth * .68), surface('wood', '#ad9780'), 0, height + .68, 0, group);
    }

    function yaodong(prop) {
      const group = groupAt(prop), width = prop.w || 9, depth = prop.depth || 6, height = (prop.h || 7) * .62;
      const loess = surface('rock', logicalScene.palette.loess || '#b99a67', 3, .45);
      const mound = mesh(new T.SphereGeometry(1, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2), loess, 0, height * .73, -depth * .06, group);
      mound.scale.set(width * .5, height * .65, depth * .44);
      const mass = mesh(new T.BoxGeometry(width, height * .8, depth * .82), loess, 0, height * .4, -depth * .09, group);
      mass.name = 'march-yaodong-earth-mass';
      const front = depth / 2 - .325;
      const facade = new T.Group(); facade.position.z = front; group.add(facade);
      archedWall(facade, width, height, .65, Math.min(2.3, width * .32), loess);
      mesh(new T.BoxGeometry(width, height * .9, .4), material('#302a20'), 0, height * .4, depth * .3, group);
      const wood = surface('wood', '#93836a');
      for (const side of [-1, 1]) {
        const x = side * width * .32;
        mesh(new T.BoxGeometry(width * .18, 1.3, .2), material('#27291e'), x, height * .5, front + .37, group);
        for (let i = -2; i <= 2; i++) beam([x + i * width * .033, height * .5 - .65, front + .5], [x + i * width * .033, height * .5 + .65, front + .5], .025, wood, group);
        for (const y of [-.35, .35]) beam([x - width * .09, height * .5 + y, front + .5], [x + width * .09, height * .5 + y, front + .5], .025, wood, group);
      }
    }

    function tent(prop) {
      const group = groupAt(prop), width = prop.w || 7, depth = prop.depth || width * .7, height = Math.min(3.4, (prop.h || 5) * .62);
      const cloth = material(logicalScene.palette.tent || '#91836b', .98); cloth.side = T.DoubleSide;
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute([-width / 2, 0, -depth / 2, -width / 2, 0, depth / 2, 0, height, -depth / 2, 0, height, depth / 2, width / 2, 0, -depth / 2, width / 2, 0, depth / 2], 3));
      geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 0, 2, 4]); geometry.computeVertexNormals(); mesh(geometry, cloth, 0, 0, 0, group);
      const wood = surface('wood', '#8d7a62');
      for (const side of [-1, 1]) beam([0, 0, side * depth / 2], [0, height + .12, side * depth / 2], .06, wood, group);
      for (const side of [-1, 1]) {
        const flap = new T.BufferGeometry(); flap.setAttribute('position', new T.Float32BufferAttribute([side * width / 2, 0, depth / 2, 0, height, depth / 2, side * width * .1, 0, depth / 2 + .3], 3)); flap.computeVertexNormals(); mesh(flap, cloth, 0, 0, 0, group);
        for (const z of [-1, 1]) beam([side * width / 2, .3, z * depth * .35], [side * (width / 2 + .8), .02, z * depth * .55], .017, material('#bca880'), group);
      }
    }

    function stoneWall(prop) {
      const group = groupAt(prop), width = prop.w || 8, height = Math.min(3.2, prop.h || 3), depth = prop.depth || 1.1;
      const stone = surface('rock', environment.rockTint, 1.6), cols = Math.ceil(width / 1.4), rows = Math.ceil(height / .55);
      const blocks = new T.InstancedMesh(new T.BoxGeometry(width / cols - .035, height / rows - .035, depth), stone, cols * rows);
      const dummy = new T.Object3D();
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        dummy.position.set(-width / 2 + (col + .5) * width / cols, (row + .5) * height / rows, Math.sin(row * 8 + col) * .025); dummy.updateMatrix(); blocks.setMatrixAt(row * cols + col, dummy.matrix);
      }
      blocks.castShadow = true; blocks.receiveShadow = true; group.add(blocks);
      if (snowy) mesh(new T.BoxGeometry(width + .08, .14, depth + .1), snowSurface(), 0, height + .05, 0, group);
    }

    function flagPole(prop, prayer = false) {
      const group = groupAt(prop), height = (prop.h || 6) * .85, width = prop.w || 3;
      const wood = surface('wood', '#776c5a'), colors = ['#c8a13a', '#b4503a', '#3f6d8e', '#dad3c0', '#4a7a52'];
      if (prayer) {
        for (const side of [-1, 1]) beam([side * width / 2, 0, 0], [side * width / 2, height, 0], .06, wood, group);
        const points = Array.from({ length: 25 }, (_, i) => new T.Vector3((i / 24 - .5) * width, height - .7 * Math.sin(i / 24 * Math.PI), 0));
        mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points), 48, .02, 5, false), wood, 0, 0, 0, group);
        for (let i = 0; i < 10; i++) {
          const t = (i + .5) / 10, mat = material(colors[i % colors.length]); mat.side = T.DoubleSide;
          const flag = mesh(new T.PlaneGeometry(width * .055, .65, 6, 4), mat, (t - .5) * width, height - .7 * Math.sin(t * Math.PI) - .32, 0, group); flags.push(flag);
        }
      } else {
        beam([0, 0, 0], [0, height, 0], .065, wood, group);
        mesh(new T.CylinderGeometry(.35, .5, .3, 12), surface('rock', environment.rockTint), 0, .15, 0, group);
        const mat = material(logicalScene.palette.flag, .9); mat.side = T.DoubleSide;
        const flag = mesh(new T.PlaneGeometry(width * .85, height * .23, 12, 4), mat, width * .425, height * .82, 0, group); flags.push(flag);
      }
    }

    function deadTree(prop, snow = false) {
      const group = groupAt(prop), height = prop.h || 6, width = prop.w || 4, wood = surface('wood', '#7b7364');
      beam([0, 0, 0], [.15, height, 0], width * .045, wood, group);
      for (let i = 0; i < 7; i++) {
        const angle = i * 2.4, y = height * (.32 + i * .07), reach = width * (.5 - i * .035);
        const end = [Math.cos(angle) * reach, y + height * .13, Math.sin(angle) * reach];
        beam([.05, y, 0], end, width * .023, wood, group);
        beam(end, [end[0] * 1.15, end[1] + height * .13, end[2] * 1.15], width * .012, wood, group);
        if (snow) beam([.05, y + .06, 0], [end[0], end[1] + .06, end[2]], width * .018, snowSurface(), group);
      }
    }

    function tower(prop) {
      const group = groupAt(prop), width = prop.w || 5, height = (prop.h || 9) * .8, wood = surface('wood', '#9b8770');
      for (const x of [-1, 1]) for (const z of [-1, 1]) beam([x * width * .45, 0, z * width * .35], [x * width * .36, height, z * width * .28], .13, wood, group);
      for (const z of [-1, 1]) {
        beam([-width * .43, .3, z * width * .32], [width * .36, height * .7, z * width * .28], .08, wood, group);
        beam([width * .43, .3, z * width * .32], [-width * .36, height * .7, z * width * .28], .08, wood, group);
      }
      mesh(new T.BoxGeometry(width, .25, width * .8), wood, 0, height * .72, 0, group);
      const roof = mesh(new T.ConeGeometry(width * .8, height * .24, 4), surface('roof', '#92918a'), 0, height, 0, group); roof.rotation.y = Math.PI / 4;
      for (let i = 0; i < 12; i++) beam([-.4, i * height * .06, width * .38], [.4, i * height * .06, width * .38], .05, wood, group);
    }

    function simpleProp(prop) {
      if (assets && prop.type === 'crate') return scannedProp('crate', prop, 1.15);
      if (assets && ['cliff', 'rock'].includes(prop.type)) return scannedProp('rock', prop, prop.h || 4);
      const group = groupAt(prop);
      const width = prop.w || 3;
      const height = prop.h || 3;
      if (prop.type === 'cliff') {
        const rock = mesh(new T.DodecahedronGeometry(1, 1), material(logicalScene.palette.rock), 0, height * 0.35, 0, group);
        rock.scale.set(width * 0.55, height * 0.55, width * 0.3);
      } else if (prop.type === 'crate') {
        mesh(new T.BoxGeometry(width, height * 0.65, width * 0.75), material('#765638'), 0, height * 0.32, 0, group);
      } else if (prop.type === 'grain') {
        for (let i = 0; i < 4; i++) {
          const sack = mesh(new T.SphereGeometry(0.65, 10, 7), material('#a28a5d'), (i % 2 - .5) * width * .38, 0.65 + Math.floor(i / 2) * 0.75, 0, group);
          sack.scale.set(1, 1.2, .8);
        }
      } else if (prop.type === 'campfire') {
        const radius = width * .23, flameHeight = height * .55;
        const stone = surface('rock', '#aaa395', .6), charred = surface('wood', '#403128', .7);
        for (let i = 0; i < 11; i++) {
          const angle = i * Math.PI * 2 / 11;
          const rock = mesh(new T.DodecahedronGeometry(.22, 1), stone, Math.cos(angle) * radius, .13, Math.sin(angle) * radius, group);
          rock.scale.set(1.3, .7, 1); rock.rotation.set(i * .31, angle, i * .17);
        }
        for (let i = 0; i < 5; i++) {
          const angle = i * Math.PI / 5, x = Math.cos(angle) * radius * .85, z = Math.sin(angle) * radius * .85;
          beam([-x, .14, -z], [x, .24, z], .11, charred, group);
        }
        const flameMaterial = new T.ShaderMaterial({
          uniforms: { time: { value: 0 }, phase: { value: prop.seed || 1 } },
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
          fragmentShader: `
            uniform float time;
            uniform float phase;
            varying vec2 vUv;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p) {
              vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
              return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
            }
            void main() {
              float y = vUv.y, t = time * 1.8 + phase;
              vec2 p = vec2(vUv.x * 5.0, y * 5.0 - t);
              float n = noise(p) * .6 + noise(p * 2.1) * .28 + noise(p * 4.2) * .12;
              float bend = (noise(vec2(y * 4.0, t * .6)) - .5) * y * .32;
              float x = abs(vUv.x - .5 + bend);
              float edge = (1.0 - y) * .38 + (n - .5) * .22;
              float alpha = (1.0 - smoothstep(edge - .09, edge + .025, x)) * smoothstep(0.0, .1, y) * (1.0 - smoothstep(.65, 1.0, y)) * .48;
              if (alpha < .008) discard;
              vec3 color = mix(vec3(1.0, .12, .012), vec3(1.0, .68, .16), clamp((1.0 - y) * .7 + n * .45 - x, 0.0, 1.0));
              gl_FragColor = vec4(color, alpha);
              #include <colorspace_fragment>
            }`,
          transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending, toneMapped: false
        });
        for (let i = 0; i < 3; i++) {
          const flame = mesh(new T.PlaneGeometry(radius * 2, flameHeight), flameMaterial, 0, .14 + flameHeight / 2, 0, group);
          flame.rotation.y = i * Math.PI / 3; flame.castShadow = false; flame.receiveShadow = false; flame.name = 'march-fire-flame';
        }
        const light = new T.PointLight('#ff993f', 5, 5, 2); light.position.y = .7; group.add(light);
        fires.push({ material: flameMaterial, light });
      } else if (prop.type === 'lantern') {
        const poleHeight = assets ? 2.7 : height;
        const wood = assets ? surface('wood', '#817265', 1) : material('#4b3928');
        mesh(new T.CylinderGeometry(.06, .085, poleHeight, 12), wood, 0, poleHeight / 2, 0, group);
        mesh(new T.BoxGeometry(.65, .07, .08), wood, .23, poleHeight - .1, 0, group);
        mesh(new T.BoxGeometry(.34, .5, .34), new T.MeshStandardMaterial({ color: '#c7ad7d', roughness: .95, emissive: '#cf812e', emissiveIntensity: .35 }), .47, poleHeight - .53, 0, group);
        for (const x of [-1, 1]) for (const z of [-1, 1]) mesh(new T.BoxGeometry(.028, .54, .028), wood, .47 + x * .18, poleHeight - .53, z * .18, group);
        for (const offset of [-.27, .27]) mesh(new T.BoxGeometry(.39, .035, .39), wood, .47, poleHeight - .53 + offset, 0, group);
        if ([1, 9].includes(logicalScene.chapterId)) {
          const light = new T.PointLight('#ffb36b', 18, 12, 2);
          light.position.set(.47, poleHeight - .53, .25); group.add(light);
        }
      } else if (prop.type === 'well') {
        const radius = assets ? 1.1 : width * .42;
        const stone = assets ? surface('rock', '#929080', 1.5) : material('#777264');
        const ring = mesh(new T.TorusGeometry(radius, .22, 10, 32), stone, 0, .85, 0, group);
        ring.rotation.x = Math.PI / 2;
        mesh(new T.CylinderGeometry(radius + .08, radius + .12, .75, 32, 1, true), stone, 0, .42, 0, group);
        const interior = mesh(new T.CircleGeometry(radius, 32), material('#182623'), 0, .12, 0, group);
        interior.rotation.x = -Math.PI / 2;
      } else if (prop.type === 'cart') {
        mesh(new T.BoxGeometry(width * .7, .35, width * .45), material('#6e4f33'), 0, .85, 0, group);
        for (const side of [-1, 1]) {
          const wheel = mesh(new T.TorusGeometry(width * .22, .1, 7, 16), material('#443225'), side * width * .37, .65, 0, group);
          wheel.rotation.y = Math.PI / 2;
        }
      } else if (prop.type === 'table') {
        mesh(new T.BoxGeometry(width, .18, width * .55), material('#62472f'), 0, height * .55, 0, group);
        for (const x of [-1, 1]) for (const z of [-1, 1]) mesh(new T.BoxGeometry(.16, height * .55, .16), material('#4c3828'), x * width * .38, height * .27, z * width * .2, group);
      } else if (prop.type === 'stele') {
        mesh(new T.BoxGeometry(width * .55, height, .45), material('#79766b'), 0, height / 2, 0, group);
      } else if (prop.type === 'sandbag') {
        const sack = material('#a39572', .98);
        for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
          const bag = mesh(new T.SphereGeometry(1, 16, 10), sack, (col - 1.5) * width / 4 + (row % 2) * .12, .2 + row * .35, 0, group);
          bag.scale.set(width / 8 + .04, .21, .45); bag.rotation.y = Math.sin(row * 8 + col) * .08;
        }
      } else if (prop.type === 'stairs') {
        for (let i = 0; i < 8; i++) pickSurfaces.push(mesh(new T.BoxGeometry(width, .08 * (i + 1), height / 8), surface('rock', environment.rockTint, 1.5), 0, .04 * (i + 1), height * (.5 - (i + .5) / 8), group));
      } else {
        stats.unsupportedProps.push(prop.type);
      }
    }

    function alignedProp(original) {
      const prop = { ...original };
      if (['house', 'houseWood', 'tent', 'stoneWall', 'archGate', 'yaodong'].includes(prop.type)) {
        const rectangles = (logicalScene.blocked || []).map(b => b.rect).filter(Boolean);
        const rect = rectangles.find(r => prop.x >= r[0] && prop.x <= r[0] + r[2] && prop.y >= r[1] && prop.y <= r[1] + r[3]);
        if (rect) { prop.x = rect[0] + rect[2] / 2; prop.y = rect[1] + rect[3] / 2; prop.w = rect[2]; prop.depth = rect[3]; }
        else if (prop.type === 'stoneWall') {
          const distance = r => Math.hypot(prop.x - Math.max(r[0], Math.min(r[0] + r[2], prop.x)), prop.y - Math.max(r[1], Math.min(r[1] + r[3], prop.y)));
          const boundary = rectangles.reduce((best, r) => !best || distance(r) < distance(best) ? r : best, null);
          if (boundary) {
            prop.w = Math.min(prop.w, boundary[2]); prop.depth = Math.min(1.1, boundary[3]);
            prop.x = Math.max(boundary[0] + prop.w / 2, Math.min(boundary[0] + boundary[2] - prop.w / 2, prop.x));
            prop.y = Math.max(boundary[1] + prop.depth / 2, Math.min(boundary[1] + boundary[3] - prop.depth / 2, prop.y));
          }
        }
      }
      if (prop.type === 'gate') {
        const walls = (logicalScene.blocked || []).filter(b => b.rect && Math.abs(prop.y - b.rect[1]) < 5).map(b => b.rect);
        for (const left of walls) for (const right of walls) {
          const gap = right[0] - left[0] - left[2], center = right[0] - gap / 2;
          if (Math.abs(left[1] - right[1]) < 1 && gap >= prop.w * .7 && gap <= prop.w * 1.5 && Math.abs(center - prop.x) < prop.w * .6) { prop.x = center; prop.y = (left[1] + right[1]) / 2; prop.w = gap; }
        }
      }
      if (prop.type === 'bridge') prop.x += prop.w / 2;
      return prop;
    }

    for (const prop of props) {
      if (prop.type === 'house') house(prop);
      else if (prop.type === 'houseWood') house(prop, true);
      else if (prop.type === 'tree') tree(prop);
      else if (prop.type === 'pine') tree(prop, true);
      else if (prop.type === 'gate') gate(prop);
      else if (prop.type === 'archGate') archGate(prop);
      else if (prop.type === 'yaodong') yaodong(prop);
      else if (prop.type === 'tent') tent(prop);
      else if (prop.type === 'stoneWall') stoneWall(prop);
      else if (prop.type === 'tower') tower(prop);
      else if (prop.type === 'flagPole') flagPole(prop);
      else if (prop.type === 'prayerFlags') flagPole(prop, true);
      else if (prop.type === 'deadTree') deadTree(prop);
      else if (prop.type === 'boat') boat(prop);
      else if (prop.type === 'bridge') bridge(prop);
      else if (prop.type === 'chainBridge') chainBridge(prop);
      else simpleProp(prop);
    }
    stats.propsReady = stats.unsupportedProps.length === 0;

    if (environment.vegetation) {
      for (const prop of logicalScene.props.filter(p => p.type === 'tree')) {
        for (let i = 0; i < 3; i++) {
          const angle = i * 2.1 + prop.seed;
          scannedProp('fern', { x: prop.x + Math.cos(angle) * 1.8, y: prop.y + Math.sin(angle) * 1.8, seed: prop.seed + i }, .5 + i * .13);
        }
      }
    }

    for (let side = 0; side < 3; side++) {
      const span = (side ? world.h : world.w) * 2.5;
      const hills = new T.PlaneGeometry(span, 150, 160, 64);
      hills.rotateX(-Math.PI / 2);
      const positions = hills.attributes.position;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), depth = (75 - positions.getZ(i)) / 150, phase = logicalScene.seed * .01 + side * 2;
        const ridge = .7 + .23 * Math.sin(x * .033 + phase) + .18 * Math.cos(x * .077 + depth * 5) + .065 * Math.sin(x * .29 + depth * 17);
        const gullies = Math.abs(Math.sin(x * .1 + depth * 6)) * .12;
        const edge = !side ? terrain.height(x + world.w / 2, 0) : terrain.height(side === 1 ? 0 : world.w, (side === 1 ? -x : x) + world.h / 2);
        positions.setY(i, edge + Math.pow(depth, .8) * environment.relief * (ridge - gullies) + Math.sin(depth * Math.PI) * environment.relief * .18);
      }
      hills.computeVertexNormals();
      const group = new T.Group(); group.name = 'march-mountains-' + side;
      if (!side) group.position.set(0, -1, -world.h / 2 - 75);
      else { group.rotation.y = side === 1 ? Math.PI / 2 : -Math.PI / 2; group.position.set((side === 1 ? -1 : 1) * (world.w / 2 + 75), -1, 0); }
      worldRoot.add(group);
      const mountain = mesh(hills, surface(environment.vegetation ? 'earth' : 'rock', environment.mountainTint, 6, .55), 0, 0, 0, group); mountain.castShadow = false;
      if (snowy) {
        const snowVertices = [], normals = hills.attributes.normal;
        for (let i = 0; i < hills.index.count; i += 3) {
          const indices = [hills.index.getX(i), hills.index.getX(i + 1), hills.index.getX(i + 2)];
          if (indices.every(j => normals.getY(j) > .55 && positions.getY(j) > 12 + 4 * Math.sin(positions.getX(j) * .09))) {
            for (const j of indices) snowVertices.push(positions.getX(j), positions.getY(j) + .045, positions.getZ(j));
          }
        }
        const cap = new T.BufferGeometry(); cap.setAttribute('position', new T.Float32BufferAttribute(snowVertices, 3)); cap.computeVertexNormals();
        mesh(cap, snowSurface(), 0, 0, 0, group).castShadow = false;
      }
    }

    for (const [index, cliff] of (logicalScene.terrain?.cliffs || []).entries()) {
      const curve = new T.CatmullRomCurve3(cliff.pts.map(([x, y]) => toWorld(x, y)), false, 'centripetal');
      const length = curve.getLength(), steps = Math.ceil(length / .8), rows = 12;
      const points = curve.getSpacedPoints(steps), vertices = [], indices = [];
      for (let i = 0; i <= steps; i++) {
        const point = points[i], tangent = points[Math.min(steps, i + 1)].clone().sub(points[Math.max(0, i - 1)]).normalize();
        const outward = new T.Vector3(tangent.z, 0, -tangent.x);
        if (outward.dot(point) < 0) outward.negate();
        const endFalloff = Math.min(1, i / 3, (steps - i) / 3);
        const ridge = Math.min(environment.relief * .22, 14) * (.88 + .08 * Math.sin(point.x * .13 + point.z * .09) + .04 * Math.sin(point.x * .43));
        for (let row = 0; row <= rows; row++) {
          const t = row / rows, envelope = Math.pow(Math.sin(t * Math.PI), .65);
          const strata = Math.sin(t * 22 + point.x * .23 + point.z * .19) * .18 * envelope;
          const distance = t * cliff.w * 2.4 + strata;
          const x = point.x + outward.x * distance, z = point.z + outward.z * distance;
          vertices.push(x, terrain.height(x + world.w / 2, z + world.h / 2) - .05 + Math.max(0, envelope * ridge * endFalloff + strata), z);
        }
      }
      for (let i = 0; i < steps; i++) for (let row = 0; row < rows; row++) {
        const a = i * (rows + 1) + row, b = a + rows + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
      const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
      const normals = geometry.attributes.normal;
      if (normals.getY(Math.floor(steps / 2) * (rows + 1) + rows / 2) < 0) {
        for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
        geometry.setIndex(indices); geometry.computeVertexNormals();
      }
      const mat = surface('rock', environment.rockTint, 3, 1); mat.side = T.DoubleSide;
      mesh(geometry, mat).name = 'march-cliff-line-' + index;
      if (snowy) {
        const capVertices = [], positions = geometry.attributes.position;
        for (let i = 0; i < indices.length; i += 3) {
          const triangle = indices.slice(i, i + 3);
          if (triangle.every(j => normals.getY(j) > .42 && positions.getY(j) > 1)) for (const j of triangle) capVertices.push(positions.getX(j), positions.getY(j) + .035, positions.getZ(j));
        }
        const cap = new T.BufferGeometry(); cap.setAttribute('position', new T.Float32BufferAttribute(capVertices, 3)); cap.computeVertexNormals();
        mesh(cap, snowSurface()).name = 'march-cliff-snow-' + index;
      }
    }

    worldRoot.updateMatrixWorld(true);
    const cameraObstacles = worldRoot.children.filter(object => object === ground || /^(march-prop-|march-cliff-line-)/.test(object.name)).map(object => ({ object, bounds: new T.Box3().setFromObject(object) }));
    if (street) {
      for (const { rect, cameraHeight = 7.6 } of logicalScene.streetBlocked || []) {
        if (!rect) continue;
        const [x, y, w, h] = rect;
        const min = onSurface(x, y);
        const max = new T.Vector3(min.x + w, min.y + cameraHeight, min.z + h);
        cameraObstacles.push({ bounds: new T.Box3(min, max) });
      }
    }
    const cameraRay = new T.Raycaster(), cameraDirection = new T.Vector3(), rayOrigin = new T.Vector3(), cameraRight = new T.Vector3();
    let cameraDistance = 0;

    if (environment.terrain === 'wetland') {
      const blade = new T.BufferGeometry();
      blade.setAttribute('position', new T.Float32BufferAttribute([-.04, 0, 0, .04, 0, 0, .16, .8, .12, -.03, 0, -.06, .03, 0, .06, -.12, .64, .08], 3)); blade.computeVertexNormals();
      const grassMaterial = material('#827e4c', .96); grassMaterial.side = T.DoubleSide;
      const grass = new T.InstancedMesh(blade, grassMaterial, 5000), dummy = new T.Object3D();
      const inside = (x, y, points) => {
        let hit = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const a = points[i], b = points[j];
          if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
        }
        return hit;
      };
      let count = 0, seed = logicalScene.seed;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < 10000 && count < 5000; i++) {
        const x = random() * world.w, y = random() * world.h;
        if (logicalScene.terrain.waters.some(water => inside(x, y, water.pts))) continue;
        const nearRoad = logicalScene.terrain.roads.some(road => road.pts.slice(1).some((b, index) => {
          const a = road.pts[index], dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
          const t = length ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length)) : 0;
          return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) < road.w * .75;
        }));
        if (nearRoad) continue;
        dummy.position.copy(onSurface(x, y)); dummy.rotation.y = random() * Math.PI * 2; dummy.scale.setScalar(.6 + random() * .9); dummy.updateMatrix(); grass.setMatrixAt(count++, dummy.matrix);
      }
      grass.count = count; grass.name = 'march-wetland-grass'; grass.castShadow = true; grass.receiveShadow = true; worldRoot.add(grass);
    }

    const hemi = new T.HemisphereLight(staging.fill, '#514b3f', staging.ambient);
    scene.add(hemi);
    const sun = new T.DirectionalLight(staging.key, staging.power);
    sun.position.set(-45, 75, 35);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const extent = assets ? 24 : 85;
    Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent, near: 1, far: 230 });
    sun.shadow.bias = -.00015;
    sun.shadow.normalBias = .025;
    sun.shadow.radius = 2;
    sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun, sun.target);

    const ringGeometry = new T.RingGeometry(0.65, 0.85, 32);
    const ringMaterial = new T.MeshBasicMaterial({ color: '#e8c87a', transparent: true, opacity: 0.72, side: T.DoubleSide, depthWrite: false });
    for (const anchor of logicalScene.anchors) {
      const ring = new T.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(onSurface(anchor.x, anchor.y, 0.07));
      ring.visible = anchor.kind !== 'npc';
      worldRoot.add(ring);
      markers.set(anchor.anchorId, ring);
    }

    let particles = null;
    if (logicalScene.ambient?.kind) {
      const count = 420;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - .5) * world.w;
        positions[i * 3 + 2] = (Math.random() - .5) * world.h;
        positions[i * 3 + 1] = terrain.height(positions[i * 3] + world.w / 2, positions[i * 3 + 2] + world.h / 2) + 2 + Math.random() * 25;
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      const snow = logicalScene.ambient.kind === 'snow';
      const mist = logicalScene.ambient.kind === 'mist';
      const particleMap = feather.clone(); particleMap.channel = 0;
      particles = new T.Points(geometry, new T.PointsMaterial({ color: snow ? '#f4f8ff' : mist ? '#d4dede' : '#d9c59b', size: snow ? .22 : mist ? 3 : .1, alphaMap: particleMap, transparent: true, opacity: snow ? .82 : mist ? .035 : .35, depthWrite: false }));
      worldRoot.add(particles);
    }

    // 街景：原有炊烟点与新模型对不上所以关掉；改为在茶摊炉子、小吃摊锅上冒热气
    const steamSources = (logicalScene.streetLife?.stalls || []).filter(stall => STEAM_AT[stall.kind]).map(stall => {
      const [lx, lz, h] = STEAM_AT[stall.kind], [x, y] = stallPoint(stall, lx, lz);
      return { x, y, steam: true, h };
    });
    for (const source of street ? steamSources : logicalScene.ambient?.smokes || []) {
      const geometry = new T.BufferGeometry(), positions = new Float32Array(24 * 3);
      for (let i = 0; i < 24; i++) { positions[i * 3] = Math.sin(i * 2.4) * .22; positions[i * 3 + 1] = i * .2; positions[i * 3 + 2] = Math.cos(i * 2.4) * .22; }
      geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
      const texture = feather.clone(); texture.channel = 0;
      const smoke = new T.Points(geometry, new T.PointsMaterial({ color: '#aaa99e', alphaMap: texture, size: 1.8, transparent: true, opacity: .12, depthWrite: false }));
      smoke.position.copy(onSurface(source.x, source.y, source.h ?? .8));
      if (source.steam) { smoke.material.color.set('#ece8de'); smoke.material.size = 1.05; smoke.material.opacity = .13; smoke.scale.set(.55, .4, .55); smoke.name = 'zunyi-steam'; }
      worldRoot.add(smoke); smokeColumns.push(smoke);
    }

    function resize() {
      const rect = container.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      cam.viewW = rect.width;
      cam.viewH = rect.height;
      const dpr = Math.min(devicePixelRatio || 1, dprCap);
      stats.dpr = +dpr.toFixed(2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    function project(x, y, height = 0) {
      const point = onSurface(x, y, height).project(camera);
      return { x: (point.x * .5 + .5) * cam.viewW, y: (-point.y * .5 + .5) * cam.viewH, behind: point.z > 1 };
    }

    function unproject(sx, sy) {
      const ndc = new T.Vector2(sx / cam.viewW * 2 - 1, -(sy / cam.viewH) * 2 + 1);
      const ray = new T.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(pickSurfaces, false)[0];
      if (!hit) return null;
      return { x: hit.point.x + world.w / 2, y: hit.point.z + world.h / 2 };
    }

    function drawGuide(player, route, visible) {
      guideLine.visible = visible && route.length > 1;
      if (!guideLine.visible) return;
      if (guideRoute === route && guideLine.userData.origin && Math.hypot(player.x - guideLine.userData.origin.x, player.y - guideLine.userData.origin.y) < .1) return;
      guideRoute = route;
      guideLine.userData.origin = { x: player.x, y: player.y };
      const points = [], line = [player, ...route.slice(1)];
      for (let i = 1; i < line.length; i++) {
        const a = line[i - 1], b = line[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / .6));
        for (let j = 0; j < steps; j++) points.push(onSurface(a.x + (b.x - a.x) * j / steps, a.y + (b.y - a.y) * j / steps, .12));
      }
      points.push(onSurface(line.at(-1).x, line.at(-1).y, .12));
      guideLine.geometry.dispose();
      guideLine.geometry = new T.BufferGeometry().setFromPoints(points);
      guideLine.computeLineDistances();
    }

    function cameraPosition(target, scale = 1) {
      if (camera.aspect < .8) scale *= 1.18;
      const heading = BASE_HEADING + orbitYaw, distance = BASE_DISTANCE * scale;
      const horizontal = Math.cos(orbitPitch) * distance;
      return target.clone().add(new T.Vector3(Math.sin(heading) * horizontal, Math.sin(orbitPitch) * distance, Math.cos(heading) * horizontal));
    }

    function clearDistance(target, direction, fullDistance) {
      cameraRight.set(direction.z, 0, -direction.x).normalize();
      let distance = fullDistance;
      for (const offset of [-.28, 0, .28]) {
        rayOrigin.copy(target).addScaledVector(cameraRight, offset);
        cameraRay.set(rayOrigin, direction); cameraRay.far = fullDistance + .3;
        for (const { object, bounds } of cameraObstacles) {
          if (object && object !== ground && bounds.max.y < target.y - .15) continue;
          if (!cameraRay.ray.intersectsBox(bounds)) continue;
          if (!object) {
            const point = cameraRay.ray.intersectBox(bounds, new T.Vector3());
            if (point) {
              const hitDistance = point.distanceTo(rayOrigin);
              if (hitDistance > .15) distance = Math.min(distance, hitDistance - .4);
            }
            continue;
          }
          const hit = cameraRay.intersectObject(object, true).find(hit => (hit.object === ground || hit.object.castShadow) && hit.distance > .15);
          if (hit) distance = Math.min(distance, hit.distance - .4);
        }
      }
      return distance;
    }

    function placeCamera(target, scale, dt) {
      cameraDirection.copy(cameraPosition(target, scale)).sub(target);
      const fullDistance = cameraDirection.length();
      cameraDirection.normalize();
      let distance = clearDistance(target, cameraDirection, fullDistance);
      if (distance < Math.min(fullDistance * .45, 3.5)) {
        const heading = Math.atan2(cameraDirection.x, cameraDirection.z);
        const elevation = Math.asin(cameraDirection.y);
        const candidate = new T.Vector3();
        for (const lift of [.28, .52]) {
          const pitch = Math.min(Math.PI / 2, elevation + lift);
          for (const yaw of [0, .45, -.45, .85, -.85]) {
            candidate.set(Math.sin(heading + yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(heading + yaw) * Math.cos(pitch));
            const clearance = clearDistance(target, candidate, fullDistance);
            if (clearance > distance) {
              cameraDirection.copy(candidate);
              distance = clearance;
            }
            if (distance >= fullDistance) break;
          }
          if (distance >= fullDistance) break;
        }
      }
      distance = Math.max(MIN_CAM_DIST, distance);
      const change = (distance - cameraDistance) * (1 - Math.exp(-dt * 8));
      cameraDistance = cameraDistance ? cameraDistance + Math.min(.31, change) : distance;
      camera.position.copy(target).addScaledVector(cameraDirection, cameraDistance);
      camera.position.y = Math.max(camera.position.y, terrain.height(camera.position.x + world.w / 2, camera.position.z + world.h / 2) + .4);
      camera.lookAt(target);
      camera.updateMatrixWorld();
      stats.cameraDistance = +cameraDistance.toFixed(3);
      stats.cameraOccluded = distance < fullDistance - .01;
    }

    // 肩后跟随：移动时缓慢回到人物身后；掉头、横移和刚手动观察后不强行甩镜头。
    function alignFollowCamera(player, dt) {
      if (!Number.isFinite(player?.facing)) return;
      const desired = behindYaw(player.facing);
      if (!followCamReady) { orbitTarget = orbitYaw = desired; followCamReady = true; return; }
      if (!player.moving || performance.now() - lastManualLook < STREET_CAM.manualHold * 1000) return;
      const delta = wrapAngle(desired - orbitTarget);
      if (Math.abs(delta) < STREET_CAM.alignMaxAngle) orbitTarget += delta * (1 - Math.exp(-dt * STREET_CAM.alignRate));
    }

    function follow(player, dt) {
      if (intro || graphicsLost) return;
      if (player.moving) focus = null;
      alignFollowCamera(player, dt);
      orbitYaw = T.MathUtils.lerp(orbitYaw, orbitTarget, 1 - Math.exp(-14 * dt));
      orbitPitch = T.MathUtils.lerp(orbitPitch, orbitPitchTarget, 1 - Math.exp(-14 * dt));
      stats.orbitYaw = +Math.atan2(Math.sin(orbitYaw), Math.cos(orbitYaw)).toFixed(3);
      stats.orbitPitch = +orbitPitch.toFixed(3);
      const sprintAmount = Math.max(0, Math.min(1, ((player.speed || 0) - M.player.SPEED) / (M.player.RUN_SPEED - M.player.SPEED)));
      locomotionScale += (1 + sprintAmount * .2 - locomotionScale) * (1 - Math.exp(-dt * 4));
      stats.cameraSpeed = +(player.speed || 0).toFixed(3);
      stats.cameraSpeedScale = +locomotionScale.toFixed(3);
      const target = focus ? onSurface(focus.px, focus.py, FOCUS_HEIGHT).lerp(onSurface(focus.x, focus.y, FOCUS_HEIGHT), .5) : onSurface(player.x, player.y, FOCUS_HEIGHT);
      if (street) {
        // 走路时镜头看向人物前方 1.8m，前方街道多露一些；停下或对话时平滑回到人物身上
        const ahead = !focus && player.moving && Number.isFinite(player.facing) ? STREET_CAM.lookAhead : 0;
        lookAheadGoal.set(Math.cos(player.facing || 0) * ahead, 0, Math.sin(player.facing || 0) * ahead);
        lookAhead.lerp(lookAheadGoal, 1 - Math.exp(-dt * 2.5));
        target.add(lookAhead);
      }
      const blend = 1 - Math.pow(.003, Math.min(dt, .1));
      followTarget.lerp(target, blend);
      placeCamera(followTarget, focus ? (street ? STREET_CAM.focusScale : 1.35) : locomotionScale, dt);
    }

    function frameTarget(player, target) {
      if (assets && Math.hypot(player.x - target.x, player.y - target.y) > 8) return;
      focus = { px: player.x, py: player.y, x: target.x, y: target.y };
    }

    function finishIntro(result) {
      if (!intro) return;
      const resolve = intro.resolve;
      followTarget.copy(onSurface(intro.player.x, intro.player.y, FOCUS_HEIGHT));
      cameraDistance = 0;
      intro = null;
      introOverlay?.remove();
      introOverlay = null;
      resolve(result);
    }

    function updateIntro(dt) {
      if (!intro) return;
      intro.elapsed += dt;
      const progress = Math.min(1, intro.elapsed / intro.duration);
      const playerPoint = onSurface(intro.player.x, intro.player.y, FOCUS_HEIGHT);
      const shot = data => ({ eye: onSurface(data[0], data[1], data[2]), look: onSurface(data[3], data[4], data[5]) });
      const first = shot(staging.shots[0]), second = shot(staging.shots[1]);
      const local = progress < .58 ? progress / .58 : (progress - .58) / .42, eased = local * local * (3 - 2 * local);
      camera.position.copy(progress < .58 ? first.eye.lerp(second.eye, eased) : second.eye.lerp(cameraPosition(playerPoint), eased));
      camera.position.y = Math.max(camera.position.y, terrain.height(camera.position.x + world.w / 2, camera.position.z + world.h / 2) + 1.5);
      camera.lookAt(progress < .58 ? first.look.lerp(second.look, eased) : second.look.lerp(playerPoint, eased));
      if (progress >= 1) finishIntro('completed');
    }

    function playIntro(player) {
      alignFollowCamera(player, 0);   // 开场镜头的落点就在人物身后，结束时不跳机位
      const cfg = M.visual3d.intro(logicalScene);
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve('reduced-motion');
      introOverlay = document.createElement('div');
      introOverlay.className = 'czmw-cinema3d';
      const copy = document.createElement('div');
      copy.className = 'czmw-cinema-copy3d';
      const eyebrow = document.createElement('small');
      eyebrow.textContent = cfg.eyebrow;
      const title = document.createElement('strong');
      title.textContent = cfg.title;
      const subtitle = document.createElement('span');
      subtitle.textContent = cfg.subtitle;
      copy.append(eyebrow, title, subtitle);
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'czmw-cinema-skip3d';
      skip.textContent = '跳过开场';
      skip.dataset.czmwUi = 'true';
      skip.addEventListener('click', () => finishIntro('skipped'));
      introOverlay.append(copy, skip);
      container.append(introOverlay);
      return new Promise(resolve => {
        intro = { elapsed: 0, duration: cfg.duration, player, resolve };
      });
    }

    const view = {
      streetActive: Boolean(street),
      cam,
      canvas,
      stats,
      project,
      unproject,
      follow,
      frameTarget,
      drawGuide,
      playIntro,
      adjustCamera(dx, dy) {
        if (intro || (!Number.isFinite(dx) && !Number.isFinite(dy))) return;
        lastManualLook = performance.now();
        if (Number.isFinite(dx)) orbitTarget -= dx * .006;
        if (Number.isFinite(dy)) orbitPitchTarget = Math.max(-.08, Math.min(.85, orbitPitchTarget + dy * .004));
        movementYaw = null;
      },
      cameraRelativeMovement({ x, y }) {
        if (!x && !y) {
          movementYaw = null;
          return { x, y };
        }
        movementYaw ??= Math.atan2(staging.offset[0], staging.offset[2]) + orbitYaw;
        const sin = Math.sin(movementYaw), cos = Math.cos(movementYaw);
        return { x: x * cos + y * sin, y: y * cos - x * sin };
      },
      headPoint(player) { return project(player.x, player.y, HEAD_POINT_HEIGHT + (player.jumpHeight || 0)); },
      surfaceHeight,
      groundHeight: terrain.height,
      resize,
      onGraphicsLost: null,
      dispose() {
        if (dead) return;
        dead = true;
        finishIntro('destroyed');
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        options.signal?.removeEventListener('abort', abort);
        canvas.removeEventListener('webglcontextlost', contextLost);
        actors?.dispose();
        releaseResources();
        sun.shadow.dispose();
        introOverlay?.remove();
        renderer.dispose();
        renderer.forceContextLoss();
        canvas.remove();
      }
    };

    disposeView = () => view.dispose();

    function contextLost(event) {
      event.preventDefault();
      if (dead || graphicsLost) return;
      graphicsLost = true;
      finishIntro('graphics-lost');
      view.onGraphicsLost?.();
    }
    canvas.addEventListener('webglcontextlost', contextLost);
    function abort() { view.dispose(); }
    options.signal?.addEventListener('abort', abort, { once: true });

    function frame(ts) {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden || graphicsLost) { last = ts; return; }
      if (logicalScene.pausedDim && !intro && ts - last < 1000 / 20) return;
      const dt = Math.max(0, Math.min(.08, (ts - (last || ts - 16.7)) / 1000));
      last = ts;
      const started = performance.now();
      updateIntro(dt);
      camera.updateMatrixWorld();
      logicalScene.tick?.(dt);
      if (logicalScene.focusActor) {
        actors?.update(dt, logicalScene.focusActor, logicalScene.anchorEntities || [], camera, surfaceHeight);
        if (assets) {
          const p = logicalScene.focusActor;
          sun.target.position.copy(onSurface(p.x, p.y));
          sun.position.copy(sun.target.position).add(new T.Vector3(...staging.sun));
          sun.target.updateMatrixWorld();
        }
      }
      const time = ts * .001;
      for (const fire of fires) {
        fire.material.uniforms.time.value = time;
        fire.light.intensity = 4.5 + Math.sin(time * 9 + fire.material.uniforms.phase.value) * .55 + Math.sin(time * 17) * .3;
      }
      for (const water of waters) {
        water.position.y = Math.sin(time * .8) * (logicalScene.ironBridge ? .005 : .018);
        water.material.userData.flow.value = time * ([6, 7, 10].includes(Number(logicalScene.chapterId)) ? 2.4 : environment.terrain === 'wetland' ? .2 : .85);
      }
      for (const flag of flags) {
        const positions = flag.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) positions.setZ(i, Math.sin(positions.getX(i) * 2.1 + time * 2.2) * .055);
        positions.needsUpdate = true; flag.geometry.computeVertexNormals();
      }
      for (const smoke of smokeColumns) {
        const positions = smoke.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) { const height = (i * .2 + time * .42) % 4.8; positions.setXYZ(i, Math.sin(i * 2.4 + time * .25) * .15 + height * .16, height, Math.cos(i * 2.4) * .22); }
        positions.needsUpdate = true;
      }
      for (const [id, marker] of markers) {
        const anchor = logicalScene.anchorEntities?.find(item => item.anchorId === id);
        if (anchor?.kind === 'npc') marker.visible = !!anchor.near;
        else marker.visible = anchor ? anchor.enabled && (!street || (logicalScene.focusActor && Math.hypot(anchor.x - logicalScene.focusActor.x, anchor.y - logicalScene.focusActor.y) <= 10)) : true;
        if (marker.visible) marker.rotation.z = time * .35;
      }
      if (particles) {
        const positions = particles.geometry.attributes.position, kind = logicalScene.ambient.kind;
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i), z = positions.getZ(i);
          const base = Math.max(terrain.waterLevel, terrain.height(x + world.w / 2, z + world.h / 2));
          const lift = kind === 'snow' ? 25 - (i * 2.37 + time * 1.4) % 25 : kind === 'mist' ? .6 + (i % 6) * .45 : 1 + (i * 2.37 + time * .2) % 10;
          positions.setY(i, base + lift);
        }
        positions.needsUpdate = true;
      }
      renderer.render(scene, camera);
      stats.frames++;
      stats.drawCalls = renderer.info.render.calls;
      stats.triangles = renderer.info.render.triangles;
      stats.renderMs = +(performance.now() - started).toFixed(2);
      if (stats.renderMs > 24) slow++; else slow = Math.max(0, slow - 1);
      if (slow >= 45 && dprCap > .76) {
        dprCap = Math.max(.75, dprCap * .8);
        stats.adaptive = true;
        slow = 0;
        resize();
      }
    }

    actors = await M.actors3d.create(T, logicalScene, scene, options.signal, options.roleId);
    if (options.signal?.aborted || graphicsLost) {
      actors.dispose();
      throw new DOMException('3D initialization interrupted', 'AbortError');
    }
    camera.position.copy(cameraPosition(followTarget));
    camera.lookAt(followTarget);
    camera.updateMatrixWorld();
    raf = requestAnimationFrame(frame);
    return view;
    } catch (error) {
      if (disposeView) disposeView();
      else {
        releaseResources();
        renderer?.dispose();
        renderer?.forceContextLoss();
        renderer?.domElement.remove();
      }
      throw error;
    }
  }

  M.renderer3d = { create };
})();
