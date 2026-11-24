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
    if (season && SEASON_PARTICLES[season]) {
      /* 室内・街中は季節の舞うものを主役に。屋外は季節＋その土地のしるしを混ぜる */
      if (key === 'alley' && season === 'summer') return ['🎐', '✨', '🌙'];  /* 夜の路地に真昼の太陽は合わない */
      if (SEASON_SCENES[key]) return SEASON_PARTICLES[season];
      const base = PARTICLES[key] || PARTICLES.home;
      return SEASON_PARTICLES[season].slice(0, 2).concat(base.slice(0, 1));
    }
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
      const size = (9 + Math.round(hash01(seed, i + 61) * 6));
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

  /* 育った気質ごとの口ぐせ。タップしたとき・歩いたときのセリフが変わる */
  const TRAIT_LINES = {
    amae: { emoji: '💕', lines: ['なでて〜', 'おうちまだ？', 'そばにいて', 'ここがいいの', 'もっと近く'] },
    solo: { emoji: '🌙', lines: ['べつに寂しくないし', '自分の道を行く', 'ひとりの方がいい', '気にしない', 'こっちに来ないで'] },
    foodie: { emoji: '🍚', lines: ['ごはんまだかな', 'いい匂いする！', 'おかわりある？', 'たべものの夢', 'ここ、なんかある'] },
    brave: { emoji: '⚡', lines: ['いってくる！', 'あっちが気になる', 'まけないぞ', 'たかく昇る', 'まずは自分で見てくる'] },
    easy: { emoji: '☕', lines: ['ねむい…', 'ま、いっか', 'ひなたでねる', 'ゆっくりいこう', 'あわてない'] }
  };
  const BOSS_LINES = ['この道はおれのもの', 'どけどけ', 'みんな見てる', 'ここを通るなら、挨拶しろ', 'おれがこの辺りの主だ'];

  function bubbleFor(seed, n, persona) {
    const k = (n || 0);
    const boss = persona && persona.boss;
    if (boss && hash01(seed, k * 7 + 3) < 0.62) {
      return {
        text: BOSS_LINES[Math.floor(hash01(seed, k * 7 + 1) * BOSS_LINES.length) % BOSS_LINES.length],
        emoji: '👑'
      };
    }
    const set = persona && persona.key ? TRAIT_LINES[persona.key] : null;
    if (set) {
      return {
        text: set.lines[Math.floor(hash01(seed, k * 3 + 1) * set.lines.length) % set.lines.length],
        emoji: set.emoji
      };
    }
    return {
      text: BUBBLES[Math.floor(hash01(seed, n * 3 + 1) * BUBBLES.length) % BUBBLES.length],
      emoji: BUBBLE_EMOJI[Math.floor(hash01(seed, n * 3 + 2) * BUBBLE_EMOJI.length) % BUBBLE_EMOJI.length]
    };
  }

  /* 歩いたときのひとこと（気質・ボス・季節から決定的に選ぶ） */
  function speechFor(cat, idx, persona) {
    const seed = (cat && cat.seed) || 1;
    const i = idx || 0;
    if (persona && persona.boss && hash01(seed, i * 11 + 5) < 0.5) {
      return { text: BOSS_LINES[Math.floor(hash01(seed, i * 11 + 2) * BOSS_LINES.length) % BOSS_LINES.length], emoji: '👑' };
    }
    const set = persona && persona.key ? TRAIT_LINES[persona.key] : null;
    if (set) {
      return { text: set.lines[Math.floor(hash01(seed, i * 5 + 2) * set.lines.length) % set.lines.length], emoji: set.emoji };
    }
    return bubbleFor(seed, i + 1, persona);
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
        <span class="cat-breath" aria-hidden="true"></span>
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
    statsFor, statsHTML, bubbleFor, speechFor, TRAIT_LINES, BOSS_LINES,
    collarHTML, actorHTML, stillHTML, heroHTML,
    COLLAR, collarFor, collarVars
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CATART = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);


/* ============================================================
   手描きの風景（ステージの背景）
   480px を1周期にした4枚の帯（遠景・中景・地面・近景）を左へ流す。
   オートで進んでいる間は流れ続け、1歩ごとの歩みでも必ず動く。
   絵は「サインペンで描いてクレヨンで塗った」線の太い絵本調。
   ============================================================ */
