export const environment = {
  production: true,
  // Backend desplegado en Render (demostración). Cambiar por el dominio propio cuando exista.
  apiUrl: 'https://arquinova-backend.onrender.com/api',
  // Dirección del sitio (por ejemplo https://www.dominio.com), sin barra al final. Sirve para la dirección canónica y
  // para compartir en redes. Déjala vacía mientras el sitio no tenga dominio propio.
  sitioUrl: '',
  // Empresa dueña del sitio (para leer sus textos institucionales cuando todavía no hay proyectos)
  empresaId: 1,
  // Datos de contacto públicos de la empresa (un solo lugar para cambiarlos)
  contacto: {
    whatsapp: '573168653715',          // formato internacional, sin '+' ni espacios (para wa.me)
    telefonoTexto: '+57 316 865 3715', // como se muestra en la página
    correo: 'grupoarquinova1@gmail.com'
  }
};
