import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

const buildPptx = async (slideXml: string): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/></p:presentation>`,
  );
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="slide" Target="slides/slide1.xml"/></Relationships>`,
  );
  zip.file('ppt/slides/slide1.xml', slideXml);
  return zip.generateAsync({ type: 'nodebuffer' });
};

const slide = (inner: string): string =>
  `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r"><p:cSld><p:spTree>${inner}</p:spTree></p:cSld></p:sld>`;

// 文字框：可控框尺寸、字級、文字
const box = (text: string, cx: number, cy: number, sz: number): string =>
  `<p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="${sz}"/><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`;

const cjk = (n: number): string => '中'.repeat(n);

const maxFontCqw = (html: string): number =>
  Math.max(
    ...(html.match(/font-size:([0-9.]+)cqw/g) ?? ['font-size:0cqw']).map((m) =>
      Number(m.replace('font-size:', '').replace('cqw', '')),
    ),
  );

describe('ConvertPptService 文字框 autofit 縮放', () => {
  const service = new ConvertPptService();

  it('內容未超框 → 字級不縮放', async () => {
    const { html } = await service.execute({
      buffer: await buildPptx(slide(box(cjk(20), 6000000, 2000000, 2000))),
      filename: 'a.pptx',
    });
    // sz 2000 → fontCqw(2000,12192000)=2.083cqw，未超框維持
    expect(maxFontCqw(html)).toBeCloseTo(2.083, 2);
  });

  it('內容超框 → 字級被等比縮小', async () => {
    const big = await service.execute({
      buffer: await buildPptx(slide(box(cjk(20), 6000000, 2000000, 2000))),
      filename: 'a.pptx',
    });
    const overflow = await service.execute({
      buffer: await buildPptx(slide(box(cjk(200), 6000000, 2000000, 2000))),
      filename: 'a.pptx',
    });
    expect(maxFontCqw(overflow.html)).toBeLessThan(maxFontCqw(big.html));
  });

  it('極度超框 → 縮放不低於下限（字級不會無限小）', async () => {
    // 框高 2500000 ≈ 36% 投影片（> 25% 門檻，會觸發 autofit）
    const { html } = await service.execute({
      buffer: await buildPptx(slide(box(cjk(5000), 2000000, 2500000, 2000))),
      filename: 'a.pptx',
    });
    // 下限 0.5：2.083 × 0.5 ≈ 1.042cqw，不應更小
    expect(maxFontCqw(html)).toBeGreaterThanOrEqual(1.0);
  });
});
