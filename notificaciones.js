// Archivo: notifications.js
// Lógica para gestionar notificaciones y alertas de reserva

const WARNING_BEFORE_EXPIRY_MS = 3 * 60 * 60 * 1000; // 3 horas antes de expirar

/**
 * Filtra y prepara la lista de boletas que están a punto de expirar (3 horas antes).
 */
function getExpiringReservations() {
    const now = Date.now();
    const imminentExpiryTime = now + WARNING_BEFORE_EXPIRY_MS;

    const expiringTickets = appData.tickets.filter(t => {
        if (t.state === 'reserved' && t.reservedAt) {
            const expiryTime = t.reservedAt + RESERVATION_DURATION_MS;
            // La boleta expira pronto (está dentro de la ventana de 3 horas)
            return expiryTime > now && expiryTime <= imminentExpiryTime;
        }
        return false;
    });

    // Agrupar por usuario para no enviar múltiples mensajes a la misma persona
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

/**
 * [ADMIN] Abre una modal para mostrar y enviar las notificaciones de expiración.
 */
function openNotificationModal() {
    if (!appData.currentUser || appData.currentUser.email !== atob(ADMIN_PASS_ENCODED)) {
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
            const whatsappLink = `https://api.whatsapp.com/send?phone=${user.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`¡URGENTE! Tu reserva en la Rifa de la Moto (${ticketList}) expira pronto. Paga ahora para asegurar tus números.`)}`;
            
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

    openModal('notificationModal');
}