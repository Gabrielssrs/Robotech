document.addEventListener('DOMContentLoaded', () => {
    const btnOpen = document.getElementById('btn-retirar-action');
    const modal = document.getElementById('retire-modal');
    const closeBtn = document.getElementById('retire-close');
    const cancelBtn = document.getElementById('retire-cancel');
    const form = document.getElementById('retire-form');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';
    const token = localStorage.getItem('jwtToken');

    if (!btnOpen || !modal) return; // nothing to do if elements missing

    function openModal() {
        modal.style.display = 'block';
    }
    function closeModal() {
        modal.style.display = 'none';
        form.reset();
    }

    btnOpen.addEventListener('click', () => {
        openModal();
    });
    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    // Close on background click
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    async function parseResponseBody(resp) {
        try { return await resp.json(); } catch (e) { return await resp.text(); }
    }

    function showSuccess(title, text) {
        if (window.Swal) Swal.fire({ icon: 'success', title, text });
        else alert(title + '\n' + text);
    }
    function showError(title, text) {
        if (window.Swal) Swal.fire({ icon: 'error', title, text });
        else alert(title + '\n' + text);
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const correo = document.getElementById('retire-correo').value.trim();
        const motivo = document.getElementById('retire-motivo').value.trim();

        if (!correo || !motivo) {
            showError('Error', 'Completa correo y motivo.');
            return;
        }

        // Confirm
        const confirmed = window.Swal ? await Swal.fire({
            title: 'Confirmar retiro',
            text: `¿Deseas solicitar el retiro del competidor ${correo}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, solicitar',
            cancelButtonText: 'Cancelar'
        }) : { isConfirmed: confirm('Confirmar solicitud de retiro para ' + correo) };

        if (window.Swal ? !confirmed.isConfirmed : !confirmed) return;

        try {
            const payload = { correoCompetidor: correo, motivo };
            const res = await fetch(`${API_BASE_URL}/retiros/solicitudes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const body = await parseResponseBody(res);
                throw new Error(body?.message || 'Error al enviar solicitud');
            }
            showSuccess('Solicitud enviada', 'La solicitud de retiro se ha enviado correctamente.');
            closeModal();
        } catch (err) {
            console.error(err);
            showError('Error', err.message || 'Error desconocido');
        }
    });
});