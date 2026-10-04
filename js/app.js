// js/app.js
const state = {
    alarms: [], routines: [], playlists: [],
    is24h: localStorage.getItem('studyfocus_is24h') !== 'false',
    daysMap: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    lastRungMinute: null,
    currentView: 'home',
    currentDate: new Date(),
    selectedDate: new Date()
};

// --- Referencias DOM ---
const ui = {
    jumboClock: document.getElementById('jumbo-clock'), jumboDate: document.getElementById('jumbo-date'),
    btnFormat: document.getElementById('btn-format'), btnTheme: document.getElementById('btn-theme'),
    grid: document.getElementById('alarms-grid'), gridAddCard: document.getElementById('grid-add-card'),
    modalForm: document.getElementById('modal-form'), modalContent: document.getElementById('modal-form-content'), btnCloseModal: document.getElementById('btn-close-modal'), genericForm: document.getElementById('generic-form'),
    modalRinging: document.getElementById('modal-ringing'), ringTime: document.getElementById('ring-time'), ringLabel: document.getElementById('ring-label'), btnSnooze: document.getElementById('btn-snooze'), btnStop: document.getElementById('btn-stop'),
    toast: document.getElementById('toast'), navHomeDesktop: document.getElementById('nav-home-desktop'), navCalDesktop: document.getElementById('nav-calendar-desktop'), navPomDesktop: document.getElementById('nav-pomodoro-desktop'), navYtDesktop: document.getElementById('nav-youtube-desktop'),
    navHomeMobile: document.getElementById('nav-home-mobile'), navCalMobile: document.getElementById('nav-calendar-mobile'), navPomMobile: document.getElementById('nav-pomodoro-mobile'), navYtMobile: document.getElementById('nav-youtube-mobile'),
    btnFabMobile: document.getElementById('btn-fab-mobile'), viewHome: document.getElementById('view-home'), viewCalendar: document.getElementById('view-calendar'), viewPomodoro: document.getElementById('view-pomodoro'), viewYoutube: document.getElementById('view-youtube'),
    calMonthYear: document.getElementById('cal-month-year'), calGridDays: document.getElementById('calendar-grid-days'), btnCalPrev: document.getElementById('cal-prev'), btnCalNext: document.getElementById('cal-next'), selectedDateLabel: document.getElementById('selected-date-label'), dayRoutinesList: document.getElementById('day-routines-list'), btnAddRoutine: document.getElementById('btn-add-routine'),
    btnPomWork: document.getElementById('pom-work'), btnPomBreak: document.getElementById('pom-break'), pomTimer: document.getElementById('pom-timer'), btnPomToggle: document.getElementById('pom-toggle'), btnPomReset: document.getElementById('pom-reset'),
    btnInstall: document.getElementById('btn-install'), btnPip: document.getElementById('btn-pip'), installContainer: document.getElementById('install-container'),
    
    // YouTube Media
    ytMediaUrl: document.getElementById('yt-media-url'), btnLoadYt: document.getElementById('btn-load-yt'), ytPlayerContainer: document.getElementById('yt-player-container'), ytIframe: document.getElementById('yt-iframe'), btnCloseYt: document.getElementById('btn-close-yt'),
    pomYtUrl: document.getElementById('pom-yt-url'), alarmAudioFrame: document.getElementById('alarm-audio-frame'),
    moodBtns: document.querySelectorAll('.mood-btn'), currentYtDisplayContainer: document.getElementById('current-yt-display-container'), currentYtUrlDisplay: document.getElementById('current-yt-url-display'), btnSavePlaylist: document.getElementById('btn-save-playlist'), savedPlaylistsContainer: document.getElementById('saved-playlists-container'),
    
    modalPlaylist: document.getElementById('modal-playlist'), modalPlaylistContent: document.getElementById('modal-playlist-content'), btnClosePlaylistModal: document.getElementById('btn-close-playlist-modal'), playlistForm: document.getElementById('playlist-form'), playlistNameInput: document.getElementById('playlist-name-input'),
    
    // Controles Mini Reproductor
    btnMinimizeYt: document.getElementById('btn-minimize-yt'), btnExpandYt: document.getElementById('btn-expand-yt')
};

