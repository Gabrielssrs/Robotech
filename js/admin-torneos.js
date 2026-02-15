// Variables globales para que sean accesibles desde el HTML (onclick)
let abrirEditarTorneo;
let allTorneos = []; // Mover al ámbito global para que el modal pueda verificar duplicados

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const tableBody = document.querySelector('.club-management-table tbody');
    const filterTabs = document.querySelectorAll('.admin-filter-tab');
    const searchInput = document.querySelector('.search-input-admin');
    const API_URL = 'https://robotech-back.onrender.com/api/torneos';

    // Estado inicial por defecto
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
            if(tableBody) tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar los datos.</td></tr>`;
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
        if (!searchInput) return;
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
            const sedeStr = String(t.nombreSede || '').toLowerCase(); // Usar nombreSede del DTO actualizado

            return idStr.includes(searchTerm) || 
                   nameStr.includes(searchTerm) || 
                   dateStr.includes(searchTerm) ||
                   sedeStr.includes(searchTerm);
        });

        renderTable(filtered);
    }

    function renderTable(torneos) {
        if (!tableBody) return;
        tableBody.innerHTML = '';
        if (torneos.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No se encontraron torneos en esta sección.</td></tr>`;
            return;
        }

        torneos.forEach(t => {
            const row = document.createElement('tr');
            const idFormatted = `TOR-${String(t.id).padStart(3, '0')}`;
            const cats = (t.categorias && t.categorias.length > 0) ? t.categorias.join(', ') : 'Sin categorías';
            const dateSede = `${formatDate(t.fechaInicio)} | ${t.nombreSede || 'Sede por definir'}`;

            let statusClass = '';
            let statusText = '';
            let actionsHtml = '';

            const btnVer = `<a class="btn-action btn-view" href="vista-torneo.html?id=${t.id}" style="text-decoration: none;">Ver</a>`;
            const btnReglas = `<a class="btn-action btn-rules" href="reglamento_torneo.html?id=${t.id}" style="background-color: #1f6feb; color: white; text-decoration: none;">Reglas</a>`;
            // Llamada a la función global
            const btnEditar = `<button class="btn-action btn-edit" onclick="abrirEditarTorneo(${t.id}, '${t.estado}')" style="background-color: #d29922; color: white;">Editar</button>`;

            switch(t.estado) {
                case 'EN_CURSO':
                    statusClass = 'status-active';
                    statusText = 'Activo';
                    row.classList.add('highlight-active');
                    actionsHtml = `${btnVer} ${btnReglas} ${btnEditar} <button class="btn-action btn-manage" onclick="window.location.href='vista-torneo.html?id=${t.id}&simular=true'">Simular</button>`;
                    break;
                case 'PROXIMAMENTE':
                    statusClass = 'status-pending';
                    statusText = 'Próximo';
                    actionsHtml = `${btnVer} ${btnReglas} ${btnEditar}`;
                    break;
                case 'FINALIZADO':
                    statusClass = 'status-suspended';
                    statusText = 'Finalizado';
                    actionsHtml = `${btnVer} ${btnEditar} <button class="btn-action btn-details" onclick="window.location.href='vista-torneo.html?id=${t.id}'">Resultados</button>`;
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

    // --- Definición de la función global ---
    abrirEditarTorneo = function(torneoId, estado) {
        if (estado === 'EN_CURSO' || estado === 'FINALIZADO' || estado === 'CANCELADO') {
            Swal.fire({
                title: 'Acción Inválida',
                text: `El torneo está ${estado.toLowerCase().replace('_', ' ')} y no puede ser editado.`,
                icon: 'warning',
                confirmButtonText: 'Entendido'
            });
            return;
        }
        cargarTorneoEnModal(torneoId, token);
    };

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
        
        const btnLogout = document.querySelector('.btn-logout');
        if(btnLogout) {
            btnLogout.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('jwtToken');
                window.location.href = 'login.html';
            });
        }
    }
});

// --- Funciones del Modal (Fuera del DOMContentLoaded para limpieza) ---

function cargarTorneoEnModal(torneoId, token) {
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';
    
    Swal.fire({
        title: 'Cargando...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

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

        if (torneo.horaInicio) {
            const horaPartes = torneo.horaInicio.split(':');
            document.getElementById('horaInicio').value = `${horaPartes[0]}:${horaPartes[1]}`;
        } else {
            document.getElementById('horaInicio').value = '';
        }

        // Llenar Sedes
        const sedeSelect = document.getElementById('modal-sede');
        sedeSelect.innerHTML = '<option value="" disabled>Seleccione una sede...</option>';
        sedes.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.nombre} (${s.ciudad})`;
            if (torneo.sedeId && String(torneo.sedeId) === String(s.id)) opt.selected = true;
            sedeSelect.appendChild(opt);
        });

        // Llenar Categorías
        const categoriasSelect = document.getElementById('modal-categorias');
        categoriasSelect.innerHTML = '';
        categorias.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nombre;
            // Usamos categoriaIds que ahora viene del backend
            if (Array.isArray(torneo.categoriaIds) && torneo.categoriaIds.map(String).includes(String(c.id))) {
                opt.selected = true;
            }
            categoriasSelect.appendChild(opt);
        });

        // Llenar Jueces
        const juecesSelect = document.getElementById('modal-jueces');
        juecesSelect.innerHTML = '';
        const juecesActivos = (jueces || []).filter(j => j.estado === 'ACTIVO' || !j.estado);
        juecesActivos.forEach(j => {
            const opt = document.createElement('option');
            opt.value = j.id;
            opt.textContent = `${j.nombre} (Nivel: ${j.nivelCredencial || 'N/A'})`;
            // Usamos juezIds que ahora viene del backend
            if (Array.isArray(torneo.juezIds) && torneo.juezIds.map(String).includes(String(j.id))) {
                opt.selected = true;
            }
            juecesSelect.appendChild(opt);
        });

        document.getElementById('formularioEditarTorneo').dataset.torneoId = torneoId;
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

            // Validaciones básicas
            if (!nombre) {
                Swal.fire('Nombre Requerido', 'El nombre del torneo es obligatorio.', 'warning');
                return;
            }
            
            // Validación de duplicados usando la lista global
            const existe = allTorneos.some(t => t.id !== Number(torneoId) && t.nombre && t.nombre.toLowerCase() === nombre.toLowerCase());
            if (existe) {
                Swal.fire('Nombre Duplicado', 'Ya existe otro torneo con este nombre.', 'warning');
                return;
            }

            if (juezIds.length < 3) {
                Swal.fire('Jueces Insuficientes', 'Debe seleccionar al menos 3 jueces.', 'warning');
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
