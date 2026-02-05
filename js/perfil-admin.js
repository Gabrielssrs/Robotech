document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES Y ELEMENTOS DEL DOM ---
    const API_BASE_URL = 'https://robotech-back.onrender.com/api/v1/admin';
    const token = localStorage.getItem('jwtToken');

    // SweetAlert helpers (use Swal if loaded, otherwise fallback to alert/confirm)
    function swalSuccess(title, text) {
        if (window.Swal) return Swal.fire({ icon: 'success', title, text });
        alert(title + (text ? '\n' + text : ''));
        return Promise.resolve();
    }
    function swalError(title, text) {
        if (window.Swal) return Swal.fire({ icon: 'error', title, text });
        alert(title + (text ? '\n' + text : ''));
        return Promise.resolve();
    }
    async function swalConfirm(title, text, confirmText = 'Sí', cancelText = 'No') {
        if (window.Swal) return await Swal.fire({ title, text, icon: 'warning', showCancelButton: true, confirmButtonText: confirmText, cancelButtonText: cancelText });
        const ok = confirm((title ? title + '\n' : '') + (text || ''));
        return { isConfirmed: ok };
    }

    // Elementos de la ventana modal
    const modal = document.getElementById('edit-profile-modal');
    const openModalBtn = document.querySelector('.edit-profile-btn');
    const closeModalBtn = modal.querySelector('.close-btn');
    const editForm = document.getElementById('edit-profile-form');

    // Elementos de la tarjeta de perfil
    const nombreValue = document.querySelector('.profile-nombre');
    const dniValue = document.querySelector('.profile-dni');
    const emailValue = document.querySelector('.profile-email');
    const telefonoValue = document.querySelector('.profile-telefono');
    const estadoValue = document.querySelector('.profile-estado');

    // --- FUNCIONES ---

    function decodeJwt(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    }

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        const decodedToken = decodeJwt(token);
        const userRoles = decodedToken ? decodedToken.roles : [];
        if (!userRoles.includes('ROLE_ADM_SISTEMA')) {
            // Mostrar mensaje amigable y redirigir
            swalError('Acceso denegado', 'Esta página es solo para administradores del sistema.');
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    async function fetchAdminProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/perfil`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('No se pudieron obtener los datos del perfil.');
            const adminData = await response.json();
            populateProfileData(adminData);
        } catch (error) {
            console.error('Error:', error);
            swalError('Error al cargar perfil', 'Intenta iniciar sesión de nuevo.');
        }
    }

    function populateProfileData(data) {
        const notSetText = 'No establecido';
        nombreValue.textContent = data.nombre || notSetText;
        dniValue.textContent = data.dni || notSetText;
        emailValue.textContent = data.correo || notSetText;
        telefonoValue.textContent = data.telefono || notSetText;
        
        const estadoActual = data.isEnabled ? 'Activo' : 'Inactivo';
        estadoValue.textContent = estadoActual;
        estadoValue.classList.remove('status-active', 'status-suspended');
        estadoValue.classList.add(data.isEnabled ? 'status-active' : 'status-suspended');
    }

    const editDniInput = document.getElementById('edit-dni');
    const editTelInput = document.getElementById('edit-telefono');
    const editEmailInput = document.getElementById('edit-email');

    const setInlineError = (el, msg) => { const e = el.parentElement.querySelector('.error'); if (e) { e.textContent = msg; e.style.display = 'block'; } el.classList.add('invalid-input'); };
    const clearInlineError = (el) => { const e = el.parentElement.querySelector('.error'); if (e) { e.textContent = ''; e.style.display = 'none'; } el.classList.remove('invalid-input'); };

    // Input events: strip non-digits and enforce maxlength
    if (editDniInput) {
        editDniInput.setAttribute('maxlength', '8');
        editDniInput.setAttribute('inputmode', 'numeric');
        editDniInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 8);
            if (e.target.value.length !== 8) setInlineError(e.target, 'DNI debe tener 8 dígitos'); else clearInlineError(e.target);
        });
    }
    if (editTelInput) {
        editTelInput.setAttribute('maxlength', '9');
        editTelInput.setAttribute('inputmode', 'numeric');
        editTelInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 9);
            if (e.target.value.length !== 9) setInlineError(e.target, 'Teléfono debe tener 9 dígitos'); else clearInlineError(e.target);
        });
    }

    if (editEmailInput) {
        editEmailInput.addEventListener('input', (e) => { const val = e.target.value.trim(); const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); if (!ok) setInlineError(e.target,'Formato de email inválido'); else clearInlineError(e.target); });
    }

    const openModal = () => {
        const notSetText = 'No establecido';
        document.getElementById('edit-nombre').value = nombreValue.textContent.trim() !== notSetText ? nombreValue.textContent.trim() : '';
        document.getElementById('edit-dni').value = dniValue.textContent.trim() !== notSetText ? dniValue.textContent.trim() : '';
        document.getElementById('edit-email').value = emailValue.textContent.trim();
        document.getElementById('edit-telefono').value = telefonoValue.textContent.trim() !== notSetText ? telefonoValue.textContent.trim() : '';
        
        document.getElementById('edit-email').disabled = true;
        document.getElementById('edit-estado').disabled = true;
        document.getElementById('edit-estado').value = estadoValue.textContent.trim();
        
        modal.style.display = 'block';
    };

    const closeModal = () => {
        modal.style.display = 'none';
    };

    /**
     * Valida los campos del formulario antes de enviarlos.
     * @returns {boolean} - true si es válido, false si no.
     */
    function validateForm() {
        const dniEl = document.getElementById('edit-dni');
        const telefonoEl = document.getElementById('edit-telefono');
        const emailEl = document.getElementById('edit-email');

        const dni = dniEl ? dniEl.value.trim().replace(/\D/g,'') : '';
        const telefono = telefonoEl ? telefonoEl.value.trim().replace(/\D/g,'') : '';
        const email = emailEl ? emailEl.value.trim() : '';

        let ok = true;
        if (!/^\d{8}$/.test(dni)) { setInlineError(dniEl, 'DNI debe tener 8 dígitos'); ok = false; }
        else clearInlineError(dniEl);

        if (!/^\d{9}$/.test(telefono)) { setInlineError(telefonoEl, 'Teléfono debe tener 9 dígitos'); ok = false; }
        else clearInlineError(telefonoEl);

        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setInlineError(emailEl, 'Formato de email inválido'); ok = false; }
        else clearInlineError(emailEl);

            if (!ok) {
                // Notificar al usuario que revise el formulario
                // We don't await here to keep validateForm synchronous; caller will handle UI.
                swalError('Errores en el formulario', 'Corrige los errores antes de continuar.');
            }
        return ok;
    }

    async function handleEditFormSubmit(event) {
        event.preventDefault();

        // 1. Validar el formulario en el frontend primero
        if (!validateForm()) {
            // Mostrar notificación y detener envío
            await swalError('Formulario inválido', 'Corrige los errores antes de continuar.');
            return; // Detiene el envío si la validación falla
        }

        const updateRequest = {
            nombre: document.getElementById('edit-nombre').value,
            dni: document.getElementById('edit-dni').value,
            telefono: document.getElementById('edit-telefono').value,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/perfil`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateRequest)
            });

            if (!response.ok) {
                const errorData = await response.json();
                // El backend puede devolver errores de validación o de unicidad
                const errorMessage = errorData.message || (errorData.errors ? Object.values(errorData.errors).join('\n') : 'No se pudo actualizar el perfil.');
                throw new Error(errorMessage);
            }

            const updatedAdmin = await response.json();
            populateProfileData(updatedAdmin);
            closeModal();
            await swalSuccess('¡Perfil actualizado!', 'Perfil actualizado con éxito.');

        } catch (error) {
            console.error('Error al actualizar:', error);
            await swalError('Error al actualizar', error.message);
        }
    }

    // Gestión de sedes movida a una página dedicada (`sedes.html`) y gestionada por `js/sedes.js`.

    // --- INICIO DE LA EJECUCIÓN ---
    if (protectPage()) {
        fetchAdminProfile();

        openModalBtn.addEventListener('click', openModal);
        closeModalBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
        editForm.addEventListener('submit', handleEditFormSubmit);


    }
});
