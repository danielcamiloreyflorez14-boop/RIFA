function validarTelefono(tel) {
  const digits = String(tel).replace(/\D/g, '');
  return /^3\d{9}$/.test(digits) || /^\d{10}$/.test(digits);
}

//
// =========================================================
// RIFA CR4 - SCRIPT.JS (Versión 6 - Lógica REAL-TIME con Firebase y Caducidad)
// =========================================================
//

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. CONFIGURACIÓN GLOBAL Y CONSTANTES ---
    const TOTAL_BOLETAS = 1000;
    const PRECIO_BOLETA = 25000; // $25.000 COP
    const MAX_SELECCION = 3;
    const WHATSAPP_NUMBER = "573219637388"; // Número de contacto
    
    // Contraseña codificada (000-999) para el Admin
    const ADMIN_PASS_ENCODED = "MDAwLTk5OQ=="; 

    // Fechas de Sorteo (Ejemplo profesional)
    const FECHA_SORTEO_FINAL = new Date("Jan 30, 2026 22:00:00 GMT-0500").getTime(); 
    const FECHA_SORTEO_SEMANAL_BASE = new Date("Dec 26, 2025 22:00:00 GMT-0500"); 

    // --- 2. REFERENCIAS DOM Y FIREBASE ---
    // La variable 'database' se inicializa en index.html
    // Definimos la referencia principal a la colección de boletas
    const boletasRef = firebase.database().ref('boletas'); 
    
    const gridContainer = document.getElementById('grid-boletas');
    const mainContent = document.getElementById('app-content');
    const splashScreen = document.getElementById('splash-screen');
    const stickyFooter = document.getElementById('sticky-form-buy');
    const buyButton = document.getElementById('btn-participar-main');
    const totalPriceDisplay = document.getElementById('total-price');
    const countDisplay = document.getElementById('num-seleccionados-count');
    const searchInput = document.getElementById('search-number');
    const filterStatus = document.getElementById('filter-status'); 
    const confirmClientForm = document.getElementById('client-confirm-form');
    
    // Estadísticas
    const statLibre = document.getElementById('stat-libre');
    const statReservado = document.getElementById('stat-reservado');
    const statPagado = document.getElementById('stat-pagado');

    // --- 3. ESTADO DE LA APLICACIÓN ---
    let boletas = []; // Array principal que se SINCRONIZA con Firebase
    let seleccionActual = new Set(); // Guarda los IDs de boletas seleccionadas.
    
    // --- LÓGICA DE CADUCIDAD ---
    const EXPIRATION_TIME_MS = 2 * 60 * 60 * 1000; // 2 horas de caducidad de reserva


    // =========================================================
    // I. FUNCIONES DE BASE DE DATOS REAL-TIME (Firebase)
    // =========================================================

    /**
     * Inicializa las 1000 boletas en Firebase si el nodo no existe.
     * @returns {Promise}
     */
    function initializeDatabase() {
        return boletasRef.once('value').then(snapshot => {
            if (!snapshot.exists()) {
                const initialData = {};
                for (let i = 0; i < TOTAL_BOLETAS; i++) {
                    const numStr = i.toString().padStart(3, '0');
                    // Usamos el ID numérico como clave para facilitar el acceso en JS (boletas[id])
                    initialData[i] = {
                        id: i,
                        num: numStr,
                        status: 'libre',
                        owner: null,
                        phone: null,
                        reservationTimestamp: null
                    };
                }
                // Usamos .set para escribir los 1000 números iniciales
                return boletasRef.set(initialData); 
            }
            return Promise.resolve();
        });
    }
    
    /**
     * Función que verifica y libera automáticamente las boletas caducadas.
     * @param {Object} currentData - El objeto de boletas (clave: valor) de Firebase.
     */
    function cleanExpiredReservations(currentData) {
        let updates = {};
        let cleanedCount = 0;
        const now = Date.now();
        
        // Iteramos sobre las boletas
        Object.keys(currentData).forEach(key => {
            const boleta = currentData[key];
            
            if (boleta.status === 'reservado' && boleta.reservationTimestamp) {
                if (now - boleta.reservationTimestamp > EXPIRATION_TIME_MS) {
                    cleanedCount++;
                    // Preparamos la actualización para el nodo específico en Firebase
                    updates[key] = {
                        ...boleta, // Mantenemos ID, Num
                        status: 'libre',
                        owner: null,
                        phone: null,
                        reservationTimestamp: null
                    };
                }
            }
        });

        if (cleanedCount > 0) {
            console.warn(`[Admin Log] Se liberaron automáticamente ${cleanedCount} boletas por caducidad.`);
            // Enviar solo las actualizaciones necesarias a Firebase
            boletasRef.update(updates); 
        }
    }


    /**
     * Escucha cambios en Firebase y actualiza el estado global (boletas) y la UI.
     * REEMPLAZA a loadInitialState() y saveState().
     */
    function startRealtimeListener() {
        boletasRef.on('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                
                // 1. Aplicar limpieza de reservas caducadas
                cleanExpiredReservations(data);
                
                // 2. Sincronizar el array global 'boletas' y ordenarlo (porque Firebase usa claves)
                boletas = Object.values(data).sort((a, b) => a.id - b.id);
                
                // 3. Refrescar la UI (Grid y Estadísticas)
                generarBoletas(); 
                updateStats(); 
            }
        }, (error) => {
            console.error("Error al escuchar Firebase:", error);
            // Mensaje de fallback para el usuario
            alert("Error al cargar los datos en tiempo real. Intente refrescar la página.");
        });
    }

    // =========================================================
    // II. FUNCIONES UX Y GESTIÓN VISUAL
    // =========================================================

    // Carga de Audio (Se requiere el archivo click.mp3)
    const clickSound = new Audio('click.mp3'); 
    clickSound.volume = 0.5;

    function playFeedback() {
        if (clickSound) {
            clickSound.currentTime = 0;
            clickSound.play().catch(e => console.log("Audio de clic bloqueado."));
        }
        if (navigator.vibrate) {
            navigator.vibrate(10); 
        }
    }

    function triggerConfetti() {
        // ... (código de Confetti - sin cambios)
        if (typeof confetti !== 'function') return;

        const duration = 3000;
        const end = Date.now() + duration;
        const colors = ['#FF0055', '#00E676', '#FFCC00'];

        (function frame() {
            confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors: colors });
            confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors: colors });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    }

    function animarIntro() {
        // ... (código de animación de Intro - sin cambios)
        setTimeout(() => {
            splashScreen.classList.add('fade-out');
            mainContent.classList.remove('hidden');
            document.body.style.overflowY = 'auto';
            
            setTimeout(() => {
                splashScreen.remove();
            }, 1000); 
        }, 1500); 
    }

    // Función global para modales
    window.toggleModal = function(id, show) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.classList.toggle('hidden', !show);
            document.body.style.overflowY = show ? 'hidden' : 'auto';
        }
    }

    /**
     * Genera o refresca la grilla de boletas en el DOM.
     */
    function generarBoletas(
    filter = searchInput.value, statusFilter = filterStatus.value) {
        gridContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        // 1. Aplicar Filtros
        const boletasToShow = boletas.filter(b => {
            const normalizedFilter = filter.trim();
            // FIX: Si el filtro está vacío, numberMatch es TRUE para todos
            const numberMatch = normalizedFilter === '' || b.num.includes(normalizedFilter.padStart(3, '0').slice(-3));
            const statusMatch = statusFilter === 'todos' || b.status === statusFilter;

            return numberMatch && statusMatch;
        });

        // 2. Renderizar Boletas
        boletasToShow.forEach(boleta => {
            const btn = document.createElement('div');
            const isCurrentlySelected = seleccionActual.has(boleta.id);
            
            btn.classList.add('boleta', boleta.status);
            btn.textContent = boleta.num;
            btn.dataset.num = boleta.id;
            
            const statusText = document.createElement('span');
            statusText.classList.add('status-text');
            statusText.textContent = (boleta.status === 'libre') ? 'DISPONIBLE' : boleta.status.toUpperCase();
            btn.appendChild(statusText);

            // Determinar si es clickeable
            if (boleta.status === 'libre' || isCurrentlySelected) {
                btn.addEventListener('click', () => handleBoletaClick(boleta.id));
            } else {
                btn.classList.add('no-click');
            }

            // Aplicar el estado de selección actual
            if (isCurrentlySelected) {
                btn.classList.remove(boleta.status);
                btn.classList.add('seleccionado');
            }

            fragment.appendChild(btn);
        });
        gridContainer.appendChild(fragment);
    }

    function handleBoletaClick(id) {
        const elemento = document.querySelector(`.boleta[data-num="${id}"]`);

        if (seleccionActual.has(id)) {
            // Deseleccionar
            seleccionActual.delete(id);
            elemento.classList.remove('seleccionado');
            elemento.classList.add('libre');
        } else {
            // Seleccionar (si hay cupo y está libre)
            if (boletas[id].status !== 'libre') return;
            
            if (seleccionActual.size < MAX_SELECCION) {
                playFeedback();
                seleccionActual.add(id);
                elemento.classList.remove('libre');
                elemento.classList.add('seleccionado');
            } else {
                alert(`Solo puedes seleccionar un máximo de ${MAX_SELECCION} boletas.`);
                return;
            }
        }
        
        updateStickyFooter();
    }

    function updateStickyFooter() {
        // ... (código de actualización de footer - sin cambios)
        const count = seleccionActual.size;
        const total = count * PRECIO_BOLETA;

        if (count > 0) {
            totalPriceDisplay.textContent = `$${total.toLocaleString('es-CO')} COP`;
            countDisplay.textContent = `(${count})`;
            stickyFooter.classList.remove('hidden');
        } else {
            stickyFooter.classList.add('hidden');
        }
    }

    function updateStats() {
        // ... (código de actualización de estadísticas - sin cambios)
        const stats = boletas.reduce((acc, b) => {
            acc[b.status] = (acc[b.status] || 0) + 1;
            return acc;
        }, {});

        statLibre.textContent = (stats['libre'] || 0).toLocaleString();
        statReservado.textContent = (stats['reservado'] || 0).toLocaleString();
        statPagado.textContent = (stats['pagado'] || 0).toLocaleString();
    }
    
   //CUENTA REGRESIVA XD    
   function startCounters() {
    const timerFinal = document.getElementById('timer-final');
    const timerSemanal = document.getElementById('timer-semanal');

    setInterval(() => {
        const now = new Date().getTime();

        const FECHA_SORTEO_FINAL = new Date('2026-01-30T22:00:00').getTime();
        const distFinal = FECHA_SORTEO_FINAL - now;

        if (distFinal > 0) {
            const d = Math.floor(distFinal / (1000 * 60 * 60 * 24));
            const h = Math.floor((distFinal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distFinal % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distFinal % (1000 * 60)) / 1000);
            timerFinal.innerHTML = `${d}D ${h.toString().padStart(2, '0')}H ${m.toString().padStart(2, '0')}M ${s.toString().padStart(2, '0')}S`;
        } else {
            timerFinal.innerHTML = "¡SORTEO FINALIZADO!";
        }

        const FECHA_LIMITE_SEMANAL = new Date('2026-01-23T22:00:00');
        let proximoSemanal = new Date();
        proximoSemanal.setHours(22, 0, 0, 0);

        while (
            (proximoSemanal.getDay() !== 5 || proximoSemanal.getTime() <= now) &&
            proximoSemanal <= FECHA_LIMITE_SEMANAL
        ) {
            proximoSemanal.setDate(proximoSemanal.getDate() + 1);
        }

        const distSemanal = proximoSemanal.getTime() - now;

        if (distSemanal > 0) {
            const d = Math.floor(distSemanal / (1000 * 60 * 60 * 24));
            const h = Math.floor((distSemanal % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distSemanal % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distSemanal % (1000 * 60)) / 1000);
            timerSemanal.innerHTML = `${d}D ${h.toString().padStart(2, '0')}H ${m.toString().padStart(2, '0')}M ${s.toString().padStart(2, '0')}S`;
        } else {
            timerSemanal.innerHTML = "¡SORTEO SEMANAL EN CURSO!";
        }

    }, 1000);
}

    // =========================================================
    // IV. PROCESO DE COMPRA Y WHATSAPP (Actualización a Firebase)
    // =========================================================

    buyButton.addEventListener('click', () => {
        if (seleccionActual.size === 0) {
            alert("Por favor, selecciona al menos un número.");
            return;
        }
        
        const numeros = Array.from(seleccionActual).map(id => boletas[id].num).join(', ');
        document.getElementById('client-modal-numbers').textContent = numeros;
        
        window.toggleModal('modal-cliente-confirm', true);
    });

    /**
     * Maneja el envío del formulario y actualiza Firebase con la reserva.
     */
    confirmClientForm.addEventListener('submit', (e) => {
        e.preventDefault();

    
        const nombre = document.getElementById('client-name').value.trim();
        const telefono = document.getElementById('client-phone').value.trim();
        
        if (!nombre || telefono.length < 8) {
            alert("Por favor, completa tus datos correctamente (Nombre y Teléfono).");
            return;
        }
        
        let updates = {};
        const reservationTime = Date.now(); 
        
        // 1. Preparar Actualizaciones para Firebase (Bloqueo Real-Time)
        Array.from(seleccionActual).forEach(id => {
            // Nos aseguramos de que solo se reserven números LIBRES
            if (boletas[id].status !== 'libre') {
                console.error(`Error: Boleta ${boletas[id].num} ya no está libre.`);
                return; 
            }
            
            updates[id] = {
                id: id,
                num: boletas[id].num,
                status: 'reservado', // Estado a reservar
                owner: nombre,
                phone: telefono,
                reservationTimestamp: reservationTime // Marca de tiempo para caducidad
            };
        });
        
        // Si no hay actualizaciones válidas (ej: alguien más reservó justo antes), detenemos el proceso
        if (Object.keys(updates).length === 0) {
             alert("Lo sentimos, algunos de los números seleccionados acaban de ser reservados. Por favor, selecciona de nuevo.");
             seleccionActual.clear();
             updateStickyFooter();
             generarBoletas(); // Refresca la vista
             return;
        }

        // 2. Enviar Actualizaciones a Firebase (Esto es instantáneo)
        boletasRef.update(updates)
            .then(() => {
                // 3. Generar Mensaje de WhatsApp
                const numeros = Object.values(updates).map(u => u.num).join(', ');
                const total = Object.values(updates).length * PRECIO_BOLETA;
                const totalFormatted = total.toLocaleString('es-CO');

                const mensaje = 
                    `*✅ RESERVA DE BOLETAS - RIFA CR4*\n\n` +
                    `Hola, mi nombre es *${nombre}* y mi número de contacto es ${telefono}. He reservado las siguientes boletas para la rifa de la Moto CR4:\n\n` +
                    `*🎫 Números:* ${numeros}\n` +
                    `*💰 Valor Total:* $${totalFormatted} COP\n\n` +
                    `*⚠️ Esta reserva vence en 2 horas si no se confirma el pago.*\n\n` +
                    `Por favor, envíame los detalles de pago para asegurar mi reserva y pasarla a estado PAGADA.`;

                const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;
                
                // 4. Efecto WOW y apertura
                triggerConfetti(); 
                window.toggleModal('modal-cliente-confirm', false); 
                
                setTimeout(() => {
                    window.open(url, '_blank');
                }, 1200);

                // 5. Resetear UI (el listener de Firebase ya se encargó de actualizar la variable 'boletas')
                seleccionActual.clear();
                updateStickyFooter();
                confirmClientForm.reset();
            })
            .catch(error => {
                alert("Hubo un error al confirmar tu reserva. Intenta de nuevo.");
                console.error("Error al actualizar Firebase:", error);
            });
    });
    
    // =========================================================
    // V. LISTENERS ADICIONALES Y SEGURIDAD
    // =========================================================

    // Listener para la barra de búsqueda
    searchInput.addEventListener('input', () => {
        generarBoletas();
    });
    
    // Listener para el filtro de estado (Dropdown)
    filterStatus.addEventListener('change', () => {
        generarBoletas();
    });


    // Listener para el botón de Admin (SEGURIDAD con Contraseña)
    document.getElementById('btn-admin').addEventListener('click', () => {
        
        const passwordAttempt = prompt("🔒 Por favor, introduce la contraseña de administrador:");
        
        if (passwordAttempt === null) return;

        const attemptEncoded = btoa(passwordAttempt.trim());
        
        if (attemptEncoded === ADMIN_PASS_ENCODED) {
            window.toggleModal('modal-admin-panel', true);
            // Llama a la función de renderizado del dashboard (en admin.js)
            if (typeof renderAdminDashboard === 'function') {
                 renderAdminDashboard(); 
            }
        } else {
            alert("🚫 Contraseña incorrecta. Acceso denegado.");
        }
    });

    // Listener para el botón de Ganadores (Renderiza el historial)
    document.getElementById('btn-ganadores').addEventListener('click', () => {
        window.toggleModal('modal-sorteo-history', true);
        if (typeof renderWinnerHistory === 'function') renderWinnerHistory();
    });

    // =========================================================
    // VI. INICIO DE LA APLICACIÓN
    // =========================================================

    // 1. Inicializar DB (Crea 1000 números si es la primera vez)
    initializeDatabase()
        .then(() => {
            // 2. Iniciar el Escuchador Real-Time
            startRealtimeListener();
            
            // 3. Iniciar contadores
            startCounters();
            
            // 4. Iniciar animación de intro
            animarIntro();
            
            console.log("[INIT] Aplicación V6 Real-Time iniciada. Firebase conectado.");
        })
        .catch(e => console.error("Fallo crítico en la inicialización de Firebase:", e));
});

