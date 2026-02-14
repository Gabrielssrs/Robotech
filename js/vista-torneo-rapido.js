const API_BASE_URL = 'https://robotech-back.onrender.com/api';

// Variables de control para la simulación
let ultimoEncuentroProcesadoId = null;
let intentosFallidos = 0;

// --- Funciones de UI (Navegación) ---
window.showSection = function(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeButton = document.querySelector(`.nav-item[onclick*="'${sectionId}'"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const torneoId = urlParams.get('id');

    if (torneoId) {
        loadTorneoHeader(torneoId);
        loadParticipantes(torneoId);
        loadEncuentros(torneoId);
        checkReglamentoStatus(torneoId);
        
        if (typeof cargarResultadosTab === 'function') {
            cargarResultadosTab(torneoId);
        }

        setupAdminButtons(torneoId);
    }

    setupRoundTabs();
});

function setupAdminButtons(torneoId) {
    const btnInsertar = document.getElementById('btn-insertar-competidores');
    const btnIniciar = document.getElementById('btn-iniciar-torneo');
    const token = localStorage.getItem('jwtToken');

    if (token) {
        const user = parseJwt(token);
        const isAdmin = hasRole(user, 'ROLE_ADM_SISTEMA');

        if (btnInsertar) {
            btnInsertar.style.display = isAdmin ? 'inline-flex' : 'none';
            if (isAdmin) btnInsertar.onclick = () => iniciarSimulacionMasiva(torneoId);
        }

        if (btnIniciar) {
            btnIniciar.style.display = isAdmin ? 'inline-flex' : 'none';
            if (isAdmin) btnIniciar.onclick = () => iniciarTorneoRapido(torneoId);
        }
    } else {
        if (btnInsertar) btnInsertar.style.display = 'none';
        if (btnIniciar) btnIniciar.style.display = 'none';
    }
}

function setupRoundTabs() {
    document.querySelectorAll('.round-tabs button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.round-tabs button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

// ==========================================
// LÓGICA DE SIMULACIÓN RÁPIDA
// ==========================================

async function iniciarSimulacionMasiva(torneoId) {
    const token = localStorage.getItem('jwtToken');
    const btn = document.getElementById('btn-insertar-competidores');
    
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...';
    }

    try {
        const response = await fetch(`${API_BASE_URL}/torneos/${torneoId}/simular-inscripcion`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Error al generar fixture.");
        }

        await loadParticipantes(torneoId);
        await loadEncuentros(torneoId);
        alert("¡Fixture generado! Listo para iniciar el torneo.");
    } catch (error) {
        console.error("Error en simulación masiva:", error);
        alert("Error: " + error.message);
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Insertar Competidores';
        }
    }
}

async function iniciarTorneoRapido(torneoId) {
    const token = localStorage.getItem('jwtToken');
    const btn = document.getElementById('btn-iniciar-torneo');
    
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-bolt fa-spin"></i> Simulando...';
        btn.classList.add('btn-warning');
    }

    console.log("🚀 Iniciando Torneo Rápido...");
    ultimoEncuentroProcesadoId = null;
    intentosFallidos = 0;
    
    procesarSiguienteEncuentro(torneoId, token);
}

async function procesarSiguienteEncuentro(torneoId, token) {
    try {
        // A. Obtener estado actual (Agregamos timestamp para evitar caché del navegador)
        const response = await fetch(`${API_BASE_URL}/torneos/${torneoId}/encuentros?t=${new Date().getTime()}`);
        if (!response.ok) throw new Error("Error de conexión con el servidor al obtener encuentros.");
        const encuentros = await response.json();

        // DEBUG: Ver qué está recibiendo el frontend
        const ultimoProcesado = encuentros.find(e => e.id === ultimoEncuentroProcesadoId);
        if (ultimoProcesado) {
            console.log(`Estado del encuentro ${ultimoProcesado.id} tras actualización: Ganador=${ultimoProcesado.robotGanador}`);
        }

        // B. Buscar el siguiente partido pendiente
        const pendiente = encuentros.find(e => e.robotA && e.robotB && !e.robotGanador);

        if (pendiente) {
            // --- PROTECCIÓN CONTRA BUCLES ---
            if (pendiente.id === ultimoEncuentroProcesadoId) {
                intentosFallidos++;
                if (intentosFallidos > 3) {
                    throw new Error(`El encuentro ${pendiente.id} parece atascado. El backend no está guardando el ganador.`);
                }
                console.warn(`Reintentando encuentro ${pendiente.id}... (${intentosFallidos}/3)`);
            } else {
                ultimoEncuentroProcesadoId = pendiente.id;
                intentosFallidos = 0;
            }

            console.log(`⚔️ Simulando: ${pendiente.robotA} vs ${pendiente.robotB}`);

            // C. Simular
            const simResponse = await fetch(`${API_BASE_URL}/torneos/encuentros/${pendiente.id}/simular`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!simResponse.ok) {
                 const errorData = await simResponse.json().catch(() => ({}));
                 throw new Error(errorData.message || "El backend devolvió error al simular.");
            }

            // D. Actualizar UI
            await loadEncuentros(torneoId);
            if (typeof cargarResultadosTab === 'function') cargarResultadosTab(torneoId);

            // E. Esperar 2s (Aumentado para dar tiempo a la BD y evitar condiciones de carrera)
            setTimeout(() => procesarSiguienteEncuentro(torneoId, token), 2000); 

        } else {
            // Verificar fin del torneo
            const final = encuentros[encuentros.length - 1];
            
            if (final && final.robotGanador) {
                finalizarTorneoVisualmente();
                await loadParticipantes(torneoId);
            } else {
                console.log("⏳ Esperando generación de siguiente ronda...");
                setTimeout(() => procesarSiguienteEncuentro(torneoId, token), 2000);
            }
        }

    } catch (error) {
        console.error("Error en simulación:", error);
        const btn = document.getElementById('btn-iniciar-torneo');
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Error - Reintentar';
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-danger');
            alert("Ocurrió un error: " + error.message + "\nRevisa la consola del servidor para más detalles.");
        }
    }
}

function finalizarTorneoVisualmente() {
    console.log("🏆 Torneo Finalizado");
    const btn = document.getElementById('btn-iniciar-torneo');
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-trophy"></i> Finalizado';
        btn.classList.remove('btn-warning', 'btn-primary', 'btn-danger');
        btn.style.backgroundColor = '#2ea043';
        btn.style.borderColor = '#2ea043';
        btn.disabled = false;
    }
    alert("¡Torneo completado exitosamente! Resultados registrados.");
}

// ==========================================
// FUNCIONES DE CARGA DE DATOS (UI)
// ==========================================

async function loadTorneoHeader(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/torneos/${id}`);
        if (res.ok) {
            const data = await res.json();
            document.querySelector('.tournament-info h3').textContent = data.nombre;
        }
    } catch (e) { console.error(e); }
}

