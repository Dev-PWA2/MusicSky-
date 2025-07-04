// ========== INIT INDEXEDDB ==========
const DB_NAME = 'MusicSkyDB';
const DB_VERSION = 9; 
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // Aumentado a 100 MB

let db = null;

function openDB(callback) {
    if (!window.indexedDB) {
        alert("Este navegador no soporta IndexedDB. No se puede continuar.");
        return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = function(e) {
        db = e.target.result;
        if (!db.objectStoreNames.contains('users')) {
            let users = db.createObjectStore('users', { keyPath: 'email' });
            users.createIndex('role', 'role', { unique: false });
        }
        if (!db.objectStoreNames.contains('musics')) {
            let musics = db.createObjectStore('musics', { keyPath: 'id', autoIncrement: true });
            musics.createIndex('uploader', 'uploader', { unique: false });
        }
    };
    req.onsuccess = function(e) {
        db = e.target.result;
        if (typeof callback === "function") callback();
    };
    req.onerror = function(e) {
        alert(`Error al abrir la base de datos: ${e.target.error.message || e.target.errorCode || "Error desconocido"}`);
    };
}

// ========== PANEL CHATÉA ==========
const chatPanel = document.getElementById('chatPanel');
const chatStep1 = document.getElementById('chatStep1');
const chatStepEmail = document.getElementById('chatStepEmail');
const chatStepWhatsApp = document.getElementById('chatStepWhatsApp');

document.getElementById('chatBtn').onclick = function () {
    chatPanel.classList.remove('hidden');
    chatStep1.classList.remove('hidden');
    chatStepEmail.classList.add('hidden');
    chatStepWhatsApp.classList.add('hidden');
};
document.getElementById('btnChatClose').onclick = function () {
    chatPanel.classList.add('hidden');
};
document.getElementById('btnChatEmail').onclick = function () {
    chatStep1.classList.add('hidden');
    chatStepEmail.classList.remove('hidden');
    chatStepWhatsApp.classList.add('hidden');
    document.getElementById('chatEmailName').value = '';
    document.getElementById('chatEmailAddr').value = '';
    document.getElementById('chatEmailErr').innerText = '';
};
document.getElementById('btnChatWhatsApp').onclick = function () {
    chatStep1.classList.add('hidden');
    chatStepWhatsApp.classList.remove('hidden');
    chatStepEmail.classList.add('hidden');
    document.getElementById('chatWAName').value = '';
    document.getElementById('chatWANum').value = '';
    document.getElementById('chatWAErr').innerText = '';
};
document.getElementById('btnChatBack1a').onclick = function () {
    chatStep1.classList.remove('hidden');
    chatStepEmail.classList.add('hidden');
};
document.getElementById('btnChatBack1b').onclick = function () {
    chatStep1.classList.remove('hidden');
    chatStepWhatsApp.classList.add('hidden');
};
document.getElementById('chatEmailSend').onclick = function () {
    const name = document.getElementById('chatEmailName').value.trim();
    const email = document.getElementById('chatEmailAddr').value.trim();
    const err = document.getElementById('chatEmailErr');
    err.innerText = '';
    if (!name) { err.innerText = 'Ingresa tu nombre completo.'; return; }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) { err.innerText = 'Ingresa un correo Gmail válido.'; return; }
    const asunto = encodeURIComponent("USUARIO DE MusicSky");
    const body = encodeURIComponent("BIENVENIDO AL ESPACIO DE CHAT CON EL DESARROLLADOR DE MusicSky!");
    window.open(`mailto:enzemajr@gmail.com?subject=${asunto}&body=${body}`, '_blank');
};
document.getElementById('chatWASend').onclick = function () {
    const name = document.getElementById('chatWAName').value.trim();
    const num = document.getElementById('chatWANum').value.trim();
    const err = document.getElementById('chatWAErr');
    err.innerText = '';
    if (!name) { err.innerText = 'Ingresa tu nombre completo.'; return; }
    if (!/^\+?\d{7,16}$/.test(num)) { err.innerText = 'Ingresa un número de WhatsApp válido.'; return; }
    const msg = encodeURIComponent("USUARIO DE MusicSky\nBIENVENIDO AL ESPACIO DE CHAT CON EL DESARROLLADOR DE MusicSky!");
    window.open(`https://wa.me/240222084663?text=${msg}`, '_blank');
};
