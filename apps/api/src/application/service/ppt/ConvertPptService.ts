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

/** layout/master 的 placeholder 條目（供無自身 xfrm 的 slide placeholder 繼承座標） */
interface PlaceholderEntry {
  type?: string;
  idx?: string;
  xfrm: XmlNode;
}

/** 依 placeholder 的 type/idx 取得繼承座標（layout→master） */
type PhResolver = (type?: string, idx?: string) => XmlNode | undefined;

/** 依 placeholder 型別取得繼承的預設字級（百分點，如 1400=14pt）；無則 undefined */
type DefaultSizeResolver = (phType?: string) => number | undefined;

/** schemeClr 值（如 tx1/accent1）→ 實際色碼（不含 #）；無則 undefined */
type SchemeResolver = (val: string) => string | undefined;

/** 依 placeholder 型別取得繼承的預設文字色（不含 #）；無則 undefined */
type DefaultColorResolver = (phType?: string) => string | undefined;

// placeholder type 別名群組（slide 與 layout 的 type 未必字面相同）
const TITLE_TYPES = new Set(['title', 'ctrTitle']);
const BODY_TYPES = new Set(['body', 'subTitle']);

// OOXML 段落對齊 → CSS text-align
const ALGN_MAP: Record<string, string> = {
  l: 'left',
  ctr: 'center',
  r: 'right',
  just: 'justify',
};

/** 取 <a:srgbClr val> 色碼（無則 undefined） */
const srgbVal = (node: XmlNode | undefined): string | undefined => {
  const s = node?.['a:srgbClr'] as XmlNode | undefined;
  return s?.['@_val'] ? String(s['@_val']) : undefined;
};

