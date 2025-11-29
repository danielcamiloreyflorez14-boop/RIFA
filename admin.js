// admin.js

// Contraseña de administrador. 
// Recomendación: Usar una contraseña más compleja en un entorno real.
const ADMIN_PASS = "1000"; 
// NOTA: 'appData', 'toast', 'openModal', 'closeModal', 'STORAGE_KEY' 
// son variables y funciones que se asumen globales, definidas en otros archivos JS.

/**
 * Solicita la contraseña de administrador y abre el modal si es correcta.
 */
function openAdminAuth() {
    // Usamos 'prompt' para una implementación rápida, pero no es la forma más segura.
    const pass = prompt("🔑 Ingrese Contraseña de Administrador:");
    if (pass === ADMIN_PASS) {
        renderUserList(); // Cargar la lista de usuarios antes de abrir el modal
        openModal('adminModal');
        toast("Acceso de Administrador concedido", 'success');
    } else {
        toast("⛔ Contraseña Incorrecta", 'error'); 
    }
}

/**
 * Renderiza la lista de usuarios registrados en el panel de administrador.
 */
function renderUserList() {
    const tbody = document.getElementById('userListBody');
    if (!tbody) return;

    // Función simple de sanitización para prevenir inyección de código (XSS)
    const sanitize = (str) => String(str).replace(/</g, "&lt;").replace(/>/g, "&gt;");

    tbody.innerHTML = appData.users.map(u => {
        return `
            <tr style="border-bottom:1px solid #333">
                <td style="padding:5px;">${sanitize(u.name)}</td>
                <td style="padding:5px;">${sanitize(u.phone)}</td>
                <td style="padding:5px;">${sanitize(u.email)}</td>
                <td style="padding:5px; font-size:0.7rem; color:#888;">${sanitize(u.date)}</td>
            </tr>
        `;
    }).join('');
}

/**
 * Borra todos los datos del sistema (boletas y usuarios) y reinicia la aplicación.
 */
function resetSystem() {
    if(confirm("⚠️ ¿ESTÁS SEGURO?\nSe borrarán TODAS las reservas, pagos y usuarios. Esta acción no se puede deshacer.")) {
        // STORAGE_KEY se define en script.js
        localStorage.removeItem(STORAGE_KEY); 
        toast("Sistema Reiniciado y datos borrados.", 'error');
        // Recarga la página para forzar la inicialización de datos (initializeData)
        setTimeout(() => window.location.reload(), 500);
    }
}

/**
 * Exporta el historial de usuarios a un archivo CSV.
 */
function exportData() {
    let csv = "Nombre,Email,Telefono,FechaRegistro\n";
    
    // Función para escapar campos con comillas para el formato CSV
    const escape = (str) => `"${String(str).replace(/"/g, '""')}"`;
    
    appData.users.forEach(u => {
        csv += `${escape(u.name)},${escape(u.email)},${escape(u.phone)},${escape(u.date)}\n`;
    });
    
    // Crea y descarga el archivo Blob
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; 
    a.download = `Usuarios_Rifa_${new Date().toISOString().slice(0, 10)}.csv`; 
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast("📥 Datos de usuarios descargados correctamente.", 'success');
}
