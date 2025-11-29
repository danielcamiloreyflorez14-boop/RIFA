// notificaciones.js

/**
 * Muestra una notificación temporal "toast" en la esquina superior derecha.
 * @param {string} msg El mensaje a mostrar.
 * @param {string} type El tipo de notificación ('success', 'error', 'warning').
 */
function toast(msg, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.warn("Contenedor de notificaciones no encontrado (#toast-container). Mensaje: " + msg);
        return; 
    }

    const box = document.createElement('div');
    box.className = 'toast';
    box.textContent = msg;
    
    // Aplicar estilos específicos basados en el tipo de notificación
    if(type === 'error') {
        box.style.borderLeftColor = 'var(--accent)'; // Rojo
        box.style.backgroundColor = 'rgba(255, 0, 51, 0.2)';
    } else if (type === 'warning') {
        box.style.borderLeftColor = 'var(--warning)'; // Amarillo
        box.style.backgroundColor = 'rgba(255, 234, 0, 0.2)';
    } else { // 'success'
        box.style.borderLeftColor = 'var(--primary)'; // Verde Neón
        box.style.backgroundColor = 'rgba(0, 255, 132, 0.2)';
    }

    container.appendChild(box);
    
    // Eliminar la notificación después de 3.5 segundos.
    setTimeout(() => {
        // Suaviza la salida con una animación simple antes de eliminar el elemento
        box.style.transition='opacity 0.4s, transform 0.4s'; 
        box.style.opacity='0'; 
        box.style.transform='translateX(100%)';
        
        // Eliminar el elemento del DOM después de que termine la transición
        setTimeout(() => box.remove(), 400); 
    }, 3500);
}
