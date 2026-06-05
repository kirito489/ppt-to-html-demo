import { Injectable } from '@nestjs/common';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import {
  ConvertPptCommand,
  ConvertPptUseCase,
} from '../../port/in/ppt/ConvertPptUseCase';
import {
  Accuracy,
  AccuracyWeights,
  ArticleStatus,
  ConversionResult,
  InventoryElement,
  SlideAccuracy,
  SlideInventory,
} from '../../../domain/model/conversion';
import { PptParseException } from '../../../domain/exception/PptParseException';
import { getEnv } from '../../../infrastructure/validate-env';

// EMU（English Metric Unit）：1 inch = 914400 EMU；1 pt = 12700 EMU
const EMU_PER_POINT = 12700;
// 預設投影片尺寸（4:3 fallback）
const DEFAULT_CX = 9144000;
const DEFAULT_CY = 6858000;
const DEFAULT_FONT_SIZE = 1800; // 18pt（OOXML 以百分點表示）

const SUPPORTED_IMAGE_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const asArray = <T>(v: T | T[] | undefined | null): T[] =>
  v == null ? [] : Array.isArray(v) ? v : [v];

const round = (n: number, digits = 3): number => {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
};

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** 解析 <a:t> 內容（可能為字串或帶屬性的物件） */
const textOf = (t: unknown): string => {
  if (t == null) return '';
  if (typeof t === 'string') return t;
  if (typeof t === 'number') return String(t);
  if (typeof t === 'object' && '#text' in t) {
    return String((t as { '#text': unknown })['#text'] ?? '');
  }
  return '';
};

/** 解析 zip 路徑中的相對段（處理 ../ 與 ./） */
const joinZipPath = (baseDir: string, target: string): string => {
  const parts = `${baseDir}/${target}`.split('/');
  const stack: string[] = [];
  for (const p of parts) {
    if (p === '..') stack.pop();
    else if (p !== '.' && p !== '') stack.push(p);
  }
  return stack.join('/');
};

type XmlNode = Record<string, unknown>;

/**
 * PPT(.pptx) → HTML 轉換引擎（純 JS、無外部服務、無 LLM）。
 * 每張投影片輸出「長寬比鎖定 + 百分比絕對定位 + cqw 字級」的自包含區塊，確保不跑版。
 */
