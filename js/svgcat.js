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
      <path d="M26 98 l54 0 l-9 24 l-37 0 z" fill="#B45B4A"/>`,
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

  /* ============================================================
     手描きゆるかわイラスト（ねこあつめ／絵本／LINEスタンプ風）
     ・白目は描かない：大きな黒目＋瞳色＋白ハイライト2粒
     ・輪郭は温かいこげ茶の手描き線（#4a3525 / 3px / round）
     ・もちもち2〜2.5頭身、ωの口、ちょこんとした前足、くるん尻尾
     ============================================================ */
  const OUTLINE = '#4a3525';

  /* お座りした体（頭は別パスで上に重ねる）。もちっと丸い胴 */
  const BODY_PATH = 'M160 196 C204 196 228 236 228 280 C228 308 200 330 160 330 C120 330 92 308 92 280 C92 236 116 196 160 196 Z';

  /* ちょこんと揃えた前足（左右） */
  const LEG_L = 'M137 278 C128 278 122 286 122 297 L122 313 C122 323 129 329 137 329 C146 329 152 323 152 313 L152 297 C152 286 147 278 137 278 Z';
  const LEG_R = 'M183 278 C192 278 198 286 198 297 L198 313 C198 323 191 329 183 329 C174 329 168 323 168 313 L168 297 C168 286 173 278 183 278 Z';

  const STAGE_LABEL = { kitten: '子猫', adult: '成猫', senior: 'シニア猫' };

  function stageOf(age) {
    const a = Number(age) || 0;
    if (a < 1) return 'kitten';
    if (a < 10) return 'adult';
    return 'senior';
  }

  /* ---- 耳（左耳：外側の付け根[94,106] → 先端 → 内側の付け根[138,92]） ---- */
  const EAR_OB = [100, 104];
  const EAR_IB = [132, 92];
  const EAR_SPECS = {
    normal: [[[88, 90], [92, 60], [104, 42]], [[110, 62], [122, 78], [132, 92]]],
    round: [[[90, 94], [94, 70], [110, 58]], [[118, 64], [126, 80], [132, 92]]],
    big: [[[86, 88], [76, 44], [64, 18]], [[84, 50], [112, 80], [132, 92]]],
    tall: [[[88, 84], [98, 44], [116, 16]], [[120, 46], [128, 74], [132, 92]]],
    fold: [[[92, 94], [93, 80], [104, 74]], [[116, 66], [127, 74], [130, 83]], [[131, 88], [131, 90], [132, 92]]]
  };

  function mir(q) { return [320 - q[0], q[1]]; }
  function segsD(segs) {
    return segs.map(s => 'C' + s.map(q => q[0] + ' ' + q[1]).join(' ')).join(' ');
  }
  /* ベジェ列を逆方向にたどり直す（始点 startPt） */
  function revSegs(segs, startPt) {
    const out = [];
    for (let i = segs.length - 1; i >= 0; i--) {
      const c = segs[i];
      const back = i > 0 ? segs[i - 1][2] : startPt;
      out.push([c[1], c[0], back]);
    }
    return out;
  }
  /* 右耳用：逆方向＋左右反転 */
  function revMir(segs) {
    return revSegs(segs, EAR_OB).map(s => s.map(mir));
  }
  function scalePt(q, ctr, k) {
    return [ctr[0] + (q[0] - ctr[0]) * k, ctr[1] + (q[1] - ctr[1]) * k];
  }

  /* 輪郭（耳までつながった1本の線） */
  function headPathD(segs) {
    return 'M160 206'
      + ' C124 206 94 190 89 156'
      + ' C85 130 92 112 100 104'
      + ' ' + segsD(segs)
      + ' C148 76 172 76 188 92'
      + ' ' + segsD(revMir(segs))
      + ' C228 118 235 132 231 156'
      + ' C226 190 196 206 160 206 Z';
  }

  /* 耳の内側（耳の形を少し内側に縮めた相似形） */
  function innerEarD(segs, mirror) {
    const ctr = [110, 84], k = 0.58;
    const sc = segs.map(s => s.map(q => scalePt(q, ctr, k)));
    const ob = scalePt(EAR_OB, ctr, k);
    const ib = scalePt(EAR_IB, ctr, k);
    if (mirror) {
      const parts = revSegs(sc, ob).map(s => s.map(mir));
      const start = mir(ib);
      return 'M' + start[0].toFixed(1) + ' ' + start[1].toFixed(1) + ' ' + segsD(parts) + ' Z';
    }
    return 'M' + ob[0].toFixed(1) + ' ' + ob[1].toFixed(1) + ' ' + segsD(sc) + ' Z';
  }

  /* 耳1つぶんの形（内側の色を耳の中だけに閉じ込めるのに使う） */
  function earShapeD(segs, mirror) {
    if (mirror) {
      const parts = revSegs(segs, EAR_OB).map(s => s.map(mir));
      const start = mir(EAR_IB);
      return 'M' + start[0] + ' ' + start[1] + ' ' + segsD(parts) + ' Z';
    }
    return 'M' + EAR_OB[0] + ' ' + EAR_OB[1] + ' ' + segsD(segs) + ' Z';
  }

  function geom(cat, stage) {
    const p = cat.pattern || {};
    const earType = p.ears === 'fold' ? 'fold'
      : p.flat ? 'round'
        : p.bigEars ? 'big'
          : p.tall ? 'tall'
            : p.mane ? 'round'
              : 'normal';
    const segs = EAR_SPECS[earType] || EAR_SPECS.normal;
    return {
      earType, segs, stage,
      headPath: headPathD(segs),
      big: p.muzzle === 'wide',
      headScale: stage === 'kitten' ? 1.13 : stage === 'senior' ? 0.99 : 1,
      bodyScale: stage === 'kitten' ? 0.94 : (cat.klass === 'wild' && cat.speciesGroup === 'big' ? 1.06 : 1)
    };
  }

  /* ---------------- 色の道具 ---------------- */
  function lum(hex) {
    const h = String(hex || '#888888').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    if (!isFinite(n)) return 0.5;
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }
  function isDark(hex) { return lum(hex) < 0.42; }
  function mix(hex, to, t) {
    const a = String(hex || '#888888').replace('#', '');
    const b = String(to || '#ffffff').replace('#', '');
    const na = parseInt(a.length === 3 ? a.split('').map(c => c + c).join('') : a, 16);
    const nb = parseInt(b.length === 3 ? b.split('').map(c => c + c).join('') : b, 16);
    const r = Math.round(((na >> 16) & 255) * (1 - t) + ((nb >> 16) & 255) * t);
    const g2 = Math.round(((na >> 8) & 255) * (1 - t) + ((nb >> 8) & 255) * t);
    const b2 = Math.round((na & 255) * (1 - t) + (nb & 255) * t);
    return '#' + ((r << 16) | (g2 << 8) | b2).toString(16).padStart(6, '0');
  }

  /* ふわっとした花びら形（タテガミ・胸毛・頬毛に使う） */
  function scallop(cx, cy, r, lobes, depth) {
    let d = '';
    for (let i = 0; i < lobes; i++) {
      const a0 = (i / lobes) * Math.PI * 2;
      const a1 = ((i + 1) / lobes) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const p0 = [cx + Math.cos(a0) * r, cy + Math.sin(a0) * r];
      const p1 = [cx + Math.cos(a1) * r, cy + Math.sin(a1) * r];
      const cp = [cx + Math.cos(am) * (r + depth) * 1.02, cy + Math.sin(am) * (r + depth) * 1.02];
      if (i === 0) d += 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1);
      d += ' Q' + cp[0].toFixed(1) + ' ' + cp[1].toFixed(1) + ' ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1);
    }
    return d + ' Z';
  }

  /* 有機的な毛のまだら（三毛・サビの斑に使う） */
  function blob(cx, cy, rx, ry, rnd, n) {
    n = n || 7;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 0.74 + rnd() * 0.42;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    let d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (let i = 1; i <= n; i++) {
      const p0 = pts[i % n], p1 = pts[(i + 1) % n];
      d += ' Q' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1)
        + ' ' + ((p0[0] + p1[0]) / 2).toFixed(1) + ' ' + ((p0[1] + p1[1]) / 2).toFixed(1);
    }
    return d + ' Z';
  }

  /* ---------------- 柄 ---------------- */
  function bellyPatch(c, cy, rx, ry, op) {
    return `<ellipse cx="160" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c.belly}" opacity="${op}"/>`;
  }

  /* --- 体の柄 --- */
  function bodyMackerel(c, rnd) {
    let s = '';
    [110, 132, 154, 176, 198].forEach((x, i) => {
      const w = 8 - (i % 2) * 1.2;
      const d = `M${x} 186 q${(rnd() * 10 - 3).toFixed(1)} 32 ${(rnd() * 10 - 7).toFixed(1)} 58 q${(rnd() * 10 - 7).toFixed(1)} 28 ${(rnd() * 10 - 3).toFixed(1)} 70`;
      s += `<path d="${d}" stroke="${c.stripe}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity=".78"/>`;
    });
    s += bellyPatch(c, 310, 40, 26, 0.62);
    return s;
  }

  function bodyTiger(c, rnd) {
    let s = '';
    [106, 128, 150, 172, 194, 212].forEach((x, i) => {
      const w = 9.5 - (i % 2) * 1.4;
      const d = `M${x} 184 q${(rnd() * 8 - 2).toFixed(1)} 34 ${(rnd() * 8 - 6).toFixed(1)} 60 q${(rnd() * 8 - 6).toFixed(1)} 28 ${(rnd() * 8 - 2).toFixed(1)} 68`;
      s += `<path d="${d}" stroke="${c.stripe}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity=".86"/>`;
    });
    s += bellyPatch(c, 312, 42, 24, 0.6);
    return s;
  }

  function bodySpots(c, rnd, n, rmin, rmax, op) {
    let s = bellyPatch(c, 308, 36, 24, 0.4);
    for (let i = 0; i < n; i++) {
      const x = 106 + rnd() * 108, y = 202 + rnd() * 120;
      const r = rmin + rnd() * (rmax - rmin);
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.84).toFixed(1)}" fill="${c.stripe}" opacity="${op}"/>`;
    }
    return s;
  }

  function bodyRosette(c, rnd, big) {
    let s = bellyPatch(c, 308, 36, 24, 0.36);
    const n = big ? 13 : 15;
    for (let i = 0; i < n; i++) {
      const x = 108 + rnd() * 104, y = 202 + rnd() * 116;
      const rx = (big ? 7.2 : 5.6) + rnd() * 3.4;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * 0.84).toFixed(1)}" fill="${mix(c.fill, '#2b2118', 0.3)}" stroke="${c.stripe}" stroke-width="2.6" opacity=".92"/>`;
    }
    return s;
  }

  function bodyCalico(c, rnd) {
    const o = '#E0913F', k = '#2B2A2F';
    return `<path d="${blob(116, 244, 30, 46, rnd)}" fill="${o}" opacity=".88"/>`
      + `<path d="${blob(210, 262, 28, 44, rnd)}" fill="${k}" opacity=".88"/>`
      + `<path d="${blob(158, 322, 26, 16, rnd)}" fill="${k}" opacity=".8"/>`;
  }

  function bodyTortie(c, rnd) {
    let s = '';
    for (let i = 0; i < 11; i++) {
      const x = 108 + rnd() * 104, y = 202 + rnd() * 114;
      s += `<path d="${blob(x, y, 12 + rnd() * 14, 10 + rnd() * 12, rnd)}" fill="${c.stripe}" opacity="${(0.55 + rnd() * 0.35).toFixed(2)}"/>`;
    }
    return s;
  }

  function bodyMask(c, rnd) {
    const ink = c.stripe;
    return `<path d="${blob(206, 258, 30, 44, rnd)}" fill="${ink}" opacity=".92"/>`
      + `<path d="${blob(120, 312, 26, 18, rnd)}" fill="${ink}" opacity=".85"/>`;
  }

  function bodyTicked(c, rnd) {
    let s = bellyPatch(c, 306, 34, 22, 0.28);
    for (let i = 0; i < 64; i++) {
      const x = 104 + rnd() * 112, y = 198 + rnd() * 126;
      s += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l1.4 5" stroke="${c.stripe}" stroke-width="1.6" opacity=".45" stroke-linecap="round"/>`;
    }
    return s;
  }

  /* --- 頭の柄 --- */
  function headMackerel(c) {
    return `
      <path d="M134 96 q-3 15 -9 26" stroke="${c.stripe}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>
      <path d="M186 96 q3 15 9 26" stroke="${c.stripe}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".8"/>
      <path d="M160 88 q-3 13 -1 24" stroke="${c.stripe}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>
      <path d="M110 160 q-6 10 -7 20" stroke="${c.stripe}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5"/>
      <path d="M210 160 q6 10 7 20" stroke="${c.stripe}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".5"/>`;
  }

  function headTiger(c) {
    return `
      <g stroke="${c.stripe}" stroke-linecap="round" opacity=".9">
        <path d="M140 90 q-2 14 -6 24" stroke-width="7" fill="none"/>
        <path d="M152 86 q-1 16 -2 28" stroke-width="7" fill="none"/>
        <path d="M168 86 q1 16 2 28" stroke-width="7" fill="none"/>
        <path d="M180 90 q2 14 6 24" stroke-width="7" fill="none"/>
        <path d="M104 162 q-5 9 -6 17" stroke-width="5.5" fill="none"/>
        <path d="M216 162 q5 9 6 17" stroke-width="5.5" fill="none"/>
      </g>`;
  }

  function headSpots(c, rnd, n, rmin, rmax) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = 132 + rnd() * 56, y = 86 + rnd() * 24;
      const r = rmin + rnd() * (rmax - rmin);
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.84).toFixed(1)}" fill="${c.stripe}" opacity=".7"/>`;
    }
    return s;
  }

  function headRosette(c, rnd) {
    let s = '';
    for (let i = 0; i < 2; i++) {
      const x = 144 + rnd() * 32, y = 86 + rnd() * 10;
      const rx = 3.4 + rnd() * 1.6;
      s += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${(rx * 0.82).toFixed(1)}" fill="${mix(c.fill, '#2b2118', 0.28)}" stroke="${c.stripe}" stroke-width="1.6" opacity=".75"/>`;
    }
    return s;
  }

  function headCalico(c, rnd) {
    return `<path d="${blob(126, 104, 26, 20, rnd)}" fill="#E0913F" opacity=".9"/>`
      + `<path d="${blob(194, 100, 26, 22, rnd)}" fill="#2B2A2F" opacity=".9"/>`;
  }

  function headTortie(c, rnd) {
    return `<path d="${blob(140, 104, 34, 26, rnd)}" fill="${c.stripe}" opacity=".55"/>`;
  }

  function headMask(c) {
    const ink = c.stripe;
    return `<path d="M78 128 C78 58 118 32 160 32 C202 32 242 58 242 128 C226 114 210 110 196 116 C180 122 170 138 160 158 C150 138 140 122 124 116 C110 110 94 114 78 128 Z" fill="${ink}" opacity=".96"/>`;
  }

  function patternLayer(c, rnd, isHead) {
    switch (c.pattern) {
      case 'mackerel': return isHead ? headMackerel(c) : bodyMackerel(c, rnd);
      case 'tiger': return isHead ? headTiger(c) : bodyTiger(c, rnd);
      case 'spotted': return isHead ? headSpots(c, rnd, 6, 2.6, 4.4) : bodySpots(c, rnd, 24, 2.8, 6.6, 0.7);
      case 'rosette': return isHead ? headRosette(c, rnd) : bodyRosette(c, rnd, false);
      case 'rosette_big': return isHead ? headRosette(c, rnd) : bodyRosette(c, rnd, true);
      case 'cheetah': return isHead ? headSpots(c, rnd, 5, 2, 3.2) : bodySpots(c, rnd, 34, 1.8, 3.8, 0.8);
      case 'calico': return isHead ? headCalico(c, rnd) : bodyCalico(c, rnd);
      case 'tortie': return isHead ? headTortie(c, rnd) : bodyTortie(c, rnd);
      case 'mask': return isHead ? headMask(c) : bodyMask(c, rnd);
      case 'ticked': return isHead
        ? `<g stroke="${c.stripe}" stroke-width="1.6" opacity=".4" stroke-linecap="round"><path d="M136 96 l2 6"/><path d="M150 90 l1 6"/><path d="M172 90 l-1 6"/><path d="M184 96 l-2 6"/><path d="M124 148 l1 5"/><path d="M196 148 l-1 5"/></g>`
        : bodyTicked(c, rnd);
      case 'pointed': return isHead
        ? `<ellipse cx="160" cy="178" rx="34" ry="23" fill="${c.stripe}" opacity=".18"/>
           <ellipse cx="160" cy="178" rx="27" ry="18" fill="${c.stripe}" opacity=".12"/>`
        : '';
      default: return isHead ? '' : bellyPatch(c, 304, 30, 22, 0.22);
    }
  }

  /* ---------------- 顔 ---------------- */
  function faceSVG(g, c, eye1, eye2, stage, closed) {
    const ny = 168;
    const line = (d, w, op) => `<path d="${d}" stroke="${OUTLINE}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"${op ? ` opacity="${op}"` : ''}/>`;
    const whipCol = c.dark ? 'rgba(255,248,238,.8)' : 'rgba(74,53,37,.5)';
    const whip = c.dark ? 'rgba(255,248,238,.9)' : 'rgba(74,53,37,.42)';

    /* ひげ（繊細すぎず、可愛いカーブ） */
    const whiskers = `<g stroke="${whip}" stroke-width="2.1" fill="none" stroke-linecap="round" opacity=".95">
      <path d="M141 ${ny + 2} q-16 -6 -30 -9"/>
      <path d="M141 ${ny + 8} q-18 -1 -33 -1"/>
      <path d="M141 ${ny + 14} q-16 3 -28 10"/>
      <path d="M179 ${ny + 2} q16 -6 30 -9"/>
      <path d="M179 ${ny + 8} q18 -1 33 -1"/>
      <path d="M179 ${ny + 14} q16 3 28 10"/>
    </g>`;

    /* マズルとωの口 */
    const big = g.big;
    const mz = mix(c.fill, '#FFF6EC', isDark(c.fill) ? 0.42 : 0.34);
    const mx1 = big ? 143 : 146, mx2 = big ? 177 : 174;
    const mrx = big ? 17 : 15, mry = big ? 12.5 : 11;
    const muzzle = `<g>
      <ellipse cx="${mx1}" cy="${ny + 9}" rx="${mrx}" ry="${mry}" fill="${mz}" opacity="${c.dark ? 0.4 : 0.8}"/>
      <ellipse cx="${mx2}" cy="${ny + 9}" rx="${mrx}" ry="${mry}" fill="${mz}" opacity="${c.dark ? 0.4 : 0.8}"/>
      ${stage === 'senior' ? `<ellipse cx="160" cy="${ny + 14}" rx="23" ry="11" fill="#FFF7EC" opacity=".4"/>` : ''}
      <path d="M${160 - (big ? 7 : 6)} ${ny - 1} q${big ? 7 : 6} -3.5 ${big ? 14 : 12} 0 q0 5 -${big ? 7 : 6} 9 q-${big ? 7 : 6} -4 -${big ? 7 : 6} -9 Z" fill="#E7909A" stroke="${OUTLINE}" stroke-width="1.6" stroke-linejoin="round"/>
      ${line(`M160 ${ny + 8} v3`, 2.4, '.85')}
      ${closed
        ? line(`M149 ${ny + 14} q11 7 22 0`, 2.6)
        : stage === 'senior'
          ? line(`M151 ${ny + 12} q9 6 18 0`, 2.6, '.85')
          : line(`M160 ${ny + 11} q-7 8 -14 3.5`, 2.6, '.9') + line(`M160 ${ny + 11} q7 8 14 3.5`, 2.6, '.9')}
    </g>`;

    /* ほっぺの赤み */
    const blush = `<g fill="#F79AA6" opacity="${stage === 'kitten' ? 0.46 : 0.28}">
      <ellipse cx="111" cy="${ny + 6}" rx="11.5" ry="6.2"/>
      <ellipse cx="209" cy="${ny + 6}" rx="11.5" ry="6.2"/>
    </g>`;

    const exL = 130, exR = 190, ey = 148;

    /* 目：白目なし。黒目＋瞳色＋ハイライト */
    let eyes;
    if (closed) {
      eyes = `<g>
        <path d="M${exL - 14} ${ey - 1} q14 12 28 0" stroke="${OUTLINE}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M${exR - 14} ${ey - 1} q14 12 28 0" stroke="${OUTLINE}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <g stroke="${OUTLINE}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".65">
          <path d="M${exL - 15} ${ey} l-5 3"/><path d="M${exL + 13} ${ey} l5 3"/>
          <path d="M${exR - 15} ${ey} l-5 3"/><path d="M${exR + 13} ${ey} l5 3"/>
        </g>
      </g>`;
    } else if (stage === 'senior') {
      /* シニア：少し小ぶりで穏やかな目元。まぶたの線をそっと添える */
      const calm = (cx, col) => `<g>
        <ellipse cx="${cx}" cy="${ey}" rx="11.6" ry="13.4" fill="${col}" stroke="${OUTLINE}" stroke-width="2.4"/>
        <ellipse cx="${cx}" cy="${ey + 1}" rx="3.9" ry="8.8" fill="#241E1A"/>
        <circle cx="${cx - 4.4}" cy="${ey - 5.2}" r="3.9" fill="#FFFFFF" opacity=".95"/>
        <circle cx="${cx + 4.4}" cy="${ey + 6.4}" r="1.9" fill="#FFFFFF" opacity=".8"/>
        <path d="M${cx - 11} ${ey - 9.6} q11 -4.6 22 0" stroke="${OUTLINE}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".22"/>
        <path d="M${cx - 14.4} ${ey + 4} q-3.4 3.2 -4.2 6.2" stroke="${OUTLINE}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".22"/>
        <g fill="#FFFBF2" opacity=".5">
          <circle cx="${cx - 6}" cy="${ey - 15.6}" r="1.3"/>
          <circle cx="${cx + 1}" cy="${ey - 17.2}" r="1.1"/>
          <circle cx="${cx + 7}" cy="${ey - 15.2}" r="1.2"/>
        </g>
      </g>`;
      eyes = `<g>
        ${calm(exL, eye1)}${calm(exR, eye2)}
      </g>`;
    } else if (stage === 'kitten') {
      eyes = `<g>
        <ellipse cx="${exL}" cy="${ey}" rx="15" ry="16" fill="${eye1}" stroke="${OUTLINE}" stroke-width="2.6"/>
        <ellipse cx="${exR}" cy="${ey}" rx="15" ry="16" fill="${eye2}" stroke="${OUTLINE}" stroke-width="2.6"/>
        <circle cx="${exL}" cy="${ey + 1}" r="8.2" fill="#241E1A"/>
        <circle cx="${exR}" cy="${ey + 1}" r="8.2" fill="#241E1A"/>
        <circle cx="${exL - 5.5}" cy="${ey - 6}" r="5.2" fill="#FFFFFF"/>
        <circle cx="${exR - 5.5}" cy="${ey - 6}" r="5.2" fill="#FFFFFF"/>
        <circle cx="${exL + 6}" cy="${ey + 7}" r="2.9" fill="#FFFFFF" opacity=".92"/>
        <circle cx="${exR + 6}" cy="${ey + 7}" r="2.9" fill="#FFFFFF" opacity=".92"/>
        <circle cx="${exL - 8}" cy="${ey + 8}" r="1.5" fill="#FFFFFF" opacity=".7"/>
        <circle cx="${exR - 8}" cy="${ey + 8}" r="1.5" fill="#FFFFFF" opacity=".7"/>
      </g>`;
    } else {
      eyes = `<g>
        <ellipse cx="${exL}" cy="${ey}" rx="13.2" ry="15.4" fill="${eye1}" stroke="${OUTLINE}" stroke-width="2.5"/>
        <ellipse cx="${exR}" cy="${ey}" rx="13.2" ry="15.4" fill="${eye2}" stroke="${OUTLINE}" stroke-width="2.5"/>
        <ellipse cx="${exL}" cy="${ey + 1}" rx="4.4" ry="10.4" fill="#241E1A"/>
        <ellipse cx="${exR}" cy="${ey + 1}" rx="4.4" ry="10.4" fill="#241E1A"/>
        <circle cx="${exL - 5.2}" cy="${ey - 6.4}" r="4.8" fill="#FFFFFF"/>
        <circle cx="${exR - 5.2}" cy="${ey - 6.4}" r="4.8" fill="#FFFFFF"/>
        <circle cx="${exL + 5.6}" cy="${ey + 7}" r="2.3" fill="#FFFFFF" opacity=".88"/>
        <circle cx="${exR + 5.6}" cy="${ey + 7}" r="2.3" fill="#FFFFFF" opacity=".88"/>
      </g>`;
    }

    /* チーターの涙線 */
    const tear = c.pattern === 'cheetah' && !closed
      ? `<g stroke="${c.stripe}" stroke-width="3.6" fill="none" stroke-linecap="round" opacity=".85">
          <path d="M${exL + 2} ${ey + 15} q-2 10 -4 16"/>
          <path d="M${exR + 2} ${ey + 15} q2 10 4 16"/>
        </g>`
      : '';

    /* シニアの白いひげ・口元の点 */
    const seniorBits = stage === 'senior'
      ? `<g fill="#FFFBF2" opacity=".55">
          <circle cx="${mx1 - 8}" cy="${ny + 13}" r="1.5"/>
          <circle cx="${mx2 + 8}" cy="${ny + 13}" r="1.5"/>
        </g>`
      : '';

    return `${blush}${seniorBits}${muzzle}${eyes}${tear}${whiskers}`;
  }

  /* ---------------- 本体 ---------------- */
  function render(cat, opts) {
    opts = opts || {};
    const stage = opts.stage || stageOf(cat.ageYears);
    const closed = opts.eyes === 'closed';
    const u = 'cg' + (++UID);
    const p = cat.pattern || {};
    const g = geom(cat, stage);
    const seed = (cat.seed || 1) >>> 0;
    const fill = p.fill || p.base || '#A87B4A';
    const stripe = p.stripe || shade(fill, -60);
    const belly = p.belly || mix(fill, '#FFFAF0', 0.6);
    const eye1 = cat.eyeColor || '#D9A73C';
    const eye2 = cat.eyeColor2 || eye1;
    const c = { fill, stripe, belly, pattern: p.pattern, dark: isDark(fill) };
    const headPat = patternLayer(c, mulberry32((seed ^ 0x2545F491) >>> 0), true);
    const bodyPat = patternLayer(c, mulberry32((seed ^ 0x9E3779B9) >>> 0), false);
    const scene = cat.scene || (cat.route === 'zoo' ? 'zoo' : cat.klass === 'wild' ? (cat.species && cat.species.scene) || 'forest' : (cat.region && cat.region.outScene) || 'alley_jp');

    const tailColor = p.pattern === 'pointed' ? stripe : fill;
    const thick = (p.thicktail || p.fluffy) ? 1.6 : 1;
    const bob = p.bobtail || cat.bobtail;
    const tailD = bob
      ? 'M206 300 C226 302 236 310 232 320'
      : stage === 'kitten'
        ? 'M208 306 C238 310 252 296 249 279 C247 267 234 263 227 272'
        : 'M208 306 C252 313 272 292 269 265 C267 244 245 236 235 249 C228 258 234 270 247 268';
    const tail = `<path d="${tailD}" fill="none" stroke="${OUTLINE}" stroke-width="${(20 * thick).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<path d="${tailD}" fill="none" stroke="${tailColor}" stroke-width="${(15 * thick).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>`;

    /* タテガミ（ライオン） */
    const mane = p.mane ? (() => {
      let m = `<path d="${scallop(160, 134, 84, 11, 24)}" fill="${shade(fill, -22)}" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>`;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + 0.26;
        const r0 = 50, r1 = 76;
        m += `<path d="M${(160 + Math.cos(a) * r0).toFixed(1)} ${(134 + Math.sin(a) * r0).toFixed(1)} L${(160 + Math.cos(a) * r1).toFixed(1)} ${(134 + Math.sin(a) * r1).toFixed(1)}" stroke="${shade(fill, -40)}" stroke-width="4.5" stroke-linecap="round" opacity=".3"/>`;
      }
      m += `<path d="${scallop(160, 134, 76, 11, 18)}" fill="none" stroke="${shade(fill, -34)}" stroke-width="2" opacity=".28"/>`;
      return `<g>${m}</g>`;
    })() : '';

    /* 胸毛（長毛・ふわふわ） */
    const ruff = (p.longhair || p.fluffy) ? `<path d="${scallop(160, 230, 44, 9, 8)}" fill="${mix(fill, '#FFF6EC', 0.18)}" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/>` : '';

    /* 頬毛（メインクーンなど） */
    const cheekRuff = (p.ruff || 0) > 0 ? `<g opacity="${Math.min(1, 0.55 + (p.ruff || 0) * 0.45)}">
      <path d="${scallop(102, 152, 26, 6, 8)}" fill="${mix(fill, '#FFF6EC', 0.16)}" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="${scallop(218, 152, 26, 6, 8)}" fill="${mix(fill, '#FFF6EC', 0.16)}" stroke="${OUTLINE}" stroke-width="2.4" stroke-linejoin="round"/>
    </g>` : '';

    /* 耳先の房毛（オオヤマネコ・カラカル） */
    const tufts = (p.earTufts || 0) > 0 ? (() => {
      const tipL = g.segs[0][2];
      const tipR = mir(tipL);
      return `<g stroke="${OUTLINE}" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9">
        <path d="M${tipL[0]} ${tipL[1] + 3} l-4 -14"/><path d="M${tipL[0] + 6} ${tipL[1] + 4} l2 -12"/>
        <path d="M${tipR[0]} ${tipR[1] + 3} l4 -14"/><path d="M${tipR[0] - 6} ${tipR[1] + 4} l-2 -12"/>
      </g>`;
    })() : '';

    /* 耳の内側 */
    const earPink = p.pattern === 'pointed' ? mix(stripe, '#D9A3A8', 0.22)
      : p.mane ? mix(fill, '#C98188', 0.22)
        : (stage === 'kitten' ? '#F6B3BB' : '#EBA0A8');
    const ears = `<g clip-path="url(#${u}-earL)"><path d="${innerEarD(g.segs, false)}" fill="${earPink}"/></g>
      <g clip-path="url(#${u}-earR)"><path d="${innerEarD(g.segs, true)}" fill="${earPink}"/></g>`;

    /* ポイント柄（シャムなど）は耳の外側まで濃く */
    const darkEars = p.pattern === 'pointed'
      ? `<g clip-path="url(#${u}-head)"><path d="${earShapeD(g.segs, false)}" fill="${shade(stripe, 4)}"/><path d="${earShapeD(g.segs, true)}" fill="${shade(stripe, 4)}"/></g>`
      : '';

    /* 毛が薄い子（スフィンクス）のシワ */
    const wrinkles = p.hairless ? `<g stroke="${mix(fill, '#8a5a48', 0.35)}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".45">
      <path d="M128 108 q12 -8 24 -5"/><path d="M170 104 q12 -3 22 6"/>
      <path d="M136 122 q10 -6 20 -3"/><path d="M172 120 q10 -3 18 3"/>
    </g>` : '';

    const pawFill = p.pattern === 'pointed' ? shade(stripe, 14) : fill;
    const toes = `<g stroke="${OUTLINE}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".28">
      <path d="M132 314 q1 7 0 10"/><path d="M142 314 q-1 7 0 10"/>
      <path d="M178 314 q1 7 0 10"/><path d="M188 314 q-1 7 0 10"/>
    </g>`;

    const headT = `translate(160 150) scale(${g.headScale}) translate(-160 -150)`;
    const bodyT = `translate(160 330) scale(${g.bodyScale}) translate(-160 -330)`;

    const decor = `<g fill="#FFF8EE" opacity=".55">
      <path d="M272 92 l2.6 7 l7 2.6 l-7 2.6 l-2.6 7 l-2.6 -7 l-7 -2.6 l7 -2.6z"/>
      <path d="M44 150 l2 5.4 l5.4 2 l-5.4 2 l-2 5.4 l-2 -5.4 l-5.4 -2 l5.4 -2z" opacity=".8"/>
      <circle cx="288" cy="200" r="2.2"/><circle cx="30" cy="112" r="1.8"/>
    </g>`;

    const rainbow = closed
      ? `<path d="M36 316 A124 124 0 0 1 284 316" fill="none" stroke="url(#${u}-rb)" stroke-width="11" opacity=".32" stroke-linecap="round"/>`
      : '';

    const svg = `
<svg viewBox="0 0 320 360" xmlns="http://www.w3.org/2000/svg" class="cat-svg" role="img" aria-label="${escapeAttr(cat.speciesName || '猫')}のイラスト">
  <defs>
    <clipPath id="${u}-frame"><rect width="320" height="360" rx="26"/></clipPath>
    <clipPath id="${u}-body"><path d="${BODY_PATH}"/></clipPath>
    <clipPath id="${u}-head"><path d="${g.headPath}"/></clipPath>
    <clipPath id="${u}-earL"><path d="${earShapeD(g.segs, false)}"/></clipPath>
    <clipPath id="${u}-earR"><path d="${earShapeD(g.segs, true)}"/></clipPath>
    <linearGradient id="${u}-leg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${shade(pawFill, 18)}"/><stop offset="1" stop-color="${shade(pawFill, -12)}"/>
    </linearGradient>
    <linearGradient id="${u}-rb" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#F3A6A6"/><stop offset=".25" stop-color="#F6D49B"/>
      <stop offset=".5" stop-color="#BFE0A8"/><stop offset=".75" stop-color="#A9CDEF"/>
      <stop offset="1" stop-color="#CDB4E4"/>
    </linearGradient>
    <linearGradient id="__win" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#20304D"/><stop offset="1" stop-color="#3D5A7A"/>
    </linearGradient>
    <linearGradient id="__city" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#A8C2D8"/><stop offset="1" stop-color="#E6EEF4"/>
    </linearGradient>
  </defs>
  ${sceneSVG(scene, u)}
  <g clip-path="url(#${u}-frame)">
    <rect width="320" height="360" fill="#FFF6EC" opacity="${stage === 'kitten' ? 0.3 : 0.22}"/>
  </g>
  ${rainbow}
  <ellipse cx="160" cy="334" rx="${(86 * g.bodyScale).toFixed(1)}" ry="${(11 * g.bodyScale).toFixed(1)}" fill="#3a2a1e" opacity=".12"/>
  <g transform="${bodyT}">
    ${tail}
    <path d="${BODY_PATH}" fill="${fill}"/>
    <g clip-path="url(#${u}-body)">
      ${bodyPat}
      <ellipse cx="160" cy="222" rx="56" ry="28" fill="#FFFFFF" opacity=".07"/>
      <ellipse cx="160" cy="322" rx="66" ry="38" fill="#2b1d12" opacity=".06"/>
    </g>
    <path d="${BODY_PATH}" fill="none" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>
    ${ruff}
    <path d="${LEG_L}" fill="url(#${u}-leg)" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="${LEG_R}" fill="url(#${u}-leg)" stroke="${OUTLINE}" stroke-width="2.6" stroke-linejoin="round"/>
    ${toes}
  </g>
  <g transform="${headT}">
    ${mane}
    <path d="${g.headPath}" fill="${fill}"/>
    <g clip-path="url(#${u}-head)">
      ${headPat}
      <ellipse cx="160" cy="96" rx="42" ry="22" fill="#FFFFFF" opacity=".08"/>
    </g>
    ${darkEars}
    ${ears}
    ${cheekRuff}
    ${wrinkles}
    <path d="${g.headPath}" fill="none" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    ${tufts}
    ${faceSVG(g, c, eye1, eye2, stage, closed)}
  </g>
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
