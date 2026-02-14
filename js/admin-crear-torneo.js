document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('crear-torneo-form');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';
    const token = localStorage.getItem('jwtToken');

    // Elementos del DOM
    const categoriasSelect = document.getElementById('categorias');
    const juecesSelect = document.getElementById('jueces');
    const sedeSelect = document.getElementById('sede');
    const fechaInicioInput = document.getElementById('fechaInicio');
    const fechaFinInput = document.getElementById('fechaFin');
    const horaInicioInput = document.getElementById('horaInicio');
    
    // Elementos para lógica de fechas automática
    const tipoProgramacion = document.getElementById('tipoProgramacion');
    const fechasManuales = document.getElementById('fechas-manuales');
    const fechasAutomaticas = document.getElementById('fechas-automaticas');

    // Almacenamiento local de datos para validaciones
    let sedesData = []; 
    let juecesData = [];

    // Detectar si es edición
    const urlParams = new URLSearchParams(window.location.search);
    const torneoId = urlParams.get('id');
    const isEditing = !!torneoId;

    const swalWithBootstrapButtons = Swal.mixin({
        customClass: { confirmButton: 'btn-main', cancelButton: 'btn-secondary' },
        buttonsStyling: false
    });

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // --- Lógica de UI: Alternar Fechas ---
    if (tipoProgramacion) {
        tipoProgramacion.addEventListener('change', (e) => {
            if (e.target.checked) {
                fechasManuales.style.display = 'none';
                fechasAutomaticas.style.display = 'contents';
                // Limpiar requeridos manuales
                if(fechaInicioInput) fechaInicioInput.required = false;
                if(fechaFinInput) fechaFinInput.required = false;
                // Activar requeridos automáticos
                const fechaInsc = document.getElementById('fechaInicioInscripcion');
                if(fechaInsc) fechaInsc.required = true;
            } else {
                fechasManuales.style.display = 'contents';
                fechasAutomaticas.style.display = 'none';
                // Activar requeridos manuales
                if(fechaInicioInput) fechaInicioInput.required = true;
                if(fechaFinInput) fechaFinInput.required = true;
                // Limpiar requeridos automáticos
                const fechaInsc = document.getElementById('fechaInicioInscripcion');
                if(fechaInsc) fechaInsc.required = false;
            }
        });
    }

    // --- Carga de Datos Iniciales ---
    async function loadInitialData() {
        try {
            // 1. Cargar Categorías
            const catResponse = await fetch(`${API_BASE_URL}/categorias`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (catResponse.ok) {
                const categorias = await catResponse.json();
                categoriasSelect.innerHTML = '';
                categorias.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nombre;
                    categoriasSelect.appendChild(option);
                });
            }

            // 2. Cargar Sedes (Solo DISPONIBLES)
            const sedeResponse = await fetch(`${API_BASE_URL}/sedes`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (sedeResponse.ok) {
                sedesData = await sedeResponse.json();
                sedeSelect.innerHTML = '<option value="" disabled selected>Seleccione una sede...</option>';
                
                const sedesDisponibles = sedesData.filter(s => s.estado === 'DISPONIBLE');
                
                sedesDisponibles.forEach(sede => {
                    const option = document.createElement('option');
                    option.value = sede.id;
                    option.textContent = `${sede.nombre} (Canchas: ${sede.nroCanchas})`;
                    sedeSelect.appendChild(option);
                });
            }

            // 3. Cargar TODOS los Jueces (se filtrarán en el frontend al seleccionar sede)
            const juezResponse = await fetch(`${API_BASE_URL}/jueces`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (juezResponse.ok) {
                juecesData = await juezResponse.json();
            }

            // 4. Si es edición, cargar datos del torneo
            if (isEditing) {
                document.querySelector('h2').textContent = 'Editar Torneo';
                const btnSubmit = form.querySelector('button[type="submit"]');
                if(btnSubmit) btnSubmit.textContent = 'Actualizar Torneo';
                await loadTorneoData(torneoId);
            }

        } catch (error) {
            console.error('Error cargando datos:', error);
            swalWithBootstrapButtons.fire('Error', 'No se pudieron cargar los datos iniciales.', 'error');
        }
    }

    async function loadTorneoData(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/torneos/${id}`);
            if (response.ok) {
                const torneo = await response.json();
                
                document.getElementById('nombre').value = torneo.nombre;
                document.getElementById('descripcion').value = torneo.descripcion || '';
                if(horaInicioInput) horaInicioInput.value = torneo.horaInicio;
                
                // Cargar fechas manuales por defecto (el backend no nos dice si fue automático)
                if (torneo.fechaInicio) fechaInicioInput.value = torneo.fechaInicio;
                if (torneo.fechaFin) fechaFinInput.value = torneo.fechaFin;
                
                // Seleccionar Sede
                if(torneo.sedeId) sedeSelect.value = torneo.sedeId;
                // Disparar evento change para cargar jueces de esa sede
                sedeSelect.dispatchEvent(new Event('change'));

                // Seleccionar Categorías
                if (torneo.categorias) {
                    // Esperar un poco para asegurar que las opciones se renderizaron
                    setTimeout(() => {
                        Array.from(categoriasSelect.options).forEach(opt => {
                            const match = torneo.categorias.some(c => 
                                (typeof c === 'object' && c.id == opt.value) || 
                                (typeof c === 'string' && c === opt.textContent)
                            );
                            if (match) opt.selected = true;
                        });
                    }, 100);
                }
            }
        } catch (error) {
            console.error("Error cargando datos del torneo", error);
        }
    }

    // --- Lógica: Filtrar Jueces por Sede ---
    if (sedeSelect) {
        sedeSelect.addEventListener('change', () => {
            const selectedSedeId = parseInt(sedeSelect.value);
            juecesSelect.innerHTML = '';

            // Filtrar jueces que pertenecen a la sede seleccionada y están ACTIVOS
            const juecesFiltrados = juecesData.filter(j => {
                const juezSedeId = j.sedeId || (j.sede ? j.sede.id : null);
                return j.estado === 'ACTIVO' && juezSedeId === selectedSedeId;
            });

            if (juecesFiltrados.length === 0) {
                const option = document.createElement('option');
                option.text = "No hay jueces activos en esta sede";
                option.disabled = true;
                juecesSelect.appendChild(option);
            } else {
                juecesFiltrados.forEach(juez => {
                    const option = document.createElement('option');
                    option.value = juez.id;
                    option.textContent = `${juez.nombre} (${juez.nivelCredencial})`;
                    juecesSelect.appendChild(option);
                });
            }
        });
    }

    // --- Validaciones de Negocio ---

    // Validar capacidad de la sede (Torneos simultáneos vs Nro Canchas)
    async function checkCapacidadSede(sedeId, fecha) {
        try {
            const response = await fetch(`${API_BASE_URL}/torneos`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) return true; 

            const torneos = await response.json();
            
            // Contar torneos en esa sede para esa fecha
            const torneosEnSedeYFecha = torneos.filter(t => {
                // Si estamos editando, no contarnos a nosotros mismos
                if (isEditing && t.id == torneoId) return false;

                const tSedeId = t.sedeId || (t.sede ? t.sede.id : null); 
                return tSedeId === parseInt(sedeId) && t.fechaInicio === fecha;
            }).length;

            // Obtener capacidad de la sede seleccionada
            const sedeSeleccionada = sedesData.find(s => s.id === parseInt(sedeId));
            const capacidadCanchas = sedeSeleccionada ? sedeSeleccionada.nroCanchas : 1;

            return torneosEnSedeYFecha < capacidadCanchas;

        } catch (error) {
            console.error(error);
            return true; 
        }
    }

    // --- Manejo del Submit ---
    async function handleCreateTorneo(event) {
        event.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Procesando...';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Procesar selects múltiples
        data.categoriaIds = Array.from(categoriasSelect.selectedOptions).map(opt => parseInt(opt.value));
        data.juezIds = Array.from(juecesSelect.selectedOptions).map(opt => parseInt(opt.value));
        data.sedeId = parseInt(data.sedeId);

        // Validaciones básicas
        if (data.juezIds.length < 3) {
            swalWithBootstrapButtons.fire('Jueces Insuficientes', 'Debes seleccionar al menos 3 jueces de la sede.', 'warning');
            submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Actualizar Torneo' : 'Guardar Torneo'; return;
        }
        if (data.categoriaIds.length === 0) {
            swalWithBootstrapButtons.fire('Faltan datos', 'Debes seleccionar al menos una categoría.', 'warning');
            submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Actualizar Torneo' : 'Guardar Torneo'; return;
        }

        // Lógica Automática vs Manual
        if (tipoProgramacion && tipoProgramacion.checked) {
            // Modo Automático: Limpiar fechas manuales
            delete data.fechaInicio;
            delete data.fechaFin;
            data.diasInscripcion = parseInt(document.getElementById('diasInscripcion').value);
            
            // Validar fecha inicio inscripción
            if (!data.fechaInicioInscripcion) {
                swalWithBootstrapButtons.fire('Error', 'Debes indicar el inicio de inscripciones.', 'error');
                submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Actualizar Torneo' : 'Guardar Torneo'; return;
            }
        } else {
            // Modo Manual: Limpiar automáticos
            delete data.fechaInicioInscripcion;
            delete data.diasInscripcion;

            // Validar Fechas Manuales
            if (new Date(data.fechaInicio) > new Date(data.fechaFin)) {
                swalWithBootstrapButtons.fire('Error', 'La fecha de inicio no puede ser posterior a la fecha de fin.', 'error');
                submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Actualizar Torneo' : 'Guardar Torneo'; return;
            }
            
            // Validar Capacidad Sede (solo en modo manual o si calculamos la fecha auto en frontend)
            const hayCapacidad = await checkCapacidadSede(data.sedeId, data.fechaInicio);
            if (!hayCapacidad) {
                swalWithBootstrapButtons.fire('Sede Llena', 'No hay canchas disponibles en esta sede para la fecha seleccionada.', 'warning');
                submitBtn.disabled = false; submitBtn.textContent = isEditing ? 'Actualizar Torneo' : 'Guardar Torneo'; return;
            }
        }

        // Formatear hora (añadir segundos para LocalTime Java)
        if (data.horaInicio && data.horaInicio.length === 5) {
            data.horaInicio += ":00";
        }

        // Determinar estado inicial (solo al crear)
        if (!isEditing) {
            data.estado = 'PROXIMAMENTE';
        }

        try {
            const url = isEditing ? `${API_BASE_URL}/torneos/${torneoId}` : `${API_BASE_URL}/torneos`;
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al guardar el torneo.');
            }

            await swalWithBootstrapButtons.fire({
                title: isEditing ? '¡Torneo Actualizado!' : '¡Torneo Creado!',
                text: isEditing ? 'Los cambios se han guardado correctamente.' : 'El torneo se ha programado exitosamente.',
                icon: 'success',
                confirmButtonText: 'Ir a la lista'
            });
            window.location.href = 'admin_torneos.html'; 
        } catch (error) {
            console.error('Error:', error);
            swalWithBootstrapButtons.fire('Error', error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isEditing ? 'Actualizar Torneo' : 'Guardar Torneo';
        }
    }

    if (protectPage()) {
        loadInitialData();
        form.addEventListener('submit', handleCreateTorneo);
    }
});
