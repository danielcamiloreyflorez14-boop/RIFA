import { db, auth, storage } from "./firebase.js";


// LÍNEA 10 - URL BASE DE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbxNnFoh0YsR-ueK9nRqmLb-EzBprpa1GGUhl6P3kGW3tX3Z2p2m2SuNyrLfabdJ8xa9mg/exec";

// --- CONFIGURACIÓN GLOBAL ---
const ADMIN_PASS_ENCODED = "MDAwLTk5OQ=="; // Contraseña "000-999" codificada
const TOTAL_TICKETS = 1000;
const MAX_RESERVATIONS_PER_USER = 3; 
const RESERVATION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 Horas
const FINAL_RAFFLE_DATE = new Date('2026-01-30T22:00:00'); 
const WEEKLY_DRAW_DAY = 5; // 0=Domingo, 5=Viernes
const WEEKLY_DRAW_HOUR = 22; // 10 PM (22:00)
const RESERVATION_CLEARANCE_HOUR = 17; // 5 PM (17:00) Viernes
const LAST_WEEKLY_DRAW = new Date('2026-01-23T22:00:00').getTime(); 
const STORAGE_KEY_BACKUP = "rifa_backup_local"; // Clave de respaldo local

// --- ESTADO GLOBAL ---
let appData = {
    tickets: [],    // { num, state, owner (email), reservedAt }
    users: [],      // { name, email, phone }
    currentUser: null,
    selectedTickets: [], 
    winners: [], 
};

// 🌟 ESTADOS PARA OPTIMIZAR EL GUARDADO (Solo rastreamos lo que cambia) 🌟
let changedTickets = new Set(); // Guarda los 'num' de las boletas a actualizar
let newUsers = [];              // Guarda los usuarios que solo existen localmente


// ==============================================================================
// === FUNCIONES DE PERSISTENCIA (CARGA Y GUARDADO OPTIMIZADO) ===
// ==============================================================================

