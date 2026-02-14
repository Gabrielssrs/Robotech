document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const categoryForm = document.getElementById('create-category-form');
    const feedbackDiv = document.getElementById('form-feedback');
    const API_URL = 'https://robotech-back.onrender.com/api/categorias';
        let categoriasCache = [];

    if (categoryForm) categoryForm.noValidate = true;

        const nombreInput = document.getElementById('nombre');
        const submitButton = categoryForm ? categoryForm.querySelector('button[type="submit"]') : null;

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

    /**
     * Función para proteger la página. Verifica el token y el rol del usuario.
     */
    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        
        const user = decodeJwt(token);
        const roles = user ? (user.roles || user.authorities) : [];
        const isAdmin = Array.isArray(roles) && roles.some(r => (typeof r === 'string' ? r : r.authority) === 'ROLE_ADM_SISTEMA');

        if (!isAdmin) {
            const msg = 'No tienes permiso para realizar esta acción.';
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Acceso denegado', text: msg, allowOutsideClick: false, allowEscapeKey: false }).then(() => {
                    localStorage.removeItem('jwtToken');
                    window.location.href = 'login.html';
                });
            } else {
                alert(msg);
                localStorage.removeItem('jwtToken');
                window.location.href = 'login.html';
            }
            return false;
        }
        return true;
    }

    /**
     * Muestra un mensaje de feedback en el formulario.
     * @param {string} message - El mensaje a mostrar.
     * @param {boolean} isError - true si es un mensaje de error, false si es de éxito.
     */
    let feedbackTimerId = null;
    function closeFeedback() {
        if (!feedbackDiv) return;
        feedbackDiv.style.display = 'none';
        feedbackDiv.innerHTML = '';
        feedbackDiv.className = '';
        if (feedbackTimerId) { clearTimeout(feedbackTimerId); feedbackTimerId = null; }
    }

    function showFeedback(message, isError = false, autoClose = true, duration = 4000) {
        if (!feedbackDiv) return;
        // Build inner HTML with an icon, message text and close button
        const iconHTML = isError ? '<span class="feedback-icon">❌</span>' : '<span class="feedback-icon">✔️</span>';
        feedbackDiv.innerHTML = `
            ${iconHTML}
            <div class="feedback-body">
                <div class="feedback-text">${message}</div>
            </div>
            <button class="feedback-close" aria-label="Cerrar mensaje">&times;</button>
        `;
        feedbackDiv.className = isError ? 'form-feedback-message error' : 'form-feedback-message success';
        feedbackDiv.style.display = 'flex';
        // Attach close handler
        const closeBtn = feedbackDiv.querySelector('.feedback-close');
        if (closeBtn) closeBtn.addEventListener('click', closeFeedback);
        // Auto hide
        if (autoClose) {
            if (feedbackTimerId) clearTimeout(feedbackTimerId);
            feedbackTimerId = setTimeout(() => closeFeedback(), duration);
        }
    }

    // ----------------------
    // Helpers and validations - module scope
    // ----------------------
    function debounce(fn, wait = 300) {
        let t;
        return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
    }

    async function fetchCategoriasCache() {
        if (categoriasCache.length) return categoriasCache;
        try {
            const resp = await fetch(API_URL, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!resp.ok) throw new Error('Error fetching categorias');
            categoriasCache = await resp.json();
            return categoriasCache;
        } catch (err) { categoriasCache = []; console.error(err); return categoriasCache; }
    }

    function setFieldError(fieldEl, message) {
        if (!fieldEl) return;
        let parent = fieldEl.parentElement;
        let err = parent.querySelector('.error');
        if (!err) { err = document.createElement('span'); err.className = 'error'; parent.appendChild(err); }
        err.textContent = message; fieldEl.classList.add('invalid-input');
    }

    function clearFieldError(fieldEl) {
        if (!fieldEl) return;
        let parent = fieldEl.parentElement;
        let err = parent.querySelector('.error'); if (err) { err.textContent = ''; }
        fieldEl.classList.remove('invalid-input');
    }

    async function checkNombreExists(value) {
        const list = await fetchCategoriasCache();
        const val = String(value || '').trim().toLowerCase();
        if (!val) return false; return list.some(c => String(c.nombre || '').trim().toLowerCase() === val);
    }

    const onNombreInput = debounce(async function() {
        if (!nombreInput) return;
        const val = nombreInput.value.trim(); clearFieldError(nombreInput);
        if (!val) return; const exists = await checkNombreExists(val);
        if (exists) { setFieldError(nombreInput, 'Ya existe una categoría con este nombre.'); if (submitButton) submitButton.disabled = true; }
        else { clearFieldError(nombreInput); if (submitButton) submitButton.disabled = false; }
    }, 300);

    if (nombreInput) nombreInput.addEventListener('input', onNombreInput);

    /**
     * Maneja el envío del formulario para crear una nueva categoría.
     */
    async function handleCreateCategory(event) {
        event.preventDefault();
        // const submitButton = categoryForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Guardando...';
        feedbackDiv.style.display = 'none';

        // Recolectar datos del formulario
        const formData = new FormData(categoryForm);
        const categoriaData = {};

        formData.forEach((value, key) => {
            // Si el campo es numérico y está vacío, envíalo como null.
            if (['pesoMaximoKg', 'anchoMaximoCm', 'altoMaximoCm', 'largoMaximoCm', 'velocidadMaximaPermitidaKmh'].includes(key)) {
                categoriaData[key] = value ? Number(value) : null;
            } else {
                categoriaData[key] = value.trim();
            }
        });

        // Validaciones básicas en el frontend
        let isValid = true;
        let errorFields = [];
        clearFieldError(nombreInput);
        const tipoCompeticionInput = document.getElementById('tipoCompeticion');
        if (tipoCompeticionInput) clearFieldError(tipoCompeticionInput);

        if (!categoriaData.nombre) {
            setFieldError(nombreInput, 'El nombre de la categoría es obligatorio.');
            isValid = false;
            errorFields.push('Nombre');
        }
        if (!categoriaData.tipoCompeticion) {
            if (tipoCompeticionInput) setFieldError(tipoCompeticionInput, 'El tipo de competición es obligatorio.');
            isValid = false;
            errorFields.push('Tipo de competición');
        }

        // Validar valores negativos en campos numéricos
        const numericFields = [
            { name: 'pesoMaximoKg', label: 'El peso' },
            { name: 'anchoMaximoCm', label: 'El ancho' },
            { name: 'altoMaximoCm', label: 'El alto' },
            { name: 'largoMaximoCm', label: 'El largo' },
            { name: 'velocidadMaximaPermitidaKmh', label: 'La velocidad' }
        ];

        numericFields.forEach(field => {
            const input = categoryForm.querySelector(`[name="${field.name}"]`);
            if (input) {
                clearFieldError(input);
                if (categoriaData[field.name] !== null && categoriaData[field.name] < 0) {
                    setFieldError(input, `${field.label} no puede ser negativo.`);
                    isValid = false;
                    const fieldName = field.label.replace(/^(El|La)\s+/i, '');
                    errorFields.push(fieldName.charAt(0).toUpperCase() + fieldName.slice(1));
                }
            }
        });

        if (!isValid) {
            let message = 'Por favor corrija los errores en el formulario.';
            if (errorFields.length > 0) {
                message += ` Revise: ${errorFields.join(', ')}.`;
            }
            showFeedback(message, true);
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Categoría';
            return;
        }

            // Re-check uniqueness before sending
            const nameExists = await checkNombreExists(categoriaData.nombre);
            if (nameExists) {
                setFieldError(nombreInput, 'Ya existe una categoría con este nombre.');
                showFeedback('No se puede crear la categoría: el nombre ya existe.', true);
                submitButton.disabled = false;
                submitButton.textContent = 'Guardar Categoría';
                return;
            }

        // The actual helper functions are defined in module scope.

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(categoriaData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo crear la categoría.');
            }

            showFeedback('¡Categoría creada con éxito! Redirigiendo...', false);
            setTimeout(() => {
                window.location.href = 'administrarCategorias.html';
            }, 2000);

        } catch (error) {
            showFeedback(error.message, true);
            submitButton.disabled = false;
            submitButton.textContent = 'Guardar Categoría';
        }
    }

    // --- INICIO DE LA EJECUCIÓN ---
    if (protectPage()) {
        categoryForm.addEventListener('submit', handleCreateCategory);

        // Listener para el botón de cerrar sesión
        document.querySelector('.btn-logout').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }
});
