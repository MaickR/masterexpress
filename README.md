# Master Express

Sitio web corporativo para el alquiler de **togas, birretes y accesorios de graduación** en Bogotá y Colombia.

Diseñado para colegios, universidades y promociones que necesitan vestuario académico impecable, con cotización directa por WhatsApp o formulario.

<br>

<p align="center">
  <img src="assets/img/logo.png" alt="Master Express" width="120">
</p>

<p align="center">
  <a href="https://masterexpress.com.co"><strong>masterexpress.com.co</strong></a>
  ·
  <a href="https://wa.me/573134695020">WhatsApp</a>
  ·
  <a href="mailto:gerencia@masterexpress.com">gerencia@masterexpress.com</a>
</p>

---

## Características

| Área | Detalle |
|------|---------|
| **Marca** | Identidad visual propia (DM Sans + Playfair Display, acento dorado) |
| **Páginas** | Inicio, Nosotros, Servicios, Galería y Contacto |
| **Cotización** | Formulario a `gerencia@masterexpress.com` + WhatsApp |
| **Motion** | Animaciones con [Anime.js](https://animejs.com) (CDN ESM) |
| **SEO** | Meta, Open Graph, JSON-LD, `robots.txt`, `sitemap.xml` |
| **Performance** | Preload LCP, lazy-load, prefetch de navegación, `.htaccess` |

---

## Estructura

```text
Master Express/
├── index.html          # Inicio
├── nosotros.html       # Historia y equipo
├── servicios.html      # Catálogo y proceso
├── galeria.html        # Mosaic + lightbox
├── contacto.html       # Formulario y FAQ
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── .htaccess
└── assets/
    ├── app.js          # Nav, formulario, galería, anime.js
    ├── styles.css      # Design system
    └── img/            # Logo, héroes, galería, instituciones
```

---

## Desarrollo local

Sirve la carpeta con cualquier servidor estático (FormSubmit no funciona en `file://`):

```bash
# Python
python -m http.server 8765

# Node
npx serve .
```

Abre `http://localhost:8765`.

---

## Stack

- HTML5 semántico · CSS moderno (variables, grid, fluid type)
- JavaScript ES modules
- [Anime.js 4](https://cdn.jsdelivr.net/npm/animejs/+esm) vía jsDelivr / esm.sh
- [Bootstrap Icons](https://icons.getbootstrap.com)
- [FormSubmit](https://formsubmit.co) → `gerencia@masterexpress.com`
- Google Fonts (DM Sans, Playfair Display)

---

## SEO e indexación

Tras el deploy en producción:

1. Verifica la propiedad en [Google Search Console](https://search.google.com/search-console)
2. Envía el sitemap: `https://masterexpress.com.co/sitemap.xml`
3. Activa FormSubmit una vez desde el correo de gerencia (enlace *Activate Form*)

---

## Contacto comercial

- **WhatsApp:** [+57 313 469 5020](https://wa.me/573134695020)
- **Correo:** [gerencia@masterexpress.com](mailto:gerencia@masterexpress.com)
- **Cobertura:** Bogotá y Colombia  
- **Horario:** Lunes a sábado, 8:00 a.m. – 6:00 p.m.

---

<p align="center">
  <sub>© 2026 Master Express · Bogotá, Colombia</sub>
</p>
