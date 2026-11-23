"""世界猫生ガチャ — 検証スクリプト
1) 10,000回の抽選シミュレーション（例外・分布・寿命・整合性）
2) 全アセット（SVG）の生成チェック
3) データ網羅性のチェック（純血種・野生ネコ科・国）

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
    "js/data.js", "js/engine.js", "js/svgcat.js", "js/app.js",
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
  var out = {cats: [], svgErrors: [], errors: 0};
  var seed = _SEED;
  for (var i = 0; i < _N; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    try {
      var c = CATGACHA.rollCat(seed);
      var svg = CATGACHA_SVG.render(c);
      var s2 = String(svg || '').trim();
      if (!s2 || s2.indexOf('<svg') !== 0 || s2.lastIndexOf('</svg>') !== s2.length - 6) {
        out.svgErrors.push({i: i, name: c.speciesName});
      }
      var html = CATAPP.buildResultHTML(c);
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
        htmlOk: !/undefined|NaN/.test(html), cause: c.deathCause
      });
    } catch (e) {
      out.errors++;
      out.lastError = String(e && e.stack || e);
    }
  }
  var D = CATGACHA_DATA;
  out.meta = {
    coats: D.COATS.length, breeds: D.BREEDS.length, wild: D.WILD.length,
    countries: D.COUNTRIES.length, mutations: D.MUTATIONS.length,
    targets: CATAPP.TOTAL_TARGETS,
    speciesCatalog: CATAPP.CATALOG.species.length,
    wildMissingCountry: D.WILD.filter(function(w){ return !w.countries || !w.countries.length || !w.countries.every(function(k){ return D.COUNTRIES.some(function(c){return c.key===k;}); }); }).map(function(w){return w.key;}),
    countryBad: D.COUNTRIES.filter(function(c){ return !c.where || !c.where.length || !c.names || !c.names.length || !c.region; }).map(function(c){return c.key;}),
    dupKeys: (function(){
      function dups(a){var s={},d=[];a.forEach(function(x){if(s[x])d.push(x);s[x]=1});return d;}
      return dups(D.BREEDS.map(function(b){return b.key;})).concat(dups(D.WILD.map(function(w){return w.key;}))).concat(dups(D.COUNTRIES.map(function(c){return c.key;})));
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
    print(f"例外: {data['errors']} 件   SVG崩れ: {len(data['svgErrors'])} 件")
    check(data["errors"] == 0, f"抽選中の例外 {data['errors']} 件")
    if data["errors"]:
        print("   last:", data.get("lastError", "")[:400])
    check(not data["svgErrors"], f"SVG生成の崩れ {len(data['svgErrors'])} 件")

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