// --- Utilidades ---
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);
const padZero = (num) => num.toString().padStart(2, '0');
const formatDateString = (date) => `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;

const showToast = (msg) => {
    ui.toast.textContent = msg;
    ui.toast.classList.remove('opacity-0', 'translate-y-[-20px]');
    ui.toast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
        ui.toast.classList.remove('opacity-100', 'translate-y-0');
        ui.toast.classList.add('opacity-0', 'translate-y-[-20px]');
    }, 3500);
};

const getEmbedUrl = (url) => {
    const playlistMatch = url.match(/[?&]list=([^&#]+)/);
    if (playlistMatch) return `https://www.youtube.com/embed/videoseries?list=${playlistMatch[1]}&autoplay=1&enablejsapi=1`;
    const videoMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|music\?v=|.*[&?]v=))([^&]{11})/);
    if (videoMatch) return `https://www.youtube.com/embed/${videoMatch[1]}?autoplay=1&enablejsapi=1`;
    return null;
};

// --- Inicialización y Datos ---
const loadData = async () => {
    try {
        await window.AppDB.initDB();
        state.alarms = await window.AppDB.getAllAlarms();
        state.routines = await window.AppDB.getAllRoutines();
        state.playlists = await window.AppDB.getAllPlaylists() || [];
        ui.pomYtUrl.value = localStorage.getItem('studyfocus_pom_yt') || '';
        renderAlarms(); renderCalendar(); renderPlaylists(); updateSelectedDayView();
    } catch (error) {
        console.error("Error BD:", error);
    }
};

// --- Tema Claro / Oscuro ---
let isLightMode = localStorage.getItem('studyfocus_theme') === 'light';
const applyTheme = () => {
    if(isLightMode) { document.documentElement.classList.add('light-theme'); ui.btnTheme.textContent = '☀'; } 
    else { document.documentElement.classList.remove('light-theme'); ui.btnTheme.textContent = '🌙'; }
};
applyTheme();
ui.btnTheme.addEventListener('click', () => {
    isLightMode = !isLightMode;
    localStorage.setItem('studyfocus_theme', isLightMode ? 'light' : 'dark');
    applyTheme();
});

// --- Instalación PWA Rigurosa ---
let deferredPrompt;
const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredPrompt = e;
});

ui.btnInstall.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            ui.installContainer.classList.add('hidden'); ui.installContainer.classList.remove('flex');
        }
        deferredPrompt = null;
    } else if (isIos()) {
        showToast("En iOS: Selecciona 'Compartir' ⬆️ y 'Agregar a inicio' ➕");
    } else {
        showToast("La App ya está instalada o tu navegador no soporta instalaciones automáticas.");
    }
});

const checkStandaloneMode = () => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
        ui.installContainer.classList.add('hidden'); ui.installContainer.classList.remove('flex');
        ui.btnPip.classList.remove('hidden'); ui.btnPip.classList.add('flex');
    } else {
        ui.installContainer.classList.remove('hidden'); ui.installContainer.classList.add('flex');
        ui.btnPip.classList.add('hidden'); ui.btnPip.classList.remove('flex');
    }
};
checkStandaloneMode(); window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandaloneMode);

// --- Modo PiP General ---
let isCompactWindow = false;
ui.btnPip.addEventListener('click', () => {
    if (!isCompactWindow) { window.resizeTo(350, 500); isCompactWindow = true; } 
    else { window.resizeTo(screen.availWidth, screen.availHeight); isCompactWindow = false; }
});

// --- Integración YouTube (Reproductor y Mini-Player Estático) ---
let isYtPlaying = false;

const ytCmd = (cmd) => {
    if(ui.ytIframe && ui.ytIframe.contentWindow) {
        ui.ytIframe.contentWindow.postMessage(JSON.stringify({event: "command", func: cmd, args: ""}), "*");
    }
};

