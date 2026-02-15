document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar Autenticación
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Configuración de la API
    const API_BASE_URL = 'https://robotech-back.onrender.com/api'; 
    
    // Referencias al DOM
    const form = document.getElementById('crear-torneo-form');
    const nombreInput = document.getElementById('nombre');
    const sedeSelect = document.getElementById('sede');
    const juecesSelect = document.getElementById('jueces');
    const categoriasSelect = document.getElementById('categorias');
    
    // Referencias de Fechas
    const fechaInscripInput = document.getElementById('fechaInicioInscripcion');
    const diasInscripSelect = document.getElementById('diasInscripcion');
    const fechaInicioInput = document.getElementById('fechaInicio');
    const fechaFinInput = document.getElementById('fechaFin');
    const horaInicioInput = document.getElementById('horaInicio');

    // Hints informativos
    const hintInicio = document.getElementById('hint-inicio');
    const hintFin = document.getElementById('hint-fin');

    // Variables globales para datos
    let todosLosJueces = [];
    let todosLosTorneos = [];

    // =========================================================================
    // UTILIDADES
    // =========================================================================
    function formatearFecha(dateString) {
        if (!dateString) return '';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    function obtenerHoyISO() {
        return new Date().toISOString().split('T')[0];
    }

    function obtenerMañanaISO() {
        const mañana = new Date();
        mañana.setDate(mañana.getDate() + 1);
        return mañana.toISOString().split('T')[0];
    }

    function sumarDías(dateString, dias) {
        const fecha = new Date(dateString);
        fecha.setDate(fecha.getDate() + dias);
        return fecha.toISOString().split('T')[0];
    }

    // =========================================================================
    // 2. Carga Inicial de Datos (Sedes, Categorías, Jueces, Torneos)
    // =========================================================================
    async function cargarDatosIniciales() {
        try {
            const headers = { 'Authorization': `Bearer ${token}` };

            // Cargar Sedes
            const resSedes = await fetch(`${API_BASE_URL}/sedes`, { headers });
            const sedes = await resSedes.json();
            sedes.forEach(sede => {
                const option = document.createElement('option');
                option.value = sede.id;
                option.textContent = `${sede.nombre} (${sede.ciudad})`;
                sedeSelect.appendChild(option);
            });

            // Cargar Categorías
            const resCats = await fetch(`${API_BASE_URL}/categorias`, { headers });
            const categorias = await resCats.json();
            categoriasSelect.innerHTML = ''; 
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.id;
                option.textContent = cat.nombre;
                categoriasSelect.appendChild(option);
            });

            // Cargar Jueces
            const resJueces = await fetch(`${API_BASE_URL}/jueces`, { headers });
            todosLosJueces = await resJueces.json();

            // Cargar Torneos (para validar nombres duplicados)
            const resTorneos = await fetch(`${API_BASE_URL}/torneos`, { headers });
            todosLosTorneos = await resTorneos.json();

        } catch (error) {
            console.error('Error cargando datos:', error);
            Swal.fire('Error', 'No se pudieron cargar los datos del sistema.', 'error');
        }
    }

    await cargarDatosIniciales();

    // =========================================================================
    // 3. Lógica de Filtrado de Jueces por Sede
    // =========================================================================
    sedeSelect.addEventListener('change', () => {
        const sedeIdSeleccionada = parseInt(sedeSelect.value);
        juecesSelect.innerHTML = '';

        const juecesFiltrados = todosLosJueces.filter(juez => 
            juez.sedeId === sedeIdSeleccionada && (juez.estado === 'ACTIVO' || !juez.estado)
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
                option.textContent = `${juez.nombre} (Nivel: ${juez.nivelCredencial || 'N/A'})`;
                juecesSelect.appendChild(option);
            });
        }
    });

    // =========================================================================
    // 4. Validación de Nombre Duplicado
    // =========================================================================
    nombreInput.addEventListener('blur', () => {
        const nombre = nombreInput.value.trim().toLowerCase();
        if (!nombre) return;

        const existe = todosLosTorneos.some(t => t.nombre.toLowerCase() === nombre);
        if (existe) {
            Swal.fire({
                title: 'Nombre Duplicado',
                text: 'Ya existe un torneo con este nombre. Por favor, usa otro nombre.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            nombreInput.value = '';
            nombreInput.focus();
        }
    });

    // =========================================================================
    // 5. Validación Fecha Inicio Inscripciones (debe ser desde mañana)
    // =========================================================================
    const mañana = obtenerMañanaISO();
    fechaInscripInput.min = mañana;

    fechaInscripInput.addEventListener('change', () => {
        const fechaSeleccionada = fechaInscripInput.value;
        if (!fechaSeleccionada) return;

        // Validar que sea mañana o posterior
        if (fechaSeleccionada < mañana) {
            Swal.fire({
                title: 'Fecha Inválida',
                text: `La fecha de inicio de inscripciones debe ser a partir del ${formatearFecha(mañana)} (mañana).`,
                icon: 'warning',
                confirmButtonText: 'OK'
            });
            fechaInscripInput.value = '';
            return;
        }

        // Actualizar fechas mínimas cuando se cambie fecha inscripción
        actualizarFechasCalculadas();
    });

    // =========================================================================
    // 6. Lógica de Duración de Inscripción con Alerta
    // =========================================================================
    diasInscripSelect.addEventListener('change', () => {
        if (!fechaInscripInput.value) {
            Swal.fire({
                title: 'Falta Fecha',
                text: 'Por favor, selecciona primero la fecha de inicio de inscripciones.',
                icon: 'info'
            });
            diasInscripSelect.value = '';
            return;
        }

        actualizarFechasCalculadas();
    });

    function actualizarFechasCalculadas() {
        if (!fechaInscripInput.value || !diasInscripSelect.value) return;

        const fechaInscrip = fechaInscripInput.value;
        const diasDuracion = parseInt(diasInscripSelect.value);

        // Calcular fecha de cierre de inscripción
        const fechaCierre = sumarDías(fechaInscrip, diasDuracion);

        // Calcular fecha mínima de inicio del torneo (1 día después del cierre)
        const fechaInicioSugerida = sumarDías(fechaCierre, 1);

        // Mostrar alerta con la sugerencia
        Swal.fire({
            title: 'Fecha de Inicio del Torneo',
            html: `<p>Las inscripciones cerrarán el <strong>${formatearFecha(fechaCierre)}</strong></p>
                   <p>Se sugiere iniciar el torneo el <strong>${formatearFecha(fechaInicioSugerida)}</strong></p>
                   <p style="color: #888; font-size: 0.9em;">Esto es un día posterior al cierre de inscripciones.<br>Puedes elegir una fecha posterior si lo deseas.</p>`,
            icon: 'info',
            confirmButtonText: 'Usar esta fecha'
        }).then(() => {
            // Establecer la fecha sugerida
            fechaInicioInput.value = fechaInicioSugerida;
            fechaInicioInput.min = fechaInicioSugerida;

            // Actualizar fecha fin automáticamente
            actualizarFechaFin();

            // Mostrar hint actualizado
            hintInicio.textContent = `Fecha mínima sugerida: ${formatearFecha(fechaInicioSugerida)}`;
        });
    }

    // =========================================================================
    // 7. Manejo de Cambio en Fecha Inicio y Cálculo de Fecha Fin
    // =========================================================================
    fechaInicioInput.addEventListener('change', () => {
        if (!fechaInicioInput.value || !diasInscripSelect.value) return;

        // Validar que sea mayor o igual a la sugerida
        if (fechaInicioInput.min && fechaInicioInput.value < fechaInicioInput.min) {
            Swal.fire({
                title: 'Fecha Inválida',
                text: `La fecha de inicio del torneo no puede ser anterior a ${formatearFecha(fechaInicioInput.min)}.`,
                icon: 'warning'
            });
            fechaInicioInput.value = fechaInicioInput.min;
        }

        actualizarFechaFin();
    });

    function actualizarFechaFin() {
        if (!fechaInicioInput.value) return;

        const fechaInicio = fechaInicioInput.value;
        const fechaFinSugerida = sumarDías(fechaInicio, 12);

        // Establecer automáticamente la fecha fin
        fechaFinInput.value = fechaFinSugerida;
        fechaFinInput.min = fechaFinSugerida;

        // Actualizar hint
        hintFin.textContent = `Se calcularía automáticamente como: ${formatearFecha(fechaFinSugerida)} (12 días después del inicio)`;
    }

    // =========================================================================
    // 8. Envío del Formulario
    // =========================================================================
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // --- Validación de Hora (11:00 AM a 7:00 PM) ---
        const hora = horaInicioInput.value;
        if (!hora) {
            Swal.fire('Hora Requerida', 'Por favor, ingresa una hora de inicio.', 'warning');
            return;
        }

        const [horas, minutos] = hora.split(':').map(Number);
        if (horas < 11 || horas > 19) {
            Swal.fire('Horario Inválido', 'La hora de inicio debe estar entre las 11:00 AM y las 7:00 PM (19:00).', 'warning');
            return;
        }

        // --- Validación de Jueces (Mínimo 3) ---
        const juecesSeleccionados = Array.from(juecesSelect.selectedOptions).map(opt => parseInt(opt.value));
        if (juecesSeleccionados.length < 3) {
            Swal.fire('Jueces Insuficientes', 'Debe seleccionar al menos 3 jueces para el torneo.', 'warning');
            return;
        }

        // --- Validación de Categorías ---
        const categoriasSeleccionadas = Array.from(categoriasSelect.selectedOptions).map(opt => parseInt(opt.value));
        if (categoriasSeleccionadas.length === 0) {
            Swal.fire('Categoría Requerida', 'Debe seleccionar al menos una categoría.', 'warning');
            return;
        }

        const torneoData = {
            nombre: nombreInput.value.trim(),
            descripcion: document.getElementById('descripcion').value.trim(),
            fechaInicioInscripcion: fechaInscripInput.value,
            diasInscripcion: parseInt(diasInscripSelect.value),
            fechaInicio: fechaInicioInput.value,
            fechaFin: fechaFinInput.value,
            horaInicio: `${hora}:00`,
            sedeId: parseInt(sedeSelect.value),
            categoriaIds: categoriasSeleccionadas,
            juezIds: juecesSeleccionados,
            estado: "PROXIMAMENTE"
        };

        try {
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
                    window.location.href = 'admintorneo.html';
                });
            } else {
                const errorMsg = data.message || 'Ocurrió un error desconocido.';
                Swal.fire('Error de Validación', errorMsg, 'error');
            }

        } catch (error) {
            console.error('Error de red:', error);
            Swal.fire('Error de Conexión', 'No se pudo conectar con el servidor.', 'error');
        }
    });
});
