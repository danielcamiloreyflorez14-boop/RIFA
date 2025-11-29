// --- CONFIGURACIÓN Y CONSTANTES GLOBALES ---
const ADMIN_PASS_ENCODED = "MDAwLTk5OQ=="; // Contraseña "000-999" (Ofuscada)
const OLD_STORAGE_KEY_V11 = "rifa_data_v11"; // Key anterior (para recuperación)
const STORAGE_KEY = "RIFA_OSCAR_DATA_V12"; // Nuevo key robusto
const STORAGE_KEY_CHECKSUM = "rifa_checksum"; 
const TOTAL_TICKETS = 1000;
const MAX_RESERVATIONS_PER_USER = 3; 
const RESERVATION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Horas
const WARNING_BEFORE_EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 horas antes (Para notificación)

const FINAL_RAFFLE_DATE = new Date('2026-01-30T22:00:00'); 
const WEEKLY_DRAW_DAY = 5; // 0=Domingo, 5=Viernes
const WEEKLY_DRAW_HOUR = 22; // 10 PM (22:00)
const RESERVATION_CLEARANCE_HOUR = 17; // 5 PM (17:00) Viernes
const LAST_WEEKLY_DRAW = new Date('2026-01-23T22:00:00').getTime(); 

// --- ESTADO GLOBAL ---
let appData = {
    tickets: [],
    users: [],
    currentUser: null,
    selectedTickets: [], 
    winners: [], 
};

// --- FUNCIONES DE UTILIDAD Y UX ---

function getCssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function formatNum(num) { return parseInt(num).toString().padStart(3, '0'); }
function formatUser(user) { return `${user.name} (${user.phone})`; }
function getUserByEmail(email) { return appData.users.find(u => u.email === email); }
function getUserByPhone(phone) { return appData.users.find(u => u.phone === phone); }

