# Especificaciones Técnicas y Requerimientos de Negocio: Pilates Studio LR

Este documento contiene toda la información técnica, funcional, reglas de negocio y modelo de datos extraído del sistema actual **Pilates Studio LR**. Está diseñado para servir como fuente de verdad y prompt de contexto para ser entregado a la IA que construirá la nueva versión del sistema con una arquitectura limpia.

---

## 🤖 Prompt Recomendado para Copiar en la Nueva IA

```text
Actúa como un Desarrollador Senior de Software y Arquitecto de Sistemas. Estoy reconstruyendo la aplicación "Pilates Studio LR" desde cero utilizando Clean Architecture (Capa de Dominio, Casos de Uso/Aplicación, Repositorios/Infraestructura y Presentación).

Te adjunto a continuación la documentación completa con los requerimientos, modelo de datos, flujos de trabajo y reglas de negocio del sistema anterior. 

Por favor, lee detalladamente esta especificación antes de escribir código. Tu objetivo es ayudarme a estructurar el proyecto con principios SOLID, separación de responsabilidades, tipado estricto, gestión de estado limpia y seguridad adecuada.
```

---

## 1. 📋 Resumen del Sistema y Contexto de Negocio

**Pilates Studio LR** es una plataforma de gestión integral para un centro de Pilates que opera bajo un modelo **multisede**:
1. **Sede 1 - Zona Norte**: Capacidad de **6 camillas** por horario.
2. **Sede 2 - Zona Centro**: Capacidad de **4 camillas** por horario.

### Roles de Usuario:
- **Administrador (`admin`)**: Acceso total al sistema. Puede alternar entre sedes, gestionar usuarios, profesoras, caja diaria, liquidación de haberes, ver pagos, generar reportes y modificar la agenda/alumnas.
- **Profesor/a (`profe`)**: Acceso restringido a su sede asignada. Además, tiene filtrados los días (`dias_trabajo`) y horas (`horas_trabajo`) según su turno. Solo puede tomar asistencia, consultar la agenda de su horario y ver el listado de alumnas.

---

## 2. 📊 Clasificación de Datos: Estáticos vs. Dinámicos

### 🔒 Datos Fijos / Constantes (Configurados en Aplicación)
Son reglas y listas maestras prefijadas en la lógica del sistema:
- **Sedes y Capacidad**:
  - `Sede 1 (Zona Norte)`: 6 camillas (Camillas 1 a 6).
  - `Sede 2 (Zona Centro)`: 4 camillas (Camillas 1 a 4).
- **Días Laborables para Agenda Fija**: Lunes a Viernes (`["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"]`).
- **Grilla Horaria Estándar**:
  - Turno Mañana: `07:00`, `08:00`, `09:00`, `10:00`, `11:00`
  - Turno Tarde/Noche: `15:00`, `16:00`, `17:00`, `18:00`, `19:00`, `20:00`, `21:00`
- **Categorías de Caja**:
  - *Ingresos*: Venta, Clase especial, Alquiler de espacio, Otro ingreso.
  - *Egresos*: Alquiler, Luz, Agua, Internet, Sueldos, Honorarios profesionales, Materiales, Equipamiento, Mantenimiento, Limpieza, Impuestos, Publicidad, Otro egreso.
- **Métodos de Pago**: Efectivo, Transferencia, Mercado Pago, Tarjeta, Otro.
- **Estados de Asistencia y Código de Color**:
  - `Presente`: Fondo verde (`#bbf7d0`), Borde verde (`#22c55e`), Texto verde oscuro (`#166534`).
  - `Ausente`: Fondo rojo (`#fecaca`), Borde rojo (`#ef4444`), Texto rojo oscuro (`#991b1b`).
  - `Recupera`: Fondo amarillo (`#fef3c7`), Borde naranja (`#f59e0b`), Texto café (`#92400e`).
  - `Suspendida`: Fondo azul (`#dbeafe`), Borde azul (`#3b82f6`), Texto azul oscuro (`#1e40af`).
- **Valores por Defecto de Negocio**:
  - Monto de Inscripción/Matrícula sugerido por defecto: `$9.500 ARS`.

