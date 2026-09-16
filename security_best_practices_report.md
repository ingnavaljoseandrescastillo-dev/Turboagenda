# TurboAgenda: revision de seguridad, privacidad y mejoras

## Estado en produccion: 2026-09-16

Este apartado actualiza los hallazgos historicos que aparecen mas abajo.

- Aplicadas en Supabase `security_foundation`, `security_hardening` y
  `security_function_permissions`.
- Publicada y promovida a produccion la version `dpl_J9hQ78YmFdJyYDBHMNHdJ4YgqKuY`.
- Verificados permisos: las funciones sensibles de reservas, payload de correo y
  limites de peticiones solo permiten ejecucion con service_role.
- Verificadas la restriccion de solapamientos y retirada de las dos politicas
  publicas de negocios/configuracion. Pruebas de campos administrativos con rollback.
- Build local y remoto, TypeScript y seis pruebas automatizadas superados.
- Proteccion de origen en mutaciones API, limites de longitud para reservas,
  funciones internas restringidas y search_path fijado. Extension btree_gist
  movida al esquema extensions, sin eliminar indices ni datos.
- Comprobadas en navegador la portada publicada y la carga de reservas de Belisse.
- No se enviaron SMS/correos ni se crearon citas reales para estas pruebas.

Pendientes: activacion externa de Google OAuth; completar identidad legal;
politica operativa de retencion/borrado y consentimiento de marketing (los
recordatorios promocionales quedan desactivados). El asesor ya no senala funciones
con search_path mutable ni extensiones publicas. Conserva avisos de los dos
predicados de autorizacion is_business_owner/is_platform_admin, necesarios para
RLS y limitados a auth.uid(), y tablas de acceso exclusivo de servidor o heredadas
sin politicas publicas. La proteccion de contrasenas filtradas requiere activacion
en Supabase Auth; no existe una herramienta de configuracion Auth en esta conexion.
No se declara una auditoria sin hallazgos ni cumplimiento legal certificado.
La entrega incluye codigo, migraciones y pruebas en Git; se excluyen secretos,
capturas y archivos temporales. Los hallazgos inferiores describen la auditoria
inicial, no el estado actual de los permisos en produccion.

Fecha: 2026-09-14. Base revisada: `1e508e1`, mas el cambio local de acceso con Google.

## Resumen

Hay fallos de autorizacion confirmados que merecen prioridad antes de ampliar el
numero de negocios: funciones antiguas de reservas accesibles sin anticipo,
lectura publica de datos de citas por UUID y campos administrativos modificables
por el propietario del negocio. Ademas, faltan protecciones para reservas
simultaneas y las dependencias tienen avisos publicados.

No hay evidencia obtenida de una intrusion previa. Se inspeccionaron codigo,
politicas y definiciones de la base de datos; no se crearon reservas, no se
enviaron mensajes y no se modificaron datos de produccion para probar ataques.
Una revision de codigo no certifica cumplimiento legal ni ausencia de otros fallos.

## Hallazgos de seguridad

### S01 - Alta: una funcion publica expone datos de citas

- Ubicacion: `supabase/patches/035_add_multi_service_appointments.sql:422` y `:480`;
  antecedente en `supabase/patches/014_add_email_notifications.sql:48`.
- Evidencia: `get_appointment_email_payload(uuid)` es SECURITY DEFINER, devuelve
  nombre, email, telefono, horario, servicios y email de notificacion del negocio;
  solo filtra por `a.id = p_appointment_id`. EXECUTE esta concedido a anon y authenticated.
- Confirmacion: definicion y permisos vivos inspeccionados en Supabase.
- Impacto: quien conozca un UUID de cita puede obtener esos datos sin pertenecer
  al negocio. El UUID dificulta descubrir citas, pero no autoriza el acceso.
- Correccion: restringir a service_role y cargar el payload desde codigo servidor
  autorizado. Revisar `src/lib/appointment-emails.ts` antes de revocar para no
  interrumpir correos de nuevas reservas.

### S02 - Alta: las versiones antiguas de reservas eluden el anticipo

- Ubicacion: `supabase/patches/031_make_appointment_email_optional.sql:10` y `:195`,
  frente a `supabase/patches/038_require_deposit_for_new_clients_only.sql:43`.
- Evidencia: siguen publicadas las firmas de 8 y 9 argumentos. La de 8 delega en
  la de 9, que inserta una cita sin comprobar deposito. La de 11 aplica el anticipo.
