/* ============================================================
   世界猫生ガチャ — 猫アセット（AI生成イラスト）と演出
   74純血種・46野生ネコ科・14毛柄を、13タイプ×子猫/成猫の
   画像アセットにマッピングする。DOMに依存しない純ロジック。
   ============================================================ */
(function (root) {
  'use strict';

  const ASSET_DIR = 'assets/cats/';
  /* 画像キャッシュ対策。画像を差し替えたらここも上げる（?v= が付いたURLで読む） */
  const ASSET_V = '?v=20261124n';
  const TYPES = [
    'tabby', 'orange', 'black', 'white', 'calico', 'tuxedo', 'gray',
    'siamese', 'fluffy', 'lion', 'tiger', 'leopard', 'wildcat', 'scottish',
    'sphynx', 'munchkin', 'persian', 'curl', 'russian', 'bengal',
    'abyssinian', 'tortie', 'mainecoon', 'ragdoll', 'bobtail', 'snowleopard',
    'cheetah', 'pallas', 'serval', 'caracal', 'puma', 'lynx', 'rex'
  ];

  /* ---------- 野生のネコ科（46種）→ アセット ---------- */
  const WILD_MAP = {
    lion: 'lion', asiatic_lion: 'lion', tiger: 'tiger', amur_tiger: 'tiger',
    sumatran_tiger: 'tiger', leopard: 'leopard', jaguar: 'leopard', clouded_leopard: 'leopard',
    sunda_clouded: 'leopard', amur_leopard: 'leopard', marbled_cat: 'leopard', chinese_mountain: 'leopard',
    asian_golden: 'leopard', bay_cat: 'leopard', african_golden: 'leopard', ocelot: 'leopard',
    margay: 'leopard', oncilla: 'leopard', southern_tiger: 'leopard', geoffroy: 'leopard',
    kodkod: 'leopard', pampas: 'leopard', andean: 'leopard', snow_leopard: 'snowleopard',
    cheetah: 'cheetah', serval: 'serval', caracal: 'caracal', manul: 'pallas',
    sand_cat: 'pallas', puma: 'puma', florida_panther: 'puma', jaguarundi: 'puma',
    eurasian_lynx: 'lynx', canada_lynx: 'lynx', iberian_lynx: 'lynx', bobcat: 'lynx',
    leopard_cat: 'bengal', iriomote: 'bengal', tsushima: 'bengal', rusty_spotted: 'bengal',
    blackfooted: 'bengal', euro_wildcat: 'wildcat', african_wildcat: 'wildcat', fishing_cat: 'wildcat',
    flat_headed: 'wildcat', jungle_cat: 'caracal',
  };

  /* ---------- 雑種の毛柄（14種）→ アセット ---------- */
  const COAT_MAP = {
    kijitora: 'tabby', tabbywhite: 'tabby', chatora: 'orange', sabatora: 'gray', gray: 'gray',
    kuro: 'black', shiro: 'white', cream: 'white', hachiware: 'tuxedo', mike: 'calico',
    buchi: 'calico', sabi: 'tortie', point: 'siamese', longmix: 'fluffy',
  };

  /* ---------- 純血種（74種）のうち、見た目がはっきり違うもの ---------- */
  const BREED_MAP = {
    mainecoon: 'mainecoon', norwegian: 'mainecoon', siberian: 'mainecoon', ragamuffin: 'mainecoon',
    scottish: 'scottish', munchkin: 'munchkin', minuet: 'munchkin', skookum: 'munchkin',
    kinkalow: 'munchkin', ragdoll: 'ragdoll', birman: 'ragdoll', balinese: 'ragdoll',
    british: 'gray', american_sh: 'gray', scottish_straight: 'gray', persian: 'persian',
    exotic_sh: 'persian', russian_blue: 'russian', chartreux: 'russian', korat: 'russian',
    bengal: 'bengal', ocicat: 'bengal', egyptian_mau: 'bengal', arabian_mau: 'bengal',
    cheetoh: 'bengal', serengeti: 'bengal', australian_mist: 'bengal', sphynx: 'sphynx',
    peterbald: 'sphynx', donskoy: 'sphynx', bambino: 'sphynx', minskin: 'sphynx',
    dwelf: 'sphynx', ukrainian_levkoy: 'sphynx', lykoi: 'sphynx', siam: 'siamese',
    tonkinese: 'siamese', thai: 'siamese', colorpoint_sh: 'siamese', burmese: 'siamese',
    snowshoe: 'siamese', abyssinian: 'abyssinian', somali: 'abyssinian', singapura: 'abyssinian',
    oriental_sh: 'abyssinian', chausie: 'abyssinian', sokoke: 'abyssinian', turkish_angora: 'white',
    turkish_van: 'white', khao_manee: 'white', vankedisi: 'white', ojos_azules: 'white',
    bombay: 'black', havana_brown: 'black', suphalak: 'black', manx: 'bobtail',
    japanese_bobtail: 'bobtail', kurilian_bobtail: 'bobtail', american_bobtail: 'bobtail', toybob: 'bobtail',
    american_curl: 'curl', highlander: 'curl', cornish_rex: 'rex', devon_rex: 'rex',
    german_rex: 'rex', selkirk_rex: 'rex', laperm: 'rex', american_wirehair: 'rex',
    york_chocolate: 'rex', savannah: 'serval', toyger: 'tiger', pixie_bob: 'lynx',
    british_lh: 'fluffy', european_sh: 'tabby',
  };

  /* ---------- 色から毛色ファミリーを判定 ---------- */
  function rgbOf(hex) {
    const h = String(hex || '#A87B4A').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function colorFamily(hex) {
    const { r, g, b } = rgbOf(hex);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 510;
    const s = max === 0 ? 0 : (max - min) / max;
    let hue = 0;
    if (max !== min) {
      if (max === r) hue = 60 * (((g - b) / (max - min)) % 6);
      else if (max === g) hue = 60 * ((b - r) / (max - min) + 2);
      else hue = 60 * ((r - g) / (max - min) + 4);
      if (hue < 0) hue += 360;
    }
    if (l > 0.82 && s < 0.26) return 'white';
    if (l < 0.24) return 'black';
    if (s < 0.15) return l > 0.52 ? 'gray' : 'black';
    if (hue >= 12 && hue <= 48 && s > 0.24) return l > 0.46 ? 'orange' : 'tabby';
    if (s < 0.32) return l > 0.6 ? 'white' : 'gray';
    return l < 0.45 ? 'tabby' : 'orange';
  }

  function patternType(p) {
    const pattern = p.pattern || 'solid';
    if (pattern === 'pointed') return 'siamese';
    if (pattern === 'calico' || pattern === 'tortie') return 'calico';
    if (pattern === 'mask') return 'tuxedo';
    if (pattern === 'rosette' || pattern === 'rosette_big' || pattern === 'spotted' || pattern === 'cheetah') return 'leopard';
    if (pattern === 'tiger') return 'tiger';
    if (p.longhair || p.fluffy) return 'fluffy';
    if (p.hairless) return 'sphynx';
    const fam = colorFamily(p.fill || p.base);
    if (pattern === 'mackerel' || pattern === 'ticked') {
      if (fam === 'orange') return 'orange';
      if (fam === 'gray') return 'gray';
      if (fam === 'black') return 'black';
      return 'tabby';
    }
    return fam;
  }

  /* 品種の体つきの特徴（耳・毛・脚・尻尾）から、いちばん近い絵を選ぶ */
  function shapeType(p) {
    const ears = String(p.ears || '');
    if (ears === 'fold') return 'scottish';
    if (ears === 'curl') return 'curl';
    if (p.hairless) return 'sphynx';
    if (p.flat) return 'persian';
    if (p.curly) return 'rex';
    if (p.bobtail) return 'bobtail';
    if (p.longhair && (p.big || p.ruff >= 0.6 || p.tall)) return 'mainecoon';
    return null;
  }

  /* 引いた猫1匹 → アセットタイプ */
  function typeFor(cat) {
    if (!cat) return 'tabby';
    if (cat.klass === 'wild') {
      const k = cat.species ? cat.species.key : null;
      return WILD_MAP[k] || 'wildcat';
    }
    const key = String(cat.speciesKey || '');
    if (key.indexOf('coat:') === 0) {
      const k = key.slice(5);
      if (COAT_MAP[k]) return COAT_MAP[k];
    }
    if (key.indexOf('breed:') === 0) {
      const k = key.slice(6);
      if (BREED_MAP[k]) return BREED_MAP[k];
    }
    if (cat.special) return 'tuxedo';
    return shapeType(cat.pattern || {}) || patternType(cat.pattern || {});
  }

  function assetStage(stage) { return stage === 'kitten' ? 'kitten' : 'adult'; }

  function imgPath(type, stage) {
    return ASSET_DIR + (type || 'tabby') + '-' + assetStage(stage) + '.png' + ASSET_V;
  }

  function assetPath(cat, stage) {
    return imgPath(typeFor(cat), stage);
  }

  /* ---------- 場面 ---------- */
  const SCENE_CLASS = {
    room_warm: 'home', room_modern: 'home', temple: 'temple', bazaar: 'village',
    alley_jp: 'alley', alley_us: 'alley', street_eu: 'alley', street_br: 'alley',
    street_ru: 'alley', street_eg: 'alley', street_ma: 'alley', street_in: 'alley',
    street_asia: 'alley', street_tr: 'alley', snow_town: 'snow', village: 'village',
    village_tw: 'village', outback: 'desert',
    savanna: 'savanna', jungle: 'jungle', snow: 'snow', forest: 'forest',
    desert: 'desert', mountain: 'mountain', island: 'island', coast: 'coast', zoo: 'zoo'
  };

  function sceneClassOf(sc) {
    if (SCENE_CLASS[sc]) return SCENE_CLASS[sc];
    if (/^(street|alley)/.test(String(sc || ''))) return 'alley';
    return 'home';
  }

  function sceneKeyFor(cat, idx) {
    if (cat && cat.maneki && cat.adoptIndex != null && idx != null && idx >= cat.adoptIndex) return 'shop';
    if (cat && cat.adoptIndex != null && idx != null && idx >= cat.adoptIndex) return 'home';
    const sc = (cat && cat.scene) || 'room_warm';
    return sceneClassOf(sc);
  }

  function sceneLabel(key) {
    return {
      home: 'あたたかいおうち', shop: 'お店のレジ前', alley: '路地裏', village: '集落', snow: '雪の街',
      savanna: 'サバンナ', jungle: 'ジャングル', forest: '森', desert: '砂漠',
      mountain: '岩山', island: '島', coast: '海辺', zoo: '動物園', temple: '寺院'
    }[key] || 'どこか';
  }

  const PARTICLES = {
    home: ['✨', '🌸', '🎵'], shop: ['💰', '✨', '🏮'], alley: ['💧', '✨'], village: ['🍂', '✨'],
    snow: ['❄️', '✨'], savanna: ['🍂', '✨'], jungle: ['🍃', '💧'],
    forest: ['🍂', '🍃'], desert: ['✨', '🌙'], mountain: ['❄️', '✨'],
    island: ['💧', '🌈'], coast: ['💧', '✨'], zoo: ['✨', '🍃'],
    temple: ['🌸', '🍂'], finale: ['🌈', '✨', '⭐'],
    nekomata: ['🔮', '🌙', '✨'], maneki: ['💰', '🏮', '✨']
  };

  /* 季節のパーティクル（家・路地・集落など、季節がめぐる場所） */
  const SEASON_PARTICLES = {
    spring: ['🌸', '✨', '🌱'],
    summer: ['☀️', '🌻', '✨'],
    autumn: ['🍁', '🍂', '✨'],
    winter: ['❄️', '✨', '⛄']
  };
  const SEASON_SCENES = { home: 1, shop: 1, alley: 1, village: 1, temple: 1 };

  function particlesFor(cat, idx, dead) {
    if (dead) {
      if (cat && cat.nekomata) return PARTICLES.nekomata;
      if (cat && cat.maneki) return PARTICLES.maneki;
      return PARTICLES.finale;
    }
    if (cat && cat.nekomata && cat.story && idx != null && cat.story[idx] && cat.story[idx].age >= 100) return PARTICLES.nekomata;
    const key = sceneKeyFor(cat, idx);
    const step = cat && cat.story && idx != null ? cat.story[idx] : null;
    const season = step && step.season;
    if (season && SEASON_PARTICLES[season] && SEASON_SCENES[key]) return SEASON_PARTICLES[season];
    return PARTICLES[key] || PARTICLES.home;
  }

  /* 決定的な擬似乱数（同じ猫はいつも同じ表情） */
  function hash01(seed, n) {
    const x = Math.sin(((seed >>> 0) % 1000003) * 0.000017 + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function particlesHTML(cat, idx, dead) {
    const pool = particlesFor(cat, idx, dead);
    const seed = (cat && cat.seed) || 1;
    let out = '';
    for (let i = 0; i < 14; i++) {
      const ch = pool[i % pool.length];
      const left = Math.round(hash01(seed, i + 1) * 96) + 2;
      const dur = (7 + hash01(seed, i + 21) * 8).toFixed(1);
      const delay = (hash01(seed, i + 41) * 9).toFixed(1);
      const size = (11 + Math.round(hash01(seed, i + 61) * 10));
      const drift = Math.round((hash01(seed, i + 81) - 0.5) * 60);
      out += `<span style="left:${left}%;--dur:${dur}s;--delay:-${delay}s;--size:${size}px;--drift:${drift}px">${ch}</span>`;
    }
    return out;
  }

  /* ---------- ミニステータス ---------- */
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function statsFor(cat, idx) {
    const E = root.CATGACHA;
    if (E && E.statsAt) return E.statsAt(cat, idx);
    return { energy: 60, food: 60, luck: 60 };
  }

  function statsHTML(cat, idx) {
    const cur = statsFor(cat, idx);
    const prev = idx > 0 ? statsFor(cat, idx - 1) : cur;
    const dead = !!(cat && cat.story && cat.story[idx] && cat.story[idx].kind === 'death');
    const rows = [
      { k: 'energy', icon: '❤️', name: 'たいりょく', cls: 'hp' },
      { k: 'food', icon: '🐟', name: 'おなか', cls: 'food' },
      { k: 'luck', icon: '🍀', name: 'うん', cls: 'luck' }
    ];
    return rows.map(r => {
      const v = cur[r.k];
      const d = v - prev[r.k];
      const delta = idx > 0 && d !== 0
        ? `<em class="stat-delta ${d > 0 ? 'is-up' : 'is-down'}">${d > 0 ? '+' : ''}${d}</em>`
        : '';
      /* ステータスと運命の連動を、その場で小さく知らせる */
      let mod = '', flag = '';
      if (dead) { /* 最期のページではピンチ/空腹/幸運のサインは出さない */ }
      else if (r.k === 'energy' && v <= 20) { mod = ' is-pinch'; flag = 'ピンチ'; }
      else if (r.k === 'food' && v <= 20) { mod = ' is-hungry'; flag = '空腹'; }
      else if (r.k === 'luck' && v >= 70) { mod = ' is-lucky'; flag = '幸運'; }
      return `<div class="stat stat--${r.cls}${mod}"${flag ? ` data-flag="${flag}"` : ''}>
        <span class="stat-icon" aria-hidden="true">${r.icon}</span>
        <span class="stat-name">${r.name}</span>
        <span class="stat-bar"><i style="width:${v}%"></i></span>
        <b class="stat-value">${v}</b>${delta}
      </div>`;
    }).join('');
  }

  /* ---------- 吹き出し ---------- */
  const BUBBLES = ['にゃー♪', 'ごろごろ…', 'ふにゃ？', 'みゃう', 'にゃん！', 'ゴロゴロ'];
  const BUBBLE_EMOJI = ['❤️', '🎵', '✨', '💕', '🐾'];
  function bubbleFor(seed, n) {
    return {
      text: BUBBLES[Math.floor(hash01(seed, n * 3 + 1) * BUBBLES.length) % BUBBLES.length],
      emoji: BUBBLE_EMOJI[Math.floor(hash01(seed, n * 3 + 2) * BUBBLE_EMOJI.length) % BUBBLE_EMOJI.length]
    };
  }

  /* ---------- 鈴付き首輪 ----------
     26枚（13タイプ×子猫/成猫）それぞれの首元に合わせた座標マップ。
     座標は画像に対する % （x=中心x, y=中心y, w=帯の幅, r=回転deg）。
     tools/collar_map.py が画像のシルエットから首のくびれを推定し、
     目視で確認・微調整した値を書き出す（全26枚を1枚ずつ検証済み）。 */
  const COLLAR = {
    'tabby-kitten': { x: 45.9, y: 54.4, w: 37.5, r: 0.0 },
    'tabby-adult': { x: 44.3, y: 34.9, w: 27.6, r: 0.0 },
    'orange-kitten': { x: 54.2, y: 57.8, w: 38.3, r: 0.0 },
    'orange-adult': { x: 51.5, y: 37.5, w: 28.2, r: 0.0 },
    'black-kitten': { x: 48.4, y: 58.4, w: 34.7, r: 0.0 },
    'black-adult': { x: 44.6, y: 36.6, w: 27.4, r: 0.0 },
    'white-kitten': { x: 45.8, y: 60.5, w: 38.1, r: 0.0 },
    'white-adult': { x: 42.2, y: 37.5, w: 35.3, r: 0.0 },
    'calico-kitten': { x: 53.6, y: 56.9, w: 40.4, r: 0.0 },
    'calico-adult': { x: 52.0, y: 34.3, w: 24.1, r: 0.0 },
    'tuxedo-kitten': { x: 46.3, y: 58.2, w: 37.1, r: 0.0 },
    'tuxedo-adult': { x: 42.6, y: 36.5, w: 24.5, r: 0.0 },
    'gray-kitten': { x: 43.9, y: 57.4, w: 36.7, r: 0.0 },
    'gray-adult': { x: 41.2, y: 38.2, w: 27.4, r: 0.0 },
    'siamese-kitten': { x: 45.7, y: 58.5, w: 36.3, r: 0.0 },
    'siamese-adult': { x: 42.7, y: 36.9, w: 20.1, r: 0.0 },
    'fluffy-kitten': { x: 48.3, y: 50.2, w: 35.0, r: 0.0 },
    'fluffy-adult': { x: 37.9, y: 44.4, w: 34.0, r: 0.0 },
    'lion-kitten': { x: 49.3, y: 61.3, w: 31.8, r: 0.0 },
    'lion-adult': { x: 46.6, y: 51.5, w: 46.0, r: 0.0 },
    'tiger-kitten': { x: 54.4, y: 58.5, w: 35.7, r: 0.0 },
    'tiger-adult': { x: 54.4, y: 35.2, w: 25.6, r: 0.0 },
    'leopard-kitten': { x: 49.5, y: 53.2, w: 32.7, r: 0.0 },
    'leopard-adult': { x: 45.2, y: 45.7, w: 28.0, r: 0.0 },
    'wildcat-kitten': { x: 58.9, y: 53.2, w: 33.7, r: 0.0 },
    'wildcat-adult': { x: 57.6, y: 33.7, w: 22.5, r: 0.0 },
    'scottish-kitten': { x: 45.4, y: 51.7, w: 41.4, r: 0.0 },
    'scottish-adult': { x: 43.6, y: 36.8, w: 37.1, r: 0.0 },
    'sphynx-kitten': { x: 47.3, y: 52.9, w: 24.5, r: 0.0 },
    'sphynx-adult': { x: 44.5, y: 37.1, w: 16.6, r: 0.0 },
    'munchkin-kitten': { x: 43.5, y: 63.1, w: 50.0, r: 0.0 },
    'munchkin-adult': { x: 41.4, y: 56.2, w: 38.0, r: 0.0 },
    'persian-kitten': { x: 45.3, y: 53.8, w: 34.0, r: 0.0 },
    'persian-adult': { x: 39.0, y: 39.2, w: 38.0, r: 0.0 },
    'curl-kitten': { x: 46.6, y: 51.7, w: 38.1, r: 0.0 },
    'curl-adult': { x: 42.7, y: 36.7, w: 31.6, r: 0.0 },
    'russian-kitten': { x: 45.1, y: 53.7, w: 35.1, r: 0.0 },
    'russian-adult': { x: 40.4, y: 34.8, w: 23.5, r: 0.0 },
    'bengal-kitten': { x: 44.6, y: 52.1, w: 34.3, r: 0.0 },
    'bengal-adult': { x: 40.1, y: 35.0, w: 23.3, r: 0.0 },
    'abyssinian-kitten': { x: 47.7, y: 53.0, w: 27.5, r: 0.0 },
    'abyssinian-adult': { x: 44.7, y: 40.8, w: 20.0, r: 0.0 },
    'tortie-kitten': { x: 45.7, y: 54.8, w: 37.5, r: 0.0 },
    'tortie-adult': { x: 41.5, y: 35.9, w: 29.8, r: 0.0 },
    'mainecoon-kitten': { x: 42.6, y: 61.9, w: 45.4, r: 0.0 },
    'mainecoon-adult': { x: 39.4, y: 31.1, w: 30.8, r: 0.0 },
    'ragdoll-kitten': { x: 44.7, y: 52.8, w: 47.2, r: 0.0 },
    'ragdoll-adult': { x: 37.8, y: 31.1, w: 32.0, r: 0.0 },
    'bobtail-kitten': { x: 47.0, y: 52.8, w: 33.7, r: 0.0 },
    'bobtail-adult': { x: 41.6, y: 32.9, w: 20.5, r: 0.0 },
    'snowleopard-kitten': { x: 40.2, y: 47.3, w: 40.0, r: 0.0 },
    'snowleopard-adult': { x: 35.4, y: 31.8, w: 37.9, r: 0.0 },
    'cheetah-kitten': { x: 45.5, y: 48.4, w: 33.1, r: 0.0 },
    'cheetah-adult': { x: 42.3, y: 29.8, w: 20.7, r: 0.0 },
    'pallas-kitten': { x: 46.0, y: 54.7, w: 39.8, r: 0.0 },
    'pallas-adult': { x: 45.9, y: 49.5, w: 46.0, r: 0.0 },
    'serval-kitten': { x: 48.4, y: 49.7, w: 18.9, r: 0.0 },
    'serval-adult': { x: 45.9, y: 38.0, w: 16.4, r: 0.0 },
    'caracal-kitten': { x: 49.5, y: 53.5, w: 21.9, r: 0.0 },
    'caracal-adult': { x: 47.1, y: 46.9, w: 22.0, r: 0.0 },
    'puma-kitten': { x: 43.8, y: 48.4, w: 32.9, r: 0.0 },
    'puma-adult': { x: 37.8, y: 30.4, w: 26.2, r: 0.0 },
    'lynx-kitten': { x: 47.4, y: 62.6, w: 38.9, r: 0.0 },
    'lynx-adult': { x: 46.0, y: 54.3, w: 37.0, r: 0.0 },
    'rex-kitten': { x: 46.4, y: 51.4, w: 23.5, r: 0.0 },
    'rex-adult': { x: 40.0, y: 36.7, w: 13.2, r: 0.0 },
  };

  function collarFor(type, stage) {
    const key = (type || 'tabby') + '-' + (stage === 'kitten' ? 'kitten' : 'adult');
    return COLLAR[key] || COLLAR['tabby-adult'];
  }

  /* 首輪の位置を CSS 変数として書き出す（子猫↔成猫で座標が変わる） */
  function collarVars(type, stage) {
    const c = collarFor(type, stage);
    return `--collar-x:${c.x}%;--collar-y:${c.y}%;--collar-w:${c.w}%;--collar-r:${c.r}deg;`;
  }

  function collarHTML(idName) {
    /* 同じ画面に複数の猫を出す（図鑑の一覧など）ときは id を省く */
    const idAttr = (idName === false || idName === null) ? '' : ` id="${idName || 'collarBadge'}"`;
    return `<span class="collar"${idAttr} aria-hidden="true">
      <svg viewBox="0 0 120 52">
        <defs>
          <linearGradient id="collarBandG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#FF9FB0"/>
            <stop offset=".5" stop-color="#F1566F"/>
            <stop offset="1" stop-color="#C6304B"/>
          </linearGradient>
          <radialGradient id="collarBellG" cx="35%" cy="28%" r="78%">
            <stop offset="0" stop-color="#FFF6CC"/>
            <stop offset=".55" stop-color="#FFD35C"/>
            <stop offset="1" stop-color="#D2941A"/>
          </radialGradient>
        </defs>
        <path d="M6 12 C26 40 94 40 114 12" fill="none" stroke="#7A1730" stroke-width="13" stroke-linecap="round" opacity=".22"/>
        <path d="M6 12 C26 40 94 40 114 12" fill="none" stroke="url(#collarBandG)" stroke-width="9.6" stroke-linecap="round"/>
        <path d="M8.5 9.6 C27 35.5 93 35.5 111.5 9.6" fill="none" stroke="#FFD3DC" stroke-width="2.6" stroke-linecap="round" opacity=".78"/>
        <circle cx="60" cy="40" r="11" fill="url(#collarBellG)" stroke="#B47D14" stroke-width="2.2"/>
        <path d="M53 45.5 C57.5 48.6 62.5 48.6 67 45.5" fill="none" stroke="#B47D14" stroke-width="1.8" opacity=".85"/>
        <circle cx="60" cy="45.4" r="2.2" fill="#B47D14"/>
        <circle cx="56.4" cy="36.2" r="3" fill="#FFFDF2" opacity=".92"/>
      </svg>
      <span class="collar-spark">✨</span>
    </span>`;
  }

  /* ---------- 猫本体（子猫・成猫の2枚を持ち、成長でクロスフェード） ---------- */
  function actorHTML(cat, opts) {
    opts = opts || {};
    const stage = opts.stage || 'kitten';
    const kittenOn = stage === 'kitten';
    const t = typeFor(cat);
    const alt = (cat && (cat.speciesName || cat.name)) || '猫';
    return `<div class="cat-art ${kittenOn ? 'is-kitten' : 'is-adult'}" id="catArt" data-type="${t}" style="${collarVars(t, stage)}">
      <div class="cat-scale">
        <span class="nekomata-tail" aria-hidden="true"><svg viewBox="0 0 90 150">
          <path d="M22 146 C-2 112 10 74 42 58 C64 47 70 28 62 8" fill="none" stroke="#7FB4FF" stroke-width="9" stroke-linecap="round" opacity=".95"/>
          <path d="M22 146 C-2 112 10 74 42 58 C64 47 70 28 62 8" fill="none" stroke="#DCEBFF" stroke-width="3.4" stroke-linecap="round"/>
          <circle cx="62" cy="8" r="4.4" fill="#BFE0FF"/>
        </svg></span>
        <span class="maneki-cushion" aria-hidden="true"></span>
        <span class="maneki-koban k1" aria-hidden="true">💰</span>
        <span class="maneki-koban k2" aria-hidden="true">🪙</span>
        <img class="cat-img cat-img--kitten ${kittenOn ? 'is-on' : ''}" id="catImgKitten" src="${imgPath(t, 'kitten')}" alt="${escapeAttr(alt)}の子猫" draggable="false" decoding="async" onerror="this.onerror=null;this.src=this.src.split('?')[0]">
        <img class="cat-img cat-img--adult ${kittenOn ? '' : 'is-on'}" id="catImgAdult" src="${imgPath(t, 'adult')}" alt="${escapeAttr(alt)}の成猫" draggable="false" decoding="async" onerror="this.onerror=null;this.src=this.src.split('?')[0]">
        ${collarHTML()}
        <span class="growth-spark" aria-hidden="true">✨</span>
      </div>
      <div class="bubble-layer" id="bubbleLayer" aria-hidden="true"></div>
    </div>`;
  }

  /* ---------- 静止画（図鑑の過去の猫生：一覧のサムネイル・詳細のイラスト） ----------
     その子の最終的な姿（成長後ステージ＋首輪・猫又・招き猫）を1枚で再現する。
     type は assets/cats のタイプ名（actorHTML と同じ絵柄）。 */
  function stillHTML(type, opts) {
    opts = opts || {};
    const t = (typeof type === 'string' && type) ? type : 'tabby';
    const stage = opts.stage === 'kitten' ? 'kitten' : 'adult';
    const cls = ['cat-still', stage === 'kitten' ? 'is-kitten' : 'is-adult'];
    if (opts.collar) cls.push('is-collar');
    if (opts.nekomata) cls.push('is-nekomata');
    if (opts.maneki) cls.push('is-maneki');
    if (opts.senior) cls.push('is-senior');
    if (opts.cls) cls.push(opts.cls);
    return `<div class="${cls.join(' ')}" data-type="${escapeAttr(t)}" style="${collarVars(t, stage)}">
      <span class="nekomata-tail" aria-hidden="true"><svg viewBox="0 0 90 150">
        <path d="M22 146 C-2 112 10 74 42 58 C64 47 70 28 62 8" fill="none" stroke="#7FB4FF" stroke-width="9" stroke-linecap="round" opacity=".95"/>
        <path d="M22 146 C-2 112 10 74 42 58 C64 47 70 28 62 8" fill="none" stroke="#DCEBFF" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="62" cy="8" r="4.4" fill="#BFE0FF"/>
      </svg></span>
      <span class="maneki-cushion" aria-hidden="true"></span>
      <span class="maneki-koban k1" aria-hidden="true">💰</span>
      <span class="maneki-koban k2" aria-hidden="true">🪙</span>
      <img class="still-img" src="${imgPath(t, stage)}" alt="${escapeAttr(opts.alt || '猫')}" draggable="false" decoding="async" onerror="this.onerror=null;this.src=this.src.split('?')[0]">
      ${collarHTML(false)}
    </div>`;
  }

  /* ホームのプレビュー */
  function heroHTML(cat) {
    const t = cat ? typeFor(cat) : 'tabby';
    return `<div class="hero-cat">
      <img class="hero-img" src="${imgPath(t, 'kitten')}" alt="子猫のイラスト" draggable="false" onerror="this.onerror=null;this.src=this.src.split('?')[0]">
      <span class="hero-shadow" aria-hidden="true"></span>
    </div>`;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  const api = {
    ASSET_DIR, ASSET_V, TYPES, WILD_MAP, COAT_MAP, BREED_MAP,
    typeFor, shapeType, assetPath, imgPath, assetStage, patternType, colorFamily,
    sceneKeyFor, sceneLabel, sceneClassOf, particlesFor, particlesHTML,
    statsFor, statsHTML, bubbleFor, collarHTML, actorHTML, stillHTML, heroHTML,
    COLLAR, collarFor, collarVars
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CATART = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
