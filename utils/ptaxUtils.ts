import { format, subDays } from "date-fns"

interface PTAXData {
  cotacaoCompra: number
  cotacaoVenda: number
  dataHoraCotacao: string
}

interface ProcessedPTAXData {
  date: string
  average: number
  compra: number
  venda: number
}

export async function fetchPTAXData(): Promise<PTAXData[]> {
  try {
    const endDate = new Date()
    const startDate = subDays(endDate, 30) // Fetch last 30 days of data

    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${format(startDate, "MM-dd-yyyy")}'&@dataFinalCotacao='${format(endDate, "MM-dd-yyyy")}'&$top=100&$format=json`

    console.log("Fazendo requisição para URL PTAX:", url)

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    console.log("Resposta PTAX recebida:", JSON.stringify(data, null, 2))

    if (!data.value || !Array.isArray(data.value)) {
      throw new Error("Formato de resposta PTAX inválido")
    }

    if (data.value.length === 0) {
      throw new Error("Nenhum dado PTAX encontrado para o período especificado")
    }

    return data.value
  } catch (error) {
    console.error("Erro ao buscar dados PTAX:", error)
    throw error
  }
}

export function calcularPTAXMedia(dados: PTAXData[]): number {
  if (!dados || dados.length === 0) return 0
  const ultimaData = dados[dados.length - 1].dataHoraCotacao.split(" ")[0]
  const dadosUltimoDia = dados.filter((item) => item.dataHoraCotacao.startsWith(ultimaData))
  if (dadosUltimoDia.length === 0) return 0
  const soma = dadosUltimoDia.reduce((acc, item) => acc + (item.cotacaoCompra + item.cotacaoVenda) / 2, 0)
  return soma / dadosUltimoDia.length
}

export function calcularMediaCompra(dados: PTAXData[]): number {
  if (!dados || dados.length === 0) return 0
  const ultimaData = dados[dados.length - 1].dataHoraCotacao.split(" ")[0]
  const dadosUltimoDia = dados.filter((item) => item.dataHoraCotacao.startsWith(ultimaData))
  if (dadosUltimoDia.length === 0) return 0
  const soma = dadosUltimoDia.reduce((acc, item) => acc + item.cotacaoCompra, 0)
  return soma / dadosUltimoDia.length
}

export function calcularMediaVenda(dados: PTAXData[]): number {
  if (!dados || dados.length === 0) return 0
  const ultimaData = dados[dados.length - 1].dataHoraCotacao.split(" ")[0]
  const dadosUltimoDia = dados.filter((item) => item.dataHoraCotacao.startsWith(ultimaData))
  if (dadosUltimoDia.length === 0) return 0
  const soma = dadosUltimoDia.reduce((acc, item) => acc + item.cotacaoVenda, 0)
  return soma / dadosUltimoDia.length
}

export function calcularVariacaoPTAX(dados: PTAXData[]): number {
  if (!dados || dados.length < 2) return 0
  const ultimoValor = (dados[dados.length - 1].cotacaoCompra + dados[dados.length - 1].cotacaoVenda) / 2
  const penultimoValor = (dados[dados.length - 2].cotacaoCompra + dados[dados.length - 2].cotacaoVenda) / 2
  return ((ultimoValor - penultimoValor) / penultimoValor) * 100
}

export function prepararDadosGrafico(dados: PTAXData[]): ProcessedPTAXData[] {
  if (!dados || dados.length === 0) return []
  return dados.map((item) => ({
    date: item.dataHoraCotacao.split(" ")[0],
    average: (item.cotacaoCompra + item.cotacaoVenda) / 2,
    compra: item.cotacaoCompra,
    venda: item.cotacaoVenda,
  }))
}

export function calcularMaxMin(dadosGrafico: ProcessedPTAXData[]): { max: number | null; min: number | null } {
  if (!dadosGrafico || dadosGrafico.length === 0) return { max: null, min: null }
  let max = dadosGrafico[0].average
  let min = dadosGrafico[0].average
  dadosGrafico.forEach((data) => {
    if (data.average > max) max = data.average
    if (data.average < min) min = data.average
  })
  return { max, min }
}

