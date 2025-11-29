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
let currentLang = 'es'; // Estado del idioma (es | en)

// --- DICCIONARIO DE IDIOMAS (I18N) ---
const texts = {
    es: {
        'docTitle': 'Gran Rifa – Moto CR4 Repotenciada Y 1M semanal',
        'headerTitle': '🏆 Rifa Épica | Moto CR4',
        'videoBtn': 'Video',
        'myTicketsBtn': 'Mis Boletas',
        'toggleThemeBtn': 'Tema',
        'langBtn': 'Idioma',
        'loginBtn': 'Ingresar',
        'adminBtn': 'Admin',
        'totalStat': 'Total',
        'availStat': 'Disponibles',
        'resStat': 'Reservadas',
        'paidStat': '¡Pagadas!',
        'countdownWeeklyTitle': 'Próximo Sorteo Semanal (1M COP)',
        'countdownFinalTitle': 'Sorteo Final (Moto CR4)',
        'searchTicketPlaceholder': 'Buscar Boleta (Ej: 005)',
        'filterSelectOptions': { 'all': 'Ver Todos', 'available': 'Disponibles', 'reserved': 'Reservadas', 'paid': 'Pagadas' },
        'verifyTicketBtn': 'Verificar Boleta',
        'refreshDataBtn': 'Refrescar Datos',
        'reserveBtn': 'Reservar',
        'legendTitle': 'Significado de Colores:',
        'legendAvailable': 'Disponible',
        'legendReserved': 'Reservado',
        'legendPaid': 'Pagado',
        'legendMine': 'Mío (Parpadeo)',
        'footerResponsible': 'Responsable: Óscar Fidel Flórez Tami | 📞 321 963 7388',
        'footerDelayWarning': 'Entre mas te demores menos oportunidades, hazlo ya para mas oportunidades',
        'checksumTitle': '🔒 Código de Integridad (Transparencia)',
        'checksumInfo': 'Código oficial:',
        'verifyChecksumBtn': 'Verificar Autenticidad',
        'generateChecksumBtn': 'Generar Checksum (Admin)',
        'exportPaidTicketsBtn': 'Descargar Listado de Boletas Pagadas',
        // Modals
        'loginModalTitle': '👤 Identifícate',
        'placeholderName': 'Nombre Completo',
        'placeholderEmail': 'Correo Electrónico (Para tu ID)',
        'placeholderPhone': 'Celular (Ej: 300 123 4567)',
        'loginModalSubmit': 'Ingresar / Actualizar Datos',
        'adminPanelTitle': 'Panel de Administración 🛡️',
        'adminRefreshListsBtn': 'Refrescar Listas',
        'adminNotificationsBtn': 'Revisar Reservas por Vencer (Automatización)',
        'adminManualAssignBtn': 'Asignar Boleta Manual',
        'adminWinnerManagementBtn': 'Registrar Ganador Lotería',
        'adminReservedTitle': 'Reservadas (Pendientes de Pago)',
        'adminPaidTitle': 'Pagadas (Aseguradas)',
        'adminUserTitle': 'Gestión de Clientes',
        'adminSearchPlaceholder': 'Buscar cliente por nombre o teléfono',
        'adminResetBtn': 'RESET COMPLETO DE RIFA',
        'verifyModalTitle': 'Verificar Boleta',
        'placeholderTicketNum': 'Número de 3 dígitos (Ej: 045)',
        'verifyInitialText': 'Escribe un número para verificar...',
        'verifyCloseBtn': 'Listo',
        'manualAssignTitle': 'Asignación Manual',
        'placeholderPhoneUnique': 'Teléfono Cliente (ID Único)',
        'manualAssignSubmit': 'Asignar y Marcar como PAGADA',
        'winnerManagementTitle': 'Registrar Ganador',
        'placeholderWinnerNum': 'Número Ganador (3 dígitos)',
        'winnerSubmitBtn': 'Confirmar y Registrar Ganador',
        'notificationModalTitle': '🔔 Reservas Próximas a Expirar',
        'notificationModalInfo': 'Boletas que expiran en las próximas 3 horas. Notifique al cliente para asegurar el pago.',
        'videoModalTitle': '🎥 Video de Ganadores (ganadores.mp4)',
        'videoModalFallback': 'Tu navegador no soporta el video.',
        'videoModalFooter': 'Revive la emoción de los sorteos anteriores.',
        'closeBtn': 'Cerrar',
        // Table Headers
        'tableTicketHeader': 'Boleta',
        'tableClientHeader': 'Cliente (Dueño)',
        'tableActionsHeader': 'Acciones',
        'tableUserHeader': 'Nombre',
        'tablePhoneHeader': 'Celular',
        'tableTicketsHeader': 'Boletas',
        'tableExpiresInHeader': 'Expira en',
        // Toast Messages
        'toastThemeDark': 'Tema Oscuro activado.',
        'toastThemeLight': 'Tema Claro activado.',
        'toastNoOwnerPaid': 'No se puede marcar como pagada sin un dueño. Use la opción de Asignación Manual.',
    },
    en: {
        'docTitle': 'Grand Raffle – CR4 Motorbike and 1M weekly',
        'headerTitle': '🏆 Epic Raffle | CR4 Motorbike',
        'videoBtn': 'Video',
        'myTicketsBtn': 'My Tickets',
        'toggleThemeBtn': 'Theme',
        'langBtn': 'Language',
        'loginBtn': 'Login',
        'adminBtn': 'Admin',
        'totalStat': 'Total',
        'availStat': 'Available',
        'resStat': 'Reserved',
        'paidStat': 'Paid!',
        'countdownWeeklyTitle': 'Next Weekly Draw (1M COP)',
        'countdownFinalTitle': 'Final Draw (CR4 Motorbike)',
        'searchTicketPlaceholder': 'Search Ticket (Ex: 005)',
        'filterSelectOptions': { 'all': 'View All', 'available': 'Available', 'reserved': 'Reserved', 'paid': 'Paid' },
        'verifyTicketBtn': 'Verify Ticket',
        'refreshDataBtn': 'Refresh Data',
        'reserveBtn': 'Reserve',
        'legendTitle': 'Color Meaning:',
        'legendAvailable': 'Available',
        'legendReserved': 'Reserved',
        'legendPaid': 'Paid',
        'legendMine': 'Mine (Blink)',
        'footerResponsible': 'Responsible: Óscar Fidel Flórez Tami | 📞 321 963 7388',
        'footerDelayWarning': 'The longer you wait, the fewer chances you have, do it now for more opportunities',
        'checksumTitle': '🔒 Integrity Code (Transparency)',
        'checksumInfo': 'Official Code:',
        'verifyChecksumBtn': 'Verify Authenticity',
        'generateChecksumBtn': 'Generate Checksum (Admin)',
        'exportPaidTicketsBtn': 'Download Paid Tickets List',
        // Modals
        'loginModalTitle': '👤 Identify Yourself',
        'placeholderName': 'Full Name',
        'placeholderEmail': 'Email (For your ID)',
        'placeholderPhone': 'Mobile (Ex: 300 123 4567)',
        'loginModalSubmit': 'Login / Update Data',
        'adminPanelTitle': 'Admin Panel 🛡️',
        'adminRefreshListsBtn': 'Refresh Lists',
        'adminNotificationsBtn': 'Review Expiring Reservations (Automation)',
        'adminManualAssignBtn': 'Manual Ticket Assignment',
        'adminWinnerManagementBtn': 'Register Raffle Winner',
        'adminReservedTitle': 'Reserved (Pending Payment)',
        'adminPaidTitle': 'Paid (Secured)',
        'adminUserTitle': 'Client Management',
        'adminSearchPlaceholder': 'Search client by name or phone',
        'adminResetBtn': 'FULL RAFFLE RESET',
        'verifyModalTitle': 'Verify Ticket',
        'placeholderTicketNum': '3-digit number (Ex: 045)',
        'verifyInitialText': 'Type a number to verify...',
        'verifyCloseBtn': 'Done',
        'manualAssignTitle': 'Manual Assignment',
        'placeholderPhoneUnique': 'Client Phone (Unique ID)',
        'manualAssignSubmit': 'Assign and Mark as PAID',
        'winnerManagementTitle': 'Register Winner',
        'placeholderWinnerNum': 'Winning Number (3 digits)',
        'winnerSubmitBtn': 'Confirm and Register Winner',
        'notificationModalTitle': '🔔 Reservations Near Expiry',
        'notificationModalInfo': 'Tickets expiring in the next 3 hours. Notify the client to secure the payment.',
        'videoModalTitle': '🎥 Winners Video (ganadores.mp4)',
        'videoModalFallback': 'Your browser does not support the video.',
        'videoModalFooter': 'Relive the excitement of previous draws.',
        'closeBtn': 'Close',
        // Table Headers
        'tableTicketHeader': 'Ticket',
        'tableClientHeader': 'Client (Owner)',
        'tableActionsHeader': 'Actions',
        'tableUserHeader': 'Name',
        'tablePhoneHeader': 'Mobile',
        'tableTicketsHeader': 'Tickets',
        'tableExpiresInHeader': 'Expires In',
        // Toast Messages
        'toastThemeDark': 'Dark Theme activated.',
        'toastThemeLight': 'Light Theme activated.',
        'toastNoOwnerPaid': 'Cannot mark as paid without an owner. Use the Manual Assignment option.',
    }
};

