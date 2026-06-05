import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../guard/JwtAuthGuard';
import { PptFacade } from '../../../../application/facade/PptFacade';
import {
  buildPaginationMeta,
  getPagination,
  PaginationQuery,
} from '../../../../infrastructure/pagination';
import { getEnv } from '../../../../infrastructure/validate-env';

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

  /** 上傳單一 .pptx 至公槽（不轉換），回傳存入檔名 */
  @Post('articles/upload')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('缺少上傳檔案（欄位名 file）');
    }
    const name = file.originalname ?? '';
    if (!name.toLowerCase().endsWith('.pptx')) {
      throw new BadRequestException('只接受 .pptx 檔');
    }
    const max = getEnv().UPLOAD_MAX_BYTES;
    if (file.size > max) {
      throw new BadRequestException(`檔案過大，上限 ${max} bytes`);
    }
    return this.facade.upload(file.buffer, name);
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
