// ========== INIT INDEXEDDB ==========
const DB_NAME = 'MusicSkyDB';
const DB_VERSION = 12; // Incrementado para actualizar la base de datos
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // Ampliado a 500 MB

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

// ========== USERS ==========
function getUser(email, cb) {
    if (!db) return cb(null);
    const tx = db.transaction('users', 'readonly').objectStore('users').get(email);
    tx.onsuccess = e => cb(e.target.result);
    tx.onerror = () => cb(null);
}

function putUser(user, cb) {
    if (!db) return cb(false);
    const tx = db.transaction('users', 'readwrite').objectStore('users').put(user);
    tx.onsuccess = () => cb(true);
    tx.onerror = () => cb(false);
}

function getAllUsers(cb) {
    if (!db) return cb([]);
    const users = [];
    const store = db.transaction('users', 'readonly').objectStore('users');
    store.openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            users.push(cursor.value);
            cursor.continue();
        } else cb(users);
    };
}

function deleteUser(email, cb) {
    if (!db) return cb(false);
    const tx = db.transaction('users', 'readwrite').objectStore('users').delete(email);
    tx.onsuccess = () => cb(true);
    tx.onerror = () => cb(false);
}

// ========== MUSICS ==========
function getAllMusics(cb) {
    if (!db) return cb([]);
    const musics = [];
    const store = db.transaction('musics', 'readonly').objectStore('musics');
    store.openCursor().onsuccess = function(e) {
        const cursor = e.target.result;
        if (cursor) {
            musics.push(cursor.value);
            cursor.continue();
        } else cb(musics);
    };
}

function putMusic(music, cb) {
    if (!db) return cb(false);
    const tx = db.transaction('musics', 'readwrite').objectStore('musics').put(music);
    tx.onsuccess = () => cb(true);
    tx.onerror = () => cb(false);
}

function deleteMusic(id, cb) {
    if (!db) return cb(false);
    const tx = db.transaction('musics', 'readwrite').objectStore('musics').delete(id);
    tx.onsuccess = () => cb(true);
    tx.onerror = () => cb(false);
}

// ========== VALIDACIÓN ==========
function validateEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
}

