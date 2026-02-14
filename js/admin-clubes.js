document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const clubsTableBody = document.querySelector('.club-management-table tbody');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';

    // --- Elementos del Modal de Edición ---
    const editModal = document.getElementById('edit-club-modal');
    const closeEditBtn = document.getElementById('close-edit-modal');
    const cancelEditBtn = document.getElementById('cancel-edit-modal');
    const editForm = document.getElementById('edit-club-form');
    
    // Inputs del modal
    const modalClubName = document.getElementById('modal-club-name');
    const editClubIdInput = document.getElementById('edit-club-id');
    const editClubRegionInput = document.getElementById('edit-club-region');
    const editClubEstadoSelect = document.getElementById('edit-club-estado');
    const editClubCategoriasSelect = document.getElementById('edit-club-categorias');

    // --- Elementos de Filtro y Búsqueda ---
    // Seleccionamos las pestañas dentro del contenedor de filtros
    const filterTabs = document.querySelectorAll('.admin-filters-container .admin-filter-tab');
    const searchInput = document.querySelector('.search-input-admin');

    // --- Estado de la Aplicación ---
    let allClubs = [];
    let allCategories = [];
    let currentStatusFilter = 'ACTIVO'; // Estado inicial por defecto (coincide con tu HTML active)
    let currentSearchTerm = '';

    // --- Configuración de SweetAlert2 ---
    const swalWithBootstrapButtons = (window.Swal && window.Swal.mixin) ? window.Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-success',
            cancelButton: 'btn btn-danger'
        },
        buttonsStyling: false
    }) : null;

    function showAlert(icon, title, text) {
        if (swalWithBootstrapButtons) swalWithBootstrapButtons.fire(title, text, icon);
        else alert(`${title}: ${text}`);
    }

    async function swalConfirm(title, text, confirmText = 'Sí', cancelText = 'No', icon = 'warning') {
        if (swalWithBootstrapButtons) {
            return swalWithBootstrapButtons.fire({
                title, text, icon, showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: cancelText, reverseButtons: true
            });
        }
        return Promise.resolve({ isConfirmed: confirm(`${title}\n${text}`) });
    }

    // --- Funciones de Autenticación ---
    function decodeJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) { return null; }
    }

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        const decodedToken = decodeJwt(token);
        if (!decodedToken?.roles?.includes('ROLE_ADM_SISTEMA')) {
            alert('Acceso denegado.');
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // --- LÓGICA DE FILTROS Y BÚSQUEDA ---

    function updateFilterCounts() {
        // Calculamos cuántos clubes hay en cada estado para actualizar los textos de las pestañas
        const activeCount = allClubs.filter(c => c.estado === 'ACTIVO').length;
        const suspendedCount = allClubs.filter(c => c.estado === 'SUSPENDIDO').length;
        const retiredCount = allClubs.filter(c => c.estado === 'RETIRADO').length;

        // Actualizamos el texto de las pestañas (Asumiendo el orden del HTML: 0=Activos, 1=Suspendidos, 2=Retirados)
        if (filterTabs[0]) filterTabs[0].textContent = `Activos (${activeCount})`;
        if (filterTabs[1]) filterTabs[1].textContent = `Suspendidos (${suspendedCount})`;
        if (filterTabs[2]) filterTabs[2].textContent = `Retirados (${retiredCount})`;
    }

    function applyFilters() {
        // 1. Filtrar por Estado (Estricto: solo muestra el estado de la pestaña seleccionada)
        let filtered = allClubs.filter(club => club.estado === currentStatusFilter);

        // 2. Filtrar por Término de Búsqueda (si el usuario escribió algo)
        if (currentSearchTerm) {
            const term = currentSearchTerm.toLowerCase();
            filtered = filtered.filter(club => {
                const idRaw = String(club.id).toLowerCase();
                const idFormatted = `clb-${String(club.id).padStart(3, '0')}`.toLowerCase();
                const nombre = (club.nombre || '').toLowerCase();
                const responsable = (club.representante || '').toLowerCase();

                // Busca coincidencias en ID (ej: "1" o "CLB-001"), Nombre o Responsable
                return idRaw.includes(term) || idFormatted.includes(term) || nombre.includes(term) || responsable.includes(term);
            });
        }

        renderClubs(filtered);
    }

    function setupFilterListeners() {
        // Listeners para las pestañas de estado
        filterTabs.forEach((tab, index) => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Actualizar clases visuales (mover la clase 'active')
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Actualizar estado del filtro según el índice
                if (index === 0) currentStatusFilter = 'ACTIVO';
                else if (index === 1) currentStatusFilter = 'SUSPENDIDO';
                else if (index === 2) currentStatusFilter = 'RETIRADO';

                applyFilters();
            });
        });

        // Listener para el input de búsqueda
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchTerm = e.target.value.trim();
                applyFilters();
            });
        }
    }

    // --- Llamadas a la API ---
    async function fetchAndRenderClubs() {
        try {
            const response = await fetch(`${API_BASE_URL}/clubs`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Error al cargar los clubes.');
            allClubs = await response.json();
            
            // Una vez cargados los datos:
            updateFilterCounts(); // Actualizamos los números en las pestañas
            applyFilters();       // Aplicamos el filtro por defecto y renderizamos
        } catch (error) {
            console.error(error);
            clubsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:red;">Error al cargar datos.</td></tr>`;
        }
    }

    async function fetchCategories() {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (response.ok) allCategories = await response.json();
        } catch (error) { console.error('Error cargando categorías:', error); }
    }

    // --- Renderizado ---
    function renderClubs(clubs) {
        if (!clubs || clubs.length === 0) {
            clubsTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">No se encontraron clubes con los filtros actuales.</td></tr>`;
            return;
        }

        const rowsHtml = clubs.map(club => {
            const statusClass = `status-${club.estado.toLowerCase()}`;
            const placeholderUrl = `https://ui-avatars.com/api/?name=${club.nombre.charAt(0)}&size=40&background=random&color=fff&bold=true`;

            let actionButton = '';
            // Solo mostramos botones de acción si NO está retirado
            if (club.estado === 'ACTIVO') {
                actionButton = `<button class="btn-action btn-suspend" data-id="${club.id}">Suspender</button>`;
            } else if (club.estado === 'SUSPENDIDO') {
                actionButton = `<button class="btn-action btn-activate" data-id="${club.id}">Activar</button>`;
            }

            return `
                <tr>
                    <td>CLB-${String(club.id).padStart(3, '0')}</td>
                    <td><img src="${club.fotoUrl || placeholderUrl}" alt="Logo" class="table-avatar" onerror="this.onerror=null; this.src='${placeholderUrl}';"></td>
                    <td class="club-info"><strong>${club.nombre}</strong></td>
                    <td>${club.representante || 'N/A'}</td>
                    <td>${club.region || 'N/A'}</td>
                    <td>${club.categoriasPrincipales || 'Ninguna'}</td>
                    <td>${club.totalCompetidores}</td>
                    <td><span class="${statusClass}">${club.estado}</span></td>
                    <td class="table-actions">
                        <button class="btn-action btn-edit" data-id="${club.id}">Editar</button>
                        <button class="btn-action btn-view" data-id="${club.id}">Ver club</button>
                        ${actionButton}
                    </td>
                </tr>
            `;
        }).join('');

        clubsTableBody.innerHTML = rowsHtml;
        addEventListenersToButtons();
    }

    // --- Acciones ---
    async function changeClubStatus(clubId, action) {
        const confirm = await swalConfirm(
            `Confirmar ${action}`,
            `¿Deseas ${action} este club?`,
            'Sí, continuar', 'Cancelar'
        );
        if (!confirm.isConfirmed) return;

        try {
            const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/${action}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`Error al ${action} el club.`);
            
            showAlert('success', 'Éxito', `Club ${action === 'suspender' ? 'suspendido' : 'activado'} correctamente.`);
            fetchAndRenderClubs(); // Recarga y reaplica filtros
        } catch (error) {
            showAlert('error', 'Error', error.message);
        }
    }

    // --- Modal de Edición ---
    function openEditModal(clubId) {
        const club = allClubs.find(c => c.id == clubId);
        if (!club) return;

        modalClubName.textContent = club.nombre;
        editClubIdInput.value = club.id;
        editClubRegionInput.value = club.region || '';
        editClubEstadoSelect.value = club.estado;

        editClubCategoriasSelect.innerHTML = '';
        const currentCats = club.categoriasPrincipales ? club.categoriasPrincipales.split(',').map(c => c.trim()) : [];
        
        allCategories.forEach(cat => {
            const option = new Option(cat.nombre, cat.nombre);
            if (currentCats.includes(cat.nombre)) option.selected = true;
            editClubCategoriasSelect.add(option);
        });

        editModal.style.display = 'block';
    }

    function closeEditModal() { editModal.style.display = 'none'; }

    async function handleClubUpdate(event) {
        event.preventDefault();
        const clubId = editClubIdInput.value;
        const club = allClubs.find(c => c.id == clubId);
        
        const selectedCategories = Array.from(editClubCategoriasSelect.selectedOptions).map(opt => opt.value);
        
        const clubDetails = {
            nombre: club.nombre,
            representante: club.representante,
            telefono: club.telefono,
            slogan: club.slogan,
            region: editClubRegionInput.value,
            estado: editClubEstadoSelect.value,
            categoriasPrincipales: selectedCategories.join(', ')
        };

        if (clubDetails.estado === 'RETIRADO') {
            const confirm = await swalConfirm(
                '¿Confirmar retiro?',
                `Al marcar como RETIRADO, el club perderá acceso al sistema. ¿Continuar?`,
                'Sí, retirar', 'Cancelar', 'warning'
            );
            if (!confirm.isConfirmed) return;
        }

        try {
            const formData = new FormData();
            formData.append('details', new Blob([JSON.stringify(clubDetails)], { type: 'application/json' }));

            const response = await fetch(`${API_BASE_URL}/clubs/${clubId}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Error al actualizar el club.');
            
            showAlert('success', 'Actualizado', 'Club actualizado correctamente.');
            closeEditModal();
            fetchAndRenderClubs(); // Recarga y reaplica filtros
        } catch (error) {
            showAlert('error', 'Error', error.message);
        }
    }

    function addEventListenersToButtons() {
        document.querySelectorAll('.btn-suspend').forEach(b => b.addEventListener('click', e => changeClubStatus(e.target.dataset.id, 'suspender')));
        document.querySelectorAll('.btn-activate').forEach(b => b.addEventListener('click', e => changeClubStatus(e.target.dataset.id, 'activar')));
        document.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', e => openEditModal(e.target.dataset.id)));
        document.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', e => {
            window.location.href = `detalle-club.html?id=${e.target.dataset.id}`;
        }));
    }

    // --- Inicialización ---
    if (protectPage()) {
        setupFilterListeners(); // Configurar listeners de filtros y búsqueda
        Promise.all([fetchCategories(), fetchAndRenderClubs()]);

        closeEditBtn.addEventListener('click', closeEditModal);
        cancelEditBtn.addEventListener('click', closeEditModal);
        editForm.addEventListener('submit', handleClubUpdate);
        window.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

        document.querySelector('.btn-logout').addEventListener('click', e => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }
});
