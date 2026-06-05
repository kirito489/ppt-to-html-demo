import { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

import { useApiMutation, useApiQuery } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from './components/status-badge'

const LIMIT = 10

const formatDateTime = (iso: string): string =>
  new Date(iso).toLocaleString('zh-TW', { hour12: false })

export const ArticlesListPage = () => {
  const [page, setPage] = useState(1)

  const articlesQuery = useApiQuery('GET', '/articles', {
    params: { query: { page, limit: LIMIT } },
  })
  const ingest = useApiMutation('POST', '/articles/ingest')

  const handleIngest = async () => {
    try {
      const job = await ingest.mutateAsync({})
      toast.success(
        `攝取完成：掃描 ${job.filesScanned}、成功 ${job.filesConverted}、失敗 ${job.filesFailed}`,
      )
      await articlesQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '攝取失敗')
    }
  }

  const items = articlesQuery.data?.items ?? []
  const meta = articlesQuery.data?.meta

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>轉換文章</CardTitle>
        <Button onClick={handleIngest} disabled={ingest.isPending}>
          <RefreshCw className={ingest.isPending ? 'animate-spin' : ''} />
          {ingest.isPending ? '抓取中…' : '立即抓取轉換'}
        </Button>
      </CardHeader>
      <CardContent>
        {articlesQuery.isLoading && (
          <p className="text-muted-foreground text-sm">載入中…</p>
        )}
        {articlesQuery.error && (
          <p className="text-destructive text-sm">
            讀取失敗：{articlesQuery.error.message}
          </p>
        )}

        {articlesQuery.data && items.length === 0 && (
          <p className="text-muted-foreground text-sm">
            尚無文章。把 .pptx 放進來源資料夾後按「立即抓取轉換」，或等待排程。
          </p>
        )}

        {items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>標題</TableHead>
                <TableHead>來源檔名</TableHead>
                <TableHead className="text-right">頁數</TableHead>
                <TableHead className="text-right">準確率</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>建立時間</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link
                      to={`/articles/${a.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {a.sourceFilename}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {a.slideCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(a.accuracyOverall * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={a.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(a.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2">
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
      </CardContent>
    </Card>
  )
}