(function (root) {
  'use strict';

  const INK = '#3a2a1e';

  /* 場面ごとの色 */
  const P = {
    home: {
      sky1: '#fdf3de', sky2: '#f6e0bb', far: '#f0d6ac', mid: '#d9ac78', near: '#b98452',
      leaf: '#8fae62', trunk: '#8a5f3a', roof: '#bf7350', wall: '#eccfa4', ground: '#d9b381', lit: '#ffd98a'
    },
    shop: {
      sky1: '#fbead2', sky2: '#f2d3a5', far: '#eccb9d', mid: '#d49a60', near: '#a8703f',
      leaf: '#83a260', trunk: '#7f5634', roof: '#b0523a', wall: '#efd3a6', ground: '#d7a46d', lit: '#ffd07a'
    },
    alley: {
      sky1: '#3a4b68', sky2: '#1d2839', far: '#2b3a54', mid: '#202c40', near: '#141d2b',
      leaf: '#3f5a4a', trunk: '#3a2d22', roof: '#243349', wall: '#33445f', ground: '#2c3547', lit: '#ffd489'
    },
    village: {
      sky1: '#fde8c4', sky2: '#f3c88e', far: '#e0bb8e', mid: '#c98f5c', near: '#96643c',
      leaf: '#7fa763', trunk: '#8b5f39', roof: '#b0603f', wall: '#f0d7b0', ground: '#cfa471', lit: '#ffd98a'
    },
    temple: {
      sky1: '#fde8ca', sky2: '#f1cba4', far: '#e3c0a0', mid: '#b87053', near: '#8a5133',
      leaf: '#6f9455', trunk: '#7c5232', roof: '#a83f2f', wall: '#e8cba6', ground: '#d5ae84', lit: '#ffd489'
    },
    forest: {
      sky1: '#eff6e2', sky2: '#d5e8bf', far: '#c2d8ab', mid: '#8fb174', near: '#5c7c4d',
      leaf: '#6f9b58', trunk: '#7a5636', roof: '#7d6a45', wall: '#d9c69c', ground: '#86a266', lit: '#ffe9a8'
    },
    jungle: {
      sky1: '#e6f5d5', sky2: '#b6dc9c', far: '#98c785', mid: '#5b9a5e', near: '#3a6e42',
      leaf: '#3f7f4a', trunk: '#5f4630', roof: '#5c7a41', wall: '#c8b98c', ground: '#5a8a50', lit: '#fff0b0'
    },
    savanna: {
      sky1: '#fff2cf', sky2: '#f8d791', far: '#e8c78f', mid: '#c29456', near: '#96703c',
      leaf: '#8f9c52', trunk: '#7d5a34', roof: '#a98049', wall: '#ddc191', ground: '#d8ae68', lit: '#ffe6a0'
    },
    desert: {
      sky1: '#fdf2d9', sky2: '#f8e0b2', far: '#eed3a3', mid: '#d9b47d', near: '#b08a55',
      leaf: '#8a9a55', trunk: '#8a6a3c', roof: '#c9a06a', wall: '#e8cda0', ground: '#e8c78e', lit: '#fff0c0'
    },
    snow: {
      sky1: '#f2f9ff', sky2: '#dbeaf6', far: '#cfe0ec', mid: '#95b0a4', near: '#5d7a6a',
      leaf: '#4f7060', trunk: '#6b5440', roof: '#8a9aa8', wall: '#f7fbff', ground: '#ffffff', lit: '#fff3c8'
    },
    mountain: {
      sky1: '#eef5fa', sky2: '#d3e2ec', far: '#c3d4e0', mid: '#93a6b2', near: '#65787f',
      leaf: '#5c7a6c', trunk: '#6b5440', roof: '#7f8a94', wall: '#c9d6de', ground: '#cbd9e1', lit: '#fff3c8'
    },
    island: {
      sky1: '#f0fdfb', sky2: '#c9eff0', far: '#a9ded4', mid: '#5fa89a', near: '#3a7a70',
      leaf: '#4f9f74', trunk: '#8a6a44', roof: '#c08a54', wall: '#f3e3bb', ground: '#f3e5bb', lit: '#fff3c0'
    },
    coast: {
      sky1: '#f3fbff', sky2: '#d3eaf6', far: '#b0d9e8', mid: '#6fabbf', near: '#41758b',
      leaf: '#579a76', trunk: '#8a6a44', roof: '#c07a52', wall: '#f4e6c4', ground: '#f3e6c2', lit: '#fff3c0'
    },
    zoo: {
      sky1: '#f6f8ee', sky2: '#e3ead7', far: '#cdd9c3', mid: '#93a582', near: '#637555',
      leaf: '#7a9c62', trunk: '#7a5c3e', roof: '#8a7a58', wall: '#dcd6bd', ground: '#cfd9c1', lit: '#ffe9a8'
    },
    finale: {
      sky1: '#fff7e2', sky2: '#ffe9f0', far: '#f7dcc8', mid: '#ecc0ad', near: '#d09380',
      leaf: '#8fae6a', trunk: '#8a6a44', roof: '#d08a6a', wall: '#f8e8c8', ground: '#f4e4c8', lit: '#fff3b0'
    }
  };

  const ink = (d, fill, w) =>
    `<path d="${d}" fill="${fill || 'none'}" stroke="${INK}" stroke-width="${w || 2.6}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const seg = (d, w) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w || 2.2}" stroke-linecap="round"/>`;
  const G = (x, y, inner, s) => `<g transform="translate(${x},${y})${s ? ' scale(' + s + ')' : ''}">${inner}</g>`;

  /* ---------- 部品（すべて足もとが y=0） ---------- */

  /* まるい木 */
  function tree(x, y, s, c, leaf) {
    const L = leaf || c.leaf;
    return G(x, y, `
      ${ink('M-5 0 q2 -20 0 -40 l10 0 q-2 20 0 40 z', c.trunk)}
      ${ink('M-32 -38 q-10 -22 8 -30 q4 -20 24 -14 q22 -8 26 14 q20 10 8 26 q8 20 -14 22 q-16 12 -30 0 q-22 2 -22 -18 z', L)}
      ${seg('M-16 -54 q10 -8 22 -2', 2)}
      ${seg('M4 -32 q12 -6 20 2', 2)}
      ${ink('M-26 -20 q4 8 14 8', 'none', 1.6)}
    `, s);
  }

  /* 松 */
  function pine(x, y, s, c, leaf) {
    const L = leaf || c.leaf;
    return G(x, y, `
      ${ink('M-3 0 v-12 l6 0 v12 z', c.trunk)}
      ${ink('M0 -10 L-18 -10 L-9 -32 L-15 -32 L0 -58 L15 -32 L9 -32 L18 -10 Z', L)}
      ${seg('M0 -54 v40', 1.8)}
    `, s);
  }

  /* ヤシ */
  function palm(x, y, s, c) {
    return G(x, y, `
      ${seg('M0 0 q-8 -30 2 -62', 6)}
      ${ink('M2 -62 q-22 -12 -32 6 q18 -4 30 0 z', c.leaf, 2.2)}
      ${ink('M2 -62 q22 -14 32 4 q-18 -2 -30 2 z', c.leaf, 2.2)}
      ${ink('M2 -62 q-6 -22 -22 -26 q8 16 16 24 z', c.leaf, 2.2)}
      ${ink('M2 -62 q8 -22 24 -24 q-10 14 -18 22 z', c.leaf, 2.2)}
      ${ink('M0 -60 q-2 -14 -6 -20', 'none', 2)}
      <circle cx="0" cy="-56" r="3.4" fill="#8a5f32" stroke="${INK}" stroke-width="1.6"/>
      <circle cx="7" cy="-53" r="3" fill="#8a5f32" stroke="${INK}" stroke-width="1.6"/>
    `, s);
  }

  /* 家 */
  function house(x, y, s, c, o) {
    o = o || {};
    return G(x, y, `
      ${ink('M-36 0 v-44 h72 v44 z', o.wall || c.wall)}
      ${ink('M-44 -44 L0 -76 L44 -44 Z', o.roof || c.roof)}
      ${ink('M-9 0 v-22 h18 v22 z', '#7d5333', 2.2)}
      <circle cx="5" cy="-11" r="1.6" fill="${INK}"/>
      ${ink('M-30 -36 h16 v15 h-16 z', c.lit, 2)}
      ${seg('M-22 -36 v15 M-30 -28.5 h16', 1.4)}
      ${ink('M14 -60 h9 v14 h-9 z', o.roof || c.roof, 2)}
      ${seg('M-16 -70 q6 -8 0 -14', 1.8)}
      ${seg('M-8 -72 q6 -8 0 -12', 1.6)}
    `, s);
  }

  /* ビル（夜の街） */
  function building(x, y, w, h, c, lit) {
    let wins = '';
    for (let r = 0; r < Math.floor((h - 14) / 20); r++) {
      for (let col = 0; col < Math.floor((w - 10) / 18); col++) {
        const wx = 8 + col * 18;
        const wy = -h + 12 + r * 20;
        if ((r * 3 + col * 5 + x) % 4 === 0) continue;
        wins += `<rect x="${wx}" y="${wy}" width="9" height="11" rx="1" fill="${lit}" opacity=".9"/>`;
      }
    }
    return `<g transform="translate(${x},${y})">
      ${ink(`M0 0 v-${h} h${w} v${h} z`, c.wall, 2.8)}
      ${wins}
      ${seg(`M0 -${h * 0.55} h${w}`, 1.6)}
      ${ink(`M${w * 0.65} -${h} v-10 h${w * 0.22} v10 z`, c.roof, 2)}
    </g>`;
  }

  /* 電柱と電線 */
  function pole(x, y, c) {
    return G(x, y, `
      ${ink('M-3 0 v-108 l6 0 v108 z', c.near)}
      ${seg('M-22 -96 h44', 4)}
      ${seg('M-16 -96 v-8 M16 -96 v-8', 3)}
      ${ink('M-6 -108 h12 v-6 h-12 z', c.roof, 1.8)}
      ${seg('M-70 -102 q40 -14 76 -2', 1.6)}
      ${seg('M6 -104 q48 -8 84 4', 1.6)}
      ${ink('M-24 -60 h16 v18 h-16 z', c.roof, 2)}
      ${seg('M-22 -60 v18 M-24 -51 h16', 1.2)}
    `);
  }

  /* 塀（レンガ） */
  function wall(x, y, w, c, h) {
    h = h || 34;
    let bricks = '';
    for (let r = 1; r < 3; r++) bricks += `<path d="M0 ${-h + r * (h / 3)} h${w}" stroke="${INK}" stroke-width="1.2" fill="none"/>`;
    for (let i = 0; i < w / 22; i++) {
      bricks += `<path d="M${i * 22 + (i % 2 ? 11 : 0)} ${-h + (i % 2 ? h / 3 : 0)} v${h / 3}" stroke="${INK}" stroke-width="1.2"/>`;
    }
    return `<g transform="translate(${x},${y})">
      ${ink(`M0 0 v-${h} h${w} v${h} z`, c.mid, 2.4)}
      ${bricks}
      ${ink(`M-3 -${h} h${w + 6} v-5 h-${w + 6} z`, c.near, 2)}
    </g>`;
  }

  /* 柵 */
  function fence(x, y, w, c, h) {
    h = h || 26;
    let out = G(x, y, ink(`M0 0 v-${h} M${w} 0 v-${h}`, 'none', 3), null);
    out = `<g transform="translate(${x},${y})">${seg(`M0 -2 v-${h}`, 3.2)}${seg(`M${w} -2 v-${h}`, 3.2)}`;
    for (let i = 1; i < w / 16; i++) out += seg(`M${i * 16} 0 v-${h}`, 2.2);
    out += seg(`M-2 -${h * 0.72} h${w + 4}`, 2.6) + seg(`M-2 -${h * 0.32} h${w + 4}`, 2.2) + `</g>`;
    return out;
  }

  /* 草むら */
  function bush(x, y, s, c, leaf) {
    const L = leaf || c.leaf;
    return G(x, y, `
      ${ink('M-26 0 q-10 -16 2 -22 q-2 -16 16 -14 q6 -14 20 -4 q16 -6 16 12 q12 8 2 20 q4 10 -14 8 q-16 4 -22 -2 q-14 6 -20 2 z', L)}
      ${seg('M-10 -14 q6 -8 14 -4', 1.6)}
    `, s);
  }

  /* 岩 */
  function rock(x, y, s, c) {
    return G(x, y, `
      ${ink('M-20 0 l-4 -14 l10 -12 l16 0 l12 10 l-2 16 z', c.mid)}
      ${seg('M-14 -14 l8 8 M2 -22 l4 10', 1.4)}
    `, s);
  }

  /* 砂丘・丘の稜線（1タイル分・両端は同じ高さ） */
  function hills(color, yBase, amps) {
    const a = amps || [26, 40, 18, 34];
    let d = `M0 ${yBase - a[0]}`;
    const pts = [[0, yBase - a[0], 60, yBase - a[0] - 18, 120, yBase - a[1]],
                 [120, yBase - a[1], 180, yBase - a[1] - 14, 240, yBase - a[2]],
                 [240, yBase - a[2], 300, yBase - a[2] - 20, 360, yBase - a[3]],
                 [360, yBase - a[3], 420, yBase - a[3] - 10, 480, yBase - a[0]]];
    pts.forEach(p => { d += ` Q${p[2]} ${p[3]} ${p[4]} ${p[5]}`; });
    d += ` L480 ${yBase + 60} L0 ${yBase + 60} Z`;
    return ink(d, color, 2.4);
  }

  /* 山なみ（雪をかぶった峰） */
  function peaks(c, snowy) {
    const base = 120;
    const d = `M0 ${base} L0 96 L44 52 L76 84 L118 30 L166 88 L206 60 L248 96 L292 44 L330 82 L372 24 L414 78 L446 58 L480 92 L480 ${base} Z`;
    let out = ink(d, snowy ? '#ffffff' : c.far, 2.4);
    out += seg(`M118 30 L98 52 L112 50 L122 58 L138 46`, 1.6);
    out += seg(`M372 24 L352 48 L366 44 L378 54 L392 40`, 1.6);
    if (!snowy) {
      out += ink('M60 96 L96 66 L130 96 Z', c.mid, 2);
      out += ink('M250 96 L286 70 L318 96 Z', c.mid, 2);
    }
    return out;
  }

  /* 海（遠景の帯） */
  function sea(c, y0) {
    const y = y0 || 88;
    let out = `<path d="M0 ${y} h480 v${140 - y} h-480 z" fill="${c.mid}" opacity=".5"/>`;
    out += seg(`M0 ${y} h480`, 2.4);
    for (let i = 0; i < 4; i++) {
      out += seg(`M${i * 120 + 8} ${y + 8 + i % 2 * 4} q14 -6 28 0 q14 6 28 0 q14 -6 28 0`, 2);
    }
    out += seg(`M0 ${y + 27} q20 -5 40 0 q20 5 40 0 q20 -5 40 0 q20 5 40 0 q20 -5 40 0 q20 5 40 0 q20 -5 40 0 q20 5 40 0 q20 -5 40 0 q20 5 40 0 q20 -5 40 0 q20 5 40 0`, 1.6);
    return out;
  }

  /* 月・星・雲 */
  function moon(x, y, r) {
    return G(x, y, `
      <circle r="${r + 7}" fill="#f6e3a8" opacity=".22"/>
      <circle r="${r}" fill="#f8e6b0" stroke="${INK}" stroke-width="2.4"/>
      <circle cx="-${r * 0.3}" cy="-${r * 0.2}" r="${r * 0.2}" fill="#e8d093" opacity=".8"/>
      <circle cx="${r * 0.3}" cy="${r * 0.3}" r="${r * 0.14}" fill="#e8d093" opacity=".8"/>
    `);
  }
  function star(x, y, s) {
    return G(x, y, `<path d="M0 ${-5 * s} L${1.6 * s} ${-1.6 * s} L${5 * s} 0 L${1.6 * s} ${1.6 * s} L0 ${5 * s} L${-1.6 * s} ${1.6 * s} L${-5 * s} 0 L${-1.6 * s} ${-1.6 * s} Z" fill="${INK}" opacity=".65"/>`);
  }
  function cloud(x, y, s) {
    return G(x, y, `
      ${ink(`M-34 0 q-4 -16 12 -18 q2 -18 20 -14 q10 -16 26 -4 q18 -4 18 12 q14 4 8 18 q-4 8 -18 6 q-30 6 -66 0 z`, '#fffdf3', 2.2)}
    `, s || 1);
  }

  /* 段ボール・ゴミ袋・水たまり（路地の小物） */
  function trash(x, y, s, c) {
    return G(x, y, `
      ${ink('M-16 0 q-6 -18 8 -20 q10 -10 20 0 q14 2 8 20 z', c.near, 2.2)}
      ${seg('M-8 -18 q8 6 18 0', 1.8)}
      ${ink('M18 0 q-2 -12 8 -12 l10 2 q6 10 2 10 z', c.roof, 2)}
    `, s);
  }
  function puddle(x, y, w) {
    return G(x, y, `
      ${ink(`M-${w} 0 q-6 -8 8 -9 q10 -8 ${w} -4 q${w} -2 ${w * 2 - 8} 4 q12 2 4 9 q-${w * 2} 6 -${w * 2} 0 z`, 'rgba(150,200,230,.5)', 1.8)}
    `.replace(/q-(\d+)/g, 'q-$1'));
  }

  /* 土・草の帯（足もと） */
  function groundBand(c, style) {
    let out = `<rect x="0" y="0" width="480" height="30" fill="${c.ground}"/>`;
    out += seg('M0 3 h480', 2.6);
    if (style === 'wood') {
      out += seg('M0 3 h480', 2.6);
      for (let i = 0; i < 9; i++) {
        out += `<path d="M${i * 54 + 10} 3 v27" stroke="${INK}" stroke-width="1.4"/>`;
        out += `<path d="M${i * 54 + 28} 16 h22" stroke="${INK}" stroke-width="1.1" opacity=".5"/>`;
      }
    } else if (style === 'grass') {
      for (let i = 0; i < 24; i++) {
        const x = i * 20 + 4;
        out += `<path d="M${x} 30 q2 -10 6 -13 M${x + 6} 30 q0 -8 5 -11" stroke="${INK}" stroke-width="1.4" fill="none" opacity=".55"/>`;
      }
    } else if (style === 'sand') {
      for (let i = 0; i < 6; i++) out += seg(`M${i * 80 + 10} 20 q20 -6 40 0 q20 6 30 0`, 1.2);
    } else {
      out += seg('M0 16 h480', 1.3);
      for (let i = 0; i < 6; i++) out += `<path d="M${i * 80 + 12} 16 v14" stroke="${INK}" stroke-width="1.3"/>`;
      out += `<path d="M60 24 q14 6 28 0 M300 24 q14 6 28 0" stroke="${INK}" stroke-width="1.4" fill="none" opacity=".45"/>`;
    }
    return out;
  }

  /* ---------- 帯の組み立て ---------- */
  const BOTTOM = { 'scene-far': 46, 'scene-mid': 30, 'scene-ground': 0, 'scene-near': 0 };
  /* 歩く速さ（1周期480pxにかかる秒数）。遠いほどゆっくり＝視差 */
  const SPEED = { 'scene-far': 24, 'scene-mid': 8, 'scene-ground': 3.4, 'scene-near': 4.8 };
  function band(cls, h, inner, dur, bottom, bottomPx) {
    const b = bottomPx != null ? bottomPx : (BOTTOM[cls] != null ? BOTTOM[cls] : bottom);
    const d = SPEED[cls] != null ? SPEED[cls] : dur;
    return `<span class="scene-layer ${cls}" style="--band-h:${h}px;--band-b:${b}px">`
      + `<span class="par-track" style="--dur:${d}s">${forTrack(h, inner)}</span></span>`;
  }
  function forTrack(h, inner) {
    return `<svg viewBox="0 0 480 ${h}" width="480" height="${h}" aria-hidden="true" focusable="false">${inner}</svg>`
      + `<svg viewBox="0 0 480 ${h}" width="480" height="${h}" aria-hidden="true" focusable="false">${inner}</svg>`;
  }

  /* ---------- 場面 ----------
     どの場面も「空 → 遠景の稜線 → 地面に立つ物 → 足もとの草」の順で重ねる。
     物の足もとは地面の線に合わせ、影を落として「置いてある」ように見せる。 */

  /* 物の足もとの影 */
  function shadow(x, y, rx) {
    return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${Math.max(2, rx * 0.16)}" fill="${INK}" opacity=".13"/>`;
  }

  /* 空の飾り（動かない層） */
  function sky(key, c) {
    const parts = [];
    if (key === 'alley') {
      parts.push(moon(316, 30, 12));
      parts.push(star(250, 20, 1.1), star(370, 58, .9), star(96, 26, .8), star(424, 24, .7));
    } else if (key === 'island' || key === 'coast') {
      parts.push(`<circle cx="392" cy="30" r="15" fill="#ffe8a6" stroke="${INK}" stroke-width="2.4"/>`);
      parts.push(cloud(120, 36, .8));
    } else if (key === 'snow' || key === 'mountain') {
      parts.push(`<circle cx="378" cy="28" r="13" fill="#fff6d8" stroke="${INK}" stroke-width="2.2" opacity=".9"/>`);
      parts.push(cloud(110, 30, .75));
    } else if (key === 'finale') {
      parts.push(cloud(70, 40, 1), cloud(394, 30, .85), cloud(250, 20, .7));
    } else {
      parts.push(`<circle cx="386" cy="26" r="14" fill="${c.lit}" stroke="${INK}" stroke-width="2.4" opacity=".85"/>`);
      parts.push(cloud(96, 30, .8));
    }
    return `<span class="scene-sky" aria-hidden="true"><svg viewBox="0 0 480 196" preserveAspectRatio="xMidYMid slice">${parts.join('')}</svg></span>`;
  }

  /* おうち（室内） */
  function home(c) {
    const far = band('scene-far', 108, `
      ${ink('M36 96 h66 v-36 h-66 z', c.far)}
      ${ink('M45 88 h20 v-14 h-20 z', '#fffaf0', 1.8)}
      ${seg('M55 74 v14 M45 81 h20', 1.2)}
      ${ink('M150 96 h40 v-26 h-40 z', c.far)}
      ${seg('M158 82 h24 M158 90 h16', 1.4)}
      ${G(250, 96, `
        <circle r="23" fill="${c.lit}" stroke="${INK}" stroke-width="2.4"/>
        ${seg('M0 0 v-15 M0 0 l11 5', 2)}
        ${seg('M-23 0 a23 23 0 0 1 46 0', 1.2)}
      `)}
      ${ink('M312 96 h74 v-6 h-74 z', c.near, 2.2)}
      ${ink('M322 90 v-16 h14 v16', c.roof, 1.8)}
      ${ink('M344 90 v-22 h12 v22', c.leaf, 1.8)}
      ${ink('M364 90 v-12 h14 v12', c.far, 1.8)}
      ${ink('M406 96 h34 v-40 h-34 z', c.far)}
      ${ink('M414 66 h18 v16 h-18 z', '#e7f2f7', 1.6)}
    `, 26, 22) + band('scene-mid', 104, `
      ${shadow(92, 104, 44)}
      ${ink('M34 104 v-46 h116 v46 z', c.mid)}
      ${seg('M34 70 h116', 2)}
      ${ink('M50 104 v-24 h28 v24', '#e8cba4', 1.8)}
      ${ink('M88 104 v-24 h28 v24', '#e8cba4', 1.8)}
      ${ink('M126 104 v-24 h18 v24', '#e8cba4', 1.8)}
      ${seg('M92 78 q0 -14 12 -14 q12 0 12 14', 1.6)}
      ${G(214, 104, `
        ${ink('M-6 0 v-52', c.trunk, 5)}
        ${ink('M-24 -50 q-6 -18 10 -20 q4 -14 20 -8 q16 -2 12 14 q12 10 0 16 q-8 8 -20 2 q-16 4 -22 -4 z', c.leaf, 2.2)}
        ${ink('M-16 0 h32 l-3 -12 h-26 z', c.roof, 1.8)}
      `)}
      ${G(334, 104, `
        ${shadow(0, 0, 26)}
        ${ink('M-20 0 v-12 h40 v12 z', '#e8cba4', 1.8)}
        ${ink('M-3 0 v-34 h6 v34', c.trunk, 3)}
        ${ink('M-16 -34 h32 v-5 h-32 z', '#e8cba4', 1.6)}
      `)}
    `, 13, 15) + band('scene-ground', 32, groundBand(c, 'wood'), 4.1, 0) + band('scene-near', 44, `
      ${G(28, 44, `
        ${ink('M-22 0 q-4 -14 6 -16 q-2 -12 14 -10 q16 -2 14 10 q10 2 6 16 z', c.roof, 2.2)}
        ${seg('M-14 -4 q4 -6 10 -2', 1.4)}
      `)}
      ${G(232, 44, `
        <circle cx="0" cy="-10" r="12" fill="${c.lit}" stroke="${INK}" stroke-width="2.2"/>
        ${seg('M-8 -12 q6 8 14 2 M-6 -4 q8 6 14 -2', 1.3)}
      `)}
      ${bush(360, 44, .72, c)}
    `, 6.2, 0);
    return sky('home', c) + far;
  }

  /* お店のレジ前 */
  function shop(c) {
    const far = band('scene-far', 108, `
      ${ink('M10 46 h150 v62 h-150 z', c.far)}
      ${seg('M10 66 h150 M10 88 h150', 1.6)}
      ${ink('M24 50 h22 v12 h-22 z', c.lit, 1.6)}
      ${ink('M58 50 h16 v12 h-16 z', c.lit, 1.6)}
      ${ink('M88 50 h24 v12 h-24 z', c.lit, 1.6)}
      ${ink('M124 50 h20 v12 h-20 z', c.lit, 1.6)}
      ${ink('M188 96 h110 M188 60 h110', c.near, 2.6)}
      ${ink('M196 60 v36 M242 60 v36 M288 60 v36', c.far, 1.8)}
      ${G(330, 96, `
        <circle cx="0" cy="-44" r="20" fill="${c.lit}" stroke="${INK}" stroke-width="2.2"/>
        ${seg('M0 -24 v24 M-20 -44 h40', 1.6)}
      `)}
      ${ink('M372 64 h84 v32 h-84 z', c.far)}
      ${ink('M384 72 h26 v14 h-26 z', '#fffaf0', 1.8)}
    `, 26, 22) + band('scene-mid', 104, `
      ${shadow(92, 104, 52)}
      ${ink('M30 104 v-58 h124 v58 z', c.mid)}
      ${seg('M30 72 h124', 2.2)}
      ${ink('M46 78 h22 v20 h-22 z', c.lit, 1.8)}
      ${ink('M78 78 h22 v20 h-22 z', c.lit, 1.8)}
      ${ink('M110 78 h22 v20 h-22 z', c.lit, 1.8)}
      ${G(214, 104, `
        ${ink('M-24 0 v-40 h48 v40 z', c.wall)}
        ${seg('M-24 -20 h48', 1.8)}
        ${ink('M-10 -36 q0 -14 10 -14 q10 0 10 14', c.roof, 1.8)}
      `)}
      ${G(320, 104, `
        ${shadow(0, 0, 28)}
        ${ink('M-26 0 v-52 h52 v52 z', c.roof)}
        ${ink('M-32 -52 h64 v-8 h-64 z', c.roof, 2)}
        ${seg('M-12 -40 h24 M-12 -30 h24', 1.6)}
        ${ink('M-6 -78 q6 -8 0 -14', 'none', 1.8)}
      `)}
      ${ink('M394 104 h44 v-30 h-44 z', c.mid)}
    `, 13, 15) + band('scene-ground', 32, groundBand(c, 'wood'), 4.1, 0) + band('scene-near', 44, `
      ${G(26, 44, `
        ${ink('M-22 0 v-18 h44 v18 z', c.near)}
        ${seg('M-22 -6 h44', 1.4)}
        ${seg('M-8 -18 v-10 M8 -18 v-10', 2)}
      `)}
      ${bush(170, 44, .7, c)}
      ${ink('M250 44 h32 v-12 h-32 z', c.roof, 2)}
      ${G(348, 44, ink('M-12 0 l12 -14 l12 14 z', c.near, 2))}
    `, 6.2, 0);
    return sky('shop', c) + far;
  }

  /* 夜の路地 */
  function alley(c) {
    const far = band('scene-far', 132, `
      ${building(4, 132, 64, 96, c, c.lit)}
      ${building(72, 132, 46, 72, c, c.lit)}
      ${building(122, 132, 74, 112, c, c.lit)}
      ${building(200, 132, 54, 84, c, c.lit)}
      ${building(258, 132, 70, 104, c, c.lit)}
      ${building(332, 132, 48, 76, c, c.lit)}
      ${building(384, 132, 78, 108, c, c.lit)}
    `, 34, 24) + band('scene-mid', 112, `
      ${pole(54, 112, c)}
      ${wall(140, 112, 100, c, 32)}
      ${G(300, 112, `
        ${ink('M-26 0 v-40 h52 v40 z', c.mid, 2.4)}
        ${seg('M-26 -22 h52', 1.6)}
        ${ink('M-14 -32 h20 v10 h-20 z', c.lit, 1.6)}
        ${ink('M8 0 v-14 h10 v14', c.far, 1.6)}
      `)}
      ${fence(374, 112, 100, c, 32)}
    `, 15, 15) + band('scene-ground', 32, groundBand(c, 'stone'), 4.3, 0) + band('scene-near', 44, `
      ${trash(34, 44, 1, c)}
      ${puddle(150, 42, 22)}
      ${ink('M258 44 c0 -8 22 -8 22 0 c0 6 -5 9 -11 9 c-6 0 -11 -3 -11 -9 z', c.mid, 2)}
      ${seg('M266 44 q8 5 14 0', 1.4)}
      ${bush(352, 44, .7, c)}
    `, 6.6, 0);
    return sky('alley', c) + far;
  }

  /* 集落 */
  function village(c) {
    const far = band('scene-far', 120, `
      ${hills(c.far, 92, [24, 44, 20, 36])}
      ${G(148, 88, ink('M-14 0 l14 -24 l14 24 z', c.roof, 2) + ink('M-8 0 v-12 h16 v12 z', c.wall, 1.6))}
      ${G(398, 86, ink('M-12 0 l12 -20 l12 20 z', c.roof, 2))}
    `, 30, 22) + band('scene-mid', 104, `
      ${house(66, 104, 1, c)}
      ${shadow(66, 104, 40)}
      ${tree(196, 104, .95, c)}
      ${fence(248, 104, 86, c, 26)}
      ${house(392, 104, .78, c, { roof: c.roof, wall: c.wall })}
      ${bush(318, 104, .68, c)}
    `, 13, 15) + band('scene-ground', 32, groundBand(c, 'dirt'), 4.4, 0) + band('scene-near', 44, `
      ${wall(14, 44, 84, c, 24)}
      ${bush(146, 44, .88, c)}
      ${G(238, 44, ink('M0 -8 l10 -14 l10 14 z', c.near, 2))}
      ${rock(332, 44, .8, c)}
    `, 6.6, 0);
    return sky('village', c) + far;
  }

  /* 寺院 */
  function temple(c) {
    const far = band('scene-far', 120, `
      ${hills(c.far, 94, [20, 38, 16, 30])}
      ${G(150, 92, `
        ${ink('M-22 -26 q22 -24 44 0 z', c.roof, 2.2)}
        ${seg('M-26 -26 h52', 2.2)}
        ${ink('M-14 0 v-26 M0 0 v-26 M14 0 v-26', c.near, 1.8)}
      `)}
      ${G(402, 90, ink('M-18 0 q18 -18 36 0 z', c.roof, 2))}
    `, 28, 22) + band('scene-mid', 104, `
      ${G(80, 104, `
        ${shadow(0, 0, 52)}
        ${ink('M-50 -28 q50 -32 100 0 z', c.roof, 2.8)}
        ${seg('M-56 -28 h112', 3)}
        ${ink('M-38 0 v-28 M0 0 v-28 M38 0 v-28', c.near, 2.6)}
        ${ink('M-10 0 v-18 h20 v18', '#7d5333', 1.8)}
      `)}
      ${G(196, 104, `
        ${ink('M-11 0 v-30 h22 v30 z', c.mid)}
        ${ink('M-17 -30 h34 l-6 -10 h-22 z', c.roof, 2)}
        ${seg('M0 -28 v-10', 1.4)}
      `)}
      ${G(272, 104, `
        ${shadow(0, 0, 18)}
        ${ink('M-4 0 v-54 h8 v54', c.near, 2.6)}
        ${ink('M-16 -54 h32 v-7 h-32 z', c.roof, 1.8)}
        ${seg('M-10 -61 v-6 M10 -61 v-6', 1.6)}
      `)}
      ${G(348, 104, `
        ${ink('M-4 0 v-58 h8 v58', c.roof, 2.4)}
        ${ink('M-18 -58 h36 v-8 h-36 z', c.roof, 1.8)}
        ${seg('M-28 -46 h56', 2)}
      `)}
      ${bush(430, 104, .66, c)}
    `, 13, 15) + band('scene-ground', 32, groundBand(c, 'dirt'), 4.4, 0) + band('scene-near', 44, `
      ${ink('M16 44 h54 v-14 h-54 z', c.near)}
      ${seg('M26 44 v-16 M46 44 v-20 M62 44 v-12', 2)}
      ${bush(154, 44, .82, c)}
      ${G(262, 44, ink('M-9 0 l9 -16 l9 16 z', c.near, 2))}
      ${bush(368, 44, .68, c)}
    `, 6.6, 0);
    return sky('temple', c) + far;
  }

  /* 森・ジャングル */
  function woods(c, dense) {
    const L = dense ? '#3f7f4a' : c.leaf;
    return sky(dense ? 'jungle' : 'forest', c) + band('scene-far', 124, `
      ${hills(c.far, 96, [30, 52, 26, 44])}
      ${pine(52, 92, .66, c, c.mid)}
      ${pine(176, 88, .86, c, c.mid)}
      ${pine(312, 92, .72, c, c.mid)}
      ${pine(424, 86, .82, c, c.mid)}
    `, 28, 22) + band('scene-mid', 104, `
      ${tree(54, 104, 1.05, c, L)}
      ${shadow(54, 104, 34)}
      ${pine(154, 104, .92, c, c.leaf)}
      ${tree(288, 104, 1.15, c, L)}
      ${shadow(288, 104, 38)}
      ${pine(392, 104, 1, c, c.leaf)}
      ${dense ? ink('M334 104 q6 -30 18 -34 q10 20 8 34 z', '#3f7f4a', 2.2) : ''}
    `, 13, 15) + band('scene-ground', 32, groundBand(c, 'grass'), 4.5, 0) + band('scene-near', 44, `
      ${bush(26, 44, .95, c, L)}
      ${bush(132, 42, .7, c, L)}
      ${G(226, 44, `
        ${ink('M-8 0 v-9 h16 v9 z', '#ece0c4', 1.8)}
        ${ink('M-12 -9 h24 q-2 -11 -12 -11 q-10 0 -12 11 z', '#c16a52', 1.8)}
        <circle cx="-3" cy="-13" r="1.4" fill="#fff"/><circle cx="5" cy="-14" r="1.2" fill="#fff"/>
      `)}
      ${bush(334, 44, .85, c, L)}
    `, 6.6, 0);
  }

  /* サバンナ・砂漠 */
  function dry(c, desert) {
    return sky(desert ? 'desert' : 'savanna', c) + band('scene-far', 122, `
      ${hills(c.far, 94, desert ? [30, 44, 22, 38] : [22, 34, 18, 28])}
      ${desert ? '' : G(430, 92, ink('M-12 0 l12 -18 l12 18 z', c.roof, 1.8))}
    `, 26, 22) + band('scene-mid', 104, desert ? `
      ${G(66, 104, `
        ${shadow(0, 0, 22)}
        ${ink('M-6 0 v-56', c.near, 10)}
        ${ink('M-6 -40 q-18 -4 -18 -20 q0 -12 12 -12 q-2 14 10 16', c.leaf, 2.4)}
        ${ink('M-6 -56 q16 -4 16 -16 q0 -10 -10 -10 q2 12 -10 14', c.leaf, 2.4)}
      `)}
      ${rock(190, 104, 1.3, c)}
      ${G(300, 104, `
        ${shadow(0, 0, 42)}
        ${ink('M-40 0 v-28 h80 v28 z', c.mid)}
        ${ink('M-32 -28 l12 -14 l20 14 z', c.roof, 2)}
        ${seg('M-20 -10 h24', 1.4)}
      `)}
      ${bush(414, 104, .68, c)}
    ` : `
      ${G(56, 104, `
        ${shadow(0, 0, 40)}
        ${ink('M-4 0 v-52', c.trunk, 6)}
        ${ink('M-4 -52 q-34 -10 -50 6 q30 -4 50 0 z', c.leaf, 2.4)}
        ${ink('M-4 -52 q34 -14 52 2 q-30 -2 -52 2 z', c.leaf, 2.4)}
        ${seg('M-30 -46 q10 6 22 4', 1.4)}
      `)}
      ${G(192, 104, ink('M-13 0 q-4 -18 8 -18 q12 0 8 18 z', c.mid, 2) + seg('M0 -18 v-8', 1.6))}
      ${G(296, 104, `
        ${shadow(0, 0, 24)}
        ${ink('M-3 0 v-40', c.trunk, 5)}
        ${ink('M-3 -40 q-22 -8 -32 6 q22 -4 32 -1 z', c.leaf, 2.2)}
        ${ink('M-3 -40 q20 -6 28 6 q-18 -4 -28 -2 z', c.leaf, 2.2)}
      `)}
      ${rock(398, 104, .95, c)}
    `, 13, 15) + band('scene-ground', 32, groundBand(c, 'sand'), 4.5, 0) + band('scene-near', 44, `
      ${G(28, 44, seg('M-6 0 q-4 -20 2 -30 M6 0 q0 -16 6 -24 M-14 0 q-6 -14 -2 -22', 2))}
      ${rock(136, 44, .7, c)}
      ${G(246, 44, seg('M-8 0 q-4 -18 2 -26 M4 0 q0 -14 6 -20', 1.8))}
      ${bush(344, 44, .6, c)}
    `, 6.6, 0);
  }

  /* 雪・岩山 */
  function alpine(c, snow) {
    return sky(snow ? 'snow' : 'mountain', c) + band('scene-far', 126, peaks(c, snow), 32, 22) + band('scene-mid', 104, `
      ${pine(44, 104, .9, c, c.leaf)}
      ${shadow(44, 104, 18)}
      ${pine(118, 104, 1.1, c, c.leaf)}
      ${shadow(118, 104, 22)}
      ${rock(198, 104, 1, c)}
      ${pine(282, 104, .85, c, c.leaf)}
      ${pine(350, 104, 1.05, c, c.leaf)}
      ${snow ? fence(398, 104, 74, c, 22) : rock(438, 104, .9, c)}
    `, 14, 15) + band('scene-ground', 32, groundBand(c, snow ? 'snow' : 'stone'), 4.5, 0) + band('scene-near', 44, `
      ${bush(22, 44, .78, c)}
      ${rock(146, 44, .9, c)}
      ${bush(274, 44, .68, c)}
      ${rock(384, 44, .7, c)}
    `, 6.6, 0);
  }

  /* 島・海辺 */
  function coastal(c, island) {
    return sky(island ? 'island' : 'coast', c) + band('scene-far', 128, `
      ${sea(c, 80)}
      ${island ? G(330, 84, ink('M-30 0 l26 -22 q4 -4 8 0 l10 22 z', c.mid, 2) + seg('M-14 -10 q10 -6 18 0', 1.4)) : ''}
      ${island ? '' : G(360, 84, `
        ${ink('M-7 0 v-44 h14 v44 z', '#f4e6c2', 2)}
        ${ink('M-11 -44 h22 v-8 h-22 z', '#c8664a', 1.8)}
        ${seg('M-18 -52 h36', 1.6)}
        ${seg('M-10 -30 h20 M-10 -20 h20', 1.3)}
      `)}
    `, 34, 24, 30) + band('scene-mid', 104, `
      ${palm(58, 104, 1.05, c)}
      ${palm(146, 104, .8, c)}
      ${island ? G(258, 104, `
        ${shadow(0, 0, 44)}
        ${ink('M-42 0 v-32 q42 -16 84 0 v32 z', c.wall)}
        ${ink('M-52 -32 l52 -26 l52 26 z', c.roof, 2.4)}
        ${ink('M-8 0 v-16 h16 v16 z', '#8a5f38', 2)}
      `) : ''}
      ${rock(330, 104, 1, c)}
      ${palm(418, 104, .9, c)}
    `, 13, 15) + band('scene-ground', 32, groundBand(c, 'sand'), 4.5, 0) + band('scene-near', 44, `
      ${G(38, 44, ink('M0 0 q-8 -11 2 -17 q10 6 6 17 z', '#e8b7a8', 1.8) + seg('M0 -3 l4 4 M4 -3 l-4 4', 1.2))}
      ${G(138, 44, ink('M-6 0 q-2 -8 6 -8 q8 0 6 8 z', '#f4e6c2', 1.6))}
      ${bush(248, 44, .7, c)}
      ${G(348, 44, ink('M-10 0 q2 -10 10 -10 q8 0 10 10 z', '#e8b7a8', 1.8))}
    `, 6.6, 0);
  }

  /* 動物園 */
  function zoo(c) {
    return sky('zoo', c) + band('scene-far', 122, `
      ${hills(c.far, 92, [20, 32, 16, 26])}
      ${pine(84, 90, .68, c, c.leaf)}
      ${pine(300, 88, .78, c, c.leaf)}
    `, 28, 22) + band('scene-mid', 104, `
      ${fence(16, 104, 118, c, 34)}
      ${G(206, 104, `
        ${shadow(0, 0, 40)}
        ${ink('M-34 0 v-42 h68 v42 z', c.wall)}
        ${ink('M-42 -42 h84 v-7 h-84 z', c.roof, 2)}
        ${ink('M-16 -30 h32 v16 h-32 z', c.lit, 1.8)}
        ${seg('M-34 -16 h68', 1.8)}
      `)}
      ${tree(300, 104, .9, c)}
      ${fence(358, 104, 112, c, 30)}
    `, 13, 15) + band('scene-ground', 32, groundBand(c, 'grass'), 4.5, 0) + band('scene-near', 44, `
      ${bush(24, 44, .9, c)}
      ${G(138, 44, ink('M-16 0 h32 l-4 -10 h-24 z', c.roof, 1.8) + seg('M-12 -10 v-12 M12 -10 v-12', 1.6))}
      ${bush(276, 44, .7, c)}
      ${G(376, 44, ink('M-10 0 q2 -14 10 -14 q8 0 10 14 z', c.near, 1.8))}
    `, 6.6, 0);
  }

  /* フィナーレ（虹と花畑） */
  function finale(c) {
    return sky('finale', c) + band('scene-far', 140, `
      <path d="M40 140 a200 200 0 0 1 400 0" fill="none" stroke="#e8a3a3" stroke-width="13" opacity=".55"/>
      <path d="M62 140 a178 178 0 0 1 356 0" fill="none" stroke="#e8c98a" stroke-width="11" opacity=".55"/>
      <path d="M84 140 a156 156 0 0 1 312 0" fill="none" stroke="#a9cba2" stroke-width="11" opacity=".55"/>
      <path d="M106 140 a134 134 0 0 1 268 0" fill="none" stroke="#a9c6e0" stroke-width="11" opacity=".55"/>
    `, 40, 24) + band('scene-ground', 32, groundBand(c, 'grass'), 5, 0) + band('scene-near', 48, `
      ${G(30, 48, seg('M0 0 q-4 -18 6 -22', 2) + ink('M-4 -22 q4 -14 12 -2 q10 -10 8 2 z', '#e8a3a3', 1.6))}
      ${G(140, 48, seg('M0 0 q-2 -16 6 -20', 2) + ink('M-4 -20 q4 -12 12 -2 q10 -8 8 2 z', '#e8c98a', 1.6))}
      ${G(250, 48, seg('M0 0 q0 -16 6 -20', 2) + ink('M-4 -20 q4 -12 12 -2 q10 -8 8 2 z', '#a9c6e0', 1.6))}
      ${G(360, 48, seg('M0 0 q-4 -16 6 -20', 2) + ink('M-4 -20 q4 -12 12 -2 q10 -8 8 2 z', '#a9cba2', 1.6))}
    `, 6.8, 0);
  }

  const DRAW = {
    home, shop, alley, village, temple,
    forest: c => woods(c, false), jungle: c => woods(c, true),
    savanna: c => dry(c, false), desert: c => dry(c, true),
    snow: c => alpine(c, true), mountain: c => alpine(c, false),
    island: c => coastal(c, true), coast: c => coastal(c, false),
    zoo, finale
  };

  function sceneVars(key) {
    const c = P[key] || P.home;
    return `--sc-sky1:${c.sky1};--sc-sky2:${c.sky2};--sc-ink:${INK};--sc-ground:${c.ground}`;
  }

  function sceneryHTML(key) {
    const k = DRAW[key] ? key : 'home';
    return DRAW[k](P[k]);
  }

  const api = { sceneryHTML, sceneVars, SCENE_COLORS: P };
  root.CATSCENE = api;
  if (root.CATART) { root.CATART.sceneryHTML = sceneryHTML; root.CATART.sceneVars = sceneVars; }
})(typeof globalThis !== 'undefined' ? globalThis : this);