function toast(msg, type='success') {
    const box = document.createElement('div');
    box.className = `toast ${type}`;
    if (type === 'warning' && !document.body.classList.contains('dark-mode')) { box.style.color = '#000'; }
    box.innerHTML = msg; 
    document.getElementById('toast-container').appendChild(box);
    setTimeout(() => {
        box.style.transition='opacity .4s, transform .4s'; 
        box.style.opacity='0'; 
        box.style.transform='translateX(8px)'; 
        setTimeout(()=>box.remove(),450);
    }, 4000);
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { 
    document.getElementById(id).classList.remove('open'); 
    if (id === 'verifyModal') {
        document.getElementById('verifyNum').value = '';
        document.getElementById('verifyResult').innerHTML = '<p style="color:var(--text-muted); margin:0;">Escribe un número para verificar...</p>';
    }
}
function toggleTheme() { 
    document.body.classList.toggle('dark-mode'); 
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    renderInteractiveLegend(); // Refrescar leyenda por si cambia color
}

function showLoading() { document.getElementById('loading-spinner').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-spinner').classList.add('hidden'); }

function applyPhoneMask(input) {
    let value = input.value.replace(/\D/g, ''); 
    let formatted = '';
    if (value.length > 0) { formatted += value.substring(0, 3); }
    if (value.length > 3) { formatted += ' ' + value.substring(3, 6); }
    if (value.length > 6) { formatted += ' ' + value.substring(6, 10); }
    input.value = formatted.trim();
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

function load() {
    showLoading(); 
    
    // 1. Cargar Tema (Dark/Light)
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // 2. Recuperación y Carga de Datos
    let saved = localStorage.getItem(STORAGE_KEY);
    
    // INTENTO DE RECUPERACIÓN DE DATOS ANTERIORES
    if (!saved) {
        const oldSaved = localStorage.getItem(OLD_STORAGE_KEY_V11);
        if (oldSaved) {
            saved = oldSaved;
            // MIGRAR A LA NUEVA CLAVE
            localStorage.setItem(STORAGE_KEY, oldSaved);
            localStorage.removeItem(OLD_STORAGE_KEY_V11); // Limpiar por si acaso
            toast("✅ ¡Datos de boletas anteriores recuperados y migrados!", 'accent');
        }
    }
    
    if (saved) {
        appData = JSON.parse(saved);
        if (!appData.users) appData.users = [];
        if (!appData.selectedTickets) appData.selectedTickets = [];
        if (!appData.winners) appData.winners = [];
        if (!appData.tickets || appData.tickets.length !== TOTAL_TICKETS) {
            // Si el array de tickets está corrupto o es de tamaño incorrecto, forzar reinicio solo de tickets (manteniendo users y winners)
            initializeTickets();
            toast("⚠️ Error: Se detectó corrupción en los tickets. Recargando boletas.", 'error');
        }
    } else {
        // Inicialización si no hay datos guardados
        initializeTickets();
    }
    
    // 3. Aplicar Limpieza Automática (Semanal y por Expiración)
    const nowTimestamp = Date.now();
    
    // Limpieza Semanal (Viernes 5 PM)
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
        if (weeklyClearedCount > 0) { toast(`¡Corte Semanal! ${weeklyClearedCount} reservas liberadas.`, 'accent'); }
        localStorage.setItem(WEEKLY_CLEARANCE_KEY, nowTimestamp.toString()); 
        appData.selectedTickets = []; 
    }
    
    // Expiración Estándar (24 Horas)
    let reservationsExpired = 0;
    appData.tickets.forEach(t => {
        if (t.state === 'reserved' && t.reservedAt && (nowTimestamp - t.reservedAt > RESERVATION_DURATION_MS)) {
            t.state = 'available';
            t.owner = null;
            t.reservedAt = null;
            reservationsExpired++;
        }
    });
    if (reservationsExpired > 0) { toast(`Se liberaron ${reservationsExpired} reservas expiradas por tiempo (24h).`, 'warning'); }

    // 4. Renderizar UI
    renderGrid();
    updateUI();
    startCountdown();
    renderInteractiveLegend();
    
    // 5. Setup Listeners
    document.getElementById('searchInput').addEventListener('input', renderGrid);
    document.getElementById('filterSelect').addEventListener('change', renderGrid);
    document.getElementById('verifyNum').addEventListener('input', verifyTicketStatus);
    
    const userNameInput = document.getElementById('userName');
    const loginTitle = document.getElementById('loginTitle');
    if (userNameInput && loginTitle) {
        userNameInput.addEventListener('input', () => {
            const name = userNameInput.value.trim();
            loginTitle.textContent = name.length > 0 ? `👋 Hola, ${name}` : `👤 Identifícate`;
        });
    }

    hideLoading();
}

function initializeTickets() {
    appData.tickets = [];
    for(let i=0; i<TOTAL_TICKETS; i++) {
        appData.tickets.push({ num: formatNum(i), state: 'available', owner: null, reservedAt: null });
    }
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateUI(); 
    renderGrid();
}

function refreshData() {
    load(); 
    toast("Datos y contadores actualizados", 'success');
}


// --- LÓGICA DE CONTADOR Y FECHAS ---

function getNextWeeklyDrawDate() {
    const today = new Date();
    const nowTime = today.getTime();
    
    if (nowTime >= FINAL_RAFFLE_DATE.getTime()) { return new Date(0); }
    if (nowTime > LAST_WEEKLY_DRAW) { return FINAL_RAFFLE_DATE; }
    
    let nextDraw = new Date(today);
    let daysToAdd = (WEEKLY_DRAW_DAY + 7 - today.getDay()) % 7;

    if (daysToAdd === 0 && today.getHours() >= WEEKLY_DRAW_HOUR) { daysToAdd = 7; }
    
    nextDraw.setDate(today.getDate() + daysToAdd);
    nextDraw.setHours(WEEKLY_DRAW_HOUR, 0, 0, 0);
    return nextDraw;
}

function startCountdown() {
    const timer = setInterval(function() {
        const now = new Date().getTime();
        
        const nextDrawDate = getNextWeeklyDrawDate();
        const nextDrawTime = nextDrawDate.getTime();
        let distance = nextDrawTime - now;

        const updateTimeDisplay = (elementId, distance, defaultText) => {
            if (distance > 0) {
                const d = Math.floor(distance / (1000 * 60 * 60 * 24));
                const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
                const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
                const s = Math.floor((distance % (1000 * 60)) / (1000)).toString().padStart(2, '0');
                document.getElementById(elementId).innerHTML = `${d}D ${h}:${m}:${s}`;
            } else {
                document.getElementById(elementId).innerHTML = defaultText;
            }
        };

        if (nextDrawTime < FINAL_RAFFLE_DATE.getTime() && nextDrawTime > now) {
            updateTimeDisplay("nextDrawTime", distance, "¡HOY, A LAS 10 PM!");
        } else {
            updateTimeDisplay("nextDrawTime", nextDrawTime - now, nextDrawTime < FINAL_RAFFLE_DATE.getTime() ? "¡HOY, A LAS 10 PM!" : "FINALIZADO");
        }
        
        distance = FINAL_RAFFLE_DATE.getTime() - now;
        updateTimeDisplay("finalDrawTime", distance, "¡RIFA TERMINADA!");

        if (distance <= 0) {
            clearInterval(timer);
        }
    }, 1000);
}

// --- LÓGICA DE INTERFAZ Y GRID ---

function renderInteractiveLegend() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgCardColor = getCssVar('--bg-card');
    
    const legendData = [
        { color: getCssVar('--primary'), text: 'Disponible' },
        { color: getCssVar('--warning'), text: 'Reservado' },
        { color: getCssVar('--accent'), text: 'Pagado' },
        { color: getCssVar('--secondary'), text: 'Mío (Parpadeo)' }
    ];

    const container = document.getElementById('interactiveLegend');
    container.innerHTML = '<h4>Significado de Colores:</h4>';

    legendData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'legend-item';
        // Ajuste para que el color de la leyenda "Disponible" se vea bien en modo oscuro.
        let colorStyle = item.color;
        if (item.text === 'Disponible' && isDarkMode) {
             // El color primario en dark mode es neón, que se ve bien.
        } else if (item.text === 'Disponible' && !isDarkMode) {
            // En light mode, se usa el verde, que se ve bien.
        }
        
        div.innerHTML = `<div class="legend-color" style="background-color: ${colorStyle}; border-color: ${item.text === 'Mío (Parpadeo)' ? getCssVar('--secondary') : getCssVar('--border')}"></div><span>${item.text}</span>`;
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
        const userReservations = appData.tickets.filter(t => t.owner === appData.currentUser.email && t.state === 'reserved').length;
        if (appData.selectedTickets.length + userReservations >= MAX_RESERVATIONS_PER_USER) {
            toast(`Solo puedes tener un máximo de ${MAX_RESERVATIONS_PER_USER} reservas activas (seleccionadas + reservadas pendientes).`, 'error');
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
        card.innerHTML = `<div class="num">${ticket.num}</div><div class="status-text">${ticket.state === 'available' ? 'DISPONIBLE' : (ticket.state === 'reserved' ? 'RESERVADA' : 'PAGADA')}</div>`;
        card.setAttribute('data-num', ticket.num);

        let ownerInfo = "";
        if (ticket.owner) {
            const user = getUserByEmail(ticket.owner);
            ownerInfo = user ? `Dueño: ${user.name} (${user.phone})` : `Owner: ${ticket.owner}`;
            card.title = ownerInfo;
        }

        if (ticket.state === 'available') {
            card.onclick = () => toggleTicketSelection(ticket.num);
            if (appData.selectedTickets.includes(ticket.num)) {
                card.classList.add('selected');
                card.title = "Seleccionado para reservar";
            }
        } else if (appData.currentUser && ticket.owner === appData.currentUser.email) {
            card.classList.add('mine');
            card.title = `¡Tu boleta! ${ticket.state === 'reserved' ? 'PAGO PENDIENTE' : 'PAGADA'}`;
        }

        grid.appendChild(card);
    });
}

