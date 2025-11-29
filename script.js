// script.js

// --- CONFIGURACIÓN GLOBAL ---
const STORAGE_KEY = "rifa_data_v3";
const TOTAL_TICKETS = 1000;
// Fecha de Sorteo Final: 30 de Enero de 2026 a las 20:00:00 (8 PM)
const RAFFLE_DATE = new Date('2026-01-30T20:00:00').getTime();

// --- ESTADO INICIAL (Compartido globalmente) ---
// NOTA: Estas variables deben ser declaradas con 'let' para ser modificables y 
// accesibles desde otros scripts si se cargan después.
let appData = {
    tickets: [], // { num, state: 'available'|'reserved'|'paid', owner: email }
    users: [],   // { name, email, phone, date }
    currentUser: null
};

// --- MODALES (Funciones universales utilizadas por todos los scripts) ---
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// --- PERSISTENCIA ---

/**
 * Guarda el estado actual de appData en localStorage.
 */
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateUI(); // Refrescar UI al guardar (estadísticas, botones)
}

/**
 * Inicializa los datos si no existen (1000 boletas disponibles).
 */
function initializeData() {
    appData = { tickets: [], users: [], currentUser: null };
    for(let i=0; i<TOTAL_TICKETS; i++) {
        // Formatea el número con ceros a la izquierda (000 a 999)
        appData.tickets.push({ num: i.toString().padStart(3,'0'), state: 'available', owner: null });
    }
    save();
}

// --- RENDERIZADO (GRID) ---

/**
 * Dibuja la cuadrícula de boletas basada en filtros de búsqueda y estado.
 */
function renderGrid() {
    const grid = document.getElementById('grid');
    const filter = document.getElementById('filterSelect').value;
    const search = document.getElementById('searchInput').value.trim();
    
    grid.innerHTML = ''; 

    appData.tickets.forEach(t => {
        // Aplicar filtros
        if(filter !== 'all' && t.state !== filter) return;
        if(search && !t.num.includes(search)) return;

        const card = document.createElement('div');
        card.className = `card ${t.state}`;
        
        // Resaltar mis boletas
        if(appData.currentUser && t.owner === appData.currentUser.email) {
            card.style.borderColor = 'var(--secondary)';
            card.style.boxShadow = '0 0 10px var(--secondary)';
        }

        card.innerHTML = `
            <div class="num">${t.num}</div>
            <div class="status-text">${t.state === 'available' ? 'LIBRE' : t.state === 'paid' ? 'PAGADO' : 'RESERVADO'}</div>
        `;
        
        card.onclick = () => clickTicket(t);
        grid.appendChild(card);
    });
}

// --- LÓGICA DE CLICS ---

/**
 * Maneja el clic en una boleta, permitiendo reservarla si está libre.
 */
function clickTicket(ticket) {
    if (!appData.currentUser) {
        // toast() se define en notificaciones.js
        toast("⚠️ Debes iniciar sesión para seleccionar.");
        openModal('loginModal');
        return;
    }

    if (ticket.state === 'available') {
        if(confirm(`¿Quieres RESERVAR el número ${ticket.num}?\nEl sistema lo asignará a tu nombre. Recuerda contactar al Admin para confirmar el pago y mantener la reserva.`)) {
            ticket.state = 'reserved';
            // Asigna la boleta al email del usuario actual (identificador único)
            ticket.owner = appData.currentUser.email; 
            save();
            toast(`¡Número ${ticket.num} reservado! Revisa las instrucciones de pago.`, 'success');
            // showInstructions() se define en social.js
            showInstructions(); 
            renderGrid();
        }
    } else if (ticket.owner === appData.currentUser.email) {
        if(ticket.state === 'reserved') {
            toast(`Este es tu número reservado pendiente de pago.`, 'warning');
            showInstructions(); 
        } else {
            toast(`¡Felicidades! El número ${ticket.num} ya es tuyo y está PAGADO.`, 'success');
        }
    } else {
        toast("⛔ Este número ya está ocupado por otro participante.", 'error');
    }
}

// --- AUTENTICACIÓN ---

/**
 * Procesa el formulario de login/registro del usuario.
 */
function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const phone = document.getElementById('userPhone').value;

    const user = { name, email, phone, date: new Date().toLocaleString() };
    
    appData.currentUser = user;
    
    // Guardar en historial si el usuario es nuevo (basado en email)
    const exists = appData.users.find(u => u.email === email);
    if(!exists) appData.users.push(user);

    save();
    closeModal('loginModal');
    toast(`Bienvenido(a), ${name.split(' ')[0]}`, 'success');
    renderGrid(); 
}

/**
 * Actualiza la interfaz (botón de login/logout y estadísticas).
 */
function updateUI() {
    // 1. Botón Login/Logout
    const btn = document.getElementById('btnAuth');
    if (appData.currentUser) {
        btn.textContent = `Salir (${appData.currentUser.name.split(' ')[0]})`;
        btn.onclick = () => {
            if(confirm("¿Estás seguro de cerrar sesión?")) {
                appData.currentUser = null;
                save();
                window.location.reload();
            }
        };
    } else {
        btn.textContent = "Ingresar";
        btn.onclick = () => openModal('loginModal');
    }

    // 2. Estadísticas
    const counts = { available: 0, reserved: 0, paid: 0 };
    appData.tickets.forEach(t => counts[t.state]++);
    document.getElementById('statAvail').textContent = counts.available;
    document.getElementById('statRes').textContent = counts.reserved;
    document.getElementById('statPaid').textContent = counts.paid;
}

/**
 * Función que se llama al pulsar "Actualizar".
 */
function refreshData() {
    renderGrid();
    updateUI();
    toast("Datos y estadísticas actualizadas", 'success');
}

// --- MEJORA (CRONÓMETRO REGRESIVO) ---

/**
 * Calcula y actualiza el tiempo restante para el sorteo final.
 */
function updateCountdown() {
    const now = new Date().getTime();
    const distance = RAFFLE_DATE - now;
    const timerElement = document.getElementById('timer');

    if (distance < 0) {
        if (timerElement) timerElement.textContent = "¡EL SORTEO HA TERMINADO!";
        return;
    }

    // Cálculos de tiempo
    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    // Formatear el resultado
    const countdownString = 
        `${days} días | ${hours.toString().padStart(2, '0')} horas | ${minutes.toString().padStart(2, '0')} min | ${seconds.toString().padStart(2, '0')} seg`;

    if (timerElement) timerElement.textContent = countdownString;
}

// --- INICIALIZACIÓN DE LA APLICACIÓN ---

window.onload = () => {
    // 1. Cargar datos desde localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            appData = JSON.parse(saved);
        } catch(e) {
            console.error("Error al cargar datos, reiniciando:", e);
            initializeData();
        }
    } else {
        initializeData();
    }
    
    // 2. Configurar Event Listeners del Grid (para filtrar/buscar)
    document.getElementById('searchInput').addEventListener('input', renderGrid);
    document.getElementById('filterSelect').addEventListener('change', renderGrid);

    // 3. Iniciar Cronómetro
    updateCountdown(); 
    setInterval(updateCountdown, 1000); // Actualizar cada segundo

    // 4. Renderizar UI y Grid por primera vez
    updateUI();
    renderGrid();
};
