var NMLVersion = new Version("0.0.3");
ModPE.langEdit("menu.copyright", "NeoModLoader v" + NMLVersion);

var context = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
var jsContext = org.mozilla.javascript.ContextFactory().enterContext();
function runOnUiThread(func) {context.runOnUiThread(func);}
print = function(s) {runOnUiThread(function() {try {android.widget.Toast.makeText(context, "[NML]: " + s, 500).show();} catch (err) {}});};
var date = java.lang.String.valueOf(android.text.format.DateFormat.format("yyyy-MM-dd_HH.mm.ss", new java.util.Date()));
var log;

var mods = [];
var cachedMods = [];
var hooks = [];
var commands = {};

var buttonWindow;

var Java = {
	ScriptManager: net.zhuoweizhang.mcpelauncher.ScriptManager,
	File: java.io.File,
	Gravity: {
		top: 48,
		left: 3,
		bottom: 80,
		right: 5,
		center: 17,
		topLeft: 51,
		topRight: 53,
		bottomLeft: 83,
		bottomRight: 85
	},
	LayoutParams: {
		fillParent: -1,
		wrapContent: -2
	}
};

var Paths = {};
Paths.minecraft = new Java.File("/sdcard/games/com.mojang/minecraftpe");
Paths.mods = new Java.File(Paths.minecraft, "mods");
Paths.configs = new Java.File(Paths.minecraft, "configs");
Paths.logs = new Java.File(Paths.minecraft, "logs");
Paths.tmp = new Java.File("/sdcard/games/com.mojang/minecraftpe/tmp");

var resources = {
	drawable: {
		gui: {
			button: {
				normal: null, 
				pressed: null
			},
			window: null,
			panel: null
		}, 
		color: {
			transparent: new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT), 
			black: new android.graphics.drawable.ColorDrawable(android.graphics.Color.BLACK),
			dark: new android.graphics.drawable.ColorDrawable(android.graphics.Color.argb(127, 0, 0, 0)), 
		}
	},
	font: null
};

var metrics = context.getResources().getDisplayMetrics();

var Display = {
	width: metrics.widthPixels > metrics.heightPixels ? metrics.widthPixels : metrics.heightPixels, 
	height: metrics.heightPixels < metrics.widthPixels ? metrics.heightPixels : metrics.widthPixels, 
	dpi: metrics.density
};

var lang;

function Version(str) {
	if (typeof str == "string") {
		var spl = str.split(".");
		this.major = spl[0] - 0;
		this.minor = spl[1] - 0;
		this.build = spl[2] - 0;
	} else {
		this.major = 0;
		this.minor = 0;
		this.build = 0;
	}

	this.setVersion = function(str) {
		var spl = str.split(".");
		this.major = spl[0] - 0;
		this.minor = spl[1] - 0;
		this.build = spl[2] - 0;
		return this;
	};

	this.getMajor = function() {
		return this.major;
	};

	this.getMinor = function() {
		return this.minor;
	};

	this.getBuild = function() {
		return this.build;
	};

	this.smallerThan = function(ver) {
		if (this.major < ver.major)
			return true;
		else if (this.major == ver.major && this.minor < ver.minor)
			return true;
		else if (this.major == ver.major && this.minor == ver.minor && this.build < ver.build)
			return true;
		else
			return false;
	};

	this.equalsTo = function(ver) {
		if (this.major == ver.major && this.minor == ver.minor && this.build == ver.build)
			return true;
		else
			return false;
	};

	this.biggerThan = function(ver) {
		if (this.major > ver.major)
			return true;
		else if (this.major == ver.major && this.minor > ver.minor)
			return true;
		else if (this.major == ver.major && this.minor == ver.minor && this.build > ver.build)
			return true;
		else
			return false;
	};

	this.toString = function() {
		return this.major + "." + this.minor + "." + this.build;
	};
};