function updateUI() {
    const stats = appData.tickets.reduce((acc, t) => {
        acc[t.state]++;
        return acc;
    }, { available: 0, reserved: 0, paid: 0 });

    document.getElementById('statAvail').textContent = stats.available;
    document.getElementById('statRes').textContent = stats.reserved;
    document.getElementById('statPaid').textContent = stats.paid;
    document.getElementById('statTotal').textContent = TOTAL_TICKETS; 

    const selectedCount = appData.selectedTickets.length;
    const btn = document.getElementById('multiReserveBtn');
    document.getElementById('selectedCount').textContent = selectedCount;
    btn.style.display = selectedCount > 0 ? 'block' : 'none';

    const btnAuth = document.getElementById('btnAuth');
    if (appData.currentUser) {
        btnAuth.textContent = `👋 ${appData.currentUser.name.split(' ')[0]}`;
        btnAuth.onclick = checkMyTickets; 
        btnAuth.classList.remove('primary');
        btnAuth.classList.add('secondary');
    } else {
        btnAuth.textContent = 'Ingresar';
        btnAuth.onclick = () => openModal('loginModal');
        btnAuth.classList.remove('secondary');
        btnAuth.classList.add('primary');
    }
}

// --- LÓGICA DE USUARIO Y RESERVA ---

