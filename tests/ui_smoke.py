"""UIスモークテスト（DOMスタブ）
ブラウザ無しで init() → ガチャ → 結果表示 → 図鑑 の一連を実行し、
要素IDの取り違えや実行時エラーを検出する。
"""
import json
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
  this.style = {}; this.dataset = {}; this.disabled = false; this.className = '';
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
    e.classList = { toggle: function(){}, add: function(){}, remove: function(){}, contains: function(){ return false; } };
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
var __t = 0;
var __timers = 0;
function setTimeout(fn, ms){ __timers++; if (__timers > 5000) throw new Error('setTimeout loop'); fn(); return 0; }
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

    ctx.eval("""
      __handlers['rollBtn:click'][0]();
    """)
    total = ctx.eval("CATAPP.state.dex.total")
    resultHidden = ctx.eval("VAR_RESULT_HIDDEN = document.getElementById('resultScreen').hidden")
    card = ctx.eval("document.getElementById('resultCard').innerHTML")
    print("ガチャ1回後の転生回数:", total)
    if total != 1:
        print("[NG] 転生回数が増えていない")
        return 1
    if len(card) < 500 or "result-name" not in card:
        print("[NG] 結果カードが描画されていない")
        return 1
    print("結果カード文字数:", len(card))

    # もう一度
    ctx.eval("__handlers['againBtn:click'][0]()")
    print("2回目後の転生回数:", ctx.eval("CATAPP.state.dex.total"))

    # シェア
    ctx.eval("__handlers['shareBtn:click'][0]()")
    opened = ctx.eval("JSON.stringify(__opened)")
    print("シェアURL:", opened[:80])
    if "twitter.com/intent/tweet" not in opened:
        print("[NG] シェアURLが不正")
        return 1

    # 図鑑
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

    # 100連続で例外が出ないか
    ctx.eval("""
      for (var i = 0; i < 100; i++) {
        __handlers['rollBtn:click'][0]();
      }
    """)
    print("100連続ガチャ後:", ctx.eval("CATAPP.state.dex.total"), "回")

    print("\nUIスモーク: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
