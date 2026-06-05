import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

// 合成 .pptx fixture（最小化，僅供項目符號/編號驗證）
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

const shape = (paras: string): string =>
  `<p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6000000" cy="3000000"/></a:xfrm></p:spPr><p:txBody>${paras}</p:txBody></p:sp>`;

const bulletPara = (text: string, pPr: string): string =>
  `<a:p><a:pPr>${pPr}</a:pPr><a:r><a:rPr sz="1600"/><a:t>${text}</a:t></a:r></a:p>`;

describe('ConvertPptService 項目符號與編號', () => {
  const service = new ConvertPptService();

  it('buChar（Wingdings n）→ ■', async () => {
    const buffer = await buildPptx(
      slide(
        shape(
          bulletPara(
            '項目',
            '<a:buFont typeface="Wingdings"/><a:buChar char="n"/>',
          ),
        ),
      ),
    );
    const { html } = await service.execute({ buffer, filename: 'b.pptx' });
    expect(html).toContain('■');
    expect(html).toContain('項目');
  });

  it('buClr 套用項目符號顏色', async () => {
    const buffer = await buildPptx(
      slide(
        shape(
          bulletPara(
            '項目',
            '<a:buClr><a:srgbClr val="D56C2A"/></a:buClr><a:buFont typeface="Wingdings"/><a:buChar char="n"/>',
          ),
        ),
      ),
    );
    const { html } = await service.execute({ buffer, filename: 'b.pptx' });
    expect(html).toContain('color:#D56C2A');
  });

  it('buAutoNum（arabicPeriod）→ 同框內遞增 1. 2.', async () => {
    const buffer = await buildPptx(
      slide(
        shape(
          bulletPara('一', '<a:buAutoNum type="arabicPeriod"/>') +
            bulletPara('二', '<a:buAutoNum type="arabicPeriod"/>'),
        ),
      ),
    );
    const { html } = await service.execute({ buffer, filename: 'b.pptx' });
    expect(html).toContain('1.');
    expect(html).toContain('2.');
  });

  it('buNone → 不顯示符號', async () => {
    const buffer = await buildPptx(
      slide(shape(bulletPara('無符號', '<a:buNone/>'))),
    );
    const { html } = await service.execute({ buffer, filename: 'b.pptx' });
    expect(html).toContain('無符號');
    expect(html).not.toContain('■');
  });
});
