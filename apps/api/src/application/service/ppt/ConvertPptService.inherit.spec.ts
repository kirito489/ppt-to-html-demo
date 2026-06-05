import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

// master：txStyles 提供後備字級（title 4400 / body 2800 / other 1800）
const MASTER_XML =
  `<?xml version="1.0"?><p:sldMaster xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree/></p:cSld>` +
  `<p:txStyles>` +
  `<p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"/></a:lvl1pPr></p:titleStyle>` +
  `<p:bodyStyle><a:lvl1pPr><a:defRPr sz="2800"/></a:lvl1pPr></p:bodyStyle>` +
  `<p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle>` +
  `</p:txStyles></p:sldMaster>`;

// layout：idx=2 內容框帶自己的 lstStyle（sz=2400 + 顏色 112233）；title 框無 lstStyle
const LAYOUT_INNER =
  `<p:sp><p:nvSpPr><p:nvPr><p:ph idx="2"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="1000000"/><a:ext cx="12192000" cy="5000000"/></a:xfrm></p:spPr><p:txBody><a:lstStyle><a:lvl1pPr><a:defRPr sz="2400"><a:solidFill><a:srgbClr val="112233"/></a:solidFill></a:defRPr></a:lvl1pPr></a:lstStyle></p:txBody></p:sp>` +
  `<p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="900000"/></a:xfrm></p:spPr></p:sp>`;

const buildPptx = async (slideInner: string): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/></p:presentation>`,
  );
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="slide" Target="slides/slide1.xml"/></Relationships>`,
  );
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>${slideInner}</p:spTree></p:cSld></p:sld>`,
  );
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdL" Type="slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
  );
  zip.file(
    'ppt/slideLayouts/slideLayout1.xml',
    `<?xml version="1.0"?><p:sldLayout xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree>${LAYOUT_INNER}</p:spTree></p:cSld></p:sldLayout>`,
  );
  zip.file(
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdM" Type="slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
  );
  zip.file('ppt/slideMasters/slideMaster1.xml', MASTER_XML);
  return zip.generateAsync({ type: 'nodebuffer' });
};

// 內容框：只有 idx（無 type），run 無 sz/color → 應繼承 layout lstStyle
const CONTENT_SP = `<p:sp><p:nvSpPr><p:nvPr><p:ph idx="2"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:p><a:r><a:rPr/><a:t>內容文字</a:t></a:r></a:p></p:txBody></p:sp>`;
// 標題框：type=title，run 無 sz → 無 layout lstStyle → 退 master titleStyle
const TITLE_SP = `<p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:p><a:r><a:rPr/><a:t>標題文字</a:t></a:r></a:p></p:txBody></p:sp>`;

describe('ConvertPptService placeholder 字級/顏色繼承（優先 layout lstStyle）', () => {
  const service = new ConvertPptService();

  it('idx-only 內容框字級取 layout lstStyle（2400→2.5cqw），非 other 18pt', async () => {
    const { html } = await service.execute({
      buffer: await buildPptx(CONTENT_SP),
      filename: 'i.pptx',
    });
    expect(html).toContain('font-size:2.5cqw');
    expect(html).not.toContain('font-size:1.875cqw');
  });

  it('idx-only 內容框繼承 layout lstStyle 顏色', async () => {
    const { html } = await service.execute({
      buffer: await buildPptx(CONTENT_SP),
      filename: 'i.pptx',
    });
    expect(html).toContain('color:#112233');
  });

  it('title 無 layout lstStyle → 退回 master titleStyle（4400→4.583cqw）', async () => {
    const { html } = await service.execute({
      buffer: await buildPptx(TITLE_SP),
      filename: 'i.pptx',
    });
    expect(html).toContain('font-size:4.583cqw');
  });
});
