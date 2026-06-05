import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { SaveConvertedArticlePort } from '../../../../application/port/out/article/SaveConvertedArticlePort';
import {
  ArticlesPage,
  ListArticlesParams,
  LoadConvertedArticlePort,
} from '../../../../application/port/out/article/LoadConvertedArticlePort';
import type {
  ConvertedArticle,
  NewConvertedArticle,
} from '../../../../domain/model/ConvertedArticle';
import type {
  ArticleStatus,
  SlideAccuracy,
  SlideInventory,
} from '../../../../domain/model/conversion';

/** inventory JSON 欄位的內容：來源元素清單 + 每頁準確率 */
interface InventoryBlob {
  inventory: SlideInventory[];
  slides: SlideAccuracy[];
}

@Injectable()
export class PrismaConvertedArticleRepository
  implements SaveConvertedArticlePort, LoadConvertedArticlePort
{
  constructor(private readonly prisma: PrismaService) {}

  async save(article: NewConvertedArticle): Promise<string> {
    const blob: InventoryBlob = {
      inventory: article.inventory,
      slides: article.accuracy.slides,
    };
    const created = await this.prisma.convertedArticleRecord.create({
      data: {
        title: article.title,
        sourceFilename: article.sourceFilename,
        html: article.html,
        inventory: blob as unknown as Prisma.InputJsonValue,
        slideCount: article.slideCount,
        accuracyOverall: article.accuracy.overall,
        accuracyText: article.accuracy.text,
        accuracyImage: article.accuracy.image,
        accuracyCoverage: article.accuracy.coverage,
        status: article.status,
      },
      select: { id: true },
    });
    return created.id;
  }

  async list(params: ListArticlesParams): Promise<ArticlesPage> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.convertedArticleRecord.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        select: {
          id: true,
          title: true,
          sourceFilename: true,
          slideCount: true,
          accuracyOverall: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.convertedArticleRecord.count(),
    ]);
    return {
      data: rows.map((r) => ({ ...r, status: r.status as ArticleStatus })),
      total,
    };
  }

  async findById(id: string): Promise<ConvertedArticle | null> {
    const r = await this.prisma.convertedArticleRecord.findUnique({
      where: { id },
    });
    if (!r) return null;
    const blob = r.inventory as unknown as InventoryBlob;
    return {
      id: r.id,
      title: r.title,
      sourceFilename: r.sourceFilename,
      html: r.html,
      inventory: blob?.inventory ?? [],
      slideCount: r.slideCount,
      accuracy: {
        overall: r.accuracyOverall,
        text: r.accuracyText,
        image: r.accuracyImage,
        coverage: r.accuracyCoverage,
        slides: blob?.slides ?? [],
      },
      status: r.status as ArticleStatus,
      createdAt: r.createdAt,
    };
  }
}
