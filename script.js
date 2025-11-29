// --- CONFIGURACIÓN ---
const STORAGE_KEY = "rifa_data_v3";
const TOTAL_TICKETS = 1000;

// --- ESTADO INICIAL (Compartido globalmente entre todos los archivos JS) ---
let appData = {
    tickets: [], // { num, state: 'available'|'reserved'|'paid', owner: email }
    users: [],   // { name, email, phone, date }
    currentUser: null
};

// --- MODALES (funciones universales) ---
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// --- PERSISTENCIA ---
function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
    updateUI(); // Refrescar UI al guardar
}

// --- INICIALIZACIÓN DE DATOS (Solo se ejecuta la primera vez) ---
function initializeData() {
    appData = { tickets: [], users: [], currentUser: null };
    for(let i=0; i<TOTAL_TICKETS; i++) {
        appData.tickets.push({ num: i.toString().padStart(3,'0'), state: 'available', owner: null });
    }
    save();
}

// --- INICIALIZACIÓN DE LA APLICACIÓN (al cargar la página) ---
window.onload = () => {
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
    
    // Configurar Event Listeners
    document.getElementById('searchInput').addEventListener('input', renderGrid);
    document.getElementById('filterSelect').addEventListener('change', renderGrid);
    
    updateUI();
    renderGrid();
};

// --- RENDERIZADO (GRID) ---
function renderGrid() {
    const grid = document.getElementById('grid');
    const filter = document.getElementById('filterSelect').value;
    const search = document.getElementById('searchInput').value.trim();
    
    grid.innerHTML = ''; 

    appData.tickets.forEach(t => {
        // Filtros
        if(filter !== 'all' && t.state !== filter) return;
        if(search && !t.num.includes(search)) return;

        const card = document.createElement('div');
        card.className = `card ${t.state}`;
        
        // Marcar mis boletas
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
function clickTicket(ticket) {
    if (!appData.currentUser) {
        // toast() se define en notificaciones.js
        toast("⚠️ Debes iniciar sesión para seleccionar.");
        openModal('loginModal');
        return;
    }

    if (ticket.state === 'available') {
        if(confirm(`¿Quieres RESERVAR el número ${ticket.num}?\nRecuerda que solo tienes 24h para pagar y confirmar.`)) {
            ticket.state = 'reserved';
            ticket.owner = appData.currentUser.email;
            save();
            toast(`¡Número ${ticket.num} reservado! Revisa las instrucciones de pago.`, 'success');
            renderGrid();
        }
    } else if (ticket.owner === appData.currentUser.email) {
        if(ticket.state === 'reserved') {
            toast(`Este es tu número reservado. Confirma el pago en WhatsApp.`);
            // showInstructions() se define en social.js
            showInstructions(); 
        } else {
            toast(`¡Felicidades! El número ${ticket.num} ya es tuyo y está PAGADO.`, 'success');
        }
    } else {
        toast("⛔ Este número ya está ocupado. Selecciona otro.", 'error');
    }
}

// --- AUTENTICACIÓN ---
function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    const phone = document.getElementById('userPhone').value;

    const user = { name, email, phone, date: new Date().toLocaleString() };
    
    appData.currentUser = user;
    
    // Guardar en historial si no existe
    const exists = appData.users.find(u => u.email === email);
    if(!exists) appData.users.push(user);

    save();
    closeModal('loginModal');
    toast(`Bienvenido, ${name}`);
    renderGrid(); 
}

function updateUI() {
    // Actualizar Botón Login/Logout
    const btn = document.getElementById('btnAuth');
    if (appData.currentUser) {
        // Muestra el primer nombre para hacerlo más personal
        btn.textContent = `Salir (${appData.currentUser.name.split(' ')[0]})`;
        btn.onclick = () => {
            if(confirm("¿Cerrar sesión?")) {
                appData.currentUser = null;
                save();
                window.location.reload();
            }
        };
    } else {
        btn.textContent = "Ingresar";
        btn.onclick = () => openModal('loginModal');
    }

    // Actualizar Estadísticas
    const counts = { available: 0, reserved: 0, paid: 0 };
    appData.tickets.forEach(t => counts[t.state]++);
    document.getElementById('statAvail').textContent = counts.available;
    document.getElementById('statRes').textContent = counts.reserved;
    document.getElementById('statPaid').textContent = counts.paid;
}

// --- UTILIDADES GLOBALES ---
function refreshData() {
    renderGrid();
    updateUI();
    toast("Datos actualizados");
}
