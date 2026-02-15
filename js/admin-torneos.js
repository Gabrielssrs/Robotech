document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const tableBody = document.querySelector('.club-management-table tbody');
    const filterTabs = document.querySelectorAll('.admin-filter-tab');
    const searchInput = document.querySelector('.search-input-admin');
    const API_URL = 'https://robotech-back.onrender.com/api/torneos';

    let allTorneos = [];
    // Estado inicial por defecto (corresponde a la pestaña "Próximos")
    let currentStatusFilter = 'PROXIMAMENTE'; 

    // --- Funciones Auxiliares ---

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    function formatDate(dateString) {
        if (!dateString) return 'TBA';
        const [year, month, day] = dateString.split('-');
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${day} ${months[parseInt(month) - 1]} ${year}`;
    }

    // --- Carga de Datos ---

    async function fetchTorneos() {
        try {
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar torneos');
            
            allTorneos = await response.json();
            updateDashboard();
        } catch (error) {
            console.error(error);
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar los datos.</td></tr>`;
        }
    }

    function updateDashboard() {
        updateTabCounts();
        applyFilters();
    }

    function updateTabCounts() {
        const proximos = allTorneos.filter(t => t.estado === 'PROXIMAMENTE').length;
        const activos = allTorneos.filter(t => t.estado === 'EN_CURSO').length;
        const finalizados = allTorneos.filter(t => t.estado === 'FINALIZADO' || t.estado === 'CANCELADO').length;

        if (filterTabs[0]) filterTabs[0].textContent = `Próximos (${proximos})`;
        if (filterTabs[1]) filterTabs[1].textContent = `Activos (${activos})`;
        if (filterTabs[2]) filterTabs[2].textContent = `Finalizados (${finalizados})`;
    }

    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase().trim();

        const filtered = allTorneos.filter(t => {
            let statusMatch = false;
            if (currentStatusFilter === 'PROXIMAMENTE') statusMatch = (t.estado === 'PROXIMAMENTE');
            else if (currentStatusFilter === 'EN_CURSO') statusMatch = (t.estado === 'EN_CURSO');
            else if (currentStatusFilter === 'FINALIZADO') statusMatch = (t.estado === 'FINALIZADO' || t.estado === 'CANCELADO');
            
            if (!statusMatch) return false;

            const idStr = `TOR-${String(t.id).padStart(3, '0')}`.toLowerCase();
            const nameStr = (t.nombre || '').toLowerCase();
            const dateStr = (t.fechaInicio || '').toLowerCase();
            const sedeStr = String(t.sede || '').toLowerCase();

            return idStr.includes(searchTerm) || 
                   nameStr.includes(searchTerm) || 
                   dateStr.includes(searchTerm) ||
                   sedeStr.includes(searchTerm);
        });

        renderTable(filtered);
    }

    function renderTable(torneos) {
        tableBody.innerHTML = '';
        if (torneos.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No se encontraron torneos en esta sección.</td></tr>`;
            return;
        }

        torneos.forEach(t => {
            const row = document.createElement('tr');
            const idFormatted = `TOR-${String(t.id).padStart(3, '0')}`;
            const cats = (t.categorias && t.categorias.length > 0) ? t.categorias.join(', ') : 'Sin categorías';
            const dateSede = `${formatDate(t.fechaInicio)} | ${t.sede || 'Sede por definir'}`;

            let statusClass = '';
            let statusText = '';
            let actionsHtml = '';

            // Botones comunes
            const btnVer = `<a class="btn-action btn-view" href="vista-torneo.html?id=${t.id}" style="text-decoration: none;">Ver</a>`;
            const btnReglas = `<a class="btn-action btn-rules" href="reglamento_torneo.html?id=${t.id}" style="background-color: #1f6feb; color: white; text-decoration: none;">Reglas</a>`;
            const btnEditar = `<button class="btn-action btn-edit" onclick="abrirEditarTorneo(${t.id}, '${t.estado}')" style="background-color: #d29922; color: white;">Editar</button>`;

            switch(t.estado) {
                case 'EN_CURSO':
                    statusClass = 'status-active';
                    statusText = 'Activo';
                    row.classList.add('highlight-active');
                    actionsHtml = `
                        ${btnVer}
                        ${btnReglas}
                        ${btnEditar}
                        <button class="btn-action btn-manage" onclick="window.location.href='vista-torneo.html?id=${t.id}&simular=true'">Simular</button>
                    `;
                    break;
                case 'PROXIMAMENTE':
                    statusClass = 'status-pending';
                    statusText = 'Próximo';
                    actionsHtml = `
                        ${btnVer}
                        ${btnReglas}
                        ${btnEditar}
                    `;
                    break;
                case 'FINALIZADO':
                    statusClass = 'status-suspended';
                    statusText = 'Finalizado';
                    actionsHtml = `
                        ${btnVer}
                        ${btnEditar}
                        <button class="btn-action btn-details" onclick="window.location.href='vista-torneo.html?id=${t.id}'">Resultados</button>
                    `;
                    break;
                case 'CANCELADO':
                    statusClass = 'status-suspended';
                    statusText = 'Cancelado';
                    actionsHtml = `${btnVer}`;
                    break;
                default:
                    statusClass = 'status-suspended';
                    statusText = t.estado;
            }

            row.innerHTML = `
                <td>${idFormatted}</td>
                <td><strong>${t.nombre}</strong></td>
                <td>${cats}</td>
                <td>${dateSede}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
                <td class="table-actions">${actionsHtml}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // --- Event Listeners ---
    filterTabs.forEach((tab, index) => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            filterTabs.forEach(t => t.classList.remove('active', 'active-tab-custom'));
            tab.classList.add('active');

            if (index === 0) currentStatusFilter = 'PROXIMAMENTE';
            else if (index === 1) currentStatusFilter = 'EN_CURSO';
            else if (index === 2) currentStatusFilter = 'FINALIZADO';
            
            applyFilters();
        });
    });

    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }

    if (protectPage()) {
        fetchTorneos();
        
        document.querySelector('.btn-logout').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        }); 
    }
});

