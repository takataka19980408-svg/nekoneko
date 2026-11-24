/* ============================================================
   世界猫生ガチャ — 猫生カード（SNSシェア用画像）
   フィナーレ画面と「過去の猫生」の詳細から、その子の
   成長後イラスト・名前・国・種別・境遇・享年・珍しさ・
   代表の一言を 1080x1350 の1枚に描く。

   Canvas 2D に描くだけの純ロジック。ブラウザでは
   document.createElement('canvas') を渡し、テストでは
   スタブのキャンバスを渡して dataURL を検証する。
   ============================================================ */
(function (root) {
  'use strict';

  const W = 1080, H = 1350;
  const FONT = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic",system-ui,-apple-system,"Segoe UI",sans-serif';
  const INK = '#3b2f2a', INK2 = '#6f5c52', INK3 = '#9b8578', PINK = '#ef7898';

  const CAUSE_JP = {
    early: '早すぎる別れ', illness: '病気', accident: '事故', natural: '大往生',
    starve: '飢え', fight: 'ケンカ', human: '人の手', pinch: '不慮の事故',
    nekomata: '猫又', maneki: '看板猫'
  };
  const STATUS_ICON = [
    ['野生のネコ科', '🐆'], ['動物園', '🎪'], ['野生化', '🌿'], ['地域猫', '🏘'],
    ['血統書', '📜'], ['飼い猫', '🏠'], ['野良猫', '🌃']
  ];

  /* ---------- 小さな描画ヘルパ ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
  }

  /* 古い Safari でも楕円を描けるように（ellipse が無ければ arc で代用） */
  function ellipsePath(ctx, cx, cy, rx, ry, rot, a0, a1) {
    if (typeof ctx.ellipse === 'function') {
      ctx.ellipse(cx, cy, rx, ry, rot || 0, a0 || 0, a1 == null ? Math.PI * 2 : a1);
      return;
    }
    ctx.save();
    ctx.translate(cx, cy);
    if (rot) ctx.rotate(rot);
    ctx.scale(1, ry / Math.max(1, rx));
    ctx.arc(0, 0, rx, a0 || 0, a1 == null ? Math.PI * 2 : a1);
    ctx.restore();
  }

  function fillRound(ctx, x, y, w, h, r, fill) {
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function strokeRound(ctx, x, y, w, h, r, color, width) {
    roundRect(ctx, x, y, w, h, r);
    ctx.strokeStyle = color;
    ctx.lineWidth = width || 2;
    ctx.stroke();
  }

  function fitFont(ctx, str, maxWidth, size, weight) {
    let s = size;
    do {
      ctx.font = (weight || '800') + ' ' + s + 'px ' + FONT;
      if (ctx.measureText(str).width <= maxWidth) break;
      s -= 2;
    } while (s > 12);
    return s;
  }

  function e(ctx, str, x, y, size, color, opts) {
    opts = opts || {};
    ctx.font = (opts.weight || '800') + ' ' + size + 'px ' + FONT;
    ctx.fillStyle = color || INK;
    ctx.textAlign = opts.align || 'left';
    ctx.textBaseline = opts.baseline || 'alphabetic';
    ctx.fillText(String(str), x, y);
  }

  function wrap(ctx, str, maxWidth, maxLines) {
    const chars = String(str || '').split('');
    const lines = [];
    let cur = '';
    for (let i = 0; i < chars.length; i++) {
      const next = cur + chars[i];
      if (ctx.measureText(next).width > maxWidth && cur) {
        lines.push(cur);
        cur = chars[i];
        if (lines.length >= (maxLines || 99) - 1) break;
      } else {
        cur = next;
      }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, maxLines || 99);
  }

  function pill(ctx, label, x, y, size, bg, fg) {
    ctx.font = '800 ' + size + 'px ' + FONT;
    const w = ctx.measureText(label).width + size * 1.5;
    const h = size * 1.85;
    fillRound(ctx, x, y, w, h, h / 2, bg);
    e(ctx, label, x + w / 2, y + h / 2 + size * 0.35, size, fg || '#fff', { align: 'center' });
    return { w: w, h: h };
  }

  /* ---------- 猫の生データ → カードの内容 ----------
     ライブの猫（story を持つ）と、過去の猫生の記録（art を持つ）の
     どちらでも同じ形に整える。 */
  function cardData(rec) {
    if (!rec) return null;
    const E = root.CATGACHA || {};
    const D = root.CATGACHA_DATA || {};
    const art = rec.art || {};
    const region = rec.region || {};
    const type = art.type || (root.CATART ? root.CATART.typeFor(rec) : 'tabby');
    const stage = art.stage === 'kitten' ? 'kitten' : 'adult';
    const age = Number(rec.ageYears) || 0;
    const prob = Number(rec.probability) || 0;
    const death = rec.deathReason || rec.deathCause || '';
    const sex = rec.gender || (D.SEX_LABEL && rec.sex ? D.SEX_LABEL[rec.sex] : '');
    const kind = rec.kind || (rec.klass === 'wild' ? '野生のネコ科'
      : rec.route === 'purebred' ? '純血種' : '雑種');
    const coat = rec.breed || rec.pattern || '';
    const tags = [];
    /* 育った気質は、いちばん先に見せたい */
    let persona = '';
    if (rec.persona && rec.persona.stage) persona = rec.persona.label;
    else if (E.personalityAt && Array.isArray(rec.story) && rec.story.length) {
      const p = E.personalityAt(rec, rec.story.length - 1);
      if (p && p.stage) persona = p.label;
    }
    if (persona) tags.push('🌱 ' + persona);
    let traces = Array.isArray(rec.traces) ? rec.traces.filter(t => t && t.label) : [];
    if (!traces.length && E.tracesAt && Array.isArray(rec.story) && rec.story.length) {
      traces = E.tracesAt(rec, rec.story.length - 1);
    }
    traces = traces.slice(0, 3);
    if (rec.statusLabel) {
      let ic = '';
      STATUS_ICON.forEach(p => { if (!ic && rec.statusLabel.indexOf(p[0]) >= 0) ic = p[1]; });
      tags.push((ic ? ic + ' ' : '') + rec.statusLabel);
    }
    if (rec.adopted) tags.push(rec.maneki ? '🏮 お店の子' : '🏡 家族の子');
    if (rec.bossCat) tags.push('👑 ボス猫');
    if (rec.nekomata) tags.push('🔮 猫又');
    if (rec.maneki) tags.push('🏮 招き猫');
    if (rec.mutations && rec.mutations.length) {
      rec.mutations.slice(0, 2).forEach(m => { if (m && m.name) tags.push('✦ ' + m.name); });
    }
    return {
      name: rec.name || '名もなき猫',
      flag: region.flag || '🌍',
      place: region.name || '',
      species: rec.speciesName || '',
      coat: coat,
      kind: kind,
      gender: sex,
      status: rec.statusLabel || '',
      age: age,
      ageLabel: (E.ageText ? E.ageText(age) : Math.floor(age) + '歳'),
      cause: CAUSE_JP[death] || '',
      deathKey: death,
      probability: prob,
      oneIn: E.formatOneIn ? E.formatOneIn(prob) : '—',
      probText: E.formatProb ? E.formatProb(prob) : '',
      caption: rec.caption || '',
      adopted: !!rec.adopted,
      boss: !!rec.bossCat,
      nekomata: !!rec.nekomata,
      maneki: !!rec.maneki,
      collar: !!(art.collar || rec.adopted),
      senior: !!(art.senior || rec.finalStage === 'senior' || age >= 10),
      tags: tags,
      persona: persona,
      traces: traces,
      art: { type: type, stage: stage }
    };
  }

  /* ---------- 猫の絵（首輪・猫又・招き猫・シニアの色味つき） ---------- */
  function drawCat(ctx, data, deps, cx, top, size) {
    const x = cx - size / 2;
    const A = root.CATART || {};
    const type = data.art.type, stage = data.art.stage;

    /* 猫又の2本目のしっぽ（体の後ろに描く） */
    if (data.nekomata) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#7FB4FF';
      ctx.lineWidth = size * 0.032;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.20, top + size * 0.94);
      ctx.bezierCurveTo(x - size * 0.02, top + size * 0.72, x + size * 0.30, top + size * 0.54, x + size * 0.17, top + size * 0.27);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(235,245,255,.9)';
      ctx.lineWidth = size * 0.011;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + size * 0.17, top + size * 0.27, size * 0.018, 0, Math.PI * 2);
      ctx.fillStyle = '#BFE0FF';
      ctx.fill();
      ctx.restore();
    }

    /* 招き猫の赤い座布団と小判 */
    if (data.maneki) {
      ctx.save();
      ctx.beginPath();
      ellipsePath(ctx, cx, top + size * 0.965, size * 0.40, size * 0.075, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#C6304B';
      ctx.fill();
      ctx.beginPath();
      ellipsePath(ctx, cx, top + size * 0.945, size * 0.34, size * 0.05, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#e05a72';
      ctx.fill();
      ctx.beginPath();
      ellipsePath(ctx, x + size * 0.80, top + size * 0.86, size * 0.085, size * 0.055, -0.2, 0, Math.PI * 2);
      ctx.fillStyle = '#F7D060';
      ctx.fill();
      ctx.strokeStyle = '#B8862A';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      e(ctx, '小判', x + size * 0.80, top + size * 0.878, size * 0.040, '#8a6416', { align: 'center' });
      ctx.restore();
    }

    /* 猫のPNG。シニアは暖かい色味を重ねる */
    if (deps.image && deps.image.width) {
      if (data.senior && deps.createCanvas) {
        try {
          const layer = deps.createCanvas(size, size);
          const lc = layer.getContext('2d');
          lc.drawImage(deps.image, 0, 0, size, size);
          lc.globalCompositeOperation = 'source-atop';
          lc.fillStyle = 'rgba(255, 178, 92, .20)';
          lc.fillRect(0, 0, size, size);
          lc.fillStyle = 'rgba(255, 236, 200, .12)';
          lc.fillRect(0, 0, size, size);
          ctx.drawImage(layer, x, top, size, size);
        } catch (err) {
          ctx.drawImage(deps.image, x, top, size, size);
        }
      } else {
        ctx.drawImage(deps.image, x, top, size, size);
      }
    } else {
      /* 画像が読めなくてもカードは作る（肉球のプレースホルダ） */
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, top + size * 0.45, size * 0.28, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 214, 224, .7)';
      ctx.fill();
      e(ctx, '🐾', cx, top + size * 0.56, size * 0.22, '#c98d9e', { align: 'center' });
      ctx.restore();
    }

    /* 鈴付きの首輪（js/catart.js の個体別座標を使う） */
    if (data.collar) {
      const c = (A.collarFor ? A.collarFor(type, stage) : { x: 45, y: 50, w: 38, r: 0 });
      const ccx = x + size * (c.x / 100);
      const ccy = top + size * (c.y / 100);
      const cw = size * (c.w / 100);
      ctx.save();
      ctx.translate(ccx, ccy);
      ctx.rotate((c.r || 0) * Math.PI / 180);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ellipsePath(ctx, 0, 0, cw / 2, cw * 0.23, 0, 0.10 * Math.PI, 0.90 * Math.PI);
      ctx.strokeStyle = '#F1566F';
      ctx.lineWidth = Math.max(7, cw * 0.085);
      ctx.stroke();
      ctx.beginPath();
      ellipsePath(ctx, 0, 0, cw / 2, cw * 0.23, 0, 0.10 * Math.PI, 0.90 * Math.PI);
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = Math.max(2, cw * 0.022);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, cw * 0.21, Math.max(7, cw * 0.085), 0, Math.PI * 2);
      ctx.fillStyle = '#FFD35C';
      ctx.fill();
      ctx.strokeStyle = '#B47D14';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- カード本体 ---------- */
  function draw(canvas, data, deps) {
    if (!canvas || !data) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    /* 背景 */
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fff7f1');
    bg.addColorStop(0.55, '#ffefe6');
    bg.addColorStop(1, '#ffe3d8');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    /* うすい肉球の模様 */
    ctx.save();
    ctx.globalAlpha = 0.10;
    e(ctx, '🐾', 120, 210, 120, '#c98d9e', { align: 'center' });
    e(ctx, '🐾', 960, 260, 88, '#c98d9e', { align: 'center' });
    e(ctx, '🐾', 90, 1180, 76, '#c98d9e', { align: 'center' });
    e(ctx, '🐾', 990, 1120, 110, '#c98d9e', { align: 'center' });
    ctx.restore();

    /* 外枠 */
    strokeRound(ctx, 36, 36, W - 72, H - 72, 56, 'rgba(255,255,255,.9)', 3);

    /* ヘッダー */
    ctx.beginPath();
    ctx.arc(84, 106, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    e(ctx, '🐾', 84, 118, 26, PINK, { align: 'center' });
    e(ctx, '世界猫生ガチャ', 122, 122, 34, INK, { weight: '900' });
    e(ctx, '猫生カード', W - 84, 120, 26, INK3, { align: 'right' });

    /* カード */
    ctx.save();
    ctx.shadowColor = 'rgba(190, 130, 110, .28)';
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 14;
    fillRound(ctx, 74, 168, W - 148, 1072, 46, '#fffdfa');
    ctx.restore();
    strokeRound(ctx, 74, 168, W - 148, 1072, 46, '#fff', 3);

    /* カード上部の小さなリボン */
    fillRound(ctx, 456, 146, 168, 46, 23, PINK);
    e(ctx, 'この子の猫生', 540, 177, 22, '#fff', { align: 'center' });

    /* 猫の絵 */
    drawCat(ctx, data, deps || {}, 540, 214, 500);

    /* 名前 */
    const nameSize = fitFont(ctx, data.name, 780, 62, '900');
    e(ctx, data.name, 540, 802, nameSize, INK, { align: 'center', weight: '900' });

    /* 地域・種別・性別 */
    const subParts = [];
    if (data.flag || data.place) subParts.push((data.flag || '🌍') + ' ' + (data.place || ''));
    if (data.species) subParts.push(data.species);
    if (data.gender) subParts.push(data.gender);
    const sub = subParts.join('　｜　');
    e(ctx, sub, 540, 850, fitFont(ctx, sub, 820, 28, '700'), INK2, { align: 'center', weight: '700' });

    /* 境遇などのバッジ */
    const tags = data.tags.slice(0, 4);
    if (tags.length) {
      let total = 0;
      tags.forEach(t => { ctx.font = '800 21px ' + FONT; total += ctx.measureText(t).width + 32 + 10; });
      total -= 10;
      let tx = 540 - total / 2;
      tags.forEach(t => {
        const p = pill(ctx, t, tx, 872, 21, '#fff1e4', '#a1703a');
        tx += p.w + 10;
      });
    }

    /* 享年 と 珍しさ */
    const boxY = 940, boxH = 108, boxW = 412;
    fillRound(ctx, 112, boxY, boxW, boxH, 26, '#fff5ee');
    strokeRound(ctx, 112, boxY, boxW, boxH, 26, '#ffe3d4', 2);
    e(ctx, '🌈 享年', 140, boxY + 40, 22, INK3, { weight: '800' });
    const ageLine = data.ageLabel + (data.cause ? '（' + data.cause + '）' : '');
    e(ctx, ageLine, 140, boxY + 84, fitFont(ctx, ageLine, boxW - 56, 34, '900'), INK, { weight: '900' });

    fillRound(ctx, 556, boxY, boxW, boxH, 26, '#fff5ee');
    strokeRound(ctx, 556, boxY, boxW, boxH, 26, '#ffe3d4', 2);
    e(ctx, '✨ 珍しさ', 584, boxY + 40, 22, INK3, { weight: '800' });
    const rareLine = data.oneIn + (data.probText ? '（' + data.probText + '）' : '');
    e(ctx, rareLine, 584, boxY + 84, fitFont(ctx, rareLine, boxW - 40, 31, '900'), INK, { weight: '900' });
    /* ソシャゲのランクは出さない。珍しい子だけ、確率の言葉をそっと添える */
    const EG = root.CATGACHA || {};
    const rw = (EG.rareWord ? EG.rareWord(data.probability) : null);
    if (rw) {
      ctx.font = '900 24px ' + FONT;
      const tw = ctx.measureText(rw.text).width;
      fillRound(ctx, 540 - tw / 2 - 24, 152, tw + 48, 46, 23, '#fff1e0');
      e(ctx, rw.text, 540, 183, 24, '#b9742c', { align: 'center', weight: '900' });
    }

    /* 代表の一言 */
    if (data.caption) {
      ctx.font = '700 30px ' + FONT;
      const lines = wrap(ctx, data.caption, 840, 2);
      const cut = lines.join('').length < String(data.caption).length;
      const startY = 1050;
      lines.forEach((ln, i) => {
        const body = (i === 0 ? '「' : '') + ln + (i === lines.length - 1 ? (cut ? '…」' : '」') : '');
        e(ctx, body, 540, startY + i * 40, 29, INK2, { align: 'center', weight: '700' });
      });
    }

    /* 残した思い出の痕跡（3つまで。はみ出すときは減らす） */
    if (data.traces && data.traces.length) {
      const list = data.traces.slice(0, 3);
      const size = 20;
      const widthOf = (t) => { ctx.font = '800 ' + size + 'px ' + FONT; return ctx.measureText(t.icon + ' ' + t.label).width + size * 1.5; };
      while (list.length && list.reduce((a, t) => a + widthOf(t) + 8, -8) > 900) list.pop();
      const totalW = list.reduce((a, t) => a + widthOf(t) + 8, -8);
      let tx = 540 - totalW / 2;
      list.forEach(t => {
        const p = pill(ctx, t.icon + ' ' + t.label, tx, 1128, size, '#fff8ee', '#a1703a');
        tx += p.w + 8;
      });
    }

    /* カード下部 */
    e(ctx, '#世界猫生ガチャ', 540, 1200, 24, PINK, { align: 'center', weight: '900' });

    /* 外側の注記 */
    e(ctx, '地球の猫 約10億匹のなかの、この条件の猫。', 540, 1292, 22, INK3, { align: 'center', weight: '700' });
    e(ctx, '世界猫生ガチャ', 540, 1322, 18, INK3, { align: 'center', weight: '800' });
    return canvas;
  }

  /* カードを描いて dataURL を返す。
     deps.createCanvas(w, h) → canvas / deps.image → 読み込み済みの猫PNG */
  function render(rec, deps) {
    deps = deps || {};
    const data = cardData(rec);
    if (!data) return { dataURL: '', w: W, h: H, data: null };
    const create = deps.createCanvas || (root.document && root.document.createElement
      ? function (w, h) { const c = root.document.createElement('canvas'); c.width = w; c.height = h; return c; }
      : null);
    if (!create) return { dataURL: '', w: W, h: H, data: data };
    const canvas = create(W, H);
    draw(canvas, data, deps);
    let dataURL = '';
    try { dataURL = canvas.toDataURL('image/png'); } catch (err) { dataURL = ''; }
    return { dataURL: dataURL, w: W, h: H, data: data };
  }

  function fileName(data) {
    const who = (data && data.name ? data.name : 'cat').replace(/[\\/:*?"<>|\s]/g, '');
    return 'catgacha-' + who + '.png';
  }

  const api = { W: W, H: H, CAUSE_JP: CAUSE_JP, cardData: cardData, draw: draw, render: render, fileName: fileName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CATCARD = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
