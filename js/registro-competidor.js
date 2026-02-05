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

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registrando...';
        messageDiv.style.display = 'none';

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