async function loadParticipantes(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/torneos/${id}/participantes`);
        if (res.ok) {
            const parts = await res.json();
            const grid = document.getElementById('participantes-grid');
            if (!grid) return;
            
            grid.innerHTML = parts.length ? '' : '<p style="color:#8b949e">Sin participantes.</p>';
            
            parts.forEach(p => {
                const estadoColor = p.estado === 'Participando' ? '#3fb950' : 
                                  p.estado === 'Eliminado' ? '#f85149' : '#8b949e';
                
                const html = `
                    <div class="participant-card" style="background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px;">
                        <div style="display:flex; justify-content:space-between;">
                            <i class="fa-solid fa-robot" style="color: #00bfff; font-size: 1.5em;"></i>
                            <span style="color:${estadoColor}; border:1px solid ${estadoColor}; padding:2px 8px; border-radius:12px; font-size:0.75em">${p.estado}</span>
                        </div>
                        <div style="margin-top:10px;">
                            <strong style="color:#c9d1d9; font-size:1.1em; display:block">${p.nombreRobot}</strong>
                            <small style="color:#8b949e">${p.nombreCompetidor}</small>
                        </div>
                        <div style="margin-top:8px; border-top:1px solid #30363d; padding-top:8px; color:#c9d1d9">
                            <i class="fa-solid fa-trophy" style="color:#ffd700"></i> <strong>${p.puntos}</strong> pts
                        </div>
                    </div>`;
                grid.insertAdjacentHTML('beforeend', html);
            });
        }
    } catch (e) { console.error(e); }
}

async function loadEncuentros(id) {
    try {
        // Agregamos timestamp para evitar caché
        const res = await fetch(`${API_BASE_URL}/torneos/${id}/encuentros?t=${new Date().getTime()}`);
        if (res.ok) {
            const encuentros = await res.json();
            renderBracket(encuentros);
        }
    } catch (e) { console.error(e); }
}

function renderBracket(encuentros) {
    const rounds = {
        octavos: document.querySelectorAll('.round.octavos .matchup'),
        cuartos: document.querySelectorAll('.round.cuartos .matchup'),
        semis: document.querySelectorAll('.round.semifinal .matchup')
    };

    let finalistLeft, finalistRight;

    encuentros.forEach((match, idx) => {
        let el;
        if (idx < 8) el = rounds.octavos[idx];
        else if (idx < 12) el = rounds.cuartos[idx - 8];
        else if (idx < 14) el = rounds.semis[idx - 12];

        if (el) updateMatchElement(el, match);

        if (idx === 12 && match.robotGanador) finalistLeft = match.robotGanador;
        if (idx === 13 && match.robotGanador) finalistRight = match.robotGanador;
        
        if (idx === 14 && match.robotGanador) {
            const winnerSlot = document.querySelector('.winner-slot');
            if (winnerSlot) {
                winnerSlot.textContent = match.robotGanador;
                winnerSlot.style.color = '#ffd700';
            }
            
            const finalistsBox = document.querySelector('.finalists-box');
            if(finalistsBox) {
                finalistsBox.style.display = 'block';
                document.querySelector('#finalist-left div:last-child').textContent = finalistLeft || '???';
                document.querySelector('#finalist-right div:last-child').textContent = finalistRight || '???';
            }
        }
    });
}

function updateMatchElement(el, match) {
    const teams = el.querySelectorAll('.team');
    if (teams.length < 2) return;

    const setTeam = (div, name, points, isWinner) => {
        if (points !== null && points !== undefined) {
            div.innerHTML = `<span style="color:#ffd700; font-weight:bold; font-size:1.1em">${points}</span> <span style="font-size:0.9em">${name}</span>`;
        } else {
            div.textContent = name || '...';
        }
        
        div.style.borderColor = isWinner ? '#00bfff' : (match.robotGanador ? '#f85149' : '#30363d');
        div.style.boxShadow = isWinner ? '0 0 10px rgba(0,191,255,0.3)' : 'none';
        div.style.color = isWinner ? '#c9d1d9' : (match.robotGanador ? '#8b949e' : '#c9d1d9');
    };

    const winner = match.robotGanador;
    setTeam(teams[0], match.robotA, match.puntosRobotA, winner && winner === match.robotA);
    setTeam(teams[1], match.robotB, match.puntosRobotB, winner && winner === match.robotB);
}

// --- UTILIDADES ---
function parseJwt(token) {
    try {
        return JSON.parse(decodeURIComponent(atob(token.split('.')[1]).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch { return {}; }
}

function hasRole(user, role) {
    return user.roles && user.roles.some(r => (typeof r === 'string' ? r : r.authority) === role);
}

async function checkReglamentoStatus(id) {
    try {
        const res = await fetch(`${API_BASE_URL}/torneos/${id}/reglamento`);
        if (res.ok) {
            const reglas = await res.json();
            if (!reglas || reglas.length === 0) {
                const btn = document.getElementById('btn-reglamento');
                if (btn) {
                    btn.classList.add('btn-tooltip');
                    btn.setAttribute('data-tooltip', '⚠️ Sin reglas definidas');
                    btn.style.borderLeft = '3px solid #dc3545';
                }
            }
        }
    } catch (e) { console.error(e); }
}
