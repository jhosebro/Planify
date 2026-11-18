# Landing web de Planify — diseño corto

## Intención
Conseguir usuarios. Hoy la app no está en Google Play, así que la conversión inmediata es **registrarse y usarla en la web**; la descarga queda anunciada como "Próximamente en Google Play" y se activa cuando la app esté publicada.

## Metas / no-metas
- Meta: un visitante sin sesión entiende en 5 segundos qué es Planify y hace clic en "Empezar gratis".
- No-meta: SEO fuerte, anuncios, blog, lista de espera por correo (el registro web ya captura al usuario).
- Anti-meta: que un usuario con sesión vea la landing, o que la app nativa la muestre.

## Enfoques considerados
1. **Pantalla `Landing` dentro de la app web (elegido).** Mismo deploy y mismo sistema de diseño. Coste: carga inicial de RN Web y SEO limitado.
2. Sitio estático aparte: más rápido y mejor SEO, pero es un segundo proyecto que mantener. Se puede migrar después.
3. Ruta estática con el export de Expo: obliga a usar Expo Router, que la app no usa.

## Diseño
- `src/screens/auth/LandingScreen.tsx`, registrada en `AuthStack` como `initialRouteName` **solo cuando `Platform.OS === 'web'`**. En nativo sigue siendo `Login`.
- Secciones, en una sola página con scroll y responsive (`useResponsiveLayout`):
  1. **Barra superior:** logo y "Iniciar sesión".
  2. **Hero:** titular, subtítulo, CTA principal "Empezar gratis" (lleva a `Register`), CTA secundario "Ya tengo cuenta" (lleva a `Login`) y una insignia "Próximamente en Google Play" no clicable. A la derecha, en escritorio, una maqueta de la app hecha con componentes, no con capturas de datos reales.
  3. **Funciones (6 tarjetas):** cuentas, movimientos, presupuestos, deudas y tarjetas, metas, seguimiento. Iconos con `AppIcon`.
  4. **Cómo funciona:** 3 pasos.
  5. **CTA final** repetido y pie de página con año dinámico.
- Estilo: los tokens del tema actual (`useThemeColors`), con soporte de modo claro y oscuro.
- La URL de Play Store se deja en una constante (`PLAY_STORE_URL = null`). Cuando tenga valor, la insignia se convierte en un enlace "Descargar en Google Play" sin tocar nada más.

## A criterio del implementador
Textos exactos, la maqueta del hero y el layout de las tarjetas.