const updateMiniPlayerStatus = () => {
    if(isYtPlaying) {
        if(state.currentView !== 'youtube') ui.ytPlayerContainer.classList.add('mini-player');
        else { ui.ytPlayerContainer.classList.remove('mini-player'); ui.ytPlayerContainer.classList.remove('is-minimized'); }
    }
};

const playMedia = (url) => {
    const embedUrl = getEmbedUrl(url);
    if(embedUrl) {
        ui.ytIframe.src = embedUrl;
        ui.ytPlayerContainer.classList.remove('hidden');
        isYtPlaying = true;
        ui.currentYtUrlDisplay.textContent = url;
        ui.currentYtDisplayContainer.classList.remove('hidden'); ui.currentYtDisplayContainer.classList.add('flex');
        showToast("Reproduciendo Medios");
    } else showToast("URL de YouTube Music inválida");
};

ui.btnLoadYt.addEventListener('click', () => playMedia(ui.ytMediaUrl.value));

ui.btnCloseYt.addEventListener('click', () => {
    ui.ytIframe.src = ""; ui.ytPlayerContainer.classList.add('hidden');
    ui.ytPlayerContainer.classList.remove('mini-player', 'is-minimized');
    isYtPlaying = false; ui.currentYtDisplayContainer.classList.add('hidden');
});

ui.btnMinimizeYt.addEventListener('click', () => ui.ytPlayerContainer.classList.add('is-minimized'));
ui.btnExpandYt.addEventListener('click', () => ui.ytPlayerContainer.classList.remove('is-minimized'));

// --- Filtros de Ánimo (YouTube Music) ---
const moodPlaylists = {
    relax: ['PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj', 'PLofht4dAwjwM4tS8G-G2T_s4h7iYd1A1u', 'PLzYd4T86KGE_R63Giyf5hUq8pU9QO_G-E'],
    focus: ['PLofht4dAwjwP6xY42L_iC4Z-2-XF50lUq', 'PL_QHeE13V1zyVqS6_yW2aOQkXJvX1j17u', 'PLa_r-rN79Y25a8P_P7Y8Vl0qPZq_h6r8P'],
    feelgood: ['PLDIoUOhQQPlXreCg1i58X5K9R3B_fAotR', 'PL_QHeE13V1zzZ58Fp84t42Oqk_Oq8i-M1', 'PLhSz9E2Z1PZ832a8Vd6U92p1yWp-R1d1B']
};

ui.moodBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        ui.moodBtns.forEach(b => { b.classList.remove('bg-ac', 'text-white'); b.classList.add('bg-sec', 'text-soft'); });
        btn.classList.remove('bg-sec', 'text-soft'); btn.classList.add('bg-ac', 'text-white');
        const list = moodPlaylists[btn.dataset.mood];
        const randomId = list[Math.floor(Math.random() * list.length)];
        const url = `https://music.youtube.com/playlist?list=${randomId}`;
        ui.ytMediaUrl.value = url; playMedia(url);
    });
});

// --- Modales y Formularios Genéricos ---
const openPlaylistModal = () => { ui.playlistNameInput.value = ''; ui.modalPlaylist.classList.remove('opacity-0', 'pointer-events-none'); ui.modalPlaylistContent.classList.remove('translate-y-full', 'md:translate-y-8'); };
const closePlaylistModal = () => { ui.modalPlaylistContent.classList.add('translate-y-full', 'md:translate-y-8'); setTimeout(() => ui.modalPlaylist.classList.add('opacity-0', 'pointer-events-none'), 300); };
ui.btnSavePlaylist.addEventListener('click', () => { if(ui.ytMediaUrl.value.trim() === '') { showToast("Ingresa un enlace primero"); return; } openPlaylistModal(); });
ui.btnClosePlaylistModal.addEventListener('click', closePlaylistModal); ui.modalPlaylist.addEventListener('click', (e) => { if(e.target === ui.modalPlaylist) closePlaylistModal(); });

ui.playlistForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = ui.playlistNameInput.value.trim();
    if (name !== "") {
        const newPlaylist = { id: generateId(), name: name, url: ui.ytMediaUrl.value };
        state.playlists.push(newPlaylist); await window.AppDB.savePlaylist(newPlaylist);
        renderPlaylists(); showToast("Playlist guardada"); closePlaylistModal();
    }
});