/** 取 <a:solidFill><a:srgbClr val> 色碼 */
const solidFillColor = (node: XmlNode | undefined): string | undefined =>
  srgbVal(node?.['a:solidFill'] as XmlNode | undefined);

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
    const stem = filename.replace(/\.pptx$/i, '');
    const core = await this.readXml(zip, 'docProps/core.xml');
    const props = core?.['cp:coreProperties'] as XmlNode | undefined;
    const title = textOf(props?.['dc:title']).trim();
    // dc:title 常是 PowerPoint 預設值（「PowerPoint 簡報」等），無意義時改用檔名
    const isGeneric = /^(powerpoint|presentation|簡報)/i.test(title);
    return title && !isGeneric ? title : stem;
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

  /** 依關係 Type 取得目標路徑（如 slideLayout / slideMaster） */
  private async resolveRelByType(
    zip: JSZip,
    sourcePath: string,
    typeSubstr: string,
  ): Promise<string | undefined> {
    const slash = sourcePath.lastIndexOf('/');
    const dir = sourcePath.slice(0, slash);
    const file = sourcePath.slice(slash + 1);
    const doc = await this.readXml(zip, `${dir}/_rels/${file}.rels`);
    const rels = asArray(
      (doc?.['Relationships'] as XmlNode | undefined)?.[
        'Relationship'
      ] as XmlNode[],
    );
    const rel = rels.find((r) =>
      String(r['@_Type'] ?? '').includes(typeSubstr),
    );
    return rel ? joinZipPath(dir, String(rel['@_Target'])) : undefined;
  }

  /** 讀取 layout/master 的 placeholder 座標清單 */
  private async readPlaceholders(
    zip: JSZip,
    xmlPath: string,
  ): Promise<PlaceholderEntry[]> {
    const doc = await this.readXml(zip, xmlPath);
    const root = (doc?.['p:sldLayout'] ?? doc?.['p:sldMaster']) as
      | XmlNode
      | undefined;
    const spTree = (root?.['p:cSld'] as XmlNode | undefined)?.['p:spTree'] as
      | XmlNode
      | undefined;
    const list: PlaceholderEntry[] = [];
    for (const sp of asArray(spTree?.['p:sp'] as XmlNode[])) {
      const ph = this.phOf(sp);
      const xfrm = (sp['p:spPr'] as XmlNode | undefined)?.['a:xfrm'] as
        | XmlNode
        | undefined;
      if (ph && xfrm) {
        list.push({ type: ph.type, idx: ph.idx, xfrm });
      }
    }
    return list;
  }

  /** 讀取 master `<p:txStyles>` 各樣式 lvl1 的 `defRPr@sz`（title / body / other） */
  private async readTxStyles(
    zip: JSZip,
    masterPath: string | undefined,
  ): Promise<{ title?: number; body?: number; other?: number }> {
    if (!masterPath) return {};
    const doc = await this.readXml(zip, masterPath);
    const txStyles = (doc?.['p:sldMaster'] as XmlNode | undefined)?.[
      'p:txStyles'
    ] as XmlNode | undefined;
    if (!txStyles) return {};
    const szOf = (node: XmlNode | undefined): number | undefined => {
      const lvl1 = node?.['a:lvl1pPr'] as XmlNode | undefined;
      const sz = Number((lvl1?.['a:defRPr'] as XmlNode | undefined)?.['@_sz']);
      return sz || undefined;
    };
    return {
      title: szOf(txStyles['p:titleStyle'] as XmlNode | undefined),
      body: szOf(txStyles['p:bodyStyle'] as XmlNode | undefined),
      other: szOf(txStyles['p:otherStyle'] as XmlNode | undefined),
    };
  }

  /** 讀 theme `<a:clrScheme>` 各 slot → 色碼（srgbClr 優先，否則 sysClr@lastClr） */
  private async readClrScheme(
    zip: JSZip,
    themePath: string | undefined,
  ): Promise<Record<string, string>> {
    if (!themePath) return {};
    const doc = await this.readXml(zip, themePath);
    const scheme = (
      (doc?.['a:theme'] as XmlNode | undefined)?.['a:themeElements'] as
        | XmlNode
        | undefined
    )?.['a:clrScheme'] as XmlNode | undefined;
    if (!scheme) return {};
    const slots = [
      'dk1',
      'lt1',
      'dk2',
      'lt2',
      'accent1',
      'accent2',
      'accent3',
      'accent4',
      'accent5',
      'accent6',
      'hlink',
      'folHlink',
    ];
    const out: Record<string, string> = {};
    for (const slot of slots) {
      const node = scheme[`a:${slot}`] as XmlNode | undefined;
      if (!node) continue;
      const srgb = (node['a:srgbClr'] as XmlNode | undefined)?.['@_val'];
      const sys = (node['a:sysClr'] as XmlNode | undefined)?.['@_lastClr'];
      const c = srgb ?? sys;
      if (c) out[slot] = String(c);
    }
    return out;
  }

  /** 讀 master `<p:clrMap>`：內容用色名（tx1/bg1…）→ 主題 slot（dk1/lt1…） */
  private async readClrMap(
    zip: JSZip,
    masterPath: string | undefined,
  ): Promise<Record<string, string>> {
    if (!masterPath) return {};
    const doc = await this.readXml(zip, masterPath);
    const clrMap = (doc?.['p:sldMaster'] as XmlNode | undefined)?.[
      'p:clrMap'
    ] as XmlNode | undefined;
    if (!clrMap) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(clrMap)) {
      if (k.startsWith('@_')) out[k.slice(2)] = String(v);
    }
    return out;
  }

  /** schemeClr 值 → 色碼：tx1/bg1… 經 clrMap 轉 slot；dk1/lt1… 直接查色盤 */
  private resolveSchemeColor(
    val: string,
    clrMap: Record<string, string>,
    clrScheme: Record<string, string>,
  ): string | undefined {
    const slot = clrMap[val] ?? val;
    return clrScheme[slot] ?? clrScheme[val];
  }

  /** 讀 master `<p:txStyles>` 各樣式 lvl1 的 `defRPr` 顏色（解析為色碼） */
  private async readTxStyleColors(
    zip: JSZip,
    masterPath: string | undefined,
    resolveScheme: SchemeResolver,
  ): Promise<{ title?: string; body?: string; other?: string }> {
    if (!masterPath) return {};
    const doc = await this.readXml(zip, masterPath);
    const txStyles = (doc?.['p:sldMaster'] as XmlNode | undefined)?.[
      'p:txStyles'
    ] as XmlNode | undefined;
    if (!txStyles) return {};
    const colorOf = (node: XmlNode | undefined): string | undefined => {
      const defRPr = (node?.['a:lvl1pPr'] as XmlNode | undefined)?.[
        'a:defRPr'
      ] as XmlNode | undefined;
      const solidFill = defRPr?.['a:solidFill'] as XmlNode | undefined;
      if (!solidFill) return undefined;
      const srgb = (solidFill['a:srgbClr'] as XmlNode | undefined)?.['@_val'];
      if (srgb) return String(srgb);
      const scheme = (solidFill['a:schemeClr'] as XmlNode | undefined)?.[
        '@_val'
      ];
      return scheme ? resolveScheme(String(scheme)) : undefined;
    };
    return {
      title: colorOf(txStyles['p:titleStyle'] as XmlNode | undefined),
      body: colorOf(txStyles['p:bodyStyle'] as XmlNode | undefined),
      other: colorOf(txStyles['p:otherStyle'] as XmlNode | undefined),
    };
  }

  /** 取形狀的 placeholder type/idx（無則 undefined） */
  private phOf(sp: XmlNode): { type?: string; idx?: string } | undefined {
    const ph = (
      (sp['p:nvSpPr'] as XmlNode | undefined)?.['p:nvPr'] as XmlNode | undefined
    )?.['p:ph'] as XmlNode | undefined;
    if (!ph) return undefined;
    return {
      type: ph['@_type'] ? String(ph['@_type']) : undefined,
      idx: ph['@_idx'] ? String(ph['@_idx']) : undefined,
    };
  }

  /** 依 idx（優先）或 type（含別名）比對 placeholder 座標 */
  private matchPlaceholder(
    type: string | undefined,
    idx: string | undefined,
    list: PlaceholderEntry[],
  ): XmlNode | undefined {
    if (idx != null) {
      const m = list.find((p) => p.idx === idx);
      if (m) return m.xfrm;
    }
    if (type != null) {
      const aliases = TITLE_TYPES.has(type)
        ? TITLE_TYPES
        : BODY_TYPES.has(type)
          ? BODY_TYPES
          : new Set([type]);
      const m = list.find((p) => p.type != null && aliases.has(p.type));
      if (m) return m.xfrm;
    }
    return undefined;
  }

  /** 背景優先序：slide → layout → master 的 <p:bg> */
  private async resolveBackground(
    zip: JSZip,
    slideCSld: XmlNode | undefined,
    layoutPath: string | undefined,
    masterPath: string | undefined,
  ): Promise<string | undefined> {
    const fromSlide = this.bgCss(slideCSld?.['p:bg'] as XmlNode | undefined);
    if (fromSlide) return fromSlide;
    for (const [path, rootKey] of [
      [layoutPath, 'p:sldLayout'],
      [masterPath, 'p:sldMaster'],
    ] as const) {
      if (!path) continue;
      const doc = await this.readXml(zip, path);
      const cSld = (doc?.[rootKey] as XmlNode | undefined)?.['p:cSld'] as
        | XmlNode
        | undefined;
      const c = this.bgCss(cSld?.['p:bg'] as XmlNode | undefined);
      if (c) return c;
    }
    return undefined;
  }

  /** <p:bg> → CSS 背景（solidFill / 線性漸層；bgRef 主題色不處理） */
  private bgCss(bg: XmlNode | undefined): string | undefined {
    const bgPr = bg?.['p:bgPr'] as XmlNode | undefined;
    if (!bgPr) return undefined;
    const solid = solidFillColor(bgPr);
    if (solid) return `#${solid}`;
    const grad = bgPr['a:gradFill'] as XmlNode | undefined;
    if (grad) {
      const gsLst = grad['a:gsLst'] as XmlNode | undefined;
      const colors = asArray(gsLst?.['a:gs'] as XmlNode[])
        .map((gs) => srgbVal(gs))
        .filter((c): c is string => Boolean(c));
      if (colors.length >= 2) {
        return `linear-gradient(135deg,#${colors[0]},#${colors[colors.length - 1]})`;
      }
      if (colors.length === 1) return `#${colors[0]}`;
    }
    return undefined;
  }

  /**
   * 渲染 slideLayout 上「非 placeholder」的文字框（頁尾、免責聲明等裝飾文字）。
   * 這類文字只存在於版面上，slide 自身 spTree 抓不到；回傳的 HTML 由呼叫端墊在
   * slide 內容之下（z-order 在底），避免蓋住正文。不計入準確率。
   */
  private async layoutDecorTextHtml(
    zip: JSZip,
    layoutPath: string | undefined,
    cx: number,
    cy: number,
  ): Promise<string[]> {
    if (!layoutPath) return [];
    const doc = await this.readXml(zip, layoutPath);
    const spTree = (
      (doc?.['p:sldLayout'] as XmlNode | undefined)?.['p:cSld'] as
        | XmlNode
        | undefined
    )?.['p:spTree'] as XmlNode | undefined;
    if (!spTree) return [];
    const parts: string[] = [];
    for (const sp of asArray(spTree['p:sp'] as XmlNode[])) {
      // 只取非 placeholder 且有實際文字的文字框
      if (this.phOf(sp) || !sp['p:txBody']) continue;
      const { html, element } = this.convertTextShape(
        sp,
        cx,
        cy,
        () => undefined,
        () => undefined,
        () => undefined,
        () => undefined,
      );
      if (element?.text) parts.push(html);
    }
    return parts;
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

    // 解析 layout / master 的 placeholder 座標，供無自身 xfrm 的 placeholder 繼承
    const layoutPath = await this.resolveRelByType(
      zip,
      slidePath,
      'slideLayout',
    );
    const layoutPhs = layoutPath
      ? await this.readPlaceholders(zip, layoutPath)
      : [];
    const masterPath = layoutPath
      ? await this.resolveRelByType(zip, layoutPath, 'slideMaster')
      : undefined;
    const masterPhs = masterPath
      ? await this.readPlaceholders(zip, masterPath)
      : [];
    const resolvePh: PhResolver = (type, idx) =>
      this.matchPlaceholder(type, idx, layoutPhs) ??
      this.matchPlaceholder(type, idx, masterPhs);

    // master txStyles：供無自身 sz 的文字依 placeholder 型別繼承字級
    const txStyles = await this.readTxStyles(zip, masterPath);
    const resolveDefaultSize: DefaultSizeResolver = (phType) => {
      if (phType && TITLE_TYPES.has(phType)) return txStyles.title;
      if (phType && BODY_TYPES.has(phType)) return txStyles.body;
      return txStyles.other;
    };

    // 主題色盤：master <p:clrMap> + theme <a:clrScheme>，解析 schemeClr → 實際色碼
    const themePath = masterPath
      ? await this.resolveRelByType(zip, masterPath, 'theme')
      : undefined;
    const clrScheme = await this.readClrScheme(zip, themePath);
    const clrMap = await this.readClrMap(zip, masterPath);
    const resolveScheme: SchemeResolver = (val) =>
      this.resolveSchemeColor(val, clrMap, clrScheme);

    // 繼承色：run 無自身色時，依 placeholder 型別自 master txStyles 取色
    const txColors = await this.readTxStyleColors(
      zip,
      masterPath,
      resolveScheme,
    );
    const resolveDefaultColor: DefaultColorResolver = (phType) => {
      if (phType && TITLE_TYPES.has(phType)) return txColors.title;
      if (phType && BODY_TYPES.has(phType)) return txColors.body;
      return txColors.other;
    };

    const sld = doc?.['p:sld'] as XmlNode | undefined;
    const cSld = sld?.['p:cSld'] as XmlNode | undefined;
    const spTree = cSld?.['p:spTree'] as XmlNode | undefined;

    // 背景：slide → layout → master 的 <p:bg>
    const background =
      (await this.resolveBackground(zip, cSld, layoutPath, masterPath)) ??
      '#fff';

    const elements: InventoryElement[] = [];
    const htmlParts: string[] = [];

    // layout 上的非 ph 裝飾文字（頁尾/聲明）先墊底，再疊 slide 內容
    htmlParts.push(
      ...(await this.layoutDecorTextHtml(zip, layoutPath, cx, cy)),
    );

    if (spTree) {
      // 取 spTree 內層原始 XML，供 walkShapes 還原跨型別的文件順序（=z 上下層）
      const spTreeInner =
        rawXml.match(/<p:spTree[^>]*>([\s\S]*)<\/p:spTree>/)?.[1] ?? '';
      await this.walkShapes(
        zip,
        spTree,
        spTreeInner,
        rels,
        cx,
        cy,
        resolvePh,
        resolveDefaultSize,
        resolveScheme,
        resolveDefaultColor,
        elements,
        htmlParts,
      );
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

    const html = `<section class="ppt-slide" style="position:relative;width:100%;aspect-ratio:${cx}/${cy};container-type:inline-size;overflow:hidden;background:${background};">${htmlParts.join('')}</section>`;

    return { html, inventory: { index, elements }, accuracy };
  }

  /**
   * 走訪容器（spTree／grpSp）的形狀，依「文件順序」渲染以還原 z 上下層。
   * 後出現的形狀在 DOM 較後 → 疊在先出現者之上，與 PowerPoint 一致。
   * @param innerXml 容器內層原始 XML，用於重建跨型別兄弟順序
   */
  private async walkShapes(
    zip: JSZip,
    node: XmlNode,
    innerXml: string,
    rels: Map<string, string>,
    cx: number,
    cy: number,
    resolvePh: PhResolver,
    resolveDefaultSize: DefaultSizeResolver,
    resolveScheme: SchemeResolver,
    resolveDefaultColor: DefaultColorResolver,
    elements: InventoryElement[],
    htmlParts: string[],
  ): Promise<void> {
    const sps = asArray(node['p:sp'] as XmlNode[]);
    const pics = asArray(node['p:pic'] as XmlNode[]);
    const gfs = asArray(node['p:graphicFrame'] as XmlNode[]);
    const grps = asArray(node['p:grpSp'] as XmlNode[]);
    const idx = { sp: 0, pic: 0, graphicFrame: 0, grpSp: 0 };

    const renderSp = (sp: XmlNode): void => {
      const { html, element } = this.convertTextShape(
        sp,
        cx,
        cy,
        resolvePh,
        resolveDefaultSize,
        resolveScheme,
        resolveDefaultColor,
      );
      if (element) {
        elements.push(element);
        htmlParts.push(html);
      }
    };
    const renderPic = async (pic: XmlNode): Promise<void> => {
      const { html, element } = await this.convertPicture(
        zip,
        pic,
        rels,
        cx,
        cy,
      );
      elements.push(element);
      htmlParts.push(html);
    };
    const renderGf = (gf: XmlNode): void => {
      const { html, element } = this.convertGraphicFrame(gf, cx, cy);
      elements.push(element);
      htmlParts.push(html);
    };
    // 群組：best-effort 遞迴（忽略群組變換，子元素以自身座標定位），沿用其文件順序
    const renderGrp = async (grp: XmlNode, grpInner: string): Promise<void> => {
      await this.walkShapes(
        zip,
        grp,
        grpInner,
        rels,
        cx,
        cy,
        resolvePh,
        resolveDefaultSize,
        resolveScheme,
        resolveDefaultColor,
        elements,
        htmlParts,
      );
    };

    for (const child of this.orderedChildren(innerXml)) {
      if (child.kind === 'sp' && idx.sp < sps.length) renderSp(sps[idx.sp++]);
      else if (child.kind === 'pic' && idx.pic < pics.length)
        await renderPic(pics[idx.pic++]);
      else if (child.kind === 'graphicFrame' && idx.graphicFrame < gfs.length)
        renderGf(gfs[idx.graphicFrame++]);
      else if (child.kind === 'grpSp' && idx.grpSp < grps.length)
        await renderGrp(grps[idx.grpSp++], child.inner ?? '');
      // cxnSp 無轉換器，略過（仍佔文件順序）
    }

    // 後備：tokenizer 漏掉的元素依陣列剩餘順序補上，確保不丟元素
    for (; idx.sp < sps.length; idx.sp++) renderSp(sps[idx.sp]);
    for (; idx.pic < pics.length; idx.pic++) await renderPic(pics[idx.pic]);
    for (; idx.graphicFrame < gfs.length; idx.graphicFrame++)
      renderGf(gfs[idx.graphicFrame]);
    for (; idx.grpSp < grps.length; idx.grpSp++)
      await renderGrp(grps[idx.grpSp], '');
  }

  /**
   * 解析容器直屬子形狀的文件順序；grpSp 另附其內層 XML 供遞迴沿用順序。
   * 以深度計數排除巢狀群組內的標籤，只取直屬層。
   */
  private orderedChildren(innerXml: string): Array<{
    kind: 'sp' | 'pic' | 'graphicFrame' | 'grpSp' | 'cxnSp';
    inner?: string;
  }> {
    const re = /<p:(sp|pic|graphicFrame|grpSp|cxnSp)(?:\s[^>]*)?>|<\/p:grpSp>/g;
    const out: Array<{
      kind: 'sp' | 'pic' | 'graphicFrame' | 'grpSp' | 'cxnSp';
      inner?: string;
    }> = [];
    let depth = 0;
    let grpStart = -1;
    let m: RegExpExecArray | null;
    while ((m = re.exec(innerXml))) {
      if (m[0] === '</p:grpSp>') {
        depth--;
        if (depth === 0 && grpStart >= 0) {
          out.push({ kind: 'grpSp', inner: innerXml.slice(grpStart, m.index) });
          grpStart = -1;
        }
        continue;
      }
      const kind = m[1] as 'sp' | 'pic' | 'graphicFrame' | 'grpSp' | 'cxnSp';
      if (depth === 0) {
        if (kind === 'grpSp') grpStart = re.lastIndex;
        else out.push({ kind });
      }
      if (kind === 'grpSp') depth++;
    }
    return out;
  }

  private convertTextShape(
    sp: XmlNode,
    cx: number,
    cy: number,
    resolvePh: PhResolver,
    resolveDefaultSize: DefaultSizeResolver,
    resolveScheme: SchemeResolver,
    resolveDefaultColor: DefaultColorResolver,
  ): { html: string; element: InventoryElement | null } {
    const spPr = sp['p:spPr'] as XmlNode | undefined;
    const txBody = sp['p:txBody'] as XmlNode | undefined;
    if (!txBody) return { html: '', element: null };

    const ph = this.phOf(sp);
    // 無自身 xfrm 的 placeholder → 從 layout/master 繼承座標
    let xfrm = spPr?.['a:xfrm'] as XmlNode | undefined;
    if (!xfrm && ph) xfrm = resolvePh(ph.type, ph.idx);
    const pos = this.positionStyle(xfrm, cx, cy);
    // 無自身 sz 的文字以此為基準字級（依 ph 型別繼承 master txStyles，否則退預設）
    const baseSize = resolveDefaultSize(ph?.type) ?? DEFAULT_FONT_SIZE;
    // 無自身色的文字以此為預設色（依 ph 型別繼承 master txStyles）
    const defaultColor = resolveDefaultColor(ph?.type);
    const fill = solidFillColor(spPr);
    const fillStyle = fill ? `background:#${fill};` : '';
    const paragraphs = asArray(txBody['a:p'] as XmlNode[]);

    // 以首個 run 的字型為代表，套於整個文字框（補 CJK fallback 抑制替代字型行高差異）
    const firstRun = asArray(paragraphs[0]?.['a:r'] as XmlNode[])[0];
    const fontFamilyStyle = this.fontFamily(
      firstRun?.['a:rPr'] as XmlNode | undefined,
    );

    const plainParts: string[] = [];
    let autoNum = 0; // buAutoNum 序號計數（限本文字框）
    const htmlParagraphs = paragraphs.map((p) => {
      const pPr = p['a:pPr'] as XmlNode | undefined;
      const algn = pPr?.['@_algn'];
      const alignStyle = algn
        ? `text-align:${ALGN_MAP[String(algn)] ?? 'left'};`
        : '';
      const lineHeightStyle = this.lineHeight(pPr);
      const bullet = this.bulletMarker(pPr, () => ++autoNum);
      // 有項目符號時懸掛縮排，讓符號落在文字左側
      const indentStyle = bullet
        ? 'padding-left:1.5em;text-indent:-1.5em;'
        : '';
      const runs = asArray(p['a:r'] as XmlNode[]);
      const spans = runs.map((r) => {
        const t = textOf(r['a:t']);
        plainParts.push(t);
        return `<span style="${this.runStyle(r['a:rPr'] as XmlNode | undefined, cx, resolveScheme, defaultColor)}">${escapeHtml(t)}</span>`;
      });
      return `<p style="margin:0;${alignStyle}${lineHeightStyle}${indentStyle}">${bullet}${spans.join('')}</p>`;
    });

    const text = plainParts.join('').trim() ? plainParts.join('\n') : '';
    const html = `<div style="position:absolute;${pos}${fillStyle}${fontFamilyStyle}font-size:${this.fontCqw(baseSize, cx)}cqw;">${htmlParagraphs.join('')}</div>`;

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
        // object-fit:fill 撐滿形狀框，比照 PPT blipFill 預設（contain 會在框內留白縮小）
        const html = `<div style="position:absolute;${pos}"><img src="${dataUri}" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:fill;"/></div>`;
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
        const fill = solidFillColor(tc['a:tcPr'] as XmlNode | undefined);
        const fillStyle = fill ? `background:#${fill};` : '';
        return `<td style="border:1px solid #d1d5db;padding:0.4cqw 0.8cqw;${fillStyle}">${escapeHtml(text)}</td>`;
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

  private runStyle(
    rPr: XmlNode | undefined,
    cx: number,
    resolveScheme: SchemeResolver,
    defaultColor?: string,
  ): string {
    const parts: string[] = [];
    if (rPr?.['@_b'] === '1' || rPr?.['@_b'] === 1)
      parts.push('font-weight:bold;');
    if (rPr?.['@_i'] === '1' || rPr?.['@_i'] === 1)
      parts.push('font-style:italic;');
    if (rPr?.['@_u'] && rPr['@_u'] !== 'none')
      parts.push('text-decoration:underline;');
    const sz = Number(rPr?.['@_sz']);
    if (sz) parts.push(`font-size:${this.fontCqw(sz, cx)}cqw;`);
    // 色：run srgbClr → schemeClr（主題色）→ placeholder 繼承色
    const color = this.runColor(rPr, resolveScheme) ?? defaultColor;
    if (color) parts.push(`color:#${color};`);
    return parts.join('');
  }

  /** 解析 run 自身顏色：srgbClr 直接用、schemeClr 經主題色盤解析；無則 undefined */
  private runColor(
    rPr: XmlNode | undefined,
    resolveScheme: SchemeResolver,
  ): string | undefined {
    const solidFill = rPr?.['a:solidFill'] as XmlNode | undefined;
    if (!solidFill) return undefined;
    const srgb = (solidFill['a:srgbClr'] as XmlNode | undefined)?.['@_val'];
    if (srgb) return String(srgb);
    const scheme = (solidFill['a:schemeClr'] as XmlNode | undefined)?.['@_val'];
    return scheme ? resolveScheme(String(scheme)) : undefined;
  }

  // CJK 字型 fallback：替代字型行高貼近微軟正黑體，降低中文文字溢出原框
  private static readonly CJK_FALLBACK =
    '"Microsoft JhengHei","微軟正黑體","Noto Sans TC",sans-serif';

  /** 文字框字型堆疊：來源字型（a:latin/a:ea）置前，串接 CJK fallback */
  private fontFamily(rPr: XmlNode | undefined): string {
    const latin = (rPr?.['a:latin'] as XmlNode | undefined)?.['@_typeface'];
    const ea = (rPr?.['a:ea'] as XmlNode | undefined)?.['@_typeface'];
    const face = latin ?? ea;
    return face
      ? `font-family:"${String(face)}",${ConvertPptService.CJK_FALLBACK};`
      : `font-family:${ConvertPptService.CJK_FALLBACK};`;
  }

  /** 段落行距 <a:lnSpc>：spcPct → 無單位 line-height；spcPts → pt */
  private lineHeight(pPr: XmlNode | undefined): string {
    const lnSpc = pPr?.['a:lnSpc'] as XmlNode | undefined;
    if (!lnSpc) return '';
    const pct = (lnSpc['a:spcPct'] as XmlNode | undefined)?.['@_val'];
    if (pct) return `line-height:${round(Number(pct) / 100000, 3)};`;
    const pts = (lnSpc['a:spcPts'] as XmlNode | undefined)?.['@_val'];
    if (pts) return `line-height:${Number(pts) / 100}pt;`;
    return '';
  }

  // Wingdings 常用項目符號碼 → Unicode
  private static readonly WINGDINGS_BULLET: Record<string, string> = {
    n: '■',
    l: '●',
    u: '◆',
    p: '❖',
    v: '❖',
    w: '◆',
  };

  /**
   * 解析段落 `<a:pPr>` 的項目符號，回傳前置 marker 的 HTML（無則空字串）。
   * 支援 buNone（不顯示）、buChar（含 Wingdings 對應）、buAutoNum（自動編號）。
   * @param nextNum buAutoNum 取下一個序號（由呼叫端維護文字框內計數）
   */
  private bulletMarker(
    pPr: XmlNode | undefined,
    nextNum: () => number,
  ): string {
    if (!pPr || pPr['a:buNone'] !== undefined) return '';
    const buChar = pPr['a:buChar'] as XmlNode | undefined;
    const buAuto = pPr['a:buAutoNum'] as XmlNode | undefined;
    if (!buChar && !buAuto) return '';

    const buClr = srgbVal(pPr['a:buClr'] as XmlNode | undefined);
    const colorStyle = buClr ? `color:#${buClr};` : '';
    const szPct = (pPr['a:buSzPct'] as XmlNode | undefined)?.['@_val'];
    const sizeStyle = szPct
      ? `font-size:${round(Number(szPct) / 100000, 2)}em;`
      : '';
    const style = `${colorStyle}${sizeStyle}margin-right:0.4em;`;

    let marker: string;
    if (buChar) {
      const ch = String(buChar['@_char'] ?? '');
      const buFont = (pPr['a:buFont'] as XmlNode | undefined)?.['@_typeface'];
      marker = this.bulletGlyph(ch, buFont ? String(buFont) : undefined);
    } else {
      const type = String(buAuto?.['@_type'] ?? 'arabicPeriod');
      marker = this.formatAutoNum(nextNum(), type);
    }
    return `<span style="${style}">${escapeHtml(marker)}</span>`;
  }

  /** buChar 字元 → 顯示字形（Wingdings 走對應表，其餘原樣輸出） */
  private bulletGlyph(ch: string, font?: string): string {
    if (font && /wingdings/i.test(font)) {
      return ConvertPptService.WINGDINGS_BULLET[ch] ?? '■';
    }
    return ch || '•';
  }

  /** buAutoNum 序號格式化（常見阿拉伯數字格式，其餘退 `N.`） */
  private formatAutoNum(n: number, type: string): string {
    if (type.startsWith('arabicParenBoth')) return `(${n})`;
    if (type.startsWith('arabicParenR')) return `${n})`;
    return `${n}.`;
  }

  /** OOXML 字級（百分點）→ cqw（容器寬度單位，相對投影片寬） */
  private fontCqw(sz: number, cx: number): number {
    const pt = sz / 100;
    const slideWidthPt = cx / EMU_PER_POINT;
    return round((pt / slideWidthPt) * 100, 3);
  }

  private countAllTextChars(xml: string): number {
    // 只匹配「有內容」的 <a:t>…</a:t>；用 (?:\s[^>]*)? 避免把自閉的 <a:t/>（空 run）
    // 誤判成開始標籤而吃掉後續 XML，導致字元數爆增、文字還原率被低估
    const matches = xml.match(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g) ?? [];
    return matches.reduce((sum, m) => {
      const inner = m.replace(/<a:t(?:\s[^>]*)?>/, '').replace(/<\/a:t>$/, '');
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
