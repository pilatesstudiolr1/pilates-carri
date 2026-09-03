/**
 * timeService.ts
 * Servicio de sincronización horaria con TimeZoneDB y respaldo nativo oficial para Argentina (UTC-3).
 * Soporta API https://timezonedb.com/api con fallback automático a Intl.DateTimeFormat.
 */

const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutos de caché para respetar límites de TimeZoneDB

interface TimeSyncState {
  source: 'TIMEZONEDB' | 'FALLBACK_INTL';
  driftMs: number; // Diferencia entre reloj local y hora oficial
  lastSync: number;
  dateISO: string;
  time: string;
}

// Estado en memoria
let inMemoryState: TimeSyncState | null = null;
let isSyncing = false;

/**
 * Obtiene la hora actual según el respaldo de Argentina (UTC-3).
 */
export function getNativeArgentinaDate(d: Date | string = new Date()): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: ARGENTINA_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(dateObj);
  } catch {
    return dateObj.toISOString().split('T')[0];
  }
}

/**
 * Obtiene la hora HH:mm actual de Argentina mediante respaldo nativo.
 */
export function getNativeArgentinaTime(d: Date | string = new Date()): string {
  const dateObj = typeof d === 'string' ? new Date(d) : d;
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: ARGENTINA_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dateObj);
  } catch {
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const mins = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }
}

/**
 * Sincroniza la hora con la API interna /api/timezone (que consulta TimeZoneDB si hay clave o devuelve el respaldo).
 */
export async function syncTimeWithTimeZoneDB(): Promise<TimeSyncState> {
  if (isSyncing && inMemoryState) {
    return inMemoryState;
  }

  isSyncing = true;
  try {
    const res = await fetch('/api/timezone', {
      cache: 'no-store',
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'OK' && data.formatted) {
        // Calcular drift respecto al reloj local del cliente
        const officialTimestampMs = data.timestamp ? data.timestamp * 1000 : new Date(data.formatted.replace(' ', 'T') + '-03:00').getTime();
        const clientNowMs = Date.now();
        const driftMs = officialTimestampMs - clientNowMs;

        inMemoryState = {
          source: data.source || 'TIMEZONEDB',
          driftMs,
          lastSync: clientNowMs,
          dateISO: data.dateISO,
          time: data.time,
        };

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('pilates_timesync', JSON.stringify(inMemoryState));
          } catch {
            // Ignorar errores de quota de almacenamiento
          }
        }

        isSyncing = false;
        return inMemoryState;
      }
    }
  } catch (err) {
    console.warn('No se pudo sincronizar con API de zona horaria, usando respaldo:', err);
  }

  isSyncing = false;

  // Respaldo inmediato si la API no respondió
  const fallbackState: TimeSyncState = {
    source: 'FALLBACK_INTL',
    driftMs: 0,
    lastSync: Date.now(),
    dateISO: getNativeArgentinaDate(),
    time: getNativeArgentinaTime(),
  };

  inMemoryState = fallbackState;
  return fallbackState;
}

/**
 * Inicializa la caché de sincronización si está guardada en el navegador.
 */
function initFromStorage() {
  if (typeof window === 'undefined') return;
  if (!inMemoryState) {
    try {
      const raw = localStorage.getItem('pilates_timesync');
      if (raw) {
        const parsed = JSON.parse(raw) as TimeSyncState;
        if (Date.now() - parsed.lastSync < CACHE_TTL_MS) {
          inMemoryState = parsed;
          return;
        }
      }
    } catch {
      // Ignorar parse error
    }
  }

  // Disparar sincronización en segundo plano
  syncTimeWithTimeZoneDB().catch(() => {});
}

if (typeof window !== 'undefined') {
  initFromStorage();
}

/**
 * Devuelve la fecha ISO (YYYY-MM-DD) ajustada según la sincronización de TimeZoneDB o respaldo nativo.
 */
export function getSyncedLocalDateISO(d?: Date | string): string {
  if (d) {
    return getNativeArgentinaDate(d);
  }

  // Si no tenemos sincronización fresca y estamos en el browser, solicitarla
  if (typeof window !== 'undefined') {
    if (!inMemoryState || Date.now() - inMemoryState.lastSync > CACHE_TTL_MS) {
      syncTimeWithTimeZoneDB().catch(() => {});
    }
  }

  // Si tenemos un drift calculado, aplicarlo al reloj actual
  if (inMemoryState && inMemoryState.driftMs) {
    const adjustedDate = new Date(Date.now() + inMemoryState.driftMs);
    return getNativeArgentinaDate(adjustedDate);
  }

  return getNativeArgentinaDate();
}

/**
 * Devuelve la hora actual HH:mm en Argentina con soporte TimeZoneDB.
 */
export function getSyncedLocalTime(d?: Date | string): string {
  if (d) {
    return getNativeArgentinaTime(d);
  }

  if (inMemoryState && inMemoryState.driftMs) {
    const adjustedDate = new Date(Date.now() + inMemoryState.driftMs);
    return getNativeArgentinaTime(adjustedDate);
  }

  return getNativeArgentinaTime();
}

/**
 * Devuelve información de diagnóstico sobre la sincronización horaria actual.
 */
export function getTimeSyncInfo() {
  return {
    source: inMemoryState?.source || 'FALLBACK_INTL',
    driftMs: inMemoryState?.driftMs || 0,
    lastSync: inMemoryState?.lastSync ? new Date(inMemoryState.lastSync).toISOString() : null,
    timezone: ARGENTINA_TIMEZONE,
  };
}
