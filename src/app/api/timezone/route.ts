import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ARGENTINA_TIMEZONE = 'America/Argentina/Buenos_Aires';

function getFallbackArgentinaTime() {
  const now = new Date();
  
  // Formateador estándar de Argentina (UTC-3)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ARGENTINA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const formattedParts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  formattedParts.forEach((p) => {
    partMap[p.type] = p.value;
  });

  const dateISO = `${partMap.year}-${partMap.month}-${partMap.day}`;
  const timeStr = `${partMap.hour}:${partMap.minute}:${partMap.second}`;
  const shortTime = `${partMap.hour}:${partMap.minute}`;

  return {
    source: 'FALLBACK_INTL' as const,
    status: 'OK',
    zoneName: ARGENTINA_TIMEZONE,
    gmtOffset: -10800,
    timestamp: Math.floor(now.getTime() / 1000),
    formatted: `${dateISO} ${timeStr}`,
    dateISO,
    time: shortTime,
    fullTime: timeStr,
  };
}

export async function GET() {
  const apiKey =
    process.env.TIMEZONEDB_API_KEY ||
    process.env.NEXT_PUBLIC_TIMEZONEDB_API_KEY;

  if (apiKey && apiKey.trim() !== '' && apiKey !== 'TU_API_KEY_AQUI') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `https://api.timezonedb.com/v2.1/get-time-zone?key=${apiKey.trim()}&format=json&by=zone&zone=${encodeURIComponent(
        ARGENTINA_TIMEZONE
      )}`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
        cache: 'no-store',
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.status === 'OK' && data.formatted) {
          const parts = data.formatted.split(' ');
          const dateISO = parts[0];
          const time = (parts[1] || '').slice(0, 5);

          return NextResponse.json({
            source: 'TIMEZONEDB',
            status: 'OK',
            zoneName: data.zoneName || ARGENTINA_TIMEZONE,
            gmtOffset: data.gmtOffset || -10800,
            timestamp: data.timestamp,
            formatted: data.formatted,
            dateISO,
            time,
            fullTime: parts[1] || '',
          });
        }
      }
    } catch (err) {
      console.warn('Advertencia en TimeZoneDB API, activando respaldo local:', err);
    }
  }

  // Respaldo de contingencia: Cálculo nativo de zona horaria Argentina
  const fallback = getFallbackArgentinaTime();
  return NextResponse.json(fallback);
}
