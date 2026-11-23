/* ============================================================
   世界猫生ガチャ — 国・地域データ（75カ国・地域）
   owned / stray は推計生息数（百万匹）。ガチャ内で正規化して使う。
   ============================================================ */
(function (root) {
  'use strict';

  /* C(key, name, flag, region, owned, stray, opts) */
  function C(key, name, flag, region, owned, stray, o) {
    o = o || {};
    return {
      key: key, name: name, flag: flag, region: region,
      ownedM: owned, strayM: stray,
      where: o.where || null,
      names: o.names || null,
      scene: o.scene || null,
      outScene: o.out || null,
      aff: o.aff || null,
      events: o.events || null,
      specials: o.specials || null,
      note: o.note || null
    };
  }

  const COUNTRIES = [
    /* ---------------- 北米 ---------------- */
    C('us', 'アメリカ', '🇺🇸', 'north_america', 74, 50, {
      where: ['ニューヨーク', 'ロサンゼルス', 'シカゴ', 'テキサス', 'フロリダ', 'シアトル', 'ポートランド'],
      names: ['Bella', 'Luna', 'Charlie', 'Lucy', 'Max', 'Milo', 'Olive', 'Pepper', 'Shadow', 'Nala'],
      note: '世界最大級の猫大国。室内飼い7割、庭付きの家も多い。',
      events: [
        'Thanksgivingのターキーを狙ってテーブルに飛び乗り、皿を割る。',
        'ハリケーンの避難所にゲージごと持ち込まれ、係員の膝で寝て過ごす。',
        '保護シェルターの譲渡会で、あまりの寝相のよさに即決される。'
      ],
      specials: [{ key: 'hemingway', name: 'ヘミングウェイの六本指猫', rate: 0.0002, where: 'フロリダ・キーウェスト' }]
    }),
    C('ca', 'カナダ', '🇨🇦', 'north_america', 9, 4, {
      where: ['トロント', 'バンクーバー', 'モントリオール', 'カルガリー'],
      names: ['Maple', 'Mochi', 'Snow', 'Coco', 'Bear'],
      note: '冬は室内が基本。外猫には長く厳しい季節が来る。'
    }),
    C('mx', 'メキシコ', '🇲🇽', 'latin_america', 12, 24, {
      where: ['メキシコシティ', 'グアダラハラ', 'オアハカ', 'メリダ'],
      names: ['Michi', 'Gato', 'Luna', 'Pancho', 'Canela', 'Tigre'],
      note: '屋根の上を渡り歩く猫が多い。市場の猫はよく太っている。',
      events: [
        '屋根伝いに隣町まで散歩し、帰り道を完全に忘れる。',
        '死者の日の祭壇に飾られた花を、こっそり食べる。',
        'タコスの屋台の下で、落ちてくる肉を1日中待つ。'
      ]
    }),

    /* ---------------- 中南米 ---------------- */
    C('br', 'ブラジル', '🇧🇷', 'latin_america', 25, 32, {
      where: ['サンパウロ', 'リオデジャネイロ', 'サルバドール', 'クリチバ'],
      names: ['Mimi', 'Frajola', 'Luna', 'Bolinho', 'Sombra', 'Pipoca'],
      note: 'アパートの猫は網戸越しに外を眺める。保護活動も盛ん。',
      events: [
        'アパートの屋上で日向ぼっこし、隣の猫と縄張りを睨み合う。',
        'カーニバルの夜、人の波に驚いて屋根裏に3日間こもる。',
        '市場の魚屋の裏口で、毎日おこぼれをもらう暮らし。'
      ]
    }),
    C('ar', 'アルゼンチン', '🇦🇷', 'latin_america', 6, 8, { where: ['ブエノスアイレス', 'コルドバ', 'ロサリオ'], names: ['Michi', 'Luna', 'Toto', 'Negro'] }),
    C('cl', 'チリ', '🇨🇱', 'latin_america', 3, 3, { where: ['サンティアゴ', 'バルパライソ', 'アントファガスタ'], names: ['Michi', 'Luna', 'Cholo'] }),
    C('co', 'コロンビア', '🇨🇴', 'latin_america', 3, 5, { where: ['ボゴタ', 'メデジン', 'カルタヘナ'], names: ['Michi', 'Gato', 'Luna'] }),
    C('pe', 'ペルー', '🇵🇪', 'latin_america', 3, 5, { where: ['リマ', 'クスコ', 'アレキパ'], names: ['Michi', 'Gato', 'Puma'], scene: 'mountain' }),
    C('ve', 'ベネズエラ', '🇻🇪', 'latin_america', 2, 4, { where: ['カラカス', 'マラカイボ'], names: ['Michi', 'Luna'] }),
    C('uy', 'ウルグアイ', '🇺🇾', 'latin_america', 1, 1.5, { where: ['モンテビデオ', 'コロニア'], names: ['Michi', 'Luna'] }),
    C('ec', 'エクアドル', '🇪🇨', 'latin_america', 1.5, 2.5, { where: ['キト', 'グアヤキル', 'クエンカ'], names: ['Michi', 'Luna'], scene: 'mountain' }),
    C('bo', 'ボリビア', '🇧🇴', 'latin_america', 0.8, 1.5, { where: ['ラパス', 'サンタクルス'], names: ['Michi', 'Gato'], scene: 'mountain' }),

    /* ---------------- 西ヨーロッパ ---------------- */
    C('de', 'ドイツ', '🇩🇪', 'west_europe', 16, 6, {
      where: ['ベルリン', 'ミュンヘン', 'ハンブルク', 'ケルン'],
      names: ['Mia', 'Mimi', 'Kater', 'Luna', 'Flocke', 'Momo'],
      note: '室内飼いと、庭に出られる猫が半々。動物保護の意識が高い。',
      events: [
        '庭のハンモックの下で、鳥を観察するのが日課。',
        '冬のストーブの前を占領し、家族が寒がるのを無視する。',
        'Tierheim（保護施設）から、少しだけ臆病なまま迎えられる。'
      ]
    }),
    C('fr', 'フランス', '🇫🇷', 'west_europe', 15, 9, {
      where: ['パリ', 'リヨン', 'マルセイユ', 'ボルドー', 'ニース'],
      names: ['Minou', 'Chaton', 'Luna', 'Filou', 'Grisou', 'Moustache'],
      note: 'パリの猫はアパートの窓辺が定位置。地方では外飼いも多い。',
      events: [
        '窓辺から屋根の鳩を睨み、届かないことを知っている。',
        '近所のパン屋の店主に、毎朝クロワッサンの端をもらう。',
        '夏のバカンスに家族と車で南下し、別荘の庭を支配する。'
      ]
    }),
    C('gb', 'イギリス', '🇬🇧', 'west_europe', 12, 4, {
      where: ['ロンドン', 'エディンバラ', 'マンチェスター', 'コーンウォール'],
      names: ['Larry', 'Mog', 'Biscuit', 'Poppy', 'Alfie', 'Whiskers'],
      note: '動物愛護の法整備が進む国。猫はマイクロチップ登録が義務。',
      events: [
        '雨の庭から帰ってきて、足を拭かれるのをじっと我慢する。',
        '近所のパブの常連になり、店主からソーセージをもらう。',
        '首相官邸のネズミ捕獲長という公務に就く（＝激レア）。'
      ],
      specials: [{ key: 'chief_mouser', name: '首相官邸ネズミ捕獲長', rate: 0.00002, where: 'ロンドン・ダウニング街10番地' }]
    }),
    C('it', 'イタリア', '🇮🇹', 'west_europe', 10, 8, {
      where: ['ローマ', 'ミラノ', 'ナポリ', 'ヴェネツィア', 'フィレンツェ'],
      names: ['Micetto', 'Gatto', 'Luna', 'Fumo', 'Tigre', 'Pallina'],
      aff: { community: 2.6, street: 0.9, feral: 0.5 },
      note: 'ローマの遺跡は猫の保護区。法律で地域猫が守られている。',
      events: [
        '遺跡の石の上で、観光客のカメラに収まるのを待つ。',
        'ゴンドラの揺れをものともせず、桟橋で昼寝をする。',
        '地区の猫の面倒を見るおばあさんに、毎日名前を呼ばれる。'
      ]
    }),
    C('es', 'スペイン', '🇪🇸', 'west_europe', 6, 6, {
      where: ['マドリード', 'バルセロナ', 'セビリア', 'バレンシア'],
      names: ['Michi', 'Gato', 'Luna', 'Canela', 'Toby'],
      aff: { community: 2.0, street: 0.9, feral: 0.6 },
      note: '村の広場の猫は住民みんなの猫。シエスタは猫と一緒に。',
      events: [
        '昼下がりの広場で、日陰を求めてベンチを3回移動する。',
        'フェスティバルの夜、花火の音に驚いて木に登ったまま降りられなくなる。',
        '村のパン屋の裏口で、毎朝決まった時間に待つ。'
      ]
    }),
    C('pt', 'ポルトガル', '🇵🇹', 'west_europe', 1.5, 1, { where: ['リスボン', 'ポルト', 'ファロ'], names: ['Gato', 'Mimi', 'Fado'], note: '洗濯物の下で昼寝する、石畳の猫。' }),
    C('nl', 'オランダ', '🇳🇱', 'west_europe', 3, 1, { where: ['アムステルダム', 'ロッテルダム', 'ユトレヒト'], names: ['Minoes', 'Poes', 'Luna'] }),
    C('be', 'ベルギー', '🇧🇪', 'west_europe', 2, 1, { where: ['ブリュッセル', 'アントワープ', 'ゲント'], names: ['Minou', 'Luna'] }),
    C('at', 'オーストリア', '🇦🇹', 'west_europe', 1.8, 0.6, { where: ['ウィーン', 'ザルツブルク', 'グラーツ'], names: ['Mimi', 'Luna'], scene: 'mountain' }),
    C('ch', 'スイス', '🇨🇭', 'west_europe', 1.7, 0.4, { where: ['チューリッヒ', 'ベルン', 'ジュネーブ'], names: ['Mimi', 'Luna'], scene: 'mountain' }),
    C('ie', 'アイルランド', '🇮🇪', 'west_europe', 0.5, 0.3, { where: ['ダブリン', 'コーク'], names: ['Mog', 'Poppy'] }),
    C('mt', 'マルタ', '🇲🇹', 'west_europe', 0.15, 0.35, {
      where: ['バレッタ', 'スリーマ', 'ゴゾ島', 'メディナ'],
      names: ['Fenek', 'Zija', 'Pupa', 'Kikki'],
      scene: 'island', out: 'coast',
      aff: { community: 2.8, street: 1.0, feral: 0.6 },
      note: '人口と同じくらい猫がいる島。餌やりと健康管理はボランティア。',
      events: [
        '港の岩場で、漁師の投げる小魚を待つ。',
        '石畳の路地の日陰を、時間とともに移動する。',
        '観光客がくれたアイスのカップを、器用に舐める。'
      ]
    }),

    /* ---------------- 北ヨーロッパ ---------------- */
    C('se', 'スウェーデン', '🇸🇪', 'north_europe', 1.5, 0.5, { where: ['ストックホルム', 'ヨーテボリ'], names: ['Maja', 'Nalle', 'Sisu'] }),
    C('no', 'ノルウェー', '🇳🇴', 'north_europe', 0.8, 0.3, { where: ['オスロ', 'ベルゲン'], names: ['Nalle', 'Misse'], scene: 'snow_town' }),
    C('fi', 'フィンランド', '🇫🇮', 'north_europe', 0.8, 0.3, { where: ['ヘルシンキ', 'タンペレ'], names: ['Pilvi', 'Misse'], scene: 'snow_town' }),
    C('dk', 'デンマーク', '🇩🇰', 'north_europe', 0.7, 0.3, { where: ['コペンハーゲン', 'オーフス'], names: ['Misse', 'Luna'] }),

    /* ---------------- 東ヨーロッパ ---------------- */
    C('pl', 'ポーランド', '🇵🇱', 'east_europe', 6, 3, {
      where: ['ワルシャワ', 'クラクフ', 'グダンスク'],
      names: ['Kotek', 'Mruczek', 'Bury'],
      events: ['納屋の鼠取りは、家族の一員の仕事。', '冬の間、暖炉のそばの椅子を独占する。']
    }),
    C('hu', 'ハンガリー', '🇭🇺', 'east_europe', 1.5, 0.8, { where: ['ブダペスト', 'デブレツェン'], names: ['Cica', 'Kormos'] }),
    C('cz', 'チェコ', '🇨🇿', 'east_europe', 1.5, 0.5, { where: ['プラハ', 'ブルノ'], names: ['Micka', 'Kocour'] }),
    C('ro', 'ルーマニア', '🇷🇴', 'east_europe', 3, 3, { where: ['ブカレスト', 'クルージュ', 'ブラショフ'], names: ['Pisica', 'Moto'] }),
    C('ua', 'ウクライナ', '🇺🇦', 'east_europe', 4, 5, {
      where: ['キーウ', 'リビウ', 'オデーサ'], names: ['Kit', 'Murka', 'Sonechko'],
      events: ['地下シェルターにも猫は一緒に連れて行かれる。', '空襲警報のサイレンを聞くと、先に地下室へ降りていく。']
    }),
    C('ru', 'ロシア', '🇷🇺', 'east_europe', 20, 50, {
      where: ['モスクワ', 'サンクトペテルブルク', 'ノボシビルスク', 'ウラジオストク', 'カザン'],
      names: ['Barsik', 'Murka', 'Vasya', 'Pushok', 'Lapa', 'Tishka'],
      scene: 'room_warm', out: 'street_ru',
      note: '集合住宅の猫は冬を室内で越す。外の猫には−30℃の夜が来る。',
      events: [
        '地下道の暖気口で、たくさんの仲間と身を寄せ合って眠る。',
        '窓辺で雪を眺め、前足でガラスをそっと叩く。',
        '暖房のパイプの真上を確保し、そこから一歩も動かない冬。'
      ]
    }),
    C('kz', 'カザフスタン', '🇰🇿', 'east_europe', 1, 3, {
      where: ['アルマトイ', 'アスタナ'], names: ['Myshyk', 'Barsik'], scene: 'mountain', out: 'mountain'
    }),
    C('gr', 'ギリシャ', '🇬🇷', 'west_europe', 0.8, 1.5, {
      where: ['アテネ', 'テッサロニキ', 'サントリーニ', 'ミコノス'],
      names: ['Gatos', 'Nero', 'Psipsina', 'Aspro'],
      scene: 'island', out: 'coast',
      aff: { community: 2.6, street: 1.0, feral: 0.5 },
      note: '島の港町の猫は、漁師と観光客に支えられて暮らす。',
      events: [
        '港の岩場で、漁師の投げる小魚を待つ。',
        '白い家並みの路地で、日陰を求めて移動する。',
        'フェリーの桟橋に寝そべり、乗客に撫でられる。'
      ]
    }),
    C('hr', 'クロアチア', '🇭🇷', 'east_europe', 0.5, 0.5, { where: ['ザグレブ', 'スプリト', 'ドゥブロブニク'], names: ['Maca', 'Luna'], scene: 'coast', out: 'coast' }),
    C('rs', 'セルビア', '🇷🇸', 'east_europe', 1, 1, { where: ['ベオグラード', 'ノビサド'], names: ['Maca', 'Tigar'] }),
    C('bg', 'ブルガリア', '🇧🇬', 'east_europe', 1, 1.5, { where: ['ソフィア', 'プロヴディフ'], names: ['Kotka', 'Maca'] }),

    /* ---------------- 中東 ---------------- */
    C('tr', 'トルコ', '🇹🇷', 'middle_east', 8, 22, {
      where: ['イスタンブール', 'アンカラ', 'イズミル', 'アンタルヤ'],
      names: ['Pamuk', 'Şeker', 'Tekir', 'Bonbela', 'Gri', 'Minik'],
      scene: 'bazaar', out: 'street_tr',
      aff: { community: 3.2, street: 1.2, feral: 0.4 },
      note: '「キャスタンブール」。野良でも街全体が世話をする猫の都。',
      events: [
        'フェリーの席を当たり前のように確保し、海風に目を細める。',
        'カフェの椅子で寝ていても、誰にもどかされない。',
        '冬になると商店の前に毛布付きの箱が置かれ、そこが家になる。',
        '通りの餌やり係から毎日決まった時間にごはんをもらう。'
      ]
    }),
    C('ir', 'イラン', '🇮🇷', 'middle_east', 3, 9, { where: ['テヘラン', 'イスファハン', 'シーラーズ'], names: ['Pishi', 'Gorbe', 'Mishi'], out: 'street_eg' }),
    C('sa', 'サウジアラビア', '🇸🇦', 'middle_east', 0.6, 2, { where: ['リヤド', 'ジッダ', 'メッカ'], names: ['Biss', 'Mishmish', 'Lulu'], scene: 'desert', out: 'desert' }),
    C('ae', 'アラブ首長国連邦', '🇦🇪', 'middle_east', 0.4, 1.5, { where: ['ドバイ', 'アブダビ'], names: ['Lulu', 'Simba'], scene: 'desert', out: 'desert' }),
    C('il', 'イスラエル', '🇮🇱', 'middle_east', 1, 1, { where: ['テルアビブ', 'エルサレム', 'ハイファ'], names: ['Chatul', 'Luna'] }),

    /* ---------------- 北アフリカ ---------------- */
    C('eg', 'エジプト', '🇪🇬', 'north_africa', 3, 12, {
      where: ['カイロ', 'アレクサンドリア', 'ルクソール', 'アスワン'],
      names: ['Mishmish', 'Bastet', 'Simsim', 'Lulu', 'Zaki'],
      scene: 'bazaar', out: 'street_eg',
      note: '古代エジプトで神とされた猫の末裔。路地に猫があふれている。',
      events: [
        '市場の香辛料の袋の上で眠り、店主にどかされる。',
        'ナイルのほとりで、漁師の網の魚を狙う。',
        'ラマダンの夜、家族の食卓の下で静かに待つ。',
        '観光客の写真に毎日写り、勝手に有名になる。'
      ]
    }),
    C('ma', 'モロッコ', '🇲🇦', 'north_africa', 1.5, 7, {
      where: ['マラケシュ', 'フェズ', 'カサブランカ', 'シャウエン'],
      names: ['Mishmish', 'Zitoun', 'Beldi', 'Nora', 'Simo'],
      scene: 'bazaar', out: 'street_ma',
      aff: { community: 1.6, street: 1.3, feral: 0.8 },
      note: '路地の猫は、家猫になるのも野良でいるのも自分で決める。',
      events: [
        '青い壁の路地で、観光客の足を縫うように歩く。',
        'スークの魚屋の前で、丸くなって3時間動かない。',
        '屋上のハンモックの下で、猫の集会のような夜を過ごす。'
      ]
    }),
    C('dz', 'アルジェリア', '🇩🇿', 'north_africa', 2, 6, { where: ['アルジェ', 'オラン', 'コンスタンティーヌ'], names: ['Mishmish', 'Nora'], scene: 'bazaar', out: 'street_ma' }),
    C('tn', 'チュニジア', '🇹🇳', 'north_africa', 0.7, 2.5, { where: ['チュニス', 'スース'], names: ['Mishmish', 'Lulu'], scene: 'bazaar', out: 'street_ma' }),
    C('ly', 'リビア', '🇱🇾', 'north_africa', 0.4, 2, { where: ['トリポリ', 'ベンガジ'], names: ['Mishmish'], scene: 'desert', out: 'desert' }),

    /* ---------------- サハラ以南アフリカ ---------------- */
    C('ng', 'ナイジェリア', '🇳🇬', 'sub_saharan', 3, 6, { where: ['ラゴス', 'アブジャ', 'カノ'], names: ['Paka', 'Simba', 'Maua'] }),
    C('ke', 'ケニア', '🇰🇪', 'sub_saharan', 1.5, 4, {
      where: ['ナイロビ', 'モンバサ', 'ナクル'], names: ['Paka', 'Simba', 'Maua'],
      events: ['サバンナの縁の村で、夜じゅう鼠と格闘する。', '観光車の列を、木の上から眺める。']
    }),
    C('za', '南アフリカ', '🇿🇦', 'sub_saharan', 3, 5, { where: ['ケープタウン', 'ヨハネスブルグ', 'ダーバン'], names: ['Tigger', 'Socks', 'Mielie'], out: 'street_br', note: '港町の猫は、テーブルマウンテンの風の中で暮らす。' }),
    C('et', 'エチオピア', '🇪🇹', 'sub_saharan', 1, 3, { where: ['アディスアベバ', 'ゴンダール'], names: ['Doro', 'Simba'], scene: 'mountain', out: 'village' }),
    C('gh', 'ガーナ', '🇬🇭', 'sub_saharan', 1, 3, { where: ['アクラ', 'クマシ'], names: ['Paka', 'Maua'] }),
    C('tz', 'タンザニア', '🇹🇿', 'sub_saharan', 1, 3, { where: ['ダルエスサラーム', 'アルーシャ', 'ザンジバル'], names: ['Paka', 'Simba'], scene: 'village', out: 'savanna' }),
    C('ug', 'ウガンダ', '🇺🇬', 'sub_saharan', 0.7, 2, { where: ['カンパラ', 'エンテベ'], names: ['Paka', 'Simba'], scene: 'village' }),
    C('sn', 'セネガル', '🇸🇳', 'sub_saharan', 0.5, 2, { where: ['ダカール', 'サンルイ'], names: ['Paka', 'Maua'], scene: 'bazaar', out: 'street_br' }),

    /* ---------------- 南アジア ---------------- */
    C('in', 'インド', '🇮🇳', 'south_asia', 8, 65, {
      where: ['デリー', 'ムンバイ', 'コルカタ', 'チェンナイ', 'ジャイプル'],
      names: ['Billi', 'Chotu', 'Rani', 'Kalu', 'Moti', 'Chai'],
      note: '寺院や市場の猫は地域に守られる。そこら中に猫がいる。',
      events: [
        '寺院の石段に寝そべり、参拝者の頭を踏み台にする。',
        '屋台のミルクを分けてもらい、そのまま看板猫になる。',
        'モンスーンの雨宿りで、市場の段ボールに親子で避難する。'
      ]
    }),
    C('pk', 'パキスタン', '🇵🇰', 'south_asia', 1.5, 7, { where: ['カラチ', 'ラホール', 'イスラマバード'], names: ['Billi', 'Chotu'] }),
    C('bd', 'バングラデシュ', '🇧🇩', 'south_asia', 1, 6, { where: ['ダッカ', 'チッタゴン'], names: ['Billi', 'Moti'] }),
    C('np', 'ネパール', '🇳🇵', 'south_asia', 0.8, 3, {
      where: ['カトマンズ', 'ポカラ'], names: ['Biralo', 'Kalu', 'Maya'],
      events: ['寺院の鐘の下で、犬と並んで眠る。', 'ヒマラヤの麓の寒夜、毛布の端を奪い合う。'],
      scene: 'temple', out: 'mountain'
    }),
    C('lk', 'スリランカ', '🇱🇰', 'south_asia', 0.6, 2, { where: ['コロンボ', 'キャンディ', 'ゴール'], names: ['Bala', 'Kalu'] }),

    /* ---------------- 東南アジア ---------------- */
    C('id', 'インドネシア', '🇮🇩', 'southeast_asia', 8, 35, {
      where: ['ジャカルタ', 'バリ島', 'スラバヤ', 'ジョグジャカルタ'],
      names: ['Si Belang', 'Mpus', 'Ucil', 'Kiko', 'Manis'],
      note: 'バリ島の猫は寺院にも市場にもいる。野良の数も多い。',
      events: [
        '寺院の供え物を狙って、祭りの日だけ神妙な顔で座る。',
        'バイクのエンジン音を聞き分け、自分の家のバイクだけに反応する。',
        '雨季の軒先で、毎晩同じ場所に帰ってくる。'
      ]
    }),
    C('th', 'タイ', '🇹🇭', 'southeast_asia', 4, 9, {
      where: ['バンコク', 'チェンマイ', 'アユタヤ', 'プーケット'],
      names: ['Manee', 'Si Da', 'Khao', 'Ploy', 'Thong'],
      note: '寺院の猫は功徳を積む存在。シャムのふるさとでもある。',
      events: [
        '寺院の日陰を探し、坊さんの読経のあいだ眠る。',
        'ナイトマーケットの屋台の下を、焼き魚の匂いを追って移動する。',
        '雨季の洪水で、高いところへ荷物と一緒に避難する。'
      ]
    }),
    C('vn', 'ベトナム', '🇻🇳', 'southeast_asia', 3, 10, {
      where: ['ハノイ', 'ホーチミン', 'ホイアン', 'ダナン'],
      names: ['Mèo', 'Mun', 'Bông', 'Vàng', 'Tép'],
      note: '旧市街の屋根の猫は観光名物。路上の猫も多い。',
      events: [
        '旧市街の屋根を渡り歩き、一番いい日陰を確保する。',
        'バイクの波を、信号も見ずに渡りきる。',
        '屋台のおばちゃんの膝で、昼の3時間を眠る。'
      ]
    }),
    C('ph', 'フィリピン', '🇵🇭', 'southeast_asia', 3, 12, {
      where: ['マニラ', 'セブ', 'ダバオ', 'バギオ'],
      names: ['Pusa', 'Muning', 'Tiger', 'Bantay', 'Ming'],
      note: '路上の猫が多く、台風の季節はとくに厳しい。',
      events: [
        'ジプニーの屋根の上で、風を受けて眠る。',
        '台風の前、商店の軒下にいち早く避難する。',
        '市場の魚の切れ端で、きょうだいと分け合う。'
      ]
    }),
    C('my', 'マレーシア', '🇲🇾', 'southeast_asia', 1.5, 4, { where: ['クアラルンプール', 'ペナン', 'コタキナバル'], names: ['Kucing', 'Manis', 'Hitam'] }),
    C('sg', 'シンガポール', '🇸🇬', 'southeast_asia', 0.4, 2, { where: ['シンガポール'], names: ['Kucing', 'Mimi'], scene: 'room_modern', out: 'street_asia' }),
    C('mm', 'ミャンマー', '🇲🇲', 'southeast_asia', 1, 3, { where: ['ヤンゴン', 'マンダレー', 'バガン'], names: ['Kyaung', 'Mimi'], scene: 'temple' }),
    C('kh', 'カンボジア', '🇰🇭', 'southeast_asia', 0.8, 2, { where: ['プノンペン', 'シェムリアップ'], names: ['Chhma', 'Mimi'], scene: 'temple' }),

    /* ---------------- 東アジア ---------------- */
    C('cn', '中国', '🇨🇳', 'east_asia', 60, 110, {
      where: ['北京', '上海', '広州', '成都', '深圳', '重慶'],
      names: ['小白', '咪咪', '大橘', '点点', '花花', '坦克', '豆豆'],
      note: '都市部は高層マンション猫が急増。農村では鼠取りの相棒。',
      events: [
        '高層マンションの窓から街を見下ろし、配達ロボットを観察する。',
        '市場の魚屋の足元で、落ちてくる身を1日中待つ。',
        'キャットカフェの看板猫に抜擢され、SNSで一気にバズる。'
      ]
    }),
    C('jp', '日本', '🇯🇵', 'east_asia', 9.5, 4, {
      where: ['東京', '大阪', '名古屋', '札幌', '福岡', '沖縄・那覇', '京都', '仙台', '広島', '静岡', '猫島・田代島', '猫島・青島'],
      names: ['ミケ', 'タマ', 'モモ', 'クロ', 'ソラ', 'むぎ', 'こむぎ', 'トラ', 'シロ', 'ナナ', 'レオ', 'さくら', '茶々', 'トト', 'ルナ'],
      scene: 'room_warm', out: 'alley_jp',
      aff: { community: 2.4, street: 0.7, feral: 0.3 },
      note: '完全室内飼いが主流で平均寿命は約16歳。いっぽう野良の寿命は3〜5年。',
      events: [
        'こたつの中で丸くなり、家族の足音がしたら即座に居場所を確保する。',
        'キャットタワーの最上段を巡って、上の階の先住猫と冷戦が続く。',
        '地震の夜、家具の隙間に潜り込んで朝まで出てこなかった。',
        '保護猫カフェの「お見合い」で、あっさり人を選ぶ。',
        'ベランダ越しに隣の家の猫と毎朝あいさつするのが日課になる。'
      ]
    }),
    C('kr', '韓国', '🇰🇷', 'east_asia', 3, 3.5, {
      where: ['ソウル', '釜山', '仁川', '大邱'],
      names: ['나비', '보리', '치즈', '콩이', '호두'],
      note: 'アパートの猫が増加中。地域猫の世話も定着してきた。',
      events: [
        '高層アパートの窓から、向かいの棟の猫と見つめ合う。',
        '冬の路上で、地域の人が置いた段ボールハウスを見つける。',
        '猫カフェの看板猫として、毎日同じ席で寝る。'
      ]
    }),
    C('tw', '台湾', '🇹🇼', 'east_asia', 1.4, 0.8, {
      where: ['台北', '台中', '台南', '猴硐（猫村）', '高雄'],
      names: ['咪咪', '小黑', '橘子', '阿肥', '圓圓'],
      note: '猴硐は猫の村。観光客と猫が共存する有名スポット。',
      out: 'village_tw',
      events: [
        '猫村の階段に並んで座り、観光客の写真に収まる。',
        '夜市の屋台の匂いに誘われ、人の足の間をすり抜ける。',
        '台風の夜、商店のシャッターの隙間で雨をしのぐ。'
      ]
    }),
    C('mn', 'モンゴル', '🇲🇳', 'east_asia', 0.2, 0.8, { where: ['ウランバートル', 'カラコルム'], names: ['Muukhai', 'Mimi'], scene: 'village', out: 'mountain' }),

    /* ---------------- オセアニア ---------------- */
    C('au', 'オーストラリア', '🇦🇺', 'oceania', 5, 9, {
      where: ['シドニー', 'メルボルン', 'パース', 'アリススプリングス', 'タスマニア'],
      names: ['Mittens', 'Banjo', 'Matilda', 'Bluey', 'Sooty'],
      out: 'outback',
      aff: { community: 0.6, street: 0.6, feral: 2.6 },
      note: '野生化猫は在来種の脅威。いちばん厳しい立場に置かれている。',
      events: [
        '乾いた大地を何十kmも歩き、水場の匂いだけで方角を決める。',
        '保護区の柵の内側に入れず、夜ごと外側を歩き回る。',
        '庭に出た瞬間、ヘビと鉢合わせして1週間庭に出なくなる。'
      ]
    }),
    C('nz', 'ニュージーランド', '🇳🇿', 'oceania', 0.9, 1.5, {
      where: ['オークランド', 'ウェリントン', 'クイーンズタウン'],
      names: ['Kiwi', 'Molly', 'Pipi'],
      aff: { community: 0.7, street: 0.6, feral: 1.8 },
      note: '鳥の国では、外に出る猫は少しだけ肩身が狭い。'
    }),
    C('fj', 'フィジー', '🇫🇯', 'oceania', 0.1, 0.3, { where: ['スバ', 'ナンディ'], names: ['Pusi', 'Mimi'], scene: 'island', out: 'coast', aff: { community: 1.0, street: 1.0, feral: 1.0 } })
  ];

  root.CAT_COUNTRIES = COUNTRIES;
})(typeof globalThis !== 'undefined' ? globalThis : this);
