// Depende de appData y openModal (script.js)

// --- UTILIDADES UX/SOCIAL ---

// Función para mostrar las instrucciones de pago.
function showInstructions() {
    alert("PASOS PARA PAGAR:\n\n1. Selecciona tu número (ponlo en Reservado).\n2. Envía $25.000 al Nequi 321 963 7388.\n3. Envía el comprobante al WhatsApp del Admin (ver botón flotante).\n4. El Admin cambiará tu boleta a color ROJO (Pagado).");
}

// Función para ver las boletas que el usuario tiene reservadas o pagadas.
function checkMyTickets() {
    if(!appData.currentUser) return openModal('loginModal');
    
    if (!appData.tickets) {
        return alert("Error: Datos de la rifa no cargados correctamente.");
    }
    
    const my = appData.tickets.filter(t => t.owner === appData.currentUser.email);
    const nums = my.map(t => `${t.num} (${t.state.toUpperCase()})`).join(', ');
    
    alert(my.length 
        ? `Tus números (${my.length} total): ${nums}` 
        : "No tienes números reservados o pagados. ¡Reserva el tuyo ahora!");
}

// Función para cambiar entre el tema Oscuro y Claro.
function toggleTheme() {
    document.body.classList.toggle('light-mode');
}

// Mejora UX: Event Listener para cambiar el título del modal de login.
window.addEventListener('load', () => {
    const userNameInput = document.getElementById('userName');
    const loginTitle = document.getElementById('loginTitle');

    if (userNameInput && loginTitle) {
        userNameInput.addEventListener('input', () => {
            const name = userNameInput.value.trim();
            if (name.length > 0) {
                loginTitle.textContent = `👋 Hola, ${name}`; 
            } else {
                loginTitle.textContent = `👤 Identifícate`; 
            }
        });
    }
});
