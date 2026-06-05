import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useApiQuery } from '@/api/client'

export const HomePage = () => {
  // 示範：呼叫 /me 取登入者資料，型別會自動推導為 yaml 內的 data shape
  const meQuery = useApiQuery('GET', '/me')

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>PPT → HTML 轉換 Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            系統會定時從公槽（demo 以本地資料夾模擬）抓取 .pptx，轉成可在編輯器顯示且不跑版的
            HTML，並提供準確率數據。請到左側「文章列表」檢視結果或手動觸發抓取。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>個人資料</CardTitle>
        </CardHeader>
        <CardContent>
          {meQuery.isLoading && (
            <p className="text-muted-foreground text-sm">載入中…</p>
          )}
          {meQuery.error && (
            <p className="text-destructive text-sm">
              讀取失敗：{meQuery.error.message}
            </p>
          )}
          {meQuery.data && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="text-muted-foreground">名稱</dt>
              <dd>{meQuery.data.member}</dd>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{meQuery.data.email}</dd>
              <dt className="text-muted-foreground">角色</dt>
              <dd>{meQuery.data.roleName}</dd>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