function Mod(directory) {
	this.directory = directory;

	if (!new Java.File(directory, "mod.js").isFile()) {
		Log.error("Mod \"" + directory.getName() + "\" cannot be loaded. mod.js is missing");
		return;
	}

	if (!new Java.File(directory, "pemod.info").isFile()) {
		Log.error("Mod \"" + directory.getName() + "\" cannot be loaded. pemod.info is missing");
		return;
	}

	var info = Config.parse(new Java.File(directory, "pemod.info"));
	if (!info.hasOwnProperty("id") || !info.hasOwnProperty("name")) {
		Log.error("Mod \"" + directory.getName() + "\" cannot be loaded. pemod.info is incomplete");
		return;
	}

	if (Mods.isModLoaded(info["id"]))
		Log.error("Mod cannot be loaded. Mod with id \"" + info.id + "\"already loaded.");

	this.name = info.name;
	this.id = info.id;
	this.description = info["description"] === undefined ? "No description available." : info.description;
	this.version = info["version"] === undefined ? undefined : new Version(info.version);
	this.authors = info["authors"] === undefined ? undefined : info.authors;
	this.dependencies = info["dependencies"] === undefined ? [] : info.dependencies;
	this.hooks = [];

	if (!new Java.File(Paths.configs, this.id + ".cfg").exists);
	Config.save(new Java.File(Paths.configs, this.id + ".cfg"), {});
	this.config = Config.parse(new Java.File(Paths.configs, this.id + ".cfg"));
	this.scope = new API(this);

	if (new Java.File(directory, "resources.zip").exists())
		Java.ScriptManager.modPkgTexturePack.addPackage(new Java.File(directory, "resources.zip"));

	cachedMods.push(this);
}

function API(mod) {
	this.File = File;
	this.Mods = Mods;
	this.GUI = GUI;
	this.Resources = Resources;

	this.print = function(s) {runOnUiThread(function() {try {android.widget.Toast.makeText(context, "[" + mod.name + "]: " + s, 500).show();} catch (err) {print(err);}});};

	this.Log = {
		info:function(text) {
			File.write(log, File.read(log) + "\n[INFO] [" + mod.name + "] " + text);
		},
		warning:function(text) {
			File.write(log, File.read(log) + "\n[WARNING] [" + mod.name + "] " + text);
		},
		error:function(text) {
			File.write(log, File.read(log) + "\n[ERROR] [" + mod.name + "] " + text);
		}
	};

	this.Config = {
		get:function(name) {
			return mod.config[name];
		}, 
		set:function(name, value) {
			mod.config[name] = value;
			Config.save(new Java.File(Paths.configs, mod.id + ".cfg"), mod.config);
		}
	};

	this.ModPE = ModPE;
	this.Level = Level;
	this.Player = Player;
	this.Entity = Entity;
	this.Item = Item;
	this.Block = Block;
	this.Server = Server;

	this.Game = {
		addCommand: function(command, func) {
			commands[command] = func;
		},
		hook : function(hookName, func) {
			mod.hooks.push([hookName, func]);
		}
	};
}

function loadMod(directory) {
	if (directory.isDirectory()) {
		var modFile = new Java.File(directory, "mod.js");
		if (modFile.isFile()) {
			var mod = new Mod(directory);
			return true;
		}
	}
}

function loadMods() {
	mods = [];
	mods["NML"] = {
		id: "NML",
		description: "First mod loader for MCPE",
		name: "NeoModLoader",
		version: NMLVersion,
		authors: "NeoKat",
		scope: {},
		hooks: []
	};
	mods.push(mods.NML);
	var list = Paths.mods.listFiles();
	list.forEach(loadMod);
}

