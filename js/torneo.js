const API_BASE_URL = 'https://robotech-back.onrender.com/api';
let allTorneos = [];
let userRobotCategories = new Set(); // Para almacenar nombres de categorías de los robots del usuario
let enrolledTorneoIds = new Set(); // NUEVO: Para almacenar IDs de torneos donde ya está inscrito

document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    loadData();
});

async function loadData() {
    const token = localStorage.getItem('jwtToken');
    const isCompetitor = checkIsCompetitor(token);

    try {
        // 1. Obtener Torneos (Endpoint público)
        console.log("Cargando torneos...");
        const response = await fetch(`${API_BASE_URL}/torneos`);
        if (response.ok) {
            allTorneos = await response.json();
            console.log("Torneos cargados:", allTorneos);
        } else {
            console.error("Error al cargar torneos:", response.status);
            document.getElementById('tournament-container').innerHTML = '<p style="text-align:center; width:100%;">Error al cargar los torneos.</p>';
            return;
        }

        // 2. Si es competidor, obtener sus robots y sus inscripciones
        if (isCompetitor && token) {
            try {
                // A. Obtener Robots para categorías
                const robotsRes = await fetch(`${API_BASE_URL}/robots/mis-robots`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (robotsRes.ok) {
                    const robots = await robotsRes.json();
                    robots.forEach(r => {
                        if (r.categoria && r.categoria.nombre) {
                            userRobotCategories.add(r.categoria.nombre);
                        }
                    });
                }

                // B. Obtener Torneos donde ya está inscrito (NUEVO)
                const inscripcionesRes = await fetch(`${API_BASE_URL}/torneos/mis-inscripciones`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (inscripcionesRes.ok) {
                    const inscripciones = await inscripcionesRes.json();
                    inscripciones.forEach(t => enrolledTorneoIds.add(t.id));
                }

            } catch (e) {
                console.error("Error fetching user data", e);
            }
        }

        // 3. Ordenar y Renderizar
        const sortedTorneos = sortTorneos(allTorneos, isCompetitor);
        renderTorneos(sortedTorneos);

    } catch (error) {
        console.error("Error loading data:", error);
        const container = document.getElementById('tournament-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align:center; width:100%; padding: 40px;">
                    <i class="fa-solid fa-triangle-exclamation" style="font-size: 3rem; color: #dc3545; margin-bottom: 15px;"></i>
                    <p style="font-size: 1.1rem; color: #ccc;">No se pudo conectar con el servidor.</p>
                    <p style="color: #8b949e; font-size: 0.9rem;">Asegúrate de que el backend esté encendido en el puerto 8080.</p>
                </div>
            `;
        }
    }
}

function checkIsCompetitor(token) {
    if (!token) return false;
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        const payload = JSON.parse(jsonPayload);
        return payload.roles && payload.roles.includes('ROLE_COMPETIDOR');
    } catch (e) {
        return false;
    }
}

function sortTorneos(torneos, isCompetitor) {
    if (!torneos) return [];
    return [...torneos].sort((a, b) => {
        // 1. Prioridad Competidor: Coincidencia de Categoría
        if (isCompetitor) {
            const aMatches = hasMatchingCategory(a);
            const bMatches = hasMatchingCategory(b);
            // Si a coincide y b no, a va primero (-1)
            if (aMatches && !bMatches) return -1;
            // Si b coincide y a no, b va primero (1)
            if (!aMatches && bMatches) return 1;
        }

        // 2. Prioridad Estado: EN_CURSO > PROXIMAMENTE > FINALIZADO
        const statusOrder = { 'EN_CURSO': 1, 'PROXIMAMENTE': 2, 'FINALIZADO': 3, 'CANCELADO': 4 };
        const scoreA = statusOrder[a.estado] || 99;
        const scoreB = statusOrder[b.estado] || 99;
        
        if (scoreA !== scoreB) return scoreA - scoreB;

        // 3. Prioridad Fecha: Más cercano primero
        return new Date(a.fechaInicio) - new Date(b.fechaInicio);
    });
}

function hasMatchingCategory(torneo) {
    if (!torneo.categorias || torneo.categorias.length === 0) return false;
    return torneo.categorias.some(catName => userRobotCategories.has(catName));
}

function renderTorneos(torneos) {
    const container = document.getElementById('tournament-container');
    
    if (!torneos || torneos.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%;">No hay torneos disponibles en este momento.</p>';
        return;
    }

    container.innerHTML = torneos.map(t => {
        const statusMap = {
            'EN_CURSO': { label: 'En vivo', type: 'red', btn: 'Ver transmisión', btnClass: 'btn-cyan' },
            'PROXIMAMENTE': { label: 'Próximo', type: 'yellow', btn: 'Ver detalles', btnClass: 'btn-outline' },
            'FINALIZADO': { label: 'Finalizado', type: 'grey', btn: 'Ver resultados', btnClass: 'btn-outline' },
            'CANCELADO': { label: 'Cancelado', type: 'grey', btn: 'Detalles', btnClass: 'btn-outline' }
        };

        const uiStatus = statusMap[t.estado] || statusMap['PROXIMAMENTE'];
        
        let fecha = 'Fecha pendiente';
        if (t.fechaInicio) {
            const dateObj = new Date(t.fechaInicio + 'T00:00:00'); 
            if (!isNaN(dateObj)) {
                fecha = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
            } else {
                fecha = t.fechaInicio;
            }
        }
        
        const img = `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=60&id=${t.id}`;
        const tags = [t.nombreSede, ...(t.categorias || [])].slice(0, 3);

        // Lógica de botones
        let btnLabel = uiStatus.btn;
        let btnClass = uiStatus.btnClass;
        let btnHref = `detalle_Torneo.html?id=${t.id}`; // Enlace por defecto
        
        // Verificar si es competidor
        if (checkIsCompetitor(localStorage.getItem('jwtToken'))) {
            // Caso 1: Ya está inscrito -> Botón "Ver Torneo"
            if (enrolledTorneoIds.has(t.id)) {
                btnLabel = "Ver Torneo";
                btnClass = "btn-outline"; // O un estilo diferente si prefieres
                btnHref = `vista-torneo.html?id=${t.id}`; // Redirige a la vista del torneo
            } 
            // Caso 2: No inscrito, torneo próximo y categoría coincide -> Botón "Inscribirse"
            else if (t.estado === 'PROXIMAMENTE' && hasMatchingCategory(t)) {
                btnLabel = "Inscribirse";
                btnClass = "btn-main";
            }
        }

        return `
        <div class="t-card">
            <div class="card-img-wrapper">
                <img src="${img}" alt="${t.nombre}">
                <div class="status-badge">
                    <span class="dot ${uiStatus.type}"></span> ${uiStatus.label}
                </div>
            </div>
            <div class="card-content">
                <div class="tags">
                    ${tags.map((tag, i) => `<span class="tag ${i===0?'blue':''}">${tag}</span>`).join('')}
                </div>
                <h3>${t.nombre}</h3>
                <div class="info-grid">
                    <span><i class="fa-regular fa-calendar"></i> ${fecha}</span>
                    <span><i class="fa-solid fa-location-dot"></i> ${t.nombreSede || 'Sede por definir'}</span>
                </div>
                <a href="${btnHref}" class="btn-card ${btnClass}">
                    ${btnLabel}
                </a>
            </div>
        </div>
    `}).join('');
}

function filterTorneos(filterType) {
    const token = localStorage.getItem('jwtToken');
    const isCompetitor = checkIsCompetitor(token);
    
    let filtered = [];
    
    if (filterType === 'todos') {
        filtered = allTorneos;
    } else if (filterType === 'en-vivo') {
        filtered = allTorneos.filter(t => t.estado === 'EN_CURSO');
    } else if (filterType === 'proximos') {
        filtered = allTorneos.filter(t => t.estado === 'PROXIMAMENTE');
    } else if (filterType === 'finalizados') {
        filtered = allTorneos.filter(t => t.estado === 'FINALIZADO');
    }

    const sorted = sortTorneos(filtered, isCompetitor);
    renderTorneos(sorted);

    document.querySelectorAll('.filter-tabs .tab').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(filterType)) {
            btn.classList.add('active');
        }
    });
}

function checkUserSession() {
    const token = localStorage.getItem('jwtToken');
    
    if (token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const payload = JSON.parse(jsonPayload);

            if (payload.roles && payload.roles.includes('ROLE_COMPETIDOR')) {
                const navLinks = document.getElementById('nav-links');
                if (navLinks) {
                    navLinks.innerHTML = `
                        <li><a href="index.html">Inicio</a></li>
                        <li><a href="torneo.html" class="active">Torneos</a></li>
                        <li><a href="ranking.html">Ranking</a></li>
                        <li><a href="noticias.html">Noticias</a></li>
                        <li class="nav-profile-name"><a href="perfil_competidor.html" style="color: #00bfff; text-decoration: none;">Mi Perfil</a></li>
                        <li><a href="login.html" class="btn-logout" onclick="localStorage.removeItem('jwtToken');">Cerrar Sesión</a></li>
                    `;
                }
            }
        } catch (e) {
            console.error("Error al procesar la sesión:", e);
        }
    }
}
