import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

// slide 用 layout7 → master1；master 上有一個非-ph 的 logo 圖片
const buildWithMasterLogo = async (): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/></p:presentation>`,
  );
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="slide" Target="slides/slide1.xml"/></Relationships>`,
  );
  // slide：只有一個文字框，無圖
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="1000000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:t>內文</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
  );
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdL" Type="slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
  );
  zip.file(
    'ppt/slideLayouts/slideLayout1.xml',
    `<?xml version="1.0"?><p:sldLayout xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree/></p:cSld></p:sldLayout>`,
  );
  zip.file(
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdM" Type="slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
  );
  // master：一個非-ph 的 logo <p:pic>（embed rId10 → image2.png）
  zip.file(
    'ppt/slideMasters/slideMaster1.xml',
    `<?xml version="1.0"?><p:sldMaster xmlns:p="p" xmlns:a="a" xmlns:r="r"><p:cSld><p:spTree><p:pic><p:spPr><a:xfrm><a:off x="11056141" y="6343628"/><a:ext cx="984612" cy="560776"/></a:xfrm></p:spPr><p:blipFill><a:blip r:embed="rId10"/></p:blipFill></p:pic></p:spTree></p:cSld></p:sldMaster>`,
  );
  zip.file(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rId10" Type="image" Target="../media/image2.png"/></Relationships>`,
  );
  zip.file('ppt/media/image2.png', Buffer.from('fake-logo-png'));
  return zip.generateAsync({ type: 'nodebuffer' });
};

describe('ConvertPptService layout/master 非 placeholder 圖片（logo）', () => {
  const service = new ConvertPptService();

  it('渲染 master 上的 logo 圖片，位於 slide 內容之下', async () => {
    const { html } = await service.execute({
      buffer: await buildWithMasterLogo(),
      filename: 'logo.pptx',
    });

    // logo 以 data URI 內嵌
    expect(html).toContain('data:image/png;base64,');
    // logo（master 圖）在 slide 文字之前 → z 在底
    const imgIdx = html.indexOf('<img');
    const txtIdx = html.indexOf('內文');
    expect(imgIdx).toBeGreaterThanOrEqual(0);
    expect(imgIdx).toBeLessThan(txtIdx);
    // logo 定位於右下（11056141/12192000≈90.7%）
    expect(html).toContain('left:90.684%');
  });

  it('master 裝飾圖片不計入準確率（image 仍為 1、不破百）', async () => {
    const { inventory, accuracy } = await service.execute({
      buffer: await buildWithMasterLogo(),
      filename: 'logo.pptx',
    });
    // inventory 只含 slide 自身元素（1 個文字），不含 master logo
    const imgs = inventory[0].elements.filter((e) => e.kind === 'image');
    expect(imgs.length).toBe(0);
    expect(accuracy.image).toBe(1);
    expect(accuracy.overall).toBeLessThanOrEqual(1);
  });
});