### 🔄 Datos Dinámicos (Persistidos y Modificables en Base de Datos)
Son entidades dinámicas gestionadas vía CRUD en Supabase:
- **Alumnas**: Ficha personal, contacto, historial de salud, estado de membresía, vencimientos.
- **Reservas / Turnos Fijos**: Asignación de días/horas/camillas semanales de cada alumna.
- **Asistencias**: Registro diario de presencia/ausencia por fecha.
- **Recuperaciones**: Solicitudes y turnos temporales para recuperar clases perdidas.
- **Pagos**: Registro de cuotas cobradas (mensualidades, matrícula, clases sueltas).
- **Cuotas**: Control de mensualidades generadas y vencimientos por período.
- **Caja**: Movimientos contables de egresos e ingresos adicionales.
- **Profesoras**: Perfil de instructoras, vinculación con alumnas y cálculo de honorarios.
- **Usuarios**: Cuentas de acceso, contraseñas, roles y asignación de horarios de trabajo.

---

## 3. 🗄️ Esquema de Base de Datos (Supabase / PostgreSQL)

### 1. Tabla `usuarios`
| Campo | Tipo | Descripción / Restricción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `nombre` | text | Nombre completo del usuario |
| `usuario` | text | Username de login (único, minúsculas) |
| `password` | text | Contraseña |
| `rol` | text | `'admin'` o `'profe'` |
| `sede_id` | integer | `1` (Zona Norte) o `2` (Zona Centro) |
| `activo` | boolean | `true` si está activo, `false` si está suspendido |
| `dias_trabajo` | jsonb / array | Ej: `["Lunes", "Miércoles"]` (Solo aplicable si `rol === 'profe'`) |
| `horas_trabajo`| jsonb / array | Ej: `["08:00", "09:00"]` (Solo aplicable si `rol === 'profe'`) |

### 2. Tabla `alumnas`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `nombre` | text | Nombre de la alumna |
| `apellido` | text | Apellido |
| `dni` | text | Documento de identidad |
| `telefono` | text | Formato normalizado con código de país (`54...`) |
| `email` | text | Correo electrónico |
| `direccion` | text | Domicilio |
| `fecha_nacimiento` | date | Fecha de nacimiento |
| `contacto_emergencia` | text | Nombre del contacto de emergencia |
| `telefono_emergencia` | text | Teléfono de emergencia |
| `fecha_ingreso` | date | Fecha de alta en el estudio |
| `fecha_inicio` | date | Fecha inicio del ciclo abonado |
| `fecha_vencimiento` | date | Fecha fin del ciclo abonado (generalmente +1 mes) |
| `plan` | text | Nombre o tipo de plan (Ej: "2 veces por semana") |
| `importe_plan` | numeric | Costo mensual del plan |
| `inscripcion_pagada` | boolean | Indica si pagó la matrícula |
| `monto_inscripcion` | numeric | Monto pagado de inscripción |
| `mensualidad_pagada`| boolean | Estado del mes actual |
| `metodo_pago` | text | Método de pago habitual |
| `estado` | text | `'Activa'`, `'Inactiva'`, `'Pausada'` |
| `apto_fisico` | boolean | Presentó certificado médico |
| `lesiones` | text | Detalle de lesiones declaradas |
| `enfermedades` | text | Diagnósticos o condiciones de salud |
| `cirugias` | text | Historial quirúrgico |
| `embarazo` | boolean | Indica si cursa embarazo |
| `observaciones_salud`| text | Notas médicas/posturales adicionales |
| `observaciones` | text | Notas generales de gestión |
| `sede_id` | integer | Sede a la que pertenece |
| `profesora_id` | bigint | ID del profesor asignado para liquidaciones |

### 3. Tabla `reservas` (Turnos Fijos Semanales)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `alumna_id` | bigint | Foreign Key -> `alumnas.id` |
| `nombre` | text | Nombre de la alumna (denormalizado para velocidad) |
| `apellido` | text | Apellido de la alumna |
| `telefono` | text | Teléfono para WhatsApp |
| `sede_id` | integer | Sede del turno (`1` o `2`) |
| `dia` | text | `'Lunes'`, `'Martes'`, `'Miércoles'`, `'Jueves'`, `'Viernes'` |
| `hora` | text | Ej: `'09:00'`, `'18:00'` |
| `camilla` | integer | Número de camilla ocupada (`1` a `6` o `1` a `4`) |
| `observaciones` | text | Observaciones del turno |

