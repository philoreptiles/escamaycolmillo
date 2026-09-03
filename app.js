/* ==========================================================================
   CONFIGURACIÓN PRINCIPAL
   ========================================================================== */

const SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbyA5ofLcZQd9wEfEdNsAZNuH9EHP_Q0B4eVFNMcW-SQtInZbpp-6WTRdz9EfhNgk8jWeg/exec';
const WHATSAPP_NUMERO = "5215512345678"; 

let todosLosEjemplares = [];
let ejemplaresFiltrados = [];
let indiceActualModal = 0;

/* ==========================================================================
   INICIALIZACIÓN Y EVENTOS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  cargarEjemplares();

  // Delegación de eventos en filtros
  const filtrosBar = document.querySelector('.filtros-bar');
  if (filtrosBar) {
    filtrosBar.addEventListener('change', aplicarFiltros);
  }

  // Eventos para el Modal
  const modal = document.getElementById('modal-imagen');
  const btnCerrar = document.querySelector('.cerrar-modal');
  const btnPrev = document.getElementById('modal-prev');
  const btnNext = document.getElementById('modal-next');

  if (btnCerrar) {
    btnCerrar.addEventListener('click', () => modal.classList.remove('activo'));
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('activo');
    });
  }

  if (btnPrev) {
    btnPrev.addEventListener('click', () => navegarModal(-1));
  }

  if (btnNext) {
    btnNext.addEventListener('click', () => navegarModal(1));
  }

  // Navegación con teclado (Flechas izq/der y Escape)
  document.addEventListener('keydown', (e) => {
    if (!modal || !modal.classList.contains('activo')) return;

    if (e.key === 'ArrowLeft') navegarModal(-1);
    if (e.key === 'ArrowRight') navegarModal(1);
    if (e.key === 'Escape') modal.classList.remove('activo');
  });

  // Delegación de clic sobre la imagen para abrir modal
  document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('img-ampliable')) {
      const index = parseInt(e.target.dataset.index, 10);
      if (!isNaN(index)) {
        mostrarModalPorIndice(index);
      }
    }
  });
});

/* ==========================================================================
   CARGA DE DATOS
   ========================================================================== */

