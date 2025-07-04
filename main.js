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

function validatePassword(pass, role) {
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
    if (!validatePassword(password, role)) {
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

document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    let email = document.getElementById('loginEmail').value.trim().toLowerCase();
    let password = document.getElementById('loginPassword').value;
    let errorDiv = document.getElementById('loginError');
    if (!email || !password) {
        errorDiv.innerText = 'Rellena todos los campos.';
        return;
    }
    getUser(email, function(user) {
        if (!user || user.password !== password) {
            errorDiv.innerText = 'Email o contraseña incorrectos.';
            return;
        }
        if (user.blocked) {
            errorDiv.innerText = 'Usuario bloqueado. Contacte con el admin.';
            return;
        }
        currentUser = user;
        document.getElementById('userNameSpan').innerText = user.fullName;
        document.getElementById('userRoleSpan').innerText = user.role;
        showPanel('main');
        showMainByRole();
        loadMusics();
        if (currentUser.role === "Administrador") loadUsers();
    });
});

document.getElementById('logoutBtn').addEventListener('click', function() {
    currentUser = null;
    showPanel('auth');
    clearLoginForm();
});

// ========== PANEL PRINCIPAL POR ROL ==========
function showMainByRole() {
    let isAdmin = currentUser && currentUser.role === 'Administrador';
    document.getElementById('tab-users-li').style.display = isAdmin ? 'inline-block' : 'none';
    document.getElementById('tab-upload').parentElement.style.display =
        (currentUser.role === 'Administrador' || currentUser.role === 'Usuario') ? 'inline-block' : 'none';
}

// ========== LISTADO DE MÚSICAS ==========
function loadMusics() {
    getAllMusics(function(musics) {
        musics.sort((a,b)=>new Date(b.date)-new Date(a.date));
        let html = '';
        if (!musics.length) html = '<p>No hay músicas subidas aún.</p>';
        else musics.forEach(music => {
            html += `<div class="music-item row align-items-center">
                <div class="col-md-4">
                    <b>${music.title}</b> <small class="text-muted">${music.details || ''}</small>
                    <div><small>Subido por: ${music.uploaderName} (${music.uploader})</small></div>
                    <div><small>Fecha: ${music.date}</small></div>
                </div>
                <div class="col-md-4">
                    <audio controls src="${music.url}"></audio>
                </div>
                <div class="col-md-4 text-end">
                    <a download="${music.title}.mp3" href="${music.url}" class="btn btn-sm btn-outline-primary me-1">Descargar</a>
                    ${(canEditMusic(music) ? `<button class="btn btn-sm btn-outline-secondary me-1" onclick="editMusic(${music.id})">Editar</button>`:"")}
                    ${(canDeleteMusic(music) ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteMusicUI(${music.id})">Eliminar</button>`:"")}
                </div>
            </div>`;
        });
        document.getElementById('musicList').innerHTML = html;
    });
}
function canEditMusic(music) {
    if (!currentUser) return false;
    return currentUser.role === 'Administrador' ||
        (currentUser.role === 'Usuario' && music.uploader === currentUser.email);
}
function canDeleteMusic(music) {
    if (!currentUser) return false;
    return currentUser.role === 'Administrador' ||
        (currentUser.role === 'Usuario' && music.uploader === currentUser.email);
}
window.editMusic = function(id) {
    getAllMusics(function(musics){
        let music = musics.find(m=>m.id===id);
        if (!music) return;
        let details = prompt('Editar detalles de la música:', music.details||'');
        if (details !== null) {
            music.details = details;
            putMusic(music, function(){
                loadMusics();
            });
        }
    });
};
window.deleteMusicUI = function(id) {
    if (!confirm('¿Seguro que deseas eliminar esta música?')) return;
    deleteMusic(id, function(){
        loadMusics();
    });
};

// ========== SUBIR MÚSICA ==========
document.getElementById('uploadForm').addEventListener('submit', function(e) {
    e.preventDefault();
    let fileInput = document.getElementById('musicFile');
    let title = document.getElementById('musicTitle').value.trim();
    let details = document.getElementById('musicDetails').value.trim();
    let errorDiv = document.getElementById('uploadError');
    let file = fileInput.files[0];
    if (!file || !/^audio\/mp3|audio\/mpeg|application\/octet-stream$/.test(file.type) && !file.name.endsWith('.mp3')) {
        errorDiv.innerText = 'Selecciona un archivo MP3 válido.';
        return;
    }
    if (!title) {
        errorDiv.innerText = 'Introduce un título para la música.';
        return;
    }
    getAllMusics(function(musics) {
        let totalSize = musics.reduce((ac, m) => ac + (m.url ? Math.round((m.url.length * 3) / 4) : 0), 0);
        if (totalSize + file.size > MAX_TOTAL_SIZE) {
            errorDiv.innerText = 'Espacio insuficiente en la aplicación. Elimina canciones antiguas o sube archivos más pequeños.';
            return;
        }
        let reader = new FileReader();
        reader.onload = function(ev) {
            let music = {
                title,
                details,
                uploader: currentUser.email,
                uploaderName: currentUser.fullName,
                date: new Date().toLocaleString(),
                url: ev.target.result // base64
            };
            putMusic(music, function(ok){
                if (ok) {
                    errorDiv.innerText = '';
                    fileInput.value = '';
                    document.getElementById('musicTitle').value = '';
                    document.getElementById('musicDetails').value = '';
                    loadMusics();
                } else {
                    errorDiv.innerText = 'Error al subir música.';
                }
            });
        };
        reader.readAsDataURL(file);
    });
});

// ========== GESTIÓN DE USUARIOS (ADMIN) ==========
function loadUsers() {
    getAllUsers(function(users) {
        let html = `<table class="table table-bordered table-sm">
            <thead><tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr></thead><tbody>`;
        users.forEach(user => {
            html += `<tr>
                <td>${user.fullName}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.blocked ? '<span class="text-danger">Bloqueado</span>' : 'Activo'}</td>
                <td>
                    <button class="btn btn-sm btn-${user.blocked ? 'success' : 'warning'} me-1" onclick="toggleBlock('${user.email}',${!user.blocked})">
                        ${user.blocked ? 'Desbloquear' : 'Bloquear'}
                    </button>
                    <button class="btn btn-sm btn-danger me-1" onclick="deleteUserUI('${user.email}')">Eliminar</button>
                    <button class="btn btn-sm btn-secondary" onclick="editUserUI('${user.email}')">Editar</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        document.getElementById('usersList').innerHTML = html;
    });
}
window.toggleBlock = function(email, block) {
    getUser(email, function(user){
        if (!user) return;
        user.blocked = block;
        putUser(user, function(){
            loadUsers();
        });
    });
};
window.deleteUserUI = function(email) {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    deleteUser(email, function(){
        loadUsers();
    });
};
window.editUserUI = function(email) {
    getUser(email, function(user){
        if (!user) return;
        let newName = prompt('Editar nombre completo:', user.fullName);
        if (newName && newName.trim()) {
            user.fullName = newName.trim();
            putUser(user, function(){
                loadUsers();
            });
        }
    });
};

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
    window.open(`https://wa.me/240222084663?text=${msg}`, '_blank');
};

// ========== INICIO ==========
window.onload = function() {
    openDB(function() {
        showPanel('auth');
    });
};