// --- FUNCIONES DE IDIOMA ---

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    updateText();
}

function toggleLanguage() {
    const newLang = currentLang === 'es' ? 'en' : 'es';
    setLanguage(newLang);
}

function updateText() {
    // 1. Elementos con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = texts[currentLang][key];
        if (text) {
            el.textContent = text;
        }
    });

    // 2. Elementos con data-i18n-placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (texts[currentLang][key]) {
            el.placeholder = texts[currentLang][key];
        }
    });

    // 3. Casos especiales (con iconos o formatos)
    document.getElementById('headerTitle').innerHTML = texts[currentLang]['headerTitle'].replace('Moto CR4', `<span style="color: var(--accent); font-size: 1rem;">| Moto CR4</span>`);
    document.querySelector('[data-i18n="videoBtn"]').innerHTML = `<i class="fas fa-video"></i> ${texts[currentLang]['videoBtn']}`;
    document.querySelector('[data-i18n="myTicketsBtn"]').innerHTML = `<i class="fas fa-ticket-alt"></i> ${texts[currentLang]['myTicketsBtn']}`;
    document.querySelector('[data-i18n="toggleThemeBtn"]').innerHTML = `<i class="fas fa-moon"></i>`;
    document.querySelector('[data-i18n="langBtn"]').innerHTML = `<i class="fas fa-globe"></i> ${texts[currentLang]['langBtn']}`;
    document.querySelector('[data-i18n="adminBtn"]').innerHTML = `<i class="fas fa-lock"></i> ${texts[currentLang]['adminBtn']}`;

    // 4. Select de Filtro
    const filterSelect = document.getElementById('filterSelect');
    if (filterSelect) {
        filterSelect.innerHTML = '';
        const options = texts[currentLang]['filterSelectOptions'];
        for (const key in options) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = options[key];
            filterSelect.appendChild(option);
        }
    }

    // 5. Select de Ganadores
    const winnerTypeSelect = document.getElementById('winnerType');
    if (winnerTypeSelect) {
        winnerTypeSelect.innerHTML = '';
        const optionsData = [
            { value: 'weekly', text: currentLang === 'es' ? 'Sorteo Semanal (1M)' : 'Weekly Draw (1M)' },
            { value: 'final', text: currentLang === 'es' ? 'Sorteo Final (Moto CR4)' : 'Final Draw (CR4 Motorbike)' }
        ];
        optionsData.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.text;
            winnerTypeSelect.appendChild(option);
        });
    }

    renderInteractiveLegend(); // Actualizar leyenda
}

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
        document.getElementById('verifyResult').innerHTML = `<p style="color:var(--text-muted); margin:0;" data-i18n="verifyInitialText">${texts[currentLang]['verifyInitialText']}</p>`;
    }
}