async function cargarEjemplares() {
  const contenedor = document.getElementById('catalogo-grid');
  
  try {
    const respuesta = await fetch(SHEETS_API_URL);
    const datos = await respuesta.json();

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

  const fragmento = document.createDocumentFragment();
  anosUnicos.forEach(ano => {
    const option = document.createElement('option');
    option.value = ano;
    option.textContent = ano;
    fragmento.appendChild(option);
  });
  selectNacimiento.appendChild(fragmento);
}

/* ==========================================================================
   LÓGICA DE FILTRADO Y FORMATO DE PRECIOS
   ========================================================================== */

function parsearPrecio(precioRaw) {
  if (!precioRaw) return 0;
  const limpio = String(precioRaw).replace(/[^0-9]/g, '');
  return parseFloat(limpio) || 0;
}

// Convierte números como 2500 a "2,500"
function formatearPrecio(precioRaw) {
  const numero = parsearPrecio(precioRaw);
  return numero.toLocaleString('en-US');
}

function aplicarFiltros() {
  const estatusVal = document.getElementById('filtro-estatus').value;
  const sexoVal = document.getElementById('filtro-sexo').value;
  const nacimientoVal = document.getElementById('filtro-nacimiento').value;
  const rangoPrecioVal = document.getElementById('filtro-precio').value;
  const ordenPrecioVal = document.getElementById('orden-precio').value;

  ejemplaresFiltrados = todosLosEjemplares.filter(item => {
    const coincideEstatus = estatusVal === 'todos' || (item.Estatus && item.Estatus.toLowerCase().trim() === estatusVal.toLowerCase());
    const coincideSexo = sexoVal === 'todos' || (item.Sexo && item.Sexo.toLowerCase() === sexoVal.toLowerCase());
    const coincideNacimiento = nacimientoVal === 'todos' || String(item.Nacimiento) === String(nacimientoVal);

    const precioNum = parsearPrecio(item.Precio);
    let coincidePrecio = true;

    if (rangoPrecioVal === 'menos-2999') {
      coincidePrecio = precioNum < 2999;
    } else if (rangoPrecioVal === '2999-10000') {
      coincidePrecio = precioNum >= 2999 && precioNum <= 10000;
    } else if (rangoPrecioVal === 'mas-10000') {
      coincidePrecio = precioNum > 10000;
    }

    return coincideEstatus && coincideSexo && coincideNacimiento && coincidePrecio;
  });

  if (ordenPrecioVal === 'menor-mayor') {
    ejemplaresFiltrados.sort((a, b) => parsearPrecio(a.Precio) - parsearPrecio(b.Precio));
  } else if (ordenPrecioVal === 'mayor-menor') {
    ejemplaresFiltrados.sort((a, b) => parsearPrecio(b.Precio) - parsearPrecio(a.Precio));
  }

  renderizarCatalogo(ejemplaresFiltrados);
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

  const fragmento = document.createDocumentFragment();

  ejemplares.forEach((item, index) => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'card';

    let urlImagen = item.imagen_url ? item.imagen_url.trim() : '';
    if (urlImagen.includes('imgur.com') && !urlImagen.includes('i.imgur.com')) {
      const imgurId = urlImagen.split('/').filter(Boolean).pop();
      urlImagen = `https://i.imgur.com/${imgurId}.png`;
    }

    const precioFormateado = formatearPrecio(item.Precio);
    const textoMensaje = `Hola, me interesa el ejemplar ${item.id}`;
    const mensajeWA = encodeURIComponent(textoMensaje);
    const estatusClase = item.Estatus ? item.Estatus.toLowerCase().trim() : '';

    tarjeta.innerHTML = `
      <div class="card-img">
        <img src="${urlImagen}" 
             alt="${item['Genética'] || 'Ejemplar'}" 
             loading="lazy" 
             referrerpolicy="no-referrer"
             class="img-ampliable"
             data-index="${index}">
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
          <span class="precio">$${precioFormateado} MXN</span>
          <a href="https://wa.me/${WHATSAPP_NUMERO}?text=${mensajeWA}" target="_blank" class="btn-card-wa">
            Consultar
          </a>
        </div>
      </div>
    `;

    fragmento.appendChild(tarjeta);
  });

  contenedor.appendChild(fragmento);
}

/* ==========================================================================
   MÓDULO LIGHTBOX CON NAVEGACIÓN
   ========================================================================== */

function mostrarModalPorIndice(index) {
  if (!ejemplaresFiltrados.length || index < 0 || index >= ejemplaresFiltrados.length) return;

  indiceActualModal = index;
  const item = ejemplaresFiltrados[indiceActualModal];

  let urlImagen = item.imagen_url ? item.imagen_url.trim() : '';
  if (urlImagen.includes('imgur.com') && !urlImagen.includes('i.imgur.com')) {
    const imgurId = urlImagen.split('/').filter(Boolean).pop();
    urlImagen = `https://i.imgur.com/${imgurId}.png`;
  }

  const modal = document.getElementById('modal-imagen');
  const modalImg = document.getElementById('modal-img-target');
  const modalCaption = document.getElementById('modal-caption');

  if (!modal || !modalImg || !modalCaption) return;

  modalImg.src = urlImagen;
  modalCaption.innerHTML = `
    <strong>ID:</strong> ${item.id || 'N/A'} &nbsp;|&nbsp; 
    <strong>Sexo:</strong> ${item.Sexo || 'N/A'} &nbsp;|&nbsp; 
    <strong>Año de Nacimiento:</strong> ${item.Nacimiento || 'N/A'} &nbsp;|&nbsp; 
    <strong>Precio:</strong> $${formatearPrecio(item.Precio)} MXN &nbsp;|&nbsp; 
    <strong>Disponibilidad:</strong> ${item.Estatus || 'N/A'}
  `;

  modal.classList.add('activo');
}

function navegarModal(direccion) {
  if (!ejemplaresFiltrados.length) return;

  let nuevoIndice = indiceActualModal + direccion;

  if (nuevoIndice < 0) {
    nuevoIndice = ejemplaresFiltrados.length - 1;
  } else if (nuevoIndice >= ejemplaresFiltrados.length) {
    nuevoIndice = 0;
  }

  mostrarModalPorIndice(nuevoIndice);
}