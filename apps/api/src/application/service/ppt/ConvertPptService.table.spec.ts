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

const cell = (text: string, rPr: string): string =>
  `<a:tc><a:txBody><a:p><a:r><a:rPr ${rPr}/><a:t>${text}</a:t></a:r></a:p></a:txBody></a:tc>`;

// 兩欄（3:1）、兩列（各 1000000）、儲存格帶 sz/bold/color
const richTable = (): string =>
  `<p:graphicFrame><p:xfrm><a:off x="0" y="0"/><a:ext cx="4000000" cy="2000000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl>` +
  `<a:tblGrid><a:gridCol w="3000000"/><a:gridCol w="1000000"/></a:tblGrid>` +
  `<a:tr h="1000000">${cell('A1', 'sz="1200" b="1"><a:solidFill><a:srgbClr val="0000FF"/></a:solidFill></a:rPr')}${cell('B1', 'sz="1200"')}</a:tr>` +
  `<a:tr h="1000000">${cell('A2', 'sz="1200"')}${cell('B2', 'sz="1200"')}</a:tr>` +
  `</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;

describe('ConvertPptService 表格保真度', () => {
  const service = new ConvertPptService();

  it('依 gridCol 產出 colgroup 欄寬比例（3:1 → 75% / 25%）', async () => {
    const { html } = await service.execute({
      buffer: await buildPptx(slide(richTable())),
      filename: 't.pptx',
    });
    expect(html).toContain('<colgroup');
    expect(html).toContain('width:75%');
    expect(html).toContain('width:25%');
  });

  it('儲存格字級讀自來源 rPr（sz 1200 → 1.25cqw，非寫死 2cqw）', async () => {
    const { html } = await service.execute({
      buffer: await buildPptx(slide(richTable())),
      filename: 't.pptx',
    });
    expect(html).toContain('font-size:1.25cqw');
  });

  it('儲存格套用粗體與顏色', async () => {
    const { html } = await service.execute({
      buffer: await buildPptx(slide(richTable())),
      filename: 't.pptx',
    });
    expect(html).toContain('font-weight:bold');
    expect(html).toContain('color:#0000FF');
  });

  it('依 tr h 設列高比例（各 1000000 → 50%）', async () => {
    const { html } = await service.execute({
      buffer: await buildPptx(slide(richTable())),
      filename: 't.pptx',
    });
    expect(html).toContain('height:50%');
  });
});
