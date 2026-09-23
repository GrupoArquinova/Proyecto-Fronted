export class ContactComponent {
  private numeroEmpresa: string = '573167849671'; // Cambia por el número oficial

  abrirWhatsApp(nombreProyecto?: string): void {
    let mensaje = 'Hola, quisiera solicitar información general sobre sus proyectos.';
    
    if (nombreProyecto) {
      mensaje = `Hola, estoy interesado en recibir más información sobre el proyecto ${nombreProyecto}.`;
    }

    // encodeURIComponent convierte espacios y tildes al formato URL adecuado
    const url = `https://wa.me/${this.numeroEmpresa}?text=${encodeURIComponent(mensaje)}`;
    
    // Abre la app o la web de WhatsApp en nueva pestaña
    window.open(url, '_blank');
  }
}