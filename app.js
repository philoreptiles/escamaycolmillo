/* ==========================================================================
   CONFIGURACIÓN PÚBLICA - ESCAMA Y COLMILLO
   ========================================================================== */

// Configuración de credenciales de Supabase
const SUPABASE_URL = 'https://wgrwabzusigtwqffugnq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yGvX3ttsjSYHpdz-QrylBA_a1kbj7VX'; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Número oficial de WhatsApp para consultas (Guadalajara, Jalisco)
const WHATSAPP_NUMERO = "523300000000"; 

let todosLosEjemplares = [];
let ejemplaresFiltrados = [];
let indiceActualModal = 0;

/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  cargarEjemplares();
  suscribirCambiosEnTiempoReal();

  const filtrosBar = document.querySelector('.filtros-bar');
  if (filtrosBar) {
    filtrosBar.addEventListener('change', aplicarFiltros);
  }

  // Configuración del Visor Lightbox
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

  if (btnPrev) btnPrev.addEventListener('click', () => navegarModal(-1));
  if (btnNext) btnNext.addEventListener('click', () => navegarModal(1));

  // Control mediante teclado
  document.addEventListener('keydown', (e) => {
    if (!modal || !modal.classList.contains('activo')) return;
    if (e.key === 'ArrowLeft') navegarModal(-1);
    if (e.key === 'ArrowRight') navegarModal(1);
    if (e.key === 'Escape') modal.classList.remove('activo');
  });

  // Evento para abrir fotografía
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
   SUSCRIPCIÓN EN TIEMPO REAL (REALTIME)
   ========================================================================== */

function suscribirCambiosEnTiempoReal() {
  supabaseClient
    .channel('cambios-ejemplares')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'ejemplares' },
      (payload) => {
        const idEjemplar = payload.new.id || payload.new.codigo;
        alert(`La ficha del ejemplar "${idEjemplar}" ha sido actualizada.`);
        cargarEjemplares();
      }
    )
    .subscribe();
}

/* ==========================================================================
   CARGA Y FILTRADO DE DATOS
   ========================================================================== */

async function cargarEjemplares() {
  const contenedor = document.getElementById('catalogo-grid');
  
  try {
    const { data, error } = await supabaseClient
      .from('ejemplares')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    todosLosEjemplares = data.map(item => ({
      codigo: item.codigo || item.id,
      especie: item.especie || 'Crotalus atrox',
      genetica: item.genetica || 'Sin especificar',
      sexo: item.sexo || 'No sexado',
      nacimiento: item.nacimiento || '',
      precio: item.precio || 0,
      estatus: item.estatus || 'Disponible',
      imagen_url: item.imagen_url || ''
    }));

    poblarFiltroNacimiento(todosLosEjemplares);
    aplicarFiltros();

  } catch (error) {
    console.error('Error cargando la colección desde Supabase:', error);
    if (contenedor) {
      contenedor.innerHTML = '<p class="cargando">No se pudo establecer conexión con la base de datos.</p>';
    }
  }
}

function poblarFiltroNacimiento(ejemplares) {
  const selectNacimiento = document.getElementById('filtro-nacimiento');
  if (!selectNacimiento) return;

  selectNacimiento.innerHTML = '<option value="todos">Todos los años</option>';

  const anosUnicos = [...new Set(ejemplares.map(item => item.nacimiento).filter(Boolean))].sort((a, b) => b - a);

  const fragmento = document.createDocumentFragment();
  anosUnicos.forEach(ano => {
    const option = document.createElement('option');
    option.value = ano;
    option.textContent = ano;
    fragmento.appendChild(option);
  });
  selectNacimiento.appendChild(fragmento);
}

function parsearPrecio(precioRaw) {
  if (!precioRaw) return 0;
  const limpio = String(precioRaw).replace(/[^0-9.]/g, '');
  return parseFloat(limpio) || 0;
}

function formatearPrecio(precioRaw) {
  const numero = parsearPrecio(precioRaw);
  return numero.toLocaleString('en-US');
}

