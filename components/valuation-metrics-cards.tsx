interface MetricItem {
  label: string
  value: string
}

interface ValuationMetricsCardsProps {
  items: MetricItem[]
}

export function ValuationMetricsCards({ items }: ValuationMetricsCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 border-y py-6">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border p-4 text-center">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="text-lg font-bold">{item.value}</p>
        </div>
      ))}
    </div>
  )
}
