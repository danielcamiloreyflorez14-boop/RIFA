// --- CONFIGURACIÓN DE LA NUBE (JSONBIN) ---
// ⚠️ ¡Pega tus códigos de JSONBin aquí!
const BIN_ID = "692b4082d0ea881f40082dd8"; // Ejemplo: 65a4b7...
const API_KEY = "$2a$10$btubrp5/k9UZtRxdMXILp.ceTlBBAGY1lM/rZNSEl25bV/O1kbeZi";   // Ejemplo: $2b$10...

// --- CONFIGURACIÓN GLOBAL ---
// Nota: 'STORAGE_KEY' ya no es necesaria y fue eliminada.
const ADMIN_PASS_ENCODED = "MDAwLTk5OQ=="; // Contraseña "000-999" codificada
const TOTAL_TICKETS = 1000;
const MAX_RESERVATIONS_PER_USER = 3; 
const FINAL_RAFFLE_DATE = new Date('2026-01-30T22:00:00'); 
const WEEKLY_DRAW_DAY = 5; // 0=Domingo, 5=Viernes
const WEEKLY_DRAW_HOUR = 22; // 10 PM (22:00)
const RESERVATION_CLEARANCE_HOUR = 17; // 5 PM (17:00) Viernes
const RESERVATION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Horas
const LAST_WEEKLY_DRAW = new Date('2026-01-23T22:00:00').getTime(); 
 
// --- ESTADO GLOBAL ---
let appData = {
    tickets: [],   // { num, state, owner (email), reservedAt }
    users: [],     // { name, email, phone }
    currentUser: null,
    selectedTickets: [], 
    winners: [], 
};

// --- SEGURIDAD BÁSICA CREATIVA (Anti-Inspección) ---
// Evita el menú contextual y las herramientas de desarrollo para disuadir la manipulación
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('keydown', e => {
    // Bloquea F12, Ctrl+Shift+I, Ctrl+Shift+J (Windows/Linux) y Cmd+Option+I/J (Mac)
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'))) {
        console.warn('Advertencia: La manipulación de datos en la consola está restringida.');
        e.preventDefault();
        toast('Acceso a herramientas de desarrollo bloqueado.', 'error');
    }
});


// --- FUNCIONES DE UTILIDAD GENERAL ---

/** Obtiene el valor de una variable CSS */
function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function formatNum(num) { 
    return parseInt(num).toString().padStart(3, '0'); 
}
function formatUser(user) { return `${user.name} (${user.phone})`; }
function getUserByEmail(email) { return appData.users.find(u => u.email === email); }

/** Muestra un mensaje temporal en la esquina */
function toast(msg, type='success') {
    const box = document.createElement('div');
    box.className = `toast ${type}`;
    if (type === 'warning' && !document.body.classList.contains('light-mode')) {
         box.style.color = '#000'; 
    }
    box.innerHTML = msg; 
    document.getElementById('toast-container').appendChild(box);
    setTimeout(() => {
        box.style.transition='opacity .4s, transform .4s'; 
        box.style.opacity='0'; 
        box.style.transform='translateX(8px)'; 
        setTimeout(()=>box.remove(),450);
    }, 4000);
}

/** Gestiona los modales */
function openModal(id) { 
    document.getElementById(id).classList.add('open'); 
    // Asegurar que la previsualización del ganador funcione si se abre ese modal
    if (id === 'winnerManagementModal') {
        document.getElementById('winnerNum').value = '';
        document.getElementById('winnerInfo').textContent = 'Ingrese un número de 3 dígitos (ej: 123)';
    }
}
function closeModal(id) { 
    document.getElementById(id).classList.remove('open'); 
    if (id === 'verifyModal') {
        document.getElementById('verifyNum').value = '';
        document.getElementById('verifyResult').innerHTML = '<p style="color:var(--text-muted); margin:0;">Escribe un número para verificar...</p>';
    }
}

