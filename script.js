const romanInput = document.getElementById('romanInput');
const nepaliOutput = document.getElementById('nepaliOutput');

// Debounce function to prevent API spamming
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Controller to abort pending requests
let currentController = null;
const translationCache = new Map();

// Function to call our backend proxy
async function fetchTransliteration(text) {
    const trimmed = text.trim();
    if (!trimmed) {
        nepaliOutput.value = '';
        return;
    }

    // Check Cache first (Instant result)
    if (translationCache.has(trimmed)) {
        nepaliOutput.value = translationCache.get(trimmed);
        return;
    }

    // Cancel previous request if it exists
    if (currentController) {
        currentController.abort();
    }
    currentController = new AbortController();
    const signal = currentController.signal;

    try {
        const response = await fetch('/api/transliterate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text }),
            signal: signal
        });

        const data = await response.json();

        if (data.result) {
            nepaliOutput.value = data.result;
            // Save to cache
            translationCache.set(trimmed, data.result);
        } else {
            console.warn('No result from server:', data);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            // Request was aborted, ignore
            return;
        }
        console.error('Error fetching transliteration:', error);
        // Only show error for non-aborted requests
        nepaliOutput.value = "Error: " + error.message;
    }
}

// Only run translation logic if the elements exist (i.e., on translate.html)
if (romanInput && nepaliOutput) {
    // Debounced handler (Extreme 10ms)
    const handleInput = debounce((e) => {
        fetchTransliteration(e.target.value);
    }, 10);

    romanInput.addEventListener('input', handleInput);
}

// Unicode Converter Logic (for unicode.html)
const unicodeInput = document.getElementById('unicodeInput');
const unicodeOutput = document.getElementById('unicodeOutput');

if (unicodeInput && unicodeOutput) {
    const handleUnicodeInput = debounce(async (e) => {
        const text = e.target.value;
        if (!text.trim()) {
            unicodeOutput.value = '';
            return;
        }

        try {
            const response = await fetch('/api/unicode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            const data = await response.json();
            if (data.result) {
                unicodeOutput.value = data.result;
            }
        } catch (error) {
            console.error('Unicode Error:', error);
            unicodeOutput.value = 'Error converting text';
        }
    }, 20); // Slightly higher debounce for typing flow

    unicodeInput.addEventListener('input', handleUnicodeInput);
}

// Optional: toggle for Training UI is removed as we depend on Google now.
// If you want to keep manual overrides, we'd need to blend logic,
// but for "Google Backend" request, we rely purely on the API.

// --- Dark Mode & Mobile Menu Logic ---
// --- Dark Mode Logic ---
const themeToggleBtn = document.getElementById('themeToggle');
const rootElement = document.documentElement;
const storedTheme = localStorage.getItem('theme');

// Icons
const sunIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

const moonIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

function updateIcon(isDark) {
    if (themeToggleBtn) {
        themeToggleBtn.innerHTML = isDark ? sunIcon : moonIcon;
    }
}

// 1. Check preference on load
if (storedTheme === 'dark') {
    rootElement.setAttribute('data-theme', 'dark');
    updateIcon(true);
} else {
    rootElement.removeAttribute('data-theme');
    updateIcon(false);
}

// 2. Toggle Handler
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = rootElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            rootElement.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
            updateIcon(false);
        } else {
            rootElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            updateIcon(true);
        }
    });
}