- Confirmacion: cuerpos y permisos EXECUTE del proyecto real, sin realizar una reserva.
- Impacto: una llamada directa a la API de Supabase puede reservar sin comprobante;
  tambien evita la comprobacion `is_paused` de `src/app/api/appointments/route.ts:57`.
- Correccion: retirar acceso a firmas antiguas y centralizar las reglas de pausa,
  disponibilidad y anticipo en la funcion vigente. Comprobar consumidores antes de eliminar.
- Otra firma antigua usa columnas inexistentes del esquema actual; es deuda de
  migracion, no se cuenta como una via de explotacion confirmada.

### S03 - Alta: propietarios pueden modificar campos administrativos

- Ubicacion: `supabase/patches/003_fix_business_owner_flow.sql:136` y `:164`,
  `supabase/patches/004_fix_authenticated_api_grants.sql:15`,
  `supabase/patches/030_add_sms_trial_override.sql:7`.
- Evidencia: permisos UPDATE de tabla completa y politicas de propietario ALL.
  `has_column_privilege` devuelve true para `business_settings.sms_trial_override_until`
  y `businesses.is_paused` en authenticated; la politica permite escribir en su negocio.
- Impacto: un negocio puede cambiar su excepcion de SMS o quitar una pausa
  administrativa aunque la interfaz no ofrezca esos controles. El efecto en SMS
  depende tambien del resto de comprobaciones de suscripcion y cuota.
- Correccion: separar campos de administracion en tabla privada o restringir
  escritura por columna y exponer operaciones administrativas autorizadas.

### S04 - Alta: dependencias con avisos de seguridad

- Ubicacion: `package.json:18` (Next 16.2.4) y `package-lock.json`.
- Evidencia: `npm audit --omit=dev --json`: 10 paquetes afectados, 1 critico,
  4 altos y 5 moderados. Incluye Next, sharp, postcss, ws, resend y transitivas.
- El numero cuenta paquetes, no vulnerabilidades explotables confirmadas.
  Algunos avisos requieren Windows en produccion, Server Actions, configuraciones
  de imagenes u otras condiciones; no todas aplican a Vercel/TurboAgenda.
- Correccion: actualizar versiones compatibles y lockfile, revisar avisos,
  ejecutar build y pruebas de reservas/auth/imagenes antes de publicar.
  El auditor propuso Next 16.3.5 en esta fecha; revalidar al corregir.
- Fuentes: https://github.com/vercel/next.js/security/advisories y los identificadores
  GHSA-p293-qw3h-jr36, GHSA-2xp9-vwfh-vxw4, GHSA-f88m-g3jw-g9cj.

### S05 - Alta: dos reservas simultaneas pueden ocupar el mismo horario

- Ubicacion: `supabase/patches/038_require_deposit_for_new_clients_only.sql:259`.
- Evidencia: SELECT EXISTS de conflictos y despues INSERT, sin bloqueo por empleado.
  En produccion no hay constraint de exclusion ni indice unico de intervalo;
  los indices inspeccionados solo dan unicidad al ID.
- Impacto: dos transacciones pueden comprobar disponibilidad antes de que ninguna
  inserte y confirmar ambas, especialmente preocupante despues de transferir dinero.
- Correccion: exclusion GiST por empleado y rango temporal para citas activas, o
  serializar con un bloqueo transaccional compartido por todas las vias de reserva.
  Auditar solapamientos existentes y comprobar dos solicitudes concurrentes en pruebas.

### S06 - Media: consulta de historial sin verificar identidad

- Ubicacion: `src/app/api/public-client-status/route.ts:13`,
  `supabase/patches/038_require_deposit_for_new_clients_only.sql:6` y `:167`.
- Evidencia: email O telefono escrito por el visitante determina si tuvo una cita
  completada y si queda exento del anticipo; no hay OTP ni sesion de cliente.
- Impacto: consulta de pertenencia/historial de una persona y posible suplantacion
  de una clienta conocida para evitar anticipo. Los datos viajan ademas en la URL
  de la consulta, que puede acabar en registros de infraestructura.
- Correccion: verificar el contacto antes de aplicar la exencion, o usar un enlace
  firmado para clientas recurrentes. No basta con cambiar GET por POST o esconder el boton.

### S07 - Media: configuracion interna legible publicamente

- Ubicacion: `supabase/patches/003_fix_business_owner_flow.sql:133` y `:164`,
  `supabase/patches/004_fix_authenticated_api_grants.sql:9`.
