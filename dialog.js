// loquace.js: A Visual Novel and Interactive Fiction dialog system for KAPLAY

import { deepMerge } from '../utils';

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
    parse,
    clear,
    pop,
    vn,
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
            parse,
            clear,
            pop,
            vn,
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

    // Default values for pop dialog
    pop: {
        position: 'topleft',
        sideImage: {
            options: { // For the sprite object
                width: 60,
            }
        },
        textBox: {
            width: 450,
            margin: 20, // FIXME: Should this also be an object with top, right, bottom, left ?
            padding: {
                top: 15,
                right: 20,
                bottom: 15,
                left: 20,
            },
            options: { // For the rect object
                radius: 15,
            },
        },
        dialogText: {
            offsetX: 1,
            options: { // For the text object
                size: 20,
                letterSpacing: 10,
                lineSpacing: 10,
                width: 350,
            }
        },
        nextPrompt: {
            name: 'right-arrow',
            options: {
                width: 20,
            },
        },
        doTween: true,
    },

    // Default values for vn dialog
    vn: {
        sideImage: {
            options: { // For the sprite object
                width: 120,
            },
        },
        textBox: {
            margin: 20, // FIXME: Should this also be an object with top, right, bottom, left ?
            padding: {
                top: 15,
                right: 20,
                bottom: 15,
                left: 20,
            },
            options: { // For the rect object
                radius: 15,
            },
        },
        dialogText: {
            offsetX: 1,
            options: { // For the text object
                size: 20,
                letterSpacing: 10,
                lineSpacing: 10,
                // width: Calculated dynamically for full width
            },
        },
        nextPrompt: {
            name: 'right-arrow',
            options: {
                width: 20,
            },
        },
        doTween: true,
    },
};

const registeredCommands = {
    // Built-in commands (can be overloaded)
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

function script(s, auto = true) {
    // TODO: Document this in README
    // → If an object is passed, the behavior is like Monogatari:
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

        if (auto) next();
    } else {
        // Merge new script with existing script
        Object.assign(_script, s);
    }
}

function registerCommand(command, callback) {
    registeredCommands[command] = callback;
}

// Start dialog from a label
function start(label) {
    statements = _script[label];
    statementCounter = 0;
}

// Display next statement
function next() {
    // Fail silently if no script for current label
    if (!statements) return;

    // Clear and return if no more statements
    if (statementCounter > statements.length - 1) {
        clear();
        return;
    };

    // First remove any existing dialog
    clear();

    // Parse statement
    const dialogObject = parse(statements[statementCounter], false)

    // Increment statement counter for next iteration
    statementCounter++;

    // Execute and display dialog (deferred after statementCounter increment)
    executeCommands(dialogObject.commands);
    displayDialog(dialogObject);
}

// Parse a statement and return a dialog object
function parse(statement, execute = true) {
    const dialogObject = {
        originalStatement: statement,
        statement: '',
        commands: [],
    };

    preSelectStatement(dialogObject)
    parseCommands(dialogObject);
    parseDialog(dialogObject);

    if (execute) {
        executeCommands(dialogObject);
        displayDialog(dialogObject);
    }

    return dialogObject;
}

// Pre-select statement from different types (can be a String, Array or Object)
function preSelectStatement(dialogObject) {
    const statement = dialogObject.originalStatement;

    // Identify the statement type
    if (Array.isArray(statement)) {
        // Allow for an Array of statements to be chosen randomly
        dialogObject.statement = choose(statement);
    } else if (typeof statement === 'object') {
        // Allow for Objects to be passed for interactive dialogs
        /* Example:
        {
            type: 'multipleChoice', // What other types ?
            statement: "t What choice? [button=choiceA]something[/button] [button=choiceB]something else[/button]",
            onPress: {
                'choiceA': () => {
                    // Do something
                },
                'choiceB': () => {
                    // Do something
                },
            }
        */
        dialogObject.statement = statement.statement; // TODO: Temporary. Augment this with above example
    } else {
        // Default to statement as a String
        dialogObject.statement = statement;
    }

    return dialogObject;
}