@Injectable()
export class ConvertPptService implements ConvertPptUseCase {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // 保留命名空間前綴：避免 r:id 與 id 兩個屬性衝突
    removeNSPrefix: false,
    isArray: (name) =>
      [
        'p:sp',
        'p:pic',
        'p:graphicFrame',
        'p:grpSp',
        'p:cxnSp',
        'p:sldId',
        'Relationship',
        'a:p',
        'a:r',
        'a:tr',
        'a:tc',
      ].includes(name),
  });

  async execute(command: ConvertPptCommand): Promise<ConversionResult> {
    const zip = await this.loadZip(command.buffer);

    const { cx, cy } = await this.readSlideSize(zip);
    const slidePaths = await this.readSlideOrder(zip);

    const slideInventories: SlideInventory[] = [];
    const slideAccuracies: SlideAccuracy[] = [];
    const htmlParts: string[] = [];

    for (let i = 0; i < slidePaths.length; i++) {
      const { html, inventory, accuracy } = await this.convertSlide(
        zip,
        slidePaths[i],
        i + 1,
        cx,
        cy,
      );
      htmlParts.push(html);
      slideInventories.push(inventory);
      slideAccuracies.push(accuracy);
    }

    const accuracy = this.aggregateAccuracy(slideAccuracies);
    const status: ArticleStatus =
      accuracy.coverage === 1 && accuracy.text === 1 && accuracy.image === 1
        ? 'success'
        : 'partial';

    const html = `<div class="ppt-article">${htmlParts.join('')}</div>`;
    const title = await this.readTitle(zip, command.filename);

    return {
      title,
      html,
      slideCount: slidePaths.length,
      inventory: slideInventories,
      accuracy,
      status,
    };
  }

  private async loadZip(buffer: Buffer): Promise<JSZip> {
    try {
      return await JSZip.loadAsync(buffer);
    } catch (err) {
      throw new PptParseException(
        `無法讀取 .pptx（非有效的 zip）：${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  private async readXml(zip: JSZip, path: string): Promise<XmlNode | null> {
    const file = zip.file(path);
    if (!file) return null;
    const xml = await file.async('string');
    return this.parser.parse(xml) as XmlNode;
  }

  private async readSlideSize(zip: JSZip): Promise<{ cx: number; cy: number }> {
    const doc = await this.readXml(zip, 'ppt/presentation.xml');
    const pres = doc?.['p:presentation'] as XmlNode | undefined;
    const sldSz = pres?.['p:sldSz'] as XmlNode | undefined;
    const cx = Number(sldSz?.['@_cx']) || DEFAULT_CX;
    const cy = Number(sldSz?.['@_cy']) || DEFAULT_CY;
    return { cx, cy };
  }

  /** 依 presentation 的 sldIdLst 順序解析各投影片實際路徑 */
  private async readSlideOrder(zip: JSZip): Promise<string[]> {
    const presDoc = await this.readXml(zip, 'ppt/presentation.xml');
    const pres = presDoc?.['p:presentation'] as XmlNode | undefined;
    const sldIdLst = pres?.['p:sldIdLst'] as XmlNode | undefined;
    const sldIds = asArray(sldIdLst?.['p:sldId'] as XmlNode[]);

    const relsDoc = await this.readXml(zip, 'ppt/_rels/presentation.xml.rels');
    const rels = asArray(
      (relsDoc?.['Relationships'] as XmlNode | undefined)?.[
        'Relationship'
      ] as XmlNode[],
    );
    const relMap = new Map<string, string>();
    for (const r of rels) {
      relMap.set(String(r['@_Id']), String(r['@_Target']));
    }

    const paths: string[] = [];
    for (const s of sldIds) {
      const rid = String(s['@_r:id']);
      const target = relMap.get(rid);
      if (target) paths.push(joinZipPath('ppt', target));
    }
    return paths;
  }

  private async readTitle(zip: JSZip, filename: string): Promise<string> {
    const core = await this.readXml(zip, 'docProps/core.xml');
    const props = core?.['cp:coreProperties'] as XmlNode | undefined;
    const title = textOf(props?.['dc:title']).trim();
    if (title) return title;
    return filename.replace(/\.pptx$/i, '');
  }

  /** 讀取單一投影片的圖片關係（rId → media 路徑） */
  private async readSlideRels(
    zip: JSZip,
    slidePath: string,
  ): Promise<Map<string, string>> {
    const slash = slidePath.lastIndexOf('/');
    const dir = slidePath.slice(0, slash);
    const file = slidePath.slice(slash + 1);
    const relsPath = `${dir}/_rels/${file}.rels`;
    const doc = await this.readXml(zip, relsPath);
    const rels = asArray(
      (doc?.['Relationships'] as XmlNode | undefined)?.[
        'Relationship'
      ] as XmlNode[],
    );
    const map = new Map<string, string>();
    for (const r of rels) {
      map.set(String(r['@_Id']), joinZipPath(dir, String(r['@_Target'])));
    }
    return map;
  }

  private async convertSlide(
    zip: JSZip,
    slidePath: string,
    index: number,
    cx: number,
    cy: number,
  ): Promise<{
    html: string;
    inventory: SlideInventory;
    accuracy: SlideAccuracy;
  }> {
    const doc = await this.readXml(zip, slidePath);
    const rawXml = (await zip.file(slidePath)?.async('string')) ?? '';
    const rels = await this.readSlideRels(zip, slidePath);

    const sld = doc?.['p:sld'] as XmlNode | undefined;
    const cSld = sld?.['p:cSld'] as XmlNode | undefined;
    const spTree = cSld?.['p:spTree'] as XmlNode | undefined;

    const elements: InventoryElement[] = [];
    const htmlParts: string[] = [];

    if (spTree) {
      await this.walkShapes(zip, spTree, rels, cx, cy, elements, htmlParts);
    }

    // 文字還原率：以投影片內所有 <a:t> 字元數為母數
    const totalTextChars = this.countAllTextChars(rawXml);
    const restoredTextChars = elements
      .filter((e) => e.restored && (e.kind === 'text' || e.kind === 'table'))
      .reduce((sum, e) => sum + this.elementTextLength(e), 0);

    const totalImages = elements.filter((e) => e.kind === 'image').length;
    const restoredImages = elements.filter(
      (e) => e.kind === 'image' && e.restored,
    ).length;

    const totalElements = elements.length;
    const restoredElements = elements.filter((e) => e.restored).length;

    const coverage = ratio(restoredElements, totalElements);
    const text = ratio(restoredTextChars, totalTextChars);
    const image = ratio(restoredImages, totalImages);

    const accuracy: SlideAccuracy = {
      index,
      coverage,
      text,
      image,
      overall: weighted(coverage, text, image, this.weights()),
    };

    const html = `<section class="ppt-slide" style="position:relative;width:100%;aspect-ratio:${cx}/${cy};container-type:inline-size;overflow:hidden;background:#fff;">${htmlParts.join('')}</section>`;

    return { html, inventory: { index, elements }, accuracy };
  }

  /** 走訪 spTree 的形狀（群組則遞迴） */
  private async walkShapes(
    zip: JSZip,
    node: XmlNode,
    rels: Map<string, string>,
    cx: number,
    cy: number,
    elements: InventoryElement[],
    htmlParts: string[],
  ): Promise<void> {
    for (const sp of asArray(node['p:sp'] as XmlNode[])) {
      const { html, element } = this.convertTextShape(sp, cx, cy);
      if (element) {
        elements.push(element);
        htmlParts.push(html);
      }
    }
    for (const pic of asArray(node['p:pic'] as XmlNode[])) {
      const { html, element } = await this.convertPicture(
        zip,
        pic,
        rels,
        cx,
        cy,
      );
      elements.push(element);
      htmlParts.push(html);
    }
    for (const gf of asArray(node['p:graphicFrame'] as XmlNode[])) {
      const { html, element } = this.convertGraphicFrame(gf, cx, cy);
      elements.push(element);
      htmlParts.push(html);
    }
    for (const grp of asArray(node['p:grpSp'] as XmlNode[])) {
      // 群組：best-effort 遞迴（忽略群組變換，子元素以自身座標定位）
      await this.walkShapes(zip, grp, rels, cx, cy, elements, htmlParts);
    }
  }

  private convertTextShape(
    sp: XmlNode,
    cx: number,
    cy: number,
  ): { html: string; element: InventoryElement | null } {
    const spPr = sp['p:spPr'] as XmlNode | undefined;
    const txBody = sp['p:txBody'] as XmlNode | undefined;
    if (!txBody) return { html: '', element: null };

    const pos = this.positionStyle(
      spPr?.['a:xfrm'] as XmlNode | undefined,
      cx,
      cy,
    );
    const paragraphs = asArray(txBody['a:p'] as XmlNode[]);

    const plainParts: string[] = [];
    const htmlParagraphs = paragraphs.map((p) => {
      const runs = asArray(p['a:r'] as XmlNode[]);
      const spans = runs.map((r) => {
        const t = textOf(r['a:t']);
        plainParts.push(t);
        return `<span style="${this.runStyle(r['a:rPr'] as XmlNode | undefined, cx)}">${escapeHtml(t)}</span>`;
      });
      return `<p style="margin:0;">${spans.join('')}</p>`;
    });

    const text = plainParts.join('').trim() ? plainParts.join('\n') : '';
    const html = `<div style="position:absolute;${pos}font-size:${this.fontCqw(DEFAULT_FONT_SIZE, cx)}cqw;">${htmlParagraphs.join('')}</div>`;

    return {
      html,
      element: { kind: 'text', restored: true, text },
    };
  }

  private async convertPicture(
    zip: JSZip,
    pic: XmlNode,
    rels: Map<string, string>,
    cx: number,
    cy: number,
  ): Promise<{ html: string; element: InventoryElement }> {
    const spPr = pic['p:spPr'] as XmlNode | undefined;
    const pos = this.positionStyle(
      spPr?.['a:xfrm'] as XmlNode | undefined,
      cx,
      cy,
    );
    const blipFill = pic['p:blipFill'] as XmlNode | undefined;
    const blip = blipFill?.['a:blip'] as XmlNode | undefined;
    const embed = blip?.['@_r:embed'] ? String(blip['@_r:embed']) : undefined;
    const mediaPath = embed ? rels.get(embed) : undefined;

    if (mediaPath) {
      const ext = mediaPath.split('.').pop()?.toLowerCase() ?? '';
      const mime = SUPPORTED_IMAGE_EXT[ext];
      const file = zip.file(mediaPath);
      if (mime && file) {
        const base64 = await file.async('base64');
        const dataUri = `data:${mime};base64,${base64}`;
        const name = mediaPath.split('/').pop() ?? 'image';
        const html = `<div style="position:absolute;${pos}"><img src="${dataUri}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:contain;"/></div>`;
        return {
          html,
          element: { kind: 'image', restored: true, image: dataUri },
        };
      }
    }

    // 無法解析或不支援格式 → 占位
    const html = `<div style="position:absolute;${pos}"><div class="ppt-placeholder" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f3f4f6;color:#9ca3af;font-size:2cqw;">未支援的圖片格式</div></div>`;
    return { html, element: { kind: 'image', restored: false } };
  }

  private convertGraphicFrame(
    gf: XmlNode,
    cx: number,
    cy: number,
  ): { html: string; element: InventoryElement } {
    const pos = this.positionStyle(gf['p:xfrm'] as XmlNode | undefined, cx, cy);
    const graphic = gf['a:graphic'] as XmlNode | undefined;
    const graphicData = graphic?.['a:graphicData'] as XmlNode | undefined;
    const uri = String(graphicData?.['@_uri'] ?? '');
    const tbl = graphicData?.['a:tbl'] as XmlNode | undefined;

    if (uri.includes('table') && tbl) {
      const { html: tableHtml, cells } = this.convertTable(tbl);
      const html = `<div style="position:absolute;${pos}">${tableHtml}</div>`;
      return {
        html,
        element: { kind: 'table', restored: true, tableCells: cells },
      };
    }

    const unsupportedType = uri.includes('chart')
      ? 'chart'
      : uri.includes('diagram')
        ? 'smartArt'
        : 'unknown';
    const html = `<div style="position:absolute;${pos}"><div class="ppt-unsupported" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#fef3c7;color:#92400e;font-size:2cqw;">未支援元素：${escapeHtml(unsupportedType)}</div></div>`;
    return {
      html,
      element: { kind: 'unsupported', restored: false, unsupportedType },
    };
  }

  private convertTable(tbl: XmlNode): { html: string; cells: string[][] } {
    const rows = asArray(tbl['a:tr'] as XmlNode[]);
    const cells: string[][] = [];
    const rowHtml = rows.map((tr) => {
      const tcs = asArray(tr['a:tc'] as XmlNode[]);
      const rowCells: string[] = [];
      const cellHtml = tcs.map((tc) => {
        const txBody = tc['a:txBody'] as XmlNode | undefined;
        const text = this.extractTxBodyText(txBody);
        rowCells.push(text);
        return `<td style="border:1px solid #d1d5db;padding:0.4cqw 0.8cqw;">${escapeHtml(text)}</td>`;
      });
      cells.push(rowCells);
      return `<tr>${cellHtml.join('')}</tr>`;
    });
    const html = `<table style="width:100%;height:100%;border-collapse:collapse;font-size:2cqw;">${rowHtml.join('')}</table>`;
    return { html, cells };
  }

  private extractTxBodyText(txBody: XmlNode | undefined): string {
    if (!txBody) return '';
    const paragraphs = asArray(txBody['a:p'] as XmlNode[]);
    return paragraphs
      .map((p) =>
        asArray(p['a:r'] as XmlNode[])
          .map((r) => textOf(r['a:t']))
          .join(''),
      )
      .join('\n');
  }

  /** 形狀位置 → 百分比絕對定位 style 片段 */
  private positionStyle(
    xfrm: XmlNode | undefined,
    cx: number,
    cy: number,
  ): string {
    const off = xfrm?.['a:off'] as XmlNode | undefined;
    const ext = xfrm?.['a:ext'] as XmlNode | undefined;
    const x = Number(off?.['@_x']) || 0;
    const y = Number(off?.['@_y']) || 0;
    const w = Number(ext?.['@_cx']) || cx;
    const h = Number(ext?.['@_cy']) || cy;
    return `left:${round((x / cx) * 100)}%;top:${round((y / cy) * 100)}%;width:${round((w / cx) * 100)}%;height:${round((h / cy) * 100)}%;`;
  }

  private runStyle(rPr: XmlNode | undefined, cx: number): string {
    const parts: string[] = [];
    if (rPr?.['@_b'] === '1' || rPr?.['@_b'] === 1)
      parts.push('font-weight:bold;');
    if (rPr?.['@_i'] === '1' || rPr?.['@_i'] === 1)
      parts.push('font-style:italic;');
    if (rPr?.['@_u'] && rPr['@_u'] !== 'none')
      parts.push('text-decoration:underline;');
    const sz = Number(rPr?.['@_sz']);
    if (sz) parts.push(`font-size:${this.fontCqw(sz, cx)}cqw;`);
    const solidFill = rPr?.['a:solidFill'] as XmlNode | undefined;
    const srgb = solidFill?.['a:srgbClr'] as XmlNode | undefined;
    if (srgb?.['@_val']) parts.push(`color:#${String(srgb['@_val'])};`);
    return parts.join('');
  }

  /** OOXML 字級（百分點）→ cqw（容器寬度單位，相對投影片寬） */
  private fontCqw(sz: number, cx: number): number {
    const pt = sz / 100;
    const slideWidthPt = cx / EMU_PER_POINT;
    return round((pt / slideWidthPt) * 100, 3);
  }

  private countAllTextChars(xml: string): number {
    const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? [];
    return matches.reduce((sum, m) => {
      const inner = m.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>$/, '');
      return sum + inner.length;
    }, 0);
  }

  private elementTextLength(e: InventoryElement): number {
    if (e.kind === 'text') return (e.text ?? '').replace(/\n/g, '').length;
    if (e.kind === 'table') {
      return (e.tableCells ?? []).flat().reduce((sum, c) => sum + c.length, 0);
    }
    return 0;
  }

  private weights(): AccuracyWeights {
    const env = getEnv();
    return {
      text: env.ACCURACY_WEIGHT_TEXT,
      image: env.ACCURACY_WEIGHT_IMAGE,
      coverage: env.ACCURACY_WEIGHT_COVERAGE,
    };
  }

  private aggregateAccuracy(slides: SlideAccuracy[]): Accuracy {
    if (slides.length === 0) {
      return { overall: 1, text: 1, image: 1, coverage: 1, slides };
    }
    const avg = (sel: (s: SlideAccuracy) => number): number =>
      round(slides.reduce((sum, s) => sum + sel(s), 0) / slides.length);
    const coverage = avg((s) => s.coverage);
    const text = avg((s) => s.text);
    const image = avg((s) => s.image);
    return {
      overall: weighted(coverage, text, image, this.weights()),
      text,
      image,
      coverage,
      slides,
    };
  }
}

/** 還原比率：母數為 0 時視為完美（1） */
const ratio = (restored: number, total: number): number =>
  total === 0 ? 1 : round(restored / total);

/** 加權整體準確率（權重和為 0 時取等權） */
const weighted = (
  coverage: number,
  text: number,
  image: number,
  w: AccuracyWeights,
): number => {
  const sum = w.text + w.image + w.coverage;
  if (sum === 0) return round((coverage + text + image) / 3);
  return round((text * w.text + image * w.image + coverage * w.coverage) / sum);
};
