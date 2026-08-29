// Global State & Settings
let voiceEnabled = true;
let currentDMAudio = null;
let ttsVolume = 1.0;
let ttsSpeed = 1.0;
let currentSize = 1.0;
let previousHP = 20;

let characterState = null;
let chatHistory = [];
const GEMINI_KEY_STORAGE = "eternity_gemini_api_key";
const GEMINI_KEY_URL = "https://ai.google.dev/gemini-api/docs/api-key";
let apiKeyResolver = null;

const CHAPTER_TITLES = {
    1: "The Awakening",
    2: "The Shadow Ambush",
    3: "The Glimmering Nuisance",
    4: "The Prism Mechanism",
    5: "The Betrayal",
    6: "The World-Forge Climax",
    7: "The Legacy"
};

const classDescriptions = {
    "Kinetic": "A psychic hero who uses the power of their mind to throw objects, build forcefields, and control enemies.",
    "Vanguard": "A superhuman brawler who relies on extreme physical speed, giant size, and unbreakable toughness.",
    "Elementalist": "A master of natural forces who attacks and defends using blasts of fire, water, earth, and more.",
    "Warden": "A fierce shape-shifter who can command explosive plant growth and transform into deadly wild animals."
};
let isUserScrolling = false;
// --- Initialization & Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    const volSlider = document.getElementById('tts-vol');
    if (volSlider) volSlider.addEventListener('input', (e) => {
        ttsVolume = parseFloat(e.target.value);
        if (currentDMAudio && voiceEnabled) currentDMAudio.volume = ttsVolume;
    });

    const speedSlider = document.getElementById('tts-speed');
    if (speedSlider) speedSlider.addEventListener('input', (e) => {
        ttsSpeed = parseFloat(e.target.value);
        if (currentDMAudio) currentDMAudio.playbackRate = ttsSpeed;
    });

    const storyLog = document.getElementById('story-log');
    if (storyLog) {
        storyLog.addEventListener('scroll', function() {
            // A 20px buffer prevents false positives when the typewriter is active
            isUserScrolling = (this.scrollTop + this.clientHeight) < (this.scrollHeight - 20);
        });
    }
});

// --- Quality of Life Modifiers ---
function scaleText(direction) {
    currentSize += (direction === 'up') ? 0.1 : -0.1;
    document.documentElement.style.setProperty('--story-size', `${currentSize}rem`);
}

function renderChapterBanner(chapterNum) {
    const title = CHAPTER_TITLES[chapterNum] || "A New Journey";
    return `
        <div class="chapter-banner">
            <div class="chapter-number">Chapter ${chapterNum}</div>
            <div class="chapter-title">${title}</div>
        </div>
    `;
}

// --- Audio & TTS ---
async function speakDM(text) {
    if (!text) return;
    
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
            
            currentDMAudio.volume = voiceEnabled ? ttsVolume : 0.0;
            currentDMAudio.playbackRate = ttsSpeed;
            currentDMAudio.play();
            serverAudioSucceeded = true;
        }
    } catch (error) {
        console.warn("Server voice generation failed, falling back to browser TTS:", error);
    }

    if (!serverAudioSucceeded && voiceEnabled) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = ttsSpeed;
        utterance.volume = ttsVolume;
        window.speechSynthesis.speak(utterance);
    }
}

function toggleMute() {
    voiceEnabled = !voiceEnabled;
    const muteBtn = document.getElementById('mute-btn');
    
    if (voiceEnabled) {
        muteBtn.innerText = '🔊 Mute';
        if (currentDMAudio) currentDMAudio.volume = ttsVolume;
    } else {
        muteBtn.innerText = '🔇 Unmute';
        if (currentDMAudio) currentDMAudio.volume = 0.0;
        window.speechSynthesis.cancel();
    }
}

window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

