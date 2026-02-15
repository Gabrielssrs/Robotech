document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registro-form');
    const messageDiv = document.getElementById('form-message');
    // Tu URL es correcta según el controlador
    const apiUrl = 'https://robotech-back.onrender.com/api/competidores/registro-con-codigo';

    // --- SweetAlert helpers ---
    const showSwalError = (msg) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } else {
            messageDiv.textContent = `Error: ${msg}`;
            messageDiv.className = 'form-message error';
            messageDiv.style.display = 'block';
        }
    };

    const showSwalSuccess = (msg, redirectUrl=null, timeout=2000) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ 
                icon: 'success', 
                title: '¡Éxito!', 
                text: msg, 
                timer: timeout, 
                timerProgressBar: true, 
                allowOutsideClick: false 
            }).then(() => {
                if (redirectUrl) window.location.href = redirectUrl;
            });
        } else {
            messageDiv.textContent = msg;
            messageDiv.className = 'form-message success';
            messageDiv.style.display = 'block';
            if (redirectUrl) setTimeout(() => window.location.href = redirectUrl, timeout);
        }
    };

    function validateForm() {
        // ... (Tu lógica de validación actual está perfecta) ...
        // Solo asegúrate de que los IDs en el HTML (ej: 'correoElectronico') existan.
        
        const contrasena = document.getElementById('contrasena').value;
        
        // Tu validación de contraseña es estricta (Mayúscula, minúscula, número, símbolo).
        // Esto es bueno, aunque el backend solo valida longitud mínima de 8.
        // Mantén esta validación en el frontend para mayor seguridad.
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

        if (!validateForm()) {
            submitButton.disabled = false;
            submitButton.textContent = 'Registrarme';
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Aseguramos que el código vaya sin espacios accidentales
        if(data.codigo) data.codigo = data.codigo.trim();

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
                success = true;
                // CAMBIO AQUÍ: Redirigir a login.html en lugar de perfil
                showSwalSuccess('¡Registro exitoso! Por favor inicia sesión.', 'login.html', 2500);
            } else {
                let errorMessage;
                const responseText = await response.text();
                try {
                    const errorJson = JSON.parse(responseText);
                    errorMessage = errorJson.message || errorJson.error || responseText;
                } catch (e) {
                    errorMessage = responseText;
                }
                throw new Error(errorMessage || 'Ocurrió un error desconocido.');
            }
        } catch (error) {
            console.error('Error en el registro:', error.message);
            showSwalError(error.message);
        } finally {
            if (!success) {
                submitButton.disabled = false;
                submitButton.textContent = 'Registrarme';
            }
        }
    });
});
