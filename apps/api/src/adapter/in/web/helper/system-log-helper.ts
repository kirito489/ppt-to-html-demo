import { Request } from 'express';
import { sanitize, sanitizeUrl } from '../../../../infrastructure/sanitize';
import { SystemLogData } from '../../../../application/port/out/shared/SaveSystemLogPort';

// MySQL TEXT 上限 65535 bytes；utf8mb4 最壞 4 byte/字，取 15000 字 ≈ 60KB 為安全上限。
// base64 已先被 sanitize 移除，正常不會觸頂；此為防止其他超長字串溢位的安全網
const MAX_LOG_FIELD_LEN = 15_000;

const truncate = (s: string): string =>
  s.length > MAX_LOG_FIELD_LEN
    ? `${s.slice(0, MAX_LOG_FIELD_LEN)}…[truncated ${s.length - MAX_LOG_FIELD_LEN} chars]`
    : s;

/**
 * 從 HTTP request 建立 SystemLogData 的公共欄位，
 * 供 LoggingInterceptor（成功路徑）與 GlobalExceptionFilter（錯誤路徑）共用。
 */
export function buildSystemLogData(
  request: Request,
  statusCode: number,
  responsePayload: unknown,
  startTime: Date,
  responseTime: Date,
  overrides?: Partial<SystemLogData>,
): SystemLogData {
  const { method, ip } = request;
  const url = sanitizeUrl(request.url);
  const member = request.member;

  return {
    memberId: member?.sub,
    action: `${method} ${url}`,
    ipAddress: ip,
    method,
    url,
    request: truncate(
      sanitize({
        // 只記錄診斷用 header，避免 Authorization / Cookie 等敏感欄位進入 log
        headers: {
          'user-agent': request.headers['user-agent'],
          'content-type': request.headers['content-type'],
          'x-request-id': request.headers['x-request-id'],
          'x-forwarded-for': request.headers['x-forwarded-for'],
        },
        body: request.body,
        query: request.query,
      }),
    ),
    response: truncate(sanitize(responsePayload)),
    statusCode,
    execTime: (responseTime.getTime() - startTime.getTime()) / 1000,
    requestTime: startTime,
    responseTime,
    ...overrides,
  };
}
