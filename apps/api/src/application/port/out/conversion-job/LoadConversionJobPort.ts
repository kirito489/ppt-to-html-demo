import type { ConversionJob } from '../../../../domain/model/ConversionJob';

export const LOAD_CONVERSION_JOB_PORT = 'LOAD_CONVERSION_JOB_PORT';

export interface ListJobsParams {
  page: number;
  limit: number;
}

export interface JobsPage {
  data: ConversionJob[];
  total: number;
}

export interface LoadConversionJobPort {
  list(params: ListJobsParams): Promise<JobsPage>;
}
