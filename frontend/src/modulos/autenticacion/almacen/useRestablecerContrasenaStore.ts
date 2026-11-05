import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export interface SolicitudTokenRecuperacion {
  tokenPlano: string;
  tenantId: string;
  usuarioId: string;
  correo: string;
  expiraEnIso: string;
  consumido: boolean;
}

/**
 * Store de Pinia para el flujo especializado de Recuperación y Nueva Contraseña por Token
 * (Cierre de Brecha Pantalla 05b — LEEME.txt de SGCI-pantallas).
 */
export const useRestablecerContrasenaStore = defineStore('restablecerContrasenaToken', () => {
  const tokenActivo = ref<SolicitudTokenRecuperacion | null>(null);
  const nuevaContrasena = ref('');
  const confirmacionContrasena = ref('');
  const sesionesRevocadas = ref(0);
  const ultimoHashGenerado = ref<string | null>(null);

  const cumplePoliticaSeguridad = computed(() => {
    const pass = nuevaContrasena.value;
    return (
      pass.length >= 10 &&
      /[A-Z]/.test(pass) &&
      /[0-9]/.test(pass) &&
      /[^A-Za-z0-9]/.test(pass) &&
      pass === confirmacionContrasena.value
    );
  });

  function emitirTokenRecuperacion(tenantId: string, usuarioId: string, correo: string): SolicitudTokenRecuperacion {
    const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const registro: SolicitudTokenRecuperacion = {
      tokenPlano: `SGCI-RST-${tenantId.slice(0, 4).toUpperCase()}-2026`,
      tenantId,
      usuarioId,
      correo,
      expiraEnIso: expira,
      consumido: false,
    };
    tokenActivo.value = registro;
    return registro;
  }

  function confirmarNuevaContrasenaConToken(
    tokenRecibido: string,
    tenantIdContexto: string,
    passNueva: string,
    passConfirmacion: string,
  ): { estado: string; sesionesRevocadas: number; tokenConsumido: boolean } {
    if (!tokenActivo.value) {
      throw new Error('No existe solicitud activa de recuperación por token.');
    }

    if (tokenActivo.value.tenantId !== tenantIdContexto) {
      throw new Error('Fuga Multi-Tenant bloqueada: el token pertenece a otra organización.');
    }

    if (tokenActivo.value.consumido) {
      throw new Error('El token de recuperación ya fue utilizado.');
    }

    if (tokenActivo.value.tokenPlano !== tokenRecibido) {
      throw new Error('El token proporcionado no coincide con el token firmado.');
    }

    nuevaContrasena.value = passNueva;
    confirmacionContrasena.value = passConfirmacion;

    if (!cumplePoliticaSeguridad.value) {
      throw new Error('La nueva contraseña no cumple la política OWASP o no coincide con su confirmación.');
    }

    tokenActivo.value.consumido = true;
    sesionesRevocadas.value += 1;
    ultimoHashGenerado.value = `argon2id$${btoa(passNueva).slice(0, 16)}`;

    return {
      estado: 'CONTRASENA_ACTUALIZADA',
      sesionesRevocadas: sesionesRevocadas.value,
      tokenConsumido: true,
    };
  }

  return {
    tokenActivo,
    nuevaContrasena,
    confirmacionContrasena,
    sesionesRevocadas,
    ultimoHashGenerado,
    cumplePoliticaSeguridad,
    emitirTokenRecuperacion,
    confirmarNuevaContrasenaConToken,
  };
});
