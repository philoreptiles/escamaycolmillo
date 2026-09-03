/* ==========================================================================
   CONFIGURACIÓN PRINCIPAL
   ========================================================================== */

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyA5ofLcZQd9wEfEdNsAZNuH9EHP_Q0B4eVFNMcW-SQtInZbpp-6WTRdz9EfhNgk8jWeg/exec';
const WHATSAPP_NUMERO = "5215512345678"; 

/* ==========================================================================
   CARGA DE DATOS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  cargarEjemplares();
});

async function cargarEjemplares() {
  const contenedor = document.getElementById('catalogo-grid');
  
  try {
    const respuesta = await fetch(SHEETS_API_URL);
    const datos = await respuesta.json();

    contenedor.innerHTML = ''; 

    datos.forEach(item => {
      if (!item.id && !item.Especie) return;

      const tarjeta = document.createElement('article');
      tarjeta.className = 'card';

      // Conversión automática de URLs de Imgur
      let urlImagen = item.imagen_url ? item.imagen_url.trim() : '';
      if (urlImagen.includes('imgur.com') && !urlImagen.includes('i.imgur.com')) {
        const imgurId = urlImagen.split('/').filter(Boolean).pop();
        urlImagen = `https://i.imgur.com/${imgurId}.png`;
      }

      // Mensaje automático simplificado con ID del ejemplar
      const textoMensaje = `Hola, me interesa el ejemplar ${item.id}`;
      const mensajeWA = encodeURIComponent(textoMensaje);

      const estatusClase = item.Estatus ? item.Estatus.toLowerCase().trim() : '';

      tarjeta.innerHTML = `
        <div class="card-img">
          <img src="${urlImagen}" alt="${item['Genética']}" loading="lazy" referrerpolicy="no-referrer">
          <span class="status-badge ${estatusClase}">${item.Estatus}</span>
        </div>

        <div class="card-body">
          <span class="especie">${item.Especie}</span>
          <h3>${item['Genética']}</h3>

          <ul class="detalles-list">
            <li><strong>ID:</strong> ${item.id}</li>
            <li><strong>Sexo:</strong> ${item.Sexo}</li>
            <li><strong>Nacimiento:</strong> ${item.Nacimiento}</li>
          </ul>

          <div class="card-footer">
            <span class="precio">$${item.Precio} MXN</span>
            <a href="https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWA}" target="_blank" class="btn-card-wa">
              Consultar
            </a>
          </div>
        </div>
      `;

      contenedor.appendChild(tarjeta);
    });

  } catch (error) {
    console.error('Error cargando catálogo:', error);
    contenedor.innerHTML = '<p class="cargando">Hubo un problema al cargar el catálogo. Inténtalo de nuevo más tarde.</p>';
  }
}