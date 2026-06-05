import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

// 合成 .pptx fixture（最小化，僅供字型/行距驗證）
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

const textShape = (
  t: string,
  opts: { typeface?: string; lnSpcPct?: number; lnSpcPts?: number } = {},
): string => {
  const latin = opts.typeface ? `<a:latin typeface="${opts.typeface}"/>` : '';
  const lnSpc = opts.lnSpcPct
    ? `<a:lnSpc><a:spcPct val="${opts.lnSpcPct}"/></a:lnSpc>`
    : opts.lnSpcPts
      ? `<a:lnSpc><a:spcPts val="${opts.lnSpcPts}"/></a:lnSpc>`
      : '';
  const pPr = lnSpc ? `<a:pPr>${lnSpc}</a:pPr>` : '';
  return `<p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="1000000"/></a:xfrm></p:spPr><p:txBody><a:p>${pPr}<a:r><a:rPr sz="1600">${latin}</a:rPr><a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp>`;
};

describe('ConvertPptService 文字字型與行距（抑制溢出）', () => {
  const service = new ConvertPptService();

  it('文字框一律帶 CJK fallback 字型堆疊', async () => {
    const buffer = await buildPptx(slide(textShape('中文內容')));
    const { html } = await service.execute({ buffer, filename: 't.pptx' });
    expect(html).toContain('font-family:');
    expect(html).toContain('Microsoft JhengHei');
    expect(html).toContain('sans-serif');
  });

  it('來源字型置於堆疊最前', async () => {
    const buffer = await buildPptx(
      slide(textShape('中文', { typeface: '微軟正黑體' })),
    );
    const { html } = await service.execute({ buffer, filename: 't.pptx' });
    expect(html).toContain('font-family:"微軟正黑體"');
    expect(html).toContain('Microsoft JhengHei');
  });

  it('段落行距 spcPct → 無單位 line-height', async () => {
    const buffer = await buildPptx(
      slide(textShape('行距', { lnSpcPct: 150000 })),
    );
    const { html } = await service.execute({ buffer, filename: 't.pptx' });
    expect(html).toContain('line-height:1.5');
  });

  it('段落行距 spcPts → pt line-height', async () => {
    const buffer = await buildPptx(
      slide(textShape('行距', { lnSpcPts: 2400 })),
    );
    const { html } = await service.execute({ buffer, filename: 't.pptx' });
    expect(html).toContain('line-height:24pt');
  });

  it('段落無 lnSpc → 套接近 PP 中文單行的預設行高 1.35', async () => {
    const buffer = await buildPptx(slide(textShape('無行距段落')));
    const { html } = await service.execute({ buffer, filename: 't.pptx' });
    expect(html).toContain('line-height:1.35');
  });
});