// Tooltip
const tooltip = document.getElementById("tooltip-reserva");

// Cuando generes cada boleta agrega esto:
boletaElement.dataset.nombre = nombrePersona || "Sin nombre"; // <-- debes asignar desde tu BD

// Eventos PC
boletaElement.addEventListener("mouseenter", (e)=>{
    if(estado !== "libre"){
        tooltip.textContent = `Reservado por: ${boletaElement.dataset.nombre}`;
        tooltip.classList.remove("hidden");
        tooltip.classList.add("visible");
    }
});
boletaElement.addEventListener("mousemove",(e)=>{
    tooltip.style.left = (e.pageX + 15) + "px";
    tooltip.style.top = (e.pageY + 15) + "px";
});
boletaElement.addEventListener("mouseleave", ()=>{
    tooltip.classList.add("hidden");
    tooltip.classList.remove("visible");
});

// Evento celulares (click/tap)
boletaElement.addEventListener("click", ()=>{
    if(estado !== "libre"){
        tooltip.textContent = `Reservado por: ${boletaElement.dataset.nombre}`;
        tooltip.style.left = "50%";
        tooltip.style.top = "70%";
        tooltip.classList.remove("hidden");
        tooltip.classList.add("visible");
        setTimeout(()=>tooltip.classList.add("hidden"),2500);
    }
});
