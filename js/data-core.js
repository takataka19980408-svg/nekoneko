/* ============================================================
   世界猫生ガチャ — コアデータ
   地球上の約10億匹の猫から、ガチリアル確率で1匹に転生する。
   ============================================================ */
(function (root) {
  'use strict';

  const TOTAL = 1000000000;

  /* ---------- 全体の構図 ---------- */
  const MASS = {
    owned: 400000000,   // 飼い猫 40%
    stray: 590000000,   // 野良・地域猫・野生化 59%
    wild: 10000000      // 野生のネコ科 1%
  };

  const STRAY_SUB = [
    { key: 'community', name: '地域猫', share: 0.10 },
    { key: 'street', name: '野良猫', share: 0.72 },
    { key: 'feral', name: '野生化したイエネコ', share: 0.18 }
  ];

  const PUREBRED_SHARE = 0.012;

  /* ---------- 寿命プロファイル ---------- */
  const LIFE = {
    jp_indoor:   { infant: 0.045, base: 0.988, start: 12, rate: 0.030, max: 28 },
    jp_outdoor:  { infant: 0.070, base: 0.977, start: 11, rate: 0.034, max: 25 },
    owned_west:  { infant: 0.065, base: 0.978, start: 11, rate: 0.034, max: 25 },
    owned_dev:   { infant: 0.160, base: 0.955, start: 8,  rate: 0.045, max: 21 },
    owned_mid:   { infant: 0.110, base: 0.966, start: 9,  rate: 0.040, max: 22 },
    owned_cn:    { infant: 0.135, base: 0.960, start: 9,  rate: 0.042, max: 21 },
    community:   { infant: 0.270, base: 0.932, start: 6,  rate: 0.050, max: 18 },
    street:      { infant: 0.420, base: 0.868, start: 4,  rate: 0.052, max: 15 },
    street_jp:   { infant: 0.380, base: 0.880, start: 4,  rate: 0.050, max: 15 },
    feral:       { infant: 0.500, base: 0.848, start: 4,  rate: 0.052, max: 14 },
    feral_au:    { infant: 0.470, base: 0.842, start: 4,  rate: 0.056, max: 13 },
    purebred:    { infant: 0.048, base: 0.985, start: 11, rate: 0.032, max: 23 },
    wild_big:    { infant: 0.450, base: 0.900, start: 7,  rate: 0.055, max: 18 },
    wild_med:    { infant: 0.420, base: 0.870, start: 5,  rate: 0.060, max: 15 },
    wild_small:  { infant: 0.450, base: 0.828, start: 4,  rate: 0.065, max: 12 },
    wild_island: { infant: 0.320, base: 0.900, start: 6,  rate: 0.050, max: 16 },
    zoo:         { infant: 0.060, base: 0.985, start: 13, rate: 0.028, max: 30 }
  };

  /* ---------- 雑種の毛並み（飼い猫の98.8%） ---------- */
  const COATS = [
    { key: 'kijitora', name: 'キジトラ', share: 0.21, pattern: 'mackerel', base: '#A87B4A', stripe: '#53341C', belly: '#EBDCC3', eye: ['#8FBF5C', '#D8A93C'], desc: '茶色に黒い縞。日本でいちばん見かける、猫の基本形。' },
    { key: 'chatora', name: '茶トラ', share: 0.12, pattern: 'mackerel', base: '#E0913F', stripe: '#B4642A', belly: '#F7E3C6', eye: ['#D9A73C', '#8FBF5C'], desc: 'オレンジに濃い縞。のんびり屋で太りやすいと言われる。' },
    { key: 'sabatora', name: 'サバトラ', share: 0.09, pattern: 'mackerel', base: '#8E9295', stripe: '#4A4E52', belly: '#E3E5E6', eye: ['#8FBF5C', '#C9A93C'], desc: '灰色に黒い縞。キジトラの色違いで、クールな見た目。' },
    { key: 'kuro', name: '黒猫', share: 0.09, pattern: 'solid', base: '#2B2A2F', stripe: '#1A191D', belly: '#3A3940', eye: ['#D9A73C', '#8FBF5C'], desc: '真っ黒な毛。欧米では魔女の使い、日本では福を呼ぶ猫。' },
    { key: 'shiro', name: '白猫', share: 0.055, pattern: 'solid', base: '#F4F1EA', stripe: '#DCD7CC', belly: '#FFFFFF', eye: ['#5BA3D0', '#D9A73C'], desc: '真っ白な毛。青い目とオッドアイが出やすい。' },
    { key: 'hachiware', name: 'ハチワレ', share: 0.095, pattern: 'mask', base: '#2B2A2F', stripe: '#2B2A2F', fill: '#F6F2EA', belly: '#FFFFFF', eye: ['#D9A73C', '#8FBF5C'], desc: '頭の黒い部分が漢字の「八」に見える白黒猫。' },
    { key: 'mike', name: '三毛', share: 0.045, pattern: 'calico', base: '#F6F2EA', stripe: '#2B2A2F', belly: '#FFFFFF', eye: ['#D9A73C', '#8FBF5C'], femaleOnly: 0.999, desc: '白・黒・オレンジの三色。遺伝の都合でほぼメス。' },
    { key: 'sabi', name: 'サビ', share: 0.065, pattern: 'tortie', base: '#3A3130', stripe: '#C2703A', belly: '#8A6A55', eye: ['#8FBF5C', '#D9A73C'], femaleOnly: 0.98, desc: '黒とオレンジが混ざったまだら。三毛と同じ遺伝の仕組み。' },
    { key: 'buchi', name: 'ブチ', share: 0.055, pattern: 'spotted', base: '#F4F1EA', stripe: '#4A4038', belly: '#FFFFFF', eye: ['#D9A73C', '#5BA3D0'], desc: '白地に茶や黒のまだら。柄の出方が毎回ちがう。' },
    { key: 'gray', name: 'グレー', share: 0.035, pattern: 'solid', base: '#9BA0A6', stripe: '#7C8187', belly: '#C9CDD1', eye: ['#8FBF5C', '#D9A73C'], desc: '青みがかった灰色。ロシアンブルー風の上品な毛色。' },
    { key: 'point', name: 'シャム風ポイント', share: 0.03, pattern: 'pointed', base: '#E8DCC8', stripe: '#5B4636', belly: '#F4EDE0', eye: ['#5BA3D0', '#8FC6E0'], desc: '体はクリーム色で、耳・顔・足・尻尾だけ濃い。' },
    { key: 'longmix', name: '長毛ミックス', share: 0.04, pattern: 'mackerel', base: '#B7A98F', stripe: '#6A5A44', belly: '#EDE4D2', eye: ['#8FBF5C', '#D9A73C'], longhair: true, desc: 'ふわふわの長毛。純血種の血が少し入っているのかも。' },
    { key: 'cream', name: 'クリーム', share: 0.035, pattern: 'solid', base: '#E7CFA9', stripe: '#D3B78C', belly: '#F6E8D2', eye: ['#D9A73C', '#8FBF5C'], desc: '薄いオレンジ。日の当たるところで一番きれいに見える。' },
    { key: 'tabbywhite', name: 'トラ白', share: 0.035, pattern: 'mask', base: '#A87B4A', stripe: '#53341C', fill: '#F6F2EA', belly: '#FFFFFF', eye: ['#8FBF5C', '#D9A73C'], desc: '白い体に、頭と背中だけ縞模様。' }
  ];

  /* ---------- 激レア変異 ---------- */
  const MUTATIONS = [
    { key: 'odd_eye', name: 'オッドアイ', rate: 0.02, note: '左右で目の色がちがう。白猫に出やすい。' },
    { key: 'male_calico', name: 'オスの三毛猫', rate: 1 / 30000, note: '遺伝的に約3万分の1。ほぼ奇跡。' },
    { key: 'polydactyl', name: '多指症（6本指）', rate: 0.001, note: 'ヘミングウェイの猫に多い「幸運の指」。' },
    { key: 'bobtail', name: '尾なし（ボブテイル）', rate: 0.0008, note: '尻尾が短い、または無い。日本にもいる。' },
    { key: 'kink_tail', name: '折れ尾', rate: 0.02, cosmetic: true, note: '尻尾の先が曲がっている。日本の外猫によくいる。' }
  ];

  /* ---------- 地域グループ ----------
     region events = 地域共通の出来事。国ごとの固有イベントと混ぜて使う。 */
  const REGIONS = {
    north_america: {
      name: '北米', lifespan: 'owned_west',
      names: ['Bella', 'Luna', 'Milo', 'Charlie', 'Lucy', 'Max', 'Nala', 'Olive'],
      events: [
        'Thanksgivingの七面鳥を狙ってテーブルに飛び乗り、皿を割る。',
        '庭のリスと毎日同じ場所でにらみ合う。',
        'ハリケーンの避難所にゲージごと持ち込まれ、係員の膝で眠る。',
        '保護シェルターの譲渡会で、あまりの寝相のよさに即決される。',
        '車のキャリアに入れられて動物病院へ。帰り道は鳴きっぱなし。',
        '雪の日に窓へ張りつき、外の白い世界を前足でそっと叩く。'
      ]
    },
    latin_america: {
      name: '中南米', lifespan: 'owned_dev',
      names: ['Michi', 'Luna', 'Gato', 'Canela', 'Pancho', 'Pipoca', 'Mimi'],
      events: [
        '市場の魚屋の裏口で、毎日おこぼれをもらう暮らし。',
        '屋根伝いに隣町まで散歩し、帰り道を完全に忘れる。',
        'カーニバルの夜、人の波に驚いて屋根裏に3日間こもる。',
        '雨季の洪水で、高いところへ家族と一緒に避難する。',
        'タコスの屋台の下で、落ちてくる肉を1日中待つ。'
      ]
    },
    west_europe: {
      name: '西欧', lifespan: 'owned_west',
      names: ['Mia', 'Minou', 'Luna', 'Filou', 'Micetto', 'Grisou', 'Poppy'],
      events: [
        '窓辺から鳩を睨み、届かないことを知っている。',
        '近所のパン屋の店主に、毎朝クロワッサンの端をもらう。',
        '夏のバカンスに家族と車で南下し、別荘の庭を支配する。',
        '雨の庭から帰ってきて、足を拭かれるのをじっと我慢する。',
        '近所のパブの常連になり、店主からソーセージをもらう。'
      ]
    },
    north_europe: {
      name: '北欧', lifespan: 'owned_west',
      names: ['Maja', 'Nalle', 'Luna', 'Sisu', 'Misse', 'Pilvi'],
      events: [
        '暖炉の前のラグを独り占めし、家族を床で寝かせる。',
        '大雪の日、窓に張りついた雪を前足でそっと触る。',
        '白夜の夜も眠れず、家中を歩き回る。',
        '森の小屋の縁側で、野生の匂いを嗅いで固まる。'
      ]
    },
    east_europe: {
      name: '東欧', lifespan: 'owned_mid',
      names: ['Kotek', 'Murka', 'Mruczek', 'Bury', 'Kit', 'Sonechko'],
      events: [
        '暖房のパイプの真上を確保し、そこから一歩も動かない冬。',
        '集合住宅の地下道で、たくさんの仲間と身を寄せ合って眠る。',
        '納屋の鼠取りは、家族の一員の仕事。',
        '洗濯物の下で、石畳の日だまりを探す。'
      ]
    },
    middle_east: {
      name: '中東', lifespan: 'owned_mid',
      names: ['Mishmish', 'Lulu', 'Simsim', 'Bibi', 'Zaki'],
      events: [
        'モールの駐車場の猫は、夜の涼しさを知っている。',
        'ラマダンの夜、家族の食卓の下で静かに待つ。',
        '砂漠の夜の冷え込みに備え、毛布の山に潜り込む。',
        '市場の香辛料の袋の上で眠り、店主にどかされる。'
      ]
    },
    north_africa: {
      name: '北アフリカ', lifespan: 'owned_dev',
      names: ['Mishmish', 'Bastet', 'Zitoun', 'Nora', 'Simo'],
      events: [
        '青い壁の路地で、観光客の足を縫うように歩く。',
        'スークの魚屋の前で、丸くなって3時間動かない。',
        'ラマダンの夜、家族の食卓の下で静かに待つ。',
        '観光客の写真に毎日写り、勝手に有名になる。'
      ]
    },
    sub_saharan: {
      name: 'サハラ以南アフリカ', lifespan: 'owned_dev',
      names: ['Paka', 'Simba', 'Maua', 'Tigger', 'Socks'],
      events: [
        '土壁の家の猫は、夜じゅう鼠を追う。',
        '乾いた大地を何十kmも歩き、水場の匂いだけで方角を決める。',
        '雨季の軒先で、毎晩同じ場所に帰ってくる。',
        'マーケットの屋台の下で、子どもたちに愛される。'
      ]
    },
    south_asia: {
      name: '南アジア', lifespan: 'owned_dev',
      names: ['Billi', 'Chotu', 'Rani', 'Kalu', 'Moti', 'Chai'],
      events: [
        '寺院の石段に寝そべり、参拝者の頭を踏み台にする。',
        '屋台のミルクを分けてもらい、そのまま看板猫になる。',
        'モンスーンの雨宿りで、市場の段ボールに親子で避難する。',
        'バイクのエンジン音を聞き分け、自分の家のバイクだけに反応する。'
      ]
    },
    southeast_asia: {
      name: '東南アジア', lifespan: 'owned_dev',
      names: ['Manee', 'Muning', 'Mèo', 'Pusa', 'Si Da', 'Kiko'],
      events: [
        '寺院の日陰を探し、坊さんの読経のあいだ眠る。',
        'ナイトマーケットの屋台の下を、焼き魚の匂いを追って移動する。',
        '雨季の洪水で、高いところへ荷物と一緒に避難する。',
        'バイクの波を、信号も見ずに渡りきる。'
      ]
    },
    east_asia: {
      name: '東アジア', lifespan: 'owned_west',
      names: ['ミケ', 'タマ', 'モモ', '小白', '咪咪', '나비', '보리'],
      events: [
        'こたつの中で丸くなり、家族の足音で即座に居場所を確保する。',
        'キャットタワーの最上段を巡って、先住猫と冷戦が続く。',
        '高層マンションの窓から街を見下ろし、配達ロボットを観察する。',
        '猫カフェの看板猫に抜擢され、SNSで一気にバズる。',
        'ベランダ越しに隣の家の猫と毎朝あいさつするのが日課になる。'
      ]
    },
    oceania: {
      name: 'オセアニア', lifespan: 'owned_west',
      names: ['Mittens', 'Banjo', 'Matilda', 'Kiwi', 'Molly'],
      events: [
        '庭に出た瞬間、ヘビと鉢合わせして1週間庭に出なくなる。',
        '乾いた大地を歩き、水場の匂いだけで方角を決める。',
        '保護区の柵の内側に入れず、夜ごと外側を歩き回る。',
        '鳥の声を真似されて、本気で探し回る。'
      ]
    }
  };

  root.CAT_CORE = {
    TOTAL, MASS, STRAY_SUB, PUREBRED_SHARE, LIFE, COATS, MUTATIONS, REGIONS,
    STATUS_LABEL: {
      owned: '飼い猫', community: '地域猫', street: '野良猫', feral: '野生化したイエネコ',
      wild: '野生のネコ科', zoo: '動物園生まれ'
    },
    SEX_LABEL: { male: 'オス', female: 'メス' }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
