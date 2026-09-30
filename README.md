# PreludioPedia

Prototipo adaptable de una wiki escolar con el subtítulo **La Wiki de todos los preludianos**. Abre `index.html` en un navegador moderno.

## Organización y artículos

- La página inicial empieza sin carpetas; el espacio queda disponible para crear las categorías que la comunidad necesite. Puedes crear y editar carpetas y filtrar sus artículos.
- Crea artículos vacíos con uno de ocho diseños visuales: Minimal, Papel editorial, Azul sereno, Color vivo, Tarjetas, Cuaderno, Noche y Vibrante. El diseño no agrega temas, encabezados ni texto al contenido.
- Cada artículo tiene pestañas de artículo, discusión e historial. Las revisiones guardadas se pueden restaurar.
- El índice lateral se genera automáticamente a partir de los encabezados.
- Personaliza el tamaño, la tipografía y el espaciado de lectura.
- El editor permite formato, enlaces, LaTeX, imágenes, video, audio, dictado y grabación cuando el navegador tiene soporte. Ajusta tamaño, alineación, posición flotante o superpuesta y marco de las imágenes.
- Presenta un artículo a pantalla completa; usa las flechas para cambiar de diapositiva y Esc para salir.
- Cambia entre tema claro y oscuro, elige un color, carga una imagen de fondo y escribe CSS personalizado.

## Guardado y límites

El contenido, las imágenes y los ajustes se guardan en `localStorage` de este navegador. Los archivos multimedia se incluyen como datos locales: imágenes y fondos hasta 3 MB; videos y audios hasta 5 MB y 4 MB, respectivamente. El navegador puede pedir permiso para usar la cámara o el micrófono.

Este prototipo todavía no comparte ni sincroniza el contenido entre personas o dispositivos. Para publicarlo en un dominio como wiki escolar colaborativa, habrá que conectar una API, una base de datos, cuentas/permisos y almacenamiento de archivos.

La vista previa de LaTeX usa MathJax y las fuentes se cargan desde CDNs, por lo que esas partes necesitan conexión a internet.

