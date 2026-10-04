// js/db.js
const dbName = 'StudyFocusDB';
const dbVersion = 2; // Actualizado a la versión 2 para soportar guardado de Playlists
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
            
            if (!db.objectStoreNames.contains('alarms')) {
                db.createObjectStore('alarms', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('routines')) {
                const routineStore = db.createObjectStore('routines', { keyPath: 'id' });
                routineStore.createIndex('date', 'date', { unique: false });
            }
            // Nuevo Almacén para Playlists Guardadas
            if (!db.objectStoreNames.contains('playlists')) {
                db.createObjectStore('playlists', { keyPath: 'id' });
            }
        };
    });
};

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

window.AppDB = {
    initDB,
    getAllAlarms: () => getAllItems('alarms'),
    saveAlarm: (alarm) => saveItem('alarms', alarm),
    deleteAlarm: (id) => deleteItem('alarms', id),
    
    getAllRoutines: () => getAllItems('routines'),
    saveRoutine: (routine) => saveItem('routines', routine),
    deleteRoutine: (id) => deleteItem('routines', id),
    
    getAllPlaylists: () => getAllItems('playlists'),
    savePlaylist: (playlist) => saveItem('playlists', playlist),
    deletePlaylist: (id) => deleteItem('playlists', id)
};