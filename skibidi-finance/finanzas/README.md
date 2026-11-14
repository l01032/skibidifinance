# Finanzas

App de finanzas personales (React + TypeScript + Tailwind). Los datos viven solo en tu navegador (`localStorage`); no hay servidor ni cuentas.

## Local

```bash
npm install
npm run dev
```

## Publicar en GitHub Pages

1. Sube el proyecto a un repositorio de GitHub (rama `main`).
2. En **Settings → Pages**, elige **Source: GitHub Actions**.
3. Cada push a `main` compila y publica. La app usa rutas con `#` y `base: './'`, así que funciona en `usuario.github.io/repositorio/` sin configuración extra.

## Respaldo

Herramientas → Datos y respaldo: exporta JSON/CSV y restaura. Haz respaldos: borrar los datos del sitio o cambiar de navegador elimina la información.