function validatePassword(pass) {
    if (pass.length !== 12) return false;
    const rest = pass.slice(6);
    const nums = (rest.match(/\d/g) || []).length;
    const syms = (rest.match(/[@#&]/g) || []).length;
    return nums === 4 && syms === 2 && /^[A-Z][a-z]{5}/.test(pass.slice(0,6));
}

// ========== AUTH Y REGISTRO ==========
let currentUser = null;

function showPanel(panel) {
    document.getElementById('auth-section').classList.toggle('hidden', panel !== 'auth');
    document.getElementById('main-panel').classList.toggle('hidden', panel !== 'main');
}

function clearRegisterForm() {
    document.getElementById('registerForm').reset();
    document.getElementById('regError').innerText = '';
    document.getElementById('guestReasonDiv').classList.add('hidden');
    document.getElementById('guestConfirmDiv').classList.add('hidden');
}

function clearLoginForm() {
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').innerText = '';
}

document.getElementById('regRole').addEventListener('change', function() {
    const v = this.value;
    document.getElementById('guestReasonDiv').classList.toggle('hidden', v !== 'Invitado');
    document.getElementById('guestConfirmDiv').classList.toggle('hidden', v !== 'Invitado');
});

document.getElementById('registerForm').addEventListener('submit', function(e) {
    e.preventDefault();
    let fullName = document.getElementById('regFullName').value.trim();
    let email = document.getElementById('regEmail').value.trim().toLowerCase();
    let password = document.getElementById('regPassword').value;
    let role = document.getElementById('regRole').value;
    let errorDiv = document.getElementById('regError');
    let guestReason = document.getElementById('guestReason').value.trim();
    let guestConfirm = document.getElementById('guestConfirmName').value.trim();

    if (!fullName || !email || !password || !role) {
        errorDiv.innerText = 'Todos los campos son obligatorios.';
        return;
    }
    if (!validateEmail(email)) {
        errorDiv.innerText = 'El correo debe ser Gmail válido.';
        return;
    }
    if (!validatePassword(password)) {
        errorDiv.innerText = 'La contraseña no cumple los requisitos.';
        return;
    }
    if (role === 'Invitado') {
        if (!guestReason) {
            errorDiv.innerText = 'Debes especificar la razón de acceso.';
            return;
        }
        if (!guestConfirm) {
            errorDiv.innerText = 'Debes reingresar tu nombre completo.';
            return;
        }
        if (fullName !== guestConfirm) {
            let now = new Date();
            let asunto = encodeURIComponent('Intento de acceso denegado (Invitado)');
            let cuerpo = `Nombre registro: ${fullName}%0ANombre reingresado: ${guestConfirm}%0ARazón: ${guestReason}%0AEmail: ${email}%0AFecha y hora: ${now.toLocaleString()}`;
            let mailto = `mailto:enzemajr@gmail.com?subject=${asunto}&body=${cuerpo}`;
            window.open(mailto, '_blank');
            errorDiv.innerText = 'Nombre no coincide. Acceso denegado. Intenta de nuevo.';
            setTimeout(clearRegisterForm, 2200);
            return;
        }
    }

    getUser(email, function(user) {
        if (user) {
            errorDiv.innerText = 'Ya existe una cuenta con este correo.';
            return;
        }
        let userObj = {
            fullName, email, password, role,
            blocked: false,
            date: new Date().toLocaleString(),
            guestReason: role === 'Invitado' ? guestReason : null
        };
        putUser(userObj, function(success) {
            if (success) {
                let asunto = encodeURIComponent('Nuevo registro en MusicSky');
                let cuerpo = `Nombre: ${fullName}%0AEmail: ${email}%0ARol: ${role}%0ARazón: ${userObj.guestReason || 'N/A'}%0AFecha registro: ${userObj.date}`;
                let mailto = `mailto:enzemajr@gmail.com?subject=${asunto}&body=${cuerpo}`;
                window.open(mailto, '_blank');
                clearRegisterForm();
                let tab = new bootstrap.Tab(document.querySelector('#login-tab'));
                tab.show();
                document.getElementById('loginEmail').value = email;
                document.getElementById('loginPassword').value = password;
                errorDiv.innerText = '';
                alert('¡Registro exitoso! Se ha abierto tu aplicación de correo para notificar al desarrollador.');
            } else {
                errorDiv.innerText = 'Error al registrar. Intenta de nuevo.';
            }
        });
    });
});

// ========== PANEL DESARROLLADOR ==========
const devPanel = document.getElementById('devPanel');
const devStep1 = document.getElementById('devStep1');
const devStepEmail = document.getElementById('devStepEmail');
const devStepWhatsApp = document.getElementById('devStepWhatsApp');

document.getElementById('devBtn').onclick = function () {
    devPanel.classList.remove('hidden');
    devStep1.classList.remove('hidden');
    devStepEmail.classList.add('hidden');
    devStepWhatsApp.classList.add('hidden');
};
document.getElementById('btnDevClose').onclick = function () {
    devPanel.classList.add('hidden');
};
document.getElementById('btnDevEmail').onclick = function () {
    devStep1.classList.add('hidden');
    devStepEmail.classList.remove('hidden');
    devStepWhatsApp.classList.add('hidden');
    document.getElementById('devEmailName').value = '';
    document.getElementById('devEmailAddr').value = '';
    document.getElementById('devEmailErr').innerText = '';
};
document.getElementById('btnDevWhatsApp').onclick = function () {
    devStep1.classList.add('hidden');
    devStepWhatsApp.classList.remove('hidden');
    devStepEmail.classList.add('hidden');
    document.getElementById('devWAName').value = '';
    document.getElementById('devWANum').value = '';
    document.getElementById('devWAErr').innerText = '';
};
document.getElementById('btnDevBack1a').onclick = function () {
    devStep1.classList.remove('hidden');
    devStepEmail.classList.add('hidden');
};
document.getElementById('btnDevBack1b').onclick = function () {
    devStep1.classList.remove('hidden');
    devStepWhatsApp.classList.add('hidden');
};
document.getElementById('devEmailSend').onclick = function () {
    const name = document.getElementById('devEmailName').value.trim();
    const email = document.getElementById('devEmailAddr').value.trim();
    const err = document.getElementById('devEmailErr');
    err.innerText = '';
    if (!name) { err.innerText = 'Ingresa tu nombre completo.'; return; }
    if (!validateEmail(email)) { err.innerText = 'Ingresa un correo Gmail válido.'; return; }
    const asunto = encodeURIComponent("Solicitud de instrucciones para crear cuenta MusicSky");
    const body = encodeURIComponent("Hola Sr. Desarrollador de MusicSky, el usuario " + name + ", con el email " + email + ", solicita instrucciones para crear una cuenta de acceso a MusicSky. Gracias!");
    window.open(`mailto:enzemajr@gmail.com?subject=${asunto}&body=${body}`, '_blank');
};
document.getElementById('devWASend').onclick = function () {
    const name = document.getElementById('devWAName').value.trim();
    const num = document.getElementById('devWANum').value.trim();
    const err = document.getElementById('devWAErr');
    err.innerText = '';
    if (!name) { err.innerText = 'Ingresa tu nombre completo.'; return; }
    if (!/^\+?\d{7,16}$/.test(num)) { err.innerText = 'Ingresa un número de WhatsApp válido.'; return; }
    const msg = encodeURIComponent("Hola Sr. Desarrollador de MusicSky, el usuario " + name + ", con el número " + num + ", solicita instrucciones para crear una cuenta de acceso a MusicSky. Gracias!");
    window.open(`https://wa.me/240222084663?text=${msg}`, '_blank'); // Fixed WhatsApp URL for developer contact
};

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
    if (!validateEmail(email)) { err.innerText = 'Ingresa un correo Gmail válido.'; return; }
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
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank'); // Fixed WhatsApp URL for user contact
};

// ========== INICIO ==========
window.onload = function() {
    openDB(function() {
        showPanel('auth');
    });
};
