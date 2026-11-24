/* ============================================================
   世界猫生ガチャ — 抽選エンジン
   DOMに依存しない純ロジック。ブラウザ／検証スクリプト共通。
   ============================================================ */
(function (root, factory) {
  const api = factory(root && root.CATGACHA_DATA ? root.CATGACHA_DATA : (typeof require === 'function' ? require('./data.js') : null));
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CATGACHA = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  if (!D) throw new Error('CATGACHA_DATA is required');

  /* ---------- 乱数 ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function newSeed() { return (Math.floor(Math.random() * 4294967296) >>> 0) || 1; }
  function pickIndex(weights, rng) {
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let r = rng() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return weights.length - 1;
  }
  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length) % arr.length];
  const chance = (p, rng) => rng() < p;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sum = (arr, fn) => arr.reduce((a, b) => a + fn(b), 0);

  /* ---------- 寿命 ---------- */
  function sampleLifespan(profile, rng) {
    if (chance(profile.infant, rng)) {
      const m = Math.pow(rng(), 0.75);
      return Math.max(0.08, m * 0.98);
    }
    let age = 1;
    while (age < profile.max) {
      const s = clamp(profile.base - Math.max(0, age - profile.start) * profile.rate, 0.12, 0.998);
      if (rng() > s) return age;
      age += 1;
    }
    return profile.max;
  }

  const REGION_LIFE = {
    north_america: 'owned_west', west_europe: 'owned_west', north_europe: 'owned_west',
    oceania: 'owned_west', east_asia: 'owned_west', east_europe: 'owned_mid',
    latin_america: 'owned_dev', middle_east: 'owned_mid', north_africa: 'owned_dev',
    sub_saharan: 'owned_dev', south_asia: 'owned_dev', southeast_asia: 'owned_dev'
  };

  function lifespanProfileKey(route, country, rng) {
    if (route === 'zoo') return 'zoo';
    if (route === 'wild') return 'wild_med';
    if (route === 'purebred') return 'purebred';
    const c = country.key;
    if (route === 'owned') {
      if (c === 'jp') return rng() < 0.72 ? 'jp_indoor' : 'jp_outdoor';
      if (c === 'cn') return 'owned_cn';
      return REGION_LIFE[country.region] || 'owned_dev';
    }
    if (route === 'community') return 'community';
    if (route === 'street') return c === 'jp' ? 'street_jp' : 'street';
    if (route === 'feral') return c === 'au' || c === 'nz' ? 'feral_au' : 'feral';
    return 'owned_dev';
  }

  /* ---------- 国・地域 ---------- */
  function pickCountry(stray, subtype, rng) {
    if (stray) {
      const w = D.COUNTRIES.map(c => c.strayW * (c.aff && c.aff[subtype] != null ? c.aff[subtype] : 1));
      return D.COUNTRIES[pickIndex(w, rng)];
    }
    const w = D.COUNTRIES.map(c => c.ownedW);
    return D.COUNTRIES[pickIndex(w, rng)];
  }

  function resolveRegion(country, rng) {
    return {
      key: country.key,
      bucket: country.key,
      name: country.name,
      flag: country.flag,
      region: country.region,
      regionName: country.regionName,
      where: country.where,
      names: country.names,
      note: country.note,
      scene: country.scene,
      outScene: country.outScene,
      events: (country.regionEvents || []).concat(country.events || []),
      specials: country.specials || []
    };
  }

  /* ---------- 個体の抽選 ---------- */
  function rollCat(seed) {
    seed = (seed === undefined || seed === null) ? newSeed() : (seed >>> 0);
    const rng = mulberry32(seed);

    const isWild = rng() < D.MASS.wild / D.TOTAL;
    let cat;
    if (isWild) cat = rollWild(rng, seed);
    else {
      const owned = rng() < D.MASS.owned / (D.MASS.owned + D.MASS.stray);
      cat = owned ? rollOwned(rng, seed) : rollStray(rng, seed);
    }

    let profileKey = cat.profileKey || lifespanProfileKey(cat.route, cat.country, rng);
    let profile = D.LIFE[profileKey] || D.LIFE.owned_dev;
    if (cat.healthPenalty) {
      profile = Object.assign({}, profile, {
        infant: Math.min(0.5, profile.infant + 0.05),
        start: Math.max(2, profile.start - 2),
        max: Math.max(3, profile.max - 3)
      });
    }
    cat.profileKey = profileKey;
    cat.ageYears = sampleLifespan(profile, rng);

    finalize(cat, rng);
    return cat;
  }

  function rollOwned(rng, seed) {
    const country = pickCountry(false, null, rng);
    const region = resolveRegion(country, rng);
    const countryPop = D.MASS.owned * country.ownedW;

    for (let i = 0; i < region.specials.length; i++) {
      if (chance(region.specials[i].rate, rng)) {
        return rollSpecial(region.specials[i], region, country, rng, seed, countryPop);
      }
    }

    const isPure = chance(D.PUREBRED_SHARE, rng);
    let pop = countryPop * (isPure ? D.PUREBRED_SHARE : (1 - D.PUREBRED_SHARE));

    const cat = {
      seed: seed, klass: 'domestic', route: isPure ? 'purebred' : 'owned',
      country: country, region: region,
      city: pick(region.where, rng),
      statusLabel: isPure ? '血統書つきの飼い猫' : '飼い猫'
    };

    if (isPure) {
      const breed = D.BREEDS[pickIndex(D.BREEDS.map(b => b.share), rng)];
      pop *= breed.share;
      cat.breed = breed;
      cat.speciesKey = 'breed:' + breed.key;
      cat.speciesName = breed.name;
      cat.pattern = Object.assign({}, breed);
      cat.mutations = [];
      cat.healthPenalty = chance(0.28, rng) && !!breed.health;
      cat.population = pop;
      return cat;
    }

    const coat = D.COATS[pickIndex(D.COATS.map(c => c.share), rng)];
    pop *= coat.share;
    cat.speciesKey = 'coat:' + coat.key;
    cat.speciesName = coat.name;
    cat.pattern = Object.assign({}, coat);
    cat.breed = null;
    cat.healthPenalty = false;
    cat.mutations = rollMutations(cat, coat, rng, pop);
    cat.population = cat.mutationPop;
    return cat;
  }

  function rollStray(rng, seed) {
    const sub = D.STRAY_SUB[pickIndex(D.STRAY_SUB.map(s => s.share), rng)];
    const country = pickCountry(true, sub.key, rng);
    const region = resolveRegion(country, rng);
    let pop = D.MASS.stray * sub.share * country.strayW * (country.aff[sub.key] || 1);

    const coat = D.COATS[pickIndex(D.COATS.map(c => c.share), rng)];
    pop *= coat.share;

    const cat = {
      seed: seed, klass: 'domestic', route: sub.key,
      country: country, region: region,
      city: pick(region.where, rng),
      statusLabel: D.STATUS_LABEL[sub.key],
      speciesKey: 'coat:' + coat.key,
      speciesName: coat.name,
      pattern: Object.assign({}, coat),
      breed: null,
      healthPenalty: false
    };
    cat.mutations = rollMutations(cat, coat, rng, pop);
    cat.population = cat.mutationPop;
    return cat;
  }

  function rollSpecial(special, region, country, rng, seed, countryPop) {
    const isH = special.key === 'hemingway';
    const cat = {
      seed: seed, klass: 'domestic', route: 'owned',
      country: country, region: region,
      city: isH ? 'フロリダ・キーウェスト' : 'ロンドン・ダウニング街10番地',
      statusLabel: '特別枠の猫',
      speciesKey: 'special:' + special.key,
      speciesName: special.name,
      special: special,
      pattern: Object.assign({}, isH ? {
        key: 'hemingway', name: '白黒の六本指', pattern: 'mask', base: '#2B2A2F',
        stripe: '#2B2A2F', fill: '#F6F2EA', belly: '#FFFFFF', eye: ['#D9A73C', '#8FBF5C'],
        desc: '指が6本ある幸運な猫。'
      } : {
        key: 'mouser', name: '白黒の官邸猫', pattern: 'mask', base: '#2B2A2F',
        stripe: '#2B2A2F', fill: '#F6F2EA', belly: '#FFFFFF', eye: ['#8FBF5C', '#D9A73C'],
        desc: '官邸勤務のネズミ捕獲長。'
      }),
      breed: null,
      healthPenalty: false,
      profileKey: 'jp_indoor'
    };
    cat.mutations = [D.MUTATIONS[2]];
    cat.mutationPop = countryPop * special.rate * 0.001;
    cat.population = cat.mutationPop;
    return cat;
  }

  function rollWild(rng, seed) {
    const sp = D.WILD[pickIndex(D.WILD.map(s => s.share), rng)];
    const isZoo = chance(0.02, rng);
    const pop = D.MASS.wild * sp.share * (isZoo ? 0.02 : 0.98);

    let country = null;
    if (sp.countries && sp.countries.length) {
      const pool = sp.countries.map(k => D.COUNTRIES.find(c => c.key === k)).filter(Boolean);
      if (pool.length) country = pick(pool, rng);
    }
    let region;
    if (country) region = resolveRegion(country, rng);
    else region = {
      key: 'wild', bucket: 'wild', name: sp.range, flag: '🌍', region: null, regionName: sp.range,
      where: [sp.range], names: [], note: sp.note, scene: sp.scene, outScene: sp.scene,
      events: [], specials: []
    };

    const cat = {
      seed: seed, klass: 'wild', route: isZoo ? 'zoo' : 'wild',
      country: country, region: region,
      city: isZoo ? (country ? country.name : sp.range) : sp.range,
      statusLabel: isZoo ? '動物園生まれ' : '野生のネコ科',
      speciesKey: 'wild:' + sp.key,
      speciesName: sp.name,
      sciName: sp.sci,
      speciesGroup: sp.group,
      species: sp,
      pattern: Object.assign({}, sp),
      breed: null,
      mutations: [],
      healthPenalty: false,
      population: pop,
      mutationPop: pop
    };
    cat.profileKey = isZoo ? 'zoo' : (sp.group === 'big' ? 'wild_big' : sp.group === 'small' ? 'wild_small' : sp.group === 'island' ? 'wild_island' : 'wild_med');
    return cat;
  }

  /* ---------- 変異 ---------- */
  const MUT = {};
  D.MUTATIONS.forEach(m => { MUT[m.key] = m; });

  function rollMutations(cat, coat, rng, pop) {
    const out = [];
    let p = pop;
    const k = coat.key;
    const canOdd = ['shiro', 'buchi', 'point', 'longmix', 'hachiware', 'tabbywhite'].indexOf(k) >= 0;
    const canBob = ['jp', 'tw', 'kr', 'th', 'vn'].indexOf(cat.country ? cat.country.key : '') >= 0;

    if (canOdd && chance(MUT.odd_eye.rate, rng)) { out.push(MUT.odd_eye); p *= MUT.odd_eye.rate; }
    if (k === 'mike' && chance(MUT.male_calico.rate, rng)) { out.push(MUT.male_calico); p *= MUT.male_calico.rate; }
    if (chance(MUT.polydactyl.rate, rng)) { out.push(MUT.polydactyl); p *= MUT.polydactyl.rate; }
    if (canBob && chance(MUT.bobtail.rate, rng)) { out.push(MUT.bobtail); p *= MUT.bobtail.rate; }
    if (chance(MUT.kink_tail.rate, rng)) out.push(MUT.kink_tail);

    cat.mutationPop = p;
    return out;
  }

  /* ---------- 性別・目・名前 ---------- */
  function finalizeDomestic(cat, rng) {
    const p = cat.pattern;
    const hasMaleCalico = cat.mutations.some(m => m.key === 'male_calico');
    let sex = chance(0.5, rng) ? 'male' : 'female';
    if ((p.femaleOnly || 0) > 0.9 && !hasMaleCalico) sex = 'female';
    cat.sex = sex;

    const odd = cat.mutations.some(m => m.key === 'odd_eye');
    const eyes = p.eye || ['#D9A73C', '#8FBF5C'];
    cat.eyeColor = eyes[Math.floor(rng() * eyes.length)];
    cat.eyeColor2 = cat.eyeColor;
    if (odd) {
      const isBlue = ['#5BA3D0', '#4A86B8', '#7FB6DE', '#8FC6E0'].indexOf(cat.eyeColor) >= 0;
      cat.eyeColor2 = isBlue ? '#D9A73C' : '#5BA3D0';
    }
    cat.longhair = !!p.longhair;
    cat.bobtail = !!p.bobtail || cat.mutations.some(m => m.key === 'bobtail');

    if (cat.special) {
      cat.name = cat.special.key === 'hemingway' ? 'スノーボール' : 'ラリー';
    } else if (cat.route === 'owned' || cat.route === 'purebred') {
      cat.name = pick(cat.region.names, rng);
    } else {
      const r = rng();
      cat.name = r < 0.55 ? '名もなき猫' : r < 0.85 ? pick(cat.region.names, rng) : '通称「' + pick(cat.region.names, rng) + '」';
    }
    cat.address = (cat.route === 'owned' || cat.route === 'purebred' || cat.route === 'community')
      ? cat.region.name + '・' + cat.city : null;
  }

  function finalizeWild(cat, rng) {
    const sp = cat.species;
    let sex = chance(0.5, rng) ? 'male' : 'female';
    if ((sp.key === 'lion' || sp.key === 'asiatic_lion') && sex === 'male') {
      cat.ageYears = Math.min(cat.ageYears, 4 + Math.floor(rng() * 10));
    }
    cat.sex = sex;
    const eyes = sp.eye || ['#D9A73C', '#8FBF5C'];
    cat.eyeColor = eyes[Math.floor(rng() * eyes.length)];
    cat.eyeColor2 = cat.eyeColor;
    cat.name = cat.route === 'zoo'
      ? sp.name + 'の「' + pick(['ポリー', 'サクラ', 'ハク', 'レオ', 'モモ', 'アサ', 'ユキ', 'テン'], rng) + '」'
      : sp.name;
    cat.address = cat.route === 'zoo'
      ? (cat.country ? cat.country.name + '・' : '') + pick(['那須どうぶつ王国', '上野動物園', '旭山動物園', '東山動植物園', 'ズーラシア', 'サンディエゴ動物園'], rng)
      : sp.range;
    cat.longhair = !!sp.fluffy;
    cat.bobtail = !!sp.bobtail;
  }

  function finalize(cat, rng) {
    if (cat.klass === 'wild') finalizeWild(cat, rng);
    else finalizeDomestic(cat, rng);

    if (cat.route === 'zoo') cat.scene = 'zoo';
    else if (cat.klass === 'wild') cat.scene = cat.species.scene;
    else if (cat.route === 'owned' || cat.route === 'purebred') cat.scene = cat.region.scene;
    else cat.scene = cat.region.outScene;

    cat.population = Math.max(cat.population, 0.6);
    cat.probability = cat.population / D.TOTAL;
    cat.rarityTier = tierOf(cat);
    cat.ageLabel = ageLabel(cat.ageYears);
    cat.birthMonth = Math.floor(rng() * 12);
    cat.bornPlace = cat.klass === 'wild'
      ? (cat.route === 'zoo' ? cat.address : cat.species.range)
      : cat.region.name + (cat.city && cat.city !== cat.region.name ? '・' + cat.city : '');
    cat.timeline = buildStory(cat, rng);
    cat.story = cat.timeline;
    cat.caption = buildCaption(cat, rng);
    cat.dex = {
      species: cat.speciesKey,
      country: cat.region.bucket,
      mutation: cat.mutations.map(m => m.key),
      klass: cat.klass
    };
    return cat;
  }

  /* ---------- 珍しさ（表示には使わない。実績と並びの内部判定だけ） ---------- */
  function tierOf(cat) {
    const pop = cat.population;
    let i = pop >= 400000 ? 0 : pop >= 40000 ? 1 : pop >= 3000 ? 2 : pop >= 300 ? 3 : 4;
    if (cat.klass === 'wild') i = Math.max(i, 1);
    if (cat.speciesGroup === 'big' || cat.speciesGroup === 'island') i = Math.max(i, 2);
    if (cat.mutations && cat.mutations.some(m => !m.cosmetic)) i = Math.max(i, 2);
    if (cat.special) i = Math.max(i, 3);
    return i;
  }

  /* ソシャゲのランクではなく、確率そのものを言葉にする。
     0.01%以下＝奇跡みたいな出会い / 0.1%以下＝とても珍しい猫 / 1%以下＝めずらしい猫 */
  function rareWord(prob) {
    const p = Number(prob) || 0;
    if (!p) return null;
    if (p <= 0.00001) return { tone: 'miracle', text: '✨ 奇跡みたいな出会い' };
    if (p <= 0.0001) return { tone: 'very', text: '✨ とても珍しい猫' };
    if (p <= 0.001) return { tone: 'rare', text: '✨ めずらしい猫' };
    return null;
  }

  /* ---------- 表記 ---------- */
  function ageLabel(y) {
    if (y < 1) {
      const m = Math.max(1, Math.round(y * 12));
      return m >= 12 ? '0歳' : '生後' + m + 'か月';
    }
    return Math.floor(y) + '歳';
  }
  const ageText = ageLabel;
  function formatCount(n) {
    if (n >= 1e8) return '約' + (n / 1e8).toFixed(2).replace(/\.?0+$/, '') + '億匹';
    if (n >= 1e4) return '約' + Math.round(n / 1e4).toLocaleString('ja-JP') + '万匹';
    if (n >= 100) return '約' + Math.round(n).toLocaleString('ja-JP') + '匹';
    return '約' + Math.max(1, Math.round(n)) + '匹';
  }
  function formatProb(p) {
    const pct = p * 100;
    if (pct >= 1) return pct.toFixed(2) + '%';
    if (pct >= 0.01) return pct.toFixed(3) + '%';
    if (pct >= 0.0001) return pct.toFixed(4) + '%';
    return pct.toFixed(6) + '%';
  }
  function formatOneIn(p) {
    const one = 1 / p;
    if (one >= 1e8) return '約' + (one / 1e8).toFixed(1).replace(/\.0$/, '') + '億分の1';
    if (one >= 1e4) return '約' + Math.round(one / 1e4).toLocaleString('ja-JP') + '万分の1';
    if (one >= 10) return '約' + Math.round(one).toLocaleString('ja-JP') + '分の1';
    return '約' + one.toFixed(1) + '分の1';
  }

  /* ---------- 境遇（常時プロフィールバーの名札） ---------- */
  const STATUS_VIEW = {
    owned: { icon: '🏠', label: '飼い猫', tone: '' },
    purebred: { icon: '📜', label: '血統書つきの飼い猫', tone: '' },
    community: { icon: '🏘', label: '地域猫', tone: 'out' },
    street: { icon: '🌃', label: '野良猫', tone: 'out' },
    feral: { icon: '🌿', label: '野生化したイエネコ', tone: 'out' },
    wild: { icon: '🐆', label: '野生のネコ科', tone: 'wild' },
    zoo: { icon: '🎪', label: '動物園生まれ', tone: 'wild' }
  };

  const IUCN_JP = {
    EX: '絶滅', EW: '野生絶滅', CR: '絶滅危惧IA類', EN: '絶滅危惧IB類',
    VU: '絶滅危惧II類', NT: '準絶滅危惧', LC: '低懸念', DD: '情報不足', NE: '未評価'
  };

  function storyIndex(cat, idx) {
    const n = cat && cat.story ? cat.story.length : 0;
    if (!n) return 0;
    const i = idx == null ? 0 : Math.floor(idx);
    return Math.max(0, Math.min(i, n - 1));
  }

  /* その時点までにボス猫になっているか */
  function bossAt(cat, idx) {
    if (!cat || !cat.story) return false;
    const i = storyIndex(cat, idx);
    for (let k = 0; k <= i; k++) {
      const s = cat.story[k];
      if (s && s.choice && s.chosen != null) {
        const o = s.choice.options[s.chosen];
        if (o && o.effect && o.effect.boss) return true;
      }
    }
    return false;
  }

  /* その時点の境遇。拾われる／ボス猫／猫又／招き猫で更新される。 */
  function statusOf(cat, idx) {
    if (!cat) return { icon: '', label: '', text: '', tone: '', extra: [], adopted: false };
    const i = storyIndex(cat, idx);
    const step = cat.story && cat.story[i];
    const age = step ? Number(step.age) || 0 : 0;
    const adoptedNow = cat.adoptIndex != null && i >= cat.adoptIndex;
    let view;
    if (cat.nekomata && age >= 100) view = { icon: '🔮', label: '猫又', tone: 'nekomata' };
    else if (adoptedNow && cat.maneki) view = { icon: '🏮', label: '招き猫（看板猫）', tone: 'maneki' };
    else if (adoptedNow) view = (cat.route === 'owned' || cat.route === 'purebred')
      ? { icon: '🏡', label: '家族に迎えられた', tone: 'adopt' }
      : { icon: '🏡', label: '拾われて飼い猫に', tone: 'adopt' };
    else if (cat.klass === 'wild') view = cat.route === 'zoo' ? STATUS_VIEW.zoo : STATUS_VIEW.wild;
    else if (cat.special) view = { icon: '⭐', label: cat.special.name, tone: 'rare' };
    else view = STATUS_VIEW[cat.route] || { icon: '🏠', label: cat.statusLabel || '猫', tone: '' };

    const extra = [];
    if (bossAt(cat, i) && !(cat.nekomata && age >= 100)) extra.push({ icon: '👑', label: 'ボス猫' });
    return {
      icon: view.icon, label: view.label, text: view.icon + ' ' + view.label, tone: view.tone || '',
      extra: extra, adopted: adoptedNow && cat.route !== 'owned' && cat.route !== 'purebred'
    };
  }

  /* ---------- 珍しさアピール（誕生画面の豆知識） ---------- */
  function rareNotes(cat) {
    const out = [];
    if (!cat) return out;
    const sp = cat.species || null;

    if (cat.klass === 'wild') {
      if (sp && sp.note) out.push('🐆 ' + sp.note);
      if (sp && sp.range) out.push('📍 生息地は' + sp.range + '。');
      if (sp && sp.pop) {
        out.push('🌍 世界の推定生息数は' + formatCount(sp.pop) + '。'
          + (sp.iucn ? 'IUCNレッドリスト ' + sp.iucn + '（' + (IUCN_JP[sp.iucn] || '') + '）。' : ''));
      }
      if (cat.speciesGroup === 'big' || cat.speciesGroup === 'island') {
        out.push('🦁 大型・島のネコ科は、そう何度も出会えない。会えたら自慢できる。');
      }
      if (cat.route === 'zoo') out.push('🎪 動物園生まれ。ガラスの向こうから、毎日誰かが見ている一生。');
    } else if (cat.route === 'purebred') {
      out.push('📜 血統書つきの純血種。飼い猫のうち、血統書があるのは約1.2%だけ。');
      if (cat.breed && cat.breed.desc) out.push('✨ ' + cat.breed.desc);
      if (cat.breed && cat.breed.health && cat.healthPenalty) {
        out.push('🩺 ' + cat.breed.health + 'が出やすい宿命も背負っている。');
      }
    } else if (cat.special) {
      out.push('⭐ 特別枠の猫。' + (cat.pattern && cat.pattern.desc ? cat.pattern.desc : '世界に数えるほどしかいない。'));
    } else if (cat.pattern && cat.pattern.desc) {
      out.push('🐾 ' + cat.pattern.desc);
    }

    (cat.mutations || []).forEach(m => {
      if (!m) return;
      out.push(m.note ? '🌟 ' + m.name + '——' + m.note : '🌟 ' + m.name);
    });

    const around = {
      owned: '🏠 家の中で、誰かに名前を呼ばれる一生。',
      purebred: '📜 値段より長く生きられるかは、この子次第。',
      community: '🏘 餌やりさんに見守られながら、外で生きる。',
      street: '🌃 誰にも知られず生きる野良猫。人に拾われるかどうかで猫生が変わる。',
      feral: '🌿 人の手を借りずに生きる、野生化したイエネコ。',
      wild: '🌲 人に飼われない、野生の一生。',
      zoo: '🎪 毎日決まった時間にごはんが来る、安全な一生。'
    };
    if (around[cat.route]) out.push(around[cat.route]);

    if (cat.probability && cat.probability <= 1e-6) out.push('🌈 100万分の1クラス。この子に生まれるのは、宝くじ以上。');
    else if (cat.probability && cat.probability <= 1e-5) out.push('💎 10万分の1クラス。この子はかなりのレア枠。');
    else if (cat.population && cat.population < 1000) out.push('🔍 仲間は' + formatCount(cat.population) + '。出会えたら自慢できる。');

    return out.slice(0, 5);
  }

  /* ---------- 成長ステージ ---------- */
  const STAGES = ['kitten', 'adult', 'senior'];
  const STAGE_LABEL = { kitten: '子猫', adult: '成猫', senior: 'シニア猫' };

  function stageForAge(age) {
    const a = Number(age) || 0;
    if (a < 1) return 'kitten';
    if (a < 10) return 'adult';
    return 'senior';
  }

  /* ---------- 1猫生の歩数（誕生と最期を含む） ----------
     寿命に応じてスケールする。1歩 ≒ 3か月〜半年。
     1歳≒8歩 / 5歳≒20歩 / 10歳≒35歩 / 15歳≒52歩 / 20歳≒62歩。
     1x（3.8秒/歩）で15歳の猫生が約3分20秒＋2択の時間になる。 */
  const STEP_TABLE = [
    [0.08, 4], [0.3, 5], [0.6, 6], [1, 8], [2, 11.5], [3, 14], [5, 20],
    [7, 27], [10, 35], [12, 43], [15, 52], [18, 58], [20, 62], [25, 70], [30, 76]
  ];

  function storyStepCount(age) {
    const a = Math.max(0, Number(age) || 0);
    if (a <= STEP_TABLE[0][0]) return STEP_TABLE[0][1];
    for (let i = 1; i < STEP_TABLE.length; i++) {
      if (a <= STEP_TABLE[i][0]) {
        const p = STEP_TABLE[i - 1], q = STEP_TABLE[i];
        const t = (a - p[0]) / ((q[0] - p[0]) || 1);
        return Math.max(4, Math.round(p[1] + (q[1] - p[1]) * t));
      }
    }
    return STEP_TABLE[STEP_TABLE.length - 1][1];
  }

  /* 歩数の多い猫生でも「3歳2か月」のように細かく年を刻む */
  function ageLabelFine(y) {
    const v = Math.max(0, Number(y) || 0);
    if (v < 1) {
      const m = Math.max(1, Math.round(v * 12));
      return m >= 12 ? '1歳' : '生後' + m + 'か月';
    }
    const years = Math.floor(v);
    let months = Math.round((v - years) * 12);
    if (months >= 12) return (years + 1) + '歳';
    if (months <= 0) return years + '歳';
    return years + '歳' + months + 'か月';
  }

  /* ---------- 季節（年齢から決まる） ---------- */
  const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
  const SEASON_LABEL = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
  const SEASON_EMOJI = { spring: '🌸', summer: '🌻', autumn: '🍁', winter: '❄️' };

  function seasonOfAge(age, offsetMonths) {
    const m = Math.floor((Math.max(0, Number(age) || 0) * 12 + (Number(offsetMonths) || 0)) % 12);
    if (m >= 2 && m <= 4) return 'spring';   // 3〜5月
    if (m >= 5 && m <= 7) return 'summer';   // 6〜8月
    if (m >= 8 && m <= 10) return 'autumn';  // 9〜11月
    return 'winter';                          // 12〜2月
  }

  /* 個体ごとの誕生月をずらして、季節がばらけるようにする */
  function seasonFor(cat, age) {
    return seasonOfAge(age, cat && cat.birthMonth ? cat.birthMonth : 0);
  }

  function seasonLabel(season) {
    return SEASON_LABEL[season] || '';
  }
  function seasonEmoji(season) {
    return SEASON_EMOJI[season] || '';
  }

  /* ============================================================
     気質（性格）— 2択と出来事で、少しずつ育つ5つの軸
     甘えん坊／一匹狼／食いしん坊／冒険家／のんびり屋
     ・生まれた瞬間は「これから育つ」（まだ無垢な子猫）
     ・歩むにつれて、いちばん伸びた気質が名札に出る
     ・さらにもう1つ伸びると「食いしん坊な甘えん坊」のように重なる
     ============================================================ */
  const TRAITS = {
    amae: { key: 'amae', icon: '🐾', noun: '甘えん坊', mod: '甘えん坊な', desc: '人や仲間のそばにいたがる' },
    solo: { key: 'solo', icon: '🌙', noun: '一匹狼', mod: 'ひとりが好きな', desc: 'ひとりの時間を大事にする' },
    foodie: { key: 'foodie', icon: '🍚', noun: '食いしん坊', mod: '食いしん坊な', desc: 'ごはんのことばかり考えている' },
    brave: { key: 'brave', icon: '⚡', noun: '冒険家', mod: 'わんぱくな', desc: '新しい場所へ飛び込んでいく' },
    easy: { key: 'easy', icon: '☕', noun: 'のんびり屋', mod: 'のんびりした', desc: 'あわてず、自分のペースで' }
  };
  const TRAIT_KEYS = ['amae', 'solo', 'foodie', 'brave', 'easy'];
  const TRAIT_STAGE1 = 7;    /* これ以上で「ひとつの気質」が芽吹く */
  const TRAIT_DUO = 6;       /* 2つ目がこれ以上で、重ねた呼び名になる */
  const TRAIT_RIPE = 15;     /* ここまで育つと「すっかり〜」 */
  const TRAIT_HINT_CAP = 3;  /* 出来事から拾う分は控えめに（選んだ2択が主役） */

  function addTraitScores(dst, add, mul) {
    if (!add) return;
    const m = mul == null ? 1 : mul;
    Object.keys(add).forEach(k => {
      if (!TRAITS[k]) return;
      dst[k] = (dst[k] || 0) + (Number(add[k]) || 0) * m;
    });
  }

  /* 生まれつきの下地。どんな子も、まだ「これから育つ」範囲に収める */
  function traitBase(cat) {
    const s = {};
    const r = statRng(cat, 0x7a31);
    TRAIT_KEYS.forEach(k => { s[k] = 2 + Math.floor(r() * 3); });   /* 2〜4 */
    const route = cat && cat.route;
    if (cat && cat.klass === 'wild') { s.solo += 2; s.brave += 2; s.amae -= 1; }
    else if (route === 'owned' || route === 'purebred') { s.amae += 2; }
    else if (route === 'community') { s.easy += 1; s.amae += 1; }
    else if (route === 'street') { s.brave += 2; s.solo += 1; }
    else if (route === 'feral') { s.solo += 2; s.brave += 1; }
    else if (route === 'zoo') { s.foodie += 2; s.easy += 1; }
    TRAIT_KEYS.forEach(k => { s[k] = Math.max(0, s[k]); });
    return s;
  }

  /* 2択の選択 → 気質の伸び（選択肢ごとに手で決めた重み） */
  const CHOICE_FLAVOR = {
    box: [{ trait: { easy: 3, amae: 1 }, trace: 'box' }, { trait: { easy: 2, brave: 1 }, trace: 'box' }],
    butterfly: [{ trait: { easy: 3 }, trace: 'windowsill' }, { trait: { brave: 3, foodie: 1 }, trace: 'hunt' }],
    family: [{ trait: { amae: 4 }, trace: 'family' }, { trait: { amae: 3, easy: 1 }, trace: 'family' }],
    fish: [{ trait: { foodie: 4 }, trace: 'fish' }, { trait: { foodie: 2, easy: 2 }, trace: 'fish' }],
    crevice: [{ trait: { brave: 2, foodie: 2 }, trace: 'hunt' }, { trait: { easy: 3 }, trace: 'peace' }],
    stranger: [{ trait: { brave: 2, solo: 2 }, trace: 'pride' }, { trait: { easy: 2, amae: 1 }, trace: 'peace' }],
    rain: [{ trait: { brave: 2, easy: 1 }, trace: 'rain' }, { trait: { easy: 3 }, trace: 'rain' }],
    midnight: [{ trait: { brave: 3, solo: 1 }, trace: 'moon' }, { trait: { easy: 3 }, trace: 'sunspot' }],
    hand: [{ trait: { amae: 4 }, trace: 'home' }, { trait: { solo: 4, brave: 1 }, trace: 'freedom' }],
    headlight: [{ trait: { brave: 4 }, trace: 'road' }, { trait: { easy: 3 }, trace: 'road' }],
    winter: [{ trait: { easy: 2, amae: 2 }, trace: 'warm' }, { trait: { amae: 3 }, trace: 'friend' }],    boss: [{ trait: { brave: 3, solo: 2 }, trace: 'boss' }, { trait: { easy: 3, amae: 1 }, trace: 'peace' }],
    territory: [{ trait: { brave: 3, solo: 2 }, trace: 'pride' }, { trait: { easy: 2, amae: 2 }, trace: 'peace' }],
    vet: [{ trait: { easy: 2, amae: 2 }, trace: 'vet' }, { trait: { solo: 2, brave: 1 }, trace: 'vet' }],
    whiskers: [{ trait: { brave: 2, solo: 2 }, trace: 'pride' }, { trait: { solo: 2, easy: 1 }, trace: 'peace' }],
    familyworry: [{ trait: { brave: 2, amae: 2 }, trace: 'family' }, { trait: { amae: 3, easy: 1 }, trace: 'family' }],
    wildshadow: [{ trait: { brave: 3, solo: 2 }, trace: 'territory' }, { trait: { easy: 2, solo: 1 }, trace: 'peace' }],
    zoocheck: [{ trait: { easy: 2, amae: 2 }, trace: 'crowd' }, { trait: { solo: 2, brave: 1 }, trace: 'crowd' }],
    homeAlone: [{ trait: { solo: 3, easy: 1 }, trace: 'windowsill' }, { trait: { amae: 3 }, trace: 'family' }],
    dinner: [{ trait: { foodie: 3, amae: 1 }, trace: 'fish' }, { trait: { easy: 3 }, trace: 'sunspot' }],
    bird: [{ trait: { foodie: 2, brave: 2 }, trace: 'hunt' }, { trait: { easy: 2, amae: 1 }, trace: 'sunspot' }]
  };

  function choiceFlavor(id, optIdx) {
    const row = CHOICE_FLAVOR[id];
    if (!row || !row[optIdx]) return null;
    return row[optIdx];
  }

  /* 出来事の文章から、気質の下地を少しだけ拾う */
  const TRAIT_HINTS = [
    { re: /食べ|ごはん|おやつ|干し魚|獲物|狩り|餌|空腹|いい匂い/, t: { foodie: 1 } },
    { re: /家族|膝|抱|なで|名前を呼ば|寄り添|甘え/, t: { amae: 1 } },
    { re: /ひとり|見知らぬ|縄張り|追い払|堂々|自分の道|ゆず/, t: { solo: 1 } },
    { re: /走|飛び|登|駆け|冒険|探検|挑|戦|狩/, t: { brave: 1 } },
    { re: /眠|ひるね|日向|日だまり|のんびり|ゆっくり|丸くな/, t: { easy: 1 } }
  ];

  function stepTraitText(st) {
    if (!st) return '';
    const parts = [st.title, st.text];
    if (st.choice && st.chosen != null) {
      const o = st.choice.options[st.chosen];
      if (o) parts.push(o.label, o.text);
    }
    return parts.filter(Boolean).join(' ');
  }

  /* その時点までの気質。story の選択と出来事から毎回組み立てる（保存不要） */
  function personalityAt(cat, idx) {
    const empty = {
      scores: {}, total: 0, top: null, topScore: 0, second: null, secondScore: 0,
      stage: 0, key: null, icon: '🌱', noun: '', mod: '', label: 'これから育つ',
      text: 'まだ無垢な子猫', boss: false
    };
    if (!cat || !cat.story || !cat.story.length) return empty;
    const n = cat.story.length;
    const i = Math.max(0, Math.min(idx == null ? 0 : idx, n - 1));
    const s = traitBase(cat);
    const hint = {};
    for (let k = 0; k <= i; k++) {
      const st = cat.story[k];
      if (!st) continue;
      /* 生まれた日の文面は、まだその子の性格ではない */
      if (st.kind !== 'birth') {
        const txt = stepTraitText(st);
        TRAIT_HINTS.forEach(h => { if (h.re.test(txt)) addTraitScores(hint, h.t); });
      }
      if (st.choice && st.chosen != null) {
        const fl = choiceFlavor(st.choice.id, st.chosen);
        if (fl) addTraitScores(s, fl.trait);
      }
    }
    TRAIT_KEYS.forEach(k => { s[k] = (s[k] || 0) + Math.min(hint[k] || 0, TRAIT_HINT_CAP); });
    const boss = bossAt(cat, i);
    if (boss) { s.brave += 2; s.solo += 2; }
    const order = TRAIT_KEYS.slice().sort((a, b) => (s[b] - s[a]) || (TRAIT_KEYS.indexOf(a) - TRAIT_KEYS.indexOf(b)));
    const top = order[0], second = order[1];
    const topScore = s[top] || 0, secondScore = s[second] || 0;
    const total = TRAIT_KEYS.reduce((a, k) => a + (s[k] || 0), 0);
    let stage = 0;
    if (topScore >= TRAIT_STAGE1) {
      stage = 1;
      if (secondScore >= Math.max(TRAIT_DUO, Math.round(topScore * 0.7))) stage = topScore >= TRAIT_RIPE ? 3 : 2;
    }
    const t1 = TRAITS[top], t2 = TRAITS[second];
    let label = 'これから育つ';
    let text = 'まだ無垢な子猫';
    let key = null;
    let icon = '🌱';
    if (stage === 1) { label = t1.noun; text = t1.noun; key = top; icon = t1.icon; }
    else if (stage === 2) { label = t1.mod + t2.noun; text = label; key = top; icon = t1.icon; }
    else if (stage === 3) { label = 'すっかり' + t1.mod + t2.noun; text = label; key = top; icon = t1.icon; }
    return {
      scores: s, total: total, top: top, topScore: topScore, second: second, secondScore: secondScore,
      stage: stage, key: key, icon: icon, noun: stage ? t1.noun : '', mod: stage ? t1.mod : '',
      label: label, text: text, boss: boss
    };
  }

  function personalityText(cat, idx) {
    const p = personalityAt(cat, idx);
    return p.stage ? p.icon + ' ' + p.label : '🌱 性格：これから育つ';
  }

  /* ============================================================
     思い出の痕跡 — 歩いた出来事・選んだ2択が、その子の持ち物になる
     ・文章のキーワードと、選んだ2択から決定的に拾う（保存不要）
     ・1猫生で最大8個。増えるたびに棚にポンと並ぶ
     ============================================================ */
  const TRACE_MAX = 8;
  const TRACES = [
    { key: 'home', icon: '🏠', label: 'あたたかいおうち', note: '名前を呼ばれる、帰る場所', where: 'any', prio: 3, re: /拾われ|家族に迎え|家の猫|おうち/ },
    { key: 'collar', icon: '🔔', label: 'もらった首輪', note: '拾われた日の、小さなしるし', where: 'any', prio: 3, re: /首輪|鈴の音|鈴/ },
    { key: 'yarn', icon: '🧶', label: 'お気に入りの毛糸', note: 'ほどいては、また遊んだ', where: 'home', prio: 2, re: /毛糸|じゃらし|おもちゃ|糸/ },
    { key: 'box', icon: '📦', label: '秘密の段ボール', note: '世界でいちばん落ち着く箱', where: 'home', prio: 2, re: /段ボール|箱/ },
    { key: 'windowsill', icon: '🪟', label: '窓辺の定位置', note: 'ここから外を眺めるのが日課', where: 'any', prio: 2, re: /窓辺|窓の外|窓際|窓に/ },
    { key: 'fish', icon: '🐟', label: '魚屋のおっちゃん', note: 'いい匂いのする人', where: 'any', prio: 2, re: /魚|干し魚|おにぎり|練り物/ },
    { key: 'warm', icon: '🔥', label: '冬の特等席', note: '暖かい場所は、ゆずれない', where: 'any', prio: 2, re: /暖房|ストーブ|こたつ|毛布|あったか/ },
    { key: 'sunspot', icon: '☀️', label: '日向の特等席', note: 'いちばん気持ちいい場所', where: 'any', prio: 2, re: /日だまり|日向|日なた/ },
    { key: 'vet', icon: '🩺', label: 'かかりつけの獣医', note: 'ちょっと苦手な、いい人', where: 'any', prio: 2, re: /獣医|病院|ワクチン|健康診断|注射/ },
    { key: 'tower', icon: '🗼', label: '高いところの特等席', note: '上から見るのが好き', where: 'any', prio: 2, re: /キャットタワー|屋根|塀の上|木の上|高いところ/ },
    { key: 'family', icon: '👪', label: '家族の笑い声', note: '帰る場所がある', where: 'home', prio: 2, re: /家族|飼い主|膝|抱き上げ/ },
    { key: 'friend', icon: '🐾', label: '仲良しの野良仲間', note: '寄り添って眠った夜', where: 'any', prio: 2, re: /仲間|きょうだい|寄り添|餌やり/ },
    { key: 'boss', icon: '👑', label: '路地裏のボス猫', note: 'この道は、おれのもの', where: 'out', prio: 5 },
    { key: 'territory', icon: '👑', label: '縄張りの主', note: 'ここは、おれの縄張りだ', where: 'any', prio: 5 },
    { key: 'peace', icon: '🕊', label: '平和主義', note: '争わないのも、つよさ', where: 'any', prio: 5 },
    { key: 'pride', icon: '😼', label: 'ゆずらない誇り', note: 'この場所だけは引かない', where: 'any', prio: 5 },
    { key: 'freedom', icon: '🐾', label: '自分の道を行く', note: '誰にも決められない一生', where: 'any', prio: 5 },
    { key: 'road', icon: '🚗', label: '車の下のねぐら', note: 'エンジンの音が子守唄', where: 'out', prio: 2, re: /車の下|エンジンルーム|道路|ガードレール|駐車場/ },
    { key: 'rain', icon: '☔', label: '雨宿りの軒先', note: '雨の日は、軒下で', where: 'any', prio: 2, re: /雨|軒先|軒下/ },
    { key: 'store', icon: '🏪', label: 'コンビニの店先', note: '店員さんがくれた夜', where: 'out', prio: 2, re: /コンビニ|店先/ },
    { key: 'hunt', icon: '🐁', label: 'はじめての狩り', note: '自分で獲った、はじめての一匹', where: 'any', prio: 2, re: /狩り|獲物|虫|バッタ|トカゲ|鳥/ },
    { key: 'sakura', icon: '🌸', label: '桜の木の下', note: '花びらが、鼻の先にとまった', where: 'any', prio: 2, season: 'spring', re: /桜|花びら/ },
    { key: 'snow', icon: '❄️', label: 'はじめての雪', note: '白い粒を、前足で追った', where: 'any', prio: 2, season: 'winter', re: /雪|初雪/ },
    { key: 'leaves', icon: '🍁', label: '落ち葉のベッド', note: 'がさがさの音が好き', where: 'any', prio: 2, season: 'autumn', re: /落ち葉|紅葉/ },
    { key: 'summer', icon: '🌻', label: '夏の日差し', note: '蝉の声と、冷たい床', where: 'any', prio: 2, season: 'summer', re: /蝉|夕立|夏の|扇風機/ },
    { key: 'moon', icon: '🌙', label: '月夜の見回り', note: '夜の街は、自分のもの', where: 'out', prio: 2, re: /月|夜道|夜ごと|夜の見回り/ },
    { key: 'crowd', icon: '📸', label: 'ガラスの向こうの人気者', note: '毎日、誰かが見ていた', where: 'any', prio: 2, routes: ['zoo'], re: /ガラス|お客さん/ },
    { key: 'wildland', icon: '🌿', label: '自分の縄張り', note: '匂いで囲った、自分の土地', where: 'any', prio: 2, kinds: ['wild'], re: /縄張り/ }
  ];
  const TRACE_MAP = {};
  TRACES.forEach(t => { TRACE_MAP[t.key] = t; });

  function traceScopeOk(t, ctx) {
    if (!t) return false;
    if (t.where === 'home' && !ctx.atHome) return false;
    if (t.where === 'out' && ctx.atHome) return false;
    if (t.season && t.season !== ctx.season) return false;
    if (t.routes && t.routes.indexOf(ctx.route) < 0) return false;
    if (t.kinds && t.kinds.indexOf(ctx.klass) < 0) return false;
    return true;
  }

  /* その時点までに集まった痕跡（古い順・最大8個） */
  function tracesAt(cat, idx) {
    const out = [];
    if (!cat || !cat.story || !cat.story.length) return out;
    const n = cat.story.length;
    const i = Math.max(0, Math.min(idx == null ? 0 : idx, n - 1));
    const seen = {};
    const cand = [];
    const push = (key, at, prio) => {
      if (!key || seen[key] || !TRACE_MAP[key]) return;
      seen[key] = 1;
      const d = TRACE_MAP[key];
      cand.push({ key: key, icon: d.icon, label: d.label, note: d.note || '', at: at, prio: prio || d.prio || 2 });
    };

    let bossStep = -1;
    for (let k = 0; k <= i; k++) {
      const st = cat.story[k];
      if (!st) continue;
      const adopted = cat.adoptIndex != null && k >= cat.adoptIndex;
      const atHome = cat.route === 'owned' || cat.route === 'purebred' || adopted;
      const ctx = { atHome: atHome, season: st.season || null, route: cat.route, klass: cat.klass };
      if (st.kind === 'adopt') { push('home', k, 5); push('collar', k, 5); }
      if (st.choice && st.chosen != null) {
        const fl = choiceFlavor(st.choice.id, st.chosen);
        if (fl && fl.trace) push(fl.trace, k, 5);
        const opt = st.choice.options[st.chosen];
        if (opt && opt.effect && opt.effect.boss && bossStep < 0 && bossAt(cat, k)) bossStep = k;
      }
      /* 生まれた日の文面は思い出ではないので、痕跡は拾わない */
      if (st.kind === 'birth') continue;
      const txt = stepTraitText(st);
      for (let j = 0; j < TRACES.length; j++) {
        const t = TRACES[j];
        if (!t.re || seen[t.key] || !traceScopeOk(t, ctx)) continue;
        if (t.re.test(txt)) push(t.key, k, t.prio || 2);
      }
    }
    if (bossStep >= 0) push(cat.klass === 'wild' ? 'territory' : 'boss', bossStep, 5);

    cand.sort((a, b) => (b.prio - a.prio) || (a.at - b.at));
    const keep = cand.slice(0, TRACE_MAX);
    keep.sort((a, b) => (a.at - b.at));
    return keep;
  }

  const STORY_TITLES = {
    kitten: ['こねこの毎日', 'はじめての出来事', 'やんちゃざかり', '小さな冒険'],
    adult: ['ある日のこと', '季節がめぐる', 'いつのまにか', 'いつもの場所で'],
    senior: ['しずかな日々', 'ゆっくりと', '日だまりの午後', 'のんびりと']
  };

  /* ---------- 年齢の目盛り（「年をとる」の実感） ---------- */
  const AGE_TICKS = [
    { age: 0, label: '誕生', pos: 0 },
    { age: 4 / 12, label: '4か月', pos: 7 },
    { age: 1, label: '1歳', pos: 18 },
    { age: 3, label: '3歳', pos: 34 },
    { age: 6, label: '6歳', pos: 50 },
    { age: 10, label: '10歳', pos: 66 },
    { age: 15, label: '15歳', pos: 82 },
    { age: 20, label: '20歳', pos: 93 },
    { age: 25, label: '25歳', pos: 100 }
  ];

  const MILESTONES = [
    { key: 'm1', age: 1, icon: '🎂', tone: 'cake', label: '1歳・こどもから大人へ' },
    { key: 'm3', age: 3, icon: '🎂', tone: 'cake', label: '3歳・いちばん元気なころ' },
    { key: 'm6', age: 6, icon: '🍂', tone: 'cake', label: '6歳・落ち着いてきた' },
    { key: 'm10', age: 10, icon: '🎂', tone: 'senior', label: '10歳・シニア期' },
    { key: 'm15', age: 15, icon: '👑', tone: 'great', label: '15歳・ご長寿猫' },
    { key: 'm20', age: 20, icon: '🌟', tone: 'legend', label: '20歳・伝説の猫' },
    { key: 'm50', age: 50, icon: '🔮', tone: 'nekomata', label: '50歳・ぬしと呼ばれる' },
    { key: 'm100', age: 100, icon: '🔮', tone: 'nekomata', label: '100歳・猫又' }
  ];

  /* 猫又ルートだけは100年スケールの目盛りを使う */
  const NEKOMATA_TICKS = [
    { age: 0, label: '誕生', pos: 0 },
    { age: 1, label: '1歳', pos: 10 },
    { age: 10, label: '10歳', pos: 28 },
    { age: 20, label: '20歳', pos: 46 },
    { age: 50, label: '50歳', pos: 68 },
    { age: 80, label: '80歳', pos: 86 },
    { age: 100, label: '100歳', pos: 100 }
  ];

  function ageTicks(cat) {
    return cat && cat.nekomata ? NEKOMATA_TICKS : AGE_TICKS;
  }

  function ageScalePercent(age, ticks) {
    const T = ticks && ticks.length ? ticks : AGE_TICKS;
    const a = Math.max(0, Number(age) || 0);
    if (a <= 0) return 0;
    for (let i = 1; i < T.length; i++) {
      const p = T[i - 1], q = T[i];
      if (a <= q.age) {
        const t = (a - p.age) / ((q.age - p.age) || 1);
        return Math.round((p.pos + (q.pos - p.pos) * clamp(t, 0, 1)) * 10) / 10;
      }
    }
    return 100;
  }

  function milestonesPassed(age) {
    const a = Number(age) || 0;
    return MILESTONES.filter(m => a >= m.age);
  }

  function milestoneAt(story, idx) {
    if (!story || idx < 0 || idx >= story.length) return null;
    const cur = Number(story[idx].age) || 0;
    const prev = idx > 0 ? (Number(story[idx - 1].age) || 0) : -1;
    let hit = null;
    MILESTONES.forEach(m => { if (cur >= m.age && prev < m.age) hit = m; });
    return hit;
  }

  /* ---------- ステータス（❤️たいりょく / 🐟おなか / 🍀うん） ----------
     一歩ごとの素の値（base）と、2択で選んだ効果の合計で決まる。
     選択の結果はその場だけでなく、その後の値にも効き続ける。 */
  function statRng(cat, salt) {
    return mulberry32(((cat.seed >>> 0) ^ Math.imul((salt | 0) + 1, 2654435761)) >>> 0);
  }

  function baseStats(cat) {
    const muts = (cat.mutations || []).filter(m => !m.cosmetic).length;
    return { energy: 74, food: 58, luck: clamp(48 + muts * 7, 24, 92) };
  }

  function driftFor(stage, home, rng) {
    const j = n => (rng() * 2 - 1) * n;
    return {
      energy: (stage === 'kitten' ? 2 : stage === 'adult' ? -3 : -6) + j(4) + (home ? 3 : 0),
      food: j(9) + (home ? 4 : -1),
      luck: j(6) + (home ? 3 : 0) + (stage === 'senior' ? 2 : 0)
    };
  }

  function roundStats(s) {
    return {
      energy: Math.round(clamp(s.energy, 4, 100)),
      food: Math.round(clamp(s.food, 4, 100)),
      luck: Math.round(clamp(s.luck, 4, 100))
    };
  }

  function applyBaseStats(cat, from) {
    const story = cat.story;
    if (!story || !story.length) return;
    const h = statRng(cat, 0x51ed);
    let s = null;
    let start = 1;
    if (from && from.stats) {
      s = Object.assign({}, from.stats);
      start = (from.idx == null ? 0 : from.idx) + 1;
    } else {
      s = baseStats(cat);
      story[0].stats = roundStats(s);
    }
    for (let i = start; i < story.length; i++) {
      const st = story[i];
      const home = cat.adoptIndex != null && i >= cat.adoptIndex;
      if (st.kind === 'death') {
        s = { energy: s.energy - 18, food: s.food - 12, luck: s.luck + 2 };
      } else {
        const d = driftFor(st.stage, home, h);
        s = { energy: s.energy + d.energy, food: s.food + d.food, luck: s.luck + d.luck };
      }
      st.stats = roundStats(s);
      s = st.stats;
    }
  }

  function statsAt(cat, idx) {
    if (!cat || !cat.story || !cat.story.length) return { energy: 50, food: 50, luck: 50 };
    const i = Math.round(clamp(idx == null ? 0 : idx, 0, cat.story.length - 1));
    const base = cat.story[i].stats || baseStats(cat);
    const out = { energy: base.energy, food: base.food, luck: base.luck };
    for (let k = 0; k <= i; k++) {
      const st = cat.story[k];
      if (!st.choice || st.chosen == null) continue;
      const opt = st.choice.options[st.chosen];
      const fx = (opt && opt.effect) || {};
      out.energy += fx.energy || 0;
      out.food += fx.food || 0;
      out.luck += fx.luck || 0;
    }
    return roundStats(out);
  }

  function peakStats(cat) {
    const peak = { energy: 0, food: 0, luck: 0 };
    const n = cat && cat.story ? cat.story.length : 0;
    for (let i = 0; i < n; i++) {
      const s = statsAt(cat, i);
      peak.energy = Math.max(peak.energy, s.energy);
      peak.food = Math.max(peak.food, s.food);
      peak.luck = Math.max(peak.luck, s.luck);
    }
    return peak;
  }

  /* ---------- ステータスと運命の連動 ----------
     ❤️たいりょく<=20 → ピンチ（ドキドキ演出・事故リスクUP）
     🐟おなか<=20     → 空腹（体調を崩しやすい・小さな空腹サイン）
     🍀うん>=70       → 幸運（拾われやすい・事故回避・猫又/招き猫ルートUP） */
  const FATE = { PINCH: 20, HUNGRY: 20, LUCKY: 70 };

  function fateAt(cat, idx) {
    const s = statsAt(cat, idx);
    const pinch = s.energy <= FATE.PINCH;
    const hungry = s.food <= FATE.HUNGRY;
    const lucky = s.luck >= FATE.LUCKY;
    return {
      energy: s.energy, food: s.food, luck: s.luck,
      pinch: pinch, hungry: hungry, lucky: lucky,
      tone: pinch ? 'pinch' : hungry ? 'hungry' : lucky ? 'lucky' : ''
    };
  }

  /* ピンチ・空腹・幸運が、2択の事故リスクに効く倍率。
     幸運は事故を避け、空腹は体力が落ちて危険に弱くなる。 */
  function fateRiskFactor(cat, idx) {
    const f = fateAt(cat, idx);
    return (f.hungry ? 1.3 : 1) * (f.lucky ? 0.72 : 1);
  }

  /* ---------- 選択イベント ----------
     cozy = ちょっとした日常の2択（小さなステータス変化）
     fate = 猫生の分かれ道（寿命・境遇・ボス猫への道が変わる） */
  const CHOICE_EVENTS = [
    /* --- 日常の2択 --- */
    {
      id: 'box', tier: 'cozy', scene: 'home', min: 0.2, max: 20,
      question: '段ボール箱を見つけた！',
      options: [
        { label: 'すぐ入る', text: 'すっぽり収まって、そのままお昼寝。世界でいちばんちょうどいい箱だった。', effect: { energy: 6, luck: 2 } },
        { label: 'まわりを一周する', text: '念入りに匂いを確かめてから、結局入った。箱には勝てない。', effect: { food: 2, luck: 4 } }
      ]
    },
    {
      id: 'butterfly', tier: 'cozy', scene: 'any', min: 0.4, max: 22,
      question: '窓辺にちょうちょがとまった。',
      options: [
        { label: 'そっと見つめる', text: 'しっぽの先だけが小さく動く。しばらく、時間が止まったみたいだった。', effect: { energy: 4, luck: 3 } },
        { label: '飛びつく', text: '見事に空振り。でもそのあと、ひとりで満足そうに毛づくろいをした。', effect: { energy: -4, food: 6, luck: 2 } }
      ]
    },
    {
      id: 'family', tier: 'cozy', scene: 'home', min: 0.5, max: 22,
      question: '家族がなんだか元気がないみたい。',
      options: [
        { label: '膝に乗る', text: '何も言わずに膝で丸くなった。それだけで、部屋の空気が少しやわらかくなった。', effect: { luck: 8, energy: 3 } },
        { label: '頭をこつんとする', text: 'おでこをそっとぶつけたら、手がゆっくり頭に置かれた。', effect: { luck: 7, energy: 2 } }
      ]
    },
    {
      id: 'fish', tier: 'cozy', scene: 'home', min: 0.3, max: 24,
      question: 'おやつの干し魚が届いた！',
      options: [
        { label: 'すぐ食べる', text: '夢中でたいらげて、食べ終わってから手をぺろぺろした。', effect: { food: 14, energy: 4 } },
        { label: 'あとで食べる', text: '大事に隠しておいたのに、次の日には場所を忘れていた。', effect: { food: 8, luck: 3 } }
      ]
    },
    {
      id: 'crevice', tier: 'cozy', scene: 'out', min: 0.3, max: 20,
      question: '岩のすき間に、なにかが光っている。',
      options: [
        { label: '近づいてみる', text: '小さな虫だった。すぐ逃げられたけど、なんだか得した気分。', effect: { food: 8, luck: 2 } },
        { label: '見なかったことにする', text: '危ないものは追わない。それが長生きのコツ。', effect: { luck: 5, energy: 2 } }
      ]
    },
    {
      id: 'stranger', tier: 'cozy', scene: 'out', min: 1, max: 20,
      question: '見知らぬ猫が、こちらの場所を見ている。',
      options: [
        { label: 'にらみ返す', text: '一歩も引かずに見返したら、相手が先に目をそらした。', effect: { energy: -3, luck: 4 } },
        { label: '場所をゆずる', text: 'ゆずった場所の近くで、思ったよりいい昼寝スポットを見つけた。', effect: { luck: 7, energy: 2 } }
      ]
    },
    {
      id: 'dinner', tier: 'cozy', scene: 'home', min: 0.4, max: 24,
      question: '台所から、夕飯のいい匂いがしてきた。',
      options: [
        { label: '足もとで待つ', text: '調理台の下を何度も往復して、とうとう一切れもらった。', effect: { food: 12, energy: 3 } },
        { label: '寝たふりを続ける', text: '呼ばれるまで動かない。呼ばれた瞬間に走っていった。', effect: { food: 6, luck: 3 } }
      ]
    },
    {
      id: 'homeAlone', tier: 'cozy', scene: 'home', min: 0.6, max: 26,      question: '家族が出かけて、家にひとりだけになった。',
      options: [
        { label: 'ひとりを満喫する', text: '家中のいちばんいい場所を順番に試して、最後は真ん中で堂々と寝た。', effect: { energy: 6, luck: 3 } },
        { label: '玄関で待つ', text: '帰ってくる足音を、ドアの前でずっと聞いていた。', effect: { luck: 6, energy: -2 } }
      ]
    },
    {
      id: 'bird', tier: 'cozy', scene: 'out', min: 0.6, max: 16,
      question: '小さな鳥が、すぐそこに降りたった。',
      options: [
        { label: '息をひそめて狙う', text: 'しっぽだけ微かに動かして、飛びついた。半分だけ成功。', effect: { food: 8, energy: -2 } },
        { label: '見送る', text: '飛び立つ音を聞いて、あくびをひとつ。今日はそれでいい。', effect: { luck: 4, energy: 2 } }
      ]
    },
    {
      id: 'rain', tier: 'cozy', scene: 'any', min: 0.2, max: 24,
      question: '雨が降ってきた。',
      options: [
        { label: '外に出てみる', text: '足先だけ濡らして、すぐ引き返した。やっぱり屋根の下がいちばん。', effect: { energy: -3, luck: 3 } },
        { label: '軒先から見る', text: 'しずくの落ちる音を、しっぽをゆらしながら眺めていた。', effect: { energy: 5, luck: 2 } }
      ]
    },
    {
      id: 'midnight', tier: 'cozy', scene: 'any', min: 2, max: 24,
      question: '夜中、あたりがしんと静まり返っている。',
      options: [
        { label: '走り回る', text: '誰も見ていない時間に全力疾走。これが猫の正義。', effect: { energy: -6, luck: 6, food: -2 } },
        { label: '丸くなって寝る', text: 'いちばん柔らかい場所を選んで、朝までぐっすり。', effect: { energy: 9, food: 2 } }
      ]
    },

    /* --- 猫生の分かれ道 --- */
    {
      id: 'hand', tier: 'fate', scene: 'any', min: 0.25, max: 20,
      routes: ['street', 'community', 'feral'], notAdopted: true,
      question: '目の前に、人がしゃがんで手を差し伸べている。',
      options: [
        { label: 'そっと手に乗る', text: 'においを確かめて、そっと手のひらに前足をのせた。その夜から、家の中で眠る。', effect: { adopt: true, luck: 12, energy: 10 } },
        { label: '自分で生きていく', text: '一歩下がって、塀の上へ。悪くない選択だと、ずっと思っていた。', effect: { life: 1, luck: 6, energy: 2 } }
      ]
    },
    {
      id: 'headlight', tier: 'fate', scene: 'out', min: 0.5, max: 20,
      routes: ['street', 'community', 'feral'],
      question: '夜道で、車のライトがこちらを照らした。',
      options: [
        { label: '一気に走り抜ける', text: '地面を蹴って、光の中へ。', effect: { risk: 0.45, energy: -8, luck: -2 } },
        { label: '足を止めて待つ', text: '動かずに、息をひそめて待った。車はゆっくり通り過ぎていった。', effect: { life: 1, luck: 8, energy: 2 } }
      ]
    },
    {
      id: 'winter', tier: 'fate', scene: 'any', min: 0.8, max: 30, notZoo: true,
      question: '冬が近い。今夜はとにかく冷える。',
      options: [
        { label: '人の家の軒下に入る', text: '勝手口のすき間から、あたたかい匂いがした。ここで冬を越そう。', effect: { energy: 8, luck: 5, life: 1 } },
        { label: '仲間と寄り添って眠る', text: '何匹もで丸くなって、毛の奥で眠った。朝まで誰も凍えなかった。', effect: { luck: 10, energy: 6 } }
      ]
    },
    {
      id: 'boss', tier: 'fate', scene: 'any', min: 1, max: 20,
      routes: ['street', 'community', 'feral'],
      question: 'この一帯を仕切る大きな猫が、じっとこちらを見ている。',
      options: [
        { label: '正面から挑む', text: '低く唸って、一歩も引かなかった。その日から、この道の主は自分になった。', effect: { boss: true, life: 2, luck: 10, energy: -6 } },
        { label: '静かに道をあける', text: '頭を下げて、ゆっくり横を通った。それもまた、ひとつの生き方。', effect: { luck: 4, energy: 3 } }
      ]
    },
    {
      id: 'territory', tier: 'fate', scene: 'out', min: 1.2, max: 24,
      question: '塀の上のいつもの場所に、よその猫が居座っている。',
      options: [
        { label: '前に出て、場所を守る', text: 'しっぽを太くして、低く唸った。相手はしばらく睨み返してから、ゆっくり降りていった。', effect: { energy: -4, luck: 6, life: 1 } },
        { label: 'そっと道をゆずる', text: '相手の目を見ないまま、静かに横を通った。ゆずった先に、もっといい日だまりがあった。', effect: { energy: 3, luck: 5 } }
      ]
    },
    {
      id: 'vet', tier: 'fate', scene: 'home', min: 0.9, max: 30, homeOnly: true,
      question: '獣医さんが、少し長く生きられそうな薬をくれた。',
      options: [
        { label: 'おとなしく飲む', text: 'いやな顔をしながらも、全部飲んだ。次の検査は、少しだけいい数字だった。', effect: { life: 2, energy: 6, luck: 2 } },
        { label: '隠してしまう', text: '知らないふりをして、薬をソファの下に押し込んだ。', effect: { luck: 3, energy: -2 } }
      ]
    },
    {
      id: 'whiskers', tier: 'fate', scene: 'any', min: 1.5, max: 22,
      routes: ['street', 'community', 'feral'],
      question: '立派なひげが、生えそろってきた。',
      options: [
        { label: '堂々と歩く', text: '朝の道路の真ん中を、ゆっくり歩いてみた。誰も止めなかった。', effect: { luck: 8, life: 1 } },
        { label: 'まだ隠れて生きる', text: '人の目を避けて、物陰から物陰へ。それが一番安全だ。', effect: { energy: 4, luck: 3 } }
      ]
    },
    {
      id: 'familyworry', tier: 'fate', scene: 'home', min: 2, max: 30, homeOnly: true,
      question: '家族が、少し心配そうにこちらを見ている。',
      options: [
        { label: '元気なところを見せる', text: '跳ねて、走って、いつもの場所で伸びをした。家族が笑った。', effect: { energy: 8, luck: 6, life: 1 } },
        { label: 'そっと寄り添う', text: '膝の上で、いつもより長く丸くなっていた。', effect: { luck: 10, energy: 4 } }
      ]
    },
    {
      id: 'wildshadow', tier: 'fate', scene: 'any', min: 1.5, max: 30,
      kinds: ['wild'], notZoo: true,
      question: '縄張りの境目で、大きな影が動いた。',
      options: [
        { label: '牙をむく', text: '低い声で唸り、相手の目を見た。影は、ゆっくり下がっていった。', effect: { risk: 0.35, life: 1, luck: 8 } },
        { label: '身を低くして離れる', text: '気配を消して、風下へ。今日は戦わない。', effect: { energy: 3, luck: 6 } }
      ]
    },
    {
      id: 'zoocheck', tier: 'fate', scene: 'any', min: 1, max: 30, kinds: ['wild'],
      routes: ['zoo'],
      question: '獣医と飼育員が、健康診断に来た。',
      options: [
        { label: 'おとなしく受ける', text: '体重計に乗り、口を開けて見せる。飼育員が「いい子だ」と言った。', effect: { life: 2, energy: 4 } },
        { label: '逃げ回る', text: '寝床の奥まで逃げて、3時間出てこなかった。', effect: { luck: 5, energy: -4 } }
      ]
    }
  ];

  function eventFits(e, age, group, cat, willAdopt) {
    if (age < e.min || age > e.max) return false;
    if (e.scene && e.scene !== 'any' && e.scene !== group) return false;
    if (e.routes && e.routes.indexOf(cat.route) < 0) return false;
    if (e.kinds && e.kinds.indexOf(cat.klass) < 0) return false;
    const adopted = willAdopt || cat.adoptIndex != null;
    if (e.notAdopted && adopted) return false;
    if (e.adoptedOnly && !adopted) return false;
    if (e.notZoo && cat.route === 'zoo') return false;
    if (e.homeOnly && !(cat.route === 'owned' || cat.route === 'purebred' || adopted)) return false;
    return true;
  }

  /* スロットに2択をわりあてる。fate を1つ入れ、残りを cozy で埋める。 */
  function pickChoices(cat, slots, group, willAdopt, rng, skip) {
    const n = slots.length;
    if (!n) return {};
    const order = [];
    for (let j = 1; j <= n; j++) if (!skip || skip.indexOf(j) < 0) order.push(j);
    for (let j = order.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1));
      const t = order[j]; order[j] = order[k]; order[k] = t;
    }
    /* 長い猫生ほど2択も増える（およそ8歩に1回） */
    let wanted;
    if (n >= 4) {
      wanted = Math.max(2, Math.round(n / 8) + (chance(0.5, rng) ? 1 : 0));
    } else {
      wanted = chance(0.72, rng) ? 2 : 1;
    }
    wanted = Math.max(1, Math.min(wanted, order.length));
    const out = {};
    const used = [];
    let set = 0;

    const takeFrom = (list, slot) => {
      const fits = list.filter(e => used.indexOf(e) < 0 && eventFits(e, slots[slot - 1], group, cat, willAdopt));
      if (!fits.length) return false;
      const e = fits[Math.floor(rng() * fits.length)];
      used.push(e);
      out[slot] = e;
      set++;
      return true;
    };

    /* fate は後半のスロットへ（人生の分かれ道らしく） */
    if (order.length && chance(0.85, rng)) {
      const fates = CHOICE_EVENTS.filter(e => e.tier === 'fate');
      for (let oi = order.length - 1; oi >= 0; oi--) {
        if (takeFrom(fates, order[oi])) break;
      }
    }

    const cozy = CHOICE_EVENTS.filter(e => e.tier === 'cozy');
    for (let oi = 0; oi < order.length && set < wanted; oi++) {
      const slot = order[oi];
      if (out[slot]) continue;
      takeFrom(cozy, slot);
    }
    /* fate が取れなかった猫生には、もう一度だけ fate を試す */
    if (set < wanted) {
      const fates = CHOICE_EVENTS.filter(e => e.tier === 'fate');
      for (let oi = 0; oi < order.length && set < wanted; oi++) {
        if (out[order[oi]]) continue;
        takeFrom(fates, order[oi]);
      }
    }
    return out;
  }

  /* ---------- 超レア隠しルート① 猫又（100年） ---------- */
  const NEKOMATA_EVENTS = [
    { age: 2.5, text: 'ふつうの子猫として、ふつうに暮らしていた。この時点では、なにもおかしなことはない。' },
    { age: 6, text: '6歳。毛ヅヤがよすぎる気がするが、家族は「うちの子は元気」で片づけた。' },
    { age: 12, text: '12歳。獣医がカルテを二度見した。「この子、まだこんなに元気なんですか」。' },
    { age: 20, text: '20歳。とっくに猫の寿命を超えている。それでも、ごはんは毎日きっちり完食する。' },
    { age: 35, text: '35歳。近所の人が、この猫に軽く頭を下げるようになった。' },
    { age: 50, text: '50歳。町内の子どもたちが「ぬし」と呼ぶ。触ろうとすると、すっと避ける。' },
    { age: 65, text: '65歳。こたつの中で、人の言葉を少し話すようになった。「あったかいのう」。' },
    { age: 80, text: '80歳。町内会の悩み相談に乗っている。アドバイスは、だいたい「寝るのが一番」。' },
    { age: 100, text: '100歳。しっぽが2本に分かれた。猫又になった。' }
  ];

  function shouldNekomata(cat, rng) {
    if (cat.klass === 'wild' || cat.special) return false;
    if ((Number(cat.ageYears) || 0) < 15) return false;
    const luck = baseStats(cat).luck;
    const p = luck >= FATE.LUCKY ? 0.036 : luck >= 60 ? 0.022 : 0.015;
    return chance(p, rng);
  }

  function buildNekomataStory(cat, rng) {
    cat.nekomata = true;
    cat.ageYears = 100 + Math.floor(rng() * 5);
    cat.ageLabel = ageLabel(cat.ageYears);
    cat.deathCause = 'nekomata';

    /* 100年を66〜72歩で歩く。若い頃は細かく、後半はゆったり。 */
    const total = 66 + Math.floor(rng() * 7);
    const eventCount = Math.max(10, total - 2);

    const steps = [{
      kind: 'birth', age: 0, ageLabel: '生まれた日', stage: 'kitten', title: '誕生',
      season: seasonFor(cat, 0), text: birthText(cat, rng)
    }];

    const pool = storyPool(cat);
    const used = {};

    const ages = [];
    for (let k = 1; k <= eventCount - 1; k++) {
      const t = k / eventCount;
      ages.push(Math.round(99 * Math.pow(t, 1.3) * 100) / 100);
    }

    /* 百年の節目（2.5/6/12/20/35/50/65/80歳）を近いスロットに置く */
    const anchorAt = {};
    NEKOMATA_EVENTS.slice(0, 8).forEach((a, n) => {
      let best = -1, bestD = Infinity;
      ages.forEach((x, i) => {
        const d = Math.abs(x - a.age);
        if (d < bestD && anchorAt[i] == null) { bestD = d; best = i; }
      });
      if (best >= 0) {
        anchorAt[best] = a.text;
        used[a.text] = 1;
      }
    });

    ages.forEach((a, i) => {
      const stage = stageForAge(a);
      const titles = STORY_TITLES[stage] || STORY_TITLES.adult;
      const season = seasonFor(cat, a);
      let text = anchorAt[i];
      if (!text) {
        const e = pickStoryEvent(pool, used, a, rng, season);
        text = e ? e.text : fallbackStoryText(stage, rng, used);
      }
      steps.push({
        kind: 'event', age: a, ageLabel: ageLabelFine(a), stage, season,
        title: titles[i % titles.length], text: text
      });
    });

    steps.push({
      kind: 'evolve', age: 100, ageLabel: '100歳', stage: 'senior', season: seasonFor(cat, 100),
      title: '猫又になる', evolve: 'nekomata', text: NEKOMATA_EVENTS[8].text
    });
    steps.push({
      kind: 'death', age: cat.ageYears, ageLabel: ageLabelFine(cat.ageYears), stage: 'senior',
      season: seasonFor(cat, cat.ageYears), title: '最期', cause: 'nekomata',
      text: 'こたつで将棋を指したあと、ふっと姿を消した。百年の猫生だった。'
    });

    cat.story = steps;
    applyBaseStats(cat);
    cat.caption = '100年を生きた、猫又。町内の悩み相談は、今日も満員御礼。';
    return steps;
  }

  /* ---------- 超レア隠しルート② 招き猫 ---------- */
  const MANEKI_ADOPT = [
    '商店街の小さな定食屋の店主が、店先で丸くなっていたところを抱き上げた。「うちの看板猫になれ」。',
    '酒屋の軒先で雨宿りしていたら、おかみさんが「商売繁盛の猫になれ」と赤い座布団を敷いてくれた。',
    'クリーニング店の人が、レジ横に小さな座布団を置いてくれた。そこが、お店の猫の指定席になった。'
  ];
  const MANEKI_EVENTS = [
    'レジ横の座布団で右手を上げていると、お客さんが次々に写真を撮っていく。売上も少し上がった。',
    '商店街の福引の前で座っていたら、その日から「この猫に撫でられると当たる」と噂になった。',
    '店の入り口で、右手を上げてお客さんを呼び込む。手が疲れるので、ときどき左手に交代する。',
    '小判の形のおもちゃをくわえて店の中を歩き、店主に「縁起がいい」と大喜びされた。'
  ];

  function manekiRoll(cat, rng) {
    if (!cat.adopted || cat.klass === 'wild' || cat.maneki) return false;
    const at = cat.adoptIndex == null ? 0 : cat.adoptIndex;
    const luck = statsAt(cat, at).luck;
    if (luck < 50) return false;
    /* 🍀幸運の子は、お店の看板猫にも選ばれやすい */
    return chance(luck >= FATE.LUCKY ? 0.042 : 0.025, rng);
  }

  function decorateManeki(cat, rng) {
    cat.maneki = true;
    const r = statRng(cat, 0x6d6b);
    const adoptStep = cat.story[cat.adoptIndex];
    if (adoptStep) {
      adoptStep.maneki = true;
      adoptStep.title = 'お店に迎えられる';
      adoptStep.adoptTitle = 'お店に迎えられる';
      adoptStep.text = pick(MANEKI_ADOPT, r);
      cat.adoptTitle = 'お店に迎えられる';
      cat.adoptText = adoptStep.text;
    }
    /* 看板猫は長生きする */
    extendLife(cat, 7);

    /* 延びた分の歩みを、店先のコメディに差し替える */
    const evIdx = [];
    cat.story.forEach((s, i) => { if (s.kind === 'event' && i > (cat.adoptIndex || 0)) evIdx.push(i); });
    const shop = MANEKI_EVENTS.slice();
    evIdx.slice(-2).forEach((i) => {
      const t = shop.length ? shop.splice(Math.floor(r() * shop.length), 1)[0] : null;
      if (t) { cat.story[i].text = t; cat.story[i].title = '看板猫'; }
    });

    const death = cat.story[cat.story.length - 1];
    if (death && death.kind === 'death') {
      death.text = 'レジ横の座布団の上で、右手を上げたまま動かなかった。看板猫の最期だった。';
      death.cause = 'maneki';
    }
    cat.deathCause = 'maneki';
    cat.caption = '商店街の看板猫。右手を上げて、今日もお客さんを呼んでいる。';
  }

  /* 空腹が長く続いた子の最期（体調を崩しやすい） */
  const HUNGER_DEATHS = {
    home: 'おなかが満ちない日が続いて体力が落ち、そこに病気が重なった。家族が気づいた時には、もう立ち上がれなかった。',
    free: '食べものが足りない日が続いて痩せていき、最後は病気に耐えられなかった。',
    wild: '獲物の少ない季節が長く続き、弱ったところを病に倒れた。',
    zoo: '食欲が落ちた日が続き、体調を崩してそのまま回復しなかった。',
    default: 'おなかが足りない日が続き、体調を崩したまま回復しなかった。'
  };

  /* 空腹の歩みの割合。多すぎる子は、寿命が少しだけ縮む（体調を崩しやすい）。 */
  function hungerRatio(cat) {
    const story = (cat && cat.story) || [];
    let n = 0, hungry = 0;
    for (let i = 0; i < story.length; i++) {
      if (story[i].kind === 'death') continue;
      const st = story[i].stats || statsAt(cat, i);
      n += 1;
      if (st.food <= FATE.HUNGRY) hungry += 1;
    }
    return n ? hungry / n : 0;
  }

  function hungerToll(cat, rng) {
    if (!cat || cat.klass === 'wild' || cat.special) return false;
    if (cat.nekomata || cat.maneki) return false;
    const age = Number(cat.ageYears) || 0;
    if (age < 3) return false;
    const ratio = hungerRatio(cat);
    if (ratio < 0.30) return false;
    const p = clamp(0.12 + (ratio - 0.30) * 0.8, 0.12, 0.36);
    if (!chance(p, rng)) return false;
    const target = Math.max(2, Math.round(age * (1 - (0.12 + rng() * 0.12)) * 100) / 100);
    if (target >= age - 0.1) return false;
    const story = cat.story;
    const keep = [];
    for (let i = 0; i < story.length; i++) {
      const s = story[i];
      if (s.kind === 'birth' || s.age < target - 0.001) keep.push(s);
    }
    if (keep.length < 5) return false;
    const key = cat.klass === 'wild' ? 'wild'
      : cat.route === 'zoo' ? 'zoo'
      : (cat.adoptIndex != null || cat.route === 'owned' || cat.route === 'purebred') ? 'home' : 'free';
    cat.ageYears = target;
    cat.ageLabel = ageLabel(target);
    cat.deathCause = 'illness';
    cat.hungerWeak = true;
    cat.hungerRatio = Math.round(ratio * 100) / 100;
    keep.push({
      kind: 'death', age: target, ageLabel: ageLabelFine(target), stage: stageForAge(target),
      season: seasonFor(cat, target), title: '最期', cause: 'illness',
      text: pick(HUNGER_DEATHS[key] || HUNGER_DEATHS.default, rng)
    });
    cat.story = keep;
    applyBaseStats(cat);
    cat.caption = buildCaption(cat, rng);
    return true;
  }

  const PINCH_DEATHS = {
    free: [
      '夜の道路を渡りきれなかった。最後に見たのは、まぶしい光だった。',
      'フェンスのすき間に挟まり、どうしても抜けられなかった。'
    ],
    home: [
      '急に具合が悪くなり、そのまま起き上がれなくなった。',
      'のどにものが詰まり、家族が気づいた時には遅かった。'
    ],
    wild: [
      '縄張り争いの傷が深く、その夜のうちに息を引き取った。',
      '崖を踏み外し、二度と立ち上がれなかった。'
    ],
    default: ['思わぬ事故にあい、その場で動かなくなった。']
  };

  /* 2択の「拾われる」で、その場で家族の猫になる */
  function insertAdopt(cat, idx) {
    if (cat.adoptIndex != null || cat.adopted) return false;
    const cur = cat.story[idx];
    const next = cat.story[idx + 1];
    const gap = next ? Math.max(0, next.age - cur.age) : 0.2;
    const a = Math.round((cur.age + gap * 0.5) * 100) / 100;
    const rng = statRng(cat, 0x77 + idx * 11);
    const text = pick(ADOPT_TEXTS[cat.route] || ADOPT_TEXTS.street, rng);
    cat.adopted = true;
    cat.adoptIndex = idx + 1;
    cat.adoptTitle = '拾われる';
    cat.adoptText = text;
    cat.story.splice(idx + 1, 0, {
      kind: 'adopt', age: a, ageLabel: ageLabel(a), stage: stageForAge(a),
      title: '拾われる', adoptTitle: '拾われる', text, adopted: true,
      season: seasonFor(cat, a),
      stats: Object.assign({}, cur.stats || baseStats(cat))
    });
    applyBaseStats(cat, { idx: idx, stats: cur.stats || baseStats(cat) });
    return true;
  }

  /* ピンチで命を落とす（ピンチ回避に失敗したとき） */
  function killAt(cat, idx) {
    const cur = cat.story[idx];
    const a = Math.max(0.08, Math.round((Number(cur.age) || 0.08) * 100) / 100);
    cat.ageYears = a;
    cat.ageLabel = ageLabel(a);
    cat.deathCause = 'pinch';
    cat.earlyDeath = true;
    const key = cat.klass === 'wild' ? 'wild'
      : (cat.adoptIndex != null || cat.route === 'owned' || cat.route === 'purebred') ? 'home' : 'free';
    const rng = statRng(cat, 0x3311 + idx * 7);
    const text = pick(PINCH_DEATHS[key] || PINCH_DEATHS.default, rng);
    cat.story = cat.story.slice(0, idx + 1);
    cat.story.push({
      kind: 'death', age: a, ageLabel: ageLabel(a), stage: stageForAge(a),
      title: '最期', text: text, cause: 'pinch',
      stats: Object.assign({}, cur.stats || baseStats(cat))
    });
    cat.caption = buildCaption(cat, rng);
  }

  /* 寿命 +1〜3年。残りの猫生に新しい歩みを足し、最期を先に延ばす。 */
  function extendLife(cat, years) {
    const oldAge = Number(cat.ageYears) || 0;
    const target = Math.round(Math.min(oldAge + (Number(years) || 0), 32) * 100) / 100;
    if (target <= oldAge + 0.02) return 0;
    const added = Math.round((target - oldAge) * 100) / 100;
    cat.ageYears = target;
    cat.ageLabel = ageLabel(target);
    cat.lifeBonus = Math.round(((cat.lifeBonus || 0) + added) * 100) / 100;

    const story = cat.story;
    if (story[story.length - 1].kind === 'death') story.pop();
    const last = story[story.length - 1];
    const rng = statRng(cat, 0x2f1d + story.length * 17);
    /* 延びた年数ぶん、歩みも増やす（1年≒3歩） */
    const n = Math.max(1, Math.min(14, Math.round(added * 3.2)));
    const usedTexts = {};
    story.forEach(s => { usedTexts[s.text] = 1; });
    const pool = storyPool(cat);
    const extStart = story.length;
    for (let k = 1; k <= n; k++) {
      const a = last.age + (target - last.age) * (k / (n + 1));
      const stage = stageForAge(a);
      const titles = STORY_TITLES[stage] || STORY_TITLES.adult;
      const season = seasonFor(cat, a);
      const e = pickStoryEvent(pool, usedTexts, a, rng, season);
      story.push({
        kind: 'event', age: Math.round(a * 100) / 100, ageLabel: ageLabelFine(a), stage, season,
        title: titles[(k + story.length) % titles.length],
        text: e ? e.text : fallbackStoryText(stage, rng, usedTexts)
      });
    }
    const death = deathOf(cat, rng);
    cat.deathCause = death.cause;
    story.push({
      kind: 'death', age: target, ageLabel: ageLabelFine(target), stage: stageForAge(target),
      season: seasonFor(cat, target), title: '最期', text: death.text, cause: death.cause
    });
    cat.caption = buildCaption(cat, rng);
    applyBaseStats(cat, { idx: extStart - 1, stats: story[extStart - 1].stats });
    return added;
  }

  function statChips(fx) {
    const out = [];
    if (fx.energy) out.push('❤️' + (fx.energy > 0 ? '+' : '') + fx.energy);
    if (fx.food) out.push('🐟' + (fx.food > 0 ? '+' : '') + fx.food);
    if (fx.luck) out.push('🍀' + (fx.luck > 0 ? '+' : '') + fx.luck);
    return out.join(' ');
  }

  /* 選んだ2択を、その後の展開に反映する */
  function applyChoice(cat, idx, optIdx) {
    const step = cat && cat.story ? cat.story[idx] : null;
    if (!step || !step.choice) return null;
    if (step.chosen != null) return step.fx || null;
    const opt = step.choice.options[optIdx];
    if (!opt) return null;
    const fx = opt.effect || {};
    const out = { chips: statChips(fx), headlines: [], lifeAdded: 0, adopted: false, boss: false, died: false, trait: null, trace: null };
    step.chosen = optIdx;

    /* この選択が、その子の気質と持ち物をどう育てたか */
    const fl = choiceFlavor(step.choice.id, optIdx);
    if (fl) {
      if (fl.trace && TRACE_MAP[fl.trace]) {
        out.trace = { key: fl.trace, icon: TRACE_MAP[fl.trace].icon, label: TRACE_MAP[fl.trace].label };
      }
      if (fl.trait) {
        const tk = Object.keys(fl.trait).sort((a, b) => (fl.trait[b] - fl.trait[a]) || (TRAIT_KEYS.indexOf(a) - TRAIT_KEYS.indexOf(b)));
        if (tk.length) out.trait = { key: tk[0], icon: TRAITS[tk[0]].icon, label: TRAITS[tk[0]].noun, word: TRAITS[tk[0]].noun };
      }
    }

    if (fx.adopt && cat.adoptIndex == null) {
      if (insertAdopt(cat, idx)) {
        out.adopted = true;
        out.headlines.push('🏡 家族の猫への道が開けた！');
      }
    }
    if (fx.boss && !cat.bossCat) {
      cat.bossCat = true;
      cat.bossTitle = 'ボス猫';
      out.boss = true;
      out.headlines.push('👑 この街のボスへの道！');
    }
    if (fx.life) {
      const add = extendLife(cat, fx.life);
      if (add) {
        out.lifeAdded = add;
        /* 何年延びたかは言わない（寿命は最後まで伏せる） */
        out.headlines.push('✨ ピンチを乗り越えて、長生きできそう！');
      }
    }
    if (fx.risk) {
      const r = statRng(cat, 0x7f4a + idx * 31 + optIdx)();
      /* 🍀幸運は事故を避け、🐟空腹は危険に弱い（ピンチ❤️は演出で知らせる） */
      const risk = clamp(fx.risk * fateRiskFactor(cat, idx), 0.01, 0.9);
      if (r < risk) {
        killAt(cat, idx);
        /* 倒れた子は、ボスにはなれなかった */
        cat.bossCat = false; cat.bossTitle = null;
        out.boss = false;
        out.died = true;
        out.headlines = ['😿 ピンチに巻き込まれた…'];
      } else {
        cat.pinchAvoided = true;
        out.headlines.push('🍀 間一髪で逃げきった！');
      }
    }
    step.fx = out;
    return out;
  }

  /* ---------- 実績・称号 ---------- */
  const ACHIEVEMENTS = [
    { key: 'first', icon: '🐾', name: 'はじめての猫生', desc: '1匹の猫生を最後まで見届けた', tone: 'bronze' },
    { key: 'reinc10', icon: '🔁', name: '転生10回', desc: '10匹の猫生を生きた', tone: 'silver' },
    { key: 'reinc30', icon: '💫', name: '転生30回', desc: '30匹の猫生を生きた', tone: 'gold' },
    { key: 'reinc100', icon: '🌌', name: '転生100回', desc: '100匹の猫生を生きた', tone: 'rainbow' },
    { key: 'adopt', icon: '🏡', name: 'うちの子記念日', desc: '拾われて、家族の猫になった', tone: 'silver' },
    { key: 'adopt5', icon: '🏠', name: '拾われ上手', desc: '5回、家族に迎えられた', tone: 'gold' },
    { key: 'freeKing', icon: '👑', name: '自由の王', desc: '野良のまま10歳を超えた', tone: 'gold' },
    { key: 'boss', icon: '🐯', name: 'この街のボス', desc: 'ボス猫の座をつかんだ', tone: 'gold' },
    { key: 'great', icon: '🎂', name: '大往生', desc: '15歳以上生きた', tone: 'silver' },
    { key: 'legend20', icon: '🌟', name: '伝説の20歳', desc: '20歳まで生きた', tone: 'rainbow' },
    { key: 'quarter', icon: '⭐', name: '四半世紀', desc: '25歳まで生きた', tone: 'rainbow' },
    { key: 'wildSoul', icon: '🐆', name: '野生の魂', desc: '野生のネコ科に生まれた', tone: 'silver' },
    { key: 'bigCat', icon: '🦁', name: '大型ネコ科', desc: 'ライオンやトラに生まれた', tone: 'gold' },
    { key: 'zooStar', icon: '🎪', name: '動物園のスター', desc: '動物園生まれの一生を生きた', tone: 'silver' },
    { key: 'pure', icon: '📜', name: '血統の誇り', desc: '血統書つきの純血種に生まれた', tone: 'silver' },
    { key: 'rare', icon: '💎', name: 'めずらしい出会い', desc: '1,000匹に1匹より珍しい猫を引いた', tone: 'gold' },
    { key: 'ur', icon: '🌈', name: '奇跡みたいな出会い', desc: '10万匹に1匹より珍しい猫を引いた', tone: 'rainbow' },
    { key: 'all80', icon: '💪', name: 'ステータス全80以上', desc: '❤️🐟🍀がそろって80を超えた', tone: 'gold' },
    { key: 'dex25', icon: '📖', name: '図鑑25種', desc: '25種類の猫を図鑑に載せた', tone: 'silver' },
    { key: 'dex50', icon: '📚', name: '図鑑50種', desc: '50種類の猫を図鑑に載せた', tone: 'gold' },
    { key: 'globe20', icon: '🌍', name: '国めぐり20', desc: '20の国・地域の猫を引いた', tone: 'gold' },
    { key: 'maleCalico', icon: '🍀', name: 'オスの三毛猫の奇跡', desc: '約3万分の1を引いた', tone: 'rainbow' },
    { key: 'oddEye', icon: '👁', name: 'オッドアイ', desc: '左右で色のちがう目に生まれた', tone: 'silver' },
    { key: 'shelter', icon: '🐈', name: '保護施設から', desc: '保護施設生まれの子が家族になった', tone: 'silver' },
    { key: 'pinch', icon: '🎯', name: '九死に一生', desc: 'ピンチを回避した', tone: 'silver' },
    { key: 'nekomata', icon: '🔮', name: '百年猫又', desc: '100歳まで生きて猫又になった', tone: 'rainbow' },
    { key: 'maneki', icon: '🏮', name: '招き猫伝説', desc: 'お店で招き猫に進化した', tone: 'rainbow' }
  ];

  function achievementDef(key) {
    for (let i = 0; i < ACHIEVEMENTS.length; i++) if (ACHIEVEMENTS[i].key === key) return ACHIEVEMENTS[i];
    return null;
  }

  function evaluateAchievements(ctx) {
    const c = ctx || {};
    const cat = c.cat || {};
    const age = Number(cat.ageYears) || 0;
    const route = cat.route;
    const free = route === 'street' || route === 'community' || route === 'feral';
    const muts = (cat.mutations || []).map(m => m.key);
    const peak = c.peak || { energy: 0, food: 0, luck: 0 };
    const got = [];
    const add = (key, ok) => { if (ok) got.push(key); };

    add('first', (c.total || 0) >= 1);
    add('reinc10', (c.total || 0) >= 10);
    add('reinc30', (c.total || 0) >= 30);
    add('reinc100', (c.total || 0) >= 100);
    add('adopt', (c.adoptCount || 0) >= 1);
    add('adopt5', (c.adoptCount || 0) >= 5);
    add('freeKing', free && !cat.adopted && age >= 10);
    add('boss', !!cat.bossCat);
    add('great', age >= 15);
    add('legend20', age >= 20);
    add('quarter', age >= 25);
    add('wildSoul', cat.klass === 'wild');
    add('bigCat', cat.speciesGroup === 'big');
    add('zooStar', route === 'zoo');
    add('pure', route === 'purebred');
    const prob = Number(cat.probability) || 0;
    add('rare', prob > 0 && prob <= 0.001);
    add('ur', prob > 0 && prob <= 0.00001);
    add('all80', peak.energy >= 80 && peak.food >= 80 && peak.luck >= 80);
    add('dex25', (c.speciesCount || 0) >= 25);
    add('dex50', (c.speciesCount || 0) >= 50);
    add('globe20', (c.countryCount || 0) >= 20);
    add('maleCalico', muts.indexOf('male_calico') >= 0);
    add('oddEye', muts.indexOf('odd_eye') >= 0);
    add('shelter', !!cat.shelterBorn && !!cat.adopted);
    add('pinch', !!cat.pinchAvoided || !!c.pinchAvoided);
    add('nekomata', !!cat.nekomata);
    add('maneki', !!cat.maneki);
    return got;
  }

  /* 追加イベント（季節・生活・野生・長寿）。js/events.js から供給される */
  const EXTRA_EVENTS = (D.EVENTS && D.EVENTS.EVENTS) || [];
  const VIGNETTES = (D.EVENTS && D.EVENTS.VIGNETTES) || [];
  const WILD_VIGNETTES = (D.EVENTS && D.EVENTS.WILD_VIGNETTES) || [];

  function eventFitsCat(e, cat) {
    if (!e) return false;
    if (e.kinds && e.kinds.indexOf(cat.klass) < 0) return false;
    if (e.routes && e.routes.indexOf(cat.route) < 0) return false;
    if (e.groups && (!cat.speciesGroup || e.groups.indexOf(cat.speciesGroup) < 0)) return false;
    return true;
  }

  function seasonVignettes(cat) {
    const src = cat.klass === 'wild' ? WILD_VIGNETTES : VIGNETTES;
    const out = [];
    src.forEach(v => {
      const raw = typeof v === 'string' ? v : (v && v.text);
      if (!raw) return;
      const min = typeof v === 'object' && v.min != null ? v.min : 0.4;
      const max = typeof v === 'object' && v.max != null ? v.max : 30;
      const w = typeof v === 'object' && v.w ? v.w : 1;
      SEASONS.forEach(s => {
        out.push({ w: w, min: min, max: max, season: s, text: String(raw).replace(/\{season\}/g, SEASON_LABEL[s]) });
      });
    });
    return out;
  }

  function storyPool(cat) {
    const out = [];
    const seen = {};
    const add = (e) => {
      if (!e || !e.text || seen[e.text]) return;
      seen[e.text] = 1;
      out.push({ w: e.w || 1, min: e.min == null ? 0 : e.min, max: e.max == null ? Infinity : e.max, season: e.season || null, text: e.text });
    };
    (cat.region && cat.region.events ? cat.region.events : []).forEach(t => add({ w: 1.3, min: 1.4, max: Infinity, text: t }));
    GENERIC_EVENTS(cat).forEach(add);
    EXTRA_EVENTS.forEach(e => { if (eventFitsCat(e, cat)) add(e); });
    if (cat.klass === 'wild') WILD_EVENTS(cat).forEach(add);
    seasonVignettes(cat).forEach(add);
    return out;
  }

  function storyGroup(cat) {
    if (cat.klass === 'wild') return 'out';
    if (cat.route === 'street' || cat.route === 'feral') return 'out';
    return 'home';
  }

  /* 使った文章は used[text] で覚え、同じ猫生で二度と同じ文を出さない */
  function pickStoryEvent(pool, used, age, rng, season) {
    const a = Number(age) || 0;
    const mid = e => e.min + (Math.min(e.max, 30) - e.min) / 2;
    const free = pool.filter(e => !used[e.text]);
    if (!free.length) return null;
    let cands = free.filter(e => a >= e.min && a <= e.max && (!e.season || e.season === season));
    if (!cands.length) cands = free.filter(e => a >= e.min && a <= e.max && !e.season);
    if (!cands.length) cands = free.filter(e => !e.season);
    if (!cands.length) {
      cands = free.slice().sort((x, y) => Math.abs(mid(x) - a) - Math.abs(mid(y) - a)).slice(0, 6);
    }
    const e = cands[pickIndex(cands.map(x => x.w || 1), rng)];
    used[e.text] = 1;
    return e;
  }

  const FALLBACK_TEXTS = {
    kitten: [
      'ころころ転がって、一日の半分を眠って過ごした。',
      '小さな体で、家中（あたり）のすみずみまで探検した。',
      '自分のしっぽを追いかけて、ぐるぐる回った。',
      'はじめて見るものに、そっと前足で触れてみる。',
      '眠くてたまらず、歩きながら目が閉じていく。',
      '低い声で鳴いて、返事を待っていた。',
      '爪を立てる加減がわからず、何度も転んだ。',
      '小さな穴に頭を突っ込んで、抜けなくなった。',
      '人の足音がすると、すぐに顔を上げる。',
      'よく食べ、よく眠り、少しずつ大きくなった。'
    ],
    adult: [
      '同じ場所で、同じ時間に、しっぽをのばして伸びをする。',
      '日だまりを見つけるのが、その日のいちばんの仕事。',
      '高いところに上って、しばらく街を見下ろしていた。',
      '毛づくろいを念入りに済ませてから、眠りにつく。',
      '誰かを待つでもなく、窓の外を眺めていた。',
      'いつもの道を、いつもの順番で歩いて回る。',
      '食べて、眠って、また食べる。それだけの一日。',
      '静かな時間が、長く続いた。',
      '小さな音にも、耳だけはしっかり反応する。',
      '夜になると、ひとりでに目が覚めた。'
    ],
    senior: [
      '歩くのが少しゆっくりになった。それでも、行く場所は決まっている。',
      '長く寝て、起きて、また眠る。それでいい日だった。',
      '日向の場所を、一日かけて少しずつ移動した。',
      '若い猫を、遠くから静かに見ていた。',
      '目を細めて、長いこと座っていた。',
      '呼ばれても、しばらくしてから振り向く。',
      '柔らかい場所を探して、何度も寝返りをうった。',
      '夜中に目が覚めて、しばらく宙を見ていた。',
      'ゆっくり食べて、ゆっくり眠った。',
      '今日も無事に、一日が終わろうとしている。'
    ]
  };

  function fallbackStoryText(stage, rng, used) {
    const pool = FALLBACK_TEXTS[stage] || FALLBACK_TEXTS.adult;
    const fresh = pool.filter(t => !used || !used[t]);
    const list = fresh.length ? fresh : pool;
    const text = list[Math.floor(rng() * list.length) % list.length];
    if (used) used[text] = 1;
    return text;
  }

  /* ---------- 「拾われる」＝家族に迎えられるイベント ---------- */
  const ADOPT_TEXTS = {
    community: [
      'いつも餌をくれていた人が、とうとう家に連れて帰ってくれた。玄関で、はじめて名前を呼ばれる。',
      '町内の人が保護してくれた。ケージの中で、はじめて人の手の温かさを知る。'
    ],
    street: [
      '段ボールの中で丸くなっていたところを、人がそっと抱き上げた。はじめて腕の中で眠る。',
      '雨の夜、車の下で震えているのを見つけられ、タオルに包まれて連れて行かれた。',
      '毎朝パンをくれていた店の人が、とうとう「うちにおいで」と言った。'
    ],
    feral: [
      '罠にかかって保護された。ケージの前で毎日話しかけてくる人がいて、ある日、逃げなかった。'
    ],
    owned: [
      '保護施設の見学会で、家族が「この子」と指をさした。その日から、家の猫。',
      'ケージの前で毎日立ち止まる人がいて、とうとう家に連れて帰られた。'
    ]
  };

  /* 野良・地域猫・野生化したイエネコ、そして保護施設生まれの子が、途中で人に拾われる */
  function adoptionRoll(cat, rng) {
    if (!cat || cat.klass === 'wild' || cat.special) return false;
    const route = cat.route;
    if (route === 'owned' && cat.shelterBorn) return chance(0.8, rng);
    if (route !== 'street' && route !== 'community' && route !== 'feral') return false;
    let p = route === 'community' ? 0.42 : route === 'street' ? 0.30 : 0.10;
    /* 🍀幸運の子は、人に見つけてもらいやすい */
    if (baseStats(cat).luck >= FATE.LUCKY) p = Math.min(0.92, p * 1.18);
    return chance(p, rng);
  }

  /* ---------- 猫生ストーリー（1ステップずつ歩く） ----------
     野良として生まれた猫は、途中で人に拾われて「おうちの猫」になることがある。
     その回のイベントを「拾われる」ステップに差し替え、以降は家の中の出来事になる。
     2択は cozy（日常）と fate（分かれ道）の2種類。fate は寿命・境遇を変える。 */
  function buildStory(cat, rng) {
    const age = Math.max(0.08, Number(cat.ageYears) || 0.08);

    /* 超レア：ご長寿の猫が、ごく稀に100年を生きる猫又になる */
    if (shouldNekomata(cat, rng)) return buildNekomataStory(cat, rng);

    const total = storyStepCount(age);
    const eventCount = Math.max(1, total - 2);

    const steps = [{
      kind: 'birth', age: 0, ageLabel: '生まれた日', stage: 'kitten', title: '誕生',
      season: seasonFor(cat, 0), text: birthText(cat, rng)
    }];

    const pool = storyPool(cat);
    const used = {};
    const group = storyGroup(cat);

    const slots = [];
    for (let i = 1; i <= eventCount; i++) {
      const slot = age / (eventCount + 1);
      let a = slot * i + (rng() - 0.5) * slot * 0.4;
      a = clamp(a, Math.max(0.02, slot * (i - 1) + 0.01), Math.min(age * 0.96, slot * (i + 1) - 0.01));
      slots.push(Math.round(a * 100) / 100);
    }

    /* 拾われるスロット（2択イベントと重ならないように先に決める） */
    let adoptSlot = 0;
    if (adoptionRoll(cat, rng)) {
      const cands = [];
      for (let i = 1; i <= eventCount; i++) cands.push(i);
      const early = cands.filter(i => slots[i - 1] < 3);
      const poolA = early.length ? early : cands;
      adoptSlot = poolA[Math.floor(rng() * poolA.length)];
    }

    const choiceFor = pickChoices(cat, slots, group, adoptSlot > 0, rng, adoptSlot ? [adoptSlot] : []);

    const homePool = adoptSlot ? storyPool(Object.assign({}, cat, { route: 'owned', klass: 'domestic' })) : null;

    for (let i = 1; i <= eventCount; i++) {
      const a = slots[i - 1];
      const stage = stageForAge(a);
      const titles = STORY_TITLES[stage] || STORY_TITLES.adult;
      const title = titles[(i - 1) % titles.length];
      const ch = choiceFor[i];
      const chOutdoorAfterAdoption = ch && adoptSlot && i > adoptSlot && ch.scene === 'out';

      const season = seasonFor(cat, a);

      if (i === adoptSlot) {
        const text = pick(ADOPT_TEXTS[cat.route] || ADOPT_TEXTS.street, rng);
        const adoptTitle = cat.route === 'owned' ? '家族に迎えられる' : '拾われる';
        cat.adopted = true;
        cat.adoptIndex = i;
        cat.adoptTitle = adoptTitle;
        cat.adoptText = text;
        steps.push({
          kind: 'adopt', age: a, ageLabel: ageLabelFine(a), stage, title: adoptTitle,
          adoptTitle: adoptTitle, text: text, adopted: true, season: season
        });
        continue;
      }

      if (ch && !chOutdoorAfterAdoption) {
        steps.push({
          kind: 'event', age: a, ageLabel: ageLabelFine(a), stage, title,
          text: ch.question, season: season,
          choice: {
            id: ch.id, tier: ch.tier,
            question: ch.question,
            options: ch.options.map(o => ({ label: o.label, text: o.text, effect: Object.assign({}, o.effect || {}) }))
          },
          chosen: null
        });
        continue;
      }
      const useHome = adoptSlot && i > adoptSlot;
      const e = pickStoryEvent(useHome ? homePool : pool, used, a, rng, season);
      steps.push({
        kind: 'event', age: a, ageLabel: ageLabelFine(a), stage, title, season: season,
        text: e ? e.text : fallbackStoryText(stage, rng, used)
      });
    }

    const death = deathOf(cat, rng);
    cat.deathCause = death.cause;
    steps.push({
      kind: 'death', age: age, ageLabel: ageLabelFine(age), stage: stageForAge(age),
      title: '最期', text: death.text, cause: death.cause, season: seasonFor(cat, age)
    });

    cat.story = steps;
    applyBaseStats(cat);

    /* 🐟空腹が長く続いた子は、体調を崩しやすい（寿命が少し縮む） */
    if (hungerToll(cat, statRng(cat, 0x4b17))) return cat.story;

    /* 超レア：🍀運の高い子が、お店に拾われて招き猫になる */
    if (manekiRoll(cat, rng)) decorateManeki(cat, rng);

    return cat.story;
  }

  function buildTimeline(cat, rng) {
    return buildStory(cat, rng);
  }

  function birthText(cat, rng) {
    const sib = 2 + Math.floor(rng() * 4);
    const pos = pick(['末っ子', '真ん中', 'いちばん大きい子', 'いちばん小さい子', '甘えん坊'], rng);
    if (cat.klass === 'wild') {
      const sp = cat.species;
      const where = {
        forest: '森の奥の倒木の下', savanna: 'サバンナの草むら', snow: '雪の岩陰',
        jungle: 'ジャングルの茂み', desert: '砂の窪地', island: '島の森の洞窟',
        mountain: '岩山の裂け目', coast: '海沿いの岩の隙間'
      }[sp.scene] || '茂みの中';
      if (cat.route === 'zoo') {
        return `動物園の産室で、${sp.name}の赤ちゃんとして生まれる。ガラスの向こうから歓声が聞こえた。`;
      }
      return `${sp.range}の${where}で、${sp.name}の赤ちゃんとして生まれる。きょうだいは${sib}匹。`;
    }
    if (cat.route === 'purebred') {
      return `ブリーダーのケージで、${cat.speciesName}の血統書つきの子として生まれる。値札がついた瞬間。`;
    }
    if (cat.route === 'owned') {
      if (cat.special) {
        return cat.special.key === 'hemingway'
          ? 'ヘミングウェイ博物館の裏庭で、6本指の血を引く子として生まれる。'
          : '首相官邸の一角で、白黒の子猫として生まれる。';
      }
      const homes = [
        `${cat.region.name}・${cat.city}の家の押し入れで、きょうだい${sib}匹の${pos}として生まれる。`,
        `${cat.region.name}・${cat.city}の窓辺で、きょうだい${sib}匹の${pos}として生まれる。`,
        `${cat.region.name}・${cat.city}の保護施設で、きょうだい${sib}匹の${pos}として生まれる。`
      ];
      const home = homes[Math.floor(rng() * homes.length) % homes.length];
      if (home === homes[2]) cat.shelterBorn = true;
      return home;
    }
    if (cat.route === 'community') {
      return `${cat.region.name}・${cat.city}の路地の奥で、地域の人が見守る中、きょうだい${sib}匹の${pos}として生まれる。`;
    }
    if (cat.route === 'street') {
      return `${cat.region.name}・${cat.city}の駐車場の車の下で、誰にも知られずきょうだい${sib}匹の${pos}として生まれる。`;
    }
    return `${cat.region.name}の${cat.city}郊外、人の気配の薄い茂みで、野生に戻った母猫から${sib}匹きょうだいの${pos}として生まれる。`;
  }

  function GENERIC_EVENTS(cat) {
    const r = cat.route;
    const out = [];
    if (r === 'owned' || r === 'purebred') {
      out.push({ w: 1.4, min: 0.1, max: 1.2, text: '目が開いて、はじめて人の顔をじっと見つめる。' });
      out.push({ w: 1.3, min: 0.2, max: 1.4, text: 'よちよち歩きで、きょうだいのしっぽを追いかける。' });
      out.push({ w: 1.2, min: 0.6, max: 2, text: 'ワクチンの注射をされ、しばらく耳を伏せてふくれている。' });
      out.push({ w: 1.2, min: 1, max: 4, text: '初めてキャットタワーを上りきり、頂上から家族を見下ろして満足げ。' });
      out.push({ w: 1.0, min: 2, max: 7, text: '避妊・去勢手術を受け、その日は一日中ぐったりして過ごす。' });
      out.push({ w: 0.9, min: 2, max: 9, text: '家族が引っ越し、新しい家の匂いを3日かけて確認する。' });
      out.push({ w: 0.8, min: 3, max: 12, text: '深夜3時、家中を全力疾走する「大運動会」を開催。家族は全員起きた。' });
      out.push({ w: 1.0, min: 2, max: 10, text: '飼い主のノートPCのキーボードの上で寝て、謎の文字列をチャットに誤送信してしまった。' });
      out.push({ w: 1.0, min: 1.5, max: 9, text: '買ったばかりの高級ベッドを無視して、その箱のほうで眠る。' });
      out.push({ w: 0.9, min: 2, max: 12, text: 'オンライン会議の画面の前を、しっぽを立ててゆっくり横切った。' });
      out.push({ w: 0.8, min: 3, max: 14, text: '障子の穴を鼻先で広げてから、ばつが悪そうに去っていった。' });
      out.push({ w: 0.8, min: 4, max: 16, text: '落として転がった枝豆を1粒だけ運んできて、誇らしげに足もとに並べた。' });
      out.push({ w: 0.7, min: 2, max: 18, text: '宅配便の箱が開く前から、中身より箱に夢中。' });
      out.push({ w: 0.7, min: 5, max: 14, text: '少しずつ高いところに登らなくなり、日の当たる場所を選ぶようになる。' });
      out.push({ w: 0.7, min: 8, max: 18, text: '健康診断で「腎臓の数値が少し高い」と言われ、療法食に切り替わる。' });
      out.push({ w: 0.6, min: 10, max: 22, text: '若い猫にちょっかいを出されても、もう本気で怒らなくなった。' });
    } else if (r === 'community') {
      out.push({ w: 1.4, min: 0.1, max: 1.2, text: '段ボールの家の中で、はじめて外の音を聞く。' });
      out.push({ w: 1.2, min: 0.5, max: 2, text: '耳に小さな切れ込み（TNRの印）が入り、地域猫の一員になる。' });
      out.push({ w: 1.2, min: 1, max: 6, text: '毎朝同じ時間に餌やりさんの自転車の音を聞き分けて走っていく。' });
      out.push({ w: 1.0, min: 1, max: 8, text: '冬の寒さをしのぐため、駐車場のエンジンルームに潜り込む。' });
      out.push({ w: 0.8, min: 2, max: 10, text: '見知らぬ人には絶対に触らせないが、餌やりさんにはお腹を見せる。' });
      out.push({ w: 0.7, min: 3, max: 12, text: '掲示板に「この猫に餌をあげないでください」と書かれる。' });
      out.push({ w: 0.9, min: 2, max: 14, text: '餌やりさんの自転車の音を、20メートル手前で聞き分けて猛ダッシュする。' });
      out.push({ w: 0.8, min: 2, max: 12, text: '新しいバイクのシートを、ぜんぶ毛だらけにした。' });
    } else if (r === 'street') {
      out.push({ w: 1.4, min: 0.1, max: 1.1, text: '母猫のお腹の下で、はじめて目を開ける。' });
      out.push({ w: 1.3, min: 0.4, max: 2, text: '母猫とはぐれ、雨の夜に初めてひとりで餌を探す。' });
      out.push({ w: 1.2, min: 0.8, max: 4, text: '同じ縄張りの大きなオスに追われ、塀の上まで逃げる。' });
      out.push({ w: 1.0, min: 1, max: 6, text: 'コンビニの店先で、店員がこっそり出してくれるおにぎりにありつく。' });
      out.push({ w: 0.9, min: 1, max: 8, text: '車の下で眠るのが癖になり、何度も危ない目にあう。' });
      out.push({ w: 0.7, min: 2, max: 12, text: '保護活動の人が罠を仕掛け、ケージの中で一日を過ごす。' });
      out.push({ w: 1.0, min: 1, max: 14, text: 'コンビニの自動ドアの前で、開くたびに中を覗き、閉まるとまた待つ。' });
      out.push({ w: 0.9, min: 2, max: 12, text: 'ガードレールの上で、いちばん誇らしげな顔をして座ってみせる。' });
      out.push({ w: 0.6, min: 3, max: 10, text: '一度だけ、犬に勝った。' });
    } else if (r === 'feral') {
      out.push({ w: 1.4, min: 0.2, max: 1.2, text: '茂みの奥で、はじめて外の世界の匂いをかいだ。' });
      out.push({ w: 1.3, min: 0.5, max: 3, text: '人の気配だけで茂みに消える。誰にも触られたことがない。' });
      out.push({ w: 1.1, min: 1, max: 6, text: '夜ごと縄張りを巡回し、匂いで境界線を引き直す。' });
      out.push({ w: 0.9, min: 1, max: 9, text: '小さな獲物を捕らえ、それを唯一の糧にして生き延びる。' });
    } else if (r === 'zoo') {
      out.push({ w: 1.4, min: 0.1, max: 1.2, text: '産室の床で、はじめてよろよろと立ち上がる。' });
      out.push({ w: 1.2, min: 0.5, max: 3, text: '飼育員が名前を呼ぶと、ガラスの前まで歩いてくるようになる。' });
      out.push({ w: 1.0, min: 1, max: 8, text: '毎日決まった時間に肉が運ばれ、食べ残すことすらある。' });
      out.push({ w: 0.8, min: 3, max: 15, text: '種の保存のため、遠くの動物園から見合い相手がやってくる。' });
      out.push({ w: 0.9, min: 1, max: 12, text: 'ガラスの前に来たお客さんにおしりを向けて寝そべり、それでも人気だった。' });
    }
    return out;
  }

  function WILD_EVENTS(cat) {
    const g = cat.speciesGroup;
    const out = [];
    if (g === 'big') {
      out.push({ w: 1.2, min: 1.5, max: 4, text: '母の狩りについて行き、初めて自分で獲物に飛びかかる。' });
      out.push({ w: 1.0, min: 2, max: 6, text: '縄張りを巡って、大きなオスと激しく睨み合う。' });
      out.push({ w: 0.9, min: 3, max: 10, text: '群れ（あるいは単独の縄張り）の主になり、毎日同じ道を歩く。' });
      out.push({ w: 0.7, min: 4, max: 14, text: '干ばつで獲物が減り、何日も空腹のまま歩き続ける。' });
      out.push({ w: 0.6, min: 5, max: 15, text: '観光車のエンジン音を、もう驚かなくなっている。' });
    } else if (g === 'small') {
      out.push({ w: 1.2, min: 0.8, max: 3, text: '小さな体で砂の下の虫やトカゲを掘り出し、生き抜く。' });
      out.push({ w: 1.0, min: 1, max: 5, text: '猛禽の影を見た瞬間、岩の隙間に消える。' });
      out.push({ w: 0.8, min: 2, max: 8, text: '夜の冷え込みに備え、自分の毛に埋もれて丸くなる。' });
    } else {
      out.push({ w: 1.2, min: 1, max: 4, text: '自分の縄張りを匂いで囲い、毎晩同じ順番で見回る。' });
      out.push({ w: 1.0, min: 1.5, max: 6, text: '木の上で獲物を待ち伏せし、一度で仕留める。' });
      out.push({ w: 0.9, min: 2, max: 9, text: '人間の集落に近づき、鶏小屋を狙って追い払われる。' });
      out.push({ w: 0.7, min: 3, max: 12, text: '道路を渡る動物の匂いを覚え、夜は道を避けるようになる。' });
    }
    return out;
  }

  function deathOf(cat, rng) {
    const age = cat.ageYears;
    const route = cat.route;
    const old = age >= 15;
    const veryOld = age >= 20;

    if (age < 1) {
      const pool = (route === 'owned' || route === 'purebred')
        ? ['猫風邪をこじらせ、母猫の体温の中で息を引き取る。',
          '先天性の心臓の病気が見つかり、獣医の腕の中で眠るように逝く。',
          '誤って飲み込んだもので腸が詰まり、手術に間に合わない。']
        : (route === 'wild' || route === 'zoo')
          ? ['きょうだいより小さく生まれ、母の乳に届かないまま冷えていく。', '猛禽にさらわれ、あっという間の最期。']
          : ['寒さと飢えに耐えられず、母猫の胸に抱かれたまま冷たくなる。',
            'カラスに狙われ、庇われたものの助からない。',
            '猫風邪で目が塞がり、食べ物にありつけないまま弱っていく。'];
      return { cause: 'early', text: pick(pool, rng) };
    }

    if (cat.adopted) {
      if (veryOld) return { cause: 'natural', text: '家の中で、日向ぼっこの場所に丸くなったまま動かなくなっていた。大往生。' };
      const homePool = [
        { c: 'illness', t: '病気が進み、家族に看取られて静かに息を引き取る。' },
        { c: 'natural', t: 'ある日から食べなくなり、いつもの毛布の上で眠るように逝く。' },
        { c: 'illness', t: '腎臓の病気が進み、病院の帰り道、腕の中で息を引き取る。' }
      ];
      const hd = pick(homePool, rng);
      return { cause: hd.c, text: hd.t };
    }

    if (route === 'owned' || route === 'purebred' || route === 'community') {
      if (veryOld) return { cause: 'natural', text: '前の日まで日向ぼっこをしていた。ある朝、いつもの場所で動かなくなっていた。大往生。' };
      if (old) return { cause: 'illness', text: '腎臓の病気が進み、獣医に看取られて静かに息を引き取る。' };
      const pool = [
        { c: 'illness', t: '病気が急に進み、病院に運ばれたものの帰らなかった。' },
        { c: 'accident', t: '珍しく外に出た日に、車にはねられる。' },
        { c: 'illness', t: '血栓で後ろ足が動かなくなり、そのまま眠るように逝く。' },
        { c: 'natural', t: 'ある日を境に食べなくなり、静かに息を引き取る。' }
      ];
      const d = pick(pool, rng);
      return { cause: d.c, text: d.t };
    }

    if (route === 'zoo') {
      return { cause: 'natural', text: '獣医と飼育員に見守られ、眠るように逝く。長生きした。' };
    }

    if (route === 'wild') {
      if (old) return { cause: 'natural', text: '野生としては長生きの部類。縄張りの岩の上で、静かに動かなくなっていた。' };
      const pool = [
        { c: 'starve', t: '獲物が減った季節、十分に食べられないまま力尽きる。' },
        { c: 'fight', t: '縄張り争いで深い傷を負い、傷が癒えないまま息を引き取る。' },
        { c: 'human', t: '道路を渡ったところを車に撥ねられる。' },
        { c: 'human', t: '密猟者の罠にかかり、抜け出せないまま朽ちる。' },
        { c: 'illness', t: '感染症が群れに広がり、回復しないまま倒れる。' }
      ];
      if (cat.speciesGroup === 'island') pool.push({ c: 'human', t: '島の道路を渡る途中、車と出会う。' });
      const d = pick(pool, rng);
      return { cause: d.c, text: d.t };
    }

    const pool = [
      { c: 'accident', t: '夜の道路を渡った瞬間、ライトに目を奪われる。' },
      { c: 'starve', t: '餌やりが途絶えた冬、痩せて歩けなくなる。' },
      { c: 'illness', t: '猫エイズと白血病を患い、体力が尽きる。' },
      { c: 'human', t: '保健所に引き取られ、帰ってこなかった。' },
      { c: 'fight', t: '縄張り争いの傷が化膿し、熱に倒れる。' },
      { c: 'accident', t: '悪天候の夜、暖を求めてエンジンルームに入り込む。' }
    ];
    if (cat.country && (cat.country.key === 'au' || cat.country.key === 'nz')) pool.push({ c: 'human', t: '在来種を守るための駆除の対象になり、静かに消える。' });
    const d = pick(pool, rng);
    return { cause: d.c, text: d.t };
  }

  function buildCaption(cat, rng) {
    if (cat.nekomata) return '100年を生きた、猫又。町内の悩み相談は、今日も満員御礼。';
    if (cat.maneki) return '商店街の看板猫。右手を上げて、今日もお客さんを呼んでいる。';
    const a = Math.floor(cat.ageYears);
    if (cat.klass === 'wild') {
      const tail = cat.route === 'zoo'
        ? 'ガラスの向こうで、毎日同じ時間にごはんが出てくる暮らし。'
        : pick(['誰にも名前をつけられないまま、生きて、死んだ。',
          'この星のどこかで、確かに息をしていた。',
          '人の知らないところで、狩りをして、眠った。'], rng);
      return cat.speciesName + '。' + tail;
    }
    if (cat.adopted) {
      const who = `${cat.region.name}の${cat.speciesName}の${D.SEX_LABEL[cat.sex]}。`;
      if (a < 4) return who + '拾われて、ほんの少しだけ家の猫だった。';
      if (a >= 15) return who + '拾われた日から、ずっと窓辺の猫だった。大往生。';
      return who + pick(['拾われてからは、毎日が同じで、毎日がしあわせだった。',
        'あの夜に拾われなかったら、知らないまま終わっていた毎日。',
        '名前を呼ばれるたびに、しっぽを立てて応えた。'], rng);
    }
    const head = `${cat.region.name}の${cat.statusLabel}、${cat.speciesName}の${D.SEX_LABEL[cat.sex]}。`;
    if (a >= 18) return head + '信じられないほど長く生きた、大往生の一生。';
    if (a < 1) return head + 'ほんの数か月で、この世界を去った。';
    if (a < 4) return head + '短くて、けれど確かに生きた' + a + '年。';
    const tails = {
      owned: ['毎日同じ家で、同じ人を待っていた。', '窓辺と、ごはんと、あなたの膝。それが全部だった。', '名前を呼ばれるたびに、尻尾を立てて応えた。'],
      purebred: ['血統書には書ききれない' + a + '年だった。', '値段より長く生きた、誇り高い一生。'],
      community: ['誰のものでもないのに、みんなに愛された。', '路地の隅に、確かな居場所があった。'],
      street: ['誰にも看取られないまま、それでも生き抜いた。', '街のすき間で、静かに生きていた。'],
      feral: ['人に知られぬまま、野生として生きた。', '最後まで誰にも触らせなかった。']
    };
    return head + pick(tails[cat.route] || tails.owned, rng);
  }

  /* ---------- 図鑑 ---------- */
  function dexCatalog() {
    return {
      species: D.COATS.map(c => ({ key: 'coat:' + c.key, name: c.name, group: 'coat' }))
        .concat(D.BREEDS.map(b => ({ key: 'breed:' + b.key, name: b.name, group: 'breed' })))
        .concat(D.WILD.map(w => ({ key: 'wild:' + w.key, name: w.name, group: 'wild' }))),
      countries: D.COUNTRIES.map(c => ({ key: c.key, name: c.name, flag: c.flag })),
      mutations: D.MUTATIONS.map(m => ({ key: m.key, name: m.name, note: m.note })),
      tiers: 5
    };
  }

  return {
    mulberry32, newSeed, rollCat, sampleLifespan, buildTimeline, buildStory,
    stageForAge, storyStepCount, STAGES, STAGE_LABEL, STEP_TABLE,
    ageLabelFine, SEASONS, SEASON_LABEL, seasonOfAge, seasonFor, seasonLabel, seasonEmoji,
    formatCount, formatProb, formatOneIn, ageText, ageLabel,
    tierOf, rareWord, dexCatalog, deathOf, buildCaption,
    statusOf, rareNotes, bossAt, STATUS_VIEW, IUCN_JP,
    /* 年をとる・分岐・やり込み */
    AGE_TICKS, NEKOMATA_TICKS, ageTicks, ageScalePercent, MILESTONES, milestoneAt, milestonesPassed,
    statsAt, peakStats, baseStats, statChips, FATE, fateAt, fateRiskFactor, hungerRatio, hungerToll,
    CHOICE_EVENTS, applyChoice, extendLife, insertAdopt, killAt, statRng,
    /* 気質（性格）と思い出の痕跡 */
    TRAITS, TRAIT_KEYS, TRAIT_STAGE1, TRAIT_DUO, traitBase, personalityAt, personalityText,
    CHOICE_FLAVOR, choiceFlavor, TRACES, TRACE_MAX, tracesAt,
    ACHIEVEMENTS, achievementDef, evaluateAchievements
  };
});
