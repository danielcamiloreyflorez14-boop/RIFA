// social.js

// NOTA: Este script depende de 'appData', 'openModal' (de script.js) 
// y 'toast' (de notificaciones.js)

/**
 * Muestra las instrucciones detalladas de pago en un pop-up.
 */
function showInstructions() {
    alert("📢 PASOS PARA ASEGURAR TU BOLETA:\n\n" +
          "1. **RESERVA:** Selecciona tu número en la cuadrícula (se pondrá en amarillo/RESERVADO).\n" +
          "2. **PAGO:** Envía $25.000 COP al Nequi 321 963 7388.\n" +
          "3. **CONFIRMA:** Envía el comprobante de pago al WhatsApp del Administrador (botón flotante 📞).\n" +
          "4. **ESTADO:** El Administrador confirmará la transacción, y tu boleta cambiará a ROJO (PAGADO).");
}

/**
 * Filtra y muestra los números que el usuario logueado tiene reservados o pagados.
 */
function checkMyTickets() {
    // Si no hay usuario logueado, pide que se identifique.
    if(!appData.currentUser) {
        toast("⚠️ Necesitas ingresar para ver tus boletas.", 'warning');
        return openModal('loginModal');
    }
    
    // Filtra las boletas del usuario actual
    const my = appData.tickets.filter(t => t.owner === appData.currentUser.email);
    
    const reserved = my.filter(t => t.state === 'reserved').map(t => t.num).join(', ');
    const paid = my.filter(t => t.state === 'paid').map(t => t.num).join(', ');

    let msg = `🎟️ TUS BOLETAS REGISTRADAS (${my.length} total):\n\n`;
    msg += `⏳ RESERVADAS (PAGO PENDIENTE):\n${reserved || 'Ninguna'}\n\n`;
    msg += `✅ PAGADAS (ASEGURADAS):\n${paid || 'Ninguna'}`;
    
    alert(my.length ? msg : "Aún no tienes números reservados o comprados. ¡Es tu momento!");
}

/**
 * Alterna entre el tema claro y oscuro de la aplicación (clase 'light-mode').
 */
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    toast("Tema cambiado", 'warning');
}

// --- MEJORA UX: CAMBIO DE TÍTULO EN TIEMPO REAL ---
window.addEventListener('load', () => {
    const userNameInput = document.getElementById('userName');
    const loginTitle = document.getElementById('loginTitle');

    if (userNameInput && loginTitle) {
        // Evento que se dispara cada vez que se escribe en el campo de nombre
        userNameInput.addEventListener('input', () => {
            const name = userNameInput.value.trim();
            // Muestra el nombre del usuario en el título del modal mientras lo escribe
            loginTitle.textContent = name.length > 0 
                ? `👋 Hola, ${name.split(' ')[0]}` 
                : `👤 Identifícate`; 
        });
    }
});