function handleLogin(event) {
    event.preventDefault();
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim().toLowerCase();
    const phone = document.getElementById('userPhone').value.trim().replace(/\s/g, ''); 

    if (!name || !email || !phone) {
        return toast('Por favor, completa todos los campos.', 'error');
    }

    let user = getUserByEmail(email);
    let newUser = false;
    if (user) {
        user.name = name;
        user.phone = phone;
        toast(`Datos actualizados: ${user.name}`, 'success');
    } else {
        user = { name, email, phone };
        appData.users.push(user);
        newUser = true;
        toast(`¡Bienvenido, ${user.name}!`, 'success');
    }
    
    appData.currentUser = user;
    save();
    closeModal('loginModal');
    
    // Si es un usuario que regresa, mostrarle sus tickets.
    if (!newUser) {
        checkMyTickets();
    }
}

function checkMyTickets() {
    if(!appData.currentUser) return openModal('loginModal');
    
    const myTickets = appData.tickets.filter(t => t.owner === appData.currentUser.email);
    
    const reserved = myTickets.filter(t => t.state === 'reserved').map(t => t.num).join(', ');
    const paid = myTickets.filter(t => t.state === 'paid').map(t => t.num).join(', ');

    let msg = `Tus Datos:\nNombre: ${appData.currentUser.name}\nTeléfono: ${appData.currentUser.phone}\n\n`;
    msg += `⏳ RESERVADAS (PAGO PENDIENTE): ${reserved || 'Ninguna. ¡Aprovecha el tiempo!'}\n\n`;
    msg += `✅ PAGADAS (ASEGURADAS): ${paid || 'Ninguna. ¡Asegura tu boleta!'}`;
    
    alert(myTickets.length ? msg : "Aún no tienes números reservados o comprados. ¡Es tu momento!");
}


function confirmReservation() {
    if (appData.selectedTickets.length === 0) return toast("Selecciona al menos una boleta.", 'warning');
    if (!appData.currentUser) return openModal('loginModal');
    
    const count = appData.selectedTickets.length;
    
    if (!confirm(`¿Confirmas la reserva de ${count} boleta(s)? Tienes 24 horas para pagar y enviar el comprobante al WhatsApp 321 963 7388.`)) {
        return;
    }
    
    const now = Date.now();
    let reservedCount = 0;
    
    // Contar las reservas que ya tiene el usuario
    const currentReserved = appData.tickets.filter(t => t.owner === appData.currentUser.email && t.state === 'reserved').length;
    const maxAllowed = MAX_RESERVATIONS_PER_USER - currentReserved;
    
    const numbersToReserve = appData.selectedTickets.slice(0, maxAllowed);
    
    if (numbersToReserve.length < appData.selectedTickets.length) {
        toast(`Solo pudiste reservar ${numbersToReserve.length} boleta(s) debido al límite de ${MAX_RESERVATIONS_PER_USER} por persona.`, 'warning');
    }

    numbersToReserve.forEach(num => {
        const ticket = appData.tickets.find(t => t.num === num && t.state === 'available');
        if (ticket) {
            ticket.state = 'reserved';
            ticket.owner = appData.currentUser.email;
            ticket.reservedAt = now;
            reservedCount++;
        }
    });

    appData.selectedTickets = []; // Limpiar selección
    
    if (reservedCount > 0) {
        save();
        toast(`Reservaste ${reservedCount} boleta(s). ¡Tienes 24h para pagar!`, 'accent');
        alert(`¡Reserva Exitosa!\n\nBoletas: ${numbersToReserve.join(', ')}\n\nRecuerda enviar el comprobante de pago al WhatsApp 321 963 7388 para que se marquen como "Pagadas".`);
    } else {
        toast("No se pudo reservar ninguna boleta. Revisa si están disponibles o tu límite.", 'error');
    }
}

// --- LÓGICA DE VERIFICACIÓN ---

