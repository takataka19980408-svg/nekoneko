/* ============================================================
   世界猫生ガチャ — 野生のネコ科（IUCN分類 39種＋亜種7＝46エントリ）
   pop は推定生息数（頭）。ガチャ内では相対比で重み付けする。
   ============================================================ */
(function (root) {
  'use strict';

  function shade(hex, amt) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r + amt));
    g = Math.max(0, Math.min(255, g + amt));
    b = Math.max(0, Math.min(255, b + amt));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  /* W(key, name, sci, pop, group, range, scene, pattern, base, countries, iucn, note, opts) */
  function W(key, name, sci, pop, group, range, scene, pattern, base, countries, iucn, note, o) {
    o = o || {};
    return {
      key: key, name: name, sci: sci, pop: pop, group: group, range: range,
      scene: scene, pattern: pattern, base: base,
      stripe: o.s || shade(base, -80),
      belly: o.b || shade(base, 55),
      eye: o.eye || ['#D9A73C', '#8FBF5C'],
      countries: countries, iucn: iucn, note: note,
      mane: !!o.mane, tall: !!o.tall, earTufts: o.tufts || 0, ruff: o.ruff || 0,
      fluffy: !!o.fluf, thicktail: !!o.tt, bigEars: !!o.bigEars, flat: !!o.flat,
      muzzle: o.muzzle || null, bobtail: !!o.bobtail, tearMark: !!o.tear, bg: !!o.bg,
      desc: note
    };
  }

  const WILD = [
    /* ---- ヒョウ亜科 Panthera / Neofelis ---- */
    W('lion', 'ライオン', 'Panthera leo', 23000, 'big', 'アフリカのサバンナ', 'savanna', 'solid', '#C9A264',
      ['tz', 'ke', 'za', 'in'], 'VU', '群れで生きる唯一のネコ科。オスの平均寿命はメスより短い。',
      { mane: 1, muzzle: 'wide', s: '#9B7742' }),
    W('tiger', 'トラ', 'Panthera tigris', 5574, 'big', 'インド・シベリア', 'jungle', 'tiger', '#E0913F',
      ['in', 'ru', 'cn', 'id', 'th', 'my', 'np', 'bd'], 'EN', '野生に残るのは約5,000頭。しま模様は1頭ごとに違う。',
      { muzzle: 'wide', s: '#1C1410' }),
    W('leopard', 'ヒョウ', 'Panthera pardus', 200000, 'big', 'アフリカ・アジア', 'savanna', 'rosette', '#D3A85C',
      ['in', 'cn', 'ru', 'ke', 'za', 'ir'], 'VU', '木の上に獲物を運ぶ怪力。夜の闇に溶ける斑点。',
      { muzzle: 'wide', s: '#2A1E0E' }),
    W('jaguar', 'ジャガー', 'Panthera onca', 64000, 'big', '中南米', 'jungle', 'rosette_big', '#D8AE5E',
      ['br', 'mx', 'pe', 'co', 'ar'], 'NT', '噛む力はネコ科最強。水を嫌わないジャングルの王。',
      { muzzle: 'wide', s: '#241A0C' }),
    W('snow_leopard', 'ユキヒョウ', 'Panthera uncia', 7500, 'big', '中央アジアの高地', 'snow', 'rosette', '#CDD2D0',
      ['cn', 'ru', 'in', 'np', 'mn', 'kz', 'pk'], 'VU', '標高5,000mに住む「山の幽霊」。長い尻尾は毛布がわり。',
      { muzzle: 'wide', fluf: 1, tt: 1, s: '#4E5452', eye: ['#8FC6E0', '#D9A73C'] }),
    W('clouded_leopard', 'ウンピョウ', 'Neofelis nebulosa', 10000, 'big', '東南アジアの森', 'jungle', 'rosette_big', '#B79A72',
      ['th', 'my', 'in', 'np', 'cn', 'vn', 'mm'], 'VU', '雲のような大きな斑紋。木の上から垂直に降りる。',
      { muzzle: 'wide', s: '#2E2414', fluf: 0.5 }),
    W('sunda_clouded', 'スンダウンピョウ', 'Neofelis diardi', 4500, 'big', 'ボルネオ・スマトラ', 'jungle', 'rosette_big', '#A89579',
      ['id', 'my'], 'VU', 'ボルネオとスマトラだけに住む、雲豹の仲間。',
      { muzzle: 'wide', s: '#2A2012' }),

    /* ---- ネコ亜科 ---- */
    W('marbled_cat', 'マーブルキャット', 'Pardofelis marmorata', 8000, 'medium', '東南アジアの森', 'jungle', 'rosette', '#B08A5C',
      ['th', 'my', 'id', 'in', 'np', 'vn'], 'NT', '大理石のような斑紋。木の上で暮らす小型の猫。',
      { s: '#3E2C14', fluf: 0.6 }),
    W('asian_golden', 'アジアゴシキネコ', 'Catopuma temminckii', 8000, 'medium', '東南アジア', 'jungle', 'solid', '#C08A44',
      ['th', 'my', 'id', 'in', 'np', 'vn', 'mm', 'cn'], 'NT', '金色の毛を持つ森の猫。東南アジアの伝説に出てくる。',
      { s: '#8C5C22' }),
    W('bay_cat', 'ボルネオヤマネコ', 'Catopuma badia', 2200, 'medium', 'ボルネオ島', 'jungle', 'solid', '#9B5F3C',
      ['my'], 'EN', '世界でいちばん謎の多い猫。写真すらほとんどない。',
      { s: '#6E3F26' }),
    W('serval', 'サーバル', 'Leptailurus serval', 40000, 'medium', 'アフリカの草原', 'savanna', 'spotted', '#D9B267',
      ['ke', 'tz', 'za', 'ug', 'ng', 'gh'], 'LC', '長い脚と大きな耳。草むらの音を聞き分けて跳びかかる。',
      { s: '#33260F', tall: 1, tufts: 0.8 }),
    W('caracal', 'カラカル', 'Caracal caracal', 60000, 'medium', 'アフリカ・中東・インド', 'desert', 'solid', '#C08050',
      ['za', 'ke', 'in', 'ir', 'sa', 'eg', 'ma'], 'LC', '黒い耳の房毛がトレードマーク。鳥を空中で捕まえる。',
      { s: '#8A5630', tall: 1, tufts: 1.6 }),
    W('african_golden', 'アフリカゴシキネコ', 'Caracal aurata', 10000, 'medium', '赤道アフリカの森', 'jungle', 'solid', '#A8622E',
      ['ug', 'ke', 'ng', 'gh'], 'VU', '深い森に住む、ほとんど姿を見せない黄金の猫。',
      { s: '#7A4218' }),
    W('ocelot', 'オセロット', 'Leopardus pardalis', 50000, 'medium', '中南米', 'jungle', 'rosette', '#D2A65C',
      ['br', 'mx', 'pe', 'co', 'ar', 've', 'ec'], 'LC', '網目のような斑点。木登りも泳ぎも得意な万能ハンター。',
      { s: '#33240F' }),
    W('margay', 'マーゲイ', 'Leopardus wiedii', 15000, 'small', '中南米', 'jungle', 'rosette', '#C8A268',
      ['br', 'mx', 'pe', 'co'], 'NT', '木から木へ飛び移る小型の猫。ほぼ樹上で暮らす。',
      { s: '#3A2914', bobtail: 1 }),
    W('oncilla', 'ジャガーネコ', 'Leopardus tigrinus', 6000, 'small', '北南米', 'jungle', 'rosette', '#C9A46A',
      ['br', 'co', 've', 'pe', 'ec'], 'VU', '小さな体に細かい斑点。別名タイガーキャット。',
      { s: '#3C2A14' }),
    W('southern_tiger', 'ミナミコドコド', 'Leopardus guttulus', 8000, 'small', '南ブラジル・アルゼンチン', 'jungle', 'rosette', '#C9A46A',
      ['br', 'ar'], 'VU', '2013年に別種とされた、まだ謎の多い小さな猫。',
      { s: '#3C2A14' }),
    W('geoffroy', 'ジョフロアネコ', 'Leopardus geoffroyi', 80000, 'small', '南米南部', 'forest', 'spotted', '#C9B08A',
      ['ar', 'cl', 'uy', 'br'], 'LC', '南米の草原に住む。木に登るのが上手。',
      { s: '#4A3A22' }),
    W('kodkod', 'コドコド', 'Leopardus guigna', 8000, 'small', 'チリ・アルゼンチン', 'forest', 'spotted', '#B08A5C',
      ['cl', 'ar'], 'VU', 'アメリカ大陸で最小の猫。チリの森にひっそり暮らす。',
      { s: '#3E2C14' }),
    W('pampas', 'パンパスネコ', 'Leopardus colocola', 25000, 'small', '南米', 'mountain', 'mackerel', '#B8A78C',
      ['ar', 'cl', 'pe', 'bo', 'br', 'uy'], 'NT', 'パンパスの草むらに住む、厚い毛の猫。',
      { s: '#5A4A34' }),
    W('andean', 'アンデスネコ', 'Leopardus jacobita', 1400, 'small', 'アンデス高地', 'mountain', 'mackerel', '#A9A29A',
      ['pe', 'bo', 'cl', 'ar'], 'EN', '世界で最も珍しい猫のひとつ。標高4,000mに住む。',
      { s: '#4E4A44', fluf: 1 }),
    W('eurasian_lynx', 'ヨーロッパオオヤマネコ', 'Lynx lynx', 45000, 'medium', 'ユーラシアの森', 'forest', 'spotted', '#B89A74',
      ['ru', 'se', 'no', 'fi', 'pl', 'ro', 'cn', 'mn', 'kz'], 'LC', 'ヨーロッパ最大の猫。耳の房毛と短い尻尾。',
      { s: '#5A4020', tufts: 1.2, ruff: 1, bobtail: 1, fluf: 0.6 }),
    W('canada_lynx', 'カナダオオヤマネコ', 'Lynx canadensis', 800000, 'medium', 'カナダ・アラスカ', 'snow', 'solid', '#C9C4B8',
      ['ca', 'us'], 'LC', '雪の森の狩人。足裏の毛が雪靴がわりになる。',
      { s: '#8C857A', tufts: 1.2, ruff: 1, bobtail: 1, fluf: 1 }),
    W('iberian_lynx', 'イベリアオオヤマネコ', 'Lynx pardinus', 2000, 'medium', 'スペイン・ポルトガル', 'forest', 'spotted', '#C08A57',
      ['es', 'pt'], 'EN', '一度は100頭まで減った奇跡の猫。復活作戦が続く。',
      { s: '#5C3A1E', tufts: 1.2, ruff: 1, bobtail: 1 }),
    W('bobcat', 'ボブキャット', 'Lynx rufus', 3000000, 'medium', '北米', 'forest', 'spotted', '#C7A173',
      ['us', 'ca', 'mx'], 'LC', '北米でいちばん数が多い野生の猫。短い尻尾と耳の房毛。',
      { s: '#6B4A28', tufts: 1, bobtail: 1, ruff: 0.6 }),
    W('puma', 'ピューマ', 'Puma concolor', 80000, 'big', '南北アメリカ', 'mountain', 'solid', '#C99A6C',
      ['us', 'ca', 'br', 'ar', 'cl', 'pe', 'co', 'mx'], 'LC', 'クーガー、プーマ、山の獅子。名前が一番多い動物。',
      { s: '#9A6E44', muzzle: 'wide' }),
    W('jaguarundi', 'ジャガランディ', 'Herpailurus yagouaroundi', 8000, 'small', '中南米', 'jungle', 'solid', '#7C6A5A',
      ['br', 'mx', 'ar', 'co', 've'], 'LC', '細長い体でイタチに間違われる。昼行性の珍しい猫。',
      { s: '#5A4C40' }),
    W('cheetah', 'チーター', 'Acinonyx jubatus', 6500, 'big', 'アフリカ・イラン', 'savanna', 'cheetah', '#DDBB70',
      ['ke', 'tz', 'za', 'ir', 'et', 'ng'], 'VU', '時速100km。でも弱くて、獲物はよく奪われる。',
      { s: '#2A2014', tear: 1, muzzle: 'wide' }),
    W('manul', 'マヌルネコ', 'Otocolobus manul', 15000, 'small', '中央アジア', 'mountain', 'mackerel', '#B6AA92',
      ['mn', 'cn', 'ru', 'kz', 'ir', 'np', 'pk'], 'LC', '世界最古の猫。丸顔と怒ったような目で人気者。',
      { s: '#5E5444', fluf: 1.4, flat: 1, ruff: 0.8 }),
    W('leopard_cat', 'ベンガルヤマネコ', 'Prionailurus bengalensis', 300000, 'medium', 'アジア', 'jungle', 'spotted', '#C9A455',
      ['cn', 'in', 'th', 'vn', 'my', 'id', 'ph', 'kr'], 'LC', 'ベンガル猫の祖先。水辺が得意で、魚も捕る。',
      { s: '#3E2E18' }),
    W('iriomote', 'イリオモテヤマネコ', 'Prionailurus bengalensis iriomotensis', 100, 'island', '西表島', 'island', 'spotted', '#A88C62',
      ['jp'], 'CR', '西表島だけに住む天然記念物。推定100頭。',
      { s: '#3A2C1A', bobtail: 1, ruff: 0.4 }),
    W('tsushima', 'ツシマヤマネコ', 'Prionailurus bengalensis euptilurus', 100, 'island', '長崎・対馬', 'forest', 'spotted', '#B09468',
      ['jp'], 'EN', '対馬だけに住む絶滅危惧種。推定100頭。',
      { s: '#3E2F1C', bobtail: 1 }),
    W('amur_leopard', 'アムールヒョウ', 'Panthera pardus orientalis', 125, 'big', '極東ロシア・中国東北', 'snow', 'rosette', '#DCC79C',
      ['ru', 'cn'], 'CR', '野生に約100頭。世界でいちばん希少なヒョウ。',
      { s: '#2E2414', muzzle: 'wide', fluf: 0.8 }),
    W('fishing_cat', 'スナドリネコ', 'Prionailurus viverrinus', 8000, 'medium', '南・東南アジア', 'jungle', 'spotted', '#9AA08C',
      ['in', 'th', 'id', 'vn', 'mm', 'bd', 'lk'], 'VU', '水に飛び込んで魚を捕る、珍しい猫。',
      { s: '#3E4436' }),
    W('flat_headed', 'ヒメハイイロネコ', 'Prionailurus planiceps', 2500, 'small', 'スマトラ・ボルネオ', 'jungle', 'solid', '#9A6A4E',
      ['my', 'id', 'th'], 'EN', '頭が平らな、湿地の小さな猫。泳ぎが得意。',
      { s: '#6E4630', flat: 1 }),
    W('rusty_spotted', 'サビイロネコ', 'Prionailurus rubiginosus', 15000, 'small', 'インド・スリランカ', 'forest', 'spotted', '#A87C5C',
      ['in', 'lk', 'np'], 'NT', '世界最小の猫。手のひらに乗る大きさ。',
      { s: '#4A2E1A' }),
    W('euro_wildcat', 'ヨーロッパヤマネコ', 'Felis silvestris', 120000, 'medium', 'ヨーロッパ', 'forest', 'mackerel', '#A29280',
      ['de', 'fr', 'it', 'es', 'pt', 'gb', 'pl', 'ro', 'hu', 'cz', 'gr'], 'LC', 'イエネコのいとこ。見た目はそっくりでも、絶対に懐かない。',
      { s: '#4C4034', fluf: 0.7, ruff: 0.5 }),
    W('african_wildcat', 'リビアヤマネコ', 'Felis lybica', 150000, 'medium', 'アフリカ・中東', 'desert', 'mackerel', '#C2A379',
      ['eg', 'ma', 'za', 'ke', 'ng', 'sa'], 'LC', 'すべての飼い猫のご先祖様。今も砂漠で狩りをする。',
      { s: '#6A5238' }),
    W('sand_cat', 'スナネコ', 'Felis margarita', 27000, 'small', 'サハラ・中東', 'desert', 'solid', '#E0C797',
      ['eg', 'ma', 'dz', 'sa', 'ir', 'pk', 'kz', 'tn', 'ly'], 'LC', '砂漠の天使。暑さと寒さの差に耐える小さな狩人。',
      { s: '#B59A6C', bigEars: 1 }),
    W('blackfooted', 'クロアシネコ', 'Felis nigripes', 13000, 'small', '南アフリカ', 'savanna', 'spotted', '#D8BC8C',
      ['za'], 'VU', '世界最小級なのに、狩りの成功率はネコ科トップクラス。',
      { s: '#5A4324' }),
    W('jungle_cat', 'ジャングルキャット', 'Felis chaus', 60000, 'medium', '南・東南アジア', 'jungle', 'solid', '#B39A72',
      ['in', 'th', 'vn', 'cn', 'np', 'pk', 'bd', 'lk', 'mm', 'id'], 'LC', '長い脚と耳の房毛。水中に飛び込んで狩る変わり者。',
      { s: '#7A6444', tufts: 0.4 }),
    W('chinese_mountain', 'ハイイロネコ', 'Felis bieti', 10000, 'small', '中国西部', 'mountain', 'mackerel', '#B0A38C',
      ['cn'], 'VU', '中国の高原にだけ住む、ほとんど知られていない猫。',
      { s: '#5C5240', fluf: 1 }),

    /* ---- 亜種（人気の高いもの） ---- */
    W('amur_tiger', 'アムールトラ', 'Panthera tigris altaica', 600, 'big', '極東ロシア', 'snow', 'tiger', '#E8A24E',
      ['ru', 'cn'], 'EN', '世界最大のトラ。雪の森を歩く。',
      { muzzle: 'wide', s: '#1C1410', fluf: 1 }),
    W('sumatran_tiger', 'スマトラトラ', 'Panthera tigris sumatrae', 600, 'big', 'スマトラ島', 'jungle', 'tiger', '#D98A38',
      ['id'], 'EN', 'いちばん小さなトラ。頬ひげが長い。',
      { muzzle: 'wide', s: '#1C1410' }),
    W('asiatic_lion', 'アジアライオン', 'Panthera leo persica', 700, 'big', 'インド・ギル', 'forest', 'solid', '#C69B62',
      ['in'], 'EN', 'インドのギル保護区だけに住む。腹の皮がたるんでいる。',
      { mane: 1, muzzle: 'wide', s: '#9B7742' }),
    W('florida_panther', 'フロリダパンサー', 'Puma concolor coryi', 230, 'big', 'アメリカ・フロリダ', 'forest', 'solid', '#C0946A',
      ['us'], 'CR', 'フロリダの湿地に残る、ピューマの亜種。',
      { s: '#8E6A48', muzzle: 'wide' })
  ];

  root.CAT_WILD = WILD;
})(typeof globalThis !== 'undefined' ? globalThis : this);
