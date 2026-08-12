'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import {
  getFinanzasPersonales,
  registrarMovimientoPersonal,
  registrarRetiroEstudio,
  crearCuentaPersonal,
  crearMetaAhorro,
  crearGastoFijo,
  toggleGastoFijoPaid,
  crearDeuda,
  pagarCuotaDeuda,
  guardarPresupuestoCategoria,
  CuentaPersonal,
  MovimientoPersonal,
  PresupuestoPersonal,
  MetaAhorro,
  GastoFijoPersonal,
  DeudaPersonal,
  CATEGORIAS_GASTO_PERSONAL,
  CATEGORIAS_INGRESO_PERSONAL,
} from '@/lib/services/finanzasPersonales';
import {
  WalletCards,
  Wallet,
  Building,
  CreditCard,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  PiggyBank,
  PieChart,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Home,
  Utensils,
  HeartHandshake,
  Car,
  Tv,
  PlusCircle,
  Check,
  Receipt,
  Layers,
} from 'lucide-react';

export default function FinanzasPersonalesPage() {
  const { alert: alertDialog, confirm } = useConfirm();

  const [cuentas, setCuentas] = useState<CuentaPersonal[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoPersonal[]>([]);
  const [presupuestos, setPresupuestos] = useState<PresupuestoPersonal[]>([]);
  const [metas, setMetas] = useState<MetaAhorro[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijoPersonal[]>([]);
  const [deudas, setDeudas] = useState<DeudaPersonal[]>([]);
  const [loading, setLoading] = useState(true);

  // Toggle Ocultar/Mostrar Saldo
  const [showBalance, setShowBalance] = useState(true);

  // Tabs internas
  const [activeTab, setActiveTab] = useState<
    'RESUMEN' | 'CUENTAS' | 'GASTOS_DEUDAS' | 'PRESUPUESTOS_METAS' | 'HISTORIAL'
  >('RESUMEN');

  // Modales
  const [isRetiroModalOpen, setIsRetiroModalOpen] = useState(false);
  const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
  const [isCuentaModalOpen, setIsCuentaModalOpen] = useState(false);
  const [isGastoFijoModalOpen, setIsGastoFijoModalOpen] = useState(false);
  const [isDeudaModalOpen, setIsDeudaModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);

  // Form Movimiento
  const [tipoMovimiento, setTipoMovimiento] = useState<'INGRESO' | 'GASTO'>('GASTO');
  const [categoriaMovimiento, setCategoriaMovimiento] = useState('casa');
  const [montoMovimiento, setMontoMovimiento] = useState('');
  const [cuentaIdMovimiento, setCuentaIdMovimiento] = useState('');
  const [notasMovimiento, setNotasMovimiento] = useState('');
  const [submittingMovimiento, setSubmittingMovimiento] = useState(false);

  // Form Retiro
  const [montoRetiro, setMontoRetiro] = useState('');
  const [notasRetiro, setNotasRetiro] = useState('');
  const [submittingRetiro, setSubmittingRetiro] = useState(false);

  // Form Cuenta
  const [nombreCuenta, setNombreCuenta] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('efectivo');
  const [saldoCuenta, setSaldoCuenta] = useState('');

  // Form Gasto Fijo
  const [nombreGastoFijo, setNombreGastoFijo] = useState('');
  const [categoriaGastoFijo, setCategoriaGastoFijo] = useState('casa');
  const [montoGastoFijo, setMontoGastoFijo] = useState('');
  const [diaGastoFijo, setDiaGastoFijo] = useState('10');

  // Form Deuda
  const [nombreDeuda, setNombreDeuda] = useState('');
  const [montoTotalDeuda, setMontoTotalDeuda] = useState('');
  const [cuotasDeuda, setCuotasDeuda] = useState('12');
  const [cuotaMensualDeuda, setCuotaMensualDeuda] = useState('');

  // Form Meta
  const [nombreMeta, setNombreMeta] = useState('');
  const [montoMeta, setMontoMeta] = useState('');
  const [actualMeta, setActualMeta] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await getFinanzasPersonales();
    setCuentas(data.cuentas);
    setMovimientos(data.movimientos);
    setPresupuestos(data.presupuestos);
    setMetas(data.metas);
    setGastosFijos(data.gastosFijos);
    setDeudas(data.deudas);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler Retiro del Studio
  const handleConfirmRetiro = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(montoRetiro);
    if (isNaN(amountNum) || amountNum <= 0) {
      await alertDialog({
        title: 'Monto inválido',
        message: 'Por favor ingresa un monto válido mayor a 0.',
        variant: 'warning',
      });
      return;
    }

    setSubmittingRetiro(true);
    await registrarRetiroEstudio({
      amount: amountNum,
      notes: notasRetiro,
    });
    setSubmittingRetiro(false);

    await alertDialog({
      title: 'Retiro Registrado',
      message: `Retiro de $${amountNum.toLocaleString()} ARS del estudio registrado como ingreso en Finanzas Personales (sin afectar gastos operativos del estudio).`,
      variant: 'success',
    });

    setIsRetiroModalOpen(false);
    setMontoRetiro('');
    setNotasRetiro('');
    loadData();
  };

  // Handler Movimiento
  const handleConfirmMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(montoMovimiento);
    if (isNaN(amountNum) || amountNum <= 0) {
      await alertDialog({ title: 'Monto inválido', message: 'Ingresa un monto mayor a 0', variant: 'warning' });
      return;
    }

    setSubmittingMovimiento(true);
    await registrarMovimientoPersonal({
      type: tipoMovimiento,
      category: categoriaMovimiento,
      amount: amountNum,
      account_id: cuentaIdMovimiento,
      notes: notasMovimiento,
    });
    setSubmittingMovimiento(false);

    setIsMovimientoModalOpen(false);
    setMontoMovimiento('');
    setNotasMovimiento('');
    loadData();
  };

  // Handler Crear Cuenta
  const handleConfirmCuenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCuenta) return;
    await crearCuentaPersonal({
      name: nombreCuenta,
      account_type: tipoCuenta,
      balance: parseFloat(saldoCuenta) || 0,
    });
    setIsCuentaModalOpen(false);
    setNombreCuenta('');
    setSaldoCuenta('');
    loadData();
  };

  // Handler Crear Gasto Fijo
  const handleConfirmGastoFijo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreGastoFijo || !montoGastoFijo) return;
    await crearGastoFijo({
      name: nombreGastoFijo,
      category: categoriaGastoFijo,
      amount: parseFloat(montoGastoFijo),
      due_day: parseInt(diaGastoFijo) || 10,
    });
    setIsGastoFijoModalOpen(false);
    setNombreGastoFijo('');
    setMontoGastoFijo('');
    loadData();
  };

  // Handler Toggle Gasto Fijo Paid
  const handleToggleGastoFijo = async (g: GastoFijoPersonal) => {
    await toggleGastoFijoPaid(g.id, g.is_paid);
    loadData();
  };

  // Handler Crear Deuda
  const handleConfirmDeuda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreDeuda || !montoTotalDeuda) return;
    await crearDeuda({
      name: nombreDeuda,
      total_amount: parseFloat(montoTotalDeuda),
      total_installments: parseInt(cuotasDeuda) || 1,
      monthly_installment_amount: parseFloat(cuotaMensualDeuda) || (parseFloat(montoTotalDeuda) / (parseInt(cuotasDeuda) || 1)),
    });
    setIsDeudaModalOpen(false);
    setNombreDeuda('');
    setMontoTotalDeuda('');
    setCuotaMensualDeuda('');
    loadData();
  };

  // Handler Pagar Cuota
  const handlePagarCuota = async (d: DeudaPersonal) => {
    await pagarCuotaDeuda(d);
    loadData();
  };

  // Handler Crear Meta
  const handleConfirmMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreMeta || !montoMeta) return;
    await crearMetaAhorro({
      name: nombreMeta,
      target_amount: parseFloat(montoMeta),
      current_amount: parseFloat(actualMeta) || 0,
    });
    setIsMetaModalOpen(false);
    setNombreMeta('');
    setMontoMeta('');
    setActualMeta('');
    loadData();
  };

  // Cálculos de Resumen
  const mesActualISO = new Date().toISOString().slice(0, 7);
  const movsMesActual = movimientos.filter((m) => m.date.startsWith(mesActualISO));

  const totalIngresos = movsMesActual
    .filter((m) => m.type === 'INGRESO')
    .reduce((acc, m) => acc + m.amount, 0);

  const totalGastos = movsMesActual
    .filter((m) => m.type === 'GASTO')
    .reduce((acc, m) => acc + m.amount, 0);

  const remanentePersonal = totalIngresos - totalGastos;
  const saldoTotalCuentas = cuentas.reduce((acc, c) => acc + c.balance, 0);

  // Gastos por categoría para gráficos y presupuesto
  const gastosPorCategoria: Record<string, number> = {};
  movsMesActual
    .filter((m) => m.type === 'GASTO')
    .forEach((m) => {
      gastosPorCategoria[m.category] = (gastosPorCategoria[m.category] || 0) + m.amount;
    });

  const getIconoCategoria = (cat: string) => {
    switch (cat) {
      case 'casa': return <Home className="h-4 w-4 text-blue-500" />;
      case 'comida': return <Utensils className="h-4 w-4 text-amber-500" />;
      case 'familia': return <HeartHandshake className="h-4 w-4 text-rose-500" />;
      case 'transporte': return <Car className="h-4 w-4 text-emerald-500" />;
      case 'ocio': return <Tv className="h-4 w-4 text-purple-500" />;
      default: return <Wallet className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-16 text-[var(--text-primary)] max-w-6xl mx-auto">
      {/* Cabecera Estilo Mercado Pago */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                Finanzas Personales
              </span>
              <span className="text-blue-200 text-xs font-semibold">&bull; Privado</span>
            </div>

            <div className="mt-3 flex items-center gap-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight">
                {showBalance ? `$${saldoTotalCuentas.toLocaleString()} ARS` : '••••••••••'}
              </h2>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                title={showBalance ? 'Ocultar saldo' : 'Mostrar saldo'}
              >
                {showBalance ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-blue-200 mt-1 font-medium">
              Dinero total en todas las cuentas y billeteras
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setIsRetiroModalOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md border-0"
              icon={<ArrowDownLeft className="h-4 w-4" />}
            >
              Registrar Retiro del negocio
            </Button>
            <Button
              onClick={() => {
                setTipoMovimiento('GASTO');
                setIsMovimientoModalOpen(true);
              }}
              className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-xs border-0"
              icon={<Plus className="h-4 w-4" />}
            >
              Registrar Movimiento
            </Button>
          </div>
        </div>

        {/* Accesos Rápidos Estilo Mercado Pago Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 relative z-10">
          <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase font-bold block">Ingresos Mes</span>
              <span className="text-sm font-black font-mono">
                {showBalance ? `$${totalIngresos.toLocaleString()}` : '••••'}
              </span>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase font-bold block">Gastos Mes</span>
              <span className="text-sm font-black font-mono">
                {showBalance ? `$${totalGastos.toLocaleString()}` : '••••'}
              </span>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-xl bg-indigo-400/20 text-indigo-300 flex items-center justify-center font-bold">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase font-bold block">Remanente</span>
              <span className="text-sm font-black font-mono">
                {showBalance ? `$${remanentePersonal.toLocaleString()}` : '••••'}
              </span>
            </div>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 flex items-center gap-3 backdrop-blur-xs">
            <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
              <PiggyBank className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] text-blue-200 uppercase font-bold block">Cuentas</span>
              <span className="text-sm font-black font-mono">{cuentas.length} Activas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pestañas Principales de Finanzas Personales */}
      <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] p-1.5 rounded-2xl border border-[var(--border-default)] w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('RESUMEN')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'RESUMEN'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <WalletCards className="h-4 w-4" /> Resumen Financiero
        </button>

        <button
          onClick={() => setActiveTab('CUENTAS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'CUENTAS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Wallet className="h-4 w-4" /> Cuentas &amp; Billeteras ({cuentas.length})
        </button>

        <button
          onClick={() => setActiveTab('GASTOS_DEUDAS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'GASTOS_DEUDAS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Receipt className="h-4 w-4" /> Gastos Fijos &amp; Deudas
        </button>

        <button
          onClick={() => setActiveTab('PRESUPUESTOS_METAS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'PRESUPUESTOS_METAS'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <PiggyBank className="h-4 w-4" /> Presupuestos &amp; Metas
        </button>

        <button
          onClick={() => setActiveTab('HISTORIAL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'HISTORIAL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Calendar className="h-4 w-4" /> Movimientos ({movimientos.length})
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-[var(--text-muted)]">Cargando módulo de Finanzas Personales...</p>
        </div>
      ) : activeTab === 'RESUMEN' ? (
        /* Pestaña 1: Resumen General Mercado Pago */
        <div className="flex flex-col gap-6">
          {/* Fila 2 Columnas: Distribución de Gastos por Categoría + Mis Metas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gastos por Categoría */}
            <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <PieChart className="h-5 w-5 text-blue-500" /> Gastos del Mes por Categoría
              </h3>

              {Object.keys(gastosPorCategoria).length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                  No hay gastos registrados en el mes actual.
                </p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(gastosPorCategoria).map(([cat, amount]) => {
                    const pct = totalGastos > 0 ? Math.round((amount / totalGastos) * 100) : 0;

                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="flex items-center gap-2 capitalize">
                            {getIconoCategoria(cat)} {cat}
                          </span>
                          <span>
                            ${amount.toLocaleString()} ARS ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Metas de Ahorro Resumen */}
            <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <PiggyBank className="h-5 w-5 text-purple-500" /> Metas de Ahorro
                </h3>
                <button
                  onClick={() => setIsMetaModalOpen(true)}
                  className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Nueva Meta
                </button>
              </div>

              {metas.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                  No hay metas creadas aún.
                </p>
              ) : (
                <div className="space-y-4">
                  {metas.map((m) => {
                    const pct = Math.min(100, Math.round((m.current_amount / m.target_amount) * 100));

                    return (
                      <div key={m.id} className="space-y-1.5 p-3 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-default)]">
                        <div className="flex justify-between text-xs font-bold">
                          <span>{m.name}</span>
                          <span className="text-purple-600 dark:text-purple-400">
                            ${m.current_amount.toLocaleString()} / ${m.target_amount.toLocaleString()} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Últimos Movimientos Rápidos */}
          <Card className="p-6 border border-[var(--border-default)] shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Últimos Movimientos Registrados
              </h3>
              <button
                onClick={() => setActiveTab('HISTORIAL')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Ver todos
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold">Fecha</th>
                    <th className="py-3 px-4 font-semibold">Tipo</th>
                    <th className="py-3 px-4 font-semibold">Categoría</th>
                    <th className="py-3 px-4 font-semibold">Monto</th>
                    <th className="py-3 px-4 font-semibold">Detalle / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                  {movimientos.slice(0, 6).map((m) => (
                    <tr key={m.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                      <td className="py-3 px-4 font-mono">{m.date}</td>
                      <td className="py-3 px-4">
                        {m.type === 'INGRESO' ? (
                          <Badge variant="success">INGRESO</Badge>
                        ) : (
                          <Badge variant="danger">GASTO</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold uppercase text-[10px]">
                        {m.is_business_withdrawal ? (
                          <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-extrabold">
                            Retiro del Studio
                          </span>
                        ) : (
                          m.category
                        )}
                      </td>
                      <td className={`py-3 px-4 font-mono font-bold ${m.type === 'INGRESO' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                        {m.type === 'INGRESO' ? '+' : '-'}${m.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-[var(--text-secondary)]">{m.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : activeTab === 'CUENTAS' ? (
        /* Pestaña 2: Cuentas y Billeteras */
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Mis Cuentas &amp; Billeteras</h3>
              <p className="text-xs text-[var(--text-muted)]">Cuentas bancarias, efectivo y billeteras virtuales.</p>
            </div>
            <Button onClick={() => setIsCuentaModalOpen(true)} icon={<Plus className="h-4 w-4" />}>
              Nueva Cuenta
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {cuentas.map((c) => (
              <Card key={c.id} className="p-5 border border-[var(--border-default)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded">
                    {c.account_type}
                  </span>
                  <Wallet className="h-5 w-5 text-[var(--text-muted)]" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[var(--text-primary)]">{c.name}</p>
                  <p className="text-2xl font-black font-mono text-[var(--text-primary)] mt-1">
                    {showBalance ? `$${c.balance.toLocaleString()} ARS` : '••••••••'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : activeTab === 'GASTOS_DEUDAS' ? (
        /* Pestaña 3: Gastos Fijos y Deudas/Cuotas */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gastos Fijos */}
          <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Receipt className="h-5 w-5 text-rose-500" /> Gastos Fijos Mensuales
              </h3>
              <Button size="sm" onClick={() => setIsGastoFijoModalOpen(true)} icon={<Plus className="h-3.5 w-3.5" />}>
                Nuevo Gasto Fijo
              </Button>
            </div>

            {gastosFijos.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">No hay gastos fijos configurados.</p>
            ) : (
              <div className="divide-y divide-[var(--border-default)]">
                {gastosFijos.map((g) => (
                  <div key={g.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{g.name}</p>
                      <span className="text-[10px] text-[var(--text-muted)]">Vence día {g.due_day} de cada mes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold">${g.amount.toLocaleString()}</span>
                      <button
                        onClick={() => handleToggleGastoFijo(g)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold cursor-pointer transition-all ${
                          g.is_paid
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {g.is_paid ? 'Pagado' : 'Pendiente'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Deudas y Cuotas */}
          <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-500" /> Control de Deudas &amp; Cuotas
              </h3>
              <Button size="sm" onClick={() => setIsDeudaModalOpen(true)} icon={<Plus className="h-3.5 w-3.5" />}>
                Nueva Deuda
              </Button>
            </div>

            {deudas.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">No hay deudas o cuotas registradas.</p>
            ) : (
              <div className="space-y-4">
                {deudas.map((d) => {
                  const pct = Math.min(100, Math.round((d.paid_installments / d.total_installments) * 100));

                  return (
                    <div key={d.id} className="p-4 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-default)] space-y-2">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span>{d.name}</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400">
                          Cuota ${d.monthly_installment_amount.toLocaleString()}/mes
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-[var(--text-muted)] font-medium">
                        <span>
                          Cuotas: {d.paid_installments} de {d.total_installments} ({pct}%)
                        </span>
                        <span>Abonado: ${d.paid_amount.toLocaleString()} / ${d.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      {d.paid_installments < d.total_installments && (
                        <button
                          onClick={() => handlePagarCuota(d)}
                          className="mt-2 w-full py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all cursor-pointer"
                        >
                          Registrar Pago de Cuota
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      ) : activeTab === 'PRESUPUESTOS_METAS' ? (
        /* Pestaña 4: Presupuestos & Metas */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Presupuestos por Categoría */}
          <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <PieChart className="h-5 w-5 text-blue-500" /> Presupuesto Mensual por Categoría
            </h3>

            <div className="space-y-4">
              {CATEGORIAS_GASTO_PERSONAL.map((cat) => {
                const gastado = gastosPorCategoria[cat.value] || 0;
                const pres = presupuestos.find((p) => p.category === cat.value);
                const limite = pres ? pres.monthly_limit : 0;
                const pct = limite > 0 ? Math.min(100, Math.round((gastado / limite) * 100)) : 0;

                return (
                  <div key={cat.value} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-1.5">{getIconoCategoria(cat.value)} {cat.label}</span>
                      <span className="font-mono">
                        ${gastado.toLocaleString()} {limite > 0 ? `/ $${limite.toLocaleString()}` : ''}
                      </span>
                    </div>
                    {limite > 0 && (
                      <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${pct > 90 ? 'bg-rose-500' : 'bg-blue-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Metas de Ahorro */}
          <Card className="p-6 border border-[var(--border-default)] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-purple-500" /> Metas de Ahorro
              </h3>
              <Button size="sm" onClick={() => setIsMetaModalOpen(true)} icon={<Plus className="h-3.5 w-3.5" />}>
                Nueva Meta
              </Button>
            </div>

            <div className="space-y-4">
              {metas.map((m) => {
                const pct = Math.min(100, Math.round((m.current_amount / m.target_amount) * 100));

                return (
                  <div key={m.id} className="p-4 rounded-xl bg-[var(--bg-tertiary)]/60 border border-[var(--border-default)] space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span>{m.name}</span>
                      <span className="text-purple-600 dark:text-purple-400 font-mono">
                        ${m.current_amount.toLocaleString()} / ${m.target_amount.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                      <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        /* Pestaña 5: Historial Completo de Movimientos */
        <Card className="p-6 border border-[var(--border-default)] shadow-xs">
          <h3 className="text-base font-bold text-[var(--text-primary)] mb-4">
            Historial de Movimientos Personales
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="py-3 px-4 font-semibold">Fecha</th>
                  <th className="py-3 px-4 font-semibold">Tipo</th>
                  <th className="py-3 px-4 font-semibold">Categoría</th>
                  <th className="py-3 px-4 font-semibold">Monto</th>
                  <th className="py-3 px-4 font-semibold">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-default)] text-[var(--text-primary)]">
                {movimientos.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono">{m.date}</td>
                    <td className="py-3.5 px-4">
                      {m.type === 'INGRESO' ? (
                        <Badge variant="success">INGRESO</Badge>
                      ) : (
                        <Badge variant="danger">GASTO</Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold uppercase text-[10px]">
                      {m.is_business_withdrawal ? (
                        <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-extrabold">
                          Retiro del Studio
                        </span>
                      ) : (
                        m.category
                      )}
                    </td>
                    <td className={`py-3.5 px-4 font-mono font-bold ${m.type === 'INGRESO' ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                      {m.type === 'INGRESO' ? '+' : '-'}${m.amount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">{m.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODALES */}
      {/* Modal Retiro del Studio */}
      {isRetiroModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-emerald-500" /> Registrar Retiro del Studio
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Este retiro ingresa como dividendo a tus Finanzas Personales sin alterar los gastos del estudio.
            </p>

            <form onSubmit={handleConfirmRetiro} className="space-y-4">
              <Input
                label="Monto a retirar ($ ARS) *"
                type="number"
                value={montoRetiro}
                onChange={(e) => setMontoRetiro(e.target.value)}
                required
              />
              <Input
                label="Notas u observaciones"
                placeholder="Ej: Retiro quincenal de ganancias"
                value={notasRetiro}
                onChange={(e) => setNotasRetiro(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsRetiroModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={submittingRetiro} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                  Confirmar Retiro
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Movimiento */}
      {isMovimientoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Registrar Movimiento Personal</h3>

            <form onSubmit={handleConfirmMovimiento} className="space-y-4">
              <div>
                <label className="text-xs font-semibold block mb-1">Tipo</label>
                <select
                  value={tipoMovimiento}
                  onChange={(e: any) => setTipoMovimiento(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-bold"
                >
                  <option value="GASTO">Gasto Personal</option>
                  <option value="INGRESO">Ingreso Personal</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1">Categoría</label>
                <select
                  value={categoriaMovimiento}
                  onChange={(e) => setCategoriaMovimiento(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-bold"
                >
                  {tipoMovimiento === 'GASTO'
                    ? CATEGORIAS_GASTO_PERSONAL.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)
                    : CATEGORIAS_INGRESO_PERSONAL.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <Input
                label="Monto ($ ARS) *"
                type="number"
                value={montoMovimiento}
                onChange={(e) => setMontoMovimiento(e.target.value)}
                required
              />

              <Input
                label="Notas / Detalle"
                value={notasMovimiento}
                onChange={(e) => setNotasMovimiento(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsMovimientoModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" loading={submittingMovimiento} className="bg-blue-600 text-white font-bold">
                  Guardar Movimiento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Cuenta */}
      {isCuentaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Nueva Cuenta o Billetera</h3>
            <form onSubmit={handleConfirmCuenta} className="space-y-4">
              <Input label="Nombre de la cuenta *" value={nombreCuenta} onChange={(e) => setNombreCuenta(e.target.value)} required />
              <div>
                <label className="text-xs font-semibold block mb-1">Tipo de cuenta</label>
                <select value={tipoCuenta} onChange={(e) => setTipoCuenta(e.target.value)} className="w-full h-10 px-3 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)] text-xs font-bold">
                  <option value="efectivo">Efectivo</option>
                  <option value="banco">Banco / CBU</option>
                  <option value="billetera">Billetera Virtual</option>
                </select>
              </div>
              <Input label="Saldo inicial ($ ARS)" type="number" value={saldoCuenta} onChange={(e) => setSaldoCuenta(e.target.value)} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsCuentaModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 text-white font-bold">Crear Cuenta</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Gasto Fijo */}
      {isGastoFijoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Nuevo Gasto Fijo Mensual</h3>
            <form onSubmit={handleConfirmGastoFijo} className="space-y-4">
              <Input label="Nombre del gasto / servicio *" value={nombreGastoFijo} onChange={(e) => setNombreGastoFijo(e.target.value)} required />
              <Input label="Monto mensual ($ ARS) *" type="number" value={montoGastoFijo} onChange={(e) => setMontoGastoFijo(e.target.value)} required />
              <Input label="Día de vencimiento (1 al 31)" type="number" value={diaGastoFijo} onChange={(e) => setDiaGastoFijo(e.target.value)} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsGastoFijoModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-blue-600 text-white font-bold">Guardar Gasto Fijo</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Deuda */}
      {isDeudaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Nueva Deuda o Compra en Cuotas</h3>
            <form onSubmit={handleConfirmDeuda} className="space-y-4">
              <Input label="Nombre o concepto *" value={nombreDeuda} onChange={(e) => setNombreDeuda(e.target.value)} required />
              <Input label="Monto Total ($ ARS) *" type="number" value={montoTotalDeuda} onChange={(e) => setMontoTotalDeuda(e.target.value)} required />
              <Input label="Cantidad de cuotas *" type="number" value={cuotasDeuda} onChange={(e) => setCuotasDeuda(e.target.value)} required />
              <Input label="Monto cuota mensual ($ ARS)" type="number" value={cuotaMensualDeuda} onChange={(e) => setCuotaMensualDeuda(e.target.value)} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsDeudaModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-indigo-600 text-white font-bold">Guardar Deuda</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Meta */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[var(--text-primary)]">Nueva Meta de Ahorro</h3>
            <form onSubmit={handleConfirmMeta} className="space-y-4">
              <Input label="Nombre de la meta *" value={nombreMeta} onChange={(e) => setNombreMeta(e.target.value)} required />
              <Input label="Monto objetivo ($ ARS) *" type="number" value={montoMeta} onChange={(e) => setMontoMeta(e.target.value)} required />
              <Input label="Monto ahorrado actual ($ ARS)" type="number" value={actualMeta} onChange={(e) => setActualMeta(e.target.value)} />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsMetaModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-purple-600 text-white font-bold">Guardar Meta</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
