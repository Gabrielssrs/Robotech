// --- LÓGICA DE AUTENTICACIÓN Y TOKEN ---

// URL de tu API (Ajustar según tu entorno)
const API_URL = '/api/v1/configuracion'; 

// Verificar token al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwtToken');
    
    if (!token) {
        // Si no hay token, mostrar modal
        mostrarModalToken();
    } else {
        // Si hay token, intentar cargar configuraciones
        cargarConfiguraciones();
    }

    // Listener para logout button
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cerrarSesion();
        });
    }
});

// Mostrar modal de token
function mostrarModalToken() {
    const modal = document.getElementById('tokenModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Ocultar modal de token
function ocultarModalToken() {
    const modal = document.getElementById('tokenModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Guardar token y verificar
async function guardarToken(event) {
    event.preventDefault();
    const tokenInput = document.getElementById('tokenInput');
    const token = tokenInput.value.trim();
    const statusDiv = document.getElementById('tokenStatus');

    if (!token) {
        mostrarEstadoToken('Por favor ingresa un token', false);
        return;
    }

    try {
        // Verificar que el token sea válido decodificándolo
        const partes = token.split('.');
        if (partes.length !== 3) {
            mostrarEstadoToken('Token inválido. Debe ser un JWT válido', false);
            return;
        }

        // Decodificar el payload
        const payload = JSON.parse(atob(partes[1]));
        
        // Verificar que tenga rol de administrador
        const roles = payload.roles || payload.authorities || [];
        const esAdmin = roles.some(r => 
            (typeof r === 'string' ? r : r.authority) === 'ROLE_ADM_SISTEMA'
        );

        if (!esAdmin) {
            mostrarEstadoToken('⚠️ Token válido pero sin permisos de administrador', false);
            return;
        }

        // Guardar token en localStorage
        localStorage.setItem('jwtToken', token);
        mostrarEstadoToken('✓ Token verificado correctamente', true);
        
        // Esperar 1 segundo y luego cerrar modal y cargar datos
        setTimeout(() => {
            ocultarModalToken();
            cargarConfiguraciones();
        }, 1000);

    } catch (error) {
        console.error(error);
        mostrarEstadoToken('Error al verificar el token: ' + error.message, false);
    }
}

// Mostrar estado del token
function mostrarEstadoToken(mensaje, esExito) {
    const statusDiv = document.getElementById('tokenStatus');
    statusDiv.className = 'token-status ' + (esExito ? 'success' : 'error');
    statusDiv.textContent = mensaje;
}

// Limpiar campo de token
function limpiarToken() {
    const tokenInput = document.getElementById('tokenInput');
    const statusDiv = document.getElementById('tokenStatus');
    tokenInput.value = '';
    statusDiv.textContent = '';
    statusDiv.className = 'token-status';
    tokenInput.focus();
}

// Cerrar sesión
function cerrarSesion() {
    localStorage.removeItem('jwtToken');
    Swal.fire({
        icon: 'success',
        title: 'Sesión cerrada',
        text: 'Has cerrado sesión correctamente',
        timer: 1500,
        showConfirmButton: false
    }).then(() => {
        window.location.href = 'login.html';
    });
}

// --- LÓGICA DE CONFIGURACIONES ---

// Función para cargar datos desde el backend
async function cargarConfiguraciones() {
    try {
        const token = localStorage.getItem('jwtToken');
        
        if (!token) {
            mostrarModalToken();
            return;
        }

        // Aquí harías el fetch real:
        const response = await fetch(API_URL, {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar configuraciones: ' + response.status);
        }

        const data = await response.json();
        
        // Si la API falla o está vacía, usar datos simulados para prueba visual
        if (!data || data.length === 0) {
            console.warn("No se recibieron datos, usando simulación.");
            const dataSimulada = [
                { clave: 'EMAIL_OFICIAL_ROBOTECH', valor: 'oficial@robotech.com' },
                { clave: 'EMAIL_SOPORTE', valor: 'soporte@robotech.com' },
                { clave: 'TELEFONO_SOPORTE', valor: '+51 900 000 000' },
                { clave: 'BASE_URL', valor: 'http://localhost:8080' },
                { clave: 'TIEMPO_EDICION_MINUTOS', valor: '15' },
                { clave: 'EXPIRACION_TOKEN_MINUTOS', valor: '30' },
                { clave: 'SMTP_HOST', valor: 'smtp.gmail.com' },
                { clave: 'SMTP_PORT', valor: '587' },
                { clave: 'SMTP_USERNAME', valor: 'admin@robotech.com' },
                { clave: 'SMTP_PASSWORD', valor: '********' }
            ];
            rellenarFormularios(dataSimulada);
        } else {
            rellenarFormularios(data);
        }

    } catch (error) {
        Swal.fire('Error', 'Error al cargar configuraciones: ' + error.message, 'error');
        console.error(error);
        mostrarModalToken();
    }
}

// Rellena los inputs basándose en el atributo 'name' que coincide con la 'clave' de la BD
function rellenarFormularios(data) {
    data.forEach(config => {
        const input = document.querySelector(`input[name="${config.clave}"]`);
        if (input) {
            input.value = config.valor;
        }
    });
}

// Manejador para el formulario de Comunicación
async function guardarComunicacion(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    setLoading(btn, true);

    const token = localStorage.getItem('jwtToken');

    const datos = {
        EMAIL_OFICIAL_ROBOTECH: document.getElementById('emailOficial').value,
        EMAIL_SOPORTE: document.getElementById('emailSoporte').value,
        TELEFONO_SOPORTE: document.getElementById('telefonoSoporte').value,
        BASE_URL: document.getElementById('baseUrl').value
    };

    await enviarCambios(datos, token);
    setLoading(btn, false);
}

// Manejador para el formulario de Seguridad
async function guardarSeguridad(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    setLoading(btn, true);

    const token = localStorage.getItem('jwtToken');

    const datos = {
        TIEMPO_EDICION_MINUTOS: document.getElementById('tiempoEdicion').value,
        EXPIRACION_TOKEN_MINUTOS: document.getElementById('expiracionToken').value
    };

    await enviarCambios(datos, token);
    setLoading(btn, false);
}

// Manejador para el formulario SMTP
async function guardarSMTP(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    setLoading(btn, true);

    const token = localStorage.getItem('jwtToken');

    const datos = {
        SMTP_HOST: document.getElementById('smtpHost').value,
        SMTP_PORT: document.getElementById('smtpPort').value,
        SMTP_USERNAME: document.getElementById('smtpUser').value,
        SMTP_PASSWORD: document.getElementById('smtpPass').value
    };

    await enviarCambios(datos, token);
    setLoading(btn, false);
}

// Función genérica para enviar actualizaciones al backend
async function enviarCambios(mapaClaveValor, token) {
    try {
        // Iteramos sobre las claves para enviar peticiones individuales 
        for (const [clave, valor] of Object.entries(mapaClaveValor)) {
            console.log(`Guardando ${clave}...`);
            
            await fetch(`${API_URL}/${clave}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ valor: valor })
            });
        }

        Swal.fire({
            icon: 'success',
            title: 'Guardado',
            text: 'Configuración actualizada correctamente',
            timer: 2000,
            showConfirmButton: false
        });

    } catch (error) {
        Swal.fire('Error', 'Error al guardar los cambios: ' + error.message, 'error');
        console.error(error);
    }
}

// Utilidad para estado de carga en botones
function setLoading(btn, isLoading) {
    if (isLoading) {
        btn.disabled = true;
        btn.dataset.originalText = btn.textContent;
        btn.textContent = 'Guardando...';
    } else {
        btn.disabled = false;
        btn.textContent = btn.dataset.originalText || 'Guardar Cambios';
    }
}
