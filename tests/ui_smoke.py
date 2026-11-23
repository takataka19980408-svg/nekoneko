"""UIスモークテスト（DOMスタブ）
ブラウザ無しで init() → ガチャ → 子猫誕生 → 猫生を歩む（手動/オート）→ 最期（フィナーレ）→ 図鑑
の一連を実行し、要素IDの取り違えや実行時エラーを検出する。

新機能（オート進行・選択肢による分岐・年齢の目盛り・実績・累計記録）も検証する。
"""
import json
import re
import sys
from pathlib import Path

import quickjs

ROOT = Path(__file__).resolve().parent.parent
JS_FILES = [
    "js/data-core.js", "js/breeds.js", "js/wild.js", "js/data-countries.js", "js/events.js",
    "js/data.js", "js/engine.js", "js/catart.js",
]

# setTimeout は「すぐ実行」ではなくキューに積む（オート進行を勝手に走らせないため）。
# __runTimers(ms以下) でロール演出などの短いタイマーだけを進められる。
DOM_STUB = r"""
var __els = {};
var __handlers = {};
function El(id, cls){
  this.id = id; this._cls = cls || ''; this.hidden = false; this.innerHTML = ''; this.textContent = '';
  this.style = {}; this.dataset = {}; this.disabled = false; this.className = ''; this.offsetWidth = 400;
  var set = {};
  this.classList = {
    add: function(){ for (var i = 0; i < arguments.length; i++) set[arguments[i]] = true; },
    remove: function(){ for (var i = 0; i < arguments.length; i++) delete set[arguments[i]]; },
    toggle: function(c, on){ if (on === undefined) { if (set[c]) delete set[c]; else set[c] = true; } else if (on) set[c] = true; else delete set[c]; },
    contains: function(c){ return !!set[c]; }
  };
}
El.prototype.addEventListener = function(ev, fn){
  __handlers[this.id + ':' + ev] = __handlers[this.id + ':' + ev] || [];
  __handlers[this.id + ':' + ev].push(fn);
};
function __tabs(){
  return ['species','countries','mutations','achievements','albums'].map(function(t){
    var e = new El('tab-' + t);
    e.dataset.tab = t;
    return e;
  });
}
var document = {
  hidden: false,
  getElementById: function(id){
    if (!__els[id]) __els[id] = new El(id);
    return __els[id];
  },
  querySelectorAll: function(sel){
    if (sel === '.tab') return __tabs();
    return [];
  },
  body: { style: {} },
  addEventListener: function(){}
};
var __timers = [];
var __timerId = 0;
function setTimeout(fn, ms){
  __timerId++;
  __timers.push({id: __timerId, fn: fn, ms: ms || 0});
  return __timerId;
}
function clearTimeout(id){
  for (var i = 0; i < __timers.length; i++) {
    if (__timers[i].id === id) { __timers.splice(i, 1); return; }
  }
}
function __runTimers(maxMs){
  var ran = 0;
  while (ran < 4000) {
    var idx = -1;
    for (var i = 0; i < __timers.length; i++) {
      if ((__timers[i].ms || 0) <= maxMs) { idx = i; break; }
    }
    if (idx < 0) break;
    var t = __timers.splice(idx, 1)[0];
    t.fn();
    ran++;
  }
  return ran;
}
var __now = 1000000;
Date.now = function(){ __now += 120; return __now; };
var __opened = [];
var window = globalThis;
window.addEventListener = function(){};
window.scrollTo = function(){};
window.open = function(u){ __opened.push(u); };
var localStorage = {
  _v: {},
  getItem: function(k){ return this._v[k] || null; },
  setItem: function(k, v){ this._v[k] = v; }
};
"""

failures = []


def check(cond, msg):
    if not cond:
        failures.append(msg)
        print("  [NG] " + msg)
    return cond


