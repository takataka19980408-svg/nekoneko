/* ============================================================
   世界猫生ガチャ — 猫アセット（AI生成イラスト）と演出
   74純血種・46野生ネコ科・14毛柄を、13タイプ×子猫/成猫の
   画像アセットにマッピングする。DOMに依存しない純ロジック。
   ============================================================ */
(function (root) {
  'use strict';

  const ASSET_DIR = 'assets/cats/';
  const TYPES = [
    'tabby', 'orange', 'black', 'white', 'calico', 'tuxedo', 'gray',
    'siamese', 'fluffy', 'lion', 'tiger', 'leopard', 'wildcat'
  ];

  /* ---------- 野生のネコ科（46種）→ アセット ---------- */
  const WILD_MAP = {
    lion: 'lion', asiatic_lion: 'lion',
    tiger: 'tiger', amur_tiger: 'tiger', sumatran_tiger: 'tiger',
    leopard: 'leopard', snow_leopard: 'leopard', jaguar: 'leopard', cheetah: 'leopard',
    clouded_leopard: 'leopard', sunda_clouded: 'leopard', amur_leopard: 'leopard',
    puma: 'leopard', florida_panther: 'leopard'
  };

  /* ---------- 雑種の毛柄（14種）→ アセット ---------- */
  const COAT_MAP = {
    kijitora: 'tabby', chatora: 'orange', sabatora: 'gray', kuro: 'black',
    shiro: 'white', hachiware: 'tuxedo', mike: 'calico', sabi: 'calico',
    buchi: 'calico', gray: 'gray', point: 'siamese', longmix: 'fluffy',
    cream: 'white', tabbywhite: 'tabby'
  };

  /* ---------- 純血種（74種）のうち、見た目がはっきり違うもの ---------- */
  const BREED_MAP = {
    mainecoon: 'fluffy', norwegian: 'fluffy', siberian: 'fluffy', persian: 'fluffy',
    exotic_sh: 'fluffy', british_lh: 'fluffy', ragamuffin: 'fluffy', somali: 'fluffy',
    selkirk_rex: 'fluffy', laperm: 'fluffy', kurilian_bobtail: 'fluffy',
    ragdoll: 'siamese', birman: 'siamese', balinese: 'siamese', thai: 'siamese',
    oriental_sh: 'siamese', colorpoint_sh: 'siamese', snowshoe: 'siamese',
    tonkinese: 'siamese', ojo_azules: 'siamese', siam: 'siamese',
    bombay: 'black', havana_brown: 'black', york_chocolate: 'black', suphalak: 'black',
    khao_manee: 'white', turkish_angora: 'white', turkish_van: 'white', vankedisi: 'white',
    sphynx: 'white', peterbald: 'white', donskoy: 'white', bambino: 'white',
    minskin: 'white', dwelf: 'white', ukrainian_levkoy: 'white',
    bengal: 'leopard', ocicat: 'leopard', egyptian_mau: 'leopard', savannah: 'leopard',
    serengeti: 'leopard', cheetoh: 'leopard', arabian_mau: 'leopard',
    toyger: 'tiger',
    japanese_bobtail: 'calico', manx: 'gray', lykoi: 'gray', chartreux: 'gray',
    russian_blue: 'gray', british: 'gray', korat: 'gray'
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
    if (p.hairless) return colorFamily(p.fill || p.base) === 'black' ? 'gray' : 'white';
    const fam = colorFamily(p.fill || p.base);
    if (pattern === 'mackerel' || pattern === 'ticked') {
      if (fam === 'orange') return 'orange';
      if (fam === 'gray') return 'gray';
      if (fam === 'black') return 'black';
      return 'tabby';
    }
    return fam;
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
    return patternType(cat.pattern || {});
  }

  function assetStage(stage) { return stage === 'kitten' ? 'kitten' : 'adult'; }

  function assetPath(cat, stage) {
    return ASSET_DIR + typeFor(cat) + '-' + assetStage(stage) + '.png';
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
      return `<div class="stat stat--${r.cls}">
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

  /* ---------- 鈴付き首輪（SVG） ---------- */
  function collarHTML() {
    return `<span class="collar" id="collarBadge" aria-hidden="true">
      <svg viewBox="0 0 120 52">
        <path d="M6 12 C26 40 94 40 114 12" fill="none" stroke="#F37E96" stroke-width="9" stroke-linecap="round"/>
        <path d="M6 12 C26 40 94 40 114 12" fill="none" stroke="#FFB3C1" stroke-width="3.4" stroke-linecap="round" opacity=".7"/>
        <circle cx="60" cy="40" r="11" fill="#FFD166" stroke="#D99A2B" stroke-width="2.6"/>
        <circle cx="60" cy="40" r="4" fill="#C98A20"/>
        <circle cx="56.5" cy="36.5" r="2.4" fill="#FFF7DC" opacity=".9"/>
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
    return `<div class="cat-art ${kittenOn ? 'is-kitten' : 'is-adult'}" id="catArt" data-type="${t}">
      <div class="cat-scale">
        <span class="nekomata-tail" aria-hidden="true"><svg viewBox="0 0 90 150">
          <path d="M22 146 C-2 112 10 74 42 58 C64 47 70 28 62 8" fill="none" stroke="#7FB4FF" stroke-width="9" stroke-linecap="round" opacity=".95"/>
          <path d="M22 146 C-2 112 10 74 42 58 C64 47 70 28 62 8" fill="none" stroke="#DCEBFF" stroke-width="3.4" stroke-linecap="round"/>
          <circle cx="62" cy="8" r="4.4" fill="#BFE0FF"/>
        </svg></span>
        <span class="maneki-cushion" aria-hidden="true"></span>
        <span class="maneki-koban k1" aria-hidden="true">💰</span>
        <span class="maneki-koban k2" aria-hidden="true">🪙</span>
        <img class="cat-img cat-img--kitten ${kittenOn ? 'is-on' : ''}" id="catImgKitten" src="${ASSET_DIR}${t}-kitten.png" alt="${escapeAttr(alt)}の子猫" draggable="false" decoding="async">
        <img class="cat-img cat-img--adult ${kittenOn ? '' : 'is-on'}" id="catImgAdult" src="${ASSET_DIR}${t}-adult.png" alt="${escapeAttr(alt)}の成猫" draggable="false" decoding="async">
        ${collarHTML()}
        <span class="growth-spark" aria-hidden="true">✨</span>
      </div>
      <div class="bubble-layer" id="bubbleLayer" aria-hidden="true"></div>
    </div>`;
  }

  /* ホームのプレビュー */
  function heroHTML(cat) {
    const t = cat ? typeFor(cat) : 'tabby';
    return `<div class="hero-cat">
      <img class="hero-img" src="${ASSET_DIR}${t}-kitten.png" alt="子猫のイラスト" draggable="false">
      <span class="hero-shadow" aria-hidden="true"></span>
    </div>`;
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  const api = {
    ASSET_DIR, TYPES, WILD_MAP, COAT_MAP, BREED_MAP,
    typeFor, assetPath, assetStage, patternType, colorFamily,
    sceneKeyFor, sceneLabel, sceneClassOf, particlesFor, particlesHTML,
    statsFor, statsHTML, bubbleFor, collarHTML, actorHTML, heroHTML
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CATART = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
