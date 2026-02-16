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

    // --- Función de validación completa ---
    function validateForm() {
        const fields = {
            nombre_juez: { element: document.getElementById('nombre_juez'), label: 'Nombre' },
            apellido_juez: { element: document.getElementById('apellido_juez'), label: 'Apellido' },
            dni_juez: { element: document.getElementById('dni_juez'), label: 'DNI' },
            email_juez: { element: document.getElementById('email_juez'), label: 'Correo Electrónico' },
            telefono_juez: { element: document.getElementById('telefono_juez'), label: 'Teléfono' },
            contrasena_juez: { element: document.getElementById('contrasena_juez'), label: 'Contraseña' },
            credencial: { element: document.getElementById('credencial'), label: 'Nivel de Credencial' },
            sede_juez: { element: document.getElementById('sede_juez'), label: 'Sede Asignada' }
        };

        const errors = [];

        // Validar que todos los campos obligatorios estén completos
        for (const [key, field] of Object.entries(fields)) {
            const value = field.element.value.trim();

            if (!value) {
                errors.push(`${field.label} es obligatorio.`);
                highlightField(field.element, true);
            } else {
                highlightField(field.element, false);
            }
        }

        // Validación específica para DNI (8 dígitos)
        const dniValue = fields.dni_juez.element.value.trim();
        if (dniValue && !/^\d{8}$/.test(dniValue)) {
            errors.push('DNI debe contener exactamente 8 dígitos.');
            highlightField(fields.dni_juez.element, true);
        }

        // Validación específica para Teléfono (9 dígitos)
        const telefonoValue = fields.telefono_juez.element.value.trim();
        if (telefonoValue && !/^\d{9}$/.test(telefonoValue)) {
            errors.push('Teléfono debe contener exactamente 9 dígitos.');
            highlightField(fields.telefono_juez.element, true);
        }

        // Validación específica para Email
        const emailValue = fields.email_juez.element.value.trim();
        
        // Validar presencia de @
        if (emailValue && !emailValue.includes('@')) {
            errors.push('El correo electrónico debe contener un símbolo @ (Ej: juez@dominio.com).');
            highlightField(fields.email_juez.element, true);
        } else {
            // Validación con expresión regular: usuario@dominio.extension
            const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
            if (emailValue && !emailRegex.test(emailValue)) {
                errors.push('El formato del correo electrónico no es válido. Debe ser: usuario@dominio.extensión (Ej: juez@example.com).');
                highlightField(fields.email_juez.element, true);
            } else {
                // Validar que tenga una extensión válida
                const partes = emailValue.split('.');
                const extension = partes[partes.length - 1].toLowerCase();
                
                const extensionesValidas = ['com', 'org', 'net', 'es', 'co', 'ar', 'mx', 'pe', 'cl', 've', 'cu', 'do', 'bo', 'py', 'uy', 'ec', 'br', 'info', 'biz', 'edu', 'gov', 'io', 'dev', 'tech', 'app', 'pro'];
                
                if (emailValue && !extensionesValidas.includes(extension)) {
                    errors.push(`La extensión ".${extension}" no es válida. Use dominios como .com, .org, .net, .es, .edu, etc.`);
                    highlightField(fields.email_juez.element, true);
                } else {
                    highlightField(fields.email_juez.element, false);
                }
            }
        }

        // Validación de Contraseña (mínimo 6 caracteres)
        const passwordValue = fields.contrasena_juez.element.value;
        if (passwordValue && passwordValue.length < 6) {
            errors.push('Contraseña debe tener al menos 6 caracteres.');
            highlightField(fields.contrasena_juez.element, true);
        }

        // Validar que Sede tenga un valor válido (no sea vacío)
        const sedeValue = fields.sede_juez.element.value;
        if (!sedeValue) {
            errors.push('Debe seleccionar una Sede Asignada.');
            highlightField(fields.sede_juez.element, true);
        }

        return errors;
    }

    // --- Función para resaltar campos con error ---
    function highlightField(element, hasError) {
        if (hasError) {
            element.style.borderColor = '#dc3545';
            element.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.15)';
        } else {
            element.style.borderColor = '#1f1f25';
            element.style.boxShadow = 'none';
        }
    }

    // --- Remover highlight al escribir ---
    const inputFields = document.querySelectorAll('input, select');
    inputFields.forEach(field => {
        field.addEventListener('input', () => {
            highlightField(field, false);
        });
        field.addEventListener('change', () => {
            highlightField(field, false);
        });
    });

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

        // Validar formulario
        const validationErrors = validateForm();
        if (validationErrors.length > 0) {
            const errorMessage = validationErrors.join('\n');
            await Swal.fire({
                icon: 'error',
                title: 'Campos Incompletos',
                html: errorMessage.replace(/\n/g, '<br>'),
                confirmButtonColor: '#dc3545'
            });
            return;
        }

        const nombre = document.getElementById('nombre_juez').value.trim() + ' ' + document.getElementById('apellido_juez').value.trim();
        const dni = document.getElementById('dni_juez').value.trim();
        const correo = document.getElementById('email_juez').value.trim();
        const telefono = document.getElementById('telefono_juez').value.trim();
        const contrasena = document.getElementById('contrasena_juez').value;
        const nivelCredencialValue = document.getElementById('credencial').value;
        const sedeId = document.getElementById('sede_juez').value;
        
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
            sedeId: sedeId ? parseInt(sedeId) : null
        };

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
        loadSedes();
    }
});
