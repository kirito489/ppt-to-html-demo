import type { InventoryElement, SlideInventory } from '../types'

const KIND_LABEL: Record<string, string> = {
  text: '文字',
  image: '圖片',
  table: '表格',
  unsupported: '未支援',
}

const ElementRow = ({ el }: { el: InventoryElement }) => (
  <li className="flex gap-2 border-b py-2 last:border-b-0">
    <div className="flex w-16 shrink-0 flex-col items-start gap-1">
      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
        {KIND_LABEL[el.kind] ?? el.kind}
      </span>
      <span
        className={`text-[11px] font-medium ${el.restored ? 'text-green-600' : 'text-red-600'}`}
      >
        {el.restored ? '✓ 已還原' : '✗ 未還原'}
      </span>
    </div>
    <div className="min-w-0 flex-1 text-sm">
      {el.kind === 'text' && (
        <p className="whitespace-pre-wrap break-words">{el.text}</p>
      )}
      {el.kind === 'image' &&
        (el.image ? (
          <img
            src={el.image}
            alt="來源圖片"
            className="max-h-24 rounded border"
          />
        ) : (
          <span className="text-muted-foreground">（圖片未擷取，無法還原）</span>
        ))}
      {el.kind === 'table' && el.tableCells && (
        <table className="border-collapse text-xs">
          <tbody>
            {el.tableCells.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="border px-1.5 py-0.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {el.kind === 'unsupported' && (
        <span className="text-muted-foreground">
          未支援元素：{el.unsupportedType ?? '未知'}
        </span>
      )}
    </div>
  </li>
)

/**
 * 來源元素對照面板：逐頁列出擷取到的文字 / 圖片 / 表格，並標記是否還原，
 * 供審查者逐條核對文字與圖片是否準確。
 */
export const InventoryPanel = ({
  inventory,
}: {
  inventory: SlideInventory[]
}) => {
  return (
    <div className="flex flex-col gap-4">
      {inventory.map((slide) => (
        <div key={slide.index}>
          <div className="text-muted-foreground mb-1 text-xs font-medium">
            第 {slide.index} 頁（{slide.elements.length} 個元素）
          </div>
          {slide.elements.length === 0 ? (
            <p className="text-muted-foreground text-sm">（無可辨識元素）</p>
          ) : (
            <ul className="rounded-md border px-3">
              {slide.elements.map((el, i) => (
                <ElementRow key={i} el={el} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}
