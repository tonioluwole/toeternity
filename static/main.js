// Global toggle for voice (you can wire this to a button later if you want a mute option)
let voiceEnabled = true;
let currentDMAudio = null

const CHAPTER_TITLES = {
    1: "The Awakening",
    2: "The Shadow Ambush",
    3: "The Glimmering Nuisance",
    4: "The Prism Mechanism",
    5: "The Betrayal",
    6: "The World-Forge Climax",
    7: "The Legacy"
};

function renderChapterBanner(chapterNum) {
    const title = CHAPTER_TITLES[chapterNum] || "A New Journey";
    return `
        <div class="chapter-banner">
            <div class="chapter-number">Chapter ${chapterNum}</div>
            <div class="chapter-title">${title}</div>
        </div>
    `;
}

async function speakDM(text) {
    if (!text) return;
    
    // Stop browser TTS and active audio immediately
    window.speechSynthesis.cancel();
    if (currentDMAudio) {
        currentDMAudio.pause();
        currentDMAudio.currentTime = 0;
    }

    let serverAudioSucceeded = false;

    try {
        const response = await fetch('/api/voice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (response.ok) {
            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            currentDMAudio = new Audio(audioUrl);
            
            // Set volume based on current mute state
            currentDMAudio.volume = voiceEnabled ? 1.0 : 0.0;
            currentDMAudio.play();
            serverAudioSucceeded = true;
        }
    } catch (error) {
        console.warn("Server voice generation failed, falling back to browser TTS:", error);
    }

    // Browser fallback only plays if voiceEnabled is true
    if (!serverAudioSucceeded && voiceEnabled) {
        const utterance = new SpeechSynthesisUtterance(text);
        window.speechSynthesis.speak(utterance);
    }
}

function toggleMute() {
    voiceEnabled = !voiceEnabled;
    const muteBtn = document.getElementById('mute-btn');
    
    if (voiceEnabled) {
        muteBtn.innerText = '🔊 Mute';
        // Restore volume if audio is currently playing
        if (currentDMAudio) {
            currentDMAudio.volume = 1.0;
        }
    } else {
        muteBtn.innerText = '🔇 Unmute';
        // Drop volume to 0 instantly without pausing or destroying the track
        if (currentDMAudio) {
            currentDMAudio.volume = 0.0;
        }
        window.speechSynthesis.cancel();
    }
}

// Fix for some browsers needing a moment to load voices
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};
let characterState = null;
let chatHistory = [];
const GEMINI_KEY_STORAGE = "eternity_gemini_api_key";
const GEMINI_KEY_URL = "https://ai.google.dev/gemini-api/docs/api-key";

// Global resolver for the API key promise
let apiKeyResolver = null;

function ensureGeminiApiKey() {
    return new Promise((resolve) => {
        let key = sessionStorage.getItem(GEMINI_KEY_STORAGE);
        if (key) {
            resolve(key);
            return;
        }

        // Store the resolver and show the custom modal
        apiKeyResolver = resolve;
        document.getElementById('apikey-modal').style.display = 'flex';
    });
}

function submitApiKey() {
    const input = document.getElementById('apikey-input');
    const key = input ? input.value.trim() : "";

    if (!key) {
        alert("Please enter a valid Gemini API key to continue.");
        return;
    }

    sessionStorage.setItem(GEMINI_KEY_STORAGE, key);
    input.value = ""; // Clear password field
    document.getElementById('apikey-modal').style.display = 'none';

    if (apiKeyResolver) {
        apiKeyResolver(key);
        apiKeyResolver = null;
    }
}

function apiHeaders(extra) {
    const headers = Object.assign({ "Content-Type": "application/json" }, extra || {});
    const key = sessionStorage.getItem(GEMINI_KEY_STORAGE);
    if (key) headers["X-Gemini-Api-Key"] = key;
    return headers;
}
const classDescriptions = {
    "Kinetic": "A psychic hero who uses the power of their mind to throw objects, build forcefields, and control enemies.",
    "Vanguard": "A superhuman brawler who relies on extreme physical speed, giant size, and unbreakable toughness.",
    "Elementalist": "A master of natural forces who attacks and defends using blasts of fire, water, earth, and more.",
    "Warden": "A fierce shape-shifter who can command explosive plant growth and transform into deadly wild animals."
};

