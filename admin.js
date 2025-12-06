
document.addEventListener('DOMContentLoaded', () => {

    const database = firebase.database();
    const boletasRef = database.ref('boletas');
    const winnersRef = database.ref('rifaWinners');

    // --- 2. REFERENCIAS DOM DEL PANEL ADMIN ---
    const adminMainView = document.getElementById('admin-main-view');
    const tableReservadas = document.getElementById('table-reservadas');
    const tablePagadas = document.getElementById('table-pagadas');
    const formManual = document.getElementById('form-assign-manual');
    const formWinner = document.getElementById('form-register-winner');
    const tableWinnerHistoryBody = document.querySelector('#table-winner-history tbody');

    
    window.renderAdminDashboard = function() {
        // Obtenemos una captura ÚNICA ('once') de los datos, más eficiente para un dashboard.
        boletasRef.once('value').then(snapshot => {
            const boletasData = snapshot.val() ? Object.values(snapshot.val()) : [];
            
            const pagadas = boletasData.filter(b => b.status === 'pagado');
            const reservadas = boletasData.filter(b => b.status === 'reservado');
            
            // Renderiza tablas
            renderTable(tableReservadas, reservadas, 'reservado');
            renderTable(tablePagadas, pagadas, 'pagado');

            // Asignar listeners dinámicamente
            // Los listeners solo necesitan el ID de la boleta
            document.querySelectorAll('.btn-pagar-confirma').forEach(btn => {
                btn.onclick = () => confirmPayment(parseInt(btn.dataset.id));
            });

            document.querySelectorAll('.btn-table-release').forEach(btn => {
                btn.onclick = () => releaseBoleta(parseInt(btn.dataset.id));
            });
            
        }).catch(error => {
            console.error("Error al cargar el dashboard de admin:", error);
            alert("Error al cargar datos de Firebase.");
        });
    };

    /**
     * Genera el HTML de las tablas de Pagados/Reservados.
     */
    function renderTable(tableElement, data, status) {
    if (!tableElement) return;
    
    const isReserved = status === 'reservado';
    
    // --- Define la fecha y hora de expiración fija (30/01/2026 09:58:00) ---
    // NOTA: Se define aquí para que esté disponible dentro del forEach.
    const fixedExpirationDate = new Date('2026-01-30T09:58:00'); 

    let html = `
        <thead>
            <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>${isReserved ? 'Vencimiento' : 'Acciones'}</th>
            </tr>
        </thead>
        <tbody>
    `;

    if (data.length === 0) {
        html += `<tr><td colspan="4">No hay boletas ${status}s.</td></tr>`;
    } else {
        data.forEach(b => {
            const numStr = b.num;
            
            // --------------------------------------------------------------------------
            // CAMBIO CLAVE: Usar la fecha fija en lugar del cálculo (timestamp + 2h)
            // --------------------------------------------------------------------------
            const expiration = isReserved
                ? fixedExpirationDate.toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                  }) + ' ' + fixedExpirationDate.toLocaleTimeString('es-CO', {
                      hour: '2-digit',
                      minute: '2-digit'
                  })
                : 'Pagado';
            // --------------------------------------------------------------------------

            html += `
                <tr>
                    <td>${numStr}</td>
                    <td>${b.owner || 'N/A'}</td>
                    <td><a href="https://wa.me/57${b.phone}" target="_blank">${b.phone || 'N/A'}</a></td>
                    <td>
                        ${isReserved ? 
                            // Si está reservado, se muestra el botón PAGAR
                            `<button class="btn-table-confirm btn-pagar-confirma" data-id="${b.id}">PAGAR</button>` :
                            // Si no está reservado (estatus diferente), se muestra el botón LIBERAR
                            `<button class="btn-table-release" data-id="${b.id}">LIBERAR</button>`
                        }
                        ${isReserved ? `<span class="small-text"> (${expiration})</span>` : ''}
                    </td>
                </tr>
            `;
        });
    }
    
    html += '</tbody>';
    tableElement.innerHTML = html;
}

    // =========================================================
    // II. ACCIONES DEL ADMINISTRADOR (UPDATE en Firebase)
    // =========================================================

    /**
     * Cambia una boleta de 'reservado' a 'pagado' en Firebase.
     */
    function confirmPayment(id) {
        if (!confirm(`¿CONFIRMAR PAGO de la boleta #${id.toString().padStart(3, '0')}?`)) return;

        // Actualización atómica en el nodo de la boleta específica
        boletasRef.child(id).update({ 
            status: 'pagado',
            // Limpiamos el timestamp al confirmar el pago
            reservationTimestamp: null 
        }).then(() => {
            renderAdminDashboard(); // Refrescar la vista
            alert(`✅ Boleta #${id.toString().padStart(3, '0')} marcada como PAGADA.`);
        }).catch(e => console.error("Error al confirmar pago:", e));
    }

    /**
     * Libera una boleta ocupada (reservada o pagada) en Firebase.
     */
    function releaseBoleta(id) {
        if (!confirm(`⚠️ ¿LIBERAR boleta #${id.toString().padStart(3, '0')}? Se perderán los datos del cliente.`)) return;

        boletasRef.child(id).update({
            status: 'libre',
            owner: null,
            phone: null,
            reservationTimestamp: null
        }).then(() => {
            renderAdminDashboard(); 
            alert(`Boleta #${id.toString().padStart(3, '0')} liberada y disponible.`);
        }).catch(e => console.error("Error al liberar boleta:", e));
    }

    // =========================================================
    // III. GESTIÓN MANUAL DE BOLETAS
    // =========================================================

    // Listener para abrir el modal de asignación manual
    document.getElementById('btn-assign-manual').addEventListener('click', () => {
        window.toggleModal('modal-admin-panel', false); // Cierra admin
        window.toggleModal('modal-assign-manual', true); // Abre manual
    });

    // Listener para botones del formulario manual
    formManual.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            e.preventDefault(); // Previene el envío por defecto del formulario

            const numInput = document.getElementById('manual-num');
            const nameInput = document.getElementById('manual-name');
            const phoneInput = document.getElementById('manual-phone');
            
            const num = parseInt(numInput.value, 10);
            const name = nameInput.value.trim();
            const phone = phoneInput.value.trim();

            if (isNaN(num) || num < 0 || num > 999 || !name || phone.length < 8) {
                alert("Por favor, introduce datos válidos para la asignación.");
                return;
            }

            let newStatus;
            if (e.target.classList.contains('btn-pagar-manual')) {
                newStatus = 'pagado';
            } else if (e.target.classList.contains('btn-reservar-manual')) {
                newStatus = 'reservado';
            } else {
                return;
            }
            
            // Asignar y guardar en Firebase
            boletasRef.child(num).update({
                status: newStatus,
                owner: name,
                phone: phone,
                reservationTimestamp: (newStatus === 'reservado' ? Date.now() : null)
            }).then(() => {
                alert(`Boleta #${num.toString().padStart(3, '0')} asignada manualmente como ${newStatus.toUpperCase()}.`);
                formManual.reset();
                window.toggleModal('modal-assign-manual', false);
                window.toggleModal('modal-admin-panel', true);
                renderAdminDashboard(); // Refresca el dashboard
            }).catch(e => console.error("Error al asignar manualmente:", e));
        }
    });

    // =========================================================
    // IV. GESTIÓN DE SORTEOS Y GANADORES
    // =========================================================

    // Listener para abrir el modal de registro de ganador
    document.getElementById('btn-manage-sorteos').addEventListener('click', () => {
        window.toggleModal('modal-admin-panel', false);
        window.toggleModal('modal-register-winner', true);
    });

    /**
     * Maneja el registro de un ganador, actualizando winnersRef.
     */
    formWinner.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const date = document.getElementById('winner-date').value;
        const lottery = document.getElementById('winner-lottery').value.trim();
        const winnerNum = parseInt(document.getElementById('winner-number').value, 10);
        
        if (!date || !lottery || isNaN(winnerNum) || winnerNum < 0 || winnerNum > 999) {
            alert("Por favor, completa los campos correctamente.");
            return;
        }

        // 1. Obtener el estado final de la boleta desde Firebase
        boletasRef.child(winnerNum).once('value').then(snapshot => {
            const boletaGanadora = snapshot.val();
            
            const winnerName = boletaGanadora?.owner || "NO VENDIDO / LIBRE";
            const winnerStatus = boletaGanadora?.status || "libre";
            
            const newWinner = {
                date: date,
                lottery: lottery,
                number: winnerNum.toString().padStart(3, '0'),
                winnerName: winnerName,
                status: winnerStatus,
                timestamp: Date.now()
            };

            // 2. Guardar el nuevo ganador bajo un ID autogenerado de Firebase
            winnersRef.push(newWinner).then(() => {
                 alert(`🏆 ¡Ganador Registrado! Boleta #${newWinner.number} - Cliente: ${winnerName}`);
                 formWinner.reset();
                 window.toggleModal('modal-register-winner', false);
                 window.toggleModal('modal-admin-panel', true);
            }).catch(e => console.error("Error al registrar ganador:", e));
        });
    });

    /**
     * Renderiza la tabla de historial de ganadores leyendo de winnersRef.
     */
    window.renderWinnerHistory = function() {
        tableWinnerHistoryBody.innerHTML = '<tr><td colspan="4">Cargando historial...</td></tr>';

        winnersRef.once('value').then(snapshot => {
            const winnersData = snapshot.val();
            // Convertimos el objeto de Firebase a un array y lo revertimos para ver el más reciente primero
            const winners = winnersData ? Object.values(winnersData).reverse() : []; 
            
            let html = '';
            
            if (winners.length === 0) {
                html = '<tr><td colspan="4">Aún no se han registrado ganadores.</td></tr>';
            } else {
                winners.forEach(w => {
                    const statusClass = w.status === 'pagado' ? 'badge disponible' : (w.status === 'reservado' ? 'badge reservado' : 'badge pagado');
                    html += `
                        <tr>
                            <td>${w.date}</td>
                            <td>${w.lottery}</td>
                            <td>${w.number}</td>
                            <td><span class="${statusClass}">${w.winnerName} (${w.status.toUpperCase()})</span></td>
                        </tr>
                    `;
                });
            }
            tableWinnerHistoryBody.innerHTML = html;
        });
    };

    // =========================================================
    // V. HERRAMIENTAS DE MANTENIMIENTO (EXPORTAR Y RESET)
    // =========================================================

    // 1. Exportar Datos a CSV (Utilidad simple)
    document.getElementById('btn-download-data').addEventListener('click', () => {
        boletasRef.once('value').then(snapshot => {
            const boletasData = snapshot.val() ? Object.values(snapshot.val()) : [];
            if (boletasData.length === 0) {
                alert("No hay datos para exportar.");
                return;
            }

            // Encabezado CSV
            let csvContent = "Numero,Estado,Cliente,Telefono,TimestampReserva\n";

            // Datos
            boletasData.forEach(b => {
                csvContent += `${b.num},${b.status},"${b.owner || ''}","${b.phone || ''}",${b.reservationTimestamp || ''}\n`;
            });

            // Descarga
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `rifa_cr4_export_${new Date().toISOString().slice(0, 10)}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            alert("✅ Datos exportados con éxito.");
        });
    });
    
    // 2. RESET TOTAL (Elimina todos los datos de Firebase)
    document.getElementById('btn-reset-data').addEventListener('click', () => {
        if (!confirm('🚨 ADVERTENCIA CRÍTICA: Esta acción eliminará TODA la base de datos de boletas y ganadores de Firebase. ¿Desea continuar?')) return;

        // Eliminar ambos nodos de Firebase
        boletasRef.set(null) // Borra todas las boletas
            .then(() => winnersRef.set(null)) // Borra todos los ganadores
            .then(() => {
                alert('Base de datos completamente borrada. La página se recargará para re-inicializar los 1000 números.');
                window.location.reload(); // Recargar para forzar la inicialización en script.js
            })
            .catch(e => console.error("Error al resetear la base de datos:", e));
    });

});

