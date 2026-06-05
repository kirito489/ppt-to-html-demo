import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';

const SLIDE_CX = 12192000;
const SLIDE_CY = 6858000;

// master 提供 clrMap（tx1→dk1…）與 txStyles（body/title 預設色）
const MASTER_XML =
  `<?xml version="1.0"?><p:sldMaster xmlns:p="p" xmlns:a="a"><p:cSld><p:spTree/></p:cSld>` +
  `<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>` +
  `<p:txStyles>` +
  `<p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"><a:solidFill><a:srgbClr val="ABCDEF"/></a:solidFill></a:defRPr></a:lvl1pPr></p:titleStyle>` +
  `<p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"><a:solidFill><a:srgbClr val="123456"/></a:solidFill></a:defRPr></a:lvl1pPr></p:bodyStyle>` +
  `<p:otherStyle><a:lvl1pPr><a:defRPr sz="1200"/></a:lvl1pPr></p:otherStyle>` +
  `</p:txStyles></p:sldMaster>`;

// theme clrScheme：dk1 走 sysClr lastClr、accent1 走 srgbClr
const THEME_XML =
  `<?xml version="1.0"?><a:theme xmlns:a="a"><a:themeElements><a:clrScheme name="X">` +
  `<a:dk1><a:sysClr val="windowText" lastClr="002060"/></a:dk1>` +
  `<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>` +
  `<a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>` +
  `<a:accent1><a:srgbClr val="4472C4"/></a:accent1>` +
  `<a:accent2><a:srgbClr val="ED7D31"/></a:accent2>` +
  `<a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>` +
  `<a:accent4><a:srgbClr val="FFC000"/></a:accent4>` +
  `<a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>` +
  `<a:accent6><a:srgbClr val="70AD47"/></a:accent6>` +
  `<a:hlink><a:srgbClr val="0563C1"/></a:hlink>` +
  `<a:folHlink><a:srgbClr val="954F72"/></a:folHlink>` +
  `</a:clrScheme></a:themeElements></a:theme>`;

const LAYOUT_INNER = `<p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="1000000"/><a:ext cx="12192000" cy="5000000"/></a:xfrm></p:spPr></p:sp>`;

const buildColorPptx = async (slideInner: string): Promise<Buffer> => {
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
  zip.file(
    'ppt/slideMasters/_rels/slideMaster1.xml.rels',
    `<?xml version="1.0"?><Relationships><Relationship Id="rIdT" Type="theme" Target="../theme/theme1.xml"/></Relationships>`,
  );
  zip.file('ppt/theme/theme1.xml', THEME_XML);
  return zip.generateAsync({ type: 'nodebuffer' });
};

const colorRun = (fill: string, text: string): string =>
  `<p:sp><p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="1000000"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr sz="1600">${fill}</a:rPr><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`;

describe('ConvertPptService 文字繼承色與主題色', () => {
  const service = new ConvertPptService();

  it('schemeClr accent1 → 主題色盤 #4472C4', async () => {
    const buffer = await buildColorPptx(
      colorRun(
        '<a:solidFill><a:schemeClr val="accent1"/></a:solidFill>',
        '主題',
      ),
    );
    const { html } = await service.execute({ buffer, filename: 'c.pptx' });
    expect(html).toContain('color:#4472C4');
  });

  it('schemeClr tx1 經 clrMap→dk1 → #002060', async () => {
    const buffer = await buildColorPptx(
      colorRun('<a:solidFill><a:schemeClr val="tx1"/></a:solidFill>', 'tx1'),
    );
    const { html } = await service.execute({ buffer, filename: 'c.pptx' });
    expect(html).toContain('color:#002060');
  });

  it('run 無色但 body placeholder → 自 master txStyles 繼承 #123456', async () => {
    const slideInner = `<p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:p><a:r><a:rPr/><a:t>繼承色</a:t></a:r></a:p></p:txBody></p:sp>`;
    const buffer = await buildColorPptx(slideInner);
    const { html } = await service.execute({ buffer, filename: 'c.pptx' });
    expect(html).toContain('color:#123456');
  });

  it('srgbClr 直接色維持不變（不退步）', async () => {
    const buffer = await buildColorPptx(
      colorRun('<a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>', '紅'),
    );
    const { html } = await service.execute({ buffer, filename: 'c.pptx' });
    expect(html).toContain('color:#FF0000');
  });
});