// Toggle element dropdown if Elementalist is chosen in modal
function toggleElementSelector() {
    const classVal = document.getElementById('hero-class-select').value;
    const elemContainer = document.getElementById('element-container');
    if (elemContainer) {
        elemContainer.style.display = classVal === 'Elementalist' ? 'block' : 'none';
    }
}

// Triggered when clicking "New Game" from the main menu
async function startNewGame() {
    console.log("[Step 1] startNewGame triggered");
    const key = await ensureGeminiApiKey();
    if (!key) return;

    document.getElementById('start-modal').style.display = 'none';
    const creationModal = document.getElementById('creation-modal');
    if (creationModal) {
        creationModal.style.display = 'flex';
    } else {
        submitCharacterCreation();
    }
}

// Triggered when clicking "Begin Journey" inside the creation modal
async function submitCharacterCreation() {
    const nameInput = document.getElementById('hero-name-input');
    const classSelect = document.getElementById('hero-class-select');
    const elementSelect = document.getElementById('hero-element-select');

    const name = nameInput ? (nameInput.value || "Wanderer").trim() : "Wanderer";
    const charClass = classSelect ? classSelect.value : "Vanguard";
    const element = elementSelect ? elementSelect.value.toLowerCase() : "fire";

    const creationModal = document.getElementById('creation-modal');
    if (creationModal) creationModal.style.display = 'none';

    const log = document.getElementById('story-log');
    log.innerText = "Forging world...\n";
    
    if (typeof chatHistory === 'undefined') {
        window.chatHistory = [];
    } else {
        chatHistory = []; 
    }

    try {
        const res = await fetch('/api/start_game', {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify({ name: name, class: charClass, element: element })
        });
        
        if (!res.ok) {
            throw new Error(`Server Error: ${res.status}`);
        }

        const data = await res.json();
        
        characterState = data.character;
        updateUI();
        
        if (typeof updateNPCs === 'function') {
            updateNPCs(data.npc_ledger); 
        }

        if (data.atmosphere) {
            setAtmosphere(data.atmosphere);
        }
        
        log.innerHTML = renderChapterBanner(1) + `<div>${data.story}</div>`;
        if (typeof speakDM === 'function') {
            speakDM(data.story);
        }

        window.currentNpcLedger = data.npc_ledger; 
        autoSaveGame();

    } catch (error) {
        console.error("[CRASH DETECTED]:", error);
        log.innerText = `\n\n[System Error]: Failed to connect to the Game Master.\nDetails: ${error.message}`;
    }
}

function updateUI() {
    if (!characterState) return;

    // 1. Basic Stats
    document.getElementById('char-name').innerText = `${characterState.name} (Lvl ${characterState.level})`;
    document.getElementById('char-class').innerText = characterState.class;

    // 2. Health Bar
    document.getElementById('char-hp-text').innerText = `${characterState.hp} / ${characterState.max_hp}`;
    const hpPercent = Math.max(0, (characterState.hp / characterState.max_hp) * 100);
    const hpFill = document.getElementById('health-bar-fill');
    if (hpFill) hpFill.style.width = hpPercent + '%';

    if (hpPercent > 0 && hpPercent <= 25) {
        document.body.classList.add('low-hp');
    } else {
        document.body.classList.remove('low-hp');
    }

    // 3. Elemental Matrix
    const matrixDiv = document.getElementById('elemental-matrix');
    if (matrixDiv) {
        if (characterState.class === "Elementalist") {
            matrixDiv.style.display = "block";
            document.getElementById('primary-element').innerText = characterState.primary_element || "None";
            document.getElementById('affinity-element').innerText = characterState.affinity_element || "None";
            document.getElementById('struggle-element').innerText = characterState.struggle_element || "None";
        } else {
            matrixDiv.style.display = "none";
        }
    }

    // 4. Abilities List
    const abilitiesList = document.getElementById('abilities-list');
    if (abilitiesList) {
        abilitiesList.innerHTML = '';
        if (characterState.abilities) {
            characterState.abilities.forEach(ability => {
                let abilityName = typeof ability === 'string' ? ability : ability.name;
                let abilityDesc = typeof ability === 'string' ? "An ability forged in your journey." : ability.description;

                let details = document.createElement('details');
                details.className = 'ability-dropdown';
                
                let summary = document.createElement('summary');
                summary.innerText = abilityName;
                if (abilityName.includes("✦")) summary.classList.add("accent");
                
                let descDiv = document.createElement('div');
                descDiv.className = 'ability-desc';
                descDiv.innerText = abilityDesc;
                
                details.appendChild(summary);
                details.appendChild(descDiv);
                abilitiesList.appendChild(details);
            });
        }
    }

    // 5. Inventory
    const invList = document.getElementById('inventory-list');
    if (invList) {
        invList.innerHTML = '';
        if (characterState.inventory && characterState.inventory.length > 0) {
            characterState.inventory.forEach(item => {
                let li = document.createElement('li');
                li.className = 'inventory-item';
                
                // Tag items that can be eaten/drank
                const isConsumable = item.toLowerCase().match(/(potion|pizza|shawarma|apple)/);
                if (isConsumable) {
                    li.innerHTML = `${item} <button onclick="useItem('${item}')" style="padding: 2px 6px; font-size: 0.7em; margin-left: 10px;">Use</button>`;
                } else {
                    li.innerText = item;
                }
                invList.appendChild(li);
            });
        } else {
            let li = document.createElement('li');
            li.className = 'inventory-item empty';
            li.innerText = 'Backpack is empty';
            invList.appendChild(li);
        }
    }
}

