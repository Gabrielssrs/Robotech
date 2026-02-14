document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-password-form');
    const messageDiv = document.getElementById('form-message');
    const submitBtn = document.getElementById('btn-submit');

    // URL base de tu API
    const API_BASE_URL = 'https://robotech-back.onrender.com';

    // 1. Obtener el token de la URL (ej. ?token=xyz...)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // VALIDACIÓN: Si no hay token, ocultamos el formulario y mostramos error
    if (!token) {
        showMessage('⚠️ Enlace incompleto o inválido. Debes acceder desde el enlace enviado a tu correo.', 'error');
        form.style.display = 'none';
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // 2. Validaciones locales
        if (newPassword !== confirmPassword) {
            showMessage('Las contraseñas no coinciden.', 'error');
            return;
        }

        if (newPassword.length < 6) {
            showMessage('La contraseña debe tener al menos 6 caracteres.', 'error');
            return;
        }

        // 3. Preparar envío
        submitBtn.disabled = true;
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Guardando...';
        messageDiv.style.display = 'none';

        try {
            // 4. Enviar al backend
            const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, newPassword: newPassword })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message || '¡Contraseña actualizada con éxito! Redirigiendo...', 'success');
                form.reset();
                // Redirigir al login después de 3 segundos
                setTimeout(() => { window.location.href = 'login.html'; }, 3000);
            } else {
                showMessage(data.message || 'Error al actualizar la contraseña. El enlace puede haber expirado.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        } catch (error) {
            console.error(error);
            showMessage('Error de conexión. Intenta nuevamente.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    });

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = type === 'success' ? 'success-msg' : 'error-msg';
        messageDiv.style.display = 'block';
    }
});
