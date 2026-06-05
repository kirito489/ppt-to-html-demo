import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Accuracy } from '../types'

const pct = (n: number): string => `${(n * 100).toFixed(1)}%`

/** 依準確率高低取色：>=0.9 綠、>=0.7 黃、其餘紅 */
const barColor = (v: number): string =>
  v >= 0.9 ? 'bg-green-500' : v >= 0.7 ? 'bg-amber-500' : 'bg-red-500'

const Bar = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{pct(value)}</span>
    </div>
    <div className="mt-1 h-2 overflow-hidden rounded bg-muted">
      <div
        className={`h-2 rounded ${barColor(value)}`}
        style={{ width: pct(value) }}
      />
    </div>
  </div>
)

/** 準確率儀表：整體 + 三項分類 + 每頁明細 */
export const AccuracyGauge = ({ accuracy }: { accuracy: Accuracy }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">
          {pct(accuracy.overall)}
        </span>
        <span className="text-muted-foreground text-sm">整體準確率</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Bar label="文字還原正確率" value={accuracy.text} />
        <Bar label="圖片擷取成功率" value={accuracy.image} />
        <Bar label="元素涵蓋率" value={accuracy.coverage} />
      </div>

      {accuracy.slides.length > 0 && (
        <div>
          <div className="text-muted-foreground mb-1 text-xs">每頁明細</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>頁</TableHead>
                <TableHead className="text-right">整體</TableHead>
                <TableHead className="text-right">文字</TableHead>
                <TableHead className="text-right">圖片</TableHead>
                <TableHead className="text-right">涵蓋</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accuracy.slides.map((s) => (
                <TableRow key={s.index}>
                  <TableCell>第 {s.index} 頁</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(s.overall)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(s.text)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(s.image)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pct(s.coverage)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
