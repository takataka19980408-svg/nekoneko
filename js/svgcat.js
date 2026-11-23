/* ============================================================
   世界猫生ガチャ — 猫イラスト（動的SVG）
   引いた猫の種別・毛並み・柄・目の色・耳・体型をそのまま絵にする。
   ============================================================ */
(function (root) {
  'use strict';

  let UID = 0;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shade(hex, amt) {
    const h = String(hex || '#888888').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r + amt)));
    g = Math.max(0, Math.min(255, Math.round(g + amt)));
    b = Math.max(0, Math.min(255, Math.round(b + amt)));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /* ---------------- 場面（背景） ---------------- */
  const SCENES = {
    room_warm: () => `
      <rect width="320" height="360" fill="#F7E9D4"/>
      <rect y="276" width="320" height="84" fill="#E6CDAB"/>
      <rect y="272" width="320" height="6" fill="#D3B58C"/>
      <rect x="198" y="42" width="94" height="112" rx="8" fill="url(#__win)"/>
      <circle cx="262" cy="78" r="12" fill="#F6E7B8"/>
      <rect x="198" y="42" width="94" height="112" rx="8" fill="none" stroke="#C9A87F" stroke-width="5"/>
      <line x1="245" y1="42" x2="245" y2="154" stroke="#C9A87F" stroke-width="4"/>
      <rect x="28" y="232" width="58" height="44" rx="6" fill="#C98F63"/>
      <path d="M49 232 q8-32 30-42 q-4 24-13 42z" fill="#7FAE6B"/>
      <path d="M66 232 q-2-28-21-36 q4 22 11 36z" fill="#93BE7C"/>
      <rect x="24" y="226" width="66" height="12" rx="4" fill="#B87A50"/>`,
    room_modern: () => `
      <rect width="320" height="360" fill="#EEEFF3"/>
      <rect y="276" width="320" height="84" fill="#D5D7DF"/>
      <rect y="270" width="320" height="8" fill="#C3C5CE"/>
      <rect x="190" y="38" width="102" height="120" rx="6" fill="url(#__city)"/>
      <rect x="190" y="38" width="102" height="120" rx="6" fill="none" stroke="#A8AAB4" stroke-width="5"/>
      <line x1="241" y1="38" x2="241" y2="158" stroke="#A8AAB4" stroke-width="4"/>
      <rect x="22" y="198" width="50" height="74" rx="6" fill="#C7CBD3"/>
      <rect x="32" y="208" width="30" height="10" rx="3" fill="#9AA0AA"/>
      <rect x="32" y="224" width="30" height="10" rx="3" fill="#9AA0AA"/>
      <rect x="32" y="240" width="30" height="10" rx="3" fill="#9AA0AA"/>`,
    alley_jp: () => `
      <rect width="320" height="360" fill="#1E2739"/>
      <rect y="288" width="320" height="72" fill="#2A3448"/>
      <rect y="282" width="320" height="8" fill="#39445C"/>
      <rect x="0" y="56" width="84" height="230" fill="#2F3A4F"/>
      <rect x="236" y="56" width="84" height="230" fill="#2F3A4F"/>
      <rect x="10" y="94" width="40" height="56" rx="4" fill="#F5C86B" opacity=".2"/>
      <rect x="254" y="108" width="50" height="84" rx="4" fill="#7FD3E8" opacity=".16"/>
      <rect x="150" y="20" width="18" height="256" fill="#4A556E"/>
      <path d="M159 26 l-28 24 h56z" fill="#F6D98A" opacity=".5"/>
      <circle cx="159" cy="66" r="44" fill="#F6D98A" opacity=".1"/>`,
    alley_us: () => `
      <rect width="320" height="360" fill="#2A2430"/>
      <rect y="290" width="320" height="70" fill="#3A3140"/>
      <rect x="0" y="76" width="94" height="214" fill="#5B3B34"/>
      <rect x="226" y="76" width="94" height="214" fill="#5B3B34"/>
      <g stroke="#432C27" stroke-width="2" opacity=".6">
        <line x1="0" y1="108" x2="94" y2="108"/><line x1="0" y1="140" x2="94" y2="140"/>
        <line x1="0" y1="172" x2="94" y2="172"/><line x1="226" y1="108" x2="320" y2="108"/>
        <line x1="226" y1="140" x2="320" y2="140"/><line x1="226" y1="172" x2="320" y2="172"/>
      </g>
      <rect x="272" y="56" width="8" height="124" fill="#2A2430"/>
      <circle cx="276" cy="56" r="12" fill="#FFE9A8" opacity=".9"/>
      <circle cx="276" cy="56" r="40" fill="#FFE9A8" opacity=".12"/>`,
    street_asia: () => `
      <rect width="320" height="360" fill="#2B1F22"/>
      <rect y="290" width="320" height="70" fill="#3B2A2C"/>
      <rect x="0" y="66" width="90" height="224" fill="#40302F"/>
      <rect x="234" y="66" width="86" height="224" fill="#40302F"/>
      <circle cx="50" cy="102" r="16" fill="#E2543F" opacity=".8"/>
      <circle cx="86" cy="126" r="13" fill="#E2543F" opacity=".65"/>
      <circle cx="252" cy="106" r="16" fill="#E2543F" opacity=".75"/>
      <circle cx="288" cy="136" r="12" fill="#E2543F" opacity=".6"/>
      <rect x="0" y="66" width="320" height="8" fill="#2B1F22"/>`,
    street_eu: () => `
      <rect width="320" height="360" fill="#DAD3C5"/>
      <rect y="288" width="320" height="72" fill="#B9AE9A"/>
      <rect x="0" y="46" width="88" height="242" fill="#CBBFA8"/>
      <rect x="232" y="46" width="88" height="242" fill="#C6BAA3"/>
      <rect x="12" y="82" width="52" height="72" rx="3" fill="#7C8A94" opacity=".5"/>
      <rect x="12" y="172" width="52" height="72" rx="3" fill="#7C8A94" opacity=".4"/>
      <rect x="254" y="82" width="52" height="72" rx="3" fill="#7C8A94" opacity=".4"/>
      <rect x="254" y="172" width="52" height="58" rx="3" fill="#6E5A44"/>
      <path d="M118 58 h84 l-14 30 h-56z" fill="#B45B4A"/>`,
    street_ru: () => `
      <rect width="320" height="360" fill="#8E9AAE"/>
      <rect y="284" width="320" height="76" fill="#DCE4EE"/>
      <rect x="0" y="36" width="92" height="250" fill="#7F8CA0"/>
      <rect x="228" y="36" width="92" height="250" fill="#7A879B"/>
      <g fill="#5F6C80" opacity=".5">
        <rect x="12" y="78" width="34" height="44" rx="2"/><rect x="54" y="78" width="26" height="44" rx="2"/>
        <rect x="12" y="144" width="34" height="44" rx="2"/><rect x="54" y="144" width="26" height="44" rx="2"/>
        <rect x="246" y="78" width="34" height="44" rx="2"/><rect x="288" y="78" width="24" height="44" rx="2"/>
        <rect x="246" y="144" width="34" height="44" rx="2"/>
      </g>
      <path d="M0 284 q40-14 80 0 q40 14 80 0 q40-14 80 0 q40 14 80 0 v14 H0z" fill="#F2F6FB"/>
      <circle cx="160" cy="36" r="2.5" fill="#fff" opacity=".8"/><circle cx="78" cy="66" r="2" fill="#fff" opacity=".7"/>
      <circle cx="246" cy="52" r="2" fill="#fff" opacity=".7"/>`,
    street_in: () => `
      <rect width="320" height="360" fill="#E8C98F"/>
      <rect y="292" width="320" height="68" fill="#C9A46A"/>
      <rect x="0" y="56" width="78" height="236" fill="#D8AE72"/>
      <rect x="242" y="56" width="78" height="236" fill="#D8AE72"/>
      <path d="M14 118 q24-26 48 0 v74 H14z" fill="#8E6A44"/>
      <path d="M258 118 q24-26 48 0 v74 h-48z" fill="#8E6A44"/>
      <path d="M0 56 h320 v14 H0z" fill="#B98F55"/>`,
    street_br: () => `
      <rect width="320" height="360" fill="#F0C58F"/>
      <rect y="290" width="320" height="70" fill="#C98F63"/>
      <rect x="0" y="66" width="84" height="224" fill="#D8A06B"/>
      <rect x="236" y="66" width="84" height="224" fill="#D8A06B"/>
      <rect x="8" y="94" width="30" height="40" fill="#7E9AA6" opacity=".55"/>
      <rect x="46" y="94" width="30" height="40" fill="#7E9AA6" opacity=".45"/>
      <path d="M108 72 q52-26 104 0 v18 q-52 18-104 0z" fill="#C8683F"/>
      <circle cx="58" cy="56" r="26" fill="#F2D27A" opacity=".5"/>`,
    street_eg: () => `
      <rect width="320" height="360" fill="#E2BE86"/>
      <rect y="294" width="320" height="66" fill="#C29B63"/>
      <rect x="0" y="50" width="86" height="244" fill="#D3AB72"/>
      <rect x="234" y="50" width="86" height="244" fill="#D3AB72"/>
      <path d="M6 128 q40-40 80 0 v60 H6z" fill="#9C7448"/>
      <path d="M234 128 q40-40 80 0 v60 h-80z" fill="#9C7448"/>
      <path d="M0 50 h320 v12 H0z" fill="#A87C4B"/>`,
    street_cn: () => `
      <rect width="320" height="360" fill="#3B3336"/>
      <rect y="288" width="320" height="72" fill="#4A3F42"/>
      <rect x="0" y="54" width="92" height="234" fill="#5A4C4E"/>
      <rect x="228" y="54" width="92" height="234" fill="#5A4C4E"/>
      <rect x="12" y="90" width="30" height="42" fill="#F5D27B" opacity=".32"/>
      <rect x="50" y="90" width="30" height="42" fill="#F5D27B" opacity=".22"/>
      <rect x="244" y="90" width="30" height="42" fill="#F5D27B" opacity=".28"/>
      <rect x="282" y="90" width="26" height="42" fill="#F5D27B" opacity=".18"/>
      <path d="M0 54 h320 v10 H0z" fill="#2E2628"/>`,
    bazaar: () => `
      <rect width="320" height="360" fill="#C98A52"/>
      <rect y="294" width="320" height="66" fill="#A9703F"/>
      <path d="M0 56 h320 v10 H0z" fill="#8A5A34"/>
      <g opacity=".8">
        <path d="M6 66 h44 v54 q-22 12-44 0z" fill="#8E3F3F"/>
        <path d="M60 66 h40 v48 q-20 10-40 0z" fill="#3F6A6E"/>
        <path d="M110 66 h38 v52 q-19 10-38 0z" fill="#B4713C"/>
        <path d="M158 66 h40 v46 q-20 10-40 0z" fill="#6C4A72"/>
        <path d="M208 66 h40 v52 q-20 10-40 0z" fill="#8E3F3F"/>
        <path d="M256 66 h44 v50 q-22 10-44 0z" fill="#3F6A6E"/>
      </g>
      <rect x="0" y="66" width="320" height="8" fill="#7A4C28"/>`,
    temple: () => `
      <rect width="320" height="360" fill="#D9C39A"/>
      <rect y="292" width="320" height="68" fill="#B9A27C"/>
      <rect x="16" y="66" width="26" height="226" fill="#8E3B34"/>
      <rect x="278" y="66" width="26" height="226" fill="#8E3B34"/>
      <path d="M0 66 h320 l-40-26 H40z" fill="#6E2B26"/>
      <path d="M0 66 h320 v12 H0z" fill="#7C312C"/>
      <circle cx="92" cy="118" r="16" fill="#E8A05B" opacity=".8"/>
      <circle cx="228" cy="118" r="16" fill="#E8A05B" opacity=".8"/>
      <path d="M0 294 h320 v6 H0z" fill="#A08A66"/>`,
    island: () => `
      <rect width="320" height="360" fill="#8FC7DE"/>
      <rect y="240" width="320" height="120" fill="#4E9CC4"/>
      <rect y="240" width="320" height="10" fill="#7FC0DA"/>
      <path d="M0 252 q40 10 80 0 q40-10 80 0 q40 10 80 0 q40-10 80 0 v14 H0z" fill="#6FB6D2" opacity=".7"/>
      <rect x="0" y="118" width="320" height="122" fill="#F3F1E8"/>
      <path d="M0 118 h320 v12 H0z" fill="#E3E0D4"/>
      <rect x="216" y="150" width="44" height="70" rx="4" fill="#3E6E8E"/>
      <circle cx="238" cy="140" r="22" fill="#C25E5E" opacity=".7"/>
      <circle cx="258" cy="152" r="16" fill="#C25E5E" opacity=".55"/>`,
    coast: () => `
      <rect width="320" height="360" fill="#A9D6E8"/>
      <rect y="254" width="320" height="106" fill="#3E8FB5"/>
      <path d="M0 264 q40 8 80 0 q40-8 80 0 q40 8 80 0 q40-8 80 0 v12 H0z" fill="#5FA9C6" opacity=".8"/>
      <path d="M0 170 h320 v84 H0z" fill="#EFEDE3"/>
      <g fill="#F7F5EC">
        <rect x="8" y="142" width="52" height="30" rx="3"/><rect x="66" y="152" width="38" height="20" rx="3"/>
        <rect x="202" y="148" width="58" height="24" rx="3"/><rect x="266" y="158" width="42" height="14" rx="3"/>
      </g>
      <g fill="#E4E0D2"><rect x="8" y="170" width="52" height="6"/><rect x="66" y="170" width="38" height="6"/></g>
      <rect x="146" y="96" width="6" height="76" fill="#6E6A5E"/>
      <circle cx="149" cy="92" r="18" fill="#7FAE6B" opacity=".85"/>`,
    savanna: () => `
      <defs><linearGradient id="__sv" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F7B45B"/><stop offset=".55" stop-color="#EE8F4A"/><stop offset="1" stop-color="#D96B3C"/></linearGradient></defs>
      <rect width="320" height="360" fill="url(#__sv)"/>
      <circle cx="160" cy="146" r="44" fill="#FBE0A4" opacity=".75"/>
      <path d="M0 264 q60-16 120 0 q60 16 120 0 q40-10 80 0 v96 H0z" fill="#C99A57"/>
      <path d="M0 290 q60-10 120 0 q60 10 120 0 q40-6 80 0 v70 H0z" fill="#B9843F"/>
      <path d="M252 264 v-58 M252 228 q-22-14-40-10 M252 234 q22-18 38-12" stroke="#5B3A21" stroke-width="5" fill="none" stroke-linecap="round"/>
      <g stroke="#8C6435" stroke-width="2" opacity=".5"><path d="M20 306 q6-14 12 0"/><path d="M58 316 q6-14 12 0"/><path d="M252 310 q6-14 12 0"/></g>`,
    snow: () => `
      <defs><linearGradient id="__sn" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#C9DEED"/><stop offset="1" stop-color="#EAF2F8"/></linearGradient></defs>
      <rect width="320" height="360" fill="url(#__sn)"/>
      <path d="M0 200 l70-90 l52 66 l40-40 l58 64 l44-38 l56 60 H0z" fill="#B7CFE0"/>
      <path d="M0 226 l80-58 l60 58 l50-40 l60 40 H0z" fill="#DDEAF3"/>
      <rect y="252" width="320" height="108" fill="#F4F8FB"/>
      <g fill="#fff" opacity=".85"><circle cx="46" cy="66" r="2.4"/><circle cx="96" cy="116" r="2"/><circle cx="240" cy="76" r="2.6"/><circle cx="272" cy="146" r="1.8"/><circle cx="180" cy="46" r="2"/></g>`,
    jungle: () => `
      <defs><linearGradient id="__jg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2F5A3E"/><stop offset="1" stop-color="#1C3A28"/></linearGradient></defs>
      <rect width="320" height="360" fill="url(#__jg)"/>
      <g fill="#3E7350" opacity=".75">
        <path d="M0 0 q40 20 20 60 q-6 30 10 50 q-40 10-30-40z"/>
        <path d="M320 0 q-40 24-18 66 q8 28-8 48 q40 8 28-44z"/>
        <path d="M0 196 q50-30 50 20 q0 30-50 40z"/>
        <path d="M320 206 q-50-30-50 20 q0 30 50 40z"/>
      </g>
      <g stroke="#24452F" stroke-width="7" fill="none" opacity=".8"><path d="M40 0 v300"/><path d="M280 0 v300"/></g>
      <rect y="292" width="320" height="68" fill="#24452F"/>`,
    forest: () => `
      <defs><linearGradient id="__fr" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#5E7F63"/><stop offset="1" stop-color="#3C5644"/></linearGradient></defs>
      <rect width="320" height="360" fill="url(#__fr)"/>
      <g fill="#33503C"><path d="M40 240 l-34-110 l34-52 l34 52z"/><path d="M270 250 l-40-124 l40-46 l40 46z"/></g>
      <g fill="#2A4232"><rect x="34" y="230" width="12" height="60"/><rect x="264" y="240" width="12" height="56"/></g>
      <rect y="288" width="320" height="72" fill="#415A46"/>
      <g fill="#6F9163" opacity=".45"><circle cx="90" cy="272" r="16"/><circle cx="250" cy="268" r="14"/></g>`,
    desert: () => `
      <defs><linearGradient id="__ds" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F3D59C"/><stop offset="1" stop-color="#E0B77A"/></linearGradient></defs>
      <rect width="320" height="360" fill="url(#__ds)"/>
      <circle cx="232" cy="82" r="32" fill="#FBEFC9" opacity=".85"/>
      <path d="M0 238 q70-40 150 0 q50 26 90 6 q40-20 80 6 v110 H0z" fill="#D9AE72"/>
      <path d="M0 278 q70-26 160 4 q70 24 160-6 v84 H0z" fill="#C99A5E"/>
      <g stroke="#B08A55" stroke-width="2" opacity=".45"><path d="M30 322 q20-12 40 0"/><path d="M230 332 q20-10 40 0"/></g>`,
    mountain: () => `
      <rect width="320" height="360" fill="#BFCFD8"/>
      <path d="M0 232 l70-120 l60 110 l50-80 l60 90 l40-50 l40 50 H0z" fill="#8FA3AE"/>
      <path d="M60 202 l10-30 l12 30z M230 202 l10-22 l10 22z" fill="#EDF3F6" opacity=".75"/>
      <rect y="248" width="320" height="112" fill="#A8B7BE"/>
      <g fill="#C9D4D9"><circle cx="60" cy="202" r="12"/><circle cx="240" cy="192" r="14"/></g>`,
    outback: () => `
      <rect width="320" height="360" fill="#E9B98C"/>
      <circle cx="160" cy="76" r="32" fill="#F6D9A8"/>
      <rect y="242" width="320" height="118" fill="#B85C39"/>
      <path d="M0 262 q60 20 120 4 q60-16 120 2 q50 12 80 0 H0z" fill="#A94F30"/>
      <g stroke="#8A3F26" stroke-width="2" opacity=".45"><path d="M30 302 h40"/><path d="M210 318 h50"/></g>`,
    village: () => `
      <rect width="320" height="360" fill="#CFD8C8"/>
      <rect y="274" width="320" height="86" fill="#9AAE86"/>
      <path d="M14 274 v-70 h70 v70z" fill="#D8C9A8"/>
      <path d="M8 204 h82 l-41-30z" fill="#8E5B45"/>
      <rect x="40" y="230" width="20" height="24" fill="#6E7C8E"/>
      <path d="M236 274 v-58 h64 v58z" fill="#CDBD9C"/>
      <path d="M230 216 h76 l-38-26z" fill="#8E5B45"/>
      <g fill="#7E9A6A"><circle cx="130" cy="244" r="20"/><circle cx="196" cy="250" r="16"/></g>`,
    snow_town: () => `
      <rect width="320" height="360" fill="#C8D8E6"/>
      <rect y="278" width="320" height="82" fill="#EFF5FA"/>
      <rect x="0" y="86" width="80" height="192" fill="#9CAAB8"/>
      <rect x="240" y="86" width="80" height="192" fill="#98A6B4"/>
      <g fill="#F6D98A" opacity=".4"><rect x="14" y="118" width="26" height="26"/><rect x="48" y="118" width="18" height="26"/><rect x="254" y="118" width="26" height="26"/></g>
      <path d="M0 278 q40-12 80 0 q40 12 80 0 q40-12 80 0 q40 12 80 0 v10 H0z" fill="#fff"/>`,
    zoo: () => `
      <rect width="320" height="360" fill="#BFC9C3"/>
      <rect y="254" width="320" height="106" fill="#9FB08E"/>
      <g fill="#8A9A9F"><path d="M18 254 l24-56 l24 56z"/><path d="M242 254 l30-70 l30 70z"/></g>
      <g stroke="#7C8B90" stroke-width="5"><line x1="0" y1="28" x2="320" y2="28"/><line x1="0" y1="24" x2="0" y2="272"/><line x1="320" y1="24" x2="320" y2="272"/></g>
      <g stroke="#7C8B90" stroke-width="3" opacity=".6"><line x1="40" y1="8" x2="40" y2="272"/><line x1="120" y1="8" x2="120" y2="272"/><line x1="200" y1="8" x2="200" y2="272"/><line x1="280" y1="8" x2="280" y2="272"/></g>
      <rect x="228" y="58" width="70" height="34" rx="5" fill="#F4F1E6" stroke="#8A9A9F" stroke-width="3"/>
      <text x="263" y="81" font-size="16" text-anchor="middle" fill="#6E7C72" font-family="sans-serif" font-weight="700">ZOO</text>`
  };

  function sceneSVG(key, u) {
    const fn = SCENES[key] || SCENES.room_warm;
    return `<g clip-path="url(#${u}-frame)">${fn(u)}</g>`;
  }

  /* ---------------- 形 ---------------- */
  const BODY_PATH = 'M160 182 C128 182 110 208 106 246 C101 290 126 328 160 328 C194 328 219 290 214 246 C210 208 192 182 160 182 Z';

  /* 年齢ステージ：子猫は頭が大きく体がちいさい、シニアは少し小ぶりで落ち着いた姿 */
  const STAGE_SCALE = {
    kitten: { head: 1.26, body: 0.88 },
    adult: { head: 1.0, body: 1.0 },
    senior: { head: 0.97, body: 1.0 }
  };
  const STAGE_LABEL = { kitten: '子猫', adult: '成猫', senior: 'シニア猫' };

  function stageOf(age) {
    const a = Number(age) || 0;
    if (a < 1) return 'kitten';
    if (a < 10) return 'adult';
    return 'senior';
  }

  function geom(cat, stage) {
    const p = cat.pattern || {};
    const big = p.muzzle === 'wide';
    const earType = p.ears === 'fold' ? 'fold'
      : p.flat ? 'round'
        : p.bigEars ? 'big'
          : p.tall ? 'tall'
            : p.mane ? 'round'
              : 'normal';
    let ears = {
      normal: { l: [[112, 96], [138, 76], [98, 34]], r: [[208, 96], [182, 76], [222, 34]] },
      fold: { l: [[114, 96], [138, 80], [106, 58]], r: [[206, 96], [182, 80], [214, 58]] },
      big: { l: [[106, 92], [134, 68], [60, 12]], r: [[214, 92], [186, 68], [260, 12]] },
      tall: { l: [[110, 96], [138, 74], [88, 14]], r: [[210, 96], [182, 74], [232, 14]] },
      round: { l: [[118, 92], [140, 78], [112, 56]], r: [[202, 92], [180, 78], [208, 56]] }
    }[earType];
    if (stage === 'kitten') {
      // 子猫は耳を短め・丸めに（頭の中心に向かって縮める）
      const k = 0.8;
      ears = {
        l: ears.l.map(q => [160 + (q[0] - 160) * k, 132 + (q[1] - 132) * k]),
        r: ears.r.map(q => [160 + (q[0] - 160) * k, 132 + (q[1] - 132) * k])
      };
    }
    const sg = STAGE_SCALE[stage] || STAGE_SCALE.adult;
    return {
      big, earType, ears, stage,
      head: { x: 160, y: 132, r: big ? 60 : 58 },
      headScale: sg.head,
      bodyScale: sg.body,
      body: { x: 160, y: 254 },
      fill: p.fill || p.base || '#A87B4A'
    };
  }

  function pts(a) { return a.map(q => q.join(',')).join(' '); }
  function inset(tri, k) {
    const cx = tri.reduce((a, q) => a + q[0], 0) / 3;
    const cy = tri.reduce((a, q) => a + q[1], 0) / 3;
    return tri.map(q => [q[0] * k + cx * (1 - k), q[1] * k + cy * (1 - k)]);
  }

  /* ---------------- 柄 ---------------- */
  function patMackerel(c, rnd) {
    let s = '';
    for (let i = 0; i < 6; i++) {
      const x = 100 + i * 24;
      const wob = (rnd() - 0.5) * 8;
      s += `<path d="M${x} 196 q${5 + wob} 28 ${-3 + wob} 54 q${-5 + wob} 24 ${3 + wob} 56" stroke="${c.stripe}" stroke-width="${7 - (i % 2)}" fill="none" stroke-linecap="round" opacity=".8"/>`;
    }
    s += `<path d="M134 88 q6 16 2 26" stroke="${c.stripe}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>`;
    s += `<path d="M186 88 q-6 16 -2 26" stroke="${c.stripe}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".75"/>`;
    s += `<path d="M160 84 v14" stroke="${c.stripe}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>`;
    s += `<path d="M110 140 q-14 4 -18 14" stroke="${c.stripe}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>`;
    s += `<path d="M210 140 q14 4 18 14" stroke="${c.stripe}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/>`;
    s += `<ellipse cx="160" cy="304" rx="42" ry="26" fill="${c.belly}" opacity=".85"/>`;
    s += `<ellipse cx="160" cy="172" rx="22" ry="16" fill="${c.belly}" opacity=".45"/>`;
    return s;
  }

  function patTiger(c, rnd) {
    let s = '';
    for (let i = 0; i < 7; i++) {
      const x = 96 + i * 22;
      const wob = (rnd() - 0.5) * 6;
      s += `<path d="M${x} 188 q${7 + wob} 34 ${-4 + wob} 62 q${-7 + wob} 24 ${4 + wob} 58" stroke="${c.stripe}" stroke-width="8.5" fill="none" stroke-linecap="round" opacity=".92"/>`;
    }
    s += `<path d="M124 96 l8 22 M140 88 l4 24 M180 88 l-4 24 M196 96 l-8 22" stroke="${c.stripe}" stroke-width="5" stroke-linecap="round"/>`;
    s += `<ellipse cx="160" cy="306" rx="44" ry="28" fill="${c.belly}" opacity=".9"/>`;
    s += `<ellipse cx="160" cy="176" rx="30" ry="20" fill="${c.belly}" opacity=".35"/>`;
    s += `<path d="M124 150 q-10 12 -8 24" stroke="${c.belly}" stroke-width="11" fill="none" opacity=".45" stroke-linecap="round"/>`;
    s += `<path d="M196 150 q10 12 8 24" stroke="${c.belly}" stroke-width="11" fill="none" opacity=".45" stroke-linecap="round"/>`;
    return s;
  }

  function patSpotted(c, rnd) {
    let s = '';
    for (let i = 0; i < 24; i++) {
      const x = 96 + rnd() * 128, y = 196 + rnd() * 116;
      const r = 2.6 + rnd() * 3.2;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.8).toFixed(1)}" fill="${c.stripe}" opacity=".72"/>`;
    }
    for (let i = 0; i < 5; i++) {
      const x = 122 + rnd() * 76, y = 100 + rnd() * 26;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2.2 + rnd() * 1.6).toFixed(1)}" fill="${c.stripe}" opacity=".65"/>`;
    }
    s += `<ellipse cx="160" cy="308" rx="40" ry="26" fill="${c.belly}" opacity=".8"/>`;
    return s;
  }

  function patRosette(c, rnd, big) {
    let s = '';
    const n = big ? 22 : 20;
    for (let i = 0; i < n; i++) {
      const x = 100 + rnd() * 120, y = 198 + rnd() * 108;
      const rx = (big ? 6.5 : 5.5) + rnd() * 4;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * 0.8).toFixed(1)}" fill="${shade(c.base, -22)}" stroke="${c.stripe}" stroke-width="2.4" opacity=".95"/>`;
    }
    for (let i = 0; i < 4; i++) {
      const x = 124 + rnd() * 72, y = 102 + rnd() * 22;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4" ry="3.2" fill="none" stroke="${c.stripe}" stroke-width="1.6" opacity=".6"/>`;
    }
    s += `<ellipse cx="160" cy="308" rx="42" ry="26" fill="${c.belly}" opacity=".85"/>`;
    return s;
  }

  function patCheetah(c, rnd) {
    let s = '';
    for (let i = 0; i < 32; i++) {
      const x = 96 + rnd() * 128, y = 194 + rnd() * 118;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2 + rnd() * 1.8).toFixed(1)}" fill="${c.stripe}" opacity=".82"/>`;
    }
    s += `<ellipse cx="160" cy="308" rx="40" ry="26" fill="${c.belly}" opacity=".85"/>`;
    return s;
  }

  function patCalico(c, rnd) {
    let s = '';
    s += `<path d="M98 196 q34-24 44 8 q12 40-16 56 q-32 8-28-64z" fill="#E0913F" opacity=".9"/>`;
    s += `<path d="M196 202 q36 12 24 58 q-12 36-36 18 q-8-42 12-76z" fill="#2B2A2F" opacity=".9"/>`;
    s += `<path d="M134 86 q26-14 42 2 q-4 22-22 24 q-16-2-20-26z" fill="#2B2A2F" opacity=".88"/>`;
    s += `<path d="M120 132 q-20 10-20 30 q14-4 22-18z" fill="#E0913F" opacity=".8"/>`;
    s += `<ellipse cx="160" cy="310" rx="38" ry="24" fill="#FFFFFF" opacity=".92"/>`;
    return s;
  }

  function patTortie(c, rnd) {
    let s = '';
    for (let i = 0; i < 14; i++) {
      const x = 104 + rnd() * 112, y = 196 + rnd() * 112;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(7 + rnd() * 10).toFixed(1)}" ry="${(6 + rnd() * 8).toFixed(1)}" fill="${c.stripe}" opacity="${(0.5 + rnd() * 0.4).toFixed(2)}" transform="rotate(${(rnd() * 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    s += `<path d="M136 84 q24-12 40 4 q-8 20-22 20 q-14-2-18-24z" fill="${c.stripe}" opacity=".55"/>`;
    return s;
  }

  function patMask(c, rnd) {
    const ink = c.stripe || '#2B2A2F';
    let s = '';
    s += `<path d="M160 74 q-52 0-58 48 q18 24 38 28 q8-16 20-16 q12 0 20 16 q20-4 38-28 q-6-48-58-48z" fill="${ink}"/>`;
    s += `<path d="M160 120 q-12 16 0 24 q12-8 0-24z" fill="${ink}" opacity=".9"/>`;
    s += `<path d="M112 100 q-14 34 4 58 q10-24 4-58z" fill="${ink}" opacity=".85"/>`;
    s += `<path d="M208 100 q14 34-4 58 q-10-24-4-58z" fill="${ink}" opacity=".85"/>`;
    s += `<path d="M196 210 q42 14 32 64 q-24 18-50 4 q4-44 18-68z" fill="${ink}" opacity=".92"/>`;
    return s;
  }

  function patPointed(c, rnd) {
    let s = '';
    s += `<ellipse cx="160" cy="150" rx="34" ry="24" fill="${c.stripe}" opacity=".3"/>`;
    s += `<ellipse cx="160" cy="310" rx="38" ry="20" fill="${c.stripe}" opacity=".28"/>`;
    s += `<ellipse cx="130" cy="316" rx="16" ry="10" fill="${c.stripe}" opacity=".35"/>`;
    s += `<ellipse cx="190" cy="316" rx="16" ry="10" fill="${c.stripe}" opacity=".35"/>`;
    return s;
  }

  function patTicked(c, rnd) {
    let s = '';
    for (let i = 0; i < 70; i++) {
      const x = 96 + rnd() * 128, y = 192 + rnd() * 124;
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l1.6 5" stroke="${c.stripe}" stroke-width="1.5" opacity=".5"/>`;
    }
    s += `<ellipse cx="160" cy="308" rx="40" ry="24" fill="${c.belly}" opacity=".7"/>`;
    return s;
  }

  function patternLayer(c, rnd) {
    switch (c.pattern) {
      case 'mackerel': return patMackerel(c, rnd);
      case 'tiger': return patTiger(c, rnd);
      case 'spotted': return patSpotted(c, rnd);
      case 'rosette': return patRosette(c, rnd, false);
      case 'rosette_big': return patRosette(c, rnd, true);
      case 'cheetah': return patCheetah(c, rnd);
      case 'calico': return patCalico(c, rnd);
      case 'tortie': return patTortie(c, rnd);
      case 'mask': return patMask(c, rnd);
      case 'pointed': return patPointed(c, rnd);
      case 'ticked': return patTicked(c, rnd);
      default: return `<ellipse cx="160" cy="306" rx="40" ry="26" fill="${c.belly || shade(c.base, 20)}" opacity=".4"/>`;
    }
  }

  /* ---------------- 顔（ステージ別） ---------------- */
  function faceSVG(cat, g, eye1, eye2, outline, fill, stage, closed) {
    const H = g.head;
    const p = cat.pattern || {};
    const ey = H.y + 5;

    const brows = `
      <path d="M121 ${H.y - 5} q16 -10 32 -2" stroke="${outline}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".22"/>
      <path d="M167 ${H.y - 7} q16 -8 32 2" stroke="${outline}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".22"/>`;

    const whiskers = `
      <g stroke="${outline}" stroke-width="1.5" opacity=".42" stroke-linecap="round">
        <path d="M134 ${H.y + 24} L100 ${H.y + 18}"/>
        <path d="M134 ${H.y + 29} L102 ${H.y + 33}"/>
        <path d="M186 ${H.y + 24} L220 ${H.y + 18}"/>
        <path d="M186 ${H.y + 29} L218 ${H.y + 33}"/>
      </g>`;

    const muzzle = `
      <ellipse cx="149" cy="${H.y + 28}" rx="10.5" ry="8.5" fill="${shade(fill, 30)}" opacity=".95"/>
      <ellipse cx="171" cy="${H.y + 28}" rx="10.5" ry="8.5" fill="${shade(fill, 30)}" opacity=".95"/>
      <path d="M160 ${H.y + 21} l-6 5 q6 5 12 0z" fill="#D98A8A"/>
      <path d="M160 ${H.y + 27} v4 M160 ${H.y + 31} q-6 5 -10 0 M160 ${H.y + 31} q6 5 10 0" stroke="${outline}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".65"/>
      ${stage === 'senior' ? `<path d="M150 ${H.y + 36} q10 5 20 0" stroke="${outline}" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".4"/>` : ''}`;

    const tearMark = p.tearMark
      ? `<path d="M140 ${H.y + 12} q-3 14 -5 20" stroke="${shade(cat.pattern.stripe || '#555', 20)}" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".9"/><path d="M180 ${H.y + 12} q3 14 5 20" stroke="${shade(cat.pattern.stripe || '#555', 20)}" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".9"/>`
      : '';

    if (closed) {
      return `
        <path d="M123 ${ey} q14 12 28 0" stroke="${outline}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M169 ${ey} q14 12 28 0" stroke="${outline}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".85"/>
        <path d="M151 ${ey + 24} q9 7 18 0" stroke="${outline}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".5"/>
        ${muzzle}
        ${whiskers}
        ${tearMark}`;
    }

    if (stage === 'kitten') {
      return `
        <ellipse cx="137" cy="${ey}" rx="16.5" ry="15.5" fill="#FFFDF8"/>
        <ellipse cx="183" cy="${ey}" rx="16.5" ry="15.5" fill="#FFFDF8"/>
        <circle cx="137" cy="${ey}" r="12.6" fill="${eye1}"/>
        <circle cx="183" cy="${ey}" r="12.6" fill="${eye2}"/>
        <circle cx="137" cy="${ey + 1}" r="6.6" fill="#171512"/>
        <circle cx="183" cy="${ey + 1}" r="6.6" fill="#171512"/>
        <circle cx="132.5" cy="${ey - 4.5}" r="4.4" fill="#FFFFFF" opacity=".95"/>
        <circle cx="178.5" cy="${ey - 4.5}" r="4.4" fill="#FFFFFF" opacity=".95"/>
        <circle cx="141.5" cy="${ey + 5.5}" r="1.9" fill="#FFFFFF" opacity=".85"/>
        <circle cx="187.5" cy="${ey + 5.5}" r="1.9" fill="#FFFFFF" opacity=".85"/>
        ${brows}
        <ellipse cx="117" cy="${H.y + 22}" rx="9.5" ry="5.2" fill="#F7A3AD" opacity=".5"/>
        <ellipse cx="203" cy="${H.y + 22}" rx="9.5" ry="5.2" fill="#F7A3AD" opacity=".5"/>
        ${muzzle}
        ${whiskers}
        ${tearMark}`;
    }

    if (stage === 'senior') {
      return `
        <ellipse cx="137" cy="${ey + 1}" rx="13" ry="11" fill="#FFFDF8"/>
        <ellipse cx="183" cy="${ey + 1}" rx="13" ry="11" fill="#FFFDF8"/>
        <ellipse cx="137" cy="${ey + 1}" rx="10" ry="9" fill="${eye1}"/>
        <ellipse cx="183" cy="${ey + 1}" rx="10" ry="9" fill="${eye2}"/>
        <ellipse cx="137" cy="${ey + 1}" rx="2.2" ry="6.4" fill="#171512"/>
        <ellipse cx="183" cy="${ey + 1}" rx="2.2" ry="6.4" fill="#171512"/>
        <circle cx="133" cy="${ey - 3}" r="2.6" fill="#FFFFFF" opacity=".8"/>
        <circle cx="179" cy="${ey - 3}" r="2.6" fill="#FFFFFF" opacity=".8"/>
        <path d="M123 ${ey - 2} q14 -8 28 0" stroke="${outline}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".45"/>
        <path d="M169 ${ey - 2} q14 -8 28 0" stroke="${outline}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".45"/>
        ${brows}
        <g fill="#FFFFFF" opacity=".32">
          <circle cx="128" cy="${H.y + 27}" r="1.3"/><circle cx="133" cy="${H.y + 33}" r="1.1"/>
          <circle cx="187" cy="${H.y + 27}" r="1.3"/><circle cx="192" cy="${H.y + 33}" r="1.1"/>
          <circle cx="160" cy="${H.y - 20}" r="1.4"/>
        </g>
        ${muzzle}
        ${whiskers}
        ${tearMark}`;
    }

    return `
      <ellipse cx="137" cy="${ey}" rx="14.5" ry="13" fill="#FFFDF8"/>
      <ellipse cx="183" cy="${ey}" rx="14.5" ry="13" fill="#FFFDF8"/>
      <circle cx="137" cy="${ey + 1}" r="${g.big ? 10 : 11.2}" fill="${eye1}"/>
      <circle cx="183" cy="${ey + 1}" r="${g.big ? 10 : 11.2}" fill="${eye2}"/>
      ${g.big
        ? `<circle cx="137" cy="${ey + 1}" r="4.4" fill="#171512"/><circle cx="183" cy="${ey + 1}" r="4.4" fill="#171512"/>`
        : `<ellipse cx="137" cy="${ey + 1}" rx="2.5" ry="8.2" fill="#171512"/><ellipse cx="183" cy="${ey + 1}" rx="2.5" ry="8.2" fill="#171512"/>`}
      <circle cx="133" cy="${ey - 5}" r="3" fill="#FFFFFF" opacity=".92"/>
      <circle cx="179" cy="${ey - 5}" r="3" fill="#FFFFFF" opacity=".92"/>
      ${brows}
      ${muzzle}
      ${whiskers}
      ${tearMark}`;
  }

  /* ---------------- 本体 ---------------- */
  function render(cat, opts) {
    opts = opts || {};
    const stage = opts.stage || stageOf(cat.ageYears);
    const closed = opts.eyes === 'closed';
    const u = 'cg' + (++UID);
    const p = cat.pattern || {};
    const g = geom(cat, stage);
    const rndSeed = ((cat.seed || 1) ^ 0x9e3779b9) >>> 0;
    const base = p.base || '#A87B4A';
    const stripe = p.stripe || shade(base, -60);
    const belly = p.belly || shade(base, 40);
    const fill = g.fill;
    const c = { base, stripe, belly, pattern: p.pattern, fill };
    const eye1 = cat.eyeColor || '#D9A73C';
    const eye2 = cat.eyeColor2 || eye1;
    const scene = cat.scene || (cat.route === 'zoo' ? 'zoo' : cat.klass === 'wild' ? (cat.species && cat.species.scene) || 'forest' : (cat.region && cat.region.outScene) || 'alley_jp');
    const outline = shade(fill, -62);
    const thick = p.thicktail ? 1.7 : 1;
    const bob = p.bobtail || cat.bobtail;
    const pattern = patternLayer(c, mulberry32(rndSeed));
    const H = g.head;
    const hs = g.headScale;
    const bs = g.bodyScale;
    const headT = `translate(${H.x} ${H.y}) scale(${hs}) translate(${-H.x} ${-H.y})`;
    const bodyT = `translate(160 336) scale(${bs}) translate(-160 -336)`;

    const tailColor = p.pattern === 'pointed' ? stripe : base;
    const tailPath = bob
      ? `<path d="M212 296 q22 2 20 18" stroke="${tailColor}" stroke-width="${22 * thick}" fill="none" stroke-linecap="round"/>`
      : `<path d="M204 300 q50 4 56 -42 q3 -26 -14 -38" stroke="${tailColor}" stroke-width="${19 * thick}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
         <path d="M204 300 q50 4 56 -42 q3 -26 -14 -38" stroke="${outline}" stroke-width="${19 * thick}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity=".1"/>`;

    const mane = p.mane ? (() => {
      let m = `<circle cx="160" cy="132" r="92" fill="${shade(base, -30)}"/>`;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        m += `<circle cx="${(160 + Math.cos(a) * 88).toFixed(1)}" cy="${(132 + Math.sin(a) * 88).toFixed(1)}" r="19" fill="${shade(base, -30)}"/>`;
      }
      m += `<circle cx="160" cy="132" r="84" fill="${shade(base, -10)}"/>`;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + 0.2;
        m += `<circle cx="${(160 + Math.cos(a) * 78).toFixed(1)}" cy="${(132 + Math.sin(a) * 78).toFixed(1)}" r="15" fill="${shade(base, 4)}" opacity=".6"/>`;
      }
      return `<g>${m}</g>`;
    })() : '';

    const ruff = (p.longhair || p.fluffy) ? `
      <path d="M132 184 q-14 34 -2 66 q16 16 30 2 q16 14 30-2 q12-32-2-66 q-28 16-56 0z" fill="${shade(fill, 18)}"/>
      <path d="M132 184 q28 16 56 0" stroke="${outline}" stroke-width="2" fill="none" opacity=".28"/>` : '';

    const cheekRuff = (p.ruff || 0) > 0 ? `
      <path d="M108 142 q-20 18-6 40 q14 4 20-8z" fill="${shade(fill, 12)}" opacity="${Math.min(1, p.ruff)}"/>
      <path d="M212 142 q20 18 6 40 q-14 4-20-8z" fill="${shade(fill, 12)}" opacity="${Math.min(1, p.ruff)}"/>` : '';

    const tufts = (p.earTufts || 0) > 0 ? `
      <path d="M98 34 l-13 -15 l15 3z" fill="${shade(stripe, 6)}"/>
      <path d="M222 34 l13 -15 l-15 3z" fill="${shade(stripe, 6)}"/>` : '';

    const earFill = (p.pattern === 'pointed' || p.pattern === 'mask') ? stripe : fill;
    const earPink = stage === 'kitten' ? '#F5AEB6' : '#E8A0A6';

    const cowlick = stage === 'kitten' ? `
      <g stroke="${outline}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".3">
        <path d="M154 76 q6 -10 14 -6"/><path d="M160 74 q2 -10 10 -10"/>
      </g>` : '';

    const legs = `
      <path d="M128 262 q0 -8 8 -8 h20 q8 0 8 8 v46 q0 12 -12 12 h-12 q-12 0 -12 -12z" fill="url(#${u}-leg)"/>
      <path d="M164 262 q0 -8 8 -8 h20 q8 0 8 8 v46 q0 12 -12 12 h-12 q-12 0 -12 -12z" fill="url(#${u}-leg)"/>
      <ellipse cx="140" cy="318" rx="15" ry="9" fill="${shade(fill, 12)}" opacity=".5"/>
      <ellipse cx="180" cy="318" rx="15" ry="9" fill="${shade(fill, 12)}" opacity=".5"/>
      <path d="M160 268 v48" stroke="${outline}" stroke-width="1.6" opacity=".16" stroke-linecap="round"/>
      <g stroke="${outline}" stroke-width="1.4" opacity=".22" stroke-linecap="round">
        <path d="M133 314 v6"/><path d="M140 314 v6"/><path d="M147 314 v6"/>
        <path d="M173 314 v6"/><path d="M180 314 v6"/><path d="M187 314 v6"/>
      </g>`;

    const decor = `
      <g fill="#FFF6EC" opacity=".62">
        <g transform="translate(274 302) rotate(-12)">
          <ellipse cx="0" cy="4" rx="9" ry="7.5"/>
          <circle cx="-10" cy="-7" r="3.8"/><circle cx="-3.4" cy="-11.5" r="3.8"/>
          <circle cx="3.4" cy="-11.5" r="3.8"/><circle cx="10" cy="-7" r="3.8"/>
        </g>
        <g transform="translate(40 62) rotate(16) scale(.66)">
          <ellipse cx="0" cy="4" rx="9" ry="7.5"/>
          <circle cx="-10" cy="-7" r="3.8"/><circle cx="-3.4" cy="-11.5" r="3.8"/>
          <circle cx="3.4" cy="-11.5" r="3.8"/><circle cx="10" cy="-7" r="3.8"/>
        </g>
      </g>
      <g fill="#FFF6EC" opacity=".8">
        <path d="M262 58 l3 8 l8 3 l-8 3 l-3 8 l-3-8 l-8-3 l8-3z"/>
        <path d="M60 246 l2 6 l6 2 l-6 2 l-2 6 l-2-6 l-6-2 l6-2z"/>
        <circle cx="96" cy="34" r="2.4"/><circle cx="286" cy="170" r="2"/>
      </g>`;

    const svg = `
<svg viewBox="0 0 320 360" xmlns="http://www.w3.org/2000/svg" class="cat-svg" role="img" aria-label="${escapeAttr(cat.speciesName || '猫')}のイラスト">
  <defs>
    <clipPath id="${u}-frame"><rect width="320" height="360" rx="26"/></clipPath>
    <clipPath id="${u}-body"><path d="${BODY_PATH}"/></clipPath>
    <clipPath id="${u}-head">
      <circle cx="${H.x}" cy="${H.y}" r="${H.r}"/>
      <polygon points="${pts(g.ears.l)}"/>
      <polygon points="${pts(g.ears.r)}"/>
    </clipPath>
    <linearGradient id="__win" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#20304D"/><stop offset="1" stop-color="#3D5A7A"/>
    </linearGradient>
    <linearGradient id="__city" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#A8C2D8"/><stop offset="1" stop-color="#E6EEF4"/>
    </linearGradient>
    <linearGradient id="${u}-leg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(fill, 14)}"/><stop offset="1" stop-color="${shade(fill, -14)}"/>
    </linearGradient>
    <radialGradient id="${u}-glow" cx=".5" cy=".42" r=".55">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".5"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${sceneSVG(scene, u)}
  <g clip-path="url(#${u}-frame)">
    <rect width="320" height="360" fill="#FFF1E4" opacity="${stage === 'kitten' ? 0.3 : 0.2}"/>
  </g>
  <ellipse cx="160" cy="333" rx="${(86 * bs).toFixed(1)}" ry="${(13 * bs).toFixed(1)}" fill="#000" opacity=".13"/>
  <ellipse cx="160" cy="150" rx="126" ry="126" fill="url(#${u}-glow)" opacity=".45"/>
  <g transform="${bodyT}">
    ${tailPath}
    <g clip-path="url(#${u}-body)">
      <rect width="320" height="360" fill="${fill}"/>
      ${pattern}
      <ellipse cx="160" cy="200" rx="58" ry="34" fill="#FFFFFF" opacity=".1"/>
      <ellipse cx="160" cy="300" rx="70" ry="46" fill="#000" opacity=".07"/>
    </g>
    <path d="${BODY_PATH}" fill="none" stroke="${outline}" stroke-width="2.2" opacity=".3"/>
    ${legs}
    ${ruff}
  </g>
  <g transform="${headT}">
    ${mane}
    <polygon points="${pts(g.ears.l)}" fill="${earFill}"/>
    <polygon points="${pts(g.ears.r)}" fill="${earFill}"/>
    <path d="M${g.ears.l[0][0]} ${g.ears.l[0][1]} L${g.ears.l[1][0]} ${g.ears.l[1][1]} L${g.ears.r[1][0]} ${g.ears.r[1][1]} L${g.ears.r[0][0]} ${g.ears.r[0][1]} Z" fill="${fill}"/>
    <g clip-path="url(#${u}-head)">
      <rect width="320" height="360" fill="${fill}"/>
      ${pattern}
      <ellipse cx="160" cy="${H.y - 26}" rx="52" ry="28" fill="#FFFFFF" opacity=".08"/>
    </g>
    <polygon points="${pts(g.ears.l)}" fill="none" stroke="${outline}" stroke-width="2.2" opacity=".3"/>
    <polygon points="${pts(g.ears.r)}" fill="none" stroke="${outline}" stroke-width="2.2" opacity=".3"/>
    <polygon points="${pts(inset(g.ears.l, 0.58))}" fill="${earPink}" opacity=".85"/>
    <polygon points="${pts(inset(g.ears.r, 0.58))}" fill="${earPink}" opacity=".85"/>
    ${cheekRuff}
    ${tufts}
    ${cowlick}
    <circle cx="${H.x}" cy="${H.y}" r="${H.r}" fill="none" stroke="${outline}" stroke-width="2.2" opacity=".3"/>
    ${faceSVG(cat, g, eye1, eye2, outline, fill, stage, closed)}
    ${p.hairless ? `<g stroke="${shade(fill, 14)}" stroke-width="1.3" opacity=".45"><path d="M134 118 q10-8 18-3"/><path d="M168 115 q10-6 18 3"/><path d="M124 240 q8 10 0 20"/></g>` : ''}
  </g>
  <rect x="7" y="7" width="306" height="346" rx="22" fill="none" stroke="#FFF6EC" stroke-width="2.5" stroke-dasharray="7 10" opacity=".5"/>
  ${decor}
</svg>`;
    return svg.replace(/\n\s+/g, '\n');
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  const api = { render, sceneSVG, stageOf, STAGE_LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.CATGACHA_SVG = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