async function useItem(itemName) {
    const res = await fetch('/api/consume', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ character: characterState, item: itemName })
    });
    
    if (res.ok) {
        const data = await res.json();
        characterState = data.character;
        updateUI();
        
        const log = document.getElementById('story-log');
        log.innerHTML += data.narrative;
        log.scrollTop = log.scrollHeight;
        autoSaveGame();
    }
}

async function sendAction() {
    const input = document.getElementById('action-input');
    const action = input.value.trim();
    if(!action || !characterState) return;

    const log = document.getElementById('story-log');
    log.innerText += `\n\n> ${action}\n\n`;
    input.value = '';
    log.scrollTop = log.scrollHeight;

    const res = await fetch('/api/action', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ action: action, character: characterState, history: chatHistory })
    });

    // Capture existing chapter before updating characterState
    const previousChapter = characterState ? characterState.current_chapter : 1;

    const data = await res.json();
    
    // 1. Update core states
    characterState = data.character;
    window.currentNpcLedger = data.npc_ledger;
    const currentChapter = characterState.current_chapter || 1;

    // Check if the chapter advanced
    if (currentChapter > previousChapter) {
        log.innerHTML += `\n${renderChapterBanner(currentChapter)}\n`;
    }

    // 2. Update the UI
    updateUI();
    updateNPCs(data.npc_ledger);

    if (data.atmosphere) {
        setAtmosphere(data.atmosphere);
    }

    // 3. Append the instant Roll Badge
    if (data.d20_roll) {
        let rollClass = "roll-success";
        let rollText = "Success";
        
        if (data.d20_roll === 1) {
            rollClass = "roll-crit-fail";
            rollText = "Critical Failure!";
            triggerScreenEffect('crit-fail-anim');
        } else if (data.d20_roll === 20) {
            rollClass = "roll-crit-success";
            rollText = "Critical Success!";
            triggerScreenEffect('crit-success-anim');
        } else if (data.d20_roll <= 10) {
            rollClass = "roll-fail";
            rollText = "Failure";
        }
        log.innerHTML += `\n<div class="roll-badge ${rollClass}">🎲 Roll: ${data.d20_roll} (${rollText})</div>\n\n`;
    }

    // 4. Update the short-term memory buffer (Garbage Collection)
    chatHistory.push({ role: "Hero", content: action });
    chatHistory.push({ role: "Game Master", content: data.narrative.replace(/\*/g, '') });
    if (chatHistory.length > 6) {
        chatHistory = chatHistory.slice(chatHistory.length - 6);
    }

    // 5. Fire Audio Asynchronously 
    // Pushing this to the back of the event loop ensures it never blocks the DOM
    setTimeout(() => {
        if (typeof speakDM === 'function') {
            speakDM(data.narrative.replace(/\*/g, ''));
        }
    }, 0);

    // 6. Fast Typewriter Effect & End-of-Turn Checks
    const textContainer = document.createElement('span');
    log.appendChild(textContainer);
    
    let i = 0;
    const textToType = data.narrative;
    const actionInput = document.getElementById('action-input');
    const actionButton = document.getElementById('action-button');
    
    // Disable input while typing to prevent overlap
    actionInput.disabled = true;
    actionButton.disabled = true;

    function typeWriter() {
        if (i < textToType.length) {
            textContainer.innerHTML += textToType.charAt(i);
            i++;
            log.scrollTop = log.scrollHeight; // Auto-scroll with text
            setTimeout(typeWriter, 5); // 5ms delay = incredibly fast typing
        } else {
            // Re-enable inputs once finished
            actionInput.disabled = false;
            actionButton.disabled = false;
            actionInput.focus();

            // Check for game-altering events
            if (data.is_dead) {
                document.getElementById('death-modal').style.display = 'flex';
            } else if (data.path_choices) {
                showPathModal(data.path_choices);
            }
            
            // SAVE EVERYTHING AFTER TYPING COMPLETES
            autoSaveGame();
        }
    }
    
    typeWriter();
}

