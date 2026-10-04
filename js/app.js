// js/app.js
const state = {
    alarms: [],
    routines: [],
    is24h: localStorage.getItem('studyfocus_is24h') !== 'false',
    daysMap: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    lastRungMinute: null,
    currentView: 'home', // 'home', 'pomodoro' o 'calendar'
    currentDate: new Date(),
    selectedDate: new Date()
};

// --- Referencias DOM ---
const ui = {
    jumboClock: document.getElementById('jumbo-clock'),
    jumboDate: document.getElementById('jumbo-date'),
    btnFormat: document.getElementById('btn-format'),
    grid: document.getElementById('alarms-grid'),
    gridAddCard: document.getElementById('grid-add-card'),
    
    modalForm: document.getElementById('modal-form'),
    modalContent: document.getElementById('modal-form-content'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    genericForm: document.getElementById('generic-form'),
    
    modalRinging: document.getElementById('modal-ringing'),
    ringTime: document.getElementById('ring-time'),
    ringLabel: document.getElementById('ring-label'),
    btnSnooze: document.getElementById('btn-snooze'),
    btnStop: document.getElementById('btn-stop'),
    
    toast: document.getElementById('toast'),
    nextAlarmInfo: document.getElementById('next-alarm-info'),

    // Navegación
    navHomeDesktop: document.getElementById('nav-home-desktop'),
    navCalDesktop: document.getElementById('nav-calendar-desktop'),
    navPomDesktop: document.getElementById('nav-pomodoro-desktop'),
    navHomeMobile: document.getElementById('nav-home-mobile'),
    navCalMobile: document.getElementById('nav-calendar-mobile'),
    navPomMobile: document.getElementById('nav-pomodoro-mobile'),
    btnFabMobile: document.getElementById('btn-fab-mobile'),
    viewHome: document.getElementById('view-home'),
    viewCalendar: document.getElementById('view-calendar'),
    viewPomodoro: document.getElementById('view-pomodoro'),

    // Calendario
    calMonthYear: document.getElementById('cal-month-year'),
    calGridDays: document.getElementById('calendar-grid-days'),
    btnCalPrev: document.getElementById('cal-prev'),
    btnCalNext: document.getElementById('cal-next'),
    selectedDateLabel: document.getElementById('selected-date-label'),
    dayRoutinesList: document.getElementById('day-routines-list'),
    btnAddRoutine: document.getElementById('btn-add-routine'),

    // Pomodoro
    btnPomWork: document.getElementById('pom-work'),
    btnPomBreak: document.getElementById('pom-break'),
    pomTimer: document.getElementById('pom-timer'),
    btnPomToggle: document.getElementById('pom-toggle'),
    btnPomReset: document.getElementById('pom-reset'),

    // PWA & PiP
    btnInstall: document.getElementById('btn-install'),
    btnPip: document.getElementById('btn-pip')
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
    }, 3000);
};

// --- Inicialización y Carga de Datos IndexedDB ---
const loadData = async () => {
    try {
        await window.AppDB.initDB();
        state.alarms = await window.AppDB.getAllAlarms();
        state.routines = await window.AppDB.getAllRoutines();
        
        renderAlarms();
        renderCalendar();
        updateSelectedDayView();
    } catch (error) {
        console.error("Error cargando base de datos:", error);
        showToast("Error al cargar datos locales.");
    }
};

// --- Instalación PWA ---
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ui.btnInstall.classList.remove('hidden');
    ui.btnInstall.classList.add('flex');
});

ui.btnInstall.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            ui.btnInstall.classList.add('hidden');
            ui.btnInstall.classList.remove('flex');
        }
        deferredPrompt = null;
    }
});

// --- Modo PiP / Compacto (PWA Standalone) ---
let isCompactWindow = false;

const checkStandaloneMode = () => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
        ui.btnPip.classList.remove('hidden');
        ui.btnPip.classList.add('flex');
    } else {
        ui.btnPip.classList.add('hidden');
        ui.btnPip.classList.remove('flex');
    }
};
checkStandaloneMode();
window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandaloneMode);

