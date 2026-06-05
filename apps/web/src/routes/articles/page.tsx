import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { FileClock, RefreshCw, Upload } from 'lucide-react'

import { useApiMutation, useApiQuery } from '@/api/client'
import { tokenStorage } from '@/lib/storage'
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
  const pendingQuery = useApiQuery('GET', '/articles/pending')
  const ingest = useApiMutation('POST', '/articles/ingest')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleIngest = async () => {
    try {
      const job = await ingest.mutateAsync({})
      toast.success(
        `攝取完成：掃描 ${job.filesScanned}、成功 ${job.filesConverted}、失敗 ${job.filesFailed}`,
      )
      await Promise.all([articlesQuery.refetch(), pendingQuery.refetch()])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '攝取失敗')
    }
  }

  // 上傳走原生 fetch（multipart 透過型別化 client 較不便）；只把檔案存進公槽，不在此轉換
  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/articles/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenStorage.get() ?? ''}` },
        body: form,
      })
      const body = (await res.json()) as {
        data?: { filename?: string }
        message?: string
      }
      if (!res.ok) throw new Error(body.message ?? '上傳失敗')
      toast.success(
        `已上傳「${body.data?.filename}」到公槽，請按「立即抓取轉換」或等排程`,
      )
      await pendingQuery.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上傳失敗')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const items = articlesQuery.data?.items ?? []
  const meta = articlesQuery.data?.meta
  const pendingItems = pendingQuery.data?.items ?? []

  return (
    <div className="space-y-4">
      {/* 頁面動作列：上傳／抓取放卡片外，待轉換與文章列表共用、不重覆 */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">轉換文章</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pptx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleUpload(file)
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload />
            {uploading ? '上傳中…' : '上傳 PPT'}
          </Button>
          <Button onClick={handleIngest} disabled={ingest.isPending}>
            <RefreshCw className={ingest.isPending ? 'animate-spin' : ''} />
            {ingest.isPending ? '抓取中…' : '立即抓取轉換'}
          </Button>
        </div>
      </div>

      {pendingItems.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileClock className="size-4 text-amber-600" />
              待轉換（{pendingItems.length}）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-2 text-sm">
              以下檔案已在公槽待轉換，請按右上「立即抓取轉換」或等待排程。
            </p>
            <ul className="text-muted-foreground space-y-1 text-sm">
              {pendingItems.map((p) => (
                <li key={p.name} className="font-mono">
                  {p.name}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
      <CardHeader>
        <CardTitle>文章列表</CardTitle>
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
    </div>
  )
}
