import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };
  return new Intl.DateTimeFormat('es-AR', options || defaultOptions).format(
    typeof date === 'string' ? new Date(date) : date
  );
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(typeof date === 'string' ? new Date(date) : date);
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatFechaArg(dateStr?: string | Date | null): string {
  if (!dateStr) return '-';
  if (typeof dateStr === 'string') {
    const clean = dateStr.slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d}/${m}/${y}`;
    }
  }
  return formatDate(dateStr);
}

export function cleanAndFormatWhatsAppPhone(phone?: string | null): string | null {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (!clean) return null;
  if (clean.startsWith('0')) clean = clean.slice(1);
  if (clean.startsWith('15')) clean = clean.slice(2);
  if (clean.startsWith('54')) {
    if (!clean.startsWith('549')) {
      clean = `549${clean.slice(2)}`;
    }
  } else {
    clean = `549${clean}`;
  }
  return clean;
}

export function buildAvisoPagoWhatsAppMessage(data: {
  nombreCliente: string;
  monto: number | string;
  concepto?: string | null;
  metodoPago?: string | null;
  fechaPago?: string | null;
  vencimientoCuota?: string | null;
}): string {
  const nombreLimpio = (data.nombreCliente || '').trim();
  const primerNombre = nombreLimpio.split(' ')[0] || 'Alumna';

  const montoNum = typeof data.monto === 'number' ? data.monto : (parseFloat(data.monto) || 0);
  const montoStr = `$${montoNum.toLocaleString('es-AR')} ARS`;

  const metodo = (data.metodoPago || 'efectivo').toLowerCase();
  const metodoLabel =
    metodo === 'transferencia'
      ? 'Transferencia Bancaria'
      : metodo === 'efectivo'
      ? 'Efectivo en Caja'
      : metodo === 'mercado_pago' || metodo === 'mercadopago'
      ? 'Mercado Pago'
      : metodo === 'tarjeta' || metodo === 'debito'
      ? 'Tarjeta de Débito / POS'
      : (data.metodoPago || 'Efectivo');

  const fechaPagoStr = data.fechaPago ? formatFechaArg(data.fechaPago) : formatFechaArg(new Date().toISOString());
  const vencimientoStr = data.vencimientoCuota ? formatFechaArg(data.vencimientoCuota) : 'A confirmar';

  return (
    `¡Hola ${primerNombre}! 👋✨\n\n` +
    `Te confirmamos que tu pago ha impactado correctamente en *Pilates Studio*. ✅\n\n` +
    `🧾 *DETALLE DEL COMPROBANTE:*\n` +
    `-----------------------------------------\n` +
    `👤 *Alumna:* ${nombreLimpio || 'Alumna'}\n` +
    `📅 *Fecha de Pago:* ${fechaPagoStr}\n` +
    `📌 *Concepto:* ${data.concepto || 'Cuota mensualidad'}\n` +
    `💳 *Medio de Pago:* ${metodoLabel}\n` +
    `💰 *Total Abonado:* ${montoStr}\n` +
    `-----------------------------------------\n` +
    `🗓️ *Próximo Vencimiento de tu Cuota:* ${vencimientoStr}\n` +
    `-----------------------------------------`
  );
}

export function openWhatsAppMessage(phone: string, text: string): boolean {
  const formatted = cleanAndFormatWhatsAppPhone(phone);
  if (!formatted) return false;
  window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, '_blank');
  return true;
}

import {
  getSyncedLocalDateISO,
  getSyncedLocalTime,
  syncTimeWithTimeZoneDB,
  getTimeSyncInfo,
} from '@/lib/services/timeService';

export function getLocalDateISO(d?: Date | string): string {
  return getSyncedLocalDateISO(d);
}

export function getLocalTimeISO(d?: Date | string): string {
  return getSyncedLocalTime(d);
}

export { syncTimeWithTimeZoneDB, getTimeSyncInfo };


export function calculateNextDueDate(
  currentDueDate?: string | null,
  monthsToAdd = 1,
  basePaymentDate?: string | null
): string {
  const todayStr = getLocalDateISO();
  let base: Date;

  if (currentDueDate && currentDueDate >= todayStr) {
    const [y, m, d] = currentDueDate.slice(0, 10).split('-').map(Number);
    base = new Date(y, m - 1, d);
  } else if (basePaymentDate) {
    const [y, m, d] = basePaymentDate.slice(0, 10).split('-').map(Number);
    base = new Date(y, m - 1, d);
  } else {
    const [y, m, d] = todayStr.split('-').map(Number);
    base = new Date(y, m - 1, d);
  }

  base.setMonth(base.getMonth() + monthsToAdd);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, '0');
  const day = String(base.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}


