// loquace.js: A Visual Novel and Interactive Fiction dialog system for KAPLAY

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
            vn(dialogObject.statement, {
                name: _characters[dialogObject.who].name,
                sideImage: { name: dialogObject.sideImage },
            });
            break;
        default:
            // Positionable dialog pop-up or pop-down
            pop(dialogObject.statement, {
                name: _characters[dialogObject.who].name,
                position: _characters[dialogObject.who].position,
                sideImage: { name: dialogObject.sideImage },
            });
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

function pop(string, options = {}) {
    /* options structure example:
    {
        name: 'characterName',
        position: 'topleft',
        sideImage: {
            name: 'sideImageName',
            options: { // For the sprite object
                width: 60,
            }
        },
        textBox: {
            width: 450,
            margin: 20,
            padding: {
                top: 15,
                right: 20,
                bottom: 15,
                left: 20,
            },
            options: { // For the rect object
                radius: 15,
            }
        },
        dialogText: {
            color: [0,0,0],
            offsetX: 1,
            options: { // For the text object
                size: 20,
                letterSpacing: 10,
                lineSpacing: 10,
                width: 350,
            }
        },
        doTween: true,
    }
    */

    // Position default
    const position = options.position || 'topleft';

    // Textbox defaults
    const textBox = Object.assign({
        width: 450,
        margin: 20, // FIXME: Should this also be an object with top, right, bottom, left ?
    }, options.textBox);
    textBox.padding = Object.assign({
        top: 15,
        right: 20,
        bottom: 15,
        left: 20,
    }, options.textBox?.padding);
    textBox.options = Object.assign({
        radius: 15,
    }, options.textBox?.options);

    // Side image defaults
    const sideImage = Object.assign({}, options.sideImage);
    sideImage.options = Object.assign({
        width: 60,
    }, options.sideImage?.options);

    // Next prompt defaults
    const nextPrompt = Object.assign({
        name: 'right-arrow',
    }, options.nextPrompt);
    nextPrompt.options = Object.assign({
        width: 20,
    }, options.nextPrompt?.options);

    // Text options
    const dialogText = Object.assign({
        color: [0,0,0],
        offsetX: 1,
    }, options.dialogText);
    dialogText.options = Object.assign({
        size: 20,
        letterSpacing: 10,
        lineSpacing: 10,
        width: textBox.width - sideImage.options.width - textBox.padding.right - ((config.showNextPrompt) ? nextPrompt.options.width + textBox.padding.right : 0),
    }, options.dialogText?.options);

    // Calculate base textBox height (will be adjusted for dialog height later)
    const baseTextboxHeight = dialogText.options.size + textBox.padding.top + textBox.padding.bottom;

    // Tween options
    const doTween = options.doTween || true;

    let xPos, yPos, startyPos;

    switch (position) {
        case 'topleft':
            xPos = textBox.margin;
            yPos = textBox.margin;
            startyPos = -baseTextboxHeight;
            break;
        case 'top':
            xPos = (width() - textBox.width) / 2;
            yPos = textBox.margin;
            startyPos = -baseTextboxHeight;
            break;
        case 'topright':
            xPos = width() - textBox.width - textBox.margin;
            yPos = textBox.margin;
            startyPos = -baseTextboxHeight;
            break;
        case 'left':
            xPos = textBox.margin;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'center':
            xPos = (width() - textBox.width) / 2;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'right':
            xPos = width() - textBox.width - textBox.margin;
            yPos = height() / 2;
            startyPos = yPos;
            break;
        case 'botleft':
            xPos = textBox.margin;
            yPos = height() - textBox.margin;
            startyPos = height() + baseTextboxHeight;
            break;
        case 'bot':
            xPos = (width() - textBox.width) / 2;
            yPos = height() - textBox.margin;
            startyPos = height() + baseTextboxHeight;
            break;
        case 'botright':
            xPos = width() - textBox.width - textBox.margin;
            yPos = height() - textBox.margin;
            startyPos = height() + baseTextboxHeight;
            break;
        default:
            xPos = textBox.margin;
            yPos = textBox.margin;
            startyPos = -baseTextboxHeight;
    }

    const textBoxObj = add([
        rect(textBox.width, baseTextboxHeight, textBox.options),
        pos(xPos, startyPos),
        opacity((doTween) ? 0 : 1),
        'dialogvn',
    ]);

    if (sideImage) {
        textBoxObj.add([
            sprite(sideImage.name, sideImage.options),
            pos(-textBox.padding.top, -textBox.padding.left),
            opacity(1),
        ]);
    }

    const textObj = textBoxObj.add([
        text(string, dialogText.options),
        color(dialogText.color),
        pos(sideImage.options.width, textBox.padding.top + dialogText.offsetX),
        opacity(1),
    ]);

    // Adjust textBoxObj for dialog height
    textBoxObj.height = textObj.height + textBox.padding.top + textBox.padding.bottom;

    // Next Prompt sprite
    if (config.showNextPrompt) {
        const nextPromptSprite = textBoxObj.add([
            sprite(nextPrompt.name, nextPrompt.options),
            pos(textBox.width - textBox.padding.right - nextPrompt.options.width/2, textBoxObj.height - textBox.padding.bottom - nextPrompt.options.width/2),
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
    if (position.includes('bot')) {
        mult = 1;
    } else if (position === 'left' || position === 'center' || position === 'right') {
        mult = 0.5;
    }

    if (doTween) {
        // Tween position and opacity
        tween(textBoxObj.pos.y, yPos - textBoxObj.height * mult, 0.5, (y) => textBoxObj.pos.y = y, easings.easeOutQuad);
        tween(textBoxObj.opacity, 1, 0.5, (v) => textBoxObj.opacity = v, easings.easeOutQuad);
    } else {
        textBoxObj.pos.y = yPos - textBoxObj.height * mult;
    }

    return textBoxObj; // Allow for further manipulation and/or custom tweening
}

function vn(string, options = {}) {
    /* options structure example:
    {
        name: 'characterName',
        sideImage: {
            name: 'sideImageName',
            options: { // For the sprite object
                width: 120,
            }
        },
        textBox: {
            margin: 20,
            padding: {
                top: 15,
                right: 20,
                bottom: 15,
                left: 20,
            },
            options: { // For the rect object
                radius: 15,
            }
        },
        dialogText: {
            color: [0,0,0],
            offsetX: 1,
            options: { // For the text object
                size: 20,
                letterSpacing: 10,
                lineSpacing: 10,
                width: 350, // Calculated for full width by default
            }
        },
        doTween: true,
    }
    */

    // TextBox defaults
    const textBox = Object.assign({
        margin: 20, // FIXME: Should this also be an object with top, right, bottom, left ?
    }, options.textBox);
    textBox.padding = Object.assign({
        top: 15,
        right: 20,
        bottom: 15,
        left: 20,
    }, options.textBox?.padding);
    textBox.options = Object.assign({
        radius: 15,
    }, options.textBox?.options);

    // Side image defaults
    const sideImage = Object.assign({}, options.sideImage);
    sideImage.options = Object.assign({
        width: 120,
    }, options.sideImage?.options);
    const sideImageOffset = (options.sideImage) ? textBox.margin + sideImage.options.width : 0;

    // Next prompt defaults
    const nextPrompt = Object.assign({
        name: 'right-arrow',
    }, options.nextPrompt);
    nextPrompt.options = Object.assign({
        width: 20,
    }, options.nextPrompt?.options);

    // Text defaults
    const dialogText = Object.assign({
        offsetX: 1,
        color: [0,0,0],
    });
    dialogText.options = Object.assign({
        size: 20,
        letterSpacing: 10,
        lineSpacing: 10,
        width: width() - 2 * textBox.margin - textBox.padding.left - textBox.padding.right - sideImageOffset - ((config.showNextPrompt) ? nextPrompt.options.width + textBox.padding.right : 0),
    }, options.dialogText?.options);
    const baseTextboxHeight = dialogText.options.size + textBox.padding.top + textBox.padding.bottom;

    // Tween options
    const doTween = options.doTween || true;

    // Add objects to the scene
    const textBoxObj = add([
        rect(width() - 2 * textBox.margin - sideImageOffset, baseTextboxHeight, textBox.options),
        pos(
            sideImageOffset + textBox.margin,
            (doTween) ? height() + baseTextboxHeight : height() - textBox.margin - baseTextboxHeight
        ),
        opacity((doTween) ? 0 : 1),
        'dialogvn',
    ]);

    let sideImageObj;
    if (sideImage) {
        sideImageObj = textBoxObj.add([
            sprite(sideImage.name, sideImage.options),
            pos(-sideImage.options.width - textBox.margin, -sideImage.options.width + baseTextboxHeight),
            opacity(1),
        ]);
    }

    const textObj = textBoxObj.add([
        text(string, dialogText.options),
        color(dialogText.color),
        pos(textBox.padding.left, textBox.padding.top + dialogText.offsetX),
        opacity(1),
    ]);

    // Adjust textbox for textObj height
    textBoxObj.height = textObj.height + textBox.padding.top + textBox.padding.bottom;
    if (sideImage) sideImageObj.pos.y = - sideImage.options.width + textBoxObj.height;

    // Next Prompt sprite
    if (config.showNextPrompt) {
        const nextPromptSprite = textBoxObj.add([
            sprite(nextPrompt.name, nextPrompt.options),
            pos(
                width() - 2 * textBox.margin - sideImageOffset - textBox.padding.right - nextPrompt.options.width/2,
                textBoxObj.height - textBox.padding.bottom - nextPrompt.options.width/2
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

    if (doTween) {
        // Tween position and opacity
        tween(textBoxObj.pos.y, height() - textBox.margin - textBoxObj.height, 0.5, (y) => textBoxObj.pos.y = y, easings.easeOutQuad);
        tween(textBoxObj.opacity, 1, 0.5, (v) => textBoxObj.opacity = v, easings.easeOutQuad);
    } else {
        textBoxObj.pos.y = height() - textBox.margin - textBoxObj.height;
    }

    return textBox; // Allow for further manipulation and/or custom tweening
}