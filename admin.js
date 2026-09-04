/* ==========================================================================
   LÓGICA ADMINISTRATIVA - PANEL DE CONTROL Y GESTIÓN DE INVENTARIO
   ========================================================================== */

const SUPABASE_URL = 'https://wgrwabzusigtwqffugnq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_yGvX3ttsjSYHpdz-QrylBA_a1kbj7VX';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let mostrarTodos = false;

/* ==========================================================================
   EVALUACIÓN Y CONTROL DE SESIÓN
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    evaluarSesion(session);
  });
});

function evaluarSesion(session) {
  const seccionLogin = document.getElementById('seccion-login');
  const seccionDashboard = document.getElementById('seccion-dashboard');
  const seccionInventario = document.getElementById('seccion-inventario');

  if (session) {
    if (seccionLogin) seccionLogin.classList.add('oculto');
    if (seccionDashboard) seccionDashboard.classList.remove('oculto');
    if (seccionInventario) seccionInventario.classList.remove('oculto');
    cargarInventarioAdmin();
  } else {
    if (seccionLogin) seccionLogin.classList.remove('oculto');
    if (seccionDashboard) seccionDashboard.classList.add('oculto');
    if (seccionInventario) seccionInventario.classList.add('oculto');
  }
}

/* ==========================================================================
   AUTENTICACIÓN Y REGISTRO
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.getElementById('form-login');
  const formEjemplar = document.getElementById('form-ejemplar');
  const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');

  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loginMsg = document.getElementById('login-msg');
      if (loginMsg) {
        loginMsg.className = 'mensaje-estado';
        loginMsg.textContent = 'Autenticando credenciales...';
      }

      const email = document.getElementById('login-email')?.value.trim();
      const password = document.getElementById('login-password')?.value;

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        if (loginMsg) {
          loginMsg.className = 'mensaje-estado error';
          loginMsg.textContent = 'Error: Credenciales inválidas.';
        }
      } else {
        if (loginMsg) loginMsg.textContent = '';
        formLogin.reset();
      }
    });
  }

  if (btnCerrarSesion) {
    btnCerrarSesion.addEventListener('click', async () => {
      await supabaseClient.auth.signOut();
    });
  }

  if (formEjemplar) {
    formEjemplar.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dashboardMsg = document.getElementById('dashboard-msg');
      const btnGuardar = document.getElementById('btn-guardar');

      if (dashboardMsg) {
        dashboardMsg.className = 'mensaje-estado';
        dashboardMsg.textContent = 'Procesando imagen y guardando datos...';
      }
      if (btnGuardar) btnGuardar.disabled = true;

      try {
        const codigo = document.getElementById('codigo').value.trim();
        const especie = document.getElementById('especie').value;
        const genetica = document.getElementById('genetica').value.trim();
        const sexo = document.getElementById('sexo').value;
        const nacimiento = parseInt(document.getElementById('nacimiento').value, 10);
        const precio = parseFloat(document.getElementById('precio').value);
        const estatus = document.getElementById('estatus').value;
        const archivoFoto = document.getElementById('foto').files[0];

        if (!archivoFoto) {
          throw new Error('Debe adjuntar una fotografía del ejemplar.');
        }

        const extension = archivoFoto.name.split('.').pop();
        const nombreArchivo = `${Date.now()}_${codigo.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;

        const { error: uploadError } = await supabaseClient.storage
          .from('ejemplares')
          .upload(nombreArchivo, archivoFoto, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabaseClient.storage
          .from('ejemplares')
          .getPublicUrl(nombreArchivo);

        const imagen_url = urlData.publicUrl;

        const { error: dbError } = await supabaseClient
          .from('ejemplares')
          .insert([{ id: codigo, especie, genetica, sexo, nacimiento, precio, estatus, imagen_url }]);

        if (dbError) throw dbError;

        if (dashboardMsg) {
          dashboardMsg.className = 'mensaje-estado exito';
          dashboardMsg.textContent = 'Ejemplar registrado exitosamente.';
        }
        formEjemplar.reset();
        cargarInventarioAdmin();

      } catch (error) {
        console.error('Error al guardar:', error);
        if (dashboardMsg) {
          dashboardMsg.className = 'mensaje-estado error';
          dashboardMsg.textContent = `Error: ${error.message || 'No se pudo guardar el registro.'}`;
        }
      } finally {
        if (btnGuardar) btnGuardar.disabled = false;
      }
    });
  }
});

/* ==========================================================================
   CARGA Y CONSULTA DE INVENTARIO
   ========================================================================== */