function showModList() {
	var padding = dp2pixel(6);

	var s = {};

	s.window = {
		x: (Display.height / 16) - padding,
		y: (Display.height / 16) - padding, 
		width: Display.width - (Display.height / 8),
		height: Display.height - (Display.height / 8),
		widthP: (Display.width - (Display.height / 8)) + (padding * 2),
		heightP: (Display.height - (Display.height / 8)) + (padding * 2)
	};

	s.title = {
		width: s.window.width,
		height: s.window.height / 12
	};

	s.closeButton = {
		x: (s.window.width / 4) + (s.window.width / 32),
		y: s.window.height - (s.window.height / 6),
		width: s.window.width - (s.window.width / 4) - (s.window.width / 32),
		height: s.window.height / 6
	};

	s.configButton = {
		y: s.window.height - (s.window.height / 6),
		width: s.window.width / 4,
		height: s.window.height / 12
	};

	s.modList = {
		y: s.title.height,
		width: s.window.width / 4,
		height: s.window.height - (s.title.height + s.closeButton.height)
	};

	s.modInfo = {
		x: s.modList.width + (s.window.width / 32),
		y: s.title.height,
		width: s.window.width - (s.modList.width + (s.window.width / 32)),
		height: s.window.height - (s.title.height + s.closeButton.height)
	};

	var panel = GUI.Panel(0, 0, s.window.widthP, s.window.heightP, true);

	var modInfo = GUI.TextView();
	panel.addView(modInfo, s.modInfo.x, s.modInfo.y, s.modInfo.width, s.modInfo.height);

	var title = GUI.TextView();
	title.setText(lang.modsListTitle);
	title.setGravity(Java.Gravity.center);
	panel.addView(title, 0, 0, s.title.width, s.title.height);

	var closeButton = GUI.Button();
	closeButton.setText(lang.modsListClose);
	closeButton.setOnClickListener(function() {showModsButton();panel.dismiss();});
	panel.addView(closeButton, s.closeButton.x, s.closeButton.y, s.closeButton.width, s.closeButton.height);

	var configButton = GUI.Button();
	configButton.setText(lang.modsListConfig);
	configButton.setOnClickListener(function() {});
	configButton.setClickable(false);
	panel.addView(configButton, 0, s.configButton.y, s.configButton.width, s.configButton.height);

	var modList = GUI.ScrollList();
	mods.forEach(
		function(mod) {
			modName = mod.name + "\n";
			if (mod.version !== undefined)
				modName += mod.version;

			var listItem = GUI.Button();
			listItem.setGravity(Java.Gravity.left);
			listItem.setText(modName);
			listItem.setOnClickListener(
				function() {
					modInfo.setText(getModInfo(mod));
				});
			modList.addItem(listItem);
		});
	panel.addView(modList, 0, s.modList.y, s.modList.width, s.modList.height);

	hideModsButton();
}

function getModInfo(mod) {
	var text = mod.name + "\n" + lang.descID + ": '" + mod.id + "'\n";
	if (mod.hasOwnProperty("authors"))
		text += lang.descAuthors + ": '" + mod.authors + "'\n";
	if (mod.hasOwnProperty("description"))
		text += "\n" + mod.description;

	return text;
}

function showModsButton() {
	var layout = new android.widget.LinearLayout(context);
	buttonWindow = new android.widget.PopupWindow(layout, Java.LayoutParams.wrapContent, Java.LayoutParams.wrapContent);
	buttonWindow.setBackgroundDrawable(resources.drawable.color.transparent);

	var button = GUI.Button();
	button.setText(lang.modsButton);
	button.setOnClickListener(function() {showModList();});
	layout.addView(button);

	runOnUiThread(
		function() {
			buttonWindow.showAtLocation(context.getWindow().getDecorView(), Java.Gravity.top, 0, 0);
		}
	);
}

function hideModsButton() {
	buttonWindow.dismiss();
}

/*******************************|
 |**********API block***********|
 |*******************************/

File = {
	read: function(file) {
		if (!file.exists())
			file.createNewFile();
		var fileInput = new java.io.FileInputStream(file);
		var output = "";
		var data = fileInput.read();
		while (data != -1) {
			output += String.fromCharCode(data);
			data = fileInput.read();
		}
		fileInput.close();
		return output;
	},
	write: function(file, text) {
		if (!file.getParentFile().exists())
			file.getParentFile().mkdirs();
		file.createNewFile();
		var fileOutput = new java.io.FileOutputStream(file);
		var outputWriter = new java.io.OutputStreamWriter(fileOutput);
		outputWriter.write(text);
		outputWriter.close();
		fileOutput.close();
	}, 
	writeBytes: function(file, bytes) {
		if (!file.getParentFile().exists())
			file.getParentFile().mkdirs();
		file.createNewFile();
		var fileOutput = new java.io.FileOutputStream(file);
		fileOutput.write(bytes);
		fileOutput.close();
	}
};

Log = {
	info:function(text) {
		File.write(log, File.read(log) + "\n[INFO] [NML] " + text);
	},
	warning:function(text) {
		File.write(log, File.read(log) + "\n[WARNING] [NML] " + text);
	},
	error:function(text) {
		File.write(log, File.read(log) + "\n[ERROR] [NML] " + text);
	}
};

Config = {
	parse: function(file) {
		return JSON.parse(File.read(file));
	}, 
	save:function(file, inp) {
		File.write(file, JSON.compile(inp));
	}
};

