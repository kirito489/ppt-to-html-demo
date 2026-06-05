import JSZip from 'jszip';
import { ConvertPptService } from './ConvertPptService';
import { PptParseException } from '../../../domain/exception/PptParseException';

// ──────────────────────────────────────────────
// 合成 .pptx fixture（純 JS 組 OOXML zip，無需二進位檔）
// ──────────────────────────────────────────────

const SLIDE_CX = 12192000; // 16:9 寬（EMU）
const SLIDE_CY = 6858000;

type SlideSpec = { xml: string; rels?: string };

const buildPptx = async (
  slides: SlideSpec[],
  media: Record<string, Buffer> = {},
): Promise<Buffer> => {
  const zip = new JSZip();
  const sldIds = slides
    .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`)
    .join('');
  zip.file(
    'ppt/presentation.xml',
    `<?xml version="1.0"?><p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst>${sldIds}</p:sldIdLst><p:sldSz cx="${SLIDE_CX}" cy="${SLIDE_CY}"/></p:presentation>`,
  );
  const rels = slides
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="slide" Target="slides/slide${i + 1}.xml"/>`,
    )
    .join('');
  zip.file(
    'ppt/_rels/presentation.xml.rels',
    `<?xml version="1.0"?><Relationships>${rels}</Relationships>`,
  );
  slides.forEach((s, i) => {
    zip.file(`ppt/slides/slide${i + 1}.xml`, s.xml);
    if (s.rels) {
      zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, s.rels);
    }
  });
  for (const [name, buf] of Object.entries(media)) {
    zip.file(`ppt/media/${name}`, buf);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
};

/** 包成一張投影片的 spTree */
const slide = (inner: string): string =>
  `<?xml version="1.0"?><p:sld xmlns:p="p" xmlns:a="a" xmlns:r="r"><p:cSld><p:spTree>${inner}</p:spTree></p:cSld></p:sld>`;

/** 文字方塊 */
const textShape = (
  text: string,
  { x = 914400, y = 914400, cx = 3000000, cy = 1000000 } = {},
): string =>
  `<p:sp><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></p:spPr><p:txBody><a:p><a:r><a:rPr b="1" sz="1800"><a:solidFill><a:srgbClr val="FF0000"/></a:solidFill></a:rPr><a:t>${text}</a:t></a:r></a:p></p:txBody></p:sp>`;

/** 圖片（參照 rId embed） */
const picShape = (embed: string): string =>
  `<p:pic><p:spPr><a:xfrm><a:off x="100000" y="100000"/><a:ext cx="2000000" cy="2000000"/></a:xfrm></p:spPr><p:blipFill><a:blip r:embed="${embed}"/></p:blipFill></p:pic>`;

const picRels = (target: string): string =>
  `<?xml version="1.0"?><Relationships><Relationship Id="rId1" Type="image" Target="${target}"/></Relationships>`;

