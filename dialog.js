// Dialog: Visual Novel dialog system for KAPLAY
// This plugin allows you to create visual novel dialogues in your games.
// Designed for developers familiar with Ren'Py or Monogatari
// Usable as both a KAPLAY plugin and an ES6 module

export {
    dialog, // KAPLAY plugin

    // Dialog functions for use as a module
    characters,
    script,
    start,
    next,
    display,
    clear,
}

// Allow use of dialog as a KAPLAY plugin
function dialog() {
    return {
        dialog: {
            characters,
            script,
            start,
            next,
            display,
            clear,
        },
    }
};

const _characters = {};
const _script = {};
let statementCounter = 0;
let curentLabel;

function characters(c) {
    Object.assign(_characters, c);
}

function script(s) {
    Object.assign(_script, s);
}

function start(label, auto = true) {
    curentLabel = label;
    statementCounter = 0;
    if (auto) next();
}

function next() {
    // Clear and return if no more statements
    if (statementCounter >= _script[curentLabel].length) {
        clear();
        return;
    };

    // Display next statement
    const strings = _script[curentLabel];
    display(strings[statementCounter]);

    // Increment statement counter for next iteration
    if (statementCounter < strings.length - 1) statementCounter++;
}

function display(string) {
    // First remove any existing dialog
    clear();

    // Parse string from `who:expression statement`
    // Example: `r:happy Hello, I'm a robot!`
    let who = undefined;
    let expression = undefined;
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

    // Get character data
    if (who !== undefined && !_characters[who]) {
        throw new Error(`Character "${who}" not found`);
    }
    const character = _characters[who];

    // Get expression for side image
    if (expression !== undefined && !character.expressions[expression]) {
        throw new Error(`Expression "${expression}" not found for character "${who}"`);
    }
    const sideImage = character?.expressions[expression];

    const side = character?.position || 'topleft';

    let xPos, yPos, startyPos;

    switch (side) {
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
            sprite(sideImage),
            pos(-15, -20),
            scale(0.4),
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
    if (side.includes('bot')) {
        mult = 1;
    } else if (side === 'left' || side === 'center' || side === 'right') {
        mult = 0.5;
    }

    // Tween position and opacity
    tween(textbox.pos.y, yPos - textbox.height * mult, 0.5, (y) => textbox.pos.y = y, easings.easeOutQuad);
    tween(textbox.opacity, 1, 0.5, (v) => textbox.opacity = v, easings.easeOutQuad);
}

function clear() {
    get('dialogvn').forEach(o => {
        tween(o.opacity, 0, 0.5, (v) => {
            o.opacity = v;
            o.children.forEach(c => c.opacity = v);
        }, easings.easeOutQuad).onEnd(() => o.destroy());
    });
}