/** Cambia el tema (Oscuro/Claro) */
function toggleTheme() { document.body.classList.toggle('light-mode'); }


// --- FUNCIONES DE GESTIÓN DE CARGA (SPINNER) ---
function showLoading() {
    document.getElementById('loading-spinner').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-spinner').classList.add('hidden');
}


// --- PERSISTENCIA Y CARGA / LIMPIEZA AUTOMÁTICA ---
function getWeeklyCutoffTime() {
    const now = new Date();
    let cutoff = new Date(now);
    cutoff.setHours(RESERVATION_CLEARANCE_HOUR, 0, 0, 0); 
    let daysToRollback = (now.getDay() - WEEKLY_DRAW_DAY + 7) % 7; 
    cutoff.setDate(now.getDate() - daysToRollback);
    
    if (cutoff.getTime() > now.getTime()) {
        cutoff.setDate(cutoff.getDate() - 7);
    }
    
    return cutoff.getTime();
}

async function load() {
    showLoading(); 
    await new Promise(resolve => setTimeout(resolve, 300)); // Pequeña espera para UX del spinner
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        appData = JSON.parse(saved);
        if (!appData.users) appData.users = [];
        if (!appData.selectedTickets) appData.selectedTickets = [];
        if (!appData.winners) appData.winners = [];
    } else {
        appData.tickets = [];
        for(let i=0; i<TOTAL_TICKETS; i++) {
            appData.tickets.push({ num: formatNum(i), state: 'available', owner: null, reservedAt: null });
        }
    }
    
    const nowTimestamp = Date.now();
    
    // 1. Limpieza Semanal (Viernes 5 PM)
    const WEEKLY_CLEARANCE_KEY = "last_weekly_clearance_timestamp";
    let lastWeeklyClearanceTime = localStorage.getItem(WEEKLY_CLEARANCE_KEY);
    lastWeeklyClearanceTime = lastWeeklyClearanceTime ? parseInt(lastWeeklyClearanceTime) : 0;
    
    const requiredCutoffTime = getWeeklyCutoffTime();
    let weeklyClearanceNeeded = lastWeeklyClearanceTime < requiredCutoffTime;

    if (weeklyClearanceNeeded) {
        let weeklyClearedCount = 0;
        appData.tickets.forEach(t => {
            if (t.state === 'reserved') {
                t.state = 'available';
                t.owner = null;
                t.reservedAt = null;
                weeklyClearedCount++;
            }
        });
        
        if (weeklyClearedCount > 0) {
            toast(`¡Corte Semanal! ${weeklyClearedCount} reservas liberadas (Viernes 5 PM).`, 'accent');
        }
        
        localStorage.setItem(WEEKLY_CLEARANCE_KEY, nowTimestamp.toString()); 
        appData.selectedTickets = []; 
    }
    
    // 2. Expiración Estándar (24 Horas)
    let reservationsExpired = 0;
    appData.tickets.forEach(t => {
        if (t.state === 'reserved' && t.reservedAt && (nowTimestamp - t.reservedAt > RESERVATION_DURATION_MS)) {
            t.state = 'available';
            t.owner = null;
            t.reservedAt = null;
            reservationsExpired++;
        }
    });
    
    if (reservationsExpired > 0) {
         toast(`Se liberaron ${reservationsExpired} reservas expiradas por tiempo (24h).`, 'warning');
    }
    
    // Actualizar la grilla y la UI inmediatamente
    renderGrid();
    updateUI();
    hideLoading();
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateUI(); 
}

function refreshData() {
    load(); 
    toast("Datos y contadores actualizados", 'success');
}

// --- FUNCIÓN DE MÁSCARA DE TELÉFONO (UX MEJORADO) ---
// Formatea el teléfono mientras el usuario escribe para mayor claridad
function applyPhoneMask(input) {
    let value = input.value.replace(/\D/g, ''); // Eliminar todo lo que no sea dígito
    let formatted = '';

    if (value.length > 0) {
        formatted += value.substring(0, 3);
    }
    if (value.length > 3) {
        formatted += ' ' + value.substring(3, 6);
    }
    if (value.length > 6) {
        formatted += ' ' + value.substring(6, 10);
    }

    input.value = formatted.trim();
}


