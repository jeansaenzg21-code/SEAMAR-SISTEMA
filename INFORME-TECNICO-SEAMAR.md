# INFORME TÉCNICO DEL SISTEMA SEAMAR DIVERS INTERNATIONAL S.A.C.

**Plataforma de Gestión Empresarial — Documentación Técnica de Arquitectura, Flujos y Operación**

---

| Campo | Detalle |
|---|---|
| **Sistema** | Plataforma de Gestión Empresarial SEAMAR |
| **Organización** | SEAMAR DIVERS INTERNATIONAL S.A.C. |
| **Tipo de documento** | Informe técnico para venta, transferencia y soporte del sistema |
| **Audiencia** | Responsables técnicos, administradores de sistemas e ingenieros de soporte |
| **Alcance** | Arquitectura, componentes, modelo de datos, flujos funcionales, integraciones, despliegue y operación |

---

## 1. RESUMEN EJECUTIVO

**SEAMAR** es un sistema de gestión empresarial de tipo ERP desarrollado a la medida para SEAMAR DIVERS INTERNATIONAL S.A.C., empresa peruana que presta servicios de buceo e inspección y mantenimiento naval. Su función principal es **convertir documentos físicos y digitales en información financiera estructurada**, eliminando la captura manual de datos y centralizando la operación comercial de la empresa en una sola plataforma web, accesible desde cualquier dispositivo con navegador.

La plataforma integra cuatro grandes capacidades:

1. **Inteligencia documental**: lectura de facturas, contratos y valorizaciones a través de fotografía (cámara del dispositivo), imágenes de la galería o archivos (PDF o imagen). El sistema detecta automáticamente el tipo de documento, extrae los datos mediante un motor de **OCR (PaddleOCR)** y un modelo de **inteligencia artificial (GPT-5-mini)**, y los presenta al usuario para revisión antes de registrarlos contablemente.
2. **Módulos financieros**: cuentas por cobrar, cuentas por pagar, valorizaciones de obra/servicio con flujo de aprobación, y conciliación bancaria automática contra estados de cuenta bancarios.
3. **Gestión de maestros**: clientes, proveedores, proyectos y contratos, con historial de movimientos.
4. **Integración con Microsoft 365**: almacenamiento de documentos originales en **OneDrive**, consulta de RUC en SUNAT y envío de correos por **Outlook** (Microsoft Graph).

Desde el punto de vista técnico, es una aplicación **full-stack en TypeScript/React**: el frontend y la API corren sobre **Next.js 16**; el motor de OCR es un **microservicio independiente en Python (FastAPI + PaddleOCR)** gestionado por **PM2**; y la persistencia se realiza en una base de datos **MySQL**. El sistema cuenta con autenticación por roles, registro de auditoría de todas las operaciones y defensas en profundidad (validación de duplicados, transacciones de base de datos y control de acceso por capas).

Este informe documenta en detalle cada componente, cada flujo y cada integración, de modo que un ingeniero técnico sin conocimiento previo pueda operar, mantener y resolver incidencias del sistema.

---

## 2. PROPÓSITO Y ALCANCE DEL SISTEMA

### 2.1 Problema que resuelve

Antes de la plataforma, el registro de las operaciones financieras (facturas de proveedores, comprobantes emitidos, valorizaciones de servicios y conciliación bancaria) se realizaba de forma manual, con los siguientes costes:

- Errores de transcripción de RUC, números de documento, montos y fechas.
- Tiempo elevado para la captura de información desde documentos escaneados o fotografías.
- Falta de trazabilidad sobre el estado de cada documento (pendiente, en revisión, aprobado, cobrado, pagado).
- Dificultad para cruzar los movimientos bancarios con las facturas registradas.
- Dependencia del criterio humano para clasificar un documento como cuenta por cobrar o por pagar.

### 2.2 Solución implementada

El sistema resuelve estos problemas automatizando el ciclo completo:

1. **Captura**: el usuario toma una foto del documento, lo elige de su galería o lo sube desde sus archivos (PDF, JPG, PNG, WebP, HEIC).
2. **Verificación y respaldo**: el archivo original se copia automáticamente a OneDrive como respaldo inmutable.
3. **Extracción**: se extrae el texto (OCR si es una imagen o un PDF escaneado) y un modelo de IA estructura los campos (emisor, cliente, RUC, número de comprobante, fechas, montos, moneda, detracción, forma de pago, categoría).
4. **Validación**: reglas de negocio (detección de duplicados, validación por RUC, verificación de moneda) y cruce con información pública de SUNAT.
5. **Registro**: generación automática de códigos contables (CXC-AAAA-NNNN, CXP-AAAA-NNNN, VAL-AAAA-NN), alta de proveedores/clientes si no existen, y actualización de saldos.
6. **Conciliación**: cruce automático de estados de cuenta bancarios con las cuentas por cobrar/pagar abiertas.

### 2.3 Alcance operativo

- Módulos: Dashboard, Valorizaciones, Aprobaciones, Observaciones, Conciliación Bancaria, Clientes, Cuentas por Cobrar, Proveedores, Cuentas por Pagar, Configuración.
- Roles: ADMINISTRADOR (acceso total) y SUPERVISOR (acceso acotado a aprobaciones y monitoreo).

---

## 3. VISIÓN GENERAL DE LA ARQUITECTURA

### 3.1 Diagrama de arquitectura

```
                        ┌──────────────────────────────────────────────────────┐
                        │                  NAVEGADOR WEB                        │
                        │   (React 19 - App Router - responsive, móvil y PC)   │
                        └─────────────────────────┬────────────────────────────┘
                                                  │  HTTPS
                        ┌─────────────────────────▼────────────────────────────┐
                        │              NEXT.JS 16 (Node.js)                     │
                        │                                                      │
                        │   ┌──────────────┐   ┌─────────────────────────────┐  │
                        │   │  Middleware   │   │  UI + Páginas (App Router)  │  │
                        │   │  proxy.ts     │   │  /dashboard /valuations ... │  │
                        │   │ (control de   │   └─────────────────────────────┘  │
                        │   │  acceso)      │   ┌─────────────────────────────┐  │
                        │   └──────────────┘   │  API Routes (app/api/*)      │  │
                        │                      │  ~60 endpoints REST          │  │
                        │                      └──────────────┬──────────────┘  │
                        └─────────────────────────────────────┼────────────────┘
          ┌──────────────┬──────────────┬──────────────┬───────┴─────────┬──────────────┐
          ▼              ▼              ▼              ▼                 ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐
   │   MYSQL    │ │ M. Graph   │ │  OpenAI    │ │  PeruAPI     │ │ Microserv. │ │  Python    │
   │ (datos)    │ │ OneDrive/  │ │ GPT-5-mini │ │ (consulta    │ │ OCR        │ │ (script    │
   │            │ │ Outlook    │ │ (extracción│ │  de RUC)     │ │ FastAPI     │ │ conciliac.)│
   │            │ │ (archivos/ │ │  de datos) │ │              │ │ PaddleOCR   │ │ Pandas     │
   │            │ │  correos)  │ │            │ │              │ │ 127.0.0.1:  │ │            │
   │            │ │            │ │            │ │              │ │ 8000        │ │            │
   └────────────┘ └────────────┘ └────────────┘ └──────────────┘ └────────────┘ └────────────┘
```

### 3.2 Capas tecnológicas

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| **Presentación** | React 19 + Next.js 16 (App Router), Tailwind CSS, shadcn/ui, Recharts, sonner | Interfaces de usuario, formularios, tablas, gráficos, diálogos de captura de documentos |
| **Aplicación / API** | Next.js Route Handlers (Node.js), mysql2 (pool), openai, @azure/identity, @microsoft/microsoft-graph-client, python-shell | Reglas de negocio, servicios REST, orquestación de documentos, integraciones |
| **Dominio (librerías)** | Módulos en `lib/` | Sesión, autorización, procesamiento de documentos, ROI de extracción, OneDrive, valorizaciones, conciliación, importadores Excel |
| **Microservicio OCR** | Python 3, FastAPI, Uvicorn, PaddleOCR 2.8, OpenCV, PyMuPDF (fitz) | Extracción de texto de imágenes y PDF escaneados; clasificación PDF texto vs escaneado; cola de procesamiento |
| **Procesos puntuales** | Scripts Python `bank_reconciliation.py` (Pandas + mysql-connector) | Parseo de estados de cuenta y cruce contable invocados desde Node |
| **Persistencia** | MySQL (motor InnoDB), pool de conexiones de 10 con keep-alive | Almacenamiento de todos los datos del negocio |
| **Integraciones externas** | Microsoft Graph v1.0, OpenAI Responses API, PeruAPI, SMTP (opcional) | OneDrive, Outlook, extracción IA, SUNAT, correo |