// Parse commands from dialogObject.statement: `command1 command2 who:expression string`
function parseCommands(dialogObject) {
    // Identify, collect and trim commands from the start of the statement
    let commandMatch;
    while ((commandMatch = dialogObject.statement.match(/^(\w+)/)) && Object.keys(registeredCommands).includes(commandMatch[1])) {
        // This loop will run as long as the first word of the statement is a registered command
        
        // Collect commands for deferred execution
        dialogObject.commands.push(commandMatch[1]);

        // Trim command from dialogObject.statement
        dialogObject.statement = dialogObject.statement.replace(/^\w+\s*/, '');
    }
}

// Parse dialog from dialogObject.statement: `who:expression string`
function parseDialog(dialogObject) {
    // Do not try to parse an empty statement (e.g. if it was only a command)
    if (dialogObject.statement === '') return;

    // Parse dialogObject.statement from `who:expression string`
    // Example: `r:happy Hello, I'm a robot!`
    const match = dialogObject.statement.match(/^(\w+):(\S+)\s/);
    if (match) {
        dialogObject.who = match[1];
        dialogObject.expression = match[2];
        dialogObject.statement = dialogObject.statement.replace(/^(\w+):(\S+)\s*/, '');
    }

    // If no match :
    // Look if the first word match a character
    // In example: `r Hello, I'm a robot!`
    if (dialogObject.who === undefined) {
        for (const key in _characters) {
            if (dialogObject.statement.startsWith(key + ' ')) {
                dialogObject.who = key;

                // Set default expression if its defined
                if (_characters[dialogObject.who].defaultExpression) {
                    dialogObject.expression = _characters[dialogObject.who].defaultExpression;
                }

                dialogObject.statement = dialogObject.statement.replace(key + ' ', '');
                break;
            }
        }
    }

    // If still no match, consider the dialogObject.statement as a narrator dialog
    if (dialogObject.who === undefined) {
        dialogObject.who = 'narrator';
    }

    // Get expression for side image
    if (dialogObject.expression !== undefined && !_characters[dialogObject.who].expressions[dialogObject.expression]) {
        throw new Error(`Expression "${dialogObject.expression}" not found for character "${dialogObject.who}"`);
    }
    dialogObject.sideImage = (dialogObject.expression) ? _characters[dialogObject.who].expressions[dialogObject.expression] : undefined;
}

function executeCommands(commands) {
    // Loop through commands and execute them
    commands.forEach(command => {
        if (typeof registeredCommands[command] === 'function') registeredCommands[command]();

        // Process built-in commands on top of registered commands
        if (command === 'enableNextPrompt') config.showNextPrompt = true;
        if (command === 'disableNextPrompt') config.showNextPrompt = false;
    });
}

function displayDialog(dialogObject) {
    // Do not display anything if statement is empty (e.g. if it was only a command)
    if (dialogObject.statement === '') return;

    // Display dialog by type
    switch (_characters[dialogObject.who].dialogType) {
        case 'vn':
            // Traditional visual novel dialog box at the bottom of the screen
            vn(dialogObject.statement, deepMerge(config.vn, {
                name: _characters[dialogObject.who].name,
                sideImage: { name: dialogObject.sideImage },
            }, _characters[dialogObject.who].dialogOptions || {}));
            break;
        default:
            // Positionable dialog pop-up or pop-down
            pop(dialogObject.statement, deepMerge(config.pop, {
                name: _characters[dialogObject.who].name,
                position: _characters[dialogObject.who].position,
                sideImage: { name: dialogObject.sideImage },
            }, _characters[dialogObject.who].dialogOptions || {}));
    }
}

