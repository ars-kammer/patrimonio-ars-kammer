export type Papel = "admin" | "eng" | "adm" | "enc";
export type Setor = "ENG" | "ADM";
export type Estado = "Ótimo" | "Bom" | "Regular" | "Ruim" | "Inativo";

export interface Usuario {
  user_id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  criado_em: string;
}

export interface Local {
  id: string;
  nome: string;
  responsavel_id: string | null;
  freq_dias: number;
  prazo_dias: number;
  ultimo_ciclo_em: string | null;
  criado_em: string;
}

export interface Item {
  id: string;
  codigo: number;
  setor: Setor;
  nome: string;
  marca: string | null;
  modelo: string | null;
  responsavel: string | null;
  local_id: string;
  data_aquisicao: string | null;
  valor: number | null;
  fornecedor: string | null;
  nota_fiscal: string | null;
  serie: string | null;
  estado: Estado;
  especificacoes: string | null;
  garantia_inicio: string | null;
  garantia_fim: string | null;
  observacoes: string | null;
  foto_path: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface Ciclo {
  id: string;
  local_id: string;
  freq_dias: number;
  prazo: string;
  status: "active" | "completed" | "expired";
  criado_em: string;
}

export interface Pendencia {
  id: string;
  tipo: "recv" | "inv";
  item_id: string;
  local_id: string | null;
  responsavel_id: string | null;
  ciclo_id: string | null;
  status: "pending" | "confirmed" | "cancelled";
  confirmado_por_nome: string | null;
  confirmado_em: string | null;
  criado_em: string;
}

export interface Movimentacao {
  id: string;
  item_id: string;
  origem_nome: string | null;
  destino_nome: string;
  observacao: string | null;
  responsavel_notificado: string | null;
  feito_por_nome: string | null;
  criado_em: string;
}

export interface Evento {
  id: number;
  tipo: "cadastro" | "exclusao" | "movimentacao" | "recebimento" | "inventario";
  texto: string;
  item_id: string | null;
  local_id: string | null;
  setor: string | null;
  usuario_nome: string | null;
  criado_em: string;
}
