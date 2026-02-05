document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('jwtToken');
    const tbody = document.querySelector('.competitors-table tbody');

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    async function cargarSolicitudes() {
        try {
            const response = await fetch('http://localhost:8080/api/solicitudes/mi-club', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('jwtToken');
                window.location.href = 'login.html';
                return;
            }

            if (!response.ok) {
                throw new Error('Error al cargar las solicitudes.');
            }

            const solicitudes = await response.json();
            llenarTabla(solicitudes);

        } catch (error) {
            console.error('Error:', error);
            tbody.innerHTML = `<tr><td colspan="6" class="text-center error-message">${error.message}</td></tr>`;
        }
    }

    function llenarTabla(solicitudes) {
        tbody.innerHTML = '';

        const solicitudesPendientes = solicitudes.filter(s => s.estado === 'PENDIENTE');

        if (solicitudesPendientes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay solicitudes pendientes.</td></tr>`;
            return;
        }

        solicitudesPendientes.forEach(solicitud => {
            const fecha = new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            });

            const fila = `
                <tr class="pending-row" data-id="${solicitud.id}">
                    <td>${solicitud.nombreCompleto}</td>
                    <td>${solicitud.correoElectronico}</td>
                    <td>Código de Invitación</td>
                    <td>${fecha}</td>
                    <td>${solicitud.descripcionSolicitud}</td>
                    <td>${solicitud.estado}</td>
                    <td class="table-actions">
                        <button class="btn-action btn-accept">Aceptar</button>
                        <button class="btn-action btn-reject">Rechazar</button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += fila;
        });

        // Asignar eventos después de crear todas las filas
        asignarEventosBotones();
    }

    function asignarEventosBotones() {
        tbody.querySelectorAll('.btn-accept').forEach(button => {
            button.addEventListener('click', manejarAccion);
        });
        tbody.querySelectorAll('.btn-reject').forEach(button => {
            button.addEventListener('click', manejarAccion);
        });
    }

    async function manejarAccion(event) {
        const button = event.target;
        const fila = button.closest('tr');
        const solicitudId = fila.dataset.id;
        const esAceptar = button.classList.contains('btn-accept');
        const accionUrl = esAceptar ? 'aceptar' : 'rechazar';

        // Deshabilitar botones para evitar doble clic
        fila.querySelectorAll('.btn-action').forEach(btn => btn.disabled = true);
        
        if (!confirm(`¿Estás seguro de que quieres ${esAceptar ? 'aceptar' : 'rechazar'} esta solicitud?`)) {
            fila.querySelectorAll('.btn-action').forEach(btn => btn.disabled = false);
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/api/solicitudes/${solicitudId}/${accionUrl}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorMsg = await response.text();
                throw new Error(errorMsg || `Error al ${accionUrl} la solicitud.`);
            }

            // Si la acción fue exitosa, eliminar la fila de la tabla.
            fila.remove();
            alert(`Solicitud ${esAceptar ? 'aceptada' : 'rechazada'} con éxito.`);

        } catch (error) {
            console.error('Error en la acción:', error);
            alert(`Error: ${error.message}`);
            // Habilitar botones de nuevo si hay error
            fila.querySelectorAll('.btn-action').forEach(btn => btn.disabled = false);
        }
    }

    cargarSolicitudes();
});
