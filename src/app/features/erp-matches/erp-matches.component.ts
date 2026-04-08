import { Component, OnInit } from '@angular/core';
import {
  BankService,
  CxcMatchResult, CxcMatchMovement,
  CombinacionalResult, CombinacionalOpcion,
} from '../../core/services/bank.service';

@Component({
  standalone: false,
  selector: 'app-erp-matches',
  templateUrl: './erp-matches.component.html',
})
export class ErpMatchesComponent implements OnInit {

  individual:      CxcMatchResult[]      = [];
  combinacionales: CombinacionalResult[] = [];

  loading = false;
  error:   string | null = null;

  expandedId:      string | null = null;
  expandedDepId:   string | null = null;  // Para la sección combinacional

  // Filtros — sección individual
  filterVinculado: 'all' | 'vinculado' | 'no_vinculado'     = 'all';
  filterConMatch:  'all' | 'con_match' | 'sin_match'         = 'all';
  filterConflicto: 'all' | 'con_conflicto' | 'sin_conflicto' = 'all';
  filterMinScore:  number = 100;   // slider 0–100

  constructor(private bankService: BankService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error   = null;
    this.bankService.getCxcMatches().subscribe({
      next: (data) => {
        this.individual      = data.individual;
        this.combinacionales = data.combinacionales;
        this.loading         = false;
      },
      error: (err) => {
        this.error   = err?.error?.error || 'Error al cargar los matches';
        this.loading = false;
      },
    });
  }

  // ── Alias para compatibilidad con la plantilla existente ──────────────────
  get results(): CxcMatchResult[] { return this.individual; }

  // ── Filtros — individual ──────────────────────────────────────────────────

  get filtered(): CxcMatchResult[] {
    const minScore = this.filterMinScore / 100;

    return this.individual.filter((r) => {
      if (this.filterVinculado === 'vinculado'    && !r.cxc.is_vinculated) return false;
      if (this.filterVinculado === 'no_vinculado' &&  r.cxc.is_vinculated) return false;

      const visibleMatches = r.matches.filter(m => m.score >= minScore);
      if (this.filterConMatch === 'con_match' && visibleMatches.length === 0) return false;
      if (this.filterConMatch === 'sin_match' && visibleMatches.length > 0)   return false;

      const hasConflicto = r.matches.some(m => m.esConflicto);
      if (this.filterConflicto === 'con_conflicto' && !hasConflicto) return false;
      if (this.filterConflicto === 'sin_conflicto' &&  hasConflicto) return false;

      return true;
    });
  }

  visibleMatches(matches: CxcMatchMovement[]): CxcMatchMovement[] {
    const minScore = this.filterMinScore / 100;
    return matches.filter(m => m.score >= minScore);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  get stats() {
    const minScore = this.filterMinScore / 100;
    const total    = this.individual.length;

    const conMatch = this.individual.filter(r =>
      r.matches.some(m => m.score >= minScore)
    ).length;

    const sinMatch     = total - conMatch;
    const vinculados   = this.individual.filter(r => r.cxc.is_vinculated).length;
    const conConflicto = this.individual.filter(r => r.matches.some(m => m.esConflicto)).length;
    const altaConf     = this.individual.filter(r =>
      r.matches.some(m => m.score >= 0.90 && !m.esConflicto)
    ).length;
    const combCount    = this.combinacionales.length;

    return { total, conMatch, sinMatch, vinculados, conConflicto, altaConf, combCount };
  }

  // ── Helpers — individual ──────────────────────────────────────────────────

  toggle(id: string): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  isExpanded(id: string): boolean {
    return this.expandedId === id;
  }

  bestMatch(matches: CxcMatchMovement[]): CxcMatchMovement | null {
    const visible = this.visibleMatches(matches);
    return visible.length ? visible[0] : null;
  }

  rowHasConflict(matches: CxcMatchMovement[]): boolean {
    return matches.some(m => m.esConflicto);
  }

  matchTypeLabel(t: string): string {
    const m: Record<string, string> = {
      exacto:               'Exacto',
      cercano:              'Cercano',
      folio_en_concepto:    'Folio en concepto',
      referencia_numerica:  'Ref. numérica',
      numero_autorizacion:  'N° autorización',
    };
    return m[t] ?? t;
  }

  matchTypeClass(t: string): string {
    const m: Record<string, string> = {
      exacto:               'badge-exact',
      cercano:              'badge-close',
      folio_en_concepto:    'badge-folio',
      referencia_numerica:  'badge-ref',
      numero_autorizacion:  'badge-auth',
    };
    return m[t] ?? '';
  }

  scoreBar(score: number): number {
    return Math.round(score * 100);
  }

  daysLabel(days: number | null): string {
    if (days === null) return '—';
    if (days >= 0) return `+${days}d`;
    return `${days}d`;
  }

  daysClass(days: number | null): string {
    if (days === null) return '';
    if (days >= 0 && days <= 45) return 'days-ideal';
    if (days < 0)                return 'days-before';
    return 'days-late';
  }

  // ── Helpers — combinacional ───────────────────────────────────────────────

  toggleDep(id: string): void {
    this.expandedDepId = this.expandedDepId === id ? null : id;
  }

  isDepExpanded(id: string): boolean {
    return this.expandedDepId === id;
  }

  bestOpcion(opciones: CombinacionalOpcion[]): CombinacionalOpcion | null {
    return opciones.length ? opciones[0] : null;
  }

  combScoreClass(score: number): string {
    if (score >= 0.90) return 'score-bar-high';
    if (score >= 0.70) return 'score-bar-mid';
    return 'score-bar-low';
  }
}
