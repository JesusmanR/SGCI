<?php

declare(strict_types=1);

/**
 * Ejecutor autónomo PSR-4 de la Suite TDD Backend SGCI (Sprints 2 al 10).
 * Soporta métodos con prefijo `test_` y anotaciones `@test` en docblocks.
 */

namespace PHPUnit\Framework {
    if (! class_exists(TestCase::class)) {
        abstract class TestCase
        {
            private ?string $expectedExceptionClass = null;
            private ?string $expectedExceptionMessage = null;

            protected function setUp(): void {}
            protected function tearDown(): void {}

            public function expectException(string $exception): void
            {
                $this->expectedExceptionClass = $exception;
            }

            public function expectExceptionMessage(string $message): void
            {
                $this->expectedExceptionMessage = $message;
            }

            public function getExpectedExceptionClass(): ?string
            {
                return $this->expectedExceptionClass;
            }

            public function getExpectedExceptionMessage(): ?string
            {
                return $this->expectedExceptionMessage;
            }

            public function resetExpectedExceptions(): void
            {
                $this->expectedExceptionClass = null;
                $this->expectedExceptionMessage = null;
            }

            public static function assertSame(mixed $expected, mixed $actual, string $message = ''): void
            {
                if ($expected !== $actual) {
                    throw new \RuntimeException(
                        $message ?: sprintf('Fallo assertSame: esperado %s, obtenido %s', var_export($expected, true), var_export($actual, true))
                    );
                }
            }

            public static function assertEqualsWithDelta(mixed $expected, mixed $actual, float $delta, string $message = ''): void
            {
                if (abs((float) $expected - (float) $actual) > $delta) {
                    throw new \RuntimeException(
                        $message ?: sprintf('Fallo assertEqualsWithDelta: esperado %s (±%s), obtenido %s', (string) $expected, (string) $delta, (string) $actual)
                    );
                }
            }

            public static function assertTrue(mixed $condition, string $message = ''): void
            {
                if ($condition !== true) {
                    throw new \RuntimeException($message ?: 'Fallo assertTrue: se esperaba true.');
                }
            }

            public static function assertFalse(mixed $condition, string $message = ''): void
            {
                if ($condition !== false) {
                    throw new \RuntimeException($message ?: 'Fallo assertFalse: se esperaba false.');
                }
            }

            public static function assertNull(mixed $actual, string $message = ''): void
            {
                if ($actual !== null) {
                    throw new \RuntimeException($message ?: 'Fallo assertNull: se esperaba null.');
                }
            }

            public static function assertNotNull(mixed $actual, string $message = ''): void
            {
                if ($actual === null) {
                    throw new \RuntimeException($message ?: 'Fallo assertNotNull: se esperaba valor no nulo.');
                }
            }

            public static function assertCount(int $expectedCount, iterable $haystack, string $message = ''): void
            {
                $count = is_countable($haystack) ? count($haystack) : iterator_count((function () use ($haystack) {
                    yield from $haystack;
                })());
                if ($count !== $expectedCount) {
                    throw new \RuntimeException(
                        $message ?: sprintf('Fallo assertCount: esperado %d, obtenido %d', $expectedCount, $count)
                    );
                }
            }

            public static function assertStringContainsString(string $needle, string $haystack, string $message = ''): void
            {
                if (! str_contains($haystack, $needle)) {
                    throw new \RuntimeException(
                        $message ?: sprintf('Fallo assertStringContainsString: "%s" no encontrado en "%s"', $needle, $haystack)
                    );
                }
            }

            public static function assertContains(mixed $needle, iterable $haystack, string $message = ''): void
            {
                foreach ($haystack as $item) {
                    if ($item === $needle) {
                        return;
                    }
                }
                throw new \RuntimeException(
                    $message ?: sprintf('Fallo assertContains: elemento %s no encontrado en la colección.', var_export($needle, true))
                );
            }
        }
    }
}

namespace Illuminate\Database\Eloquent {
    if (! interface_exists(Scope::class)) {
        interface Scope
        {
            public function apply(Builder $builder, Model $model): void;
        }
    }
    if (! class_exists(Builder::class)) {
        class Builder
        {
            public function where(string $column, mixed $operator = null, mixed $value = null): self
            {
                return $this;
            }
        }
    }
    if (! class_exists(Model::class)) {
        abstract class Model
        {
            protected array $attributes = [];

            public function __construct(array $attributes = [])
            {
                $this->attributes = $attributes;
            }

            public function __get(string $key): mixed
            {
                return $this->attributes[$key] ?? null;
            }

            public function __set(string $key, mixed $value): void
            {
                $this->attributes[$key] = $value;
            }

            public function getTable(): string
            {
                return $this->table ?? 'modelos';
            }

            protected static function booted(): void {}
            protected static function addGlobalScope(mixed $scope): void {}
            protected static function creating(callable $callback): void {}
            protected static function updating(callable $callback): void {}
        }
    }
    if (! trait_exists(SoftDeletes::class)) {
        trait SoftDeletes {}
    }
}

namespace Illuminate\Database\Eloquent\Concerns {
    if (! trait_exists(HasUuids::class)) {
        trait HasUuids {}
    }
}

