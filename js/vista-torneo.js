const API_BASE_URL = 'https://robotech-back.onrender.com/api';

// Variable global para detectar si nos quedamos atascados en el mismo encuentro
let ultimoEncuentroProcesadoId = null;

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

        // Configurar botones de administración
        const btnInsertar = document.getElementById('btn-insertar-competidores');
        const btnIniciar = document.getElementById('btn-iniciar-torneo');

        const token = localStorage.getItem('jwtToken');
        
        if (token) {
            const user = parseJwt(token);
            const isAdmin = hasRole(user, 'ROLE_ADM_SISTEMA');

            if (btnInsertar) {
                btnInsertar.style.display = isAdmin ? 'inline-flex' : 'none';
                if (isAdmin) {
                    btnInsertar.onclick = () => iniciarSimulacion(torneoId);
                }
            }

            if (btnIniciar) {
                btnIniciar.style.display = isAdmin ? 'inline-flex' : 'none';
                if (isAdmin) {
                    btnIniciar.onclick = () => iniciarTorneo(torneoId);
                }
            }
        } else {
            if (btnInsertar) btnInsertar.style.display = 'none';
            if (btnIniciar) btnIniciar.style.display = 'none';
        }
    }

    document.querySelectorAll('.round-tabs button').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.round-tabs button').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
});

// --- Funciones Auxiliares de Seguridad ---

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return {};
    }
}

function hasRole(user, roleName) {
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

// --- Funciones de UI ---

function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeButton = document.querySelector(`[onclick="showSection('${sectionId}')"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
}

async function loadTorneoHeader(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/torneos/${id}`);
        if (response.ok) {
            const torneo = await response.json();
            const titleElement = document.querySelector('.tournament-info h3');
            if (titleElement) titleElement.textContent = torneo.nombre;
        }
    } catch (error) {
        console.error("Error cargando cabecera:", error);
    }
}

async function checkReglamentoStatus(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/torneos/${id}/reglamento`);
        if (response.ok) {
            const reglas = await response.json();
            if (!reglas || reglas.length === 0) {
                const btn = document.getElementById('btn-reglamento');
                if (btn) {
                    btn.classList.add('btn-tooltip');
                    btn.setAttribute('data-tooltip', '⚠️ Aún no se establecieron las reglas');
                    btn.style.borderLeft = '3px solid #dc3545';
                }
            }
        }
    } catch (error) {
        console.error("Error verificando reglamento:", error);
    }
}

async function loadParticipantes(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/torneos/${id}/participantes`);
        if (response.ok) {
            const participantes = await response.json();
            const grid = document.querySelector('#participantes-grid');
            
            if (grid) {
                grid.innerHTML = '';
                
                if (participantes.length === 0) {
                    grid.innerHTML = '<p style="color: #8b949e; grid-column: 1/-1;">Aún no hay participantes inscritos.</p>';
                } else {
                    participantes.forEach(p => {
                        const robotName = p.nombreRobot;
                        const competitorName = p.nombreCompetidor;
                        const puntos = p.puntos || 0;
                        const estado = p.estado || 'En espera';
                        
                        let estiloEstado = '';
                        if (estado === 'Participando') {
                            estiloEstado = 'color: #3fb950; border: 1px solid #3fb950;';
                        } else if (estado === 'Eliminado') {
                            estiloEstado = 'color: #f85149; border: 1px solid #f85149;';
                        } else {
                            estiloEstado = 'color: #8b949e; border: 1px solid #30363d;';
                        }
                        
                        const card = document.createElement('div');
                        card.className = 'participant-card';
                        card.style.cssText = 'background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; gap: 10px;';
                        
                        card.innerHTML = `
                            <div class="participant-header" style="display: flex; justify-content: space-between; align-items: start;">
                                <i class="fa-solid fa-robot" style="color: #00bfff; font-size: 1.5em;"></i>
                                <div style="font-size: 0.75em; padding: 2px 8px; border-radius: 12px; ${estiloEstado}">
                                    ${estado}
                                </div>
                            </div>
                            <div class="participant-info">
                                <div class="participant-robot" style="margin-bottom: 4px;">
                                    <strong style="color: #c9d1d9; font-size: 1.1em;">${robotName}</strong>
                                </div>
                                <div class="participant-competitor" style="margin-bottom: 8px;">
                                    <small style="color: #8b949e;">${competitorName}</small>
                                </div>
                                <div class="participant-stats" style="border-top: 1px solid #30363d; padding-top: 8px;">
                                    <span class="stat-item" style="color: #c9d1d9;">
                                        <i class="fa-solid fa-trophy" style="color: #ffd700; margin-right: 5px;"></i> 
                                        <strong>${puntos}</strong> pts
                                    </span>
                                </div>
                            </div>
                        `;
                        grid.appendChild(card);
                    });
                }
            }
        }
    } catch (error) {
        console.error("Error cargando participantes:", error);
    }
}

