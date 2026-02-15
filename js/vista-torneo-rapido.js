document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const torneoId = urlParams.get('id');
    const token = localStorage.getItem('jwtToken');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';

    if (!torneoId) {
        Swal.fire('Error', 'No se especificó un torneo.', 'error');
        return;
    }

    // Elementos del DOM
    const btnInsertar = document.getElementById('btn-insertar-competidores');
    const btnIniciar = document.getElementById('btn-iniciar-torneo');
    const bracketContainer = document.querySelector('.bracket-container');

    // 1. Verificar Rol para mostrar botones
    if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const roles = payload.roles || [];
        // Ajusta según cómo venga el rol en tu token (string o array)
        const isAdmin = roles.includes('ROLE_ADM_SISTEMA') || roles.some(r => r.authority === 'ROLE_ADM_SISTEMA');
        
        if (!isAdmin) {
            if(btnInsertar) btnInsertar.style.display = 'none';
            if(btnIniciar) btnIniciar.style.display = 'none';
        }
    } else {
        if(btnInsertar) btnInsertar.style.display = 'none';
        if(btnIniciar) btnIniciar.style.display = 'none';
    }

    // 2. Cargar Datos del Torneo y Encuentros
    cargarDatosTorneo();

    async function cargarDatosTorneo() {
        try {
            // Cargar info básica
            const respTorneo = await fetch(`${API_BASE_URL}/torneos/${torneoId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const torneo = await respTorneo.json();
            document.querySelector('.tournament-info h3').textContent = torneo.nombre;

            // Cargar encuentros
            const respEncuentros = await fetch(`${API_BASE_URL}/torneos/${torneoId}/encuentros`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const encuentros = await respEncuentros.json();
            
            renderizarBracket(encuentros);

        } catch (error) {
            console.error('Error cargando datos:', error);
        }
    }

    // 3. Renderizar Bracket
    function renderizarBracket(encuentros) {
        // Mapeo de índices de encuentros a elementos del DOM según tu HTML
        // Octavos: 0-7, Cuartos: 8-11, Semis: 12-13, Final: 14
        
        const octavosDivs = document.querySelectorAll('.round.octavos .matchup');
        const cuartosDivs = document.querySelectorAll('.round.cuartos .matchup');
        const semisDivs = document.querySelectorAll('.round.semifinal .matchup');
        const finalDiv = document.querySelector('.champion-card .winner-slot'); // Solo muestra campeón

        // Limpiar visualmente antes de llenar
        document.querySelectorAll('.team').forEach(el => {
            el.innerHTML = '';
            el.classList.remove('winner', 'loser');
            el.style.backgroundColor = ''; // Reset
        });

        encuentros.forEach((encuentro, index) => {
            let domElement = null;
            let isFinal = false;

            // Determinar dónde va este encuentro en el HTML
            if (index < 8) { // Octavos (8 partidos)
                // El HTML tiene 4 a la izquierda y 4 a la derecha.
                // Asumimos orden: 0-3 izq, 4-7 der (o según como venga del backend)
                // Tu HTML tiene dos .round.octavos (uno en side-left y otro en side-right)
                // Vamos a seleccionar todos los .matchup dentro de .octavos globalmente
                domElement = octavosDivs[index];
            } else if (index < 12) { // Cuartos (4 partidos)
                domElement = cuartosDivs[index - 8];
            } else if (index < 14) { // Semis (2 partidos)
                domElement = semisDivs[index - 12];
            } else { // Final
                isFinal = true;
            }

            if (domElement) {
                const teamA = domElement.children[0];
                const teamB = domElement.children[1];
                
                llenarEquipo(teamA, encuentro.robotA, encuentro.puntosRobotA, encuentro.ganador === encuentro.robotA);
                llenarEquipo(teamB, encuentro.robotB, encuentro.puntosRobotB, encuentro.ganador === encuentro.robotB);
            }

            if (isFinal && encuentro.ganador) {
                finalDiv.textContent = encuentro.ganador;
                finalDiv.style.color = '#ffd700';
                finalDiv.style.fontWeight = 'bold';
            }
        });
    }

    function llenarEquipo(div, nombre, puntos, esGanador) {
        if (!nombre) {
            div.textContent = '---';
            return;
        }
        
        div.innerHTML = `
            <span class="name">${nombre}</span>
            ${puntos !== null ? `<span class="points" style="float:right; font-weight:bold;">${puntos}</span>` : ''}
        `;

        if (esGanador) {
            div.style.borderLeft = '4px solid #2ea44f'; // Verde
            div.style.backgroundColor = 'rgba(46, 164, 79, 0.1)';
        } else if (puntos !== null) { // Perdedor (si ya hubo puntos)
            div.style.borderLeft = '4px solid #ff4d4d'; // Rojo
            div.style.backgroundColor = 'rgba(255, 77, 77, 0.1)';
        }
    }

    // 4. Botón Insertar Competidores
    if (btnInsertar) {
        btnInsertar.addEventListener('click', async () => {
            try {
                Swal.fire({ title: 'Insertando...', didOpen: () => Swal.showLoading() });
                
                const res = await fetch(`${API_BASE_URL}/torneos/${torneoId}/simular-inscripcion`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    Swal.fire('Éxito', 'Competidores insertados y fixture generado.', 'success')
                        .then(() => location.reload());
                } else {
                    const err = await res.json();
                    Swal.fire('Error', err.message || 'No se pudo insertar.', 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Fallo de conexión', 'error');
            }
        });
    }

    // 5. Botón Iniciar (Simulación Rápida)
    if (btnIniciar) {
        btnIniciar.addEventListener('click', async () => {
            try {
                const confirm = await Swal.fire({
                    title: '¿Iniciar Simulación Rápida?',
                    text: 'Esto completará el torneo automáticamente. Asegúrese de haber calificado el primer encuentro manualmente.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, iniciar',
                    cancelButtonText: 'Cancelar'
                });

                if (confirm.isConfirmed) {
                    Swal.fire({ title: 'Simulando torneo...', text: 'Esto puede tomar unos segundos.', didOpen: () => Swal.showLoading() });

                    const res = await fetch(`${API_BASE_URL}/torneos/${torneoId}/simular-completo`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.ok) {
                        Swal.fire('Torneo Finalizado', 'Todos los encuentros han sido simulados.', 'success')
                            .then(() => location.reload());
                    } else {
                        const err = await res.json();
                        Swal.fire('No se pudo iniciar', err.message, 'error');
                    }
                }
            } catch (e) {
                Swal.fire('Error', 'Fallo de conexión', 'error');
            }
        });
    }
});
