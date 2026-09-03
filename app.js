/* ==========================================================================
   CONFIGURACIÓN PRINCIPAL
   ========================================================================== */

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyA5ofLcZQd9wEfEdNsAZNuH9EHP_Q0B4eVFNMcW-SQtInZbpp-6WTRdz9EfhNgk8jWeg/exec';
const WHATSAPP_NUMERO = "5215512345678"; 

let todosLosEjemplares = []; // Copia global de los datos de Sheets

/* ==========================================================================
   INICIALIZACIÓN Y EVENTOS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  cargarEjemplares();

  // Asignación de eventos a cada filtro
  document.getElementById('filtro-sexo').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-nacimiento').addEventListener('change', aplicarFiltros);
  document.getElementById('filtro-precio').addEventListener('change', aplicarFiltros);
  document.getElementById('orden-precio').addEventListener('change', aplicarFiltros);
});

/* ==========================================================================
   CARGA DE DATOS
   ========================================================================== */

async function cargarEjemplares() {
  const contenedor = document.getElementById('catalogo-grid');
  
  try {
    const respuesta = await fetch(SHEETS_API_URL);
    const datos = await respuesta.json();

    // Filtra filas totalmente vacías
    todosLosEjemplares = datos.filter(item => item.id || item.Especie);

    poblarFiltroNacimiento(todosLosEjemplares);
    aplicarFiltros();

  } catch (error) {
    console.error('Error cargando el catálogo:', error);
    contenedor.innerHTML = '<p class="cargando">Hubo un problema al cargar el catálogo. Inténtalo de nuevo más tarde.</p>';
  }
}

/* ==========================================================================
   POBLAR AÑOS DINÁMICAMENTE
   ========================================================================== */

function poblarFiltroNacimiento(ejemplares) {
  const selectNacimiento = document.getElementById('filtro-nacimiento');
  const anosUnicos = [...new Set(ejemplares.map(item => item.Nacimiento).filter(Boolean))].sort((a, b) => b - a);

  anosUnicos.forEach(ano => {
    const option = document.createElement('option');
    option.value = ano;
    option.textContent = ano;
    selectNacimiento.appendChild(option);
  });
}

/* ==========================================================================
   LÓGICA DE FILTRADO Y ORDENAMIENTO
   ========================================================================== */

function parsearPrecio(precioRaw) {
  if (!precioRaw) return 0;
  const limpio = String(precioRaw).replace(/[^0-9]/g, '');
  return parseFloat(limpio) || 0;
}

function aplicarFiltros() {
  const sexoVal = document.getElementById('filtro-sexo').value;
  const nacimientoVal = document.getElementById('filtro-nacimiento').value;
  const rangoPrecioVal = document.getElementById('filtro-precio').value;
  const ordenPrecioVal = document.getElementById('orden-precio').value;

  let resultado = todosLosEjemplares.filter(item => {
    // 1. Filtro por Sexo
    const coincideSexo = sexoVal === 'todos' || (item.Sexo && item.Sexo.toLowerCase() === sexoVal.toLowerCase());

    // 2. Filtro por Nacimiento
    const coincideNacimiento = nacimientoVal === 'todos' || String(item.Nacimiento) === String(nacimientoVal);

    // 3. Filtro por Rango de Precio
    const precioNum = parsearPrecio(item.Precio);
    let coincidePrecio = true;

    if (rangoPrecioVal === 'menos-2999') {
      coincidePrecio = precioNum < 2999;
    } else if (rangoPrecioVal === '2999-10000') {
      coincidePrecio = precioNum >= 2999 && precioNum <= 10000;
    } else if (rangoPrecioVal === 'mas-10000') {
      coincidePrecio = precioNum > 10000;
    }

    return coincideSexo && coincideNacimiento && coincidePrecio;
  });

  // 4. Ordenamiento por Precio
  if (ordenPrecioVal === 'menor-mayor') {
    resultado.sort((a, b) => parsearPrecio(a.Precio) - parsearPrecio(b.Precio));
  } else if (ordenPrecioVal === 'mayor-menor') {
    resultado.sort((a, b) => parsearPrecio(b.Precio) - parsearPrecio(a.Precio));
  }

  renderizarCatalogo(resultado);
}

/* ==========================================================================
   RENDERIZAR EN PANTALLA
   ========================================================================== */

function renderizarCatalogo(ejemplares) {
  const contenedor = document.getElementById('catalogo-grid');
  contenedor.innerHTML = '';

  if (ejemplares.length === 0) {
    contenedor.innerHTML = '<p class="cargando">No se encontraron ejemplares con los filtros seleccionados.</p>';
    return;
  }

  ejemplares.forEach(item => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'card';

    let urlImagen = item.imagen_url ? item.imagen_url.trim() : '';
    if (urlImagen.includes('imgur.com') && !urlImagen.includes('i.imgur.com')) {
      const imgurId = urlImagen.split('/').filter(Boolean).pop();
      urlImagen = `https://i.imgur.com/${imgurId}.png`;
    }

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
}