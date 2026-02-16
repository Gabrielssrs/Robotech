document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const torneoId = urlParams.get('id');
    const token = localStorage.getItem('jwtToken');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';

    if (torneoId) {
        cargarResultados(torneoId);
    }

    async function cargarResultados(id) {
        try {
            // 1. Obtener todos los encuentros del torneo
            const resEncuentros = await fetch(`${API_BASE_URL}/torneos/${id}/encuentros`);
            const encuentros = await resEncuentros.json();

            // 2. Determinar si el usuario es competidor y cuál es su robot en este torneo
            let userRobotId = null;
            let isCompetitor = false;

            if (token) {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const roles = payload.roles || [];
                // Verificar si tiene el rol de competidor
                isCompetitor = roles.includes('ROLE_COMPETIDOR') || roles.some(r => r.authority === 'ROLE_COMPETIDOR');

                if (isCompetitor) {
                    // Obtener los robots del usuario
                    const resRobots = await fetch(`${API_BASE_URL}/robots/mis-robots`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    
                    if (resRobots.ok) {
                        const myRobots = await resRobots.json();
                        // Obtener participantes del torneo para cruzar datos
                        const resPart = await fetch(`${API_BASE_URL}/torneos/${id}/participantes`);
                        const participants = await resPart.json();
                        
                        // Buscar si alguno de mis robots está en la lista de participantes
                        const myRobotInTournament = participants.find(p => myRobots.some(mr => mr.id === p.id));
                        if (myRobotInTournament) {
                            userRobotId = myRobotInTournament.id;
                        }
                    }
                }
            }

            renderizarSecciones(encuentros, isCompetitor, userRobotId);

        } catch (error) {
            console.error('Error cargando resultados:', error);
        }
    }

    function renderizarSecciones(encuentros, isCompetitor, userRobotId) {
        const container = document.querySelector('.results-section');
        if (!container) return;
        
        container.innerHTML = ''; // Limpiar contenido previo

        // --- SECCIÓN 0: PRÓXIMO ENCUENTRO Y ORDEN ---
        mostrarOrdenEncuentros(encuentros);

        // --- SECCIÓN 1: MIS TURNOS ---
        const misTurnosLabel = document.createElement('div');
        misTurnosLabel.className = 'section-label';
        misTurnosLabel.textContent = 'MIS TURNOS - PRÓXIMOS';
        container.appendChild(misTurnosLabel);

        if (!isCompetitor || !userRobotId) {
            // Mensaje si no es competidor o no participa activamente
            const msg = document.createElement('div');
            msg.style.padding = '20px';
            msg.style.textAlign = 'center';
            msg.style.color = '#8b949e';
            msg.style.border = '1px dashed #30363d';
            msg.style.borderRadius = '8px';
            msg.style.marginBottom = '20px';
            msg.innerHTML = '<i class="fa-solid fa-lock"></i> Necesitas ser competidor y jugador activo del torneo para ver tus turnos.';
            container.appendChild(msg);
        } else {
            // Filtrar encuentros pendientes donde participa mi robot
            const misPendientes = encuentros.filter(e => 
                (e.robotAId === userRobotId || e.robotBId === userRobotId) && !e.ganadorId
            );

            if (misPendientes.length === 0) {
                const msg = document.createElement('div');
                msg.style.padding = '10px';
                msg.style.color = '#8b949e';
                msg.textContent = 'No tienes turnos pendientes por el momento.';
                container.appendChild(msg);
            } else {
                misPendientes.forEach(e => container.appendChild(crearTarjetaEncuentro(e, 'TU TURNO')));
            }
        }

        // --- SECCIÓN 2: EN VIVO (Pendientes generales) ---
        const enVivoLabel = document.createElement('div');
        enVivoLabel.className = 'section-label mt-30';
        enVivoLabel.style.marginTop = '30px';
        enVivoLabel.textContent = 'EN VIVO / PENDIENTES';
        container.appendChild(enVivoLabel);

        const enVivo = encuentros.filter(e => !e.ganadorId);
        if (enVivo.length === 0) {
            container.innerHTML += '<p style="color:#8b949e; padding:10px;">No hay encuentros programados actualmente.</p>';
        } else {
            enVivo.forEach(e => container.appendChild(crearTarjetaEncuentro(e, 'EN VIVO')));
        }

        // --- SECCIÓN 3: RESULTADOS FINALES ---
        const finalesLabel = document.createElement('div');
        finalesLabel.className = 'section-label mt-30';
        finalesLabel.style.marginTop = '30px';
        finalesLabel.textContent = 'RESULTADOS FINALES';
        container.appendChild(finalesLabel);

        const finalizados = encuentros.filter(e => e.ganadorId);
        if (finalizados.length === 0) {
            container.innerHTML += '<p style="color:#8b949e; padding:10px;">Aún no hay resultados finales.</p>';
        } else {
            // Ordenar por ID descendente (los más recientes primero)
            finalizados.sort((a, b) => b.id - a.id);
            finalizados.forEach(e => container.appendChild(crearTarjetaEncuentro(e, 'FINALIZADO')));
        }
    }

    function crearTarjetaEncuentro(e, estadoLabel) {
        const card = document.createElement('div');
        card.className = `match-card ${estadoLabel === 'FINALIZADO' ? 'finished' : 'live'}`;
        
        // Estilos base de la tarjeta (si no están en CSS)
        card.style.background = '#161b22';
        card.style.border = '1px solid #30363d';
        card.style.borderRadius = '8px';
        card.style.padding = '15px';
        card.style.marginBottom = '15px';
        card.style.display = 'flex';
        card.style.alignItems = 'center';
        card.style.justifyContent = 'space-between';

        let badgeClass = estadoLabel === 'FINALIZADO' ? 'badge-finished' : 'badge-live';
        let badgeColor = estadoLabel === 'FINALIZADO' ? '#8b949e' : '#00bfff';
        
        // Lógica de bordes para Ganador/Perdedor
        let styleA = 'padding: 8px; border-radius: 6px; flex: 1;';
        let styleB = 'padding: 8px; border-radius: 6px; flex: 1; text-align: right;';
        
        if (estadoLabel === 'FINALIZADO') {
            if (e.ganadorId === e.robotAId) {
                // A Ganó (Verde), B Perdió (Rojo)
                styleA += ' border-left: 4px solid #2ea44f; background: rgba(46, 164, 79, 0.1);';
                styleB += ' border-right: 4px solid #ff4d4d; background: rgba(255, 77, 77, 0.1);';
            } else if (e.ganadorId === e.robotBId) {
                // B Ganó (Verde), A Perdió (Rojo)
                styleA += ' border-left: 4px solid #ff4d4d; background: rgba(255, 77, 77, 0.1);';
                styleB += ' border-right: 4px solid #2ea44f; background: rgba(46, 164, 79, 0.1);';
            }
        }

        card.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 5px; min-width: 80px;">
                <span class="${badgeClass}" style="color: ${badgeColor}; font-weight: bold; font-size: 0.75rem; text-transform: uppercase;">${estadoLabel}</span>
                <small style="color: #8b949e;">Ronda #${e.id}</small>
            </div>
            
            <div class="team team-a" style="${styleA}">
                <div class="team-meta">
                    <strong style="color: #e6eef6; display: block;">${e.robotA || '---'}</strong>
                </div>
            </div>
            
            <div class="score" style="font-size: 1.2rem; font-weight: bold; color: #e6eef6; padding: 0 15px;">
                ${e.puntosRobotA !== null ? e.puntosRobotA : '-'} : ${e.puntosRobotB !== null ? e.puntosRobotB : '-'}
            </div>
            
            <div class="team team-b" style="${styleB}">
                <div class="team-meta">
                    <strong style="color: #e6eef6; display: block;">${e.robotB || '---'}</strong>
                </div>
            </div>
        `;
        return card;
    }

    // --- Función para mostrar orden de encuentros ---
    function mostrarOrdenEncuentros(encuentros) {
        const container = document.querySelector('.results-section');
        if (!container) return;

        // Encuentros ordenados por fecha
        const encuentrosOrdenados = encuentros
            .map((enc, index) => ({...enc, indiceOriginal: index}))
            .filter(e => e.fechaHora) // Solo los que tienen fecha
            .sort((a, b) => new Date(a.fechaHora) - new Date(b.fechaHora));

        // Encontrar el primer encuentro pendiente
        const primerEncuentro = encuentrosOrdenados.find(e => !e.ganadorId);
        
        if (primerEncuentro) {
            const primerHTML = document.createElement('div');
            primerHTML.style.cssText = `
                background: linear-gradient(135deg, rgba(0, 191, 255, 0.15), rgba(0, 191, 255, 0.05));
                border: 2px solid rgba(0, 191, 255, 0.5);
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 20px;
            `;

            const hora = new Date(primerEncuentro.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            primerHTML.innerHTML = `
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="flex-shrink: 0;">
                        <i class="fa-solid fa-star" style="font-size: 24px; color: #ffd700;"></i>
                    </div>
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 5px 0; color: #e6eef6; font-size: 1.1rem;">
                            <i class="fa-solid fa-arrow-right" style="color: #00bfff;"></i> Próximo Encuentro
                        </h3>
                        <p style="margin: 0; color: #8b949e; font-size: 0.95rem;">
                            <strong style="color: #79c0ff;">${primerEncuentro.robotA}</strong> vs <strong style="color: #79c0ff;">${primerEncuentro.robotB}</strong>
                        </p>
                        <p style="margin: 5px 0 0 0; color: #58a6ff; font-size: 0.9rem;">
                            <i class="fa-solid fa-clock"></i> ${hora}
                        </p>
                    </div>
                </div>
            `;
            container.appendChild(primerHTML);
        }

        // Crear tabla de orden de encuentros
        if (encuentrosOrdenados.length > 0) {
            const tablaOrdenHTML = document.createElement('div');
            tablaOrdenHTML.style.cssText = `
                margin-bottom: 30px;
                background: rgba(22, 27, 34, 0.6);
                border: 1px solid #30363d;
                border-radius: 8px;
                padding: 15px;
                overflow-x: auto;
            `;

            let tablaHTML = `
                <div style="color: #8b949e; font-size: 0.85rem; margin-bottom: 10px;">
                    <i class="fa-solid fa-list"></i> Orden de encuentros programados
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            `;

            encuentrosOrdenados.forEach((enc) => {
                const hora = new Date(enc.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const estado = enc.ganadorId ? 'completado' : 'pendiente';
                const colores = estado === 'completado' 
                    ? { bg: 'rgba(46, 164, 79, 0.1)', border: '#2ea44f', text: '#2ea44f' }
                    : { bg: 'rgba(88, 166, 255, 0.1)', border: '#58a6ff', text: '#79c0ff' };

                tablaHTML += `
                    <div style="
                        background: ${colores.bg};
                        border: 1px solid ${colores.border};
                        border-radius: 6px;
                        padding: 8px 12px;
                        font-size: 0.8rem;
                        text-align: center;
                        min-width: 100px;
                        cursor: pointer;
                        transition: all 0.3s;
                    " title="${enc.robotA} vs ${enc.robotB}">
                        <div style="color: ${colores.text}; font-weight: 600; font-size: 0.75rem; margin-bottom: 2px;">
                            ${enc.robotA} vs ${enc.robotB}
                        </div>
                        <div style="color: #8b949e; font-size: 0.7rem;">
                            ${hora}
                        </div>
                        <div style="color: #c9d1d9; font-size: 0.7rem; margin-top: 3px;">
                            ${enc.ganadorId ? '✓ Completado' : '○ Pendiente'}
                        </div>
                    </div>
                `;
            });

            tablaHTML += '</div>';
            tablaOrdenHTML.innerHTML = tablaHTML;
            container.appendChild(tablaOrdenHTML);
        }
    }
});
