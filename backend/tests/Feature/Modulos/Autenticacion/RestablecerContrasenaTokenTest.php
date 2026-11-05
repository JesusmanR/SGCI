<?php

declare(strict_types=1);

namespace Tests\Feature\Modulos\Autenticacion;

use App\Modulos\Autenticacion\Servicios\RestablecerContrasenaTokenService;
use DomainException;
use PHPUnit\Framework\TestCase;

/**
 * Suite TDD Sprint 12: Pantalla y Flujo de Nueva Contraseña por Token (SGCI-pantallas 04 y 05).
 */
final class RestablecerContrasenaTokenTest extends TestCase
{
    private RestablecerContrasenaTokenService $servicio;
    private string $tenantAlfa = '8f2a0000-0000-4000-8000-00000000c91d';

    protected function setUp(): void
    {
        parent::setUp();
        $this->servicio = new RestablecerContrasenaTokenService();
    }

    public function test_emite_token_sha256_y_actualiza_contrasena_revocando_refresh_tokens(): void
    {
        $emision = $this->servicio->emitirTokenRecuperacion(
            tenantId: $this->tenantAlfa,
            correo: 'laura@industriasalfa.com',
            ahoraIso: '2026-11-05T12:00:00-05:00',
        );

        self::assertSame($this->tenantAlfa, $emision['tenant_id']);
        self::assertFalse($emision['usado']);

        $resultado = $this->servicio->confirmarNuevaContrasenaPorToken(
            tenantIdContexto: $this->tenantAlfa,
            tokenPlanoRecibido: $emision['token_plano'],
            nuevaContrasena: 'Alfa#2026!Secure',
            confirmacionContrasena: 'Alfa#2026!Secure',
            registroToken: $emision,
            ahoraIso: '2026-11-05T12:08:00-05:00',
        );

        self::assertSame('CONTRASENA_ACTUALIZADA', $resultado['estado']);
        self::assertTrue($resultado['token_invalidado']);
        self::assertTrue($resultado['refresh_tokens_revocados']);
    }

    public function test_bloquea_token_expirado_y_previene_uso_cross_tenant(): void
    {
        $emision = $this->servicio->emitirTokenRecuperacion(
            tenantId: $this->tenantAlfa,
            correo: 'laura@industriasalfa.com',
            ahoraIso: '2026-11-05T12:00:00-05:00',
        );

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Violación Multi-Tenant');

        $this->servicio->confirmarNuevaContrasenaPorToken(
            tenantIdContexto: '99999999-9999-4999-8999-999999999999',
            tokenPlanoRecibido: $emision['token_plano'],
            nuevaContrasena: 'Alfa#2026!Secure',
            confirmacionContrasena: 'Alfa#2026!Secure',
            registroToken: $emision,
            ahoraIso: '2026-11-05T12:05:00-05:00',
        );
    }
}