function verifyTicketStatus() {
    const input = document.getElementById('verifyNum');
    const num = formatNum(input.value);
    const resultDiv = document.getElementById('verifyResult');
    
    if (input.value.length === 0) {
        resultDiv.innerHTML = '<p style="color:var(--text-muted); margin:0;">Escribe un número para verificar...</p>';
        return;
    }
    
    if (input.value.length > 3) return; // Validación básica
    
    const ticket = appData.tickets.find(t => t.num === num);
    
    if (!ticket) {
        resultDiv.innerHTML = `<p style="color:${getCssVar('--error')}; font-weight: bold;">Error: Boleta ${num} no existe.</p>`;
        return;
    }

    let statusHtml = `<h4>Boleta N° ${num}</h4>`;
    let user = ticket.owner ? getUserByEmail(ticket.owner) : null;
    
    switch (ticket.state) {
        case 'available':
            statusHtml += `<p style="color:${getCssVar('--primary')}; font-weight: bold;">ESTADO: ¡DISPONIBLE!</p>`;
            statusHtml += `<p style="color:${getCssVar('--text-muted')}">¡Resérvala ahora!</p>`;
            break;
        case 'reserved':
            const expiresAt = new Date(ticket.reservedAt + RESERVATION_DURATION_MS);
            const timeLeft = expiresAt.getTime() - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            statusHtml += `<p style="color:${getCssVar('--warning')}; font-weight: bold;">ESTADO: RESERVADA (Pendiente de Pago)</p>`;
            statusHtml += `<p>Dueño: ${user ? user.name : 'N/A'}</p>`;
            statusHtml += `<p>Expira en: ${hours}h ${minutes}m</p>`;
            break;
        case 'paid':
            statusHtml += `<p style="color:${getCssVar('--accent')}; font-weight: bold;">ESTADO: ¡PAGADA Y ASEGURADA!</p>`;
            statusHtml += `<p>Dueño: ${user ? user.name : 'N/A'}</p>`;
            statusHtml += `<p style="color:${getCssVar('--text-muted')}">¡Mucha suerte!</p>`;
            break;
    }
    
    resultDiv.innerHTML = statusHtml;
}

// --- LÓGICA DE ADMINISTRACIÓN (Admin Panel, Checksum, Ganadores) ---

function adminLock(action) {
    const password = prompt(`🛡️ ACCESO DE ADMINISTRADOR: Ingresa la contraseña para "${action}":`);
    const encodedPass = btoa(password || '');
    if (encodedPass === ADMIN_PASS_ENCODED) {
        return true;
    } else {
        toast("Contraseña incorrecta.", 'error');
        return false;
    }
}

function openAdminAuth() {
    if (adminLock('Abrir Panel')) {
        openModal('adminModal');
        renderAdminLists();
    }
}

function renderAdminLists() {
    const reservedBody = document.getElementById('reservedTicketListBody');
    const paidBody = document.getElementById('paidTicketListBody');
    const userListBody = document.getElementById('userListBody');
    
    reservedBody.innerHTML = '';
    paidBody.innerHTML = '';
    
    const reservedTickets = appData.tickets.filter(t => t.state === 'reserved');
    const paidTickets = appData.tickets.filter(t => t.state === 'paid');

    // Renderizar Reservadas
    reservedTickets.forEach(t => {
        const user = getUserByEmail(t.owner);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.num}</td>
            <td>${user ? formatUser(user) : 'Usuario desconocido'}</td>
            <td>
                <button onclick="adminSetState('${t.num}', 'paid')" class="btn primary" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fas fa-check"></i> Marcar Pagado</button>
                <button onclick="adminSetState('${t.num}', 'available')" class="btn accent" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fas fa-times"></i> Liberar</button>
            </td>
        `;
        reservedBody.appendChild(tr);
    });

    // Renderizar Pagadas
    paidTickets.forEach(t => {
        const user = getUserByEmail(t.owner);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${t.num}</td>
            <td>${user ? formatUser(user) : 'Usuario desconocido'}</td>
            <td>
                <button onclick="adminSetState('${t.num}', 'available')" class="btn accent" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fas fa-undo"></i> Devolver</button>
            </td>
        `;
        paidBody.appendChild(tr);
    });
    
    renderUserList();
}