const renderPlaylists = () => {
    ui.savedPlaylistsContainer.innerHTML = state.playlists.length === 0 ? '<p class="text-sm text-soft italic w-full">No hay playlists guardadas aún.</p>' : '';
    state.playlists.forEach(p => {
        const el = document.createElement('div'); el.className = 'flex items-center gap-2 bg-sec/80 border border-sec px-4 py-2 rounded-xl group cursor-pointer hover:bg-ac transition-colors shadow-sm';
        el.innerHTML = `<span class="text-white font-semibold text-sm truncate max-w-[150px] md:max-w-[200px]" onclick="playSaved('${p.url}')">${p.name}</span><button class="text-red-400 hover:text-red-200 ml-1 p-1 opacity-60 hover:opacity-100 transition-opacity" onclick="deletePlaylist('${p.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>`;
        ui.savedPlaylistsContainer.appendChild(el);
    });
};

window.playSaved = (url) => { ui.ytMediaUrl.value = url; ui.moodBtns.forEach(b => { b.classList.remove('bg-ac', 'text-white'); b.classList.add('bg-sec', 'text-soft'); }); playMedia(url); };
window.deletePlaylist = async (id) => { state.playlists = state.playlists.filter(p => p.id !== id); await window.AppDB.deletePlaylist(id); renderPlaylists(); showToast("Eliminada"); };

const switchView = (targetView) => {
    state.currentView = targetView;
    const viewsMap = [
        { id: 'home', view: ui.viewHome, navD: ui.navHomeDesktop, navM: ui.navHomeMobile },
        { id: 'pomodoro', view: ui.viewPomodoro, navD: ui.navPomDesktop, navM: ui.navPomMobile },
        { id: 'calendar', view: ui.viewCalendar, navD: ui.navCalDesktop, navM: ui.navCalMobile },
        { id: 'youtube', view: ui.viewYoutube, navD: ui.navYtDesktop, navM: ui.navYtMobile }
    ];
    viewsMap.forEach(v => {
        if (v.id === targetView) { v.view.classList.remove('hidden'); setTimeout(() => v.view.classList.remove('opacity-0'), 50); v.navD.classList.replace('text-soft', 'text-white'); v.navD.classList.add('bg-ac'); v.navM.classList.replace('text-soft', 'text-ac'); } 
        else { v.view.classList.add('hidden', 'opacity-0'); v.navD.classList.replace('text-white', 'text-soft'); v.navD.classList.remove('bg-ac'); v.navM.classList.replace('text-ac', 'text-soft'); }
    });
    updateMiniPlayerStatus();
};

[ui.navHomeDesktop, ui.navHomeMobile].forEach(btn => btn.addEventListener('click', () => switchView('home')));
[ui.navCalDesktop, ui.navCalMobile].forEach(btn => btn.addEventListener('click', () => switchView('calendar')));
[ui.navPomDesktop, ui.navPomMobile].forEach(btn => btn.addEventListener('click', () => switchView('pomodoro')));
[ui.navYtDesktop, ui.navYtMobile].forEach(btn => btn.addEventListener('click', () => switchView('youtube')));

const updateClock = () => {
    const now = new Date(); let hours = now.getHours(); const minutes = padZero(now.getMinutes());
    if (!state.is24h) { const ampm = hours >= 12 ? ' PM' : ' AM'; hours = hours % 12 || 12; ui.jumboClock.innerHTML = `${hours}:${minutes}<span class="text-3xl text-soft ml-2">${ampm}</span>`; } 
    else ui.jumboClock.textContent = `${padZero(hours)}:${minutes}`;
    ui.jumboDate.textContent = now.toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' });
    checkAlarmsAndRoutines(now);
};
ui.btnFormat.addEventListener('click', () => { state.is24h = !state.is24h; localStorage.setItem('studyfocus_is24h', state.is24h); ui.btnFormat.textContent = state.is24h ? '24h' : '12h'; updateClock(); renderAlarms(); });
ui.btnFormat.textContent = state.is24h ? '24h' : '12h';

