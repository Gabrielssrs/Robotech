document.addEventListener('DOMContentLoaded', function () {
    const API_URL = 'https://tu-backend.onrender.com/api/categorias';
    const tableBody = document.querySelector('.competitors-table tbody');
    let categoriasList = []; // Caché de categorías para no tener que pedirlas de nuevo al editar

    // ===== HELPERS PARA SWEETALERT2 =====
    const showSwalSuccess = (msg) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'success', title: '¡Éxito!', text: msg, timer: 2500, timerProgressBar: true });
        } else {
            alert(msg);
        }
    };
    const showSwalError = (msg) => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } else {
            alert(msg);
        }
    };
    const showSwalConfirm = async (msg) => {
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                icon: 'warning',
                title: '¿Confirmar?',
                text: msg,
                showCancelButton: true,
                confirmButtonText: 'Aceptar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#00bfff',
                cancelButtonColor: '#dc3545'
            });
            return result.isConfirmed;
        } else {
            return confirm(msg);
        }
    };

    // --- Elementos del Modal de Edición ---
    const editModal = document.getElementById('edit-category-modal');
    const closeCategoryModalBtn = document.getElementById('close-category-modal');
    const cancelCategoryBtn = document.getElementById('cancel-category-edit');
    const editForm = document.getElementById('edit-category-form');

    /**
     * Obtiene las categorías desde la API del backend.
     */
    async function fetchCategorias() {
        const token = localStorage.getItem('jwtToken');
        if (!token) {
            window.location.href = 'login.html';
            return;
        }

        if (!tableBody) {
            console.error('Error: No se encontró el cuerpo de la tabla para las categorías.');
            return;
        }

        try {
            const response = await fetch(API_URL, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('jwtToken');
                    window.location.href = 'login.html';
                }
                throw new Error(`Error de red: ${response.statusText}`);
            }

            const categorias = await response.json();
            categoriasList = categorias; // Guardar en caché
            displayCategorias(categorias);

        } catch (error) {
            console.error('Error al obtener las categorías:', error);
            tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center; color: red;">Error al cargar las categorías.</td></tr>`;
            showSwalError('No se pudieron cargar las categorías. Por favor, intenta de nuevo.');
        }
    }

    /**
     * Muestra las categorías en la tabla HTML.
     * @param {Array} categorias - Un array de objetos de categoría.
     */
    function displayCategorias(categorias) {
        tableBody.innerHTML = '';

        if (categorias.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="12" style="text-align:center;">No se encontraron categorías.</td></tr>`;
            return;
        }

        categorias.forEach(categoria => {
            const row = document.createElement('tr');
            const getValue = (value, suffix = '') => (value != null ? `${value}${suffix}` : 'N/A');

            const actionButtonClass = categoria.activa ? 'btn-suspend' : 'btn-activate';
            const actionButtonText = categoria.activa ? 'Deshabilitar' : 'Habilitar';
            const toggleButton = `<button class="btn-action ${actionButtonClass}" data-id="${categoria.id}">${actionButtonText}</button>`;

            row.innerHTML = `
                <td>CAT-${String(categoria.id).padStart(3, '0')}</td>
                <td class="category-info"><strong>${getValue(categoria.nombre)}</strong></td>
                <td>${getValue(categoria.tipoCompeticion)}</td>
                <td>${getValue(categoria.pesoMaximoKg, ' kg')}</td>
                <td>${getValue(categoria.anchoMaximoCm, ' cm')}</td>
                <td>${getValue(categoria.altoMaximoCm, ' cm')}</td>
                <td>${getValue(categoria.largoMaximoCm, ' cm')}</td>
                <td>${getValue(categoria.armaPrincipalPermitida)}</td>
                <td>${getValue(categoria.velocidadMaximaPermitidaKmh, ' km/h')}</td>
                <td>${getValue(categoria.terrenoCompeticion)}</td>
                <td>${getValue(categoria.tipoTraccionPermitido)}</td>
                <td>${getValue(categoria.materialesPermitidos)}</td>
                <td class="table-actions">
                    <button class="btn-action btn-edit" data-id="${categoria.id}">Editar</button>
                    ${toggleButton}
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    function openEditModal(category) {
        document.getElementById('edit-cat-id').value = category.id;
        document.getElementById('edit-cat-nombre').value = category.nombre || '';
        document.getElementById('edit-cat-tipo').value = category.tipoCompeticion || '';
        document.getElementById('edit-cat-descripcion').value = category.descripcion || '';
        document.getElementById('edit-cat-peso').value = category.pesoMaximoKg || '';
        document.getElementById('edit-cat-ancho').value = category.anchoMaximoCm || '';
        document.getElementById('edit-cat-alto').value = category.altoMaximoCm || '';
        document.getElementById('edit-cat-largo').value = category.largoMaximoCm || '';
        document.getElementById('edit-cat-arma').value = category.armaPrincipalPermitida || '';
        document.getElementById('edit-cat-vel').value = category.velocidadMaximaPermitidaKmh || '';
        document.getElementById('edit-cat-terreno').value = category.terrenoCompeticion || '';
        document.getElementById('edit-cat-traccion').value = category.tipoTraccionPermitido || '';
        document.getElementById('edit-cat-materiales').value = category.materialesPermitidos || '';
        
        editModal.style.display = 'block';
    }

    function closeEditModal() {
        editModal.style.display = 'none';
    }

    async function toggleCategoriaStatus(categoriaId, action) {
        const token = localStorage.getItem('jwtToken');
        const confirmed = await showSwalConfirm(`¿Estás seguro de que deseas ${action} esta categoría?`);
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`${API_URL}/${categoriaId}/${action}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error al ${action} la categoría.`);
            }

            showSwalSuccess(`Categoría ${action === 'habilitar' ? 'habilitada' : 'deshabilitada'} correctamente.`);
            await fetchCategorias(); // Recargar la lista para reflejar el cambio

        } catch (error) {
            console.error('Error:', error);
            showSwalError(error.message);
        }
    }

    // --- MANEJO DE EVENTOS (EVENT DELEGATION) ---
    tableBody.addEventListener('click', (e) => {
        const target = e.target;
        const id = target.dataset.id;

        if (target.classList.contains('btn-edit')) {
            const category = categoriasList.find(c => String(c.id) === id);
            if (category) openEditModal(category);
        }

        if (target.classList.contains('btn-suspend')) {
            toggleCategoriaStatus(id, 'deshabilitar');
        }

        if (target.classList.contains('btn-activate')) {
            toggleCategoriaStatus(id, 'habilitar');
        }
    });

    closeCategoryModalBtn.addEventListener('click', closeEditModal);
    cancelCategoryBtn.addEventListener('click', closeEditModal);
    window.addEventListener('click', (ev) => { if (ev.target === editModal) closeEditModal(); });

    editForm.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const token = localStorage.getItem('jwtToken');
        const id = document.getElementById('edit-cat-id').value;

        const formData = new FormData(editForm);
        const body = {};
        formData.forEach((value, key) => {
            if (['pesoMaximoKg', 'anchoMaximoCm', 'altoMaximoCm', 'largoMaximoCm', 'velocidadMaximaPermitidaKmh'].includes(key)) {
                body[key] = value !== '' ? Number(value) : null;
            } else {
                body[key] = value.trim() || null;
            }
        });
        
        if (!body.nombre || !body.tipoCompeticion) {
            showSwalError('El nombre y el tipo de competición son obligatorios.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || 'Error actualizando la categoría');
            }
            
            await fetchCategorias();
            closeEditModal();
            showSwalSuccess('¡Categoría actualizada con éxito!');

        } catch (err) {
            console.error('Error al actualizar:', err);
            showSwalError('Error al actualizar la categoría: ' + err.message); 
        }
    });

    // --- INICIO DE LA EJECUCIÓN ---
    fetchCategorias();
});