ui.btnPip.addEventListener('click', () => {
    if (!isCompactWindow) {
        window.resizeTo(350, 500); // Reducir tamaño
        isCompactWindow = true;
        showToast("Modo Compacto Activado");
    } else {
        window.resizeTo(screen.availWidth, screen.availHeight); // Restaurar
        isCompactWindow = false;
        showToast("Ventana Restaurada");
    }
});

// --- Navegación ---
const switchView = (targetView) => {
    state.currentView = targetView;
    const viewsMap = [
        { id: 'home', view: ui.viewHome, navD: ui.navHomeDesktop, navM: ui.navHomeMobile },
        { id: 'pomodoro', view: ui.viewPomodoro, navD: ui.navPomDesktop, navM: ui.navPomMobile },
        { id: 'calendar', view: ui.viewCalendar, navD: ui.navCalDesktop, navM: ui.navCalMobile }
    ];

    viewsMap.forEach(v => {
        if (v.id === targetView) {
            v.view.classList.remove('hidden');
            setTimeout(() => v.view.classList.remove('opacity-0'), 50);
            
            v.navD.classList.replace('text-soft', 'text-white');
            v.navD.classList.remove('hover:text-white');
            v.navD.classList.add('bg-ac');
            
            v.navM.classList.replace('text-soft', 'text-ac');
        } else {
            v.view.classList.add('hidden', 'opacity-0');
            
            v.navD.classList.replace('text-white', 'text-soft');
            v.navD.classList.add('hover:text-white');
            v.navD.classList.remove('bg-ac');
            
            v.navM.classList.replace('text-ac', 'text-soft');
        }
    });
};

ui.navHomeDesktop.addEventListener('click', () => switchView('home'));
ui.navCalDesktop.addEventListener('click', () => switchView('calendar'));
ui.navPomDesktop.addEventListener('click', () => switchView('pomodoro'));
ui.navHomeMobile.addEventListener('click', () => switchView('home'));
ui.navCalMobile.addEventListener('click', () => switchView('calendar'));
ui.navPomMobile.addEventListener('click', () => switchView('pomodoro'));

// --- Lógica del Reloj ---
const updateClock = () => {
    const now = new Date();
    let hours = now.getHours();
    const minutes = padZero(now.getMinutes());
    
    if (!state.is24h) {
        const ampm = hours >= 12 ? ' PM' : ' AM';
        hours = hours % 12 || 12;
        ui.jumboClock.innerHTML = `${hours}:${minutes}<span class="text-3xl text-soft ml-2">${ampm}</span>`;
    } else {
        ui.jumboClock.textContent = `${padZero(hours)}:${minutes}`;
    }
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    ui.jumboDate.textContent = now.toLocaleDateString('es-ES', options);
    
    checkAlarmsAndRoutines(now);
};

ui.btnFormat.addEventListener('click', () => {
    state.is24h = !state.is24h;
    localStorage.setItem('studyfocus_is24h', state.is24h);
    ui.btnFormat.textContent = state.is24h ? '24h' : '12h';
    updateClock();
    renderAlarms();
});
ui.btnFormat.textContent = state.is24h ? '24h' : '12h';

// --- Comprobación de Alarmas/Rutinas ---
const checkAlarmsAndRoutines = (now) => {
    const currentMinStr = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
    const currentDay = now.getDay(); 
    const currentDateStr = formatDateString(now);

    if (state.lastRungMinute === currentMinStr) return;

    let alarmRung = false;

    state.alarms.forEach(alarm => {
        if (alarm.active && alarm.time === currentMinStr) {
            if (alarm.days.length === 0 || alarm.days.includes(currentDay)) {
                triggerRingingModal(alarm);
                alarmRung = true;
                if(alarm.days.length === 0) {
                    alarm.active = false;
                    window.AppDB.saveAlarm(alarm);
                }
            }
        }
    });

    state.routines.forEach(routine => {
        if (!routine.completed && routine.date === currentDateStr && routine.time === currentMinStr) {
            triggerRingingModal({ ...routine, label: `Rutina: ${routine.label}` });
            alarmRung = true;
        }
    });

    if (alarmRung) {
        state.lastRungMinute = currentMinStr;
        renderAlarms();
    }
};

