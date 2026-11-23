"""UIスモークテスト（DOMスタブ）
ブラウザ無しで init() → ガチャ → 子猫誕生 → 猫生を歩む → 最期（フィナーレ）→ 図鑑
の一連を実行し、要素IDの取り違えや実行時エラーを検出する。
"""
import re
import sys
from pathlib import Path

import quickjs

ROOT = Path(__file__).resolve().parent.parent
JS_FILES = [
    "js/data-core.js", "js/breeds.js", "js/wild.js", "js/data-countries.js",
    "js/data.js", "js/engine.js", "js/svgcat.js",
]

DOM_STUB = r"""
var __els = {};
var __handlers = {};
function El(id, cls){
  this.id = id; this._cls = cls || ''; this.hidden = false; this.innerHTML = ''; this.textContent = '';
  this.style = {}; this.dataset = {}; this.disabled = false; this.className = ''; this.offsetWidth = 400;
  this.classList = {
    toggle: function(){}, add: function(){}, remove: function(){}, contains: function(){ return false; }
  };
}
El.prototype.addEventListener = function(ev, fn){
  __handlers[this.id + ':' + ev] = __handlers[this.id + ':' + ev] || [];
  __handlers[this.id + ':' + ev].push(fn);
};
function __tabs(){
  return ['species','countries','mutations','records'].map(function(t){
    var e = new El('tab-' + t);
    e.dataset.tab = t;
    return e;
  });
}
var document = {
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
var __timers = 0;
function setTimeout(fn, ms){ __timers++; if (__timers > 8000) throw new Error('setTimeout loop'); fn(); return 0; }
function clearTimeout(){}
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
    card = ctx.eval("document.getElementById('pageWrap').innerHTML")
    if len(card) < 800 or "page-title" not in card or "享年" in card:
        print("[NG] 誕生カードが不正（享年が出ている/描画されていない）", len(card))
        return 1
    print("誕生カード文字数:", len(card), "/ 享年なし OK")
    if ctx.eval("document.getElementById('walkBtn').hidden"):
        print("[NG] 歩むボタンが出ていない")
        return 1

    # --- 猫生を歩む（2択は先に選ぶ） ---
    ctx.eval("""
      var guard = 0;
      while (guard++ < 30) {
        var st = CATAPP.state.current.story[CATAPP.state.step];
        if (st.kind === 'death') break;
        if (st.choice && CATAPP.state.picked[CATAPP.state.step] == null) {
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
    # 地名が単独の行になっている（「北京地球の猫」のような詰まり防止）
    if 'class="prob-place"' not in fin or 'class="prob-base"' not in fin:
        print("[NG] 確率欄のレイアウト要素がない")
        return 1
    print("フィナーレ文字数:", len(fin), "/ 享年・確率・図鑑通知 OK")
    if not ctx.eval("document.getElementById('walkBtn').hidden"):
        print("[NG] 最期でも歩むボタンが出ている")
        return 1
    if not ctx.eval("document.getElementById('skipBtn').hidden"):
        print("[NG] 最期でもスキップボタンが出ている")
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
    ctx.eval("CATAPP.state.tab='records'; __handlers['openDex:click'][0]()")
    print("図鑑(記録)文字数:", len(ctx.eval("document.getElementById('dexBody').innerHTML")))
    ctx.eval("__handlers['closeDex:click'][0]()")
    print("モーダル:", ctx.eval("document.getElementById('dexModal').hidden"))

    # localStorage 保存
    saved = ctx.eval("localStorage.getItem('catgacha.dex.v1')")
    print("保存データ:", "あり" if saved else "なし", "(" + str(len(saved or "")) + " bytes)")
    if not saved:
        print("[NG] 図鑑が保存されていない")
        return 1

    # --- もう一度 → スキップで最期まで ---
    ctx.eval("__handlers['againBtn:click'][0]()")
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
        CATAPP.skipAll();
      }
    """)
    print("30連続の猫生後:", ctx.eval("CATAPP.state.dex.total"), "回")
    if ctx.eval("CATAPP.state.dex.total") != 32:
        print("[NG] 連続実行で図鑑登録数が合わない")
        return 1

    print("\nUIスモーク: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