function renderUserList() {
    const userListBody = document.getElementById('userListBody');
    userListBody.innerHTML = '';
    const searchTerm = document.getElementById('adminUserSearch').value.toLowerCase();
    
    appData.users.filter(u => 
        u.name.toLowerCase().includes(searchTerm) || 
        u.phone.includes(searchTerm)
    ).forEach(user => {
        const userTickets = appData.tickets.filter(t => t.owner === user.email);
        const reservedCount = userTickets.filter(t => t.state === 'reserved').length;
        const paidCount = userTickets.filter(t => t.state === 'paid').length;
        const ticketNums = userTickets.map(t => `<span class="${t.state}">${t.num}</span>`).join(', ');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.phone}</td>
            <td>
                Pagadas (${paidCount}), Reservadas (${reservedCount})
                <div style="font-size: 0.7rem; color: var(--text-muted);">${userTickets.map(t => t.num).join(', ')}</div>
            </td>
            <td>
                <button onclick="adminTransferTicket('${user.email}')" class="btn warning" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fas fa-exchange-alt"></i> Mover Boleta</button>
            </td>
        `;
        userListBody.appendChild(tr);
    });
}

function adminTransferTicket(sourceEmail) {
    if (!adminLock('Transferir Boleta')) return;

    const sourceUser = getUserByEmail(sourceEmail);
    if (!sourceUser) return toast('Usuario origen no encontrado.', 'error');

    const ticketNum = prompt(`Transferir Boleta(s) de ${sourceUser.name}:\n\nIngresa los números de boleta a transferir (separados por coma, ej: 010, 045):`);
    if (!ticketNum) return;

    const targetPhone = prompt(`Ingresa el NÚMERO DE CELULAR del cliente destino (Ej: 3001234567):`);
    if (!targetPhone) return;

    const targetUser = getUserByPhone(targetPhone.trim().replace(/\s/g, ''));
    if (!targetUser) return toast('Cliente destino no encontrado por celular. Pídele que se registre primero.', 'error');
    
    const nums = ticketNum.split(',').map(n => formatNum(n.trim()));
    let transferCount = 0;

    nums.forEach(num => {
        const ticket = appData.tickets.find(t => t.num === num && t.owner === sourceEmail);
        if (ticket) {
            ticket.owner = targetUser.email;
            transferCount++;
        }
    });

    if (transferCount > 0) {
        save();
        toast(`✅ Se transfirieron ${transferCount} boleta(s) de ${sourceUser.name} a ${targetUser.name}.`, 'success');
    } else {
        toast("No se encontró ninguna boleta de ese usuario con esos números.", 'warning');
    }
    renderAdminLists();
}


function adminSetState(num, state) {
    if (!adminLock(`Cambiar estado de ${num} a ${state}`)) return;
    
    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket) return toast(`Boleta ${num} no encontrada.`, 'error');

    if (state === 'available') {
        ticket.state = 'available';
        ticket.owner = null;
        ticket.reservedAt = null;
        toast(`Boleta ${num} liberada.`, 'success');
    } else if (state === 'paid') {
        if (ticket.state !== 'reserved') {
             // Si el admin marca como pagada una disponible, también debe asignarle dueño.
             const user = getUserByEmail(ticket.owner);
             if (!user) {
                return toast('No se puede marcar como pagada sin un dueño. Use la opción de Asignación Manual.', 'error');
             }
        }
        ticket.state = 'paid';
        toast(`Boleta ${num} marcada como ¡PAGADA!`, 'accent');
    }

    save();
    renderAdminLists();
}

function handleManualAssign(event) {
    event.preventDefault();
    if (!adminLock('Asignación Manual')) return;
    
    const num = formatNum(document.getElementById('manualNum').value);
    const name = document.getElementById('manualName').value.trim();
    const phone = document.getElementById('manualPhone').value.trim().replace(/\s/g, ''); 
    const email = `${phone}@temp.com`; // Usar teléfono como ID único para el email.

    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket) return toast(`Boleta ${num} no existe.`, 'error');

    if (ticket.state !== 'available') {
        if (!confirm(`ADVERTENCIA: La boleta ${num} está como ${ticket.state}. ¿Deseas sobreescribir la asignación?`)) {
            return;
        }
    }

    let user = getUserByPhone(phone);
    if (!user) {
        user = { name, email, phone };
        appData.users.push(user);
    } else {
        // Actualizar el nombre si ya existe
        user.name = name;
        user.email = email; // Asegurar que el email está en formato de ID
    }

    ticket.state = 'paid';
    ticket.owner = user.email;
    ticket.reservedAt = Date.now(); // Marca de tiempo de asignación

    save();
    closeModal('manualAssignModal');
    toast(`✅ Boleta ${num} asignada y marcada como PAGADA a ${name}.`, 'success');
    renderAdminLists();
}

function adminResetRaffle() {
    if (!adminLock('RESET COMPLETO DE RIFA')) return;

    if (!confirm('ADVERTENCIA CRÍTICA: ¿Estás ABSOLUTAMENTE SEGURO de que deseas RESTABLECER COMPLETAMENTE LA RIFA? Esto pondrá TODAS las boletas como disponibles, eliminará usuarios y ganadores.')) {
        toast('Restablecimiento cancelado.', 'warning');
        return;
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_CHECKSUM);
    localStorage.removeItem("last_weekly_clearance_timestamp");

    // Reinicializar appData
    appData = {
        tickets: [],
        users: [],
        currentUser: null,
        selectedTickets: [], 
        winners: [], 
    };
    initializeTickets();

    save(); // Guardar el estado limpio
    load(); // Recargar la UI
    toast('¡RIFA RESTABLECIDA COMPLETAMENTE!', 'error');
    closeModal('adminModal');
}

// --- LÓGICA DE NOTIFICACIONES AUTOMÁTICAS ---

function openNotificationModal() {
    if (!adminLock('Revisar Notificaciones')) return;
    
    const now = Date.now();
    const warningTime = now + WARNING_BEFORE_EXPIRY_MS;
    const expiryTime = now + RESERVATION_DURATION_MS;

    const nearExpiryTickets = appData.tickets.filter(t => 
        t.state === 'reserved' && 
        t.reservedAt && 
        (t.reservedAt + RESERVATION_DURATION_MS <= warningTime) && // Expira en las próximas 3h
        (t.reservedAt + RESERVATION_DURATION_MS > now) // Aún no ha expirado
    ).sort((a, b) => (a.reservedAt + RESERVATION_DURATION_MS) - (b.reservedAt + RESERVATION_DURATION_MS)); // Ordenar por fecha de expiración

    const notificationListBody = document.getElementById('notificationListBody');
    notificationListBody.innerHTML = '';

    // Agrupar por usuario
    const groupedByUser = nearExpiryTickets.reduce((acc, t) => {
        const user = getUserByEmail(t.owner);
        if (user) {
            if (!acc[user.email]) {
                acc[user.email] = { user, tickets: [] };
            }
            acc[user.email].tickets.push(t);
        }
        return acc;
    }, {});
    
    // Renderizar la tabla agrupada
    let rowCount = 0;
    for (const email in groupedByUser) {
        const { user, tickets } = groupedByUser[email];
        const firstTicket = tickets[0];
        const expiryDate = new Date(firstTicket.reservedAt + RESERVATION_DURATION_MS);
        const timeRemainingMs = expiryDate.getTime() - now;
        const hours = Math.floor(timeRemainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.phone}</td>
            <td>${tickets.map(t => t.num).join(', ')}</td>
            <td>${hours}h ${minutes}m</td>
            <td>
                <a href="https://wa.me/57${user.phone.replace(/\s/g, '')}?text=Hola%20${user.name.split(' ')[0]}%2C%20te%20escribo%20por%20la%20rifa.%20Tus%20boletas%20${tickets.map(t => t.num).join(',%20')}%20están%20por%20vencer.%20Envía%20el%20comprobante%20de%20pago%20para%20asegurarlas." target="_blank" class="btn primary" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fab fa-whatsapp"></i> Notificar</a>
            </td>
        `;
        notificationListBody.appendChild(tr);
        rowCount++;
    }

    if (rowCount === 0) {
        notificationListBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--primary);">No hay reservas próximas a expirar en las siguientes 3 horas. ¡Todo bajo control!</td></tr>';
    }

    openModal('notificationModal');
}