// --- CONTADOR Y FECHAS ---

function getNextWeeklyDrawDate() {
    const today = new Date();
    const nowTime = today.getTime();
    
    if (nowTime >= FINAL_RAFFLE_DATE.getTime()) {
        return new Date(0); 
    }

    if (nowTime > LAST_WEEKLY_DRAW) {
        return FINAL_RAFFLE_DATE; 
    }
    
    let nextDraw = new Date(today);
    let daysToAdd = (WEEKLY_DRAW_DAY + 7 - today.getDay()) % 7;

    if (daysToAdd === 0 && today.getHours() >= WEEKLY_DRAW_HOUR) {
        daysToAdd = 7;
    }
    
    nextDraw.setDate(today.getDate() + daysToAdd);
    nextDraw.setHours(WEEKLY_DRAW_HOUR, 0, 0, 0);
    
    return nextDraw;
}

function startCountdown() {
    const timer = setInterval(function() {
        const now = new Date().getTime();
        
        // Contador Semanal
        const nextDrawDate = getNextWeeklyDrawDate();
        const nextDrawTime = nextDrawDate.getTime();
        let distance = nextDrawTime - now;

        if (distance > 0 && nextDrawTime < FINAL_RAFFLE_DATE.getTime()) {
            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s = Math.floor((distance % (1000 * 60)) / (1000)).toString().padStart(2, '0');
            
            document.getElementById("nextDrawTime").innerHTML = `${d}D ${h}:${m}:${s}`;
        } else if (nextDrawTime < FINAL_RAFFLE_DATE.getTime()) {
            document.getElementById("nextDrawTime").innerHTML = "¡HOY, A LAS 10 PM!";
        } else {
            document.getElementById("nextDrawTime").innerHTML = "FINALIZADO";
        }

        // Contador Final
        distance = FINAL_RAFFLE_DATE.getTime() - now;
        if (distance > 0) {
            const d_final = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h_final = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m_final = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s_final = Math.floor((distance % (1000 * 60)) / (1000)).toString().padStart(2, '0');
            document.getElementById("finalDrawTime").innerHTML = `${d_final}D ${h_final}:${m_final}:${s_final}`;
        } else {
            document.getElementById("finalDrawTime").innerHTML = "¡RIFA TERMINADA!";
            clearInterval(timer); 
        }
    }, 1000);
}


// --- RENDERIZADO UX (GRID Y LEYENDA) ---

/** Genera la leyenda interactiva de colores (NUEVA FUNCIÓN) */
function renderInteractiveLegend() {
    const legendData = [
        { color: getCssVar('--primary'), text: 'Disponible: Puedes seleccionarlo y reservarlo.' },
        { color: getCssVar('--warning'), text: 'Reservado: Alguien lo seleccionó. Paga pronto o se libera.' },
        { color: getCssVar('--accent'), text: 'Pagado: Boleta asegurada para el sorteo final y semanal.' },
        { color: getCssVar('--secondary'), text: 'Mío (Blink): Número reservado/pagado por ti.' }
    ];

    const container = document.getElementById('interactiveLegend');
    container.innerHTML = '<h4>Significado de Colores:</h4>';

    legendData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = `
            <div class="legend-color" style="background-color: ${item.color};"></div>
            <span>${item.text}</span>
        `;
        container.appendChild(div);
    });
}