- Evidencia: SELECT USING(true) sobre businesses y business_settings, con grants
  de tabla a anon. Se confirmo permiso publico sobre `pause_reason`.
- Impacto: se pueden consultar owner_id, razones de pausa, email de notificaciones
  y opciones internas, ademas de los campos necesarios para reservar.
- Correccion: API o vista publica con una lista explicita de columnas; mantener
  configuracion operativa y datos administrativos bajo permisos de propietario/admin.

### S08 - Media: destinos Push arbitrarios provocan peticiones desde el servidor

- Ubicacion: `src/app/api/push-subscriptions/route.ts:14` y
  `src/lib/push-notifications.ts:345`.
- Evidencia: endpoint acepta cualquier URL; se almacena y luego se utiliza en
  `webpush.sendNotification`. La escritura directa con RLS tambien es posible.
- Impacto: un propietario autenticado puede introducir un destino ajeno al servicio
  Push y provocar peticiones del servidor al llegar una notificacion (riesgo SSRF).
  Alcance de red interna y respuesta no comprobados con ataques.
- Correccion: validar HTTPS y proveedores Push conocidos tambien al enviar;
  impedir destinos privados/locales y limitar tiempo, cantidad y tamano.

### S09 - Media: falta control de abuso visible en reservas y comprobantes

- Ubicacion: `src/app/api/appointments/route.ts:37` y `:121`.
- Evidencia: POST publico con subida y correos; no se observa limite persistente
  por IP/contacto/negocio, CAPTCHA ni clave de idempotencia. Tipo de fichero
  validado por MIME declarado, no por contenido.
- Impacto: reservas y correos falsos, consumo de almacenamiento y duplicados por
  reintentos. Las funciones RPC publicas tambien deben cubrirse.
- Correccion: cuotas persistentes, verificacion antiautomatizacion segun riesgo,
  idempotencia y validacion real de archivos. Comprobar reglas de Vercel WAF antes
  de concluir que no hay ninguna defensa externa.
- Un comprobante subido NO confirma una transferencia bancaria. Incorporar revision
  por el negocio con estados pendiente, aceptado y rechazado, mas vencimiento.

## Observaciones adicionales

- Supabase marco cinco funciones sin search_path fijo. Corregir segun privilegios
  y dependencias. No todo SECURITY DEFINER publico es un fallo: disponibilidad y
  reservas necesitan una API publica cuidadosamente limitada.
- Cinco tablas tienen RLS sin politicas. Eso bloquea acceso ordinario; no significa
  que sus datos esten expuestos. Revisar solo si hay flujos que deban utilizarlas.
- Las API privadas muestreadas verifican usuario y negocio; el webhook Twilio
  comprueba firma; el cron exige secreto; los emails escapan HTML; los comprobantes
  usan bucket privado y enlaces firmados con autorizacion del negocio.
- Revisar retencion y revocacion de suscripciones Push al cerrar sesion, MFA para
  administradores y cabeceras de seguridad. No se verificaron todas las reglas WAF,
  backups, SMTP, permisos Google ni historiales de acceso.

## Revision legal y privacidad: Portugal / UE

Estas son brechas tecnicas y documentales detectadas, no un dictamen juridico.
Debe validarse la aplicabilidad concreta con un profesional en Portugal.

### L01 - Prioridad alta: identificacion y contacto incompletos

`src/app/privacidade/page.tsx:20` y `:86`, `src/app/termos/page.tsx:13` y `:89`
contienen literalmente "a completar antes da publicacao final".
Completar titular legal, direccion, NIF/NIPC segun corresponda y contacto operativo
para privacidad y contratos. No se pueden inventar esos datos.
Bases: RGPD articulo 13 y DL 7/2004 sobre servicios en linea.

### L02 - Prioridad alta: separar recordatorios de citas y marketing

`src/lib/rebooking-reminders.ts:147` selecciona clientes por citas pasadas y envia
"Reservar otra vez"; no consulta autorizacion comercial ni bajas, y el email en
`:386` no incorpora un mecanismo de rechazo. Esto puede ser marketing directo,
distinto de recordar una cita ya solicitada.
Documentar consentimiento o la excepcion legal aplicable a clientes existentes,
ofrecer oposicion facil en la recogida y en cada comunicacion y mantener bajas
por canal. Aceptar terminos no autoriza automaticamente promociones.

