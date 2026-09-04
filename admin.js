/* ==========================================================================
   CONFIGURACIÓN PRINCIPAL (SUPABASE)
   ========================================================================== */

const supabaseUrl = 'https://wgrwabzusigtwqffugnq.supabase.co';
const supabaseKey = 'sb_publishable_yGvX3ttsjSYHpdz-QrylBA_a1kbj7VX'; 

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

/* ==========================================================================
   REFERENCIAS AL DOM
   ========================================================================== */
const seccionLogin = document.getElementById('seccion-login');
const seccionDashboard = document.getElementById('seccion-dashboard');
const formLogin = document.getElementById('form-login');
const formEjemplar = document.getElementById('form-ejemplar');
const btnCerrarSesion = document.getElementById('btn-cerrar-sesion');
const loginMsg = document.getElementById('login-msg');
const dashboardMsg = document.getElementById('dashboard-msg');
const btnGuardar = document.getElementById('btn-guardar');

/* ==========================================================================
   AUTENTICACIÓN Y SESIONES
   ========================================================================== */

function mostrarDashboard() {
  seccionLogin.classList.add('oculto');
  seccionDashboard.classList.remove('oculto');
}

function mostrarLogin() {
  seccionDashboard.classList.add('oculto');
  seccionLogin.classList.remove('oculto');
}

// Suscripción en tiempo real a los cambios del estado de autenticación
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session) {
    mostrarDashboard();
  } else {
    mostrarLogin();
  }
});

formLogin.addEventListener('submit', async (e) => {
  e.preventDefault(); 
  
  loginMsg.textContent = 'Comprobando credenciales...';
  loginMsg.className = 'mensaje-estado';

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    loginMsg.textContent = `Error: ${error.message}`;
    loginMsg.className = 'mensaje-estado error';
  } else {
    loginMsg.textContent = '';
    formLogin.reset();
  }
});

btnCerrarSesion.addEventListener('click', async () => {
  await supabaseClient.auth.signOut();
});

/* ==========================================================================
   REGISTRO DE EJEMPLARES
   ========================================================================== */

formEjemplar.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const idEjemplar = document.getElementById('codigo').value.trim();
  const especie = document.getElementById('especie').value;
  const genetica = document.getElementById('genetica').value.trim();
  const sexo = document.getElementById('sexo').value;
  const nacimiento = document.getElementById('nacimiento').value;
  const precio = document.getElementById('precio').value;
  const estatus = document.getElementById('estatus').value;
  const fotoInput = document.getElementById('foto');
  const archivoFoto = fotoInput.files ? fotoInput.files[0] : null;

  dashboardMsg.textContent = 'Subiendo fotografía y guardando ejemplar... ⏳';
  dashboardMsg.className = 'mensaje-estado';

  let nombreArchivoSubido = null;

  try {
    // Validación de seguridad para la fotografía
    if (!archivoFoto) {
      throw new Error('Debes seleccionar una imagen válida para el ejemplar.');
    }

    btnGuardar.disabled = true;

    const extension = archivoFoto.name.split('.').pop().toLowerCase();
    const nombreArchivo = `${idEjemplar}-${Date.now()}.${extension}`.replace(/\s+/g, '-');

    // 1. Subida al bucket
    const { error: errorSubida } = await supabaseClient
      .storage
      .from('imagenes')
      .upload(nombreArchivo, archivoFoto);

    if (errorSubida) throw new Error('Error al subir imagen: ' + errorSubida.message);
    
    nombreArchivoSubido = nombreArchivo;

    // 2. Obtener la URL pública
    const { data: urlData } = supabaseClient
      .storage
      .from('imagenes')
      .getPublicUrl(nombreArchivo);
    
    const urlImagenPublica = urlData.publicUrl;

    // 3. Insertar registro en la base de datos
    const { error: errorBD } = await supabaseClient
      .from('ejemplares')
      .insert([
        {
          id: idEjemplar,
          especie: especie,
          genetica: genetica,
          sexo: sexo,
          nacimiento: parseInt(nacimiento, 10), 
          precio: parseFloat(precio),
          estatus: estatus,
          imagen_url: urlImagenPublica
        }
      ]);

    if (errorBD) {
      // Revertir subida de imagen si falla la inserción en BD
      await supabaseClient.storage.from('imagenes').remove([nombreArchivoSubido]);
      throw new Error('Error al guardar en base de datos: ' + errorBD.message);
    }

    dashboardMsg.textContent = '¡Ejemplar guardado exitosamente! ✅';
    dashboardMsg.className = 'mensaje-estado exito';
    formEjemplar.reset();

  } catch (error) {
    console.error(error);
    dashboardMsg.textContent = error.message;
    dashboardMsg.className = 'mensaje-estado error';
  } finally {
    btnGuardar.disabled = false;
  }
});