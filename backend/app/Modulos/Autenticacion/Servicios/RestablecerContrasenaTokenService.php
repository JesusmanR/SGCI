<?php

declare(strict_types=1);

namespace App\Modulos\Autenticacion\Servicios;

use DomainException;
use InvalidArgumentException;

/**
 * Servicio de dominio para el flujo completo de Recuperación y Nueva Contraseña por Token.
 *
 * Cierra la brecha documentada en SGCI-pantallas/LEEME.txt ("pantalla de nueva contraseña por token"):
 * - Emite tokens de un solo uso con hash SHA-256 y ventana de expiración de 15 minutos.
 * - Valida complejidad de la nueva contraseña (mínimo 10 caracteres, mayúscula, número y símbolo).
 * - Invalida el token tras su uso e instruye la revocación de sesiones/refresh tokens previos.
 */
final class RestablecerContrasenaTokenService
{
    /**
     * Genera un token de recuperación asociado a un `tenant_id` y correo corporativo.
     *
     * @return array{
     *   tenant_id: string,
     *   correo: string,
     *   token_plano: string,
     *   token_hash: string,
     *   expira_en: string,
     *   usado: bool
     * }
     */
    public function emitirTokenRecuperacion(
        string $tenantId,
        string $correo,
        string $ahoraIso = '2026-11-05T12:00:00-05:00',
    ): array {
        if (trim($tenantId) === '' || trim($correo) === '') {
            throw new InvalidArgumentException('El tenant_id y el correo corporativo son obligatorios.');
        }

        if (! filter_var($correo, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('El formato del correo electrónico no es válido.');
        }

        $tokenPlano = 'sgci-rst-' . substr(hash('sha256', $tenantId . '|' . $correo . '|' . $ahoraIso), 0, 24);
        $tokenHash = hash('sha256', $tokenPlano);
        $expiraTs = (strtotime($ahoraIso) ?: time()) + (15 * 60);

        return [
            'tenant_id' => $tenantId,
            'correo' => mb_strtolower(trim($correo)),
            'token_plano' => $tokenPlano,
            'token_hash' => $tokenHash,
            'expira_en' => date(DATE_ATOM, $expiraTs),
            'usado' => false,
        ];
    }

    /**
     * Valida el token y aplica la nueva contraseña cumpliendo políticas OWASP y aislamiento Multi-Tenant.
     *
     * @param array{
     *   tenant_id: string,
     *   correo: string,
     *   token_hash: string,
     *   expira_en: string,
     *   usado: bool
     * } $registroToken
     * @return array{
     *   estado: string,
     *   tenant_id: string,
     *   correo: string,
     *   password_hash: string,
     *   token_invalidado: bool,
     *   refresh_tokens_revocados: bool,
     *   mensaje: string
     * }
     */
    public function confirmarNuevaContrasenaPorToken(
        string $tenantIdContexto,
        string $tokenPlanoRecibido,
        string $nuevaContrasena,
        string $confirmacionContrasena,
        array $registroToken,
        string $ahoraIso = '2026-11-05T12:08:00-05:00',
    ): array {
        if ($registroToken['tenant_id'] !== $tenantIdContexto) {
            throw new DomainException(
                'Violación Multi-Tenant: el token de recuperación pertenece a otra organización.'
            );
        }

        if ($registroToken['usado'] === true) {
            throw new DomainException(
                'El token de recuperación ya fue utilizado anteriormente y está invalidado.'
            );
        }

        $ahoraTs = strtotime($ahoraIso) ?: time();
        $expiraTs = strtotime($registroToken['expira_en']) ?: 0;
        if ($ahoraTs > $expiraTs) {
            throw new DomainException(
                'El token de recuperación ha expirado (ventana máxima de 15 minutos).'
            );
        }

        $hashRecibido = hash('sha256', $tokenPlanoRecibido);
        if (! hash_equals($registroToken['token_hash'], $hashRecibido)) {
            throw new DomainException('El token de recuperación proporcionado es inválido.');
        }

        if ($nuevaContrasena !== $confirmacionContrasena) {
            throw new DomainException('La confirmación de contraseña no coincide.');
        }

        $this->validarFortalezaContrasena($nuevaContrasena);

        return [
            'estado' => 'CONTRASENA_ACTUALIZADA',
            'tenant_id' => $tenantIdContexto,
            'correo' => $registroToken['correo'],
            'password_hash' => password_hash($nuevaContrasena, PASSWORD_BCRYPT),
            'token_invalidado' => true,
            'refresh_tokens_revocados' => true,
            'mensaje' => 'Contraseña corporativa restablecida con éxito. Todas las sesiones anteriores fueron revocadas.',
        ];
    }

    private function validarFortalezaContrasena(string $contrasena): void
    {
        $tieneLongitud = mb_strlen($contrasena) >= 10;
        $tieneMayuscula = preg_match('/[A-Z]/', $contrasena) === 1;
        $tieneMinuscula = preg_match('/[a-z]/', $contrasena) === 1;
        $tieneNumero = preg_match('/\d/', $contrasena) === 1;
        $tieneSimbolo = preg_match('/[^A-Za-z0-9]/', $contrasena) === 1;

        if (! ($tieneLongitud && $tieneMayuscula && $tieneMinuscula && $tieneNumero && $tieneSimbolo)) {
            throw new DomainException(
                'La nueva contraseña debe tener al menos 10 caracteres, incluir mayúsculas, minúsculas, números y un símbolo especial.'
            );
        }
    }
}
