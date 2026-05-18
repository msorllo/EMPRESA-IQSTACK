# Arquitectura de Base de Datos — IQSTACK
**Proyecto:** Sistema de Gestión Integral — IQSTACK Eco-Hosting  
**Motor:** PostgreSQL 16  
**Versión:** 1.0  
**Fecha:** 18/05/2026  
**Idioma:** Español  
**Estado:** Documento Técnico Profesional

---

## 1. Análisis de Requisitos

### 1.1. Entrevistas con Usuarios y Necesidades Identificadas

Las entrevistas con los fundadores de IQSTACK (Benicarló, Castellón) y los futuros usuarios han permitido identificar las siguientes necesidades:

**Fundadores / Admin_Global:**
- Control total sobre clientes, planes y facturación.
- Visibilidad de todas las métricas ecológicas de la plataforma.
- Gestión de roles y permisos de usuarios internos.
- Acceso a informes de rendimiento económico e impacto ambiental.

**Técnicos de Soporte (Support_Tech):**
- Consulta y actualización de tickets de soporte asignados.
- Acceso a datos básicos del cliente para dar soporte humano (sin bots).
- Registro de interacciones (llamadas, chat) con marcas de tiempo (timestamps).

**Clientes PYME (Client_PYME):**
- Visualización de su propio panel: consumo kWh, CO2 ahorrado, facturas.
- Apertura y seguimiento de sus tickets de soporte.
- Gestión de su perfil y datos de contacto.

**Clientes ONG (Client_ONG):**
- Idénticas necesidades que Client_PYME.
- El sistema debe aplicar automáticamente un descuento del 20% en los planes.
- Acceso a un certificado mensual de impacto ecológico.

---

### 1.2. Identificación de Datos a Almacenar

**Datos Estáticos (Catálogos / Configuración):**
- Roles de usuario (`roles`)
- Planes de alojamiento (`hosting_plans`)
- Tipos de cliente (`client_type`: PYME, ONG)

**Datos Dinámicos (Transacciones / Actividad):**
- Usuarios del sistema (`users`)
- Clientes (`clients`)
- Contratos de planes (`client_plans`)
- Facturas (`invoices`)
- Detalles de factura (`invoice_items`)
- Tickets de soporte (`support_tickets`)
- Mensajes de ticket (`ticket_messages`)
- Métricas ecológicas mensuales (`ecological_metrics`)

---

### 1.3. Control de Acceso y Roles — Matriz CRUD

| Entidad | Admin_Global | Support_Tech | Client_PYME | Client_ONG |
|---|---|---|---|---|
| `users` | CRUD | R (propio) | R (propio) | R (propio) |
| `roles` | CRUD | — | — | — |
| `clients` | CRUD | R | R (propio) | R (propio) |
| `hosting_plans` | CRUD | R | R | R |
| `client_plans` | CRUD | R | R (propio) | R (propio) |
| `invoices` | CRUD | R | R (propio) | R (propio) |
| `invoice_items` | CRUD | R | R (propio) | R (propio) |
| `support_tickets` | CRUD | CRU | CR (propio) | CR (propio) |
| `ticket_messages` | CRUD | CRUD | CR (propio) | CR (propio) |
| `ecological_metrics` | CRUD | R | R (propio) | R (propio) |

**Leyenda:** C=Create, R=Read, U=Update, D=Delete (lógico, vía `is_active`)

---

### 1.4. Reglas de Negocio

| ID | Regla |
|---|---|
| RN-01 | Un cliente del tipo ONG obtiene un **descuento del 20%** sobre el precio base del plan contratado. |
| RN-02 | No se permite la eliminación física de registros de facturas ni clientes. Se usa `is_active = FALSE` (eliminación lógica). |
| RN-03 | Todas las contraseñas deben almacenarse como **hash** (bcrypt, min. 12 rounds). Nunca en texto plano. |
| RN-04 | Un cliente solo puede tener **un plan activo** al mismo tiempo. El campo `is_active` en `client_plans` garantiza esto. |
| RN-05 | Las métricas ecológicas se registran **una vez por mes y por cliente**. Constraint `UNIQUE(client_id, metric_month)`. |
| RN-06 | Un ticket de soporte solo lo puede **cerrar** un `Support_Tech` o un `Admin_Global`. |
| RN-07 | El CO2 ahorrado se calcula: `kwh_generated * 0.233` (factor estándar europeo kg CO2/kWh). |
| RN-08 | Las facturas se emiten en **EUR** y deben incluir IVA (21% por defecto, 0% para ONGs exentas). |
| RN-09 | Un cliente no puede abrir un nuevo ticket si tiene **3 o más abiertos** simultáneamente. |
| RN-10 | El soporte es exclusivamente humano: ningún mensaje puede ser generado por un sistema automatizado sin un `user_id` válido. |

---

## 2. Diseño Conceptual

### 2.1. Explicación del Diagrama Entidad-Relación (ER)

El modelo conceptual de IQSTACK se organiza alrededor de la entidad central **CLIENT**, que conecta todas las operaciones de negocio: contratación de planes, facturación, soporte y seguimiento ecológico. El sistema de autenticación es independiente vía **USER**, que se asocia opcionalmente a un cliente.

```text
ROLE ────────────── USER ─────────────── CLIENT
  1:N                1:1 (opcional)         │
                                            │ 1:N
                                     CLIENT_PLAN ───── HOSTING_PLAN
                                            │                │
                                            │ 1:N           1:N
                                         INVOICE       (base de precio)
                                            │
                                            │ 1:N
                                      INVOICE_ITEM
                                            
CLIENT ──────────── SUPPORT_TICKET ──── TICKET_MESSAGE
  1:N                    │                   │
                         │ N:1              N:1
                       USER              USER (tech)

CLIENT ──────────── ECOLOGICAL_METRIC
  1:N
```

---

### 2.2. Entidades, Atributos y Relaciones

#### ROLE
| Atributo | Descripción |
|---|---|
| `role_id` (PK) | Identificador único del rol |
| `role_name` | Nombre del rol (Admin_Global, Support_Tech, Client_PYME, Client_ONG) |
| `description` | Descripción de las capacidades del rol |
| `created_at` | Timestamp de creación |

#### USER
| Atributo | Descripción |
|---|---|
| `user_id` (PK) | UUID único del usuario |
| `role_id` (FK→ROLE) | Rol asignado |
| `email` | Correo electrónico (UNIQUE) |
| `password_hash` | Hash bcrypt de la contraseña |
| `full_name` | Nombre completo |
| `phone` | Teléfono de contacto |
| `is_active` | Eliminación lógica |
| `last_login_at` | Último acceso |
| `created_at` | Fecha de creación |
| `updated_at` | Fecha de última modificación |

#### CLIENT
| Atributo | Descripción |
|---|---|
| `client_id` (PK) | UUID único del cliente |
| `user_id` (FK→USER) | Usuario asociado (1:1) |
| `client_type` | Enum: PYME / ONG |
| `company_name` | Nombre de la empresa u organización |
| `cif_nif` | Identificador fiscal (UNIQUE) |
| `address` | Dirección completa |
| `city` | Municipio |
| `postal_code` | Código postal |
| `province` | Provincia |
| `country` | País (por defecto: Spain) |
| `contact_person` | Persona de contacto |
| `is_active` | Eliminación lógica |
| `created_at` | Fecha de creación |
| `updated_at` | Fecha de última modificación |

