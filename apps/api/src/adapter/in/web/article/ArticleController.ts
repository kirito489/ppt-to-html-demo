import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guard/JwtAuthGuard';
import { PptFacade } from '../../../../application/facade/PptFacade';
import {
  buildPaginationMeta,
  getPagination,
  PaginationQuery,
} from '../../../../infrastructure/pagination';

/** 轉換文章與攝取批次查詢（皆需登入） */
@Controller()
@UseGuards(JwtAuthGuard)
export class ArticleController {
  constructor(private readonly facade: PptFacade) {}

  @Get('articles')
  async listArticles(@Query() query: PaginationQuery) {
    const { page, limit } = getPagination(query);
    const { data, total } = await this.facade.listArticles({ page, limit });
    return { items: data, meta: buildPaginationMeta(page, limit, total) };
  }

  /** demo 手動觸發一次攝取（須在 :id 路由之前宣告） */
  @Post('articles/ingest')
  @HttpCode(HttpStatus.OK)
  ingest() {
    return this.facade.ingest();
  }

  @Get('articles/:id')
  getArticle(@Param('id', ParseUUIDPipe) id: string) {
    return this.facade.getArticle(id);
  }

  @Get('conversion-jobs')
  async listJobs(@Query() query: PaginationQuery) {
    const { page, limit } = getPagination(query);
    const { data, total } = await this.facade.listConversionJobs({
      page,
      limit,
    });
    return { items: data, meta: buildPaginationMeta(page, limit, total) };
  }
}