---

## 4. COMPONENTES TECNOLÓGICOS

### 4.1 Frontend (Next.js)

- **Framework**: Next.js 16.2.6 con App Router, React 19, TypeScript en modo estricto.
- **Estilos**: Tailwind CSS v4, `tw-animate-css`, tema claro/oscuro con `next-themes` (tema oscuro por defecto a nivel de aplicación).
- **Componentes UI**: librería shadcn/ui (más de 55 primitivos: botones, tarjetas, diálogos, tablas, formularios, pestañas, menús laterales, gráficos, avatares, popovers, etc.) más `recharts` para gráficos, `sonner` para notificaciones y `lucide-react` para iconografía.
- **Formularios**: `react-hook-form` + `zod` para validación.
- **Excel**: `xlsx` (SheetJS) y `exceljs` para lectura/escritura de archivos Excel.
- **Documentos/PDF**: `pdfjs-dist`, `pdfreader`, `pdf2json`, `pdf2pic`, `tesseract.js` (OCR local de respaldo) y `@napi-rs/canvas`.
- **Estado y utilidades**: `swr`-estilo con hooks propios (`use-empresa`, `use-mobile`, `use-toast`), `date-fns`, `lodash`.
- **Responsive**: el sistema es 100 % responsivo y operable desde un teléfono móvil (menú lateral tipo drawer, botones de captura de cámara/galería).

### 4.2 API y lógica de negocio

La API es un conjunto de **Route Handlers de Next.js** (archivos `route.ts` dentro de `app/api/`). Todas las consultas a MySQL usan `mysql2/promise` con un **pool compartido** (máximo 10 conexiones, 5 en espera, timeout de 10 s, keep-alive activado) definido en `lib/mysql.ts`. Las rutas se agrupan por módulo:

| Módulo | Endpoints principales |
|---|---|
| Autenticación | `/api/login`, `/api/auth/session`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/verify-reset-code`, `/api/auth/reset-password` |
| Dashboard | `/api/dashboard` (KPIs, alertas, actividad, top clientes, años disponibles) |
| Clientes | `/api/clientes`, `/api/clientes/[id]`, `/api/clientes/[id]/estado` |
| Proveedores | `/api/proveedores`, `/api/proveedores/[id]`, `/api/proveedores/[id]/estado` |
| Proyectos | `/api/proyectos`, `/api/proyectos/cliente/[id]`, `/api/proyectos/[id]`, `/api/proyectos/[id]/estado` |
| Cuentas por cobrar | `/api/cuentas-por-cobrar`, `/api/cuentas-por-cobrar/importar`, `/api/cuentas-por-cobrar/export` |
| Cuentas por pagar | `/api/cuentas-por-pagar`, `/api/cuentas-por-pagar/importar`, `/api/cuentas-por-pagar/export` |
| Conciliación bancaria | `/api/bank-reconciliation` (POST), `export`, `history`, `select-match`, `[id]`, `[id]/reejecutar` |
| Valorizaciones | `/api/valorizaciones`, `[id]`, `[id]/estado`, `[id]/detalle`, `[id]/documentos`, `documentos/[id]`, `fechas-disponibles`, `pendientes` |
| Documentos / IA | `/api/importar-factura`, `/api/importar-valorizacion`, `/api/extraer-datos-contrato`, `/api/sincronizar-contratos`, `/api/sincronizar-valorizaciones`, `/api/documentos/preview`, `/api/observaciones/documento` |
| RUC / SUNAT | `/api/sunat/ruc` |
| Archivos | `/api/files/upload` (logos, avatares) |
| Configuración | `/api/configuracion/empresa`, `/api/configuracion/apariencia`, `/api/configuracion/usuarios`, `/api/configuracion/usuarios/[id]`, `/api/configuracion/usuarios/[id]/estado` |
| Actividad | `/api/actividad` (listado y marcado como leído) |

### 4.3 Microservicio OCR (Python)

Componente independiente que expone servicios HTTP en `127.0.0.1:8000`:

- **`resumen/ocr_server.py`**: aplicación FastAPI "SEAMAR OCR Service".
  - `GET /health`: estado del motor (OCR cargado, workers, cola, procesados, fallos, tiempos, uptime).
  - `POST /ocr`: OCR directo de un PDF o imagen (devuelve el texto extraído).
  - `POST /procesar-documento`: clasifica el documento (IMAGEN / PDF_TEXTO / PDF_ESCANEADO), extrae el texto de la capa del PDF (PyMuPDF) o ejecuta OCR según corresponda.
- **`ocr_core.py`**: motor de OCR con preprocesamiento de imagen (ajuste de resolución, corrección de perspectiva, 4 variantes de preprocesado con OpenCV y elección de la de mejor puntaje).
- **`ocr_queue.py`**: cola de proceso asíncrono con workers (configurable vía `OCR_MAX_WORKERS`), reintentos (máx. 2 con backoff) y protección de saturación.
- **`ocr_metrics.py`**: métricas en memoria para el endpoint `/health`.
- **`ocr_detect.py`**: heurísticas para decidir si un PDF es de texto o escaneado.
- **`pdf_ocr.py`**: script CLI standalone (imprime el texto OCR de un PDF en JSON).

### 4.4 Base de datos MySQL

Base relacional con 17 tablas de negocio más la tabla de auditoría (ver sección 5). El acceso se hace directamente con SQL mediante `mysql2` en Node y `mysql-connector-python` en los procesos Python.

### 4.5 Integraciones externas

| Integración | Uso | Tecnología |
|---|---|---|
| **Microsoft Graph** | Autenticación OAuth2 con credenciales de aplicación (Client Secret), obtención de token | `@azure/identity` + REST Graph v1.0 |
| **OneDrive** | Subida, descarga, listado, búsqueda y preview de documentos | REST Graph (`drive/items`) |
| **Outlook** | Envío de correos (recuperación de contraseña, notificaciones) | REST Graph (`sendMail`) |
| **OpenAI** | Extracción de datos estructurados de facturas, contratos y valorizaciones | `openai` SDK, modelo `gpt-5-mini` |
| **PeruAPI** | Consulta y validación de RUC ante SUNAT | REST (`peruapi.com/api/ruc`) |
| **SMTP (opcional)** | Envío alternativo de correos si no se usa Graph | `nodemailer`-equivalente vía entorno |

---

## 5. MODELO DE DATOS (MySQL)

El esquema está definido por el SQL embebido en el código (no hay archivo de migraciones versionado, ver sección 12). Las tablas y su propósito:

### 5.1 Tablas maestras

**`usuarios`** — Cuentas de acceso al sistema.
- Campos: `id`, `nombre`, `usuario` (identificador de inicio de sesión), `password` (hash **bcrypt**, nunca se guarda en texto plano), `rol` (`ADMINISTRADOR` | `SUPERVISOR` | `OPERADOR`), `estado` (`ACTIVO`), `cargo`, `avatar`, `tema` (`CLARO`/`OSCURO`), `ultimo_login`.

**`empresa`** — Datos de la organización (imagen de marca en log in y en la interfaz).
- Campos: `id`, `razon_social`, `nombre_comercial`, `ruc`, `direccion`, `telefono`, `correo`, `logo`.

**`clientes`** — Clientes de SEAMAR (se auto-crean al importar facturas de cobrar).
- Campos: `id`, `razon_social`, `ruc`, `estado`, y campos complementarios de contacto.

**`proveedores`** — Proveedores de SEAMAR (se auto-crean al importar facturas de pagar).
- Campos: `id`, `razon_social`, `ruc`, `estado`, y campos complementarios de contacto.

**`proyectos`** — Proyectos/servicios contratados por cliente.
- Campos: `id`, `cliente_id` (FK a `clientes`), `nombre`, `descripcion`, `estado` (`EN_CURSO`), `fecha_inicio`.

**`proyecto_servicios`** — Servicios dentro de un proyecto (nace del contrato).
- Campos: `id`, `proyecto_id`, `nombre_servicio`, `descripcion`, `numero_oc`, `numero_requerimiento`, `fecha_programada`, `unidad_medida`, `cantidad`, `precio_unitario`, `monto_pactado`, `moneda`, `archivo_nombre`, `archivo_onedrive_id`, `archivo_url`, `estado` (`PENDIENTE`).

### 5.2 Tablas operativas

**`valorizaciones`** — Valorizaciones de servicios (documento central del negocio).
- Campos: `id`, `codigo` (`VAL-YYYY-NN`), `proveedor` (almacena el nombre del cliente), `ruc`, `negocio_operacion`, `numero_orden_servicio`, `numero_requerimiento`, `descripcion`, `pu` (precio unitario), `monto`, `moneda`, `periodo`, `fecha_ejecucion`, `estado` (`BORRADOR` | `EN_REVISION` | `OBSERVADO` | `APROBADO`), `creado_por`, `archivo_nombre`, `archivo_onedrive_id`, `archivo_url`, `respaldo_nombre`, `respaldo_onedrive_id`, `respaldo_url`, `observaciones`, `hash_archivo` (deduplicación por SHA-256).

**`valorizacion_documentos`** — Documentos adjuntos de cada valorización.
- Campos: `id`, `valorizacion_id`, `nombre`, `onedrive_id`, `url`.

**`valorizacion_observaciones`** — Observaciones automáticas o manuales de una valorización.
- Campos: `id`, `valorizacion_id`, `tipo` (p. ej. `SISTEMA`), `observacion`, `usuario`.

**`cuentas_por_cobrar`** — Cuentas por cobrar (CxC).
- Campos: `id`, `codigo` (`CXC-YYYY-NNNN`), `cliente_id`, `proyecto_id`, `numero_factura`, `descripcion`, `monto`, `saldo`, `moneda` (`SOLES`/`DOLARES`), `detraccion`, `forma_pago`, `categorizacion`, `fecha_emision`, `fecha_vencimiento`, `estado` (`PENDIENTE` | `FACTURADO` | `COBRADO` | ...), `archivo_nombre`, `archivo_onedrive_id`, `archivo_url`, `servicio_id`.

**`cuentas_por_pagar`** — Cuentas por pagar (CxP).
- Campos: `id`, `codigo` (`CXP-YYYY-NNNN`), `proveedor_id`, `proyecto_id`, `servicio_id`, `tipo_documento`, `numero_documento`, `descripcion`, `monto`, `saldo`, `moneda`, `detraccion`, `forma_pago`, `categorizacion`, `fecha_emision`, `fecha_vencimiento`, `estado` (`PENDIENTE` | `VENCIDO` | `PAGADO`), `archivo_nombre`, `archivo_onedrive_id`, `archivo_url`.

### 5.3 Consolidación bancaria

**`conciliaciones_bancarias`** — Cabecera de cada proceso de conciliación.
- Campos: `id`, `archivo_nombre`, `archivo_hash` (SHA-256 del estado de cuenta), `archivo_ruta`, `moneda`, `total_movimientos`, `conciliados`, `observaciones`, `pendientes`, `usuario`, `estado` (`PROCESADA`).

**`conciliacion_movimientos`** — Cada movimiento del banco procesado.
- Campos: `id`, `conciliacion_id`, `fecha`, `referencia`, `descripcion`, `monto`, `moneda`, `tipo` (`credito`/`debito`), `estado` (`conciliado`/`observacion`/`pendiente`), `origen` (`CUENTA_POR_COBRAR`/`CUENTA_POR_PAGAR`), `documento_id` (FK al documento conciliado), `conciliado_manual`, `fecha_registro`.

**`conciliacion_movimiento_coincidencias`** — Candidatas a coincidencia por cada movimiento.
- Campos: `movimiento_id`, `documento_id`, `origen`, `score`, `tipo`, `fecha_registro`.

**`conciliacion_observaciones`** — Observaciones generadas por la conciliación.
- Campos: `conciliacion_id`, `factura`, `tipo` (`NO_ENCONTRADA`), `observacion`, `estado` (`PENDIENTE`), `fecha_creacion`.

### 5.4 Auditoría

**`actividad_sistema`** — Registro de auditoría de toda operación relevante.
- Campos: `id`, `tipo` (`cxc`, `cxp`, `valorizacion`, `cliente`, `proyecto`, `conciliacion`, `configuracion`), `accion` (`crear`, `actualizar`, `aprobar`, `observar`, `enviar_revision`, `eliminar`, `pagar`, `cobrar`, `importacion`, `activar`, `desactivar`), `titulo`, `subtitulo`, `usuario_nombre`, `referencia_id`, `leido`, `created_at`.

### 5.5 Convenciones de negocio en los datos

- **Códigos correlativos**: las cuentas usan el formato `PREFIJO-AAAA-NNNN` y se generan automáticamente tomando el último correlativo del año (`lib/codigo-cuenta.ts`). Las valorizaciones usan `VAL-AAAA-NN` consolidando por año.
- **Moneda**: se almacena como `PEN`/`SOLES` o `USD`/`DOLARES` según el módulo; el sistema normaliza ambas representaciones.
- **Deduplicación**: las facturas se validan por `numero_documento` + RUC de la contraparte; las valorizaciones por `hash_archivo` (SHA-256) y por `codigo`.
- **Razón social en valorizaciones**: el campo `proveedor` de `valorizaciones` almacena en realidad el nombre del cliente (comentado explícitamente en las consultas del dashboard), dato importante para depurar reportes.

---

## 6. AUTENTICACIÓN, AUTORIZACIÓN Y SEGURIDAD

### 6.1 Inicio de sesión (flujo completo)

1. El usuario abre la aplicación; `app/page.tsx` redirige a `/login`.
2. La página de login consulta `/api/configuracion/empresa` (endpoint público) para mostrar el logo, la razón social y el nombre comercial de la organización.
3. El usuario ingresa su **usuario** y **contraseña** y envía el formulario.
4. El endpoint `POST /api/login`:
   - Busca al usuario en `usuarios` por `usuario` y con `estado = 'ACTIVO'` (único registro).
   - Compara la contraseña contra el hash **bcrypt** almacenado (`bcrypt.compare`).
   - Si es correcta, actualiza `ultimo_login = NOW()` y crea la sesión.
   - Devuelve los datos del usuario y su preferencia de tema (claro/oscuro) para aplicarla inmediatamente en el cliente.
5. La sesión se materializa en una **cookie HTTP-only** llamada `app_session` (configurable con `SESSION_COOKIE_NAME`), con `SameSite=Lax`, expiración por defecto de **8 horas** (`SESSION_MAX_AGE_SECONDS=28800`):
   - `httpOnly: true` → el JavaScript del navegador no puede leer la cookie (protección contra XSS).
   - `sameSite: 'lax'` → protección razonable contra CSRF.
   - `secure: false` en el entorno actual → **debe activarse (`true`) cuando el sistema se exponga por HTTPS en producción**.
6. Tras el login, el cliente aplica el tema y redirige al **Dashboard**.
7. El layout raíz (`app/layout.tsx`) inyecta los proveedores globales (`ThemeProvider`, `RoleProvider`, `Toaster` de sonner) y lee la sesión para pasarla al cliente.

### 6.2 Recuperación de contraseña

1. El usuario pulsa «¿Olvidaste tu contraseña?» → se abre un diálogo (`ForgotPasswordDialog`).
2. `POST /api/auth/forgot-password` genera un **código de verificación** y lo envía por correo al usuario mediante **Microsoft Graph (Outlook)** (o SMTP si está configurado).
3. El usuario ingresa el código → `POST /api/auth/verify-reset-code` lo valida (con protección de intentos/expiración).
4. `POST /api/auth/reset-password` permite fijar la nueva contraseña (se guarda como hash bcrypt).

### 6.3 Control de acceso por capas

El sistema aplica control de acceso en **tres capas independientes**:

**Capa 1 — Middleware (`proxy.ts`)**. Se ejecuta en Edge para cada petición HTTP:
- Rutas de API públicas (sin autenticación): `/api/login`, `/api/auth/*` (session, logout, recuperación de contraseña), `/api/configuracion/empresa`, `/api/files/upload`.
- Para el resto de APIs: si no hay sesión → `401 No autenticado`; si el rol no tiene permiso → `403 Acceso denegado`.
- Para páginas: sin sesión → redirección a `/login`; sesión activa y visitando `/login` → redirección al `/dashboard`; rol sin permiso de ruta → redirección al `/dashboard`.

**Capa 2 — Rutas de página/API permitidas por rol** (`lib/authorization.ts`):
- **ADMINISTRADOR**: acceso total a todo el sistema (`tieneAccesoPagina` y `tieneAccesoApi` devuelven `true` para todas las rutas).
- **SUPERVISOR**: solo `/dashboard`, `/approvals`, `/configuracion` (páginas) y un subconjunto de APIs (dashboard, valorizaciones, actividad, empresa, apariencia, carga de archivos). El supervisor es quien aprueba las valorizaciones, por lo que su navegación en el menú lateral se reduce a Dashboard + Aprobaciones.

**Capa 3 — Validación de sesión dentro de cada handler**: prácticamente todas las rutas de API consultan `obtenerSesion()` al inicio, de modo que incluso si el middleware fallara, la lógica de negocio rechaza peticiones no autenticadas.

### 6.4 Otras medidas de seguridad

- Contraseñas **nunca** en texto plano (bcrypt).
- **SQL parametrizado** en 100 % de las consultas (uso de `?` placeholders de `mysql2`, sin concatenación de entrada del usuario).
- Límite de tamaño en las subidas de archivos (20 MB) y validación de **extensión/cabecera** de archivos en los endpoints de importación.
- Códigos 404 para módulos internos no publicados (analítica de centros de costo y rentabilidad), evitando exponer funcionalidad incompleta.
- Auditoría de todas las operaciones contables en `actividad_sistema`.

---

## 7. FLUJOS FUNCIONALES EN DETALLE

### 7.1 Dashboard (Centro de Operaciones)

El componente `dashboard-content.tsx` alimenta el panel desde `GET /api/dashboard` con filtros de **moneda** (SOLES/DÓLARES), **mes** y **año** (el selector de año se obtiene de los rangos realmente existentes en las tablas).

**KPIs calculados** (consultas agregadas con `SUM(saldo)/SUM(monto)`):
1. **Cuentas por cobrar** — saldo pendiente de documentos en estado `PENDIENTE`/`FACTURADO` del mes/año/moneda seleccionados.
2. **Cuentas por pagar** — saldo pendiente de documentos en estado `PENDIENTE`/`VENCIDO`.
3. **Valorizaciones aprobadas** — suma de montos de valorizaciones `APROBADO`.
4. **Valorizaciones pendientes** — suma de montos en `BORRADOR`/`EN_REVISION`/`OBSERVADO`.

**Alertas críticas** (semáforo operativo):
- Valorizaciones en `BORRADOR` sin actualizar ≥ 7 días.
- Valorizaciones en `EN_REVISION` ≥ 3 días.
- Valorizaciones en `OBSERVADO` ≥ 5 días.
Se calcula con `TIMESTAMPDIFF` sobre `created_at`/`updated_at`.

**Top clientes con riesgo**: consulta que une `clientes` con `cuentas_por_cobrar` (por id) y con `valorizaciones` (por la razón social almacenada en el campo `proveedor`). Calcula **CxC**, **n.º de valorizaciones**, **mora** (saldos vencidos no cobrados) y asigna un **semáforo de riesgo**: `VERDE` si no hay mora, `AMARILLO` si la mora < 20 % de la CxC, `ROJO` si ≥ 20 %.

**Actividad reciente**: últimas 5 entradas de `actividad_sistema`.

### 7.2 Digitalización y captura de facturas (Cuentas por Cobrar y Cuentas por Pagar)

Este es el flujo estrella del sistema: **capturar una factura desde la cámara, la galería o los archivos del usuario, y convertirla automáticamente en un registro contable**. Se describe paso a paso.

**A) Elección de la fuente de captura** (componente `ImportarFacturaDialog`):
El usuario pulsa «Importar factura» en el módulo de Cuentas por Cobrar o Cuentas por Pagar y se abre un diálogo con **tres orígenes**:

| Origen | Icono | Detalle técnico |
|---|---|---|
| **Galería** | Imagen | Input `type=file accept="image/*"` múltiple — permite varios archivos |
| **Cámara** | Cámara | Input con atributo `capture="environment"` → abre la **cámara trasera del dispositivo** para fotografiar el documento (soporte nativo en móvil) |
| **Archivo** | Carpeta | Input `type=file accept=".pdf,.jpg,.jpeg,.png,.webp,.heic"` — subida desde el equipo |

- Se permiten **varios archivos a la vez** (multiselección) con procesamiento en lote.
- Validación inmediata en cliente: extensiones permitidas (`pdf, jpg, jpeg, png, webp, heic`) y **tamaño máximo de 20 MB** por archivo.
- Error controlado en pantalla si un archivo no cumple las reglas.
- El usuario ve la lista de archivos seleccionados con su tamaño y puede quitarlos antes de procesar.

**B) Procesamiento en lote** (`POST /api/importar-factura`, multipart):

Para cada archivo, en orden:
1. Se calcula la extensión y se valida de nuevo en el servidor (`pdf, jpg, jpeg, png` y ≤ 20 MB), reforzando la validación del cliente.
2. Se llama a `extraerFacturaSeamar()` (`lib/facturas-seamar.ts`) que realiza **dos acciones en paralelo secuencial**:
   a. **Sube el archivo original a OneDrive** (carpeta DOCUMENTOS) → respaldo inmutable e identificar único (`item_id`) visible en el registro contable.
   b. **Ejecuta el pipeline de IA** (`procesarDocumento`, ver 7.3) para extraer los datos estructurados.

La interfaz muestra un **progreso por fases**: *Subiendo a OneDrive → Leyendo el documento → Extrayendo datos → Preparando revisión*, y para lotes, un indicador «Procesando archivo X de N» con barra de progreso.

**C) Revisión y selección de resultados**:
- El sistema lista cada archivo con el **resumen extraído** (proveedor/cliente, número de documento y monto formateado según moneda).
- Insignias de estado: **Lista** (datos extraídos correctamente), **Error** (fallo controlado con mensaje), **Duplicada** (detectada al guardar).
- El usuario **selecciona (checkbox) las facturas** que desea importar; se desmarcan automáticamente las que fallaron o son duplicadas. Botones «Todas» / «Limpiar».
- El usuario **no puede** crear la factura sin revisar: la validación exige que exista proveedor/cliente, número y monto.

**D) Registro contable** (cada factura seleccionada):
- Para Cuentas por Pagar → `POST /api/cuentas-por-pagar/importar`.
- Para Cuentas por Cobrar → `POST /api/cuentas-por-cobrar/importar`.
- Lógica común:
  1. **Validación de duplicados**: consulta por `numero_documento` (+ RUC de la contraparte si existe). Si existe → `409 Duplicado` y la factura se marca en la UI como "Duplicada" sin guardar.
  2. **Búsqueda o creación del maestro**: se busca proveedor/cliente por RUC o por razón social; si no existe, se **crea automáticamente** (estado `ACTIVO`). Esto mantiene el maestro siempre consistente con los documentos.
  3. **Generación de código contable** `CXP-AAAA-NNNN` / `CXC-AAAA-NNNN` (correlativo anual).
  4. **Inserción** con estado `PENDIENTE` y `saldo = monto`, guardando fechas de emisión/vencimiento, moneda, detracción, forma de pago, categoría y los datos del archivo en OneDrive (nombre, `itemId`, `webUrl`).
  5. **Auditoría**: `registrarActividad()` tipo `cxc`/`cxp`, acción `crear`, título «Factura X importada».

**E) Clasificación automática COBRAR/PAGAR por RUC** (`lib/validacion-ruc.ts`):
Mecanismo de respaldo que decide si un documento es cuenta por cobrar o por pagar usando **exclusivamente los RUC** (no nombres):
- **Emisor con el RUC de SEAMAR** → es un comprobante emitido → `COBRAR`.
- **Cliente con el RUC de SEAMAR** → es un comprobante recibido → `PAGAR`.
- **Mismo RUC de SEAMAR en emisor y en cliente** → documento anómalo → se **marca para revisión** y no se modifica la clasificación.
- **Sin determinación posible** → se mantiene el destino y se registra observación `[VALIDACION-RUC] REQUIERE REVISION`. El RUC de la empresa se toma de la variable `SEAMAR_RUC` (con un valor por defecto interno).

### 7.3 Pipeline de procesamiento documental con IA (`lib/openai-documentos.ts`)

Es el motor que convierte cualquier archivo en datos estructurados. Flujo interno:

```
Archivo (PDF / Imagen / Excel)
   │
   ├─ 1. SHA-256 del buffer  → hashArchivo (para deduplicación)
   │
   ├─ 2. Detección de formato por extensión:
   │      • Imagen (jpg/jpeg/png)  → OCR vía microservicio (/ocr)
   │      • Excel (xlsx/xls/csv)   → parseo con SheetJS (texto tabular)
   │      • PDF                    → extracción de capa de texto (PyMuPDF/pdfjs)
   │
   ├─ 3. Si es PDF y el texto extraído es < 100 caracteres → ES ESCANEADO:
   │      → OCR del PDF vía microservicio (/ocr), con tiempos medidos
   │        (espera en cola + OCR) para diagnóstico.
   │
   ├─ 4. (Solo facturas, texto ≥ 50 caracteres) Extracción automática REGEX
   │      → extraerCampos(): RUC, número de factura (serie-correlativo),
   │        fecha, monto total, moneda, detracción.
   │
   ├─ 5. Llamada a OpenAI (modelo gpt-5-mini, configurable OPENAI_MODEL):
   │      prompt especializado según tipo (factura / contrato / valorización)
   │      + texto extraído + nombre del archivo.
   │      • Hasta 3 intentos: reintento en error 503 con espera de 60 s;
   │        error 429 (rate limit) se propaga sin reintento.
   │
   ├─ 6. Parseo del JSON devuelto (se limpian delimitadores ```json, etc.)
   │
   ├─ 7. FUSIÓN HÍBRIDA: mergeResultados()
   │      → Los campos que OpenAI dejó vacíos/null se completan con los
   │        valores detectados por REGEX (mayor robustez).
   │
   └─ 8. Se adjunta hashArchivo al resultado y se devuelve.
```

**El prompt de facturas** (`lib/ai/factura-prompt.ts`) codifica el conocimiento de negocio peruano:
- **Regla 0**: identificación fiable de notas de crédito/débito (solo por el encabezado principal, nunca por el prefijo de la serie).
- Normalización de series-correlativo separadas por espacio/salto (artefactos habituales del OCR).
- **Moneda**: prioridad absoluta del símbolo `$`/DÓLAR; evidencia por texto (SOLES vs DÓLARES).
- **Emisor vs cliente por posición visual** (encabezado = emisor; bloque «Señor(es)/Cliente» = cliente), con reglas específicas para el RUC de SEAMAR.
- **Detracción (SPOT)**: extracción del monto explícito o cálculo por porcentaje; reglas anti-confusión.
- **Categorización** en 13 categorías de gasto (ALIMENTACION, COMBUSTIBLE, HOSPEDAJE, TRANSPORTE, SERVICIOS_PROFESIONALES, MATERIALES, EPP, TELECOMUNICACIONES, BANCARIOS, MANTENIMIENTO, ALQUILERES, IMPUESTOS, OTROS) con guías de mapeo.
- **Forma de pago**: CONTADO / CREDITO / TRANSFERENCIA / DEPOSITO / EFECTIVO / CHEQUE, con reglas de prioridad.

### 7.4 Microservicio OCR (detalle técnico)

Cuando un archivo es una imagen o un PDF escaneado, la API de Next.js lo envía por HTTP al servicio Python:

**Detección de tipo de documento** (`ocr_detect.py`):
- Se analiza cada página con PyMuPDF: caracteres totales, palabras, proporción de páginas con texto, promedio de caracteres por página, cobertura de imagen sobre el área de página y presencia de campos típicos de factura (RUC, FACTURA, FECHA DE EMISIÓN, TOTAL, IGV, SUBTOTAL, MONEDA, SOLES, USD, CONDICIÓN DE PAGO) y de claves de tabla (CÓDIGO, CANTIDAD, UNIDAD, DESCRIPCIÓN, VALOR UNITARIO, DESCUENTO, VALOR DE VENTA, IMPORTE, PRECIO).
- Reglas de decisión:
  - Sin texto suficiente (< 80 caracteres y < 40 palabras) → `PDF_ESCANEADO`.
  - Cobertura de imagen alta (≥ 25 %) sin claves de tabla → `PDF_ESCANEADO`.
  - Cobertura media (≥ 10 %) con campos de factura pero sin claves de tabla → `PDF_ESCANEADO`.
  - Texto estructurado (campos + tabla + ≥ 50 % de páginas con texto + ≥ 120 caracteres/página + ≥ 1 monto) → `PDF_TEXTO`.
  - **Ante la duda siempre se prefiere OCR** para no perder la tabla de detalle.

**Motor de OCR** (`ocr_core.py`) — PaddleOCR en español (`lang="es"`, `use_textline_orientation=True`):
- **Imágenes**: se ajusta la resolución (lado mínimo 1200 px, máximo 2600 px), se generan **4 variantes de preprocesado** con OpenCV (binaria adaptativa, binaria suave, Otsu y CLAHE para contraste local) y se ejecuta PaddleOCR sobre cada una, eligiendo la de **mejor puntaje** (confianza media + bonus por longitud). Además se intenta una **corrección de perspectiva** (detección del cuadrilátero del documento con contornos y `getPerspectiveTransform`) y se vuelve a OCR la versión enderezada si produce más texto.
- **PDF**: se rasterizan las páginas (matriz 2.5×), se convierten a escala de grises, se aplica blur + umbral adaptativo y se ejecuta OCR por página, uniéndose los resultados.

**Cola y concurrencia** (`ocr_queue.py`):
- Pool de workers asíncronos (por defecto **1 worker**, configurable) en memoria.
- Reintentos: máximo 2 por documento con backoff.
- Límites: cola máxima (por defecto 500 documentos) y timeout por documento (por defecto 300 s).
- Si la cola está saturada → responde `409`/error controlado «servicio saturado» (se devuelve al usuario un mensaje claro).
- Validaciones de entrada: `Content-Type` permitido (`application/pdf`, `image/jpeg`, `image/png`), documento no vacío y ≤ 50 MB.

**Métricas / health** (`ocr_metrics.py`): el endpoint `/health` expone workers activos/ociosos, tamaño de cola, total procesados, fallos, tiempo promedio/mín/máximo por documento y uptime. **Es la primera herramienta de diagnóstico** cuando el sistema «no lee documentos».

### 7.5 Contratos (extracción automática y creación de proyectos)

`POST /api/extraer-datos-contrato` procesa un contrato subido con el pipeline de IA (mismo `procesarDocumento` con prompt especializado de contratos) y devuelve: cliente (RUC y razón social), proyecto, número de orden de compra y la lista de servicios con sus datos técnicos/económicos.

`guardarContrato()` (`lib/valorizaciones.ts`) materializa el resultado en la base de datos:
1. Busca el cliente por RUC en `clientes`; si no existe, **no genera el proyecto** (evita datos incompletos).
2. Busca el proyecto por `cliente_id + nombre`; si no existe, lo **crea** con estado `EN_CURSO` y `fecha_inicio = CURDATE()`.
3. Inserta cada servicio en `proyecto_servicios` con sus datos (nombre, descripción, N.º OC, requerimiento, fecha programada, unidad, cantidad, precio unitario, monto pactado, moneda) y el documento del contrato (nombre, `itemId`, `webUrl` en OneDrive). Estado inicial `PENDIENTE`.

Las rutas `/api/sincronizar-contratos` y `/api/sincronizar-valorizaciones` permiten **reconciliar OneDrive con la base de datos**: listan las carpetas correspondientes (CONTRATOS/VALORIZACIONES), detectan archivos nuevos o faltantes y los procesan para mantener la información sincronizada.

### 7.6 Valorizaciones (flujo completo)

**Origen 1 — Importación automática desde Excel** (componente `importar-valorizacion` + `lib/importadores/`):
- El sistema usa **importadores por cliente**: REPSOL, TDP y TRALZA (`repsol.ts`, `tdp.ts`, `tralza.ts`), comprobando cuál aplicar según el nombre del archivo/contenido.
- Para REPSOL, el lector (`lib/excel-reader.ts`) localiza las hojas cuyo nombre empieza por `VAL` (excluyendo consolidados/resúmenes), identifica automáticamente la fila de títulos (buscando «descripción», «P.U.», «total»), las columnas de descripción/P.U./total, el total final de cada hoja y la primera fecha para deducir el período.
- Se genera el **código** `VAL-AAAA-NN` (número de la hoja) y se usa la configuración por defecto (`EXCEL_DEFAULT_PROVEEDOR`, `EXCEL_DEFAULT_RUC`, `EXCEL_DEFAULT_MONEDA`, `EXCEL_DEFAULT_NEGOCIO`).
- El usuario **selecciona las hojas** a importar y el sistema:
  1. Sube el archivo Excel **una sola vez** a la carpeta de respaldo de OneDrive.
  2. Para cada valorización: valida `codigo` (evita duplicados), llama a `guardarValorizacion()` y registra el documento adjunto en `valorizacion_documentos`.

**Origen 2 — Importación desde documento** (`/api/importar-valorizacion`): admite valorizaciones individuales vía pipeline IA.

**`guardarValorizacion()` (`lib/valorizaciones.ts`)** — reglas de negocio:
- **Deduplicación por hash**: si ya existe una valorización con el `hash_archivo` (SHA-256), se omite el registro.
- **Búsqueda de la orden de servicio (OS) en OneDrive**: se busca el archivo de la OS por número en la carpeta `ORDENES_SERVICIO` mediante `buscarOSPorNumero()`. Para REPSOL con **4 o más documentos adjuntos** se omite la búsqueda (documentación completa).
- **Generación de código**: `VAL-AAAA-NN` correlativo anual si no viene el código.
- **Resolución del cliente**: si el RUC de la factura coincide con un cliente en `clientes`, se usa la razón social almacenada como proveedor/cliente.
- **Inserción** con estado `BORRADOR`, datos del archivo y del respaldo (OS encontrada o, en su defecto, observación «Documentos incompletos»).
- Para REPSOL sin OS, se crea una observación automática tipo `SISTEMA`.

**Flujo de estados (aprobaciones)**:
```
BORRADOR ──enviar_revision──▶ EN_REVISION ──aprobar──▶ APROBADO
    ▲                            │
    └───────────observar◀────────┘  (→ OBSERVADO)
```
- La página `/approvals` (Aprobaciones) lista las valorizaciones para revisión. El panel muestra en la barra superior un **recordatorio de aprobación** al supervisor cuando hay pendientes (modal «Tiene X valorizaciones pendientes de aprobación», una vez por sesión).
- Los cambios de estado se realizan vía `/api/valorizaciones/[id]/estado` y quedan auditados en `actividad_sistema` (acciones `enviar_revision`, `aprobar`, `observar`).
- Las observaciones se gestionan en `/observations` y en `/api/observaciones/documento`.

### 7.7 Conciliación bancaria (flujo completo)

Es la automatización que cruza el estado de cuenta del banco con la contabilidad. Proceso paso a paso:

**A) Configuración del estado de cuenta (formato BCP)**:
1. El usuario sube el archivo Excel del banco y selecciona la moneda (PEN/USD).
2. `POST /api/bank-reconciliation`:
   - Calcula el **SHA-256** del archivo y consulta `conciliaciones_bancarias` por `archivo_hash + moneda`. Si ya existe → responde **duplicate** con el id de la conciliación previa (evita procesar dos veces el mismo estado de cuenta).
   - Escribe el archivo en un temporal y ejecuta el **script Python** `bank_reconciliation.py` mediante `PythonShell`, pasándole: ruta del archivo, credenciales de BD (host/user/password/database) y moneda.

**B) Proceso Python (`bank_reconciliation.py`)**:
1. Lee el Excel con **Pandas** (`header=4`, es decir, la fila 5 del archivo) y estructura las columnas **Fecha**, **Monto**, **Descripción operación** y **Referencia2**.
2. Por cada movimiento determina el **tipo**: `credito` (monto > 0 → proviene de un cobro) o `debito` (monto < 0 → proviene de un pago; se trabaja con valor absoluto).
3. Consulta los documentos **abiertos** de la tabla correspondiente con la misma moneda:
   - Crédito → `cuentas_por_cobrar` (estado ≠ COBRADO).
   - Débito → `cuentas_por_pagar` (estado ≠ PAGADO).
4. Para cada movimiento busca **coincidencia exacta** (misma fecha y mismo monto, con precisión de 2 decimales):
   - **1 coincidencia** → estado `conciliado`.
   - **Múltiples coincidencias** → estado `observacion` (se cargan todas las candidatas para resolución manual).
   - **0 coincidencias** → estado `pendiente`.
5. Devuelve un JSON con el total de movimientos y los conteos por estado.

**C) Persistencia transaccional (100 % atómica)**:
Todo se ejecuta dentro de **una única transacción MySQL** (begin/commit/rollback) con verificación explícita intermedia:
- Inserta cabecera en `conciliaciones_bancarias` (`PROCESADA`).
- Por cada movimiento inserta `conciliacion_movimientos` (+ `conciliacion_movimiento_coincidencias` por cada candidata).
- Si es `pendiente` sin coincidencias → observación `NO_ENCONTRADA`.
- Si es `observacion` → observación de **revisión manual por múltiples coincidencias**.
- Si es `conciliado` con una única coincidencia → llama a `actualizarDocumentoPorConciliacion()` (`lib/conciliacion.ts`) que **marca la cuenta como `COBRADO`/`PAGADO` y pone el saldo a 0**.
- Actualiza los contadores de la cabecera y guarda una **copia del archivo original** en `uploads/conciliaciones/<id>.xlsx`.
- **COMMIT**. Cualquier error → hace `ROLLBACK` y la base queda intacta (no hay estados intermedios).

**D) Herramientas complementarias**:
- `/api/bank-reconciliation/export` → exporta el resultado de la conciliación a Excel.
- `/api/bank-reconciliation/history` → historial de conciliaciones procesadas.
- `/api/bank-reconciliation/select-match` → permite al usuario **resolver manualmente** los movimientos en observación/pendiente eligiendo el documento correcto.
- `/api/bank-reconciliation/[id]/reejecutar` → reprocesa una conciliación.

### 7.8 Clientes, proveedores y proyectos

- **Clientes** (`/clients`, `/clients/[id]`): listado con búsqueda, detalle con datos maestros, y **movimientos** (CxC y proyectos asociados) vía `/api/movimientos/proveedor/[id]` y `/api/proyectos/cliente/[id]`.
- **Proveedores** (`/providers`, `/providers/[id]`): mismo patrón que clientes, con su historial de CxP.
- **Proyectos**: CRUD con estado (`EN_CURSO`), ligados a cliente (creados por contrato o manualmente).
- Todos los cambios de estado quedan auditados (acciones `activar`/`desactivar`).

### 7.9 Configuración

`/configuracion` agrupa cuatro secciones:
- **Empresa** (`/api/configuracion/empresa`): datos de la organización (razón social, RUC, dirección, teléfono, correo, logo). Es público en lectura para pintar el login.
- **Usuarios** (`/api/configuracion/usuarios`): alta/baja/edición de usuarios con rol (`ADMINISTRADOR`/`SUPERVISOR`/`OPERADOR`), tema y estado; las contraseñas se guardan con bcrypt.
- **Apariencia** (`/api/configuracion/apariencia`): tema global y personalización.
- **Seguridad**: ajustes de sesión y políticas.

### 7.10 Consulta de RUC (SUNAT)

`GET /api/sunat/ruc?id=<ruc>` consulta la API externa **PeruAPI** (`PERUAPI_BASE_URL` con `PERU_API_KEY`) para validar/obtener datos de un contribuyente. Se usa como fuente auxiliar de validación de clientes/proveedores.

### 7.11 Auditoría y actividad

Todos los eventos relevantes (importaciones, altas, aprobaciones, observaciones, cambios de estado) se registran en `actividad_sistema` mediante el helper `registrarActividad()`. El frontend los muestra en la **campana de notificaciones** del encabezado («Actividad reciente», POP `GET /api/actividad?limit=20`), y al abrirla los marca como leídos (`PATCH /api/actividad`). El dashboard muestra los últimos 5.

---

## 8. INTEGRACIÓN CON MICROSOFT 365

### 8.1 Autenticación (Azure AD / Microsoft Graph)

- Las credenciales son de **aplicación** (`ClientSecretCredential` de `@azure/identity`) con tres variables: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` y `AZURE_CLIENT_SECRET`.
- El token se obtiene contra el ámbito `https://graph.microsoft.com/.default` (`lib/graph.ts`).
- La cuenta de destino (la que posee los OneDrive/Outlook) se define con `ONEDRIVE_USER` / `OUTLOOK_USER`.

### 8.2 OneDrive (almacenamiento documental)

Las carpetas de OneDrive se definen por variables de entorno con sus **IDs**:

| Variable | Uso |
|---|---|
| `ONEDRIVE_FOLDER_CONTRATOS` | Contratos |
| `ONEDRIVE_FOLDER_SISTEMA_SEAMAR` | Carpetas raíz del sistema |
| `ONEDRIVE_FOLDER_DOCUMENTOS` | Documentos generales (facturas importadas) |
| `ONEDRIVE_FOLDER_DOCUMENTOS_RESPALDO` | Respaldo de valorizaciones/importaciones |
| `ONEDRIVE_FOLDER_ESTADOS_BANCARIOS` | Estados de cuenta bancarios |
| `ONEDRIVE_FOLDER_VALORIZACIONES` | Valorizaciones |
| `ONEDRIVE_FOLDER_ORDENES_SERVICIO` | Órdenes de servicio |

Operaciones implementadas (`lib/onedrive.ts`):
- **Subida** (`subirArchivoAOneDrive`): usa el patrón **`createUploadSession`** con carga por **chunks de 5 MB** (soporta archivos > 4 MB, a diferencia de un PUT simple). Direccionamiento por `item-id-relative` (nunca rutas en `root:/path`, que provocan errores 403 por `encodeURIComponent`). Maneja el conflicto 409 de nombre existente generando un nombre temporal con timestamp. Incluye **cancelación de sesión** (DELETE) si la carga falla a mitad de camino.
- **Descarga** (`descargarArchivo`): primero resuelve el ítem; si expone `@microsoft.graph.downloadUrl` lo usa, si no baja por `/content`.
- **Listado paginado** (`listarDocumentos`): recorre `@odata.nextLink` hasta acumular **todos** los archivos de la carpeta (Graph pagina de 200 en 200).
- **Búsqueda por ordinal**: `buscarOSPorNumero()` localiza la orden de servicio cuyo nombre contiene el número buscado.
- **Preview**: `generarEnlacePreview()` usa el endpoint `POST /items/{id}/preview` de Graph para generar enlaces de vista previa de documentos.
- **Eliminación** (`eliminarArchivo`): borra por `itemId`.

### 8.3 Outlook (correo)

`lib/outlook.ts` implementa `enviarCorreo()` usando `POST /users/{user}/sendMail` de Graph, con destinatario por defecto configurable (`OUTLOOK_DEFAULT_RECIPIENT`). Se usa para el envío de códigos de recuperación de contraseña y notificaciones. Existe la alternativa SMTP (variables `SMTP_*`) comentada como opcional.

---

## 9. DESPLIEGUE Y OPERACIÓN

### 9.1 Estructura del repositorio

```
SEAMAR-SISTEMA/
├── app/                  → Páginas (App Router) + API Routes
├── components/           → Componentes React (UI, módulos, diálogos)
├── hooks/                → Hooks custom (empresa, mobile, toast)
├── lib/                  → Lógica de negocio, integraciones, IA, importadores
│   ├── ai/               → Prompts de extracción (factura, contrato, valorización)
│   ├── importadores/     → Importadores Excel por cliente (REPSOL, TDP, TRALZA)
│   └── export-templates/ → Plantillas de exportación por cliente
├── python/               → Microservicio OCR + scripts de conciliación
│   ├── ocr_server.py     → FastAPI "SEAMAR OCR Service"
│   ├── ocr_core.py       → Motor PaddleOCR + preprocesado OpenCV
│   ├── ocr_queue.py      → Cola asíncrona de trabajos OCR
│   ├── ocr_metrics.py    → Métricas de salud
│   ├── ocr_detect.py     → Clasificación PDF texto vs escaneado
│   ├── pdf_ocr.py        → CLI OCR
│   └── bank_reconciliation.py → CLI conciliación bancaria
├── scripts/              → (reservado)
├── public/               → Estáticos (logos, uploads)
├── uploads/              → Archivos generados (logos, conciliaciones .xlsx)
├── logs/                 → Logs del servicio OCR (PM2)
├── styles/               → Globals CSS
├── proxy.ts              → Middleware de autorización/redirecciones
├── ecosystem.config.js   → Configuración PM2 del servicio OCR
├── next.config.mjs       → Configuración Next.js
├── .env.local            → Variables de entorno reales (NO versionar)
├── .env.example          → Plantilla de variables (versionada)
└── package.json          → Dependencias y scripts npm
```

### 9.2 Variables de entorno (`.env.local`)

| Grupo | Variables |
|---|---|
| **Base de datos** | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` |
| **Sesión** | `SESSION_COOKIE_NAME` (por defecto `app_session`), `SESSION_MAX_AGE_SECONDS` (por defecto 28800) |
| **Azure / Graph** | `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` |
| **OneDrive / Outlook** | `ONEDRIVE_USER`, `OUTLOOK_USER`, `OUTLOOK_DEFAULT_RECIPIENT`, `ONEDRIVE_FOLDER_*` (7 carpetas) |
| **IA** | `OPENAI_API_KEY`, `OPENAI_MODEL` (por defecto `gpt-5-mini`), `GEMINI_API_KEY`, `GEMINI_MODEL` |
| **SUNAT** | `PERU_API_KEY`, `PERUAPI_BASE_URL` |
| **Negocio** | `SEAMAR_RUC` |
| **URLs** | `APP_URL`, `NEXT_PUBLIC_APP_URL` |
| **Python / OCR** | `PYTHON_PATH`, `OCR_SERVICE_URL` (por defecto `http://127.0.0.1:8000`), `OCR_SERVICE_HOST`, `OCR_SERVICE_PORT`, `OCR_MAX_WORKERS`, más `OCR_TIMEOUT_MS` y `OCR_WORKER_TIMEOUT` de uso interno |
| **Importador Excel** | `EXCEL_DEFAULT_PROVEEDOR`, `EXCEL_DEFAULT_RUC`, `EXCEL_DEFAULT_MONEDA` (PEN), `EXCEL_DEFAULT_NEGOCIO` |
| **Correo alternativo** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` |

> **Importante**: `.env.local` contiene las credenciales reales. No debe incluirse en el control de versiones; `.env.example` es la plantilla segura.

### 9.3 Arranque de la aplicación

**Frontend/API (Next.js):**
```bash
npm install          # instalar dependencias
npm run dev          # desarrollo (Next.js)
npm run build        # compilación de producción
npm run start        # servidor de producción
npm run lint         # análisis estático (ESLint)
```

**Microservicio OCR (Python):** gestionado con **PM2**:

```bash
pm2 start ecosystem.config.js   # inicia "ocr-service"
pm2 logs ocr-service            # logs en tiempo real (./logs/ocr-service-*.log)
pm2 status                      # estado del proceso
```

El proceso definido en `ecosystem.config.js`:
- Comando: `python python/ocr_server.py` (interprete `PYTHON_PATH` o `python3`).
- `autorestart: true`, máx. 10 reinicios con 5 s de espera, reinicio automático por memoria (`max_memory_restart: "2G"`).
- Variables: host `127.0.0.1`, puerto `8000`, `OCR_MAX_WORKERS=1`.
- Logs en `./logs/ocr-service-out.log` y `./logs/ocr-service-error.log`.
- **Verificación de salud**: `GET http://127.0.0.1:8000/health` (debe devolver `"status":"ok"` y `"ocr_loaded":true`).

### 9.4 Notas de configuración

- `next.config.mjs`: `typescript.ignoreBuildErrors: true` (el build no se detiene por errores de tipos), `images.unoptimized: true` y `experimental.serverActions.bodySizeLimit: "20mb"` (permite subir documentos de hasta 20 MB por Server Action).
- El OCR service escucha en `127.0.0.1` (no expone el puerto al exterior).
- Las dependencias Python del OCR están en `requirements-ocr.txt` (mínima); `requirements.txt` incluye el stack completo de ML por si se usan otros módulos.

---

## 10. CONSIDERACIONES DE SEGURIDAD

1. **Cookies de sesión**: `httpOnly` (no accesibles por JS) y `SameSite=Lax`. **Acción pendiente**: activar `secure: true` cuando el sistema se sirva por HTTPS.
2. **Contraseñas**: hasheadas con bcrypt; nunca en texto plano.
3. **Inyección SQL**: todas las consultas usan parámetros preparados; las pocas cadenas interpoladas corresponden a **valores internos** (nombres de tabla/columna controlados), nunca a entrada del usuario.
4. **Archivos**: validación de extensión y tamaño (20 MB) en cliente y servidor; los documentos originales se respaldan en OneDrive sin exponer el almacenamiento local.
5. **Secretos**: las credenciales viven en `.env.local`; deben gestionarse con el mismo cuidado que las contraseñas de la organización. La siguiente rotación de claves (Azure, OpenAI, PeruAPI) debe coordinarse con el área de TI de la empresa.
6. **Control de acceso**: triple capa (middleware, roles por ruta/API y verificación de sesión en cada handler). El rol ADMINISTRADOR tiene acceso pleno; el SUPERVISOR solo a aprobaciones y monitoreo.
7. **Logs**: el nivel de trazabilidad es alto (diagnósticos en consola). En producción conviene revisar periódicamente que no se registren datos sensibles (los logs del OCR no deben incluir texto de documentos con información personal).

---

## 11. MANTENIMIENTO Y SOLUCIÓN DE PROBLEMAS

### 11.1 Diagnóstico rápido

| Síntoma | Causa probable | Verificación / acción |
|---|---|---|
| Las facturas no se procesan | Servicio OCR caído o saturado | `pm2 status` + `GET 127.0.0.1:8000/health`. Si `ocr_loaded:false`, reiniciar `pm2 restart ocr-service`. |
| Error «OCR Service no disponible» | Servicio OCR detenido o `OCR_SERVICE_URL` incorrecto | Revisar `pm2 logs ocr-service`; confirmar el puerto 8000. |
| `429 Too Many Requests` de OpenAI | Límite de cuota del API key | El sistema intenta reintentar solo en 503; para 429 revisar la cuota/hora de la cuenta OpenAI. |
| Duplicado al importar factura | Ya se registró el mismo `numero_documento` + RUC | El sistema responde `409 Duplicado` y lo marca en pantalla; revisar en CxC/CxP. |
| Fallo en conciliación | Formato del Excel distinto al esperado (filas de cabecera/columnas Fecha-Monto) | Revisar los logs del endpoint (`console.log` con prefijo `[BANK-RECON]` y el diagnóstico Python `PYTHON DIAG …`). El `ROLLBACK` garantiza que la BD no quede a medias. |
| Login devuelve «Usuario no encontrado» | Usuario inactivo o inexistente | Verificar `estado='ACTIVO'` en `usuarios`. |
| El login deja de funcionar tras cambiar BD | Pool mal configurado | Revisar `DB_HOST/PORT/USER/PASSWORD/NAME` en `.env.local` y `git status` no debe romper `.env`. |
| OneDrive devuelve 403 AccessDenied | Credenciales Azure expiradas o sin permisos sobre las carpetas | Rotar `AZURE_CLIENT_SECRET`; verificar consentimientos (scopes `Files.ReadWrite.All`, `Mail.Send`) y que `ONEDRIVE_USER` tenga acceso a las carpetas. |
| Preview de documento falla | Permisos de OneDrive o carpeta no compartida | Probable error en `/items/{id}/preview`; revisar permisos del usuario de servicio. |

### 11.2 Puntos de falla conocidos a vigilar

- **Dependencia del microservicio OCR**: sin él, las imágenes y PDF escaneados no se procesan (los PDF de texto sí). Está protegido por PM2 (autorestart) y una cola con reintentos.
- **Cuotas de OpenAI**: la extracción IA depende de la cuota de la API key (`429` puede bloquear importaciones masivas). Los intentos 503 se reintentan automáticamente (máx. 3, con 60 s de espera).
- **Dependencia de Microsoft Graph**: OneDrive/Outlook dependen del tenant/configuración de Azure; la expiración de secretos interrumpe respaldo y correo.
- **Formato del Excel bancario**: el parser asume cabecera en la **fila 5** y columnas `Fecha`/`Monto`. Cambios en el formato del banco requieren ajustar `header=4` y las columnas en `bank_reconciliation.py`.
- **Integridad transaccional**: la conciliación y la importación usan transacciones; en caso de error se hace `ROLLBACK` (no hay estados parciales).
- **Timezone/fechas**: las fechas se manejan en formato `YYYY-MM-DD`; la hora de auditoría usa `NOW()` de MySQL (zona del servidor).

### 11.3 Recomendaciones técnicas para robustez futura

1. **Versionar el esquema de base de datos**: crear archivos de migraciones SQL (o una herramienta tipo Prisma/Migrate) para que el esquema sea reproducible y trazable.
2. **Cifrar en producción**: activar `secure: true` en la cookie de sesión y servir todo el tráfico por HTTPS.
3. **Revisar `typescript.ignoreBuildErrors`**: una vez estabilizado el desarrollo, activar el chequeo estricto de tipos en el build para evitar errores silenciosos.
4. **Centralizar los logs**: hoy se escribe profusamente a `console.log`; conviene integrar un sistema de logs estructurados (p. ej. pino) para búsqueda y monitorización.
5. **Backups**: programa copias de MySQL (por ejemplo `mysqldump` diario) y verifica que el respaldo en OneDrive siga activo.
6. **Monitorización proactiva**: un *healthcheck* que combine `/health` del OCR, el dashboard y un `SELECT 1` a MySQL para alertar automáticamente.

---

## 12. GLOSARIO

| Término | Definición |
|---|---|
| **Valorización** | Documento que cuantifica el servicio prestado por un período (equivalente a facturación parcial por avance de obra/servicio) |
| **CxC / Cuentas por Cobrar** | Documentos donde SEAMAR es el **emisor** (clientes le deben a SEAMAR) |
| **CxP / Cuentas por Pagar** | Documentos donde SEAMAR es el **receptor** (SEAMAR debe a proveedores) |
| **Detracción (SPOT)** | Descuento tributario peruano que el comprador deposita en la cuenta de detracciones del Banco de la Nación |
| **RUC** | Registro Único de Contribuyentes (identificación tributaria peruana, 11 dígitos) |
| **OCR** | Reconocimiento óptico de caracteres (PaddleOCR) |
| **Graph API** | API REST de Microsoft 365 (OneDrive, Outlook, etc.) |
| **SUNAT** | Administración Tributaria peruana |
| **PM2** | Gestor de procesos de Node/Python en producción |
| **Valorización negocio** | Mercado de la operación (p. ej. REPSOL) usada para elegir el importador Excel |

---

*Documento técnico elaborado como referencia oficial de arquitectura, flujos y operación del sistema SEAMAR. Para consultas técnicas adicionales, revisar el código fuente comentado y los logs operativos del entorno.*