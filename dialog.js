// Dialog: Visual Novel dialog system for KAPLAY

// This plugin allows you to create visual novel dialogues in your games.
// Designed for developers familiar with Ren'Py or Monogatari
// Usable as both a KAPLAY plugin and an ES6 module

export {
    dialog, // KAPLAY plugin

    // Dialog functions for use as a module
    config,
    init,
    characters,
    script,
    registerCommand,
    start,
    next,
    display,
    clear,
}

// Allow use of dialog as a KAPLAY plugin
function dialog() {
    return {
        dialog: {
            config,
            init,
            characters,
            script,
            registerCommand,
            start,
            next,
            display,
            clear,
        },
    }
};

const _characters = {};
let _script = {};
let statements;
let statementCounter = 0;

// Default configuration
const config = {
    showNextPrompt: true,
};

const registeredCommands = {
    // Built-in commands, can be overloaded
    enableNextPrompt: null, // Change showNextPrompt property to display next prompt
    disableNextPrompt: null, // Change showNextPrompt property to hide next prompt
};

// Default narrator character
_characters.narrator = {
    dialogType: 'vn',
};

function init(options) {
    Object.assign(config, options);
}

function characters(c) {
    Object.assign(_characters, c);
}

function script(s) {
    // TODO: Document this in README
    // → If an object is passed, the bahavior is like Monogatari:
    // The object passed is a 'script' which is a list of keys ('labels'),
    // containing an array of strings ('statements'). 
    // → If an array is passed, it is a list of strings (or 'statements') for
    // immediate use. There is no 'label' concept in this case.

    // Both modes are compatible with each other. For example, you can provide
    // a Monogatari-like script with labels. Start with a label, jump to
    // another, as usual. You can call script() again to overwrite existing
    // labels or add new ones. *And* you can call script() with an array of
    // strings to use those as the new current (ephemeral and orphan) label.

    if (Array.isArray(s)) {
        // Set statements for immediate use
        statements = s;

        // Reset statement counter
        statementCounter = 0;
    } else {
        // Merge new script with existing script
        Object.assign(_script, s);
    }
}

function registerCommand(command, callback) {
    registeredCommands[command] = callback;
}

function start(label, auto = true) {
    statements = _script[label];
    statementCounter = 0;
    if (auto) next();
}

function next() {
    // Fail silently if no script for current label
    if (!statements) return;

    // Clear and return if no more statements
    if (statementCounter > statements.length - 1) {
        clear();
        return;
    };

    // Display next statement
    display(statements[statementCounter]);

    // Increment statement counter for next iteration
    statementCounter++;
}

function display(string) {
    // First remove any existing dialog
    clear();

    // Identify, call and trim commands from the start of the string
    let commandMatch;
    while ((commandMatch = string.match(/^(\w+)/)) && Object.keys(registeredCommands).includes(commandMatch[1])) {
        const command = commandMatch[1];

        // Call registered command
        if (typeof registeredCommands[command] === 'function') registeredCommands[command]();

        // Process built-in commands on top of function callbacks
        if (command === 'enableNextPrompt') config.showNextPrompt = true;
        if (command === 'disableNextPrompt') config.showNextPrompt = false;

        // Trim command from string
        string = string.replace(/^\w+\s*/, '');
    }

    // Only process commands if string is empty after trimming
    if (string === '') return;

    // Parse string from `who:expression statement`
    // Example: `r:happy Hello, I'm a robot!`
    let who;
    let expression;
    const match = string.match(/^(\w+):(\S+)\s/);
    if (match) {
        who = match[1];
        expression = match[2];
        string = string.replace(/^(\w+):(\S+)\s*/, '');
    }

    // If no match :
    // Look if the first word match a character
    // In example: `r Hello, I'm a robot!`
    if (who === undefined) {
        for (const key in _characters) {
            if (string.startsWith(key + ' ')) {
                who = key;

                // Set default expression if its defined
                if (_characters[who].defaultExpression) {
                    expression = _characters[who].defaultExpression;
                }

                string = string.replace(key + ' ', '');
                break;
            }
        }
    }

    // If still no match, consider the string as a narrator dialog
    if (who === undefined) {
        who = 'narrator';
    }

    const character = _characters[who];

    // Get expression for side image
    if (expression !== undefined && !character.expressions[expression]) {
        throw new Error(`Expression "${expression}" not found for character "${who}"`);
    }
    const sideImage = (expression) ? character.expressions[expression] : undefined;

    // Display dialog by type
    switch (character.dialogType) {
        case 'pop': // Positionable dialog pop-up or pop-down
            pop(string, character, sideImage);
            break;
        case 'vn': // Traditional visual novel dialog box at the bottom of the screen
            vn(string, character, sideImage);
            break;
        default:
            pop(string, character, sideImage);
    }
}

