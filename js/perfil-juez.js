document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    // Ajusta la URL base si es necesario, nota que para torneos usamos /api/torneos
    const API_BASE_URL = 'https://robotech-back.onrender.com/api'; 
    const JUEZ_API_URL = `${API_BASE_URL}/v1/juez`;

    // --- Elementos del Perfil ---
    const profilePhoto = document.getElementById('profile-photo');
    const profileNombre = document.querySelector('.profile-nombre'); // Elemento span
    const profileRole = document.querySelector('.profile-role');
    const profileSpecialty = document.querySelector('.profile-specialty');
    const profileMemberSince = document.querySelector('.profile-member-since');

    // --- Elementos de Estadísticas ---
    const statTorneos = document.querySelector('.juez-stat-item:nth-child(1) .juez-stat-value');
    const statCombates = document.querySelector('.juez-stat-item:nth-child(2) .juez-stat-value');
    const statCategorias = document.querySelector('.juez-stat-item:nth-child(3) .juez-stat-value');
    const statAprobacion = document.querySelector('.juez-stat-item:nth-child(4) .juez-stat-value');
    const statAprobacionLabel = document.querySelector('.juez-stat-item:nth-child(4) .juez-stat-label');

    // --- Elementos de la Tabla de Torneos ---
    const assignmentsTableBody = document.querySelector('.juez-assignments-table tbody');

    // --- Elementos del Modal ---
    const editBtn = document.getElementById('juez-edit-btn');
    const modal = document.getElementById('edit-juez-modal'); // ID corregido según tu HTML (era edit-juez-modal)
    // Si tu HTML usa una clase para el modal, ajusta el selector. Asumo ID por tu código anterior.
    // Nota: En tu HTML el modal tiene id="edit-juez-modal".
    
    const closeBtn = document.getElementById('close-juez-modal');
    const cancelBtn = document.getElementById('juez-cancel-edit');
    const form = document.getElementById('edit-juez-form'); // ID corregido (era edit-juez-form)

    // --- Inputs del Formulario ---
    const editNombre = document.getElementById('edit-juez-nombre');
    const editRole = document.getElementById('edit-juez-role');
    const editSpecialty = document.getElementById('edit-juez-specialty');
    const editMember = document.getElementById('edit-juez-member');
    const editFoto = document.getElementById('edit-juez-foto');

    let currentJuezData = null;

    // --- Funciones Auxiliares ---

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        // Ajuste simple para visualización, o usar UTC si viene así del back
        const day = date.getDate();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        return `${day} de ${month} de ${year}`;
    }

    function formatDateShort(dateString) {
        if (!dateString) return 'TBA';
        const date = new Date(dateString);
        return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    }

    // --- Carga de Datos ---

    async function loadProfileData() {
        try {
            // 1. Cargar Perfil del Juez
            const responseProfile = await fetch(`${JUEZ_API_URL}/perfil`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!responseProfile.ok) throw new Error('No se pudo cargar el perfil del juez.');
            currentJuezData = await responseProfile.json();
            updateProfileView(currentJuezData);

            // 2. Cargar Torneos Asignados
            const responseTorneos = await fetch(`${API_BASE_URL}/torneos/mis-torneos`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (responseTorneos.ok) {
                const torneos = await responseTorneos.json();
                updateDashboard(torneos, currentJuezData);
            } else {
                console.error('Error al cargar torneos asignados');
                assignmentsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No se pudieron cargar los torneos.</td></tr>';
            }

        } catch (error) {
            console.error('Error:', error);
            // alert(error.message); // Opcional: mostrar alerta
        }
    }

    function updateProfileView(data) {
        // Actualizar foto y textos
        const placeholderUrl = `https://ui-avatars.com/api/?name=${data.nombre.charAt(0)}&size=250&background=random&color=fff&bold=true`;
        if (profilePhoto) profilePhoto.src = data.fotoUrl || placeholderUrl;
        
        // Usamos selectores de clase para los spans dentro de .juez-detail-item
        // Asegúrate de que tu HTML tenga las clases correctas en los spans "value"
        const nombreSpan = document.querySelector('.juez-detail-item .profile-nombre');
        if (nombreSpan) nombreSpan.textContent = data.nombre || 'N/A';

        const roleSpan = document.querySelector('.juez-detail-item .profile-role');
        if (roleSpan) roleSpan.textContent = (data.nivelCredencial || 'JUEZ').replace(/_/g, ' ');

        const specialtySpan = document.querySelector('.juez-detail-item .profile-specialty');
        if (specialtySpan) specialtySpan.textContent = (data.especialidades && data.especialidades.length > 0) ? data.especialidades.join(', ') : 'General';

        const memberSpan = document.querySelector('.juez-detail-item .profile-member-since');
        // Usamos fechaCreacion si existe, o una fecha por defecto
        if (memberSpan) memberSpan.textContent = formatDate(data.fechaCreacion || new Date().toISOString());
    }

    function updateDashboard(torneos, juezData) {
        // 1. Calcular Estadísticas Básicas
        if (statTorneos) statTorneos.textContent = torneos.length;
        
        // Categorías certificadas: tomamos las del perfil del juez
        if (statCategorias) statCategorias.textContent = (juezData.especialidades || []).length;

        // Combates Supervisados (Simulado o requiere endpoint específico)
        // Por ahora, podemos estimar o dejar un valor placeholder si el backend no lo envía
        // Si quisieras ser preciso, tendrías que iterar torneos y pedir sus encuentros, pero es costoso.
        if (statCombates) statCombates.textContent = "---"; // O un valor real si el backend lo provee en el futuro

        // Tasa de Aprobación -> Cambiémoslo a "Puntos Promedio" como pediste
        if (statAprobacionLabel) statAprobacionLabel.textContent = "Puntos Promedio";
        if (statAprobacion) statAprobacion.textContent = "---"; // Requiere lógica de backend

        // 2. Encontrar Torneo Prioritario (En Curso o Más Próximo)
        // Filtramos torneos activos o próximos
        const torneosActivos = torneos.filter(t => t.estado === 'EN_CURSO' || t.estado === 'PROXIMAMENTE');
        
        // Ordenar: Primero EN_CURSO, luego por fecha más cercana
        torneosActivos.sort((a, b) => {
            if (a.estado === 'EN_CURSO' && b.estado !== 'EN_CURSO') return -1;
            if (b.estado === 'EN_CURSO' && a.estado !== 'EN_CURSO') return 1;
            return new Date(a.fechaInicio) - new Date(b.fechaInicio);
        });

        const torneoPrioritario = torneosActivos.length > 0 ? torneosActivos[0] : null;

        renderAssignmentsTable(torneoPrioritario);
    }

    function renderAssignmentsTable(torneo) {
        assignmentsTableBody.innerHTML = '';

        if (!torneo) {
            assignmentsTableBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding: 20px; color: #8b949e;">
                        No tienes torneos próximos asignados.
                    </td>
                </tr>`;
            return;
        }

        const row = document.createElement('tr');
        
        // Determinar clase de estado
        let statusClass = 'juez-status-pending';
        let statusText = torneo.estado;
        if (torneo.estado === 'EN_CURSO') {
            statusClass = 'juez-status-active'; // Asegúrate de tener CSS para esto (ej. verde)
            statusText = 'En Curso';
        } else if (torneo.estado === 'PROXIMAMENTE') {
            statusText = 'Próximo';
        }

        // Categorías: mostrar las que coinciden con el juez o todas si es general
        // El endpoint /mis-torneos ya filtra esto en el backend según tu lógica Java
        const categoriasStr = (torneo.categorias && torneo.categorias.length > 0) 
            ? torneo.categorias.join(', ') 
            : 'Todas';

        // Botón de Acción Principal
        let actionBtn = '';
        if (torneo.estado === 'EN_CURSO') {
            // Si está en curso, botón para ir directo a puntuar
            // Pasamos el ID del torneo para que panel_Puntuacion sepa qué cargar
            actionBtn = `<a href="panel_Puntuacion.html?torneoId=${torneo.id}" class="juez-action-btn action-score" style="text-decoration:none;">
                            <i class="fas fa-pen-to-square"></i> Puntuar
                         </a>`;
        } else {
            // Si es próximo, solo ver detalles o reglas
            actionBtn = `<button class="juez-action-btn action-rules btn-outline" onclick="window.location.href='reglamento_torneo.html?id=${torneo.id}'">
                            <i class="fas fa-book"></i> Reglas
                         </button>`;
        }

        row.innerHTML = `
            <td><strong>${torneo.nombre}</strong></td>
            <td>${formatDateShort(torneo.fechaInicio)}</td>
            <td>${categoriasStr}</td>
            <td><span class="juez-status ${statusClass}">${statusText}</span></td>
            <td class="juez-actions-cell">
                ${actionBtn}
            </td>
        `;

        assignmentsTableBody.appendChild(row);
    }

    // --- Funciones del Modal ---

    function openModal() {
        if (!currentJuezData) return;
        
        // Llenar campos
        if (editNombre) editNombre.value = currentJuezData.nombre || '';
        if (editRole) editRole.value = (currentJuezData.nivelCredencial || '').replace(/_/g, ' ');
        if (editSpecialty) editSpecialty.value = (currentJuezData.especialidades || []).join(', ');
        if (editMember) editMember.value = formatDate(currentJuezData.fechaCreacion);

        // Deshabilitar campos de solo lectura
        if (editRole) editRole.disabled = true;
        if (editSpecialty) editSpecialty.disabled = true; // Especialidades las define el admin
        if (editMember) editMember.disabled = true;

        if (modal) modal.style.display = 'block';
    }

    function closeModal() {
        if (modal) modal.style.display = 'none';
        if (form) form.reset();
    }

    async function handleFormSubmit(event) {
        event.preventDefault();

        // Construir objeto con campos editables
        // Nota: El backend espera un JSON en 'details' y opcionalmente un archivo en 'foto'
        const details = {
            nombre: editNombre.value,
            // Agrega otros campos editables si tu backend lo permite (ej. teléfono)
        };

        const formData = new FormData();
        formData.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
        
        if (editFoto && editFoto.files[0]) {
            formData.append('foto', editFoto.files[0]);
        }

        // Mostrar loading (opcional, usando SweetAlert si lo tienes)
        // Swal.fire({ title: 'Actualizando...', didOpen: () => Swal.showLoading() });

        try {
            const response = await fetch(`${JUEZ_API_URL}/perfil`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'No se pudo actualizar el perfil.');
            }

            const updatedData = await response.json();
            currentJuezData = updatedData;
            updateProfileView(updatedData);
            closeModal();
            alert('¡Perfil actualizado con éxito!'); // O Swal.fire('Éxito', 'Perfil actualizado', 'success');

        } catch (error) {
            console.error('Error al actualizar:', error);
            alert(error.message);
        }
    }

    // --- Event Listeners ---
    if (protectPage()) {
        loadProfileData();

        if (editBtn) editBtn.addEventListener('click', openModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
        
        window.addEventListener('click', (e) => { 
            if (modal && e.target === modal) closeModal(); 
        });
        
        if (form) form.addEventListener('submit', handleFormSubmit);
    }
});