/** Carga los datos desde SheetDB y configura la aplicación */
/** Carga los datos desde Google Apps Script y configura la aplicación */
async function load() {
    showLoading(); 

    // Cargar Tema Local
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') document.body.classList.add('dark-mode');

    // 1. CARGAR DATOS DE LA NUBE (APPS SCRIPT)
    try {
        // Solo llamamos una vez para obtener el estado de los tickets de Hoja1
        const ticketsResponse = await fetch(`${API_URL}?format=json&sheet=Hoja1`);
        
        if (!ticketsResponse.ok) {
            throw new Error("Error cargando datos de Apps Script.");
        }

        const ticketsData = await ticketsResponse.json();

        // ⚠️ Advertencia: En este nuevo modelo, las hojas 'users' y 'winners' no se cargan automáticamente.
        // Asumimos que la lista de usuarios y ganadores se manejará manualmente o con una solución Apps Script más compleja.
        
        // 2. Proceso de Inicialización
        // appData.users y appData.winners se inicializan como arrays vacíos
        appData.users = []; 
        appData.winners = []; 
        initializeTickets(Array.isArray(ticketsData) ? ticketsData : []); 

    } catch (error) {
        console.error("Error cargando:", error);
        toast("⚠️ Error grave al conectar con la base de datos (Apps Script). Usando datos de respaldo.", 'error');
        // Fallback: Intentar cargar lo local si falla la nube
        const savedLocal = localStorage.getItem(STORAGE_KEY_BACKUP);
        if(savedLocal) appData = JSON.parse(savedLocal);
        else initializeTickets();
    }
    
    // Lógica de limpieza y renderizado
    checkExpirations();
    renderGrid();
    updateUI();
    startCountdown();
    renderInteractiveLegend();
    setupListeners();
    hideLoading();
}
/** 🌟 FUNCIÓN OPTIMIZADA: Solo guarda los tickets y usuarios que cambiaron 🌟 */
async function save() {
    updateUI();
    renderGrid();

    // 1. Guardar copia local por seguridad (BACKUP)
    localStorage.setItem(STORAGE_KEY_BACKUP, JSON.stringify(appData));

    // 2. GUARDAR EN LA NUBE (SOLO CAMBIOS)
    try {
        const updates = [];

        // A. Crear Nuevos Usuarios (usando POST)
        if (newUsers.length > 0) {
             const userPosts = newUsers.map(user => 
                fetch(`${API_URL}/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user: user }) 
                })
             );
             updates.push(...userPosts);
             newUsers = []; // Limpiar la lista de nuevos
        }

        // B. Actualizar Tickets Existentes (usando PUT)
        for (const num of changedTickets) {
            const t = appData.tickets.find(tk => tk.num === num);
            if (!t) continue; 

            updates.push(
                fetch(`${API_URL}/tickets/num/${t.num}`, {
                    method: 'PUT', // PUT para actualizar por la columna 'num'
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticket: t }) 
                })
            );
        }
        changedTickets.clear(); // Limpiar la lista de tickets cambiados

        if (updates.length > 0) {
            await Promise.all(updates);
            toast("Datos sincronizados en la nube (RÁPIDO).", 'success');
        }

    } catch (error) {
        console.error("Error guardando:", error);
        toast("⚠️ Error de conexión: Los cambios se guardaron localmente pero no en la nube.", 'error');
    }
}

/** Inicializa los 1000 tickets, o los fusiona con los que vienen de SheetDB */
function initializeTickets(existingTickets = []) {
    const existingMap = new Map(existingTickets.map(t => [t.num, t]));
    appData.tickets = [];
    let initialTicketsToPost = []; 

    for(let i=0; i<TOTAL_TICKETS; i++) {
        const num = formatNum(i);
        const existing = existingMap.get(num);

        if (existing) {
            appData.tickets.push(existing);
        } else {
            const newTicket = { num, state: 'available', owner: null, reservedAt: null };
            appData.tickets.push(newTicket);
            
            // Si la hoja no tenía esta boleta, la añadimos a la lista de POST
            if(existingTickets.length === 0) {
                initialTicketsToPost.push(newTicket);
            }
        }
    }
    
    // Si la hoja estaba vacía, se inicializa la tabla en SheetDB con todas las boletas
    if (initialTicketsToPost.length > 0) {
        toast("Inicializando 1000 boletas en SheetDB. Esto puede tardar unos segundos...", 'warning');
        postInitialTickets(initialTicketsToPost);
    }
}

/** Envía los 1000 tickets iniciales a SheetDB la primera vez */
async function postInitialTickets(tickets) {
    // SheetDB tiene un límite de POST por lote (generalmente 1000, pero lo dividimos para seguridad)
    for(let i = 0; i < tickets.length; i += 500) {
        const batch = tickets.slice(i, i + 500);
        try {
            const response = await fetch(`${API_URL}/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tickets: batch })
            });
            if (!response.ok) throw new Error(`Falló el lote ${i/500}`);
        } catch(e) {
            console.error("Error al postear lote inicial:", e);
        }
    }
    toast("¡Inicialización de 1000 boletas completa! Ahora la app está lista.", 'success');
}

function checkExpirations() {
    const now = Date.now();
    let expired = 0;
    appData.tickets.forEach(t => {
        if (t.state === 'reserved' && t.reservedAt && (now - t.reservedAt > RESERVATION_DURATION_MS)) {
            t.state = 'available';
            t.owner = null;
            t.reservedAt = null;
            expired++;
            changedTickets.add(t.num); // Marcar como cambiado para guardar
        }
    });
    if (expired > 0) {
        toast(`Se liberaron ${expired} reservas vencidas.`, 'warning');
        if (expired > 0) save(); // Guardar la liberación en la nube
    }
}

function refreshData() {
    load(); 
    toast("Datos y contadores actualizados", 'success');
}


// ==============================================================================
// === LÓGICA DE USUARIO Y RESERVA ===
// ==============================================================================

/** * Maneja el login/registro del usuario. 
 * ¡Correo es opcional ahora!
 */
function handleLogin(event) {
    event.preventDefault();
    const name = document.getElementById('userName').value.trim();
    const phone = document.getElementById('userPhone').value.trim().replace(/\s/g, ''); 
    let email = document.getElementById('userEmail').value.trim().toLowerCase();

    // Validaciones
    if (!name || !phone) {
        return toast('Por favor, ingresa al menos tu Nombre y Teléfono.', 'error');
    }
    
    // 🌟 SI NO PUSO EMAIL, CREAMOS UNO INTERNO 🌟
    if (!email) {
        email = `${phone}@noemail.rifa`;
    }

    let user = getUserByEmail(email);
    
    if (user) {
        // Usuario existente: solo actualizamos datos locales
        user.name = name;
        user.phone = phone;
        // NOTA: Para actualizar el usuario en SheetDB, se requiere un fetch PUT extra que ignoramos por simplicidad.
    } else {
        // Nuevo usuario
        user = { name, email, phone };
        appData.users.push(user);
        newUsers.push(user); // 👈 Marcar para guardar en la nube
        toast(`¡Bienvenido, ${user.name}!`, 'success');
    }
    
    appData.currentUser = user;
    save(); // Guardar el nuevo usuario
    closeModal('loginModal');
    
    if (appData.selectedTickets.length > 0) {
        confirmReservation();
    }
    checkMyTickets();
}

