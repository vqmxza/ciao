let selectedTool = null;

// Gestione selezione strumenti di costruzione
document.querySelectorAll('.btn-build').forEach(button => {
    button.addEventListener('click', (e) => {
        // Deseleziona se già attivo
        if (button.classList.contains('active')) {
            button.classList.remove('active');
            selectedTool = null;
            addLog("Strumento di costruzione deselezionato.");
        } else {
            document.querySelectorAll('.btn-build').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            selectedTool = button.getAttribute('data-type');
            addLog(`Pronto a costruire: ${selectedTool.toUpperCase()}. Clicca su un blocco di terra.`);
        }
    });
});

// Render della griglia di gioco
function renderGrid() {
    const gridEl = document.getElementById('colony-grid');
    gridEl.innerHTML = '';

    for (let r = 0; r < GameState.gridSize; r++) {
        for (let c = 0; c < GameState.gridSize; c++) {
            const cellData = GameState.grid[r][c];
            const cellEl = document.createElement('div');
            cellEl.className = `cell ${cellData.type}`;
            cellEl.innerHTML = `
                <span class="cell-icon">${cellData.icon}</span>
                <span class="cell-label">${cellData.label}</span>
            `;

            // Click sulla singola cella della griglia
            cellEl.addEventListener('click', () => {
                handleCellClick(r, c);
            });

            gridEl.appendChild(cellEl);
        }
    }
}

// Logica di costruzione su click cella
function handleCellClick(row, col) {
    if (!selectedTool) {
        addLog("Seleziona prima una camera da costruire dal pannello laterale!");
        return;
    }

    const currentCell = GameState.grid[row][col];

    if (currentCell.type !== 'dirt') {
        addLog("Non puoi costruire qui! C'è già una camera.", "war");
        return;
    }

    // Verifica costi
    const cost = GameState.costs[selectedTool];
    if (GameState.food >= cost.food && GameState.wood >= cost.wood) {
        // Detrai risorse
        GameState.food -= cost.food;
        GameState.wood -= cost.wood;

        // Costruisci
        let icon = '🟫';
        let label = 'Terra';
        if (selectedTool === 'nest') {
            icon = '🕳️';
            label = 'Nido';
            GameState.maxAnts += 10;
        } else if (selectedTool === 'storage') {
            icon = '📦';
            label = 'Deposito';
            GameState.maxStorage += 250;
        } else if (selectedTool === 'nursery') {
            icon = '🥚';
            label = 'Vivaio';
        }

        GameState.grid[row][col] = { type: selectedTool, icon: icon, label: label };
        addLog(`Costruzione completata: ${label}!`, "success");

        // Deseleziona strumento
        selectedTool = null;
        document.querySelectorAll('.btn-build').forEach(b => b.classList.remove('active'));

        // Aggiorna l'interfaccia grafica
        renderGrid();
        updateUI();
    } else {
        addLog("Risorse insufficienti per questa camera!", "war");
    }
}

// Gestione dei bottoni di assegnazione lavoro delle formiche
document.querySelectorAll('.btn-job').forEach(button => {
    button.addEventListener('click', () => {
        const job = button.getAttribute('data-job');
        const action = button.getAttribute('data-action');

        if (action === 'add') {
            if (GameState.jobs.unemployed > 0) {
                GameState.jobs[job]++;
                GameState.jobs.unemployed--;
            } else {
                addLog("Nessuna formica disoccupata disponibile! Aspetta nuove nascite o libera formiche da altri ruoli.");
            }
        } else if (action === 'sub') {
            if (GameState.jobs[job] > 0) {
                GameState.jobs[job]--;
                GameState.jobs.unemployed++;
            }
        }
        updateUI();
    });
});

// Aggiorna tutti i valori testuali dell'interfaccia utente
function updateUI() {
    document.getElementById('ant-count').innerText = GameState.ants;
    document.getElementById('max-ants').innerText = GameState.maxAnts;
    document.getElementById('food-count').innerText = Math.floor(GameState.food);
    document.getElementById('wood-count').innerText = Math.floor(GameState.wood);
    document.getElementById('science-count').innerText = Math.floor(GameState.science);
    document.getElementById('threat-level').innerText = `${Math.floor(GameState.threatLevel)}%`;

    // Aggiorna contatore dei lavori
    document.getElementById('job-foragers').innerText = GameState.jobs.foragers;
    document.getElementById('job-builders').innerText = GameState.jobs.builders;
    document.getElementById('job-soldiers').innerText = GameState.jobs.soldiers;
}

// Ciclo di aggiornamento grafico & logico sincronizzato
setInterval(() => {
    gameTick();
    updateUI();
}, 1000);

// Primo avvio
renderGrid();
updateUI();
