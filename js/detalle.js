const API_BASE_URL = 'https://robotech-back.onrender.com/api';
let currentTorneo = null;

document.addEventListener('DOMContentLoaded', () => {
    checkUserSession();
    
    // Obtener ID del torneo de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const torneoId = urlParams.get('id');

    if (torneoId) {
        loadTournamentDetails(torneoId);
    } else {
        document.body.innerHTML = '<h1 style="color:white; text-align:center; margin-top:50px;">Torneo no especificado</h1>';
    }

    // Event Listeners para el modal
    const modal = document.getElementById('inscription-modal');
    const btnInscribirse = document.getElementById('btn-inscribirse');
    const spanClose = document.getElementById('close-modal-btn');

    if (btnInscribirse) {
        btnInscribirse.onclick = () => openRegistrationModal();
    }

    if (spanClose) {
        spanClose.onclick = () => modal.style.display = "none";
    }

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // Manejar envío del formulario (Simulado por ahora, ya que no hay endpoint de inscripción en el backend proporcionado)
    const form = document.getElementById('inscription-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const robotId = document.getElementById('robot-select').value;
            if (robotId) {
                try {
                    const response = await fetch(`${API_BASE_URL}/torneos/${currentTorneo.id}/inscripcion`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
                        },
                        body: JSON.stringify({ robotId: parseInt(robotId) })
                    });

                    if (response.ok) {
                        window.location.href = `vista_torneo.html?id=${currentTorneo.id}`;
                    } else {
                        try {
                            const data = await response.json();
                            alert(data.message || "Error al inscribir");
                        } catch (e) {
                            console.error("Error parsing JSON response", e);
                            alert("Ocurrió un error en el servidor. Por favor intenta más tarde.");
                        }
                    }
                } catch (error) {
                    console.error(error);
                    alert("Error de conexión");
                }
            }
        });
    }
});

async function loadTournamentDetails(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/torneos/${id}`);
        if (response.ok) {
            currentTorneo = await response.json();
            renderTournament(currentTorneo);
        } else {
            console.error("Torneo no encontrado");
            document.getElementById('t-nombre').textContent = "Torneo no encontrado";
        }
    } catch (e) {
        console.error("Error loading tournament", e);
    }
}

function renderTournament(torneo) {
    document.getElementById('t-nombre').textContent = torneo.nombre;
    document.getElementById('t-descripcion').textContent = torneo.descripcion || "Sin descripción disponible.";
    
    // Fechas
    const fechaInicio = new Date(torneo.fechaInicio).toLocaleDateString();
    document.getElementById('t-fecha').textContent = fechaInicio;
    document.getElementById('t-fecha-inicio').textContent = fechaInicio;

    // Sede
    document.getElementById('t-sede').textContent = torneo.nombreSede;
    // document.getElementById('t-direccion').textContent = torneo.direccionSede || ""; // Si el DTO tuviera dirección

    // Estado
    document.getElementById('t-estado').innerHTML = `<i class="fa-solid fa-trophy"></i> ${torneo.estado}`;
    document.getElementById('t-status-text').textContent = torneo.estado;

    // Categorías
    if (torneo.categorias && torneo.categorias.length > 0) {
        document.getElementById('t-categorias').textContent = torneo.categorias.join(', ');
    } else {
        document.getElementById('t-categorias').textContent = "General";
    }

    const btnVerTorneo = document.getElementById('btn-ver-torneo');
    if (btnVerTorneo) {
        btnVerTorneo.href = `vista-torneo.html?id=${torneo.id}`;
    }
}

async function openRegistrationModal() {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        // Si no está logueado, redirigir a login
        window.location.href = 'login.html';
        return;
    }

    // Verificar si es competidor
    if (!checkIsCompetitor(token)) {
        alert("Solo los competidores registrados pueden inscribirse.");
        return;
    }

    const modal = document.getElementById('inscription-modal');
    const select = document.getElementById('robot-select');
    const feedback = document.getElementById('modal-feedback');
    
    select.innerHTML = '<option value="" disabled selected>Cargando robots...</option>';
    feedback.textContent = '';
    modal.style.display = "block";

    try {
        const response = await fetch(`${API_BASE_URL}/robots/mis-robots`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const robots = await response.json();
            
            // Filtrar robots compatibles con las categorías del torneo
            const validRobots = robots.filter(r => {
                if (!r.categoria || !r.categoria.nombre) return false;
                if (!currentTorneo.categorias || currentTorneo.categorias.length === 0) return false;

                // Normalizar para comparar (trim y toUpperCase) para evitar errores por mayúsculas/espacios
                const robotCat = r.categoria.nombre.trim().toUpperCase();
                return currentTorneo.categorias.some(catName => 
                    catName.trim().toUpperCase() === robotCat
                );
            });

            select.innerHTML = '<option value="" disabled selected>Seleccione un robot...</option>';
            
            if (validRobots.length === 0) {
                const option = document.createElement('option');
                option.disabled = true;
                option.textContent = "No tienes robots compatibles con este torneo";
                select.appendChild(option);
                feedback.textContent = `Este torneo solo admite: ${currentTorneo.categorias.join(', ')}.`;
                feedback.style.color = 'orange';
            } else {
                validRobots.forEach(r => {
                    const option = document.createElement('option');
                    option.value = r.id;
                    option.textContent = `${r.nombre} (${r.categoria.nombre})`;
                    select.appendChild(option);
                });
            }
        } else {
            select.innerHTML = '<option value="" disabled>Error al cargar robots</option>';
        }
    } catch (e) {
        console.error("Error fetching robots", e);
        select.innerHTML = '<option value="" disabled>Error de conexión</option>';
    }
}

function checkIsCompetitor(token) {
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

function checkUserSession() {
    const token = localStorage.getItem('jwtToken');
    if (token && checkIsCompetitor(token)) {
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
}

function switchTab(event, tabName) {
    const tabs = document.querySelectorAll('.tab-item');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.currentTarget.classList.add('active');
    // Lógica para mostrar/ocultar contenido de tabs si existiera en el HTML
}