/** Confirma la reserva de los tickets seleccionados */
function confirmReservation() {
    if (!appData.currentUser) {
        return openModal('loginModal');
    }

    const count = appData.selectedTickets.length;
    if (count === 0) return toast("Debes seleccionar al menos un número.", 'warning');

    const nums = appData.selectedTickets.join(', ');
    
    if (confirm(`¿Confirmas la reserva de ${count} número(s): ${nums} a nombre de ${appData.currentUser.name}? Las reservas vencen en 24 horas si no se pagan.`)) {
        
        const now = Date.now();
        appData.selectedTickets.forEach(num => {
            const ticket = appData.tickets.find(t => t.num === num);
            if (ticket && ticket.state === 'available') {  
                ticket.state = 'reserved';
                ticket.owner = appData.currentUser.email;
                ticket.reservedAt = now;
                
                changedTickets.add(num); // 👈 Marcar para guardar en la nube
            }
        });

        appData.selectedTickets = []; 
        save(); // Guardar los cambios de los tickets
        toast(`¡Reserva exitosa! Tienes 24h para pagar los números: ${nums}`, 'success');
        showInstructions(); 
    }
    
    renderGrid(); 
}

// ==============================================================================
// === FUNCIÓN DE RESETEO TOTAL ===
// ==============================================================================

/** Resetea todos los datos de la aplicación y guía para el reseteo de la nube */
function adminResetRaffle() { 
    // Chequeo de seguridad de administrador (asumiendo que el admin es 'admin@admin.com')
    if (!appData.currentUser || appData.currentUser.email !== 'admin@admin.com') {
        return toast("Acceso denegado. Solo el administrador puede usar esta función.", 'error');
    }

    if (!confirm("⚠️ ADVERTENCIA CRÍTICA: ESTO BORRARÁ TODOS LOS DATOS (RESERVAS, PAGOS, USUARIOS) DE LA APLICACIÓN. ESTA ACCIÓN ES IRREVERSIBLE. ¿ESTÁS SEGURO?")) {
        return;
    }

    // 1. Resetear el estado global de la aplicación (Memoria)
    appData.tickets = [];
    appData.users = [];
    appData.selectedTickets = [];
    appData.winners = [];
    appData.currentUser = null;

    // 2. Reinicializar los 1000 tickets disponibles (solo localmente)
    initializeTickets(); // Asumo que esta función ya existe en tu script

    // 3. Limpiar el almacenamiento local (Backup)
    localStorage.removeItem(STORAGE_KEY_BACKUP); // Limpia el backup local
    
    // 4. Actualizar la interfaz
    renderGrid();
    updateUI();
    closeModal('adminModal');

    toast("✅ ¡Reseteo local completado! La aplicación está como nueva.", 'success');
    
    // 5. Instrucciones para el reseteo en la nube (Google Sheets)
    alert("⚠️ PASO CRÍTICO: RESETEO EN LA NUBE (GOOGLE SHEETS) ⚠️\n\n" +
          "El reseteo local fue exitoso, pero **DEBES** borrar los datos en tu Hoja de Cálculo de Google Sheets manualmente para completar el reseteo:\n\n" +
          "1. **Ve a la hoja 'tickets'**: Borra TODAS las filas que tengan números de boletas (deja solo la fila de encabezados).\n" +
          "2. **Ve a la hoja 'users'**: Borra TODAS las filas de usuarios (deja solo la fila de encabezados).\n" +
          "3. **Ve a la hoja 'winners'**: Borra TODAS las filas de ganadores (deja solo la fila de encabezados).\n\n" +
          "4. **Vuelve a cargar la página.** El script detectará que 'tickets' está vacío y volverá a crear las 1000 boletas limpias en SheetDB.");
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
    
    changedTickets.add(num); // 👈 Marcar para guardar en la nube

    save();
    renderAdminLists(); 
    renderGrid(); 
    toast(`Boleta ${num} cambiada a ${newState.toUpperCase()}`, 'success');
}

