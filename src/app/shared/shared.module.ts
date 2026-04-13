import { NgModule }            from '@angular/core';
import { CommonModule }        from '@angular/common';
import { ModalComponent }      from './components/modal/modal.component';
import { HasRoleDirective }    from '../core/directives/has-role.directive';

@NgModule({
  declarations: [ModalComponent, HasRoleDirective],
  imports:      [CommonModule],
  exports:      [ModalComponent, HasRoleDirective],
})
export class SharedModule {}
