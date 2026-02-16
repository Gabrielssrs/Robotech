const API_BASE_URL = 'https://robotech-back.onrender.com/api';
let currentEncuentro = null;
let robotBlueId = null;
let robotRedId = null;

// Variables del Cronómetro
let timerInterval = null;
let timeRemaining = 600; // 10 minutos en segundos
let isTimerRunning = false;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const encuentroId = urlParams.get('encuentroId'); // O 'torneoId' si vienes del perfil y buscas el activo

    if (!encuentroId) {
        Swal.fire('Error', 'No se especificó un encuentro.', 'error')
            .then(() => window.location.href = 'perfil-juez.html');
        return;
    }

    loadEncuentroData(encuentroId);
    
    // Iniciar polling de jueces cada 5 segundos
    setInterval(() => loadJudgeStatus(encuentroId), 5000);

    // Listeners de Inputs para validar rango 0-20
    setupScoreInput('score-blue');
    setupScoreInput('score-red');

    // Botones
    document.getElementById('btn-finalize').addEventListener('click', () => finalizarCombate(encuentroId));
    document.getElementById('btn-toggle-timer').addEventListener('click', toggleTimer);
});

function setupScoreInput(id) {
    const input = document.getElementById(id);
    input.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 20) val = 20;
        e.target.value = val;
    });
}

async function loadEncuentroData(encuentroId) {
    const token = localStorage.getItem('jwtToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        // Si tienes un endpoint específico para detalles de encuentro, úsalo.
        // Aquí asumo el estándar /torneos/encuentros/{id}
        const response = await fetch(`${API_BASE_URL}/torneos/encuentros/${encuentroId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Error al cargar el encuentro");

        currentEncuentro = await response.json();
        renderEncuentro(currentEncuentro);
        loadJudgeStatus(encuentroId); // Carga inicial

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'No se pudo cargar la información del encuentro.', 'error');
    }
}

function renderEncuentro(encuentro) {
    const blueSection = document.querySelector('.team.blue');
    const redSection = document.querySelector('.team.red');

    blueSection.querySelector('h2').textContent = encuentro.robotA;
    robotBlueId = encuentro.robotAId;

    redSection.querySelector('h2').textContent = encuentro.robotB;
    robotRedId = encuentro.robotBId;

    document.querySelector('.event-title h3').textContent = `Encuentro #${encuentro.id}`;
}

function addPoints(team, points) {
    const inputId = team === 'blue' ? 'score-blue' : 'score-red';
    const input = document.getElementById(inputId);
    let currentVal = parseInt(input.value) || 0;
    
    let newVal = currentVal + points;
    
    // Validar rango 0-20
    if (newVal < 0) newVal = 0;
    if (newVal > 20) newVal = 20;
    
    input.value = newVal;

    // Log visual
    let reason = points > 0 ? "PUNTOS" : "FALTA";
    if (points === 1) reason = "IMPACTO";
    else if (points === 5) reason = "DAÑO CRÍTICO";
    
    const robotName = team === 'blue' ? currentEncuentro.robotA : currentEncuentro.robotB;
    logEvent(robotName, points, reason);
}

function logEvent(robotName, points, reason) {
    const log = document.getElementById('event-log');
    const entry = document.createElement('li');
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    const colorClass = points < 0 ? 'style="color: #ff4b4b;"' : '';
    const sign = points > 0 ? '+' : '';

    entry.innerHTML = `<span>${timeStr}</span> ${robotName} <small>(${reason})</small> <strong ${colorClass}>${sign}${points}</strong>`;
    log.prepend(entry);
}

// --- Lógica del Cronómetro ---
function toggleTimer() {
    const btn = document.getElementById('btn-toggle-timer');
    if (isTimerRunning) {
        clearInterval(timerInterval);
        isTimerRunning = false;
        btn.textContent = "Reanudar";
        btn.classList.remove('active');
    } else {
        timerInterval = setInterval(updateTimer, 1000);
        isTimerRunning = true;
        btn.textContent = "Pausar";
        btn.classList.add('active');
    }
}

function updateTimer() {
    if (timeRemaining > 0) {
        timeRemaining--;
        const minutes = Math.floor(timeRemaining / 60);
        const seconds = timeRemaining % 60;
        document.getElementById('timer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        clearInterval(timerInterval);
        isTimerRunning = false;
        document.getElementById('match-status').textContent = "TIEMPO FINALIZADO";
        document.getElementById('match-status').style.color = "#ff4b4b";
        Swal.fire('Tiempo Terminado', 'El combate ha finalizado por tiempo.', 'info');
    }
}

// --- Estado de Jueces (Polling) ---
async function loadJudgeStatus(encuentroId) {
    const token = localStorage.getItem('jwtToken');
    try {
        const response = await fetch(`${API_BASE_URL}/torneos/encuentros/${encuentroId}/estado-jueces`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const jueces = await response.json();
            renderJudgeStatus(jueces);
        }
    } catch (e) {
        console.error("Error polling jueces", e);
    }
}

function renderJudgeStatus(jueces) {
    const container = document.getElementById('judges-grid');
    container.innerHTML = '';
    
    jueces.forEach(j => {
        const div = document.createElement('div');
        div.className = `judge-box ${j.listo ? 'ready' : ''}`;
        const icon = j.listo ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-clock"></i>';
        div.innerHTML = `${icon} ${j.nombre}`;
        container.appendChild(div);
    });
}

// --- Finalizar ---
async function finalizarCombate(encuentroId) {
    const scoreBlue = parseInt(document.getElementById('score-blue').value);
    const scoreRed = parseInt(document.getElementById('score-red').value);

    const result = await Swal.fire({
        title: '¿Finalizar Combate?',
        html: `Se enviarán los siguientes puntajes:<br>
               <b>${currentEncuentro.robotA}:</b> ${scoreBlue}<br>
               <b>${currentEncuentro.robotB}:</b> ${scoreRed}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, enviar',
        cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    const token = localStorage.getItem('jwtToken');
    
    // Enviar calificación Robot A
    const reqA = fetch(`${API_BASE_URL}/torneos/calificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ encuentroId: encuentroId, robotId: robotBlueId, puntaje: scoreBlue })
    });

    // Enviar calificación Robot B
    const reqB = fetch(`${API_BASE_URL}/torneos/calificar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ encuentroId: encuentroId, robotId: robotRedId, puntaje: scoreRed })
    });

    try {
        Swal.fire({ title: 'Enviando...', didOpen: () => Swal.showLoading() });
        await Promise.all([reqA, reqB]);
        
        await Swal.fire('Enviado', 'Tus calificaciones han sido registradas.', 'success');
        
        // Recargar estado de jueces para ver mi propio check verde
        loadJudgeStatus(encuentroId);
        
        // Opcional: Redirigir
        // window.location.href = 'perfil-juez.html';

    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Hubo un problema al enviar las calificaciones.', 'error');
    }
}