// --- LÓGICA DE GANADORES ---

function openWinnerManagement() {
    if (!adminLock('Registrar Ganador')) return;
    
    // Pre-seleccionar la fecha de hoy
    document.getElementById('winnerDate').valueAsDate = new Date();
    document.getElementById('winnerInfo').textContent = "Ingresa el número ganador y selecciona el tipo de sorteo.";
    
    openModal('winnerManagementModal');
}

function checkAndAddWinner() {
    if (!adminLock('Confirmar Ganador')) return;

    const date = document.getElementById('winnerDate').value;
    const type = document.getElementById('winnerType').value;
    const numInput = document.getElementById('winnerNum');
    const num = formatNum(numInput.value);
    const infoDiv = document.getElementById('winnerInfo');

    if (!date || !num) {
        infoDiv.textContent = "Por favor, completa la fecha y el número.";
        return;
    }

    const ticket = appData.tickets.find(t => t.num === num);
    
    if (!ticket) {
        infoDiv.textContent = `Error: La boleta ${num} no existe.`;
        return;
    }

    let winnerInfo = {
        date,
        type,
        num,
        owner: ticket.owner ? getUserByEmail(ticket.owner) : null,
        status: ticket.state
    };
    
    if (ticket.state !== 'paid') {
        const confirmResult = confirm(`ADVERTENCIA: La boleta ${num} está en estado "${ticket.state}". ¿Deseas registrarla como ganadora A PESAR DE NO ESTAR PAGADA?`);
        if (!confirmResult) {
            infoDiv.textContent = "Registro cancelado. El ganador debe tener la boleta pagada.";
            return;
        }
    }

    appData.winners.push(winnerInfo);
    save();
    
    // Opcional: Marcar como "claimed" o "winner" si se desea un estado final, pero por ahora se deja en "paid"
    // ticket.state = 'winner'; 
    // save();

    toast(`¡Ganador ${num} (${winnerInfo.owner ? winnerInfo.owner.name : 'sin dueño registrado'}) registrado para sorteo ${type}!`, 'success');
    closeModal('winnerManagementModal');
}