function clear() {
    get('dialogvn').forEach(o => {
        if (o.is('persistent')) return;
        tween(o.opacity, 0, 0.5, (v) => {
            o.opacity = v;
            o.children.forEach(c => c.opacity = v);
        }, easings.easeOutQuad).onEnd(() => o.destroy());
    });
}

function pop(string, options = {}) {
    // Deep merge options with default config
    const conf = deepMerge(config.pop, options);

    // Calculate base textBox height (will be adjusted for dialog height later)
    const baseTextboxHeight = conf.dialogText.options.size + conf.textBox.padding.top + conf.textBox.padding.bottom;

    let xPos, yPos, startyPos;

    switch (conf.position) {
        case 'topleft':
            xPos = conf.textBox.margin;
            yPos = conf.textBox.margin;
            startyPos = -baseTextboxHeight;
            break;
        case 'top':
            xPos = (width() - conf.textBox.width) / 2;
            yPos = conf.textBox.margin;
            startyPos = -baseTextboxHeight;
            break;
        case 'topright':
            xPos = width() - conf.textBox.width - conf.textBox.margin;
            yPos = conf.textBox.margin;
            startyPos = -baseTextboxHeight;
            break;
        case 'left':
            xPos = conf.textBox.margin;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'center':
            xPos = (width() - conf.textBox.width) / 2;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'right':
            xPos = width() - conf.textBox.width - conf.textBox.margin;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'botleft':
            xPos = conf.textBox.margin;
            yPos = height() - conf.textBox.margin;
            startyPos = height() + baseTextboxHeight;
            break;
        case 'bot':
            xPos = (width() - conf.textBox.width) / 2;
            yPos = height() - conf.textBox.margin;
            startyPos = height() + baseTextboxHeight;
            break;
        case 'botright':
            xPos = width() - conf.textBox.width - conf.textBox.margin;
            yPos = height() - conf.textBox.margin;
            startyPos = height() + baseTextboxHeight;
            break;
        default:
            xPos = conf.textBox.margin;
            yPos = conf.textBox.margin;
            startyPos = -baseTextboxHeight;
    }

    const textBoxObj = add([
        rect(conf.textBox.width, baseTextboxHeight, conf.textBox.options),
        color((conf.textBox.color) ? Object.values(conf.textBox.color) : WHITE),
        pos(xPos, startyPos),
        opacity((conf.doTween) ? 0 : 1),
        'dialogvn',
    ]);

    if (conf.persistent) textBoxObj.use('persistent');

    if (conf.sideImage.name) {
        textBoxObj.add([
            sprite(conf.sideImage.name, conf.sideImage.options),
            pos(-conf.textBox.padding.top, -conf.textBox.padding.left),
            opacity(1),
        ]);
    }

    const textObj = textBoxObj.add([
        text(string, conf.dialogText.options),
        color((conf.dialogText.color) ? Object.values(conf.dialogText.color) : BLACK),
        pos((conf.sideImage.name) ? conf.sideImage.options.width : conf.textBox.padding.left, conf.textBox.padding.top + conf.dialogText.offsetX),
        opacity(1),
    ]);

    // Adjust textBoxObj for dialog height
    textBoxObj.height = textObj.height + conf.textBox.padding.top + conf.textBox.padding.bottom;

    // Next Prompt sprite
    if ((conf.showNextPrompt !== undefined) ? conf.showNextPrompt : config.showNextPrompt) {
        const nextPromptSprite = textBoxObj.add([
            sprite(conf.nextPrompt.name, conf.nextPrompt.options),
            pos(conf.textBox.width - conf.textBox.padding.right - conf.nextPrompt.options.width/2, textBoxObj.height - conf.textBox.padding.bottom - conf.nextPrompt.options.width/2),
            anchor('center'),
            opacity(1),
            animate(),
        ]);
        nextPromptSprite.animate('scale', [vec2(1.2), vec2(1)], {
            duration: 0.5,
            direction: 'ping-pong',
        });
    }

    // Multiplier to offset yPos for text height
    let mult = 0;
    if (conf.position.includes('bot')) {
        mult = 1;
    } else if (conf.position === 'left' || conf.position === 'center' || conf.position === 'right') {
        mult = 0.5;
    }

    if (conf.doTween) {
        // Tween position and opacity
        tween(textBoxObj.pos.y, yPos - textBoxObj.height * mult, 0.5, (y) => textBoxObj.pos.y = y, easings.easeOutQuad);
        tween(textBoxObj.opacity, 1, 0.5, (v) => textBoxObj.opacity = v, easings.easeOutQuad);
    } else {
        textBoxObj.pos.y = yPos - textBoxObj.height * mult;
    }

    return textBoxObj; // Allow for further manipulation and/or custom tweening
}

