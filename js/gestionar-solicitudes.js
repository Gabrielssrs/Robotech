document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('jwtToken');
    const tbody = document.querySelector('.competitors-table tbody');
    
    // URL Base ajustada según tu SecurityConfig (/api/club/solicitudes)
    const BASE_API_URL = 'https://robotech-back.onrender.com/api/club/solicitudes';

    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    async function cargarSolicitudes() {
        try {
            // CORRECCIÓN 1: Ajuste de URL para coincidir con SecurityConfig
            const response = await fetch(`${BASE_API_URL}/mi-club`, {
                method: 'GET',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
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
            tbody.innerHTML = `<tr><td colspan="7" class="text-center error-message" style="color:red;">${error.message}</td></tr>`;
        }
    }

    function llenarTabla(solicitudes) {
        // Limpiar tabla
        tbody.innerHTML = '';

        const solicitudesPendientes = solicitudes.filter(s => s.estado === 'PENDIENTE');

        if (solicitudesPendientes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay solicitudes pendientes.</td></tr>`;
            return;
        }

        // OPTIMIZACIÓN: Usar map y join en lugar de innerHTML += en un bucle (mejora rendimiento)
        const filasHTML = solicitudesPendientes.map(solicitud => {
            const fecha = new Date(solicitud.fechaSolicitud).toLocaleDateString('es-ES', {
                year: 'numeric', month: '2-digit', day: '2-digit'
            });

            // Aseguramos que no haya XSS escapando datos básicos si fuera necesario, 
            // aunque aquí confiamos en que el backend envía texto plano.
            return `
                <tr class="pending-row" data-id="${solicitud.id}">
                    <td>${solicitud.nombreCompleto || 'N/A'}</td>
                    <td>${solicitud.correoElectronico || 'N/A'}</td>
                    <td>${solicitud.codigoInvitacion || 'Código de Invitación'}</td> <!-- Ajustado si el backend devuelve el código -->
                    <td>${fecha}</td>
                    <td>${solicitud.descripcionSolicitud || ''}</td>
                    <td><span class="badge-pendiente">${solicitud.estado}</span></td>
                    <td class="table-actions">
                        <button class="btn-action btn-accept">Aceptar</button>
                        <button class="btn-action btn-reject">Rechazar</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = filasHTML;

        // Asignar eventos una vez que el HTML existe
        asignarEventosBotones();
    }

    function asignarEventosBotones() {
        // Usamos delegación de eventos o asignación directa (aquí directa por simplicidad tras renderizar)
        tbody.querySelectorAll('.btn-accept').forEach(button => {
            button.addEventListener('click', (e) => manejarAccion(e, 'aceptar'));
        });
        tbody.querySelectorAll('.btn-reject').forEach(button => {
            button.addEventListener('click', (e) => manejarAccion(e, 'rechazar'));
        });
    }

    async function manejarAccion(event, accion) {
        const button = event.target;
        const fila = button.closest('tr');
        const solicitudId = fila.dataset.id;

        // Deshabilitar botones para evitar doble clic
        const botonesFila = fila.querySelectorAll('.btn-action');
        botonesFila.forEach(btn => btn.disabled = true);
        
        const confirmacion = confirm(`¿Estás seguro de que quieres ${accion} esta solicitud?`);

        if (!confirmacion) {
            botonesFila.forEach(btn => btn.disabled = false);
            return;
        }

        try {
            // CORRECCIÓN 2: La URL de acción también debe incluir /api/club/solicitudes
            const response = await fetch(`${BASE_API_URL}/${solicitudId}/${accion}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                }
            });

            if (!response.ok) {
                const errorMsg = await response.text();
                throw new Error(errorMsg || `Error al ${accion} la solicitud.`);
            }

            // Animación simple de eliminación
            fila.style.transition = 'all 0.5s';
            fila.style.opacity = '0';
            setTimeout(() => {
                fila.remove();
                // Verificar si la tabla quedó vacía
                if (tbody.children.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay más solicitudes pendientes.</td></tr>`;
                }
            }, 500);

            alert(`Solicitud ${accion === 'aceptar' ? 'aceptada' : 'rechazada'} con éxito.`);

        } catch (error) {
            console.error('Error en la acción:', error);
            alert(`Error: ${error.message}`);
            // Habilitar botones de nuevo si hay error
            botonesFila.forEach(btn => btn.disabled = false);
        }
    }

    cargarSolicitudes();
});