// --- LÓGICA DE TRANSAPRENCIA (CHECKSUM) ---

function calculateChecksum() {
    const paidTickets = appData.tickets.filter(t => t.state === 'paid').map(t => t.num).sort();
    const dataString = JSON.stringify(paidTickets);
    // Usar un hash simple para el ejemplo (en un entorno real se usaría SHA-256)
    let hash = 0;
    if (dataString.length === 0) return '0000000000';
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convertir a entero de 32bit
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(10, '0');
}

function adminGenerateAndSetChecksum() {
    if (!adminLock('Generar Checksum')) return;
    const newChecksum = calculateChecksum();
    localStorage.setItem(STORAGE_KEY_CHECKSUM, newChecksum);
    document.getElementById('checksumStatus').textContent = newChecksum;
    toast(`Checksum generado y guardado: ${newChecksum}`, 'warning');
}

function verifyPublicChecksum() {
    const savedChecksum = localStorage.getItem(STORAGE_KEY_CHECKSUM);
    const calculatedChecksum = calculateChecksum();
    const checksumDisplay = document.getElementById('checksumStatus');

    checksumDisplay.textContent = calculatedChecksum;
    
    if (!savedChecksum) {
        toast('El código de integridad oficial aún no ha sido publicado.', 'warning');
        return;
    }

    if (savedChecksum === calculatedChecksum) {
        toast('✅ ¡Verificación Exitosa! El código de integridad es auténtico.', 'success');
        checksumDisplay.style.color = getCssVar('--primary');
    } else {
        toast('❌ ¡ADVERTENCIA! El código de integridad NO COINCIDE. Los datos han sido manipulados.', 'error');
        checksumDisplay.style.color = getCssVar('--accent');
    }
}

// --- LÓGICA DE EXPORTACIÓN ---

function exportPaidTickets() {
    const paidTickets = appData.tickets.filter(t => t.state === 'paid');
    
    if (paidTickets.length === 0) {
        return toast('No hay boletas pagadas para exportar.', 'warning');
    }
    
    let csvContent = "Boleta,Estado,Nombre Cliente,Telefono\n";
    paidTickets.forEach(t => {
        const user = getUserByEmail(t.owner);
        const name = user ? user.name : 'N/A';
        const phone = user ? user.phone : 'N/A';
        csvContent += `${t.num},${t.state},"${name}","${phone}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `boletas_pagadas_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast(`Exportadas ${paidTickets.length} boletas pagadas.`, 'success');
}
