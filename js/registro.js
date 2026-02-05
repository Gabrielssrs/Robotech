// Espera a que todo el contenido del HTML esté cargado
document.addEventListener('DOMContentLoaded', function() {

    // Selecciona el formulario por su ID
    const form = document.getElementById('registro-form');
    // Selecciona el div donde mostraremos los mensajes
    const messageDiv = document.getElementById('form-message');

    // Añade un evento para escuchar cuando el formulario se intente enviar
    form.addEventListener('submit', function(event) {
        
        // Previene el comportamiento por defecto del formulario (que es recargar la página)
        event.preventDefault();

        // Crea un objeto FormData para recolectar los datos del formulario fácilmente
        const formData = new FormData(form);
        
        // Convierte los datos del formulario a un objeto simple de JavaScript
        const data = Object.fromEntries(formData.entries());

        // Muestra los datos que se enviarán en la consola (útil para depurar)
        console.log('Datos a enviar:', data);

        // Define la URL del endpoint de tu API
        const apiUrl = 'http://localhost:8080/api/competidores/registro';

        // Usa la API Fetch para enviar los datos al backend
        fetch(apiUrl, {
            method: 'POST', // Método de la petición
            headers: {
                'Content-Type': 'application/json' // Indica que el cuerpo es un JSON
            },
            body: JSON.stringify(data) // Convierte el objeto de JS a una cadena JSON
        })
        .then(response => {
            // La primera promesa se resuelve cuando se reciben las cabeceras de la respuesta
            if (response.ok) {
                // Si la respuesta es exitosa (ej. status 201 Created), procesa el cuerpo como JSON
                return response.json();
            } else {
                // Si hay un error (ej. status 400 Bad Request), procesa el cuerpo como texto
                // y rechaza la promesa para que sea capturada por el .catch()
                return response.text().then(text => { throw new Error(text) });
            }
        })
        .then(competidorRegistrado => {
            // Este bloque se ejecuta si la petición fue exitosa
            console.log('Registro exitoso:', competidorRegistrado);
            messageDiv.textContent = '¡Registro exitoso! Serás redirigido al inicio de sesión.';
            messageDiv.className = 'form-message success'; // Aplica estilo de éxito
            
            // Opcional: Redirige al usuario a la página de login después de unos segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000); // 3 segundos
        })
        .catch(error => {
            // Este bloque se ejecuta si hubo un error en la red o si la respuesta no fue 'ok'
            console.error('Error en el registro:', error.message);
            // Muestra el mensaje de error que viene del backend
            messageDiv.textContent = error.message;
            messageDiv.className = 'form-message error'; // Aplica estilo de error
        });
    });
});
