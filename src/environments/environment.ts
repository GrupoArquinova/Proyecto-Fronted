export const environment = {
  production: true,
  // Dominio del backend definido en k8s/ingress.yaml del proyecto backend
  apiUrl: 'https://api.constructora.grupoarquinova.com/api',
  // Datos de contacto públicos de la empresa (un solo lugar para cambiarlos)
  contacto: {
    whatsapp: '573167849671',          // formato internacional, sin '+' ni espacios (para wa.me)
    telefonoTexto: '+57 316 784 9671', // como se muestra en la página
    correo: 'ventas@arquinova.com.co'
  }
};
