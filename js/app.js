/* ============================================================
   世界猫生ガチャ — UI（子猫で生まれて、猫生を歩む）
   ============================================================ */
(function (root) {
  'use strict';

  const D = root.CATGACHA_DATA;
  const E = root.CATGACHA;
  const S = root.CATGACHA_SVG;
  const KEY = 'catgacha.dex.v1';

  const RARITY_JP = { N: 'ノーマル', R: 'レア', SR: 'スーパーレア', SSR: 'ダブルレア', UR: 'ウルトラレア' };
  const RARITY_DESC = {
    N: 'よく会える猫',
    R: 'ちょっと珍しい猫',
    SR: 'なかなか会えない猫',
    SSR: '奇跡に近い猫',
    UR: '地球上で数えるほど'
  };
  const STAGE_JP = { kitten: '子猫', adult: '成猫', senior: 'シニア猫' };

  /* ---------- 図鑑データ ---------- */
  function emptyDex() {
    return { total: 0, species: {}, countries: {}, mutations: {}, rarities: {}, maxAge: 0, best: null, rarest: null, history: [] };
  }
  function loadDex() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(KEY);
      if (!raw) return emptyDex();
      const d = JSON.parse(raw);
      return Object.assign(emptyDex(), d);
    } catch (e) { return emptyDex(); }
  }
  function saveDex(dex) {
    try { root.localStorage && root.localStorage.setItem(KEY, JSON.stringify(dex)); } catch (e) { /* private mode */ }
  }

  const CATALOG = E.dexCatalog();
  const TOTAL_TARGETS = CATALOG.species.length + CATALOG.countries.length + CATALOG.mutations.length;

  function achievement(dex) {
    const s = Object.keys(dex.species || {}).length;
    const c = Object.keys(dex.countries || {}).length;
    const m = Object.keys(dex.mutations || {}).length;
    return s + c + m;
  }

  function record(dex, cat) {
    dex.total += 1;
    dex.species[cat.speciesKey] = (dex.species[cat.speciesKey] || 0) + 1;
    dex.countries[cat.region.bucket] = (dex.countries[cat.region.bucket] || 0) + 1;
    cat.mutations.forEach(m => { dex.mutations[m.key] = (dex.mutations[m.key] || 0) + 1; });
    dex.rarities[cat.rarity] = (dex.rarities[cat.rarity] || 0) + 1;
    dex.maxAge = Math.max(dex.maxAge || 0, cat.ageYears);
    const rank = E.RARITY_ORDER.indexOf(cat.rarity);
    if (!dex.best || rank > E.RARITY_ORDER.indexOf(dex.best.rarity)) {
      dex.best = { rarity: cat.rarity, name: cat.name, species: cat.speciesName, at: Date.now() };
    }
    if (!dex.rarest || cat.probability < dex.rarest.probability) {
      dex.rarest = { probability: cat.probability, name: cat.name, species: cat.speciesName, popularity: cat.population, at: Date.now() };
    }
    dex.history.unshift({
      name: cat.name, species: cat.speciesName, region: cat.region.name,
      rarity: cat.rarity, age: cat.ageYears, at: Date.now()
    });
    dex.history = dex.history.slice(0, 12);
    saveDex(dex);
    return dex;
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

  function traitsHTML(cat) {
    const out = [];
    out.push(`<span class="chip chip--pink">${cat.rarity}・${RARITY_JP[cat.rarity]}</span>`);
    out.push(`<span class="chip">${cat.statusLabel}</span>`);
    out.push(`<span class="chip">${cat.speciesName}</span>`);
    out.push(`<span class="chip">${D.SEX_LABEL[cat.sex]}</span>`);
    const eye = cat.eyeColor2 !== cat.eyeColor ? 'オッドアイ' : eyeName(cat.eyeColor) + 'の目';
    out.push(`<span class="chip">${eye}</span>`);
    if (cat.longhair) out.push('<span class="chip">長毛</span>');
    if (cat.speciesGroup === 'big') out.push('<span class="chip">大型ネコ科</span>');
    if (cat.klass === 'wild' && cat.species && cat.species.iucn) out.push(`<span class="chip">IUCN ${cat.species.iucn}</span>`);
    cat.mutations.forEach(m => out.push(`<span class="chip chip--mint">${m.name}</span>`));
    return `<div class="chips">${out.join('')}</div>`;
  }

  function progressHTML(cat, idx) {
    return cat.story.map((s, i) => {
      const cls = i < idx ? ' is-done' : i === idx ? ' is-now' : '';
      return `<span class="paw${cls}">🐾</span>`;
    }).join('');
  }

  function choiceHTML(step, pick) {
    if (pick != null && step.choice.options[pick]) {
      return `<div class="choice-result"><span class="choice-tag">🐾 ${step.choice.options[pick].label}</span><p>${step.choice.options[pick].text}</p></div>`;
    }
    return `<div class="choice-box">
      <p class="choice-q">どうする？</p>
      ${step.choice.options.map((o, i) =>
        `<button class="choice-btn" data-choice="${i}"><span class="choice-paw" aria-hidden="true">🐾</span><span>${o.label}</span></button>`
      ).join('')}
    </div>`;
  }

  function stepCardHTML(cat, idx, picked) {
    const step = cat.story[idx];
    const isBirth = step.kind === 'birth';
    const isDeath = step.kind === 'death';
    const pick = picked ? picked[idx] : undefined;
    const chosen = step.choice && pick != null ? step.choice.options[pick] : null;
    const body = chosen ? chosen.text : step.text;
    return `
    <article class="page${isBirth ? ' page--birth' : ''}${isDeath ? ' page--death' : ''}">
      <span class="page-tape" aria-hidden="true"></span>
      <div class="page-head">
        <span class="age-badge">${step.ageLabel}</span>
        <span class="stage-chip">${STAGE_JP[step.stage] || ''}</span>
        ${isBirth ? `<span class="rarity r-${cat.rarity}">${cat.rarity}</span>` : ''}
        <span class="page-no">${idx + 1}/${cat.story.length}</span>
      </div>
      <div class="page-art">${S.render(cat, { stage: step.stage, eyes: isDeath ? 'closed' : undefined })}</div>
      ${isBirth ? `<p class="born-line">🌏 ${bornLine(cat)}</p>` : ''}
      <h2 class="page-title">${isDeath ? '🌈 最期' : '【' + step.title + '】'}</h2>
      <p class="page-text">${body}</p>
      ${isBirth ? traitsHTML(cat) : ''}
      ${step.choice ? choiceHTML(step, pick) : ''}
    </article>`;
  }

  function memoryHTML(cat, idx, picked) {
    if (!idx) return '';
    let out = '';
    for (let i = 0; i < idx; i++) {
      const s = cat.story[i];
      const pick = picked ? picked[i] : undefined;
      const chosen = s.choice && pick != null ? s.choice.options[pick] : null;
      const text = chosen ? chosen.text : s.text;
      const label = s.kind === 'birth' ? '生まれた日' : s.ageLabel;
      const tilt = (i % 2 === 0 ? -1.1 : 1.1);
      out += `<div class="note note--${s.kind}" style="--tilt:${tilt}deg">
        <span class="note-age">${label}</span>
        <p class="note-text">${text}</p>
      </div>`;
    }
    return out;
  }

  function buildFinaleHTML(cat) {
    const isBaby = cat.ageYears < 1;
    const months = Math.max(1, Math.round(cat.ageYears * 12));
    const num = isBaby ? months : Math.floor(cat.ageYears);
    const unit = isBaby ? 'か月' : '歳';
    const prefix = isBaby ? '生後' : '';
    const subject = cat.klass === 'wild' && cat.route !== 'zoo'
      ? `${cat.speciesName}（${cat.sciName}）`
      : cat.speciesName;
    return `
    <div class="finale-head">
      <span class="finale-kicker">🌈 この猫生のきろく</span>
      <div class="finale-age"><span class="finale-prefix">${prefix}</span><b>${num}</b><span class="finale-unit">${unit}</span><span class="finale-suffix">享年</span></div>
      <p class="finale-caption">${cat.caption}</p>
      <div class="finale-who"><span class="finale-flag">${cat.region.flag}</span>${cat.name} ／ ${subject}</div>
    </div>
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
      `${cat.region.flag} ${placeText(cat)}の${cat.statusLabel}・${cat.speciesName}／享年${ageText(cat.ageYears)}`,
      `確率 ${E.formatProb(cat.probability)}（${E.formatOneIn(cat.probability)}）`
    ];
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

  function buildDexHTML(dex, tab) {
    if (tab === 'species') {
      const coats = CATALOG.species.filter(s => s.group === 'coat');
      const breeds = CATALOG.species.filter(s => s.group === 'breed');
      const wild = CATALOG.species.filter(s => s.group === 'wild');
      return groupSection('雑種（' + coats.length + '種）', coats, dex.species)
        + groupSection('純血種（' + breeds.length + '種）', breeds, dex.species)
        + groupSection('野生のネコ科（' + wild.length + '種）', wild, dex.species);
    }
    if (tab === 'countries') return groupSection('国・地域（' + CATALOG.countries.length + '）', CATALOG.countries, dex.countries);
    if (tab === 'mutations') {
      const rows = CATALOG.mutations.map(m => {
        const c = dex.mutations[m.key] || 0;
        return `<div class="dex-cell ${c ? '' : 'is-locked'}"><span class="n">${c ? m.name : '???'}</span><span class="c">${c ? c + '回' : '—'}</span></div>`;
      }).join('');
      return `<div class="dex-section"><h4><span>激レア変異（${CATALOG.mutations.length}種）</span><span>${Object.keys(dex.mutations).length}/${CATALOG.mutations.length}</span></h4>
        <div class="dex-grid">${rows}</div>
        <p class="empty-note">オッドアイやオスの三毛猫など。出会えたらスクショの価値あり。</p></div>`;
    }
    const rar = E.RARITY_ORDER.map(r => `<li><span>${r}（${RARITY_JP[r]}）</span><span>${dex.rarities[r] || 0}回</span></li>`).join('');
    const best = dex.best ? `<li><span>最高レア</span><span>${dex.best.rarity}・${dex.best.species}</span></li>` : '';
    const rarest = dex.rarest ? `<li><span>いちばんレアな1匹</span><span>${E.formatOneIn(dex.rarest.probability)}</span></li>` : '';
    const age = dex.maxAge ? `<li><span>いちばん長生き</span><span>${ageText(dex.maxAge)}</span></li>` : '';
    const hist = dex.history.map(h => `<li><span>${h.rarity}・${h.species}（${h.region}）</span><span>${ageText(h.age)}</span></li>`).join('');
    return `<div class="dex-section"><h4><span>記録</span></h4><ul class="record-list">${best}${rarest}${age}${rar}</ul></div>
      ${hist ? `<div class="dex-section"><h4><span>最近の猫生</span></h4><ul class="record-list">${hist}</ul></div>` : ''}
      <p class="empty-note">${dex.total === 0 ? 'まだ一度も猫生を歩いていません。ガチャを回すと、ここに猫がたまっていきます。' : ''}</p>`;
  }

  /* ---------- アプリ本体 ---------- */
  function init() {
    if (typeof document === 'undefined') return;

    const $ = id => document.getElementById(id);
    const state = { dex: loadDex(), current: null, rolling: false, tab: 'species', step: 0, picked: {}, recorded: false };

    const el = {
      home: $('homeScreen'), story: $('storyScreen'),
      preview: $('catPreview'), overlay: $('rollOverlay'), rollFlag: $('rollFlag'), rollText: $('rollText'),
      rollBtn: $('rollBtn'), againBtn: $('againBtn'), shareBtn: $('shareBtn'), toDexBtn: $('toDexBtn'),
      openDex: $('openDex'), closeDex: $('closeDex'), dexModal: $('dexModal'), dexBody: $('dexBody'),
      dexSummary: $('dexSummary'), dexBadge: $('dexBadge'),
      statTotal: $('statTotal'), statBest: $('statBest'), statRate: $('statRate'),
      storyProgress: $('storyProgress'), pageWrap: $('pageWrap'), walkBtn: $('walkBtn'),
      walkSub: $('walkSub'), skipBtn: $('skipBtn'), finale: $('finale'), finaleBody: $('finaleBody'),
      memories: $('memories'), memoryList: $('memoryList')
    };

    /* --- 初期表示 --- */
    let preview = null;
    for (let i = 0; i < 1200; i++) {
      const c = E.rollCat((i * 7919 + 13) >>> 0);
      if (c.speciesKey === 'coat:kijitora' && c.route === 'owned') { preview = c; break; }
    }
    if (!preview) preview = E.rollCat(1);
    el.preview.innerHTML = S.render(preview, { stage: 'kitten' });

    function refreshStats() {
      const d = state.dex;
      el.statTotal.textContent = d.total;
      el.statBest.textContent = d.best ? d.best.rarity : '—';
      const got = achievement(d);
      el.statRate.textContent = Math.round(got / TOTAL_TARGETS * 100) + '%';
      el.dexBadge.textContent = got;
    }
    refreshStats();

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
      el.storyProgress.innerHTML = progressHTML(cat, idx);

      const isDeath = step.kind === 'death';
      const needChoice = !!step.choice && state.picked[idx] == null;
      el.walkBtn.hidden = isDeath || needChoice;
      el.walkSub.textContent = needChoice ? 'えらんでね' : (idx === 0 ? 'まずは一歩' : 'あと' + (cat.story.length - idx - 1) + '歩');
      el.skipBtn.hidden = isDeath;

      el.finale.hidden = !isDeath;
      if (isDeath) {
        el.finaleBody.innerHTML = buildFinaleHTML(cat);
        if (!state.recorded) {
          record(state.dex, cat);
          state.recorded = true;
          refreshStats();
        }
      }

      el.memories.hidden = idx === 0;
      el.memoryList.innerHTML = memoryHTML(cat, idx, state.picked);
      if (root.scrollTo) root.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function startStory(cat) {
      state.current = cat;
      state.step = 0;
      state.picked = {};
      state.recorded = false;
      el.preview.innerHTML = S.render(cat, { stage: E.stageForAge(cat.ageYears) });
      el.home.hidden = true;
      el.story.hidden = false;
      renderStory();
    }

    function walk() {
      const cat = state.current;
      if (!cat) return;
      const step = cat.story[state.step];
      if (step.choice && state.picked[state.step] == null) return;
      if (state.step >= cat.story.length - 1) return;
      state.step += 1;
      renderStory();
    }

    function skipAll() {
      const cat = state.current;
      if (!cat) return;
      cat.story.forEach((s, i) => {
        if (s.choice && state.picked[i] == null) state.picked[i] = 0;
      });
      state.step = cat.story.length - 1;
      renderStory();
    }

    function choose(i) {
      const cat = state.current;
      if (!cat) return;
      const step = cat.story[state.step];
      if (!step || !step.choice) return;
      if (i < 0 || i >= step.choice.options.length) return;
      state.picked[state.step] = i;
      renderStory();
    }

    function backHome() {
      el.story.hidden = true;
      el.home.hidden = false;
      state.current = null;
      if (root.scrollTo) root.scrollTo({ top: 0, behavior: 'smooth' });
    }

    el.walkBtn.addEventListener('click', walk);
    el.skipBtn.addEventListener('click', skipAll);
    el.pageWrap.addEventListener('click', (ev) => {
      const t = ev.target;
      const btn = t && t.closest ? t.closest('[data-choice]') : null;
      if (btn) choose(Number(btn.getAttribute('data-choice')));
    });

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
      el.dexBody.innerHTML = buildDexHTML(state.dex, state.tab);
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.toggle('is-active', t.dataset.tab === state.tab);
      });
    }
    function openDex() {
      renderDex();
      el.dexModal.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function closeDex() {
      el.dexModal.hidden = true;
      document.body.style.overflow = '';
    }

    el.openDex.addEventListener('click', openDex);
    el.toDexBtn.addEventListener('click', openDex);
    el.closeDex.addEventListener('click', closeDex);
    el.dexModal.addEventListener('click', (e) => { if (e.target === el.dexModal) closeDex(); });
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', () => { state.tab = t.dataset.tab; renderDex(); });
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
  }

  root.CATAPP = Object.assign(root.CATAPP || {}, {
    buildStepHTML: stepCardHTML, buildFinaleHTML, buildDexHTML, shareText, shareURL,
    achievement, record, loadDex, emptyDex, eyeName, bornLine, TOTAL_TARGETS, CATALOG,
    buildResultHTML: function (cat) { return stepCardHTML(cat, 0, {}); }
  });
  init();
})(typeof globalThis !== 'undefined' ? globalThis : this);