async function loadEncuentros(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/torneos/${id}/encuentros`);
        if (response.ok) {
            const encuentros = await response.json();
            
            const octavosDivs = document.querySelectorAll('.round.octavos .matchup');
            const cuartosDivs = document.querySelectorAll('.round.cuartos .matchup');
            const semisDivs = document.querySelectorAll('.round.semifinal .matchup');
            
            let finalistLeft = null;
            let finalistRight = null;
            
            encuentros.forEach((encuentro, index) => {
                let targetDiv = null;
                
                if (index < 8) targetDiv = octavosDivs[index];
                else if (index < 12) targetDiv = cuartosDivs[index - 8];
                else if (index < 14) targetDiv = semisDivs[index - 12];
                
                if (targetDiv) {
                    const teamDivs = targetDiv.querySelectorAll('.team');
                    
                    // --- Mostrar Hora ---
                    let timeDisplay = targetDiv.querySelector('.match-time');
                    if (!timeDisplay) {
                        timeDisplay = document.createElement('div');
                        timeDisplay.className = 'match-time';
                        timeDisplay.style.cssText = 'font-size: 0.75em; color: #8b949e; text-align: center; margin-bottom: 4px; letter-spacing: 1px;';
                        targetDiv.insertBefore(timeDisplay, targetDiv.firstChild);
                    }
                    
                    if (encuentro.fechaHora) {
                        const date = new Date(encuentro.fechaHora);
                        const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        timeDisplay.textContent = timeString;
                    } else {
                        timeDisplay.textContent = '';
                    }

                    // --- Renderizar Equipos y Puntajes ---
                    if (teamDivs.length >= 2) {
                        const renderTeam = (div, robotName, puntos, esGanador, esPerdedor) => {
                            if (puntos !== null && puntos !== undefined) {
                                div.innerHTML = `<span style="font-size:1em; color:#ffd700; font-weight:bold; display:block;">${puntos}</span><span style="font-size:0.85em; color:#c9d1d9;">${robotName || 'Esperando...'}</span>`;
                            } else {
                                div.textContent = robotName || 'Esperando...';
                            }
                            
                            div.style.boxShadow = 'none';
                            div.style.borderColor = '#30363d';
                            
                            if (esGanador) {
                                div.style.boxShadow = '0 0 12px rgba(0, 191, 255, 0.6), inset 0 0 8px rgba(0, 191, 255, 0.3)';
                                div.style.borderColor = '#00bfff';
                            } else if (esPerdedor) {
                                div.style.boxShadow = '0 0 12px rgba(248, 81, 73, 0.6), inset 0 0 8px rgba(248, 81, 73, 0.3)';
                                div.style.borderColor = '#f85149';
                            }
                        };

                        const ganadorNombre = encuentro.robotGanador;
                        const esGanadorA = ganadorNombre && ganadorNombre === encuentro.robotA;
                        const esGanadorB = ganadorNombre && ganadorNombre === encuentro.robotB;

                        renderTeam(teamDivs[0], encuentro.robotA, encuentro.puntosRobotA, esGanadorA, esGanadorB);
                        renderTeam(teamDivs[1], encuentro.robotB, encuentro.puntosRobotB, esGanadorB, esGanadorA);

                        if (index === 12 && esGanadorA) finalistLeft = encuentro.robotA;
                        if (index === 12 && esGanadorB) finalistLeft = encuentro.robotB;
                        if (index === 13 && esGanadorA) finalistRight = encuentro.robotA;
                        if (index === 13 && esGanadorB) finalistRight = encuentro.robotB;
                    }
                }
                
                if (index === 14 && encuentro.robotGanador) {
                    const championSlot = document.querySelector('.winner-slot');
                    if (championSlot) {
                        championSlot.textContent = encuentro.robotGanador;
                        championSlot.style.color = '#ffd700';
                        championSlot.style.fontWeight = 'bold';
                        championSlot.style.fontSize = '1.5em';
                    }
                    
                    const finalistsBox = document.querySelector('.finalists-box');
                    if (finalistsBox && (finalistLeft || finalistRight)) {
                        finalistsBox.style.display = 'block';
                        const leftCard = document.querySelector('#finalist-left div:last-child');
                        const rightCard = document.querySelector('#finalist-right div:last-child');
                        if (leftCard) leftCard.textContent = finalistLeft || '???';
                        if (rightCard) rightCard.textContent = finalistRight || '???';
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error cargando encuentros:", error);
    }
}

// ==========================================
// LÓGICA DE SIMULACIÓN (BACKEND DRIVEN)
// ==========================================

// 1. Insertar Competidores
async function iniciarSimulacion(torneoId) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        alert("Debes iniciar sesión (como admin) para realizar esta acción.");
        return;
    }

    const btn = document.getElementById('btn-insertar-competidores');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Insertando...';
    }

    try {
        console.log("Solicitando al backend llenar cupos y generar fixture...");
        const response = await fetch(`${API_BASE_URL}/torneos/${torneoId}/simular-inscripcion`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || "Error al simular inscripción.");
        }
        
        await loadParticipantes(torneoId);
        await loadEncuentros(torneoId);
        
        if (typeof cargarResultadosTab === 'function') cargarResultadosTab(torneoId);
        
        alert("Competidores insertados y fixture generado correctamente.");

    } catch (error) {
        console.error("Error en inserción:", error);
        alert("Error: " + error.message);
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-user-plus"></i> Insertar Competidores';
        }
    }
}

// 2. Iniciar Torneo (Bucle de simulación)
async function iniciarTorneo(torneoId) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        alert('No autenticado');
        return;
    }
    
    const btn = document.getElementById('btn-iniciar-torneo');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Torneo en curso...';
    }

    console.log("Iniciando secuencia de combates...");
    ultimoEncuentroProcesadoId = null; // Resetear variable de control
    procesarSiguienteEncuentro(torneoId, token);
}

// Función recursiva que delega la lógica al backend
async function procesarSiguienteEncuentro(torneoId, token) {
    try {
        // 1. Obtener estado actual
        const response = await fetch(`${API_BASE_URL}/torneos/${torneoId}/encuentros`);
        if (!response.ok) {
            console.error("Error al obtener encuentros del servidor.");
            restaurarBotonInicio();
            return;
        }
        const encuentros = await response.json();
        
        // 2. Buscar el primer encuentro pendiente (con robots pero sin ganador)
        const pendiente = encuentros.find(e => e.robotA && e.robotB && !e.robotGanador);

        if (pendiente) {
            // --- PROTECCIÓN CONTRA BUCLES ---
            // Si el ID del encuentro pendiente es el mismo que acabamos de "simular", 
            // significa que el backend no guardó el resultado (posiblemente por validación de fecha).
            if (pendiente.id === ultimoEncuentroProcesadoId) {
                console.error(`ERROR: El encuentro ${pendiente.id} no se actualizó. Deteniendo simulación.`);
                alert("La simulación se detuvo porque un encuentro no pudo registrar su resultado (posible restricción de horario en el backend).");
                restaurarBotonInicio();
                return;
            }

            console.log(`Simulando encuentro ${pendiente.id} en el backend...`);
            ultimoEncuentroProcesadoId = pendiente.id; // Marcar como procesado

            // 3. Llamar al backend para simular ESTE encuentro específico
            const simResponse = await fetch(`${API_BASE_URL}/torneos/encuentros/${pendiente.id}/simular`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}` 
                }
            });

            if (!simResponse.ok) {
                console.error("El backend devolvió error al simular.");
                // No lanzamos error para permitir que el usuario vea el estado actual, pero detenemos la recursión
                restaurarBotonInicio();
                return;
            }

            // 4. Actualizar UI
            await loadEncuentros(torneoId);
            // Comentado loadParticipantes para reducir carga si hay N+1 queries
            // await loadParticipantes(torneoId); 
            
            if (typeof cargarResultadosTab === 'function') cargarResultadosTab(torneoId);

            // 5. Esperar 500ms (0.5 segundos) antes del siguiente para completar rápido
            setTimeout(() => procesarSiguienteEncuentro(torneoId, token), 1500);
            
        } else {
            // --- NO HAY MÁS ENCUENTROS PENDIENTES ---
            console.log("No hay encuentros pendientes inmediatos.");
            
            // Verificar si hay campeón (último encuentro tiene ganador)
            const finalMatch = encuentros[encuentros.length - 1]; // Asumiendo orden por ID

            if (finalMatch && finalMatch.robotGanador) {
                console.log("Torneo finalizado.");
                
                const btn = document.getElementById('btn-iniciar-torneo');
                if(btn) {
                    btn.innerHTML = '<i class="fa-solid fa-trophy"></i> Torneo Finalizado';
                    btn.classList.remove('btn-primary');
                    btn.style.backgroundColor = '#2ea043'; // Verde
                    btn.disabled = false;
                }
                
                if (typeof cargarResultadosTab === 'function') cargarResultadosTab(torneoId);
                alert("¡El torneo ha finalizado! Se han registrado los resultados.");
            } else {
                // Pausa temporal (esperando siguiente ronda)
                restaurarBotonInicio();
            }
        }
    } catch (error) {
        console.error("Error en el flujo del torneo:", error);
        restaurarBotonInicio();
    }
}

function restaurarBotonInicio() {
    const btn = document.getElementById('btn-iniciar-torneo');
    if(btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-play"></i> Continuar / Reintentar';
    }
}