/** 表格 */
const tableShape = (): string =>
  `<p:graphicFrame><p:xfrm><a:off x="500000" y="500000"/><a:ext cx="4000000" cy="2000000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tr><a:tc><a:txBody><a:p><a:r><a:t>A1</a:t></a:r></a:p></a:txBody></a:tc><a:tc><a:txBody><a:p><a:r><a:t>B1</a:t></a:r></a:p></a:txBody></a:tc></a:tr></a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;

/** 圖表（未支援） */
const chartShape = (): string =>
  `<p:graphicFrame><p:xfrm><a:off x="100000" y="100000"/><a:ext cx="2000000" cy="2000000"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="c" r:id="rId9"/></a:graphicData></a:graphic></p:graphicFrame>`;

describe('ConvertPptService', () => {
  let service: ConvertPptService;

  beforeEach(() => {
    service = new ConvertPptService();
  });

  it('解析投影片尺寸並計算頁數', async () => {
    const buffer = await buildPptx([
      { xml: slide(textShape('第一頁')) },
      { xml: slide(textShape('第二頁')) },
    ]);

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    expect(result.slideCount).toBe(2);
    expect(result.html).toContain('第一頁');
    expect(result.html).toContain('第二頁');
  });

  it('擷取文字內容並標記為已還原', async () => {
    const buffer = await buildPptx([{ xml: slide(textShape('Hello 世界')) }]);

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    expect(result.html).toContain('Hello 世界');
    const elements = result.inventory[0].elements;
    const textEl = elements.find((e) => e.kind === 'text');
    expect(textEl).toBeDefined();
    expect(textEl?.restored).toBe(true);
    expect(textEl?.text).toContain('Hello 世界');
  });

  it('套用粗體 / 顏色 / 字級（cqw）樣式', async () => {
    const buffer = await buildPptx([{ xml: slide(textShape('Styled')) }]);

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    expect(result.html).toContain('font-weight:bold');
    expect(result.html).toContain('color:#FF0000');
    expect(result.html).toContain('cqw');
  });

  it('以百分比絕對定位 + 長寬比鎖定容器輸出（不跑版）', async () => {
    const buffer = await buildPptx([{ xml: slide(textShape('Pos')) }]);

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    expect(result.html).toContain('aspect-ratio:');
    expect(result.html).toContain('position:absolute');
    // 914400 / 12192000 = 7.5%
    expect(result.html).toContain('left:7.5%');
  });

  it('將圖片以 data URI 內嵌（png）', async () => {
    const buffer = await buildPptx(
      [{ xml: slide(picShape('rId1')), rels: picRels('../media/image1.png') }],
      { 'image1.png': Buffer.from('fake-png-bytes') },
    );

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    expect(result.html).toContain('data:image/png;base64,');
    const imgEl = result.inventory[0].elements.find((e) => e.kind === 'image');
    expect(imgEl?.restored).toBe(true);
    expect(result.accuracy.image).toBe(1);
  });

  it('不支援的圖片格式（emf）輸出占位並計為擷取失敗', async () => {
    const buffer = await buildPptx(
      [{ xml: slide(picShape('rId1')), rels: picRels('../media/image1.emf') }],
      { 'image1.emf': Buffer.from('fake-emf') },
    );

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    const imgEl = result.inventory[0].elements.find((e) => e.kind === 'image');
    expect(imgEl?.restored).toBe(false);
    expect(result.accuracy.image).toBe(0);
  });

  it('還原表格內容', async () => {
    const buffer = await buildPptx([{ xml: slide(tableShape()) }]);

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    expect(result.html).toContain('<table');
    expect(result.html).toContain('A1');
    expect(result.html).toContain('B1');
    const tableEl = result.inventory[0].elements.find(
      (e) => e.kind === 'table',
    );
    expect(tableEl?.restored).toBe(true);
  });

  it('未支援元素（chart）計為未還原並降低涵蓋率', async () => {
    const buffer = await buildPptx([{ xml: slide(chartShape()) }]);

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    const el = result.inventory[0].elements.find(
      (e) => e.kind === 'unsupported',
    );
    expect(el).toBeDefined();
    expect(el?.restored).toBe(false);
    expect(result.accuracy.coverage).toBe(0);
    expect(result.status).toBe('partial');
  });

  it('純文字頁：涵蓋率/文字/圖片皆為 1 且狀態為 success', async () => {
    const buffer = await buildPptx([{ xml: slide(textShape('完整')) }]);

    const result = await service.execute({ buffer, filename: 'demo.pptx' });

    expect(result.accuracy.coverage).toBe(1);
    expect(result.accuracy.text).toBe(1);
    expect(result.accuracy.image).toBe(1);
    expect(result.accuracy.overall).toBe(1);
    expect(result.status).toBe('success');
  });

  it('非 zip 內容拋出 PptParseException', async () => {
    await expect(
      service.execute({ buffer: Buffer.from('not a zip'), filename: 'x.pptx' }),
    ).rejects.toBeInstanceOf(PptParseException);
  });
});