const checkAlarmsAndRoutines = (now) => {
    const currentMinStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
    const currentDay = now.getDay(); const currentDateStr = formatDateString(now);
    if (state.lastRungMinute === currentMinStr) return;
    let alarmRung = false;
    state.alarms.forEach(alarm => { if (alarm.active && alarm.time === currentMinStr && (alarm.days.length === 0 || alarm.days.includes(currentDay))) { triggerRingingModal(alarm); alarmRung = true; if(alarm.days.length === 0) { alarm.active = false; window.AppDB.saveAlarm(alarm); } } });
    state.routines.forEach(routine => { if (!routine.completed && routine.date === currentDateStr && routine.time === currentMinStr) { triggerRingingModal({ ...routine, label: `Rutina: ${routine.label}` }); alarmRung = true; } });
    if (alarmRung) { state.lastRungMinute = currentMinStr; renderAlarms(); }
};

let pomInterval = null, pomTimeLeft = 25 * 60, isPomRunning = false, pomMode = 'work'; 
ui.pomYtUrl.addEventListener('change', (e) => localStorage.setItem('studyfocus_pom_yt', e.target.value));

const updatePomodoroDisplay = () => { ui.pomTimer.textContent = `${padZero(Math.floor(pomTimeLeft / 60))}:${padZero(pomTimeLeft % 60)}`; };
const setPomodoroMode = (mode) => {
    clearInterval(pomInterval); isPomRunning = false; ui.btnPomToggle.textContent = 'INICIAR'; pomMode = mode;
    if (mode === 'work') { pomTimeLeft = 25 * 60; ui.btnPomWork.classList.add('bg-ac', 'text-white'); ui.btnPomWork.classList.remove('text-soft'); ui.btnPomBreak.classList.remove('bg-ac', 'text-white'); ui.btnPomBreak.classList.add('text-soft'); } 
    else { pomTimeLeft = 5 * 60; ui.btnPomBreak.classList.add('bg-ac', 'text-white'); ui.btnPomBreak.classList.remove('text-soft'); ui.btnPomWork.classList.remove('bg-ac', 'text-white'); ui.btnPomWork.classList.add('text-soft'); }
    updatePomodoroDisplay();
};
ui.btnPomWork.addEventListener('click', () => setPomodoroMode('work'));
ui.btnPomBreak.addEventListener('click', () => setPomodoroMode('break'));
ui.btnPomReset.addEventListener('click', () => { setPomodoroMode(pomMode); showToast("Reiniciado"); });

ui.btnPomToggle.addEventListener('click', () => {
    if (isPomRunning) { clearInterval(pomInterval); isPomRunning = false; ui.btnPomToggle.textContent = 'REANUDAR'; } 
    else {
        isPomRunning = true; ui.btnPomToggle.textContent = 'PAUSAR';
        pomInterval = setInterval(() => {
            pomTimeLeft--; updatePomodoroDisplay();
            if (pomTimeLeft <= 0) {
                clearInterval(pomInterval); isPomRunning = false; ui.btnPomToggle.textContent = 'INICIAR';
                triggerRingingModal({ time: '00:00', label: pomMode === 'work' ? '¡Descanso!' : '¡A Trabajar!', youtubeUrl: ui.pomYtUrl.value });
                setPomodoroMode(pomMode === 'work' ? 'break' : 'work');
            }
        }, 1000);
    }
});

