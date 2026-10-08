export const environment = {
  production: true,
  // Backend desplegado en Render (demostración). Cambiar por el dominio propio cuando exista.
  apiUrl: 'https://arquinova-backend.onrender.com/api',
  // Datos de contacto públicos de la empresa (un solo lugar para cambiarlos)
  contacto: {
    whatsapp: '573168653715',          // formato internacional, sin '+' ni espacios (para wa.me)
    telefonoTexto: '+57 316 865 3715', // como se muestra en la página
    correo: 'grupoarquinova1@gmail.com'
  }
};