// Funciones globales para el modal de edición
function abrirEditarTorneo(torneoId, estado) {
    const token = localStorage.getItem('jwtToken');
    
    if (estado === 'EN_CURSO') {
        Swal.fire({
            title: 'Acción Inválida',
            text: 'El torneo se está llevando a cabo en este momento y no es posible editarlo.',
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
        return;
    }
    
    if (estado === 'FINALIZADO') {
        Swal.fire({
            title: 'Acción Inválida',
            text: 'El torneo ha finalizado y no puede ser editado.',
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    if (estado === 'CANCELADO') {
        Swal.fire({
            title: 'Acción Inválida',
            text: 'El torneo ha sido cancelado y no puede ser editado.',
            icon: 'warning',
            confirmButtonText: 'Entendido'
        });
        return;
    }

    // Si es PROXIMAMENTE, abrir el modal
    if (estado === 'PROXIMAMENTE') {
        cargarTorneoEnModal(torneoId, token);
    }
}

function cargarTorneoEnModal(torneoId, token) {
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';
    
    // Mostrar loading
    Swal.fire({
        title: 'Cargando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    // Cargar datos del torneo y listas necesarias en paralelo
    Promise.all([
        fetch(`${API_BASE_URL}/torneos/${torneoId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE_URL}/sedes`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE_URL}/categorias`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
        fetch(`${API_BASE_URL}/jueces`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
    ])
    .then(([torneo, sedes, categorias, jueces]) => {
        Swal.close();

        // Llenar campos básicos
        document.getElementById('nombre').value = torneo.nombre || '';
        document.getElementById('descripcion').value = torneo.descripcion || '';
        document.getElementById('fechaInicioInscripcion').value = torneo.fechaInicioInscripcion || '';
        document.getElementById('diasInscripcion').value = torneo.diasInscripcion || '';
        document.getElementById('fechaInicio').value = torneo.fechaInicio || '';
        document.getElementById('fechaFin').value = torneo.fechaFin || '';

        // Hora: si viene formato "HH:mm:ss", extraer solo "HH:mm"
        if (torneo.horaInicio) {
            const horaPartes = torneo.horaInicio.split(':');
            document.getElementById('horaInicio').value = `${horaPartes[0]}:${horaPartes[1]}`;
        } else {
            document.getElementById('horaInicio').value = '';
        }

        // Poblado de selects en el modal
        const sedeSelect = document.getElementById('modal-sede');
        sedeSelect.innerHTML = '<option value="" disabled>Seleccione una sede...</option>';
        sedes.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.nombre} (${s.ciudad})`;
            if (torneo.sedeId && String(torneo.sedeId) === String(s.id)) opt.selected = true;
            sedeSelect.appendChild(opt);
        });

        const categoriasSelect = document.getElementById('modal-categorias');
        categoriasSelect.innerHTML = '';
        categorias.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nombre;
            // seleccionar si pertenece al torneo
            if (Array.isArray(torneo.categoriaIds) && torneo.categoriaIds.map(String).includes(String(c.id))) opt.selected = true;
            categoriasSelect.appendChild(opt);
        });

        const juecesSelect = document.getElementById('modal-jueces');
        juecesSelect.innerHTML = '';
        // Filtrar jueces activos si el backend lo proporciona
        const juecesActivos = (jueces || []).filter(j => j.estado === 'ACTIVO' || !j.estado);
        juecesActivos.forEach(j => {
            const opt = document.createElement('option');
            opt.value = j.id;
            opt.textContent = `${j.nombre} (Nivel: ${j.nivelCredencial || 'N/A'})`;
            if (Array.isArray(torneo.juezIds) && torneo.juezIds.map(String).includes(String(j.id))) opt.selected = true;
            juecesSelect.appendChild(opt);
        });

        // Guardar el ID del torneo en un atributo del formulario
        document.getElementById('formularioEditarTorneo').dataset.torneoId = torneoId;

        // Abrir el modal
        document.getElementById('modalEditTorneo').style.display = 'flex';
    })
    .catch(error => {
        console.error('Error al cargar torneo o listas:', error);
        Swal.fire('Error', 'No se pudo cargar los datos necesarios para editar el torneo.', 'error');
    });
}

function cerrarModalEdicion() {
    document.getElementById('modalEditTorneo').style.display = 'none';
}

// Cerrar modal al hacer click en el overlay
document.addEventListener('click', (e) => {
    const modal = document.getElementById('modalEditTorneo');
    if (modal && e.target === modal) {
        cerrarModalEdicion();
    }
});

// Manejador del formulario de edición
document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('formularioEditarTorneo');
    
    if (formulario) {
        formulario.addEventListener('submit', async (e) => {
            e.preventDefault();

            const torneoId = formulario.dataset.torneoId;
            const token = localStorage.getItem('jwtToken');
            const API_BASE_URL = 'https://robotech-back.onrender.com/api';

            // Recolectar valores del modal
            const nombre = document.getElementById('nombre').value.trim();
            const descripcion = document.getElementById('descripcion').value.trim();
            const fechaInicioInscripcion = document.getElementById('fechaInicioInscripcion').value;
            const diasInscripcion = parseInt(document.getElementById('diasInscripcion').value);
            const fechaInicio = document.getElementById('fechaInicio').value;
            const fechaFin = document.getElementById('fechaFin').value;
            const horaInicio = document.getElementById('horaInicio').value;

            const sedeId = parseInt(document.getElementById('modal-sede').value);
            const categoriaIds = Array.from(document.getElementById('modal-categorias').selectedOptions).map(o => parseInt(o.value));
            const juezIds = Array.from(document.getElementById('modal-jueces').selectedOptions).map(o => parseInt(o.value));

            // Validaciones
            if (!nombre) {
                Swal.fire('Nombre Requerido', 'El nombre del torneo es obligatorio.', 'warning');
                return;
            }

            // Nombre duplicado (excluir el torneo actual)
            const existe = allTorneos.some(t => t.id !== Number(torneoId) && t.nombre && t.nombre.toLowerCase() === nombre.toLowerCase());
            if (existe) {
                Swal.fire('Nombre Duplicado', 'Ya existe otro torneo con este nombre.', 'warning');
                return;
            }

            // Fecha inicio inscripciones >= mañana
            const hoy = new Date();
            const mañana = new Date(); mañana.setDate(hoy.getDate() + 1);
            if (!fechaInicioInscripcion || new Date(fechaInicioInscripcion) < new Date(mañana.toISOString().split('T')[0])) {
                Swal.fire('Fecha Inválida', 'La fecha de inicio de inscripciones debe ser a partir del día siguiente a hoy.', 'warning');
                return;
            }

            if (!diasInscripcion || isNaN(diasInscripcion)) {
                Swal.fire('Duración Requerida', 'Seleccione la duración de las inscripciones.', 'warning');
                return;
            }

            // Calcular cierre y fecha sugerida inicio
            const fechaCierre = new Date(fechaInicioInscripcion);
            fechaCierre.setDate(fechaCierre.getDate() + diasInscripcion);
            const fechaInicioSugerida = new Date(fechaCierre);
            fechaInicioSugerida.setDate(fechaCierre.getDate() + 1);

            if (!fechaInicio) {
                Swal.fire({
                    title: 'Fecha de Inicio Sugerida',
                    html: `Las inscripciones cierran el <strong>${fechaCierre.toISOString().split('T')[0]}</strong>.<br>Se sugiere iniciar el torneo el <strong>${fechaInicioSugerida.toISOString().split('T')[0]}</strong>.`,
                    icon: 'info'
                }).then(() => {
                    document.getElementById('fechaInicio').value = fechaInicioSugerida.toISOString().split('T')[0];
                    // continuar validación abajo
                });
                // If user hasn't chosen fechaInicio, we stop here to let them confirm
                return;
            }

            // fechaFin mínimo 12 días después del inicio
            const fechaInicioDate = new Date(fechaInicio);
            const minFechaFin = new Date(fechaInicioDate);
            minFechaFin.setDate(fechaInicioDate.getDate() + 12);
            if (!fechaFin || new Date(fechaFin) < minFechaFin) {
                Swal.fire('Fecha Fin Inválida', `La fecha de fin debe ser al menos 12 días después del inicio (${minFechaFin.toISOString().split('T')[0]}).`, 'warning');
                return;
            }

            // Hora válida 11:00 - 19:00
            if (!horaInicio) {
                Swal.fire('Hora Requerida', 'Por favor, ingresa una hora de inicio.', 'warning');
                return;
            }
            const [h, m] = horaInicio.split(':').map(Number);
            if (h < 11 || h > 19) {
                Swal.fire('Horario Inválido', 'La hora de inicio debe estar entre las 11:00 AM y las 7:00 PM (19:00).', 'warning');
                return;
            }

            // Jueces y categorías
            if (juezIds.length < 3) {
                Swal.fire('Jueces Insuficientes', 'Debe seleccionar al menos 3 jueces para el torneo.', 'warning');
                return;
            }

            if (categoriaIds.length === 0) {
                Swal.fire('Categorías Requeridas', 'Seleccione al menos una categoría.', 'warning');
                return;
            }

            const data = {
                nombre,
                descripcion,
                fechaInicioInscripcion,
                diasInscripcion,
                fechaInicio,
                fechaFin,
                horaInicio: `${horaInicio}:00`,
                sedeId,
                categoriaIds,
                juezIds
            };

            try {
                Swal.fire({
                    title: 'Guardando cambios...',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });

                const response = await fetch(`${API_BASE_URL}/torneos/${torneoId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(data)
                });

                if (response.ok) {
                    Swal.fire({
                        title: '¡Éxito!',
                        text: 'El torneo ha sido actualizado correctamente.',
                        icon: 'success'
                    }).then(() => {
                        cerrarModalEdicion();
                        // Recargar la tabla
                        location.reload();
                    });
                } else {
                    const error = await response.json();
                    Swal.fire('Error', error.message || 'No se pudo actualizar el torneo.', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error de Conexión', 'No se pudo conectar con el servidor.', 'error');
            }
        });
    }
});
