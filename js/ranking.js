 const API_BASE_URL = 'http://localhost:8080/api';

// Variables globales para el carrusel
let carouselTournaments = [];
let currentTournamentIndex = 0;

// --- Funciones de Utilidad para Imágenes ---

function hashStringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = (hash % 360 + 360) % 360;
    return `hsl(${hue}, 70%, 50%)`;
}

function getImageUrl(entity, type) {
    // Validación de seguridad por si entity es null/undefined
    if (!entity) {
        return `https://ui-avatars.com/api/?name=Unknown&background=random&color=fff&size=60&bold=true&rounded=true`;
    }

    // 1. Si tiene fotoUrl (de la nube), usarla
    if (entity.fotoUrl && entity.fotoUrl.trim() !== "") {
        return entity.fotoUrl;
    }

    const name = entity.nombre || entity.nombreCompleto || entity.clubNombre || entity.competidor || entity.club || 'Unknown';
    
    // 2. Si es un Robot, usar RoboHash
    if (type === 'robot') {
        return `https://robohash.org/${encodeURIComponent(name)}?set=set1&bg=bg1&size=60x60`;
    }

    // 3. Si es Usuario o Club, usar UI Avatars con iniciales
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=random&color=fff&size=60&bold=true&rounded=true`;
}


document.addEventListener('DOMContentLoaded', () => {
    loadGlobalRanking();
    loadLastTournamentsCarousel();
    loadDailyRanking();
    
    // Configurar botones del carrusel
    const prevCompBtn = document.getElementById('prev-competitors-btn');
    const nextCompBtn = document.getElementById('next-competitors-btn');
    const prevClubBtn = document.getElementById('prev-clubs-btn');
    const nextClubBtn = document.getElementById('next-clubs-btn');

    if(prevCompBtn) prevCompBtn.addEventListener('click', () => prevTournament());
    if(nextCompBtn) nextCompBtn.addEventListener('click', () => nextTournament());
    if(prevClubBtn) prevClubBtn.addEventListener('click', () => prevTournament());
    if(nextClubBtn) nextClubBtn.addEventListener('click', () => nextTournament());
});

async function loadGlobalRanking() {
    try {
        const response = await fetch(`${API_BASE_URL}/ranking/global`);
        if (!response.ok) throw new Error("Error al cargar ranking global");
        
        const data = await response.json();
        renderHighlights(data);
        renderTopLists(data);
        
    } catch (error) {
        console.error("Error:", error);
    }
}

function renderHighlights(data) {
    // Mejor Robot
    if (data.mejorRobot) {
        const card = document.querySelector('a[href*="type=robot"]');
        if (card) {
            card.href = `datosTop.html?type=robot&name=${encodeURIComponent(data.mejorRobot.nombre)}`;
            const img = card.querySelector('img');
            if(img) img.src = getImageUrl(data.mejorRobot, 'robot');
            
            const h3 = card.querySelector('h3');
            if(h3) h3.textContent = data.mejorRobot.nombre;
            
            const p = card.querySelector('p');
            if(p) p.textContent = data.mejorRobot.categoria;
            
            const stat = card.querySelector('.stat h2');
            if(stat) stat.textContent = data.mejorRobot.puntosTotales;
        }
    }

    // Mejor Club
    if (data.mejorClub) {
        const card = document.querySelector('a[href*="type=club"]');
        if (card) {
            card.href = `datosTop.html?type=club&name=${encodeURIComponent(data.mejorClub.nombre)}`;
            const profileDiv = card.querySelector('.profile');
            if(profileDiv) {
                let img = profileDiv.querySelector('img');
                if (!img) {
                    const placeholder = profileDiv.querySelector('.club-placeholder');
                    if(placeholder) placeholder.remove();
                    img = document.createElement('img');
                    profileDiv.prepend(img);
                }
                img.src = getImageUrl(data.mejorClub, 'club');
            }
            
            const h3 = card.querySelector('h3');
            if(h3) h3.textContent = data.mejorClub.nombre;
            
            const p = card.querySelector('p');
            if(p) p.textContent = `${data.mejorClub.totalRobots} Robots Activos`;
            
            const stat = card.querySelector('.stat h2');
            if(stat) stat.textContent = `${data.mejorClub.tasaVictoriasPromedio}%`;
        }
    }

    // Mejor Competidor
    if (data.mejorCompetidor) {
        const card = document.querySelector('a[href*="type=user"]');
        if (card) {
            card.href = `datosTop.html?type=user&name=${encodeURIComponent(data.mejorCompetidor.nombreCompleto)}`;
            const img = card.querySelector('img');
            if(img) img.src = getImageUrl(data.mejorCompetidor, 'user');
            
            const h3 = card.querySelector('h3');
            if(h3) h3.textContent = data.mejorCompetidor.nombreCompleto;
            
            const p = card.querySelector('p');
            if(p) p.textContent = data.mejorCompetidor.clubNombre;
            
            const stat = card.querySelector('.stat h2');
            if(stat) stat.textContent = data.mejorCompetidor.puntosTotales; 
        }
    }
}

function renderTopLists(data) {
    // Top Robots (Puntos)
    const robotsList = document.getElementById('robots-list');
    if (robotsList && data.topRobotsPuntos) {
        robotsList.innerHTML = data.topRobotsPuntos.map((r, i) => `
            <li>
                <a class="ranking-item" href="datosTop.html?type=robot&name=${encodeURIComponent(r.nombre)}">
                    <div class="rank-num">${i + 1}</div>
                    <div style="flex-grow: 1">
                        <strong>${r.nombre}</strong><br>
                        <small style="color: #8b949e">${r.categoria}</small>
                    </div>
                    <div style="text-align: right">
                        <strong>${r.puntosTotales}</strong><br>
                        <small>PUNTOS</small>
                    </div>
                </a>
            </li>
        `).join('');
    }

    // Top Clubes (Puntos)
    const clubsList = document.getElementById('clubs-list');
    if (clubsList && data.topClubesPuntos) {
        clubsList.innerHTML = data.topClubesPuntos.map((c, i) => `
            <li>
                <a class="ranking-item" href="datosTop.html?type=club&name=${encodeURIComponent(c.nombre)}">
                    <div class="rank-num">${i + 1}</div>
                    <div style="flex-grow: 1">
                        <strong>${c.nombre}</strong><br>
                        <small style="color: #8b949e">${c.totalRobots} Robots</small>
                    </div>
                    <div style="text-align: right">
                        <strong>${c.puntosTotales}</strong><br>
                        <small>PUNTOS</small>
                    </div>
                </a>
            </li>
        `).join('');
    }

    // Top Competidores (Puntos)
    const usersList = document.getElementById('users-list');
    if (usersList && data.topCompetidoresPuntos) {
        usersList.innerHTML = data.topCompetidoresPuntos.map((c, i) => `
            <li>
                <a class="ranking-item" href="datosTop.html?type=user&name=${encodeURIComponent(c.nombreCompleto)}">
                    <div class="rank-num">${i + 1}</div>
                    <div style="flex-grow: 1">
                        <strong>${c.nombreCompleto}</strong><br>
                        <small style="color: #8b949e">${c.clubNombre}</small>
                    </div>
                    <div style="text-align: right">
                        <strong>${c.puntosTotales}</strong><br>
                        <small>PUNTOS</small>
                    </div>
                </a>
            </li>
        `).join('');
    }
}

// --- Carrusel de Últimos Torneos ---
async function loadLastTournamentsCarousel() {
    try {
        const torneosResponse = await fetch(`${API_BASE_URL}/torneos`);
        const torneos = torneosResponse.ok ? await torneosResponse.json() : [];
        
        if (torneos.length === 0) {
            showEmptyCarousel();
            return;
        }
        
        // Obtener los últimos 3 torneos
        carouselTournaments = torneos.slice(-3).reverse(); 
        currentTournamentIndex = 0;
        
        // Cargar datos del primer torneo inmediatamente
        await displayCarouselTournament(currentTournamentIndex);
        
    } catch (error) {
        console.error("Error cargando carrusel de torneos:", error);
    }
}

function showEmptyCarousel() {
    const emptyMsg = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #8b949e;">No hay torneos disponibles</td></tr>';
    const compTbody = document.getElementById('competitors-tbody');
    const clubTbody = document.getElementById('clubs-tbody');
    if(compTbody) compTbody.innerHTML = emptyMsg;
    if(clubTbody) clubTbody.innerHTML = emptyMsg;
}

async function displayCarouselTournament(index) {
    if (carouselTournaments.length === 0) return;
    
    const torneo = carouselTournaments[index];
    const torneoId = torneo.id;
    const tournamentName = torneo.nombre;
    
    // Actualizar labels
    const labelComp = document.getElementById('carousel-label-competitors');
    const labelClub = document.getElementById('carousel-label-clubs');
    if(labelComp) labelComp.textContent = `${tournamentName} (${index + 1}/${carouselTournaments.length})`;
    if(labelClub) labelClub.textContent = `${tournamentName} (${index + 1}/${carouselTournaments.length})`;
    
    try {
        const encuentrosResponse = await fetch(`${API_BASE_URL}/torneos/${torneoId}/encuentros`);
        const encuentros = encuentrosResponse.ok ? await encuentrosResponse.json() : [];
        
        const participantesResponse = await fetch(`${API_BASE_URL}/torneos/${torneoId}/participantes`);
        const participantes = participantesResponse.ok ? await participantesResponse.json() : [];
        
        // Procesar competidores
        const competidoresMap = {};
        encuentros.forEach(e => {
            if (e.puntosRobotA !== null) {
                const robotA = e.robotA;
                if (!competidoresMap[robotA]) {
                    competidoresMap[robotA] = { robot: robotA, puntos: 0, competidor: '', fotoUrl: null };
                }
                competidoresMap[robotA].puntos += e.puntosRobotA;
            }
            if (e.puntosRobotB !== null) {
                const robotB = e.robotB;
                if (!competidoresMap[robotB]) {
                    competidoresMap[robotB] = { robot: robotB, puntos: 0, competidor: '', fotoUrl: null };
                }
                competidoresMap[robotB].puntos += e.puntosRobotB;
            }
        });
        
        // Asociar nombres de competidores y fotos
        participantes.forEach(p => {
            let robotName, competitorName, fotoUrl;
            if (typeof p === 'object') {
                robotName = p.nombreRobot;
                competitorName = p.nombreCompetidor;
                fotoUrl = p.fotoUrl; 
            } else if (typeof p === 'string') {
                const match = p.match(/^(.+?)\((.+?)\)$/);
                if (match) {
                    robotName = match[1].trim();
                    competitorName = match[2].trim();
                }
            }
            if (robotName && competidoresMap[robotName]) {
                competidoresMap[robotName].competidor = competitorName;
                if(fotoUrl) competidoresMap[robotName].fotoUrl = fotoUrl;
            }
        });
        
        const topCompetidores = Object.values(competidoresMap)
            .sort((a, b) => b.puntos - a.puntos)
            .slice(0, 5);
        
        // Renderizar tabla competidores
        const competitorsTbody = document.getElementById('competitors-tbody');
        if (competitorsTbody) {
            if (topCompetidores.length > 0) {
                competitorsTbody.innerHTML = topCompetidores.map((c, i) => `
                    <tr style="border-bottom: 1px solid #21262d;">
                        <td style="padding: 12px; color: #ffd700; font-weight: 700;">${i + 1}</td>
                        <td style="padding: 12px; color: #c9d1d9;">
                            <img src="${getImageUrl({nombre: c.competidor, fotoUrl: c.fotoUrl}, 'user')}" alt="${c.competidor}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; vertical-align: middle;">
                            ${c.competidor || 'N/A'}
                        </td>
                        <td style="padding: 12px; color: #8b949e;">${c.robot}</td>
                        <td style="padding: 12px; color: #8b949e;">Robot</td>
                        <td style="padding: 12px; text-align: center; color: #00bfff; font-weight: 600;">${c.puntos.toFixed(1)}</td>
                    </tr>
                `).join('');
            } else {
                competitorsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #8b949e;">No hay datos disponibles para este torneo</td></tr>';
            }
        }
        
        // Procesar clubes
        const clubsMap = {};
        topCompetidores.forEach(c => {
            const clubName = "Club " + (c.competidor ? c.competidor.split(' ')[0] : 'General');
            if (!clubsMap[clubName]) {
                clubsMap[clubName] = { club: clubName, puntos: 0, robots: new Set(), fotoUrl: null };
            }
            clubsMap[clubName].puntos += c.puntos;
            clubsMap[clubName].robots.add(c.robot);
        });
        
        const topClubs = Object.values(clubsMap)
            .sort((a, b) => b.puntos - a.puntos)
            .slice(0, 5)
            .map(c => ({ ...c, robots: c.robots.size }));
        
        // Renderizar tabla clubes
        const clubsTbody = document.getElementById('clubs-tbody');
        if (clubsTbody) {
            if (topClubs.length > 0) {
                clubsTbody.innerHTML = topClubs.map((c, i) => `
                    <tr style="border-bottom: 1px solid #21262d;">
                        <td style="padding: 12px; color: #ffd700; font-weight: 700;">${i + 1}</td>
                        <td style="padding: 12px; color: #c9d1d9;">
                            <img src="${getImageUrl({nombre: c.club, fotoUrl: c.fotoUrl}, 'club')}" alt="${c.club}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; vertical-align: middle;">
                            ${c.club}
                        </td>
                        <td style="padding: 12px; text-align: center; color: #00bfff; font-weight: 600;">${c.puntos.toFixed(1)}</td>
                        <td style="padding: 12px; text-align: center; color: #8b949e;">${c.robots}</td>
                    </tr>
                `).join('');
            } else {
                clubsTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #8b949e;">No hay datos disponibles para este torneo</td></tr>';
            }
        }
        
    } catch (error) {
        console.error("Error cargando datos del carrusel:", error);
    }
}

function prevTournament() {
    if (carouselTournaments.length === 0) return;
    currentTournamentIndex = (currentTournamentIndex - 1 + carouselTournaments.length) % carouselTournaments.length;
    displayCarouselTournament(currentTournamentIndex);
}

function nextTournament() {
    if (carouselTournaments.length === 0) return;
    currentTournamentIndex = (currentTournamentIndex + 1) % carouselTournaments.length;
    displayCarouselTournament(currentTournamentIndex);
}

// --- Ranking Diario ---
async function loadDailyRanking() {
    try {
        const response = await fetch(`${API_BASE_URL}/ranking/diario`);
        if (!response.ok) throw new Error("Error al cargar ranking diario");
        
        const data = await response.json();
        
        // Actualizar título con el mensaje del backend
        const title = document.querySelector('.daily-ranking h2');
        if(title && data.mensaje) title.innerHTML = `<i class="fa-solid fa-calendar-day" style="color: #00bfff; margin-right: 10px;"></i> ${data.mensaje}`;

        // Renderizar Competidores
        const dailyCompetitorsTbody = document.getElementById('daily-competitors-tbody');
        if (dailyCompetitorsTbody) {
            if (data.topCompetidores && data.topCompetidores.length > 0) {
                dailyCompetitorsTbody.innerHTML = data.topCompetidores.map((c, i) => `
                    <tr style="border-bottom: 1px solid #21262d;">
                        <td style="padding: 12px; color: #ffd700; font-weight: 700;">${i + 1}</td>
                        <td style="padding: 12px; color: #c9d1d9;">
                            <img src="${getImageUrl({nombre: c.nombreCompleto, fotoUrl: c.fotoUrl}, 'user')}" alt="${c.nombreCompleto}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; vertical-align: middle;">
                            ${c.nombreCompleto}
                        </td>
                        <td style="padding: 12px; color: #8b949e;">Robot</td>
                        <td style="padding: 12px; color: #8b949e;">General</td>
                        <td style="padding: 12px; text-align: center; color: #00bfff; font-weight: 600;">${c.puntosTotales}</td>
                    </tr>
                `).join('');
            } else {
                dailyCompetitorsTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #8b949e;">Sin puntos registrados hoy</td></tr>';
            }
        }

        // Renderizar Clubes
        const dailyClubsTbody = document.getElementById('daily-clubs-tbody');
        if (dailyClubsTbody) {
            if (data.topClubes && data.topClubes.length > 0) {
                dailyClubsTbody.innerHTML = data.topClubes.map((c, i) => `
                    <tr style="border-bottom: 1px solid #21262d;">
                        <td style="padding: 12px; color: #ffd700; font-weight: 700;">${i + 1}</td>
                        <td style="padding: 12px; color: #c9d1d9;">
                            <img src="${getImageUrl({nombre: c.nombre, fotoUrl: c.fotoUrl}, 'club')}" alt="${c.nombre}" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 8px; vertical-align: middle;">
                            ${c.nombre}
                        </td>
                        <td style="padding: 12px; text-align: center; color: #00bfff; font-weight: 600;">${c.puntosTotales}</td>
                        <td style="padding: 12px; text-align: center; color: #8b949e;">${c.totalRobots}</td>
                    </tr>
                `).join('');
            } else {
                dailyClubsTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #8b949e;">Sin puntos registrados hoy</td></tr>';
            }
        }
        
    } catch (error) {
        console.error("Error cargando ranking diario:", error);
    }
}