Mods = {
	getAPI:function(id) {
		if (!Mods.isModLoaded(id) || !mods[id].scope.hasOwnProperty("API"))
			return {};
		return mods[id].scope.API;
	}, 
	getVersion: function(id) {
		if (!Mods.isModLoaded(id) || !mods[id].hasOwnProperty("version"))
			return new Version();
		return mods[id].version;
	}, 
	isModLoaded:function(id) {
		if (mods.hasOwnProperty(id))
			return true;
		return false;
	}
};

var JSON = {
	parse: function(json) {
		return new org.mozilla.javascript.json.JsonParser(jsContext, {}).parseValue(json);
	},
	compile: function(object) {
		return org.mozilla.javascript.NativeJSON.stringify(jsContext, {}, object, null, null);
	}
};

var GUI = {
	Button: function() {
		var textColor = "#FFDDDDDD";

		var button = new android.widget.Button(context);
		button.setTextSize(16);
		button.setOnTouchListener(
			new android.view.View.OnTouchListener(
				function(v, motionEvent) {
					if (button.isClickable())
						GUIUtils.onTouch(v, motionEvent);
					return false;
				}
			)
		);
		button.setAllCaps(false);
		button.setBackground(resources.drawable.gui.button.normal);
		button.setTag(false); // is pressed?
		button.setTextColor(android.graphics.Color.parseColor(textColor));
		button.setPadding(8 * Display.dpi, 8 * Display.dpi, 8 * Display.dpi, 8 * Display.dpi);
		GUI.stylizeText(button);

		return button;
	},
	TextView: function() {
		var textColor = "#FFDDDDDD";

		var textView = new android.widget.TextView(context);
		textView.setTextSize(16);
		textView.setAllCaps(false);
		textView.setTextColor(android.graphics.Color.parseColor(textColor));
		GUI.stylizeText(textView);

		return textView;
	},
	Panel: function(x, y, width, height, isCenter, outsideTouchable) {
		if (isCenter == undefined)
			isCenter = false;
		if (outsideTouchable == undefined)
			outsideTouchable = false;
		var darkWindow;
		if (!outsideTouchable) {
			darkWindow = new android.widget.PopupWindow(GUI.TextView(), -1, -1);
			darkWindow.setBackgroundDrawable(resources.drawable.color.dark);
		}

		var panel = new android.widget.FrameLayout(context);
		var padding = dp2pixel(6);
		panel.setBackgroundDrawable(resources.drawable.gui.panel);
		panel.setPadding(padding, padding, padding, padding);

		var window = new android.widget.PopupWindow(panel, width, height);

		runOnUiThread(
			function() {
				if (!outsideTouchable)
					darkWindow.showAtLocation(context.getWindow().getDecorView(), Java.Gravity.center, 0, 0);
				window.showAtLocation(context.getWindow().getDecorView(), isCenter ? Java.Gravity.center : Java.Gravity.topLeft, x, y);
			}
		);

		var controls = {
			dismiss: function() {
				darkWindow.dismiss();
				window.dismiss();
			}, 
			addView: function(view, x, y, width, height) {
				if (view.view != undefined)
					view = view.view;

				var layoutParams = android.widget.FrameLayout.LayoutParams(width, height);
				view.setLayoutParams(layoutParams);
				view.setX(x);
				view.setY(y);
				panel.addView(view);
			}
		};

		return controls;
	},
	ScrollList: function() {
		var list = new android.widget.ScrollView(context);
		var listLayout = new android.widget.LinearLayout(context);
		listLayout.setOrientation(1);
		list.addView(listLayout);

		var controls = {
			addItem: function(item) {
				var layoutParams = android.widget.FrameLayout.LayoutParams(-1, -2);
				item.setLayoutParams(layoutParams);
				listLayout.addView(item);
			},
			view: list
		};

		return controls;
	},
	stylizeText: function(textView) {
		textView.setTypeface(resources.font);
		textView.setPaintFlags(textView.getPaintFlags() | android.graphics.Paint.SUBPIXEL_TEXT_FLAG);
		textView.setLineSpacing(4 * Display.dpi, 1);
		var something = Math.round((textView.getLineHeight() - (4 * Display.dpi)) / 8);
		textView.setShadowLayer(1, something, something, android.graphics.Color.parseColor("#FF393939"));
	}
};

