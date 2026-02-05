// src/main/resources/static/js/resultados-torneo.js

// Usamos la misma base URL, asegurándonos de que esté definida
var RESULTADOS_API_BASE = 'http://localhost:8080/api';

async function cargarResultadosTab(torneoId) {
    const container = document.querySelector('#resultados .results-section');
    if (!container) return;

    // Mostrar loader
    container.innerHTML = '<div style="text-align:center; padding:40px; color:#8b949e;"><i class="fa-solid fa-spinner fa-spin" style="font-size: 2em;"></i><br><br>Cargando resultados...</div>';

    try {
        const token = localStorage.getItem('jwtToken');
        let userRobotsIds = new Set();
        let isCompetitor = false;

        // 1. Verificar si es competidor y obtener sus robots
        if (token) {
            const user = parseJwtResultados(token);
            if (hasRoleResultados(user, 'ROLE_COMPETIDOR')) {
                isCompetitor = true;
                try {
                    const robotsResponse = await fetch(`${RESULTADOS_API_BASE}/robots/mis-robots`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (robotsResponse.ok) {
                        const robots = await robotsResponse.json();
                        robots.forEach(r => userRobotsIds.add(r.id));
                    }
                } catch (e) {
                    console.error("Error obteniendo robots del usuario", e);
                }
            }
        }

        // 2. Obtener todos los encuentros del torneo
        const encuentrosResponse = await fetch(`${RESULTADOS_API_BASE}/torneos/${torneoId}/encuentros`);
        let encuentros = [];
        if (encuentrosResponse.ok) {
            encuentros = await encuentrosResponse.json();
        }

        // Limpiar contenedor para renderizar
        container.innerHTML = '';

        // --- SECCIÓN 1: MIS TURNOS ---
        const misTurnosLabel = document.createElement('div');
        misTurnosLabel.className = 'section-label';
        misTurnosLabel.innerHTML = '<i class="fa-solid fa-user-clock"></i> MIS TURNOS';
        container.appendChild(misTurnosLabel);

        if (!isCompetitor) {
            // Mensaje para no competidores (Jueces, Admin, No logueados)
            const msg = document.createElement('div');
            msg.style.cssText = 'padding: 20px; text-align: center; color: #8b949e; background: #161b22; border: 1px solid #30363d; border-radius: 6px; margin-bottom: 30px;';
            msg.innerHTML = '<i class="fa-solid fa-lock" style="margin-bottom:10px; font-size:1.5em;"></i><br>Debes ser un competidor activo en el torneo para ver tus turnos.';
            container.appendChild(msg);
        } else if (userRobotsIds.size === 0) {
             const msg = document.createElement('div');
            msg.style.cssText = 'padding: 20px; text-align: center; color: #8b949e; background: #161b22; border-radius: 6px; margin-bottom: 30px;';
            msg.textContent = 'No tienes robots registrados en tu cuenta.';
            container.appendChild(msg);
        } else {
            // Filtrar encuentros donde participa alguno de los robots del usuario
            const misEncuentros = encuentros.filter(e => userRobotsIds.has(e.robotAId) || userRobotsIds.has(e.robotBId));
            
            if (misEncuentros.length === 0) {
                const msg = document.createElement('div');
                msg.style.cssText = 'padding: 20px; text-align: center; color: #8b949e; background: #161b22; border-radius: 6px; margin-bottom: 30px;';
                msg.textContent = 'No participas en este torneo.';
                container.appendChild(msg);
            } else {
                // Lógica: Mostrar el próximo pendiente O el último jugado (si ya fue eliminado o ganó)
                const pendiente = misEncuentros.find(e => !e.ganador);
                // Ordenar finalizados por ID descendente (el último jugado primero)
                const finalizados = misEncuentros.filter(e => e.ganador).sort((a, b) => b.id - a.id);
                
                if (pendiente) {
                    // Tiene un partido pendiente o en curso
                    container.appendChild(createMatchCard(pendiente, 'live', 'TU PRÓXIMO TURNO'));
                } else if (finalizados.length > 0) {
                    // Ya no tiene pendientes, mostrar el resultado de su último partido
                    const ultimo = finalizados[0];
                    // Verificar si ganó el último
                    const ganoUltimo = (userRobotsIds.has(ultimo.robotAId) && ultimo.ganador === ultimo.robotA) ||
                                       (userRobotsIds.has(ultimo.robotBId) && ultimo.ganador === ultimo.robotB);
                    
                    // Si ganó el último pero no hay pendiente, significa que espera que se genere la siguiente ronda
                    // O que ganó la final.
                    // Como simplificación, si ganó el último mostramos "ESPERANDO RIVAL / CAMPEÓN"
                    // Si perdió, mostramos "ELIMINADO"
                    
                    const label = ganoUltimo ? 'VICTORIA (Esperando siguiente ronda)' : 'ELIMINADO';
                    const styleClass = ganoUltimo ? 'live' : 'finished'; // Usamos estilo live para victoria para resaltar
                    container.appendChild(createMatchCard(ultimo, styleClass, label));
                }
            }
        }

        // --- SECCIÓN 2: EN VIVO ---
        const enVivoLabel = document.createElement('div');
        enVivoLabel.className = 'section-label';
        enVivoLabel.innerHTML = '<i class="fa-solid fa-tower-broadcast"></i> EN VIVO / PRÓXIMO';
        container.appendChild(enVivoLabel);

        // El primer encuentro sin ganador es el que está "En Vivo" o por jugarse
        const matchEnVivo = encuentros.find(e => !e.ganador);
        if (matchEnVivo) {
            container.appendChild(createMatchCard(matchEnVivo, 'live', 'EN CURSO'));
        } else {
            const msg = document.createElement('p');
            msg.style.cssText = 'color: #8b949e; text-align: center; padding: 20px;';
            msg.textContent = 'No hay encuentros en curso en este momento.';
            container.appendChild(msg);
        }

        // --- SECCIÓN 3: RESULTADOS FINALES ---
        const resultadosLabel = document.createElement('div');
        resultadosLabel.className = 'section-label mt-30';
        resultadosLabel.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> RESULTADOS FINALES';
        container.appendChild(resultadosLabel);

        const todosFinalizados = encuentros.filter(e => e.ganador).sort((a, b) => b.id - a.id);
        if (todosFinalizados.length > 0) {
            todosFinalizados.forEach(e => {
                container.appendChild(createMatchCard(e, 'finished', 'FINALIZADO'));
            });
        } else {
            const msg = document.createElement('p');
            msg.style.cssText = 'color: #8b949e; text-align: center; padding: 20px;';
            msg.textContent = 'Aún no hay resultados registrados.';
            container.appendChild(msg);
        }

    } catch (error) {
        console.error("Error en resultados:", error);
        container.innerHTML = '<p style="color: #dc3545; text-align: center;">Error al cargar los resultados.</p>';
    }
}

// --- Helpers ---

function createMatchCard(encuentro, type, statusText) {
    const card = document.createElement('div');
    card.className = `match-card ${type}`;
    
    const badgeClass = type === 'live' ? 'badge-live' : 'badge-finished';
    
    // Formatear puntajes
    const score = (encuentro.puntosRobotA !== null && encuentro.puntosRobotB !== null) 
        ? `${encuentro.puntosRobotA} : ${encuentro.puntosRobotB}` 
        : 'VS';

    // Determinar fase por índice del encuentro (asumiendo orden: 0-7 Octavos, 8-11 Cuartos, 12-13 Semifinal, 14 Final)
    let fase = "Eliminatorias";
    if(encuentro.id) {
        const index = encuentro.id - 1; // ID comienza en 1, convertir a índice 0-based
        if(index < 8) fase = "Octavos";
        else if(index < 12) fase = "Cuartos";
        else if(index < 14) fase = "Semifinal";
        else if(index === 14) fase = "Final";
    }

    // Crear HTML con estructura de 5 columnas
    const statusDiv = document.createElement('div');
    statusDiv.className = 'match-status';
    statusDiv.innerHTML = `
        <span class="${badgeClass}">${statusText}</span>
        <small>${fase}</small>
    `;
    
    const teamADiv = document.createElement('div');
    teamADiv.className = 'team team-a';
    teamADiv.innerHTML = `
        <img src="https://i.pravatar.cc/40?u=${encuentro.robotAId}" alt="Robot A">
        <div class="team-meta">
            <strong>${encuentro.robotA}</strong>
        </div>
    `;
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score';
    scoreDiv.textContent = score;
    
    const teamBDiv = document.createElement('div');
    teamBDiv.className = 'team team-b';
    teamBDiv.innerHTML = `
        <div class="team-meta text-right">
            <strong>${encuentro.robotB}</strong>
        </div>
        <img src="https://i.pravatar.cc/40?u=${encuentro.robotBId}" alt="Robot B">
    `;
    
    // Spacer vacío para centrar el score
    const spacerDiv = document.createElement('div');
    spacerDiv.style.cssText = 'display: none;';
    
    card.appendChild(statusDiv);
    card.appendChild(teamADiv);
    card.appendChild(scoreDiv);
    card.appendChild(teamBDiv);
    card.appendChild(spacerDiv);
    
    // Resaltar ganador
    if (encuentro.ganador) {
        if (encuentro.ganador === encuentro.robotA) {
            const strong = teamADiv.querySelector('strong');
            strong.style.color = '#00bfff';
            strong.innerHTML += ' <i class="fa-solid fa-crown" style="color:#ffd700; font-size:0.8em;"></i>';
        } else {
            const strong = teamBDiv.querySelector('strong');
            strong.style.color = '#00bfff';
            strong.innerHTML += ' <i class="fa-solid fa-crown" style="color:#ffd700; font-size:0.8em;"></i>';
        }
    }

    return card;
}

// Funciones de JWT locales para este script (para evitar dependencias de orden de carga)
function parseJwtResultados(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) { return {}; }
}

function hasRoleResultados(user, roleName) {
    if (!user || (!user.roles && !user.authorities)) return false;
    const roles = user.roles || user.authorities;
    if (Array.isArray(roles)) {
        return roles.some(r => {
            if (typeof r === 'string') return r === roleName;
            if (typeof r === 'object' && r.authority) return r.authority === roleName;
            return false;
        });
    }
    return false;
}
