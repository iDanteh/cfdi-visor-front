import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { merge, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import {
  BankService, BankMovement, BankCard, BankFilter, BankStatus,
} from '../../core/services/bank.service';

type ViewMode  = 'cards' | 'detail';
type SortDir   = 'asc' | 'desc';
type SortField = 'fecha' | 'banco' | 'deposito' | 'retiro';

@Component({
  standalone: false,
  selector: 'app-banks',
  templateUrl: './banks.component.html',
})
export class BanksComponent implements OnInit, OnDestroy {

  // ── Vista ───────────────────────────────────────────────────────────────────
  view: ViewMode = 'cards';
  activeBanco: string | null = null;

  // ── Tarjetas ────────────────────────────────────────────────────────────────
  bankCards:    BankCard[] = [];
  cardsLoading  = false;

  // ── Movimientos (vista detalle) ─────────────────────────────────────────────
  movements: BankMovement[] = [];
  pagination = { total: 0, page: 1, limit: 50, pages: 0 };
  loading    = false;

  // ── Filtros activos (detalle) ───────────────────────────────────────────────
  activeStatus:    string = '';
  activeCategoria: string = '';
  filterForm: FormGroup;
  sortField: SortField = 'fecha';
  sortDir:   SortDir   = 'desc';

  // ── Modal de importación ────────────────────────────────────────────────────
  showImportModal = false;
  importBanco     = '';
  selectedFile: File | null = null;
  uploading       = false;
  isDragging      = false;
  uploadResult:   { importados: number; duplicados: number; resumen: Record<string, number> } | null = null;
  uploadError:    string | null = null;

  // ── Modal de cuenta contable ────────────────────────────────────────────────
  showCuentaModal  = false;
  cuentaModalCard: BankCard | null = null;
  cuentaInput      = '';
  numeroCuentaInput = '';
  savingCuenta     = false;

  // ── Modal UUID CFDI ─────────────────────────────────────────────────────────
  showUuidModal     = false;
  uuidModalMovement: BankMovement | null = null;
  uuidInput         = '';
  savingUuid        = false;
  uuidError: string | null = null;

  // ── Modal IDs ERP ────────────────────────────────────────────────────────────
  showErpModal     = false;
  erpModalMovement: BankMovement | null = null;
  erpInput         = '';
  savingErp        = false;

  // ── Catálogos ───────────────────────────────────────────────────────────────
  readonly bancos = ['BBVA', 'Banamex', 'Santander', 'Azteca'];

  readonly categorias = [
    'Transferencia', 'Nómina', 'Depósito efectivo', 'Cheque',
    'Retiro ATM', 'Cargo bancario', 'Pago de servicio', 'Cobro tarjeta', 'Traspaso',
  ];

  readonly bancoAccent: Record<string, string> = {
    BBVA:      '#004B93',
    Banamex:   '#B22222',
    Santander: '#EC0000',
    Azteca:    '#E65A00',
  };

  readonly bancoLight: Record<string, string> = {
    BBVA:      '#EBF2FA',
    Banamex:   '#FDF0F0',
    Santander: '#FFF0F0',
    Azteca:    '#FFF3EB',
  };

  readonly categoriaColors: Record<string, { bg: string; color: string }> = {
    'Transferencia':     { bg: '#ede9fe', color: '#6d28d9' },
    'Nómina':            { bg: '#dbeafe', color: '#1d4ed8' },
    'Depósito efectivo': { bg: '#dcfce7', color: '#15803d' },
    'Cheque':            { bg: '#fef9c3', color: '#92400e' },
    'Retiro ATM':        { bg: '#fee2e2', color: '#b91c1c' },
    'Cargo bancario':    { bg: '#f1f5f9', color: '#475569' },
    'Pago de servicio':  { bg: '#f0fdfa', color: '#0f766e' },
    'Cobro tarjeta':     { bg: '#fff7ed', color: '#c2410c' },
    'Traspaso':          { bg: '#faf5ff', color: '#7e22ce' },
  };

  private destroy$     = new Subject<void>();
  private loadTrigger$ = new Subject<BankFilter>();

  constructor(private bankService: BankService, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      search:      [''],
      tipo:        [''],
      fechaInicio: [''],
      fechaFin:    [''],
    });
  }

  // ── Getters ─────────────────────────────────────────────────────────────────

  get activeCard(): BankCard | null {
    if (!this.activeBanco) return null;
    return this.bankCards.find(c => c.banco === this.activeBanco) ?? null;
  }

  // ── Ciclo de vida ───────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadTrigger$.pipe(
      switchMap(filters => this.bankService.list(filters)),
      takeUntil(this.destroy$),
    ).subscribe({
      next: (res) => {
        this.movements  = res.data;
        this.pagination = res.pagination;
        this.loading    = false;
      },
      error: () => { this.loading = false; },
    });

    this.loadCards();

    this.filterForm.get('search')!.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadMovements(1));

    merge(
      this.filterForm.get('tipo')!.valueChanges,
      this.filterForm.get('fechaInicio')!.valueChanges,
      this.filterForm.get('fechaFin')!.valueChanges,
    ).pipe(
      debounceTime(0),
      takeUntil(this.destroy$),
    ).subscribe(() => this.loadMovements(1));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Navegación ──────────────────────────────────────────────────────────────

  openBank(banco: string): void {
    this.activeBanco     = banco;
    this.view            = 'detail';
    this.activeStatus    = '';
    this.activeCategoria = '';
    this.filterForm.reset({ search: '', tipo: '', fechaInicio: '', fechaFin: '' });
    this.loadMovements(1);
  }

  goBack(): void {
    this.view        = 'cards';
    this.activeBanco = null;
    this.movements   = [];
  }

  // ── Carga de datos ──────────────────────────────────────────────────────────

  loadCards(): void {
    this.cardsLoading = true;
    this.bankService.cards().pipe(takeUntil(this.destroy$)).subscribe({
      next: (cards) => { this.bankCards = cards; this.cardsLoading = false; },
      error: ()      => { this.cardsLoading = false; },
    });
  }

  loadMovements(page = 1): void {
    this.loading = true;
    const { search, tipo, fechaInicio, fechaFin } = this.filterForm.value;

    const filters: BankFilter = {
      page,
      limit:       this.pagination.limit,
      banco:       this.activeBanco    || undefined,
      search:      search              || undefined,
      tipo:        tipo                || undefined,
      fechaInicio: fechaInicio         || undefined,
      fechaFin:    fechaFin            || undefined,
      status:      this.activeStatus   || undefined,
      categoria:   this.activeCategoria || undefined,
      sortBy:      this.sortField,
      sortDir:     this.sortDir,
    };

    this.loadTrigger$.next(filters);
  }

  // ── Filtros ─────────────────────────────────────────────────────────────────

  hasActiveFilters(): boolean {
    const v = this.filterForm.value;
    return !!(v.search || v.tipo || v.fechaInicio || v.fechaFin
              || this.activeStatus || this.activeCategoria);
  }

  clearFilters(): void {
    this.activeStatus    = '';
    this.activeCategoria = '';
    this.filterForm.reset({ search: '', tipo: '', fechaInicio: '', fechaFin: '' });
  }

  // ── Ordenamiento ────────────────────────────────────────────────────────────

  sort(field: SortField): void {
    this.sortDir   = this.sortField === field && this.sortDir === 'asc' ? 'desc' : 'asc';
    this.sortField = field;
    this.loadMovements(1);
  }

  sortIcon(field: SortField): string {
    if (this.sortField !== field) return '↕';
    return this.sortDir === 'asc' ? '↑' : '↓';
  }

  isActiveSort(f: SortField): boolean { return this.sortField === f; }

  // ── Recencia ────────────────────────────────────────────────────────────────

  formatRecency(dateStr: string | null): string {
    if (!dateStr) return 'Sin datos';
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) {
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      return `Hoy, ${hh}:${mm}`;
    }
    if (diff === 1) return 'Ayer';
    if (diff < 7)  return `Hace ${diff} días`;
    if (diff < 30) return `Hace ${Math.floor(diff / 7)} sem.`;
    return `Hace ${Math.floor(diff / 30)} mes${Math.floor(diff / 30) > 1 ? 'es' : ''}`;
  }

  recencyClass(dateStr: string | null): string {
    if (!dateStr) return 'dot-gray';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (diff === 0) return 'dot-green';
    if (diff < 7)  return 'dot-amber';
    return 'dot-gray';
  }

  // ── Modal de importación ────────────────────────────────────────────────────

  openImportModal(): void {
    this.importBanco  = this.activeBanco || '';
    this.selectedFile = null;
    this.uploadResult = null;
    this.uploadError  = null;
    this.showImportModal = true;
  }

  closeImportModal(): void {
    this.showImportModal = false;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files[0];
    if (file && /\.(xlsx|xls)$/i.test(file.name)) this.setFile(file);
  }

  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragging = true; }
  onDragLeave(): void { this.isDragging = false; }

  private setFile(file: File | null): void {
    this.selectedFile = file;
    this.uploadResult = null;
    this.uploadError  = null;
  }

  uploadExcel(): void {
    if (!this.selectedFile || this.uploading) return;
    this.uploading   = true;
    this.uploadError = null;

    this.bankService.upload(this.selectedFile, this.importBanco || undefined).subscribe({
      next: (res) => {
        this.uploadResult = res as any;
        this.uploading    = false;
        this.selectedFile = null;
        this.loadCards();
        if (this.view === 'detail') this.loadMovements(1);
      },
      error: (err) => {
        this.uploadError = err?.error?.error || 'Error al procesar el archivo';
        this.uploading   = false;
      },
    });
  }

  // ── Modal de cuenta contable ────────────────────────────────────────────────

  openCuentaModal(card: BankCard, event: Event): void {
    event.stopPropagation();
    this.cuentaModalCard    = card;
    this.cuentaInput        = card.cuentaContable || '';
    this.numeroCuentaInput  = card.numeroCuenta   || '';
    this.savingCuenta       = false;
    this.showCuentaModal    = true;
  }

  closeCuentaModal(): void {
    this.showCuentaModal = false;
    this.cuentaModalCard = null;
  }

  saveCuenta(): void {
    if (!this.cuentaModalCard || this.savingCuenta) return;
    this.savingCuenta = true;
    this.bankService.saveBankConfig(this.cuentaModalCard.banco, {
      cuentaContable: this.cuentaInput        || null as any,
      numeroCuenta:   this.numeroCuentaInput  || null as any,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (cfg) => {
        const card = this.bankCards.find(c => c.banco === this.cuentaModalCard!.banco);
        if (card) {
          card.cuentaContable = cfg.cuentaContable;
          card.numeroCuenta   = cfg.numeroCuenta;
        }
        this.savingCuenta = false;
        this.closeCuentaModal();
      },
      error: () => { this.savingCuenta = false; },
    });
  }

  // ── Modal UUID CFDI ─────────────────────────────────────────────────────────

  openUuidModal(mov: BankMovement, event: Event): void {
    event.stopPropagation();
    this.uuidModalMovement = mov;
    this.uuidInput         = '';
    this.uuidError         = null;
    this.savingUuid        = false;
    this.showUuidModal     = true;
  }

  closeUuidModal(): void {
    this.showUuidModal     = false;
    this.uuidModalMovement = null;
  }

  confirmUuid(): void {
    if (!this.uuidModalMovement || !this.uuidInput.trim() || this.savingUuid) return;
    this.savingUuid = true;
    this.uuidError  = null;
    this.bankService.setUuidXML(this.uuidModalMovement._id, this.uuidInput.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.uuidModalMovement!.uuidXML = res.uuidXML;
          this.uuidModalMovement!.status  = res.status;
          this.savingUuid = false;
          this.closeUuidModal();
        },
        error: (err) => {
          this.uuidError  = err?.error?.error || 'Error al vincular UUID';
          this.savingUuid = false;
        },
      });
  }

  // ── IDs ERP ─────────────────────────────────────────────────────────────────

  openErpModal(mov: BankMovement, event: Event): void {
    event.stopPropagation();
    this.erpModalMovement = mov;
    this.erpInput         = '';
    this.savingErp        = false;
    this.showErpModal     = true;
  }

  closeErpModal(): void {
    this.showErpModal     = false;
    this.erpModalMovement = null;
  }

  addErpId(): void {
    if (!this.erpModalMovement || !this.erpInput.trim() || this.savingErp) return;
    this.savingErp = true;
    this.bankService.addErpId(this.erpModalMovement._id, this.erpInput.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.erpModalMovement!.erpIds = res.erpIds;
          this.erpInput  = '';
          this.savingErp = false;
        },
        error: () => { this.savingErp = false; },
      });
  }

  removeErpId(mov: BankMovement, erpId: string, event: Event): void {
    event.stopPropagation();
    this.bankService.removeErpId(mov._id, erpId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { mov.erpIds = res.erpIds; },
      });
  }

  // ── Status inline ───────────────────────────────────────────────────────────

  cycleStatus(mov: BankMovement): void {
    if (mov.uuidXML) return;
    const order: BankStatus[] = ['no_identificado', 'identificado', 'otros'];
    const next = order[(order.indexOf(mov.status) + 1) % order.length];
    this.bankService.updateStatus(mov._id, next).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { mov.status = res.status; },
    });
  }

  statusLabel(s: BankStatus | string): string {
    const m: Record<string, string> = {
      no_identificado: 'No identificado',
      identificado:    'Identificado',
      otros:           'Otros',
    };
    return m[s] ?? 'No identificado';
  }

  statusClass(s: BankStatus | string): string {
    const m: Record<string, string> = {
      no_identificado: 'st-pending',
      identificado:    'st-done',
      otros:           'st-other',
    };
    return m[s] ?? 'st-pending';
  }

  catColor(cat: string | null): { bg: string; color: string } {
    if (!cat) return { bg: '#f1f5f9', color: '#94a3b8' };
    return this.categoriaColors[cat] ?? { bg: '#f1f5f9', color: '#475569' };
  }

  // ── Paginación ──────────────────────────────────────────────────────────────

  changePage(page: number): void { this.loadMovements(page); }

  pageNumbers(): number[] {
    const total = this.pagination.pages;
    const cur   = this.pagination.page;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total]);
    for (let i = Math.max(2, cur - 2); i <= Math.min(total - 1, cur + 2); i++) pages.add(i);
    const sorted = [...pages].sort((a, b) => a - b);
    const result: number[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push(-1);
      result.push(sorted[i]);
    }
    return result;
  }

  min(a: number, b: number): number { return Math.min(a, b); }
}
