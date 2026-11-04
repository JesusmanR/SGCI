<?php

declare(strict_types=1);

namespace App\Modulos\Catalogo\Servicios;

use InvalidArgumentException;

/**
 * Servicio de dominio para validación y generación de Códigos de Barras (GS1 EAN-13, Code-128 y QR Interno).
 *
 * Permite verificar dígitos de control en terminales lectoras de bodega y generar
 * etiquetas QR trazables por Tenant, SKU y Lote.
 */
final class ValidadorCodigoBarrasService
{
    /**
     * Verifica si una cadena numérica de 13 dígitos cumple con el algoritmo oficial GS1 Módulo 10 (EAN-13).
     */
    public function esEan13Valido(string $codigo): bool
    {
        $limpio = trim($codigo);
        if (!preg_match('/^\d{13}$/', $limpio)) {
            return false;
        }

        $digitoControlCalculado = $this->calcularDigitoControlEan13(substr($limpio, 0, 12));
        $digitoControlRecibido = (int) $limpio[12];

        return $digitoControlCalculado === $digitoControlRecibido;
    }

    /**
     * Calcula el dígito verificador (posición 13) para una base de 12 dígitos según estándar GS1.
     */
    public function calcularDigitoControlEan13(string $doceDigitos): int
    {
        if (!preg_match('/^\d{12}$/', $doceDigitos)) {
            throw new InvalidArgumentException('Se requieren exactamente 12 dígitos numéricos para calcular el dígito verificador EAN-13.');
        }

        $suma = 0;
        for ($i = 0; $i < 12; $i++) {
            $digito = (int) $doceDigitos[$i];
            // Posiciones impares (índice par 0, 2, 4...) multiplican por 1; pares (índice impar 1, 3, 5...) por 3
            $peso = ($i % 2 === 0) ? 1 : 3;
            $suma += $digito * $peso;
        }

        $residuo = $suma % 10;

        return $residuo === 0 ? 0 : (10 - $residuo);
    }

    /**
     * Genera un código EAN-13 interno válido (prefijo 200-299 reservado por GS1 para uso interno de almacén).
     */
    public function generarEan13Interno(int $consecutivoNumerico, string $prefijoInterno = '205'): string
    {
        if (!preg_match('/^2\d{2}$/', $prefijoInterno)) {
            throw new InvalidArgumentException('El prefijo GS1 de uso interno debe iniciar con 2 y tener 3 dígitos (200-299).');
        }

        $cuerpo = str_pad((string) abs($consecutivoNumerico), 9, '0', STR_PAD_LEFT);
        $baseDoce = substr($prefijoInterno . $cuerpo, 0, 12);
        $digitoControl = $this->calcularDigitoControlEan13($baseDoce);

        return $baseDoce . (string) $digitoControl;
    }

    /**
     * Construye un payload QR estructurado para etiquetas de estantería/lote en bodega.
     * Formato canónico: `SGCI|T:<tenant_corto>|SKU:<sku>|LOTE:<lote>`
     */
    public function generarPayloadQrAlmacen(string $tenantId, string $sku, ?string $numeroLote = null): string
    {
        $tenantCorto = strtoupper(substr(trim($tenantId), 0, 8));
        $skuLimpio = strtoupper(trim($sku));
        $loteSegmento = $numeroLote !== null && trim($numeroLote) !== '' ? strtoupper(trim($numeroLote)) : 'SIN-LOTE';

        return sprintf('SGCI|T:%s|SKU:%s|LOTE:%s', $tenantCorto, $skuLimpio, $loteSegmento);
    }

    /**
     * Decodifica un código escaneado en la PWA (EAN-13, QR estructurado o SKU directo).
     *
     * @return array{tipo: string, valor: string, sku: ?string, lote: ?string, tenant_prefijo: ?string}
     */
    public function interpretarLecturaEscaner(string $lecturaCruda): array
    {
        $lectura = trim($lecturaCruda);

        if ($lectura === '') {
            throw new InvalidArgumentException('La lectura del escáner óptico no puede estar vacía.');
        }

        // 1. Formato QR interno SGCI
        if (str_starts_with($lectura, 'SGCI|')) {
            $partes = explode('|', $lectura);
            $mapa = [];
            foreach ($partes as $parte) {
                if (str_contains($parte, ':')) {
                    [$clave, $valor] = explode(':', $parte, 2);
                    $mapa[$clave] = $valor;
                }
            }

            return [
                'tipo' => 'QR_SGCI',
                'valor' => $lectura,
                'sku' => $mapa['SKU'] ?? null,
                'lote' => ($mapa['LOTE'] ?? 'SIN-LOTE') !== 'SIN-LOTE' ? ($mapa['LOTE'] ?? null) : null,
                'tenant_prefijo' => $mapa['T'] ?? null,
            ];
        }

        // 2. Formato EAN-13 numérico
        if (preg_match('/^\d{13}$/', $lectura)) {
            if (!$this->esEan13Valido($lectura)) {
                throw new InvalidArgumentException(
                    sprintf('El código EAN-13 [%s] tiene un dígito verificador inválido (posible lectura corrupta).', $lectura)
                );
            }

            return [
                'tipo' => 'EAN_13',
                'valor' => $lectura,
                'sku' => null,
                'lote' => null,
                'tenant_prefijo' => null,
            ];
        }

        // 3. Código Code-128 / SKU directo
        return [
            'tipo' => 'SKU_CODE128',
            'valor' => strtoupper($lectura),
            'sku' => strtoupper($lectura),
            'lote' => null,
            'tenant_prefijo' => null,
        ];
    }
}
