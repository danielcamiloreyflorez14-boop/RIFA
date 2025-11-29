// --- CONFIGURACIÓN Y CONSTANTES GLOBALES ---
const ADMIN_PASS_ENCODED = "MDAwLTk5OQ=="; // Contraseña "000-999" (Ofuscada para no verla a simple vista en el código)
const STORAGE_KEY = "rifa_data_v10"; 
const STORAGE_KEY_CHECKSUM = "rifa_checksum"; 
const STORAGE_KEY_SOCIAL = "rifa_social_comments"; // Nueva clave para comentarios
const TOTAL_TICKETS = 1000;
const MAX_RESERVATIONS_PER_USER = 3; 
const RESERVATION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Horas

const FINAL_RAFFLE_DATE = new Date('2026-01-30T22:00:00'); 
const WEEKLY_DRAW_DAY = 5; // 0=Domingo, 5=Viernes
const WEEKLY_DRAW_HOUR = 22; // 10 PM (22:00)
const RESERVATION_CLEARANCE_HOUR = 17; // 5 PM (17:00) Viernes
const LAST_WEEKLY_DRAW = new Date('2026-01-23T22:00:00').getTime(); 

// --- ESTADO GLOBAL (Compartido entre módulos) ---
let appData = {
    tickets: [],
    users: [],
    currentUser: null,
    selectedTickets: [], 
    winners: [], 
};

// --- FUNCIONES DE UTILIDAD GENERAL ---

function getCssVar(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
function formatNum(num) { return parseInt(num).toString().padStart(3, '0'); }
function formatUser(user) { return `${user.name} (${user.phone})`; }
function getUserByEmail(email) { return appData.users.find(u => u.email === email); }

function toast(msg, type='success') {
    const box = document.createElement('div');
    box.className = `toast ${type}`;
    if (type === 'warning' && !document.body.classList.contains('light-mode')) { box.style.color = '#000'; }
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
    // Resetear modales específicos al cerrar
    if (id === 'verifyModal') {
        document.getElementById('verifyNum').value = '';
        document.getElementById('verifyResult').innerHTML = '<p style="color:var(--text-muted); margin:0;">Escribe un número para verificar...</p>';
    }
}
function toggleTheme() { document.body.classList.toggle('light-mode'); }

function showLoading() { document.getElementById('loading-spinner').classList.remove('hidden'); }
function hideLoading() { document.getElementById('loading-spinner').classList.add('hidden'); }


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
    await new Promise(resolve => setTimeout(resolve, 300)); 
    
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
    
    renderGrid();
    updateUI();
    hideLoading();
    // Inicializar lógica social después de cargar datos
    if (typeof initSocialModule === 'function') initSocialModule();
}

function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateUI(); 
}

function refreshData() {
    load(); 
    toast("Datos y contadores actualizados", 'success');
}

// --- LÓGICA DE CONTADOR Y FECHAS (No modificado) ---

function getNextWeeklyDrawDate() {
    // Lógica del contador (igual a la versión anterior)
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


// --- LÓGICA DE INTERFAZ Y GRID ---

function applyPhoneMask(input) {
    let value = input.value.replace(/\D/g, ''); 
    let formatted = '';
    if (value.length > 0) { formatted += value.substring(0, 3); }
    if (value.length > 3) { formatted += ' ' + value.substring(3, 6); }
    if (value.length > 6) { formatted += ' ' + value.substring(6, 10); }
    input.value = formatted.trim();
}

function renderInteractiveLegend() {
    const legendData = [
        { color: getCssVar('--primary'), text: 'Disponible: Puedes seleccionarlo.' },
        { color: getCssVar('--warning'), text: 'Reservado: Alguien lo seleccionó. Paga pronto.' },
        { color: getCssVar('--accent'), text: 'Pagado: Boleta asegurada.' },
        { color: getCssVar('--secondary'), text: 'Mío (Blink): Reservado/Pagado por ti.' }
    ];

    const container = document.getElementById('interactiveLegend');
    container.innerHTML = '<h4>Significado de Colores:</h4>';

    legendData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = `<div class="legend-color" style="background-color: ${item.color};"></div><span>${item.text}</span>`;
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
    } else {
        btnAuth.textContent = `Ingresar`;
        btnAuth.onclick = () => openModal('loginModal');
    }
    
    const currentChecksum = localStorage.getItem(STORAGE_KEY_CHECKSUM) || 'N/A';
    document.getElementById('checksumStatus').textContent = currentChecksum.substring(0, 30) + (currentChecksum.length > 30 ? '...' : '');

}


// --- LÓGICA DE USUARIO Y RESERVA ---

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


// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    load();
    startCountdown();
    renderInteractiveLegend(); 
    
    document.getElementById('searchInput').addEventListener('input', renderGrid);
    document.getElementById('filterSelect').addEventListener('change', renderGrid);
    
    const userPhoneInput = document.getElementById('userPhone');
    if (userPhoneInput) {
        userPhoneInput.addEventListener('input', () => applyPhoneMask(userPhoneInput));
    }

    const userNameInput = document.getElementById('userName');
    const loginTitle = document.getElementById('loginTitle');
    if (userNameInput && loginTitle) {
        userNameInput.addEventListener('input', () => {
            const name = userNameInput.value.trim();
            loginTitle.textContent = name.length > 0 ? `👋 Hola, ${name.split(' ')[0]}` : `👤 Identifícate`; 
        });
    }

    const verifyInput = document.getElementById('verifyNum');
    if (verifyInput) {
        verifyInput.addEventListener('input', verifyTicket);
    }
    
    // Inicializar el renderizado de lista de comentarios
    if (typeof renderComments === 'function') renderComments();
});
