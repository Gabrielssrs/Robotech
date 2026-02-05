document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:8080/api/jueces';
    const CATEGORIAS_API_URL = 'http://localhost:8080/api/categorias';
    const SEDES_API_URL = 'http://localhost:8080/api/sedes'; // URL para obtener sedes
    const token = localStorage.getItem('jwtToken');
    const tableBody = document.querySelector('.club-management-table tbody');

    // --- Elementos de Filtro y Búsqueda ---
    const filterTabs = document.querySelectorAll('.admin-filters-container .admin-filter-tab');
    const searchInput = document.querySelector('.search-input-admin');

    // --- Estado de la Aplicación ---
    let juecesList = [];
    let categoriasList = [];
    let sedesList = []; // Lista para almacenar las sedes
    let currentStatusFilter = 'ACTIVO';
    let currentSearchTerm = '';

    const editModal = document.getElementById('edit-juez-modal');
    const closeBtn = document.getElementById('close-edit-juez-modal');
    const cancelBtn = document.getElementById('cancel-edit-juez');
    const editForm = document.getElementById('edit-juez-form');

    // --- SweetAlert Config ---
    const swalWithBootstrapButtons = (window.Swal && window.Swal.mixin) ? window.Swal.mixin({
        customClass: { confirmButton: 'btn-main', cancelButton: 'btn-secondary' },
        buttonsStyling: false
    }) : null;

    function swalConfirm(options) {
        const cfg = Object.assign({
            title: '¿Estás seguro?',
            text: '',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'No, cancelar',
            reverseButtons: true
        }, options || {});

        if (swalWithBootstrapButtons) {
            return swalWithBootstrapButtons.fire(cfg);
        }
        return Promise.resolve(window.confirm(`${cfg.title}\n${cfg.text}`) ? { isConfirmed: true } : { isConfirmed: false });
    }

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    // --- Lógica de Filtros y Búsqueda ---
    function updateFilterCounts() {
        const activeCount = juecesList.filter(j => j.estado === 'ACTIVO').length;
        const trainingCount = juecesList.filter(j => j.estado === 'EN_CAPACITACION').length;
        const suspendedCount = juecesList.filter(j => j.estado === 'SUSPENDIDO').length;
        const retiredCount = juecesList.filter(j => j.estado === 'RETIRADO').length;

        if (filterTabs[0]) filterTabs[0].textContent = `Activos (${activeCount})`;
        if (filterTabs[1]) filterTabs[1].textContent = `Capacitación (${trainingCount})`;
        if (filterTabs[2]) filterTabs[2].textContent = `Suspendidos (${suspendedCount})`;
        if (filterTabs[3]) filterTabs[3].textContent = `Retirados (${retiredCount})`;
    }

    function applyFilters() {
        let filtered = juecesList.filter(juez => juez.estado === currentStatusFilter);

        if (currentSearchTerm) {
            const term = currentSearchTerm.toLowerCase();
            filtered = filtered.filter(juez => {
                const idRaw = String(juez.id).toLowerCase();
                const idFormatted = `jdg-${String(juez.id).padStart(3, '0')}`.toLowerCase();
                const nombre = (juez.nombre || '').toLowerCase();
                const sede = (juez.sedeNombre || '').toLowerCase(); // Permite buscar por sede también
                return idRaw.includes(term) || idFormatted.includes(term) || nombre.includes(term) || sede.includes(term);
            });
        }
        renderJueces(filtered);
    }

    function setupFilterListeners() {
        filterTabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                if (index === 0) currentStatusFilter = 'ACTIVO';
                else if (index === 1) currentStatusFilter = 'EN_CAPACITACION';
                else if (index === 2) currentStatusFilter = 'SUSPENDIDO';
                else if (index === 3) currentStatusFilter = 'RETIRADO';

                applyFilters();
            });
        });

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value.trim();
                applyFilters();
            });
        }
    }

    // --- Carga de Datos ---

    async function fetchCategorias() {
        if (categoriasList.length > 0) return categoriasList;
        try {
            const resp = await fetch(CATEGORIAS_API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!resp.ok) throw new Error('No se pudo obtener las categorías');
            categoriasList = await resp.json();
            return categoriasList;
        } catch (err) {
            console.error('Error fetching categorias:', err);
            return [];
        }
    }

    // Función para cargar las sedes
    async function fetchSedes() {
        if (sedesList.length > 0) return sedesList;
        try {
            const resp = await fetch(SEDES_API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!resp.ok) throw new Error('No se pudo obtener las sedes');
            sedesList = await resp.json();
            return sedesList;
        } catch (err) {
            console.error('Error fetching sedes:', err);
            return [];
        }
    }

    async function fetchAndRenderJueces() {
        try {
            const response = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('jwtToken');
                    window.location.href = 'login.html';
                }
                throw new Error('Error al cargar los jueces.');
            }
            juecesList = await response.json();
            updateFilterCounts();
            applyFilters();
        } catch (error) {
            console.error('Error:', error);
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center">Error al cargar los datos.</td></tr>`;
        }
    }

    function renderJueces(jueces) {
        tableBody.innerHTML = '';
        if (!jueces || jueces.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9" class="text-center">No se encontraron jueces.</td></tr>`;
            return;
        }
        jueces.forEach(juez => {
            const row = document.createElement('tr');
            const estadoText = juez.estado.replace(/_/g, ' ');
            const estadoClass = `status-${juez.estado.toLowerCase().replace(/_/g, '')}`;
            const nivelText = (juez.nivelCredencial || 'N/A').replace('NIVEL_', '').replace(/_/g, ' ').toLowerCase();
            const nivelClass = `level-${nivelText.includes('senior') ? 'high' : (nivelText.includes('estandar') ? 'medium' : 'low')}`;
            const placeholderAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(juez.nombre.charAt(0))}&size=40&background=random&color=fff&bold=true`;

            // --- Categorías ---
            let categoriasStr = 'Ninguna';
            if (juez.especialidades && Array.isArray(juez.especialidades) && juez.especialidades.length > 0) {
                const nombres = juez.especialidades.map(cat => {
                    if (cat && cat.nombre) return cat.nombre;
                    if (typeof cat === 'string') return cat;
                    return null;
                }).filter(n => n !== null);

                if (nombres.length > 0) {
                    categoriasStr = nombres.join(', ');
                }
            }

            // Obtener nombre de sede
            let sedeName = juez.sedeNombre || 'Sin Sede Asignada';

            let actionButtons = `<button class="btn-action btn-edit" data-id="${juez.id}">Editar</button>`;
            if (juez.estado === 'ACTIVO') {
                actionButtons += `<button class="btn-action btn-suspend" data-id="${juez.id}">Suspender</button>`;
            } else if (juez.estado === 'SUSPENDIDO') {
                actionButtons += `<button class="btn-action btn-activate" data-id="${juez.id}">Activar</button>`;
            }
            
            row.innerHTML = `
                <td>JDG-${String(juez.id).padStart(3, '0')}</td>
                <td><img src="${juez.fotoUrl || placeholderAvatar}" alt="Avatar" class="table-avatar" onerror="this.onerror=null; this.src='${placeholderAvatar}';"></td>
                <td class="club-info"><strong>${juez.nombre}</strong></td>
                <td>${categoriasStr}</td>
                <td><span class="${nivelClass}">${nivelText.charAt(0).toUpperCase() + nivelText.slice(1)}</span></td>
                <td><span class="${estadoClass}">${estadoText}</span></td>
                <td>${sedeName}</td>
                <td>${formatDate(juez.fechaCreacion)}</td>
                <td class="table-actions">${actionButtons}</td>`;
            tableBody.appendChild(row);
        });
    }

    // --- Acciones Rápidas ---
    async function changeJuezStatus(juezId, action) {
        const confirmResult = await swalConfirm({
            title: `¿Confirmar ${action}?`,
            text: `¿Estás seguro de que deseas ${action} a este juez?`,
            icon: 'warning'
        });

        if (!confirmResult.isConfirmed) return;

        try {
            const response = await fetch(`${API_URL}/${juezId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error(`Error al ${action} al juez.`);
            
            swalWithBootstrapButtons.fire('¡Éxito!', `Juez ${action === 'activar' ? 'activado' : 'suspendido'} correctamente.`, 'success');
            fetchAndRenderJueces();
        } catch (error) {
            swalWithBootstrapButtons.fire('Error', error.message, 'error');
        }
    }

    // --- Modal de Edición ---
    async function openEditModal(juezId) {
        // Cargamos categorías y sedes antes de abrir el modal
        await Promise.all([fetchCategorias(), fetchSedes()]);
        const juez = juecesList.find(j => String(j.id) === String(juezId));
        if (!juez) return alert('Juez no encontrado');

        document.getElementById('edit-juez-id').value = juez.id;

        // --- Cargar Categorías ---
        const categoriaSelect = document.getElementById('edit-juez-categoria');
        categoriaSelect.innerHTML = '';
        
        const currentCategoryIds = (juez.especialidades || []).map(cat => {
             return (cat && typeof cat === 'object') ? cat.id : cat;
        });

        categoriasList.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.nombre;
            
            if (currentCategoryIds.includes(cat.id)) {
                option.selected = true;
            }
            categoriaSelect.appendChild(option);
        });

        // --- Cargar Sedes ---
        const sedeSelect = document.getElementById('edit-juez-sede');
        if (sedeSelect) {
            sedeSelect.innerHTML = '<option value="">-- Seleccionar Sede --</option>';
            sedesList.forEach(sede => {
                const option = document.createElement('option');
                option.value = sede.id;
                option.textContent = sede.nombre;
                // Pre-seleccionar la sede actual del juez
                if (juez.sedeId && String(juez.sedeId) === String(sede.id)) {
                    option.selected = true;
                }
                sedeSelect.appendChild(option);
            });
        }

        // --- Cargar Estado ---
        const estadoSelect = document.getElementById('edit-juez-estado');
        const estadoNormalizado = juez.estado.toLowerCase().replace(/_/g, '');
        
        if (estadoNormalizado.includes('suspendido')) estadoSelect.value = 'suspendido';
        else if (estadoNormalizado.includes('capacitacion')) estadoSelect.value = 'capacitacion';
        else if (estadoNormalizado.includes('retirado')) estadoSelect.value = 'retirado';
        else estadoSelect.value = 'activo';

        editModal.style.display = 'block';
    }

    function closeEditModal() { editModal.style.display = 'none'; }

    // --- Event Listeners ---
    tableBody.addEventListener('click', async (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (!id) return;

        if (target.classList.contains('btn-edit')) openEditModal(id);
        else if (target.classList.contains('btn-suspend')) await changeJuezStatus(id, 'suspender');
        else if (target.classList.contains('btn-activate')) await changeJuezStatus(id, 'activar');
    });

    closeBtn.addEventListener('click', closeEditModal);
    cancelBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });

    // --- Submit del Formulario ---
    editForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const id = document.getElementById('edit-juez-id').value;
        const estadoValue = document.getElementById('edit-juez-estado').value;
        const selectedCategoryOptions = document.querySelectorAll('#edit-juez-categoria option:checked');
        const categoriaIds = Array.from(selectedCategoryOptions).map(opt => Number(opt.value));
        
        // Obtener el ID de la sede seleccionada
        const sedeSelect = document.getElementById('edit-juez-sede');
        const sedeId = sedeSelect ? sedeSelect.value : null;

        const estadoMap = {
            "activo": "ACTIVO",
            "suspendido": "SUSPENDIDO",
            "capacitacion": "EN_CAPACITACION",
            "retirado": "RETIRADO"
        };
        const nuevoEstado = estadoMap[estadoValue];

        const payload = {
            estado: nuevoEstado,
            categoriaIds: categoriaIds,
            sedeId: sedeId ? Number(sedeId) : null // Enviar sedeId al backend
        };

        try {
            if (nuevoEstado === 'RETIRADO') {
                const confirmResult = await swalConfirm({
                    title: '¿Confirmar retiro?',
                    text: 'Al retirar a un juez, se revocará su acceso al sistema. ¿Deseas continuar?',
                    icon: 'warning',
                    confirmButtonText: 'Sí, retirar'
                });
                if (!confirmResult.isConfirmed) return;
            }

            const resp = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!resp.ok) {
                const text = await resp.text();
                try {
                    const json = JSON.parse(text);
                    throw new Error(json.message || 'Error al guardar los cambios');
                } catch (e) {
                    throw new Error(text || 'Error desconocido del servidor');
                }
            }
            
            swalWithBootstrapButtons.fire('¡Éxito!', 'Los cambios se guardaron correctamente.', 'success');
            closeEditModal();
            await fetchAndRenderJueces();

        } catch (err) {
            console.error('Error updating judge:', err);
            swalWithBootstrapButtons.fire('Error', err.message, 'error');
        }
    });

    if (protectPage()) {
        setupFilterListeners();
        // Cargamos categorías y sedes al inicio, luego los jueces
        Promise.all([fetchCategorias(), fetchSedes()]).then(() => fetchAndRenderJueces());

        document.querySelector('.btn-logout').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }
});