namespace Illuminate\Database\Eloquent\Relations {
    if (! class_exists(BelongsTo::class)) {
        class BelongsTo {}
    }
    if (! class_exists(HasMany::class)) {
        class HasMany {}
    }
}

namespace Illuminate\Support {
    if (! class_exists(Str::class)) {
        final class Str
        {
            public static function uuid(): string
            {
                $bytes = random_bytes(16);
                $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
                $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
                return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($bytes), 4));
            }
        }
    }
}

namespace {
    spl_autoload_register(static function (string $class): void {
        $baseDir = dirname(__DIR__);
        if (str_starts_with($class, 'App\\')) {
            $rel = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, 4));
            $file = $baseDir . DIRECTORY_SEPARATOR . 'app' . DIRECTORY_SEPARATOR . $rel . '.php';
            if (is_file($file)) {
                require_once $file;
            }
        } elseif (str_starts_with($class, 'Tests\\')) {
            $rel = str_replace('\\', DIRECTORY_SEPARATOR, substr($class, 6));
            $file = $baseDir . DIRECTORY_SEPARATOR . 'tests' . DIRECTORY_SEPARATOR . $rel . '.php';
            if (is_file($file)) {
                require_once $file;
            }
        }
    });

    $clasesPrueba = [
        \Tests\Feature\Modulos\CatalogoAlmacenes\CatalogoAlmacenesTest::class,
        \Tests\Feature\Modulos\Lotes\ControlLotesFefoTest::class,
        \Tests\Feature\Modulos\Compras\AbastecimientoRecepcionKardexTest::class,
        \Tests\Feature\Modulos\AuditoriaConteos\AuditoriaConteosTest::class,
        \Tests\Feature\Modulos\Catalogo\PreciosImpuestosAlertasTest::class,
        \Tests\Feature\Modulos\FacturacionCaja\FacturacionArqueoCajaTest::class,
        \Tests\Feature\Modulos\Tenants\GobernanzaSaasReportesTest::class,
        \Tests\Feature\Modulos\AuditoriaConteos\SincronizacionOfflinePwaTest::class,
        \Tests\Feature\Modulos\Compartido\OperacionesApiV1Test::class,
    ];

    $totalPruebas = 0;
    $totalExitosas = 0;
    $fallos = [];

    echo "=== EJECUTANDO SUITE TDD BACKEND SGCI (PHP " . PHP_VERSION . ") ===\n";

    foreach ($clasesPrueba as $clase) {
        $ref = new \ReflectionClass($clase);
        echo "\n▶ Suite: " . $ref->getShortName() . "\n";

        foreach ($ref->getMethods(\ReflectionMethod::IS_PUBLIC) as $metodo) {
            if ($metodo->getDeclaringClass()->getName() !== $clase) {
                continue;
            }
            $doc = (string) $metodo->getDocComment();
            $esMetodoTest = str_starts_with($metodo->getName(), 'test_') || str_contains($doc, '@test');
            if (! $esMetodoTest) {
                continue;
            }

            $totalPruebas++;
            /** @var \PHPUnit\Framework\TestCase $instancia */
            $instancia = $ref->newInstance();
            $setUp = $ref->getMethod('setUp');
            $setUp->setAccessible(true);
            $setUp->invoke($instancia);
            $instancia->resetExpectedExceptions();

            try {
                $metodo->invoke($instancia);
                if ($instancia->getExpectedExceptionClass() !== null) {
                    throw new \RuntimeException(
                        'Se esperaba la excepción ' . $instancia->getExpectedExceptionClass() . ' pero no fue lanzada.'
                    );
                }
                $totalExitosas++;
                echo "  ✔ " . $metodo->getName() . "\n";
            } catch (\Throwable $e) {
                $esperada = $instancia->getExpectedExceptionClass();
                $mensajeEsperado = $instancia->getExpectedExceptionMessage();

                if ($esperada !== null && is_a($e, $esperada)) {
                    if ($mensajeEsperado !== null && ! str_contains($e->getMessage(), $mensajeEsperado)) {
                        $fallos[] = $ref->getShortName() . '::' . $metodo->getName() . ' -> Mensaje inesperado: ' . $e->getMessage();
                        echo "  ✘ " . $metodo->getName() . " (mensaje de excepción no coincide)\n";
                    } else {
                        $totalExitosas++;
                        echo "  ✔ " . $metodo->getName() . " (excepción esperada verificada)\n";
                    }
                } else {
                    $fallos[] = $ref->getShortName() . '::' . $metodo->getName() . ' -> ' . $e::class . ': ' . $e->getMessage();
                    echo "  ✘ " . $metodo->getName() . " -> " . $e->getMessage() . "\n";
                }
            } finally {
                if ($ref->hasMethod('tearDown')) {
                    $tearDown = $ref->getMethod('tearDown');
                    $tearDown->setAccessible(true);
                    $tearDown->invoke($instancia);
                }
            }
        }
    }

    echo "\n============================================================\n";
    echo "Resumen TDD Backend: {$totalExitosas}/{$totalPruebas} pruebas aprobadas.\n";
    if ($fallos !== []) {
        foreach ($fallos as $f) {
            echo "FALLO: {$f}\n";
        }
        exit(1);
    }
    echo "ESTADO: 100% VERDE (0 ERRORES)\n";
}
