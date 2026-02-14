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

            switch(t.estado) {
                case 'EN_CURSO':
                    statusClass = 'status-active';
                    statusText = 'Activo';
                    row.classList.add('highlight-active');
                    actionsHtml = `
                        ${btnVer}
                        ${btnReglas}
                        <button class="btn-action btn-manage" onclick="window.location.href='vista-torneo.html?id=${t.id}&simular=true'">Simular</button>
                    `;
                    break;
                case 'PROXIMAMENTE':
                    statusClass = 'status-pending';
                    statusText = 'Próximo';
                    actionsHtml = `
                        ${btnVer}
                        ${btnReglas}
                        <a class="btn-action btn-edit" href="crearTorneo.html?id=${t.id}" style="text-decoration: none; background-color: #d29922; color: white;">Editar</a>
                    `;
                    break;
                case 'FINALIZADO':
                    statusClass = 'status-suspended';
                    statusText = 'Finalizado';
                    actionsHtml = `
                        ${btnVer}
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
