import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const require = createRequire(import.meta.url);
const output = fileURLToPath(new URL('../assets/raw-scans/zunyi/refs/', import.meta.url));
const sources = [
  ['people', 'https://gz.people.com.cn/n2/2024/1227/c222152-41089600.html'],
  ['xinhua', 'https://www.moj.gov.cn/pub/sfbgw/zwgkztzl/2021nzt/20210420fdbnl_2329/hsjy/202105/t20210511_391697.html'],
  ['china', 'https://www.china.org.cn/chinese/2017-11/22/content_41929234_6.htm']
];
if (process.env.ZUNYI_SUPPLEMENTAL === '1') sources.push(
  ['entrance','https://www.mod.gov.cn/gfbw/gfjy_index/4845555.html?big=fan'],
  ['courts','https://www.court.gov.cn/zixun/xiangqing/509091.html'],
  ['survey','https://www.lfnu.edu.cn/sz/col/1387441661796/2026/08/18/1787066363251.html'],
  ['repair','https://www.cqnews.net/web/content_1539534598842191872.html'],
  ['peoples_photo','https://pic.people.com.cn/n1/2026/0929/c1016-40807361-2.html']
);
const panoramas = [
  ['720yun', 'https://www.720yun.com/t/40vkzq2l7ry?scene_id=82279517'],
  ['360cn', 'https://360cn.net/cases/exhibition-07.html']
];
const selectionsFile = process.argv[2];

if (selectionsFile) {
  const { directory, selections } = JSON.parse(await readFile(resolve(selectionsFile), 'utf8'));
  const { candidates, errors } = JSON.parse(await readFile(join(directory, 'candidates.json'), 'utf8'));
  const seen = new Set();
  const files = [];
  await mkdir(output, {recursive:true});
  for (const { id, filename, description } of selections) {
    if (!/^(aerial|main_facade|courtyard|vr_pano)_[a-z0-9_]+\.jpg$/.test(filename)) throw Error('Bad output name: ' + filename);
    const item = candidates.find(entry => entry.id === id);
    if (!item || seen.has(filename) || seen.has(item.sha256)) throw Error('Missing or duplicate selection: ' + id);
    const bytes = await readFile(join(directory, item.id + '.jpg'));
    if (digest(bytes) !== item.sha256) throw Error('Candidate checksum changed: ' + id);
    seen.add(filename);
    seen.add(item.sha256);
    const { id: ignored, ...details } = item;
    await writeFile(join(output, filename + '.part'), bytes);
    await rename(join(output, filename + '.part'), join(output, filename));
    files.push({filename, ...details, description});
  }
  await writeFile(join(output, 'ref-manifest.json'), JSON.stringify({files, errors}, null, 2) + '\n');
  console.log(JSON.stringify({total: files.length, output}));
  process.exit(0);
}

const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const directory = await mkdtemp(join(process.env.ZUNYI_REVIEW_ROOT || tmpdir(), 'zunyi-refs-'));
const browser = await puppeteer.launch({
  executablePath: process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--enable-unsafe-swiftshader', '--use-angle=d3d11']
});
const candidates = [], errors = [], hashes = new Set();
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

async function save(id, sourceUrl, imageUrl, width, height, bytes, metadata = {}) {
  const sha256 = digest(bytes);
  if (hashes.has(sha256)) return;
  hashes.add(sha256);
  await writeFile(join(directory, id + '.jpg'), bytes);
  candidates.push({id, sourceUrl, imageUrl, width, height, sha256, ...metadata});
}

try {
  await Promise.all([...sources.map(([key, url]) => collectStatic(key, url)), ...panoramas.map(([key, url]) => collectPanorama(key, url))]);
} finally {
  await browser.close();
  await writeFile(join(directory, 'candidates.json'), JSON.stringify({candidates, errors}, null, 2));
  console.log(JSON.stringify({directory, candidates, errors}, null, 2));
}

