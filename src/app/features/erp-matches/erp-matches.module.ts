import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ErpMatchesComponent } from './erp-matches.component';

@NgModule({
  declarations: [ErpMatchesComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild([{ path: '', component: ErpMatchesComponent }]),
  ],
})
export class ErpMatchesModule {}
