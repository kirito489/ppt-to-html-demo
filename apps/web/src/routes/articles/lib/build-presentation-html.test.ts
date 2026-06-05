import { describe, expect, it } from 'vitest'
import { buildPresentationHtml } from './build-presentation-html'

const ARTICLE = `<div class="ppt-article"><section class="ppt-slide">第一頁</section><section class="ppt-slide">第二頁</section></div>`

describe('buildPresentationHtml', () => {
  it('每個 section.ppt-slide 變成一頁，並產出自包含可翻頁的 HTML', () => {
    const out = buildPresentationHtml(ARTICLE, '測試簡報')

    expect(out).toContain('<!DOCTYPE html>')
    // 兩頁
    expect(out.match(/class="slide"/g)?.length).toBe(2)
    // 翻頁用的 JS
    expect(out).toContain('<script')
    expect(out).toContain('ArrowRight')
    // 內容保留
    expect(out).toContain('第一頁')
    expect(out).toContain('第二頁')
    // 標題寫進 <title>
    expect(out).toContain('<title>測試簡報</title>')
  })

  it('空輸入不爆，顯示無投影片提示', () => {
    const out = buildPresentationHtml('', '空')
    expect(out).toContain('<!DOCTYPE html>')
    expect(out).toContain('沒有可顯示')
    expect(out).not.toContain('class="slide"')
  })

  it('跳脫標題中的 HTML，避免破壞文件', () => {
    const out = buildPresentationHtml(ARTICLE, '<b>x</b>')
    expect(out).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(out).not.toContain('<title><b>x</b></title>')
  })

  it('依首頁長寬比設定 .slide 寬度（正方形不被裁）', () => {
    const square = `<div class="ppt-article"><section class="ppt-slide" style="aspect-ratio:6858000/6858000;">方</section></div>`
    const out = buildPresentationHtml(square, '方')
    expect(out).toContain('100vh * 6858000 / 6858000')
  })

  it('16:9 簡報用對應長寬比', () => {
    const wide = `<section class="ppt-slide" style="aspect-ratio:12192000/6858000;">寬</section>`
    const out = buildPresentationHtml(wide, '寬')
    expect(out).toContain('100vh * 12192000 / 6858000')
  })

  it('無 aspect-ratio 時退回 16:9', () => {
    const out = buildPresentationHtml(ARTICLE, 'x')
    expect(out).toContain('100vh * 16 / 9')
  })
})
