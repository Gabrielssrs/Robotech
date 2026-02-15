document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const torneoId = urlParams.get('id');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';

    if (torneoId) {
        cargarParticipantes(torneoId);
    }

    async function cargarParticipantes(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/torneos/${id}/participantes`);
            if (!response.ok) throw new Error('Error al cargar participantes');
            const participantes = await response.json();
            renderizarParticipantes(participantes);
        } catch (error) {
            console.error(error);
            const container = document.getElementById('participantes-grid');
            if (container) container.innerHTML = '<p style="color: #ff4d4d;">No se pudieron cargar los participantes.</p>';
        }
    }

    function renderizarParticipantes(participantes) {
        const container = document.getElementById('participantes-grid');
        if (!container) return;
        
        container.innerHTML = '';

        if (participantes.length === 0) {
            container.innerHTML = '<p style="color: #8b949e; grid-column: 1/-1; text-align: center;">No hay participantes inscritos aún.</p>';
            return;
        }

        participantes.forEach(p => {
            const card = document.createElement('div');
            card.className = 'participant-card';
            
            // Estilos base de la tarjeta
            card.style.background = '#161b22';
            card.style.borderRadius = '8px';
            card.style.padding = '15px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '10px';
            card.style.transition = 'transform 0.2s';

            // Lógica visual: Borde rojo si está eliminado
            if (p.estado === 'Eliminado') {
                card.style.border = '2px solid #ff4d4d';
                card.style.opacity = '0.8';
            } else {
                card.style.border = '1px solid #30363d';
            }

            // HTML interno de la tarjeta
            card.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 5px;">
                    <img src="${p.fotoUrl || 'https://via.placeholder.com/50'}" alt="Avatar" 
                         style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; border: 2px solid #30363d;">
                    <div>
                        <h4 style="margin: 0; color: #e6eef6; font-size: 1rem;">${p.nombreRobot}</h4>
                        <small style="color: #8b949e;">${p.nombreCompetidor}</small>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; background: #0d1117; padding: 8px; border-radius: 6px;">
                    <span style="color: #00bfff; font-weight: 600;">${p.puntos || 0} pts</span>
                    <span style="font-size: 0.8rem; padding: 2px 6px; border-radius: 4px; 
                          background: ${p.estado === 'Eliminado' ? 'rgba(255, 77, 77, 0.2)' : 'rgba(46, 164, 79, 0.2)'}; 
                          color: ${p.estado === 'Eliminado' ? '#ff4d4d' : '#2ea44f'};">
                        ${p.estado}
                    </span>
                </div>
            `;
            container.appendChild(card);
        });
    }
});
