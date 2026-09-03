/* ==========================================================================
   CONFIGURACIÓN PRINCIPAL
   ========================================================================== */

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyA5ofLcZQd9wEfEdNsAZNuH9EHP_Q0B4eVFNMcW-SQtInZbpp-6WTRdz9EfhNgk8jWeg/exec';
const WHATSAPP_NUMERO = "5215512345678"; 

/* ==========================================================================
   INICIALIZACIÓN Y CARGA DE DATOS
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
      // Ignora filas vacías si existen en el Sheet
      if (!item.id && !item.Especie) return;

      const tarjeta = document.createElement('article');
      tarjeta.className = 'card';

      // Convierte enlaces normales de Imgur (imgur.com/xxx) a directos (i.imgur.com/xxx.jpg)
      let urlImagen = item.imagen_url || '';
      if (urlImagen.includes('imgur.com') && !urlImagen.includes('i.imgur.com')) {
        const imgurId = urlImagen.split('/').pop();
        urlImagen = `https://i.imgur.com/${imgurId}.jpg`;
      }

      // Prepara el mensaje directo para WhatsApp
      const textoMensaje = `Hola, me interesa consultar el ejemplar ID: ${item.id} - ${item['Genética']} (${item.Especie}).`;
      const mensajeWA = encodeURIComponent(textoMensaje);

      // Clase CSS para el color de la etiqueta (disponible, apartado, vendido, holdback)
      const estatusClase = item.Estatus ? item.Estatus.toLowerCase().trim() : '';

      tarjeta.innerHTML = `
        <div class="card-img">
          <img src="${urlImagen}" alt="${item['Genética']}" loading="lazy">
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
            <span class="precio">${item.Precio} MXN</span>
            <a href="https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWA}" target="_blank" class="btn-card-wa">
              Consultar
            </a>
          </div>
        </div>
      `;

      contenedor.appendChild(tarjeta);
    });

  } catch (error) {
    console.error('Error cargando los datos desde Google Sheets:', error);
    contenedor.innerHTML = '<p class="cargando">Hubo un problema al cargar el catálogo. Inténtalo de nuevo más tarde.</p>';
  }
}