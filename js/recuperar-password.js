document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('forgot-password-form');
    const messageDiv = document.getElementById('form-message');
    const submitBtn = document.getElementById('btn-submit');
    
    // URL base de tu API (ajusta si es necesario, ej: http://localhost:8080)
    const API_BASE_URL = 'https://robotech-back.onrender.com'; 

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const dni = document.getElementById('dni').value.trim();

        // Validaciones básicas
        if (!email || !dni) {
            showMessage('Por favor, completa todos los campos.', 'error');
            return;
        }

        if (dni.length !== 8 || isNaN(dni)) {
            showMessage('El DNI debe tener 8 dígitos numéricos.', 'error');
            return;
        }

        // Preparar UI
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';
        messageDiv.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, dni })
            });

            const data = await response.json();

            if (response.ok) {
                showMessage(data.message || 'Si los datos son correctos, recibirás un correo en breve.', 'success');
                form.reset();
            } else {
                showMessage(data.message || 'Error al procesar la solicitud.', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión con el servidor.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Instrucciones';
        }
    });

    function showMessage(msg, type) {
        messageDiv.textContent = msg;
        messageDiv.className = type === 'success' ? 'success-msg' : 'error-msg';
        messageDiv.style.display = 'block';
    }
});