### 4. Tabla `asistencias` (Registro Diario)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `alumna_id` | bigint | Foreign Key -> `alumnas.id` |
| `reserva_id` | bigint | Foreign Key -> `reservas.id` (Opcional si es recupero) |
| `sede_id` | integer | Sede de la clase |
| `fecha` | date | Fecha exacta (YYYY-MM-DD) |
| `dia` | text | Día de la semana |
| `hora` | text | Hora del turno |
| `estado` | text | `'Presente'`, `'Ausente'`, `'Recupera'`, `'Suspendida'` |
| `observaciones` | text | Comentarios de la clase |

### 5. Tabla `recuperaciones` (Clases de Recuperación)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `alumna_id` | bigint | Foreign Key -> `alumnas.id` |
| `reserva_id` | bigint | Turno original que faltó |
| `sede_id` | integer | Sede donde recupera |
| `fecha_original` | date | Fecha de la falta |
| `fecha_recuperacion`| date | Fecha programada para el recupero |
| `hora` | text | Hora acordada |
| `camilla` | integer | Camilla asignada para el recupero |
| `observaciones` | text | Notas del recupero |

### 6. Tabla `pagos`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `alumna_id` | bigint | Foreign Key -> `alumnas.id` |
| `monto` | numeric | Importe cobrado |
| `fecha_pago` | date | Fecha en que se efectuó el pago |
| `metodo_pago` | text | `'Efectivo'`, `'Transferencia'`, etc. |
| `plan` | text | Nombre del plan abonado |
| `mes` | text | Período abonado (Formato `YYYY-MM`) |
| `tipo` | text | `'Mensualidad'`, `'Inscripción'`, `'Clase suelta'` |
| `observaciones` | text | Detalle adicional |
| `sede_id` | integer | Sede del cobro |

### 7. Tabla `cuotas`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `alumna_id` | bigint | Foreign Key -> `alumnas.id` |
| `mes` | integer | Mes del ciclo (1-12) |
| `anio` | integer | Año del ciclo |
| `monto` | numeric | Importe de la cuota |
| `fecha_vencimiento` | date | Fecha de vencimiento asignada |
| `estado` | text | `'Pendiente'`, `'Pagado'`, `'Vencido'` |

### 8. Tabla `caja` (Libro Contable de la Sede)
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `sede_id` | integer | Sede del movimiento |
| `tipo` | text | `'Ingreso'` o `'Egreso'` |
| `categoria` | text | Categoría según maestros de caja |
| `monto` | numeric | Importe monetario |
| `metodo_pago` | text | Medio de pago involucrado |
| `fecha` | date | Fecha del comprobante/movimiento |
| `descripcion` | text | Descripción del concepto |
| `observaciones` | text | Notas internas |
| `created_at` | timestamp | Timestamp de creación |

### 9. Tabla `profesores`
| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | bigint / uuid | Primary Key |
| `nombre` | text | Nombre de la profesora |
| `apellido` | text | Apellido |
| `dni` | text | DNI |
| `telefono` | text | Teléfono |
| `email` | text | Correo electrónico |
| `sede_id` | integer | Sede principal |
| `estado` | text | `'Activa'`, `'Inactiva'` |
| `valor_hora` | numeric | Honorario pactado por hora o comisión |

---

## 4. 🔄 Flujos de Trabajo de Negocio (Business Workflows)

### Flujo 1: Autenticación y Control de Navegación
1. El usuario ingresa `usuario` y `contraseña`.
2. El sistema valida contra la base de datos y verifica que `activo === true`.
3. Si el usuario es `profe`, se le asigna su `sede_id` por defecto y se bloquean las opciones administrativas.
4. Si es `admin`, puede cambiar libremente entre Sede 1 y Sede 2 mediante un desplegable en la cabecera.

### Flujo 2: Alta de Alumna y Asignación de Turnos Semanales
1. Se completa el formulario de la alumna: datos personales, contacto de emergencia, ficha médica (lesiones, apto físico, embarazo).
2. Se selecciona el **Plan**, el **Profesor/a** a cargo y la fecha de inicio/vencimiento.
3. Se seleccionan los **Turnos fijos de la semana** (Día + Hora + Camilla). 
   - *Regla de Validación*: El sistema debe comprobar que la camilla seleccionada no esté ya reservada por otra alumna activa en ese mismo día y hora para la misma sede.
4. Se registra opcionalmente la **Matrícula / Inscripción** y la **Primera Mensualidad**. Esto genera automáticamente registros en la tabla `pagos` e ingresa el dinero a la `caja`.

