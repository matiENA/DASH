let callbackPostLogin = null;

function obtenerUsuarioSesion() {
    try {
        const data = localStorage.getItem('dash_user');
        return data ? JSON.parse(data) : null;
    } catch(e) { return null; }
}

function checkAuthUI() {
    const container = document.getElementById('auth-container');
    if (!container) return;
    
    const sesion = obtenerUsuarioSesion();
    if (sesion && sesion.usuario) {
        container.innerHTML = `
            <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
                <span class="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1">
                    <span>👤</span> ${sesion.usuario}
                </span>
                <button onclick="cerrarSesion()" class="text-[10px] font-extrabold text-slate-400 hover:text-rose-500 transition-colors uppercase ml-1" title="Cerrar Sesión">Salir</button>
            </div>`;
    } else {
        container.innerHTML = `
            <div class="relative">
                <button onclick="toggleDropdownLogin()" class="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-sm active:scale-95 flex items-center gap-1.5 cursor-pointer">
                    🔑 <span>Entrar</span>
                </button>

                <div id="dropdown-login" class="hidden absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50">
                    <form onsubmit="ejecutarLogin(event)" class="flex flex-col gap-3">
                        <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <span class="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1">🔑 Iniciar Sesión</span>
                            <span class="text-[9px] font-bold text-slate-400 dark:text-slate-500">DB_Usuarios</span>
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Usuario</label>
                            <input type="text" id="login-user" placeholder="Escriba su usuario..." class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none uppercase shadow-xs" required autocomplete="username">
                        </div>
                        <div>
                            <label class="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 block">Contraseña</label>
                            <input type="password" id="login-pass" placeholder="••••••••" class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs" required autocomplete="current-password">
                        </div>

                        <p id="login-error" class="text-[10px] font-bold text-rose-500 hidden text-center mt-0.5"></p>

                        <button type="submit" id="btn-login-submit" class="mt-1 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs uppercase tracking-widest p-2.5 rounded-xl shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all">
                            Ingresar
                        </button>
                    </form>
                </div>
            </div>`;
    }
}

function toggleDropdownLogin(forceOpen = false) {
    const drop = document.getElementById('dropdown-login');
    if (!drop) return;
    if (forceOpen) {
        drop.classList.remove('hidden');
    } else {
        drop.classList.toggle('hidden');
    }
    if (!drop.classList.contains('hidden')) {
        const uIn = document.getElementById('login-user');
        if (uIn) setTimeout(() => uIn.focus(), 50);
    }
}

function ejecutarLogin(e) {
    e.preventDefault();
    const userIn = document.getElementById('login-user').value.trim();
    const passIn = document.getElementById('login-pass').value.trim();
    const btn = document.getElementById('btn-login-submit');
    const errP = document.getElementById('login-error');
    
    errP.classList.add('hidden');
    btn.innerHTML = `<span class="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>`;

    fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: userIn, password: passIn })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success && data.usuario) {
            localStorage.setItem('dash_user', JSON.stringify({ usuario: data.usuario, rol: data.rol || 'USER' }));
            checkAuthUI();

            if (callbackPostLogin === 'abrirModalNueva') {
                abrirModalNueva();
            }
            callbackPostLogin = null;
        } else {
            errP.innerText = data.error || 'Usuario o contraseña incorrectos';
            errP.classList.remove('hidden');
        }
    })
    .catch(err => {
        errP.innerText = 'Error de conexión con el servidor';
        errP.classList.remove('hidden');
    })
    .finally(() => {
        if (btn) btn.innerHTML = 'INGRESAR';
    });
}

function cerrarSesion() {
    localStorage.removeItem('dash_user');
    checkAuthUI();
}

// Inicializar UI de auth
document.addEventListener('DOMContentLoaded', checkAuthUI);