// --- Lógica Técnica Pomodoro ---
let pomInterval = null;
let pomTimeLeft = 25 * 60;
let isPomRunning = false;
let pomMode = 'work'; 

const updatePomodoroDisplay = () => {
    const m = Math.floor(pomTimeLeft / 60);
    const s = pomTimeLeft % 60;
    ui.pomTimer.textContent = `${padZero(m)}:${padZero(s)}`;
};

const setPomodoroMode = (mode) => {
    clearInterval(pomInterval);
    isPomRunning = false;
    ui.btnPomToggle.textContent = 'INICIAR';
    pomMode = mode;
    
    if (mode === 'work') {
        pomTimeLeft = 25 * 60;
        ui.btnPomWork.classList.replace('text-soft', 'text-white');
        ui.btnPomWork.classList.add('bg-ac');
        ui.btnPomBreak.classList.replace('text-white', 'text-soft');
        ui.btnPomBreak.classList.remove('bg-ac');
    } else {
        pomTimeLeft = 5 * 60;
        ui.btnPomBreak.classList.replace('text-soft', 'text-white');
        ui.btnPomBreak.classList.add('bg-ac');
        ui.btnPomWork.classList.replace('text-white', 'text-soft');
        ui.btnPomWork.classList.remove('bg-ac');
    }
    updatePomodoroDisplay();
};

ui.btnPomWork.addEventListener('click', () => setPomodoroMode('work'));
ui.btnPomBreak.addEventListener('click', () => setPomodoroMode('break'));
ui.btnPomReset.addEventListener('click', () => {
    setPomodoroMode(pomMode);
    showToast("Temporizador Reiniciado");
});

ui.btnPomToggle.addEventListener('click', () => {
    if (isPomRunning) {
        clearInterval(pomInterval);
        isPomRunning = false;
        ui.btnPomToggle.textContent = 'REANUDAR';
    } else {
        isPomRunning = true;
        ui.btnPomToggle.textContent = 'PAUSAR';
        pomInterval = setInterval(() => {
            pomTimeLeft--;
            updatePomodoroDisplay();
            if (pomTimeLeft <= 0) {
                clearInterval(pomInterval);
                isPomRunning = false;
                ui.btnPomToggle.textContent = 'INICIAR';
                
                triggerRingingModal({ 
                    time: '00:00', 
                    label: pomMode === 'work' ? '¡Tiempo de Descanso!' : '¡A Trabajar!' 
                });
                
                setPomodoroMode(pomMode === 'work' ? 'break' : 'work');
            }
        }, 1000);
    }
});

// --- Modales Genéricos (Alarmas y Rutinas) ---
const openModal = (type = 'alarm', data = null) => {
    const form = ui.genericForm;
    form.reset();
    document.getElementById('item-type').value = type;
    const daysContainer = document.getElementById('days-container');
    
    if (type === 'alarm') {
        document.getElementById('modal-title').textContent = data ? 'Editar Alarma' : 'Nueva Alarma';
        daysContainer.classList.remove('hidden');
        generateDaysSelectors();
    } else {
        document.getElementById('modal-title').textContent = data ? 'Editar Actividad' : 'Nueva Actividad';
        daysContainer.classList.add('hidden');
        document.getElementById('routine-date').value = formatDateString(state.selectedDate);
    }

    if (data) {
        document.getElementById('item-id').value = data.id;
        document.getElementById('item-time').value = data.time;
        document.getElementById('item-label').value = data.label;
        if(type === 'alarm' && data.days) {
            document.querySelectorAll('.day-selector').forEach(btn => {
                if (data.days.includes(parseInt(btn.dataset.val))) {
                    btn.classList.replace('bg-bg', 'bg-ac');
                    btn.classList.replace('text-soft', 'text-white');
                }
            });
        }
    } else {
        document.getElementById('item-id').value = '';
        const now = new Date();
        document.getElementById('item-time').value = `${padZero(now.getHours())}:${padZero(now.getMinutes())}`;
    }

    ui.modalForm.classList.remove('opacity-0', 'pointer-events-none');
    ui.modalContent.classList.remove('translate-y-full', 'md:translate-y-8');
    ui.modalContent.classList.add('translate-y-0');
};