function vn(string, options = {}) {
    // Deep merge options with default config
    const conf = deepMerge(config.vn, options);

    const sideImageOffset = (options.sideImage) ? conf.textBox.margin + conf.sideImage.options.width : 0;
    const baseTextboxHeight = conf.dialogText.options.size + conf.textBox.padding.top + conf.textBox.padding.bottom;

    // Add objects to the scene
    const textBoxObj = add([
        rect(width() - 2 * conf.textBox.margin - sideImageOffset, baseTextboxHeight, conf.textBox.options),
        color((conf.textBox.color) ? Object.values(conf.textBox.color) : WHITE),
        pos(
            sideImageOffset + conf.textBox.margin,
            (conf.doTween) ? height() + baseTextboxHeight : height() - conf.textBox.margin - baseTextboxHeight
        ),
        opacity((conf.doTween) ? 0 : 1),
        'dialogvn',
    ]);

    if (conf.persistent) textBoxObj.use('persistent');

    let sideImageObj;
    if (conf.sideImage.name) {
        sideImageObj = textBoxObj.add([
            sprite(conf.sideImage.name, conf.sideImage.options),
            pos(-conf.sideImage.options.width - conf.textBox.margin, -conf.sideImage.options.width + baseTextboxHeight),
            opacity(1),
        ]);
    }

    const textObj = textBoxObj.add([
        text(string, conf.dialogText.options),
        color((conf.dialogText.color) ? Object.values(conf.dialogText.color) : BLACK),
        pos(conf.textBox.padding.left, conf.textBox.padding.top + conf.dialogText.offsetX),
        opacity(1),
    ]);

    // Adjust textbox for textObj height
    textBoxObj.height = textObj.height + conf.textBox.padding.top + conf.textBox.padding.bottom;
    if (conf.sideImage.name) sideImageObj.pos.y = - conf.sideImage.options.width + textBoxObj.height;

    // Next Prompt sprite
    if ((conf.showNextPrompt !== undefined) ? conf.showNextPrompt : config.showNextPrompt) {
        const nextPromptSprite = textBoxObj.add([
            sprite(conf.nextPrompt.name, conf.nextPrompt.options),
            pos(
                width() - 2 * conf.textBox.margin - sideImageOffset - conf.textBox.padding.right - conf.nextPrompt.options.width/2,
                textBoxObj.height - conf.textBox.padding.bottom - conf.nextPrompt.options.width/2
            ),
            anchor('center'),
            opacity(1),
            animate(),
        ]);
        nextPromptSprite.animate('scale', [vec2(1.2), vec2(1)], {
            duration: 0.5,
            direction: 'ping-pong',
        });
    }

    if (conf.doTween) {
        // Tween position and opacity
        tween(textBoxObj.pos.y, height() - conf.textBox.margin - textBoxObj.height, 0.5, (y) => textBoxObj.pos.y = y, easings.easeOutQuad);
        tween(textBoxObj.opacity, 1, 0.5, (v) => textBoxObj.opacity = v, easings.easeOutQuad);
    } else {
        textBoxObj.pos.y = height() - conf.textBox.margin - textBoxObj.height;
    }

    return textBoxObj; // Allow for further manipulation and/or custom tweening
}