function toggleTheme() { 
    document.body.classList.toggle('dark-mode'); 
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // El tema es lo único que no se traduce
    toast(isDark ? texts.es.toastThemeDark : texts.es.toastThemeLight, 'accent');
    
    renderInteractiveLegend(); // Refrescar leyenda
}

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

function load() {
    showLoading(); 
    
    // 1. Cargar Idioma
    const savedLang = localStorage.getItem('lang');
    setLanguage(savedLang || 'es');
    
    // 2. Cargar Tema
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // 3. Recuperación y Carga de Datos
    let saved = localStorage.getItem(STORAGE_KEY);
    
    // INTENTO DE RECUPERACIÓN DE DATOS ANTERIORES
    if (!saved) {
        const oldSaved = localStorage.getItem(OLD_STORAGE_KEY_V11);
        if (oldSaved) {
            saved = oldSaved;
            localStorage.setItem(STORAGE_KEY, oldSaved);
            localStorage.removeItem(OLD_STORAGE_KEY_V11);
            toast("✅ ¡Datos de boletas anteriores recuperados y migrados!", 'accent');
        }
    }
    
    if (saved) {
        appData = JSON.parse(saved);
        if (!appData.users) appData.users = [];
        if (!appData.selectedTickets) appData.selectedTickets = [];
        if (!appData.winners) appData.winners = [];
        if (!appData.tickets || appData.tickets.length !== TOTAL_TICKETS) {
            initializeTickets();
            toast(currentLang === 'es' ? "⚠️ Error: Se detectó corrupción en los tickets. Recargando boletas." : "⚠️ Error: Ticket corruption detected. Reloading tickets.", 'error');
        }
    } else {
        initializeTickets();
    }
    
    // 4. Aplicar Limpieza Automática (Semanal y por Expiración)
    const nowTimestamp = Date.now();
    
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
        if (weeklyClearedCount > 0) { toast(currentLang === 'es' ? `¡Corte Semanal! ${weeklyClearedCount} reservas liberadas.` : `Weekly Cut! ${weeklyClearedCount} reservations released.`, 'accent'); }
        localStorage.setItem(WEEKLY_CLEARANCE_KEY, nowTimestamp.toString()); 
        appData.selectedTickets = []; 
    }
    
    let reservationsExpired = 0;
    appData.tickets.forEach(t => {
        if (t.state === 'reserved' && t.reservedAt && (nowTimestamp - t.reservedAt > RESERVATION_DURATION_MS)) {
            t.state = 'available';
            t.owner = null;
            t.reservedAt = null;
            reservationsExpired++;
        }
    });
    if (reservationsExpired > 0) { toast(currentLang === 'es' ? `Se liberaron ${reservationsExpired} reservas expiradas por tiempo (24h).` : `${reservationsExpired} expired reservations released (24h).`, 'warning'); }

    // 5. Renderizar UI
    renderGrid();
    updateUI();
    startCountdown();
    
    // 6. Setup Listeners
    document.getElementById('searchInput').addEventListener('input', renderGrid);
    document.getElementById('filterSelect').addEventListener('change', renderGrid);
    document.getElementById('verifyNum').addEventListener('input', verifyTicketStatus);
    
    const userNameInput = document.getElementById('userName');
    const loginTitle = document.getElementById('loginTitle');
    if (userNameInput && loginTitle) {
        userNameInput.addEventListener('input', () => {
            const name = userNameInput.value.trim();
            loginTitle.textContent = name.length > 0 ? `👋 ${currentLang === 'es' ? 'Hola' : 'Hello'}, ${name}` : texts[currentLang]['loginModalTitle'];
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
    toast(currentLang === 'es' ? "Datos y contadores actualizados" : "Data and counters updated", 'success');
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
        
        const weeklyDrawText = currentLang === 'es' ? "¡HOY, A LAS 10 PM!" : "TODAY, AT 10 PM!";
        const finishedText = currentLang === 'es' ? "FINALIZADO" : "FINISHED";
        
        if (nextDrawTime < FINAL_RAFFLE_DATE.getTime() && nextDrawTime > now) {
            updateTimeDisplay("nextDrawTime", distance, weeklyDrawText);
        } else {
            updateTimeDisplay("nextDrawTime", nextDrawTime - now, nextDrawTime < FINAL_RAFFLE_DATE.getTime() ? weeklyDrawText : finishedText);
        }
        
        distance = FINAL_RAFFLE_DATE.getTime() - now;
        updateTimeDisplay("finalDrawTime", distance, currentLang === 'es' ? "¡RIFA TERMINADA!" : "RAFFLE ENDED!");

        if (distance <= 0) {
            clearInterval(timer);
        }
    }, 1000);
}

// --- LÓGICA DE INTERFAZ Y GRID ---