#### HOSTING_PLAN
| Atributo | Descripción |
|---|---|
| `plan_id` (PK) | UUID único del plan |
| `plan_name` | Nombre: Standard, Premium, Assisted |
| `plan_type` | Enum: STANDARD / PREMIUM / ASSISTED |
| `description` | Descripción de características |
| `storage_gb` | Almacenamiento incluido (GB) |
| `bandwidth_gb` | Ancho de banda mensual (GB) |
| `price_eur` | Precio base mensual en EUR |
| `support_hours` | Horas de soporte incluidas |
| `is_active` | Disponible para contratación |
| `created_at` | Fecha de creación |

#### CLIENT_PLAN (Relación N:M resuelta → tabla asociativa)
| Atributo | Descripción |
|---|---|
| `client_plan_id` (PK) | UUID único |
| `client_id` (FK→CLIENT) | Cliente contratante |
| `plan_id` (FK→HOSTING_PLAN) | Plan contratado |
| `start_date` | Fecha de inicio |
| `end_date` | Fecha de finalización (NULL = indefinido) |
| `discount_pct` | Descuento aplicado (20% para ONGs) |
| `final_price_eur` | Precio final después del descuento |
| `is_active` | Plan vigente |
| `created_at` | Fecha de creación |

#### INVOICE
| Atributo | Descripción |
|---|---|
| `invoice_id` (PK) | UUID único |
| `client_id` (FK→CLIENT) | Cliente facturado |
| `client_plan_id` (FK→CLIENT_PLAN) | Plan asociado |
| `invoice_number` | Número de serie (UNIQUE, ej: INV-2026-0001) |
| `issue_date` | Fecha de emisión |
| `due_date` | Fecha de vencimiento |
| `subtotal_eur` | Subtotal sin IVA |
| `vat_pct` | Porcentaje IVA (21 o 0) |
| `vat_amount_eur` | Importe IVA calculado |
| `total_eur` | Total final |
| `status` | Enum: PENDING / PAID / OVERDUE / CANCELLED |
| `paid_at` | Timestamp de pago |
| `is_active` | Eliminación lógica |
| `created_at` | Fecha de creación |

#### INVOICE_ITEM
| Atributo | Descripción |
|---|---|
| `item_id` (PK) | UUID único |
| `invoice_id` (FK→INVOICE) | Factura padre |
| `description` | Descripción de la línea |
| `quantity` | Cantidad |
| `unit_price_eur` | Precio unitario |
| `line_total_eur` | Total de la línea |

#### SUPPORT_TICKET
| Atributo | Descripción |
|---|---|
| `ticket_id` (PK) | UUID único |
| `client_id` (FK→CLIENT) | Cliente que abre el ticket |
| `assigned_to_user_id` (FK→USER) | Técnico asignado (nullable) |
| `opened_by_user_id` (FK→USER) | Usuario que crea el ticket |
| `title` | Título breve del problema |
| `description` | Descripción detallada |
| `priority` | Enum: LOW / MEDIUM / HIGH / CRITICAL |
| `status` | Enum: OPEN / IN_PROGRESS / RESOLVED / CLOSED |
| `channel` | Enum: CHAT / PHONE / EMAIL |
| `resolved_at` | Timestamp de resolución |
| `created_at` | Fecha de creación |
| `updated_at` | Fecha de última modificación |

#### TICKET_MESSAGE
| Atributo | Descripción |
|---|---|
| `message_id` (PK) | UUID único |
| `ticket_id` (FK→SUPPORT_TICKET) | Ticket padre |
| `user_id` (FK→USER) | Autor del mensaje (SIEMPRE humano) |
| `message_body` | Cuerpo del mensaje |
| `created_at` | Timestamp del mensaje |

#### ECOLOGICAL_METRIC
| Atributo | Descripción |
|---|---|
| `metric_id` (PK) | UUID único |
| `client_id` (FK→CLIENT) | Cliente asociado |
| `metric_month` | Mes de referencia (DATE: primer día del mes) |
| `kwh_generated` | Energía renovable generada (kWh) |
| `kwh_consumed` | Energía consumida por el servicio (kWh) |
| `kwh_saved` | Diferencia (generada - consumida) |
| `co2_saved_kg` | CO2 ahorrado (kwh_saved * 0.233) |
| `renewable_pct` | % de energía proveniente de fuentes renovables |
| `created_at` | Fecha de registro |

---

### 2.3. Cardinalidades de las Relaciones

| Relación | Tipo | Descripción |
|---|---|---|
| ROLE → USER | 1:N | Un rol puede tener muchos usuarios; cada usuario tiene un solo rol |
| USER → CLIENT | 1:1 | Un usuario de tipo cliente se asocia a un solo registro de cliente |
| CLIENT → CLIENT_PLAN | 1:N | Un cliente puede tener historial de planes (uno activo) |
| HOSTING_PLAN → CLIENT_PLAN | 1:N | Un plan puede ser contratado por muchos clientes |
| CLIENT → INVOICE | 1:N | Un cliente puede tener muchas facturas |
| CLIENT_PLAN → INVOICE | 1:N | Un plan activo genera facturas mensuales |
| INVOICE → INVOICE_ITEM | 1:N | Una factura contiene una o más líneas de detalle |
| CLIENT → SUPPORT_TICKET | 1:N | Un cliente puede abrir múltiples tickets |
| USER → SUPPORT_TICKET | 1:N | Un técnico puede tener asignados múltiples tickets |
| SUPPORT_TICKET → TICKET_MESSAGE | 1:N | Un ticket contiene múltiples mensajes de conversación |
| USER → TICKET_MESSAGE | 1:N | Un usuario (cliente o técnico) puede escribir múltiples mensajes |
| CLIENT → ECOLOGICAL_METRIC | 1:N | Un cliente tiene una métrica por mes (UNIQUE mensual) |

---

## 3. Diseño Lógico

### 3.1. Transformación del Modelo ER a Tablas

La resolución de la relación N:M entre CLIENT y HOSTING_PLAN se hace mediante la tabla `client_plans`, que actúa como tabla asociativa e incorpora atributos propios de la relación (descuento, precio final, fechas de vigencia).

La relación 1:1 entre USER y CLIENT se implementa como FK `user_id` en la tabla `clients` con constraint UNIQUE, garantizando que cada usuario solo tenga un registro de cliente asociado.

---

### 3.2. Proceso de Normalización

**Primera Forma Normal (1FN) ✓**
- Todos los atributos contienen valores atómicos. La dirección del cliente se descompone en campos separados: `address`, `city`, `postal_code`, `province`, `country`, en lugar de un campo de dirección concatenado.
- No existen grupos repetitivos. Las líneas de factura están separadas en `invoice_items`.
- Cada tabla tiene una clave primaria clara (UUID).

**Segunda Forma Normal (2FN) ✓**
- Todas las tablas utilizan claves primarias simples (no compuestas), por lo que la 2FN se cumple automáticamente.
- En `client_plans`, atributos como `discount_pct` y `final_price_eur` dependen completamente de la clave primaria `client_plan_id`, no parcialmente de `client_id` o `plan_id`.

**Tercera Forma Normal (3FN) ✓**
- Eliminación de dependencias transitivas:
  - El `final_price_eur` podría derivarse de `price_eur` y `discount_pct`, pero se almacena como dato calculado y **auditado** por razones de trazabilidad contable (los precios pueden cambiar; la factura debe reflejar el precio en el momento del contrato). Excepción justificada de negocio.
  - El `co2_saved_kg` de `ecological_metrics` se podría calcular desde `kwh_saved`, pero se almacena por eficiencia de consulta en el dashboard del cliente y para preservar el historial si el factor de conversión cambia.
  - En `invoices`, el `vat_amount_eur` y `total_eur` son datos calculados pero persistidos por integridad contable y auditoría fiscal.
