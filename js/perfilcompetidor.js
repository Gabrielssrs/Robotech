document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';

    // --- Elementos de la página ---
    const profileAvatarImg = document.getElementById('profile-avatar-img');
    const profileNameValue = document.getElementById('profile-name-value');
    const profileAliasValue = document.getElementById('profile-alias-value');
    const profileClubValue = document.getElementById('profile-club-value');
    const profileDniValue = document.getElementById('profile-dni-value');
    const profilePhoneValue = document.getElementById('profile-phone-value');
    const profileEmailValue = document.getElementById('profile-email-value');
    const profileStatusValue = document.getElementById('profile-status-value');
    const navProfileName = document.querySelector('.nav-profile-name');

    // --- Elementos de la Sección de Robots ---
    const robotsTableBody = document.getElementById('robots-table-body');
    const robotModal = document.getElementById('crud-robot-modal');
    const closeRobotModalBtn = document.querySelector('.robot-close-btn');
    const robotForm = document.getElementById('robot-form');

    // --- Elementos del Modal de Edición de Perfil ---
    const editProfileModal = document.getElementById('edit-profile-info-modal');
    const openEditProfileBtn = document.querySelector('.edit-profile-btn');
    const closeEditProfileBtn = document.querySelector('.profile-info-close-btn');
    const editProfileForm = document.getElementById('profile-edit-form');
    const feedbackDiv = document.getElementById('profile-edit-feedback');

    let currentCompetitorData = null;
    let myRobots = [];

    // --- Funciones ---

    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    async function fetchCompetitorProfile() {
        try {
            const response = await fetch(`${API_BASE_URL}/v1/competidor/perfil`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('jwtToken');
                    window.location.href = 'login.html';
                }
                throw new Error('No se pudo obtener el perfil del competidor.');
            }

            currentCompetitorData = await response.json();
            displayCompetitorData(currentCompetitorData);

        } catch (error) {
            console.error('Error:', error);
            document.body.innerHTML = `<p style="color:red; text-align:center;">Error al cargar el perfil. Por favor, inicia sesión de nuevo.</p>`;
        }
    }

    // Nueva función para cargar categorías en el modal
    async function loadCategorias() {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const categorias = await response.json();
                const select = document.getElementById('robot-categoria');
                // Limpiar y poner opción por defecto
                select.innerHTML = '<option value="" disabled selected>Seleccione una categoría...</option>';
                
                categorias.forEach(cat => {
                    // Puedes filtrar por cat.activa si lo deseas
                    const option = document.createElement('option');
                    option.value = cat.id; // Usamos el ID como valor
                    option.textContent = cat.nombre;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error cargando categorías:', error);
        }
    }

    async function fetchUserRobots() {
        try {
            const response = await fetch(`${API_BASE_URL}/robots/mis-robots`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                myRobots = await response.json();
                renderRobotsTable(myRobots);
            } else {
                console.error('Error al cargar robots');
            }
        } catch (error) {
            console.error('Error de red al cargar robots:', error);
        }
    }

    function renderRobotsTable(robots) {
        if (!robotsTableBody) return;
        
        robotsTableBody.innerHTML = '';
        if (robots.length === 0) {
            robotsTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No tienes robots registrados aún.</td></tr>';
            return;
        }

        robots.forEach(robot => {
            const row = document.createElement('tr');
            
            // Imagen por defecto o la del robot si tuviera (placeholder por ahora)
            const robotImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(robot.nombre)}&background=random&color=fff`;
            
            // Accedemos a robot.categoria (objeto único)
            let catName = 'Sin categoría';
            if (robot.categoria) {
                catName = robot.categoria.nombre;
            }

            // Formatear fecha
            const fechaCreacion = robot.fechaCreacion ? new Date(robot.fechaCreacion).toLocaleDateString() : '-';

            row.innerHTML = `
                <td><img src="${robotImg}" alt="${robot.nombre}" class="table-avatar"></td>
                <td><strong>${robot.nombre}</strong></td>
                <td>${catName}</td>
                <td><span class="status-badge status-${(robot.estado || 'activo').toLowerCase()}">${robot.estado || 'Activo'}</span></td>
                <td>${robot.puntos || 0} pts</td>
                <td>${fechaCreacion}</td>
                <td class="actions">
                    <button class="btn-action edit-robot-btn" data-id="${robot.id}">Editar</button>
                </td>
            `;
            robotsTableBody.appendChild(row);
        });

        // Agregar listeners a los botones generados dinámicamente
        document.querySelectorAll('.edit-robot-btn').forEach(btn => {
            btn.addEventListener('click', (e) => openRobotModal(e.target.dataset.id));
        });
    }

    function displayCompetitorData(competidor) {
        const fullName = `${competidor.nombre || ''} ${competidor.apellido || ''}`.trim();
        const alias = competidor.alias || 'N/A';
        
        // Actualizar datos en la página
        profileNameValue.textContent = fullName;
        profileAliasValue.textContent = alias;
        profileClubValue.textContent = competidor.club ? competidor.club.nombre : 'Sin club';
        profileDniValue.textContent = competidor.dni || 'No establecido';
        profilePhoneValue.textContent = competidor.telefono || 'No establecido';
        profileEmailValue.textContent = competidor.correoElectronico || 'No establecido';
        profileStatusValue.textContent = competidor.estado;
        profileStatusValue.className = `value status ${competidor.estado === 'Activo' ? 'active' : 'inactive'}`;
        
        // Actualizar nombre en la barra de navegación
        navProfileName.textContent = `${competidor.nombre} "${alias}" ${competidor.apellido}`;

        // Lógica para la foto de perfil
        const placeholderUrl = `https://ui-avatars.com/api/?name=${competidor.nombre.charAt(0)}&size=100&background=random&color=fff&bold=true`;
        profileAvatarImg.src = competidor.fotoUrl || placeholderUrl;
        profileAvatarImg.onerror = () => {
            profileAvatarImg.onerror = null;
            profileAvatarImg.src = placeholderUrl;
        };
    }

    function openEditModal() {
        if (!currentCompetitorData) return;
        
        document.getElementById('profile-edit-name').value = `${currentCompetitorData.nombre} ${currentCompetitorData.apellido}`;
        document.getElementById('profile-edit-alias').value = currentCompetitorData.alias || '';
        document.getElementById('profile-edit-dni').value = currentCompetitorData.dni || '';
        document.getElementById('profile-edit-phone').value = currentCompetitorData.telefono || '';
        document.getElementById('profile-edit-status').value = currentCompetitorData.estado || '';
        document.getElementById('profile-edit-avatar-file').value = ''; // Limpiar el input de archivo
        
        // Attach input validators for this modal session
        attachInputValidators();
        
        editProfileModal.style.display = 'block';
    }

    function closeEditModal() {
        editProfileModal.style.display = 'none';
    }

    // --- Funciones del Modal de Robot ---
    function openRobotModal(robotId) {
        const robot = myRobots.find(r => String(r.id) === String(robotId));
        if (!robot) return;

        document.getElementById('robot-modal-title').textContent = 'Editar Robot';
        document.getElementById('robot-id').value = robot.id;
        document.getElementById('robot-nombre').value = robot.nombre;
        
        // Pre-seleccionar la categoría usando el ID
        if (robot.categoria) {
             const catSelect = document.getElementById('robot-categoria');
             if(catSelect) {
                 // Asignamos el ID de la categoría al select
                 catSelect.value = robot.categoria.id; 
             }
        }
        
        document.getElementById('robot-estado').value = robot.estado || 'Activo';
        document.getElementById('robot-puntos').value = robot.puntos || 0;

        robotModal.style.display = 'block';
    }

    function closeRobotModal() {
        robotModal.style.display = 'none';
        robotForm.reset();
        document.getElementById('robot-id').value = '';
        document.getElementById('robot-modal-title').textContent = 'Agregar Nuevo Robot';
    }

    // Input validators: restrict characters based on field type
    function attachInputValidators() {
        const nameEl = document.getElementById('profile-edit-name');
        const dniEl = document.getElementById('profile-edit-dni');
        const phoneEl = document.getElementById('profile-edit-phone');

        // Name: only letters and spaces
        if (nameEl) {
            nameEl.addEventListener('input', (e) => {
                const original = e.target.value;
                const filtered = original.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ\s]/g, '');
                if (original !== filtered) e.target.value = filtered;
            });
        }

        // DNI: only numbers (0-9)
        if (dniEl) {
            dniEl.addEventListener('input', (e) => {
                const original = e.target.value;
                const filtered = original.replace(/\D/g, '');
                if (original !== filtered) e.target.value = filtered;
            });
        }

        // Phone: only numbers (0-9), max 9
        if (phoneEl) {
            phoneEl.addEventListener('input', (e) => {
                const original = e.target.value;
                const filtered = original.replace(/\D/g, '').slice(0, 9);
                if (original !== filtered) e.target.value = filtered;
            });
        }
    }


    async function handleProfileUpdate(event) {
        event.preventDefault();
        
        const nameParts = document.getElementById('profile-edit-name').value.split(' ');
        const nombre = nameParts.shift();
        const apellido = nameParts.join(' ');

        const profileDetails = {
            nombre: nombre,
            apellido: apellido,
            alias: document.getElementById('profile-edit-alias').value,
            dni: document.getElementById('profile-edit-dni').value,
            telefono: document.getElementById('profile-edit-phone').value,
        };

        const formData = new FormData();
        formData.append('details', new Blob([JSON.stringify(profileDetails)], { type: 'application/json' }));

        const fotoInput = document.getElementById('profile-edit-avatar-file');
        if (fotoInput && fotoInput.files[0]) {
            formData.append('foto', fotoInput.files[0]);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/v1/competidor/perfil`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'No se pudo actualizar el perfil.');
            }

            feedbackDiv.textContent = '¡Perfil actualizado con éxito!';
            feedbackDiv.style.color = 'green';
            feedbackDiv.style.display = 'block';

            setTimeout(() => {
                closeEditModal();
                feedbackDiv.style.display = 'none';
                fetchCompetitorProfile(); // Recargar los datos
            }, 1500);

        } catch (error) {
            console.error('Error al actualizar:', error);
            feedbackDiv.textContent = `Error: ${error.message}`;
            feedbackDiv.style.color = 'red';
            feedbackDiv.style.display = 'block';
        }
    }

    // --- Event Listeners ---
    if (protectPage()) {
        fetchCompetitorProfile();
        fetchUserRobots(); // Cargar robots al iniciar
        loadCategorias(); // Cargar categorías para el modal

        openEditProfileBtn.addEventListener('click', openEditModal);
        closeEditProfileBtn.addEventListener('click', closeEditModal);
        editProfileForm.addEventListener('submit', handleProfileUpdate);

        // Listeners para modal de robot
        if (closeRobotModalBtn) {
            closeRobotModalBtn.addEventListener('click', closeRobotModal);
        }

        window.addEventListener('click', (e) => {
            if (e.target === editProfileModal) {
                closeEditModal();
            }
            if (e.target === robotModal) {
                closeRobotModal();
            }
        });

        document.querySelector('.btn-logout').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }
});