def main():
    ctx = quickjs.Context()
    ctx.eval(DOM_STUB)
    for f in JS_FILES + ["js/app.js"]:
        ctx.eval((ROOT / f).read_text(encoding="utf-8"))

    # 要素IDが index.html と一致しているか
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    ids = set(re.findall(r'id="([A-Za-z0-9_-]+)"', html))
    src = (ROOT / "js/app.js").read_text(encoding="utf-8")
    used = set(re.findall(r"\$\('([A-Za-z0-9_-]+)'\)", src))
    missing = sorted(used - ids)
    print("index.html のID数:", len(ids))
    print("app.js が参照するID:", len(used))
    if missing:
        print("[NG] index.html に存在しないID:", missing)
        return 1
    print("IDの対応: OK")

    # --- ガチャ → 子猫誕生 ---
    ctx.eval("__handlers['rollBtn:click'][0]();")
    ctx.eval("__runTimers(100);")  # ロール演出（80ms刻み）だけ進める
    if ctx.eval("CATAPP.state.rolling"):
        print("[NG] ガチャ演出が終わらない")
        return 1
    cat = ctx.eval("JSON.stringify({story: CATAPP.state.current.story.length, step: CATAPP.state.step, total: CATAPP.state.dex.total, stage: CATAPP.state.current.story[0].stage})")
    print("1回目のガチャ:", cat)
    if ctx.eval("CATAPP.state.step") != 0:
        print("[NG] ストーリーが0歩目から始まっていない")
        return 1
    if ctx.eval("CATAPP.state.dex.total") != 0:
        print("[NG] 誕生した時点で図鑑に登録されている（フィナーレまで隠す仕様）")
        return 1
    if ctx.eval("document.getElementById('storyScreen').hidden"):
        print("[NG] ストーリー画面が表示されていない")
        return 1
    if not ctx.eval("document.getElementById('homeScreen').hidden"):
        print("[NG] ホーム画面が隠れていない")
        return 1
    # --- 誕生画面：静止して「この子はだれか」「どれだけ珍しいか」を見せる ---
    card = ctx.eval("document.getElementById('pageWrap').innerHTML")
    for need in ("page--birth", "birth-name", "この子はこんな猫", "国・地域", "種別", "境遇",
                 "性別", "目の色", "地球約10億匹中", "分の1", "仲間は", "珍しいポイント・豆知識"):
        if need not in card:
            print("[NG] 誕生カードに不足:", need, len(card))
            return 1
    if "享年" in card or "undefined" in card or "NaN" in card:
        print("[NG] 誕生カードに享年/undefined/NaN が出ている")
        return 1
    print("誕生カード文字数:", len(card), "/ プロフィール＋珍しさ OK")

    np = ctx.eval("document.getElementById('nameplate').innerHTML")
    for need in (ctx.eval("CATAPP.state.current.name"),
                 ctx.eval("CATAPP.state.current.speciesName"),
                 ctx.eval("CATGACHA.formatOneIn(CATAPP.state.current.probability)"),
                 ctx.eval("CATGACHA.statusOf(CATAPP.state.current, 0).text")):
        if need not in np:
            print("[NG] 名札に不足:", need)
            return 1
    if "np-age" not in np or "np-facts" not in np:
        print("[NG] 名札のレイアウト要素がない")
        return 1
    print("名札:", np.replace("\n", " ")[:180].strip())

    # --- 誕生画面では止まっている（オートはまだ始まらない） ---
    if ctx.eval("CATAPP.state.started"):
        print("[NG] 誕生の瞬間からオートが始まっている")
        return 1
    if ctx.eval("CATAPP.state.autoTimer") not in (0, None):
        print("[NG] 誕生画面でオートのタイマーが予約されている")
        return 1
    if not ctx.eval("document.getElementById('autoBar').hidden"):
        print("[NG] 誕生画面でオートバーが出ている")
        return 1
    if "この子の猫生を歩む" not in ctx.eval("document.getElementById('walkText').textContent"):
        print("[NG] 誕生画面のボタンが「この子の猫生を歩む」でない")
        return 1
    print("誕生画面は静止: OK（スタートボタン待ち）")

    # --- 「この子の猫生を歩む」でオート進行スタート ---
    ctx.eval("__handlers['walkBtn:click'][0]()")
    if not ctx.eval("CATAPP.state.started"):
        print("[NG] スタートボタンでオートが始まらない")
        return 1
    if ctx.eval("CATAPP.state.step") != 1:
        print("[NG] スタートで1歩目に進んでいない")
        return 1
    if ctx.eval("document.getElementById('autoBar').hidden"):
        print("[NG] スタート後もオートバーが隠れている")
        return 1
    # 1歩目がいきなり2択のこともある（その場合は選ぶと再開する）
    if ctx.eval("!!CATAPP.state.current.story[CATAPP.state.step].choice"):
        print("スタート直後が2択: 選んで再開を確認")
        ctx.eval("CATAPP.choose(0)")
    if ctx.eval("CATAPP.state.autoTimer") in (0, None):
        print("[NG] スタート後にオートのタイマーが予約されていない")
        return 1
    note = ctx.eval("document.getElementById('autoNote').textContent")
    print("スタート後のオート:", note)
    if "3.8" not in note:
        print("[NG] 1x の間隔が3.8秒になっていない:", note)
        return 1

    # --- オート進行（速度切替・選択肢で一時停止） ---
    if not ctx.eval("CATAPP.state.auto"):
        print("[NG] オートがデフォルトONになっていない")
        return 1
    # 2x に切り替えると間隔が1.9秒になる
    ctx.eval("__handlers['speed2:click'][0]()")
    if ctx.eval("CATAPP.state.speed") != 2:
        print("[NG] 2x に切り替わらない")
        return 1
    if "1.9" not in ctx.eval("document.getElementById('autoNote').textContent"):
        print("[NG] 2x の説明が1.9秒になっていない")
        return 1
    ctx.eval("__handlers['speed1:click'][0]()")
    if "3.8" not in ctx.eval("document.getElementById('autoNote').textContent"):
        print("[NG] 1x の説明が3.8秒になっていない")
        return 1
    # autoTick で1歩進む
    step0 = ctx.eval("CATAPP.state.step")
    ctx.eval("CATAPP.autoTick()")
    step1 = ctx.eval("CATAPP.state.step")
    print("オートで1歩:", step0, "->", step1)
    if step1 != step0 + 1:
        print("[NG] オートで歩数が進まない")
        return 1
    # 一時停止すると進まない
    ctx.eval("CATAPP.toggleAuto()")
    if ctx.eval("CATAPP.state.auto"):
        print("[NG] 一時停止できない")
        return 1
    ctx.eval("CATAPP.autoTick()")
    if ctx.eval("CATAPP.state.step") != step1:
        print("[NG] 一時停止中にオートが進んでしまった")
        return 1
    ctx.eval("CATAPP.toggleAuto()")
    print("オートの一時停止/再開: OK")

    # --- 2択のカウントダウン（放っておくとおまかせ選択） ---
    # 確実に2択のある猫に切りかえて、そのステップまで進める
    ctx.eval("""
      (function(){
        var found = null;
        for (var s = 1; s <= 600 && !found; s++) {
          var c = CATGACHA.rollCat(s * 7919);
          for (var i = 1; i < c.story.length; i++) {
            if (c.story[i].choice) { found = {c: c, k: i}; break; }
          }
        }
        if (!found) throw new Error('2択のある猫が見つからない');
        CATAPP.start(found.c);
        CATAPP.state.started = true;
        CATAPP.state.step = found.k;
        CATAPP.render();
      })()
    """)
    if not ctx.eval("!!CATAPP.pendingChoice()"):
        print("[NG] 2択のステップに到達できない")
        return 1
    if ctx.eval("CATAPP.state.choiceTimer") in (0, None):
        print("[NG] 2択でカウントダウンが始まっていない")
        return 1
    left0 = ctx.eval("CATAPP.state.choiceLeft")
    print("カウントダウン:", left0, "ms / speed", ctx.eval("CATAPP.state.speed"))
    if not left0 or left0 <= 0:
        print("[NG] カウントダウンの残り時間が不正")
        return 1
    # 一時停止中は止まる
    ctx.eval("CATAPP.toggleAuto()")
    if ctx.eval("CATAPP.state.choiceTimer") not in (0, None):
        print("[NG] 一時停止してもカウントダウンが止まらない")
        return 1
    ctx.eval("CATAPP.choiceTick()")
    if abs((ctx.eval("CATAPP.state.choiceLeft") or 0) - left0) > 0.001:
        print("[NG] 一時停止中にカウントダウンが進んだ")
        return 1
    ctx.eval("CATAPP.toggleAuto()")
    if ctx.eval("CATAPP.state.choiceTimer") in (0, None):
        print("[NG] 再開してもカウントダウンが動かない")
        return 1
    # 時間切れ → おまかせで選ばれてオートが続く
    ctx.eval("CATAPP.state.choiceLeft = 60; CATAPP.choiceTick();")
    if ctx.eval("!!CATAPP.pendingChoice()"):
        print("[NG] 時間切れで自動選択されない")
        return 1
    if "時間切れ" not in ctx.eval("document.getElementById('stageToast').textContent"):
        print("[NG] 時間切れのおまかせ表示がない")
        return 1
    print("2択のカウントダウン/一時停止/おまかせ選択: OK")

    # --- 年齢の帯（現在の年齢＋通り過ぎた節目だけ／寿命は伏せる） ---
    strip = json.loads(ctx.eval("""
      (function(){
        var marks = document.getElementById('lifeMarks').innerHTML;
        var age = CATAPP.state.current.story[CATAPP.state.step].age;
        var future = [];
        (marks.match(/(\\d+)歳/g) || []).forEach(function(t){
          var n = parseInt(t, 10);
          if (n > age + 0.0001) future.push(n);
        });
        return JSON.stringify({
          age: document.getElementById('lifeAge').textContent,
          season: document.getElementById('lifeSeason').textContent,
          marks: marks.length, future: future
        });
      })()
    """))
    print("年齢の帯:", strip)
    if not strip["age"]:
        print("[NG] 現在の年齢が出ていない")
        return 1
    if strip["future"]:
        print("[NG] まだ来ていない年齢の節目が出ている:", strip["future"])
        return 1

    # 総歩数（寿命）が見えないこと
    prog_html = ctx.eval("CATAPP.progressHTML(CATAPP.state.current, 3)")
    card_now = ctx.eval("document.getElementById('pageWrap').innerHTML")
    sub_now = ctx.eval("document.getElementById('walkSub').textContent")
    print("進捗表示:", prog_html, "/ walkSub:", sub_now)
    if "歩目" not in prog_html or "あと" in prog_html or re.search(r"\d+\s*/\s*\d+", prog_html):
        print("[NG] 進捗表示が総歩数を漏らしている:", prog_html)
        return 1
    if "あと" in sub_now:
        print("[NG] walkSub が残り歩数を漏らしている:", sub_now)
        return 1
    if "page-no" in card_now or re.search(r"\d+\s*/\s*\d+", card_now):
        print("[NG] カードに総歩数の表示がある")
        return 1

    # --- 猫ステージ（画像・首輪・ステータス） ---
    actor = ctx.eval("document.getElementById('catActor').innerHTML")
    if '<img' not in actor or 'assets/cats/' not in actor or 'collarBadge' not in actor:
        print("[NG] 猫ステージに画像/首輪バッジがない", actor[:120])
        return 1
    if '-kitten.png' not in actor or '-adult.png' not in actor:
        print("[NG] 子猫と成猫の両方の画像が入っていない")
        return 1
    print("猫ステージ: 子猫/成猫画像 + 首輪バッジ OK")

    scene_cls = ctx.eval("document.getElementById('stageScene').className")
    if "stage-scene scene--" not in scene_cls:
        print("[NG] 背景シーンが設定されていない:", scene_cls)
        return 1
    stats_html = ctx.eval("document.getElementById('stats').innerHTML")
    if stats_html.count("stat--") < 3 or "たいりょく" not in stats_html or "おなか" not in stats_html or "うん" not in stats_html:
        print("[NG] ミニステータスが3つ出ていない", len(stats_html))
        return 1
    print("背景シーン:", scene_cls, "/ ステータス:", len(stats_html), "文字")

    # タップ反応（例外なく動くか）
    ctx.eval("CATAPP.tapCat()")
    if ctx.eval("CATAPP.state.taps") < 1:
        print("[NG] タップ反応が動いていない")
        return 1
    print("タップ反応: OK（吹き出し", ctx.eval("CATART.bubbleFor(1,1).text"), "）")

    # 成長：子猫と成猫で画像とサイズが違う
    grow = ctx.eval("""
      (function(){
        var c = CATGACHA.rollCat(4242);
        var k = CATART.actorHTML(c, {stage:'kitten'});
        var a = CATART.actorHTML(c, {stage:'adult'});
        return JSON.stringify({
          kKitten: k.indexOf('is-kitten') >= 0 && k.indexOf('cat-img--kitten is-on') >= 0,
          aAdult: a.indexOf('is-adult') >= 0 && a.indexOf('cat-img--adult is-on') >= 0,
          different: CATART.assetPath(c,'kitten') !== CATART.assetPath(c,'adult')
        });
      })()
    """)
    print("成長表示:", grow)
    if '"kKitten":true' not in grow or '"aAdult":true' not in grow or '"different":true' not in grow:
        print("[NG] 子猫→成猫の表示切り替えが不正")
        return 1

    # 拾われる体験：野良として生まれた猫を探し、首輪と家の背景を確認
    adopt = ctx.eval("""
      (function(){
        for (var i = 1; i <= 1500; i++) {
          var c = CATGACHA.rollCat(i * 7919);
          if (c.adoptIndex != null) {
            return JSON.stringify({
              i: i, route: c.route, idx: c.adoptIndex,
              kind: c.story[c.adoptIndex].kind,
              before: CATART.sceneKeyFor(c, c.adoptIndex - 1),
              after: CATART.sceneKeyFor(c, c.adoptIndex),
              last: CATART.sceneKeyFor(c, c.story.length - 1),
              collar: CATART.actorHTML(c, {stage: c.story[c.adoptIndex].stage}).indexOf('collarBadge') >= 0,
              html: CATAPP.buildStepHTML(c, c.adoptIndex, {}),
              maneki: !!c.maneki,
              npBefore: CATAPP.nameplateHTML(c, c.adoptIndex - 1),
              npAfter: CATAPP.nameplateHTML(c, c.adoptIndex),
              statusBefore: CATGACHA.statusOf(c, c.adoptIndex - 1).text,
              statusAfter: CATGACHA.statusOf(c, c.adoptIndex).text
            });
          }
        }
        return '{}';
      })()
    """)
    ad = json.loads(adopt)
    if not ad:
        print("[NG] 拾われる猫が見つからない")
        return 1
    if ad["kind"] != "adopt" or ad["after"] not in ("home", "shop") or ad["last"] not in ("home", "shop") or ad["before"] == "home":
        print("[NG] 拾われた時の背景切り替えが不正", ad["before"], "->", ad["after"])
        return 1
    if "家族に迎えられた" not in ad["html"] and "お店に迎えられた" not in ad["html"]:
        print("[NG] 拾われたカードの表示が不正")
        return 1
    print(f"拾われる体験: seed {ad['i']} / {ad['route']} / {ad['before']} → {ad['after']} / 首輪 OK")

    # 名札の境遇が「野良猫 → 🏡 拾われて飼い猫に」に切りかわる
    print("名札の境遇:", ad["statusBefore"], "→", ad["statusAfter"])
    if ad["statusBefore"] == ad["statusAfter"]:
        print("[NG] 拾われても名札の境遇が変わらない")
        return 1
    if not any(k in ad["statusAfter"] for k in ("拾われて", "迎えられた", "招き猫")):
        print("[NG] 拾われた後の境遇表示が不正:", ad["statusAfter"])
        return 1

    # 長い猫生（15歳前後）はパワーアップした進捗バーになる
    prog = ctx.eval("""
      (function(){
        for (var s = 1; s <= 4000; s++) {
          var c = CATGACHA.rollCat(s * 104729);
          if (c.ageYears >= 14 && c.ageYears <= 16 && !c.nekomata) {
            return JSON.stringify({
              age: c.ageYears, len: c.story.length,
              html: CATAPP.progressHTML(c, 10),
              steps15: CATGACHA.storyStepCount(15),
              steps1: CATGACHA.storyStepCount(1),
              stepsHalf: CATGACHA.storyStepCount(0.5),
              seconds: 52 * 3.8
            });
          }
        }
        return '{}';
      })()
    """)
    pg = json.loads(prog)
    print("15歳前後の猫生:", {k: pg[k] for k in ("age", "len", "steps15", "steps1", "stepsHalf") if k in pg})
    if not pg or "歩目" not in pg["html"] or re.search(r"\d+\s*/\s*\d+", pg["html"]) or "あと" in pg["html"]:
        print("[NG] 長い猫生の進捗表示が不正（総歩数が漏れている）:", (pg or {}).get("html"))
        return 1
    if not (45 <= pg["steps15"] <= 60):
        print("[NG] 15歳の歩数が45〜60でない:", pg["steps15"])
        return 1
    if not (4 <= pg["stepsHalf"] <= 8):
        print("[NG] 1歳未満の歩数が4〜8でない:", pg["stepsHalf"])
        return 1
    cur_step = ctx.eval("CATAPP.state.current.story[CATAPP.state.step]")
    if ctx.eval("!!CATAPP.state.current.story[CATAPP.state.step].choice && CATAPP.state.current.story[CATAPP.state.step].chosen == null"):
        # 2択の途中なら「歩む」は隠れているのが正しい（選択肢で休む仕様）
        if not ctx.eval("document.getElementById('walkBtn').hidden"):
            print("[NG] 2択なのに歩むボタンが出ている")
            return 1
        print("2択で自動停止: OK")
    elif ctx.eval("document.getElementById('walkBtn').hidden"):
        print("[NG] 歩むボタンが出ていない")
        return 1

    # --- 猫生を歩む（2択は先に選ぶ） ---
    ctx.eval("""
      var guard = 0;
      while (guard++ < 120) {
        var st = CATAPP.state.current.story[CATAPP.state.step];
        if (st.kind === 'death') break;
        if (st.choice && st.chosen == null) {
          if (document.getElementById('walkBtn').hidden !== true) { throw new Error('2択なのに歩むボタンが出ている'); }
          CATAPP.choose(0);
        }
        var before = CATAPP.state.step;
        CATAPP.walk();
        if (CATAPP.state.step !== before + 1) { throw new Error('歩数が進まない'); }
      }
    """)
    step, total = ctx.eval("CATAPP.state.step"), ctx.eval("CATAPP.state.dex.total")
    print("最期までの歩数:", step + 1, "/ 図鑑登録:", total)
    if not ctx.eval("CATAPP.state.current.story[CATAPP.state.step].kind === 'death'"):
        print("[NG] 最期に到達していない")
        return 1
    if total != 1:
        print("[NG] フィナーレで図鑑に登録されていない")
        return 1
    if ctx.eval("document.getElementById('finale').hidden"):
        print("[NG] フィナーレが表示されていない")
        return 1
    fin = ctx.eval("document.getElementById('finaleBody').innerHTML")
    if "享年" not in fin or "この猫に生まれる確率" not in fin or "転生猫図鑑に登録しました" not in fin:
        print("[NG] フィナーレの中身が足りない", len(fin))
        return 1
    if "undefined" in fin or "NaN" in fin:
        print("[NG] フィナーレに undefined/NaN")
        return 1
    if 'class="prob-place"' not in fin or 'class="prob-base"' not in fin:
        print("[NG] 確率欄のレイアウト要素がない")
        return 1
    if "ach-burst" not in fin or "実績・称号" not in fin:
        print("[NG] フィナーレに実績欄がない")
        return 1
    print("フィナーレ文字数:", len(fin), "/ 享年・確率・実績・図鑑通知 OK")

    ach = json.loads(ctx.eval("JSON.stringify(CATAPP.state.dex.ach)"))
    print("解除した実績:", list(ach.keys()))
    if "first" not in ach:
        print("[NG] はじめての猫生が解除されていない")
        return 1
    if "はじめての猫生" not in fin:
        print("[NG] 新規実績がフィナーレに表示されていない")
        return 1
    if not ctx.eval("document.getElementById('walkBtn').hidden"):
        print("[NG] 最期でも歩むボタンが出ている")
        return 1
    if not ctx.eval("document.getElementById('skipBtn').hidden"):
        print("[NG] 最期でもスキップボタンが出ている")
        return 1
    if ctx.eval("CATAPP.state.autoTimer") not in (0, None):
        print("[NG] 最期なのにオートのタイマーが残っている")
        return 1
    if "自動で進む" not in ctx.eval("document.getElementById('autoNote').textContent") and "終わった" not in ctx.eval("document.getElementById('autoNote').textContent"):
        print("[NG] 最期のオート表示が不正")
        return 1
    mem = ctx.eval("document.getElementById('memoryList').innerHTML")
    print("これまでの歩み文字数:", len(mem))
    if len(mem) < 200:
        print("[NG] 歩みの振り返りが描画されていない")
        return 1

    # --- シェア ---
    ctx.eval("__handlers['shareBtn:click'][0]()")
    opened = ctx.eval("JSON.stringify(__opened)")
    print("シェアURL:", opened[:80])
    if "twitter.com/intent/tweet" not in opened:
        print("[NG] シェアURLが不正")
        return 1

    # --- 図鑑 ---
    ctx.eval("__handlers['openDex:click'][0]()")
    dex_html = ctx.eval("document.getElementById('dexBody').innerHTML")
    print("図鑑(種別)文字数:", len(dex_html))
    ctx.eval("CATAPP.state.tab='countries'; __handlers['openDex:click'][0]()")
    print("図鑑(国)文字数:", len(ctx.eval("document.getElementById('dexBody').innerHTML")))
    ctx.eval("CATAPP.state.tab='achievements'; __handlers['openDex:click'][0]()")
    ach_html = ctx.eval("document.getElementById('dexBody').innerHTML")
    print("図鑑(実績・きろく)文字数:", len(ach_html))
    for need in ("実績・称号", "📊 これまでのきろく", "累計転生", "最長寿記録", "図鑑コンプ率", "はじめての猫生"):
        if need not in ach_html:
            print("[NG] 実績タブに不足:", need)
            return 1
    ctx.eval("__handlers['closeDex:click'][0]()")
    print("モーダル:", ctx.eval("document.getElementById('dexModal').hidden"))

    # --- 図鑑：「過去の猫生」タブ（一覧 → 詳細 → 戻る） ---
    print("\n--- 図鑑：過去の猫生 ---")
    dex_albums = json.loads(ctx.eval("""
      (function(){
        var d = CATAPP.state.dex;
        return JSON.stringify({
          count: (d.albums || []).length,
          logs: d.albums[0] ? d.albums[0].logs.length : 0,
          id: d.albums[0] ? d.albums[0].id : null,
          name: d.albums[0] ? d.albums[0].name : null,
          texts: d.albums[0] ? d.albums[0].logs.map(function(g){ return g.text; }) : [],
          picks: d.albums[0] ? d.albums[0].logs.filter(function(g){ return g.pickedLabel; }).length : 0,
          ageYears: d.albums[0] ? d.albums[0].ageYears : 0
        });
      })()
    """))
    print("記録:", {k: dex_albums[k] for k in ("count", "logs", "picks", "ageYears")})
    if dex_albums["count"] != 1:
        print("[NG] 猫生完了後にフル記録が保存されていない")
        return 1
    if dex_albums["logs"] < 4:
        print("[NG] フル記録の歩みが少なすぎる:", dex_albums["logs"])
        return 1

    saved_dex = ctx.eval("localStorage.getItem('catgacha.dex.v1')")
    if '"albums"' not in saved_dex or '"logs"' not in saved_dex:
        print("[NG] フル記録がlocalStorageに保存されていない")
        return 1
    print("保存サイズ:", len(saved_dex), "bytes（albums/logs を含む）")

    ctx.eval("CATAPP.state.tab='albums'; __handlers['openDex:click'][0]()")
    lst_html = ctx.eval("document.getElementById('dexBody').innerHTML")
    for need in ("album-list", 'data-album="', "album-thumb", "享年", "assets/cats/", "過去の猫生"):
        if need not in lst_html and need != "過去の猫生":
            print("[NG] 過去の猫生の一覧に不足:", need)
            return 1
    if "undefined" in lst_html or "NaN" in lst_html:
        print("[NG] 一覧に undefined/NaN")
        return 1
    if "album-back" in lst_html:
        print("[NG] 一覧なのに戻るボタンがある")
        return 1
    print("一覧:", len(lst_html), "文字 / カード", lst_html.count('data-album='), "枚")

    # カードをタップ（dexBody のクリック委譲）して詳細へ
    ctx.eval("""
      var __hit = { getAttribute: function(k){ return k === 'data-album' ? %s : null; },
        closest: function(sel){ return sel.indexOf('back') >= 0 ? null : __hit; } };
      __handlers['dexBody:click'][0]({target: __hit});
    """ % json.dumps(dex_albums["id"]))
    det = ctx.eval("document.getElementById('dexBody').innerHTML")
    if ctx.eval("CATAPP.state.albumId") != dex_albums["id"]:
        print("[NG] カードをタップしても詳細が開かない")
        return 1
    for need in ("← 一覧に戻る", "album-detail", "album-hero", "この子のプロフィール", "最期のステータス",
                 "album-timeline", "生まれた日から、最期まで", dex_albums["name"]):
        if need not in det:
            print("[NG] 詳細に不足:", need)
            return 1
    if "undefined" in det or "NaN" in det:
        print("[NG] 詳細に undefined/NaN")
        return 1
    missing = [t for t in dex_albums["texts"] if t not in det]
    if missing:
        print("[NG] 詳細に載っていない歩み:", len(missing), missing[:1])
        return 1
    if dex_albums["picks"] and "選んだ：" not in det:
        print("[NG] 詳細に選んだ2択が出ていない")
        return 1
    print("詳細:", len(det), "文字 / 全", len(dex_albums["texts"]), "歩を表示 / 2択", dex_albums["picks"], "回")

    # 「← 一覧に戻る」
    ctx.eval("""
      var __back = { getAttribute: function(){ return null; },
        closest: function(sel){ return sel.indexOf('back') >= 0 ? __back : null; } };
      __handlers['dexBody:click'][0]({target: __back});
    """)
    if ctx.eval("CATAPP.state.albumId") is not None:
        print("[NG] 戻るで一覧に戻らない")
        return 1
    back_html = ctx.eval("document.getElementById('dexBody').innerHTML")
    if 'data-album="' not in back_html or "album-detail" in back_html:
        print("[NG] 戻った後に一覧が出ていない")
        return 1
    print("戻る: 一覧に復帰 OK")

    # 実績タブの「最近の猫生」から詳細に飛べる
    ctx.eval("CATAPP.state.tab='achievements'; CATAPP.state.albumId=null; __handlers['openDex:click'][0]()")
    ach_now = ctx.eval("document.getElementById('dexBody').innerHTML")
    if 'record-link' not in ach_now or 'data-album="' not in ach_now:
        print("[NG] 実績タブの最近の猫生が詳細にリンクしていない")
        return 1
    ctx.eval("""
      var __jump = { getAttribute: function(k){ return k === 'data-album' ? %s : null; },
        closest: function(sel){ return sel.indexOf('back') >= 0 ? null : __jump; } };
      __handlers['dexBody:click'][0]({target: __jump});
    """ % json.dumps(dex_albums["id"]))
    if ctx.eval("CATAPP.state.tab") != "albums" or ctx.eval("CATAPP.state.albumId") != dex_albums["id"]:
        print("[NG] 最近の猫生から詳細に飛べない")
        return 1
    if "album-detail" not in ctx.eval("document.getElementById('dexBody').innerHTML"):
        print("[NG] 最近の猫生からの遷移先が詳細でない")
        return 1
    print("最近の猫生 → 詳細: OK")
    ctx.eval("CATAPP.state.albumId=null; CATAPP.state.tab='species'; __handlers['closeDex:click'][0]()")

    # localStorage 保存（実績も入っている）
    saved = ctx.eval("localStorage.getItem('catgacha.dex.v1')")
    print("保存データ:", "あり" if saved else "なし", "(" + str(len(saved or "")) + " bytes)")
    if not saved:
        print("[NG] 図鑑が保存されていない")
        return 1
    if '"ach"' not in saved:
        print("[NG] 実績が保存されていない")
        return 1

    # --- もう一度 → スキップで最期まで ---
    ctx.eval("__handlers['againBtn:click'][0]()")
    ctx.eval("__runTimers(100);")
    if ctx.eval("CATAPP.state.step") != 0:
        print("[NG] もう一度で新しい子猫が生まれていない")
        return 1
    ctx.eval("CATAPP.skipAll()")
    print("スキップ後の歩数:", ctx.eval("CATAPP.state.step + 1"), "/ 図鑑:", ctx.eval("CATAPP.state.dex.total"))
    if not ctx.eval("CATAPP.state.current.story[CATAPP.state.step].kind === 'death'"):
        print("[NG] スキップで最期まで進めていない")
        return 1
    if ctx.eval("CATAPP.state.dex.total") != 2:
        print("[NG] スキップ後の図鑑登録が一度だけになっていない")
        return 1
    skip_fin = ctx.eval("document.getElementById('finaleBody').innerHTML")
    if "享年" not in skip_fin:
        print("[NG] スキップ後のフィナーレに享年がない")
        return 1

    # --- 連続30猫生（roll → skip）で例外が出ないか ---
    ctx.eval("""
      for (var i = 0; i < 30; i++) {
        __handlers['rollBtn:click'][0]();
        __runTimers(100);
        CATAPP.skipAll();
      }
    """)
    print("30連続の猫生後:", ctx.eval("CATAPP.state.dex.total"), "回")
    if ctx.eval("CATAPP.state.dex.total") != 32:
        print("[NG] 連続実行で図鑑登録数が合わない")
        return 1

    # --- 2択の分岐（延命・拾われる・ピンチ）が選んだ瞬間に効く ---
    branch = ctx.eval("""
      (function(){
        function findFx(pred){
          for (var s = 1; s < 4000; s++) {
            var c = CATGACHA.rollCat(s * 104729);
            for (var k = 0; k < c.story.length; k++) {
              var st = c.story[k];
              if (!st.choice) continue;
              for (var oi = 0; oi < st.choice.options.length; oi++) {
                var eff = st.choice.options[oi].effect || {};
                if (pred(eff)) return {c: c, k: k, oi: oi, eff: eff};
              }
            }
          }
          return null;
        }
        var out = {};
        var hit = findFx(function(e){ return !!e.life; });
        if (hit) {
          var before = {age: hit.c.ageYears, len: hit.c.story.length};
          var f = CATGACHA.applyChoice(hit.c, hit.k, hit.oi);
          out.life = {before: before, after: {age: hit.c.ageYears, len: hit.c.story.length}, fx: f};
        }
        hit = findFx(function(e){ return !!e.adopt; });
        if (hit) {
          var before2 = hit.c.story.length;
          var f2 = CATGACHA.applyChoice(hit.c, hit.k, hit.oi);
          out.adopt = {before: before2, after: hit.c.story.length, idx: hit.c.adoptIndex, kind: hit.c.story[hit.c.adoptIndex].kind, fx: f2, scene: CATART.sceneKeyFor(hit.c, hit.c.adoptIndex)};
        }
        hit = findFx(function(e){ return !!e.risk; });
        if (hit) {
          var f3 = CATGACHA.applyChoice(hit.c, hit.k, hit.oi);
          out.risk = {fx: f3, last: hit.c.story[hit.c.story.length - 1].kind, len: hit.c.story.length};
        }
        hit = findFx(function(e){ return !!e.boss; });
        if (hit) {
          var f4 = CATGACHA.applyChoice(hit.c, hit.k, hit.oi);
          out.boss = {fx: f4, boss: !!hit.c.bossCat, age: hit.c.ageYears};
        }
        return JSON.stringify(out);
      })()
    """)
    br = json.loads(branch)
    print("分岐テスト:", json.dumps(br, ensure_ascii=False)[:400])
    if not br.get("life"):
        print("[NG] 延命の2択が見つからない")
        return 1
    if not (br["life"]["after"]["age"] > br["life"]["before"]["age"] and br["life"]["fx"]["lifeAdded"] > 0):
        print("[NG] 延命が寿命に反映されていない")
        return 1
    if not br.get("adopt") or br["adopt"]["kind"] != "adopt" or br["adopt"]["scene"] not in ("home", "shop"):
        print("[NG] 2択から拾われる分岐が動かない")
        return 1
    if not br.get("risk") or br["risk"]["last"] != "death":
        print("[NG] ピンチの分岐で最期が入らない")
        return 1
    if not br.get("boss") or not br["boss"]["boss"]:
        print("[NG] ボス猫ルートが動かない")
        return 1
    print("2択の分岐（延命/拾われる/ピンチ/ボス）: OK")

    # --- 超レア進化ルート（猫又・招き猫）がUIでも壊れない ---
    rare = ctx.eval("""
      (function(){
        var neko = null, maneki = null;
        for (var s = 1; s < 20000 && (!neko || !maneki); s++) {
          var c = CATGACHA.rollCat(s * 7919);
          if (!neko && c.nekomata) neko = c;
          if (!maneki && c.maneki) maneki = c;
        }
        var out = {};
        if (neko) {
          var idx = neko.story.length - 2;
          out.neko = {
            age: neko.ageYears, len: neko.story.length,
            html: CATAPP.buildStepHTML(neko, idx, {}),
            finale: CATAPP.buildFinaleHTML(neko, [CATGACHA.achievementDef('nekomata')], {ach:{nekomata:1}}),
            scene: CATART.sceneKeyFor(neko, idx),
            form: CATAPP.formAt ? CATAPP.formAt(neko, idx) : 'n/a',
            particles: CATART.particlesHTML(neko, idx, false)
          };
        }
        if (maneki) {
          var i2 = maneki.story.length - 1;
          out.maneki = {
            age: maneki.ageYears, len: maneki.story.length, adoptIndex: maneki.adoptIndex,
            html: CATAPP.buildStepHTML(maneki, maneki.adoptIndex, {}),
            finale: CATAPP.buildFinaleHTML(maneki, [CATGACHA.achievementDef('maneki')], {ach:{maneki:1}}),
            scene: CATART.sceneKeyFor(maneki, maneki.adoptIndex),
            form: CATAPP.formAt ? CATAPP.formAt(maneki, maneki.adoptIndex) : 'n/a'
          };
        }
        return JSON.stringify(out);
      })()
    """)
    rare = json.loads(rare)
    if not rare.get("neko"):
        print("[NG] 猫又ルートの猫が見つからない（UI検証不能）")
        return 1
    if "猫又" not in rare["neko"]["html"] or "page--evolve" not in rare["neko"]["html"]:
        print("[NG] 猫又のページ表示が不正")
        return 1
    if "猫又" not in rare["neko"]["finale"] or "undefined" in rare["neko"]["finale"]:
        print("[NG] 猫又のフィナーレが不正")
        return 1
    if rare["neko"]["age"] < 100 or rare["neko"]["len"] < 9:
        print("[NG] 猫又の寿命/歩数が不正", rare["neko"]["age"], rare["neko"]["len"])
        return 1
    if "🔮" not in rare["neko"]["particles"]:
        print("[NG] 猫又のパーティクルがない")
        return 1
    print("猫又ルート: age", rare["neko"]["age"], "/ form", rare["neko"]["form"], "/ scene", rare["neko"]["scene"])
    if rare.get("maneki"):
        if "招き猫" not in rare["maneki"]["finale"] or "undefined" in rare["maneki"]["finale"]:
            print("[NG] 招き猫のフィナーレが不正")
            return 1
        if rare["maneki"]["scene"] != "shop":
            print("[NG] 招き猫の背景がお店になっていない:", rare["maneki"]["scene"])
            return 1
        print("招き猫ルート: age", rare["maneki"]["age"], "/ form", rare["maneki"]["form"], "/ scene", rare["maneki"]["scene"])
    else:
        print("[note] このシード範囲では招き猫が出なかった（simulate.py で件数確認）")

    # --- 実績の評価関数が壊れていないか ---
    achcheck = json.loads(ctx.eval("""
      (function(){
        var base = {total: 1, speciesCount: 1, countryCount: 1, adoptCount: 0, maxAge: 1,
          peak: {energy: 41, food: 42, luck: 43}, cat: {ageYears: 1, route: 'owned', mutations: [], rarity: 'N'}};
        var a = CATGACHA.evaluateAchievements(base);
        var b = CATGACHA.evaluateAchievements(Object.assign({}, base, {
          total: 100, speciesCount: 60, countryCount: 30, adoptCount: 6,
          peak: {energy: 90, food: 90, luck: 90},
          cat: {ageYears: 100, route: 'street', mutations: [{key:'odd_eye'}], rarity: 'UR', bossCat: true, nekomata: true, maneki: true}
        }));
        return JSON.stringify({defs: CATGACHA.ACHIEVEMENTS.length, a: a, b: b});
      })()
    """))
    print("実績定義:", achcheck["defs"], "個 / 初期:", achcheck["a"])
    if achcheck["defs"] < 20:
        print("[NG] 実績が20個未満")
        return 1
    if "first" not in achcheck["a"]:
        print("[NG] 実績評価が動かない")
        return 1
    for key in ("nekomata", "maneki", "freeKing", "legend20", "all80", "ur"):
        if key not in achcheck["b"]:
            print("[NG] 実績条件が不足:", key)
            return 1

    # --- 旧セーブデータ互換（logs/albums が無い図鑑でも動く） ---
    print("\n--- 旧セーブデータ互換 ---")
    ctx2 = quickjs.Context()
    ctx2.eval(DOM_STUB)
    legacy_dex = {
        "total": 2, "species": {"coat:kijitora": 2}, "countries": {"jp": 2}, "mutations": {},
        "rarities": {"N": 2}, "maxAge": 12,
        "history": [{"name": "タマ", "species": "茶トラ", "region": "日本", "rarity": "N", "age": 12,
                     "at": 1, "adopted": False, "boss": False, "nekomata": False, "maneki": False}],
        "ach": {"first": 1},
    }
    ctx2.eval("localStorage.setItem('catgacha.dex.v1', " + json.dumps(json.dumps(legacy_dex, ensure_ascii=False)) + ");")
    for f in JS_FILES + ["js/app.js"]:
        ctx2.eval((ROOT / f).read_text(encoding="utf-8"))
    ctx2.eval("CATAPP.state.tab='albums'; __handlers['openDex:click'][0]()")
    old_list = ctx2.eval("document.getElementById('dexBody').innerHTML")
    print("旧データの albums:", ctx2.eval("JSON.stringify(CATAPP.state.dex.albums)"))
    if "まだ過去の猫生はありません" not in old_list:
        print("[NG] 旧データで「過去の猫生」の空表示が出ない")
        return 1
    if "undefined" in old_list:
        print("[NG] 旧データで undefined が出る")
        return 1
    # 旧データのままでも1匹の猫生を完了して記録を足せる
    ctx2.eval("__handlers['closeDex:click'][0](); __handlers['rollBtn:click'][0](); __runTimers(100); CATAPP.skipAll();")
    if ctx2.eval("CATAPP.state.dex.albums.length") != 1:
        print("[NG] 旧データに記録を追加できない")
        return 1
    ctx2.eval("CATAPP.state.tab='albums'; __handlers['openDex:click'][0]()")
    old_new = ctx2.eval("document.getElementById('dexBody').innerHTML")
    if "album-card" not in old_new or "undefined" in old_new:
        print("[NG] 旧データに追加した記録の一覧が不正")
        return 1
    if "albums" not in (ctx2.eval("localStorage.getItem('catgacha.dex.v1')") or ""):
        print("[NG] 旧データに追加した記録が保存されていない")
        return 1
    print("旧データ互換: OK（空表示 → 記録追加 → 保存）")

    print("\n結果:", "PASS" if not failures else f"FAIL ({len(failures)}件)")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