- El `city`, `province` y `country` del cliente no dependen de ningún atributo no-clave (no se aplica lookup a tabla de municipios por simplificación; el sistema no requiere validación geográfica estricta en v1).

---

### 3.3. Definición de Claves Primarias y Foráneas

| Tabla | PK | FKs |
|---|---|---|
| `roles` | `role_id` (UUID) | — |
| `users` | `user_id` (UUID) | `role_id → roles.role_id` |
| `clients` | `client_id` (UUID) | `user_id → users.user_id` |
| `hosting_plans` | `plan_id` (UUID) | — |
| `client_plans` | `client_plan_id` (UUID) | `client_id → clients.client_id`, `plan_id → hosting_plans.plan_id` |
| `invoices` | `invoice_id` (UUID) | `client_id → clients.client_id`, `client_plan_id → client_plans.client_plan_id` |
| `invoice_items` | `item_id` (UUID) | `invoice_id → invoices.invoice_id` |
| `support_tickets` | `ticket_id` (UUID) | `client_id → clients.client_id`, `assigned_to_user_id → users.user_id`, `opened_by_user_id → users.user_id` |
| `ticket_messages` | `message_id` (UUID) | `ticket_id → support_tickets.ticket_id`, `user_id → users.user_id` |
| `ecological_metrics` | `metric_id` (UUID) | `client_id → clients.client_id` |

---

### 3.4. Eliminación de Redundancias

- El nombre del rol NO se almacena en `users`; se accede vía JOIN con `roles`.
- El nombre del plan NO se replica en `client_plans`; se accede vía JOIN con `hosting_plans`.
- La ciudad y provincia del cliente NO se normalizan en una tabla de municipios (v1). Decisión de simplicidad aceptable para el volumen inicial de IQSTACK (< 500 clientes en 3 años).
- El email y nombre del cliente NO se repiten en las facturas. Se accede vía JOIN para la impresión de documentos.

## 4. Diseño Físico

### 4.1. Motor de Base de Datos: PostgreSQL 16

**Justificación técnica de la elección:**

| Criterio | Evaluación para IQSTACK |
|---|---|
| **Licencia** | Open Source (PostgreSQL License) — alineado con la filosofía Linux/OSS del proyecto |
| **ACID** | Cumplimiento total — crítico para integridad contable de facturas |
| **UUID nativo** | Tipo `UUID` nativo + `gen_random_uuid()` — ideal para APIs REST |
| **JSONB** | Disponible para futuras extensiones (metadata de planes) |
| **Particionamiento**| Soporte nativo — útil para `ecological_metrics` por año/mes |
| **Extensiones** | `pgcrypto` para hash, `pg_stat_statements` para optimización |
| **Concurrencia** | MVCC — múltiples agentes (panel cliente + admin) sin bloqueos |
| **Comunidad** | Soporte empresarial activo, documentación extensa en español/inglés |

---

### 4.2. Mapeo de Tipos de Datos PostgreSQL

| Columna lógica | Tipo PostgreSQL | Justificación |
|---|---|---|
| Todos los `_id` (PKs/FKs) | `UUID` | Seguridad, distribuibilidad, no enumerables por atacantes |
| `email` | `VARCHAR(255)` | RFC 5321 límite práctico |
| `password_hash` | `VARCHAR(255)` | bcrypt genera strings de 60 chars; margen para futuras actualizaciones de algoritmo |
| `full_name`, `company_name` | `VARCHAR(200)` | Nombres con margen suficiente |
| `cif_nif` | `VARCHAR(20)` | Formatos variados (A12345678, ES-B12345678) |
| `address` | `TEXT` | Direcciones largas con número, piso, puerta |
| `city`, `province`, `country` | `VARCHAR(100)` | Nombres geográficos |
| `postal_code` | `VARCHAR(10)` | Cobertura internacional futura |
| `phone` | `VARCHAR(20)` | Formato E.164 internacional |
| `plan_name`, `plan_type` | `VARCHAR(50)` | Nombres cortos de planes |
| `description` | `TEXT` | Descripciones largas sin límite predefinido |
| `storage_gb`, `bandwidth_gb` | `INTEGER` | GB siempre enteros |
| `support_hours` | `SMALLINT` | Horas de soporte (0-168/semana) |
| `price_eur`, `subtotal_eur`, `total_eur`, `unit_price_eur`, `line_total_eur`, `vat_amount_eur`, `final_price_eur` | `NUMERIC(10,2)` | Precisión exacta para valores monetarios. FLOAT prohibido para aritmética bancaria |
| `discount_pct`, `vat_pct`, `renewable_pct` | `NUMERIC(5,2)` | Porcentajes con 2 decimales |
| `kwh_generated`, `kwh_consumed`, `kwh_saved` | `NUMERIC(10,3)` | kWh con precisión de 3 decimales |
| `co2_saved_kg` | `NUMERIC(10,3)` | kg CO2 con precisión de 3 decimales |
| `invoice_number` | `VARCHAR(30)` | Formato: INV-YYYY-NNNN |
| `priority` | `VARCHAR(20)` + CHECK | Enum vía CHECK constraint |
| `status` (tickets) | `VARCHAR(20)` + CHECK | Enum vía CHECK constraint |
| `status` (invoices) | `VARCHAR(20)` + CHECK | Enum vía CHECK constraint |
| `channel` | `VARCHAR(20)` + CHECK | Enum vía CHECK constraint |
| `client_type` | `VARCHAR(10)` + CHECK | Enum: PYME / ONG |
| `metric_month` | `DATE` | Primer día del mes (ej: 2026-05-01). Eficiente para queries mensuales |
| `issue_date`, `due_date`, `start_date`, `end_date` | `DATE` | Fechas sin hora para facturación y contratos |
| `created_at`, `updated_at`, `last_login_at`, `resolved_at`, `paid_at` | `TIMESTAMPTZ` | Timestamp con timezone — crítico para clientes en zonas horarias diferentes |
| `is_active` | `BOOLEAN` | Eliminación lógica. DEFAULT TRUE |
| `message_body` | `TEXT` | Mensajes de soporte sin límite |
| `title` | `VARCHAR(300)` | Título del ticket |

---

## 5. Implementación — Scripts SQL

### 5.1. Configuración inicial y extensiones

```sql
-- ============================================================
-- IQSTACK — Script DDL v1.0
-- Motor: PostgreSQL 16
-- Autor: Arquitectura de Sistemas IQSTACK
-- Fecha: 18/05/2026
-- Descripción: Creación completa del esquema de base de datos
-- ============================================================

-- Activar extensión para generación de UUIDs (disponible en PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Crear esquema dedicado para aislamiento
CREATE SCHEMA IF NOT EXISTS iqstack;

-- Establecer el schema por defecto de la sesión
SET search_path TO iqstack, public;
```

---

### 5.2. Tabla: roles

```sql
CREATE TABLE iqstack.roles (
    role_id     UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name   VARCHAR(50)     NOT NULL UNIQUE
                                CHECK (role_name IN ('Admin_Global', 'Support_Tech', 'Client_PYME', 'Client_ONG')),
    description TEXT,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE iqstack.roles IS 'Catálogo de roles del sistema. No modificable sin migración.';
COMMENT ON COLUMN iqstack.roles.role_name IS 'Valores permitidos: Admin_Global, Support_Tech, Client_PYME, Client_ONG';
```

---

### 5.3. Tabla: users