### L03 - Prioridad alta: condiciones del anticipo antes de transferir

`src/components/booking/BookingForm.tsx:190` da el numero y el importe, pero no
presenta condiciones propias del negocio sobre cancelacion, reembolso, inasistencia,
rechazo del comprobante o perdida de disponibilidad mientras se paga.
Definirlas, presentarlas antes del pago y guardar la version aceptada. No asumir
que el anticipo es siempre no reembolsable ni que todas las reservas tienen las
mismas excepciones al derecho de desistimiento. Revisar DL 24/2014 segun servicio.

### L04 - Prioridad media: actualizar inventario, contratos y conservacion

`src/app/privacidade/page.tsx:25` no describe adecuadamente los comprobantes MB WAY,
Push ni Google. Los proveedores y transferencias se describen genericamente.
Completar categorias, finalidades y bases, proveedores reales (Supabase, Vercel,
Twilio, Resend y Google al activarlo), ubicaciones/garantias y plazos por categoria.
Confirmar contrato de encargado con los negocios (RGPD art. 28) y subencargados.
Implementar y comprobar borrado/exportacion y caducidad de comprobantes, archivos
huerfanos y logs. El plazo de logs de 90 dias declarado no se verifico operacionalmente.
La aceptacion actual se valida en el navegador y se descarta antes de guardar
(`RegisterForm.tsx:41`, `BookingForm.tsx:123`): falta prueba persistente versionada.
No exigir consentimiento como base universal: contrato, obligacion legal e interes
legitimo deben evaluarse para cada finalidad.

### L05 - Pendiente de determinar con datos del titular

Revisar IVA y facturacion, informacion sobre resolucion de litigios y Livro de
Reclamacoes cuando resulten aplicables. La app es B2B para negocios, pero sus
reservas pueden ser B2C. Revisar por separado ambas relaciones. Cookies tecnicas
no requieren el mismo consentimiento que publicidad/analitica; comprobar los
recursos realmente cargados, incluyendo fuentes externas.

## Fuentes oficiales consultadas

- RGPD, en particular arts. 5, 6, 13, 17, 28, 32 y 44:
  https://eur-lex.europa.eu/eli/reg/2016/679/oj
- CNPD, consentimiento:
  https://www.cnpd.pt/organizacoes/areas-tematicas/consentimento/
- CNPD, Diretriz 1/2022 sobre marketing directo:
  https://www.cnpd.pt/decisoes/diretrizes/
- DL 7/2004:
  https://diariodarepublica.pt/dr/detalhe/decreto-lei/7-2004-240775
- DL 24/2014 (comprobar version consolidada y excepciones al aplicarlo):
  https://diariodarepublica.pt/dr/detalhe/decreto-lei/24-2014-572450
- Cookies, Your Europe:
  https://europa.eu/youreurope/business/growing/digitalising/online-privacy/index_pt.htm
- Google OAuth con Supabase:
  https://supabase.com/docs/guides/auth/social-login/auth-google

## Mejoras propuestas, por orden

1. Cerrar acceso a datos y funciones antiguas; proteger campos administrativos.
2. Actualizar dependencias y garantizar reservas atomicas.
3. Verificar identidad para eximir anticipos; revisar comprobantes y liberar reservas rechazadas.
4. Completar textos legales, contratos, consentimientos comerciales y bajas.
5. Panel admin de salud: envios fallidos, consumo/coste SMS, cron y vencimientos.
6. MFA admin, exportacion/borrado, retencion y prueba de restauracion de backups.

## Google: implementacion de esta revision

Boton preparado en login y registro, deteccion de proveedor habilitado, errores
recuperables, PKCE mediante Supabase SSR, retorno limitado a dashboard/recuperacion
y onboarding para nuevas cuentas Google. La consulta real de configuracion devolvio
Google deshabilitado. Falta configurar OAuth en Google Cloud y Supabase y probar
con una cuenta real; ver `docs/google-login-setup.md`.

En la auditoria inicial no se cambiaron permisos ni esquema productivo.
La remediacion del 16 de septiembre si los aplica; consultar el estado inicial
de este documento para los cambios desplegados y los limites de verificacion.

Verificacion del cambio de Google: lint, build y dos pruebas automatizadas de
destinos del callback. Prueba visual en navegador a 390x844 y 1440x1000 con
proveedor local simulado, incluyendo cancelacion OAuth y reintento. No equivale
a verificar Google real ni la creacion de una cuenta productiva.
