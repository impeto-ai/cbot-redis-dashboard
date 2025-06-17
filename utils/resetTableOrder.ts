/**
 * Função para resetar a ordem das tabelas para o padrão
 * Pode ser chamada no console do navegador para forçar a ordem padrão
 */
export function resetTableOrder() {
  const defaultOrder = [
    { id: "soybean", type: "soybean", title: "SOJA CBOT", visible: true, layout: "vertical" },
    { id: "corn", type: "corn", title: "MILHO CBOT", visible: true, layout: "vertical" },
    { id: "meal", type: "meal", title: "FARELO DE SOJA CBOT", visible: true, layout: "vertical" },
    { id: "oil", type: "oil", title: "ÓLEO DE SOJA CBOT", visible: true, layout: "vertical" },
    { id: "wheat", type: "wheat", title: "TRIGO CBOT", visible: true, layout: "vertical" },
    { id: "dollar", type: "dollar", title: "CURVA DE DÓLAR", visible: true, layout: "vertical" },
  ]

  // Salvar a ordem padrão no localStorage
  localStorage.setItem("tableLayout", JSON.stringify(defaultOrder))

  // Recarregar a página para aplicar as mudanças
  window.location.reload()

  return "Ordem das tabelas resetada com sucesso!"
}

// Para usar esta função, abra o console do navegador e digite:
// import { resetTableOrder } from './utils/resetTableOrder'
// resetTableOrder()