function showJournal() {
    const journalContent = document.getElementById('journal-content');
    
    if (characterState && characterState.campaign_summary) {
        // Render the AI's long-term memory
        journalContent.innerText = characterState.campaign_summary;
    } else {
        // Fallback for new games
        journalContent.innerText = "The pages are blank. Your legend has just begun.";
    }
    
    document.getElementById('journal-modal').style.display = 'flex';
}

function showPathModal(choices) {
    const container = document.getElementById('path-container');
    container.innerHTML = '';
    
    for (const [pathName, abilities] of Object.entries(choices)) {
        let html = `
        <div class="path-card">
            <h3>${pathName}</h3>
            <ul>${abilities.map(a => `
                <li style="margin-bottom: 15px;">
                    <strong style="color: #fff;">${a.name}</strong><br>
                    <span style="font-size: 0.85em; color: #9ca3af;">${a.description}</span>
                </li>`).join('')}
            </ul>
            <button onclick="selectPath('${pathName}')">Ascend to ${pathName}</button>
        </div>`;
        container.innerHTML += html;
    }
    document.getElementById('path-modal').style.display = 'flex';
}

async function selectPath(pathName) {
    document.getElementById('path-modal').style.display = 'none';
    
    const res = await fetch('/api/choose_path', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ character: characterState, path: pathName })
    });
    
    const data = await res.json();
    characterState = data.character;
    updateUI();
    
    const log = document.getElementById('story-log');
    log.innerText += data.narrative;
    log.scrollTop = log.scrollHeight;

    speakDM(data.narrative.replace(/\*/g, ''));
    autoSaveGame();
}

function setAtmosphere(mood) {
    const root = document.documentElement;
    const moodIndicator = document.getElementById('mood-indicator');
    if (moodIndicator) moodIndicator.innerText = mood;

    if (mood === 'mystical') {
        root.style.setProperty('--panel-bg', 'rgba(45, 27, 78, 0.85)');
        root.style.setProperty('--accent-color', '#ffd700'); 
        root.style.setProperty('--wash-top-left', 'rgba(128, 0, 128, 0.25)'); // Purple
        root.style.setProperty('--wash-side-right', 'rgba(255, 215, 0, 0.15)'); // Gold
        
    } else if (mood === 'icy') {
        root.style.setProperty('--panel-bg', 'rgba(30, 41, 59, 0.85)');
        root.style.setProperty('--accent-color', '#00ffff'); 
        root.style.setProperty('--wash-top-left', 'rgba(0, 0, 255, 0.2)'); // Blue
        root.style.setProperty('--wash-side-right', 'rgba(0, 255, 255, 0.2)'); // Cyan
        
    } else if (mood === 'combat') {
        root.style.setProperty('--panel-bg', 'rgba(63, 15, 15, 0.85)');
        root.style.setProperty('--accent-color', '#ff4444'); 
        root.style.setProperty('--wash-top-left', 'rgba(255, 0, 0, 0.25)'); // Harsh Red
        root.style.setProperty('--wash-side-right', 'rgba(244, 253, 255, 0.12)'); // Cool White
        
    } else if (mood === 'forest') {
        root.style.setProperty('--panel-bg', 'rgba(15, 51, 34, 0.85)');
        root.style.setProperty('--accent-color', '#4ade80'); 
        root.style.setProperty('--wash-top-left', 'rgba(255, 105, 180, 0.2)'); // Pink
        root.style.setProperty('--wash-side-right', 'rgba(255, 165, 0, 0.15)'); // Orange
        
    } else {
        // Default Neutral Wash
        root.style.setProperty('--panel-bg', 'rgba(31, 41, 55, 0.95)');
        root.style.setProperty('--accent-color', '#3b82f6');
        root.style.setProperty('--wash-top-left', 'rgba(59, 130, 246, 0.1)');
        root.style.setProperty('--wash-side-right', 'transparent');
    }
}