async function cargarInventarioAdmin() {
  const contenedor = document.getElementById('lista-inventario');
  const btnToggle = document.getElementById('btn-toggle-vistas');
  if (!contenedor) return;

  try {
    let { data: ejemplares, error } = await supabaseClient
      .from('ejemplares')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      const retry = await supabaseClient.from('ejemplares').select('*');
      ejemplares = retry.data;
      error = retry.error;
    }

    if (error) throw error;

    if (!ejemplares || ejemplares.length === 0) {
      contenedor.innerHTML = '<p style="text-align:center; color:#64748b; padding: 20px 0;">No hay ejemplares registrados en la base de datos.</p>';
      return;
    }

    if (btnToggle) {
      btnToggle.textContent = mostrarTodos ? 'Ver últimos 5' : 'Ver completo';
      if (mostrarTodos) {
        btnToggle.classList.add('activo');
      } else {
        btnToggle.classList.remove('activo');
      }
    }

    const listaAProcesar = mostrarTodos ? ejemplares : ejemplares.slice(0, 5);

    contenedor.innerHTML = listaAProcesar.map(item => `
      <div class="inv-card">
        <div style="display:flex; align-items:center; gap:14px; flex-grow:1;">
          <img src="${item.imagen_url || 'https://via.placeholder.com/60'}" alt="${item.genetica || ''}" class="inv-thumb">
          <div class="inv-details">
            <span class="inv-title">ID: ${item.id} — ${item.genetica || 'Sin detalle'}</span>
            <span class="inv-meta">${item.especie} | Sexo: ${item.sexo} | Año: ${item.nacimiento}</span>
            <span class="inv-price">$${Number(item.precio || 0).toLocaleString('en-US')} MXN</span>
          </div>
        </div>
        
        <div class="inv-controls">
          <select class="select-estatus-sm" onchange="cambiarEstatus('${item.id}', this.value)">
            <option value="Disponible" ${item.estatus === 'Disponible' ? 'selected' : ''}>Disponible</option>
            <option value="Apartado" ${item.estatus === 'Apartado' ? 'selected' : ''}>Apartado</option>
            <option value="Vendido" ${item.estatus === 'Vendido' ? 'selected' : ''}>Vendido</option>
            <option value="Holdback" ${item.estatus === 'Holdback' ? 'selected' : ''}>Holdback</option>
          </select>
          
          <button class="btn-sm btn-precio" onclick="cambiarPrecio('${item.id}', ${item.precio})">Editar Precio</button>
          <button class="btn-sm btn-delete" onclick="eliminarEjemplar('${item.id}')">Eliminar</button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error al cargar inventario:', err);
    contenedor.innerHTML = `<p class="error" style="text-align:center; padding: 15px;">Error de consulta: ${err.message || 'Verifica la consola para más detalles.'}</p>`;
  }
}

function toggleMostrarTodos() {
  mostrarTodos = !mostrarTodos;
  cargarInventarioAdmin();
}

/* ==========================================================================
   ACCIONES SOBRE EL INVENTARIO Y CSV
   ========================================================================== */

async function descargarCSV() {
  try {
    const { data: ejemplares, error } = await supabaseClient
      .from('ejemplares')
      .select('id, especie, genetica, sexo, nacimiento, precio, estatus');

    if (error) throw error;
    if (!ejemplares || ejemplares.length === 0) {
      alert('No existen registros para exportar.');
      return;
    }

    const encabezados = ['ID', 'Especie', 'Genética/Localidad', 'Sexo', 'Nacimiento', 'Precio (MXN)', 'Estatus'];
    const filas = ejemplares.map(item => [
      `"${item.id || ''}"`,
      `"${item.especie || ''}"`,
      `"${item.genetica || ''}"`,
      `"${item.sexo || ''}"`,
      `"${item.nacimiento || ''}"`,
      `"${item.precio || 0}"`,
      `"${item.estatus || ''}"`
    ]);

    const contenidoCSV = '\uFEFF' + [encabezados.join(','), ...filas.map(f => f.join(','))].join('\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.setAttribute('href', url);
    enlace.setAttribute('download', `inventario_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);

  } catch (err) {
    alert('Error al descargar el CSV: ' + err.message);
  }
}

async function cambiarEstatus(idEjemplar, nuevoEstatus) {
  const { error } = await supabaseClient
    .from('ejemplares')
    .update({ estatus: nuevoEstatus })
    .eq('id', idEjemplar);

  if (error) {
    alert('Error al actualizar disponibilidad: ' + error.message);
  } else {
    cargarInventarioAdmin();
  }
}

async function cambiarPrecio(idEjemplar, precioActual) {
  const nuevoPrecioRaw = prompt(`Nuevo precio para el ejemplar ${idEjemplar}:`, precioActual);
  if (nuevoPrecioRaw === null) return;

  const nuevoPrecio = parseFloat(nuevoPrecioRaw);
  if (isNaN(nuevoPrecio) || nuevoPrecio < 0) {
    alert('Ingresa un número válido para el precio.');
    return;
  }

  const { error } = await supabaseClient
    .from('ejemplares')
    .update({ precio: nuevoPrecio })
    .eq('id', idEjemplar);

  if (error) {
    alert('Error al actualizar precio: ' + error.message);
  } else {
    cargarInventarioAdmin();
  }
}

async function eliminarEjemplar(idEjemplar) {
  if (!confirm(`¿Confirmas la eliminación del ejemplar ${idEjemplar}?`)) return;

  const { error } = await supabaseClient
    .from('ejemplares')
    .delete()
    .eq('id', idEjemplar);

  if (error) {
    alert('Error al eliminar: ' + error.message);
  } else {
    cargarInventarioAdmin();
  }
}

window.toggleMostrarTodos = toggleMostrarTodos;
window.descargarCSV = descargarCSV;
window.cambiarEstatus = cambiarEstatus;
window.cambiarPrecio = cambiarPrecio;
window.eliminarEjemplar = eliminarEjemplar;