// --- Authentication & Setup ---
function ensureGeminiApiKey() {
    return new Promise((resolve) => {
        let key = sessionStorage.getItem(GEMINI_KEY_STORAGE);
        if (key) {
            resolve(key);
            return;
        }
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
    input.value = ""; 
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

function toggleElementSelector() {
    const classVal = document.getElementById('hero-class-select').value;
    const elemContainer = document.getElementById('element-container');
    if (elemContainer) {
        elemContainer.style.display = classVal === 'Elementalist' ? 'block' : 'none';
    }
}

// --- Game Logic ---
async function startNewGame() {
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
        
        if (!res.ok) throw new Error(`Server Error: ${res.status}`);

        const data = await res.json();
        
        characterState = data.character;
        previousHP = characterState.hp; // Establish baseline
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

    // 2. Health Bar & Trend Indicator
    const hpText = document.getElementById('char-hp-text');
    hpText.classList.remove("trend-up", "trend-down");
    void hpText.offsetWidth; // Force CSS reflow to restart animation

    if (characterState.hp > previousHP) hpText.classList.add("trend-up");
    if (characterState.hp < previousHP) hpText.classList.add("trend-down");
    previousHP = characterState.hp;

    hpText.innerText = `${characterState.hp} / ${characterState.max_hp}`;
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

    // 5. Smart Categorized Inventory
    const invList = document.getElementById('inventory-list');
    if (invList) {
        invList.innerHTML = '';
        const inv = characterState.inventory;
        
        const renderCategory = (title, items) => {
            if (!items || items.length === 0) return;
            
            let categoryHeader = document.createElement('div');
            categoryHeader.className = 'inv-category-header';
            categoryHeader.innerHTML = `<strong style="color: #fff; border-bottom: 1px solid #444; display: block; margin-top: 10px; padding-bottom: 3px;">${title}</strong>`;
            invList.appendChild(categoryHeader);

            items.forEach(item => {
                let li = document.createElement('li');
                li.className = 'inventory-item';
                
                const isConsumable = item.toLowerCase().match(/(potion|pizza|shawarma|apple)/);
                if (isConsumable && title === "Consumables") {
                    li.innerHTML = `${item} <button onclick="useItem('${item}')" style="padding: 2px 6px; font-size: 0.7em; margin-left: 10px;">Use</button>`;
                } else {
                    li.innerText = item;
                }
                invList.appendChild(li);
            });
        };

        if (inv && (inv.consumables?.length > 0 || inv.equipment?.length > 0 || inv.quest_items?.length > 0)) {
            renderCategory("Consumables", inv.consumables);
            renderCategory("Equipment", inv.equipment);
            renderCategory("Quest Items", inv.quest_items);
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
        body: JSON.stringify({ item: itemName })
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

function quickSave(slot) {
    if (!characterState) return alert("No active game to save.");
    const saveData = {
        character: characterState,
        history: chatHistory,
        npc_ledger: window.currentNpcLedger || {},
        story_log_html: document.getElementById("story-log").innerHTML,
        saved_at: new Date().toISOString()
    };
    localStorage.setItem(`eternity_quicksave_${slot}`, JSON.stringify(saveData));
    alert(`Progress saved to Quick Slot ${slot}.`);
}

function quickLoad(slot) {
    const raw = localStorage.getItem(`eternity_quicksave_${slot}`);
    if (!raw) return alert("Quick Slot is empty.");
    loadStateIntoGame(JSON.parse(raw));
    alert("Quick Save loaded.");
}

document.addEventListener('DOMContentLoaded', () => {
    const actionInput = document.getElementById('action-input');
    const autoPopup = document.getElementById('autocomplete-popup');

    if (actionInput && autoPopup) {
        actionInput.addEventListener('input', (e) => {
            if (!characterState) return;
            const val = e.target.value.toLowerCase();
            let suggestions = [];
            
            if (val.startsWith("cast ") || val.startsWith("use ")) {
                const term = val.split(" ").slice(1).join(" ");
                
                if (characterState.abilities) {
                    suggestions.push(...characterState.abilities.map(a => typeof a === 'string' ? a : a.name));
                }
                if (characterState.inventory && characterState.inventory.consumables) {
                    suggestions.push(...characterState.inventory.consumables);
                }
                
                if (term) {
                    suggestions = suggestions.filter(s => s.toLowerCase().includes(term));
                }
            }

            if (suggestions.length > 0) {
                autoPopup.innerHTML = suggestions.map(s => 
                    `<div class="auto-item" onclick="selectAutocomplete('${val.split(" ")[0]} ${s}')" style="padding: 5px; cursor: pointer; border-bottom: 1px solid #4b5563; color: #fff;">${s}</div>`
                ).join('');
                autoPopup.style.display = 'block';
            } else {
                autoPopup.style.display = 'none';
            }
        });

        // Hide popup when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (e.target.id !== 'action-input') autoPopup.style.display = 'none';
        });
    }
});

// Expose selection function to the global window
window.selectAutocomplete = function(fullText) {
    const actionInput = document.getElementById('action-input');
    const autoPopup = document.getElementById('autocomplete-popup');
    actionInput.value = fullText;
    autoPopup.style.display = 'none';
    actionInput.focus();
};

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
        body: JSON.stringify({ action: action })
    });

    const previousChapter = characterState ? characterState.current_chapter : 1;
    const data = await res.json();
    
    characterState = data.character;
    window.currentNpcLedger = data.npc_ledger;
    const currentChapter = characterState.current_chapter || 1;

    if (currentChapter > previousChapter) {
        log.innerHTML += `\n${renderChapterBanner(currentChapter)}\n`;
    }

    updateUI();
    updateNPCs(data.npc_ledger);

    if (data.atmosphere) {
        setAtmosphere(data.atmosphere);
    }

    if (data.d20_roll) {
        const rollId = 'roll-' + Date.now();
        log.innerHTML += `\n<div id="${rollId}" class="roll-badge badge-neutral">🎲 Roll: <span class="roll-number">?</span></div>\n\n`;
        
        const rollElement = document.getElementById(rollId);
        const numSpan = rollElement.querySelector('.roll-number');
        let cycleCount = 0;
        
        // Cycle numbers rapidly for 1 second (20 iterations at 50ms)
        const rollInterval = setInterval(() => {
            numSpan.innerText = Math.floor(Math.random() * 20) + 1;
            cycleCount++;
            
            if (cycleCount >= 20) {
                clearInterval(rollInterval);
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
                
                rollElement.className = `roll-badge ${rollClass}`;
                rollElement.innerHTML = `🎲 Roll: ${data.d20_roll} (${rollText})`;
                
                if (!isUserScrolling) log.scrollTop = log.scrollHeight;
            }
        }, 50);
    }

    chatHistory.push({ role: "Hero", content: action });
    chatHistory.push({ role: "Game Master", content: data.narrative.replace(/\*/g, '') });
    if (chatHistory.length > 6) {
        chatHistory = chatHistory.slice(chatHistory.length - 6);
    }

    setTimeout(() => {
        if (typeof speakDM === 'function') {
            speakDM(data.narrative.replace(/\*/g, ''));
        }
    }, 0);

    const textContainer = document.createElement('span');
    log.appendChild(textContainer);
    
    let i = 0;
    const textToType = data.narrative;
    const actionInput = document.getElementById('action-input');
    const actionButton = document.getElementById('action-button');
    
    actionInput.disabled = true;
    actionButton.disabled = true;

    

    function typeWriter() {
        if (i < textToType.length) {
            textContainer.innerHTML += textToType.charAt(i);
            i++;
            
            // Replace the old line with this conditional block
            if (!isUserScrolling) {
                log.scrollTop = log.scrollHeight; 
            }
            
            setTimeout(typeWriter, 5); 
        } else {
            actionInput.disabled = false;
            actionButton.disabled = false;
            actionInput.focus();

            if (data.is_dead) {
                document.getElementById('death-modal').style.display = 'flex';
            } else if (data.path_choices) {
                showPathModal(data.path_choices);
            }
            
            autoSaveGame();
        }
    }
    
    typeWriter();
}

function showJournal() {
    const journalContent = document.getElementById('journal-content');
    
    if (characterState && characterState.campaign_summary) {
        journalContent.innerText = characterState.campaign_summary;
    } else {
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
        root.style.setProperty('--wash-top-left', 'rgba(128, 0, 128, 0.25)');
        root.style.setProperty('--wash-side-right', 'rgba(255, 215, 0, 0.15)');
        
    } else if (mood === 'icy') {
        root.style.setProperty('--panel-bg', 'rgba(30, 41, 59, 0.85)');
        root.style.setProperty('--accent-color', '#00ffff'); 
        root.style.setProperty('--wash-top-left', 'rgba(0, 0, 255, 0.2)'); 
        root.style.setProperty('--wash-side-right', 'rgba(0, 255, 255, 0.2)'); 
        
    } else if (mood === 'combat') {
        root.style.setProperty('--panel-bg', 'rgba(63, 15, 15, 0.85)');
        root.style.setProperty('--accent-color', '#ff4444'); 
        root.style.setProperty('--wash-top-left', 'rgba(255, 0, 0, 0.25)'); 
        root.style.setProperty('--wash-side-right', 'rgba(244, 253, 255, 0.12)'); 
        
    } else if (mood === 'forest') {
        root.style.setProperty('--panel-bg', 'rgba(15, 51, 34, 0.85)');
        root.style.setProperty('--accent-color', '#4ade80'); 
        root.style.setProperty('--wash-top-left', 'rgba(255, 105, 180, 0.2)'); 
        root.style.setProperty('--wash-side-right', 'rgba(255, 165, 0, 0.15)'); 
        
    } else {
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

// --- Save & Load Handlers ---
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

function loadStateIntoGame(data) {
    characterState = data.character;
    previousHP = characterState.hp; // Reset baseline upon loading
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