// --- Learn Page: 100 Phrases Logic ---
const phrases = [
    // Greetings & Essentials (1-10)
    { nepali: "नमस्ते", roman: "Namaste", english: "Hello / Greetings" },
    { nepali: "तपाईंलाई कस्तो छ?", roman: "Tapai lai kasto cha?", english: "How are you?" },
    { nepali: "मलाई सञ्चै छ", roman: "Mlai sanchai cha", english: "I am fine" },
    { nepali: "धन्यवाद", roman: "Dhanyabad", english: "Thank you" },
    { nepali: "स्वागत छ", roman: "Swagat cha", english: "Welcome" },
    { nepali: "फेरि भेटौला", roman: "Pheri bhetaula", english: "See you again" },
    { nepali: "शुभ प्रभात", roman: "Subha prabhat", english: "Good morning" },
    { nepali: "शुभ रात्रि", roman: "Subha ratri", english: "Good night" },
    { nepali: "माफ गर्नुहोस्", roman: "Maaf garnuhos", english: "Excuse me / Sorry" },
    { nepali: "ठीक छ", roman: "Thik cha", english: "It's okay / Fine" },

    // Introduction (11-20)
    { nepali: "मेरो नाम ... हो", roman: "Mero naam ... ho", english: "My name is ..." },
    { nepali: "तपाईंको नाम के हो?", roman: "Tapaiko naam k ho?", english: "What is your name?" },
    { nepali: "म नेपालबाट हुँ", roman: "Ma Nepal bata hu", english: "I am from Nepal" },
    { nepali: "तपाईं कहाँ बस्नुहुन्छ?", roman: "Tapai kaha basnuhuncha?", english: "Where do you live?" },
    { nepali: "म काठमाडौंमा बस्छु", roman: "Ma Kathmandu ma baschu", english: "I live in Kathmandu" },
    { nepali: "म विद्यार्थी हुँ", roman: "Ma bidyarthi hu", english: "I am a student" },
    { nepali: "म काम गर्छु", roman: "Ma kaam garchu", english: "I work" },
    { nepali: "मलाई खुशी लाग्यो", roman: "Malai khushi lagyo", english: "Nice to meet you" },
    { nepali: "हामी साथी हौं", roman: "Hami sathi hau", english: "We are friends" },
    { nepali: "यो मेरो घर हो", roman: "Yo mero ghar ho", english: "This is my house" },

    // Common Questions (21-30)
    { nepali: "के?", roman: "K?", english: "What?" },
    { nepali: "कहाँ?", roman: "Kaha?", english: "Where?" },
    { nepali: "कहिले?", roman: "Kahile?", english: "When?" },
    { nepali: "किन?", roman: "Kina?", english: "Why?" },
    { nepali: "कसरी?", roman: "Kasari?", english: "How?" },
    { nepali: "को?", roman: "Ko?", english: "Who?" },
    { nepali: "कति?", roman: "Kati?", english: "How much/many?" },
    { nepali: "यो के हो?", roman: "Yo k ho?", english: "What is this?" },
    { nepali: "समय कति भयो?", roman: "Samaya kati bhayo?", english: "What time is it?" },
    { nepali: "बाटो कता छ?", roman: "Baato kata cha?", english: "Which way is it?" },

    // Numbers 1-10 (31-40)
    { nepali: "एक", roman: "Ek", english: "One" },
    { nepali: "दुई", roman: "Dui", english: "Two" },
    { nepali: "तीन", roman: "Teen", english: "Three" },
    { nepali: "चार", roman: "Chaar", english: "Four" },
    { nepali: "पाँच", roman: "Paanch", english: "Five" },
    { nepali: "छ", roman: "Chha", english: "Six" },
    { nepali: "सात", roman: "Saat", english: "Seven" },
    { nepali: "आठ", roman: "Aaath", english: "Eight" },
    { nepali: "नौ", roman: "Nau", english: "Nine" },
    { nepali: "दश", roman: "Das", english: "Ten" },

    // Family (41-50)
    { nepali: "आमा", roman: "Aama", english: "Mother" },
    { nepali: "बुबा", roman: "Buba", english: "Father" },
    { nepali: "छाेरा", roman: "Chora", english: "Son" },
    { nepali: "छाेरी", roman: "Chori", english: "Daughter" },
    { nepali: "दाइ", roman: "Dai", english: "Elder Brother" },
    { nepali: "भाइ", roman: "Bhai", english: "Younger Brother" },
    { nepali: "दिदी", roman: "Didi", english: "Elder Sister" },
    { nepali: "बहिनी", roman: "Bahini", english: "Younger Sister" },
    { nepali: "हजुरबुबा", roman: "Hajurbuba", english: "Grandfather" },
    { nepali: "हजुरआमा", roman: "Hajuraama", english: "Grandmother" },

    // Food & Dining (51-60)
    { nepali: "खाना", roman: "Khana", english: "Food / Meal" },
    { nepali: "पानी", roman: "Paani", english: "Water" },
    { nepali: "भात", roman: "Bhaat", english: "Rice" },
    { nepali: "तर्कारी", roman: "Tarkari", english: "Vegetable Curry" },
    { nepali: "चिया", roman: "Chiya", english: "Tea" },
    { nepali: "कफी", roman: "Coffee", english: "Coffee" },
    { nepali: "मिठो छ", roman: "Mitho cha", english: "It is tasty" },
    { nepali: "मलाई भोक लाग्यो", roman: "Malai bhok lagyo", english: "I am hungry" },
    { nepali: "मलाई प्यास लाग्यो", roman: "Malai pyas lagyo", english: "I am thirsty" },
    { nepali: "बिल दिनुहोस्", roman: "Bill dinuhos", english: "Please give the bill" },

    // Travel & Market (61-70)
    { nepali: "बस पार्क कहाँ छ?", roman: "Bus park kaha cha?", english: "Where is the bus park?" },
    { nepali: "कति पर्छ?", roman: "Kati parcha?", english: "How much does it cost?" },
    { nepali: "धेरै महँगो भयो", roman: "Dherai mahango bhayo", english: "Too expensive" },
    { nepali: "सस्तो छैन?", roman: "Sasto chaina?", english: "Isn't there anything cheaper?" },
    { nepali: "म किन्छु", roman: "Ma kinchu", english: "I will buy it" },
    { nepali: "मलाई थाहा छैन", roman: "Malai thaha chaina", english: "I don't know" },
    { nepali: "मलाई बुझ्न गाह्रो भयो", roman: "Malai bujhna garo bhayo", english: "I didn't understand" },
    { nepali: "बिस्तारै बोल्नुहोस्", roman: "Bistarai bolnuhos", english: "Please speak slowly" },
    { nepali: "यहाँ रोक्नुहोस्", roman: "Yaha roknuhos", english: "Stop here" },
    { nepali: "जाऔं", roman: "Jaau", english: "Let's go" },

    // Feelings & Misc (71-80)
    { nepali: "खुशी", roman: "Khushi", english: "Happy" },
    { nepali: "दुखी", roman: "Dukhi", english: "Sad" },
    { nepali: "रिसाएको", roman: "Risaeko", english: "Angry" },
    { nepali: "माया", roman: "Maya", english: "Love" },
    { nepali: "राम्रो", roman: "Ramro", english: "Good / Beautiful" },
    { nepali: "नराम्रो", roman: "Naramro", english: "Bad" },
    { nepali: "तातो", roman: "Taato", english: "Hot" },
    { nepali: "चिसो", roman: "Chiso", english: "Cold" },
    { nepali: "नयाँ", roman: "Naya", english: "New" },
    { nepali: "पुरानो", roman: "Purano", english: "Old" },

    // Days of Week (81-87)
    { nepali: "आइतबार", roman: "Aaitabar", english: "Sunday" },
    { nepali: "सोमबार", roman: "Sombar", english: "Monday" },
    { nepali: "मंगलबार", roman: "Mangalbar", english: "Tuesday" },
    { nepali: "बुधबार", roman: "Budhbar", english: "Wednesday" },
    { nepali: "बिहीबार", roman: "Bihibar", english: "Thursday" },
    { nepali: "शुक्रबार", roman: "Shukrabar", english: "Friday" },
    { nepali: "शनिबार", roman: "Shanibar", english: "Saturday" },

    // Weather & Nature (88-95)
    { nepali: "घाम", roman: "Ghaam", english: "Sun / Sunshine" },
    { nepali: "पानी पर्यो", roman: "Paani paryo", english: "It rained" },
    { nepali: "हिमाल", roman: "Himal", english: "Mountain" },
    { nepali: "नदी", roman: "Nadi", english: "River" },
    { nepali: "हावा", roman: "Hawa", english: "Wind" },
    { nepali: "आकाश", roman: "Aakash", english: "Sky" },
    { nepali: "रुख", roman: "Rukh", english: "Tree" },
    { nepali: "फूल", roman: "Phool", english: "Flower" },

    // Final Essentials (96-100)
    { nepali: "हो", roman: "Ho", english: "Yes" },
    { nepali: "हैन", roman: "Haina", english: "No" },
    { nepali: "अहिले", roman: "Ahile", english: "Now" },
    { nepali: "पछि", roman: "Pachi", english: "Later" },
    { nepali: "आज", roman: "Aaja", english: "Today" }
];

function renderPhrases() {
    const grid = document.getElementById("phraseGrid");
    if (!grid) return; // Only run on Learn page

    grid.innerHTML = ""; // Clear existing

    phrases.forEach(phrase => {
        const card = document.createElement("div");
        card.className = "phrase-card";

        // Use backend proxy to avoid CORS
        // The server at /api/tts fetches from Google and streams back audio/mpeg
        // This makes it look like a local file to the browser
        const audioUrl = `/api/tts?text=${encodeURIComponent(phrase.nepali)}`;

        // Mobile/Click Interaction
        card.addEventListener("click", () => {
            // Create Audio object
            const audio = new Audio(audioUrl);
            // Play it
            audio.play().catch(e => console.error("Audio playback error:", e));
        });

        card.innerHTML = `
            <span class="nepali-text">${phrase.nepali}</span>
            <span class="pronunciation">${phrase.roman}</span>
            <span class="meaning">${phrase.english}</span>
            <div class="audio-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Initialize on load
renderPhrases();
