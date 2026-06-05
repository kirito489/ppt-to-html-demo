import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

/** 組一個帶 slideLayout 的 pptx（slide 的 placeholder 無自身 xfrm） */
const buildWithLayout = async (
  slideInner: string,
  layoutInner: string,
): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/></p:presentation>`,
  );
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>`,
  );
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>${slideInner}</p:spTree></p:cSld></p:sld>`,
  );
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdL" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
  );
  zip.file(
    'ppt/slideLayouts/slideLayout1.xml',
    `<?xml version="1.0"?><p:sldLayout xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>${layoutInner}</p:spTree></p:cSld></p:sldLayout>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
};

// slide 的 title / body placeholder：皆無自身 xfrm
const slidePlaceholders =
  `<p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:p><a:r><a:t>標題文字</a:t></a:r></a:p></p:txBody></p:sp>` +
  `<p:sp><p:nvSpPr><p:nvPr><p:ph idx="2"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:p><a:r><a:t>內文文字</a:t></a:r></a:p></p:txBody></p:sp>`;

// layout 提供座標：title 在上、body 在中間
const layoutPlaceholders =
  `<p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="195941"/><a:ext cx="12192000" cy="899785"/></a:xfrm></p:spPr></p:sp>` +
  `<p:sp><p:nvSpPr><p:nvPr><p:ph idx="2"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="1203650"/><a:ext cx="12192000" cy="5141166"/></a:xfrm></p:spPr></p:sp>`;

describe('ConvertPptService — placeholder 座標繼承', () => {
  const service = new ConvertPptService();

  it('無自身 xfrm 的 placeholder 從 layout 取得座標，標題與內文不重疊', async () => {
    const buffer = await buildWithLayout(slidePlaceholders, layoutPlaceholders);
    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    // title y = 195941 / 6858000 = 2.857%；body y = 1203650 / 6858000 = 17.551%
    expect(result.html).toContain('top:2.857%');
    expect(result.html).toContain('top:17.551%');
    expect(result.html).toContain('標題文字');
    expect(result.html).toContain('內文文字');
  });

  it('layout 找不到對應時退回整頁 fallback（不中斷）', async () => {
    // layout 沒有任何 placeholder → fallback 整頁
    const buffer = await buildWithLayout(slidePlaceholders, '');
    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    expect(result.slideCount).toBe(1);
    expect(result.html).toContain('top:0%');
  });
});
