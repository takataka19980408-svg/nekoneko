"""世界猫生ガチャ — 検証スクリプト
1) 10,000回の抽選シミュレーション（例外・分布・寿命・整合性）
2) 猫生ストーリー（3〜7歩・子猫→成猫→シニアの成長・2択・拾われる）の検査
3) 全アセット（13タイプ×子猫/成猫のPNG）とマッピング網羅性のチェック
4) データ網羅性のチェック（純血種・野生ネコ科・国）

Node.js が無い環境のため quickjs（Python埋め込みJSエンジン）で
実ファイル js/*.js をそのまま読み込んで実行する。
ブラウザで動くコードと同一のものを検証している。
"""
import json
import sys
from collections import Counter
from pathlib import Path

import quickjs

ROOT = Path(__file__).resolve().parent.parent
JS_FILES = [
    "js/data-core.js", "js/breeds.js", "js/wild.js", "js/data-countries.js",
    "js/data.js", "js/engine.js", "js/catart.js", "js/app.js",
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
  var RE = new RegExp('<img[^>]+src="assets/cats/[a-z]+-(kitten|adult)\\\\.png"', 'i');
  function actorOk(html) {
    var x = String(html || '');
    return RE.test(x) && x.indexOf('collarBadge') >= 0 && x.indexOf('undefined') < 0 && x.indexOf('NaN') < 0;
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
        hasAdoptCollar: actor.indexOf('collar is-on') >= 0
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
    check(total_bytes < 4 * 1024 * 1024, "画像アセットが重すぎる（4MB超）")

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
    jp_owned = [c["age"] for c in cats if c["route"] == "owned" and c["country"] == "jp"]
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
    check(all(3 <= c["storyLen"] <= (12 if c["nekomata"] else (9 if c["maneki"] else 7)) for c in cats),
          "歩数が範囲外（通常3〜7 / 招き猫〜9 / 猫又11）")
    check(all(lens[k] > 0 for k in (3, 4, 5, 6, 7)), "歩数のバリエーション不足(3〜7が揃っていない)")
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
        var out = {errors: 0, last: null, rows: []};
        for (var s = 1; s <= 1500; s++) {
          var c = CATGACHA.rollCat(s * 99991);
          try {
            for (var i = 0; i < c.story.length; i++) {
              var st = c.story[i];
              if (st.kind === 'death') break;
              if (st.choice && st.chosen == null) {
                CATGACHA.applyChoice(c, i, i % st.choice.options.length);
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

    # ---- 超レア隠しルート ----
    print("\n--- 超レア隠しルート ---")
    neko = [c for c in cats if c["nekomata"]]
    maneki = [c for c in cats if c["maneki"]]
    print(f"  猫又（100年）: {len(neko)} ({pct(len(neko), n)})")
    print(f"  招き猫（お店）: {len(maneki)} ({pct(len(maneki), n)})")
    check(len(neko) > 0, "猫又ルートに1頭も到達しない")
    check(all(c["age"] >= 100 for c in neko), "猫又の享年が100歳未満")
    check(all(c["storyLen"] >= 9 for c in neko), "猫又の猫生が短すぎる")
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

    try:
        ctx.close()
    except Exception:
        pass

    print("\n結果:", "PASS" if not failures else f"FAIL ({len(failures)}件)")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