```sql
CREATE TABLE iqstack.users (
    user_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id         UUID            NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(200)    NOT NULL,
    phone           VARCHAR(20),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id) REFERENCES iqstack.roles (role_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_users_email    ON iqstack.users (email);
CREATE INDEX idx_users_role_id  ON iqstack.users (role_id);

COMMENT ON TABLE iqstack.users IS 'Usuarios del sistema. Contraseña SIEMPRE en formato hash bcrypt.';
COMMENT ON COLUMN iqstack.users.password_hash IS 'Hash bcrypt mínimo 12 rounds. NUNCA texto plano.';
COMMENT ON COLUMN iqstack.users.is_active IS 'FALSE = usuario desactivado (eliminación lógica). No DELETE físico.';
```

---

### 5.4. Tabla: clients

```sql
CREATE TABLE iqstack.clients (
    client_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID            NOT NULL UNIQUE,
    client_type     VARCHAR(10)     NOT NULL CHECK (client_type IN ('PYME', 'ONG')),
    company_name    VARCHAR(200)    NOT NULL,
    cif_nif         VARCHAR(20)     NOT NULL UNIQUE,
    address         TEXT,
    city            VARCHAR(100)    NOT NULL DEFAULT 'Benicarló',
    postal_code     VARCHAR(10),
    province        VARCHAR(100)    NOT NULL DEFAULT 'Castellón',
    country         VARCHAR(100)    NOT NULL DEFAULT 'Spain',
    contact_person  VARCHAR(200),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_clients_user
        FOREIGN KEY (user_id) REFERENCES iqstack.users (user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

CREATE INDEX idx_clients_user_id        ON iqstack.clients (user_id);
CREATE INDEX idx_clients_client_type    ON iqstack.clients (client_type);
CREATE INDEX idx_clients_city           ON iqstack.clients (city);

COMMENT ON TABLE iqstack.clients IS 'Registro de clientes de IQSTACK. PYME y ONG. Eliminación lógica vía is_active.';
COMMENT ON COLUMN iqstack.clients.client_type IS 'ONG aplica 20% descuento automático en client_plans.';
COMMENT ON COLUMN iqstack.clients.cif_nif IS 'Identificador fiscal único. Necesario para generación de facturas.';
```

---

### 5.5. Tabla: hosting_plans

```sql
CREATE TABLE iqstack.hosting_plans (
    plan_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name       VARCHAR(50)     NOT NULL UNIQUE,
    plan_type       VARCHAR(20)     NOT NULL CHECK (plan_type IN ('STANDARD', 'PREMIUM', 'ASSISTED')),
    description     TEXT,
    storage_gb      INTEGER         NOT NULL CHECK (storage_gb > 0),
    bandwidth_gb    INTEGER         NOT NULL CHECK (bandwidth_gb > 0),
    price_eur       NUMERIC(10,2)   NOT NULL CHECK (price_eur >= 0),
    support_hours   SMALLINT        NOT NULL DEFAULT 0 CHECK (support_hours >= 0),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE iqstack.hosting_plans IS 'Catálogo de planes de alojamiento. Standard, Premium, Assisted.';
COMMENT ON COLUMN iqstack.hosting_plans.price_eur IS 'Precio base mensual en EUR. El descuento ONG se aplica en client_plans.';
```

---

### 5.6. Tabla: client_plans

```sql
CREATE TABLE iqstack.client_plans (
    client_plan_id  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID            NOT NULL,
    plan_id         UUID            NOT NULL,
    start_date      DATE            NOT NULL DEFAULT CURRENT_DATE,
    end_date        DATE,
    discount_pct    NUMERIC(5,2)    NOT NULL DEFAULT 0.00
                                    CHECK (discount_pct >= 0 AND discount_pct <= 100),
    final_price_eur NUMERIC(10,2)   NOT NULL CHECK (final_price_eur >= 0),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_client_plans_client
        FOREIGN KEY (client_id) REFERENCES iqstack.clients (client_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_client_plans_plan
        FOREIGN KEY (plan_id) REFERENCES iqstack.hosting_plans (plan_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- RN-04: Un cliente solo puede tener UN plan activo simultáneamente
    CONSTRAINT uq_client_active_plan
        EXCLUDE USING gist (
            client_id WITH =,
            daterange(start_date, COALESCE(end_date, '9999-12-31'::date), '[)') WITH &&
        ) WHERE (is_active = TRUE)
);

CREATE INDEX idx_client_plans_client_id ON iqstack.client_plans (client_id);
CREATE INDEX idx_client_plans_plan_id   ON iqstack.client_plans (plan_id);
CREATE INDEX idx_client_plans_active    ON iqstack.client_plans (client_id) WHERE is_active = TRUE;

COMMENT ON TABLE iqstack.client_plans IS 'Historial de planes contratados por cliente. RN-04: un activo por cliente.';
COMMENT ON COLUMN iqstack.client_plans.discount_pct IS 'RN-01: ONGs reciben 20%. El campo se puede personalizar por Admin_Global.';
COMMENT ON COLUMN iqstack.client_plans.final_price_eur IS 'Precio real cobrado. Persistido por auditoría (el precio base puede cambiar).';
```

> **Nota:** La constraint `EXCLUDE USING gist` requiere `CREATE EXTENSION btree_gist;`

