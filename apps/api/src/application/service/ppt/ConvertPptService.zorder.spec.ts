import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

// 合成 .pptx fixture（最小化，僅供 z 順序驗證）
const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

const buildPptx = async (
  slideXml: string,
  rels?: string,
  media: Record<string, Buffer> = {},
): Promise<Buffer> => {
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
  if (rels) zip.file('ppt/slides/_rels/slide1.xml.rels', rels);
  for (const [name, buf] of Object.entries(media)) {
    zip.file(`ppt/media/${name}`, buf);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
};

const slide = (inner: string): string =>
  `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r"><p:cSld><p:spTree>${inner}</p:spTree></p:cSld></p:sld>`;

const text = (t: string): string =>
  `<p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="1000000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:t>${t}</a:t></a:r></a:p></p:txBody></p:sp>`;

const pic = (embed: string): string =>
  `<p:pic><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="1000000"/></a:xfrm></p:spPr><p:blipFill><a:blip r:embed="${embed}"/></p:blipFill></p:pic>`;

const picRels = `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="image" Target="../media/image1.png"/></Relationships>`;

describe('ConvertPptService z 順序（文件順序決定上下層）', () => {
  const service = new ConvertPptService();

  it('文件順序「圖片在前、文字在後」→ 文字疊在圖片之上（HTML 圖片先輸出）', async () => {
    const buffer = await buildPptx(
      slide(pic('rId1') + text('上層文字')),
      picRels,
      {
        'image1.png': Buffer.from('png-bytes'),
      },
    );

    const { html } = await service.execute({ buffer, filename: 'z.pptx' });
    const imgIdx = html.indexOf('<img');
    const txtIdx = html.indexOf('上層文字');

    expect(imgIdx).toBeGreaterThanOrEqual(0);
    // 後出現的形狀（文字）應在 DOM 較後 → 疊在圖片之上
    expect(txtIdx).toBeGreaterThan(imgIdx);
  });

  it('文件順序「文字在前、圖片在後」→ 圖片疊在文字之上（HTML 文字先輸出）', async () => {
    const buffer = await buildPptx(
      slide(text('底層文字') + pic('rId1')),
      picRels,
      {
        'image1.png': Buffer.from('png-bytes'),
      },
    );

    const { html } = await service.execute({ buffer, filename: 'z.pptx' });
    const imgIdx = html.indexOf('<img');
    const txtIdx = html.indexOf('底層文字');

    expect(txtIdx).toBeGreaterThanOrEqual(0);
    expect(imgIdx).toBeGreaterThan(txtIdx);
  });
});
