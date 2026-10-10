import { clsx, type ClassValue } from 'clsx';
import {
  getSyncedLocalDateISO,
  getSyncedLocalTime,
  syncTimeWithTimeZoneDB,
  getTimeSyncInfo,
} from '@/lib/services/timeService';

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
  notas?: string | null;
}): string {
  const nombreLimpio = (data.nombreCliente || '').trim();
  const primerNombre = nombreLimpio.split(' ')[0] || 'Alumna';

  const montoNum = typeof data.monto === 'number' ? data.monto : (parseFloat(data.monto) || 0);
  const montoStr = `$${montoNum.toLocaleString('es-AR')} ARS`;

  const metodo = (data.metodoPago || 'efectivo').toLowerCase();
  let metodoLabel =
    metodo === 'transferencia'
      ? 'Transferencia Bancaria'
      : metodo === 'efectivo'
      ? 'Efectivo en Caja'
      : metodo === 'mercado_pago' || metodo === 'mercadopago'
      ? 'Mercado Pago'
      : metodo === 'tarjeta' || metodo === 'debito'
      ? 'Tarjeta de Débito / POS'
      : (data.metodoPago || 'Efectivo');

  if (data.notas && data.notas.includes('[Métodos de pago:')) {
    const match = data.notas.match(/\[Métodos de pago:\s*([^\]]+)\]/);
    if (match) {
      metodoLabel = `Métodos de pago: ${match[1]}`;
    }
  }

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

export function buildMensajeBienvenidaInscripcion(data: {
  nombre: string;
  fechaInicio: string;
  turnosStr: string;
  montoInscripcion?: number | string;
  sedeNombre?: string;
}): string {
  const nombreLimpio = (data.nombre || '').trim();
  const primerNombre = nombreLimpio.split(' ')[0] || 'Alumna';
  const fechaStr = data.fechaInicio.includes('-')
    ? formatFechaArg(data.fechaInicio)
    : data.fechaInicio;

  const montoNum =
    typeof data.montoInscripcion === 'number'
      ? data.montoInscripcion
      : (parseFloat(data.montoInscripcion as string) || 9500);

  const montoStr = `$${montoNum.toLocaleString('es-AR')}`;
  const sedeStr = data.sedeNombre?.trim() || 'Sede Centro';

  let msg = `¡Hola ${primerNombre}! 👋\n`;
  msg += `Confirmamos el pago de tu inscripción (${montoStr}) y tu lugar reservado. ✅\n\n`;
  msg += `📋 *Detalle de tu turno:*\n`;
  msg += `• 🗓️ Inicio de clases: *${fechaStr}*\n`;
  msg += `• ⏰ Horarios: *${data.turnosStr}*\n`;
  msg += `• 📍 Sede: *${sedeStr}*\n\n`;
  msg += `¡Te esperamos!`;

  return msg;
}

export function buildRecordatorioCuotaWhatsAppMessage(data: {
  nombre: string;
  monto: number;
  alias?: string;
  cbu?: string;
  titular?: string;
}): string {
  const primerNombre = (data.nombre || '').trim().split(' ')[0] || 'Alumna';
  const montoStr = `$${(data.monto || 0).toLocaleString('es-AR')}`;

  let msg = `Hola ${primerNombre}, te recordamos desde Pilates Studio que tu cuota mensual de ${montoStr} se encuentra pendiente de pago.\n\n`;

  if (data.alias || data.cbu) {
    msg += `Datos para transferencia:\n`;
    if (data.titular) msg += `Titular: ${data.titular}\n`;
    if (data.alias) msg += `Alias: ${data.alias}\n`;
    if (data.cbu) msg += `CBU: ${data.cbu}\n`;
    msg += `\nPor favor envianos el comprobante una vez realizada la transferencia.\n\n`;
  }

  msg += `Muchas gracias.`;
  return msg;
}

