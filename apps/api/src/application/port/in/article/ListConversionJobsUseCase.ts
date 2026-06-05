import type {
  JobsPage,
  ListJobsParams,
} from '../../out/conversion-job/LoadConversionJobPort';

export const LIST_CONVERSION_JOBS_USE_CASE = 'LIST_CONVERSION_JOBS_USE_CASE';

export interface ListConversionJobsUseCase {
  execute(params: ListJobsParams): Promise<JobsPage>;
}
