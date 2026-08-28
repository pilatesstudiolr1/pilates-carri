'use client';

import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Pago } from '@/types/database';
import {
  X,
  Printer,
  MessageCircle,
  CheckCircle2,
  Receipt,
  CreditCard,
  User,
  Phone,
  FileText,
} from 'lucide-react';

interface ComprobantePagoModalProps {
  isOpen: boolean;
  pago: Pago | null;
  onClose: () => void;
}

export function ComprobantePagoModal({
  isOpen,
  pago,
  onClose,
}: ComprobantePagoModalProps) {
  if (!isOpen || !pago) return null;

  const alumna = pago.alumna;
  const alumnaNombre = alumna ? `${alumna.first_name} ${alumna.last_name || ''}`.trim() : 'Alumna';
  const montoFormateado = `$${(Number(pago.amount) || 0).toLocaleString('es-AR')} ARS`;

  const metodoLabel =
    pago.payment_method === 'transferencia'
      ? 'Transferencia Bancaria'
      : pago.payment_method === 'efectivo'
      ? 'Efectivo en Caja'
      : pago.payment_method === 'mercado_pago'
      ? 'Mercado Pago'
      : pago.payment_method === 'tarjeta'
      ? 'Tarjeta de Débito / POS'
      : (pago.payment_method || 'Pago General');

  const handlePrintIsolated = () => {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';

    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow?.document;
    if (!doc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante de Pago</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          .receipt-card {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 36px 40px;
            background: #ffffff;
          }
          .badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            background-color: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
            margin-bottom: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 18px;
            margin-bottom: 24px;
          }
          .studio-title {
            font-size: 24px;
            font-weight: 900;
            color: #001f1f;
            letter-spacing: -0.02em;
            margin: 0 0 4px 0;
          }
          .subtitle {
            font-size: 14px;
            color: #64748b;
            margin: 0 0 10px 0;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .meta-row {
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
            font-size: 12px;
            font-weight: 700;
            color: #475569;
          }
          .section-box {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 20px;
          }
          .info-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 6px 0;
            font-size: 13px;
          }
          .info-label {
            color: #64748b;
            font-weight: 600;
          }
          .info-val {
            color: #0f172a;
            font-weight: 700;
          }
          .total-box {
            background: #f8fafc;
            border: 2px solid #cbd5e1;
            border-radius: 12px;
            padding: 18px 22px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 24px;
          }
          .total-label {
            font-size: 13px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #334155;
          }
          .total-amount {
            font-size: 26px;
            font-weight: 900;
            color: #001f1f;
            font-family: ui-monospace, monospace;
          }
        </style>
      </head>
      <body>
        <div class="receipt-card">
          <div class="header">
            <div class="badge">&#10003; Pago Confirmado</div>
            <h1 class="studio-title">PILATES REFORMER STUDIO</h1>
            <p class="subtitle">Comprobante</p>
            <div class="meta-row">
              <span>Fecha: ${pago.payment_date}</span>
            </div>
          </div>

          <div class="section-box">
            <div class="info-row">
              <span class="info-label">Alumna:</span>
              <span class="info-val" style="font-size: 15px; text-transform: capitalize;">${alumnaNombre}</span>
            </div>
            ${alumna?.dni ? `
            <div class="info-row">
              <span class="info-label">DNI:</span>
              <span class="info-val" style="font-family: monospace;">${alumna.dni}</span>
            </div>` : ''}
            ${alumna?.phone ? `
            <div class="info-row">
              <span class="info-label">Teléfono:</span>
              <span class="info-val" style="font-family: monospace;">${alumna.phone}</span>
            </div>` : ''}
          </div>

          <div class="info-row" style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">
            <span class="info-label">Concepto / Detalle:</span>
            <span class="info-val">${pago.concept || 'Mensualidad Pilates Reformer'}</span>
          </div>

          <div class="info-row" style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">
            <span class="info-label">Método de Pago:</span>
            <span class="info-val">${metodoLabel}</span>
          </div>

          ${pago.notes ? `
          <div class="info-row" style="border-bottom: 1px solid #f1f5f9; padding: 10px 0;">
            <span class="info-label">Observaciones:</span>
            <span class="info-val" style="font-style: italic; color: #64748b;">${pago.notes}</span>
          </div>` : ''}

          <div class="total-box">
            <div>
              <span class="total-label">Total Recibido</span>
              <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Moneda de curso legal (ARS)</div>
            </div>
            <span class="total-amount">${montoFormateado}</span>
          </div>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printIframe);
      }, 1000);
    }, 250);
  };

  const handleSendWhatsApp = () => {
    if (!alumna?.phone) return;
    const phoneClean = alumna.phone.replace(/\D/g, '');
    const phoneFormatted = phoneClean.startsWith('54') ? phoneClean : `549${phoneClean}`;

    const textMsg = encodeURIComponent(
      `🧾 *COMPROBANTE DE PAGO — PILATES STUDIO*\n` +
      `-----------------------------------------\n` +
      `👤 *Alumna:* ${alumnaNombre}\n` +
      `📅 *Fecha:* ${pago.payment_date}\n` +
      `📌 *Concepto:* ${pago.concept || 'Mensualidad Pilates Reformer'}\n` +
      `💳 *Medio de Pago:* ${metodoLabel}\n` +
      `💰 *Total Abonado:* ${montoFormateado}\n` +
      `-----------------------------------------\n` +
      `✅ *Estado:* Confirmado e Ingresado\n` +
      `¡Muchas gracias por entrenar con nosotros!`
    );

    window.open(`https://wa.me/${phoneFormatted}?text=${textMsg}`, '_blank');
  };

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-[14px] shadow-2xl p-6 sm:p-8 text-[var(--text-primary)] my-auto">
        {/* Botón Cerrar Superior */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        {/* CONTENEDOR VISTA PREVIA */}
        <div className="space-y-6">
          {/* 1. Header del Comprobante */}
          <div className="text-center border-b border-[var(--border-default)] pb-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-[22px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] uppercase tracking-wider mb-2 border border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pago Confirmado
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
              PILATES REFORMER STUDIO
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 uppercase tracking-wider font-semibold">
              Comprobante
            </p>
            <div className="flex items-center justify-center gap-4 text-xs font-mono font-bold text-[var(--text-secondary)] mt-2">
              <span>Fecha: {pago.payment_date}</span>
            </div>
          </div>

          {/* 2. Cuadrícula de Datos de la Alumna */}
          <div className="bg-[var(--bg-primary)] p-4 rounded-[12px] border border-[var(--border-default)] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Alumna:
              </span>
              <strong className="text-[var(--text-primary)] font-bold capitalize text-sm">
                {alumnaNombre}
              </strong>
            </div>

            {alumna?.dni && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-[var(--text-muted)]" /> DNI:
                </span>
                <span className="font-mono text-[var(--text-primary)] font-semibold">
                  {alumna.dni}
                </span>
              </div>
            )}

            {alumna?.phone && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Teléfono:
                </span>
                <span className="font-mono text-[var(--text-primary)] font-semibold">
                  {alumna.phone}
                </span>
              </div>
            )}
          </div>

          {/* 3. Desglose del Pago */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-[var(--border-default)] pb-2">
              <span className="text-[var(--text-secondary)] font-medium">Concepto / Detalle:</span>
              <strong className="text-[var(--text-primary)] font-bold">
                {pago.concept || 'Mensualidad Pilates Reformer'}
              </strong>
            </div>

            <div className="flex items-center justify-between text-xs border-b border-[var(--border-default)] pb-2">
              <span className="text-[var(--text-secondary)] font-medium flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-[var(--text-muted)]" /> Método de Pago:
              </span>
              <span className="text-[var(--text-primary)] font-semibold capitalize">
                {metodoLabel}
              </span>
            </div>

            {pago.notes && (
              <div className="flex items-start justify-between text-xs border-b border-[var(--border-default)] pb-2">
                <span className="text-[var(--text-secondary)] font-medium">Observaciones:</span>
                <span className="text-[var(--text-secondary)] text-right italic max-w-[240px]">
                  {pago.notes}
                </span>
              </div>
            )}

            {/* Total Destacado */}
            <div className="flex items-center justify-between p-4 rounded-[12px] bg-[var(--bg-primary)] border border-[var(--border-default)] shadow-xs">
              <div>
                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider block">
                  Total Recibido
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                  Moneda de curso legal (ARS)
                </span>
              </div>
              <strong className="text-2xl font-black text-[var(--text-primary)] font-mono tracking-tight">
                {montoFormateado}
              </strong>
            </div>
          </div>
        </div>

        {/* 5. Botones de Acción */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 mt-6 border-t border-[var(--border-default)]">
          <Button
            variant="secondary"
            icon={<Printer className="h-4 w-4" />}
            onClick={handlePrintIsolated}
            className="w-full justify-center"
          >
            Imprimir / Guardar PDF
          </Button>

          <Button
            variant="primary"
            icon={<MessageCircle className="h-4 w-4" />}
            onClick={handleSendWhatsApp}
            disabled={!alumna?.phone}
            className="w-full justify-center bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent"
          >
            Enviar por WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