var GUIUtils = {
	onTouch: function(v, motionEvent) {
		var textColor = "#FFDDDDDD";

		var action = motionEvent.getActionMasked();

		if (action == android.view.MotionEvent.ACTION_DOWN) //button pressed
			GUIUtils.changeToPressedState(v);

		if (action == android.view.MotionEvent.ACTION_CANCEL || action == android.view.MotionEvent.ACTION_UP) //button released
			GUIUtils.changeToNormalState(v, textColor);

		if (action == android.view.MotionEvent.ACTION_MOVE) {
			var rect = new android.graphics.Rect(v.getLeft(), v.getTop(), v.getRight(), v.getBottom());
			if (rect.contains(v.getLeft() + motionEvent.getX(), v.getTop() + motionEvent.getY())) {
				// pointer inside the view
				if (v.getTag() == false) {
					// restore pressed state
					v.setTag(true); // is pressed?

					GUIUtils.changeToPressedState(v);
				}
			} else {
				// pointer outside the view
				if (v.getTag() == true) {
					// restore pressed state
					v.setTag(false); // is pressed?

					GUIUtils.changeToNormalState(v, textColor);
				}
			}
		}
	},
	changeToNormalState: function(button, textColor) {
		button.setBackground(resources.drawable.gui.button.normal);
		button.setTextColor(android.graphics.Color.parseColor(textColor));
		var something = Math.round((button.getLineHeight() - (4 * Display.dpi)) / 8);
		button.setShadowLayer(1, something, something, android.graphics.Color.parseColor("#FF393939"));
	}, 
	changeToPressedState: function(button) {
		button.setBackground(resources.drawable.gui.button.pressed);
		button.setTextColor(android.graphics.Color.parseColor("#FFFFFF9C"));
		var something = Math.round((button.getLineHeight() - (4 * Display.dpi)) / 8);
		button.setShadowLayer(1, something, something, android.graphics.Color.parseColor("#FF3E3E28"));
	}
};

var Resources = {
	get: function(path) {
		var bytes = ModPE.getBytesFromTexturePack(path);
		if (bytes == null)
			return false;
		return bytes;
	},
	getString: function(path) {
		var bytes = ModPE.getBytesFromTexturePack(path);
		if (bytes == null)
			return false;
		return new java.lang.String(bytes);
	}
};

var Hooks = {
	call: function(hookName, args) {
		mods.forEach(
			function(mod) {
				if (mod.scope.hasOwnProperty(hookName))
					mod.scope[hookName].apply(mod.scope, args);
				mod.hooks.forEach(
					function(hook) {
						if (hook[0] == hookName)
							hook[1].apply(mod.scope, args);
					}
				);
			}
		);
	}
};

function getResourceImage(path) {
	var bytes = ModPE.getBytesFromTexturePack(path);
	if (bytes == null)
		return false;
	return android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
}

function getResource9Patch(path, widthDp, heightDp, widthPadding, heightPadding) {
	var bytes = ModPE.getBytesFromTexturePack(path);
	if (bytes == null)
		return false;
	var bitmap =  android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
	var scaledBitmap = android.graphics.Bitmap.createScaledBitmap(bitmap, Math.round(dp2pixel(widthDp)), Math.round(dp2pixel(heightDp)), false); // scale image to a bigger size and based on density
	var NO_COLOR = 0x00000001;
	var buffer = java.nio.ByteBuffer.allocate(84).order(java.nio.ByteOrder.nativeOrder());
	buffer.put(0x01); //was translated
	for (var i = 1;i <= 2;i++) buffer.put(0x02); //divx & divy size
	buffer.put(0x09); //color size
	for (var i = 1;i <= 7;i++) buffer.putInt(0); //skip + padding + skip 4 bytes
	buffer.putInt(dp2pixel(widthPadding));
	buffer.putInt(dp2pixel(widthDp - widthPadding));
	buffer.putInt(dp2pixel(heightPadding));
	buffer.putInt(dp2pixel(heightDp - heightPadding));
	for (var i = 1;i <= 9;i++) buffer.putInt(NO_COLOR);

	return new android.graphics.drawable.NinePatchDrawable(context.getResources(), scaledBitmap, buffer.array(), new android.graphics.Rect(), ""); // convert to NinePatch
};

function dp2pixel(dp) {
	return (dp * Display.dpi);
}

/*******************************|
 |********Initialization********|
 |*******************************/

function init() {
	for (var i = 0;;i++)
		if (!new Java.File(Paths.logs + date + "-" + i + ".log").exists()) {
			log = new Java.File(Paths.logs, date + "-" + i + ".log");
			break;
		}
	File.write(log, "[INFO] NML initialization");

	initFiles();
	initResources();
	showModsButton();
	loadMods();
	initMods();
}

