// Game Configuration
const STAGES = {
    SUTOM: 1,
    CHARADE: 2,
    TRIVIA: 3,
    HANGMAN: 4,
    REVEAL: 5
};

const ANSWERS = {
    sutom: "ARENA",
    // Charade answer: "THE PRAYER" or "LA PRIERE" or similar. 
    // Allowing flexibility since it wasn't specified.
    charade: ["THE PRAYER", "PRAYER", "LA PRIÈRE", "LA PRIERE", "MUSIC", "MUSIQUE"], 
    trivia: ["ITALIE", "ITALY"],
    hangman: "BOCELLI"
};

// State
let currentStage = 0;
let sutomState = {
    currentRow: 0,
    currentGuess: [],
    maxRows: 5,
    wordLength: 5,
    gameOver: false
};
let hangmanState = {
    guessedLetters: new Set(),
    mistakes: 0,
    maxMistakes: 6, // Head, Body, L-Arm, R-Arm, L-Leg, R-Leg
    gameOver: false
};

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Stage 0 is static HTML, no init needed.
    // ensure progress bar is 0
    updateProgressBar();
});

function startGame() {
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('welcome-screen').classList.remove('active');
    
    currentStage = 1;
    updateProgressBar();
    
    const stage1 = document.getElementById('stage-1');
    stage1.classList.remove('hidden');
    stage1.classList.add('active');
    
    initStage1();
}

// STAGE MANAGEMENT
function nextStage() {
    // Hide current
    document.querySelector(`#stage-${currentStage}`).classList.add('hidden');
    document.querySelector(`#stage-${currentStage}`).classList.remove('active');
    
    currentStage++;
    updateProgressBar();

    if (currentStage > 4) {
        // Reveal
        document.getElementById('final-reveal').classList.remove('hidden');
        document.getElementById('progressBar').style.width = '100%';
        triggerConfetti();
    } else {
        // Show next
        const nextSection = document.querySelector(`#stage-${currentStage}`);
        nextSection.classList.remove('hidden');
        nextSection.classList.add('active');
        
        // Init logic for new stage
        if (currentStage === 2) setTimeout(() => document.getElementById('answer-2').focus(), 100);
        if (currentStage === 3) setTimeout(() => document.getElementById('answer-3').focus(), 100);
        if (currentStage === 4) initHangman();
    }
}

function updateProgressBar() {
    const percent = ((currentStage - 1) / 4) * 100;
    document.getElementById('progressBar').style.width = `${percent}%`;
}

function restartStep() {
    if (confirm("Voulez-vous recommencer cette étape ?")) {
        if (currentStage === 1) resetSutom();
        if (currentStage === 2) document.getElementById('answer-2').value = '';
        if (currentStage === 3) document.getElementById('answer-3').value = '';
        if (currentStage === 4) resetHangman();
    }
}

function showNotification(msg) {
    const el = document.getElementById('notification-area');
    el.innerText = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3000);
}

// STAGE 1: SUTOM (ARENA)
function initStage1() {
    document.getElementById('sutom-hint-btn').classList.add('hidden');
    resetSutom();
}

function resetSutom() {
    sutomState = { currentRow: 0, currentGuess: [], maxRows: 5, wordLength: 5, gameOver: false };
    const grid = document.getElementById('sutom-grid');
    grid.innerHTML = '';
    
    // Create Grid
    for(let i=0; i<sutomState.maxRows; i++) {
        const row = document.createElement('div');
        row.className = 'sutom-row';
        for(let j=0; j<sutomState.wordLength; j++) {
            const cell = document.createElement('div');
            cell.className = 'sutom-cell';
            cell.id = `cell-${i}-${j}`;
            // First letter hint on first row? Standard Sutom gives first letter.
            if (i===0 && j===0) {
                cell.innerText = ANSWERS.sutom[0];
            }
            row.appendChild(cell);
        }
        grid.appendChild(row);
    }

    // Virtual Keyboard
    createKeyboard('keyboard', handleSutomInput);
    
    // Force first letter in state for first row
    sutomState.currentGuess = [];
    if (ANSWERS.sutom.length > 0) {
        sutomState.currentGuess[0] = ANSWERS.sutom[0];
    }
}

function handleSutomInput(key) {
    if (sutomState.gameOver) return;

    if (key === 'ENTER') {
        submitSutomGuess();
    } else if (key === 'DEL') {
        if (sutomState.currentGuess.length > 1) { // Keep first letter?
            sutomState.currentGuess.pop();
            updateSutomGrid();
        }
    } else if (sutomState.currentGuess.length < sutomState.wordLength) {
        sutomState.currentGuess.push(key);
        updateSutomGrid();
    }
}