const closeModal = () => {
    ui.modalContent.classList.remove('translate-y-0');
    ui.modalContent.classList.add('translate-y-full', 'md:translate-y-8');
    setTimeout(() => ui.modalForm.classList.add('opacity-0', 'pointer-events-none'), 300);
};

const generateDaysSelectors = () => {
    const container = document.getElementById('item-days');
    container.innerHTML = '';
    const displayOrder = [1, 2, 3, 4, 5, 6, 0];
    displayOrder.forEach(dayValue => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.val = dayValue;
        btn.className = 'day-selector flex-1 py-2 rounded-xl bg-bg text-soft font-bold text-sm transition-colors';
        btn.textContent = state.daysMap[dayValue];
        btn.addEventListener('click', () => {
            btn.classList.toggle('bg-ac'); btn.classList.toggle('text-white');
            btn.classList.toggle('bg-bg'); btn.classList.toggle('text-soft');
        });
        container.appendChild(btn);
    });
};

ui.genericForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const type = document.getElementById('item-type').value;
    const time = document.getElementById('item-time').value;
    const label = document.getElementById('item-label').value;
    const id = document.getElementById('item-id').value || generateId();

    if (type === 'alarm') {
        const days = [];
        document.querySelectorAll('.day-selector.bg-ac').forEach(btn => days.push(parseInt(btn.dataset.val)));
        
        const alarmData = { id, time, label, days, active: true };
        const index = state.alarms.findIndex(a => a.id === id);
        if (index > -1) state.alarms[index] = alarmData;
        else state.alarms.push(alarmData);
        
        await window.AppDB.saveAlarm(alarmData);
        renderAlarms();
        showToast("Alarma guardada");
    } else {
        const date = document.getElementById('routine-date').value;
        const routineData = { id, date, time, label, completed: false };
        const index = state.routines.findIndex(r => r.id === id);
        if (index > -1) state.routines[index] = routineData;
        else state.routines.push(routineData);

        await window.AppDB.saveRoutine(routineData);
        renderCalendar();
        updateSelectedDayView();
        showToast("Actividad guardada");
    }
    closeModal();
});

// --- Render Alarmas (Inicio) ---
const renderAlarms = () => {
    Array.from(ui.grid.children).forEach(child => { if (child.id !== 'grid-add-card') ui.grid.removeChild(child); });

    state.alarms.forEach(alarm => {
        const card = document.createElement('div');
        card.className = `bg-sec rounded-[2rem] p-6 shadow-xl hover:scale-[102%] transition-transform duration-300 relative flex flex-col justify-between min-h-[160px] group ${!alarm.active ? 'opacity-60' : ''}`;
        
        let displayTime = alarm.time;
        let ampmStr = '';
        if (!state.is24h) {
            let [h, m] = alarm.time.split(':');
            h = parseInt(h);
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            displayTime = `${h}:${m}`;
            ampmStr = `<span class="text-sm font-bold ml-1 text-soft">${ampm}</span>`;
        }

        let daysHtml = alarm.days.length > 0 
            ? [...alarm.days].sort().map(d => `<span class="text-[10px] font-bold bg-bg px-2 py-1 rounded-md text-soft">${state.daysMap[d]}</span>`).join('')
            : `<span class="text-[10px] font-bold bg-bg px-2 py-1 rounded-md text-soft">Una vez</span>`;

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="text-4xl font-black tracking-tight mb-1">${displayTime}${ampmStr}</h4>
                    <p class="text-sm font-semibold text-light truncate max-w-[150px]">${alarm.label || 'Alarma'}</p>
                </div>
                <label class="flex items-center cursor-pointer relative">
                    <input type="checkbox" class="sr-only toggle-checkbox" ${alarm.active ? 'checked' : ''} onchange="toggleAlarm('${alarm.id}')">
                    <div class="toggle-label w-12 h-7 bg-bg rounded-full transition-colors relative">
                        <div class="w-5 h-5 bg-white rounded-full absolute top-1 left-1 transition-all ${alarm.active ? 'translate-x-5' : ''}"></div>
                    </div>
                </label>
            </div>
            <div class="flex justify-between items-end mt-4">
                <div class="flex flex-wrap gap-1 mt-2">${daysHtml}</div>
                <button onclick="deleteAlarm('${alarm.id}')" class="text-red-400 hover:text-red-300 bg-bg/50 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if(!e.target.closest('label') && !e.target.closest('button')) openModal('alarm', alarm);
        });
        ui.grid.insertBefore(card, ui.gridAddCard);
    });
};

