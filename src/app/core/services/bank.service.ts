import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type BankStatus = 'no_identificado' | 'identificado' | 'otros';

export interface BankMovement {
  _id:                string;
  banco:              'Banamex' | 'BBVA' | 'Santander' | 'Azteca';
  fecha:              string;
  concepto:           string;
  deposito:           number | null;
  retiro:             number | null;
  saldo:              number | null;
  numeroAutorizacion: string | null;
  referenciaNumerica: string | null;
  status:             BankStatus;
  categoria:          string | null;
  folio:              string | null;
  uuidXML:            string | null;
  erpIds:             string[];
  createdAt:          string;
}

export interface BankCard {
  banco:           string;
  movimientos:     number;
  totalDepositos:  number;
  totalRetiros:    number;
  saldoFinal:      number | null;
  saldoPendiente:    number;
  saldoIdentificado: number;
  saldoOtros:        number;
  ultimaFecha:     string | null;
  ultimaImport:    string | null;
  cuentaContable:  string | null;
  numeroCuenta:    string | null;
  porStatus: {
    no_identificado: number;
    identificado:    number;
    otros:           number;
  };
}

export interface BankConfig {
  banco:          string;
  cuentaContable: string | null;
  numeroCuenta:   string | null;
}

export interface BankSummaryItem {
  _id:            string;
  totalDepositos: number;
  totalRetiros:   number;
  movimientos:    number;
  saldoFinal:     number | null;
}

export interface BankFilter {
  page?:        number;
  limit?:       number;
  banco?:       string;
  fechaInicio?: string;
  fechaFin?:    string;
  tipo?:        string;
  search?:      string;
  sortBy?:      string;
  sortDir?:     string;
  status?:      string;
  categoria?:   string;
}

export interface ErpCxC {
  id:               string;
  serie:            string;
  folio:            string;
  tipoPago:         string | null;
  subtotal:         number;
  impuesto:         number;
  total:            number;
  saldoActual:      number;
  fechaVencimiento: string | null;
}

export interface CxcSnapshot {
  _id:              string;
  erpId:            string;
  serie:            string;
  folio:            string;
  tipoPago:         string | null;
  subtotal:         number;
  impuesto:         number;
  total:            number;
  saldoActual:      number;
  fechaVencimiento: string | null;
  is_vinculated:    boolean;
  snapshotAt:       string;
}

export type MatchType =
  | 'exacto'
  | 'cercano'
  | 'folio_en_concepto'
  | 'referencia_numerica'
  | 'numero_autorizacion';

export interface CxcMatchMovement {
  _id:               string;
  banco:             string;
  fecha:             string;
  concepto:          string;
  deposito:          number;
  capacidadRestante: number;
  comprometido:      number;
  status:            string;
  folio:             string | null;
  uuidXML:           string | null;
  erpIds:            string[];
  referenciaNumerica: string | null;
  categoria:         string | null;
  matchType:         MatchType;
  score:             number;
  diferencia:        number;
  daysFromVenc:      number | null;
  esConflicto:       boolean;
}

export interface CxcMatchResult {
  cxc:     CxcSnapshot;
  matches: CxcMatchMovement[];
}

// ── Matching combinacional (1 depósito ↔ N CxC) ───────────────────────────────

export interface CxcCombRef {
  _id:              string;
  erpId:            string;
  serie:            string;
  folio:            string;
  saldoActual:      number;
  fechaVencimiento: string | null;
}

export interface CombinacionalOpcion {
  cxcs:       CxcCombRef[];
  sumaSaldos: number;
  diferencia: number;
  score:      number;
}

export interface CombinacionalDeposito {
  _id:               string;
  banco:             string;
  fecha:             string;
  concepto:          string;
  deposito:          number;
  capacidadRestante: number;
  comprometido:      number;
  referenciaNumerica: string | null;
  categoria:         string | null;
  folio:             string | null;
}

export interface CombinacionalResult {
  deposito: CombinacionalDeposito;
  opciones: CombinacionalOpcion[];
}

export interface CxcMatchesResponse {
  individual:      CxcMatchResult[];
  combinacionales: CombinacionalResult[];
}

