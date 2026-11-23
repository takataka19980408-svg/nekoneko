/* ============================================================
   世界猫生ガチャ — UI（子猫で生まれて、猫生を歩む）
   猫はAI生成イラスト。待機中は呼吸、タップで跳ねる、
   成長すると大きくなり、拾われると首輪がついて家に変わる。
   ============================================================ */
(function (root) {
  'use strict';

  const D = root.CATGACHA_DATA;
  const E = root.CATGACHA;
  const A = root.CATART;
  const KEY = 'catgacha.dex.v1';

  const RARITY_JP = { N: 'ノーマル', R: 'レア', SR: 'スーパーレア', SSR: 'ダブルレア', UR: 'ウルトラレア' };
  const STAGE_JP = { kitten: '子猫', adult: '成猫', senior: 'シニア猫' };

  /* 過去の猫生（フル記録）の保持数。1匹あたり数〜20KBなので、40匹で数100KBに収まる。 */
  const ALBUM_MAX = 40;
  const CAUSE_JP = {
    early: '早すぎる別れ', illness: '病気', accident: '事故', natural: '大往生',
    starve: '飢え', fight: 'ケンカ', human: '人の手', pinch: '不慮の事故',
    nekomata: '猫又', maneki: '看板猫'
  };

  /* ---------- 図鑑データ ---------- */
  function emptyDex() {
    return {
      total: 0, species: {}, countries: {}, mutations: {}, rarities: {},
      maxAge: 0, best: null, rarest: null, history: [], albums: [],
      adopted: 0, bossCount: 0, nekomata: 0, maneki: 0,
      ach: {}, longest: null
    };
  }
  function loadDex() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(KEY);
      if (!raw) return emptyDex();
      const d = JSON.parse(raw);
      const dex = Object.assign(emptyDex(), d);
      /* 旧セーブ（albums が無い／壊れている）でも落ちないように */
      if (!Array.isArray(dex.albums)) dex.albums = [];
      if (!Array.isArray(dex.history)) dex.history = [];
      dex.albums = dex.albums.filter(a => a && typeof a === 'object');
      return dex;
    } catch (e) { return emptyDex(); }
  }

  function isQuotaError(e) {
    if (!e) return false;
    const name = String(e.name || '');
    const msg = String(e.message || e);
    return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED'
      || e.code === 22 || e.code === 1014 || /quota/i.test(msg);
  }

  /* 保存。容量が溢れたら「古い猫生の記録」から削って再保存する。 */
  function saveDex(dex) {
    if (!dex || !root.localStorage) return dex;
    if (!Array.isArray(dex.albums)) dex.albums = [];
    if (!Array.isArray(dex.history)) dex.history = [];
    let guard = 0;
    let step = 0;
    while (guard++ < 200) {
      try {
        root.localStorage.setItem(KEY, JSON.stringify(dex));
        return dex;
      } catch (e) {
        if (!isQuotaError(e)) return dex;   /* プライベートモード等は保存をあきらめる */
        if (dex.albums.length > 1) { dex.albums.pop(); continue; }        /* 古い猫生から削る */
        if (dex.albums.length === 1 && step === 0) {
          /* 最後の1匹は残し、途中の歩みを間引く（生まれた日と最期は残す） */
          step = 1;
          const a = dex.albums[0];
          const logs = Array.isArray(a.logs) ? a.logs : [];
          a.logs = logs.length > 10
            ? logs.filter((_, i) => i === 0 || i === logs.length - 1 || i % 2 === 0)
            : logs;
          a.trimmed = true;
          continue;
        }
        if (dex.albums.length === 1 && step === 1) {
          /* それでも無理なら、歩みを諦めてプロフィールだけ残す */
          step = 2;
          dex.albums[0].logs = [];
          dex.albums[0].trimmed = true;
          continue;
        }
        if (dex.albums.length === 1) { dex.albums.pop(); continue; }
        if (dex.history.length) { dex.history.pop(); continue; }
        return dex;
      }
    }
    return dex;
  }

  const CATALOG = E.dexCatalog();
  const TOTAL_TARGETS = CATALOG.species.length + CATALOG.countries.length + CATALOG.mutations.length;

  function achievement(dex) {
    const s = Object.keys(dex.species || {}).length;
    const c = Object.keys(dex.countries || {}).length;
    const m = Object.keys(dex.mutations || {}).length;
    return s + c + m;
  }

  /* ---------- 過去の猫生（フル記録） ----------
     1匹の猫生を、生まれた日から最期までそのまま残す。
     ・プロフィール／最終ステータス／イラスト再現用の最小パラメータ
     ・logs: 実際に歩んだ全ステップ（年齢・季節・節目・見出し・本文・選んだ2択） */
  function albumId(cat) {
    const t = (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;
    return 'c' + t.toString(36) + '-' + (((cat && cat.seed) || 0) >>> 0).toString(36);
  }

  function stepBadge(cat, i) {
    const step = cat.story[i];
    const out = [];
    if (step.kind === 'birth') out.push('🐾 生まれた日');
    else if (step.kind === 'death') out.push('🌈 最期');
    else if (step.kind === 'adopt') out.push(step.maneki ? '🏮 お店に迎えられた日' : '🏡 拾われた日');
    else if (step.kind === 'evolve') out.push('🔮 猫又になった日');
    else {
      const ms = E.milestoneAt(cat.story, i);
      if (ms) out.push(ms.icon + ' ' + ms.label);
    }
    const f = formAt(cat, i);
    if (f === 'nekomata' && step.kind !== 'evolve') out.push('🔮 猫又');
    if (f === 'maneki' && step.kind !== 'adopt') out.push('🏮 招き猫');
    if (step.choice && step.chosen != null) {
      const o = step.choice.options[step.chosen];
      if (o && o.effect && o.effect.boss) out.push('👑 ボス猫');
    }
    return out.join(' / ');
  }

  function albumLogs(cat) {
    return (cat.story || []).map((s, i) => {
      const pick = (s.choice && s.chosen != null) ? s.choice.options[s.chosen] : null;
      return {
        age: Math.round((Number(s.age) || 0) * 100) / 100,
        ageLabel: s.ageLabel || '',
        stage: s.stage || '',
        kind: s.kind || 'event',
        season: s.season || '',
        badge: stepBadge(cat, i),
        title: s.title || '',
        text: s.text || '',
        pickedLabel: pick ? pick.label : null,
        pickedAuto: pick ? !!s.autoPicked : false,
        pickedText: pick ? (pick.text || '') : null
      };
    });
  }

  function albumEntry(cat) {
    const story = cat.story || [];
    const last = story[story.length - 1] || { stage: 'adult' };
    const st = E.statsAt(cat, story.length - 1) || { energy: 0, food: 0, luck: 0 };
    const cls = cat.klass === 'wild' ? '野生' : cat.route === 'purebred' ? '純血種' : '雑種';
    const stage = last.stage === 'kitten' ? 'kitten' : last.stage === 'senior' ? 'senior' : 'adult';
    return {
      v: 1,
      id: albumId(cat),
      at: (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0,
      name: cat.name || '',
      region: {
        flag: (cat.region && cat.region.flag) || '🌍',
        name: placeText(cat),
        bucket: (cat.region && cat.region.bucket) || '',
        key: (cat.country && cat.country.key) || ''
      },
      speciesName: cat.speciesName || '',
      speciesKey: cat.speciesKey || '',
      sciName: cat.sciName || '',
      kind: cls,
      route: cat.route || '',
      klass: cat.klass || '',
      pattern: (cat.pattern && cat.pattern.name) || cat.speciesName || '',
      breed: (cat.breed && cat.breed.name) || '',
      gender: (D.SEX_LABEL && D.SEX_LABEL[cat.sex]) || '',
      eyeColor: eyeText(cat),
      eyeHex: cat.eyeColor || '',
      rarity: cat.rarity || 'N',
      probability: cat.probability || 0,
      population: cat.population || 0,
      ageYears: Number(cat.ageYears) || 0,
      deathReason: cat.deathCause || last.cause || '',
      caption: cat.caption || '',
      statusLabel: cat.statusLabel || '',
      adopted: !!cat.adopted,
      bossCat: !!cat.bossCat,
      nekomata: !!cat.nekomata,
      maneki: !!cat.maneki,
      finalStage: stage,
      stats: { energy: st.energy, food: st.food, luck: st.luck },
      art: {
        type: A.typeFor(cat), stage: stage === 'kitten' ? 'kitten' : 'adult',
        collar: !!cat.adopted, nekomata: !!cat.nekomata, maneki: !!cat.maneki,
        senior: stage === 'senior'
      },
      logs: albumLogs(cat)
    };
  }

  function record(dex, cat) {
    dex.total += 1;
    dex.species[cat.speciesKey] = (dex.species[cat.speciesKey] || 0) + 1;
    dex.countries[cat.region.bucket] = (dex.countries[cat.region.bucket] || 0) + 1;
    cat.mutations.forEach(m => { dex.mutations[m.key] = (dex.mutations[m.key] || 0) + 1; });
    dex.rarities[cat.rarity] = (dex.rarities[cat.rarity] || 0) + 1;
    dex.maxAge = Math.max(dex.maxAge || 0, cat.ageYears);
    if (!dex.longest || cat.ageYears > dex.longest.age) {
      dex.longest = { age: cat.ageYears, name: cat.name, species: cat.speciesName };
    }
    if (cat.adopted) dex.adopted = (dex.adopted || 0) + 1;
    if (cat.bossCat) dex.bossCount = (dex.bossCount || 0) + 1;
    if (cat.nekomata) dex.nekomata = (dex.nekomata || 0) + 1;
    if (cat.maneki) dex.maneki = (dex.maneki || 0) + 1;
    const rank = E.RARITY_ORDER.indexOf(cat.rarity);
    if (!dex.best || rank > E.RARITY_ORDER.indexOf(dex.best.rarity)) {
      dex.best = { rarity: cat.rarity, name: cat.name, species: cat.speciesName, at: Date.now() };
    }
    if (!dex.rarest || cat.probability < dex.rarest.probability) {
      dex.rarest = { probability: cat.probability, name: cat.name, species: cat.speciesName, popularity: cat.population, at: Date.now() };
    }
    dex.history.unshift({
      name: cat.name, species: cat.speciesName, region: cat.region.name,
      rarity: cat.rarity, age: cat.ageYears, at: Date.now(),
      adopted: !!cat.adopted, boss: !!cat.bossCat, nekomata: !!cat.nekomata, maneki: !!cat.maneki
    });
    dex.history = dex.history.slice(0, 12);
    /* 猫生のフル記録（図鑑の「過去の猫生」） */
    if (!Array.isArray(dex.albums)) dex.albums = [];
    dex.albums.unshift(albumEntry(cat));
    while (dex.albums.length > ALBUM_MAX) dex.albums.pop();
    saveDex(dex);
    return dex;
  }

  /* 実績の解除判定（新しいものだけ返して dex に記録する） */
  function unlockAchievements(dex, cat) {
    if (!dex.ach) dex.ach = {};
    const ctx = {
      total: dex.total,
      speciesCount: Object.keys(dex.species || {}).length,
      countryCount: Object.keys(dex.countries || {}).length,
      mutationCount: Object.keys(dex.mutations || {}).length,
      adoptCount: dex.adopted || 0,
      maxAge: dex.maxAge || 0,
      peak: E.peakStats(cat),
      pinchAvoided: !!cat.pinchAvoided,
      cat: cat
    };
    const fresh = [];
    E.evaluateAchievements(ctx).forEach(key => {
      if (dex.ach[key]) return;
      dex.ach[key] = Date.now();
      const def = E.achievementDef(key);
      if (def) fresh.push(def);
    });
    saveDex(dex);
    return fresh;
  }

  /* ---------- 表示用ヘルパ ---------- */
  function eyeName(hex) {
    if (!hex) return '—';
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (b > r + 20 && b > g - 10) return '青';
    if (g > r + 10) return '緑';
    if (r > 170 && g < 130) return '銅';
    if (r > 200 && g > 170 && b < 120) return '琥珀';
    return '琥珀';
  }

  function ageText(y) {
    if (y < 1) {
      const m = Math.max(1, Math.round(y * 12));
      return m >= 12 ? '0歳' : '生後' + m + 'か月';
    }
    return Math.floor(y) + '歳';
  }

  function placeText(cat) {
    if (cat.klass === 'wild') return cat.route === 'zoo' ? cat.address : cat.species.range;
    return cat.region.name + (cat.city && cat.city !== cat.region.name ? '・' + cat.city : '');
  }

  function bornLine(cat) {
    const what = cat.klass === 'wild' ? cat.speciesName + 'のあかちゃん' : '小さな子猫';
    return `${cat.bornPlace || placeText(cat)}で、${what}として生まれた！`;
  }

  function eyeText(cat) {
    const odd = (cat.mutations || []).some(m => m.key === 'odd_eye');
    if (odd) return 'オッドアイ（' + eyeName(cat.eyeColor) + 'と' + eyeName(cat.eyeColor2) + '）';
    return eyeName(cat.eyeColor) + 'の目';
  }

  function speciesKind(cat) {
    if (cat.klass === 'wild') return '野生のネコ科';
    return cat.route === 'purebred' ? 'イエネコ（純血種）' : 'イエネコ（雑種）';
  }

  /* 誕生画面：この子はだれか（国・種別・境遇・性別・目） */
  function profileHTML(cat) {
    const st = E.statusOf(cat, 0);
    const coatKey = cat.klass === 'wild' ? '種' : cat.route === 'purebred' ? '品種' : '毛柄';
    const coatVal = cat.klass === 'wild'
      ? `${cat.speciesName}${cat.sciName ? '（' + cat.sciName + '）' : ''}`
      : cat.speciesName;
    const rows = [
      ['国・地域', `${cat.region.flag} ${placeText(cat)}`],
      ['種別', speciesKind(cat)],
      [coatKey, coatVal],
      ['境遇', st.text],
      ['性別', D.SEX_LABEL[cat.sex]],
      ['目の色', eyeText(cat)]
    ];
    return `<div class="who-card">
      <p class="who-title">🐾 この子はこんな猫</p>
      <dl class="who-grid">${rows.map(r => `<div class="who-row"><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('')}</dl>
    </div>`;
  }

  /* 誕生画面：どれだけ珍しいか */
  function rareCardHTML(cat) {
    const points = E.rarityPoints(cat);
    return `<div class="rare-card">
      <div class="rare-head">
        <span class="rarity rarity--big r-${cat.rarity}">${cat.rarity}</span>
        <span class="rare-jp">${RARITY_JP[cat.rarity]}</span>
        <span class="rare-tag">✨ 珍しさ</span>
      </div>
      <p class="rare-odds">地球約10億匹中の <b>${E.formatOneIn(cat.probability)}</b><span class="rare-pct">（${E.formatProb(cat.probability)}）</span><span class="rare-sep">｜</span>仲間は <b>${E.formatCount(cat.population)}</b></p>
      <p class="rare-points-title">✨ 珍しいポイント・豆知識</p>
      <ul class="rare-points">${points.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>`;
  }

  /* 常時プロフィールバー（名札） */
  function nameplateHTML(cat, idx) {
    if (!cat || !cat.story || !cat.story.length) return '';
    const i = Math.max(0, Math.min(idx == null ? 0 : idx, cat.story.length - 1));
    const step = cat.story[i];
    const st = E.statusOf(cat, i);
    const extras = (st.extra || []).map(x => `<i>｜</i><span class="np-extra">${x.icon} ${x.label}</span>`).join('');
    const season = step.season ? '・' + E.seasonEmoji(step.season) + E.seasonLabel(step.season) : '';
    return `<div class="np-top">
      <span class="np-name">🐈 ${cat.name}</span>
      <span class="np-age">${step.ageLabel}${season}</span>
    </div>
    <div class="np-facts">
      <span class="np-where">${cat.region.flag} ${placeText(cat)}</span>
      <i>｜</i>
      <span class="np-species">${cat.speciesName}・${D.SEX_LABEL[cat.sex]}</span>
      <i>｜</i>
      <span class="np-status${st.tone ? ' tone-' + st.tone : ''}">${st.text}</span>
      ${extras}
      <i>｜</i>
      <span class="np-one">${E.formatOneIn(cat.probability)}</span>
    </div>`;
  }

  /* 何歩目かだけを出す（総歩数＝寿命は最後まで伏せる） */
  function progressHTML(cat, idx) {
    return `<span class="paw-count">🐾 ${idx + 1}歩目</span>`;
  }

  function choiceHTML(step, pick) {
    if (pick != null && step.choice.options[pick]) {
      const opt = step.choice.options[pick];
      const fx = step.fx;
      const chips = fx && fx.chips ? fx.chips : (E.statChips ? E.statChips(opt.effect || {}) : '');
      const heads = fx && fx.headlines ? fx.headlines : [];
      const fxHTML = (chips || heads.length)
        ? `<div class="choice-fx">${chips ? `<span class="fx-chips">${chips}</span>` : ''}${heads.map(h => `<b class="fx-head">${h}</b>`).join('')}</div>`
        : '';
      return `<div class="choice-result"><span class="choice-tag">🐾 ${opt.label}</span><p>${opt.text}</p>${fxHTML}</div>`;
    }
    return `<div class="choice-box">
      <p class="choice-q">どうする？</p>
      <div class="choice-clock" id="choiceClock" hidden>
        <span class="choice-clock-bar"><i id="choiceClockBar"></i></span>
        <span class="choice-clock-text" id="choiceClockText">⏳ おまかせまで 10秒</span>
      </div>
      ${step.choice.options.map((o, i) =>
        `<button class="choice-btn" data-choice="${i}"><span class="choice-paw" aria-hidden="true">🐾</span><span>${o.label}</span></button>`
      ).join('')}
    </div>`;
  }

  /* その時点の姿（猫又・招き猫） */
  function formAt(cat, idx) {
    if (!cat || !cat.story || !cat.story[idx]) return null;
    if (cat.nekomata && cat.story[idx].age >= 100) return 'nekomata';
    if (cat.maneki && cat.adoptIndex != null && idx >= cat.adoptIndex) return 'maneki';
    return null;
  }

  function badgeHTML(cat, idx) {
    const out = [];
    const step = cat.story[idx];
    const ms = step && step.kind === 'death' ? null : E.milestoneAt(cat.story, idx);
    if (ms) out.push(`<span class="milestone-badge tone-${ms.tone}">${ms.icon} ${ms.label}</span>`);
    const f = formAt(cat, idx);
    if (f === 'nekomata' && step && step.evolve === 'nekomata') out.push('<span class="form-badge is-nekomata">🔮 猫又</span>');
    if (f === 'maneki' && step && step.kind === 'adopt') out.push('<span class="form-badge is-maneki">🏮 招き猫</span>');
    if (step && step.choice && step.chosen != null) {
      const o = step.choice.options[step.chosen];
      if (o && o.effect && o.effect.boss) out.push('<span class="form-badge is-boss">👑 ボス猫</span>');
    }
    return out.join('');
  }

  /* ページカード（イラストはステージ側に出るので、ここは物語だけ） */
  function stepCardHTML(cat, idx, picked) {
    const step = cat.story[idx];
    const isDeath = step.kind === 'death';
    const isAdopt = step.kind === 'adopt';
    const isEvolve = step.kind === 'evolve' || step.evolve === 'nekomata';
    const pick = step.chosen != null ? step.chosen : (picked ? picked[idx] : undefined);

    /* 誕生のページは「この子はだれか」と「どれだけ珍しいか」を主役にする */
    if (step.kind === 'birth') {
      return `
      <article class="page page--birth">
        <span class="page-tape" aria-hidden="true"></span>
        <div class="page-head">
          <span class="age-badge">生まれた日</span>
        </div>
        <div class="birth-hero">
          <p class="birth-name"><span class="birth-emoji" aria-hidden="true">🐈</span>${cat.name}</p>
          <p class="birth-sub">🌏 ${bornLine(cat)}</p>
        </div>
        <p class="page-text">${step.text}</p>
        ${profileHTML(cat)}
        ${rareCardHTML(cat)}
      </article>`;
    }

    return `
    <article class="page${isDeath ? ' page--death' : ''}${isAdopt ? ' page--adopt' : ''}${isEvolve ? ' page--evolve' : ''}">
      <span class="page-tape" aria-hidden="true"></span>
      <div class="page-head">
        <span class="age-badge">${step.ageLabel}</span>
        ${isAdopt ? `<span class="adopt-tag">${step.maneki || cat.maneki ? '🏮 お店に迎えられた' : '🏡 家族に迎えられた'}</span>` : ''}
      </div>
      <div class="page-badges">${badgeHTML(cat, idx)}</div>
      <h2 class="page-title">${isDeath ? '🌈 最期' : isAdopt ? '🏡 ' + (step.adoptTitle || '拾われる') : isEvolve ? '🔮 ' + (step.title || '猫又になる') : '【' + step.title + '】'}</h2>
      <p class="page-text">${step.text}</p>
      ${step.choice ? choiceHTML(step, pick) : ''}
    </article>`;
  }

  function memoryHTML(cat, idx, picked) {
    if (!idx) return '';
    /* 歩数が多い猫生では、直近の8歩だけを振り返る */
    const from = Math.max(0, idx - 8);
    let out = from > 0 ? `<p class="note-more">…これより前の${from}歩は、心のなかに。</p>` : '';
    for (let i = from; i < idx; i++) {
      const s = cat.story[i];
      const pick = picked ? picked[i] : undefined;
      const chosen = s.choice && pick != null ? s.choice.options[pick] : null;
      const text = chosen ? chosen.text : s.text;
      const label = s.kind === 'birth' ? '生まれた日' : s.kind === 'adopt' ? '拾われた日' : s.ageLabel;
      const tilt = (i % 2 === 0 ? -1.1 : 1.1);
      out += `<div class="note note--${s.kind}" style="--tilt:${tilt}deg">
        <span class="note-age">${label}</span>
        <p class="note-text">${chosen ? `<span class="note-pick">🐾 ${chosen.label}</span>` : ''}${text}</p>
      </div>`;
    }
    return out;
  }

  function achBurstHTML(fresh, dex) {
    const total = E.ACHIEVEMENTS.length;
    const got = dex && dex.ach ? Object.keys(dex.ach).length : 0;
    const news = fresh || [];
    return `<div class="ach-burst${news.length ? ' is-new' : ''}">
      <div class="ach-burst-head"><span><span class="ico">🏆</span>実績・称号</span><b>${got} / ${total}</b></div>
      ${news.length
        ? `<p class="ach-burst-lead">✨ 新しい称号を獲得！</p><ul class="ach-burst-list">${news.map(a => `<li class="tone-${a.tone}"><span class="ach-burst-icon">${a.icon}</span><span class="ach-burst-body"><b>${a.name}</b><em>${a.desc}</em></span></li>`).join('')}</ul>`
        : `<p class="ach-burst-none">${got ? '今回の新規解除はなし。図鑑の「🏆 実績・きろく」で次の目標をチェック。' : 'まだ実績なし。まずは1匹、猫生を最後まで歩いてみよう。'}</p>`}
    </div>`;
  }

  function buildFinaleHTML(cat, achNew, dex) {
    const isBaby = cat.ageYears < 1;
    const months = Math.max(1, Math.round(cat.ageYears * 12));
    const num = isBaby ? months : Math.floor(cat.ageYears);
    const unit = isBaby ? 'か月' : '歳';
    const prefix = isBaby ? '生後' : '';
    const subject = cat.klass === 'wild' && cat.route !== 'zoo'
      ? `${cat.speciesName}（${cat.sciName}）`
      : cat.speciesName;
    const form = cat.nekomata ? '<div class="finale-form is-nekomata">🔮 猫又（百年の猫生）</div>'
      : cat.maneki ? '<div class="finale-form is-maneki">🏮 招き猫（看板猫の一生）</div>'
      : cat.bossCat ? '<div class="finale-form is-boss">👑 ボス猫</div>' : '';
    return `
    <div class="finale-head">
      <span class="finale-kicker">🌈 この猫生のきろく</span>
      <div class="finale-age"><span class="finale-prefix">${prefix}</span><b>${num}</b><span class="finale-unit">${unit}</span><span class="finale-suffix">享年</span></div>
      <p class="finale-caption">${cat.caption}</p>
      <div class="finale-who"><span class="finale-flag">${cat.region.flag}</span>${cat.name} ／ ${subject}</div>
      ${cat.adopted ? '<div class="finale-collar">🔔 拾われて、家族の猫になった子</div>' : ''}
      ${form}
    </div>
    ${achBurstHTML(achNew, dex)}
    <div class="prob-box">
      <div class="prob-line"><span>この猫に生まれる確率</span><b>${E.formatProb(cat.probability)}</b></div>
      <div class="prob-line"><span>推定母数</span><b>${E.formatCount(cat.population)}</b></div>
      <div class="prob-notes">
        <span class="prob-one">${E.formatOneIn(cat.probability)}</span>
        <span class="prob-who">${subject}</span>
        <span class="prob-place">${placeText(cat)}</span>
        <span class="prob-base">地球の猫 約10億匹のなかの、この条件の猫の数。</span>
      </div>
    </div>
    <div class="dex-toast"><span class="dex-toast-icon">📖</span>転生猫図鑑に登録しました</div>`;
  }

  function shareText(cat) {
    const lines = [
      `【世界猫生ガチャ】${cat.rarity}｜${cat.name}`,
      `${cat.region.flag} ${placeText(cat)}の${cat.statusLabel}・${cat.speciesName}／享年${ageText(cat.ageYears)}`
    ];
    if (cat.nekomata) lines.push('🔮 100歳まで生きて、猫又になった');
    else if (cat.maneki) lines.push('🏮 お店に迎えられて、招き猫になった');
    else if (cat.bossCat) lines.push('👑 この街のボス猫だった');
    if (cat.adopted) lines.push('🏡 途中で人に拾われて、家族の猫になった');
    lines.push(`確率 ${E.formatProb(cat.probability)}（${E.formatOneIn(cat.probability)}）`);
    cat.mutations.forEach(m => lines.push('✦ ' + m.name));
    lines.push('#世界猫生ガチャ');
    return lines.join('\n');
  }

  function shareURL(cat) {
    const text = shareText(cat);
    const url = (root.location && /^https?:/.test(root.location.protocol)) ? root.location.href : '';
    return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + (url ? '&url=' + encodeURIComponent(url) : '');
  }

  /* ---------- 図鑑の描画 ---------- */
  function dexSummaryHTML(dex) {
    const got = achievement(dex);
    return `
      <div><b>${dex.total}</b><span>歩いた猫生</span></div>
      <div><b>${got}/${TOTAL_TARGETS}</b><span>図鑑コンプ</span></div>
      <div><b>${Math.round(got / TOTAL_TARGETS * 100)}%</b><span>達成率</span></div>`;
  }

  function cellsHTML(list, counts) {
    return list.map(item => {
      const c = counts[item.key] || 0;
      if (!c) return `<div class="dex-cell is-locked"><span class="n">${item.flag ? item.flag + ' ' : ''}???</span><span class="c">—</span></div>`;
      return `<div class="dex-cell"><span class="n">${item.flag ? item.flag + ' ' : ''}${item.name}</span><span class="c">${c}</span></div>`;
    }).join('');
  }

  function groupSection(title, items, counts) {
    const got = items.filter(i => counts[i.key]).length;
    return `<div class="dex-section">
      <h4><span>${title}</span><span>${got}/${items.length}</span></h4>
      <div class="dex-grid">${cellsHTML(items, counts)}</div>
    </div>`;
  }

  /* ---------- 図鑑：過去の猫生（一覧・詳細） ---------- */
  function albumFlagsHTML(rec) {
    const out = [];
    if (rec.nekomata) out.push(['🔮', '猫又']);
    else if (rec.maneki) out.push(['🏮', '招き猫']);
    if (rec.bossCat) out.push(['👑', 'ボス猫']);
    if (rec.adopted) out.push(['🏡', rec.maneki ? 'お店の子' : '家族の子']);
    return out.map(b => `<span class="album-flag">${b[0]} ${b[1]}</span>`).join('');
  }

  function albumStill(rec, cls) {
    const art = rec && rec.art ? rec.art : {};
    return A.stillHTML(art.type, {
      stage: art.stage, collar: art.collar || rec.adopted,
      nekomata: art.nekomata || rec.nekomata, maneki: art.maneki || rec.maneki,
      senior: !!art.senior, alt: (rec && rec.name) || '猫', cls: cls
    });
  }

  function albumCardHTML(rec) {
    const reg = rec.region || {};
    const kind = rec.kind || '';
    const coat = rec.breed ? kind + '・' + rec.breed : kind;
    const ageY = Number(rec.ageYears) || 0;
    const stats = rec.stats || null;
    return `<button class="album-card" data-album="${rec.id}" aria-label="${rec.name}の猫生を開く">
      <span class="album-thumb">${albumStill(rec, 'is-thumb')}</span>
      <span class="album-info">
        <span class="album-name">${rec.name || '名もなき猫'}<span class="rarity r-${rec.rarity || 'N'}">${rec.rarity || 'N'}</span></span>
        <span class="album-sub">${reg.flag || '🌍'} ${reg.name || ''}</span>
        <span class="album-line">${rec.speciesName || ''}${coat ? '・' + coat : ''}</span>
        <span class="album-line">🌈 享年 <b>${ageText(ageY)}</b>${stats ? `　❤️${stats.energy} 🐟${stats.food} 🍀${stats.luck}` : ''}</span>
        <span class="album-flags">${albumFlagsHTML(rec)}</span>
      </span>
      <span class="album-arrow" aria-hidden="true">›</span>
    </button>`;
  }

  function albumListHTML(dex) {
    const list = (dex && Array.isArray(dex.albums)) ? dex.albums : [];
    if (!list.length) {
      return `<p class="empty-note">まだ過去の猫生はありません。1匹の猫を最後まで見届けると、その子のイラスト・プロフィール・生まれた日から最期までの歩みが、まるごとここに残ります。</p>`;
    }
    return `<p class="album-lead">📖 ${list.length}匹の猫生が残っています。タップすると、生まれた日から最期までをそのまま読み返せます。</p>
      <div class="album-list">${list.map(albumCardHTML).join('')}</div>`;
  }

  function albumStepHTML(log) {
    const season = log.season ? `<span class="album-season">${E.seasonEmoji(log.season)}${E.seasonLabel(log.season)}</span>` : '';
    const badge = log.badge ? `<span class="album-step-badge">${log.badge}</span>` : '';
    const title = log.kind === 'birth' ? '生まれた日'
      : log.kind === 'death' ? '最期'
      : log.kind === 'adopt' ? (log.title || '拾われた日')
      : log.kind === 'evolve' ? (log.title || '猫又になる')
      : (log.title ? '【' + log.title + '】' : '');
    const pick = log.pickedLabel
      ? `<div class="album-pick"><span class="album-pick-tag">🐾 選んだ：${log.pickedLabel}</span>${log.pickedAuto ? '<span class="album-pick-auto">おまかせ</span>' : ''}</div>${log.pickedText ? `<p class="album-pick-text">${log.pickedText}</p>` : ''}`
      : '';
    return `<li class="album-step kind-${log.kind}">
      <span class="album-step-dot" aria-hidden="true"></span>
      <div class="album-step-body">
        <div class="album-step-head">
          <span class="album-step-age">${log.ageLabel || ageText(log.age)}</span>${season}${badge}
        </div>
        ${title ? `<b class="album-step-title">${title}</b>` : ''}
        <p class="album-step-text">${log.text || ''}</p>
        ${pick}
      </div>
    </li>`;
  }

  function albumDetailHTML(rec) {
    if (!rec) return '<p class="empty-note">この猫生の記録は見つかりませんでした。</p>';
    const reg = rec.region || {};
    const cls = rec.klass === 'wild' ? '野生' : rec.route === 'purebred' ? '純血種' : '雑種';
    const coatKey = rec.klass === 'wild' ? '種' : rec.route === 'purebred' ? '品種' : '毛柄';
    const coatVal = rec.klass === 'wild'
      ? rec.speciesName + (rec.sciName ? '（' + rec.sciName + '）' : '')
      : (rec.breed || rec.pattern || rec.speciesName);
    const cause = CAUSE_JP[rec.deathReason] || '';
    const ageY = Number(rec.ageYears) || 0;
    const rows = [
      ['国・地域', `${reg.flag || '🌍'} ${reg.name || ''}`],
      ['種別', cls],
      [coatKey, coatVal],
      ['性別', rec.gender || '—'],
      ['目の色', rec.eyeColor || '—'],
      ['珍しさ', `${rec.rarity}（${E.formatProb(rec.probability || 0)}）`],
      ['境遇', rec.statusLabel || '—'],
      ['享年', `${ageText(ageY)}${cause ? '（' + cause + '）' : ''}`]
    ].map(r => `<div class="who-row"><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
    const stats = rec.stats || { energy: 0, food: 0, luck: 0 };
    const logs = Array.isArray(rec.logs) ? rec.logs : [];
    const timeline = logs.length
      ? `<ol class="album-timeline">${logs.map(albumStepHTML).join('')}</ol>`
      : '<p class="empty-note">この子の歩みは、まだ記録されていません（記録機能ができる前の猫生です）。</p>';
    const trimNote = rec.trimmed ? '<p class="album-trim-note">※ 端末の容量に合わせて、途中の歩みを間引いて保存しています。</p>' : '';
    return `<button class="album-back" data-album-back="1">← 一覧に戻る</button>
      <div class="album-detail">
        <div class="album-hero">
          ${albumStill(rec, 'is-hero')}
          <p class="album-hero-name">🐈 ${rec.name || '名もなき猫'}</p>
          <p class="album-hero-sub">${reg.flag || '🌍'} ${reg.name || ''} ／ ${rec.speciesName || ''}</p>
          <div class="album-hero-flags">${albumFlagsHTML(rec)}</div>
          <p class="album-hero-caption">${rec.caption || ''}</p>
        </div>
        <div class="who-card">
          <p class="who-title">🐾 この子のプロフィール</p>
          <dl class="who-grid">${rows}</dl>
          <p class="album-odds">地球約10億匹中の ${E.formatOneIn(rec.probability || 1)} ／ 仲間は ${E.formatCount(rec.population || 1)}</p>
        </div>
        <div class="album-final">
          <span class="album-final-title">🌈 最期のステータス</span>
          <span class="album-stat">❤️ たいりょく ${stats.energy}</span>
          <span class="album-stat">🐟 おなか ${stats.food}</span>
          <span class="album-stat">🍀 うん ${stats.luck}</span>
        </div>
        <div class="album-timeline-wrap">
          <h4 class="album-timeline-head"><span>🐾 生まれた日から、最期まで</span><span>${logs.length}歩</span></h4>
          ${trimNote}
          ${timeline}
        </div>
      </div>`;
  }

  function buildDexHTML(dex, tab, albumId) {
    if (tab === 'species') {
      const coats = CATALOG.species.filter(s => s.group === 'coat');
      const breeds = CATALOG.species.filter(s => s.group === 'breed');
      const wild = CATALOG.species.filter(s => s.group === 'wild');
      return groupSection('雑種（' + coats.length + '種）', coats, dex.species)
        + groupSection('純血種（' + breeds.length + '種）', breeds, dex.species)
        + groupSection('野生のネコ科（' + wild.length + '種）', wild, dex.species);
    }
    if (tab === 'countries') return groupSection('国・地域（' + CATALOG.countries.length + '）', CATALOG.countries, dex.countries);
    if (tab === 'albums') {
      const list = Array.isArray(dex.albums) ? dex.albums : [];
      const rec = albumId ? list.filter(a => a && a.id === albumId)[0] : null;
      return rec ? albumDetailHTML(rec) : albumListHTML(dex);
    }
    if (tab === 'mutations') {
      const rows = CATALOG.mutations.map(m => {
        const c = dex.mutations[m.key] || 0;
        return `<div class="dex-cell ${c ? '' : 'is-locked'}"><span class="n">${c ? m.name : '???'}</span><span class="c">${c ? c + '回' : '—'}</span></div>`;
      }).join('');
      return `<div class="dex-section"><h4><span>激レア変異（${CATALOG.mutations.length}種）</span><span>${Object.keys(dex.mutations).length}/${CATALOG.mutations.length}</span></h4>
        <div class="dex-grid">${rows}</div>
        <p class="empty-note">オッドアイやオスの三毛猫など。出会えたらスクショの価値あり。</p></div>`;
    }
    const got = achievement(dex);
    const pct = Math.round(got / TOTAL_TARGETS * 100);
    const unlocked = dex.ach || {};
    const achGot = Object.keys(unlocked).length;
    const cells = E.ACHIEVEMENTS.map(a => {
      const on = !!unlocked[a.key];
      return `<div class="ach-cell tone-${a.tone}${on ? ' is-on' : ''}">
        <span class="ach-icon">${on ? a.icon : '🔒'}</span>
        <span class="ach-body"><b>${a.name}</b><em>${a.desc}</em></span>
        ${on ? '<span class="ach-mark">✓</span>' : ''}
      </div>`;
    }).join('');
    const rar = E.RARITY_ORDER.map(r => `<li><span>${r}（${RARITY_JP[r]}）</span><span>${dex.rarities[r] || 0}回</span></li>`).join('');
    const longest = dex.longest
      ? `${ageText(dex.longest.age)}${dex.longest.species ? '（' + dex.longest.species + '）' : ''}`
      : '—';
    const records = [
      ['累計転生', dex.total + '匹'],
      ['最長寿記録', longest],
      ['拾われて家族に', (dex.adopted || 0) + '回'],
      ['ボス猫になった', (dex.bossCount || 0) + '回'],
      ['猫又になった', (dex.nekomata || 0) + '回'],
      ['招き猫になった', (dex.maneki || 0) + '回'],
      ['最高レア', dex.best ? dex.best.rarity + '・' + dex.best.species : '—'],
      ['図鑑コンプ率', got + ' / ' + TOTAL_TARGETS + '（' + pct + '%）'],
      ['実績', achGot + ' / ' + E.ACHIEVEMENTS.length]
    ].map(r => `<li><span>${r[0]}</span><span>${r[1]}</span></li>`).join('');
    const albums = Array.isArray(dex.albums) ? dex.albums : [];
    const hist = dex.history.map((h, i) => {
      const mark = h.nekomata ? '🔮' : h.maneki ? '🏮' : h.boss ? '👑' : h.adopted ? '🏡' : '';
      const rec = albums[i];
      /* 同じ順番（新しい順）で積まれているので、名前と種別が一致するときだけ詳細に飛ばす */
      const link = (rec && rec.name === h.name && rec.speciesName === h.species) ? rec.id : null;
      const row = `<span>${mark ? mark + ' ' : ''}${h.rarity}・${h.species}（${h.region}）</span><span>${ageText(h.age)}${link ? ' ›' : ''}</span>`;
      return link
        ? `<li class="record-link" data-album="${link}" role="button" tabindex="0">${row}</li>`
        : `<li>${row}</li>`;
    }).join('');
    return `<div class="dex-section"><h4><span><span class="ico">🏆</span>実績・称号</span><span>${achGot}/${E.ACHIEVEMENTS.length}</span></h4>
        <div class="ach-grid">${cells}</div></div>
      <div class="dex-section"><h4><span>📊 これまでのきろく</span></h4><ul class="record-list">${records}</ul></div>
      ${hist ? `<div class="dex-section"><h4><span>最近の猫生</span><span>タップで記録を開く</span></h4><ul class="record-list record-list--link">${hist}</ul>
        <p class="album-hint">同じ猫生のフル記録は、タブの「📖 過去の猫生」からいつでも読み返せます。</p></div>` : ''}
      ${dex.total === 0 ? '<p class="empty-note">まだ一度も猫生を歩いていません。ガチャを回すと、ここに猫がたまっていきます。</p>' : ''}`;
  }

  /* ---------- アプリ本体 ---------- */
  function init() {
    if (typeof document === 'undefined') return;

    const $ = id => document.getElementById(id);
    const state = {
      dex: loadDex(), current: null, rolling: false, tab: 'species', step: 0,
      picked: {}, recorded: false, shownStage: null, shownScene: null, taps: 0, adopted: false,
      auto: true, speed: 1, autoTimer: null, newAch: [], shownForm: null, rulerKey: null, msShown: {},
      started: false, choiceTimer: null, choiceLeft: null, choiceStart: 0, autoPicked: false,
      albumId: null, albumFrom: null
    };

    const el = {
      home: $('homeScreen'), story: $('storyScreen'),
      preview: $('catPreview'), overlay: $('rollOverlay'), rollFlag: $('rollFlag'), rollText: $('rollText'),
      rollBtn: $('rollBtn'), againBtn: $('againBtn'), shareBtn: $('shareBtn'), toDexBtn: $('toDexBtn'),
      openDex: $('openDex'), closeDex: $('closeDex'), dexModal: $('dexModal'), dexBody: $('dexBody'),
      dexSummary: $('dexSummary'), dexBadge: $('dexBadge'),
      statTotal: $('statTotal'), statBest: $('statBest'), statRate: $('statRate'),
      storyProgress: $('storyProgress'), pageWrap: $('pageWrap'), walkBtn: $('walkBtn'),
      walkText: $('walkText'), walkSub: $('walkSub'), skipBtn: $('skipBtn'),
      finale: $('finale'), finaleBody: $('finaleBody'), nameplate: $('nameplate'),
      memories: $('memories'), memoryList: $('memoryList'),
      catStage: $('catStage'), stageScene: $('stageScene'), stageParticles: $('stageParticles'),
      catActor: $('catActor'), stageToast: $('stageToast'), stats: $('stats'),
      tapHint: $('tapHint'), stageMood: $('stageMood'),
      autoBar: $('autoBar'),
      autoBtn: $('autoBtn'), autoBtnIcon: $('autoBtnIcon'), autoBtnText: $('autoBtnText'),
      autoNote: $('autoNote'), speed1: $('speed1'), speed2: $('speed2'),
      lifeAge: $('lifeAge'), lifeSeason: $('lifeSeason'), lifeMarks: $('lifeMarks')
    };

    /* 名札はトップバーのすぐ下に貼りつく（高さは画面ごとに測る） */
    function syncStickyOffset() {
      try {
        if (typeof document.querySelector !== 'function') return;
        const tb = document.querySelector('.topbar');
        const de = document.documentElement;
        if (!tb || !de || !de.style || typeof de.style.setProperty !== 'function') return;
        de.style.setProperty('--topbar-h', ((tb.offsetHeight || 60) + 1) + 'px');
      } catch (e) { /* DOMスタブでは何もしない */ }
    }
    syncStickyOffset();
    if (typeof root.addEventListener === 'function') root.addEventListener('resize', syncStickyOffset);

    /* --- 初期表示（ホームの子猫） --- */
    let preview = null;
    for (let i = 0; i < 1200; i++) {
      const c = E.rollCat((i * 7919 + 13) >>> 0);
      if (c.speciesKey === 'coat:kijitora' && c.route === 'owned') { preview = c; break; }
    }
    if (!preview) preview = E.rollCat(1);
    el.preview.innerHTML = A.heroHTML(preview);

    function refreshStats() {
      const d = state.dex;
      el.statTotal.textContent = d.total;
      el.statBest.textContent = d.best ? d.best.rarity : '—';
      const got = achievement(d);
      el.statRate.textContent = Math.round(got / TOTAL_TARGETS * 100) + '%';
      el.dexBadge.textContent = got;
    }
    refreshStats();

    /* --- ステージ（背景・猫・ステータス） --- */
    function toast(text, tone) {
      el.stageToast.textContent = text;
      el.stageToast.className = 'stage-toast is-on ' + (tone ? 'is-' + tone : '');
      const t = root.setTimeout || setTimeout;
      t(function () { el.stageToast.className = 'stage-toast'; }, 2200);
    }

    function paintScene(cat, idx, dead) {
      const key = dead ? 'finale' : A.sceneKeyFor(cat, idx);
      if (state.shownScene !== key) {
        state.shownScene = key;
        el.stageScene.className = 'stage-scene scene--' + key;
        el.stageParticles.innerHTML = A.particlesHTML(cat, idx, dead);
      }
    }

    function mountStage(cat) {
      state.shownStage = 'kitten';
      state.shownScene = null;
      state.adopted = false;
      el.catActor.innerHTML = A.actorHTML(cat, { stage: 'kitten' });
      el.catStage.classList.remove('is-finale');
      el.stats.innerHTML = A.statsHTML(cat, 0);
      el.tapHint.hidden = false;
    }

    function updateStage(cat, idx) {
      const step = cat.story[idx];
      const dead = step.kind === 'death';
      const stage = step.stage;

      const art = document.getElementById('catArt');
      if (art) {
        art.classList.toggle('is-kitten', stage === 'kitten');
        art.classList.toggle('is-adult', stage !== 'kitten');
        art.classList.toggle('is-senior', stage === 'senior');
        art.classList.toggle('is-hop', false);
      }
      const imgK = document.getElementById('catImgKitten');
      const imgA = document.getElementById('catImgAdult');
      if (imgK && imgA) {
        if (stage === 'kitten') { imgK.classList.add('is-on'); imgA.classList.remove('is-on'); }
        else { imgA.classList.add('is-on'); imgK.classList.remove('is-on'); }
      }

      /* 首輪は子猫と成猫で首の位置が違うので、ステージに合わせて座標を差し替える */
      if (art && A.collarVars) {
        const type = (art.dataset && art.dataset.type) || A.typeFor(cat);
        art.style.cssText = A.collarVars(type, stage);
      }

      if (state.shownStage === 'kitten' && stage !== 'kitten') {
        if (art) {
          art.classList.remove('is-growing');
          void art.offsetWidth;
          art.classList.add('is-growing');
        }
        toast(stage === 'senior' ? '🐾 シニアになった' : '✨ すくすく成長した！', 'grow');
      } else if (state.shownStage === 'adult' && stage === 'senior') {
        toast('🐾 シニアになった', 'grow');
      }
      state.shownStage = stage;

      if (cat.adoptIndex != null && idx >= cat.adoptIndex) {
        const collar = document.getElementById('collarBadge');
        if (collar) collar.classList.add('is-on');
        if (!state.adopted) {
          state.adopted = true;
          toast(cat.maneki ? '🏮 お店に迎えられた！' : '🏡 家族に迎えられた！', 'adopt');
        }
      }

      /* 猫又・招き猫・ボス猫の姿と、年をとった空気 */
      const form = formAt(cat, idx);
      if (art) {
        art.classList.toggle('is-nekomata', form === 'nekomata');
        art.classList.toggle('is-maneki', form === 'maneki');
      }
      if (form && state.shownForm !== form) {
        state.shownForm = form;
        toast(form === 'nekomata' ? '🔮 猫又になった！' : '🏮 招き猫になった！', 'evolve');
      }
      if (el.stageMood) {
        el.stageMood.className = 'stage-mood' + (stage === 'senior' ? ' is-senior' : '')
          + (step.age >= 15 ? ' is-great' : '')
          + (form === 'nekomata' ? ' is-nekomata' : '')
          + (form === 'maneki' ? ' is-maneki' : '');
      }
      paintScene(cat, idx, dead);
      el.stats.innerHTML = A.statsHTML(cat, idx);
      el.catStage.classList.toggle('is-finale', dead);
      if (dead) el.tapHint.hidden = true;
    }

    /* --- 猫をタップすると跳ねる --- */
    function tapCat() {
      const cat = state.current;
      if (!cat) return;
      const art = document.getElementById('catArt') || el.catActor;
      if (art.classList) {
        art.classList.remove('is-hop');
        void art.offsetWidth;
        art.classList.add('is-hop');
      }
      state.taps += 1;
      const b = A.bubbleFor(cat.seed || 1, state.taps);
      const layer = document.getElementById('bubbleLayer');
      if (layer) {
        layer.innerHTML = `<span class="bubble" style="left:${30 + Math.round((state.taps * 37) % 40)}%"><b>${b.emoji}</b>${b.text}</span>`;
        const t = root.setTimeout || setTimeout;
        t(function () { if (layer) layer.innerHTML = ''; }, 3100);
      }
    }
    el.catActor.addEventListener('click', tapCat);

    /* --- オート進行（2択が来たら自動でひと休み） --- */
    /* 1x=3.8秒 / 2x=1.9秒。15歳の猫生（約52歩）が1xで約3分20秒＋2択の時間 */
    function autoInterval() { return state.speed === 2 ? 1900 : 3800; }

    function autoBlocked() {
      const cat = state.current;
      if (!cat) return 'idle';
      if (!state.started) return 'birth';
      const step = cat.story[state.step];
      if (!step) return 'idle';
      if (step.kind === 'death') return 'death';
      if (step.choice && step.chosen == null) return 'choice';
      return null;
    }

    function clearAuto() {
      if (state.autoTimer) {
        clearTimeout(state.autoTimer);
        state.autoTimer = null;
      }
    }

    function updateAutoUI() {
      const on = state.auto;
      if (el.autoBtn) el.autoBtn.className = 'auto-btn' + (on ? ' is-on' : '');
      if (el.autoBtn) el.autoBtn.disabled = !state.current || autoBlocked() === 'death';
      if (el.autoBtnIcon) el.autoBtnIcon.textContent = on ? '⏸' : '▶';
      if (el.autoBtnText) el.autoBtnText.textContent = on ? '一時停止' : 'オート';
      if (el.speed1) el.speed1.className = 'speed-btn' + (state.speed === 1 ? ' is-active' : '');
      if (el.speed2) el.speed2.className = 'speed-btn' + (state.speed === 2 ? ' is-active' : '');
      if (!el.autoNote) return;
      const block = autoBlocked();
      let note;
      if (!state.current) note = '猫生が始まると自動で進むよ';
      else if (block === 'birth') note = '🐾 「この子の猫生を歩む」でスタート';
      else if (!on) note = '🐾 手動で「猫生を歩む」';
      else if (block === 'death') note = '🌈 猫生が終わったよ';
      else if (block === 'choice') note = '✋ 選択肢（ほうっておくと自動で選ぶよ）';
      else note = '⏱ ' + (state.speed === 2 ? '1.9' : '3.8') + '秒ごとに自動で進む';
      el.autoNote.textContent = note;
    }

    function scheduleAuto() {
      clearAuto();
      const extra = !!state.extraDelay;
      state.extraDelay = false;
      if (!state.auto || autoBlocked()) { updateAutoUI(); return; }
      const wait = extra ? Math.round(autoInterval() * 1.7) : autoInterval();
      state.autoTimer = setTimeout(autoTick, wait);
      updateAutoUI();
    }

    function autoTick() {
      state.autoTimer = null;
      if (!state.auto || autoBlocked()) { updateAutoUI(); return; }
      walk();
    }

    function toggleAuto() {
      state.auto = !state.auto;
      if (state.auto) { scheduleAuto(); startChoiceClock(); }
      else { clearAuto(); stopChoiceClock(); updateAutoUI(); }
    }

    function setSpeed(n) {
      state.speed = n === 2 ? 2 : 1;
      if (state.choiceLeft != null) state.choiceLeft = Math.min(state.choiceLeft, choiceMs());
      if (state.auto && !autoBlocked()) scheduleAuto();
      else updateAutoUI();
      if (pendingChoice() && state.auto) startChoiceClock();
    }

    /* --- 2択のカウントダウン（放置したらおまかせ選択） --- */
    function choiceMs() { return state.speed === 2 ? 5000 : 10000; }

    function pendingChoice() {
      const cat = state.current;
      if (!cat) return null;
      const step = cat.story[state.step];
      if (!step || !step.choice || step.chosen != null) return null;
      return step;
    }

    function paintChoiceClock() {
      const box = document.getElementById('choiceClock');
      if (!box) return;
      const total = choiceMs();
      const left = state.choiceLeft == null ? 0 : Math.max(0, state.choiceLeft);
      box.hidden = false;
      const bar = document.getElementById('choiceClockBar');
      if (bar) bar.style.width = Math.max(0, Math.min(100, Math.round((left / total) * 100))) + '%';
      const txt = document.getElementById('choiceClockText');
      if (txt) {
        txt.textContent = left > 0
          ? '⏳ おまかせまで ' + Math.ceil(left / 1000) + '秒（タップで選べる）'
          : '⏳ おまかせ選択中…';
      }
    }

    function hideChoiceClock() {
      const box = document.getElementById('choiceClock');
      if (box) box.hidden = true;
    }

    function stopChoiceClock() {
      if (state.choiceTimer) {
        clearTimeout(state.choiceTimer);
        state.choiceTimer = null;
      }
    }

    function startChoiceClock() {
      stopChoiceClock();
      if (!pendingChoice() || !state.auto || !state.started) { hideChoiceClock(); return; }
      if (state.choiceLeft == null) state.choiceLeft = choiceMs();
      state.choiceStart = Date.now();
      paintChoiceClock();
      state.choiceTimer = setTimeout(choiceTick, 100);
    }

    function choiceTick() {
      state.choiceTimer = null;
      if (!pendingChoice() || !state.auto || !state.started) { hideChoiceClock(); return; }
      const now = Date.now();
      state.choiceLeft = Math.max(0, (state.choiceLeft || 0) - Math.max(0, now - (state.choiceStart || now)));
      state.choiceStart = now;
      paintChoiceClock();
      if (state.choiceLeft <= 0) { autoPickChoice(); return; }
      state.choiceTimer = setTimeout(choiceTick, 100);
    }

    /* 時間切れ：その場で自然に選んで、オートを止めずに続ける */
    function autoPickChoice() {
      const step = pendingChoice();
      if (!step) return;
      stopChoiceClock();
      state.choiceLeft = null;
      hideChoiceClock();
      const r = (root.Math && root.Math.random) ? root.Math.random() : 0.5;
      state.autoPicked = true;
      choose(r < 0.5 ? 0 : 1);
      toast('⏳ 時間切れでおまかせ選択！', 'auto');
    }

    /* --- 年齢の帯（現在の年齢と、通り過ぎた節目だけ） --- */
    function renderAgeStrip(cat, idx) {
      const step = cat.story[idx];
      el.lifeAge.textContent = step.ageLabel;
      if (el.lifeSeason) {
        el.lifeSeason.textContent = step.season
          ? E.seasonEmoji(step.season) + ' ' + E.seasonLabel(step.season) : '';
      }
      if (el.lifeMarks) {
        const passed = E.milestonesPassed(step.age).filter(m => m.age > 0);
        el.lifeMarks.innerHTML = passed.map(m =>
          `<span class="life-mark tone-${m.tone}">${m.icon} ${m.age}歳</span>`
        ).join('');
      }
    }

    /* --- ストーリー --- */
    function renderStory() {
      const cat = state.current;
      if (!cat) return;
      const idx = state.step;
      const step = cat.story[idx];
      el.pageWrap.innerHTML = stepCardHTML(cat, idx, state.picked);
      el.pageWrap.classList.remove('turn');
      void el.pageWrap.offsetWidth;
      el.pageWrap.classList.add('turn');
      el.storyProgress.className = 'paw-track';
      el.storyProgress.innerHTML = progressHTML(cat, idx);
      if (el.nameplate) el.nameplate.innerHTML = nameplateHTML(cat, idx);
      updateStage(cat, idx);
      renderAgeStrip(cat, idx);

      /* 人生の節目（1歳・3歳・6歳・10歳・15歳・20歳…）を知らせる */
      const ms = E.milestoneAt(cat.story, idx);
      if (ms && step.kind !== 'death' && !state.msShown[idx]) {
        state.msShown[idx] = ms.key;
        toast(ms.icon + ' ' + ms.label, ms.tone === 'cake' ? 'milestone' : ms.tone);
      }

      const isDeath = step.kind === 'death';
      const needChoice = !!step.choice && step.chosen == null;
      el.walkBtn.hidden = isDeath || needChoice;
      el.walkBtn.classList.toggle('is-start', !state.started);
      if (el.walkText) el.walkText.textContent = !state.started ? 'この子の猫生を歩む' : '猫生を歩む';
      el.walkSub.textContent = !state.started
        ? 'タップで猫生がはじまる'
        : needChoice ? 'えらんでね' : '1歩すすむ';
      el.skipBtn.hidden = isDeath;
      if (el.autoBar) el.autoBar.hidden = !state.started;

      el.finale.hidden = !isDeath;
      if (isDeath) {
        if (!state.recorded) {
          record(state.dex, cat);
          state.recorded = true;
          state.newAch = unlockAchievements(state.dex, cat);
          refreshStats();
        }
        el.finaleBody.innerHTML = buildFinaleHTML(cat, state.newAch, state.dex);
      } else {
        el.finaleBody.innerHTML = '';
      }

      el.memories.hidden = idx === 0;
      el.memoryList.innerHTML = memoryHTML(cat, idx, state.picked);
      if (needChoice) startChoiceClock();
      else { stopChoiceClock(); state.choiceLeft = null; hideChoiceClock(); }
      if (root.scrollTo) root.scrollTo({ top: 0, behavior: 'smooth' });
      scheduleAuto();
    }

    function startStory(cat) {
      clearAuto();
      state.current = cat;
      state.step = 0;
      state.started = false;
      state.picked = {};
      state.recorded = false;
      state.newAch = [];
      state.msShown = {};
      state.shownForm = null;
      state.rulerKey = null;
      state.choiceLeft = null;
      state.autoPicked = false;
      stopChoiceClock();
      state.adopted = false;
      state.shownStage = null;
      state.shownScene = null;
      el.home.hidden = true;
      el.story.hidden = false;
      mountStage(cat);
      renderStory();
    }

    function walk() {
      const cat = state.current;
      if (!cat) return;
      const step = cat.story[state.step];
      if (step.choice && step.chosen == null) return;
      if (state.step >= cat.story.length - 1) return;
      /* 誕生画面の「この子の猫生を歩む」で、オート進行がスタートする */
      if (!state.started) state.started = true;
      state.step += 1;
      renderStory();
    }

    function skipAll() {
      const cat = state.current;
      if (!cat) return;
      state.started = true;
      cat.story.forEach((s, i) => {
        if (s.choice && s.chosen == null) { s.chosen = 0; state.picked[i] = 0; }
      });
      state.step = cat.story.length - 1;
      stopChoiceClock();
      state.choiceLeft = null;
      renderStory();
    }

    /* 2択：選んだ結果をその後の猫生に反映する（延命・拾われる・ボス・ピンチ） */
    function choose(i) {
      const cat = state.current;
      if (!cat) return;
      const idx = state.step;
      const step = cat.story[idx];
      if (!step || !step.choice || step.chosen != null) return;
      if (i < 0 || i >= step.choice.options.length) return;
      state.picked[idx] = i;
      stopChoiceClock();
      state.choiceLeft = null;
      hideChoiceClock();
      const autoPick = !!state.autoPicked;
      const fx = E.applyChoice(cat, idx, i);
      /* 放っておいて選ばれたのか（おまかせ）、読んで選んだのかを記録に残す */
      if (step.chosen === i) step.autoPicked = autoPick;
      state.extraDelay = !state.autoPicked;
      state.autoPicked = false;
      renderStory();
      if (fx) {
        if (fx.died) toast('😿 ピンチに巻き込まれた…', 'danger');
        else if (fx.adopted) toast(cat.maneki ? '🏮 お店に迎えられた！' : '🏡 家族に迎えられた！', 'adopt');
        else if (fx.boss) toast('👑 ボス猫への道！', 'evolve');
        else if (fx.lifeAdded) toast('✨ 寿命が延びた！', 'milestone');
      }
    }

    function backHome() {
      clearAuto();
      stopChoiceClock();
      state.choiceLeft = null;
      el.story.hidden = true;
      el.home.hidden = false;
      state.current = null;
      state.shownStage = null;
      state.shownScene = null;
      updateAutoUI();
      if (root.scrollTo) root.scrollTo({ top: 0, behavior: 'smooth' });
    }

    el.walkBtn.addEventListener('click', walk);
    el.skipBtn.addEventListener('click', skipAll);
    el.pageWrap.addEventListener('click', (ev) => {
      const t = ev.target;
      const btn = t && t.closest ? t.closest('[data-choice]') : null;
      if (btn) choose(Number(btn.getAttribute('data-choice')));
    });
    if (el.autoBtn) el.autoBtn.addEventListener('click', toggleAuto);
    if (el.speed1) el.speed1.addEventListener('click', () => setSpeed(1));
    if (el.speed2) el.speed2.addEventListener('click', () => setSpeed(2));
    if (typeof document.addEventListener === 'function') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { clearAuto(); stopChoiceClock(); }
        else { scheduleAuto(); if (pendingChoice()) startChoiceClock(); }
      });
    }
    updateAutoUI();

    /* --- ガチャ --- */
    const FLAGS = D.COUNTRIES.map(c => c.flag);
    const TEXTS = [
      '地球のどこかを探しています…',
      '10億匹の名簿をめくっています…',
      '運命の子猫を選んでいます…',
      'この子に決まりました'
    ];

    function roll() {
      if (state.rolling) return;
      state.rolling = true;
      el.rollBtn.disabled = true;
      el.overlay.hidden = false;

      const cat = E.rollCat();
      const start = Date.now();
      const DURATION = 1750;
      let flagTimer = 0, textTimer = 0;

      const tick = () => {
        const t = Date.now() - start;
        flagTimer += 1;
        if (flagTimer % 2 === 0) {
          el.rollFlag.textContent = FLAGS[Math.floor(Math.random() * FLAGS.length)];
        }
        const idx = Math.min(TEXTS.length - 1, Math.floor(t / (DURATION / TEXTS.length)));
        el.rollText.textContent = TEXTS[idx];
        if (t < DURATION - 120) {
          textTimer = setTimeout(tick, 80);
        } else {
          finish(cat);
        }
      };
      tick();

      function finish(c) {
        clearTimeout(textTimer);
        el.overlay.hidden = true;
        el.rollBtn.disabled = false;
        state.rolling = false;
        startStory(c);
      }
    }

    el.rollBtn.addEventListener('click', roll);
    el.againBtn.addEventListener('click', () => { backHome(); setTimeout(roll, 60); });

    function share() {
      if (!state.current) return;
      root.open(shareURL(state.current), '_blank', 'noopener');
    }
    el.shareBtn.addEventListener('click', share);

    /* --- 図鑑 --- */
    function renderDex() {
      el.dexSummary.innerHTML = dexSummaryHTML(state.dex);
      el.dexBody.innerHTML = buildDexHTML(state.dex, state.tab, state.albumId);
      if (el.dexBody && el.dexBody.scrollTop) el.dexBody.scrollTop = 0;
      document.querySelectorAll('.tab').forEach(t => {
        const on = t.dataset.tab === state.tab;
        t.classList.toggle('is-active', on);
        if (t.getAttribute) t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
    }
    function openDex() {
      state.albumId = null;
      renderDex();
      el.dexModal.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function closeDex() {
      el.dexModal.hidden = true;
      document.body.style.overflow = '';
    }

    /* 過去の猫生：一覧 ↔ 詳細 */
    function openAlbum(id) {
      const list = Array.isArray(state.dex.albums) ? state.dex.albums : [];
      if (!id || !list.some(a => a && a.id === id)) return false;
      state.albumFrom = state.tab;
      state.tab = 'albums';
      state.albumId = id;
      renderDex();
      return true;
    }
    function closeAlbum() {
      state.albumId = null;
      renderDex();
    }

    el.openDex.addEventListener('click', openDex);
    el.toDexBtn.addEventListener('click', openDex);
    el.closeDex.addEventListener('click', closeDex);
    el.dexModal.addEventListener('click', (e) => { if (e.target === el.dexModal) closeDex(); });
    if (el.dexBody && el.dexBody.addEventListener) {
      el.dexBody.addEventListener('click', (ev) => {
        const t = ev && ev.target;
        if (!t || typeof t.closest !== 'function') return;
        if (t.closest('[data-album-back]')) { closeAlbum(); return; }
        const hit = t.closest('[data-album]');
        if (hit && hit.getAttribute) {
          const id = hit.getAttribute('data-album');
          if (id && !openAlbum(id)) { /* 記録が見つからないときは一覧のまま */ }
        }
      });
    }
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => { state.tab = t.dataset.tab; state.albumId = null; renderDex(); });
    });

    root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !el.dexModal.hidden) closeDex(); });

    /* 外部からテストできるように公開 */
    root.CATAPP.walk = walk;
    root.CATAPP.skipAll = skipAll;
    root.CATAPP.choose = choose;
    root.CATAPP.share = share;
    root.CATAPP.roll = roll;
    root.CATAPP.openDex = openDex;
    root.CATAPP.state = state;
    root.CATAPP.tapCat = tapCat;
    root.CATAPP.autoTick = autoTick;
    root.CATAPP.toggleAuto = toggleAuto;
    root.CATAPP.setSpeed = setSpeed;
    root.CATAPP.updateAutoUI = updateAutoUI;
    root.CATAPP.startChoiceClock = startChoiceClock;
    root.CATAPP.stopChoiceClock = stopChoiceClock;
    root.CATAPP.choiceTick = choiceTick;
    root.CATAPP.autoPickChoice = autoPickChoice;
    root.CATAPP.start = startStory;
    root.CATAPP.render = renderStory;
    root.CATAPP.pendingChoice = pendingChoice;
    root.CATAPP.openAlbum = openAlbum;
    root.CATAPP.closeAlbum = closeAlbum;
    root.CATAPP.renderDex = renderDex;
  }

  root.CATAPP = Object.assign(root.CATAPP || {}, {
    buildStepHTML: stepCardHTML, buildFinaleHTML, buildDexHTML, shareText, shareURL,
    achievement, record, unlockAchievements, loadDex, emptyDex, eyeName, bornLine,
    nameplateHTML, profileHTML, rareCardHTML, eyeText, progressHTML,
    TOTAL_TARGETS, CATALOG, formAt, achBurstHTML,
    buildResultHTML: function (cat) { return stepCardHTML(cat, 0, {}); },
    albumEntry, albumLogs, albumListHTML, albumDetailHTML, albumCardHTML,
    albumStepHTML, albumFlagsHTML, albumStill, saveDex, ALBUM_MAX, CAUSE_JP
  });
  init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