export function openWhatsAppMessage(phone: string, text: string): boolean {
  const formatted = cleanAndFormatWhatsAppPhone(phone);
  if (!formatted) return false;
  window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(text)}`, '_blank');
  return true;
}

export function buildMensajeCumpleanos(nombre: string): string {
  const primerNombre = (nombre || '').trim().split(' ')[0] || 'Alumna';
  return `¡Feliz cumpleaños ${primerNombre}! 🎂✨\n\nTe deseamos un excelente y maravilloso día de parte de todo el equipo de Pilates Studio LR. ¡Muchas gracias por entrenar y compartir tu energía con nosotros! 💕`;
}

export function buildMensajeBajaAlumna(nombre: string): string {
  const primerNombre = (nombre || '').trim().split(' ')[0] || 'Alumna';
  return `Hola ${primerNombre}! 👋\n\nTe escribimos desde Pilates Studio para confirmarte que hemos procesado la baja de tus clases y tus turnos en la agenda ya quedaron liberados.\n\nTe agradecemos un montón por haber compartido este tiempo con nosotros. Recordá que cuando desees retomar, ¡siempre tendrás las puertas abiertas del estudio! 💕`;
}

export function getBirthdayInfo(dateOfBirth?: string | null): {
  isToday: boolean;
  isThisMonth: boolean;
  daysUntil: number;
  day: number;
  month: number;
  ageToTurn: number | null;
  formattedDate: string;
} | null {
  if (!dateOfBirth) return null;
  const clean = dateOfBirth.slice(0, 10).trim();

  // Support both YYYY-MM-DD and DD/MM/YYYY or YYYY/MM/DD
  const separator = clean.includes('-') ? '-' : clean.includes('/') ? '/' : null;
  if (!separator) return null;

  const parts = clean.split(separator).map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;

  let birthYear: number;
  let birthMonth: number;
  let birthDay: number;

  if (parts[0] > 1900) {
    // Format: YYYY-MM-DD or YYYY/MM/DD
    [birthYear, birthMonth, birthDay] = parts;
  } else if (parts[2] > 1900) {
    // Format: DD/MM/YYYY
    [birthDay, birthMonth, birthYear] = parts;
  } else {
    [birthYear, birthMonth, birthDay] = parts;
  }

  if (birthMonth < 1 || birthMonth > 12 || birthDay < 1 || birthDay > 31) return null;

  const todayStr = getLocalDateISO();
  const [currentYear, currentMonth, currentDay] = todayStr.split('-').map(Number);

  const isToday = birthMonth === currentMonth && birthDay === currentDay;
  const isThisMonth = birthMonth === currentMonth;

  let nextBdayYear = currentYear;
  if (birthMonth < currentMonth || (birthMonth === currentMonth && birthDay < currentDay)) {
    nextBdayYear = currentYear + 1;
  }

  const todayDate = new Date(currentYear, currentMonth - 1, currentDay);
  const nextBdayDate = new Date(nextBdayYear, birthMonth - 1, birthDay);
  const diffMs = nextBdayDate.getTime() - todayDate.getTime();
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const ageToTurn = birthYear > 1900 ? nextBdayYear - birthYear : null;

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const formattedDate = `${birthDay} de ${meses[birthMonth - 1]}`;

  return {
    isToday,
    isThisMonth,
    daysUntil,
    day: birthDay,
    month: birthMonth,
    ageToTurn,
    formattedDate,
  };
}

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

/**
 * Retorna el día de la semana correspondiente (1 = Lunes, ..., 6 = Sábado, 7 = Domingo)
 */
export function getDayOfWeekFromDate(dateStr: string): number {
  if (!dateStr) return 1;
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return 1;
  const date = new Date(y, m - 1, d);
  const jsDay = date.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  return jsDay === 0 ? 7 : jsDay;
}

/**
 * Calcula la fecha ISO (YYYY-MM-DD) para un día específico de la semana (1 = Lunes, ..., 6 = Sábado)
 * basándose en una fecha de referencia dentro de esa misma semana.
 */
export function getDateOfWeekDay(referenceDateStr: string, targetDayOfWeek: number): string {
  if (!referenceDateStr) return getLocalDateISO();
  const clean = referenceDateStr.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return getLocalDateISO();

  const refDate = new Date(y, m - 1, d);
  const currentDayOfWeek = refDate.getDay() === 0 ? 7 : refDate.getDay();
  const diffDays = targetDayOfWeek - currentDayOfWeek;
  refDate.setDate(refDate.getDate() + diffDays);

  const ry = refDate.getFullYear();
  const rm = String(refDate.getMonth() + 1).padStart(2, '0');
  const rd = String(refDate.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}

/**
 * Suma o resta días a una fecha ISO en formato YYYY-MM-DD
 */
export function addDaysToDate(dateStr: string, days: number): string {
  if (!dateStr) return getLocalDateISO();
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return getLocalDateISO();

  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ry = date.getFullYear();
  const rm = String(date.getMonth() + 1).padStart(2, '0');
  const rd = String(date.getDate()).padStart(2, '0');
  return `${ry}-${rm}-${rd}`;
}



