const API_BASE_URL = 'https://robotech-back.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    loadMisTorneos();
    // Actualizar contadores cada minuto
    setInterval(updateCountdowns, 60000);
});

let torneosData = []; // Almacenar datos para actualizar contadores sin recargar

async function loadMisTorneos() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/torneos/mis-torneos`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            torneosData = await response.json();
            renderTorneos(torneosData);
        } else {
            console.error("Error al cargar torneos asignados");
            const container = document.querySelector('.tournament-list');
            if (container) container.innerHTML = '<p style="text-align:center; padding: 20px; color: #ccc;">No se pudieron cargar los torneos.</p>';
        }
    } catch (error) {
        console.error("Error de conexión:", error);
    }
}

function renderTorneos(torneos) {
    const container = document.querySelector('.tournament-list');
    // Mantener los headers (primer hijo), limpiar el resto
    const headers = container.querySelector('.list-labels');
    container.innerHTML = '';
    if (headers) container.appendChild(headers);

    if (torneos.length === 0) {
        container.innerHTML += '<p style="text-align:center; padding: 20px; color: #8b949e;">No tienes torneos asignados actualmente.</p>';
        return;
    }

    torneos.forEach(t => {
        const row = document.createElement('div');
        row.className = 't-row';
        row.dataset.torneoId = t.id; // Para identificar la fila

        // Construir fecha completa de inicio
        let fechaInicioObj = null;
        let fechaStr = t.fechaInicio;
        
        if (t.fechaInicio) {
            const horaStr = t.horaInicio ? t.horaInicio : '00:00:00';
            fechaInicioObj = new Date(`${t.fechaInicio}T${horaStr}`);
            
            try {
                 const dateOnly = new Date(t.fechaInicio + 'T00:00:00');
                 fechaStr = dateOnly.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch(e) {}
        }

        // Lógica inicial de estado y botones
        let statusBadge = '';
        let actionBtn = '';
        let countdownHtml = '';

        if (t.estado === 'EN_CURSO') {
            statusBadge = '<span class="badge live"><i class="fa-solid fa-tower-broadcast"></i> En Vivo</span>';
            actionBtn = `<a href="panel_Puntuacion.html?torneoId=${t.id}" class="btn-puntuar"><i class="fa-solid fa-play"></i> Puntuar</a>`;
        } else if (t.estado === 'PROXIMAMENTE') {
            statusBadge = '<span class="badge upcoming"><i class="fa-regular fa-clock"></i> Próximo</span>';
            
            // Calcular tiempo restante
            if (fechaInicioObj) {
                const now = new Date();
                const diffMs = fechaInicioObj - now;
                const diffMinutes = Math.floor(diffMs / 60000);

                if (diffMinutes <= 0) {
                    // Ya pasó la hora pero el estado sigue en PROXIMAMENTE (quizás retraso manual)
                    actionBtn = '<button class="btn-disabled" disabled>Por Iniciar</button>';
                    countdownHtml = '<span class="countdown-text overdue">¡Hora de inicio!</span>';
                } else if (diffMinutes <= 60) {
                    // Menos de una hora: Mostrar botón de espera activo o alerta
                    // Opcional: Permitir entrar antes si es política del torneo
                    actionBtn = '<button class="btn-disabled" disabled>Espera</button>';
                    countdownHtml = `<span class="countdown-text urgent">Inicia en ${diffMinutes} min</span>`;
                } else if (diffMinutes <= 1440) { // Menos de 24 horas
                    const hours = Math.floor(diffMinutes / 60);
                    const mins = diffMinutes % 60;
                    actionBtn = '<button class="btn-disabled" disabled>Espera</button>';
                    countdownHtml = `<span class="countdown-text">Faltan ${hours}h ${mins}m</span>`;
                } else {
                    actionBtn = '<button class="btn-disabled" disabled>Espera</button>';
                    // No mostrar contador si falta mucho
                }
            } else {
                actionBtn = '<button class="btn-disabled" disabled>Espera</button>';
            }

        } else {
            statusBadge = '<span class="badge finished"><i class="fa-regular fa-circle-check"></i> Finalizado</span>';
            actionBtn = `<a href="vista_torneo.html?id=${t.id}" class="btn-outline">Ver Resultados</a>`;
        }

        const categoriasStr = t.categorias && t.categorias.length > 0 ? t.categorias.join(', ') : 'General';

        row.innerHTML = `
            <div class="col-info">
                <strong>${t.nombre}</strong>
                <small>${t.nombreSede}</small>
            </div>
            <div class="col-date">
                <i class="fa-regular fa-calendar"></i> ${fechaStr}
                <div class="countdown-container">${countdownHtml}</div>
            </div>
            <div class="col-cat">${categoriasStr}</div>
            <div class="col-status">${statusBadge}</div>
            <div class="col-action">
                <a href="reglamento_torneo.html" class="btn-reglas"><i class="fa-solid fa-book"></i> Reglas</a>
                ${actionBtn}
            </div>
        `;

        container.appendChild(row);
    });
}

function updateCountdowns() {
    // Recalcular solo los textos de tiempo sin volver a renderizar todo el DOM
    // O simplemente volver a llamar a renderTorneos(torneosData) si la lista no es muy grande
    if(torneosData.length > 0) renderTorneos(torneosData);
}
