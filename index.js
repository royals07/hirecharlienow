const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Comprehensive list of bad words (expanded)
const badWords = [
    'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 'piss',
    'dick', 'cock', 'bastard', 'whore', 'slut', 'fag', 'cunt',
    'asshole', 'pussy', 'nigger', 'nigga', 'retard', 'wanker', 'bollocks',
    'choad', 'douchebag', 'motherfucker', 'prick', 'scumbag', 'turd', 'twat',
    'blowjob', 'clit', 'cum', 'ejaculate', 'fellatio', 'jizz', 'masturbate',
    'orgasm', 'wank', 'boner', 'dildo', 'shag', 'arse', 'bugger',
    'knob', 'tosser', 'git', 'minge', 'slag', 'sod', 'pillock',
    // Common variations and misspellings
    'fuk', 'fck', 'sht', 'btch', 'dck', 'cnt', 'fck', 'bullshit',
    'horseshit', 'jackass', 'dumbass', 'fatass', 'smartass',
];

// Function to replace profanity with asterisks
function filterProfanity(text) {
    let filtered = text;
    badWords.forEach(word => {
        // Create regex that catches:
        // 1. Whole words with word boundaries
        // 2. Leetspeak variations (a->@/4, e->3, i->1, o->0, s->5)
        const leetWord = word
            .replace(/a/g, '[a@4]')
            .replace(/e/g, '[e3]')
            .replace(/i/g, '[i1!]')
            .replace(/o/g, '[o0]')
            .replace(/s/g, '[s$5]');
        
        const regex = new RegExp(`\\b${word}\\b|${leetWord}`, 'gi');
        filtered = filtered.replace(regex, '*'.repeat(word.length));
    });
    return filtered;
}

// Function to check if a string contains any profanity
function containsProfanity(text) {
    const lowerText = text.toLowerCase();
    return badWords.some(word => {
        // Check for whole word
        const simpleRegex = new RegExp(`\\b${word}\\b`, 'i');
        if (simpleRegex.test(lowerText)) return true;

        // Check for leetspeak variations
        const leetWord = word
            .replace(/a/g, '[a@4]')
            .replace(/e/g, '[e3]')
            .replace(/i/g, '[i1!]')
            .replace(/o/g, '[o0]')
            .replace(/s/g, '[s$5]');
        
        const leetRegex = new RegExp(leetWord, 'i');
        return leetRegex.test(lowerText);
    });
}

/**
 * Cloud Function to moderate new guestbook messages.
 * Triggered when a new message is written to /guestbook/{pushId}.
 * It filters profanity and updates the message before it's finalized.
 */
exports.moderateGuestbookMessage = functions.database.ref('/guestbook/{pushId}')
    .onCreate(async (snapshot, context) => {
        const originalMessage = snapshot.val();
        const messageKey = context.params.pushId;

        console.log('New message received:', messageKey, originalMessage);

        // Ensure the message has necessary fields for filtering
        if (!originalMessage || !originalMessage.name || !originalMessage.message) {
            console.log('Message is missing name or message field, skipping moderation.');
            return null;
        }

        let name = originalMessage.name;
        let messageText = originalMessage.message;
        let hasProfanity = false;

        // Check and filter name
        if (containsProfanity(name)) {
            name = filterProfanity(name);
            hasProfanity = true;
            console.log('Profanity filtered in name');
        }

        // Check and filter message text
        if (containsProfanity(messageText)) {
            messageText = filterProfanity(messageText);
            hasProfanity = true;
            console.log('Profanity filtered in message');
        }

        // If no profanity was found, just return
        if (!hasProfanity) {
            console.log('No profanity found, message remains as is.');
            return null;
        }

        // If profanity was found and filtered, update the database entry
        console.log('Profanity detected and filtered. Updating message.');
        return snapshot.ref.update({
            name: name,
            message: messageText,
            moderated: true // <--- ADD THIS LINE
        });
    });
