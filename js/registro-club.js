// js/registro-club.js

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registro-club-form');
    const formMessage = document.getElementById('form-message');
    const API_REGISTER_URL = 'https://robotech-back.onrender.com/api/clubs/registro';
    
    // --- SweetAlert2 helpers ---
    const showSwalError = (msg) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } else {
            formMessage.textContent = msg;
            formMessage.className = 'form-message error';
            formMessage.style.display = 'block';
        }
    };
    const showSwalSuccess = (msg, redirectUrl = null, timeout = 2000) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: '¡Éxito!', text: msg, timer: timeout, timerProgressBar: true, allowOutsideClick: false }).then(() => {
                if (redirectUrl) window.location.href = redirectUrl;
            });
        } else {
            formMessage.textContent = msg;
            formMessage.className = 'form-message success';
            formMessage.style.display = 'block';
            if (redirectUrl) setTimeout(() => window.location.href = redirectUrl, timeout);
        }
    };
    

    // 1. Obtener el token de autenticación
    const token = localStorage.getItem('jwtToken');

    // 2. Si no hay token, no se puede continuar. Es una acción protegida.
    if (!token) {
        console.error('Acción no autorizada. Se requiere token de administrador.');
        // Mostrar alerta amigable
        showSwalError('No estás autenticado para realizar esta acción. Por favor inicia sesión.');
        // Opcional: redirigir al login
        setTimeout(() => { window.location.href = 'login.html'; }, 2200);
        return;
    }

    /**
     * Muestra un mensaje de error de validación al usuario.
     * @param {string} message - El mensaje de error a mostrar.
     */
    function showValidationError(message) {
        // Mostrar mediante SweetAlert y como fallback mostrar en el DOM
        showSwalError(message);
    }

    /**
     * Valida los datos del formulario antes de enviarlos.
     * @returns {boolean} - true si los datos son válidos, false en caso contrario.
     */
    function validateForm() {
        const nombre = document.getElementById('nombre').value;
        const correo = document.getElementById('correo').value;
        const telefono = document.getElementById('telefono').value;
        const contrasenaInput = document.getElementById('contrasena');

        // 1. Nombre del club no debe contener números
        /* if (/\d/.test(nombre)) {
            showValidationError('El nombre del club no puede contener números.');
            return false;
        } */

        // 2. Correo debe tener un @ y un formato válido
        if (!correo.includes('@')) {
            showValidationError('El formato del correo electrónico no es válido.');
            return false;
        }

        // 3. Teléfono debe empezar con 9 y tener 9 dígitos
        if (!/^9\d{8}$/.test(telefono)) {
            showValidationError('El teléfono debe comenzar con 9 y tener 9 dígitos.');
            return false;
        }

        // 4. Contraseña debe tener mayúsculas, minúsculas, números y un caracter especial
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(contrasenaInput.value)) {
            showValidationError('La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un símbolo (@$!%*?&).');
            contrasenaInput.value = ''; // Limpiar el campo de contraseña
            return false;
        }

        return true; // Todas las validaciones pasaron
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registrando...';
        formMessage.style.display = 'none';

        
        if (submitButton.parentNode) {
            submitButton.parentNode.insertBefore(formMessage, submitButton);
        }

        // --- INICIO DE VALIDACIÓN ---
        if (!validateForm()) {
            submitButton.disabled = false;
            submitButton.textContent = 'Registrar Club';
            return; // Detiene el envío si la validación falla
        }
        // --- FIN DE VALIDACIÓN ---
        let success = false;
        try {
            // Recolectar todos los datos del formulario
            const clubData = {
                nombre: document.getElementById('nombre').value,
                slogan: document.getElementById('slogan').value,
                correo: document.getElementById('correo').value,
                telefono: document.getElementById('telefono').value,
                direccion: document.getElementById('direccion').value,
                region: document.getElementById('region').value,
                representante: document.getElementById('representante').value,
                descripcion: document.getElementById('descripcion').value,
                contrasena: document.getElementById('contrasena').value,
                // logoUrl ya no se maneja
            };

            // 3. Enviar los datos del club para el registro
            const registerResponse = await fetch(API_REGISTER_URL, {
                method: 'POST',
                
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // 3. Añadir el token a la cabecera
                },
              
                body: JSON.stringify(clubData)
            });

            if (registerResponse.ok) {
                success = true;
                form.reset();
                showSwalSuccess('¡Club registrado con éxito! Redirigiendo a la lista de clubes...', 'adminclubes.html', 2200);

            } else {
                const errorData = await registerResponse.text();
                throw new Error(errorData || 'No se pudo completar el registro.');
            }

        } catch (error) {
            showSwalError('Advertencia: ' + (error.message || 'Error al registrar el club'));
        } finally {
            // Solo habilitamos el botón de nuevo si hubo un error.
            if (!success) {
                submitButton.disabled = false;
                submitButton.textContent = 'Registrar Club';
            }
        }
    });
});
