# Acceso con Google

## Estado

Implementado en el codigo publicado: boton en login y registro, seleccion de cuenta,
intercambio PKCE de codigo por sesion y retorno al dashboard. Las cuentas nuevas
sin datos de negocio pasan por el asistente de configuracion existente.

El 14 de septiembre de 2026, `/auth/v1/settings` del proyecto confirmo
`external.google = false`. Por eso el boton permanece oculto. La comprobacion
se realiza en el servidor, sin cache, y solo obtiene la configuracion publica.
Un fallo de este proveedor no impide acceder con email y contrasena.

## Configuracion externa pendiente

1. En Google Cloud / Google Auth Platform, crear o elegir el proyecto de TurboAgenda.
2. Configurar nombre, email de soporte, audiencia y enlaces legales completos.
3. Crear un cliente OAuth de tipo Web application.
4. Origen autorizado: `https://turboagenda.pt`.
5. Redirect URI de Google: `https://fwiyzaetgxkgqbwljcbd.supabase.co/auth/v1/callback`.
6. Guardar Client ID y Client Secret en Supabase > Authentication > Sign In / Providers > Google; habilitar el proveedor.
7. Configurar Supabase Site URL como `https://turboagenda.pt` y permitir exactamente
   `https://turboagenda.pt/auth/callback` como redirect adicional.
8. Publicar la aplicacion de Google para usuarios externos cuando corresponda;
   mientras este en modo Testing, solo podran entrar los usuarios de prueba autorizados.
9. El codigo ya esta desplegado en Vercel. Para previews, autorizar solo la URL concreta
   de la preview que se vaya a probar.

El Client Secret se guarda exclusivamente en Supabase, nunca en variables
`NEXT_PUBLIC_*`, capturas, Git o el navegador. Solo se necesitan los permisos
de identidad basicos: openid, email y profile, sin Gmail, contactos ni calendario.

## Verificacion final con una cuenta real

- Acceso nuevo: aceptar los terminos, continuar con Google, completar los datos del negocio.
- Cuenta existente: entrar y comprobar que conserva su negocio, citas y suscripcion.
- Repetir en Safari/iPhone y en la PWA instalada, cerrando sesion entre pruebas.
- Cancelar Google y verificar que se puede reintentar o usar email/contrasena.
- Comprobar recuperacion de contrasena con el flujo existente.

No se ha completado un login real con Google: el proveedor esta deshabilitado y
no se han configurado sus credenciales en esta revision. La aceptacion de terminos
del formulario es una comprobacion de interfaz; el registro legal versionado y
persistente sigue pendiente, igual que en el registro por email.

Documentacion: https://supabase.com/docs/guides/auth/social-login/auth-google
