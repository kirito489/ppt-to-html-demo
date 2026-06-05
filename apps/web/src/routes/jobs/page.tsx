import { useState } from 'react'

import { useApiQuery } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const LIMIT = 10

const formatDateTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleString('zh-TW', { hour12: false }) : '—'

const TRIGGER_LABEL: Record<string, string> = {
  scheduled: '排程',
  manual: '手動',
}

export const ConversionJobsPage = () => {
  const [page, setPage] = useState(1)
  const jobsQuery = useApiQuery('GET', '/conversion-jobs', {
    params: { query: { page, limit: LIMIT } },
  })

  const items = jobsQuery.data?.items ?? []
  const meta = jobsQuery.data?.meta

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">轉換紀錄</h2>

      {jobsQuery.isLoading && (
        <p className="text-muted-foreground text-sm">載入中…</p>
      )}
      {jobsQuery.error && (
        <p className="text-destructive text-sm">
          讀取失敗：{jobsQuery.error.message}
        </p>
      )}
      {jobsQuery.data && items.length === 0 && (
        <p className="text-muted-foreground text-sm">尚無轉換紀錄。</p>
      )}

      {items.map((job) => (
        <Card key={job.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-3 text-base">
              <span className="rounded bg-muted px-2 py-0.5 text-xs">
                {TRIGGER_LABEL[job.trigger] ?? job.trigger}
              </span>
              <span className="text-muted-foreground text-sm font-normal">
                {formatDateTime(job.startedAt)} → {formatDateTime(job.finishedAt)}
              </span>
              <span className="text-sm font-normal">
                掃描 {job.filesScanned}、
                <span className="text-green-600">成功 {job.filesConverted}</span>
                、
                <span className="text-red-600">失敗 {job.filesFailed}</span>
              </span>
            </CardTitle>
          </CardHeader>
          {job.detail.length > 0 && (
            <CardContent>
              <ul className="flex flex-col gap-1 text-sm">
                {job.detail.map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span
                      className={
                        d.status === 'success'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }
                    >
                      {d.status === 'success' ? '✓' : '✗'}
                    </span>
                    <span className="font-medium">{d.filename}</span>
                    {d.status === 'success' &&
                      d.accuracyOverall != null && (
                        <span className="text-muted-foreground tabular-nums">
                          {(d.accuracyOverall * 100).toFixed(1)}%
                        </span>
                      )}
                    {d.error && (
                      <span className="text-muted-foreground">— {d.error}</span>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      ))}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <span className="text-muted-foreground text-sm">
            第 {meta.page} / {meta.totalPages} 頁
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一頁
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一頁
          </Button>
        </div>
      )}
    </div>
  )
}
