// Este es el contenido para el JS del formulario de solicitud
document.addEventListener('DOMContentLoaded', function() {
    const clubSelect = document.getElementById('club');
    const form = document.getElementById('registro-form');
    const formMessage = document.getElementById('form-message');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';

    async function cargarClubes() {
        try {
            const response = await fetch(`${API_BASE_URL}/clubs`);
            if (!response.ok) throw new Error('No se pudieron cargar los clubes.');
            
            const clubes = await response.json();
            
            clubes.forEach(club => {
                const option = document.createElement('option');
                option.value = club.id; // <-- CAMBIO: Usamos el ID como valor
                option.textContent = club.nombre;
                clubSelect.appendChild(option);
            });

        } catch (error) {
            console.error('Error al cargar clubes:', error);
            clubSelect.innerHTML = '<option value="" disabled>Error al cargar clubes</option>';
        }
    }

    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const formData = {
            nombreCompleto: document.getElementById('nombre').value,
            correoElectronico: document.getElementById('correoElectronico').value,
            clubId: clubSelect.value, // <-- CAMBIO: Ahora enviamos el ID
            descripcionSolicitud: document.getElementById('descripcion').value
        };

        try {
            const response = await fetch(`${API_BASE_URL}/solicitudes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                window.location.href = 'respuesta.html';
            } else {
                const errorData = await response.text();
                formMessage.textContent = `Error: ${errorData || 'No se pudo enviar la solicitud.'}`;
                formMessage.className = 'form-message error';
            }
        } catch (error) {
            formMessage.textContent = 'Error de conexión. Inténtalo de nuevo más tarde.';
            formMessage.className = 'form-message error';
        }
    });

    cargarClubes();
});
