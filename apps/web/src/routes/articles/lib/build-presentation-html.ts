const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** 取文章 HTML 內各投影片（section.ppt-slide）的 outerHTML */
const splitSlides = (articleHtml: string): string[] => {
  const doc = new DOMParser().parseFromString(articleHtml, 'text/html')
  return Array.from(doc.querySelectorAll('section.ppt-slide')).map(
    (el) => el.outerHTML,
  )
}

// 翻頁用的極簡 JS：←/→、空白、PageUp/Down、點擊翻頁、全螢幕、頁碼同步
const DECK_SCRIPT = `
var slides=[].slice.call(document.querySelectorAll('.slide'));
var i=0,counter=document.getElementById('counter');
function show(n){i=Math.max(0,Math.min(slides.length-1,n));for(var k=0;k<slides.length;k++)slides[k].classList.toggle('active',k===i);if(counter)counter.textContent=(i+1)+' / '+slides.length;}
document.addEventListener('keydown',function(e){if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' ')show(i+1);else if(e.key==='ArrowLeft'||e.key==='PageUp')show(i-1);});
var p=document.getElementById('prev'),n=document.getElementById('next'),f=document.getElementById('fs'),d=document.getElementById('deck');
if(p)p.onclick=function(e){e.stopPropagation();show(i-1);};
if(n)n.onclick=function(e){e.stopPropagation();show(i+1);};
if(f)f.onclick=function(e){e.stopPropagation();if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen();};
if(d)d.addEventListener('click',function(e){if(!e.target.closest('.nav'))show(i+1);});
show(0);
`

/** 從首頁 section 的 inline aspect-ratio 取長寬比（cx/cy）；無則退回 16/9 */
const slideAspectRatio = (firstSlide: string): string => {
  const m = firstSlide.match(/aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/)
  return m ? `${m[1]} / ${m[2]}` : '16 / 9'
}

// width 取「視窗寬」與「視窗高換算的較小者」，依各投影片實際長寬比塞滿視窗、不裁切
const styleFor = (ratio: string): string => `
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:#111;font-family:system-ui,"Noto Sans TC",sans-serif}
#deck{height:100vh;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer}
.slide{display:none;width:min(100vw,calc(100vh * ${ratio}));box-shadow:0 0 40px rgba(0,0,0,.5)}
.slide.active{display:block}
.empty{color:#bbb;font-size:1rem}
.nav{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);display:flex;gap:8px;align-items:center;background:rgba(0,0,0,.6);color:#fff;padding:6px 12px;border-radius:999px;font-size:14px;user-select:none}
.nav button{background:#fff;color:#111;border:0;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:14px}
.nav #counter{min-width:56px;text-align:center}
`

/**
 * 把文章 HTML 包成可在瀏覽器像 PPT 一頁頁翻的自包含簡報 HTML。
 * 內嵌極簡 JS（←/→、點擊翻頁、頁碼、全螢幕），各頁維持不跑版（沿用 section 自帶樣式）。
 * @param articleHtml 轉換後文章 HTML（含多個 section.ppt-slide）
 * @param title 文件標題（顯示於分頁與下載檔名來源）
 * @returns 完整的自包含 HTML 文件字串
 */
export const buildPresentationHtml = (
  articleHtml: string,
  title: string,
): string => {
  const slides = splitSlides(articleHtml)
  const deck = slides.length
    ? slides.map((s) => `<div class="slide">${s}</div>`).join('')
    : '<p class="empty">沒有可顯示的投影片</p>'
  const ratio = slideAspectRatio(slides[0] ?? '')

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<style>${styleFor(ratio)}</style>
</head>
<body>
<div id="deck">${deck}</div>
<div class="nav">
<button id="prev" aria-label="上一頁">‹</button>
<span id="counter">1 / ${slides.length || 1}</span>
<button id="next" aria-label="下一頁">›</button>
<button id="fs" aria-label="全螢幕">⛶</button>
</div>
<script>${DECK_SCRIPT}</script>
</body>
</html>`
}
