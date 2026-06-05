import { Inject, Injectable } from '@nestjs/common';
import { ListConversionJobsUseCase } from '../../port/in/article/ListConversionJobsUseCase';
import {
  JobsPage,
  ListJobsParams,
  LOAD_CONVERSION_JOB_PORT,
  LoadConversionJobPort,
} from '../../port/out/conversion-job/LoadConversionJobPort';

@Injectable()
export class ListConversionJobsService implements ListConversionJobsUseCase {
  constructor(
    @Inject(LOAD_CONVERSION_JOB_PORT)
    private readonly load: LoadConversionJobPort,
  ) {}

  execute(params: ListJobsParams): Promise<JobsPage> {
    return this.load.list(params);
  }
}
