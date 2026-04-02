import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CfdiService, CFDIFilter } from '../../core/services/cfdi.service';
import { CFDI, PaginatedResponse } from '../../core/models/cfdi.model';

@Component({
  standalone: false,
  selector: 'app-cfdi-list',
  templateUrl: './cfdi-list.component.html',
})
export class CfdiListComponent implements OnInit {
  cfdis: CFDI[] = [];
  pagination = { total: 0, page: 1, limit: 20, pages: 0 };
  loading = false;
  uploadLoading = false;
  filterForm: FormGroup;
  selectedFiles: File[] = [];
  uploadSource: 'ERP' | 'SAT' = 'ERP';
  uploadResults: { success: any[]; failed: any[] } | null = null;

  readonly satStatusColors: Record<string, string> = {
    'Vigente':            'badge-success',
    'Cancelado':          'badge-danger',
    'No Encontrado':      'badge-warning',
    'Pendiente':          'badge-info',
    'Error':              'badge-secondary',
    'Expresión Inválida': 'badge-secondary',
  };

  readonly compStatusColors: Record<string, string> = {
    match:       'badge-success',
    discrepancy: 'badge-danger',
    not_in_sat:  'badge-warning',
    cancelled:   'badge-danger',
    error:       'badge-secondary',
  };

  readonly compStatusLabel: Record<string, string> = {
    match:       '✓ Coincide',
    discrepancy: '✗ Con diferencias',
    not_in_sat:  '? No en SAT',
    cancelled:   '✗ Cancelado en SAT',
    error:       '! No verificable',
  };

  constructor(
    private cfdiService: CfdiService,
    private fb: FormBuilder,
  ) {
    this.filterForm = this.fb.group({
      source:            [''],
      tipoDeComprobante: [''],
      rfcEmisor:         [''],
      rfcReceptor:       [''],
      satStatus:         [''],
      fechaInicio:       [''],
      fechaFin:          [''],
      search:            [''],
    });
  }

  ngOnInit(): void {
    this.loadCFDIs();
    this.filterForm.valueChanges.subscribe(() => this.loadCFDIs(1));
  }

  loadCFDIs(page = 1): void {
    this.loading = true;
    const filters: CFDIFilter = { ...this.filterForm.value, page, limit: this.pagination.limit };

    this.cfdiService.list(filters).subscribe({
      next: (res: PaginatedResponse<CFDI>) => {
        this.cfdis = res.data;
        this.pagination = res.pagination;
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) this.selectedFiles = Array.from(input.files);
  }

  uploadXMLs(): void {
    if (!this.selectedFiles.length) return;
    this.uploadLoading = true;
    this.cfdiService.uploadXMLs(this.selectedFiles, this.uploadSource).subscribe({
      next: (res) => {
        this.uploadResults = res;
        this.uploadLoading = false;
        this.selectedFiles = [];
        this.loadCFDIs();
      },
      error: () => { this.uploadLoading = false; },
    });
  }

  resetFilters(): void {
    this.filterForm.reset({ source: '' });
  }

  changePage(page: number): void {
    this.loadCFDIs(page);
  }

  downloadXML(cfdi: CFDI): void {
    this.cfdiService.downloadXML(cfdi._id);
  }
}
