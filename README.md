# Loquace
## A Visual Novel and Interactive Fiction dialog system for KAPLAY

IMPORTANT NOTE : This is an alpha version in active development, expect breaking changes and bugs !
- [How to install](#how-to-install)
  - [Build from source](#build-from-source)
  - [CDN](#cdn)
  - [NPM](#npm)
- [How to use](#how-to-use)
  - [Usage](#usage)
  - [Initialization and options](#initilization-and-options)
  - [Direct dialog usage](#direct-dialog-usage)
  - [Script usage](#script-usage)
- [Demos](#demos)
- [Full Documentation](#full-documentation)
  - [Basics and terminology](#basics-and-terminology)
  - [Statements](#statements)
  - [Characters](#characters)
  - [Commands](#commands)
    - [Built-in commands](#built-in-commands)
    - [Custom commands](#custom-commands)
  - [Dialog types](#dialog-types)
    - [Pop](#pop)
    - [Visual Novel (vn)](#visual-novel-vn)
  - [Dialog Options](#dialog-options)
  - [Using Loquace as an ES6 Module](#using-loquace-as-an-es6-module)
- [Roadmap](#roadmap)
  - [Known bugs](#known-bugs)
  - [Planned features](#planned-features)
- [Contributing](#contributing)


## How to install

### Build from source

1. Build Loquace with `npm run build`
2. Copy `/dist/kaplay-loquace.js` into your project

### CDN

TBD

### NPM

TBD

## How to use

### Usage
```js
  import kaplay from "kaplay";
  import { loquacePlugin } from "/src/loquace.js";

  const k = kaplay({
    plugins: [loquacePlugin],
  });

  loquace.init();
```

#### Initilization and options

After having imported Loquace into KAPLAY as a plugin, as described above, you need to init loquace.

`loquace.init()`

This is required to load Loquace assets

Options can be passed here as well (look into [Dialog Options](#dialog-options))
```js
loquace.init({
  showNextPrompt: false,
  pop: {
    position: 'center',
    doTween: false,
  },
});
```

#### Direct dialog usage

Use this for quick single use dialogs or alerts

Note: A regular string is passed here, you cannot use a statement string (it will be displayed as-is)

```js
loquace.pop('Hello world');

// Or with options
loquace.pop('Hello world', {
  /* options for pop dialog type */
  name: 'Bob',
  sideImage: 'bob' // Bob side image sprite name
});

loquace.vn('Hello world', {
  /* options for vn dialog type */
  ...
});
```

#### Script usage

This is the main way to use Loquace, when you want to chain many statements in a narrative dialog.

Loquace's `script` function can be used in many ways:

1. By passing an array, it will overwrite all statements and automatically display the first one.
```js
loquace.script([
  "Hello world from KAPLAY Loquace",
  "This is a narrator dialog",
]);
```
If you want to prevent the automatic display of the first statement, pass `false` as the second optional argument

2. By passing an object, you define `labels` that can be then loaded with `loquace.start('labelName')`. Each label contain an array of statements, much like Monogatari.
```js
loquace.script({
  'firstLabel': [
    "Hello world from KAPLAY Loquace",
    "This is a narrator dialog",
  ],
  'secondLabel': [ ... ]
});

loquace.start('firstLabel', false); // Load the label statements into loquace and display the first one. Like `script`, pass `false` as the second argument to prevent displaying the first statement automatically

loquace.next(); // Display the next statement, each new call to `next()` will then display the next statement until there is no more. Returns `true` when a statement has been processed, `false` otherwise
```

### Demos

If you are the learn-by-example type, you'll find plenty of examples by looking in `/demo`.

Launch demo code with `npm run dev`

### Full Documentation

#### Basics and terminology

Loquace is implemented in a way to be familiar with Ren'Py or Monogatari user

Terminology:
- statement: a dialog line (can include commands, a character key and expression)
- script: a list of statements
- label: a named script
- character: A named character with a 'key' and optional expression
- expression: A character's expression (a sprite name to be used as a side image)
- narrator: a default character that has no name nor expressions (used internally when no character)
- command: built-in or custom named function that can be registered with `loquace.registerCommand()`
- next prompt indicator: An arrow sprite (built-in) to indicate to the user that there are more dialog lines

#### Statements

Let's quickly describe what is at the core of loquace, the statement

- Here is a statement : `Hello World!`.
- Here is antoher : `r Hello World!`. This time character `r` is talking, defined with `loquace.characters()`
- Character can have expressions : `r:happy Yes!` 'happy' would be the name of a sprite to be used as a side image
- Commands can be passed in statements:
  - `sayHi r I can also say hi from the console!` sayHi should be registered as a custom command
  - `disableNextPrompt Quick ! do something !` Built-in, disable showing the next prompt arrow sprite

A statement can include one or more commands, a character key along with an optional expression, and at minimum a dialog string.

#### Characters

Characters may have a name, a list of expressions, a dialog type, position and options. They are defined by calling `loquace.characters()`:

```js
loquace.characters({
  r: { // The character's key used in statements
    name: 'Robot', // The character's name (unused at this time)
    expressions: {
        happy: 'robot-head-happy',
        sad: 'robot-head-sad',
    },
    defaultExpression: 'happy',
    dialogType: 'pop', // default: 'pop', may be 'vn'
    position: 'topleft', // There is a shorthand for position here (*)
    dialogOptions: { // Optionally pass options for dialog type
      position: 'topleft', // *: Position can also be defined in dialogOptions and will take precedence
      doTween: false,
      dialogText: {
          color: RED,
      },
      ...
    },
  },
  ...
});
```

Example implementation in `/demo/02-characters.html`

#### Commands

##### Built-in commands

- `enableNextPrompt`: Enable displaying the next prompt indicator
- `disableNextPrompt`: Disable displaying the next prompt indicator (does not disable `loquace.next()`)

##### Custom commands

Custom commands can be registered with `loquace.registerCommand()`

```js
loquace.registerCommand('doSomething', () => {
  console.log('Do anything!');
});
```

To be used at the start of a statement, like: `doSomething r I might do something`

Multiple commands can be set on a statement, separated by spaces: `doSomething doSomethinElse r I might do something`

#### Dialog types

##### Pop

Display a simple text bubble, this is the default dialog type.

Can be positionned with `position` option ('topleft', 'top', 'topright', 'left', 'center', 'right', 'botleft', 'bot', 'botright').

Healthy defaults are set, all can be overriden with dialog options, either by:
- setting new defaults with `loquace.init({ pop: { ... options } })`;
- setting `dialogOptions` in a character definition
- calling `loquace.pop('dialog string', { ... options for pop })`

##### Visual Novel (vn)

Display large text dialog at the bottom of the screen

Healthy defaults are set, all can be overriden with dialog options, either by:
- setting new defaults with `loquace.init({ vn: { ... options } })`;
- setting `dialogOptions` in a character definition
- calling `loquace.vn('dialog string', { ... options for pop })`

#### Dialog Options

For a complete list of options, look into the definition of `config` in loquace source `/src/loquace.js` (Note: this will probably be better documented once we reach Beta).

#### Using Loquace as an ES6 Module

*If KAPLAY's `global` option is set to `false`*, you will either use `k.loquace` (likely for small single-file projects) or import loquace as an ES6 Module (for larger projects split into many modules):

- In your main.js, import and use Loquace as described in [Usage](#usage)
- In other modules, import loquace with `import * as loquace from "/src/loquace.js";`

## Roadmap

### Known bugs

- Loquace may fail silently or do nothing in many ways, more console output with a `debug` option coming soon.

### Planned features

- Display character name above dialog lines
- Multiple choice statement type

## Contributing

At this time, as an alpha in active development, it's too early to be open to community contributions. That said, if you find a bug or really want to contribute to this project, please get in touch!
