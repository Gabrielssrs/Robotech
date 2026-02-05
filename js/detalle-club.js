document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const API_BASE_URL = 'http://localhost:8080/api';
    const urlParams = new URLSearchParams(window.location.search);
    const clubId = urlParams.get('id');

    const competitorsBody = document.getElementById('competitors-body');

    const swalWithBootstrapButtons = (window.Swal && window.Swal.mixin) ? window.Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-success',
            cancelButton: 'btn btn-danger'
        },
        buttonsStyling: false
    }) : null;

    function decodeJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Error al decodificar el token:", e);
            return null;
        }
    }

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        const decodedToken = decodeJwt(token);
        if (!decodedToken?.roles?.includes('ROLE_ADM_SISTEMA')) {
            alert('Acceso denegado. No tienes permisos de administrador.');
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    if (!clubId) {
        document.querySelector('.club-detail-container').innerHTML = '<p style="text-align: center; color: red;">ID de club no válido.</p>';
        return;
    }

    async function fetchClubDetail() {
        try {
            const response = await fetch(`${API_BASE_URL}/clubs/${clubId}/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Error al cargar los detalles del club.');
            const club = await response.json();
            renderClubDetail(club);
            renderCompetitors(club.competidores || []);
        } catch (error) {
            console.error('Error:', error);
            document.querySelector('.club-detail-container').innerHTML = `<p style="text-align: center; color: red;">${error.message}</p>`;
            competitorsBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: red;">Error al cargar competidores.</td></tr>`;
        }
    }

    function renderClubDetail(club) {
        // placeholder para la vista detalle (mejor resolución para 350x350)
        const placeholderUrl = `https://ui-avatars.com/api/?name=${(club.nombre||'C').charAt(0)}&size=350&background=random&color=fff&bold=true`;
        
        document.getElementById('club-logo-img').src = club.fotoUrl || placeholderUrl;
        document.getElementById('club-logo-img').onerror = () => {
            document.getElementById('club-logo-img').onerror = null;
            document.getElementById('club-logo-img').src = placeholderUrl;
        };
        
        const nombreEl = document.getElementById('club-nombre-heading');
        if (nombreEl) nombreEl.textContent = club.nombre || 'N/A';
        document.getElementById('club-id').textContent = `CLB-${String(club.id).padStart(3, '0')}`;
        document.getElementById('club-representante').textContent = club.representante || 'N/A';
        document.getElementById('club-correo').textContent = club.correo || 'N/A';
        document.getElementById('club-telefono').textContent = club.telefono || 'N/A';
        document.getElementById('club-region').textContent = club.region || 'N/A';
        
        const estadoEl = document.getElementById('club-estado');
        if (estadoEl) {
            estadoEl.textContent = club.estado || 'N/A';
            estadoEl.className = `value status-${(club.estado || '').toString().toLowerCase().replace(/\s+/g, '-')}`;
        }
        const estadoValEl = document.getElementById('club-estado-val');
        if (estadoValEl) {
            estadoValEl.textContent = club.estado || 'N/A';
            estadoValEl.className = `value status-${(club.estado || '').toString().toLowerCase().replace(/\s+/g, '-')}`;
        }
        
        document.getElementById('club-total-comp').textContent = club.totalCompetidores || '0';
        // Render categories as chips when possible
        const categoriasEl = document.getElementById('club-categorias');
        if (categoriasEl) {
            categoriasEl.innerHTML = '';
            const cats = club.categoriasPrincipales;
            if (Array.isArray(cats)) {
                cats.forEach(c => {
                    const chip = document.createElement('span');
                    chip.className = 'category-chip';
                    chip.textContent = c;
                    categoriasEl.appendChild(chip);
                });
            } else if (typeof cats === 'string' && cats.trim()) {
                cats.split(',').map(s => s.trim()).filter(Boolean).forEach(c => {
                    const chip = document.createElement('span');
                    chip.className = 'category-chip';
                    chip.textContent = c;
                    categoriasEl.appendChild(chip);
                });
            } else {
                categoriasEl.textContent = 'Ninguna';
            }
        }
        const esloganEl = document.getElementById('club-eslogan');
        if (esloganEl) esloganEl.textContent = club.slogan || 'Sin eslogan definido.';
    }

    // Acciones de la cabecera: Editar / Suspender (placeholder)
    const editBtn = document.getElementById('edit-club-btn');
    const toggleStatusBtn = document.getElementById('toggle-club-status-btn');
    if (editBtn) {
        editBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (swalWithBootstrapButtons) swalWithBootstrapButtons.fire('Editar', 'Funcionalidad de edición aún no implementada.', 'info');
            else if (window.Swal) Swal.fire('Editar', 'Funcionalidad de edición aún no implementada.', 'info');
            else alert('Funcionalidad de edición aún no implementada.');
        });
    }
    if (toggleStatusBtn) {
        toggleStatusBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const confirmMsg = '¿Deseas cambiar el estado de este club?';
            let confirmed = false;
            if (swalWithBootstrapButtons) {
                const res = await swalWithBootstrapButtons.fire({ title: 'Confirmar', text: confirmMsg, icon: 'warning', showCancelButton: true });
                confirmed = res.isConfirmed;
            } else if (window.Swal) {
                const res = await Swal.fire({ title: 'Confirmar', text: confirmMsg, icon: 'warning', showCancelButton: true });
                confirmed = res.isConfirmed;
            } else {
                confirmed = confirm(confirmMsg);
            }
            if (!confirmed) return;
            if (swalWithBootstrapButtons) swalWithBootstrapButtons.fire('Hecho', 'La acción de cambiar estado se procesó (placeholder).', 'success');
            else if (window.Swal) Swal.fire('Hecho', 'La acción de cambiar estado se procesó (placeholder).', 'success');
            else alert('Acción procesada.');
        });
    }

    function renderCompetitors(competitors) {
        if (!competitors || competitors.length === 0) {
            competitorsBody.innerHTML = `<tr><td colspan="6" style="text-align: center;">Este club no tiene competidores registrados.</td></tr>`;
            return;
        }

        competitorsBody.innerHTML = '';
        competitors.forEach(comp => {
            const statusClass = `status-${comp.estado.toLowerCase()}`;
            const placeholderUrl = `https://ui-avatars.com/api/?name=${(comp.nombreCompleto || 'C').charAt(0)}&size=40&background=random&color=fff&bold=true`;

            const row = `
                <tr>
                    <td><img src="${comp.fotoUrl || placeholderUrl}" alt="Avatar" class="table-avatar" onerror="this.onerror=null; this.src='${placeholderUrl}';"></td>
                    <td><strong>${comp.nombreCompleto || 'N/A'}</strong></td>
                    <td>${comp.alias || 'N/A'}</td>
                    <td>General</td>
                    <td><span class="${statusClass}">${comp.estado.replace(/_/g, ' ')}</span></td>
                    <td class="table-actions">
                        <button class="btn-action btn-retire-comp" data-id="${comp.id}">Retirar</button>
                    </td>
                </tr>
            `;
            competitorsBody.innerHTML += row;
        });

        addEventListenersToCompetitorButtons();
    }

    let pendingRetireCompetitorId = null;
    const retireModalEl = document.getElementById('retire-validation-modal');
    const retireCodeInput = document.getElementById('retire-validation-code');
    const retireAcceptBtn = document.getElementById('retire-validation-accept');
    const retireRejectBtn = document.getElementById('retire-validation-reject');
    const retireCloseBtn = document.getElementById('retire-validation-close');

    function openRetireValidationModal(competitorId) {
        pendingRetireCompetitorId = competitorId;
        if (retireCodeInput) retireCodeInput.value = '';
        if (retireModalEl) retireModalEl.style.display = 'block';
    }

    function closeRetireValidationModal() {
        pendingRetireCompetitorId = null;
        if (retireModalEl) retireModalEl.style.display = 'none';
        if (retireCodeInput) retireCodeInput.value = '';
    }

    async function performRetireWithCode(competitorId, code) {
        try {
            const response = await fetch(`${API_BASE_URL}/competidores/${competitorId}/retirar`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                // CORRECCIÓN: El cuerpo debe coincidir con el DTO `RetiroRequest` del backend.
                body: JSON.stringify({ codigoRetiro: code })
            });
            if (!response.ok) {
                // El backend ahora devuelve un String con el mensaje de error.
                const errMsg = await response.text();
                throw new Error(errMsg || 'Error al retirar competidor.');
            }

            if (swalWithBootstrapButtons) {
                await swalWithBootstrapButtons.fire('Éxito', 'Competidor retirado correctamente.', 'success');
            } else {
                alert('Competidor retirado correctamente.');
            }
            closeRetireValidationModal();
            fetchClubDetail();
        } catch (error) {
            console.error('Error:', error);
            if (swalWithBootstrapButtons) {
                swalWithBootstrapButtons.fire('Error', error.message, 'error');
            } else {
                alert(error.message);
            }
        }
    }

    function addEventListenersToCompetitorButtons() {
        document.querySelectorAll('.btn-retire-comp').forEach(b => {
            b.addEventListener('click', e => {
                const id = e.target.dataset.id;
                openRetireValidationModal(id);
            });
        });
    }

    if (retireAcceptBtn) {
        retireAcceptBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const code = retireCodeInput ? retireCodeInput.value.trim() : '';
            if (!code) {
                if (swalWithBootstrapButtons) swalWithBootstrapButtons.fire('Aviso', 'Ingresa el código de validación.', 'warning');
                else alert('Ingresa el código de validación.');
                return;
            }
            if (!pendingRetireCompetitorId) return;
            performRetireWithCode(pendingRetireCompetitorId, code);
        });
    }
    if (retireRejectBtn) {
        retireRejectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (swalWithBootstrapButtons) swalWithBootstrapButtons.fire('Cancelado', 'La operación de retiro fue cancelada.', 'info');
            closeRetireValidationModal();
        });
    }
    if (retireCloseBtn) retireCloseBtn.addEventListener('click', closeRetireValidationModal);
    window.addEventListener('click', (e) => { if (e.target === retireModalEl) closeRetireValidationModal(); });

    if (protectPage()) {
        fetchClubDetail();

        document.querySelector('.btn-logout').addEventListener('click', e => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }
});