// ==============================================================================
// === FUNCIONES DE UTILIDAD GENERAL (COMPLETAS) ===
// ==============================================================================

/** Obtiene el valor de una variable CSS */
function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function formatNum(num) { 
    return parseInt(num).toString().padStart(3, '0'); 
}
function formatUser(user) { return `${user.name} (${user.phone})`; }
function getUserByEmail(email) { return appData.users.find(u => u.email === email); }
function getUserByPhone(phone) { return appData.users.find(u => u.phone === phone); } // Función extra útil

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
function toggleTheme() { 
    document.body.classList.toggle('light-mode'); 
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
}


// --- FUNCIONES DE GESTIÓN DE CARGA (SPINNER) ---
function showLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.classList.remove('hidden');
}

function hideLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.classList.add('hidden');
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


// ==============================================================================
// === LÓGICA DE CONTADOR ===
// ==============================================================================

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
            
            if(document.getElementById("nextDrawTime")) {
                document.getElementById("nextDrawTime").innerHTML = `${d}D ${h}:${m}:${s}`;
            }
        } else if (nextDrawTime < FINAL_RAFFLE_DATE.getTime()) {
            if(document.getElementById("nextDrawTime")) {
                document.getElementById("nextDrawTime").innerHTML = "¡HOY, A LAS 10 PM!";
            }
        } else {
            if(document.getElementById("nextDrawTime")) {
                document.getElementById("nextDrawTime").innerHTML = "FINALIZADO";
            }
        }

        // Contador Final
        distance = FINAL_RAFFLE_DATE.getTime() - now;
        if (distance > 0) {
            const d_final = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h_final = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
            const m_final = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s_final = Math.floor((distance % (1000 * 60)) / (1000)).toString().padStart(2, '0');
            if(document.getElementById("finalDrawTime")) {
                document.getElementById("finalDrawTime").innerHTML = `${d_final}D ${h_final}:${m_final}:${s_final}`;
            }
        } else {
            if(document.getElementById("finalDrawTime")) {
                document.getElementById("finalDrawTime").innerHTML = "¡RIFA TERMINADA!";
                clearInterval(timer); 
            }
        }
    }, 1000);
}


// ==============================================================================
// === RENDERIZADO UX (GRID Y LEYENDA) ===
// ==============================================================================

/** Genera la leyenda interactiva de colores */
function renderInteractiveLegend() {
    // Definiciones de colores para asegurar la leyenda
    const primaryColor = getCssVar('--primary');
    const warningColor = getCssVar('--warning');
    const accentColor = getCssVar('--accent');
    const secondaryColor = getCssVar('--secondary'); // Para el color "Mío"

    const legendData = [
        { color: primaryColor, text: 'Disponible: Puedes seleccionarlo y reservarlo.' },
        { color: warningColor, text: 'Reservado: Alguien lo seleccionó. Paga pronto o se libera.' },
        { color: accentColor, text: 'Pagado: Boleta asegurada para el sorteo final y semanal.' },
        { color: secondaryColor, text: 'Mío (Blink): Número reservado/pagado por ti.' }
    ];

    const container = document.getElementById('interactiveLegend');
    if (!container) return; 
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
    if (!grid) return;
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

    if(document.getElementById('statAvail')) document.getElementById('statAvail').textContent = stats.available;
    if(document.getElementById('statRes')) document.getElementById('statRes').textContent = stats.reserved;
    if(document.getElementById('statPaid')) document.getElementById('statPaid').textContent = stats.paid;
    if(document.getElementById('statTotal')) document.getElementById('statTotal').textContent = TOTAL_TICKETS; 

    // Actualizar Botón de Reserva Múltiple
    const selectedCount = appData.selectedTickets.length;
    const btn = document.getElementById('multiReserveBtn');
    if(document.getElementById('selectedCount')) document.getElementById('selectedCount').textContent = selectedCount;
    if(btn) btn.style.display = selectedCount > 0 ? 'block' : 'none';

    // Actualizar estado de autenticación
    const btnAuth = document.getElementById('btnAuth');
    if (btnAuth) {
        if (appData.currentUser) {
            btnAuth.textContent = `👋 ${appData.currentUser.name.split(' ')[0]}`;
            btnAuth.onclick = checkMyTickets;
        } else {
            btnAuth.textContent = `Ingresar`;
            btnAuth.onclick = () => openModal('loginModal');
        }
    }
}