async function collectStatic(key, url) {
  const page = await browser.newPage();
  const decoder = await browser.newPage();
  const imagePage = await browser.newPage();
  try {
    const response = await page.goto(url, {waitUntil:'domcontentloaded', timeout:25000});
    if (!response?.ok()) throw Error('HTTP ' + response?.status());
    const images = await page.$$eval('img', elements => [...new Set(elements.map(img => {
      const src = img.dataset.original || img.dataset.src || img.getAttribute('data-actualsrc') || img.currentSrc || img.getAttribute('src');
      if (!src) return null;
      return new URL(src, document.baseURI).href;
    }))].filter(url => /^https?:/.test(url)));
    let count = 0;
    for (let i = 0; i < images.length; i++) {
      const src = images[i];
      try {
        const r = await imagePage.goto(src, {waitUntil:'domcontentloaded', timeout:12000, referer:page.url()});
        const mime = r?.headers()['content-type']?.split(';')[0];
        if (!r?.ok() || !mime?.startsWith('image/')) continue;
        const base64 = (await r.buffer()).toString('base64');
        const data = await decoder.evaluate(async ({base64, mime}) => {
          const img = new Image();
          img.src = 'data:' + mime + ';base64,' + base64;
          await img.decode();
          if (img.width < 500 || img.height < 500) return null;
          const canvas = document.createElement('canvas');
          canvas.width = img.width; canvas.height = img.height;
          canvas.getContext('2d').drawImage(img, 0, 0);
          return {width:img.width, height:img.height, jpeg:canvas.toDataURL('image/jpeg', .96).split(',')[1]};
        }, {base64, mime});
        if (!data) continue;
        await save(key + '_' + (i+1), url, src, data.width, data.height, Buffer.from(data.jpeg, 'base64'), {kind:'photo'});
        count++;
      } catch (e) {
        errors.push({sourceUrl:url, imageUrl:src, error:e.message});
      }
    }
    if (!count) throw Error('No image at least 500 × 500');
  } catch(e) { errors.push({sourceUrl:url,error:e.message}); }
  finally { await Promise.all([page.close(),decoder.close(),imagePage.close()]); }
}

async function collectPanorama(key, url) {
  const page = await browser.newPage();
  try {
    await page.setViewport({width:1600,height:900,deviceScaleFactor:1});
    const response = await page.goto(url, {waitUntil:'domcontentloaded', timeout:30000});
    if (!response?.ok()) throw Error('HTTP ' + response?.status());
    await wait(3500);
    if ((await page.locator('body').map(body => body.innerText).wait()).includes('该作品设置了访问密码')) throw Error('Panorama requires an access password');
    console.log(key, await page.title(), page.frames().map(f=>f.url()));
    const frame = page.frames().find(f => f !== page.mainFrame() && f.url().includes('720yun')) || page.mainFrame();
    const close = await frame.$('[aria-label="关闭"], [aria-label="Close"]');
    if (close) await close.click().catch(() => {});
    const canvas = await frame.waitForFunction(() => [...document.querySelectorAll('canvas')].some(el => {
      const r=el.getBoundingClientRect();
      return r.width >= 700 && r.height >= 500;
    }), {timeout:24000});
    await canvas.dispose();
    await wait(4500);
    for (let i=0;i<6;i++) {
      if (i) {
        await page.mouse.move(975,448);
        await page.mouse.down();
        await page.mouse.move(445,448,{steps:18});
        await page.mouse.up();
        await wait(2400);
      }
      await save(key+'_'+(i+1),url,page.url(),1600,900,Buffer.from(await page.screenshot({type:'jpeg',quality:94})),{kind:'panorama',step:i});
    }
  } catch(e) {
    errors.push({sourceUrl:url,error:e.message, pageTitle:await page.title().catch(()=>null)});
    await page.screenshot({path:join(directory,key+'-diagnostic.png')}).catch(()=>{});
  }
  finally { await page.close(); }
}
