document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registro-form');
    const messageDiv = document.getElementById('form-message');
    const apiUrl = 'http://localhost:8080/api/competidores/registro'; 
    const categoriasUrl = 'http://localhost:8080/api/categorias';
    const token = localStorage.getItem('jwtToken');

    // --- Helper para mostrar errores en campos específicos ---
    function setFieldError(fieldId, message) {
        const inputEl = document.getElementById(fieldId);
        if (!inputEl) return;
        const parent = inputEl.parentElement;
        let err = parent.querySelector('.error');
        if (!err) {
            err = document.createElement('span');
            err.className = 'error';
            parent.appendChild(err);
        }
        err.textContent = message;
        err.style.display = 'block';
        inputEl.classList.add('invalid-input');
        // If submit button was disabled because of a submission, re-enable it so the user can correct and resubmit
        try {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Registrar';
            }
        } catch (e) {
            // ignore
        }
    }

    function clearFieldError(fieldId) {
        const inputEl = document.getElementById(fieldId);
        if (!inputEl) return;
        const parent = inputEl.parentElement;
        const err = parent.querySelector('.error');
        if (err) {
            err.textContent = '';
            err.style.display = 'none';
        }
        inputEl.classList.remove('invalid-input');
    }
    
    function clearAllErrors() {
        ['alias', 'dni', 'telefono', 'correoElectronico'].forEach(clearFieldError);
    }

    // Helper para mostrar alertas con SweetAlert2 (si está disponible)
    function showAlert(icon, title, text, options = {}) {
        if (window.Swal) {
            Swal.fire(Object.assign({ icon, title, text }, options));
        } else {
            // Fallback simple
            alert(title + (text ? '\n' + text : ''));
        }
    }

    /**
     * Función para proteger la página.
     */
    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        // Aquí podrías añadir una decodificación de token para verificar el rol.
        return true;
    }

    /**
     * Carga las categorías disponibles y llena el select.
     */
    async function loadCategorias() {
        const categoriaSelect = document.getElementById('categoria');
        if (!categoriaSelect) return;

        try {
            const response = await fetch(categoriasUrl); // Asumiendo que es público, si no, agregar headers
            if (!response.ok) throw new Error('Error al cargar categorías');
            
            const categorias = await response.json();
            
            categoriaSelect.innerHTML = '<option value="">Seleccione una categoría...</option>';
            
            categorias.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.nombre; // Enviamos el nombre porque el backend espera un String
                option.textContent = cat.nombre;
                categoriaSelect.appendChild(option);
            });
        } catch (error) {
            console.error(error);
            categoriaSelect.innerHTML = '<option value="">Error al cargar categorías</option>';
        }
    }

    /**
     * Maneja el envío del formulario para registrar un competidor.
     */
    async function handleRegisterByAdmin(event) {
        event.preventDefault();
        clearAllErrors(); // Limpiar errores previos

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registrando...';
        messageDiv.style.display = 'none';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // --- VALIDACIONES DEL FRONTEND ---
        if (!/^\d{8}$/.test(data.dni)) {
            setFieldError('dni', 'El DNI debe tener 8 dígitos numéricos.');
            showAlert('error', 'DNI inválido', 'El DNI debe tener 8 dígitos numéricos.');
            const dniEl = document.getElementById('dni');
            if (dniEl) dniEl.focus();
            submitButton.disabled = false;
            submitButton.textContent = 'Registrar';
            return;
        }
        if (data.telefono && !/^9\d{8}$/.test(data.telefono)) {
            setFieldError('telefono', 'El teléfono debe empezar con 9 y tener 9 dígitos.');
            showAlert('error', 'Teléfono inválido', 'El teléfono debe empezar con 9 y tener 9 dígitos.');
            const telEl = document.getElementById('telefono');
            if (telEl) telEl.focus();
            submitButton.disabled = false;
            submitButton.textContent = 'Registrar';
            return;
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(data.contrasena)) {
            setFieldError('contrasena', 'La contraseña no es segura. Debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.');
            showAlert('error', 'Contraseña insegura', 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.');
            const passEl = document.getElementById('contrasena');
            if (passEl) passEl.focus();
            submitButton.disabled = false;
            submitButton.textContent = 'Registrar';
            return;
        }

        let registeredSuccessfully = false;

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Ocurrió un error desconocido.');
            }

            registeredSuccessfully = true;
            showAlert('success', '¡Competidor registrado!', 'Redirigiendo al perfil...', { timer: 1500, showConfirmButton: false });
            setTimeout(() => {
                window.location.href = 'perfil_club.html';
            }, 1500);

        } catch (error) {
            console.error('Error en el registro:', error.message);
            const errorMessage = error.message || 'Ocurrió un error desconocido.';

            if (errorMessage.toLowerCase().includes('alias')) {
                setFieldError('alias', errorMessage);
                showAlert('error', 'Error en alias', errorMessage);
                const el = document.getElementById('alias'); if (el) el.focus();
            } else if (errorMessage.toLowerCase().includes('dni')) {
                setFieldError('dni', errorMessage);
                showAlert('error', 'Error en DNI', errorMessage);
                const el = document.getElementById('dni'); if (el) el.focus();
            } else if (errorMessage.toLowerCase().includes('correo')) {
                setFieldError('correoElectronico', errorMessage);
                showAlert('error', 'Error en correo', errorMessage);
                const el = document.getElementById('correoElectronico'); if (el) el.focus();
            } else if (errorMessage.toLowerCase().includes('tel')) {
                setFieldError('telefono', errorMessage);
                showAlert('error', 'Error en teléfono', errorMessage);
                const el = document.getElementById('telefono'); if (el) el.focus();
            } else {
                showAlert('error', 'Error', errorMessage);
            }
        } finally {
            if (!registeredSuccessfully) {
                submitButton.disabled = false;
                submitButton.textContent = 'Registrar';
            }
        }
    }

    // --- INICIO DE LA EJECUCIÓN ---
    if (protectPage()) {
        loadCategorias();
        form.addEventListener('submit', handleRegisterByAdmin);
        // Clear the password error as the user types, so the inline message disappears when corrected
        const passwordInput = document.getElementById('contrasena');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => {
                clearFieldError('contrasena');
            });
            // Optional: clear error on focus as well
            passwordInput.addEventListener('focus', () => clearFieldError('contrasena'));
        }
    }
});
