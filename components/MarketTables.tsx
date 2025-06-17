import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ParsedMarketData, ParsedCurvaData } from "@/types/market-data"

interface MarketTablesProps {
  soybeanData: ParsedMarketData[]
  cornData: ParsedMarketData[]
  curveData: ParsedCurvaData[]
}

export function MarketTables({ soybeanData, cornData, curveData }: MarketTablesProps) {
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "N/A"
    return value.toFixed(2)
  }

  const renderCBOTTable = (data: ParsedMarketData[], title: string) => (
    <div className="mb-4">
      <div className="bg-secondary px-4 py-2 text-sm font-bold">{title}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">Contrato</TableHead>
            <TableHead className="table-header">Var</TableHead>
            <TableHead className="table-header">Máximo</TableHead>
            <TableHead className="table-header">Mínimo</TableHead>
            <TableHead className="table-header">Abertura</TableHead>
            <TableHead className="table-header">Último</TableHead>
            <TableHead className="table-header">Ajuste</TableHead>
            <TableHead className="table-header">Vencimento</TableHead>
            <TableHead className="table-header">Prazo (Dias)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.symbol} className="hover:bg-secondary/50">
              <TableCell className="table-cell">{item.symbol}</TableCell>
              <TableCell className={`table-cell ${item.variacao && item.variacao >= 0 ? "positive" : "negative"}`}>
                {formatNumber(item.variacao)}
              </TableCell>
              <TableCell className="table-cell">{formatNumber(item.maximo)}</TableCell>
              <TableCell className="table-cell">{formatNumber(item.minimo)}</TableCell>
              <TableCell className="table-cell">{formatNumber(item.abertura)}</TableCell>
              <TableCell className="table-cell">{formatNumber(item.ultimoPreco)}</TableCell>
              <TableCell className="table-cell">{formatNumber(item.fechamento)}</TableCell>
              <TableCell className="table-cell">{item.vencimento}</TableCell>
              <TableCell className="table-cell">{item.diasAteVencimento}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  const renderCurveTable = () => (
    <div className="mb-4">
      <div className="bg-secondary px-4 py-2 text-sm font-bold">CURVA DÓLAR</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="table-header">Curva</TableHead>
            <TableHead className="table-header">Taxa</TableHead>
            <TableHead className="table-header">Var</TableHead>
            <TableHead className="table-header">Data/Hora</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {curveData.map((item) => (
            <TableRow key={item.curva} className="hover:bg-secondary/50">
              <TableCell className="table-cell">{item.curva}</TableCell>
              <TableCell className="table-cell">{formatNumber(item.taxa)}</TableCell>
              <TableCell className={`table-cell ${item.var && item.var >= 0 ? "positive" : "negative"}`}>
                {formatNumber(item.var)}
              </TableCell>
              <TableCell className="table-cell">{item.datetime}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-4">
      {renderCBOTTable(soybeanData, "SOJA CBOT")}
      {renderCBOTTable(cornData, "MILHO CBOT")}
      {renderCurveTable()}
    </div>
  )
}

