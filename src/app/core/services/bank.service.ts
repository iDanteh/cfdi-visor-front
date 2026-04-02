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
  banco:          string;
  movimientos:    number;
  totalDepositos: number;
  totalRetiros:   number;
  saldoFinal:     number | null;
  ultimaFecha:    string | null;
  ultimaImport:   string | null;
  cuentaContable: string | null;
  numeroCuenta:   string | null;
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

  addErpId(id: string, erpId: string): Observable<{ _id: string; erpIds: string[] }> {
    return this.api.patch(`/banks/movements/${id}/erp-ids`, { action: 'add', erpId });
  }

  removeErpId(id: string, erpId: string): Observable<{ _id: string; erpIds: string[] }> {
    return this.api.patch(`/banks/movements/${id}/erp-ids`, { action: 'remove', erpId });
  }

  getBankConfig(banco: string): Observable<BankConfig> {
    return this.api.get(`/banks/config/${banco}`);
  }

  saveBankConfig(banco: string, data: Partial<Pick<BankConfig, 'cuentaContable' | 'numeroCuenta'>>): Observable<BankConfig> {
    return this.api.patch(`/banks/config/${banco}`, data);
  }
}
