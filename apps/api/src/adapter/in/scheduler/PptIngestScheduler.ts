import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import {
  INGEST_PPT_USE_CASE,
  IngestPptUseCase,
} from '../../../application/port/in/ppt/IngestPptUseCase';
import { getEnv } from '../../../infrastructure/validate-env';

const CRON_NAME = 'ppt-ingest';

/**
 * 定時觸發 PPT 攝取。
 * 動態註冊（onModuleInit）才能在 dotenv 載入後讀到 INGEST_CRON / 時區設定。
 */
@Injectable()
export class PptIngestScheduler implements OnModuleInit {
  private readonly logger = new Logger(PptIngestScheduler.name);

  constructor(
    @Inject(INGEST_PPT_USE_CASE)
    private readonly ingest: IngestPptUseCase,
    private readonly registry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const env = getEnv();
    if (!env.INGEST_SCHEDULE_ENABLED) {
      this.logger.log('PPT 攝取排程已停用（INGEST_SCHEDULE_ENABLED=false）');
      return;
    }
    const job = CronJob.from({
      cronTime: env.INGEST_CRON,
      onTick: () => void this.run(),
      timeZone: env.APP_TIMEZONE,
    });
    this.registry.addCronJob(CRON_NAME, job);
    job.start();
    this.logger.log(`PPT 攝取排程啟動：${env.INGEST_CRON}`);
  }

  private async run(): Promise<void> {
    try {
      const job = await this.ingest.execute('scheduled');
      if (job.filesScanned > 0) {
        this.logger.log(
          `排程攝取完成：掃描 ${job.filesScanned}、成功 ${job.filesConverted}、失敗 ${job.filesFailed}`,
        );
      }
    } catch (err) {
      this.logger.error(
        '排程攝取失敗',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