window.toggleAlarm = async (id) => {
    const alarm = state.alarms.find(a => a.id === id);
    if (alarm) {
        alarm.active = !alarm.active;
        await window.AppDB.saveAlarm(alarm);
        renderAlarms();
    }
};

window.deleteAlarm = async (id) => {
    state.alarms = state.alarms.filter(a => a.id !== id);
    await window.AppDB.deleteAlarm(id);
    renderAlarms();
    showToast("Alarma eliminada");
};

// --- Lógica del Calendario ---
const renderCalendar = () => {
    ui.calGridDays.innerHTML = '';
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    const options = { month: 'long', year: 'numeric' };
    ui.calMonthYear.textContent = state.currentDate.toLocaleDateString('es-ES', options);

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'cal-day disabled';
        ui.calGridDays.appendChild(emptyDiv);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = formatDateString(new Date(year, month, i));
        const dayDiv = document.createElement('div');
        dayDiv.className = 'cal-day font-bold text-lg bg-bg/30 text-white';
        dayDiv.textContent = i;

        const dayRoutines = state.routines.filter(r => r.date === dateStr);
        if (dayRoutines.length > 0) {
            const dot = document.createElement('div');
            dot.className = 'dot-indicator';
            dayDiv.appendChild(dot);
        }

        if (dateStr === formatDateString(state.selectedDate)) {
            dayDiv.classList.add('active');
        }

        dayDiv.addEventListener('click', () => {
            state.selectedDate = new Date(year, month, i);
            renderCalendar(); 
            updateSelectedDayView();
        });

        ui.calGridDays.appendChild(dayDiv);
    }
};

const updateSelectedDayView = () => {
    const dateStr = formatDateString(state.selectedDate);
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    ui.selectedDateLabel.textContent = state.selectedDate.toLocaleDateString('es-ES', options);

    const dayRoutines = state.routines.filter(r => r.date === dateStr).sort((a,b) => a.time.localeCompare(b.time));
    
    ui.dayRoutinesList.innerHTML = '';
    
    if (dayRoutines.length === 0) {
        ui.dayRoutinesList.innerHTML = '<p class="text-soft text-sm text-center mt-10">No hay actividades para este día.</p>';
    } else {
        dayRoutines.forEach(routine => {
            const el = document.createElement('div');
            el.className = `flex justify-between items-center p-4 rounded-xl ${routine.completed ? 'bg-bg/50 opacity-70' : 'bg-bg'} shadow-md`;
            
            let displayTime = routine.time;
            if (!state.is24h) {
                let [h, m] = routine.time.split(':');
                h = parseInt(h); const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
                displayTime = `${h}:${m} <span class="text-[10px] text-soft">${ampm}</span>`;
            }

            el.innerHTML = `
                <div class="flex items-center gap-3">
                    <input type="checkbox" ${routine.completed ? 'checked' : ''} class="w-5 h-5 accent-ac" onchange="toggleRoutine('${routine.id}')">
                    <div class="flex flex-col">
                        <span class="font-bold text-sm ${routine.completed ? 'line-through text-soft' : 'text-white'}">${routine.label}</span>
                        <span class="text-xs text-soft font-mono">${displayTime}</span>
                    </div>
                </div>
                <button onclick="deleteRoutine('${routine.id}')" class="text-red-400 p-2 hover:bg-sec rounded-lg transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            `;
            el.addEventListener('click', (e) => {
                if(e.target.tagName !== 'INPUT' && !e.target.closest('button')) openModal('routine', routine);
            });

            ui.dayRoutinesList.appendChild(el);
        });
    }
};

