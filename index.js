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
    'fuk', 'fck', 'sht', 'btch', 'dck', 'cnt', 'fck', 'bullshit',
    'horseshit', 'jackass', 'dumbass', 'fatass', 'smartass',
];

// Function to replace profanity with asterisks
function filterProfanity(text) {
    let filtered = text;
    badWords.forEach(word => {
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
        const simpleRegex = new RegExp(`\\b${word}\\b`, 'i');
        if (simpleRegex.test(lowerText)) return true;

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

// ========== GUESTBOOK MODERATION ==========
exports.moderateGuestbookMessage = functions.database.ref('/guestbook/{pushId}')
    .onCreate(async (snapshot, context) => {
        const originalMessage = snapshot.val();
        const messageKey = context.params.pushId;

        console.log('New guestbook message received:', messageKey, originalMessage);

        if (!originalMessage || !originalMessage.name || !originalMessage.message) {
            console.log('Message is missing name or message field, skipping moderation.');
            return null;
        }

        let name = originalMessage.name;
        let messageText = originalMessage.message;
        let hasProfanity = false;

        if (containsProfanity(name)) {
            name = filterProfanity(name);
            hasProfanity = true;
        }

        if (containsProfanity(messageText)) {
            messageText = filterProfanity(messageText);
            hasProfanity = true;
        }

        if (!hasProfanity) {
            console.log('No profanity found, message remains as is.');
            return null;
        }

        console.log('Profanity detected and filtered. Updating message.');
        return snapshot.ref.update({
            name: name,
            message: messageText,
            moderated: true
        });
    });

// ========== CHAT MODERATION ==========
exports.moderateChatMessage = functions.database.ref('/chat/{pushId}')
    .onCreate(async (snapshot, context) => {
        const originalMessage = snapshot.val();
        const messageKey = context.params.pushId;

        console.log('New chat message received:', messageKey, originalMessage);

        if (!originalMessage || !originalMessage.username || !originalMessage.message) {
            console.log('Message is missing username or message field, skipping moderation.');
            return null;
        }

        let username = originalMessage.username;
        let messageText = originalMessage.message;
        let hasProfanity = false;

        if (containsProfanity(username)) {
            username = filterProfanity(username);
            hasProfanity = true;
        }

        if (containsProfanity(messageText)) {
            messageText = filterProfanity(messageText);
            hasProfanity = true;
        }

        if (!hasProfanity) {
            console.log('No profanity found, message remains as is.');
            return null;
        }

        console.log('Profanity detected and filtered. Updating chat message.');
        return snapshot.ref.update({
            username: username,
            message: messageText,
            moderated: true
        });
    });

// ========== HIRE ME CONTACT FORM NOTIFICATION ==========
exports.sendHireMeNotification = functions.database.ref('/contactSubmissions/{pushId}')
    .onCreate(async (snapshot, context) => {
        const submission = snapshot.val();
        
        console.log('New contact form submission:', submission);
        
        // Here you could integrate with email services like SendGrid, Mailgun, etc.
        // For now, we'll just log it and store it in a "notifications" node
        
        const notification = {
            name: submission.name,
            email: submission.email,
            company: submission.company || 'Not provided',
            phone: submission.phone || 'Not provided',
            message: submission.message,
            hearAbout: submission.hearAbout || 'Not specified',
            timestamp: submission.timestamp,
            read: false,
            notified: Date.now()
        };
        
        // Store in notifications for you to check
        await admin.database().ref('hireNotifications').push(notification);
        
        console.log('Notification stored successfully');
        
        // TODO: Add email sending here using SendGrid or similar
        // Example with SendGrid (you'd need to install @sendgrid/mail):
        /*
        const sgMail = require('@sendgrid/mail');
        sgMail.setApiKey(functions.config().sendgrid.key);
        
        const msg = {
            to: 'hirecharlienow@yahoo.com',
            from: 'notifications@charlie-portfolio.com',
            subject: `🚨 NEW HIRE REQUEST from ${submission.name}!`,
            html: `
                <h2>Someone wants to hire you!</h2>
                <p><strong>Name:</strong> ${submission.name}</p>
                <p><strong>Email:</strong> ${submission.email}</p>
                <p><strong>Company:</strong> ${submission.company || 'N/A'}</p>
                <p><strong>Phone:</strong> ${submission.phone || 'N/A'}</p>
                <p><strong>Message:</strong> ${submission.message}</p>
                <p><strong>Found you via:</strong> ${submission.hearAbout || 'N/A'}</p>
            `
        };
        
        await sgMail.send(msg);
        */
        
        return null;
    });
