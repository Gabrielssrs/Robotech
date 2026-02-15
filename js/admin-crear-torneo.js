document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticación
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Configuración de la API
    const API_BASE_URL = 'https://robotech-back.onrender.com/api'; // Ajusta si es localhost
    
    // Referencias al DOM
    const form = document.getElementById('crear-torneo-form');
    const sedeSelect = document.getElementById('sede');
    const juecesSelect = document.getElementById('jueces');
    const categoriasSelect = document.getElementById('categorias');
    
    // Referencias de Fechas
    const fechaInscripInput = document.getElementById('fechaInicioInscripcion');
    const diasInscripSelect = document.getElementById('diasInscripcion');
    const fechaInicioInput = document.getElementById('fechaInicio');
    const fechaFinInput = document.getElementById('fechaFin');
    const horaInicioInput = document.getElementById('horaInicio');

    // Variables globales para datos
    let todosLosJueces = [];

    // -------------------------------------------------------------------------
    // 2. Carga Inicial de Datos (Sedes, Categorías, Jueces)
    // -------------------------------------------------------------------------
    async function cargarDatosIniciales() {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Cargar Sedes
            const resSedes = await fetch(`${API_BASE_URL}/sedes`, { headers });
            const sedes = await resSedes.json();
            sedes.forEach(sede => {
                // Solo mostramos sedes disponibles si tu lógica lo requiere, o todas
                const option = document.createElement('option');
                option.value = sede.id;
                option.textContent = `${sede.nombre} (${sede.ciudad})`;
                sedeSelect.appendChild(option);
            });

            // Cargar Categorías
            const resCats = await fetch(`${API_BASE_URL}/categorias`, { headers });
            const categorias = await resCats.json();
            // Limpiar opción de carga
            categoriasSelect.innerHTML = ''; 
            categorias.forEach(cat => {
                if (cat.activa) { // Solo categorías activas
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nombre;
                    categoriasSelect.appendChild(option);
                }
            });

            // Cargar Jueces (Los guardamos en memoria para filtrar después)
            const resJueces = await fetch(`${API_BASE_URL}/jueces`, { headers });
            todosLosJueces = await resJueces.json();

        } catch (error) {
            console.error('Error cargando datos:', error);
            Swal.fire('Error', 'No se pudieron cargar los datos del sistema.', 'error');
        }
    }

    await cargarDatosIniciales();

    // -------------------------------------------------------------------------
    // 3. Lógica de Filtrado de Jueces por Sede
    // -------------------------------------------------------------------------
    sedeSelect.addEventListener('change', () => {
        const sedeIdSeleccionada = parseInt(sedeSelect.value);
        
        // Limpiar select de jueces
        juecesSelect.innerHTML = '';

        // Filtrar jueces que pertenecen a la sede seleccionada
        const juecesFiltrados = todosLosJueces.filter(juez => 
            juez.sedeId === sedeIdSeleccionada && juez.estado === 'ACTIVO'
        );

        if (juecesFiltrados.length === 0) {
            const option = document.createElement('option');
            option.disabled = true;
            option.textContent = 'No hay jueces activos en esta sede';
            juecesSelect.appendChild(option);
        } else {
            juecesFiltrados.forEach(juez => {
                const option = document.createElement('option');
                option.value = juez.id;
                option.textContent = `${juez.nombre} (Nivel: ${juez.nivelCredencial})`;
                juecesSelect.appendChild(option);
            });
        }
    });

    // -------------------------------------------------------------------------
    // 4. Lógica de Fechas y Validaciones
    // -------------------------------------------------------------------------
    
    // Configurar fecha mínima de inscripción a HOY
    const hoy = new Date().toISOString().split('T')[0];
    fechaInscripInput.min = hoy;

    function actualizarFechasMinimas() {
        if (!fechaInscripInput.value) return;

        const fechaInscrip = new Date(fechaInscripInput.value);
        const diasDuracion = parseInt(diasInscripSelect.value);

        // Calcular fecha de cierre de inscripción
        const fechaCierreInscrip = new Date(fechaInscrip);
        fechaCierreInscrip.setDate(fechaInscrip.getDate() + diasDuracion);

        // El torneo debe iniciar AL MENOS 1 día después del cierre de inscripciones
        const minFechaInicioTorneo = new Date(fechaCierreInscrip);
        minFechaInicioTorneo.setDate(fechaCierreInscrip.getDate() + 1);
        
        const minFechaInicioStr = minFechaInicioTorneo.toISOString().split('T')[0];
        fechaInicioInput.min = minFechaInicioStr;
        
        // Si la fecha actual seleccionada es menor a la nueva mínima, limpiarla
        if (fechaInicioInput.value && fechaInicioInput.value < minFechaInicioStr) {
            fechaInicioInput.value = minFechaInicioStr;
        }

        actualizarFechaFinMinima();
    }

    function actualizarFechaFinMinima() {
        if (!fechaInicioInput.value) return;

        const fechaInicio = new Date(fechaInicioInput.value);
        
        // La duración del torneo debe ser al menos 12 días
        const minFechaFin = new Date(fechaInicio);
        minFechaFin.setDate(fechaInicio.getDate() + 12);

        const minFechaFinStr = minFechaFin.toISOString().split('T')[0];
        fechaFinInput.min = minFechaFinStr;

        if (fechaFinInput.value && fechaFinInput.value < minFechaFinStr) {
            fechaFinInput.value = minFechaFinStr;
        }
    }

    // Listeners para recalcular fechas cuando el usuario cambia algo
    fechaInscripInput.addEventListener('change', actualizarFechasMinimas);
    diasInscripSelect.addEventListener('change', actualizarFechasMinimas);
    fechaInicioInput.addEventListener('change', actualizarFechaFinMinima);

    // -------------------------------------------------------------------------
    // 5. Envío del Formulario
    // -------------------------------------------------------------------------
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- Validaciones Manuales Previas ---
        
        // 1. Validar Hora (11:00 - 20:00)
        const hora = horaInicioInput.value; // formato "HH:mm"
        const [horas, minutos] = hora.split(':').map(Number);
        if (horas < 11 || horas > 20 || (horas === 20 && minutos > 0)) {
            Swal.fire('Horario Inválido', 'La hora de inicio debe estar entre las 11:00 AM y las 8:00 PM.', 'warning');
            return;
        }

        // 2. Validar Jueces (Mínimo 3)
        const juecesSeleccionados = Array.from(juecesSelect.selectedOptions).map(opt => parseInt(opt.value));
        if (juecesSeleccionados.length < 3) {
            Swal.fire('Jueces Insuficientes', 'Debe seleccionar al menos 3 jueces para el torneo.', 'warning');
            return;
        }

        // 3. Validar Categorías
        const categoriasSeleccionadas = Array.from(categoriasSelect.selectedOptions).map(opt => parseInt(opt.value));
        if (categoriasSeleccionadas.length === 0) {
            Swal.fire('Categoría Requerida', 'Debe seleccionar al menos una categoría.', 'warning');
            return;
        }

        // Construir objeto JSON
        const torneoData = {
            nombre: document.getElementById('nombre').value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            fechaInicioInscripcion: fechaInscripInput.value,
            diasInscripcion: parseInt(diasInscripSelect.value),
            fechaInicio: fechaInicioInput.value,
            fechaFin: fechaFinInput.value,
            horaInicio: `${hora}:00`, // Agregar segundos para formato LocalTime
            sedeId: parseInt(sedeSelect.value),
            categoriaIds: categoriasSeleccionadas,
            juezIds: juecesSeleccionados,
            estado: "PROXIMAMENTE"
        };

        try {
            // Mostrar loading
            Swal.fire({
                title: 'Creando Torneo...',
                text: 'Por favor espere',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${API_BASE_URL}/torneos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(torneoData)
            });

            const data = await response.json();

            if (response.ok) {
                Swal.fire({
                    title: '¡Éxito!',
                    text: 'El torneo ha sido creado correctamente.',
                    icon: 'success'
                }).then(() => {
                    window.location.href = 'admintorneo.html'; // Redirigir a la lista
                });
            } else {
                // Manejar errores del backend (ej: Nombre duplicado, validaciones de lógica)
                // El backend devuelve { "message": "Error..." }
                const errorMsg = data.message || 'Ocurrió un error desconocido.';
                Swal.fire('Error de Validación', errorMsg, 'error');
            }

        } catch (error) {
            console.error('Error de red:', error);
            Swal.fire('Error de Conexión', 'No se pudo conectar con el servidor.', 'error');
        }
    });
});