// ==============================================================================
// === OTRAS ACCIONES DE COMPRA ===
// ==============================================================================

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
      alert(`PASOS PARA EL PAGO DE BOLETAS RESERVADAS:\n\n1. Valor: $25.000 COP por boleta.\n2. Realiza el pago por Nequi o Daviplata al número:\n   📞 321 963 7388 (Óscar Fidel Flórez Tami)\n3. Envía el comprobante de pago al WhatsApp del administrador (el botón flotante).\n4. Un administrador verificará tu pago y cambiará el estado de tu(s) boleta(s) a 'Pagada' (Color ROJO).\n\n¡Recuerda, tienes 24 horas para asegurar tus números, o serán liberados automáticamente!`);
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

// ==============================================================================
// === LÓGICA DE ADMINISTRACIÓN (COMPLETA) ===
// ==============================================================================

function openAdminAuth() {
    const pass = prompt("Ingrese la contraseña de administrador:");
    const expectedPass = atob(ADMIN_PASS_ENCODED);
    if (pass === expectedPass) {
        appData.currentUser = { name: 'Admin', email: 'admin@admin.com', phone: 'N/A' }; 
        renderAdminLists();
        openModal('adminModal');
        toast("Acceso de Administrador concedido.", 'success');
    } else if (pass !== null) {
        toast("Contraseña incorrecta.", 'error');
    }
}

function renderAdminLists() {
    const reservedBody = document.getElementById('reservedTicketListBody');
    const paidBody = document.getElementById('paidTicketListBody');
    if (!reservedBody || !paidBody) return; 

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
    
    const btnAdminDeleteWinner = document.getElementById('btnAdminDeleteWinner');
    if (btnAdminDeleteWinner) {
         btnAdminDeleteWinner.style.display = appData.currentUser && appData.currentUser.email === 'admin@admin.com' ? 'block' : 'none';
    }
}

function renderUserList() {
    const body = document.getElementById('userListBody');
    const search = document.getElementById('adminUserSearch')?.value.toLowerCase() || '';
    if (!body) return;
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
        // NOTA: Para eliminar el usuario de SheetDB, se requiere una llamada DELETE, que se omite por simplicidad y seguridad del script.
        save();
        renderAdminLists();
        toast("Cliente eliminado (localmente, no en la nube).", 'warning');
    }
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
        newUsers.push(user); // Marcar nuevo usuario
    } else {
        user.name = name; 
    }

    ticket.state = state;
    ticket.owner = uniqueEmail;
    ticket.reservedAt = Date.now();

    changedTickets.add(num); // Marcar ticket
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
    const user = getUserByEmail(ticket.owner);
    const ownerName = user ? user.name : "Nadie (Boleta Libre)";

    if (status === 'available') {
        info.innerHTML = `🚫 El número <span style="color: ${primaryColor};">${num}</span> está **LIBRE**. No hay un ganador pagado.`;
    } else if (status === 'reserved') {
        info.innerHTML = `⏳ El número <span style="color: ${warningColor};">${num}</span> está **RESERVADO** por **${ownerName}**. ¡Aún no está PAGADO!`;
    } else if (status === 'paid') {
        info.innerHTML = `✅ ¡GANADOR! El número <span style="color: ${accentColor};">${num}</span> está **PAGADO** por **${ownerName}**.`;
    }
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

    // Lógica de confirmación para advertir si no está pagado
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

    // Guardar el ganador en SheetDB (Winners)
    fetch(`${API_URL}/winners`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winner: newWinner })
    });

    if (type === 'final' && ticket.state !== 'available') {
         adminSetState(num, 'available'); // Liberar el ticket final
    } else {
        save(); // Guardar si no se llamó a adminSetState
    }

    closeModal('winnerManagementModal');
    toast(`Ganador ${winnerName} registrado para ${num}.`, 'success');
}

function openWinnerManagement() {
    closeModal('adminModal');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    document.getElementById('winnerDate').value = todayStr;
    document.getElementById('winnerNum').value = '';
    document.getElementById('winnerInfo').textContent = 'Ingrese un número de 3 dígitos (ej: 123)';
    openModal('winnerManagementModal');
    
    const winnerNumInput = document.getElementById('winnerNum');
    winnerNumInput.removeEventListener('input', previewWinnerInfo);
    winnerNumInput.addEventListener('input', previewWinnerInfo);
}