function updateNPCs(ledger) {
    const panel = document.getElementById('npc-panel');
    const list = document.getElementById('npc-list');
    
    if (!ledger || Object.keys(ledger).length === 0) {
        panel.style.display = 'none';
        return;
    }

    panel.style.display = 'block';
    list.innerHTML = '';

    for (const [name, info] of Object.entries(ledger)) {
        const card = document.createElement('div');
        card.className = 'npc-card';

        // Choose badge color based on key phrases in disposition
        let dispClass = 'badge-neutral';
        const dispLower = (info.disposition || '').toLowerCase();
        
        if (dispLower.includes('friendly') || dispLower.includes('ally') || dispLower.includes('loyal')) {
            dispClass = 'badge-friendly';
        } else if (dispLower.includes('hostile') || dispLower.includes('enemy') || dispLower.includes('terrified')) {
            dispClass = 'badge-hostile';
        } else if (dispLower.includes('indebted') || dispLower.includes('trust')) {
            dispClass = 'badge-indebted';
        }

        card.innerHTML = `
            <div class="npc-header">
                <span class="npc-name">${name}</span>
                <span class="npc-badge ${dispClass}">${info.disposition}</span>
            </div>
            <div class="npc-notes">${info.notes}</div>
        `;
        list.appendChild(card);
    }
}

function confirmNewGame() {
    if (confirm("Start a new game? Any unsaved progress in this session will be lost.")) {
        startNewGame();
    }
}

// Return to Main Menu (Safe Local Exit)
function goToMainMenu() {
    if (confirm("Return to main menu? Make sure to save your game first.")) {
        window.speechSynthesis.cancel();
        window.location.reload();
    }
}

function exitGame() {
    if (confirm("Are you sure you want to exit? Your progress has been saved locally.")) {
        window.location.reload(); 
    }
}

// --- Silent Background Autosave ---
function autoSaveGame() {
    if (!characterState) return;
    const autoSaveData = {
        character: characterState,
        history: chatHistory,
        npc_ledger: window.currentNpcLedger || {},
        story_log_html: document.getElementById("story-log").innerHTML,
        saved_at: new Date().toISOString()
    };
    localStorage.setItem("eternity_autosave", JSON.stringify(autoSaveData));
}

// --- Manual Save to PC (File Download) ---
function exportSaveFile() {
    if (!characterState) {
        alert("No active game to export!");
        return;
    }
    const saveData = {
        character: characterState,
        history: chatHistory,
        npc_ledger: window.currentNpcLedger || {},
        story_log_html: document.getElementById("story-log").innerHTML,
        saved_at: new Date().toLocaleString()
    };

    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${characterState.name}_eternity_save.json`;
    a.click();
    URL.revokeObjectURL(url);
}

// --- Import Save from PC ---
function importSaveFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            loadStateIntoGame(data);
            alert("Save file loaded successfully!");
        } catch (err) {
            alert("Invalid save file format.");
        }
    };
    reader.readAsText(file);
    event.target.value = ""; 
}

// --- Shared State Loader ---
function loadStateIntoGame(data) {
    characterState = data.character;
    chatHistory = data.history || [];
    window.currentNpcLedger = data.npc_ledger || {};

    document.getElementById("story-log").innerHTML = data.story_log_html || "";
    updateUI();
    updateNPCs(window.currentNpcLedger);
    document.getElementById("start-modal").style.display = "none";
    const creationModal = document.getElementById('creation-modal');
    if (creationModal) creationModal.style.display = 'none';

    autoSaveGame();
}

// --- Check for Autosave on Start / Resume ---
async function loadAutosave() {
    const key = await ensureGeminiApiKey();
    if (!key) return;

    const raw = localStorage.getItem("eternity_autosave");
    if (!raw) {
        alert("No autosaved game found.");
        return;
    }
    try {
        const data = JSON.parse(raw);
        loadStateIntoGame(data);
    } catch (err) {
        console.error("Autosave load error:", err);
    }
}
function triggerScreenEffect(className) {
    const gameScreen = document.getElementById('main-game');
    gameScreen.classList.add(className);
    setTimeout(() => {
        gameScreen.classList.remove(className);
    }, 800); 
}