export interface AuxClienteSummary {
  _id:            string;   // auxNombre
  movimientos:    number;
  totalDepositos: number;
  totalRetiros:   number;
  bancos:         string[];
  ultimaFecha:    string | null;
}

export interface AuxApplyResult {
  limpiados:    number;
  actualizados: number;
  noEncontrados: number;
  total:        number;
}

export interface UploadResult {
  message:      string;
  importados:   number;
  duplicados:   number;
  resumen:      Record<string, number>;
  erroresHojas: { hoja: string; error: string }[];
}

@Injectable({ providedIn: 'root' })
export class BankService {
  constructor(private api: ApiService) {}

  cards(): Observable<BankCard[]> {
    return this.api.get('/banks/cards');
  }

  upload(file: File, banco?: string): Observable<UploadResult> {
    const extra = banco ? { banco } : undefined;
    return this.api.uploadFiles<UploadResult>('/banks/upload', [file], 'excelFile', extra);
  }

  list(filters: BankFilter): Observable<{ data: BankMovement[]; pagination: any }> {
    return this.api.get('/banks/movements', filters as Record<string, unknown>);
  }

  summary(fechaInicio?: string, fechaFin?: string): Observable<BankSummaryItem[]> {
    const params: Record<string, unknown> = {};
    if (fechaInicio) params['fechaInicio'] = fechaInicio;
    if (fechaFin)    params['fechaFin']    = fechaFin;
    return this.api.get('/banks/summary', params);
  }

  updateStatus(id: string, status: BankStatus): Observable<{ _id: string; status: BankStatus }> {
    return this.api.patch(`/banks/movements/${id}/status`, { status });
  }

  setUuidXML(id: string, uuidXML: string): Observable<{ _id: string; uuidXML: string; status: BankStatus }> {
    return this.api.patch(`/banks/movements/${id}/uuid`, { uuidXML });
  }

  unlinkUuid(id: string): Observable<{ _id: string; uuidXML: null; status: BankStatus }> {
    return this.api.delete(`/banks/movements/${id}/uuid`);
  }

  addErpId(id: string, erpId: string): Observable<{ _id: string; erpIds: string[] }> {
    return this.api.patch(`/banks/movements/${id}/erp-ids`, { action: 'add', erpId });
  }

  removeErpId(id: string, erpId: string): Observable<{ _id: string; erpIds: string[] }> {
    return this.api.patch(`/banks/movements/${id}/erp-ids`, { action: 'remove', erpId });
  }

  setErpIds(id: string, erpIds: string[]): Observable<{ _id: string; erpIds: string[] }> {
    return this.api.put(`/banks/movements/${id}/erp-ids`, { erpIds });
  }

  getBankConfig(banco: string): Observable<BankConfig> {
    return this.api.get(`/banks/config/${banco}`);
  }

  saveBankConfig(banco: string, data: Partial<Pick<BankConfig, 'cuentaContable' | 'numeroCuenta'>>): Observable<BankConfig> {
    return this.api.patch(`/banks/config/${banco}`, data);
  }

  importAuxiliar(file: File): Observable<{ importados: number; actualizados: number; omitidos: number; errores: string[]; total: number }> {
    return this.api.uploadFiles('/banks/auxiliar/import', [file], 'excelFile');
  }

  aplicarAuxiliar(): Observable<AuxApplyResult> {
    return this.api.post('/banks/auxiliar/aplicar', {});
  }

  listAuxClientes(params?: Record<string, unknown>): Observable<AuxClienteSummary[]> {
    return this.api.get('/banks/auxiliar/clientes', params);
  }

  listAuxMovimientos(params?: Record<string, unknown>): Observable<{ data: BankMovement[]; pagination: any }> {
    return this.api.get('/banks/auxiliar/movimientos', params);
  }

  listErpCuentas(fechaDesde: string, fechaHasta: string): Observable<ErpCxC[]> {
    return this.api.get('/erp/cuentas-pendientes', { fechaDesde, fechaHasta });
  }

  getCxcMatches(): Observable<CxcMatchesResponse> {
    return this.api.get('/erp/cxc-matches');
  }
}
