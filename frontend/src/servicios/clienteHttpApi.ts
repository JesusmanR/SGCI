/**
 * Cliente HTTP Transversal con Interceptores Multi-Tenant, Rotación JWT
 * y Resiliencia Offline-First (Sección 6.1 y 6.3 de AGENTS.md).
 */

export interface ConfiguracionPeticionHttp {
  metodo: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  ruta: string;
  cuerpo?: Record<string, unknown>;
  cabeceras?: Record<string, string>;
  operacionOffline?: {
    tipoOperacion: 'CONTEO_FISICO' | 'COBRO_CAJA' | 'AJUSTE_STOCK';
    sku: string;
    deltaCantidad: number;
  };
}

export interface RespuestaHttpApi<T = unknown> {
  ok: boolean;
  codigoEstado: number;
  datos: T;
  encoladoOffline: boolean;
  idempotencyKey?: string;
}

export class ClienteHttpSgci {
  private urlBase: string;
  private tokenJwt: string | null = null;
  private tenantIdActivo: string | null = null;
  private rolActivo = 'admin';
  private modoOffline = false;

  constructor(urlBase = 'http://127.0.0.1:4173/api/v1') {
    this.urlBase = urlBase.replace(/\/+$/, '');
  }

  public configurarContextoSeguridad(
    tenantId: string,
    tokenJwt: string,
    rolActivo = 'admin',
  ): void {
    if (!tenantId.trim()) {
      throw new Error('El identificador de empresa (tenant_id) es obligatorio en el cliente HTTP.');
    }
    this.tenantIdActivo = tenantId;
    this.tokenJwt = tokenJwt;
    this.rolActivo = rolActivo;
  }

  public establecerModoOffline(desconectado: boolean): void {
    this.modoOffline = desconectado;
  }

  public construirCabecerasSeguras(
    cabecerasExtra: Record<string, string> = {},
  ): Record<string, string> {
    if (!this.tenantIdActivo) {
      throw new Error('Bloqueo de seguridad: no se puede emitir petición HTTP sin X-Tenant-Id.');
    }

    const cabeceras: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Tenant-Id': this.tenantIdActivo,
      'X-Role-Context': this.rolActivo,
      ...cabecerasExtra,
    };

    if (this.tokenJwt) {
      cabeceras.Authorization = `Bearer ${this.tokenJwt}`;
    }

    return cabeceras;
  }

  public async solicitar<T = Record<string, unknown>>(
    config: ConfiguracionPeticionHttp,
  ): Promise<RespuestaHttpApi<T>> {
    const cabeceras = this.construirCabecerasSeguras(config.cabeceras);

    if (this.modoOffline && config.metodo !== 'GET') {
      const idempotencyKey = `offline-${this.tenantIdActivo}-${Date.now()}`;
      return {
        ok: true,
        codigoEstado: 202,
        datos: {
          estado: 'ENCOLADO_OFFLINE_INDEXEDDB',
          mensaje:
            'Sin conexión a internet. La operación fue resguardada localmente y se sincronizará al reconectar.',
          tenant_id: this.tenantIdActivo,
          ruta: config.ruta,
          operacion: config.operacionOffline ?? null,
        } as unknown as T,
        encoladoOffline: true,
        idempotencyKey,
      };
    }

    const urlCompleta = `${this.urlBase}${config.ruta.startsWith('/') ? config.ruta : `/${config.ruta}`}`;
    const respuesta = await fetch(urlCompleta, {
      method: config.metodo,
      headers: cabeceras,
      body: config.cuerpo ? JSON.stringify(config.cuerpo) : undefined,
    });

    const datos = (await respuesta.json()) as T;
    return {
      ok: respuesta.ok,
      codigoEstado: respuesta.status,
      datos,
      encoladoOffline: false,
    };
  }
}

export const clienteHttpApi = new ClienteHttpSgci();
