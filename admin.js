// Archivo: admin.js
// Contiene toda la lógica del Panel de Administración (Seguridad, Gestión de Estados, Checksum, Ganadores y Notificaciones)

// Función para acceder al panel de administración (con contraseña ofuscada)
function openAdminAuth() {
    const pass = prompt("Ingrese la contraseña de administrador:");
    
    // DECODIFICACIÓN BÁSICA DE LA CONTRASEÑA para evitar que esté en texto plano
    const ADMIN_PASS = atob(ADMIN_PASS_ENCODED); 
    
    if (pass === ADMIN_PASS) {
        appData.currentUser = { name: 'Admin', email: atob(ADMIN_PASS_ENCODED) + '@admin.com', phone: 'N/A' }; 
        renderAdminLists();
        openModal('adminModal');
    } else if (pass !== null) {
        toast("Contraseña incorrecta.", 'error');
    }
}

// --- GESTIÓN DE CHECKUM (Transparencia) ---

function generatePaidTicketsChecksum() {
    const paidTickets = appData.tickets
        .filter(t => t.state === 'paid')
        .map(t => {
            const ticket = appData.tickets.find(item => item.num === t.num);
            return `${t.num}:${ticket.owner ? ticket.owner.substring(0, 5) : 'manual'}`; 
        });
        
    paidTickets.sort(); 
    const dataString = paidTickets.join('|');
    
    let hash = 0;
    if (dataString.length === 0) return '000000'; 
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; 
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
}

function adminGenerateAndSetChecksum() {
    if (!appData.currentUser || appData.currentUser.email !== atob(ADMIN_PASS_ENCODED) + '@admin.com') return toast("Solo el Admin puede hacer esto.", 'error');

    const newChecksum = generatePaidTicketsChecksum();
    localStorage.setItem(STORAGE_KEY_CHECKSUM, newChecksum);
    updateUI(); 
    toast(`✅ Nuevo Checksum generado y guardado: ${newChecksum}`, 'success');
    
    navigator.clipboard.writeText(newChecksum).then(() => {
        toast('Checksum copiado al portapapeles!', 'success');
    });
}

function verifyPublicChecksum() {
    const storedChecksum = localStorage.getItem(STORAGE_KEY_CHECKSUM);
    const calculatedChecksum = generatePaidTicketsChecksum();
    
    if (!storedChecksum || storedChecksum === 'N/A') {
        toast("❌ Aún no se ha generado el código de integridad de transparencia.", 'warning');
        return;
    }
    
    const checksumDisplay = document.getElementById('checksumStatus');
    if (storedChecksum === calculatedChecksum) {
        toast("✅ ¡VERIFICACIÓN EXITOSA! Los datos de boletas pagadas son auténticos.", 'success');
        checksumDisplay.style.color = getCssVar('--primary');
        checksumDisplay.style.fontWeight = 'bold';
    } else {
        toast("⚠️ ¡ALERTA! EL CÓDIGO DE INTEGRIDAD NO COINCIDE. Contacte al administrador.", 'error');
        checksumDisplay.style.color = getCssVar('--accent');
        checksumDisplay.style.fontWeight = 'bold';
    }
}

// --- GESTIÓN DE LISTAS Y ESTADOS ---

function renderAdminLists() {
    const reservedBody = document.getElementById('reservedTicketListBody');
    const paidBody = document.getElementById('paidTicketListBody');
    reservedBody.innerHTML = '';
    paidBody.innerHTML = '';
    
    const reserved = appData.tickets.filter(t => t.state === 'reserved');
    reserved.forEach(t => {
        const user = getUserByEmail(t.owner);
        const remainingMs = t.reservedAt + RESERVATION_DURATION_MS - Date.now();
        const timeText = remainingMs > 0 
            ? `(${Math.ceil(remainingMs / (1000 * 60 * 60))}h restantes)`
            : `(EXPIRADA)`;
        
        const row = reservedBody.insertRow();
        row.innerHTML = `
            <td>${t.num}</td>
            <td>${user ? formatUser(user) : t.owner} ${timeText}</td>
            <td>
                <button onclick="adminSetState('${t.num}', 'paid')" class="btn accent" style="padding: 5px 10px; font-size: 0.7rem;">Pagar</button>
                <button onclick="adminSetState('${t.num}', 'available')" class="btn outline" style="padding: 5px 10px; font-size: 0.7rem;">Liberar</button>
            </td>
        `;
    });

    const paid = appData.tickets.filter(t => t.state === 'paid');
    paid.forEach(t => {
        const user = getUserByEmail(t.owner);
        const row = paidBody.insertRow();
        row.innerHTML = `
            <td>${t.num}</td>
            <td>${user ? formatUser(user) : t.owner}</td>
            <td>
                <button onclick="adminSetState('${t.num}', 'available')" class="btn warning" style="padding: 5px 10px; font-size: 0.7rem;">Liberar</button>
            </td>
        `;
    });
    renderUserList();
}

