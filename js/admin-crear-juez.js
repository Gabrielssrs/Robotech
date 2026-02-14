document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    const API_BASE_URL = 'https://robotech-back.onrender.com/api';

    const form = document.querySelector('.form');
    const categoriasSelect = document.getElementById('categorias_juez');
    const sedeSelect = document.getElementById('sede_juez');

    // --- Protección de la página ---
    function protectPage() {
        if (!token) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    // --- Cargar categorías en el select ---
    async function loadCategorias() {
        try {
            const response = await fetch(`${API_BASE_URL}/categorias`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('No se pudieron cargar las categorías.');

            const categorias = await response.json();
            categoriasSelect.innerHTML = ''; 
            categorias.forEach(cat => {
                if (cat.activa) { 
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.nombre;
                    categoriasSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }

    // --- Cargar sedes en el select ---
    async function loadSedes() {
        try {
            const response = await fetch(`${API_BASE_URL}/sedes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('No se pudieron cargar las sedes.');

            const sedes = await response.json();
            sedeSelect.innerHTML = '<option value="">Seleccione una sede...</option>'; 
            sedes.forEach(sede => {
                // Opcional: Filtrar solo sedes disponibles si es necesario
                if (sede.estado === 'DISPONIBLE') {
                    const option = document.createElement('option');
                    option.value = sede.id;
                    option.textContent = sede.nombre;
                    sedeSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Carga',
                text: 'No se pudieron cargar las sedes. Inténtalo de nuevo más tarde.'
            });
        }
    }

    // --- Manejo del envío del formulario ---
    const telefonoInput = document.getElementById('telefono_juez');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', (e) => {
            const onlyDigits = e.target.value.replace(/\D/g, '');
            e.target.value = onlyDigits.slice(0, 9);
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nombre = document.getElementById('nombre_juez').value + ' ' + document.getElementById('apellido_juez').value;
        const dni = document.getElementById('dni_juez').value;
        const correo = document.getElementById('email_juez').value;
        const telefono = document.getElementById('telefono_juez').value;
        const contrasena = document.getElementById('contrasena_juez').value;
        const nivelCredencialValue = document.getElementById('credencial').value;
        const sedeId = document.getElementById('sede_juez').value; // Obtener ID de sede
        
        const nivelCredencialMap = {
            "1": "NIVEL_1_JUNIOR",
            "2": "NIVEL_2_ESTANDAR",
            "3": "NIVEL_3_SENIOR"
        };
        const nivelCredencial = nivelCredencialMap[nivelCredencialValue];

        const categoriaIds = Array.from(categoriasSelect.selectedOptions).map(option => parseInt(option.value));

        const juezRequest = {
            nombre,
            dni,
            correo,
            telefono,
            contrasena,
            nivelCredencial,
            categoriaIds,
            sedeId: sedeId ? parseInt(sedeId) : null // Enviar ID de sede
        };

        if (telefono && telefono.length !== 9) {
            await Swal.fire({ icon: 'error', title: 'Teléfono inválido', text: 'El teléfono debe contener exactamente 9 dígitos.' });
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/jueces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(juezRequest)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage = errorText;
                try {
                    const errorJson = JSON.parse(errorText);
                    if (errorJson && errorJson.message) errorMessage = errorJson.message;
                } catch (e) {}
                throw new Error(errorMessage);
            }

            await Swal.fire({
                icon: 'success',
                title: '¡Juez Creado!',
                text: 'El nuevo juez ha sido registrado exitosamente.',
                timer: 2000,
                showConfirmButton: false
            });
            window.location.href = 'adminjueces.html';

        } catch (error) {
            console.error('Error al crear el juez:', error);
            let errorTitle = 'Error al Crear Juez';
            if (error.message.includes('DNI')) errorTitle = 'DNI Duplicado';
            else if (error.message.includes('correo')) errorTitle = 'Correo Duplicado';
            
            Swal.fire({
                icon: 'error',
                title: errorTitle,
                text: error.message,
                confirmButtonColor: '#d33'
            });
        }
    });

    // --- Inicialización ---
    if (protectPage()) {
        loadCategorias();
        loadSedes(); // Cargar sedes al iniciar
    }
});