const openModal = (type = 'alarm', data = null) => {
    ui.genericForm.reset(); document.getElementById('item-type').value = type; document.getElementById('days-container').classList.toggle('hidden', type !== 'alarm');
    if (type === 'alarm') generateDaysSelectors(); else document.getElementById('routine-date').value = formatDateString(state.selectedDate);
    document.getElementById('modal-title').textContent = data ? 'Editar' : (type === 'alarm' ? 'Nueva Alarma' : 'Nueva Actividad');
    if (data) {
        document.getElementById('item-id').value = data.id; document.getElementById('item-time').value = data.time; document.getElementById('item-label').value = data.label; document.getElementById('item-yt-url').value = data.youtubeUrl || '';
        if(type === 'alarm' && data.days) document.querySelectorAll('.day-selector').forEach(btn => { if (data.days.includes(parseInt(btn.dataset.val))) btn.classList.replace('bg-bg', 'bg-ac'); });
    } else { document.getElementById('item-id').value = ''; document.getElementById('item-time').value = `${padZero(new Date().getHours())}:${padZero(new Date().getMinutes())}`; }
    ui.modalForm.classList.remove('opacity-0', 'pointer-events-none'); ui.modalContent.classList.remove('translate-y-full', 'md:translate-y-8');
};
const closeModal = () => { ui.modalContent.classList.add('translate-y-full', 'md:translate-y-8'); setTimeout(() => ui.modalForm.classList.add('opacity-0', 'pointer-events-none'), 300); };
const generateDaysSelectors = () => {
    const container = document.getElementById('item-days'); container.innerHTML = '';
    [1, 2, 3, 4, 5, 6, 0].forEach(dayValue => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.dataset.val = dayValue; btn.className = 'day-selector flex-1 py-2 rounded-xl bg-bg text-soft font-bold text-sm transition-colors';
        btn.textContent = state.daysMap[dayValue];
        btn.addEventListener('click', () => { btn.classList.toggle('bg-ac'); btn.classList.toggle('text-white'); btn.classList.toggle('bg-bg'); });
        container.appendChild(btn);
    });
};

ui.genericForm.addEventListener('submit', async (e) => {
    e.preventDefault(); const type = document.getElementById('item-type').value;
    const itemData = { id: document.getElementById('item-id').value || generateId(), time: document.getElementById('item-time').value, label: document.getElementById('item-label').value, youtubeUrl: document.getElementById('item-yt-url').value };
    if (type === 'alarm') {
        itemData.days = [...document.querySelectorAll('.day-selector.bg-ac')].map(btn => parseInt(btn.dataset.val)); itemData.active = true;
        const index = state.alarms.findIndex(a => a.id === itemData.id); if (index > -1) state.alarms[index] = itemData; else state.alarms.push(itemData);
        await window.AppDB.saveAlarm(itemData); renderAlarms(); showToast("Alarma guardada");
    } else {
        itemData.date = document.getElementById('routine-date').value; itemData.completed = false;
        const index = state.routines.findIndex(r => r.id === itemData.id); if (index > -1) state.routines[index] = itemData; else state.routines.push(itemData);
        await window.AppDB.saveRoutine(itemData); renderCalendar(); updateSelectedDayView(); showToast("Actividad guardada");
    }
    closeModal();
});