ui.btnCalPrev.addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() - 1);
    renderCalendar();
});
ui.btnCalNext.addEventListener('click', () => {
    state.currentDate.setMonth(state.currentDate.getMonth() + 1);
    renderCalendar();
});

window.toggleRoutine = async (id) => {
    const routine = state.routines.find(r => r.id === id);
    if (routine) {
        routine.completed = !routine.completed;
        await window.AppDB.saveRoutine(routine);
        updateSelectedDayView();
    }
};

window.deleteRoutine = async (id) => {
    state.routines = state.routines.filter(r => r.id !== id);
    await window.AppDB.deleteRoutine(id);
    renderCalendar();
    updateSelectedDayView();
    showToast("Actividad eliminada");
};

ui.btnAddRoutine.addEventListener('click', () => openModal('routine'));

// --- Modales Ringing (Pantalla de Alarma Sonando) ---
let currentRingingAlarm = null;
const triggerRingingModal = (alarm) => {
    currentRingingAlarm = alarm;
    ui.ringTime.innerHTML = alarm.time;
    ui.ringLabel.textContent = alarm.label || 'Tiempo de Enfoque';
    ui.modalRinging.classList.remove('hidden');
    ui.modalRinging.classList.add('flex');
    if ("vibrate" in navigator) navigator.vibrate([300, 100, 300, 100, 300]);
};
const stopRinging = () => {
    ui.modalRinging.classList.add('hidden');
    ui.modalRinging.classList.remove('flex');
    currentRingingAlarm = null;
    if ("vibrate" in navigator) navigator.vibrate(0);
};

ui.btnStop.addEventListener('click', stopRinging);
ui.btnSnooze.addEventListener('click', () => {
    if (currentRingingAlarm) {
        let [h, m] = currentRingingAlarm.time.split(':').map(Number);
        m += 5; if (m >= 60) { m -= 60; h = (h + 1) % 24; }
        const newTime = `${padZero(h)}:${padZero(m)}`;
        const snoozeAlarm = { id: generateId(), time: newTime, label: `Snooze: ${currentRingingAlarm.label}`, days: [], active: true };
        state.alarms.push(snoozeAlarm);
        window.AppDB.saveAlarm(snoozeAlarm);
        renderAlarms();
        showToast("Pospuesto 5 minutos");
    }
    stopRinging();
});

// Eventos Globales Formularios y Botones
document.getElementById('btn-add-desktop').addEventListener('click', () => openModal('alarm'));
ui.gridAddCard.addEventListener('click', () => openModal('alarm'));
ui.btnFabMobile.addEventListener('click', () => {
    // Si estás en la vista Pomodoro y presionas FAB, lo usamos para abrir alarma rápida
    if(state.currentView === 'home' || state.currentView === 'pomodoro') openModal('alarm');
    else openModal('routine');
});
ui.btnCloseModal.addEventListener('click', closeModal);
ui.modalForm.addEventListener('click', (e) => { if (e.target === ui.modalForm) closeModal(); });

// Iniciar aplicación
window.onload = () => {
    loadData();
    updateClock();
    setInterval(updateClock, 1000);
    
    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(err => console.error("SW Register fail:", err));
    }
};