function renderInteractiveLegend() {
    const legendData = [
        { color: getCssVar('--primary'), text: texts[currentLang]['legendAvailable'] },
        { color: getCssVar('--warning'), text: texts[currentLang]['legendReserved'] },
        { color: getCssVar('--accent'), text: texts[currentLang]['legendPaid'] },
        { color: getCssVar('--secondary'), text: texts[currentLang]['legendMine'] }
    ];

    const container = document.getElementById('interactiveLegend');
    container.innerHTML = `<h4 data-i18n="legendTitle">${texts[currentLang]['legendTitle']}</h4>`;

    legendData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = `<div class="legend-color" style="background-color: ${item.color}; border-color: ${item.text.includes('Mío') || item.text.includes('Mine') ? getCssVar('--secondary') : getCssVar('--border')}"></div><span>${item.text}</span>`;
        container.appendChild(div);
    });
}


function toggleTicketSelection(num) {
    if (!appData.currentUser) {
        toast(currentLang === 'es' ? "Debes identificarte para seleccionar números." : "You must identify yourself to select numbers.", 'error');
        return openModal('loginModal');
    }

    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket || ticket.state !== 'available') {
        toast(currentLang === 'es' ? `El número ${num} no está disponible.` : `Number ${num} is not available.`, 'error');
        return;
    }

    const index = appData.selectedTickets.indexOf(num);
    if (index > -1) {
        appData.selectedTickets.splice(index, 1);
    } else {
        const userReservations = appData.tickets.filter(t => t.owner === appData.currentUser.email && t.state === 'reserved').length;
        if (appData.selectedTickets.length + userReservations >= MAX_RESERVATIONS_PER_USER) {
            toast(currentLang === 'es' ? `Solo puedes tener un máximo de ${MAX_RESERVATIONS_PER_USER} reservas activas (seleccionadas + reservadas pendientes).` : `You can only have a maximum of ${MAX_RESERVATIONS_PER_USER} active reservations (selected + pending reserved).`, 'error');
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
    
    const statusMap = {
        'available': currentLang === 'es' ? 'DISPONIBLE' : 'AVAILABLE',
        'reserved': currentLang === 'es' ? 'RESERVADA' : 'RESERVED',
        'paid': currentLang === 'es' ? 'PAGADA' : 'PAID'
    };
    
    const filteredTickets = appData.tickets.filter(t => {
        const matchesSearch = searchInput ? t.num.includes(searchInput) : true;
        const matchesFilter = filterValue === 'all' || t.state === filterValue;
        return matchesSearch && matchesFilter;
    });

    filteredTickets.forEach(ticket => {
        const card = document.createElement('div');
        card.className = `card ${ticket.state}`;
        card.innerHTML = `<div class="num">${ticket.num}</div><div class="status-text">${statusMap[ticket.state] || ''}</div>`;
        card.setAttribute('data-num', ticket.num);

        let ownerInfo = "";
        if (ticket.owner) {
            const user = getUserByEmail(ticket.owner);
            ownerInfo = user ? `${currentLang === 'es' ? 'Dueño' : 'Owner'}: ${user.name} (${user.phone})` : `${currentLang === 'es' ? 'Dueño' : 'Owner'}: ${ticket.owner}`;
            card.title = ownerInfo;
        }

        if (ticket.state === 'available') {
            card.onclick = () => toggleTicketSelection(ticket.num);
            if (appData.selectedTickets.includes(ticket.num)) {
                card.classList.add('selected');
                card.title = currentLang === 'es' ? "Seleccionado para reservar" : "Selected for reservation";
            }
        } else if (appData.currentUser && ticket.owner === appData.currentUser.email) {
            card.classList.add('mine');
            card.title = currentLang === 'es' ? 
                `¡Tu boleta! ${ticket.state === 'reserved' ? 'PAGO PENDIENTE' : 'PAGADA'}` : 
                `Your ticket! ${ticket.state === 'reserved' ? 'PENDING PAYMENT' : 'PAID'}`;
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

    // Re-render Stat texts for language
    document.getElementById('statTotalP').textContent = texts[currentLang]['totalStat'];
    document.getElementById('statAvailP').textContent = texts[currentLang]['availStat'];
    document.getElementById('statResP').textContent = texts[currentLang]['resStat'];
    document.getElementById('statPaidP').textContent = texts[currentLang]['paidStat'];

    const selectedCount = appData.selectedTickets.length;
    const btn = document.getElementById('multiReserveBtn');
    document.getElementById('selectedCount').textContent = selectedCount;
    
    // Update Reserve Button Text
    const reserveText = texts[currentLang]['reserveBtn'];
    btn.innerHTML = `${reserveText} <span id="selectedCount">${selectedCount}</span> ${currentLang === 'es' ? 'Boleta(s)' : 'Ticket(s)'}`;
    
    btn.style.display = selectedCount > 0 ? 'block' : 'none';

    const btnAuth = document.getElementById('btnAuth');
    if (appData.currentUser) {
        btnAuth.textContent = `👋 ${appData.currentUser.name.split(' ')[0]}`;
        btnAuth.onclick = checkMyTickets; 
        btnAuth.classList.remove('primary');
        btnAuth.classList.add('secondary');
    } else {
        btnAuth.textContent = texts[currentLang]['loginBtn'];
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
        return toast(currentLang === 'es' ? 'Por favor, completa todos los campos.' : 'Please fill in all fields.', 'error');
    }

    let user = getUserByEmail(email);
    let newUser = false;
    if (user) {
        user.name = name;
        user.phone = phone;
        toast(currentLang === 'es' ? `Datos actualizados: ${user.name}` : `Data updated: ${user.name}`, 'success');
    } else {
        user = { name, email, phone };
        appData.users.push(user);
        newUser = true;
        toast(currentLang === 'es' ? `¡Bienvenido, ${user.name}!` : `Welcome, ${user.name}!`, 'success');
    }
    
    appData.currentUser = user;
    save();
    closeModal('loginModal');
    
    if (!newUser) {
        checkMyTickets();
    }
}

function checkMyTickets() {
    if(!appData.currentUser) return openModal('loginModal');
    
    const myTickets = appData.tickets.filter(t => t.owner === appData.currentUser.email);
    
    const reserved = myTickets.filter(t => t.state === 'reserved').map(t => t.num).join(', ');
    const paid = myTickets.filter(t => t.state === 'paid').map(t => t.num).join(', ');

    let msg = currentLang === 'es' ? 
        `Tus Datos:\nNombre: ${appData.currentUser.name}\nTeléfono: ${appData.currentUser.phone}\n\n` :
        `Your Data:\nName: ${appData.currentUser.name}\nPhone: ${appData.currentUser.phone}\n\n`;
        
    msg += currentLang === 'es' ? 
        `⏳ RESERVADAS (PAGO PENDIENTE): ${reserved || 'Ninguna. ¡Aprovecha el tiempo!'}\n\n` :
        `⏳ RESERVED (PENDING PAYMENT): ${reserved || 'None. Make sure you pay on time!'}\n\n`;
        
    msg += currentLang === 'es' ? 
        `✅ PAGADAS (ASEGURADAS): ${paid || 'Ninguna. ¡Asegura tu boleta!'}` :
        `✅ PAID (SECURED): ${paid || 'None. Secure your ticket!'}`;
    
    alert(myTickets.length ? msg : currentLang === 'es' ? "Aún no tienes números reservados o comprados. ¡Es tu momento!" : "You don't have reserved or purchased numbers yet. It's your time!");
}


function confirmReservation() {
    if (appData.selectedTickets.length === 0) return toast(currentLang === 'es' ? "Selecciona al menos una boleta." : "Select at least one ticket.", 'warning');
    if (!appData.currentUser) return openModal('loginModal');
    
    const count = appData.selectedTickets.length;
    const confirmMessage = currentLang === 'es' ? 
        `¿Confirmas la reserva de ${count} boleta(s)? Tienes 24 horas para pagar y enviar el comprobante al WhatsApp 321 963 7388.` :
        `Do you confirm the reservation of ${count} ticket(s)? You have 24 hours to pay and send the proof to WhatsApp 321 963 7388.`;
        
    if (!confirm(confirmMessage)) {
        return;
    }
    
    const now = Date.now();
    let reservedCount = 0;
    
    const currentReserved = appData.tickets.filter(t => t.owner === appData.currentUser.email && t.state === 'reserved').length;
    const maxAllowed = MAX_RESERVATIONS_PER_USER - currentReserved;
    
    const numbersToReserve = appData.selectedTickets.slice(0, maxAllowed);
    
    if (numbersToReserve.length < appData.selectedTickets.length) {
        toast(currentLang === 'es' ? `Solo pudiste reservar ${numbersToReserve.length} boleta(s) debido al límite de ${MAX_RESERVATIONS_PER_USER} por persona.` : `You could only reserve ${numbersToReserve.length} ticket(s) due to the limit of ${MAX_RESERVATIONS_PER_USER} per person.`, 'warning');
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

    appData.selectedTickets = [];
    
    if (reservedCount > 0) {
        save();
        toast(currentLang === 'es' ? `Reservaste ${reservedCount} boleta(s). ¡Tienes 24h para pagar!` : `You reserved ${reservedCount} ticket(s). You have 24h to pay!`, 'accent');
        alert(currentLang === 'es' ? 
            `¡Reserva Exitosa!\n\nBoletas: ${numbersToReserve.join(', ')}\n\nRecuerda enviar el comprobante de pago al WhatsApp 321 963 7388 para que se marquen como "Pagadas".` :
            `Successful Reservation!\n\nTickets: ${numbersToReserve.join(', ')}\n\nRemember to send the proof of payment to WhatsApp 321 963 7388 to have them marked as "Paid".`);
    } else {
        toast(currentLang === 'es' ? "No se pudo reservar ninguna boleta. Revisa si están disponibles o tu límite." : "Could not reserve any ticket. Check availability or your limit.", 'error');
    }
}

// --- LÓGICA DE VERIFICACIÓN ---

function verifyTicketStatus() {
    const input = document.getElementById('verifyNum');
    const num = formatNum(input.value);
    const resultDiv = document.getElementById('verifyResult');
    
    if (input.value.length === 0) {
        resultDiv.innerHTML = `<p style="color:var(--text-muted); margin:0;">${texts[currentLang]['verifyInitialText']}</p>`;
        return;
    }
    
    if (input.value.length > 3) return;
    
    const ticket = appData.tickets.find(t => t.num === num);
    
    if (!ticket) {
        resultDiv.innerHTML = `<p style="color:${getCssVar('--error')}; font-weight: bold;">${currentLang === 'es' ? 'Error: Boleta' : 'Error: Ticket'} ${num} ${currentLang === 'es' ? 'no existe.' : 'does not exist.'}</p>`;
        return;
    }

    let statusHtml = `<h4>${currentLang === 'es' ? 'Boleta N°' : 'Ticket No.'} ${num}</h4>`;
    let user = ticket.owner ? getUserByEmail(ticket.owner) : null;
    
    switch (ticket.state) {
        case 'available':
            statusHtml += `<p style="color:${getCssVar('--primary')}; font-weight: bold;">${currentLang === 'es' ? 'ESTADO: ¡DISPONIBLE!' : 'STATUS: AVAILABLE!'}</p>`;
            statusHtml += `<p style="color:${getCssVar('--text-muted')}">${currentLang === 'es' ? '¡Resérvala ahora!' : 'Reserve it now!'}</p>`;
            break;
        case 'reserved':
            const expiresAt = new Date(ticket.reservedAt + RESERVATION_DURATION_MS);
            const timeLeft = expiresAt.getTime() - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            statusHtml += `<p style="color:${getCssVar('--warning')}; font-weight: bold;">${currentLang === 'es' ? 'ESTADO: RESERVADA (Pendiente de Pago)' : 'STATUS: RESERVED (Pending Payment)'}</p>`;
            statusHtml += `<p>${currentLang === 'es' ? 'Dueño' : 'Owner'}: ${user ? user.name : 'N/A'}</p>`;
            statusHtml += `<p>${currentLang === 'es' ? 'Expira en' : 'Expires in'}: ${hours}h ${minutes}m</p>`;
            break;
        case 'paid':
            statusHtml += `<p style="color:${getCssVar('--accent')}; font-weight: bold;">${currentLang === 'es' ? 'ESTADO: ¡PAGADA Y ASEGURADA!' : 'STATUS: PAID AND SECURED!'}</p>`;
            statusHtml += `<p>${currentLang === 'es' ? 'Dueño' : 'Owner'}: ${user ? user.name : 'N/A'}</p>`;
            statusHtml += `<p style="color:${getCssVar('--text-muted')}">${currentLang === 'es' ? '¡Mucha suerte!' : 'Good luck!'}</p>`;
            break;
    }
    
    resultDiv.innerHTML = statusHtml;
}

// --- LÓGICA DE ADMINISTRACIÓN (Admin Panel, Checksum, Ganadores) ---

function adminLock(action) {
    const passwordPrompt = currentLang === 'es' ? 
        `🛡️ ACCESO DE ADMINISTRADOR: Ingresa la contraseña para "${action}":` :
        `🛡️ ADMINISTRATOR ACCESS: Enter the password for "${action}":`;
        
    const password = prompt(passwordPrompt);
    const encodedPass = btoa(password || '');
    if (encodedPass === ADMIN_PASS_ENCODED) {
        return true;
    } else {
        toast(currentLang === 'es' ? "Contraseña incorrecta." : "Incorrect password.", 'error');
        return false;
    }
}

function openAdminAuth() {
    if (adminLock(texts[currentLang]['adminPanelTitle'])) {
        openModal('adminModal');
        renderAdminLists();
    }
}

function renderAdminLists() {
    const reservedBody = document.getElementById('reservedTicketListBody');
    const paidBody = document.getElementById('paidTicketListBody');
    
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
            <td>${user ? formatUser(user) : (currentLang === 'es' ? 'Usuario desconocido' : 'Unknown user')}</td>
            <td>
                <button onclick="adminSetState('${t.num}', 'paid')" class="btn primary" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fas fa-check"></i> ${currentLang === 'es' ? 'Pagar' : 'Pay'}</button>
                <button onclick="adminSetState('${t.num}', 'available')" class="btn accent" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fas fa-times"></i> ${currentLang === 'es' ? 'Liberar' : 'Release'}</button>
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
            <td>${user ? formatUser(user) : (currentLang === 'es' ? 'Usuario desconocido' : 'Unknown user')}</td>
            <td>
                <button onclick="adminSetState('${t.num}', 'available')" class="btn accent" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fas fa-undo"></i> ${currentLang === 'es' ? 'Devolver' : 'Revert'}</button>
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

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.name}</td>
            <td>${user.phone}</td>
            <td>
                ${currentLang === 'es' ? 'Pagadas' : 'Paid'} (${paidCount}), ${currentLang === 'es' ? 'Reservadas' : 'Reserved'} (${reservedCount})
                <div style="font-size: 0.7rem; color: var(--text-muted);">${userTickets.map(t => t.num).join(', ')}</div>
            </td>
            <td>
                <button onclick="adminTransferTicket('${user.email}')" class="btn warning" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fas fa-exchange-alt"></i> ${currentLang === 'es' ? 'Mover Boleta' : 'Move Ticket'}</button>
            </td>
        `;
        userListBody.appendChild(tr);
    });
}

function adminTransferTicket(sourceEmail) {
    if (!adminLock(currentLang === 'es' ? 'Transferir Boleta' : 'Transfer Ticket')) return;

    const sourceUser = getUserByEmail(sourceEmail);
    if (!sourceUser) return toast(currentLang === 'es' ? 'Usuario origen no encontrado.' : 'Source user not found.', 'error');

    const ticketNum = prompt(currentLang === 'es' ? 
        `Transferir Boleta(s) de ${sourceUser.name}:\n\nIngresa los números de boleta a transferir (separados por coma, ej: 010, 045):` :
        `Transfer Ticket(s) from ${sourceUser.name}:\n\nEnter the ticket numbers to transfer (separated by comma, ex: 010, 045):`);
    if (!ticketNum) return;

    const targetPhone = prompt(currentLang === 'es' ? 
        `Ingresa el NÚMERO DE CELULAR del cliente destino (Ej: 3001234567):` :
        `Enter the MOBILE NUMBER of the destination client (Ex: 3001234567):`);
    if (!targetPhone) return;

    const targetUser = getUserByPhone(targetPhone.trim().replace(/\s/g, ''));
    if (!targetUser) return toast(currentLang === 'es' ? 'Cliente destino no encontrado por celular. Pídele que se registre primero.' : 'Destination client not found by mobile. Ask them to register first.', 'error');
    
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
        toast(currentLang === 'es' ? `✅ Se transfirieron ${transferCount} boleta(s) de ${sourceUser.name} a ${targetUser.name}.` : `✅ ${transferCount} ticket(s) transferred from ${sourceUser.name} to ${targetUser.name}.`, 'success');
    } else {
        toast(currentLang === 'es' ? "No se encontró ninguna boleta de ese usuario con esos números." : "No ticket found for that user with those numbers.", 'warning');
    }
    renderAdminLists();
}


function adminSetState(num, state) {
    if (!adminLock(currentLang === 'es' ? `Cambiar estado de ${num} a ${state}` : `Change status of ${num} to ${state}`)) return;
    
    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket) return toast(currentLang === 'es' ? `Boleta ${num} no encontrada.` : `Ticket ${num} not found.`, 'error');

    if (state === 'available') {
        ticket.state = 'available';
        ticket.owner = null;
        ticket.reservedAt = null;
        toast(currentLang === 'es' ? `Boleta ${num} liberada.` : `Ticket ${num} released.`, 'success');
    } else if (state === 'paid') {
        if (!ticket.owner) {
             return toast(texts[currentLang].toastNoOwnerPaid, 'error');
        }
        ticket.state = 'paid';
        toast(currentLang === 'es' ? `Boleta ${num} marcada como ¡PAGADA!` : `Ticket ${num} marked as PAID!`, 'accent');
    }

    save();
    renderAdminLists();
}

function handleManualAssign(event) {
    event.preventDefault();
    if (!adminLock(texts[currentLang]['manualAssignTitle'])) return;
    
    const num = formatNum(document.getElementById('manualNum').value);
    const name = document.getElementById('manualName').value.trim();
    const phone = document.getElementById('manualPhone').value.trim().replace(/\s/g, ''); 
    const email = `${phone}@temp.com`;

    const ticket = appData.tickets.find(t => t.num === num);
    if (!ticket) return toast(currentLang === 'es' ? `Boleta ${num} no existe.` : `Ticket ${num} does not exist.`, 'error');

    if (ticket.state !== 'available') {
        const confirmMsg = currentLang === 'es' ? 
            `ADVERTENCIA: La boleta ${num} está como ${ticket.state}. ¿Deseas sobreescribir la asignación?` :
            `WARNING: Ticket ${num} is currently ${ticket.state}. Do you want to overwrite the assignment?`;
        if (!confirm(confirmMsg)) {
            return;
        }
    }

    let user = getUserByPhone(phone);
    if (!user) {
        user = { name, email, phone };
        appData.users.push(user);
    } else {
        user.name = name;
        user.email = email;
    }

    ticket.state = 'paid';
    ticket.owner = user.email;
    ticket.reservedAt = Date.now();

    save();
    closeModal('manualAssignModal');
    toast(currentLang === 'es' ? `✅ Boleta ${num} asignada y marcada como PAGADA a ${name}.` : `✅ Ticket ${num} assigned and marked as PAID to ${name}.`, 'success');
    renderAdminLists();
}

function adminResetRaffle() {
    if (!adminLock(texts[currentLang]['adminResetBtn'])) return;

    const confirmMsg = currentLang === 'es' ? 
        'ADVERTENCIA CRÍTICA: ¿Estás ABSOLUTAMENTE SEGURO de que deseas RESTABLECER COMPLETAMENTE LA RIFA? Esto pondrá TODAS las boletas como disponibles, eliminará usuarios y ganadores.' :
        'CRITICAL WARNING: Are you ABSOLUTELY SURE you want to FULLY RESET THE RAFFLE? This will set ALL tickets to available, delete users and winners.';
        
    if (!confirm(confirmMsg)) {
        toast(currentLang === 'es' ? 'Restablecimiento cancelado.' : 'Reset cancelled.', 'warning');
        return;
    }

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_CHECKSUM);
    localStorage.removeItem("last_weekly_clearance_timestamp");

    appData = {
        tickets: [],
        users: [],
        currentUser: null,
        selectedTickets: [], 
        winners: [], 
    };
    initializeTickets();

    save();
    load();
    toast(currentLang === 'es' ? '¡RIFA RESTABLECIDA COMPLETAMENTE!' : 'RAFFLE FULLY RESET!', 'error');
    closeModal('adminModal');
}

// --- LÓGICA DE NOTIFICACIONES AUTOMÁTICAS ---

function openNotificationModal() {
    if (!adminLock(texts[currentLang]['adminNotificationsBtn'])) return;
    
    const now = Date.now();
    const warningTime = now + WARNING_BEFORE_EXPIRY_MS;

    const nearExpiryTickets = appData.tickets.filter(t => 
        t.state === 'reserved' && 
        t.reservedAt && 
        (t.reservedAt + RESERVATION_DURATION_MS <= warningTime) &&
        (t.reservedAt + RESERVATION_DURATION_MS > now)
    ).sort((a, b) => (a.reservedAt + RESERVATION_DURATION_MS) - (b.reservedAt + RESERVATION_DURATION_MS));

    const notificationListBody = document.getElementById('notificationListBody');
    notificationListBody.innerHTML = '';

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
                <a href="https://wa.me/57${user.phone.replace(/\s/g, '')}?text=${currentLang === 'es' ? `Hola%20${user.name.split(' ')[0]}%2C%20te%20escribo%20por%20la%20rifa.%20Tus%20boletas%20${tickets.map(t => t.num).join(',%20')}%20están%20por%20vencer.%20Envía%20el%20comprobante%20de%20pago%20para%20asegurarlas.` : `Hi%20${user.name.split(' ')[0]}%2C%20this%20is%20about%20the%20raffle.%20Your%20tickets%20${tickets.map(t => t.num).join(',%20')}%20are%20about%20to%20expire.%20Please%20send%20proof%20of%20payment%20to%20secure%20them.`}" target="_blank" class="btn primary" style="padding: 5px 10px; font-size: 0.7rem;"><i class="fab fa-whatsapp"></i> ${currentLang === 'es' ? 'Notificar' : 'Notify'}</a>
            </td>
        `;
        notificationListBody.appendChild(tr);
        rowCount++;
    }

    if (rowCount === 0) {
        notificationListBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--primary);">${currentLang === 'es' ? 'No hay reservas próximas a expirar en las siguientes 3 horas. ¡Todo bajo control!' : 'No reservations near expiry in the next 3 hours. Everything under control!'}</td></tr>`;
    }

    openModal('notificationModal');
}

// --- LÓGICA DE GANADORES ---

function openWinnerManagement() {
    if (!adminLock(texts[currentLang]['winnerManagementTitle'])) return;
    
    document.getElementById('winnerDate').valueAsDate = new Date();
    document.getElementById('winnerInfo').textContent = currentLang === 'es' ? "Ingresa el número ganador y selecciona el tipo de sorteo." : "Enter the winning number and select the draw type.";
    
    openModal('winnerManagementModal');
}

function checkAndAddWinner() {
    if (!adminLock(texts[currentLang]['winnerSubmitBtn'])) return;

    const date = document.getElementById('winnerDate').value;
    const type = document.getElementById('winnerType').value;
    const numInput = document.getElementById('winnerNum');
    const num = formatNum(numInput.value);
    const infoDiv = document.getElementById('winnerInfo');

    if (!date || !num) {
        infoDiv.textContent = currentLang === 'es' ? "Por favor, completa la fecha y el número." : "Please fill in the date and number.";
        return;
    }

    const ticket = appData.tickets.find(t => t.num === num);
    
    if (!ticket) {
        infoDiv.textContent = currentLang === 'es' ? `Error: La boleta ${num} no existe.` : `Error: Ticket ${num} does not exist.`;
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
        const confirmResult = confirm(currentLang === 'es' ? 
            `ADVERTENCIA: La boleta ${num} está en estado "${ticket.state}". ¿Deseas registrarla como ganadora A PESAR DE NO ESTAR PAGADA?` :
            `WARNING: Ticket ${num} is currently "${ticket.state}". Do you want to register it as a winner DESPITE IT NOT BEING PAID?`);
        if (!confirmResult) {
            infoDiv.textContent = currentLang === 'es' ? "Registro cancelado. El ganador debe tener la boleta pagada." : "Registration cancelled. The winner must have a paid ticket.";
            return;
        }
    }

    appData.winners.push(winnerInfo);
    save();
    
    toast(currentLang === 'es' ? `¡Ganador ${num} (${winnerInfo.owner ? winnerInfo.owner.name : 'sin dueño registrado'}) registrado para sorteo ${type}!` : `Winner ${num} (${winnerInfo.owner ? winnerInfo.owner.name : 'no owner registered'}) registered for ${type} draw!`, 'success');
    closeModal('winnerManagementModal');
}

// --- LÓGICA DE TRANSAPRENCIA (CHECKSUM) ---

function calculateChecksum() {
    const paidTickets = appData.tickets.filter(t => t.state === 'paid').map(t => t.num).sort();
    const dataString = JSON.stringify(paidTickets);
    let hash = 0;
    if (dataString.length === 0) return '0000000000';
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(10, '0');
}

function adminGenerateAndSetChecksum() {
    if (!adminLock(texts[currentLang]['generateChecksumBtn'])) return;
    const newChecksum = calculateChecksum();
    localStorage.setItem(STORAGE_KEY_CHECKSUM, newChecksum);
    document.getElementById('checksumStatus').textContent = newChecksum;
    toast(currentLang === 'es' ? `Checksum generado y guardado: ${newChecksum}` : `Checksum generated and saved: ${newChecksum}`, 'warning');
}

function verifyPublicChecksum() {
    const savedChecksum = localStorage.getItem(STORAGE_KEY_CHECKSUM);
    const calculatedChecksum = calculateChecksum();
    const checksumDisplay = document.getElementById('checksumStatus');

    checksumDisplay.textContent = calculatedChecksum;
    
    if (!savedChecksum) {
        toast(currentLang === 'es' ? 'El código de integridad oficial aún no ha sido publicado.' : 'The official integrity code has not been published yet.', 'warning');
        return;
    }

    if (savedChecksum === calculatedChecksum) {
        toast(currentLang === 'es' ? '✅ ¡Verificación Exitosa! El código de integridad es auténtico.' : '✅ Verification Successful! The integrity code is authentic.', 'success');
        checksumDisplay.style.color = getCssVar('--primary');
    } else {
        toast(currentLang === 'es' ? '❌ ¡ADVERTENCIA! El código de integridad NO COINCIDE. Los datos han sido manipulados.' : '❌ WARNING! The integrity code DOES NOT MATCH. Data has been manipulated.', 'error');
        checksumDisplay.style.color = getCssVar('--accent');
    }
}

// --- LÓGICA DE EXPORTACIÓN ---

function exportPaidTickets() {
    const paidTickets = appData.tickets.filter(t => t.state === 'paid');
    
    if (paidTickets.length === 0) {
        return toast(currentLang === 'es' ? 'No hay boletas pagadas para exportar.' : 'No paid tickets to export.', 'warning');
    }
    
    let csvContent = currentLang === 'es' ? "Boleta,Estado,Nombre Cliente,Telefono\n" : "Ticket,Status,Client Name,Phone\n";
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
    
    toast(currentLang === 'es' ? `Exportadas ${paidTickets.length} boletas pagadas.` : `Exported ${paidTickets.length} paid tickets.`, 'success');
}
