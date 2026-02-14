document.addEventListener('DOMContentLoaded', function () {
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';
    const indexItems = document.querySelectorAll('#docIndex li');
    const sections = Array.from(document.querySelectorAll('.doc-body section'));
    
    // Obtener ID del torneo
    const urlParams = new URLSearchParams(window.location.search);
    const torneoId = urlParams.get('id');

    // Estado de edición
    let isEditing = false;
    let currentSectionId = null;

    // ============ SEGURIDAD Y ROLES ============
    function getUserRole() {
        const token = localStorage.getItem('jwtToken');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            // Busca en 'authorities' o 'roles' según tu configuración JWT
            const authorities = payload.authorities || payload.roles || [];
            // Si authorities es un array de objetos [{authority: "ROLE_..."}], mapealo
            if (authorities.length > 0 && typeof authorities[0] === 'object') {
                return authorities.map(a => a.authority);
            }
            return authorities;
        } catch (e) {
            return null;
        }
    }

    const roles = getUserRole();
    const isAdmin = roles && roles.includes('ROLE_ADM_SISTEMA');

    // Configurar botones de "Volver" según el rol
    const backButtons = document.querySelectorAll('.btn-back, a[href="admintorneo.html"]');
    backButtons.forEach(btn => {
        if (isAdmin) {
            btn.href = 'admintorneo.html';
        } else {
            // Si es competidor o usuario general, volver a la vista del torneo
            btn.href = `vista-torneo.html?id=${torneoId}`;
            btn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Volver al Torneo';
        }
    });

    // Configurar visibilidad del botón de agregar
    const btnAddRules = document.getElementById('btn-add-rules');
    if (btnAddRules) {
        if (isAdmin) {
            btnAddRules.style.display = 'inline-flex'; // Mostrar si es admin
        } else {
            btnAddRules.style.display = 'none'; // Ocultar si no
        }
    }

    // ============ CARGA DE DATOS ============
    if (torneoId) {
        loadTournamentInfo(torneoId);
        loadRegulations(torneoId);
    }

    async function loadTournamentInfo(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/torneos/${id}`);
            if (response.ok) {
                const torneo = await response.json();
                document.getElementById('tournament-name').textContent = torneo.nombre || 'Torneo sin nombre';
                document.getElementById('tournament-location').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${torneo.nombreSede || 'Sede por definir'}`;
                document.getElementById('reglamento-title').textContent = `Reglamento Oficial - ${torneo.nombre}`;
                
                // Imagen (si tu DTO no tiene imagenUrl, usa placeholder)
                const imgUrl = torneo.imagenUrl || `https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&id=${id}`;
                document.getElementById('tournament-img').src = imgUrl;
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function loadRegulations(id) {
        try {
            // Usamos el endpoint que devuelve TODO el reglamento (secciones + reglas)
            const response = await fetch(`${API_BASE_URL}/torneos/${id}/reglamento`);
            
            if (!response.ok) throw new Error("Error al cargar reglamento");
            
            const secciones = await response.json();
            const docBody = document.querySelector('.doc-body');
            const docIndexUl = document.querySelector('#docIndex ul');
            const noRulesWarning = document.getElementById('no-rules-warning');

            // Limpiar
            docBody.innerHTML = '';
            docIndexUl.innerHTML = '';

            if (!secciones || secciones.length === 0) {
                if (noRulesWarning) {
                    noRulesWarning.style.display = 'block';
                    if (!isAdmin) {
                        // Mensaje estilizado para usuarios (No Admin)
                        noRulesWarning.style.background = 'rgba(22, 27, 34, 0.9)';
                        noRulesWarning.style.border = '1px solid #30363d';
                        noRulesWarning.style.color = '#8b949e';
                        noRulesWarning.innerHTML = `
                            <i class="fa-solid fa-clipboard-question" style="font-size: 2.5rem; margin-bottom: 15px; color: #00bfff;"></i>
                            <h3 style="color: #e6edf3; margin-bottom: 10px;">Reglamento no definido</h3>
                            <p>El organizador aún no ha publicado las reglas oficiales para este torneo.</p>
                        `;
                    } else {
                        // Mensaje de alerta original para Admin
                        noRulesWarning.style.background = '#f85149';
                        noRulesWarning.style.border = '2px solid #da3633';
                        noRulesWarning.style.color = 'white';
                        noRulesWarning.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 10px;"></i><h3>⚠️ Sin Reglamentos Definidos</h3><p>Este torneo aún no tiene reglamentos. Agrega los reglamentos urgentemente para poder dar inicio al torneo.</p>`;
                    }

                    // Agregar tooltip al botón de agregar si no hay reglas
                    const btnAdd = document.getElementById('btn-add-rules');
                    if (btnAdd) {
                        btnAdd.classList.add('btn-tooltip');
                        btnAdd.setAttribute('data-tooltip', '⚠️ Aún no se establecieron las reglas');
                    }
                }
                return;
            } else {
                if (noRulesWarning) noRulesWarning.style.display = 'none';
            }

            // Renderizar
            secciones.forEach(seccion => {
                // 1. Índice Lateral
                const li = document.createElement('li');
                li.setAttribute('data-target', `section-${seccion.id}`);
                li.innerHTML = `${seccion.numOrden}. ${seccion.tituloMenu} <i class="fa-solid fa-chevron-right"></i>`;
                li.addEventListener('click', () => {
                    document.getElementById(`section-${seccion.id}`).scrollIntoView({ behavior: 'smooth' });
                    document.querySelectorAll('#docIndex li').forEach(l => l.classList.remove('active'));
                    li.classList.add('active');
                });
                docIndexUl.appendChild(li);

                // 2. Cuerpo del Documento
                const sectionEl = document.createElement('section');
                sectionEl.id = `section-${seccion.id}`;
                
                // Cabecera de sección con botones de admin
                let adminControls = '';
                if (isAdmin) {
                    adminControls = `
                        <div class="admin-controls" style="float: right; display: flex; gap: 10px;">
                            <button class="btn-edit-section" data-id="${seccion.id}" style="background: none; border: none; color: #58a6ff; cursor: pointer;"><i class="fa-solid fa-pen"></i></button>
                            <button class="btn-delete-section" data-id="${seccion.id}" style="background: none; border: none; color: #f85149; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    `;
                }

                sectionEl.innerHTML = `
                    ${adminControls}
                    <h3>${seccion.numOrden}. ${seccion.tituloMenu}</h3>
                `;

                // Renderizar Reglas
                if (seccion.reglas) {
                    seccion.reglas.forEach(regla => {
                        const div = document.createElement('div');
                        div.className = `contenido-bloque ${regla.tipoBloque ? regla.tipoBloque.toLowerCase() : 'normal'}`;
                        
                        if (regla.subtitulo) {
                            const h4 = document.createElement('h4');
                            h4.textContent = regla.subtitulo;
                            div.appendChild(h4);
                        }
                        
                        const p = document.createElement('p');
                        p.textContent = regla.textoCuerpo;
                        div.appendChild(p);
                        
                        sectionEl.appendChild(div);
                    });
                }
                docBody.appendChild(sectionEl);
            });

            // Configurar listeners para botones de editar/eliminar generados dinámicamente
            if (isAdmin) {
                document.querySelectorAll('.btn-delete-section').forEach(btn => {
                    btn.addEventListener('click', (e) => deleteSection(e.currentTarget.dataset.id));
                });
                document.querySelectorAll('.btn-edit-section').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const seccionId = e.currentTarget.dataset.id;
                        const seccionData = secciones.find(s => s.id == seccionId);
                        openModalForEdit(seccionData);
                    });
                });
            }

        } catch (error) {
            console.error('Error:', error);
        }
    }

    // ============ GESTIÓN DEL MODAL ============
    const rulesModal = document.getElementById('rules-modal');
    const rulesForm = document.getElementById('rules-form');
    const puntosTbody = document.getElementById('puntos-tbody');

    // Abrir Modal (Crear)
    if (btnAddRules) {
        btnAddRules.addEventListener('click', () => {
            resetModal();
            isEditing = false;
            document.querySelector('#rules-modal h2').innerHTML = '<i class="fa-solid fa-book-open"></i> Agregar Sección';
            rulesModal.style.display = 'block';
        });
    }

    // Abrir Modal (Editar)
    function openModalForEdit(seccion) {
        resetModal();
        isEditing = true;
        currentSectionId = seccion.id;
        
        document.querySelector('#rules-modal h2').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Sección';
        document.getElementById('titulo_menu').value = seccion.tituloMenu;
        document.getElementById('num_orden').value = seccion.numOrden;

        // Llenar tabla de reglas
        puntosTbody.innerHTML = ''; // Limpiar fila por defecto
        if (seccion.reglas && seccion.reglas.length > 0) {
            seccion.reglas.forEach(regla => addPuntoRow(regla));
        } else {
            addPuntoRow(); // Al menos una fila vacía
        }

        rulesModal.style.display = 'block';
    }

    function closeModal() {
        rulesModal.style.display = 'none';
    }

    document.getElementById('close-rules-modal').addEventListener('click', closeModal);
    document.getElementById('btn-cancel-rules').addEventListener('click', closeModal);

    // ============ LÓGICA DE TABLA DINÁMICA ============
    document.getElementById('btn-add-punto').addEventListener('click', () => addPuntoRow());

    function addPuntoRow(data = null) {
        const row = document.createElement('tr');
        row.className = 'punto-row';
        row.innerHTML = `
            <td style="padding: 14px 12px;"><input type="text" class="punto-subtitulo" value="${data ? data.subtitulo : ''}" placeholder="Ej: 2.1" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 8px; border-radius: 6px;"></td>
            <td style="padding: 14px 12px;"><textarea class="punto-descripcion" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 8px; border-radius: 6px;">${data ? data.textoCuerpo : ''}</textarea></td>
            <td style="padding: 14px 12px;">
                <select class="punto-tipo" style="width: 100%; background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 8px; border-radius: 6px;">
                    <option value="NORMAL" ${data && data.tipoBloque === 'NORMAL' ? 'selected' : ''}>🔵 Normal</option>
                    <option value="ALERTA" ${data && data.tipoBloque === 'ALERTA' ? 'selected' : ''}>🔴 Alerta</option>
                    <option value="LISTA" ${data && data.tipoBloque === 'LISTA' ? 'selected' : ''}>🟢 Lista</option>
                </select>
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn-delete-punto" style="background: #da3633; color: white; border: none; padding: 6px 10px; border-radius: 5px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        
        row.querySelector('.btn-delete-punto').addEventListener('click', () => {
            if (puntosTbody.children.length > 1) row.remove();
            else alert("Debe haber al menos un punto.");
        });
        
        puntosTbody.appendChild(row);
    }

    function resetModal() {
        rulesForm.reset();
        puntosTbody.innerHTML = '';
        addPuntoRow(); // Fila inicial
    }

    // ============ GUARDAR (CREATE / UPDATE) ============
    rulesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('jwtToken');

        // Construir objeto DTO
        const reglas = [];
        document.querySelectorAll('.punto-row').forEach(row => {
            reglas.push({
                subtitulo: row.querySelector('.punto-subtitulo').value,
                textoCuerpo: row.querySelector('.punto-descripcion').value,
                tipoBloque: row.querySelector('.punto-tipo').value,
                numSuborden: 0 // Puedes calcular esto si es necesario
            });
        });

        const payload = {
            tituloMenu: document.getElementById('titulo_menu').value,
            numOrden: parseInt(document.getElementById('num_orden').value),
            reglas: reglas
        };

        try {
            let url = `${API_BASE_URL}/torneos/${torneoId}/secciones`;
            let method = 'POST';

            if (isEditing) {
                url = `${API_BASE_URL}/torneos/secciones/${currentSectionId}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                alert('Reglamento guardado correctamente');
                closeModal();
                loadRegulations(torneoId);
            } else {
                alert('Error al guardar');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        }
    });

    // ============ ELIMINAR SECCIÓN ============
    async function deleteSection(id) {
        if (!confirm('¿Estás seguro de eliminar esta sección y todas sus reglas?')) return;
        
        const token = localStorage.getItem('jwtToken');
        try {
            const response = await fetch(`${API_BASE_URL}/torneos/secciones/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                loadRegulations(torneoId);
            } else {
                alert('Error al eliminar');
            }
        } catch (error) {
            console.error(error);
        }
    }
});
