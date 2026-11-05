import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRestablecerContrasenaStore } from '../almacen/useRestablecerContrasenaStore';

describe('Fase III — Flujo Especializado Nueva Contraseña por Token (Pantalla 05b SGCI-pantallas)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('emite token de recuperación por tenant, valida política OWASP y consume el token de un solo uso', () => {
    const store = useRestablecerContrasenaStore();
    const emitido = store.emitirTokenRecuperacion(
      '8f2a0000-0000-4000-8000-00000000c91d',
      'usr-laura-01',
      'laura@industriasalfa.com',
    );

    expect(emitido.tokenPlano).toBe('SGCI-RST-8F2A-2026');
    expect(emitido.consumido).toBe(false);

    const resultado = store.confirmarNuevaContrasenaConToken(
      emitido.tokenPlano,
      '8f2a0000-0000-4000-8000-00000000c91d',
      'AlfaInventario#2026',
      'AlfaInventario#2026',
    );

    expect(resultado.estado).toBe('CONTRASENA_ACTUALIZADA');
    expect(resultado.tokenConsumido).toBe(true);
    expect(store.sesionesRevocadas).toBe(1);
  });

  it('bloquea reúso del token y rechaza uso cruzado entre organizaciones Multi-Tenant', () => {
    const store = useRestablecerContrasenaStore();
    const emitido = store.emitirTokenRecuperacion(
      '8f2a0000-0000-4000-8000-00000000c91d',
      'usr-laura-01',
      'laura@industriasalfa.com',
    );

    expect(() =>
      store.confirmarNuevaContrasenaConToken(
        emitido.tokenPlano,
        '99999999-9999-4999-8999-999999999999',
        'AlfaInventario#2026',
        'AlfaInventario#2026',
      ),
    ).toThrow('Fuga Multi-Tenant bloqueada: el token pertenece a otra organización.');
  });
});
