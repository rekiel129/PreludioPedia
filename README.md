# PreludioPedia

Wiki escolar adaptable con el subtítulo **La Wiki de todos los preludianos**. La lectura es pública; para crear o editar contenido se necesita una cuenta de Supabase.

El logotipo de la wiki se guarda en `assets/preludiopedia-logo.webp` y se muestra en la cabecera, la portada, las rutas de navegación y los cuadros de diálogo.

## Funciones

- Carpetas para organizar artículos y ocho diseños visuales al crear uno.
- Artículos con pestañas de lectura, discusión e historial de revisiones.
- Índice automático a partir de encabezados.
- Editor con formato de texto, enlaces, citas, LaTeX, imágenes, video y audio.
- Imágenes colocables en el texto, con ajuste de tamaño, alineación y marco.
- Presentación a pantalla completa, con controles y navegación por teclado.
- Tema claro u oscuro, colores, imagen de fondo, CSS personalizado y preferencias de lectura.
- Inicio de sesión y guardado compartido en Supabase.

## Supabase

`app.js` contiene la Project URL y la **publishable key**, que está diseñada para usarse en código de navegador y puede estar en un repositorio público. No agregues una clave `service_role` o una clave secreta al frontend.

El proyecto se conecta a las tablas `articles`, `folders`, `comments` y `revisions`, y al bucket público `wiki-media`. Los visitantes pueden leer; los usuarios autenticados pueden editar, comentar y subir archivos. Las imágenes se limitan a 3 MB; los videos, a 5 MB; y las notas de audio, a 4 MB. Los archivos que se publican en ese bucket pueden abrirse mediante su URL pública.

### Preparar el inicio de sesión

1. Publica la carpeta del sitio en GitHub Pages o en un servidor HTTPS. Abrir `index.html` como archivo `file:///` sirve para la vista local, pero usa la URL publicada para las cuentas y los correos de confirmación.
2. En Supabase, abre **Authentication → URL Configuration**. Define **Site URL** con la URL que muestra GitHub Pages para este repositorio y agrégala también a **Redirect URLs**. Usa la dirección exacta, incluida la ruta `/PreludioPedia/` si GitHub Pages la muestra.
3. Abre la wiki, pulsa **Iniciar sesión** y crea una cuenta. Si Supabase pide confirmar el correo, usa el enlace que envía y luego inicia sesión.

El proyecto conserva las reglas RLS del SQL que se ejecutó en Supabase; no uses la clave de administrador en la app.

## Guardado y migración

Con sesión iniciada, los artículos, carpetas, comentarios, revisiones e imágenes se comparten mediante Supabase. La apariencia y las preferencias de lectura siguen guardadas en el navegador actual.

Si este navegador tiene artículos locales y la base en la nube aún está vacía, PreludioPedia pregunta si quieres importarlos o empezar con la copia de la nube. Si eliges empezar con la nube, guarda una copia de los datos locales en el almacenamiento de este navegador antes de cambiar la vista.

La vista previa de LaTeX usa MathJax y las fuentes se cargan desde CDNs, por lo que estas partes necesitan conexión a internet.

