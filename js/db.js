// js/db.js
const dbName = 'StudyFocusDB';
const dbVersion = 1;
let db;

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (event) => {
            console.error('Error abriendo IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // Almacén para Alarmas recurrentes
            if (!db.objectStoreNames.contains('alarms')) {
                db.createObjectStore('alarms', { keyPath: 'id' });
            }
            // Almacén para Actividades/Rutinas del Calendario
            if (!db.objectStoreNames.contains('routines')) {
                const routineStore = db.createObjectStore('routines', { keyPath: 'id' });
                routineStore.createIndex('date', 'date', { unique: false });
            }
        };
    });
};

// Funciones Genéricas para Almacenes
const getAllItems = (storeName) => {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const saveItem = (storeName, item) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

const deleteItem = (storeName, id) => {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Exportar funciones (Accesibles en el entorno Global por los scripts posteriores)
window.AppDB = {
    initDB,
    getAllAlarms: () => getAllItems('alarms'),
    saveAlarm: (alarm) => saveItem('alarms', alarm),
    deleteAlarm: (id) => deleteItem('alarms', id),
    getAllRoutines: () => getAllItems('routines'),
    saveRoutine: (routine) => saveItem('routines', routine),
    deleteRoutine: (id) => deleteItem('routines', id)
};