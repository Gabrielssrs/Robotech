// js/registro-competidor.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registro-form');
    const messageDiv = document.getElementById('form-message');
    const apiUrl = 'http://localhost:8080/api/competidores/registro-con-codigo';

    // --- SweetAlert helpers ---
    const showSwalError = (msg) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } else {
            // fallback
            messageDiv.textContent = `Error: ${msg}`;
            messageDiv.className = 'form-message error';
            messageDiv.style.display = 'block';
        }
    };
    const showSwalSuccess = (msg, redirectUrl=null, timeout=2000) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: '¡Éxito!', text: msg, timer: timeout, timerProgressBar: true, allowOutsideClick: false }).then(() => {
                if (redirectUrl) window.location.href = redirectUrl;
            });
        } else {
            messageDiv.textContent = msg;
            messageDiv.className = 'form-message success';
            messageDiv.style.display = 'block';
            if (redirectUrl) setTimeout(() => window.location.href = redirectUrl, timeout);
        }
    };

    /**
     * Valida los datos del formulario antes de enviarlos.
     * @returns {boolean} - true si los datos son válidos, false en caso contrario.
     */
    function validateForm() {
        const nombre = document.getElementById('nombre').value.trim();
        const apellido = document.getElementById('apellido').value.trim();
        const dni = document.getElementById('dni').value.trim();
        const telefono = document.getElementById('telefono').value.trim();
        const correoElectronico = document.getElementById('correoElectronico').value.trim();
        const direccion = document.getElementById('direccion').value.trim();
        const codigo = document.getElementById('codigo').value.trim();
        const contrasena = document.getElementById('contrasena').value;

        // Validar que no esté vacío
        if (!nombre) {
            showSwalError('El nombre es requerido.');
            return false;
        }

        if (!apellido) {
            showSwalError('El apellido es requerido.');
            return false;
        }

        if (!dni) {
            showSwalError('El DNI es requerido.');
            return false;
        }

        // DNI debe tener 8 dígitos
        if (!/^\d{8}$/.test(dni)) {
            showSwalError('El DNI debe tener 8 dígitos.');
            return false;
        }

        if (!telefono) {
            showSwalError('El teléfono es requerido.');
            return false;
        }

        // Teléfono debe empezar con 9 y tener 9 dígitos
        if (!/^9\d{8}$/.test(telefono)) {
            showSwalError('El teléfono debe comenzar con 9 y tener 9 dígitos.');
            return false;
        }

        if (!correoElectronico) {
            showSwalError('El correo electrónico es requerido.');
            return false;
        }

        // Validar formato de correo
        if (!correoElectronico.includes('@')) {
            showSwalError('El formato del correo electrónico no es válido.');
            return false;
        }

        if (!direccion) {
            showSwalError('La dirección es requerida.');
            return false;
        }

        if (!codigo) {
            showSwalError('El código de registro es requerido.');
            return false;
        }

        if (!contrasena) {
            showSwalError('La contraseña es requerida.');
            return false;
        }

        // Contraseña debe tener mayúsculas, minúsculas, números y un caracter especial
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(contrasena)) {
            showSwalError('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un símbolo (@$!%*?&).');
            return false;
        }

        return true;
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registrando...';
        messageDiv.style.display = 'none';

        // --- INICIO DE VALIDACIÓN ---
        if (!validateForm()) {
            submitButton.disabled = false;
            submitButton.textContent = 'Registrarme';
            return; // Detiene el envío si la validación falla
        }
        // --- FIN DE VALIDACIÓN ---

        // Recolectar datos del formulario
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        let success = false;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const competidorRegistrado = await response.json();
                console.log('Registro exitoso:', competidorRegistrado);
                success = true;
                showSwalSuccess('¡Registro exitoso! Serás redirigido al perfil.', 'perfil_competidor.html', 2200);
            } else {
                // Intentar leer como JSON primero, si falla, leer como texto
                let errorMessage;
                const responseText = await response.text();
                
                try {
                    const errorJson = JSON.parse(responseText);
                    // Si es un objeto de error de Spring Boot o uno personalizado
                    errorMessage = errorJson.message || errorJson.error || responseText;
                } catch (e) {
                    // Si no es JSON, usar el texto tal cual (esto es lo que tu backend envía actualmente para las excepciones controladas)
                    errorMessage = responseText;
                }

                throw new Error(errorMessage || 'Ocurrió un error desconocido.');
            }
        } catch (error) {
            console.error('Error en el registro:', error.message);
            showSwalError(error.message);
        } finally {
            // Reactivar el botón solo si no hubo éxito
            if (!success) {
                submitButton.disabled = false;
                submitButton.textContent = 'Registrarme';
            }
        }
    });
});
