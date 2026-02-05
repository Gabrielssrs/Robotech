document.addEventListener('DOMContentLoaded', () => {
    const listItems = document.querySelectorAll('.doc-index li');

    listItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remover activo de otros
            listItems.forEach(i => {
                i.classList.remove('active');
                const icon = i.querySelector('i');
                if(icon) icon.remove();
            });

            // Activar actual
            item.classList.add('active');
            item.innerHTML += ' <i class="fa-solid fa-chevron-right"></i>';
            
            // Simular navegación (aquí podrías usar scrollIntoView)
            console.log("Navegando a:", item.innerText);
        });
    });
});