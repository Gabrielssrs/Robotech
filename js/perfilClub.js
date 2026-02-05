document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const API_BASE_URL = 'http://localhost:8080/api';

    // SweetAlert helpers (use Swal if loaded, otherwise fallback to alert/confirm)
    function showSwalSuccess(title, text) {
        if (window.Swal) return Swal.fire({ icon: 'success', title, text });
        alert(title + (text ? '\n' + text : ''));
        return Promise.resolve();
    }
    function showSwalError(title, text) {
        if (window.Swal) return Swal.fire({ icon: 'error', title, text });
        alert(title + (text ? '\n' + text : ''));
        return Promise.resolve();
    }
    function showSwalInfo(title, text) {
        if (window.Swal) return Swal.fire({ icon: 'info', title, text });
        alert(title + (text ? '\n' + text : ''));
        return Promise.resolve();
    }
    async function showSwalConfirm(title, text, confirmText = 'Sí', cancelText = 'No') {
        if (window.Swal) return await Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: cancelText });
        const ok = confirm((title ? title + '\n' : '') + (text || ''));
        return { isConfirmed: ok };
    }

    // Helper: parse response body safely
    async function parseResponseBody(res) {
        try {
            const text = await res.text();
            if (!text) return null;
            try { return JSON.parse(text); } catch (e) { return text; }
        } catch (e) { return null; }
    }

    // Elementos del perfil del club
    const clubNombreEl = document.getElementById('club-nombre');
    const clubRepresentanteEl = document.getElementById('club-representante');
    const clubCorreoEl = document.getElementById('club-correo');
    const clubEstadoEl = document.getElementById('club-estado');
    const clubTelefonoEl = document.getElementById('club-telefono');
    const clubCategoriaEl = document.getElementById('club-categoria-principal');
    const clubPuntosEl = document.getElementById('club-puntos');
    const clubEsloganEl = document.getElementById('club-eslogan');
    const competitorsTbody = document.getElementById('competitors-tbody');
    const clubLogoImgEl = document.getElementById('club-logo-img');

    // --- Elementos del Modal de Retiro ---
    const retireModal = document.getElementById('retire-competitor-modal');
    const closeRetireModalBtn = document.getElementById('close-retire-modal');
    const cancelRetireBtn = document.getElementById('retire-cancel');
    const retireForm = document.getElementById('retire-competitor-form');
    const retireEmailInput = document.getElementById('retire-email');
    const retireReasonInput = document.getElementById('retire-reason');

    // Elementos del modal de edición
    const editModal = document.getElementById('edit-club-modal');
    const openModalBtn = document.querySelector('.edit-club-btn');
    const closeModalBtn = document.getElementById('close-edit-club');
    const cancelModalBtn = document.getElementById('cancel-edit-club');
    const editForm = document.getElementById('edit-club-form');

    let currentClubData = null; // Caché para los datos del club
    let allCategorias = []; // Caché para todas las categorías disponibles

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    async function fetchClubProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/club/perfil`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('jwtToken');
                    window.location.href = 'login.html';
                }
                throw new Error('No se pudo obtener el perfil del club.');
            }

            currentClubData = await response.json();
            displayClubData(currentClubData);
            displayCompetitors(currentClubData.competidores);
            
            // Cargar categorías disponibles para el formulario de edición
            fetchCategorias();

        } catch (error) {
            console.error('Error:', error);
            document.body.innerHTML = `<p style="color:red; text-align:center;">Error al cargar el perfil. Por favor, inicia sesión de nuevo.</p>`;
        }
    }

    async function fetchCategorias() {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                allCategorias = await response.json();
            }
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        }
    }

    function displayClubData(club) {
        const notSetText = 'No establecido';
        const clubName = club.nombre || '';

        clubNombreEl.textContent = clubName || notSetText;
        clubRepresentanteEl.textContent = club.representante || notSetText;
        clubCorreoEl.textContent = club.correo || notSetText;
        clubTelefonoEl.textContent = club.telefono || notSetText;
        clubCategoriaEl.textContent = club.categoriasPrincipales || notSetText;
        clubPuntosEl.textContent = '0';
        clubEsloganEl.textContent = club.slogan || 'Sin eslogan definido.';

        clubEstadoEl.textContent = club.estado;
        clubEstadoEl.className = `value status-${club.estado.toLowerCase()}`;
        
        const initial = clubName.charAt(0).toUpperCase() || 'C';
        const placeholderUrl = `https://ui-avatars.com/api/?name=${initial}&size=150&background=random&color=fff&bold=true`;
        
        clubLogoImgEl.src = club.fotoUrl || placeholderUrl;
        
        clubLogoImgEl.onerror = () => {
            clubLogoImgEl.onerror = null;
            clubLogoImgEl.src = placeholderUrl;
        };
    }

    function displayCompetitors(competidores) {
        competitorsTbody.innerHTML = '';
        if (!competidores || competidores.length === 0) {
            competitorsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Este club aún no tiene competidores.</td></tr>`;
            return;
        }

        competidores.forEach(comp => {
            const row = document.createElement('tr');
            const estadoClass = `status-${comp.estado.toLowerCase()}`;
            const toggleButton = comp.estado === 'ACTIVO'
                ? `<button class="btn-action btn-suspend" data-id="${comp.id}">Suspender</button>`
                : `<button class="btn-action btn-activate" data-id="${comp.id}">Activar</button>`;

            const retireButton = `<button class="btn-action btn-retire" data-id="${comp.id}" data-email="${comp.correoElectronico || ''}">Retirar</button>`;

            const competitorName = comp.nombreCompleto || '';
            const initial = competitorName.charAt(0).toUpperCase() || 'C';
            const placeholderUrl = `https://ui-avatars.com/api/?name=${initial}&size=40&background=random&color=fff&bold=true`;

            row.innerHTML = `
                <td><img src="${comp.fotoUrl || placeholderUrl}" 
                         alt="Avatar" class="table-avatar" 
                         onerror="this.onerror=null; this.src='${placeholderUrl}';"></td>
                <td><strong>${competitorName || 'N/A'}</strong></td>
                <td>${comp.alias || 'N/A'}</td>
                <td>General</td>
                <td><span class="${estadoClass}">${comp.estado.replace(/_/g, ' ')}</span></td>
                <td class="table-actions">${toggleButton} ${retireButton}</td>
            `;
            competitorsTbody.appendChild(row);
        });
    }

    async function handleRetireSubmit(e) {
        e.preventDefault();
        const correoCompetidor = retireEmailInput.value.trim();
        const motivo = retireReasonInput.value.trim();

        if (!motivo) {
            await showSwalError('Validación', 'El motivo del retiro es obligatorio.');
            return;
        }

        const payload = { correoCompetidor, motivo };

        try {
            const res = await fetch(`${API_BASE_URL}/solicitudes-retiro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const body = await parseResponseBody(res);
                throw new Error((body && body.message) ? body.message : 'Error al enviar la solicitud de retiro.');
            }
            await showSwalSuccess('Solicitud Enviada', 'La solicitud de retiro fue enviada correctamente para su revisión.');
            closeRetireModal();
        } catch (err) {
            console.error(err);
            await showSwalError('Error', err.message);
        }
    }

    function openRetireModal(email) {
        retireEmailInput.value = email || '';
        retireReasonInput.value = '';
        retireModal.style.display = 'block';
    }

    function closeRetireModal() {
        retireModal.style.display = 'none';
        retireForm.reset();
    }

    function openEditModal() {
        if (!currentClubData) return;
        document.getElementById('edit-club-nombre').value = currentClubData.nombre || '';
        document.getElementById('edit-club-representante').value = currentClubData.representante || '';
        document.getElementById('edit-club-correo').value = currentClubData.correo || '';
        document.getElementById('edit-club-telefono').value = currentClubData.telefono || '';
        
        // Lógica para el select de categorías
        const categoriaSelect = document.getElementById('edit-club-categoria');
        categoriaSelect.innerHTML = ''; // Limpiar opciones previas
        
        // Obtener las categorías actuales del club como un array
        const currentCats = currentClubData.categoriasPrincipales 
            ? currentClubData.categoriasPrincipales.split(',').map(c => c.trim()) 
            : [];

        allCategorias.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.nombre; // Usamos el nombre porque el backend espera Strings en este caso
            option.textContent = cat.nombre;
            if (currentCats.includes(cat.nombre)) {
                option.selected = true;
            }
            categoriaSelect.appendChild(option);
        });

        document.getElementById('edit-club-estado').value = currentClubData.estado || '';
        document.getElementById('edit-club-puntos').value = clubPuntosEl.textContent;
        document.getElementById('edit-club-eslogan').value = currentClubData.slogan || '';
        document.getElementById('edit-club-logo').value = '';
        editModal.style.display = 'block';
    }

    function attachClubPhoneValidator() {
        const phoneInput = document.getElementById('edit-club-telefono');
        if (!phoneInput) return;
        let errorEl = document.getElementById('edit-club-telefono-error');
        if (!errorEl) {
            errorEl = document.createElement('span');
            errorEl.id = 'edit-club-telefono-error';
            errorEl.className = 'error';
            phoneInput.insertAdjacentElement('afterend', errorEl);
        }
        phoneInput.maxLength = 9;
        phoneInput.addEventListener('input', (e) => {
            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 9);
            if (e.target.value !== cleaned) e.target.value = cleaned;
            if (errorEl.textContent) errorEl.textContent = '';
            phoneInput.classList.remove('invalid-input');
        });
        phoneInput.addEventListener('blur', () => {
            const v = phoneInput.value.trim();
            if (v && !/^\d{9}$/.test(v)) {
                errorEl.textContent = 'El teléfono debe tener exactamente 9 dígitos.';
                phoneInput.classList.add('invalid-input');
            }
        });
    }

    function closeEditModal() {
        editModal.style.display = 'none';
    }

    async function handleEditClubSubmit(event) {
        event.preventDefault();
        if (!currentClubData) return;
        const phoneInput = document.getElementById('edit-club-telefono');
        const phoneErrorEl = document.getElementById('edit-club-telefono-error');
        const phoneVal = phoneInput ? phoneInput.value.trim() : '';
        if (phoneVal && !/^\d{9}$/.test(phoneVal)) {
            if (phoneErrorEl) phoneErrorEl.textContent = 'El teléfono debe tener exactamente 9 dígitos.';
            if (phoneInput) phoneInput.classList.add('invalid-input');
            if (phoneInput) phoneInput.focus();
            return;
        }
        
        // Obtener categorías seleccionadas
        const selectedCategories = Array.from(document.getElementById('edit-club-categoria').selectedOptions).map(opt => opt.value);

        const clubDetails = {
            nombre: document.getElementById('edit-club-nombre').value,
            representante: document.getElementById('edit-club-representante').value,
            telefono: document.getElementById('edit-club-telefono').value,
            slogan: document.getElementById('edit-club-eslogan').value,
            categorias: selectedCategories // Enviamos la lista de nombres
        };
        const formData = new FormData();
        formData.append('details', new Blob([JSON.stringify(clubDetails)], { type: 'application/json' }));
        const logoInput = document.getElementById('edit-club-logo');
        if (logoInput && logoInput.files[0]) {
            formData.append('logo', logoInput.files[0]);
        }
        try {
            // CORRECCIÓN: Usar el endpoint de perfil propio (/v1/club/perfil) en lugar del endpoint administrativo (/clubs/{id})
            const response = await fetch(`${API_BASE_URL}/v1/club/perfil`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!response.ok) {
                const body = await parseResponseBody(response);
                throw new Error(body?.message || 'No se pudo actualizar el club.');
            }
            await showSwalSuccess('Perfil actualizado', '¡Perfil del club actualizado con éxito!');
            closeEditModal();
            await fetchClubProfile();
        } catch (error) {
            console.error('Error al actualizar el club:', error);
            await showSwalError('Error al actualizar el club', error.message);
        }
    }

    async function toggleCompetitorStatus(competitorId, action) {
        const endpointAction = action === 'habilitar' ? 'activar' : 'suspender';
        const conf = await showSwalConfirm('Confirmar acción', `¿Estás seguro de que deseas ${action} a este competidor?`, 'Sí', 'No');
        if (!conf.isConfirmed) return;
        try {
            const response = await fetch(`${API_BASE_URL}/competidores/${competitorId}/${endpointAction}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error al ${action} al competidor.`);
            }
            await showSwalSuccess('Operación exitosa', `Competidor ${action === 'habilitar' ? 'habilitado' : 'suspendido'} correctamente.`);
            await fetchClubProfile();
        } catch (error) {
            console.error('Error:', error);
            await showSwalError('Error', error.message);
        }
    }

    if (protectPage()) {
        fetchClubProfile();
        openModalBtn.addEventListener('click', openEditModal);
        closeModalBtn.addEventListener('click', closeEditModal);
        cancelModalBtn.addEventListener('click', closeEditModal);
        window.addEventListener('click', (e) => { if (e.target === editModal) closeEditModal(); });
        editForm.addEventListener('submit', handleEditClubSubmit);
        attachClubPhoneValidator();
        competitorsTbody.addEventListener('click', async (e) => {
            const target = e.target;
            const id = target.dataset.id;
            if (target.classList.contains('btn-retire')) {
                const email = target.dataset.email;
                    if (!email) {
                        await showSwalError('Error', 'No se pudo obtener el correo del competidor.');
                        return;
                    }
                openRetireModal(email);
            } else if (id) {
                if (target.classList.contains('btn-suspend')) {
                    toggleCompetitorStatus(id, 'suspender');
                } else if (target.classList.contains('btn-activate')) {
                    toggleCompetitorStatus(id, 'habilitar');
                }
            }
        });
        document.querySelector('.btn-logout').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
        closeRetireModalBtn.addEventListener('click', closeRetireModal);
        cancelRetireBtn.addEventListener('click', closeRetireModal);
        retireForm.addEventListener('submit', handleRetireSubmit);
        window.addEventListener('click', (e) => { if (e.target === retireModal) closeRetireModal(); });
    }
});
