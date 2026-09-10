# Auditoría de Pagos Registrados y Detección de Duplicados
Fecha de emisión: 10 de Septiembre de 2026
Total de pagos analizados en base de datos: **148 registros**

---

## 1. Registros Duplicados Confirmados (Misma Alumna y Mismo Período de Cuota)

> [!WARNING]
> **Atención**: Se ha detectado **1 caso crítico** de doble cobro registrado para una mensualidad en el mismo mes/período. Requiere definición por parte del cliente sobre si uno de ellos fue un error de carga o si corresponde a una devolución/reajuste.

### Caso 1: Mohibe Albornoz
- **DNI**: `43150685` | **Teléfono**: `3804302464`
- **Período**: `Septiembre de 2026`
- **Total Registrado**: **$100.000** (2 cobros de cuota)
- **Sede**: Sede Centro

| ID de Pago | Fecha de Pago | Monto | Método | Concepto | Acción Sugerida |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `c11c24e6-8313-4be8-8913-1d520e349db6` | 2026-09-08 | **$50.000** | TRANSFERENCIA | Cuota mensualidad (2 veces por semana (Centro) - $50.000) | Conservar (Cobro original) |
| `531413b1-a4c2-4bfe-a480-dd68500c2e0c` | 2026-09-08 | **$50.000** | EFECTIVO | Cuota mensualidad (2 veces por semana (Centro) - $50.000) | ⚠️ Revisar para anular/eliminar (Posible doble carga) |

### Caso 2: Jacquelina Alejandra Ávila
- **DNI**: `37415304` | **Teléfono**: `3825529623`
- **Período**: `2026-09`
- **Total Registrado**: **$100.000** (2 cobros de cuota)
- **Sede**: Sede Centro

| ID de Pago | Fecha de Pago | Monto | Método | Concepto | Acción Sugerida |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `756119dd-dd55-439a-9424-4f68329a00ff` | 2026-09-08 | **$50.000** | TRANSFERENCIA | Cuota mensualidad (2 veces por semana (Centro) - $50.000) | Conservar (Cobro original) |
| `1614aabe-bb8f-4fab-b2aa-286d9f52157a` | 2026-09-08 | **$50.000** | TRANSFERENCIA | Cuota mensualidad (2 veces por semana (Centro) - $50.000) | ⚠️ Revisar para anular/eliminar (Posible doble carga) |

### Caso 3: Ana milagro Aredes Ferreira
- **DNI**: `42141962` | **Teléfono**: `3804864548`
- **Período**: `2026-09`
- **Total Registrado**: **$100.000** (2 cobros de cuota)
- **Sede**: Sede Centro

| ID de Pago | Fecha de Pago | Monto | Método | Concepto | Acción Sugerida |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `1ced7ff3-bd31-4007-a1f0-bcf2f607c730` | 2026-09-08 | **$50.000** | TRANSFERENCIA | Cuota mensualidad (2 veces por semana (Centro) - $50.000) | Conservar (Cobro original) |
| `a8ef6d31-33c3-42ab-9345-eac66f4923bb` | 2026-09-08 | **$50.000** | TRANSFERENCIA | Cuota mensualidad (2 veces por semana (Centro) - $50.000) | ⚠️ Revisar para anular/eliminar (Posible doble carga) |

### Caso 4: Candela Mamani
- **DNI**: `45597355` | **Teléfono**: `1132838161`
- **Período**: `Septiembre de 2026`
- **Total Registrado**: **$100.000** (2 cobros de cuota)
- **Sede**: Sede Centro

| ID de Pago | Fecha de Pago | Monto | Método | Concepto | Acción Sugerida |
| :--- | :---: | :---: | :---: | :--- | :--- |
| `66fcdd65-7c01-43e2-8a74-ea11768149f0` | 2026-09-08 | **$50.000** | TRANSFERENCIA | Cuota mensualidad (2 veces por semana (Centro) - $50.000) | Conservar (Cobro original) |
| `54766807-0964-480d-b8f2-4e482368326c` | 2026-09-08 | **$50.000** | TRANSFERENCIA | Cuota mensualidad (2 veces por semana (Centro) - $50.000) | ⚠️ Revisar para anular/eliminar (Posible doble carga) |

---

## 2. Pagos Múltiples a la Misma Alumna en el Mismo Mes Calendario

En este listado se muestran las alumnas que tienen **más de un pago registrado en el mismo mes**.
En la gran mayoría de los casos se trata del comportamiento normal de inicio: **Inscripción inicial ($9.500) + Cuota Mensual ($50.000 / $60.000)**.

Total de casos con más de un pago en el mes: **24 alumnas**.