function renderWinnerHistory() {
    const body = document.getElementById('winnerListBody');
    if (!body) return;
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
    if(document.getElementById('drawsRemaining')) {
        document.getElementById('drawsRemaining').textContent = remainingText;
    }
}

function openWinnerHistory() {
    renderWinnerHistory();
    openModal('winnerHistoryModal');
}

function deleteWinnerHistory() {
    if (confirm("ADVERTENCIA: ¿Estás seguro de ELIMINAR TODO el historial de ganadores? Esta acción no se puede deshacer y solo lo elimina localmente.")) {
        // En un caso real, esto requeriría un DELETE masivo a SheetDB, pero lo hacemos local por simplicidad.
        appData.winners = [];
        save(); 
        renderWinnerHistory();
        toast("Historial de ganadores eliminado.", 'warning');
    }
}

// ==============================================================================
// === OTRAS FUNCIONES UX ===
// ==============================================================================

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
    const paid = appData.tickets
        .filter(t => t.state === 'paid')
        .map(t => {
            const user = getUserByEmail(t.owner);
            return {
                num: t.num,
                state: t.state,
                name: user ? user.name : 'N/A',
                phone: user ? user.phone : 'N/A',
                email: t.owner
            };
        });
    exportData(paid, `Rifa_Boletas_Pagadas_${new Date().toISOString().slice(0, 10)}.json`);
}

function setupListeners() {
    // Event Listeners para Filtrado/Búsqueda
    document.getElementById('searchInput')?.addEventListener('input', renderGrid);
    document.getElementById('filterSelect')?.addEventListener('change', renderGrid);
    
    // Event Listener para la Máscara de Teléfono (Input Mask)
    const userPhoneInput = document.getElementById('userPhone');
    if (userPhoneInput) {
        userPhoneInput.addEventListener('input', () => applyPhoneMask(userPhoneInput));
    }
    const adminUserSearchInput = document.getElementById('adminUserSearch');
    if (adminUserSearchInput) {
        adminUserSearchInput.addEventListener('input', renderUserList);
    }
    const verifyInput = document.getElementById('verifyNum');
    if (verifyInput) {
        verifyInput.addEventListener('input', verifyTicket);
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
}


// ==============================================================================
// === INICIALIZACIÓN AL CARGAR LA PÁGINA ===
// ==============================================================================

document.addEventListener('DOMContentLoaded', load);

import { ref, set } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

set(ref(db, "prueba/mensaje"), {
  texto: "Firebase conectado correctamente"
});

import { db } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function guardarCompra(numero, nombre, telefono) {
  try {
    await addDoc(collection(db, "compras"), {
      numero: numero,
      nombre: nombre,
      telefono: telefono,
      fecha: new Date()
    });
    alert("Compra guardada correctamente.");
  } catch (e) {
    console.error("Error guardando:", e);
    alert("Error al guardar.");
  }
}

// EJEMPLO: llamar función al dar clic
document.getElementById("btnComprar").addEventListener("click", () => {
  const numero = document.getElementById("inputNumero").value;
  const nombre = document.getElementById("inputNombre").value;
  const telefono = document.getElementById("inputTelefono").value;

  guardarCompra(numero, nombre, telefono);
});

import { storage } from "./firebase.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

async function subirComprobante(archivo) {
  const nombreArchivo = "comprobantes/" + Date.now() + "_" + archivo.name;
  const storageRef = ref(storage, nombreArchivo);

  await uploadBytes(storageRef, archivo);
  return await getDownloadURL(storageRef);
}

// EJEMPLO: botón subir
document.getElementById("btnSubirComprobante").addEventListener("click", async () => {
  const archivo = document.getElementById("inputComprobante").files[0];

  if (!archivo) return alert("Selecciona un archivo");

  const url = await subirComprobante(archivo);
  alert("Comprobante subido. URL:\n" + url);
});

import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// LOGIN
document.getElementById("btnLogin").addEventListener("click", () => {
  const email = document.getElementById("loginEmail").value;
  const pass = document.getElementById("loginPass").value;

  signInWithEmailAndPassword(auth, email, pass)
    .then(() => alert("Sesión iniciada"))
    .catch(e => alert("Error: " + e.message));
});

// LOGOUT
document.getElementById("btnLogout").addEventListener("click", () => {
  signOut(auth);
  alert("Sesión cerrada");
});

