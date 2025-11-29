// admin.js (Mejorado - Panel de Control Total)

// Contraseña de administrador.
const ADMIN_PASS = "1000"; 

// Dependencias (asumidas globales desde script.js, notificaciones.js, etc.):
// appData, toast, openModal, closeModal, save, renderGrid, initializeData, STORAGE_KEY

/**
 * Solicita la contraseña de administrador y abre el modal si es correcta.
 */
function openAdminAuth() {
    const pass = prompt("🔑 Ingrese Contraseña de Administrador:");
    if (pass === ADMIN_PASS) {
        renderUserList(); 
        renderAdminTools(); // Renderiza las nuevas herramientas
        openModal('adminModal');
        toast("Acceso de Administrador concedido", 'success');
    } else {
        toast("⛔ Contraseña Incorrecta", 'error'); 
    }
}

// --- Funciones de Gestión de Boletas ---

/**
 * Renderiza la interfaz de herramientas de gestión de boletas dentro del modal.
 */
function renderAdminTools() {
    const controlsContainer = document.getElementById('adminControls');
    if (!controlsContainer) return;

    controlsContainer.innerHTML = `
        <h4 style="margin-top: 5px;">🔧 Herramientas de Gestión de Boletas</h4>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; border: 1px solid var(--border); padding: 10px; border-radius: 8px;">
            <input type="text" id="adminTicketNum" placeholder="Número de Boleta (000-999)" style="width: 100%;">
            <select id="adminActionSelect" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-body); color: var(--text-main);">
                <option value="">Seleccione una Acción...</option>
                <option value="reserve">📝 Asignar/Reservar</option>
                <option value="pay">🔴 Marcar como Pagada</option>
                <option value="free">🗑️ Liberar Boleta</option>
            </select>
            <input type="email" id="adminUserEmail" placeholder="Email del Usuario (Requerido para Asignar/Pagar)" style="width: 100%;">
            <button onclick="handleAdminAction()" class="btn secondary" style="width:100%; margin-top: 5px;">Ejecutar Acción</button>
        </div>
    `;
    
    // Asignar el listener de búsqueda para filtrar la lista de boletas
    const searchInput = document.getElementById('adminTicketNum');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const num = e.target.value.padStart(3, '0');
            // Muestra info de la boleta actual
            const ticket = appData.tickets.find(t => t.num === num);
            if (ticket) {
                toast(`Boleta ${num}: Estado ${ticket.state.toUpperCase()}. Propietario: ${ticket.owner || 'Nadie'}`, 'warning');
            }
        });
    }
}


/**
 * Ejecuta la acción seleccionada por el administrador (Reservar, Pagar, Liberar).
 */
