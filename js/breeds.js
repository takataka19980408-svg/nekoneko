/* ============================================================
   世界猫生ガチャ — 純血種データ（CFA/TICA 主要品種 74種）
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

  /* B(key, name, weight, pattern, base, eye, options) */
  function B(key, name, w, pattern, base, eye, o) {
    o = o || {};
    return {
      key: key, name: name, w: w, pattern: pattern, base: base,
      stripe: o.s || shade(base, -52),
      belly: o.b || shade(base, 46),
      fill: o.f,
      eye: Array.isArray(eye) ? eye : [eye || '#D9A73C', '#8FBF5C'],
      longhair: !!o.lh, short: !!o.sh, flat: !!o.fl, hairless: !!o.hl,
      curly: !!o.cu, ears: o.e || null, tall: !!o.tall, big: !!o.bg,
      bobtail: !!o.bt, ruff: o.rf || 0, health: o.h || null, desc: o.d || ''
    };
  }

  const G = ['#8FBF5C', '#D9A73C'];
  const BL = ['#4A86B8', '#7FB6DE'];
  const AM = ['#D9A73C', '#C98B3B'];
  const CU = ['#C98B3B', '#D9A73C'];

  const BREEDS = [
    B('mainecoon', 'メインクーン', 40, 'mackerel', '#8C6B4C', G, { s: '#4A3018', lh: 1, bg: 1, rf: 0.8, h: '肥大型心筋症', d: '体重10kg超えもある大型種。犬みたいな性格。' }),
    B('scottish', 'スコティッシュフォールド', 34, 'solid', '#BDB6AC', AM, { e: 'fold', h: '骨軟骨異形成', d: '折れ耳がトレードマーク。骨の病気が出やすい宿命。' }),
    B('munchkin', 'マンチカン', 30, 'mackerel', '#C4A276', G, { s: '#6E5236', sh: 1, h: '脊椎の負担', d: '足が短い。走るときは意外と速い。' }),
    B('ragdoll', 'ラグドール', 24, 'pointed', '#F0E9DC', BL, { s: '#6A5548', lh: 1, h: '肥大型心筋症', d: '抱き上げると脱力する、名前どおりの猫。' }),
    B('british', 'ブリティッシュショートヘア', 22, 'solid', '#7E92A8', AM, { d: 'ずんぐりむっくりと青灰色の毛。丸い顔が人気。' }),
    B('american_sh', 'アメリカンショートヘア', 20, 'mackerel', '#A9ACB0', G, { s: '#3B3E42', d: '銀色の縞に黒いライン。漫画の猫のモデル枠。' }),
    B('persian', 'ペルシャ', 18, 'solid', '#F0E4D2', CU, { lh: 1, fl: 1, h: '多発性嚢胞腎', d: 'つぶれた鼻と豊かな毛。毎日のブラッシングが日課。' }),
    B('russian_blue', 'ロシアンブルー', 16, 'solid', '#8E9BA8', ['#5FBF8A', '#7BD3A2'], { d: '銀がかった青灰色と緑の目。声が小さくて上品。' }),
    B('bengal', 'ベンガル', 15, 'rosette', '#D9A44B', G, { s: '#3A2A12', d: 'ヒョウのような斑点。ヤマネコの血を引く。' }),
    B('sphynx', 'スフィンクス', 13, 'solid', '#E6C7BC', BL, { hl: 1, h: '皮膚のトラブル', d: '毛がほぼない。寒さ対策で人の膝を求める。' }),
    B('siam', 'シャム', 12, 'pointed', '#EDE3D2', BL, { s: '#4B3A2C', d: 'ポイント柄の代表。よく鳴くので「話す猫」。' }),
    B('norwegian', 'ノルウェージャンフォレストキャット', 11, 'mackerel', '#9A8265', G, { s: '#4E3A26', lh: 1, h: '肥大型心筋症', d: '北欧の森の猫。防水の長毛とふさふさの尻尾。' }),
    B('abyssinian', 'アビシニアン', 10, 'ticked', '#B9793F', G, { s: '#7E4A1E', d: '1本1本に縞が入るティッキング。やんちゃ。' }),
    B('minuet', 'ミヌエット', 10, 'solid', '#D3BFA6', AM, { sh: 1, lh: 1, d: '丸顔と短い足のミックス。ぬいぐるみみたいな子。' }),
    B('siberian', 'サイベリアン', 9, 'mackerel', '#A08A6E', G, { s: '#5A4630', lh: 1, d: 'ロシアの寒い森で育った長毛種。毛が抜けにくい。' }),
    B('exotic_sh', 'エキゾチックショートヘア', 9, 'solid', '#D9C9B0', CU, { fl: 1, d: 'ペルシャの短毛版。つぶれた顔で甘えん坊。' }),
    B('birman', 'バーマン', 8, 'pointed', '#F2EBDD', BL, { s: '#6B5847', lh: 1, d: '白い手袋をしたような四肢。寺院生まれの伝説。' }),
    B('somali', 'ソマリ', 7, 'ticked', '#C08A4E', G, { s: '#8A5A28', lh: 1, rf: 0.4, d: 'アビシニアンの長毛版。キツネみたいな尻尾。' }),
    B('tonkinese', 'トンキニーズ', 6, 'pointed', '#E8D6BC', ['#7FC9C0', '#4A86B8'], { s: '#7A6450', d: 'シャムとバーミーズのいいとこ取り。' }),
    B('chartreux', 'シャルトリュー', 6, 'solid', '#8A93A0', CU, { d: 'フランスの青灰色。声が小さくて狩りが得意。' }),
    B('british_lh', 'ブリティッシュロングヘア', 6, 'solid', '#8798AE', AM, { lh: 1, d: 'ブリショの長毛版。もふもふの丸顔。' }),
    B('scottish_straight', 'スコティッシュストレート', 6, 'mackerel', '#C9C1B4', AM, { s: '#8A8072', d: '折れていない耳のスコティッシュ。立ち耳の兄弟。' }),
    B('savannah', 'サバンナ', 5, 'spotted', '#D9B26A', G, { s: '#3B2A14', tall: 1, bg: 1, d: 'サーバルとの交配種。長い脚と立ち耳。' }),
    B('turkish_angora', 'ターキッシュアンゴラ', 5, 'solid', '#F6F2EA', ['#5BA3D0', '#D9A73C'], { lh: 1, d: 'トルコの白い長毛種。アンカラの誇り。' }),
    B('turkish_van', 'ターキッシュバン', 4, 'mask', '#F8F5EE', AM, { f: '#F8F5EE', s: '#C98B3B', lh: 1, d: '泳ぐのが好きな珍しい猫。頭と尻尾に色が入る。' }),
    B('singapura', 'シンガプーラ', 5, 'ticked', '#CBB08A', G, { s: '#9A7B52', sh: 1, d: '世界最小級の品種。小さな体でよく鳴く。' }),
    B('burmese', 'バーミーズ', 5, 'solid', '#6B4A38', AM, { d: '濃い茶色の毛と金色の目。人懐こい甘えん坊。' }),
    B('bombay', 'ボンベイ', 4, 'solid', '#22212A', AM, { d: '黒豹を小さくしたような、真っ黒な猫。' }),
    B('ocicat', 'オシキャット', 4, 'spotted', '#C9A97A', G, { s: '#4A3620', d: '野生味のある斑点。でも中身は甘えん坊。' }),
    B('egyptian_mau', 'エジプシャンマウ', 4, 'spotted', '#C9C6BC', G, { s: '#3C3A34', d: '古代エジプト壁画の猫の末裔。' }),
    B('korat', 'コラット', 4, 'solid', '#8A99A0', ['#5FBF8A', '#8FBF5C'], { d: 'タイの幸運の猫。銀青色の毛とハート型の顔。' }),
    B('manx', 'マンクス', 4, 'solid', '#9A958C', G, { bt: 1, d: '尻尾のない猫。島の猫として有名。' }),
    B('japanese_bobtail', 'ジャパニーズボブテイル', 4, 'calico', '#F6F2EA', AM, { s: '#2B2A2F', bt: 1, d: '短い尻尾が「しっぽ」に見える日本の猫。' }),
    B('kurilian_bobtail', 'クリリアンボブテイル', 3, 'mackerel', '#A88F6C', G, { s: '#5A4630', lh: 1, bt: 1, d: '千島列島の短尾長毛種。泳ぎが得意。' }),
    B('american_curl', 'アメリカンカール', 3, 'mackerel', '#B08C62', G, { s: '#5E4326', e: 'curl', d: '耳の先がくるんと反り返る、珍しい耳の形。' }),
    B('american_bobtail', 'アメリカンボブテイル', 3, 'mackerel', '#9C7B5A', G, { s: '#4E3820', bt: 1, d: 'ピューマに似た短尾のアメリカ産。' }),
    B('cornish_rex', 'コーニッシュレックス', 3, 'solid', '#E3B98A', AM, { cu: 1, d: 'ウェーブした毛と大きな耳。細身でやんちゃ。' }),
    B('devon_rex', 'デボンレックス', 3, 'mackerel', '#B08C6A', G, { s: '#5E4224', cu: 1, d: 'くるんとした毛と大きな耳。いたずら好き。' }),
    B('selkirk_rex', 'セルカークレックス', 2, 'solid', '#C9A88C', AM, { cu: 1, lh: 1, d: 'ふわふわの巻き毛の長毛種。' }),
    B('laperm', 'ラパーム', 2, 'mackerel', '#B08C62', G, { s: '#5E4326', cu: 1, lh: 1, d: 'カールした毛が特徴。人懐こい。' }),
    B('peterbald', 'ピーターボールド', 2, 'solid', '#E8CFC4', BL, { hl: 1, d: 'ロシア生まれの無毛種。細くて長い体。' }),
    B('donskoy', 'ドンスコイ', 2, 'solid', '#D9BBAE', AM, { hl: 1, d: '無毛だが肌はしっとり。寒さが苦手。' }),
    B('bambino', 'バンビーノ', 2, 'solid', '#E6C7BC', BL, { hl: 1, sh: 1, d: '無毛と短足のミックス。小さくて甘えん坊。' }),
    B('highlander', 'ハイランダー', 2, 'mackerel', '#9C8468', G, { s: '#4E3A22', e: 'curl', tall: 1, d: 'カールした耳の大型種。ワイルドな見た目。' }),
    B('khao_manee', 'カオマニー', 2, 'solid', '#F8F6F0', ['#5BA3D0', '#D9A73C'], { d: 'タイの白猫。オッドアイが多く「ダイヤの目」。' }),
    B('arabian_mau', 'アラビアンマウ', 2, 'spotted', '#C9B79A', G, { s: '#4E4030', d: 'アラビア半島の砂漠生まれ。斑点が自慢。' }),
    B('chausie', 'シャウジー', 2, 'ticked', '#B08A5C', G, { s: '#5E4426', tall: 1, d: 'ジャングルキャットとの交配種。長い脚。' }),
    B('toyger', 'トイガー', 2, 'tiger', '#E0913F', G, { s: '#1C1410', d: 'トラ柄を目指して作られた品種。' }),
    B('pixie_bob', 'ピクシーボブ', 1, 'spotted', '#B08C62', G, { s: '#5E4426', bt: 1, d: '短い尻尾と耳の房毛。オオヤマネコ風。' }),
    B('lykoi', 'ライコイ', 1, 'solid', '#8A8278', AM, { hl: 1, d: '狼のような顔の部分無毛種。' }),
    B('oriental_sh', 'オリエンタルショートヘア', 2, 'pointed', '#F2EBDD', ['#5FBF8A', '#4A86B8'], { s: '#4B3A2C', d: 'シャムの短毛版。細長い体と大きな耳。' }),
    B('balinese', 'バリニーズ', 2, 'pointed', '#F2EBDD', BL, { s: '#4B3A2C', lh: 1, d: 'シャムの長毛版。優雅な尻尾。' }),
    B('colorpoint_sh', 'カラーポイントショートヘア', 2, 'pointed', '#F0E9DC', BL, { s: '#5B4A3A', d: 'ポイント柄の短毛種。アメショの血も入る。' }),
    B('havana_brown', 'ハバナブラウン', 1, 'solid', '#4A3128', ['#5FBF8A', '#8FBF5C'], { d: 'チョコレート色の毛と緑の目。' }),
    B('european_sh', 'ヨーロピアンショートヘア', 2, 'mackerel', '#8E8478', G, { s: '#4A4238', d: 'ヨーロッパの野良猫から作られた、素朴な品種。' }),
    B('american_wirehair', 'アメリカンワイヤーヘア', 1, 'mackerel', '#B08C62', G, { s: '#5E4426', cu: 1, d: '硬い巻き毛。さわると針金みたい。' }),
    B('german_rex', 'ジャーマンレックス', 1, 'mackerel', '#B08C62', G, { s: '#5E4426', cu: 1, d: 'ドイツ生まれの巻き毛種。数はとても少ない。' }),
    B('skookum', 'スクーカム', 1, 'mackerel', '#B08C62', G, { s: '#5E4426', cu: 1, sh: 1, d: '短足と巻き毛の組み合わせ。' }),
    B('dwelf', 'ドゥエルフ', 1, 'solid', '#E6C7BC', BL, { hl: 1, sh: 1, cu: 1, d: '無毛・短足・巻き毛の三拍子。' }),
    B('minskin', 'ミンクスキン', 1, 'solid', '#E0C4B8', AM, { hl: 1, sh: 1, d: '無毛の短足種。とても珍しい。' }),
    B('ukrainian_levkoy', 'ウクライナンレフコイ', 1, 'solid', '#D9BBAE', AM, { hl: 1, d: '折れ耳の無毛種。ウクライナ生まれ。' }),
    B('ragamuffin', 'ラガマフィン', 2, 'mackerel', '#C0A184', G, { s: '#6A4E30', lh: 1, d: 'ラグドールから生まれた長毛種。' }),
    B('toybob', 'トイボブ', 2, 'spotted', '#A88F6C', G, { s: '#5A4630', bt: 1, sh: 1, d: 'ロシアの小さな短尾種。' }),
    B('kinkalow', 'キンカロー', 1, 'mackerel', '#C4A276', G, { s: '#6E5236', sh: 1, cu: 1, d: '短足と巻き尻尾。米国生まれの新種。' }),
    B('vankedisi', 'バンケディシ', 1, 'solid', '#F6F0E4', ['#5BA3D0', '#D9A73C'], { lh: 1, f: '#F8F6F0', d: 'トルコ・ヴァン湖畔の白い長毛種。' }),
    B('ojos_azules', 'オホスアスレス', 1, 'pointed', '#F4EFE4', BL, { s: '#6B5847', d: '青い目と白い毛のポイント種。' }),
    B('york_chocolate', 'ヨークチョコレート', 1, 'solid', '#5A3E2E', AM, { d: 'チョコレート色の毛と琥珀の目。' }),
    B('cheetoh', 'チートー', 1, 'spotted', '#D8B072', G, { s: '#3E2C14', bg: 1, d: 'ベンガルとオシキャットの交配種。' }),
    B('suphalak', 'スパラック', 1, 'solid', '#4A2F26', AM, { d: 'タイの銅色の猫。幸運を運ぶとされる。' }),
    B('thai', 'タイ', 1, 'pointed', '#EDE3D2', BL, { s: '#4B3A2C', d: 'シャムの原型とされる、昔ながらのタイの猫。' }),
    B('sokoke', 'ソコケ', 1, 'ticked', '#C08A4E', G, { s: '#8A5A28', d: 'ケニアの森の猫。木の皮のような毛色。' }),
    B('snowshoe', 'スノーシュー', 2, 'pointed', '#F4EFE6', BL, { s: '#6B5847', d: '白い足袋を履いたポイント種。' }),
    B('serengeti', 'セレンゲティ', 1, 'spotted', '#D9B26A', G, { s: '#3B2A14', tall: 1, d: 'サーバルに似せて作られた、耳の高い猫。' }),
    B('australian_mist', 'オーストラリアンミスト', 1, 'ticked', '#C9B79A', G, { s: '#8A7455', d: 'オーストラリア生まれのティッキング種。' })
  ];

  root.CAT_BREEDS = BREEDS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
