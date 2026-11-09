<?php

declare(strict_types=1);

namespace Tests\Unit\Modulos\Kardex;

use App\Modulos\Kardex\Servicios\AnaliticaValoracionAbcService;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class AnaliticaValoracionAbcTest extends TestCase
{
    private const TENANT_ALFA = '11111111-1111-4111-8111-111111111111';
    private const TENANT_INTRUSO = '22222222-2222-4222-8222-222222222222';

    public function test_clasifica_partidas_segun_pareto_abc_y_compara_peps_ueps_cpp(): void
    {
        $servicio = new AnaliticaValoracionAbcService();

        $resultado = $servicio->generarAnalisisPatrimonialAbc(self::TENANT_ALFA, [
            [
                'tenant_id' => self::TENANT_ALFA,
                'codigo' => 'ALM-CENTRAL-01',
                'nombre' => 'Bodega Central Monterrey',
                'cantidad_disponible' => 1000.0,
                'costo_peps' => 1482.90,
                'costo_ueps' => 1470.00,
                'costo_cpp' => 1476.45,
            ],
            [
                'tenant_id' => self::TENANT_ALFA,
                'codigo' => 'ALM-NORTE-02',
                'nombre' => 'Centro Logístico Saltillo',
                'cantidad_disponible' => 1000.0,
                'costo_peps' => 640.12,
                'costo_ueps' => 632.00,
                'costo_cpp' => 636.06,
            ],
            [
                'tenant_id' => self::TENANT_ALFA,
                'codigo' => 'ALM-SUR-03',
                'nombre' => 'Plataforma Querétaro',
                'cantidad_disponible' => 1000.0,
                'costo_peps' => 318.45,
                'costo_ueps' => 316.92,
                'costo_cpp' => 317.685,
            ],
        ]);

        self::assertSame(2441470.0, $resultado['valor_total_peps']);
        self::assertSame(2418920.0, $resultado['valor_total_ueps']);
        self::assertSame(22550.0, $resultado['diferencia_peps_vs_ueps']);
        self::assertSame('A', $resultado['partidas_clasificadas'][0]['clase_abc']);
        self::assertSame('A', $resultado['partidas_clasificadas'][1]['clase_abc']);
        self::assertSame('B', $resultado['partidas_clasificadas'][2]['clase_abc']);
    }

    public function test_bloquea_fuga_multi_tenant_en_analitica_patrimonial_abc(): void
    {
        $servicio = new AnaliticaValoracionAbcService();

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Violación de aislamiento Multi-Tenant');

        $servicio->generarAnalisisPatrimonialAbc(self::TENANT_ALFA, [
            [
                'tenant_id' => self::TENANT_INTRUSO,
                'codigo' => 'ALM-INTRUSO',
                'nombre' => 'Almacén Externo',
                'cantidad_disponible' => 50.0,
                'costo_peps' => 100.0,
                'costo_ueps' => 95.0,
                'costo_cpp' => 97.5,
            ],
        ]);
    }
}