function handleAdminAction() {
    const numInput = document.getElementById('adminTicketNum').value.trim().padStart(3, '0');
    const action = document.getElementById('adminActionSelect').value;
    const email = document.getElementById('adminUserEmail').value.trim();

    if (!numInput || numInput.length !== 3 || isNaN(parseInt(numInput))) {
        return toast("⛔ Ingrese un número de boleta válido (000-999).", 'error');
    }
    if (!action) {
        return toast("⛔ Seleccione una acción.", 'error');
    }

    const ticket = appData.tickets.find(t => t.num === numInput);
    if (!ticket) {
        return toast(`⛔ Boleta ${numInput} no encontrada.`, 'error');
    }
    
    // 1. ASIGNAR/RESERVAR (reserve)
    if (action === 'reserve') {
        if (!email) return toast("⛔ El email del usuario es obligatorio para asignar.", 'error');
        if (ticket.state !== 'available') return toast(`⛔ La boleta ${numInput} no está disponible. Estado actual: ${ticket.state}.`, 'error');

        ticket.state = 'reserved';
        ticket.owner = email;
        logTransaction(ticket.num, 'RESERVADO_ADMIN', email);
        toast(`✅ Boleta ${numInput} reservada a nombre de ${email}.`, 'success');
    } 
    // 2. MARCAR COMO PAGADA (pay)
    else if (action === 'pay') {
        if (!email) return toast("⛔ El email del usuario es obligatorio para confirmar el pago.", 'error');
        if (ticket.state === 'paid' && ticket.owner === email) return toast(`⚠️ La boleta ${numInput} ya está pagada por este usuario.`, 'warning');

        // Si está libre, la reservamos y pagamos a la vez.
        if (ticket.state === 'available') {
            ticket.owner = email;
        } 
        // Si está reservada por otro usuario, se lo advertimos
        else if (ticket.owner && ticket.owner !== email) {
            if (!confirm(`⚠️ Advertencia: La boleta ${numInput} está asignada a ${ticket.owner}. ¿Desea reasignarla y marcarla como PAGADA a ${email}?`)) {
                return;
            }
            ticket.owner = email;
        }

        ticket.state = 'paid';
        logTransaction(ticket.num, 'PAGADO_ADMIN', email);
        toast(`🔴 Boleta ${numInput} marcada como PAGADA a ${email}.`, 'accent');
    } 
    // 3. LIBERAR BOLETA (free)
    else if (action === 'free') {
        if (!confirm(`⚠️ ¿Está seguro que desea LIBERAR la boleta ${numInput}? Volverá a estar disponible.`)) {
            return;
        }
        ticket.state = 'available';
        const previousOwner = ticket.owner;
        ticket.owner = null;
        logTransaction(ticket.num, 'LIBERADO_ADMIN', previousOwner);
        toast(`✅ Boleta ${numInput} liberada. Estado: disponible.`, 'success');
    }

    save();      // Guardar cambios en localStorage
    renderGrid(); // Refrescar la cuadrícula principal para que el cambio sea visible
    renderUserList(); // Refrescar la lista de usuarios (si ha habido un nuevo pago/reserva)
}

// --- Historial de Transacciones (Log) ---

/**
 * Agrega una entrada al registro de transacciones de administración (usando la consola como ejemplo simple).
 * En una aplicación real, esto iría a una base de datos.
 */
function logTransaction(num, action, userEmail) {
    console.log(`[ADMIN LOG ${new Date().toLocaleString()}] Boleta ${num}: ${action} por ${userEmail || 'N/A'}`);
    // Podríamos añadir un array 'appData.transactions' para almacenar esto si fuera necesario.
}


// --- Otras funciones de Administración (Mantenidas) ---

/**
 * Renderiza la lista de usuarios registrados en el panel de administrador.
 */
function renderUserList() {
    const tbody = document.getElementById('userListBody');
    if (!tbody) return;

    const sanitize = (str) => String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    tbody.innerHTML = appData.users.map(u => {
        const count = appData.tickets.filter(t => t.owner === u.email).length;
        return `
            <tr style="border-bottom:1px solid #333">
                <td style="padding:5px;">${sanitize(u.name)}</td>
                <td style="padding:5px;">${sanitize(u.phone)}</td>
                <td style="padding:5px;">${sanitize(u.email)}</td>
                <td style="padding:5px; font-size:0.7rem;">${count} Boletas</td>
            </tr>
        `;
    }).join('');
}

/**
 * Borra todos los datos del sistema (boletas y usuarios) y reinicia la aplicación.
 */
function resetSystem() {
    if(confirm("⚠️ ¿ESTÁS SEGURO?\nSe borrarán TODAS las reservas, pagos y usuarios.\nEsta acción no se puede deshacer.")) {
        localStorage.removeItem(STORAGE_KEY); 
        toast("Sistema Reiniciado y datos borrados.", 'error');
        setTimeout(() => window.location.reload(), 500);
    }
}

/**
 * Exporta el historial de usuarios a un archivo CSV.
 */
function exportData() {
    let csv = "Nombre,Email,Telefono,BoletasCompradas\n";
    
    const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;
    
    appData.users.forEach(u => {
        const count = appData.tickets.filter(t => t.owner === u.email && t.state === 'paid').length;
        csv += `${escape(u.name)},${escape(u.email)},${escape(u.phone)},${count}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `Usuarios_Rifa_COMPLETO_${new Date().toISOString().slice(0, 10)}.csv`; 
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast("📥 Datos de usuarios descargados correctamente.", 'success');
}