function updateSutomGrid() {
    const row = sutomState.currentRow;
    for (let i=0; i<sutomState.wordLength; i++) {
        const cell = document.getElementById(`cell-${row}-${i}`);
        cell.innerText = sutomState.currentGuess[i] || (i===0 && row===0 ? ANSWERS.sutom[0] : '');
    }
}

function submitSutomGuess() {
    if (sutomState.currentGuess.length !== sutomState.wordLength) {
        showNotification("Mot trop court !");
        return;
    }

    const guess = sutomState.currentGuess.join('');
    const target = ANSWERS.sutom;
    const row = sutomState.currentRow;
    let correctCount = 0;

    // Check letters
    // Naive check for now (Sutom rules: Red=Correct, Yellow=Present but elsewhere, Blue=Absent)
    // We need to handle duplicates correctly for 'Present'
    let targetFreq = {};
    for(let char of target) targetFreq[char] = (targetFreq[char] || 0) + 1;

    let cellStatus = new Array(5).fill('absent');
    let guessArr = sutomState.currentGuess;

    // First pass: Correct
    for(let i=0; i<5; i++) {
        if (guessArr[i] === target[i]) {
            cellStatus[i] = 'correct';
            targetFreq[guessArr[i]]--;
            correctCount++;
        }
    }

    // Second pass: Present
    for(let i=0; i<5; i++) {
        if (cellStatus[i] !== 'correct') {
            if (targetFreq[guessArr[i]] > 0) {
                cellStatus[i] = 'present';
                targetFreq[guessArr[i]]--;
            }
        }
    }

    // Apply styles
    for(let i=0; i<5; i++) {
        const cell = document.getElementById(`cell-${row}-${i}`);
        cell.classList.add(cellStatus[i]);
        
        // Update Keyboard
        const keyBtn = Array.from(document.querySelectorAll('.key')).find(k => k.innerText === guessArr[i]);
        if(keyBtn) {
            if (cellStatus[i] === 'correct') keyBtn.classList.add('correct');
            else if (cellStatus[i] === 'present' && !keyBtn.classList.contains('correct')) keyBtn.classList.add('present');
            else if (!keyBtn.classList.contains('correct') && !keyBtn.classList.contains('present')) keyBtn.classList.add('absent');
        }
    }

    if (correctCount === 5) {
        sutomState.gameOver = true;
        showNotification("Bravo !");
        setTimeout(nextStage, 1500);
    } else {
        sutomState.currentRow++;
        if (sutomState.currentRow >= sutomState.maxRows) {
            showNotification("Pas grave ! On recommence...");
            // Show hint button for the next attempt
            document.getElementById('sutom-hint-btn').classList.remove('hidden');
            setTimeout(resetSutom, 1500);
        } else {
            // Prepare next row
            sutomState.currentGuess = []; 
            // Pre-fill letters that were already revealed/hinted? 
            // Standard Sutom keeps first letter. We also keep 'hinted' letters if we implement persistent hints.
            // For now, let's just ensure the first letter is always there if it's the start
             if (ANSWERS.sutom.length > 0) {
                 sutomState.currentGuess[0] = ANSWERS.sutom[0];
                 const firstCell = document.getElementById(`cell-${sutomState.currentRow}-0`);
                 if(firstCell) firstCell.innerText = ANSWERS.sutom[0];
             }
        }
    }
}

window.revealSutomLetter = function() {
    // Find the first index in the target word that isn't currently in the guess (or just next index)
    // We are at sutomState.currentRow.
    // currentGuess might have some letters.
    const target = ANSWERS.sutom; // ARENA
    const currentG = sutomState.currentGuess;
    
    // Find next missing index
    for(let i=0; i<target.length; i++) {
        if (!currentG[i]) {
            currentG[i] = target[i];
            const cell = document.getElementById(`cell-${sutomState.currentRow}-${i}`);
            if(cell) {
                cell.innerText = target[i];
                cell.style.color = '#ffff00'; // Highlight hint
                setTimeout(() => cell.style.color = 'white', 500);
            }
            break; // Reveal only one at a time
        }
    }
}



// STAGE 2: CHARADE
window.checkStage2 = function() {
    const input = document.getElementById('answer-2').value.trim().toUpperCase();
    if (ANSWERS.charade.includes(input)) {
        showNotification("Correct !");
        nextStage();
    } else {
        showNotification("Ce n'est pas ça...");
        // Hint could go here
    }
}

// STAGE 3: TRIVIA
window.checkStage3 = function() {
    const input = document.getElementById('answer-3').value.trim().toUpperCase();
    if (ANSWERS.trivia.includes(input)) {
        showNotification("Exactement !");
        nextStage();
    } else {
        showNotification("Essayez encore (pensez au pays de l'opéra...)");
    }
}

