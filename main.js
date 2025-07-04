// ========== IndexedDB SETUP ==========
let db;
const DB_NAME = 'MusicSkyDB', DB_VERSION = 2;
const MAX_MUSICS = 1500;
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 45MB

function openDB(callback) {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = function(e) {
        db = e.target.result;
        if (!db.objectStoreNames.contains('users')) {
            const userStore = db.createObjectStore('users', { keyPath: 'email' });
            userStore.createIndex('role', 'role', { unique: false });
            userStore.createIndex('blocked', 'blocked', { unique: false });
        }
        if (!db.objectStoreNames.contains('musics')) {
            const musicStore = db.createObjectStore('musics', { keyPath: 'id', autoIncrement: true });
            musicStore.createIndex('uploader', 'uploader', { unique: false });
        }
    };
    request.onsuccess = function(e) {
        db = e.target.result;
        if (callback) callback();
    };
    request.onerror = function(e) {
        alert('Error al abrir la base de datos.');
    };
}

function getUser(email, cb) {
    const tx = db.transaction('users', 'readonly').objectStore('users').get(email);
    tx.onsuccess = e => cb(e.target.result);
    tx.onerror = () => cb(null);
}

function putUser(user, cb) {
    const tx = db.transaction('users', 'readwrite').objectStore('users').put(user);
    tx.onsuccess = () => cb(true);
    tx.onerror = () => cb(false);
}

function getAllUsers(cb) {
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
    const tx = db.transaction('users', 'readwrite').objectStore('users').delete(email);
    tx.onsuccess = () => cb(true);
    tx.onerror = () => cb(false);
}

function getAllMusics(cb) {
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
    const tx = db.transaction('musics', 'readwrite').objectStore('musics').put(music);
    tx.onsuccess = () => cb(true);
    tx.onerror = () => cb(false);
}

function deleteMusic(id, cb) {
    const tx = db.transaction('musics', 'readwrite').objectStore('musics').delete(id);
    tx.onsuccess = () => cb(true);
    tx.onerror = () => cb(false);
}

// ========== SESIÓN ==========
let currentUser = null;

// ========== VALIDACIÓN ==========
function validateEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
}
function validatePassword(pass) {
    if (pass.length !== 12) return false;
    const nums = (pass.match(/\d/g) || []).length;
    const syms = (pass.match(/[@#&]/g) || []).length;
    return /[A-Z]/.test(pass) && /[a-z]/.test(pass) && nums >= 4 && syms >= 2;
}

// ========== AUTENTICACIÓN ==========
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

// ========== REGISTRO ==========
document.getElementById('regRole').addEventListener('change', function() {
    let v = this.value;
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
            let cuerpo = `Nombre ingresado para confirmar no coincide.%0ANombre registro: ${fullName}%0ANombre reingresado: ${guestConfirm}%0ARazón: ${guestReason}%0AEmail: ${email}%0AFecha y hora: ${now.toLocaleString()}`;
            let mailto = `mailto:enzemajr@gmail.com?subject=${asunto}&body=${cuerpo}`;
            window.open(mailto, '_blank');
            errorDiv.innerText = 'Nombre no coincide. Acceso denegado. Intenta de nuevo.';
            setTimeout(clearRegisterForm, 2500);
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
                alert('¡Registro exitoso! Se ha abierto tu aplicación de correo para notificar al administrador.');
            } else {
                errorDiv.innerText = 'Error al registrar. Intenta de nuevo.';
            }
        });
    });
});

// ========== LOGIN ==========
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
            errorDiv.innerText = 'Usuario bloqueado. Contacte con el administrador.';
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

// ========== LOGOUT ==========
document.getElementById('logoutBtn').addEventListener('click', function() {
    currentUser = null;
    showPanel('auth');
    clearLoginForm();
});

// ========== PANELES POR ROL ==========
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
                    <b>${music.title}</b> <small class="text-muted">(${music.details || 'Sin detalles'})</small>
                    <div><small>Subido por: ${music.uploaderName} (${music.uploader})</small></div>
                    <div><small>Fecha: ${music.date}</small></div>
                </div>
                <div class="col-md-4">
                    <audio controls src="${music.url}"></audio>
                </div>
                <div class="col-md-4 text-end">
                    <a download="${music.title}.mp3" href="${music.url}" class="btn btn-sm btn-outline-primary me-1">Descargar</a>
                    ${canEditMusic(music) ? `
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick="editMusic(${music.id})">Editar</button>
                    ` : ''}
                    ${canDeleteMusic(music) ? `
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteMusicUI(${music.id})">Eliminar</button>
                    ` : ''}
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
        if (musics.length >= MAX_MUSICS) {
            errorDiv.innerText = 'Límite de 1000 canciones alcanzado. Elimina alguna para subir nuevas.';
            return;
        }
        let totalSize = musics.reduce((ac, m) => ac + (m.url ? Math.round((m.url.length * 3) / 4) : 0), 0);
        if (totalSize + file.size > MAX_TOTAL_SIZE) {
            errorDiv.innerText = 'Espacio insuficiente en la aplicación. Elimina canciones antiguas o sube archivos de menor tamaño.';
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
                url: ev.target.result 
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

    helpStepWhatsApp.classList.remove('hidden');
    helpStepEmail.classList.add('hidden');
    document.getElementById('helpWAName').value = '';
    document.getElementById('helpWANum').value = '';
    document.getElementById('helpWAErr').innerText = '';
};
document.getElementById('btnBackHelp1a').onclick = function() {
    helpStep1.classList.remove('hidden');
    helpStepEmail.classList.add('hidden');
};
document.getElementById('btnBackHelp1b').onclick = function() {
    helpStep1.classList.remove('hidden');
    helpStepWhatsApp.classList.add('hidden');
};
// ========== PANEL ¿CÓMO ACCEDER? - LÓGICA EN EL BOTÓN CONSULTA ==========
const helpPanel = document.getElementById('helpPanel');
const helpStep1 = document.getElementById('helpStep1');
const helpStepEmail = document.getElementById('helpStepEmail');
const helpStepWhatsApp = document.getElementById('helpStepWhatsApp');
const btnConsulta = document.getElementById('consultaBtn');
const btnReturnToRegister = document.getElementById('btnReturnToRegister');