| Alumna | DNI | Mes | Cobros Registrados | Total Abonado | Detalle de Pagos |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Mohibe Albornoz** | 43150685 | `2026-09` | 3 | **$109.500** | Cuota: $50.000 (transferencia) + Cuota: $50.000 (efectivo) + Matrícula: $9.500 (transferencia) |
| **Candela Mamani** | 45597355 | `2026-09` | 3 | **$109.500** | Matrícula: $9.500 (transferencia) + Cuota: $50.000 (transferencia) + Cuota: $50.000 (transferencia) |
| **Jacquelina Alejandra Ávila** | 37415304 | `2026-09` | 3 | **$109.500** | Cuota: $50.000 (transferencia) + Cuota: $50.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Ana milagro Aredes Ferreira** | 42141962 | `2026-09` | 3 | **$109.500** | Cuota: $50.000 (transferencia) + Cuota: $50.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Valentina Güemes** | 41529216 | `2026-09` | 2 | **$59.500** | Cuota: $50.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Carolina Sotomayor Gómez** | 41046042 | `2026-09` | 2 | **$59.500** | Cuota: $50.000 (efectivo) + Matrícula: $9.500 (transferencia) |
| **Agostina Belén Oyarzabal** | 43894094 | `2026-09` | 2 | **$69.500** | Cuota: $60.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Cinthya Belén Granillo** | 37655604 | `2026-09` | 2 | **$64.500** | Cuota: $55.000 (transferencia) + Matrícula: $9.500 (efectivo) |
| **Ana florencia Álvarez** | 37493169 | `2026-09` | 2 | **$69.500** | Cuota: $60.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Fátima Catalina Pazos** | 46930181 | `2026-09` | 2 | **$69.500** | Cuota: $60.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Victoria Brizuela** | 37654067 | `2026-09` | 2 | **$59.500** | Matrícula: $9.500 (transferencia) + Cuota: $50.000 (transferencia) |
| **David Martínez** | 28348588 | `2026-09` | 2 | **$59.500** | Cuota: $50.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Lucia Almonacid** | 36436465 | `2026-09` | 2 | **$59.500** | Cuota: $50.000 (efectivo) + Matrícula: $9.500 (efectivo) |
| **Ana Micaela Hazaki** | 24662622 | `2026-09` | 2 | **$69.500** | Cuota: $60.000 (transferencia) + Matrícula: $9.500 (efectivo) |
| **Marcela Moreno** | 26054620 | `2026-09` | 2 | **$59.500** | Cuota: $50.000 (transferencia) + Matrícula: $9.500 (efectivo) |
| **Analia Fernanda Prida** | 26860960 | `2026-09` | 2 | **$54.500** | Cuota: $45.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Nuria celeste Córdoba godoy** | 47451378 | `2026-09` | 2 | **$59.500** | Cuota: $50.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Hilda Lorena Aguero** | 30207308 | `2026-09` | 2 | **$64.500** | Cuota: $55.000 (transferencia) + Matrícula: $9.500 (efectivo) |
| **Paola Cataneo** | 25225334 | `2026-09` | 2 | **$59.500** | Cuota: $50.000 (transferencia) + Matrícula: $9.500 (efectivo) |
| **Daniela Susana Calderon** | 23660201 | `2026-09` | 2 | **$69.500** | Cuota: $60.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Yanina Alejandra Corzo machuca** | 34992263 | `2026-09` | 2 | **$69.500** | Cuota: $60.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Ana soledad Brahim** | 32414244 | `2026-09` | 2 | **$69.500** | Cuota: $60.000 (transferencia) + Matrícula: $9.500 (transferencia) |
| **Mariangel Gonzalez** | 37493400 | `2026-09` | 2 | **$69.500** | Cuota: $60.000 (transferencia) + Matrícula: $9.500 (efectivo) |
| **rocio agostina choque** | 48082790 | `2026-09` | 2 | **$64.500** | Cuota: $55.000 (transferencia) + Matrícula: $9.500 (transferencia) |

---

## 3. Preguntas Clave para el Cliente

1. **Sobre el Caso Duplicado de Jacquelina Alejandra Ávila**:
   - En fecha `2026-09-08` figuran dos transferencias de **$50.000** para el período `2026-09`.
   - ¿La alumna efectivamente realizó dos transferencias reales (por ejemplo, adelantó el mes de Octubre, o pagó por dos personas), o fue un error involuntario al presionar dos veces el botón de cobro?
   - Si fue un error de carga: **¿procedemos a anular uno de los dos pagos para ajustar la caja y el historial?**

2. **Sobre los cobros de Matrícula + Cuota**:
   - Se confirma que tener 1 pago de Inscripción ($9.500) y 1 de Mensualidad ($50.000) en el mismo mes es el comportamiento estándar y correcto para alumnas nuevas.
