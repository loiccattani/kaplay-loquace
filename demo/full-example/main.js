import kaplay from "kaplay";
import { loquacePlugin } from "/src/loquace.js";

kaplay({
  // styling
  buttons: {
    space: {
      keyboard: ["space"],
    },
    z: {
      keyboard: ["z"],
    },
  },
  plugins: [loquacePlugin],
});

scene("main", () => {
  loquace.init();

  loadSprite("bean", "./bean.png");
  loadSprite("skuller", "./skuller.png");

  onButtonPress("space", () => {
    if (loquace.config.showNextPrompt) loquace.next();
  });

  onButtonPress("z", () => {
    loquace.config.pop.position = 'center';
    loquace.start("finish");
  });

  loquace.registerCommand("sayHi", () => {
    console.log("Hi!");
    console.log("Press Z to finish the script");
  });

  loquace.characters({
    r: {
      name: "Robot",
      expressions: {
        happy: "bean",
      },
      defaultExpression: "happy",
    },
    t: {
      name: "Tom",
      expressions: {
        happy: "skuller",
      },
      defaultExpression: "happy",
      dialogType: "vn",
      dialogOptions: {
        dialogText: {
          letterSpacing: 10,
          color: RED,
        },
      },
    },
  });

  loquace.script({
    'begin': [
      "r Hello, I am Bean.",
      "t Hi, I am Skuller.",
      "disableNextPrompt sayHi r I can say hi from the console too!",
    ],
    'finish': [
      "r Loquace is awesome!",
    ],
  });

  loquace.start("begin");
});

go("main");