function renderUserList() {
    const body = document.getElementById('userListBody');
    const search = document.getElementById('adminUserSearch').value.toLowerCase();
    body.innerHTML = '';

    const filteredUsers = appData.users.filter(u => 
        u.name.toLowerCase().includes(search) || u.phone.includes(search)
    );

    filteredUsers.forEach(user => {
        const tickets = appData.tickets.filter(t => t.owner === user.email);
        const status = tickets.length > 0 ? `(${tickets.length} boletas)` : 'Sin boletas';
        const row = body.insertRow();
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.phone}</td>
            <td>${status}</td>
            <td>
                <button onclick="adminRemoveUser('${user.email}')" class="btn accent" style="padding: 5px 10px; font-size: 0.7rem;">Eliminar</button>
            </td>
        `;
    });
}

function adminRemoveUser(email) {
    if (confirm(`¿Estás seguro de ELIMINAR al cliente con email ${email}? Sus boletas NO se liberarán automáticamente; asegúrese de liberarlas manualmente en la lista de 'Pagadas'/'Reservadas' primero.`)) {
        appData.users = appData.users.filter(u => u.email !== email);
        save();
        renderAdminLists();
        toast("Cliente eliminado.", 'warning');
    }
}

function adminSetState(num, newState) {
    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket) return;

    if (newState === 'available') {
        ticket.state = 'available';
        ticket.owner = null;
        ticket.reservedAt = null;
    } else if (newState === 'paid') {
        ticket.state = 'paid';
        if (!ticket.owner) {
            return toast("Error: Esta boleta no tiene dueño asignado. Use 'Asignar Manual' primero.", 'error');
        }
        if (!ticket.reservedAt) ticket.reservedAt = Date.now(); 
    }
    
    save();
    renderAdminLists(); 
    renderGrid(); 
    toast(`Boleta ${num} cambiada a ${newState.toUpperCase()}`, 'success');
    
    if (newState === 'paid' && appData.currentUser && appData.currentUser.email === atob(ADMIN_PASS_ENCODED) + '@admin.com') {
         adminGenerateAndSetChecksum();
    }
}

function openManualAssignModal() {
    closeModal('adminModal');
    document.getElementById('manualNum').value = '';
    document.getElementById('manualName').value = '';
    document.getElementById('manualPhone').value = '';
    openModal('manualAssignModal');
    const manualPhoneInput = document.getElementById('manualPhone');
    manualPhoneInput.oninput = () => applyPhoneMask(manualPhoneInput);
}

function handleManualAssign(event, state) {
    event.preventDefault();
    const num = document.getElementById('manualNum').value.padStart(3, '0');
    const name = document.getElementById('manualName').value.trim();
    const phone = document.getElementById('manualPhone').value.trim();
    
    const uniqueEmail = `manual_${phone.replace(/\D/g, '')}@riffa.com`; 

    const ticket = appData.tickets.find(t => t.num === num);

    if (!ticket) return toast("Número de boleta inválido.", 'error');
    if (ticket.state !== 'available') return toast(`El número ${num} ya está ${ticket.state}.`, 'error');

    let user = getUserByEmail(uniqueEmail);
    if (!user) {
        user = { name, email: uniqueEmail, phone };
        appData.users.push(user);
    } else {
         user.name = name; 
    }

    ticket.state = state;
    ticket.owner = uniqueEmail;
    ticket.reservedAt = Date.now();

    save();
    closeModal('manualAssignModal');
    toast(`Asignación manual de ${num} como ${state.toUpperCase()} exitosa.`, 'success');
    openModal('adminModal'); 
}

// --- GESTIÓN DE SORTEOS ---

function previewWinnerInfo() {
    const numInput = document.getElementById('winnerNum');
    const num = numInput.value.padStart(3, '0');
    const info = document.getElementById('winnerInfo');
    
    const primaryColor = getCssVar('--primary');
    const accentColor = getCssVar('--accent');
    const warningColor = getCssVar('--warning');
    
    if (num.length !== 3) {
        info.textContent = 'Ingrese un número de 3 dígitos (ej: 123)';
        return;
    }
    
    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket) {
        info.innerHTML = `⚠️ El número <span style="color: ${accentColor};">${num}</span> no existe.`;
        return;
    }

    const status = ticket.state;
    if (status === 'available') {
        info.innerHTML = `🚫 El número <span style="color: ${primaryColor};">${num}</span> está **LIBRE**. No hay un ganador pagado.`;
    } else if (status === 'reserved') {
        const user = getUserByEmail(ticket.owner);
        info.innerHTML = `⏳ El número <span style="color: ${warningColor};">${num}</span> está **RESERVADO** por **${user ? user.name : ticket.owner}**. ¡Aún no está PAGADO!`;
    } else if (status === 'paid') {
        const user = getUserByEmail(ticket.owner);
        info.innerHTML = `✅ ¡GANADOR! El número <span style="color: ${accentColor};">${num}</span> está **PAGADO** por **${user ? user.name : ticket.owner}**.`;
    }
}

function openWinnerManagement() {
    closeModal('adminModal');
    document.getElementById('winnerDate').valueAsDate = new Date();
    document.getElementById('winnerNum').value = '';
    document.getElementById('winnerInfo').textContent = 'Ingrese un número de 3 dígitos (ej: 123)';
    openModal('winnerManagementModal');
    
    const winnerNumInput = document.getElementById('winnerNum');
    winnerNumInput.removeEventListener('input', previewWinnerInfo);
    winnerNumInput.addEventListener('input', previewWinnerInfo);
}

function checkAndAddWinner() {
    const num = document.getElementById('winnerNum').value.padStart(3, '0');
    const date = document.getElementById('winnerDate').value;
    const type = document.getElementById('winnerType').value;
    
    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket) return toast("Número ganador inválido (debe ser 3 cifras).", 'error');

    const ownerInfo = ticket.owner ? getUserByEmail(ticket.owner) : null;
    const winnerName = ownerInfo ? ownerInfo.name : "Nadie (Boleta Libre)";
    const ownerEmail = ticket.owner || "available";

    if (ticket.state !== 'paid') {
        if (!confirm(`ADVERTENCIA: El ganador de la lotería es ${num}, pero la boleta está como ${ticket.state.toUpperCase()} (${winnerName}). ¿Desea registrarlo como ganador de todos modos?`)) {
            return;
        }
    } else {
        if (!confirm(`CONFIRMAR: Registrar a ${winnerName} con el número ${num} como ganador del Sorteo ${type.toUpperCase()} del ${date}?`)) {
            return;
        }
    }

    const exists = appData.winners.some(w => w.date === date && w.type === type);
    if (exists && !confirm(`ADVERTENCIA: Ya existe un ganador registrado para el sorteo ${type.toUpperCase()} de la fecha ${date}. ¿Desea registrar este nuevo resultado y duplicar el registro?`)) {
        return;
    }

    const newWinner = { date, num, winnerName, type, ownerEmail };
    appData.winners.unshift(newWinner); 

    if (type === 'final' && ticket.state !== 'available') {
        adminSetState(num, 'available');
    }

    save();
    closeModal('winnerManagementModal');
    toast(`Ganador ${winnerName} registrado para ${num}.`, 'success');
}

function openWinnerHistory() {
    renderWinnerHistory();
    openModal('winnerHistoryModal');
}

function renderWinnerHistory() {
    const body = document.getElementById('winnerListBody');
    body.innerHTML = '';
    
    const totalWeeklyDraws = 18; 
    const completedWeeklyDraws = appData.winners.filter(w => w.type === 'weekly').length;
    const weeklyDrawsLeft = Math.max(0, totalWeeklyDraws - completedWeeklyDraws);
    const finalDrawn = appData.winners.some(w => w.type === 'final');

    appData.winners.forEach(w => {
        const row = body.insertRow();
        row.style.color = w.type === 'final' ? getCssVar('--accent') : getCssVar('--warning');
        row.innerHTML = `
            <td>${w.date}</td>
            <td>${w.type === 'final' ? 'FINAL' : 'Semanal (1M)'}</td>
            <td><strong style="font-size: 1.1rem;">${w.num}</strong></td>
            <td>${w.winnerName}</td>
        `;
    });


    const remainingText = `Sorteos semanales registrados: ${completedWeeklyDraws}. Estimados restantes: ${weeklyDrawsLeft}. Sorteo Final: ${finalDrawn ? 'Realizado' : 'PENDIENTE'}.`;
    document.getElementById('drawsRemaining').textContent = remainingText;
}

function deleteWinnerHistory() {
    if (confirm("ADVERTENCIA: ¿Estás seguro de ELIMINAR TODO el historial de ganadores? Esta acción no se puede deshacer.")) {
        appData.winners = [];
        save();
        renderWinnerHistory();
        toast("Historial de ganadores eliminado.", 'warning');
    }
}

// --- NOTIFICACIONES DE VENCIMIENTO (NUEVO MÓDULO) ---

const WARNING_BEFORE_EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 horas antes de expirar

function getExpiringReservations() {
    const now = Date.now();
    const imminentExpiryTime = now + WARNING_BEFORE_EXPIRY_MS;

    const expiringTickets = appData.tickets.filter(t => {
        if (t.state === 'reserved' && t.reservedAt) {
            const expiryTime = t.reservedAt + RESERVATION_DURATION_MS;
            return expiryTime > now && expiryTime <= imminentExpiryTime;
        }
        return false;
    });

    const userGroups = expiringTickets.reduce((acc, t) => {
        const user = getUserByEmail(t.owner);
        if (user) {
            if (!acc[user.email]) {
                acc[user.email] = {
                    name: user.name,
                    phone: user.phone,
                    tickets: [],
                };
            }
            acc[user.email].tickets.push(t.num);
        }
        return acc;
    }, {});

    return Object.values(userGroups);
}

function openNotificationModal() {
    if (!appData.currentUser || appData.currentUser.email !== atob(ADMIN_PASS_ENCODED) + '@admin.com') {
        return toast("Función de administración.", 'error');
    }

    const expiringUsers = getExpiringReservations();
    const modalBody = document.getElementById('notificationListBody');
    modalBody.innerHTML = '';
    
    if (expiringUsers.length === 0) {
        modalBody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">✅ ¡Excelente! Ninguna reserva está a punto de expirar en las próximas 3 horas.</td></tr>';
    } else {
        expiringUsers.forEach(user => {
            const ticketList = user.tickets.join(', ');
            const whatsappLink = `https://api.whatsapp.com/send?phone=${user.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`¡URGENTE! Tu reserva en la Rifa de la Moto (${ticketList}) expira pronto. Paga ahora para asegurar tus números. Número de contacto: 3219637388`)}`;
            
            const row = modalBody.insertRow();
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.phone}</td>
                <td>
                    <a href="${whatsappLink}" target="_blank" class="btn warning" style="padding: 5px 10px; font-size: 0.7rem;">
                        <i class="fab fa-whatsapp"></i> Notificar (WA)
                    </a>
                </td>
            `;
        });
    }

    closeModal('adminModal'); // Cerrar el modal de admin antes de abrir el de notificaciones
    openModal('notificationModal');
}


// --- FUNCIONES DE EXPORTACIÓN Y RESET GENERAL ---

function adminResetRaffle() {
    if (confirm("ADVERTENCIA CRÍTICA: ¿Estás ABSOLUTAMENTE SEGURO de que deseas restablecer la Rifa? Esto eliminará todos los datos de tickets, usuarios, reservas y ganadores de forma permanente.")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("last_weekly_clearance_timestamp"); 
        localStorage.removeItem(STORAGE_KEY_CHECKSUM); 
        localStorage.removeItem(STORAGE_KEY_SOCIAL); // NUEVO: Limpiar social
        location.reload();
    }
}

function exportData(data, filename) {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`Exportando ${filename}...`, 'success');
}

function exportPaidTickets() {
    const paid = appData.tickets.filter(t => t.state === 'paid').map(t => {
        const user = getUserByEmail(t.owner);
        return {
            numero: t.num,
            estado: 'PAGADO',
            nombre: user ? user.name : 'N/A',
            celular: user ? user.phone : 'N/A',
            email: t.owner
        };
    });
    exportData(paid, `Rifa_Boletas_Pagadas_${new Date().toISOString().slice(0, 10)}.json`);
}