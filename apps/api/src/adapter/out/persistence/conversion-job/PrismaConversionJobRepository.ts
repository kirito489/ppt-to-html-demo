import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { SaveConversionJobPort } from '../../../../application/port/out/conversion-job/SaveConversionJobPort';
import {
  JobsPage,
  ListJobsParams,
  LoadConversionJobPort,
} from '../../../../application/port/out/conversion-job/LoadConversionJobPort';
import type {
  JobFileDetail,
  JobTrigger,
  NewConversionJob,
} from '../../../../domain/model/ConversionJob';

@Injectable()
export class PrismaConversionJobRepository
  implements SaveConversionJobPort, LoadConversionJobPort
{
  constructor(private readonly prisma: PrismaService) {}

  async save(job: NewConversionJob): Promise<string> {
    const created = await this.prisma.conversionJobRecord.create({
      data: {
        trigger: job.trigger,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        filesScanned: job.filesScanned,
        filesConverted: job.filesConverted,
        filesFailed: job.filesFailed,
        detail: job.detail as unknown as Prisma.InputJsonValue,
      },
      select: { id: true },
    });
    return created.id;
  }

  async list(params: ListJobsParams): Promise<JobsPage> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.conversionJobRecord.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.conversionJobRecord.count(),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        trigger: r.trigger as JobTrigger,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        filesScanned: r.filesScanned,
        filesConverted: r.filesConverted,
        filesFailed: r.filesFailed,
        detail: (r.detail as unknown as JobFileDetail[]) ?? [],
        createdAt: r.createdAt,
      })),
      total,
    };
  }
}