function toggleTicketSelection(num) {
    if (!appData.currentUser) {
        toast("Debes identificarte para seleccionar números.", 'error');
        return openModal('loginModal');
    }

    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket || ticket.state !== 'available') {
        toast(`El número ${num} no está disponible.`, 'error');
        return;
    }

    const index = appData.selectedTickets.indexOf(num);
    if (index > -1) {
        appData.selectedTickets.splice(index, 1);
    } else {
        if (appData.selectedTickets.length >= MAX_RESERVATIONS_PER_USER) {
            toast(`Solo puedes reservar un máximo de ${MAX_RESERVATIONS_PER_USER} números a la vez.`, 'error');
            return;
        }
        appData.selectedTickets.push(num);
    }
    renderGrid();
    updateUI();
}

function renderGrid() {
    const grid = document.getElementById('grid');
    const searchInput = document.getElementById('searchInput').value.trim();
    const filterValue = document.getElementById('filterSelect').value;
    grid.innerHTML = '';
    
    const filteredTickets = appData.tickets.filter(t => {
        const matchesSearch = searchInput ? t.num.includes(searchInput) : true;
        const matchesFilter = filterValue === 'all' || t.state === filterValue;
        return matchesSearch && matchesFilter;
    });

    filteredTickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = `card ${ticket.state}`;
        card.innerHTML = `<div class="num">${ticket.num}</div><div class="status-text">${ticket.state.toUpperCase()}</div>`;
        card.setAttribute('data-num', ticket.num);

        let ownerInfo = "";
        if (ticket.owner) {
            const user = getUserByEmail(ticket.owner);
            ownerInfo = user ? `${user.name} (${user.phone})` : `Owner: ${ticket.owner}`;
            card.setAttribute('data-owner-info', ownerInfo);
        }

        if (ticket.state === 'available') {
            card.onclick = () => toggleTicketSelection(ticket.num);
            if (appData.selectedTickets.includes(ticket.num)) {
                card.classList.add('selected');
            }
        } else if (appData.currentUser && ticket.owner === appData.currentUser.email) {
            card.classList.add('mine');
        }

        grid.appendChild(card);
    });
}

function updateUI() {
    // Actualizar Contadores
    const stats = appData.tickets.reduce((acc, t) => {
        acc[t.state]++;
        return acc;
    }, { available: 0, reserved: 0, paid: 0 });

    document.getElementById('statAvail').textContent = stats.available;
    document.getElementById('statRes').textContent = stats.reserved;
    document.getElementById('statPaid').textContent = stats.paid;
    document.getElementById('statTotal').textContent = TOTAL_TICKETS; 

    // Actualizar Botón de Reserva Múltiple
    const selectedCount = appData.selectedTickets.length;
    const btn = document.getElementById('multiReserveBtn');
    document.getElementById('selectedCount').textContent = selectedCount;
    btn.style.display = selectedCount > 0 ? 'block' : 'none';

    // Actualizar estado de autenticación
    const btnAuth = document.getElementById('btnAuth');
    if (appData.currentUser) {
        btnAuth.textContent = `👋 ${appData.currentUser.name.split(' ')[0]}`;
        btnAuth.onclick = checkMyTickets;
    } else {
        btnAuth.textContent = `Ingresar`;
        btnAuth.onclick = () => openModal('loginModal');
    }
}

// --- LÓGICA DE COMPRA Y RESERVA ---

function handleLogin(event) {
    event.preventDefault();
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const phone = document.getElementById('userPhone').value.trim();

    let user = getUserByEmail(email);
    if (!user) {
        user = { name, email, phone };
        appData.users.push(user);
    } else {
        user.name = name;
        user.phone = phone;
    }
    
    appData.currentUser = user;
    save();
    closeModal('loginModal');
    toast(`Bienvenido, ${name}`, 'success');
    
    if (appData.selectedTickets.length > 0) {
        confirmReservation();
    }
}

