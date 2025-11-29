// Función para mostrar notificaciones temporales en la esquina.
function toast(msg, type='success') {
    const container = document.getElementById('toast-container');
    if (!container) return; 

    const box = document.createElement('div');
    box.className = 'toast';
    box.textContent = msg;
    
    // Estilos basados en el tipo de notificación
    if(type === 'error') {
        box.style.borderLeftColor = 'var(--accent)'; 
        box.style.backgroundColor = 'rgba(255, 0, 51, 0.2)';
    } else if (type === 'success') {
        box.style.borderLeftColor = 'var(--primary)'; 
        box.style.backgroundColor = 'rgba(0, 255, 132, 0.2)';
    }

    container.appendChild(box);
    
    // Eliminar después de 3 segundos
    setTimeout(() => box.remove(), 3000);
}