function aplicarFiltros() {
  const filtroEstatus = document.getElementById('filtro-estatus');
  const filtroSexo = document.getElementById('filtro-sexo');
  const filtroNacimiento = document.getElementById('filtro-nacimiento');
  const filtroPrecio = document.getElementById('filtro-precio');
  const ordenPrecio = document.getElementById('orden-precio');

  if (!filtroEstatus || !filtroSexo || !filtroNacimiento || !filtroPrecio || !ordenPrecio) return;

  const estatusVal = filtroEstatus.value;
  const sexoVal = filtroSexo.value;
  const nacimientoVal = filtroNacimiento.value;
  const rangoPrecioVal = filtroPrecio.value;
  const ordenPrecioVal = ordenPrecio.value;

  ejemplaresFiltrados = todosLosEjemplares.filter(item => {
    const coincideEstatus = estatusVal === 'todos' || (item.estatus && item.estatus.toLowerCase().trim() === estatusVal.toLowerCase());
    const coincideSexo = sexoVal === 'todos' || (item.sexo && item.sexo.toLowerCase() === sexoVal.toLowerCase());
    const coincideNacimiento = nacimientoVal === 'todos' || String(item.nacimiento) === String(nacimientoVal);

    const precioNum = parsearPrecio(item.precio);
    let coincidePrecio = true;

    if (rangoPrecioVal === 'menos-2999') coincidePrecio = precioNum < 2999;
    else if (rangoPrecioVal === '2999-10000') coincidePrecio = precioNum >= 2999 && precioNum <= 10000;
    else if (rangoPrecioVal === 'mas-10000') coincidePrecio = precioNum > 10000;

    return coincideEstatus && coincideSexo && coincideNacimiento && coincidePrecio;
  });

  if (ordenPrecioVal === 'menor-mayor') {
    ejemplaresFiltrados.sort((a, b) => parsearPrecio(a.precio) - parsearPrecio(b.precio));
  } else if (ordenPrecioVal === 'mayor-menor') {
    ejemplaresFiltrados.sort((a, b) => parsearPrecio(b.precio) - parsearPrecio(a.precio));
  }

  renderizarCatalogo(ejemplaresFiltrados);
}

/* ==========================================================================
   RENDERIZADO DE FICHAS DE EJEMPLARES
   ========================================================================== */

function renderizarCatalogo(ejemplares) {
  const contenedor = document.getElementById('catalogo-grid');
  if (!contenedor) return;
  
  contenedor.innerHTML = '';

  if (ejemplares.length === 0) {
    contenedor.innerHTML = '<p class="cargando">No se encontraron ejemplares que coincidan con los criterios seleccionados.</p>';
    return;
  }

  const fragmento = document.createDocumentFragment();

  ejemplares.forEach((item, index) => {
    const tarjeta = document.createElement('article');
    tarjeta.className = 'card';

    const urlImagen = item.imagen_url || '';
    const precioFormateado = formatearPrecio(item.precio);
    const textoMensaje = `Hola Escama y Colmillo, me interesa consultar disponibilidad del ejemplar ID: ${item.codigo}`;
    const mensajeWA = encodeURIComponent(textoMensaje);
    const estatusClase = item.estatus ? item.estatus.toLowerCase().trim() : '';

    tarjeta.innerHTML = `
      <div class="card-img">
        <img src="${urlImagen}" 
             alt="${item.genetica}" 
             loading="lazy" 
             class="img-ampliable"
             data-index="${index}">
        <span class="status-badge ${estatusClase}">${item.estatus}</span>
      </div>

      <div class="card-body">
        <span class="especie">${item.especie}</span>
        <h3>${item.genetica}</h3>

        <ul class="detalles-list">
          <li><span>ID:</span> <strong>${item.codigo}</strong></li>
          <li><span>Sexo:</span> <strong>${item.sexo}</strong></li>
          <li><span>Nacimiento:</span> <strong>${item.nacimiento}</strong></li>
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
   LIGHTBOX
   ========================================================================== */

function mostrarModalPorIndice(index) {
  if (!ejemplaresFiltrados.length || index < 0 || index >= ejemplaresFiltrados.length) return;

  indiceActualModal = index;
  const item = ejemplaresFiltrados[indiceActualModal];
  const urlImagen = item.imagen_url || '';

  const modal = document.getElementById('modal-imagen');
  const modalImg = document.getElementById('modal-img-target');
  const modalCaption = document.getElementById('modal-caption');

  if (!modal || !modalImg || !modalCaption) return;

  modalImg.src = urlImagen;
  modalCaption.innerHTML = `
    ID: ${item.codigo || 'N/A'} &nbsp;|&nbsp; 
    Especie: ${item.especie || 'N/A'} &nbsp;|&nbsp; 
    Sexo: ${item.sexo || 'N/A'} &nbsp;|&nbsp; 
    Nacimiento: ${item.nacimiento || 'N/A'} &nbsp;|&nbsp; 
    Precio: $${formatearPrecio(item.precio)} MXN
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