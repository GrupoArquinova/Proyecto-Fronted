import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClickWhatsappDirective } from './click-whatsapp.directive';
import { AnaliticaService } from '../../core/services/analitica.service';

@Component({
  standalone: true,
  imports: [ClickWhatsappDirective],
  template: `
    <a id="sin" appClickWhatsapp href="#sin">sin</a>
    <a id="con" appClickWhatsapp [proyectoId]="8" href="#con">con</a>
  `
})
class Anfitrion {}

describe('ClickWhatsappDirective', () => {
  afterEach(() => vi.restoreAllMocks());

  it('cada clic cuenta un CLICK_WHATSAPP, con el proyecto si se indicó', () => {
    const click = vi.spyOn(AnaliticaService.prototype, 'clickWhatsapp').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(Anfitrion);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    el.querySelector<HTMLElement>('#sin')!.click();
    el.querySelector<HTMLElement>('#con')!.click();
    el.querySelector<HTMLElement>('#con')!.click();

    expect(click.mock.calls).toEqual([[undefined], [8], [8]]);
  });
});