function initFiles() {
	Paths.minecraft.mkdirs();
	Paths.mods.mkdirs();
	Paths.configs.mkdirs();
	Paths.logs.mkdirs();
	Paths.tmp.mkdirs();
}

function initResources() {
	File.writeBytes(new Java.File(Paths.tmp, "font.ttf"), Resources.get("font.ttf"));
	resources.font = android.graphics.Typeface.createFromFile(new Java.File(Paths.tmp, "font.ttf"));
	new Java.File(Paths.tmp, "font.ttf")["delete"]();

	lang = JSON.parse(Resources.getString("lang/en-US.lang"));

	resources.drawable.gui.button.normal = getResource9Patch("gui/button/normal.png", 16, 16, 4, 4);
	resources.drawable.gui.button.pressed = getResource9Patch("gui/button/pressed.png", 16, 16, 4, 4);
	resources.drawable.gui.window = getResource9Patch("gui/window.png", 32, 32, 8, 8);
	resources.drawable.gui.panel = getResource9Patch("gui/panel.png", 28, 28, 6, 6);
}

function initMods() {
	var unmetMods = [];
	while (unmetMods.length != cachedMods.length) {
		unmetMods = [];
		while (cachedMods.length > 0) {
			var mod = cachedMods.shift();
			var dependenciesMet = true;
			mod.dependencies.forEach(
				function(item, index, array) {
					if (!Mods.isModLoaded(item))
						dependenciesMet = false;
				}
			);
			if (dependenciesMet) {
				var modFile = new Java.File(mod.directory, "mod.js");
				jsContext.evaluateReader(mod.scope, new java.io.FileReader(modFile), modFile.getName(), 0, null);
				mods[mod.id] = mod;
				mods.push(mod);
			} else {
				unmetMods.push(mod);
			}
		}
		cachedMods = unmetMods;
	}
}

init();

/*******************************|
 |*************Hooks************|
 |*******************************/

function attackHook(attacker, victim) {
	Hooks.call(arguments.callee.name, arguments);
}

function chatHook(str) {
	if (str.startsWith("/")) {
		var spl = str.slice(1).split(" ");
		if (commands.hasOwnProperty(spl[0]))
			commands[spl.shift()].apply(undefined, spl);
	} else {
		Hooks.call(arguments.callee.name, arguments);
	}
}

function continueDestroyBlock(x, y, z, side, progress) {
	Hooks.call(arguments.callee.name, arguments);
}

function destroyBlock(x, y, z, side) {
	Hooks.call(arguments.callee.name, arguments);
}

function projectileHitEntityHook(projectile, targetEntity) {
	Hooks.call(arguments.callee.name, arguments);
}

function eatHook(hearts, saturationRatio) {
	Hooks.call(arguments.callee.name, arguments);
}

function entityAddedHook(entity) {
	Hooks.call(arguments.callee.name, arguments);
}

function entityHurtHook(attacker, victim, halfhearts) {
	Hooks.call(arguments.callee.name, arguments);
}

function entityRemovedHook(entity) {
	Hooks.call(arguments.callee.name, arguments);
}

function explodeHook(entity, x, y, z, power, onFire) {
	Hooks.call(arguments.callee.name, arguments);
}

function serverMessageReceiveHook(str) {
	Hooks.call(arguments.callee.name, arguments);
}

function deathHook(attacker, victim) {
	Hooks.call(arguments.callee.name, arguments);
}

function playerAddExpHook(player, experienceAdded) {
	Hooks.call(arguments.callee.name, arguments);
}

function playerExpLevelChangeHook(player, levelsAdded) {
	Hooks.call(arguments.callee.name, arguments);
}

function redstoneUpdateHook(x, y, z, newCurrent, someBooleanIDontKnow, blockId, blockData) {
	Hooks.call(arguments.callee.name, arguments);
}

function newLevel() {
	Hooks.call(arguments.callee.name, arguments);
}

function startDestroyBlock(x, y, z, side) {
	Hooks.call(arguments.callee.name, arguments);
}

function projectileHitBlockHook(projectile, blockX, blockY, blockZ, side) {
	Hooks.call(arguments.callee.name, arguments);
}

function modTick() {
	Hooks.call(arguments.callee.name, arguments);
}

function useItem(x, y, z, itemid, blockid, side, itemDamage, blockDamage) {
	Hooks.call(arguments.callee.name, arguments);
}
