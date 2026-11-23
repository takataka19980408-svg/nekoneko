"""世界猫生ガチャ — 検証スクリプト
1) 10,000回の抽選シミュレーション（例外・分布・寿命・整合性）
2) 猫生ストーリー（寿命に応じた歩数・季節・2択・拾われる）の検査
3) 全アセット（13タイプ×子猫/成猫のPNG）とマッピング網羅性のチェック
4) データ網羅性のチェック（純血種・野生ネコ科・国）
5) 誕生画面の珍しさ表示・常時名札（境遇更新）の検査

ボリューム目標：1x=3.8秒/歩で、15歳の猫生（約52歩）が約3分20秒＋2択の時間。

Node.js が無い環境のため quickjs（Python埋め込みJSエンジン）で
実ファイル js/*.js をそのまま読み込んで実行する。
ブラウザで動くコードと同一のものを検証している。
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import quickjs
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
JS_FILES = [
    "js/data-core.js", "js/breeds.js", "js/wild.js", "js/data-countries.js", "js/events.js",
    "js/data.js", "js/engine.js", "js/catart.js", "js/catcard.js", "js/sound.js", "js/app.js",
]
N = 10000
SEED = 20261123

failures = []


def check(cond, msg):
    if not cond:
        failures.append(msg)
        print("  [NG] " + msg)
    return cond


def build_ctx():
    ctx = quickjs.Context()
    ctx.eval("var window = globalThis; var localStorage = undefined;")
    for f in JS_FILES:
        src = (ROOT / f).read_text(encoding="utf-8")
        try:
            ctx.eval(src)
        except Exception as e:  # noqa: BLE001
            print(f"[NG] {f} の読み込みでエラー: {e}")
            sys.exit(1)
    return ctx


def run(ctx):
    ctx.set("_N", N)
    ctx.set("_SEED", SEED)
    return ctx.eval("""