function confirmReservation() {
    if (!appData.currentUser) {
        return openModal('loginModal');
    }

    const count = appData.selectedTickets.length;
    if (count === 0) return toast("Debes seleccionar al menos un número.", 'warning');

    const nums = appData.selectedTickets.join(', ');
    
    if (confirm(`¿Confirmas la reserva de ${count} número(s): ${nums} a nombre de ${appData.currentUser.name}? Las reservas vencen en 24 horas si no se pagan.`)) {
        
        appData.selectedTickets.forEach(num => {
            const ticket = appData.tickets.find(t => t.num === num);
            if (ticket && ticket.state === 'available') { 
                ticket.state = 'reserved';
                ticket.owner = appData.currentUser.email;
                ticket.reservedAt = Date.now();
            }
        });

        appData.selectedTickets = []; 
        save();
        toast(`¡Reserva exitosa! Tienes 24h para pagar los números: ${nums}`, 'success');
        showInstructions(); 
    }
    
    renderGrid(); 
}

function quickBuy(count) {
    if (!appData.currentUser) {
        toast("Debes identificarte para comprar números.", 'error');
        return openModal('loginModal');
    }

    if (count > MAX_RESERVATIONS_PER_USER) count = MAX_RESERVATIONS_PER_USER;
    
    appData.selectedTickets = []; 
    const availableTickets = appData.tickets.filter(t => t.state === 'available');
    
    if (availableTickets.length < count) {
        toast("No hay suficientes boletas disponibles para tu compra.", 'error');
        return;
    }
    
    for (let i = 0; i < count; i++) {
        appData.selectedTickets.push(availableTickets[i].num);
    }
    
    renderGrid();
    updateUI();
    confirmReservation();
}

function showInstructions() {
     alert(`PASOS PARA EL PAGO DE BOLETAS RESERVADAS:\n\n1. Valor: $25.000 COP por boleta.\n2. Realiza el pago por Nequi o Daviplata al número:\n   📞 321 963 7388 (Óscar Fidel Flórez Tami)\n3. Envía el comprobante de pago al WhatsApp del administrador (el botón flotante).\n4. Un administrador verificará tu pago y cambiará el estado de tu(s) boleta(s) a 'Pagada' (Color ROJO).\n\n¡Recuerda, tienes 24 horas para asegurar tus números, o serán liberados el viernes a las 5 PM!`);
}

function checkMyTickets() {
    if(!appData.currentUser) return openModal('loginModal');
    
    const myTickets = appData.tickets.filter(t => t.owner === appData.currentUser.email);
    if (myTickets.length === 0) {
        return alert("Aún no tienes números reservados o comprados. ¡Es tu momento!");
    }

    const reserved = myTickets.filter(t => t.state === 'reserved').map(t => t.num).join(', ') || 'Ninguna';
    const paid = myTickets.filter(t => t.state === 'paid').map(t => t.num).join(', ') || 'Ninguna';
    
    let msg = `TUS BOLETAS REGISTRADAS (${myTickets.length} en total):\n\n`;
    msg += `⏳ RESERVADAS (PAGO PENDIENTE):\n${reserved}\n\n`;
    msg += `✅ PAGADAS (ASEGURADAS):\n${paid}`;
    
    alert(msg);
}

// --- LÓGICA DE ADMINISTRACIÓN ---

function openAdminAuth() {
    const pass = prompt("Ingrese la contraseña de administrador:");
    if (pass === ADMIN_PASS) {
        appData.currentUser = { name: 'Admin', email: 'admin@admin.com', phone: 'N/A' }; 
        renderAdminLists();
        openModal('adminModal');
    } else if (pass !== null) {
        toast("Contraseña incorrecta.", 'error');
    }
}

function renderAdminLists() {
    const reservedBody = document.getElementById('reservedTicketListBody');
    const paidBody = document.getElementById('paidTicketListBody');
    reservedBody.innerHTML = '';
    paidBody.innerHTML = '';
    
    // Reservados
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

    // Pagados
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
    
    document.getElementById('btnAdminDeleteWinner').style.display = appData.currentUser && appData.currentUser.email === 'admin@admin.com' ? 'block' : 'none';
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
}