const renderAlarms = () => {
    Array.from(ui.grid.children).forEach(c => { if (c.id !== 'grid-add-card') ui.grid.removeChild(c); });
    state.alarms.forEach(alarm => {
        const card = document.createElement('div'); card.className = `bg-sec rounded-[2rem] p-6 shadow-xl hover:scale-[102%] transition-transform duration-300 relative flex flex-col justify-between min-h-[160px] group ${!alarm.active ? 'opacity-60' : ''}`;
        let displayTime = alarm.time, ampmStr = '';
        if (!state.is24h) { let [h, m] = alarm.time.split(':'); h = parseInt(h); ampmStr = `<span class="text-sm font-bold ml-1 text-soft">${h >= 12 ? 'PM' : 'AM'}</span>`; displayTime = `${h % 12 || 12}:${m}`; }
        let daysHtml = alarm.days.length > 0 ? [...alarm.days].sort().map(d => `<span class="text-[10px] font-bold bg-bg px-2 py-1 rounded-md text-soft">${state.daysMap[d]}</span>`).join('') : `<span class="text-[10px] font-bold bg-bg px-2 py-1 rounded-md text-soft">Una vez</span>`;
        let ytIconHtml = alarm.youtubeUrl ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="#5C8353" viewBox="0 0 24 24" class="absolute top-6 right-16"><path d="M21.582,6.186c-0.23-0.86-0.908-1.538-1.768-1.768C18.254,4,12,4,12,4S5.746,4,4.186,4.418 c-0.86,0.23-1.538,0.908-1.768,1.768C2,7.746,2,12,2,12s0,4.254,0.418,5.814c0.23,0.86,0.908,1.538,1.768,1.768 C5.746,20,12,20,12,20s6.254,0,7.814-0.418c0.86-0.23,1.538-0.908,1.768-1.768C22,16.254,22,12,22,12S22,7.746,21.582,6.186z M10,15.464V8.536L16,12L10,15.464z"/></svg>` : '';
        card.innerHTML = `<div class="flex justify-between items-start"><div><h4 class="text-4xl font-black tracking-tight mb-1">${displayTime}${ampmStr}</h4><p class="text-sm font-semibold text-light truncate max-w-[150px]">${alarm.label || 'Alarma'}</p>${ytIconHtml}</div><label class="flex items-center cursor-pointer relative"><input type="checkbox" class="sr-only toggle-checkbox" ${alarm.active ? 'checked' : ''} onchange="toggleAlarm('${alarm.id}')"><div class="toggle-label w-12 h-7 bg-bg rounded-full transition-colors relative"><div class="w-5 h-5 bg-white rounded-full absolute top-1 left-1 transition-all ${alarm.active ? 'translate-x-5' : ''}"></div></div></label></div><div class="flex justify-between items-end mt-4"><div class="flex flex-wrap gap-1 mt-2">${daysHtml}</div><button onclick="deleteAlarm('${alarm.id}')" class="text-red-400 hover:text-red-300 bg-bg/50 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>`;
        card.addEventListener('click', (e) => { if(!e.target.closest('label') && !e.target.closest('button')) openModal('alarm', alarm); });
        ui.grid.insertBefore(card, ui.gridAddCard);
    });
};

window.toggleAlarm = async (id) => { const a = state.alarms.find(a => a.id === id); if (a) { a.active = !a.active; await window.AppDB.saveAlarm(a); renderAlarms(); } };
window.deleteAlarm = async (id) => { state.alarms = state.alarms.filter(a => a.id !== id); await window.AppDB.deleteAlarm(id); renderAlarms(); showToast("Eliminada"); };

const renderCalendar = () => {
    ui.calGridDays.innerHTML = ''; const y = state.currentDate.getFullYear(); const m = state.currentDate.getMonth();
    ui.calMonthYear.textContent = state.currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const first = new Date(y, m, 1).getDay(); const days = new Date(y, m + 1, 0).getDate();
    for (let i = 0; i < first; i++) { const d = document.createElement('div'); d.className = 'cal-day disabled'; ui.calGridDays.appendChild(d); }
    for (let i = 1; i <= days; i++) {
        const str = formatDateString(new Date(y, m, i)); const d = document.createElement('div'); d.className = 'cal-day font-bold text-lg bg-bg/30 text-white'; d.textContent = i;
        if (state.routines.filter(r => r.date === str).length > 0) { const dot = document.createElement('div'); dot.className = 'dot-indicator'; d.appendChild(dot); }
        if (str === formatDateString(state.selectedDate)) d.classList.add('active');
        d.addEventListener('click', () => { state.selectedDate = new Date(y, m, i); renderCalendar(); updateSelectedDayView(); });
        ui.calGridDays.appendChild(d);
    }
};

