// Contraseña de administrador.
const ADMIN_PASS = "1000"; 

// Depende de toast() (notificaciones.js), openModal() (script.js) y appData (script.js)

function openAdminAuth() {
    const pass = prompt("🔑 Ingrese Contraseña de Administrador:");
    if (pass === ADMIN_PASS) {
        renderUserList();
        openModal('adminModal');
    } else {
        toast("⛔ Contraseña Incorrecta", 'error'); 
    }
}

function renderUserList() {
    const tbody = document.getElementById('userListBody');
    tbody.innerHTML = appData.users.map(u => {
        // Sanitización para evitar XSS básico en el panel
        const sanitize = (str) => String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");

        return `
            <tr style="border-bottom:1px solid #333">
                <td style="padding:5px;">${sanitize(u.name)}</td>
                <td style="padding:5px;">${sanitize(u.phone)}</td>
                <td style="padding:5px;">${sanitize(u.email)}</td>
                <td style="padding:5px; font-size:0.7rem; color:#888;">${u.date}</td>
            </tr>
        `;
    }).join('');
}

// Función que coincide con el 'onclick="resetSystem()"' del HTML
function resetSystem() {
    if(confirm("⚠️ ¿ESTÁS SEGURO?\nSe borrarán TODAS las reservas, pagos y usuarios.\nEsta acción no se puede deshacer.")) {
        // STORAGE_KEY se define en script.js
        localStorage.removeItem(STORAGE_KEY); 
        window.location.reload();
    }
}

function exportData() {
    let csv = "Nombre,Email,Telefono,FechaRegistro\n";
    
    // Función para escapar campos para CSV
    const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;
    
    appData.users.forEach(u => {
        csv += `${escape(u.name)},${escape(u.email)},${escape(u.phone)},${escape(u.date)}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'Usuarios_Rifa.csv'; a.click();
    window.URL.revokeObjectURL(url);
}
