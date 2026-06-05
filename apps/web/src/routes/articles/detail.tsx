import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

import { useApiQuery } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AccuracyGauge } from './components/accuracy-gauge'
import { SlidePreview } from './components/slide-preview'
import { InventoryPanel } from './components/inventory-panel'

export const ArticleDetailPage = () => {
  const { id = '' } = useParams()
  const articleQuery = useApiQuery(
    'GET',
    '/articles/{id}',
    { params: { path: { id } } },
    { enabled: id !== '' },
  )

  const article = articleQuery.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button asChild size="sm" variant="outline">
          <Link to="/articles">
            <ArrowLeft />
            返回列表
          </Link>
        </Button>
        {article && <h2 className="text-lg font-semibold">{article.title}</h2>}
      </div>

      {articleQuery.isLoading && (
        <p className="text-muted-foreground text-sm">載入中…</p>
      )}
      {articleQuery.error && (
        <p className="text-destructive text-sm">
          讀取失敗：{articleQuery.error.message}
        </p>
      )}

      {article && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>準確率</CardTitle>
            </CardHeader>
            <CardContent>
              <AccuracyGauge accuracy={article.accuracy} />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>轉換結果（不跑版預覽）</CardTitle>
              </CardHeader>
              <CardContent>
                <SlidePreview html={article.html} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>來源元素對照</CardTitle>
              </CardHeader>
              <CardContent>
                <InventoryPanel
                  inventory={article.inventory}
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
