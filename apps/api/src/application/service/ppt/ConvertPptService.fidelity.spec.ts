import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

const PRESENTATION = `<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/></p:presentation>`;
const PRESENTATION_RELS = `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/></Relationships>`;

/** 組一個含一張內嵌圖片（透過 slide rels）的 pptx */
const buildWithPic = async (): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file('ppt/presentation.xml', PRESENTATION);
  zip.file('ppt/_rels/presentation.xml.rels', PRESENTATION_RELS);
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r"><p:cSld><p:spTree><p:pic><p:blipFill><a:blip r:embed="rId5"/></p:blipFill><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="2000000"/></a:xfrm></p:spPr></p:pic></p:spTree></p:cSld></p:sld>`,
  );
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>`,
  );
  zip.file('ppt/media/image1.png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return zip.generateAsync({ type: 'nodebuffer' });
};

/** 組一個 slide 有內文、slideLayout 有「非 placeholder 文字框」（如免責聲明）的 pptx */
const buildWithLayoutDecor = async (): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file('ppt/presentation.xml', PRESENTATION);
  zip.file('ppt/_rels/presentation.xml.rels', PRESENTATION_RELS);
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="0" y="3000000"/><a:ext cx="6096000" cy="1000000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:t>投影片內文</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
  );
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdL" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
  );
  zip.file(
    'ppt/slideLayouts/slideLayout1.xml',
    `<?xml version="1.0"?><p:sldLayout xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:spPr><a:xfrm><a:off x="0" y="6000000"/><a:ext cx="12192000" cy="400000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:t>本資料僅供參考</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sldLayout>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
};

/** 組一個 slide(body ph 無 sz) → layout → master(txStyles) 的 pptx；bodySz 省略則無 txStyles */
const buildWithMasterTxStyles = async (bodySz?: string): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file('ppt/presentation.xml', PRESENTATION);
  zip.file('ppt/_rels/presentation.xml.rels', PRESENTATION_RELS);
  zip.file(
    'ppt/slides/slide1.xml',
    `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="6096000" cy="1000000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:t>內文無字級</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
  );
  zip.file(
    'ppt/slides/_rels/slide1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdL" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`,
  );
  zip.file(
    'ppt/slideLayouts/slideLayout1.xml',
    `<?xml version="1.0"?><p:sldLayout xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree/></p:cSld></p:sldLayout>`,
  );
  zip.file(
    'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdM" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
  );
  const txStyles = bodySz
    ? `<p:txStyles><p:bodyStyle><a:lvl1pPr><a:defRPr sz="${bodySz}"/></a:lvl1pPr></p:bodyStyle></p:txStyles>`
    : '';
  zip.file(
    'ppt/slideMasters/slideMaster1.xml',
    `<?xml version="1.0"?><p:sldMaster xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree/></p:cSld>${txStyles}</p:sldMaster>`,
  );
  return zip.generateAsync({ type: 'nodebuffer' });
};

describe('ConvertPptService — 保真度', () => {
  const service = new ConvertPptService();

  it('圖片以 object-fit:fill 撐滿形狀框（比照 PPT，不留白縮小）', async () => {
    const buffer = await buildWithPic();
    const result = await service.execute({ buffer, filename: 'd.pptx' });
    expect(result.html).toContain('object-fit:fill');
    expect(result.html).not.toContain('object-fit:contain');
  });

  it('渲染 slideLayout 非 placeholder 文字（補回聲明），且墊在 slide 內容之下', async () => {
    const buffer = await buildWithLayoutDecor();
    const result = await service.execute({ buffer, filename: 'd.pptx' });
    expect(result.html).toContain('本資料僅供參考');
    // DOM 在前 = z-order 在底：裝飾文字應排在 slide 內容之前
    expect(result.html.indexOf('本資料僅供參考')).toBeLessThan(
      result.html.indexOf('投影片內文'),
    );
  });

  it('body 文字無 sz 時從 master txStyles 繼承字級（14pt，而非預設 18pt）', async () => {
    const buffer = await buildWithMasterTxStyles('1400');
    const result = await service.execute({ buffer, filename: 'd.pptx' });
    // 14pt → 14/960*100 = 1.458cqw；18pt 預設為 1.875cqw
    expect(result.html).toContain('font-size:1.458cqw');
    expect(result.html).not.toContain('font-size:1.875cqw');
  });

  it('無 txStyles 對應時，無 sz 文字退回預設 18pt', async () => {
    const buffer = await buildWithMasterTxStyles();
    const result = await service.execute({ buffer, filename: 'd.pptx' });
    expect(result.html).toContain('font-size:1.875cqw');
  });
});