### Flujo 3: Gestión de Agenda Diaria y Toma de Asistencia
1. El usuario (Admin o Profe) ingresa al módulo **Agenda**.
2. Filtra por día/fecha.
3. Se muestra una grilla de turnos (Filas = Horarios `07:00` a `21:00`, Columnas = Camillas `1` a `6` o `1` a `4`).
4. Para cada turno ocupado, se visualiza el nombre de la alumna y su estado de asistencia del día.
5. El profesor puede marcar:
   - **Presente**: Se registra la asistencia.
   - **Ausente**: Marca la inasistencia. La alumna queda habilitada para un posterior "Recupero".
   - **Recupera**: Permite asignar temporalmente a una alumna ausente de otra fecha en un hueco libre de camilla.
   - **Suspendida**: Cancelación extraordinaria de clase.

### Flujo 4: Gestión de Pagos y Control de Vencimientos
1. Cada alumna tiene una `fecha_vencimiento`.
2. Cuando la fecha actual supera la `fecha_vencimiento`, el estado visual pasa a **Vencida** o **Próxima a Vencer** (alerta en Dashboard).
3. Al registrar un nuevo pago de mensualidad:
   - Se crea el registro en `pagos`.
   - Se extiende la `fecha_vencimiento` sumando 1 mes exacto a la fecha actual o de vencimiento anterior.
   - Se actualiza `mensualidad_pagada = true`.
   - Se impacta el monto positivo en la `caja` de la sede correspondiente bajo la categoría correspondiente.

### Flujo 5: Control de Caja Diaria y Arqueo Contable
1. El Administrador registra ingresos adicionales (ej: venta de accesorios, agua) o egresos (alquiler, sueldos, servicios).
2. El sistema calcula automáticamente:
   - `Total Ingresos del Mes` = (Suma de `pagos` de alumnas + Suma de `caja` tipo Ingreso).
   - `Total Egresos del Mes` = (Suma de `caja` tipo Egreso).
   - `Balance / Saldo Neto` = Total Ingresos - Total Egresos.
3. Posibilidad de filtrar por método de pago para arqueo de efectivo vs. transferencias bancarias / Mercado Pago.

### Flujo 6: Liquidación a Profesoras
1. El Administrador selecciona una profesora activa y un mes determinado.
2. El sistema busca todas las alumnas asignadas a dicha profesora (`alumnas.profesora_id`).
3. Cruza los pagos realizados por esas alumnas durante ese mes.
4. Calcula los totales recaudados por la profesora y aplica la regla de liquidación (por valor hora de clase dictada o porcentaje de cuota).

---

## 5. 🛠️ Deficiencias de la Arquitectura Actual a Resolver en la Nueva App

Si estás reescribiendo esta aplicación desde cero, se identificaron los siguientes puntos débiles en el código legado que deben ser corregidos:

1. **Lógica de Base de Datos acoplada a la Vista (UI)**:
   - *Problema actual*: Los componentes JSX (`Agenda.jsx`, `FormularioAlumna.jsx`, `Caja.jsx`) realizan llamadas directas `await supabase.from(...)` dentro de renderers y `useEffect`.
   - *Solución limpia*: Implementar **Patrón Repositorio** y **Casos de Uso** (Use Cases/Services) desacoplados de React.
2. **Seguridad y Autenticación**:
   - *Problema actual*: Verificación manual de usuario y contraseña comparando texto plano directo contra la tabla `usuarios` mediante consultas selectivas sin hashing.
   - *Solución limpia*: Implementar **Supabase Auth** nativo con tokens JWT y cifrado de contraseñas (bcrypt/Argon2) + Row Level Security (RLS) en la base de datos PostgreSQL.
3. **Estado Global e Inyección de Dependencias**:
   - *Problema actual*: Props drilling masivo (`sede`, `usuarioActivo`) desde `main.jsx` a todos los hijos.
   - *Solución limpia*: Utilizar Zustand, Redux Toolkit o React Context estructurado para `AuthContext` y `SedeContext`.
4. **Manejo de Formularios y Validaciones**:
   - *Problema actual*: Objetos de estado gigantestos mantenidos manualmente con `useState`.
   - *Solución limpia*: React Hook Form + Zod / Yup para validación estricta de esquemas de datos.

---