// STAGE 4: HANGMAN (BOCELLI)
function initHangman() {
    resetHangman();
}

function resetHangman() {
    hangmanState = {
        guessedLetters: new Set(),
        mistakes: 0,
        maxMistakes: 6,
        gameOver: false
    };
    
    // Reset Display
    document.querySelectorAll('.hangman-svg .draw').forEach(el => el.classList.remove('visible'));
    updateHangmanWord();
    createKeyboard('hangman-keyboard', handleHangmanInput);
}

function handleHangmanInput(key) {
    if (hangmanState.gameOver || key.length > 1) return; // Ignore ENTER/DEL
    if (hangmanState.guessedLetters.has(key)) return;

    hangmanState.guessedLetters.add(key);
    
    // Update Keyboard visual
    const keyBtns = document.querySelectorAll('#hangman-keyboard .key');
    keyBtns.forEach(btn => {
        if(btn.innerText === key) btn.classList.add('absent'); // Mark as used
    });

    if (ANSWERS.hangman.includes(key)) {
        updateHangmanWord();
        checkHangmanWin();
    } else {
        hangmanState.mistakes++;
        drawHangmanPart(hangmanState.mistakes);
        if (hangmanState.mistakes >= hangmanState.maxMistakes) {
            showNotification("Perdu ! On recommence...");
            setTimeout(resetHangman, 1500);
        }
    }
}

function updateHangmanWord() {
    const container = document.getElementById('hangman-word');
    const word = ANSWERS.hangman;
    const display = word.split('').map(char => 
        hangmanState.guessedLetters.has(char) ? char : '_'
    ).join(' ');
    container.innerText = display;
}

function drawHangmanPart(n) {
    // n is 1-based index of mistake
    // The svg lines should be shown in order.
    // We have 4 lines defined in HTML, need more for full body?
    // Let's rely on simple lines for now.
    // SVG lines in HTML: 4 lines. We need maybe 6 parts?
    // Add more lines in HTML or just reuse.
    // Let's assume the SVG has enough parts class 'draw' and we pick by index.
    const parts = document.querySelectorAll('.hangman-svg .draw');
    if (parts[n-1]) parts[n-1].classList.add('visible');
}

function checkHangmanWin() {
    const word = ANSWERS.hangman;
    const isWin = word.split('').every(char => hangmanState.guessedLetters.has(char));
    if (isWin) {
        showNotification("BRAVO !");
        hangmanState.gameOver = true;
        setTimeout(nextStage, 1000);
    }
}


// Global Keyboard Listener
document.addEventListener('keydown', (e) => {
    // If we are in an input field (Stage 2/3), let default behavior happen
    if (e.target.tagName === 'INPUT') {
        if (e.key === 'Enter') {
            if (currentStage === 2) checkStage2();
            if (currentStage === 3) checkStage3();
        }
        return;
    }

    const key = e.key.toUpperCase();
    
    // Stage 1: Sutom
    if (currentStage === 1 && !sutomState.gameOver) {
        if (key === 'ENTER') handleSutomInput('ENTER');
        else if (key === 'BACKSPACE' || key === 'DELETE') handleSutomInput('DEL');
        else if (/^[A-Z]$/.test(key)) handleSutomInput(key);
    }
    
    // Stage 4: Hangman
    if (currentStage === 4 && !hangmanState.gameOver) {
        if (/^[A-Z]$/.test(key)) handleHangmanInput(key);
    }
});

// UTILS
function createKeyboard(containerId, handler) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    const rows = [
        "AZERTYUIOP",
        "QSDFGHJKLM",
        "WXCVBN"
    ];

    rows.forEach(rowStr => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'key-row';
        
        rowStr.split('').forEach(char => {
            const btn = document.createElement('div');
            btn.className = 'key';
            btn.innerText = char;
            btn.onclick = () => handler(char);
            rowDiv.appendChild(btn);
        });
        
        // Add Enter/Del on last row for Sutom
        if (rows.indexOf(rowStr) === 2 && containerId === 'keyboard') {
             const delBtn = document.createElement('div');
             delBtn.className = 'key';
             delBtn.innerText = 'DEL';
             delBtn.onclick = () => handler('DEL');
             rowDiv.appendChild(delBtn);

             const entBtn = document.createElement('div');
             entBtn.className = 'key';
             entBtn.innerText = 'ENTER';
             entBtn.onclick = () => handler('ENTER');
             rowDiv.appendChild(entBtn);
        }
        
        container.appendChild(rowDiv);
    });
}

function triggerConfetti() {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInOut(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInOut(0.1, 0.3), y: Math.random() - 0.2 } }));
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInOut(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);
}