function clear() {
    get('dialogvn').forEach(o => {
        tween(o.opacity, 0, 0.5, (v) => {
            o.opacity = v;
            o.children.forEach(c => c.opacity = v);
        }, easings.easeOutQuad).onEnd(() => o.destroy());
    });
}

function pop(string, character, sideImage) {
    const position = character?.position || 'topleft';

    let xPos, yPos, startyPos;

    switch (position) {
        case 'topleft':
            xPos = 20;
            yPos = 20;
            startyPos = -50;
            break;
        case 'top':
            xPos = (width() - 450) / 2;
            yPos = 20;
            startyPos = -50;
            break;
        case 'topright':
            xPos = width() - 470;
            yPos = 20;
            startyPos = -50;
            break;
        case 'left':
            xPos = 20;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'center':
            xPos = (width() - 450) / 2;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'right':
            xPos = width() - 470;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'botleft':
            xPos = 20;
            yPos = height() - 20;
            startyPos = height() + 50;
            break;
        case 'bot':
            xPos = (width() - 450) / 2;
            yPos = height() - 20;
            startyPos = height() + 50;
            break;
        case 'botright':
            xPos = width() - 470;
            yPos = height() - 20;
            startyPos = height() + 50;
            break;
        default:
            xPos = 20;
            yPos = 20;
            startyPos = -50;
    }

    const textbox = add([
        rect(450, 50, { radius: 15 }),
        pos(xPos, startyPos),
        opacity(0),
        'dialogvn',
    ]);

    if (sideImage) {
        textbox.add([
            sprite(sideImage, {
                width: 60,
                height: 60,
            }),
            pos(-15, -20),
            opacity(1),
        ]);
    }

    const dialog = textbox.add([
        text(string, {
            size: 20,
            letterSpacing: 10,
            lineSpacing: 10,
            width: 370,
        }),
        color(0,0,0),
        pos(60, 16),
        opacity(1),
    ]);

    // Adjust textbox for dialog height
    textbox.height = dialog.height + 30;

    // Multiplier to offset yPos for text height
    let mult = 0;
    if (position.includes('bot')) {
        mult = 1;
    } else if (position === 'left' || position === 'center' || position === 'right') {
        mult = 0.5;
    }

    // Tween position and opacity
    tween(textbox.pos.y, yPos - textbox.height * mult, 0.5, (y) => textbox.pos.y = y, easings.easeOutQuad);
    tween(textbox.opacity, 1, 0.5, (v) => textbox.opacity = v, easings.easeOutQuad);
}

function vn(string, character, sideImage) {
    const sideImageOffset = (sideImage) ? 20 + 120 : 0;
    const textbox = add([
        rect(width() - 2 * 20 - sideImageOffset, 50, { radius: 15 }),
        pos(sideImageOffset + 20, height() + 50),
        opacity(0),
        'dialogvn',
    ]);

    let sideSprite;
    if (sideImage) {
        sideSprite = textbox.add([
            sprite(sideImage, {
                width: 120,
                height: 120,
            }),
            pos(-140, -70),
            opacity(1),
        ]);
    }

    const dialogText = textbox.add([
        text(string, {
            size: 20,
            letterSpacing: 10,
            lineSpacing: 10,
            width: 600,
        }),
        color(0,0,0),
        pos(20, 16),
        opacity(1),
    ]);

    if (config.showNextPrompt) {
        const nextPrompt = textbox.add([
            sprite('right-arrow'),
            pos(width() - 2 * 20 - sideImageOffset - 20 - 10, dialogText.height + 5),
            anchor('center'),
            opacity(1),
            animate(),
        ]);
        nextPrompt.animate('scale', [vec2(1.2), vec2(1)], {
            duration: 0.5,
            direction: 'ping-pong',
        });
    }

    // Adjust textbox for dialogText height
    textbox.height = dialogText.height + 30;
    if (sideImage) sideSprite.pos.y = - 120 + textbox.height;

    // Tween position and opacity
    tween(textbox.pos.y, height() - 20 - textbox.height, 0.5, (y) => textbox.pos.y = y, easings.easeOutQuad);
    tween(textbox.opacity, 1, 0.5, (v) => textbox.opacity = v, easings.easeOutQuad);
}