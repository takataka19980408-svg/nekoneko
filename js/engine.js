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
    cat.rarity = rarityOf(cat);
    cat.ageLabel = ageLabel(cat.ageYears);
    cat.timeline = buildTimeline(cat, rng);
    cat.caption = buildCaption(cat, rng);
    cat.dex = {
      species: cat.speciesKey,
      country: cat.region.bucket,
      mutation: cat.mutations.map(m => m.key),
      rarity: cat.rarity,
      klass: cat.klass
    };
    return cat;
  }

  /* ---------- レアリティ ---------- */
  const RARITY_ORDER = ['N', 'R', 'SR', 'SSR', 'UR'];
  function rarityOf(cat) {
    const pop = cat.population;
    let i = pop >= 400000 ? 0 : pop >= 40000 ? 1 : pop >= 3000 ? 2 : pop >= 300 ? 3 : 4;
    if (cat.klass === 'wild') i = Math.max(i, 1);
    if (cat.speciesGroup === 'big' || cat.speciesGroup === 'island') i = Math.max(i, 2);
    if (cat.mutations && cat.mutations.some(m => !m.cosmetic)) i = Math.max(i, 2);
    if (cat.special) i = Math.max(i, 3);
    return RARITY_ORDER[i];
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

  /* ---------- 猫生タイムライン ---------- */
  function buildTimeline(cat, rng) {
    const age = cat.ageYears;
    const events = [{ age: 0, kind: 'birth', text: birthText(cat, rng) }];

    if (age >= 2) {
      const pool = [];
      (cat.region.events || []).forEach(t => pool.push({ w: 1.4, min: 1.5, max: Infinity, text: t }));
      GENERIC_EVENTS(cat).forEach(e => pool.push({ w: e.w, min: e.min, max: e.max, text: e.text }));
      if (cat.klass === 'wild') WILD_EVENTS(cat).forEach(e => pool.push({ w: e.w, min: e.min, max: e.max, text: e.text }));

      const count = age < 3 ? 1 : age < 6 ? 2 + (chance(0.4, rng) ? 1 : 0) : 3 + Math.floor(rng() * 3);
      const used = {};
      for (let i = 0; i < count && pool.length; i++) {
        const e = pool.splice(pickIndex(pool.map(x => x.w), rng), 1)[0];
        if (e.min >= age - 0.4) continue;
        const hi = Math.min(e.max === Infinity ? age - 0.4 : e.max, age - 0.3);
        if (hi <= e.min) continue;
        let a = e.min + rng() * (hi - e.min);
        a = clamp(a, e.min, hi);
        const key = Math.round(a);
        if (used[key]) continue;
        used[key] = 1;
        events.push({ age: a, kind: 'event', text: e.text });
      }
    }

    const death = deathOf(cat, rng);
    cat.deathCause = death.cause;
    events.push({ age: Math.max(age, 0), kind: 'death', text: death.text, cause: death.cause });
    events.sort((a, b) => a.age - b.age);
    return events;
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
      return pick([
        `${cat.region.name}・${cat.city}の家の押し入れで、きょうだい${sib}匹の${pos}として生まれる。`,
        `${cat.region.name}・${cat.city}の窓辺で、きょうだい${sib}匹の${pos}として生まれる。`,
        `${cat.region.name}・${cat.city}の保護施設で、きょうだい${sib}匹の${pos}として生まれる。`
      ], rng);
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
      out.push({ w: 1.2, min: 0.6, max: 2, text: 'ワクチンの注射をされ、しばらく耳を伏せてふくれている。' });
      out.push({ w: 1.2, min: 1, max: 4, text: '初めてキャットタワーを上りきり、頂上から家族を見下ろして満足げ。' });
      out.push({ w: 1.0, min: 2, max: 7, text: '避妊・去勢手術を受け、その日は一日中ぐったりして過ごす。' });
      out.push({ w: 0.9, min: 2, max: 9, text: '家族が引っ越し、新しい家の匂いを3日かけて確認する。' });
      out.push({ w: 0.8, min: 3, max: 12, text: '深夜に家中を走り回る「運動会」を開催し、家族を起こす。' });
      out.push({ w: 0.7, min: 5, max: 14, text: '少しずつ高いところに登らなくなり、日の当たる場所を選ぶようになる。' });
      out.push({ w: 0.7, min: 8, max: 18, text: '健康診断で「腎臓の数値が少し高い」と言われ、療法食に切り替わる。' });
      out.push({ w: 0.6, min: 10, max: 22, text: '若い猫にちょっかいを出されても、もう本気で怒らなくなった。' });
    } else if (r === 'community') {
      out.push({ w: 1.2, min: 0.5, max: 2, text: '耳に小さな切れ込み（TNRの印）が入り、地域猫の一員になる。' });
      out.push({ w: 1.2, min: 1, max: 6, text: '毎朝同じ時間に餌やりさんの自転車の音を聞き分けて走っていく。' });
      out.push({ w: 1.0, min: 1, max: 8, text: '冬の寒さをしのぐため、駐車場のエンジンルームに潜り込む。' });
      out.push({ w: 0.8, min: 2, max: 10, text: '見知らぬ人には絶対に触らせないが、餌やりさんにはお腹を見せる。' });
      out.push({ w: 0.7, min: 3, max: 12, text: '掲示板に「この猫に餌をあげないでください」と書かれる。' });
    } else if (r === 'street') {
      out.push({ w: 1.3, min: 0.4, max: 2, text: '母猫とはぐれ、雨の夜に初めてひとりで餌を探す。' });
      out.push({ w: 1.2, min: 0.8, max: 4, text: '同じ縄張りの大きなオスに追われ、塀の上まで逃げる。' });
      out.push({ w: 1.0, min: 1, max: 6, text: 'コンビニの店先で、店員がこっそり出してくれるおにぎりにありつく。' });
      out.push({ w: 0.9, min: 1, max: 8, text: '車の下で眠るのが癖になり、何度も危ない目にあう。' });
      out.push({ w: 0.7, min: 2, max: 12, text: '保護活動の人が罠を仕掛け、ケージの中で一日を過ごす。' });
    } else if (r === 'feral') {
      out.push({ w: 1.3, min: 0.5, max: 3, text: '人の気配だけで茂みに消える。誰にも触られたことがない。' });
      out.push({ w: 1.1, min: 1, max: 6, text: '夜ごと縄張りを巡回し、匂いで境界線を引き直す。' });
      out.push({ w: 0.9, min: 1, max: 9, text: '小さな獲物を捕らえ、それを唯一の糧にして生き延びる。' });
    } else if (r === 'zoo') {
      out.push({ w: 1.2, min: 0.5, max: 3, text: '飼育員が名前を呼ぶと、ガラスの前まで歩いてくるようになる。' });
      out.push({ w: 1.0, min: 1, max: 8, text: '毎日決まった時間に肉が運ばれ、食べ残すことすらある。' });
      out.push({ w: 0.8, min: 3, max: 15, text: '種の保存のため、遠くの動物園から見合い相手がやってくる。' });
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
      const m = Math.max(1, Math.round(age * 12));
      const pool = (route === 'owned' || route === 'purebred')
        ? ['猫風邪をこじらせ、母猫の体温の中で息を引き取る。',
          '先天性の心臓の病気が見つかり、獣医の腕の中で眠るように逝く。',
          '誤って飲み込んだもので腸が詰まり、手術に間に合わない。']
        : (route === 'wild' || route === 'zoo')
          ? ['きょうだいより小さく生まれ、母の乳に届かないまま冷えていく。', '猛禽にさらわれ、あっという間の最期。']
          : ['寒さと飢えに耐えられず、母猫の胸に抱かれたまま冷たくなる。',
            'カラスに狙われ、庇われたものの助からない。',
            '猫風邪で目が塞がり、食べ物にありつけないまま弱っていく。'];
      return { cause: 'early', text: `生後${m >= 12 ? '1年' : m + 'か月'}。${pick(pool, rng)}` };
    }

    if (route === 'owned' || route === 'purebred' || route === 'community') {
      if (veryOld) return { cause: 'natural', text: `享年${ageText(age)}。前の日まで日向ぼっこをしていた。ある朝、いつもの場所で動かなくなっていた。大往生。` };
      if (old) return { cause: 'illness', text: `享年${ageText(age)}。腎臓の病気が進み、獣医に看取られて静かに息を引き取る。` };
      const pool = [
        { c: 'illness', t: '病気が急に進み、病院に運ばれたものの帰らなかった。' },
        { c: 'accident', t: '珍しく外に出た日に、車にはねられる。' },
        { c: 'illness', t: '血栓で後ろ足が動かなくなり、そのまま眠るように逝く。' },
        { c: 'natural', t: 'ある日を境に食べなくなり、静かに息を引き取る。' }
      ];
      const d = pick(pool, rng);
      return { cause: d.c, text: `享年${ageText(age)}。${d.t}` };
    }

    if (route === 'zoo') {
      return { cause: 'natural', text: `享年${ageText(age)}。獣医と飼育員に見守られ、眠るように逝く。長生きした。` };
    }

    if (route === 'wild') {
      if (old) return { cause: 'natural', text: `享年${ageText(age)}。野生としては長生きの部類。縄張りの岩の上で、静かに動かなくなっていた。` };
      const pool = [
        { c: 'starve', t: '獲物が減った季節、十分に食べられないまま力尽きる。' },
        { c: 'fight', t: '縄張り争いで深い傷を負い、傷が癒えないまま息を引き取る。' },
        { c: 'human', t: '道路を渡ったところを車に撥ねられる。' },
        { c: 'human', t: '密猟者の罠にかかり、抜け出せないまま朽ちる。' },
        { c: 'illness', t: '感染症が群れに広がり、回復しないまま倒れる。' }
      ];
      if (cat.speciesGroup === 'island') pool.push({ c: 'human', t: '島の道路を渡る途中、車と出会う。' });
      const d = pick(pool, rng);
      return { cause: d.c, text: `享年${ageText(age)}。${d.t}` };
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
    return { cause: d.c, text: `享年${ageText(age)}。${d.t}` };
  }

  function buildCaption(cat, rng) {
    const a = Math.floor(cat.ageYears);
    if (cat.klass === 'wild') {
      const tail = cat.route === 'zoo'
        ? 'ガラスの向こうで、毎日同じ時間にごはんが出てくる暮らし。'
        : pick(['誰にも名前をつけられないまま、生きて、死んだ。',
          'この星のどこかで、確かに息をしていた。',
          '人の知らないところで、狩りをして、眠った。'], rng);
      return cat.speciesName + '。' + tail;
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
      rarities: RARITY_ORDER
    };
  }

  return {
    mulberry32, newSeed, rollCat, sampleLifespan, buildTimeline,
    formatCount, formatProb, formatOneIn, ageText, ageLabel,
    rarityOf, dexCatalog, RARITY_ORDER, deathOf, buildCaption
  };
});