function openManualAssignModal() {
    closeModal('adminModal');
    document.getElementById('manualNum').value = '';
    document.getElementById('manualName').value = '';
    document.getElementById('manualPhone').value = '';
    openModal('manualAssignModal');
    // Aplicar máscara de teléfono al input manual
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
    
    // Asegurar que el listener de previsualización se active al abrir
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
        if (!confirm(`ADVERTENCIA: El ganador de la lotería es ${num}, pero la boleta está como ${ticket.state.toUpperCase()} (${winnerName}). ¿Desea registrarlo como ganador de todos modos? Esto es solo para fines de registro histórico, no confirma el premio si no está pagado.`)) {
            if (!confirm("Si cancela, el sorteo no se registrará. ¿Desea continuar?")) return;
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

// --- OTRAS FUNCIONES DE UTILIDAD ---

function verifyTicket() {
    const numInput = document.getElementById('verifyNum');
    const num = numInput.value.padStart(3, '0');
    const resultBox = document.getElementById('verifyResult');

    if (num.length !== 3) {
        resultBox.innerHTML = '<p style="color:var(--text-muted); margin:0;">Escribe un número de 3 dígitos (ej: 045)...</p>';
        return;
    }

    const ticket = appData.tickets.find(t => t.num === num);

    if (!ticket) {
         resultBox.innerHTML = `<p style="color:var(--accent); margin:0;">El número ${num} no se encontró. Error de datos.</p>`;
         return;
    }

    let statusText;
    let ownerName = "";
    let color = getCssVar('--text-muted');

    if (ticket.state === 'available') {
        statusText = 'DISPONIBLE (CÓMPRALO YA)';
        color = getCssVar('--primary');
    } else {
        const user = getUserByEmail(ticket.owner);
        ownerName = user ? ` (${user.name})` : ' (Venta manual)';
        if (ticket.state === 'reserved') {
            statusText = 'RESERVADO (PAGO PENDIENTE)';
            color = getCssVar('--warning');
        } else if (ticket.state === 'paid') {
            statusText = 'PAGADO (BOLETA ASEGURADA)';
            color = getCssVar('--accent');
        }
    }
    
    resultBox.innerHTML = `<p style="margin:0; font-weight: bold; color: ${color};">Número: ${num} | Estado: ${statusText}${ownerName}</p>`;
}

function adminResetRaffle() {
    if (confirm("ADVERTENCIA CRÍTICA: ¿Estás ABSOLUTAMENTE SEGURO de que deseas restablecer la Rifa? Esto eliminará todos los datos de tickets, usuarios, reservas y ganadores de forma permanente.")) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem("last_weekly_clearance_timestamp"); 
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

function exportAllData() {
    exportData(appData, `Rifa_Data_Completa_${new Date().toISOString().slice(0, 10)}.json`);
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


// --- INICIALIZACIÓN AL CARGAR LA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    load();
    startCountdown();
    renderInteractiveLegend(); // Cargar la leyenda al inicio
    
    // Event Listeners para Filtrado/Búsqueda
    document.getElementById('searchInput').addEventListener('input', renderGrid);
    document.getElementById('filterSelect').addEventListener('change', renderGrid);
    
    // Event Listener para la Máscara de Teléfono (Input Mask)
    const userPhoneInput = document.getElementById('userPhone');
    if (userPhoneInput) {
        userPhoneInput.addEventListener('input', () => applyPhoneMask(userPhoneInput));
    }

    // Listener para el saludo en el login
    const userNameInput = document.getElementById('userName');
    const loginTitle = document.getElementById('loginTitle');
    if (userNameInput && loginTitle) {
        userNameInput.addEventListener('input', () => {
            const name = userNameInput.value.trim();
            loginTitle.textContent = name.length > 0 ? `👋 Hola, ${name.split(' ')[0]}` : `👤 Identifícate`; 
        });
    }

    // Listener para verificación de boleta al escribir
    const verifyInput = document.getElementById('verifyNum');
    if (verifyInput) {
        verifyInput.addEventListener('input', verifyTicket);
    }
});



