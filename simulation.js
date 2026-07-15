// Stato Globale del Gioco
const GameState = {
    // Risorse
    food: 150,
    wood: 50,
    science: 0,
    ants: 10,
    maxAnts: 20,
    maxStorage: 500,

    // Lavori
    jobs: {
        foragers: 3,  // Raccolgono cibo
        builders: 3,  // Raccolgono materiali (legno)
        soldiers: 1,  // Difendono e riducono minaccia
        unemployed: 3 // Rimaste a riposo/manutenzione
    },

    // Griglia (6x6)
    gridSize: 6,
    grid: [],

    // Meccanica di Guerra e Minaccia
    threatLevel: 0, // Sale nel tempo, diminuisce con i soldati
    lastEventTick: 0,

    // Costi delle Camere
    costs: {
        nest: { food: 30, wood: 20 },
        storage: { food: 0, wood: 40 },
        nursery: { food: 50, wood: 50 }
    }
};

// Inizializza la Griglia di Gioco vuota
function initGrid() {
    GameState.grid = [];
    for (let r = 0; r < GameState.gridSize; r++) {
        let row = [];
        for (let c = 0; c < GameState.gridSize; c++) {
            // La cella centrale (2,2) parte come nido della Regina
            if (r === 2 && c === 2) {
                row.push({ type: 'nest', icon: '👑', label: 'Regina' });
            } else {
                row.push({ type: 'dirt', icon: '🟫', label: 'Terra' });
            }
        }
        GameState.grid.push(row);
    }
}

// Ciclo di Simulazione Principale (Tick di gioco ogni secondo)
function gameTick() {
    // 1. Produzione Risorse in base ai lavori
    // Cibo
    const foodProduced = GameState.jobs.foragers * 1.5;
    const foodConsumed = GameState.ants * 0.4; // Consumo passivo
    GameState.food = Math.min(GameState.maxStorage, Math.max(0, GameState.food + foodProduced - foodConsumed));

    // Legno/Materiali
    const woodProduced = GameState.jobs.builders * 1.2;
    GameState.wood = Math.min(GameState.maxStorage, GameState.wood + woodProduced);

    // 2. Crescita Automatica dal Vivaio (Nursery)
    countNurseriesAndSpawn();

    // 3. Gestione della Minaccia e delle Formiche Rosse Nemetiche
    manageThreat();

    // 4. Morte se manca cibo
    if (GameState.food <= 0 && GameState.ants > 1) {
        GameState.ants -= 1;
        autoAssignJobs(); // Riassegna i lavori se una formica muore
        addLog("⚠️ Una formica è morta di fame! Mancano scorte di cibo.", "war");
    }
}

// Conta quanti vivai ci sono e gestisce la nascita di nuove formiche
function countNurseriesAndSpawn() {
    let nurseries = 0;
    for (let r = 0; r < GameState.gridSize; r++) {
        for (let c = 0; c < GameState.gridSize; c++) {
            if (GameState.grid[r][c].type === 'nursery') nurseries++;
        }
    }

    if (nurseries > 0 && GameState.ants < GameState.maxAnts) {
        // Ogni vivaio dà una chance di nascita ad ogni tick
        if (Math.random() < (0.05 * nurseries)) {
            GameState.ants++;
            GameState.jobs.unemployed++;
            addLog("🥚 Una nuova formica è nata nel vivaio!", "success");
        }
    }
}

// Gestione del livello di minaccia e attacchi nemici
function manageThreat() {
    // La minaccia sale passivamente con la grandezza del nido (più formiche = più odore di feromoni)
    const baseThreatIncrease = 0.5 + (GameState.ants * 0.05);
    // I soldati tengono sotto controllo e pattugliano la minaccia
    const soldierDefense = GameState.jobs.soldiers * 0.4;

    GameState.threatLevel = Math.max(0, Math.min(100, GameState.threatLevel + baseThreatIncrease - soldierDefense));

    // Se la minaccia supera il 50%, c'è il rischio di un attacco delle Formiche Rosse rivali
    if (GameState.threatLevel > 40 && Math.random() < (GameState.threatLevel / 400)) {
        triggerRedAntWar();
    }
}

// Guerra contro le formiche rosse
function triggerRedAntWar() {
    addLog("⚔️ ALLERTA! Le formiche rosse rivali stanno attaccando la nostra colonia!", "war");
    
    const invadersPower = Math.floor(Math.random() * (GameState.ants / 2)) + 2;
    const defensePower = GameState.jobs.soldiers * 3;

    if (defensePower >= invadersPower) {
        // Vittoria!
        const foodLoot = invadersPower * 10;
        GameState.food = Math.min(GameState.maxStorage, GameState.food + foodLoot);
        GameState.threatLevel = Math.max(0, GameState.threatLevel - 30);
        addLog(`🎉 Vittoria! I tuoi soldati hanno respinto gli invasori. Abbiamo saccheggiato ${foodLoot} unità di cibo!`, "success");
    } else {
        // Sconfitta o perdite pesanti
        const losses = Math.min(GameState.ants - 1, Math.floor(invadersPower - defensePower));
        const foodStolen = Math.floor(GameState.food * 0.3);
        
        GameState.ants = Math.max(1, GameState.ants - losses);
        GameState.food = Math.max(0, GameState.food - foodStolen);
        GameState.threatLevel = 0; // Si resetta dopo l'attacco

        autoAssignJobs();
        addLog(`😭 Sconfitta disastrosa! Abbiamo perso ${losses} formiche e ${foodStolen} cibo nell'assalto.`, "war");
    }
}

// Riassegna i lavori in modo sicuro se la popolazione cambia
function autoAssignJobs() {
    let totalAssigned = GameState.jobs.foragers + GameState.jobs.builders + GameState.jobs.soldiers;
    
    while (totalAssigned > GameState.ants) {
        if (GameState.jobs.foragers > 0) { GameState.jobs.foragers--; }
        else if (GameState.jobs.builders > 0) { GameState.jobs.builders--; }
        else if (GameState.jobs.soldiers > 0) { GameState.jobs.soldiers--; }
        totalAssigned = GameState.jobs.foragers + GameState.jobs.builders + GameState.jobs.soldiers;
    }
    
    GameState.jobs.unemployed = GameState.ants - totalAssigned;
}

// Funzione di utilità per aggiungere log eventi
function addLog(message, type = "system") {
    const logBox = document.getElementById('log-box');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${message}`;
    logBox.appendChild(entry);
    logBox.scrollTop = logBox.scrollHeight;
}

// Inizializzazione gioco
initGrid();