btnConsulta.onclick = function () {
    helpPanel.classList.remove('hidden');
    helpStep1.classList.remove('hidden');
    helpStepEmail.classList.add('hidden');
    helpStepWhatsApp.classList.add('hidden');
};
document.getElementById('btnCloseHelp').onclick = function() {
    helpPanel.classList.add('hidden');
};
if (btnReturnToRegister) {
    btnReturnToRegister.onclick = function() {
        helpPanel.classList.add('hidden');
        setTimeout(() => {
            let regInput = document.getElementById('regFullName');
            if (regInput) regInput.focus();
        }, 200);
    };
}
document.getElementById('btnHelpEmail').onclick = function() {
    helpStep1.classList.add('hidden');
    helpStepEmail.classList.remove('hidden');
    helpStepWhatsApp.classList.add('hidden');
    document.getElementById('helpEmailName').value = '';
    document.getElementById('helpEmailAddr').value = '';
    document.getElementById('helpEmailErr').innerText = '';
};
document.getElementById('btnHelpWhatsApp').onclick = function() {
    helpStep1.classList.add('hidden');
    helpStepWhatsApp.classList.remove('hidden');
    helpStepEmail.classList.add('hidden');
    document.getElementById('helpWAName').value = '';
    document.getElementById('helpWANum').value = '';
    document.getElementById('helpWAErr').innerText = '';
};
document.getElementById('btnBackHelp1a').onclick = function() {
    helpStep1.classList.remove('hidden');
    helpStepEmail.classList.add('hidden');
};
document.getElementById('btnBackHelp1b').onclick = function() {
    helpStep1.classList.remove('hidden');
    helpStepWhatsApp.classList.add('hidden');
};
document.getElementById('helpEmailSend').onclick = function() {
    const name = document.getElementById('helpEmailName').value.trim();
    const email = document.getElementById('helpEmailAddr').value.trim();
    const err = document.getElementById('helpEmailErr');
    err.innerText = '';
    if (!name) { err.innerText = 'Ingresa tu nombre completo.'; return; }
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) { err.innerText = 'Ingresa un correo Gmail válido.'; return; }
    const asunto = encodeURIComponent("Solicitud de instrucciones para crear cuenta MusicSky");
    const body = encodeURIComponent(
        "Hola Sr. Desarrollador de MusicSky, el usuario " + name +
        ", con el email " + email +
        ", solicita instrucciones para crear una cuenta de acceso a MusicSky. Gracias!"
    );
    window.open(`mailto:enzemajr@gmail.com?subject=${asunto}&body=${body}`, '_blank');
    // Oculta automáticamente el panel tras enviar
    helpPanel.classList.add('hidden');
    setTimeout(() => {
        let regInput = document.getElementById('regFullName');
        if (regInput) regInput.focus();
    }, 200);
};
document.getElementById('helpWASend').onclick = function() {
    const name = document.getElementById('helpWAName').value.trim();
    const num = document.getElementById('helpWANum').value.trim();
    const err = document.getElementById('helpWAErr');
    err.innerText = '';
    if (!name) { err.innerText = 'Ingresa tu nombre completo.'; return; }
    if (!/^\+?\d{7,16}$/.test(num)) { err.innerText = 'Ingresa un número de WhatsApp válido (ej: +240... o 240...).'; return; }
    const msg = encodeURIComponent(
        "Hola Sr. Desarrollador de MusicSky, el usuario " + name +
        ", con el número " + num +
        ", solicita instrucciones para crear una cuenta de acceso a MusicSky. Gracias!"
    );
    window.open(`https://wa.me/240222084663?text=${msg}`, '_blank');
    // Oculta automáticamente el panel tras enviar
    helpPanel.classList.add('hidden');
    setTimeout(() => {
        let regInput = document.getElementById('regFullName');
        if (regInput) regInput.focus();
    }, 200);
};

// ========== INICIO ==========
window.onload = function() {
    openDB(function() {
        showPanel('auth');
    });
};
                
