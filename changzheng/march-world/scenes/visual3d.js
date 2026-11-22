(() => {
  'use strict';
  const M = window.CZMarchWorld._;
  // Intro dates and landmarks follow the chapter scene headers.
  // vegetation controls scanned ferns only, not chapter trees or character detail.
  const chapters = {
    1: {
      enabled: true,
      intro: {
        title: '于都河',
        subtitle: '夜渡于都河，中央红军踏上远征。',
        eyebrow: '江西 · 于都  1934.10',
        duration: 6.4
      },
      environment: {
        terrain: 'village', groundTint: '#d8ded0', rockTint: '#979789', mountainTint: '#707d70',
        relief: 18, vegetation: true, fogNear: 70, fogFar: 245
      }
    },
    2: {
      enabled: true,
      intro: {
        title: '血战湘江',
        subtitle: '沿山路抵达湘江河岸，走近集结处与渡口。',
        eyebrow: '湘江  1934.11',
        duration: 6.4
      },
      environment: {
        terrain: 'river', groundTint: '#c8c3a4', rockTint: '#76736a', mountainTint: '#69766e',
        relief: 25, vegetation: true, fogNear: 75, fogFar: 260
      }
    },
    3: {
      enabled: true,
      intro: {
        title: '遵义会议',
        subtitle: '穿过石板主街，走进遵义会议会址院落。',
        eyebrow: '遵义  1935.01',
        duration: 6.4
      },
      environment: {
        terrain: 'town', groundTint: '#d1c5ad', rockTint: '#aaa293', mountainTint: '#6b776e',
        relief: 22, vegetation: true, fogNear: 70, fogFar: 245
      }
    },
    4: {
      enabled: true,
      intro: {
        title: '四渡赤水',
        subtitle: '沿赤水河山道前行，连接土城与两岸渡口。',
        eyebrow: '赤水 · 土城  1935.01–03',
        duration: 6.4
      },
      environment: {
        terrain: 'redrock', groundTint: '#c59478', rockTint: '#8a6f5c', mountainTint: '#7a7264',
        relief: 42, vegetation: true, fogNear: 85, fogFar: 280
      }
    },
    5: {
      enabled: true,
      intro: {
        title: '巧渡金沙江',
        subtitle: '循北山旱道下行，来到皎平渡石滩与指挥山洞。',
        eyebrow: '金沙江 · 皎平渡  1935.05',
        duration: 6.4
      },
      environment: {
        terrain: 'dryvalley', groundTint: '#d3b981', rockTint: '#8f7a62', mountainTint: '#827662',
        relief: 50, vegetation: false, fogNear: 95, fogFar: 300
      }
    },
    6: {
      enabled: true,
      intro: {
        title: '强渡大渡河',
        subtitle: '从安顺场村落走向鹅卵石滩，抵达大渡河渡船点。',
        eyebrow: '大渡河 · 安顺场  1935.05.25',
        duration: 6.4
      },
      environment: {
        terrain: 'river', groundTint: '#c5c0ad', rockTint: '#7c786c', mountainTint: '#6c7870',
        relief: 48, vegetation: true, fogNear: 85, fogFar: 285
      }
    },
    7: {
      enabled: true,
      intro: {
        title: '飞夺泸定桥',
        subtitle: '峡谷之间，铁索桥连接西桥头与东岸县城。',
        eyebrow: '泸定桥  1935.05.29',
        duration: 6.4
      },
      environment: {
        terrain: 'canyon', groundTint: '#b8b6aa', rockTint: '#767468', mountainTint: '#6a7670',
        relief: 65, vegetation: false, fogNear: 95, fogFar: 310
      }
    },
    8: {
      enabled: true,
      intro: {
        title: '翻越雪山',
        subtitle: '从南路入山，穿过垭口，沿夹金山之字雪路上行。',
        eyebrow: '夹金山  1935.06',
        duration: 6.4
      },
      environment: {
        terrain: 'snow', groundTint: '#edf1f2', rockTint: '#bac2c5', mountainTint: '#b6bec0',
        relief: 78, vegetation: false, fogNear: 100, fogFar: 330
      }
    },
    9: {
      enabled: true,
      intro: {
        title: '穿越草地',
        subtitle: '穿行松潘草地的沼泽草丘，循路抵达宿营地。',
        eyebrow: '松潘草地  1935.08',
        duration: 6.4
      },
      environment: {
        terrain: 'wetland', groundTint: '#a9b58a', rockTint: '#787468', mountainTint: '#6e7a6c',
        relief: 8, vegetation: true, fogNear: 80, fogFar: 270
      }
    },
    10: {
      enabled: true,
      intro: {
        title: '腊子口战役',
        subtitle: '从西营地进入峡谷隘道，经腊子河木桥走向隘口。',
        eyebrow: '腊子口  1935.09',
        duration: 6.4
      },
      environment: {
        terrain: 'pass', groundTint: '#b7b6a0', rockTint: '#76726a', mountainTint: '#69756c',
        relief: 70, vegetation: false, fogNear: 95, fogFar: 315
      }
    },
    11: {
      enabled: true,
      intro: {
        title: '吴起镇·落脚',
        subtitle: '沿北路进入吴起镇，走过黄土台地上的窑洞院落。',
        eyebrow: '吴起镇  1935.10.19',
        duration: 6.4
      },
      environment: {
        terrain: 'loess', groundTint: '#d7b67f', rockTint: '#8f7c60', mountainTint: '#87785e',
        relief: 27, vegetation: false, fogNear: 90, fogFar: 285
      }
    },
    12: {
      enabled: true,
      intro: {
        title: '三大主力·会师',
        subtitle: '从会宁西城门进入中心广场，走向会师门楼。',
        eyebrow: '会宁  1936.10',
        duration: 6.4
      },
      environment: {
        terrain: 'loess', groundTint: '#dbc18c', rockTint: '#90806a', mountainTint: '#8a7c64',
        relief: 22, vegetation: false, fogNear: 90, fogFar: 285
      }
    }
  };

  const staging = {
    1: { name: '于都河阶·蓝调夜渡', sky: '#34465e', fog: '#7a8997', fill: '#b3c5e1', key: '#bdcfee', power: 1.6, ambient: 1.3, exposure: 1.25, offset: [6, 4.1, 9], sun: [-24, 32, -18], shots: [[118, 111, 18, 94, 92, 1], [75, 78, 11, 52, 54, 2]] },
    2: { name: '湘江坡地·转运清点', sky: '#86969f', fog: '#b4bdba', fill: '#cfdae2', key: '#dce0d5', power: 2.1, ambient: 1.4, exposure: 1.12, offset: [-6, 4.4, 9], sun: [-32, 36, 16], shots: [[35, 18, 22, 85, 77, 0], [107, 70, 14, 110, 47, 1]] },
    3: { name: '遵义坡街·层院木廊', sky: '#9faeb0', fog: '#c1c9c3', fill: '#d4dfe0', key: '#f4e9d0', power: 2.2, ambient: 1.3, exposure: 1.12, offset: [7, 4.1, 8], sun: [-28, 42, 18], shots: [[64, 76, 19, 85, 42, 3], [110, 62, 12, 85, 42, 3]] },
    4: { name: '赤水曲谷·双渡机动', sky: '#a2b3b6', fog: '#c5c8b6', fill: '#c7d9db', key: '#f9d7ab', power: 2.7, ambient: 1.25, exposure: 1.13, offset: [-6, 4.8, 9], sun: [-32, 40, -18], shots: [[19, 75, 26, 55, 55, 1], [152, 112, 23, 135, 86, 1]] },
    5: { name: '皎平渡·干热阶崖', sky: '#b8c0be', fog: '#d4c7aa', fill: '#d4dad6', key: '#ffe3b4', power: 3.3, ambient: 1.1, exposure: 1.08, offset: [7, 4.4, 8], sun: [-22, 53, 12], shots: [[52, 41, 26, 100, 84, 0], [162, 55, 15, 144, 32, 3]] },
    6: { name: '安顺场·冲积石滩', sky: '#94aeb6', fog: '#bdcbc6', fill: '#c0d7e1', key: '#f2e4c6', power: 2.6, ambient: 1.35, exposure: 1.14, offset: [6, 4.5, 9], sun: [25, 37, -20], shots: [[116, 105, 19, 90, 76, 0], [30, 56, 13, 56, 41, 2]] },
    7: { name: '泸定深峡·悬空铁索', sky: '#8098a5', fog: '#afc0c3', fill: '#c0d4e3', key: '#f0e0c8', power: 2.4, ambient: 1.3, exposure: 1.17, offset: [6, 4.3, 8], sun: [-30, 42, 20], shots: [[98, 88, 29, 94, 56, 0], [136, 76, 18, 68, 56, 1]] },
    8: { name: '夹金山·爬升雪脊', sky: '#a4b8c7', fog: '#d6e0e4', fill: '#c5d9eb', key: '#f0f5ff', power: 2.4, ambient: 1.6, exposure: 1.05, offset: [5, 4.6, 9], sun: [-25, 40, -16], shots: [[107, 94, 23, 72, 24, 1], [37, 56, 18, 82, 60, 1]] },
    9: { name: '松潘草丘·暮色孤营', sky: '#465d6b', fog: '#8b9b9c', fill: '#b7cbd7', key: '#c6d3dc', power: 1.4, ambient: 1.3, exposure: 1.23, offset: [6, 3.4, 9], sun: [-26, 26, -20], shots: [[49, 102, 12, 78, 98, 1], [130, 86, 12, 100, 68, 1]] },
    10: { name: '腊子口·夹壁上行', sky: '#8fa3aa', fog: '#b8c5c1', fill: '#c3d7df', key: '#e9e5d0', power: 2.25, ambient: 1.2, exposure: 1.16, offset: [-6, 4.5, 8], sun: [-18, 46, 12], shots: [[56, 90, 22, 84, 59, 2], [109, 64, 18, 132, 37, 2]] },
    11: { name: '吴起塬坡·窑院安顿', sky: '#b1bdba', fog: '#d3c8ae', fill: '#d8e0d9', key: '#f8d8a5', power: 2.5, ambient: 1.35, exposure: 1.12, offset: [6, 3.8, 9], sun: [-35, 28, 22], shots: [[36, 51, 15, 54, 29, 2], [113, 77, 17, 83, 56, 1]] },
    12: { name: '会宁城街·汇入广场', sky: '#b2c5cc', fog: '#dcd4bc', fill: '#d4e2e7', key: '#ffdab0', power: 2.9, ambient: 1.4, exposure: 1.15, offset: [6, 4.5, 9], sun: [-34, 29, 22], shots: [[91, 90, 24, 90, 28, 3], [132, 76, 16, 91, 53, 1]] }
  };

  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  const hill = (x, y, cx, cy, rx, ry) => Math.exp(-(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2));
  const landforms = {
    1: (x, y) => 1.3 + 4.4 * hill(x, y, 45, 31, 50, 25) + 1.6 * hill(x, y, 142, 28, 40, 28) + .008 * (80 - y),
    2: (x, y) => 1 + 11 * hill(x, y, 18, 12, 42, 36) + 5 * hill(x, y, 129, 27, 36, 25) + 1.8 * hill(x, y, 62, 38, 36, 24),
    3: () => 1,
    4: (x, y) => 1.3 + 13 * hill(x, y, 17, 7, 44, 34) + 9 * hill(x, y, 154, 23, 43, 27) + 4 * hill(x, y, 95, 38, 32, 23),
    5: (x, y) => .8 + 18 * hill(x, y, 45, 10, 80, 38) + 13 * hill(x, y, 148, 25, 38, 32),
    6: (x, y) => .8 + 8 * hill(x, y, 44, 28, 53, 31) + 10 * hill(x, y, 148, 18, 38, 32),
    7: (x, y) => .025 + 6 * hill(x, y, 80, 10, 55, 22) + 3 * hill(x, y, 16, 20, 30, 26) + 2 * hill(x, y, 156, 24, 27, 20),
    8: (x, y) => 1 + .30 * (125 - y) + 7 * hill(x, y, 48, 24, 26, 23) + 4 * hill(x, y, 124, 43, 31, 29),
    9: (x, y) => .42 + .24 * Math.sin(x * .095) * Math.cos(y * .11) + .48 * hill(x, y, 100, 65, 26, 18) + .55 * hill(x, y, 78, 96, 17, 14),
    10: (x, y) => 1 + .075 * x + 10 * hill(x, y, 126, 24, 35, 33) + 3 * hill(x, y, 35, 10, 37, 28),
    11: (x, y) => 1 + .11 * (115 - y) + 5 * hill(x, y, 49, 26, 28, 20) + 2 * hill(x, y, 144, 40, 32, 26),
    12: (x, y) => 1.8 + .025 * (120 - y) + 1.2 * hill(x, y, 90, 26, 37, 24)
  };

  function terrain(scene, props = scene.props) {
    const chapter = Number(scene.chapterId), { w, h } = scene.world;
    const raw = landforms[chapter] || landforms[1];
    const waterLevel = chapter === 7 ? -13 : 0, shore = chapter === 7 ? .025 : .18;
    const waterPolygons = (scene.terrain?.waters || []).map(water => water.pts);
    const inside = (x, y, points) => {
      let hit = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit;
      }
      return hit;
    };
    const inWater = (x, y) => waterPolygons.some(points => inside(x, y, points));
    const shoreEdges = waterPolygons.flatMap(points => points.map((a, i) => [a, points[(i + 1) % points.length]])).flatMap(([a, b]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy, splits = [0, 1];
      for (const p of waterPolygons.flat()) {
        const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / length;
        if (t > 0 && t < 1 && Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) < .00001) splits.push(t);
      }
      const sorted = [...new Set(splits)].sort((a, b) => a - b);
      return sorted.slice(1).map((t, i) => [[a[0] + dx * sorted[i], a[1] + dy * sorted[i]], [a[0] + dx * t, a[1] + dy * t]]);
    }).filter(([a, b]) => {
      const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy) || 1;
      const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2;
      return !(inWater(x + dy / length * .02, y - dx / length * .02) && inWater(x - dy / length * .02, y + dx / length * .02));
    });
    const distanceToShore = (x, y) => {
      let nearest = Infinity;
      for (const [a, b] of shoreEdges) {
        const dx = b[0] - a[0], dy = b[1] - a[1], length = dx * dx + dy * dy;
        const t = length ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length)) : 0;
        nearest = Math.min(nearest, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy));
      }
      return nearest;
    };
    const bridges = props.filter(prop => prop.type === 'bridge').map(prop => {
      const gaps = props.filter(other => other.type === 'bridge' && other.x === prop.x && other.y !== prop.y).map(other => Math.abs(other.y - prop.y));
      const gap = Math.min(...gaps), depth = Number.isFinite(gap) && gap <= (prop.h || 4) * 2 ? gap + .02 : prop.h || 4;
      return { x: prop.x, y: prop.y, w: prop.w, depth, top: .225 };
    });
    const crossings = [];
    for (const bridge of bridges) {
      let crossing = crossings.find(item => item.x === bridge.x);
      if (!crossing) { crossing = { x: bridge.x, w: bridge.w, min: Infinity, max: -Infinity, top: bridge.top }; crossings.push(crossing); }
      crossing.min = Math.min(crossing.min, bridge.y - bridge.depth / 2);
      crossing.max = Math.max(crossing.max, bridge.y + bridge.depth / 2);
    }
    const rectangleDistance = (x, y, cx, cy, width, depth) => Math.hypot(Math.max(0, Math.abs(x - cx) - width / 2), Math.max(0, Math.abs(y - cy) - depth / 2));
    function riverbed(x, y) {
      const distance = distanceToShore(x, y), wet = inWater(x, y);
      let value = wet ? shore + (waterLevel - (chapter === 9 ? .5 : 2.4) - shore) * smooth(distance / (chapter === 7 ? 3.5 : 2)) : shore + (raw(x, y) - shore) * smooth(distance / (chapter === 9 ? 2.5 : 9));
      for (const crossing of crossings) {
        const cy = (crossing.min + crossing.max) / 2, depth = crossing.max - crossing.min;
        const d = rectangleDistance(x, y, crossing.x, cy, crossing.w, depth);
        if (d === 0) value = waterLevel - 1.2;
        else if (!wet && d < 5) value = crossing.top + (value - crossing.top) * smooth(d / 5);
      }
      if (scene.ironBridge && !wet) {
        const b = scene.ironBridge, d = rectangleDistance(x, y, (b.x0 + b.x1) / 2, b.y, b.x1 - b.x0, 6);
        if (d < 5) value = .025 + (value - .025) * smooth(d / 5);
      }
      return value;
    }
    const cellSize = scene.streetModel ? 4 : .75;
    const cols = Math.ceil(w / cellSize), rows = Math.ceil(h / cellSize), dx = w / cols, dy = h / rows;
    const pads = props.filter(prop => ['house', 'houseWood', 'tent', 'stoneWall', 'archGate', 'yaodong', 'gate', 'stairs'].includes(prop.type)).map(prop => {
      const width = (prop.w || 6) + .7, depth = (prop.depth || (prop.type === 'stairs' ? prop.h : prop.type === 'gate' ? 1 : prop.w * .68)) + .7;
      const left = Math.floor((prop.x - width / 2) / dx) * dx, right = Math.ceil((prop.x + width / 2) / dx) * dx;
      const top = Math.floor((prop.y - depth / 2) / dy) * dy, bottom = Math.ceil((prop.y + depth / 2) / dy) * dy;
      return { x: (left + right) / 2, y: (top + bottom) / 2, w: right - left, depth: bottom - top, height: riverbed(prop.x, prop.y) };
    });
    function shaped(x, y) {
      const value = riverbed(x, y);
      if (inWater(x, y)) return value;
      let weightSum = 0, heightSum = 0, influence = 0;
      for (const pad of pads) {
        const distance = rectangleDistance(x, y, pad.x, pad.y, pad.w, pad.depth);
        if (distance < 1e-8) return pad.height;
        if (distance < 3.5) {
          const blend = 1 - smooth(distance / 3.5), weight = blend / (distance * distance);
          weightSum += weight;
          heightSum += pad.height * weight;
          influence = Math.max(influence, blend);
        }
      }
      return weightSum ? value + (heightSum / weightSum - value) * influence : value;
    }
    const heights = new Float32Array((cols + 1) * (rows + 1));
    for (let row = 0; row <= rows; row++) for (let col = 0; col <= cols; col++) heights[row * (cols + 1) + col] = shaped(col * dx, row * dy);
    function height(x, y) {
      const gx = Math.max(0, Math.min(cols, x / dx)), gy = Math.max(0, Math.min(rows, y / dy));
      const col = Math.min(cols - 1, Math.floor(gx)), row = Math.min(rows - 1, Math.floor(gy)), tx = gx - col, ty = gy - row;
      const i = row * (cols + 1) + col, a = heights[i], b = heights[i + 1], c = heights[i + cols + 1], d = heights[i + cols + 2];
      return tx + ty <= 1 ? a + (b - a) * tx + (c - a) * ty : d + (c - d) * (1 - tx) + (b - d) * (1 - ty);
    }
    function support(x, y) {
      if (scene.ironBridge) {
        const b = scene.ironBridge;
        if (x >= b.x0 && x <= b.x1 && y >= b.y - 7 && y <= b.y + 4) return .025;
      }
      for (const b of bridges) if (Math.abs(x - b.x) <= b.w / 2 && Math.abs(y - b.y) <= b.depth / 2) return b.top;
      for (const prop of props) if (prop.type === 'stairs' && Math.abs(x - prop.x) <= prop.w / 2 && Math.abs(y - prop.y) <= prop.h / 2) {
        return height(prop.x, prop.y) + .08 * Math.min(8, 1 + Math.floor((prop.y + prop.h / 2 - y) / (prop.h / 8)));
      }
      return height(x, y);
    }
    return { cols, rows, dx, dy, heights, height, support, waterLevel, crossings, bridges, inWater };
  }

  function requested(scene) {
    const value = new URLSearchParams(location.search).get('3d');
    if (value === '0') return false;
    if (value === '1') return true;
    try {
      if (localStorage.getItem('cz_march_renderer') === 'canvas') return false;
    } catch {}
    return !!chapters[scene.chapterId]?.enabled;
  }

  M.visual3d = {
    chapters,
    requested,
    terrain,
    staging(scene) { return staging[scene.chapterId] || staging[1]; },
    environment(scene) {
      return chapters[scene.chapterId]?.environment || chapters[1].environment;
    },
    intro(scene) {
      return chapters[scene.chapterId]?.intro || {
        title: scene.title,
        subtitle: '长征 · 星火',
        eyebrow: `第 ${scene.chapterId} 章`,
        duration: 5.6
      };
    }
  };
})();