const updateSelectedDayView = () => {
    const str = formatDateString(state.selectedDate); ui.selectedDateLabel.textContent = state.selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    const dayRoutines = state.routines.filter(r => r.date === str).sort((a,b) => a.time.localeCompare(b.time));
    ui.dayRoutinesList.innerHTML = dayRoutines.length === 0 ? '<p class="text-soft text-sm text-center mt-10">Libre de actividades.</p>' : '';
    dayRoutines.forEach(routine => {
        const el = document.createElement('div'); el.className = `flex justify-between items-center p-4 rounded-xl ${routine.completed ? 'bg-bg/50 opacity-70' : 'bg-bg'} shadow-md`;
        let time = routine.time; if (!state.is24h) { let [h, m] = time.split(':'); h = parseInt(h); time = `${h%12||12}:${m} <span class="text-[10px]">${h>=12?'PM':'AM'}</span>`; }
        el.innerHTML = `<div class="flex items-center gap-3"><input type="checkbox" ${routine.completed ? 'checked' : ''} class="w-5 h-5 accent-ac" onchange="toggleRoutine('${routine.id}')"><div class="flex flex-col"><span class="font-bold text-sm ${routine.completed ? 'line-through text-soft' : 'text-white'}">${routine.label}</span><span class="text-xs text-soft font-mono">${time}</span></div></div><button onclick="deleteRoutine('${routine.id}')" class="text-red-400 p-2 hover:bg-sec rounded-lg transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>`;
        el.addEventListener('click', (e) => { if(e.target.tagName !== 'INPUT' && !e.target.closest('button')) openModal('routine', routine); });
        ui.dayRoutinesList.appendChild(el);
    });
};

ui.btnCalPrev.addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth() - 1); renderCalendar(); });
ui.btnCalNext.addEventListener('click', () => { state.currentDate.setMonth(state.currentDate.getMonth() + 1); renderCalendar(); });
window.toggleRoutine = async (id) => { const r = state.routines.find(r => r.id === id); if (r) { r.completed = !r.completed; await window.AppDB.saveRoutine(r); updateSelectedDayView(); } };
window.deleteRoutine = async (id) => { state.routines = state.routines.filter(r => r.id !== id); await window.AppDB.deleteRoutine(id); renderCalendar(); updateSelectedDayView(); showToast("Eliminada"); };

let currentRingingAlarm = null;
const triggerRingingModal = (alarm) => {
    currentRingingAlarm = alarm; ui.ringTime.innerHTML = alarm.time; ui.ringLabel.textContent = alarm.label || 'Tiempo de Enfoque';
    ui.modalRinging.classList.remove('hidden'); ui.modalRinging.classList.add('flex');
    if (alarm.youtubeUrl) { const embedUrl = getEmbedUrl(alarm.youtubeUrl); if (embedUrl) ui.alarmAudioFrame.src = embedUrl; }
    if (isYtPlaying) ytCmd('pauseVideo');
    if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 300]);
};
const stopRinging = () => { ui.modalRinging.classList.add('hidden'); ui.modalRinging.classList.remove('flex'); currentRingingAlarm = null; ui.alarmAudioFrame.src = ''; if ("vibrate" in navigator) navigator.vibrate(0); };
ui.btnStop.addEventListener('click', stopRinging);
ui.btnSnooze.addEventListener('click', () => {
    if (currentRingingAlarm) {
        let [h, m] = currentRingingAlarm.time.split(':').map(Number);
        m += 5; if (m >= 60) { m -= 60; h = (h + 1) % 24; }
        const snoozeAlarm = { id: generateId(), time: `${padZero(h)}:${padZero(m)}`, label: `Snooze: ${currentRingingAlarm.label}`, days: [], active: true, youtubeUrl: currentRingingAlarm.youtubeUrl };
        state.alarms.push(snoozeAlarm); window.AppDB.saveAlarm(snoozeAlarm); renderAlarms(); showToast("Pospuesto 5m");
    }
    stopRinging();
});

document.getElementById('btn-add-desktop').addEventListener('click', () => openModal('alarm'));
ui.gridAddCard.addEventListener('click', () => openModal('alarm'));
ui.btnFabMobile.addEventListener('click', () => { if(['home', 'pomodoro', 'youtube'].includes(state.currentView)) openModal('alarm'); else openModal('routine'); });
ui.btnCloseModal.addEventListener('click', closeModal); ui.modalForm.addEventListener('click', (e) => { if (e.target === ui.modalForm) closeModal(); });
ui.btnAddRoutine.addEventListener('click', () => openModal('routine'));

window.onload = () => {
    loadData(); updateClock(); setInterval(updateClock, 1000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
};