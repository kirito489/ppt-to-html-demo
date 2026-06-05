import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

/** 組一個 pptx：可帶 <p:bg> 與 spTree 內容 */
const build = async (bg: string, spTreeInner: string): Promise<Buffer> => {
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
    `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld>${bg}<p:spTree>${spTreeInner}</p:spTree></p:cSld></p:sld>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
};

const textShapeWith = (inner: string, spPrExtra = ''): string =>
  `<p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6096000" cy="1000000"/></a:xfrm>${spPrExtra}</p:spPr><p:txBody>${inner}</p:txBody></p:sp>`;

describe('ConvertPptService — 背景 / 填色 / 對齊', () => {
  const service = new ConvertPptService();

  it('投影片背景 solidFill 套到頁面背景（非白底）', async () => {
    const bg = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="ED7D31"/></a:solidFill></p:bgPr></p:bg>`;
    const buffer = await build(
      bg,
      textShapeWith('<a:p><a:r><a:t>X</a:t></a:r></a:p>'),
    );
    const result = await service.execute({ buffer, filename: 'd.pptx' });
    expect(result.html).toContain('background:#ED7D31');
  });

  it('形狀 solidFill 套為元素底色', async () => {
    const sp = textShapeWith(
      '<a:p><a:r><a:t>色塊</a:t></a:r></a:p>',
      '<a:solidFill><a:srgbClr val="FFF2CC"/></a:solidFill>',
    );
    const buffer = await build('', sp);
    const result = await service.execute({ buffer, filename: 'd.pptx' });
    expect(result.html).toContain('background:#FFF2CC');
  });

  it('表格儲存格填色套為 td 底色', async () => {
    const table = `<p:graphicFrame><p:xfrm><a:off x="0" y="0"/><a:ext cx="4000000" cy="1000000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>儲存格</a:t></a:r></a:p></a:txBody><a:tcPr><a:solidFill><a:srgbClr val="FCE4D6"/></a:solidFill></a:tcPr></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
    const buffer = await build('', table);
    const result = await service.execute({ buffer, filename: 'd.pptx' });
    expect(result.html).toContain('儲存格');
    expect(result.html).toContain('background:#FCE4D6');
  });

  it('段落置中對齊 → text-align:center', async () => {
    const sp = textShapeWith(
      '<a:p><a:pPr algn="ctr"/><a:r><a:t>置中標題</a:t></a:r></a:p>',
    );
    const buffer = await build('', sp);
    const result = await service.execute({ buffer, filename: 'd.pptx' });
    expect(result.html).toContain('text-align:center');
  });
});