```sql
-- Prerrequisito para la constraint de exclusión de solapamiento temporal
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

---

### 5.7. Tabla: invoices

```sql
CREATE TABLE iqstack.invoices (
    invoice_id      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID            NOT NULL,
    client_plan_id  UUID            NOT NULL,
    invoice_number  VARCHAR(30)     NOT NULL UNIQUE,
    issue_date      DATE            NOT NULL DEFAULT CURRENT_DATE,
    due_date        DATE            NOT NULL,
    subtotal_eur    NUMERIC(10,2)   NOT NULL CHECK (subtotal_eur >= 0),
    vat_pct         NUMERIC(5,2)    NOT NULL DEFAULT 21.00 CHECK (vat_pct >= 0 AND vat_pct <= 100),
    vat_amount_eur  NUMERIC(10,2)   NOT NULL DEFAULT 0.00,
    total_eur       NUMERIC(10,2)   NOT NULL CHECK (total_eur >= 0),
    status          VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                                    CHECK (status IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
    paid_at         TIMESTAMPTZ,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_invoices_client
        FOREIGN KEY (client_id) REFERENCES iqstack.clients (client_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_invoices_client_plan
        FOREIGN KEY (client_plan_id) REFERENCES iqstack.client_plans (client_plan_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- Integridad: la fecha de vencimiento no puede ser anterior a la emisión
    CONSTRAINT chk_invoice_dates CHECK (due_date >= issue_date),

    -- Integridad: si status = PAID, paid_at debe tener valor
    CONSTRAINT chk_paid_at CHECK (
        (status = 'PAID' AND paid_at IS NOT NULL) OR status != 'PAID'
    )
);

CREATE INDEX idx_invoices_client_id     ON iqstack.invoices (client_id);
CREATE INDEX idx_invoices_status        ON iqstack.invoices (status);
CREATE INDEX idx_invoices_issue_date    ON iqstack.invoices (issue_date);
CREATE INDEX idx_invoices_due_date      ON iqstack.invoices (due_date) WHERE status = 'PENDING';

COMMENT ON TABLE iqstack.invoices IS 'Facturas. Eliminación lógica OBLIGATORIA por integridad contable.';
COMMENT ON COLUMN iqstack.invoices.vat_pct IS 'RN-08: 21% por defecto. ONGs exentas = 0%.';
```

---

### 5.8. Tabla: invoice_items

```sql
CREATE TABLE iqstack.invoice_items (
    item_id         UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID            NOT NULL,
    description     TEXT            NOT NULL,
    quantity        NUMERIC(10,2)   NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price_eur  NUMERIC(10,2)   NOT NULL CHECK (unit_price_eur >= 0),
    line_total_eur  NUMERIC(10,2)   NOT NULL
                                    GENERATED ALWAYS AS (quantity * unit_price_eur) STORED,

    CONSTRAINT fk_invoice_items_invoice
        FOREIGN KEY (invoice_id) REFERENCES iqstack.invoices (invoice_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_invoice_items_invoice_id ON iqstack.invoice_items (invoice_id);

COMMENT ON TABLE iqstack.invoice_items IS 'Líneas de detalle de cada factura. line_total_eur es columna generada.';
```

---

### 5.9. Tabla: support_tickets

```sql
CREATE TABLE iqstack.support_tickets (
    ticket_id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id               UUID            NOT NULL,
    assigned_to_user_id     UUID,
    opened_by_user_id       UUID            NOT NULL,
    title                   VARCHAR(300)    NOT NULL,
    description             TEXT            NOT NULL,
    priority                VARCHAR(20)     NOT NULL DEFAULT 'MEDIUM'
                                            CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status                  VARCHAR(20)     NOT NULL DEFAULT 'OPEN'
                                            CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    channel                 VARCHAR(20)     NOT NULL DEFAULT 'CHAT'
                                            CHECK (channel IN ('CHAT', 'PHONE', 'EMAIL')),
    resolved_at             TIMESTAMPTZ,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_tickets_client
        FOREIGN KEY (client_id) REFERENCES iqstack.clients (client_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_tickets_assigned_user
        FOREIGN KEY (assigned_to_user_id) REFERENCES iqstack.users (user_id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_tickets_opened_by
        FOREIGN KEY (opened_by_user_id) REFERENCES iqstack.users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- Integridad: si status = RESOLVED o CLOSED, resolved_at debe tener valor
    CONSTRAINT chk_resolved_at CHECK (
        (status IN ('RESOLVED', 'CLOSED') AND resolved_at IS NOT NULL) OR
        status NOT IN ('RESOLVED', 'CLOSED')
    )
);

CREATE INDEX idx_tickets_client_id  ON iqstack.support_tickets (client_id);
CREATE INDEX idx_tickets_status     ON iqstack.support_tickets (status) WHERE status IN ('OPEN', 'IN_PROGRESS');
CREATE INDEX idx_tickets_assigned   ON iqstack.support_tickets (assigned_to_user_id) WHERE assigned_to_user_id IS NOT NULL;

COMMENT ON TABLE iqstack.support_tickets IS 'Tickets de soporte. Soporte exclusivamente HUMANO (RN-10).';
```

---

### 5.10. Tabla: ticket_messages

```sql
CREATE TABLE iqstack.ticket_messages (
    message_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL,
    user_id     UUID        NOT NULL,
    message_body TEXT       NOT NULL CHECK (LENGTH(TRIM(message_body)) > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_messages_ticket
        FOREIGN KEY (ticket_id) REFERENCES iqstack.support_tickets (ticket_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    CONSTRAINT fk_messages_user
        FOREIGN KEY (user_id) REFERENCES iqstack.users (user_id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX idx_messages_ticket_id ON iqstack.ticket_messages (ticket_id);
CREATE INDEX idx_messages_created_at ON iqstack.ticket_messages (created_at);

COMMENT ON TABLE iqstack.ticket_messages IS 'RN-10: user_id NOT NULL garantiza que cada mensaje proviene de un humano autenticado.';
```

---

### 5.11. Tabla: ecological_metrics

```sql
CREATE TABLE iqstack.ecological_metrics (
    metric_id       UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id       UUID            NOT NULL,
    metric_month    DATE            NOT NULL,
    kwh_generated   NUMERIC(10,3)   NOT NULL DEFAULT 0 CHECK (kwh_generated >= 0),
    kwh_consumed    NUMERIC(10,3)   NOT NULL DEFAULT 0 CHECK (kwh_consumed >= 0),
    kwh_saved       NUMERIC(10,3)   NOT NULL
                                    GENERATED ALWAYS AS (kwh_generated - kwh_consumed) STORED,
    co2_saved_kg    NUMERIC(10,3)   NOT NULL
                                    GENERATED ALWAYS AS ((kwh_generated - kwh_consumed) * 0.233) STORED,
    renewable_pct   NUMERIC(5,2)    NOT NULL DEFAULT 100.00
                                    CHECK (renewable_pct >= 0 AND renewable_pct <= 100),
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_eco_metrics_client
        FOREIGN KEY (client_id) REFERENCES iqstack.clients (client_id)
        ON UPDATE CASCADE ON DELETE RESTRICT,

    -- RN-05: Una sola métrica por cliente por mes
    CONSTRAINT uq_client_metric_month UNIQUE (client_id, metric_month),

    -- El metric_month siempre debe ser el primer día del mes
    CONSTRAINT chk_metric_month_first_day
        CHECK (EXTRACT(DAY FROM metric_month) = 1)
);

CREATE INDEX idx_eco_metrics_client_id      ON iqstack.ecological_metrics (client_id);
CREATE INDEX idx_eco_metrics_month          ON iqstack.ecological_metrics (metric_month);

COMMENT ON TABLE iqstack.ecological_metrics IS 'Métricas ecológicas mensuales por cliente. kwh_saved y co2_saved_kg son columnas generadas.';
COMMENT ON COLUMN iqstack.ecological_metrics.co2_saved_kg IS 'RN-07: Factor 0.233 kg CO2/kWh (estándar europeo REE 2024).';
COMMENT ON COLUMN iqstack.ecological_metrics.metric_month IS 'Siempre el primer día del mes (ej: 2026-05-01). Constraint chk_metric_month_first_day.';
```

---

### 5.12. Vista: CO2 Total Ahorrado por Cliente

```sql
-- ============================================================
-- VISTA: v_client_co2_summary
-- Propósito: Dashboard del cliente — resumen ecológico anual acumulado
-- Incluye: total kWh generados, kWh ahorrados, CO2 ahorrado (kg y toneladas),
--         equivalente en árboles plantados (1 árbol absorbe ~22 kg CO2/año)
-- ============================================================

CREATE OR REPLACE VIEW iqstack.v_client_co2_summary AS
SELECT
    c.client_id,
    c.company_name,
    c.client_type,
    c.city,
    COUNT(em.metric_id)                             AS months_tracked,
    MIN(em.metric_month)                            AS first_metric_month,
    MAX(em.metric_month)                            AS last_metric_month,
    ROUND(SUM(em.kwh_generated), 2)                 AS total_kwh_generated,
    ROUND(SUM(em.kwh_consumed), 2)                  AS total_kwh_consumed,
    ROUND(SUM(em.kwh_saved), 2)                     AS total_kwh_saved,
    ROUND(SUM(em.co2_saved_kg), 2)                  AS total_co2_saved_kg,
    ROUND(SUM(em.co2_saved_kg) / 1000.0, 4)         AS total_co2_saved_tonnes,
    ROUND(SUM(em.co2_saved_kg) / 22.0, 0)           AS equivalent_trees_planted,
    ROUND(AVG(em.renewable_pct), 2)                 AS avg_renewable_pct
FROM
    iqstack.clients c
    LEFT JOIN iqstack.ecological_metrics em ON c.client_id = em.client_id
WHERE
    c.is_active = TRUE
GROUP BY
    c.client_id,
    c.company_name,
    c.client_type,
    c.city
ORDER BY
    total_co2_saved_kg DESC NULLS LAST;

COMMENT ON VIEW iqstack.v_client_co2_summary IS
    'Vista de resumen ecológico por cliente. Incluye kg CO2, toneladas, kWh y equivalente en árboles. Factor árboles: 22 kg CO2/árbol/año.';
```

---

### 5.13. Vista adicional: Facturas pendientes de cobro

```sql
CREATE OR REPLACE VIEW iqstack.v_overdue_invoices AS
SELECT
    i.invoice_id,
    i.invoice_number,
    c.company_name,
    c.client_type,
    u.email         AS client_email,
    i.issue_date,
    i.due_date,
    i.total_eur,
    (CURRENT_DATE - i.due_date) AS days_overdue,
    hp.plan_name
FROM
    iqstack.invoices i
    JOIN iqstack.clients c          ON i.client_id = c.client_id
    JOIN iqstack.users u            ON c.user_id = u.user_id
    JOIN iqstack.client_plans cp    ON i.client_plan_id = cp.client_plan_id
    JOIN iqstack.hosting_plans hp   ON cp.plan_id = hp.plan_id
WHERE
    i.status IN ('PENDING', 'OVERDUE')
    AND i.due_date < CURRENT_DATE
    AND i.is_active = TRUE
ORDER BY
    days_overdue DESC;

COMMENT ON VIEW iqstack.v_overdue_invoices IS 'Facturas vencidas y pendientes. Útil para gestión de cobro de Admin_Global.';
```

## 6. Validación y Pruebas — Scripts DML

### 6.1. INSERT: Datos de Catálogo (Seeders)

```sql
-- ============================================================
-- SEEDER 1: Roles del sistema
-- ============================================================
INSERT INTO iqstack.roles (role_id, role_name, description) VALUES
    ('a1b2c3d4-0001-0001-0001-000000000001', 'Admin_Global',
     'Fundadores y administradores generales. Acceso total a todas las entidades del sistema.'),
    ('a1b2c3d4-0002-0002-0002-000000000002', 'Support_Tech',
     'Técnicos de soporte humano. Gestionan y responden tickets. Sin acceso a facturación.'),
    ('a1b2c3d4-0003-0003-0003-000000000003', 'Client_PYME',
     'Clientes empresariales (pequeñas y medianas empresas). Acceso al propio dashboard.'),
    ('a1b2c3d4-0004-0004-0004-000000000004', 'Client_ONG',
     'Clientes organizaciones no gubernamentales. Descuento del 20% aplicado automáticamente.');

-- ============================================================
-- SEEDER 2: Planes de alojamiento
-- ============================================================
INSERT INTO iqstack.hosting_plans (plan_id, plan_name, plan_type, description, storage_gb, bandwidth_gb, price_eur, support_hours) VALUES
    ('b1c2d3e4-0001-0001-0001-000000000001',
     'Standard',
     'STANDARD',
     'Plan básico para webs corporativas y tiendas pequeñas. Incluye certificado SSL, copias de seguridad semanales y panel de control eco-dashboard.',
     50, 500, 9.99, 2),

    ('b1c2d3e4-0002-0002-0002-000000000002',
     'Premium',
     'PREMIUM',
     'Para e-commerce y aplicaciones web de alto tráfico. Recursos dedicados, copias diarias y soporte prioritario. Informe ecológico mensual detallado.',
     200, 2000, 24.99, 8),

    ('b1c2d3e4-0003-0003-0003-000000000003',
     'Assisted',
     'ASSISTED',
     'Servicio totalmente gestionado para clientes sin equipo técnico. Incluye migración, mantenimiento, actualizaciones y soporte telefónico directo ilimitado.',
     500, 5000, 49.99, 999);

-- ============================================================
-- SEEDER 3: Usuarios del sistema (fundadores y técnico)
-- ============================================================
-- NOTA: Los password_hash son ejemplos bcrypt de 'Admin2026!', 'Tech2026!' etc.
INSERT INTO iqstack.users (user_id, role_id, email, password_hash, full_name, phone) VALUES
    -- Fundador 1 (Admin_Global)
    ('c1d2e3f4-0001-0001-0001-000000000001',
     'a1b2c3d4-0001-0001-0001-000000000001',
     'andrei.popescu@iqstack.es',
     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaJqzuyA4hpHAq7mGwLJ2FWVC',
     'Andrei Popescu',
     '+34 964 123 001'),

    -- Fundador 2 (Admin_Global)
    ('c1d2e3f4-0002-0002-0002-000000000002',
     'a1b2c3d4-0001-0001-0001-000000000001',
     'hugo.martinez@iqstack.es',
     '$2b$12$XqYz4c2rBWVHxkd0LHAkCOZw7UuymBKrzuyB5iqIBr8nHwMK3GXWD',
     'Hugo Martínez Ferrer',
     '+34 964 123 002'),

    -- Técnico de soporte (Support_Tech)
    ('c1d2e3f4-0003-0003-0003-000000000003',
     'a1b2c3d4-0002-0002-0002-000000000002',
     'unai.garcia@iqstack.es',
     '$2b$12$RqSt5d3sCWVIykd0MIBlDPaw8VvznCLszuzC6jrJCs9oIxNL4HYVD',
     'Unai García Roca',
     '+34 964 123 003'),

    -- Usuario cliente PYME 1 (Panadería López SL)
    ('c1d2e3f4-0004-0004-0004-000000000004',
     'a1b2c3d4-0003-0003-0003-000000000003',
     'info@panaderialopez.com',
     '$2b$12$ZrTu6e4tDXWJzld1NJCmEQbx9WwaoD​MtavzD7ksKDt0pJyOM5IZUE',
     'Rosa López Alarcón',
     '+34 964 471 210'),

    -- Usuario cliente ONG 1 (Asociación Medioambiental Costa Norte)
    ('c1d2e3f4-0005-0005-0005-000000000005',
     'a1b2c3d4-0004-0004-0004-000000000004',
     'contacto@costanorte.org',
     '$2b$12$WsPv7f5uEYXKame2OKDnFRcy0XxbpE​NuavzE8ltLEu1qKzPN6JZUF',
     'Marc Vidal Puig',
     '+34 964 472 330'),

    -- Usuario cliente PYME 2 (Ferretería Miralles SCP)
    ('c1d2e3f4-0006-0006-0006-000000000006',
     'a1b2c3d4-0003-0003-0003-000000000003',
     'ventas@ferreteriamiralles.com',
     '$2b$12$AtQw8g6vFZYLbnf3PLEoGSdz1YycqF​OvbwaF9muMFv2rLqQO7KAVG',
     'Josep Miralles Climent',
     '+34 964 470 850');

-- ============================================================
-- SEEDER 4: Clientes
-- ============================================================
INSERT INTO iqstack.clients (client_id, user_id, client_type, company_name, cif_nif, address, city, postal_code, province, country, contact_person) VALUES
    -- Cliente PYME: Panadería López
    ('d1e2f3a4-0001-0001-0001-000000000001',
     'c1d2e3f4-0004-0004-0004-000000000004',
     'PYME',
     'Panadería López SL',
     'B-12345678',
     'Calle del Maestro Caballero, 14, Local 3',
     'Benicarló',
     '12580',
     'Castellón',
     'Spain',
     'Rosa López Alarcón'),

    -- Cliente ONG: Asociación Medioambiental Costa Norte
    ('d1e2f3a4-0002-0002-0002-000000000002',
     'c1d2e3f4-0005-0005-0005-000000000005',
     'ONG',
     'Asociación Medioambiental Costa Norte',
     'G-87654321',
     'Avenida de la Mar, 55, 1º A',
     'Benicarló',
     '12580',
     'Castellón',
     'Spain',
     'Marc Vidal Puig'),

    -- Cliente PYME: Ferretería Miralles
    ('d1e2f3a4-0003-0003-0003-000000000003',
     'c1d2e3f4-0006-0006-0006-000000000006',
     'PYME',
     'Ferretería Miralles SCP',
     'J-11223344',
     'Calle Mayor, 8',
     'Benicarló',
     '12580',
     'Castellón',
     'Spain',
     'Josep Miralles Climent');

-- ============================================================
-- SEEDER 5: Planes contratados por clientes
-- ============================================================
INSERT INTO iqstack.client_plans (client_plan_id, client_id, plan_id, start_date, discount_pct, final_price_eur) VALUES
    -- Panadería López → Plan Standard (PYME, 0% descuento)
    ('e1f2a3b4-0001-0001-0001-000000000001',
     'd1e2f3a4-0001-0001-0001-000000000001',
     'b1c2d3e4-0001-0001-0001-000000000001',
     '2026-01-01',
     0.00,
     9.99),

    -- Asociación Costa Norte → Plan Premium (ONG, 20% descuento: 24.99 * 0.80 = 19.99)
    ('e1f2a3b4-0002-0002-0002-000000000002',
     'd1e2f3a4-0002-0002-0002-000000000002',
     'b1c2d3e4-0002-0002-0002-000000000002',
     '2026-02-01',
     20.00,
     19.99),

    -- Ferretería Miralles → Plan Assisted (PYME, 0% descuento)
    ('e1f2a3b4-0003-0003-0003-000000000003',
     'd1e2f3a4-0003-0003-0003-000000000003',
     'b1c2d3e4-0003-0003-0003-000000000003',
     '2026-03-01',
     0.00,
     49.99);

-- ============================================================
-- SEEDER 6: Facturas
-- ============================================================
INSERT INTO iqstack.invoices (invoice_id, client_id, client_plan_id, invoice_number, issue_date, due_date, subtotal_eur, vat_pct, vat_amount_eur, total_eur, status, paid_at) VALUES
    -- Factura Panadería López - Abril 2026 (PAGADA)
    ('f1a2b3c4-0001-0001-0001-000000000001',
     'd1e2f3a4-0001-0001-0001-000000000001',
     'e1f2a3b4-0001-0001-0001-000000000001',
     'INV-2026-0001',
     '2026-04-01',
     '2026-04-15',
     9.99, 21.00, 2.10, 12.09,
     'PAID', '2026-04-10 14:32:00+02'),

    -- Factura Asociación Costa Norte - Abril 2026 (ONG, IVA 0%, PAGADA)
    ('f1a2b3c4-0002-0002-0002-000000000002',
     'd1e2f3a4-0002-0002-0002-000000000002',
     'e1f2a3b4-0002-0002-0002-000000000002',
     'INV-2026-0002',
     '2026-04-01',
     '2026-04-15',
     19.99, 0.00, 0.00, 19.99,
     'PAID', '2026-04-08 09:15:00+02'),

    -- Factura Ferretería Miralles - Mayo 2026 (PENDIENTE)
    ('f1a2b3c4-0003-0003-0003-000000000003',
     'd1e2f3a4-0003-0003-0003-000000000003',
     'e1f2a3b4-0003-0003-0003-000000000003',
     'INV-2026-0003',
     '2026-05-01',
     '2026-05-15',
     49.99, 21.00, 10.50, 60.49,
     'PENDING', NULL);

-- ============================================================
-- SEEDER 7: Líneas de factura
-- ============================================================
INSERT INTO iqstack.invoice_items (item_id, invoice_id, description, quantity, unit_price_eur) VALUES
    ('fa1b2c3d-0001-0001-0001-000000000001', 'f1a2b3c4-0001-0001-0001-000000000001',
     'Plan Standard — Alojamiento mensual (Abril 2026)', 1, 9.99),

    ('fa1b2c3d-0002-0002-0002-000000000002', 'f1a2b3c4-0002-0002-0002-000000000002',
     'Plan Premium — Alojamiento mensual (Abril 2026)', 1, 24.99),
    ('fa1b2c3d-0003-0003-0003-000000000003', 'f1a2b3c4-0002-0002-0002-000000000002',
     'Descuento ONG 20%', 1, -5.00),

    ('fa1b2c3d-0004-0004-0004-000000000004', 'f1a2b3c4-0003-0003-0003-000000000003',
     'Plan Assisted — Alojamiento mensual (Mayo 2026)', 1, 49.99);

-- ============================================================
-- SEEDER 8: Ticket de soporte
-- ============================================================
INSERT INTO iqstack.support_tickets (ticket_id, client_id, assigned_to_user_id, opened_by_user_id, title, description, priority, status, channel) VALUES
    ('g1h2i3j4-0001-0001-0001-000000000001',
     'd1e2f3a4-0001-0001-0001-000000000001',
     'c1d2e3f4-0003-0003-0003-000000000003',
     'c1d2e3f4-0004-0004-0004-000000000004',
     'El correo electrónico del dominio no llega a los destinatarios',
     'Desde ayer por la noche los correos enviados desde info@panaderialopez.com no llegan a los clientes. Los clientes de Gmail los reciben en spam y los de Hotmail no los reciben. Hemos comprobado que el servidor de correo funciona pero quizás hay un problema con el registro SPF o DKIM.',
     'HIGH',
     'IN_PROGRESS',
     'PHONE');

-- Mensajes del ticket
INSERT INTO iqstack.ticket_messages (message_id, ticket_id, user_id, message_body) VALUES
    ('h1i2j3k4-0001-0001-0001-000000000001',
     'g1h2i3j4-0001-0001-0001-000000000001',
     'c1d2e3f4-0004-0004-0004-000000000004',
     '¡Buenos días! Como os he comentado por teléfono, desde el martes a las 20h aproximadamente los correos no llegan bien. Mi proveedor anterior no tenía este problema. ¿Podéis revisarlo? Gracias.'),

    ('h1i2j3k4-0002-0002-0002-000000000002',
     'g1h2i3j4-0001-0001-0001-000000000001',
     'c1d2e3f4-0003-0003-0003-000000000003',
     '¡Hola Rosa! Ya he revisado los registros DNS de vuestro dominio. Efectivamente, el registro SPF no incluye nuestro servidor de correo. Lo estoy configurando ahora mismo. En 30 minutos la propagación debería estar completa. Os aviso cuando esté resuelto.');

-- ============================================================
-- SEEDER 9: Métricas ecológicas mensuales
-- ============================================================
INSERT INTO iqstack.ecological_metrics (metric_id, client_id, metric_month, kwh_generated, kwh_consumed, renewable_pct) VALUES
    -- Panadería López - Enero a Abril 2026
    ('k1l2m3n4-0001-0001-0001-000000000001', 'd1e2f3a4-0001-0001-0001-000000000001', '2026-01-01', 45.200, 12.500, 100.00),
    ('k1l2m3n4-0002-0002-0002-000000000002', 'd1e2f3a4-0001-0001-0001-000000000001', '2026-02-01', 52.800, 11.200, 100.00),
    ('k1l2m3n4-0003-0003-0003-000000000003', 'd1e2f3a4-0001-0001-0001-000000000001', '2026-03-01', 68.400, 13.100, 100.00),
    ('k1l2m3n4-0004-0004-0004-000000000004', 'd1e2f3a4-0001-0001-0001-000000000001', '2026-04-01', 74.600, 12.800, 100.00),

    -- Asociación Costa Norte - Febrero a Abril 2026
    ('k1l2m3n4-0005-0005-0005-000000000005', 'd1e2f3a4-0002-0002-0002-000000000002', '2026-02-01', 120.500, 35.200, 100.00),
    ('k1l2m3n4-0006-0006-0006-000000000006', 'd1e2f3a4-0002-0002-0002-000000000002', '2026-03-01', 145.300, 38.100, 100.00),
    ('k1l2m3n4-0007-0007-0007-000000000007', 'd1e2f3a4-0002-0002-0002-000000000002', '2026-04-01', 162.800, 42.500, 100.00),

    -- Ferretería Miralles - Marzo a Abril 2026
    ('k1l2m3n4-0008-0008-0008-000000000008', 'd1e2f3a4-0003-0003-0003-000000000003', '2026-03-01', 210.000, 95.300, 100.00),
    ('k1l2m3n4-0009-0009-0009-000000000009', 'd1e2f3a4-0003-0003-0003-000000000003', '2026-04-01', 225.400, 98.700, 100.00);
```

---

### 6.2. Consultas de Validación de Lógica de Negocio

#### SELECT 1 — Dashboard ecológico completo de un cliente

```sql
-- Obtiene el resumen ecológico completo para el cliente "Panadería López SL"
-- Combina la vista v_client_co2_summary con el detalle mensual de los últimos 4 meses

-- 6.2.1.a: Resumen acumulado vía vista
SELECT
    company_name,
    client_type,
    months_tracked,
    total_kwh_generated,
    total_kwh_saved,
    total_co2_saved_kg,
    total_co2_saved_tonnes,
    equivalent_trees_planted,
    avg_renewable_pct
FROM
    iqstack.v_client_co2_summary
WHERE
    company_name = 'Panadería López SL';

-- 6.2.1.b: Detalle mensual para el gráfico de barras del dashboard
SELECT
    TO_CHAR(em.metric_month, 'Month YYYY')  AS mes,
    em.kwh_generated,
    em.kwh_consumed,
    em.kwh_saved,
    em.co2_saved_kg,
    em.renewable_pct
FROM
    iqstack.ecological_metrics em
    JOIN iqstack.clients c ON em.client_id = c.client_id
WHERE
    c.company_name = 'Panadería López SL'
ORDER BY
    em.metric_month ASC;
```

**Resultado esperado:**

| mes | kwh_generated | kwh_consumed | kwh_saved | co2_saved_kg | renewable_pct |
|---|---|---|---|---|---|
| January 2026 | 45.200 | 12.500 | 32.700 | 7.619 | 100.00 |
| February 2026 | 52.800 | 11.200 | 41.600 | 9.693 | 100.00 |
| March 2026 | 68.400 | 13.100 | 55.300 | 12.885 | 100.00 |
| April 2026 | 74.600 | 12.800 | 61.800 | 14.399 | 100.00 |

---

#### SELECT 2 — Todos los tickets abiertos o en curso con datos del cliente y técnico asignado

```sql
-- Recupera todos los tickets activos (OPEN o IN_PROGRESS) con la información completa
-- para la pantalla de gestión del equipo de soporte humano

SELECT
    st.ticket_id,
    st.title,
    st.priority,
    st.status,
    st.channel,
    st.created_at,
    c.company_name                              AS client_nombre,
    c.client_type,
    uc.email                                    AS client_email,
    COALESCE(ut.full_name, 'Sin asignar')       AS tecnico_asignado,
    (EXTRACT(EPOCH FROM (NOW() - st.created_at)) / 3600)::INTEGER AS horas_abierto
FROM
    iqstack.support_tickets st
    JOIN iqstack.clients c      ON st.client_id = c.client_id
    JOIN iqstack.users uc       ON c.user_id = uc.user_id
    LEFT JOIN iqstack.users ut  ON st.assigned_to_user_id = ut.user_id
WHERE
    st.status IN ('OPEN', 'IN_PROGRESS')
ORDER BY
    CASE st.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH'     THEN 2
        WHEN 'MEDIUM'   THEN 3
        WHEN 'LOW'      THEN 4
    END ASC,
    st.created_at ASC;
```

**Resultado esperado (1 fila):**

| title | priority | status | channel | client_nombre | tecnico_asignado |
|---|---|---|---|---|---|
| El correo electrónico del dominio no llega... | HIGH | IN_PROGRESS | PHONE | Panadería López SL | Unai García Roca |

---

#### SELECT 3 — Verificación de la Regla de Negocio RN-01: Descuento ONG

```sql
-- Verifica que todas las ONGs tienen un descuento mínimo del 20%
-- y compara el precio base del plan con el precio final cobrado

SELECT
    c.company_name,
    c.client_type,
    hp.plan_name,
    hp.price_eur                                            AS precio_base_eur,
    cp.discount_pct                                         AS descuento_aplicado_pct,
    ROUND(hp.price_eur * (1 - cp.discount_pct / 100), 2)   AS precio_calculado_eur,
    cp.final_price_eur                                      AS precio_real_cobrado_eur,
    CASE
        WHEN c.client_type = 'ONG' AND cp.discount_pct >= 20 THEN 'RN-01 CUMPLIDA ✓'
        WHEN c.client_type = 'ONG' AND cp.discount_pct < 20  THEN 'RN-01 VIOLADA ✗'
        ELSE 'PYME (no aplica)'
    END AS validacion_rn01
FROM
    iqstack.client_plans cp
    JOIN iqstack.clients c          ON cp.client_id = c.client_id
    JOIN iqstack.hosting_plans hp   ON cp.plan_id = hp.plan_id
WHERE
    cp.is_active = TRUE
ORDER BY
    c.client_type, c.company_name;
```

**Resultado esperado:**

| company_name | client_type | plan_name | precio_base_eur | descuento_aplicado_pct | precio_real_cobrado_eur | validacion_rn01 |
|---|---|---|---|---|---|---|
| Asociación Medioambiental Costa Norte | ONG | Premium | 24.99 | 20.00 | 19.99 | RN-01 CUMPLIDA ✓ |
| Ferretería Miralles SCP | PYME | Assisted | 49.99 | 0.00 | 49.99 | PYME (no aplica) |
| Panadería López SL | PYME | Standard | 9.99 | 0.00 | 9.99 | PYME (no aplica) |

---

## Anexo A — Diagrama de dependencias entre tablas

```text
roles (role_id)
  └── users (user_id, role_id FK)
        └── clients (client_id, user_id FK UNIQUE)
              ├── client_plans (client_plan_id, client_id FK)
              │     ├── invoices (invoice_id, client_id FK, client_plan_id FK)
              │     │     └── invoice_items (item_id, invoice_id FK)
              │     └── hosting_plans (plan_id) ◄─── client_plans (plan_id FK)
              ├── support_tickets (ticket_id, client_id FK)
              │     ├── users ◄─── assigned_to_user_id FK
              │     ├── users ◄─── opened_by_user_id FK
              │     └── ticket_messages (message_id, ticket_id FK)
              │           └── users ◄─── user_id FK
              └── ecological_metrics (metric_id, client_id FK, UNIQUE month)
```

---

## Anexo B — Extensiones PostgreSQL necesarias

```sql
-- Ejecutar como superusuario de PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- EXCLUDE USING gist (solapamiento fechas)
```

---

## Anexo C — Orden de creación (dependencias)

Para garantizar la correcta creación sin errores de FK:

1. `iqstack.roles`
2. `iqstack.users`
3. `iqstack.hosting_plans`
4. `iqstack.clients`
5. `iqstack.client_plans`
6. `iqstack.invoices`
7. `iqstack.invoice_items`
8. `iqstack.support_tickets`
9. `iqstack.ticket_messages`
10. `iqstack.ecological_metrics`
11. Vistas: `v_client_co2_summary`, `v_overdue_invoices`

---

*Documento generado por: Sistema de Arquitectura de Bases de Datos — IQSTACK v1.0*  
*© 2026 IQSTACK — Benicarló, Castellón (España) — Hosting Eco-Responsable con Energía 100% Renovable*