(function(){
  function actorOk(html) {
    var x = String(html || '');
    return x.indexOf('src="assets/cats/') >= 0
      && (x.indexOf('-kitten.png') >= 0 || x.indexOf('-adult.png') >= 0)
      && x.indexOf('collarBadge') >= 0 && x.indexOf('undefined') < 0 && x.indexOf('NaN') < 0;
  }
  var out = {cats: [], assetErrors: [], errors: 0};
  var seed = _SEED;
  for (var i = 0; i < _N; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    try {
      var c = CATGACHA.rollCat(seed);
      var actor = CATART.actorHTML(c, {stage: 'kitten'});
      if (!actorOk(actor)) out.assetErrors.push({i: i, name: c.speciesName});
      var story = c.story;
      var stageOk = ['kitten', 'adult', 'senior'].map(function(st){ return actorOk(CATART.actorHTML(c, {stage: st})); });
      var deathActor = actorOk(CATART.actorHTML(c, {stage: story[story.length-1].stage}));
      var html = CATAPP.buildResultHTML(c);
      var fin = CATAPP.buildFinaleHTML(c);
      var s0 = CATART.statsFor(c, 0);
      var sLast = CATART.statsFor(c, story.length - 1);
      var pts = CATGACHA.rarityPoints(c);
      var np0 = CATAPP.nameplateHTML(c, 0);
      var npLast = CATAPP.nameplateHTML(c, story.length - 1);
      var st0 = CATGACHA.statusOf(c, 0);
      var stA = c.adoptIndex == null ? null : CATGACHA.statusOf(c, c.adoptIndex);
      var stB = c.adoptIndex == null ? null : CATGACHA.statusOf(c, c.adoptIndex - 1);
      var firstChoice = -1;
      story.forEach(function(s, i){ if (firstChoice < 0 && s.choice) firstChoice = i; });
      var choiceCard = firstChoice < 0 ? '' : CATAPP.buildStepHTML(c, firstChoice, {});
      var midIdx = Math.min(3, story.length - 1);
      var midCard = CATAPP.buildStepHTML(c, midIdx, {});
      out.cats.push({
        klass: c.klass, route: c.route, country: c.region.bucket, regionName: c.region.name,
        speciesKey: c.speciesKey, speciesName: c.speciesName, speciesGroup: c.speciesGroup || null,
        status: c.statusLabel, age: c.ageYears, rarity: c.rarity, prob: c.probability,
        pop: c.population, sex: c.sex, mutations: c.mutations.map(function(m){return m.key;}),
        special: c.special ? c.special.key : null,
        iucn: c.species && c.species.iucn ? c.species.iucn : null,
        tlCount: c.timeline.length, tlLastKind: c.timeline[c.timeline.length-1].kind,
        tlAsc: c.timeline.every(function(e,idx,arr){ return idx === 0 || e.age >= arr[idx-1].age; }),
        hasCaption: !!c.caption, name: c.name, ageLabel: c.ageLabel,
        htmlOk: !/undefined|NaN/.test(html), cause: c.deathCause,
        storyLen: story.length,
        storyKinds: story.map(function(s){ return s.kind; }),
        storyAges: story.map(function(s){ return s.age; }),
        storyStages: story.map(function(s){ return s.stage; }),
        storyTitles: story.every(function(s){ return !!s.title; }),
        storyTexts: story.every(function(s){ return !!s.text; }),
        eventTexts: story.filter(function(s){ return s.kind === 'event' || s.kind === 'adopt'; }).map(function(s){ return s.text; }),
        stageOk2: story.every(function(s){
          var a = s.kind === 'birth' ? 0 : s.age;
          return s.stage === CATGACHA.stageForAge(a);
        }),
        birthAge: story[0].age,
        deathAge: story[story.length-1].age,
        choices: story.filter(function(s){ return !!s.choice; }).map(function(s){
          return {q: s.choice.question, n: s.choice.options.length,
                  ok: s.choice.options.every(function(o){ return !!o.label && !!o.text; })};
        }),
        birthHtml: html,
        finaleHtml: fin,
        finaleOk: !/undefined|NaN/.test(fin) && fin.indexOf('享年') >= 0,
        birthNoAge: html.indexOf('享年') < 0,
        stageActors: stageOk.every(function(x){ return x; }),
        deathActor: deathActor,
        actorOk: actorOk(actor),
        artType: CATART.typeFor(c),
        assetK: CATART.assetPath(c, 'kitten'),
        assetA: CATART.assetPath(c, 'adult'),
        scene0: CATART.sceneKeyFor(c, 0),
        sceneLast: CATART.sceneKeyFor(c, story.length - 1),
        adopted: c.adoptIndex != null,
        shelterBorn: !!c.shelterBorn,
        nekomata: !!c.nekomata,
        maneki: !!c.maneki,
        lifeBonus: c.lifeBonus || 0,
        milestones: CATGACHA.milestonesPassed(c.ageYears).map(function(m){ return m.key; }),
        statsEveryStep: story.every(function(st){ return st.stats && st.stats.energy >= 0 && st.stats.energy <= 100 && st.stats.food >= 0 && st.stats.food <= 100 && st.stats.luck >= 0 && st.stats.luck <= 100; }),
        fateChoices: story.filter(function(st){ return st.choice && st.choice.tier === 'fate'; }).length,
        effectCount: story.filter(function(st){ return st.choice; }).reduce(function(a, st){
          return a + st.choice.options.filter(function(o){ return o.effect && Object.keys(o.effect).length; }).length;
        }, 0),
        adoptIndex: c.adoptIndex == null ? null : c.adoptIndex,
        adoptOk: (c.adoptIndex == null) ? true : (
          story[c.adoptIndex] && story[c.adoptIndex].kind === 'adopt' &&
          (CATART.sceneKeyFor(c, c.adoptIndex) === 'home' || CATART.sceneKeyFor(c, c.adoptIndex) === 'shop') &&
          (c.route === 'owned' || CATART.sceneKeyFor(c, c.adoptIndex - 1) !== 'home')
        ),
        adoptBeforeDeath: (c.adoptIndex == null) ? true : (c.adoptIndex < story.length - 1),
        statsOk: [0, 1, 2, 3, 4, 5, 6].every(function(k){
          if (k >= story.length) return true;
          var s = CATART.statsFor(c, k);
          return s.energy >= 0 && s.energy <= 100 && s.food >= 0 && s.food <= 100 && s.luck >= 0 && s.luck <= 100;
        }),
        statDelta: Math.abs(sLast.energy - s0.energy) + Math.abs(sLast.food - s0.food) + Math.abs(sLast.luck - s0.luck),
        statsHTML: CATART.statsHTML(c, Math.min(2, story.length - 1)),
        particleCount: (CATART.particlesHTML(c, 0, false).match(/<span/g) || []).length,
        bubbleText: CATART.bubbleFor(c.seed, 1).text,
        hasAdoptCollar: actor.indexOf('collar is-on') >= 0,
        /* 誕生画面の「珍しさアピール」と常時名札 */
        rarePoints: pts,
        rareOk: pts.length >= 2 && pts.every(function(t){
          return typeof t === 'string' && t.length > 3 && t.indexOf('undefined') < 0 && t.indexOf('NaN') < 0;
        }),
        np0: np0, npLast: npLast,
        npOk: np0.length > 60 && np0.indexOf('undefined') < 0 && np0.indexOf('NaN') < 0
          && np0.indexOf(CATGACHA.formatOneIn(c.probability)) >= 0
          && np0.indexOf(c.speciesName) >= 0
          && (c.klass === 'wild' || np0.indexOf(c.region.name) >= 0),
        npLastOk: npLast.length > 60 && npLast.indexOf('undefined') < 0 && npLast.indexOf('NaN') < 0
          && npLast.indexOf(CATGACHA.statusOf(c, story.length - 1).text) >= 0,
        status0: st0.text, statusTone: st0.tone,
        statusBeforeAdopt: stB ? stB.text : null,
        statusAdopt: stA ? stA.text : null,
        birthCardOk: html.indexOf('珍しいポイント') >= 0 && html.indexOf('地球約10億匹中') >= 0
          && html.indexOf('分の1') >= 0 && html.indexOf('仲間は') >= 0
          && html.indexOf('国・地域') >= 0 && html.indexOf('目の色') >= 0 && html.indexOf('境遇') >= 0,
        seasonOk: story.every(function(s){ return ['spring','summer','autumn','winter'].indexOf(s.season) >= 0; }),
        seasonSet: (function(){ var o = {}; story.forEach(function(s){ o[s.season] = 1; }); return Object.keys(o); })(),
        stepTexts: story.map(function(s){ return s.text; }),
        /* 寿命（総歩数）を漏らさない表示 */
        noTotal: html.indexOf('page-no') < 0 && !/\d+\s*\/\s*\d+/.test(html)
          && midCard.indexOf('page-no') < 0 && !/\d+\s*\/\s*\d+/.test(midCard),
        progressText: CATAPP.progressHTML(c, 3),
        choiceCardOk: firstChoice < 0 ? true : (choiceCard.indexOf('choiceClock') >= 0 && choiceCard.indexOf('choiceClockText') >= 0)
      });
    } catch (e) {
      out.errors++;
      out.lastError = String(e && e.stack || e);
    }
  }
  var D = CATGACHA_DATA;
  var coverage = [];
  D.COATS.forEach(function(c){ coverage.push({key: 'coat:'+c.key, type: CATART.typeFor({klass:'domestic', speciesKey:'coat:'+c.key, pattern: c})}); });
  D.BREEDS.forEach(function(b){ coverage.push({key: 'breed:'+b.key, type: CATART.typeFor({klass:'domestic', speciesKey:'breed:'+b.key, pattern: b})}); });
  D.WILD.forEach(function(w){ coverage.push({key: 'wild:'+w.key, type: CATART.typeFor({klass:'wild', species: w})}); });
  out.meta = {
    coats: D.COATS.length, breeds: D.BREEDS.length, wild: D.WILD.length,
    countries: D.COUNTRIES.length, mutations: D.MUTATIONS.length,
    targets: CATAPP.TOTAL_TARGETS,
    speciesCatalog: CATAPP.CATALOG.species.length,
    types: CATART.TYPES,
    coverage: coverage,
    wildMissingCountry: D.WILD.filter(function(w){ return !w.countries || !w.countries.length || !w.countries.every(function(k){ return D.COUNTRIES.some(function(c){return c.key===k;}); }); }).map(function(w){return w.key;}),
    countryBad: D.COUNTRIES.filter(function(c){ return !c.where || !c.where.length || !c.names || !c.names.length || !c.region; }).map(function(c){return c.key;}),
    dupKeys: (function(){
      function dups(a){var s={},d=[];a.forEach(function(x){if(s[x])d.push(x);s[x]=1});return d;}
      return dups(D.BREEDS.map(function(b){return b.key;})).concat(dups(D.WILD.map(function(w){return w.key;})).concat(dups(D.COUNTRIES.map(function(c){return c.key;}))));
    })(),
    shareSums: [
      +D.COUNTRIES.reduce(function(a,c){return a+c.ownedW;},0).toFixed(6),
      +D.COUNTRIES.reduce(function(a,c){return a+c.strayW;},0).toFixed(6),
      +D.BREEDS.reduce(function(a,b){return a+b.share;},0).toFixed(6),
      +D.WILD.reduce(function(a,b){return a+b.share;},0).toFixed(6)
    ]
  };
  return JSON.stringify(out);
})()
""")


def pct(n, d):
    return f"{n / d * 100:.2f}%"


def main():
    ctx = build_ctx()
    data = json.loads(run(ctx))
    cats = data["cats"]
    meta = data["meta"]
    n = len(cats)

    print("=== 世界猫生ガチャ 検証 ===")
    print(f"シミュレーション {n:,} 回 / seed={SEED}")
    print(f"例外: {data['errors']} 件   アセット不備: {len(data['assetErrors'])} 件")
    check(data["errors"] == 0, f"抽選中の例外 {data['errors']} 件")
    if data["errors"]:
        print("   last:", data.get("lastError", "")[:400])
    check(not data["assetErrors"], f"アセットHTMLの崩れ {len(data['assetErrors'])} 件")

    # ---- 画像アセット（13タイプ×子猫/成猫） ----
    print("\n--- 画像アセット ---")
    types = meta["types"]
    print(f"  タイプ {len(types)} 種: {' / '.join(types)}")
    missing_assets = []
    total_bytes = 0
    for t in types:
        for st in ("kitten", "adult"):
            p = ROOT / "assets" / "cats" / f"{t}-{st}.png"
            if not p.exists() or p.stat().st_size < 2000:
                missing_assets.append(f"{t}-{st}.png")
            else:
                total_bytes += p.stat().st_size
    print(f"  画像ファイル: {len(types) * 2 - len(missing_assets)}/{len(types) * 2} 枚 / 合計 {total_bytes/1024/1024:.2f}MB")
    check(not missing_assets, f"画像アセットが欠けている: {missing_assets}")
    # 1回の猫生で読み込むのは 2枚（子猫+成猫）だけ。総量は6MB、1枚300KB以内を上限とする
    check(total_bytes < 6 * 1024 * 1024, "画像アセットが重すぎる（合計6MB超）")
    heavy = [f"{t}-{st}" for t in types for st in ("kitten", "adult")
             if (ROOT / "assets" / "cats" / f"{t}-{st}.png").exists()
             and (ROOT / "assets" / "cats" / f"{t}-{st}.png").stat().st_size > 300 * 1024]
    check(not heavy, f"1枚が重すぎるPNG: {heavy}")

    # ---- 透過の検査（「透明な猫」バグの再発防止） ----
    sys.path.insert(0, str(ROOT / "tools"))
    import check_assets  # noqa: E402
    print("\n--- 透過の検査 ---")
    print("  全26枚: 512x512 RGBA / 体の内側に抜けは無いか / 内側は alpha=255 か")
    bad_alpha = []
    covers = []
    for p in check_assets.expected_files(str(ROOT)):
        ok, msg, info = check_assets.check_image(p)
        covers.append(info["cover"])
        if not ok:
            bad_alpha.append(f"{Path(p).name}: {msg}")
    print(f"  不透明部分の割合: 最小 {min(covers):.2f} / 最大 {max(covers):.2f}")
    check(not bad_alpha, f"透過/サイズの異常: {bad_alpha}")

    # ---- 首輪の位置（全26枚で首元に乗っているか） ----
    print("\n--- 首輪の位置 ---")
    collar = json.loads(ctx.eval("JSON.stringify(CATART.COLLAR)"))
    keys = [f"{t}-{st}" for t in types for st in ("kitten", "adult")]
    missing_c = [k for k in keys if k not in collar]
    print(f"  座標マップ: {len(collar)}/{len(keys)} 枚ぶん")
    check(not missing_c, f"首輪座標マップに欠け: {missing_c}")
    check(len(collar) == len(keys), "首輪座標マップに余分なキーがある")
    band_off = []
    for k in keys:
        c = collar.get(k)
        if not c:
            continue
        a = np.asarray(Image.open(ROOT / "assets" / "cats" / f"{k}.png").convert("RGBA"))[:, :, 3]
        W = a.shape[1]
        w = c["w"] / 100 * W
        bh = w * 52 / 120            # 首輪SVGの縦横比
        cx = c["x"] / 100 * W
        cy = c["y"] / 100 * a.shape[0]
        pts = {
            "左端": (cx - 0.36 * w, cy - 0.269 * bh),
            "右端": (cx + 0.36 * w, cy - 0.269 * bh),
            "帯": (cx, cy + 0.135 * bh),
            "鈴": (cx, cy + 0.269 * bh),
        }
        for name, (px, py) in pts.items():
            xi, yi = int(round(px)), int(round(py))
            if not (0 <= xi < W and 0 <= yi < a.shape[0]) or a[yi, xi] < 128:
                band_off.append(f"{k}:{name}")
    print(f"  帯の左右端・中央・鈴が猫の体の上にある: {'OK' if not band_off else 'NG'}")
    check(not band_off, f"首輪が体から外れている: {band_off}")
    sample_actor = ctx.eval("(function(){var c=CATGACHA.rollCat(1); return CATART.actorHTML(c,{stage:'kitten'});})()")
    check("--collar-x:" in sample_actor and "--collar-w:" in sample_actor,
          "アクターHTMLに首輪の座標変数が入っていない")
    kv = ctx.eval("JSON.stringify([CATART.collarVars('black','kitten'), CATART.collarVars('black','adult')])")
    kk = json.loads(kv)
    check(kk[0] != kk[1], "首輪の座標が子猫/成猫で切り替わらない")

    # マッピング網羅性
    cov = meta["coverage"]
    bad_cov = [c for c in cov if c["type"] not in types]
    counts = Counter(c["type"] for c in cov)
    print(f"  マッピング: {len(cov)} 種 → {len(counts)} タイプにすべて紐づく")
    print("    " + " / ".join(f"{k}:{v}" for k, v in sorted(counts.items())))
    check(not bad_cov, f"未知タイプへのマッピング: {bad_cov[:5]}")
    check(len(cov) == meta["coats"] + meta["breeds"] + meta["wild"], "マッピング対象数が図鑑の種数と不一致")

    # ---- データ網羅性 ----
    print("\n--- データ網羅性 ---")
    print(f"  雑種の毛並み : {meta['coats']:3d} 種")
    print(f"  純血種       : {meta['breeds']:3d} 種  [要件 60〜70+]")
    print(f"  野生のネコ科 : {meta['wild']:3d} 種  [要件 41全種＋亜種]")
    print(f"  国・地域     : {meta['countries']:3d} カ国 [要件 60〜80]")
    print(f"  激レア変異   : {meta['mutations']:3d} 種")
    print(f"  図鑑の総目標 : {meta['targets']:3d}（種別 {meta['speciesCatalog']} + 国 {meta['countries']} + 変異 {meta['mutations']}）")
    check(meta["breeds"] >= 60, "純血種が60種未満")
    check(meta["wild"] >= 41, "野生ネコ科が41種未満")
    check(meta["countries"] >= 60, "国が60カ国未満")
    check(not meta["dupKeys"], f"キーの重複: {meta['dupKeys']}")
    check(not meta["wildMissingCountry"], f"生息国が未定義の野生種: {meta['wildMissingCountry']}")
    check(not meta["countryBad"], f"国データの欠損: {meta['countryBad']}")
    print(f"  重みの合計   : 飼い猫 {meta['shareSums'][0]} / 外猫 {meta['shareSums'][1]} / 純血 {meta['shareSums'][2]} / 野生 {meta['shareSums'][3]}")
    check(all(abs(s - 1.0) < 1e-6 for s in meta["shareSums"]), "重みの正規化に失敗")

    # ---- 構成比 ----
    klass = Counter(c["klass"] for c in cats)
    print("\n--- 全体構成 ---")
    print(f"イエネコ  : {klass['domestic']:5d} ({pct(klass['domestic'], n)})  [目標 約99%]")
    print(f"野生ネコ科: {klass['wild']:5d} ({pct(klass['wild'], n)})  [目標 約1%]")
    dom = [c for c in cats if c["klass"] == "domestic"]
    owned = sum(1 for c in dom if c["route"] in ("owned", "purebred"))
    stray = len(dom) - owned
    print(f"  飼い猫  : {owned:5d} ({pct(owned, len(dom))} of イエネコ)  [目標 約40%]")
    print(f"  外猫    : {stray:5d} ({pct(stray, len(dom))} of イエネコ)  [目標 約59〜60%]")
    check(0.975 <= klass["domestic"] / n <= 0.995, "イエネコ比率が範囲外")
    check(0.36 <= owned / len(dom) <= 0.44, "飼い猫比率が範囲外")

    print("\n--- ルート別 ---")
    for k, v in sorted(Counter(c["route"] for c in cats).items(), key=lambda x: -x[1]):
        print(f"  {k:10s} {v:5d} ({pct(v, n)})")

    # ---- 出現カバレッジ ----
    seen_sp = len(set(c["speciesKey"] for c in cats))
    seen_co = len(set(c["country"] for c in cats))
    print("\n--- 1万回での出現カバレッジ ---")
    print(f"  種別: {seen_sp}/{meta['speciesCatalog']}  国: {seen_co}/{meta['countries']}")
    wild_seen = Counter(c["speciesName"] for c in cats if c["klass"] == "wild")
    print(f"  野生のネコ科の出現: {len(wild_seen)}種 / {sum(wild_seen.values())}回")
    for k, v in wild_seen.most_common(8):
        print(f"    {k:16s} {v}")

    print("\n--- 国・地域 (上位12) ---")
    for k, v in Counter(c["regionName"] for c in cats).most_common(12):
        print(f"  {k:16s} {v:5d} ({pct(v, n)})")

    # ---- 寿命 ----
    print("\n--- 寿命分布 ---")
    ages = sorted(c["age"] for c in cats)
    mean = sum(ages) / n
    med = (ages[n // 2 - 1] + ages[n // 2]) / 2
    print(f"  平均 {mean:.2f}歳 / 中央値 {med:.1f}歳 / 最短 {ages[0]:.2f} / 最長 {ages[-1]:.1f}")
    for lo, hi, label in [(0, 1, "0〜1歳"), (1, 3, "1〜3歳"), (3, 8, "3〜8歳"),
                          (8, 15, "8〜15歳"), (15, 20, "15〜20歳"), (20, 99, "20歳超")]:
        cnt = sum(1 for a in ages if lo <= a < hi)
        print(f"  {label:8s} {cnt:5d} ({pct(cnt, n)})")
    early = sum(1 for a in ages if a < 1)
    long15 = sum(1 for a in ages if a >= 15)
    long20 = sum(1 for a in ages if a >= 20)
    check(0.12 <= early / n <= 0.32, "1歳未満死亡の比率が想定外 (12〜32%)")
    check(long15 > 0 and long20 > 0, "15歳超/20歳超の長寿個体が出ていない")
    check(5.0 <= mean <= 9.0, "全体平均寿命が想定外 (5〜9歳。外猫6割の世界)")

    print("\n--- ルート別 平均寿命 ---")
    for route in ("owned", "purebred", "community", "street", "feral", "wild", "zoo"):
        xs = [c["age"] for c in cats if c["route"] == route]
        if xs:
            print(f"  {route:10s} n={len(xs):5d} 平均 {sum(xs)/len(xs):5.2f}歳  "
                  f"1歳未満 {sum(1 for a in xs if a<1)/len(xs)*100:4.1f}%  "
                  f"15歳以上 {sum(1 for a in xs if a>=15)/len(xs)*100:4.1f}%")
    # 猫又（100年）は伝説の例外なので、実統計との比較からは除く
    jp_owned = [c["age"] for c in cats
                if c["route"] == "owned" and c["country"] == "jp"
                and not c["nekomata"] and not c["maneki"]]
    if jp_owned:
        print(f"  日本飼い猫 平均 {sum(jp_owned)/len(jp_owned):.2f}歳（実統計 約16歳）")
        check(13.0 <= sum(jp_owned) / len(jp_owned) <= 18.0, "日本飼い猫の平均寿命が実統計から外れすぎ")

    # ---- レアリティ ----
    print("\n--- レアリティ ---")
    for k, v in Counter(c["rarity"] for c in cats).most_common():
        print(f"  {k:4s} {v:5d} ({pct(v, n)})")
    check(len(set(c["rarity"] for c in cats)) >= 4, "レアリティのばらつきが不足")

    # ---- 猫生ストーリー（体験型UIの中身） ----
    print("\n--- 猫生ストーリー ---")
    lens = Counter(c["storyLen"] for c in cats)
    print("  歩数:", dict(sorted(lens.items())))
    for k in sorted(lens):
        print(f"    {k}歩: {lens[k]:5d} ({pct(lens[k], n)})")
    print("  ステップの種類:", dict(Counter(k for c in cats for k in c["storyKinds"])))
    print("  年齢ステージ:", dict(Counter(s for c in cats for s in c["storyStages"])))
    choice_total = sum(len(c["choices"]) for c in cats)
    choice_cats = sum(1 for c in cats if c["choices"])
    print(f"  2択イベント: {choice_total}件 / {choice_cats}頭 ({pct(choice_cats, n)} の猫生に入る)")
    check(all(4 <= c["storyLen"] <= 82 for c in cats), "歩数が範囲外（4〜82）")
    check(all(lens[k] > 0 for k in (4, 5, 6, 7, 8)), "歩数のバリエーション不足(4〜8が揃っていない)")

    # ---- 寿命と歩数のスケール（15歳で45〜60歩） ----
    print("\n--- 寿命と歩数（ボリューム） ---")
    def avg_step(xs):
        return sum(c["storyLen"] for c in xs) / len(xs) if xs else 0
    bands = [
        ("0〜1歳", 0.0, 1.0, 4, 8),
        ("1歳", 0.95, 1.05, 7, 10),
        ("5歳", 4.9, 5.1, 17, 25),
        ("10歳", 9.9, 10.1, 29, 41),
        ("15歳", 14.9, 15.1, 45, 60),
        ("20歳", 19.9, 20.1, 50, 70),
    ]
    for label, lo, hi, slo, shi in bands:
        xs = [c for c in cats if lo <= c["age"] < hi and not c["nekomata"] and not c["maneki"]]
        if not xs:
            print(f"  {label}: 該当なし")
            continue
        a = avg_step(xs)
        print(f"  {label}: {len(xs):4d}頭 / 平均 {a:5.1f}歩（目標 {slo}〜{shi}） / 1x換算 {a * 3.8 / 60:.1f}分")
        check(slo <= a <= shi, f"{label}の平均歩数が範囲外: {a:.1f}")
        check(all(slo <= c["storyLen"] <= shi for c in xs), f"{label}に歩数が範囲外の猫がいる")

    # ---- 寿命（総歩数）のネタバレが無いこと ----
    print("\n--- 寿命ネタバレの禁止 ---")
    check(all(c["noTotal"] for c in cats), "カードに総歩数（n/N）が出ている")
    bad_prog = [c for c in cats
                if "歩目" not in c["progressText"] or re.search(r"\d+\s*/\s*\d+", c["progressText"])
                or "あと" in c["progressText"]]
    print(f"  進捗表示の例: {cats[0]['progressText']}")
    check(not bad_prog, f"進捗表示が総歩数を漏らしている: {len(bad_prog)}頭")
    check(all(c["choiceCardOk"] for c in cats), "2択カードにカウントダウンの表示がない")
    print("  2択カード: カウントダウンあり / 総歩数表示なし OK")

    # ---- 1猫生内の文章重複・欠損 ----
    empty_text = [c for c in cats if any((not isinstance(t, str)) or not t or "undefined" in t for t in c["stepTexts"])]
    check(not empty_text, f"文章が空/undefined のステップがある: {len(empty_text)}頭")
    season_var = sum(1 for c in cats if len(c["seasonSet"]) >= 3)
    print(f"  季節が3つ以上めぐる猫生: {season_var} ({pct(season_var, n)})")
    check(season_var > n * 0.2, "季節がめぐる猫生が少なすぎる")

    # ---- 誕生画面の珍しさ・常時の名札 ----
    print("\n--- 誕生画面・名札 ---")
    check(all(c["rareOk"] for c in cats), "珍しいポイントが空/不正な猫がいる")
    check(all(c["birthCardOk"] for c in cats), "誕生カードに珍しさ表示・プロフィールがない")
    check(all(c["npOk"] for c in cats), "名札（誕生時）が不正")
    check(all(c["npLastOk"] for c in cats), "名札（最期）が不正")
    check(all(c["seasonOk"] for c in cats), "季節が未設定のステップがある")
    wilds = [c for c in cats if c["klass"] == "wild"]
    check(all(("野生のネコ科" in c["status0"]) or ("動物園" in c["status0"]) for c in wilds),
          "野生種の境遇表示が不正")
    check(all("飼い猫" in c["status0"] or "地域猫" in c["status0"] or "野良猫" in c["status0"]
              or "野生化" in c["status0"] or "野生のネコ科" in c["status0"] or "動物園" in c["status0"]
              or "特別枠" in c["status0"] or "猫" in c["status0"] for c in cats),
          "境遇表示が空の猫がいる")
    adopted_np = [c for c in cats if c["adopted"]]
    changed = [c for c in adopted_np if c["statusBeforeAdopt"] != c["statusAdopt"]]
    print(f"  拾われて境遇表示が変わった猫: {len(changed)}/{len(adopted_np)}")
    check(len(changed) == len(adopted_np), "拾われても名札の境遇が変わらない猫がいる")
    check(all(("拾われて" in c["statusAdopt"]) or ("迎えられた" in c["statusAdopt"]) or ("招き猫" in c["statusAdopt"])
              for c in adopted_np), "拾われた後の境遇表示が不正")
    print("  珍しいポイント数: 平均 {:.1f} 件 / 例: {}".format(
        sum(len(c["rarePoints"]) for c in cats) / n,
        cats[0]["rarePoints"][0][:46]))
    check(all(c["storyKinds"][0] == "birth" for c in cats), "最初が誕生ステップでない")
    check(all(c["storyKinds"][-1] == "death" for c in cats), "最後が最期ステップでない")
    check(all(c["birthAge"] == 0 for c in cats), "誕生ステップの年齢が0でない")
    check(all(abs(c["deathAge"] - c["age"]) < 1e-9 for c in cats), "最期ステップの年齢が寿命と不一致")
    check(all(c["tlAsc"] for c in cats), "ストーリーの時系列が逆転")
    check(all(c["stageOk2"] for c in cats), "年齢と成長ステージが不一致")
    check(all(s in ("kitten", "adult", "senior") for c in cats for s in c["storyStages"]), "未知の成長ステージ")
    check(all(c["storyTitles"] and c["storyTexts"] for c in cats), "タイトル/本文が空のステップ")
    check(all(c["storyStages"][0] == "kitten" for c in cats), "誕生が子猫ステージでない")
    check(all(ch["n"] == 2 and ch["ok"] and ch["q"] for c in cats for ch in c["choices"]), "2択イベントの形が不正")
    dup_story = [c for c in cats if len(set(c["eventTexts"])) != len(c["eventTexts"])]
    print(f"  同じ文章の重複した猫生: {len(dup_story)}")
    check(not dup_story, f"同じイベント文が1猫生に重複 ({len(dup_story)}頭)")
    check(choice_total > 0 and choice_cats > n * 0.4, "2択イベントがほとんど出ていない")
    senior_cats = sum(1 for c in cats if "senior" in c["storyStages"])
    print(f"  シニア猫まで育つ猫生: {senior_cats} ({pct(senior_cats, n)})")
    check(senior_cats > 0, "シニアステージの猫が1頭もいない")

    # ---- 拾われる（家族に迎えられる）体験 ----
    print("\n--- 拾われる体験 ---")
    adopted = [c for c in cats if c["adopted"]]
    print(f"  拾われた猫: {len(adopted)}頭 ({pct(len(adopted), n)})")
    for route in ("street", "community", "feral", "owned"):
        xs = [c for c in cats if c["route"] == route]
        ys = [c for c in xs if c["adopted"]]
        if xs:
            print(f"    {route:10s} {len(ys):4d}/{len(xs):5d} ({pct(len(ys), len(xs))})")
    check(len(adopted) > 0, "拾われるイベントが一件も発生しない")
    check(all(c["adoptOk"] for c in adopted), "拾われたステップ/背景の切り替えが不正")
    check(all(c["adoptBeforeDeath"] for c in adopted), "拾われるのが最期ステップ以降になっている")
    check(all(c["sceneLast"] in ("home", "shop") for c in adopted), "拾われた猫の最期が家/お店の背景でない")
    check(all(c["route"] in ("street", "community", "feral") or c["shelterBorn"] for c in adopted), "保護施設生まれ以外の飼い猫や野生種が拾われている")
    check(not any(c["adopted"] for c in cats if c["klass"] == "wild"), "野生ネコ科が拾われている")

    # ---- 選択肢の分岐と手応え ----
    print("\n--- 選択肢の分岐・手応え ---")
    fate_cats = sum(1 for c in cats if c["fateChoices"])
    print(f"  運命の2択がある猫生: {fate_cats} ({pct(fate_cats, n)})")
    check(fate_cats > n * 0.5, "運命の2択（fate）がほとんど出ていない")
    check(sum(c["effectCount"] for c in cats) > n, "2択にステータス効果が定義されていない")
    check(all(c["statsEveryStep"] for c in cats), "ステップのステータスが0〜100の範囲外")
    check(all(c["milestones"] for c in cats if c["age"] >= 10), "10歳以上の猫に節目（シニア）が付かない")
    comedy = ("ノートPC", "高級ベッド", "大運動会", "自動ドア")
    comedy_hits = sum(1 for c in cats for t in c["eventTexts"] if any(k in t for k in comedy))
    print(f"  クスッと系イベントの出現: {comedy_hits} 件")
    check(comedy_hits > 0, "コメディイベントが1件も出ていない")

    scale = json.loads(ctx.eval("""
      (function(){
        var xs = [];
        for (var a = 0; a <= 110; a += 0.5) xs.push(CATGACHA.ageScalePercent(a));
        var mono = true;
        for (var i = 1; i < xs.length; i++) if (xs[i] < xs[i - 1]) mono = false;
        var nk = [];
        for (var b = 0; b <= 110; b += 5) nk.push(CATGACHA.ageScalePercent(b, CATGACHA.NEKOMATA_TICKS));
        var mono2 = true;
        for (var j = 1; j < nk.length; j++) if (nk[j] < nk[j - 1]) mono2 = false;
        return JSON.stringify({mono: mono, start: xs[0], end: xs[xs.length - 1],
          mid: CATGACHA.ageScalePercent(10), nekoMono: mono2, nekoEnd: nk[nk.length - 1],
          ticks: CATGACHA.AGE_TICKS.length, nekoTicks: CATGACHA.NEKOMATA_TICKS.length});
      })()
    """))
    print(f"  年齢の目盛り: 0→{scale['end']} / 10歳={scale['mid']}% / 単調={scale['mono']} / 猫又スケール単調={scale['nekoMono']}")
    check(scale["mono"] and scale["nekoMono"], "年齢の目盛りが単調増加でない")
    check(scale["start"] == 0 and scale["end"] == 100, "年齢の目盛りの範囲が0〜100でない")
    check(0 < scale["mid"] < 100, "10歳の目盛り位置が不正")

    play = json.loads(ctx.eval("""
      (function(){
        var out = {errors: 0, last: null, rows: [], heads: []};
        for (var s = 1; s <= 1500; s++) {
          var c = CATGACHA.rollCat(s * 99991);
          try {
            for (var i = 0; i < c.story.length; i++) {
              var st = c.story[i];
              if (st.kind === 'death') break;
              if (st.choice && st.chosen == null) {
                var f0 = CATGACHA.applyChoice(c, i, i % st.choice.options.length);
                (f0 && f0.headlines || []).forEach(function(h){ out.heads.push(h); });
                if (i + 1 < c.story.length && c.story[i + 1].kind === 'death') break;
              }
            }
            var peak = CATGACHA.peakStats(c);
            out.rows.push({
              age: c.ageYears, len: c.story.length, boss: !!c.bossCat, adopted: !!c.adopted,
              neko: !!c.nekomata, maneki: !!c.maneki, bonus: c.lifeBonus || 0,
              peak: peak, death: c.story[c.story.length - 1].kind,
              lastLabel: c.story[c.story.length - 1].ageLabel
            });
          } catch (e) { out.errors++; out.last = String(e && e.stack || e); }
        }
        return JSON.stringify(out);
      })()
    """))
    rows = play["rows"]
    print(f"  2択を実際に選ぶ通しプレイ: {len(rows)}猫生 / 例外 {play['errors']}件")
    if play["errors"]:
        print("   last:", (play["last"] or "")[:400])
    check(play["errors"] == 0, f"通しプレイで例外 {play['errors']} 件")
    check(all(r["death"] == "death" for r in rows), "通しプレイで最期に到達しない猫がいる")
    check(all(r["age"] > 0 for r in rows), "通しプレイで享年が0以下")
    check(all(0 <= r["peak"]["energy"] <= 100 and 0 <= r["peak"]["food"] <= 100 and 0 <= r["peak"]["luck"] <= 100 for r in rows), "通しプレイのピークステータスが範囲外")
    boss_n = sum(1 for r in rows if r["boss"])
    bonus_n = sum(1 for r in rows if r["bonus"] > 0)
    print(f"  ボス猫になった: {boss_n} / 延命が発生: {bonus_n} / 最大延命 +{max((r['bonus'] for r in rows), default=0)}年")
    check(boss_n > 0, "通しプレイでボス猫ルートに入らない")
    check(bonus_n > 0, "通しプレイで延命が一度も起きない")
    # 延命でも年数を言い切らない（寿命ネタバレ禁止）
    leak = [h for h in play["heads"] if re.search(r"[+＋]\s*[\d.]+\s*年", h)]
    print("  延命の見出し例:", next((h for h in play["heads"] if "長生き" in h), "(なし)"))
    check(not leak, f"延命時に具体的な年数が出ている: {leak[:3]}")

    # ---- 超レア隠しルート ----
    print("\n--- 超レア隠しルート ---")
    neko = [c for c in cats if c["nekomata"]]
    maneki = [c for c in cats if c["maneki"]]
    print(f"  猫又（100年）: {len(neko)} ({pct(len(neko), n)})")
    print(f"  招き猫（お店）: {len(maneki)} ({pct(len(maneki), n)})")
    check(len(neko) > 0, "猫又ルートに1頭も到達しない")
    check(all(c["age"] >= 100 for c in neko), "猫又の享年が100歳未満")
    check(all(60 <= c["storyLen"] <= 80 for c in neko), "猫又の歩数が範囲外（66〜72歩）")
    check(all(c["klass"] == "domestic" for c in neko), "野生種が猫又になっている")
    check(all("senior" in c["storyStages"] for c in neko), "猫又にシニアステージがない")
    check(len(maneki) > 0, "招き猫ルートに1頭も到達しない")
    check(all(c["adopted"] for c in maneki), "招き猫が拾われルートでない")
    check(all(c["sceneLast"] == "shop" for c in maneki), "招き猫の最期がお店の背景でない")
    check(all(c["age"] >= 7 for c in maneki), "招き猫の享年がおかしい")

    # ---- 実績・称号 ----
    print("\n--- 実績・称号 ---")
    ach = json.loads(ctx.eval("""
      (function(){
        var keys = CATGACHA.ACHIEVEMENTS.map(function(a){ return a.key; });
        var dup = keys.filter(function(k, i){ return keys.indexOf(k) !== i; });
        var bad = CATGACHA.ACHIEVEMENTS.filter(function(a){ return !a.icon || !a.name || !a.desc || !a.tone; }).map(function(a){ return a.key; });
        var base = {total: 1, speciesCount: 1, countryCount: 1, adoptCount: 0, maxAge: 1,
          peak: {energy: 40, food: 40, luck: 40}, cat: {ageYears: 1, route: 'owned', mutations: [], rarity: 'N'}};
        var early = CATGACHA.evaluateAchievements(base);
        var great = CATGACHA.evaluateAchievements({total: 100, speciesCount: 60, countryCount: 30, adoptCount: 6,
          maxAge: 100, peak: {energy: 90, food: 90, luck: 90},
          cat: {ageYears: 100, route: 'street', mutations: [{key: 'odd_eye'}, {key: 'male_calico'}], rarity: 'UR',
                bossCat: true, nekomata: true, maneki: true, klass: 'domestic', speciesGroup: 'big', adopted: true, shelterBorn: true}});
        var free = CATGACHA.evaluateAchievements({total: 20, speciesCount: 10, countryCount: 8, adoptCount: 1, maxAge: 12,
          peak: {energy: 60, food: 60, luck: 60}, cat: {ageYears: 12, route: 'street', mutations: [], rarity: 'R', adopted: false}});
        var pinch = CATGACHA.evaluateAchievements({total: 2, speciesCount: 2, countryCount: 2, adoptCount: 0, maxAge: 4,
          peak: {energy: 50, food: 50, luck: 50}, cat: {ageYears: 4, route: 'owned', mutations: [], rarity: 'N', pinchAvoided: true}});
        return JSON.stringify({n: keys.length, dup: dup, bad: bad, early: early, great: great, pinch: pinch, free: free});
      })()
    """))
    print(f"  実績 {ach['n']}個 / 重複 {ach['dup']} / 属性不足 {ach['bad']}")
    print("  条件の同時達成数:", len(ach["great"]) )
    check(ach["n"] >= 20, "実績が20個未満")
    check(not ach["dup"], "実績キーが重複")
    check(not ach["bad"], "実績にアイコン/名前/説明の欠け")
    check("first" in ach["early"] and "legend20" not in ach["early"], "実績の初期判定が不正")
    check("freeKing" not in ach["great"], "拾われた猫が「野良のまま」の実績を取っている")
    check("freeKing" in ach["free"], "野良のまま10歳超えで「自由の王」が付かない")
    for key in ("nekomata", "maneki", "great", "legend20", "quarter", "all80", "ur", "dex50", "globe20", "maleCalico", "oddEye", "boss", "shelter", "pinch"):
        check(key in ach["great"] or key in ach["pinch"], f"実績条件が満たされない: {key}")
    check("freeKing" in ach["free"] and "freeKing" not in ach["great"], "自由の王の条件が不正")

    # ---- アセット/演出 ----
    print("\n--- アセット・演出 ---")
    print(f"  子猫/成猫/シニアのアクターHTML: {'OK' if all(c['stageActors'] for c in cats) else 'NG'}")
    print(f"  最期のアクター: {'OK' if all(c['deathActor'] for c in cats) else 'NG'}")
    print(f"  使用タイプ: {dict(Counter(c['artType'] for c in cats))}")
    print(f"  パーティクル数: 最小 {min(c['particleCount'] for c in cats)} / 最大 {max(c['particleCount'] for c in cats)}")
    print(f"  ステータス変化の合計: 平均 {sum(c['statDelta'] for c in cats)/n:.1f} / 最大 {max(c['statDelta'] for c in cats)}")
    check(all(c["actorOk"] for c in cats), "猫のアクターHTMLが不正")
    check(all(c["stageActors"] for c in cats), "子猫/成猫/シニアの画像HTMLが崩れている")
    check(all(c["deathActor"] for c in cats), "最期の画像HTMLが崩れている")
    check(all(c["statsOk"] for c in cats), "ステータスが0〜100の範囲外")
    check(all(6 <= c["particleCount"] <= 16 for c in cats), "パーティクルの数がおかしい")
    check(all(c["bubbleText"] for c in cats), "タップ時の吹き出しが空")

    # ---- 整合性 ----
    print("\n--- 整合性チェック ---")
    checks = [
        ("タイムライン異常", [c for c in cats if c["tlCount"] < 2 or c["tlLastKind"] != "death"]),
        ("時系列逆転", [c for c in cats if not c["tlAsc"]]),
        ("確率異常", [c for c in cats if not (0 < c["prob"] < 1)]),
        ("母数異常", [c for c in cats if not (c["pop"] >= 0.6)]),
        ("名前なし", [c for c in cats if not c["name"]]),
        ("HTMLにundefined/NaN", [c for c in cats if not c["htmlOk"]]),
    ]
    for label, xs in checks:
        print(f"  {label}: {len(xs)}")
        check(not xs, f"{label} {len(xs)}件")
    muts = Counter(m for c in cats for m in c["mutations"])
    print(f"  変異の出現: {dict(muts)}")
    print(f"  特別ルート: {dict(Counter(c['special'] for c in cats if c['special']))}")

    print("\n--- レア引例 (確率が低い順) ---")
    for c in sorted(cats, key=lambda x: x["prob"])[:6]:
        print(f"  {c['rarity']:3s} {c['speciesName']} / {c['regionName']} / {c['ageLabel']} / "
              f"母数 {c['pop']:.1f} / 確率 {c['prob']*100:.6f}%")

    # ---- 過去の猫生（図鑑のフル記録） ----
    print("\n--- 過去の猫生フル記録（図鑑アルバム） ---")
    album = json.loads(ctx.eval("""
      (function(){
        var out = {err: 0, last: null, rows: [], bad: []};
        var dex = CATAPP.emptyDex();
        var made = [];
        for (var s = 1; s <= 45; s++) {
          var c = CATGACHA.rollCat(s * 7717 + 11);
          try {
            for (var i = 0; i < c.story.length; i++) {
              var st = c.story[i];
              if (st.kind === 'death') break;
              if (st.choice && st.chosen == null) CATGACHA.applyChoice(c, i, i % 2);
            }
            CATAPP.record(dex, c);
            made.push(c);
          } catch (e) { out.err++; out.last = String(e && e.stack || e); }
        }
        var newest = made[made.length - 1];
        out.count = dex.albums.length;
        out.max = CATAPP.ALBUM_MAX;
        out.historyCount = dex.history.length;
        out.total = dex.total;
        out.newestFirst = dex.albums[0].name === newest.name && dex.albums[0].speciesName === newest.speciesName;
        out.idsUnique = (function(){ var o = {}; var dup = 0;
          dex.albums.forEach(function(a){ if (o[a.id]) dup++; o[a.id] = 1; }); return dup; })();
        out.listHtml = CATAPP.albumListHTML(dex);
        out.listCards = (out.listHtml.match(/data-album="/g) || []).length;
        out.listHasBack = out.listHtml.indexOf('album-back') >= 0;
        /* 全記録を検証（プロフィール・ログ・詳細HTML） */
        var needKeys = ['id','at','name','region','speciesName','kind','pattern','gender','eyeColor',
          'rarity','probability','ageYears','deathReason','adopted','bossCat','nekomata','maneki',
          'finalStage','stats','art','logs'];
        dex.albums.forEach(function(rec, ri){
          needKeys.forEach(function(k){ if (!(k in rec)) out.bad.push('missing:' + k + '@' + ri); });
          if (!Array.isArray(rec.logs) || !rec.logs.length) { out.bad.push('logs@' + ri); return; }
          var src = made[made.length - 1 - ri].story;
          if (rec.logs.length !== src.length) out.bad.push('loglen@' + ri);
          if (rec.logs[0].kind !== 'birth') out.bad.push('log0@' + ri);
          if (rec.logs[rec.logs.length - 1].kind !== 'death') out.bad.push('logend@' + ri);
          for (var j = 0; j < rec.logs.length; j++) {
            var g = rec.logs[j];
            if (!g.ageLabel || !g.title || !g.text) out.bad.push('empty@' + ri + ':' + j);
            if (j && g.age < rec.logs[j-1].age) out.bad.push('order@' + ri + ':' + j);
            var st2 = src[j];
            if (st2.choice) {
              if (st2.chosen == null) out.bad.push('choice@' + ri + ':' + j);
              else if (g.pickedLabel !== st2.choice.options[st2.chosen].label) out.bad.push('pick@' + ri + ':' + j);
            } else if (g.pickedLabel != null) out.bad.push('nopick@' + ri + ':' + j);
          }
          if (typeof rec.art.type !== 'string' || !rec.art.type) out.bad.push('arttype@' + ri);
          if (!(rec.stats.energy >= 0 && rec.stats.energy <= 100)) out.bad.push('stats@' + ri);
          if (['kitten','adult','senior'].indexOf(rec.finalStage) < 0) out.bad.push('stage@' + ri);
          var ser = JSON.stringify(rec);
          if (ser.indexOf('undefined') >= 0 || ser.indexOf('NaN') >= 0) out.bad.push('json@' + ri);
          var dh = CATAPP.albumDetailHTML(rec);
          if (dh.indexOf('← 一覧に戻る') < 0) out.bad.push('back@' + ri);
          if (dh.indexOf('undefined') >= 0 || dh.indexOf('NaN') >= 0) out.bad.push('html@' + ri);
          rec.logs.forEach(function(g){
            if (dh.indexOf(g.text) < 0) out.bad.push('text@' + ri);
            if (g.pickedLabel && dh.indexOf(g.pickedLabel) < 0) out.bad.push('pickhtml@' + ri);
          });
          if (dh.indexOf(rec.name) < 0 || dh.indexOf(rec.speciesName) < 0) out.bad.push('who@' + ri);
          if (dh.indexOf('最期のステータス') < 0) out.bad.push('statbox@' + ri);
        });
        /* サンプル（先頭の猫生）の詳細HTMLとリスト */
        out.sample = CATAPP.albumDetailHTML(dex.albums[0]);
        out.sampleLogs = dex.albums[0].logs.length;
        out.sampleName = dex.albums[0].name;
        out.sampleStatStep = dex.albums[0].logs.length;
        out.sampleChoice = dex.albums[0].logs.filter(function(g){ return g.pickedLabel; }).length;
        out.sampleBytes = JSON.stringify(dex.albums[0]).length;
        out.plainBytes = (function(){
          var small = CATAPP.emptyDex();
          CATAPP.record(small, made[0]);
          return JSON.stringify(small).length;
        })();
        return JSON.stringify(out);
      })()
    """))
    print(f"  記録数: {album['count']}匹（上限 {album['max']}） / 累計 {album['total']}匹 / 最近の猫生 {album['historyCount']}件")
    print(f"  1匹あたりの保存量: 約{album['sampleBytes']/1024:.1f}KB（図鑑全体 {album['plainBytes']/1024:.1f}KB） / 詳細 {album['sampleLogs']}歩・2択{album['sampleChoice']}回")
    check(album["err"] == 0, f"記録の作成で例外 {album['err']} 件")
    if album["err"]:
        print("   last:", (album["last"] or "")[:400])
    check(album["count"] == album["max"], f"保持数が上限({album['max']})になっていない: {album['count']}")
    check(album["newestFirst"], "新しい猫生が先頭になっていない")
    check(album["idsUnique"] == 0, f"記録IDが重複: {album['idsUnique']}件")
    check(album["listCards"] == album["count"], f"一覧のカード数が記録数と違う: {album['listCards']}")
    check(not album["listHasBack"], "一覧に戻るボタンが出ている")
    check(not album["bad"], f"フル記録の不備 {len(album['bad'])}件: {album['bad'][:6]}")
    check("album-step" in album["sample"] and "album-timeline" in album["sample"], "詳細にタイムラインがない")
    check(album["sampleName"] in album["sample"], "詳細に名前がない")

    # ---- ステータスと運命の連動 ----
    print("\n--- ステータスと運命の連動 ---")
    fate = json.loads(ctx.eval(r"""
      (function(){
        function fake(stats){
          return {seed: 7, klass: 'domestic', route: 'owned', story: [{kind: 'birth', age: 0, stats: stats}]};
        }
        var out = {thresh: CATGACHA.FATE, bad: [], statsHtmlBad: 0, cats: 0,
                   pinchSteps: 0, hungrySteps: 0, luckySteps: 0, pinchCats: 0, hungryCats: 0, luckyCats: 0};
        var f1 = CATGACHA.fateAt(fake({energy: 10, food: 50, luck: 50}), 0);
        var f2 = CATGACHA.fateAt(fake({energy: 50, food: 10, luck: 50}), 0);
        var f3 = CATGACHA.fateAt(fake({energy: 50, food: 50, luck: 80}), 0);
        var f4 = CATGACHA.fateAt(fake({energy: 40, food: 40, luck: 40}), 0);
        out.f1 = f1; out.f2 = f2; out.f3 = f3; out.f4 = f4;
        out.riskHungry = CATGACHA.fateRiskFactor(fake({energy: 50, food: 10, luck: 50}), 0);
        out.riskLucky = CATGACHA.fateRiskFactor(fake({energy: 50, food: 80, luck: 80}), 0);
        for (var s = 1; s <= 500; s++) {
          var c = CATGACHA.rollCat(s * 7717 + 5);
          out.cats++;
          var has = {pinch: false, hungry: false, lucky: false};
          for (var i = 0; i < c.story.length; i++) {
            var st = CATGACHA.statsAt(c, i);
            var f = CATGACHA.fateAt(c, i);
            if (f.pinch !== (st.energy <= 20) || f.hungry !== (st.food <= 20) || f.lucky !== (st.luck >= 70)) {
              out.bad.push('flag@' + s + ':' + i);
            }
            if (f.pinch) { out.pinchSteps++; has.pinch = true; }
            if (f.hungry) { out.hungrySteps++; has.hungry = true; }
            if (f.lucky) { out.luckySteps++; has.lucky = true; }
            var h = CATART.statsHTML(c, i);
            var pinchFlag = h.indexOf('is-pinch') >= 0 && h.indexOf('data-flag="ピンチ"') >= 0;
            var hungryFlag = h.indexOf('is-hungry') >= 0 && h.indexOf('data-flag="空腹"') >= 0;
            var luckyFlag = h.indexOf('is-lucky') >= 0 && h.indexOf('data-flag="幸運"') >= 0;
            if (f.pinch !== pinchFlag || f.hungry !== hungryFlag || f.lucky !== luckyFlag) {
              out.statsHtmlBad++;
            }
          }
          if (has.pinch) out.pinchCats++;
          if (has.hungry) out.hungryCats++;
          if (has.lucky) out.luckyCats++;
        }
        return JSON.stringify(out);
      })()
    """))
    print(f"  しきい値: ❤️<={fate['thresh']['PINCH']} / 🐟<={fate['thresh']['HUNGRY']} / 🍀>={fate['thresh']['LUCKY']}")
    print(f"  例: ピンチ={fate['f1']['pinch']} 空腹={fate['f2']['hungry']} 幸運={fate['f3']['lucky']} 通常={fate['f4']['tone'] or 'なし'}")
    print(f"  事故リスク倍率: 空腹 {fate['riskHungry']:.2f} / 幸運 {fate['riskLucky']:.2f}")
    print(f"  500猫生: ピンチ{ fate['pinchCats']}頭・空腹{fate['hungryCats']}頭・幸運{fate['luckyCats']}頭（延べ ピンチ{fate['pinchSteps']}歩 / 空腹{fate['hungrySteps']}歩 / 幸運{fate['luckySteps']}歩）")
    check(not fate["bad"], f"運命フラグがしきい値と不一致: {fate['bad'][:4]}")
    check(fate["statsHtmlBad"] == 0, f"ステータスの表示クラスが運命と不一致: {fate['statsHtmlBad']}")
    check(fate["f1"]["pinch"] and fate["f1"]["tone"] == "pinch", "❤️<=20でピンチにならない")
    check(fate["f2"]["hungry"] and fate["f2"]["tone"] == "hungry", "🐟<=20で空腹にならない")
    check(fate["f3"]["lucky"] and fate["f3"]["tone"] == "lucky", "🍀>=70で幸運にならない")
    check(not (fate["f4"]["pinch"] or fate["f4"]["hungry"] or fate["f4"]["lucky"]), "通常ステータスで運命フラグが立つ")
    check(fate["riskHungry"] > 1.0, "空腹で事故リスクが上がらない")
    check(fate["riskLucky"] < 1.0, "幸運で事故リスクが下がらない")
    check(fate["pinchCats"] > 50 and fate["hungryCats"] > 50 and fate["luckyCats"] > 50, "ピンチ/空腹/幸運が出にくすぎる")

    # ---- 空腹が長く続いた子の体調（病気リスク） ----
    print("\n--- 空腹と体調 ---")
    hunger = json.loads(ctx.eval(r"""
      (function(){
        var out = {cats: 4000, weak: 0, bad: [], ratioMin: 1, ratioMax: 0, short: 0};
        for (var s = 1; s <= out.cats; s++) {
          var c = CATGACHA.rollCat(s * 104729 + 17);
          if (c.hungerWeak) {
            out.weak++;
            var story = c.story;
            if (story[story.length - 1].kind !== 'death') out.bad.push('last@' + s);
            if (c.deathCause !== 'illness') out.bad.push('cause@' + s);
            if (story[story.length - 1].cause !== 'illness') out.bad.push('scause@' + s);
            for (var i = 1; i < story.length; i++) if (story[i].age < story[i - 1].age) out.bad.push('order@' + s);
            if (story.length < 5) out.bad.push('len@' + s);
            var r = Number(c.hungerRatio) || 0;
            out.ratioMin = Math.min(out.ratioMin, r);
            out.ratioMax = Math.max(out.ratioMax, r);
            if (c.ageYears < 3) out.bad.push('age@' + s);
          }
          if (c.ageYears >= 3 && CATGACHA.hungerRatio(c) >= 0.30) out.short++;
        }
        return JSON.stringify(out);
      })()
    """))
    print(f"  空腹が長く続いた猫: {hunger['weak']} / {hunger['cats']}（体調を崩して最期が早まる）")
    print(f"  記録した空腹率: {hunger['ratioMin']:.2f}〜{hunger['ratioMax']:.2f} / 該当候補 {hunger['short']}頭")
    check(hunger["weak"] > 0, "空腹で体調を崩す猫が1頭もいない")
    check(hunger["weak"] < hunger["cats"] * 0.2, "空腹による短命が多すぎる（全体の2割超）")
    check(not hunger["bad"], f"空腹の最期の記録が不正: {hunger['bad'][:4]}")
    check(hunger["ratioMin"] >= 0.30, "空腹率がしきい値未満の猫が短命になっている")

    # ---- ⭐お気に入りピン留め（40匹の上限を超えても消えない） ----
    print("\n--- ⭐お気に入り（過去の猫生） ---")
    fav = json.loads(ctx.eval(r"""
      (function(){
        var out = {bad: []};
        var dex = CATAPP.emptyDex();
        var made = [];
        function make(n, base) {
          for (var i = 0; i < n; i++) {
            var c = CATGACHA.rollCat((base + i) * 7919 + 3);
            CATAPP.record(dex, c);
            made.push(c);
          }
        }
        make(45, 1);
        out.full = dex.albums.length;
        out.max = CATAPP.ALBUM_MAX;
        var mark = dex.albums[10].id;
        var r1 = CATAPP.toggleFavorite(dex, mark);
        out.favOn = r1;
        make(30, 200);
        out.after = dex.albums.length;
        out.hasFav = dex.albums.some(function(a){ return a.id === mark; });
        out.normal = dex.albums.filter(function(a){ return !a.fav; }).length;
        var marked = dex.albums.filter(function(a){ return a.id === mark; })[0];
        out.marked = marked ? {fav: marked.fav, name: marked.name, logs: marked.logs.length} : null;
        out.listAll = CATAPP.albumListHTML(dex, 'all');
        out.listFav = CATAPP.albumListHTML(dex, 'fav');
        out.detail = CATAPP.albumDetailHTML(marked);
        out.filterAll = (out.listAll.match(/data-album="/g) || []).length;
        out.filterFav = (out.listFav.match(/data-album="/g) || []).length;
        out.starOn = (out.listAll.match(/album-star is-on/g) || []).length;
        /* 解除しても記録は消えない */
        var r2 = CATAPP.toggleFavorite(dex, mark);
        out.favOff = r2;
        out.afterOff = dex.albums.length;
        /* 上限: ⭐は20匹まで */
        var d2 = CATAPP.emptyDex();
        for (var j = 0; j < 25; j++) CATAPP.record(d2, CATGACHA.rollCat((4000 + j) * 31 + 1));
        var ok = 0, full = 0;
        d2.albums.forEach(function(a){ var r = CATAPP.toggleFavorite(d2, a.id); if (r.ok) ok++; else if (r.reason === 'full') full++; });
        out.favMax = {ok: ok, full: full, max: CATAPP.FAV_MAX, count: d2.albums.filter(function(a){ return a.fav; }).length};
        /* 旧データ（favが無い記録）でも壊れない */
        var d3 = CATAPP.emptyDex();
        CATAPP.record(d3, CATGACHA.rollCat(77));
        d3.albums[0].fav = undefined;
        out.legacy = CATAPP.albumListHTML(d3, 'all').indexOf('undefined') < 0;
        return JSON.stringify(out);
      })()
    """))
    print(f"  45匹記録 → {fav['full']}匹（上限{fav['max']}） / ⭐登録後さらに30匹 → {fav['after']}匹（通常{fav['normal']}＋⭐）")
    print(f"  ⭐の猫は残った: {fav['hasFav']} / 一覧 すべて{fav['filterAll']}枚・⭐だけ{fav['filterFav']}枚 / ★表示 {fav['starOn']}")
    print(f"  ⭐上限: {fav['favMax']['ok']}匹登録・{fav['favMax']['full']}回は満杯（上限{fav['favMax']['max']}）")
    check(fav["favOn"]["ok"] and fav["favOn"]["fav"], "⭐を付けられない")
    check(fav["hasFav"], "40匹を超えると⭐の猫が消える")
    check(fav["normal"] == fav["max"], f"通常の記録が上限{fav['max']}に保たれていない: {fav['normal']}")
    check(fav["after"] == fav["max"] + 1, f"⭐が別枠で保護されていない: {fav['after']}")
    check(fav["filterFav"] == 1 and fav["filterAll"] == fav["after"], "⭐だけの絞り込みができない")
    check(fav["starOn"] >= 1 and "★" in fav["listAll"], "一覧に★が表示されない")
    check("お気に入り" in fav["detail"] and "data-card=" in fav["detail"], "詳細に⭐/カードボタンがない")
    check(fav["favOff"]["ok"] and not fav["favOff"]["fav"], "⭐を外せない")
    check(fav["afterOff"] == fav["after"], "⭐を外したら記録が消えた")
    check(fav["favMax"]["ok"] == fav["favMax"]["max"] and fav["favMax"]["full"] == 5, "⭐の上限20匹が効いていない")
    check(fav["legacy"], "旧データ（favなし）の一覧が壊れる")
    check("undefined" not in fav["listAll"] and "undefined" not in fav["detail"], "一覧/詳細に undefined が出る")

    # ---- 📸 猫生カード（Canvas 2D） ----
    print("\n--- 猫生カード画像 ---")
    card = json.loads(ctx.eval(r"""
      (function(){
        function fake(w, h) {
          var c = {width: w, height: h, calls: {texts: [], ops: 0, images: 0}};
          var grad = {addColorStop: function(){}};
          var g = {
            font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
            textAlign: '', textBaseline: '', globalCompositeOperation: '', lineCap: '',
            shadowColor: '', shadowBlur: 0, shadowOffsetY: 0,
            clearRect: function(){ c.calls.ops++; }, fillRect: function(){ c.calls.ops++; },
            strokeRect: function(){ c.calls.ops++; }, beginPath: function(){ c.calls.ops++; },
            closePath: function(){}, moveTo: function(){}, lineTo: function(){},
            quadraticCurveTo: function(){}, bezierCurveTo: function(){}, arc: function(){},
            ellipse: function(){}, rect: function(){}, fill: function(){}, stroke: function(){},
            save: function(){}, restore: function(){}, translate: function(){}, rotate: function(){},
            scale: function(){}, clip: function(){}, setLineDash: function(){},
            fillText: function(t){ c.calls.texts.push(String(t)); },
            strokeText: function(t){ c.calls.texts.push(String(t)); },
            drawImage: function(){ c.calls.images++; },
            measureText: function(t){ return {width: String(t).length * 17}; },
            createLinearGradient: function(){ return grad; },
            createRadialGradient: function(){ return grad; }
          };
          c.getContext = function(){ return g; };
          c.toDataURL = function(){ return 'data:image/png;base64,' + 'QUJDREVGRw'.repeat(60); };
          return c;
        }
        var out = {bad: [], tested: 0, noName: 0, noAge: 0, noOdds: 0, imgs: 0, minLen: 1e9};
        var dex = CATAPP.emptyDex();
        for (var s = 1; s <= 45; s++) {
          var c = CATGACHA.rollCat(s * 2654435761);
          for (var i = 0; i < c.story.length; i++) {
            var st = c.story[i];
            if (st.kind === 'death') break;
            if (st.choice && st.chosen == null) CATGACHA.applyChoice(c, i, i % 2);
          }
          CATAPP.record(dex, c);
        }
        var recs = dex.albums.slice();
        /* 猫又・招き猫も（見つかれば）描く */
        for (var t = 1; t < 8000 && recs.length < 47; t++) {
          var rc = CATGACHA.rollCat(t * 7919);
          if (!rc.nekomata && !rc.maneki) continue;
          for (var k = 0; k < rc.story.length; k++) {
            if (rc.story[k].choice && rc.story[k].chosen == null) CATGACHA.applyChoice(rc, k, 0);
          }
          recs.push(CATAPP.albumEntry(rc));
        }
        var img = {width: 512, height: 512};
        recs.forEach(function(rec, n){
          var made = null, canvas = null;
          try {
            canvas = fake(1080, 1350);
            var layerCount = 0;
            var res = CATCARD.render(rec, {createCanvas: function(w, h){ layerCount++; return fake(w, h); }, image: (n % 2 ? img : null)});
            made = res;
            out.tested++;
            if (!res.dataURL || res.dataURL.indexOf('data:image/png;base64,') !== 0) out.bad.push('url@' + n);
            else out.minLen = Math.min(out.minLen, res.dataURL.length);
            if (!res.data || res.w !== 1080 || res.h !== 1350) out.bad.push('size@' + n);
            var texts = res.data ? [] : [];
            /* メインのキャンバスに描いた文字を確認 */
            var main = null;
            /* render は最初に createCanvas(1080,1350) を呼ぶので、その canvas の texts */
            var all = [];
            var drawCalls = null;
            var test = CATCARD.draw(fake(1080, 1350), CATCARD.cardData(rec), {createCanvas: function(w,h){ return fake(w,h); }, image: (n % 2 ? img : null)});
            if (!test) out.bad.push('draw@' + n);
            if (res.data.name !== (rec.name || '名もなき猫')) out.bad.push('name@' + n);
            if (!res.data.ageLabel) out.noAge++;
            if (!res.data.oneIn) out.noOdds++;
            if (/undefined|NaN/.test(JSON.stringify(res.data))) out.bad.push('json@' + n);
          } catch (e) { out.bad.push('err@' + n + ':' + (e && e.message)); }
        });
        /* 文字が実際に描かれているか（1匹ぶん、記録したテキストを見る） */
        var cap = fake(1080, 1350);
        var sample = dex.albums[0];
        CATCARD.draw(cap, CATCARD.cardData(sample), {createCanvas: function(w,h){ return fake(w,h); }, image: {width: 512, height: 512}});
        out.sampleTexts = cap.calls.texts;
        out.sampleImages = cap.calls.images;
        out.sampleOps = cap.calls.ops;
        out.sampleName = sample.name;
        out.sampleOne = CATCARD.cardData(sample).oneIn;
        return JSON.stringify(out);
      })()
    """))
    print(f"  描いたカード: {card['tested']}枚 / dataURL最短 {card['minLen']}文字 / 不備 {len(card['bad'])}")
    print(f"  サンプル: 文字{len(card['sampleTexts'])}個・描画{card['sampleOps']}回・画像{card['sampleImages']}枚 / 『{card['sampleName']}』")
    check(not card["bad"], f"カード生成の不備: {card['bad'][:5]}")
    check(card["tested"] >= 45, "カードのテスト枚数が足りない")
    check(card["minLen"] > 100, "カードのdataURLが空同然")
    check(card["sampleName"] in card["sampleTexts"], "カードに名前が描かれていない")
    check(any("享年" in t for t in card["sampleTexts"]), "カードに享年がない")
    check(any("分の1" in t for t in card["sampleTexts"]), "カードに珍しさ（約◯分の1）がない")
    check(card["sampleImages"] > 0, "カードに猫の画像が描かれていない")
    check(card["noAge"] == 0 and card["noOdds"] == 0, "カードに享年/珍しさの欠けた猫がいる")

    # ---- 音（Web Audio シンセ） ----
    print("\n--- 音（Web Audio） ---")
    snd = json.loads(ctx.eval(r"""
      (function(){
        var out = {on: CATSOUND.isOn(), playNoAudio: null, threw: false};
        try { out.playNoAudio = CATSOUND.play('tap'); } catch (e) { out.threw = true; }
        out.all = Object.keys(CATSOUND.SOUNDS);
        return JSON.stringify(out);
      })()
    """))
    print(f"  初期ON={snd['on']} / AudioContextなしでも例外なし={not snd['threw']} / 音の種類 {len(snd['all'])}: {' '.join(snd['all'])}")
    check(snd["on"], "音の初期設定がOFFになっている")
    check(not snd["threw"], "AudioContextが無い環境で例外が出る")
    for need in ("roll", "birth", "tap", "choice", "adopt", "milestone", "pinch", "death", "card"):
        check(need in snd["all"], f"音の種類が足りない: {need}")

    # ---- 旧セーブデータ互換（albums / logs が無くても動く） ----
    print("\n--- 旧セーブデータ互換 ---")
    legacy = json.loads(ctx.eval("""
      (function(){
        var old = {total: 2, species: {'coat:kijitora': 2}, countries: {jp: 2}, mutations: {},
          rarities: {N: 2}, maxAge: 12,
          history: [{name: 'タマ', species: '茶トラ', region: '日本', rarity: 'N', age: 12, at: 1, adopted: false}]};
        localStorage = { _v: {}, getItem: function(k){ return this._v[k] || null; },
          setItem: function(k, v){ this._v[k] = v; } };
        localStorage.setItem('catgacha.dex.v1', JSON.stringify(old));
        var d = CATAPP.loadDex();
        var out = {};
        out.albums = Array.isArray(d.albums) ? d.albums.length : 'nope';
        out.listHtml = CATAPP.buildDexHTML(d, 'albums', null);
        out.listEmpty = out.listHtml.indexOf('まだ過去の猫生はありません') >= 0;
        /* logs の無い古い記録でも詳細が壊れない */
        var bare = {id: 'old1', at: 1, name: 'ミケ', speciesName: '三毛', region: {flag: '🇯🇵', name: '日本'},
          kind: '雑種', rarity: 'R', ageYears: 5, probability: 1e-5, population: 12000,
          art: {type: 'calico', stage: 'adult'}};
        var dh = CATAPP.albumDetailHTML(bare);
        out.bareHtml = dh;
        out.bareOk = dh.indexOf('まだ記録されていません') >= 0 && dh.indexOf('undefined') < 0
          && dh.indexOf('NaN') < 0 && dh.indexOf('享年') >= 0;
        /* 旧データでも記録を足せる */
        var c = CATGACHA.rollCat(4242);
        CATAPP.record(d, c);
        out.after = d.albums.length;
        out.saved = (localStorage.getItem('catgacha.dex.v1') || '').indexOf('albums') >= 0;
        /* 容量切迫：保存が失敗し続けても古い記録を削って必ず1匹は残す */
        var quota = { _v: {}, fail: true,
          getItem: function(k){ return this._v[k] || null; },
          setItem: function(k, v){
            if (this.fail && String(v).length > 4000) { var e = new Error('quota'); e.name = 'QuotaExceededError'; e.code = 22; throw e; }
            this._v[k] = v;
          } };
        localStorage = quota;
        var big = CATAPP.emptyDex();
        for (var i = 0; i < 6; i++) CATAPP.record(big, CATGACHA.rollCat(900 + i * 31));
        out.quotaAlbums = big.albums.length;
        out.quotaSaved = !!quota.getItem('catgacha.dex.v1');
        out.quotaTrimmed = !!(big.albums[0] && (big.albums[0].trimmed || big.albums.length === 1));
        return JSON.stringify(out);
      })()
    """))
    print(f"  旧データ: albums={legacy['albums']} / 空の案内={legacy['listEmpty']} / 記録追加後={legacy['after']} / 保存={legacy['saved']}")
    print(f"  容量切迫時: 残った記録 {legacy['quotaAlbums']}匹 / 保存={legacy['quotaSaved']}")
    check(legacy["albums"] == 0, "旧データでalbumsが空になっていない")
    check(legacy["listEmpty"], "記録が無いときに案内が出ない")
    check(legacy["bareOk"], "logsの無い旧記録の詳細が壊れる")
    check(legacy["after"] == 1 and legacy["saved"], "旧データに記録を足して保存できない")
    check(legacy["quotaSaved"], "容量切迫時に何も保存できない")
    check(legacy["quotaAlbums"] >= 1, "容量切迫で記録が全部消えた（1匹は残す）")

    try:
        ctx.close()
    except Exception:
        pass

    print("\n結果:", "PASS" if not failures else f"FAIL ({len(failures)}件)")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
