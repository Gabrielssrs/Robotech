document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:8080/api';
    const token = localStorage.getItem('jwtToken');
    const requestsBody = document.getElementById('requests-body');

    async function parseResponseBody(resp) {
        try {
            const text = await resp.text();
            if (!text) return null;
            try { return JSON.parse(text); } catch (e) { return text; }
        } catch (e) { return null; }
    }

    function showAlert(icon, title, text) {
        if (window.Swal) {
            Swal.fire({ icon, title, text });
        } else {
            alert(`${title}: ${text}`);
        }
    }

    async function fetchRequests() {
        if (!token) {
            window.location.href = 'login.html';
            return;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/solicitudes-retiro`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Error al obtener las solicitudes de retiro.');
            const data = await res.json();
            renderRequests(data || []);
        } catch (err) {
            console.error(err);
            requestsBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:red;">${err.message}</td></tr>`;
        }
    }

    function renderRequests(list) {
        if (!list || list.length === 0) {
            requestsBody.innerHTML = `<tr<td colspan="6" style="text-align:center;">No hay solicitudes pendientes.</td></tr>`;
            return;
        }
        requestsBody.innerHTML = '';
        list.forEach(req => {
            const tr = document.createElement('tr');
            const estadoClass = `status-${req.estado.toLowerCase().replace('_', '-')}`;

            let actionButtons = '';
            if (req.estado === 'PENDIENTE') {
                actionButtons = `
                    <button class="btn-main small-btn btn-accept" data-id="${req.id}">Aceptar</button>
                    <button class="btn-main small-btn btn-reject" data-id="${req.id}" style="background-color: #ff6b6b;">Rechazar</button>
                `;
            } else {
                actionButtons = `Gestionada por: ${req.administradorGestor?.nombre || 'N/A'}`;
            }

            // Obtener el código de retiro. Si no existe (ej. en estado PENDIENTE), mostrar 'N/A'.
            const codigoRetiro = req.codigoRetiro ? `<strong>${req.codigoRetiro.codigo}</strong>` : 'N/A';

            tr.innerHTML = `
                <td>${req.club?.correo || 'N/A'}</td>
                <td>${req.motivo || 'N/A'}</td>
                <td>${req.competidor?.correoElectronico || 'N/A'}</td>
                <td>${codigoRetiro}</td> <!-- CÓDIGO MOSTRADO AQUÍ -->
                <td><span class="${estadoClass}">${req.estado.replace(/_/g, ' ')}</span></td>
                <td class="table-actions">${actionButtons}</td>
            `;
            requestsBody.appendChild(tr);
        });
    }

    async function handleDecision(requestId, accept) {
        const actionText = accept ? 'aceptar' : 'rechazar';
        const confirm = window.Swal ? await Swal.fire({
            title: `¿Confirmas que deseas ${actionText} esta solicitud?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'No'
        }) : { isConfirmed: confirm(`Confirmar acción: ${actionText}`) };

        if (!confirm.isConfirmed) return;

        try {
            const res = await fetch(`${API_BASE_URL}/solicitudes-retiro/${requestId}/${actionText}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const body = await parseResponseBody(res);
                throw new Error(body?.message || 'Error en la operación');
            }
            showAlert('success', 'Operación Exitosa', `La solicitud ha sido marcada como ${accept ? 'EN PROCESO' : 'RECHAZADA'}.`);
            fetchRequests();
        } catch (err) {
            console.error(err);
            showAlert('error', 'Error', err.message);
        }
    }

    requestsBody.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.dataset.id;
        if (!id) return;

        if (target.classList.contains('btn-accept')) {
            handleDecision(id, true);
        } else if (target.classList.contains('btn-reject')) {
            handleDecision(id, false);
        }
    });

    fetchRequests();
});
