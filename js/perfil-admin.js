document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');

    if (!token) {
        console.warn("No hay token, redirigiendo a login.");
        window.location.href = 'login.html';
        return;
    }

    // CONFIGURACIÓN DE LA URL BASE
    const API_BASE_URL = 'https://robotech-back.onrender.com'; 

    // Variables globales
    let currentAdminId = null;
    let currentAdminData = null;
    
    // Verificar si viene redirigido con permiso de edición (ej: ?unlocked=true)
    const urlParams = new URLSearchParams(window.location.search);
    const isUnlocked = urlParams.get('unlocked') === 'true' || urlParams.get('desbloqueo') === 'exitoso';
    
    // Mostrar mensaje si está desbloqueado
    if (isUnlocked) {
        const unlockMsg = document.getElementById('unlock-message');
        if (unlockMsg) unlockMsg.style.display = 'block';
    }

    // Elementos del DOM
    const profileNombre = document.querySelector('.profile-nombre');
    const profileDni = document.querySelector('.profile-dni');
    const profileEmail = document.querySelector('.profile-email');
    const profileTelefono = document.querySelector('.profile-telefono');
    const profileEstado = document.querySelector('.profile-estado');
    
    // Secciones restringidas
    const sectionConfig = document.getElementById('section-config-sistema');
    const sectionGestion = document.getElementById('section-gestion-admins');
    const btnSolicitarEdicion = document.getElementById('btn-solicitar-edicion');

    // --- 1. CARGAR PERFIL DEL ADMINISTRADOR ---
    async function loadProfile() {
        try {
            console.log(`[DEBUG] Cargando perfil desde ${API_BASE_URL}/api/v1/admin/perfil...`);
            const response = await fetch(`${API_BASE_URL}/api/v1/admin/perfil`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 403) {
                    console.error("[ERROR] 403 Forbidden al cargar perfil. El token puede ser inválido o no tener permisos.");
                    throw new Error('Acceso denegado. Token inválido o expirado.');
                }
                if (response.status === 404) {
                    console.error("[ERROR] 404 Not Found. Verifica que el backend esté corriendo y la ruta sea correcta.");
                    throw new Error('Servicio no encontrado (404).');
                }
                throw new Error(`Error al cargar perfil: ${response.status}`);
            }

            const data = await response.json();
            console.log("[DEBUG] Datos del perfil recibidos:", data);
            console.log("[DEBUG] ROL DEL USUARIO:", data.rol); // AQUI VERÁS TU ROL
            
            currentAdminData = data;
            currentAdminId = data.id;

            // Renderizar datos
            if (profileNombre) profileNombre.textContent = data.nombre || 'N/A';
            if (profileDni) profileDni.textContent = data.dni || 'N/A';
            if (profileEmail) profileEmail.textContent = data.correo || 'N/A';
            if (profileTelefono) profileTelefono.textContent = data.telefono || 'No registrado';
            if (profileEstado) profileEstado.textContent = data.estado || (data.isEnabled ? 'Activo' : 'Inactivo');

            // Lógica de Admin Principal (ID 1)
            if (Number(data.id) === 1) {
                console.log("[DEBUG] Es Admin Principal (ID 1). Mostrando secciones.");
                if (sectionConfig) sectionConfig.style.display = 'block';
                if (sectionGestion) sectionGestion.style.display = 'block';
                if (btnSolicitarEdicion) {
                    // Si ya está desbloqueado, ocultamos el botón de solicitud
                    btnSolicitarEdicion.style.display = isUnlocked ? 'none' : 'inline-block';
                }
            } else {
                console.log("[DEBUG] No es Admin Principal (ID != 1). Ocultando secciones.");
            }

        } catch (error) {
            console.error("[EXCEPCION]", error);
            Swal.fire({
                title: 'Error',
                text: 'No se pudo cargar la información del perfil. ' + error.message,
                icon: 'error',
                confirmButtonText: 'Ir al Login'
            });
        }
    }

    loadProfile();

    // --- 2. LOGOUT ---
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('jwtToken');
            window.location.href = 'login.html';
        });
    }

    // Toggle Password Visibility
    document.querySelectorAll('.toggle-password').forEach(icon => {
        icon.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.remove('fa-eye');
                this.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                this.classList.remove('fa-eye-slash');
                this.classList.add('fa-eye');
            }
        });
    });

    // --- 3. EDITAR MI PERFIL ---
    const editModal = document.getElementById('edit-profile-modal');
    const btnOpenEdit = document.getElementById('btn-open-edit-profile');
    const btnCloseEdit = document.getElementById('close-edit-profile');
    const formEdit = document.getElementById('edit-profile-form');

    if (btnOpenEdit) {
        btnOpenEdit.addEventListener('click', () => {
            if(currentAdminData) {
                document.getElementById('edit-nombre').value = currentAdminData.nombre;
                document.getElementById('edit-telefono').value = currentAdminData.telefono;
                
                // Campos sensibles
                const dniInput = document.getElementById('edit-dni');
                const emailInput = document.getElementById('edit-email');
                const passInput = document.getElementById('edit-password');
                const confirmPassInput = document.getElementById('confirm-password');
                
                dniInput.value = currentAdminData.dni;
                emailInput.value = currentAdminData.correo;
                passInput.value = ''; 
                if(confirmPassInput) confirmPassInput.value = '';

                const sensitiveFields = [dniInput, emailInput, passInput, confirmPassInput];

                sensitiveFields.forEach(input => {
                    if (isUnlocked) {
                        // Habilitado para editar
                        input.readOnly = false;
                        input.style.opacity = '1';
                        input.style.cursor = 'text';
                        input.onclick = null; // Remover alertas previas
                    } else {
                        // Bloqueado
                        input.readOnly = true;
                        input.style.opacity = '0.6';
                        input.style.cursor = 'not-allowed';
                        input.onclick = () => {
                            Swal.fire({
                                title: 'Acceso Restringido',
                                text: 'Es necesario realizar una solicitud de aprobación de Robotech para realizar estos cambios de datos sensibles.',
                                icon: 'warning',
                                confirmButtonColor: '#00bfff'
                            });
                        };
                    }
                });
            }
            editModal.style.display = 'block';
        });
    }

    if (btnCloseEdit) btnCloseEdit.addEventListener('click', () => editModal.style.display = 'none');

    // Solicitar Desbloqueo (Solo ID 1)
    if (btnSolicitarEdicion) {
        btnSolicitarEdicion.addEventListener('click', async () => {
            try {
                Swal.fire({ title: 'Enviando solicitud...', didOpen: () => Swal.showLoading() });
                
                const res = await fetch(`${API_BASE_URL}/api/v1/admins/${currentAdminId}/solicitar-desbloqueo`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if(res.ok) {
                    Swal.fire('Solicitud Enviada', 'Revisa el correo oficial.', 'success');
                } else {
                    const err = await res.text();
                    Swal.fire('Error', err, 'error');
                }
            } catch (e) {
                Swal.fire('Error', 'Error de conexión', 'error');
            }
        });
    }

    // Guardar Cambios Perfil
    if (formEdit) {
        formEdit.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const pass = document.getElementById('edit-password').value;
            const confirmPass = document.getElementById('confirm-password').value;

            if (pass && pass !== confirmPass) {
                Swal.fire('Error', 'Las contraseñas no coinciden.', 'error');
                return;
            }

            const body = {
                nombre: document.getElementById('edit-nombre').value,
                dni: document.getElementById('edit-dni').value,
                telefono: document.getElementById('edit-telefono').value,
                correo: document.getElementById('edit-email').value,
                contrasena: pass || null
            };

            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/admin/perfil`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    Swal.fire({
                        title: 'Éxito',
                        text: 'Perfil actualizado correctamente',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => {
                        // Redirigir a la URL limpia para bloquear nuevamente los campos sensibles
                        window.location.href = 'perfiladmin.html';
                    });
                } else {
                    const msg = await res.text();
                    if(res.status === 403) {
                        Swal.fire('Bloqueado', 'Para editar datos sensibles del Admin Principal, solicita desbloqueo.', 'warning');
                    } else {
                        Swal.fire('Error', msg, 'error');
                    }
                }
            } catch (error) {
                Swal.fire('Error', 'Error al actualizar perfil', 'error');
            }
        });
    }

    // --- 4. CREAR SUB-ADMINISTRADOR ---
    const createModal = document.getElementById('create-subadmin-modal');
    const btnOpenCreate = document.getElementById('btn-open-create-subadmin');
    const btnCloseCreate = document.getElementById('close-create-subadmin');
    const btnCancelCreate = document.getElementById('cancel-create-subadmin');
    const formCreate = document.getElementById('create-subadmin-form');

    if(btnOpenCreate) {
        btnOpenCreate.addEventListener('click', (e) => {
            e.preventDefault();
            formCreate.reset();
            createModal.style.display = 'block';
        });
    }

    const closeCreateModal = () => createModal.style.display = 'none';
    if(btnCloseCreate) btnCloseCreate.addEventListener('click', closeCreateModal);
    if(btnCancelCreate) btnCancelCreate.addEventListener('click', closeCreateModal);

        if(formCreate) {
        formCreate.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const body = {
                nombre: document.getElementById('sub-nombre').value,
                dni: document.getElementById('sub-dni').value,
                telefono: document.getElementById('sub-telefono').value,
                correo: document.getElementById('sub-correo').value,
                contrasena: document.getElementById('sub-password').value,
                isEnabled: true
            };

            console.log("[DEBUG] Enviando petición crear admin:", body);

            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/admins`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(body)
                });

                console.log("[DEBUG] Respuesta status:", res.status);

                if(res.ok) {
                    Swal.fire('Creado', 'Administrador creado exitosamente', 'success');
                    closeCreateModal();
                    // Opcional: recargar la lista si la función es accesible
                    if (typeof fetchAdmins === 'function') fetchAdmins();
                } else {
                    const msg = await res.text();
                    console.error("[ERROR] Fallo al crear admin:", msg);
                    
                    if (res.status === 403) {
                        // CORRECCIÓN: Mostrar el mensaje del servidor si existe, si no, el genérico.
                        // Esto te permitirá ver "Solo el Administrador Principal..." si es ese el error.
                        const errorMsg = msg ? msg : 'Acceso denegado (403). Verifica permisos o configuración CSRF.';
                        Swal.fire('Acceso Denegado', errorMsg, 'error');
                    } else {
                        Swal.fire('Error', 'No se pudo crear: ' + msg, 'error');
                    }
                }
            } catch (e) {
                console.error("[EXCEPCION]", e);
                Swal.fire('Error', 'Error de conexión', 'error');
            }
        });
    }


    // --- 5. LISTAR ADMINISTRADORES ---
    const listModal = document.getElementById('list-subadmin-modal');
    const btnOpenList = document.getElementById('btn-open-list-subadmin');
    const btnCloseList = document.getElementById('close-list-subadmin');
    const tbody = document.getElementById('subadmin-list-body');

    if(btnOpenList) {
        btnOpenList.addEventListener('click', async (e) => {
            e.preventDefault();
            listModal.style.display = 'block';
            await fetchAdmins();
        });
    }

    if(btnCloseList) btnCloseList.addEventListener('click', () => listModal.style.display = 'none');

    async function fetchAdmins() {
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admins`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!res.ok) {
                console.error("[ERROR] Fallo al listar admins. Status:", res.status);
                tbody.innerHTML = `<tr><td colspan="5">Error ${res.status} al cargar lista</td></tr>`;
                return;
            }

            const admins = await res.json();
            tbody.innerHTML = '';
            admins.forEach(admin => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #444';
                
                let actions = '';
                if(admin.id !== 1) { 
                    if(admin.estado === 'ACTIVO') {
                        actions += `<button class="btn-action btn-suspend" onclick="suspenderAdmin(${admin.id})" style="background:#d9534f; color:white; border:none; padding:5px; cursor:pointer; margin-right:5px;">Suspender</button>`;
                    } else {
                        actions += `<button class="btn-action btn-activate" onclick="activarAdmin(${admin.id})" style="background:#5cb85c; color:white; border:none; padding:5px; cursor:pointer; margin-right:5px;">Activar</button>`;
                    }
                    actions += `<button class="btn-action" onclick="abrirEditarOtro(${admin.id}, '${admin.nombre}', '${admin.dni}', '${admin.telefono}')" style="background:#0275d8; color:white; border:none; padding:5px; cursor:pointer;">Editar</button>`;
                } else {
                    actions = '<span style="color:#aaa; font-size:0.8em;">Principal</span>';
                }

                tr.innerHTML = `
                    <td style="padding:10px;">${admin.id}</td>
                    <td style="padding:10px;">${admin.nombre}</td>
                    <td style="padding:10px;">${admin.correo}</td>
                    <td style="padding:10px;">${admin.estado}</td>
                    <td style="padding:10px;">${actions}</td>
                `;
                tbody.appendChild(tr);
            });

        } catch (e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="5">Error de conexión</td></tr>';
        }
    }

    // Funciones globales para onclick en HTML
    window.suspenderAdmin = async (id) => {
        if(!confirm('¿Seguro que desea suspender a este administrador?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admins/${id}/suspender`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) fetchAdmins();
            else Swal.fire('Error', 'No se pudo suspender', 'error');
        } catch(e) { console.error(e); }
    };

    window.activarAdmin = async (id) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/v1/admins/${id}/activar`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(res.ok) fetchAdmins();
            else Swal.fire('Error', 'No se pudo activar', 'error');
        } catch(e) { console.error(e); }
    };

    // --- 6. EDITAR OTRO ADMIN ---
    const editOtherModal = document.getElementById('edit-other-admin-modal');
    const formEditOther = document.getElementById('edit-other-admin-form');
    
    window.abrirEditarOtro = (id, nombre, dni, telefono) => {
        document.getElementById('other-id').value = id;
        document.getElementById('other-nombre').value = nombre;
        document.getElementById('other-dni').value = dni;
        document.getElementById('other-telefono').value = telefono;
        editOtherModal.style.display = 'block';
    };

    if (document.getElementById('close-edit-other')) {
        document.getElementById('close-edit-other').addEventListener('click', () => editOtherModal.style.display = 'none');
    }

    if (formEditOther) {
        formEditOther.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('other-id').value;
            const body = {
                nombre: document.getElementById('other-nombre').value,
                dni: document.getElementById('other-dni').value,
                telefono: document.getElementById('other-telefono').value
            };

            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/admins/${id}`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify(body)
                });

                if(res.ok) {
                    Swal.fire('Actualizado', 'Datos actualizados', 'success');
                    editOtherModal.style.display = 'none';
                    fetchAdmins();
                } else {
                    Swal.fire('Error', 'No se pudo actualizar', 'error');
                }
            } catch(e) { console.error(e); }
        });
    }

    // Cerrar modales al hacer click fuera
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    };
});
