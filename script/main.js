var Resources = [
	"font.ttf",
	"lang/en-US.lang"
];

var context = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
var jsContext = new org.mozilla.javascript.ContextFactory().enterContext();
var transparentDrawable = new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT);
var blackDrawable = new android.graphics.drawable.ColorDrawable(android.graphics.Color.BLACK);
function runOnUiThread(func) {context.runOnUiThread(func);}
print = function(s) {runOnUiThread(function() {try {android.widget.Toast.makeText(context, "[NML]: " + s, 500).show();} catch (err) {}});};
var date = java.lang.String.valueOf(android.text.format.DateFormat.format("yyyy-MM-dd_HH.mm.ss", new java.util.Date()));
var log;
var mods = [];
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

var Paths = new Object();
Paths.minecraft = new Java.File("/sdcard/games/com.mojang/minecraftpe");
Paths.mods = new Java.File(Paths.minecraft, "mods");
Paths.configs = new Java.File(Paths.minecraft, "configs");
Paths.logs = new Java.File(Paths.minecraft, "logs");
Paths.tmp = new Java.File("/sdcard/games/com.mojang/minecraftpe/tmp");

var minecraftFont;

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
		if (this.major == ver.major && this.minor < ver.minor)
			return true;
		if (this.major == ver.major && this.minor == ver.minor && this.build < ver.build)
			return true;
		return false;
	};

	this.equalsTo = function(ver) {
		if (this.major == ver.major && this.minor == ver.minor && this.build == ver.build)
			return true;
		return false;
	};

	this.biggerThan = function(ver) {
		if (this.major > ver.major)
			return true;
		if (this.major == ver.major && this.minor > ver.minor)
			return true;
		if (this.major == ver.major && this.minor == ver.minor && this.build > ver.build)
			return true;
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

	if (Mods.isModLoaded(info["id"])) {
		Log.error("Mod cannot be loaded. Mod with id \"" + info.id + "\"already loaded.");
	}

	this.name = info.name;
	this.id = info.id;
	this.description = info["description"] === undefined ? "No description available." : info.description;
	this.version = info["version"] === undefined ? undefined : new Version(info.version);
	this.authors = info["authors"] === undefined ? undefined : info.authors;

	this.config = new Object();
	var modFile = new Java.File(this.directory, "mod.js");
	this.scope = new API(this);

	jsContext.evaluateReader(this.scope, new java.io.FileReader(modFile), modFile.getName(), 0, null);

	mods[this.id] = this;
	mods.push(this);
}

function API(mod) {
	this.File = File;
	this.Mods = Mods;

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
		getFull:function() {
			return mods[mod.id].config;
		},
		set:function(name, value) {
			mod.config[name] = value;
			Config.save(new Java.File(Paths.configs, mod.id + ".cfg", mod.config));
			return true;
		},
		setFull:function(value) {
			mod.config = value;
			Config.save(new Java.File(Paths.configs, mod.id + ".cfg", mod.config));
			return true;
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
		version: new Version("0.0.1"),
		authors: "NeoKat",
		scope: {}
	};
	mods.push(mods.NML);
	var list = Paths.mods.listFiles();
	list.forEach(
		function(item, index, array) {
			loadMod(item);
		}
	);
}

function showModList() {
	var layout = new android.widget.RelativeLayout(context);

	var window = new android.widget.PopupWindow(layout, Java.LayoutParams.fillParent, Java.LayoutParams.fillParent);
	window.setBackgroundDrawable(blackDrawable);

	var layoutParams;

	var width = context.getResources().getDisplayMetrics().widthPixels;
	var height = context.getResources().getDisplayMetrics().heightPixels;
	var width4 = width / 4;
	var width32 = width / 32;
	var height5 = height / 5;
	var height10 = height / 10;

	var modInfo = new android.widget.TextView(context);
	modInfo.setTypeface(minecraftFont);
	layoutParams = android.widget.RelativeLayout.LayoutParams(width - width4 - width32, height - height5);
	layoutParams.addRule(11);
	layoutParams.addRule(15);
	modInfo.setLayoutParams(layoutParams);
	layout.addView(modInfo);

	var title = new android.widget.TextView(context);
	title.setTypeface(minecraftFont);
	title.setText(lang.modsListTitle);
	title.setGravity(Java.Gravity.center);
	layoutParams = android.widget.RelativeLayout.LayoutParams(-1, height10);
	layoutParams.addRule(10);
	title.setLayoutParams(layoutParams);
	layout.addView(title);

	var closeButton = new android.widget.Button(context);
	closeButton.setTypeface(minecraftFont);
	closeButton.setText(lang.modsListClose);
	closeButton.setOnClickListener(function() {window.dismiss();});
	layoutParams = android.widget.RelativeLayout.LayoutParams(-1, height10);
	layoutParams.addRule(12);
	closeButton.setLayoutParams(layoutParams);
	layout.addView(closeButton);

	var modList = new android.widget.ScrollView(context);
	var modListLayout = new android.widget.LinearLayout(context);
	modListLayout.setOrientation(1);
	modList.addView(modListLayout);
	mods.forEach(
		function(mod, index, array) {
			modName = mod.name + "\n";
			if (mod.version !== undefined)
				modName += mod.version;

			var listItem = new android.widget.Button(context);
			listItem.setTypeface(minecraftFont);
			listItem.setGravity(Java.Gravity.left);
			listItem.setText(modName);
			listItem.setOnClickListener(
				function() {
					modInfo.setText(getModInfo(mod));
				});
			modListLayout.addView(listItem);
		});
	layoutParams = android.widget.RelativeLayout.LayoutParams(width4, height - height5);
	layoutParams.addRule(9);
	layoutParams.addRule(15);
	modList.setLayoutParams(layoutParams);
	layout.addView(modList);

	runOnUiThread(
		function() {
			window.showAtLocation(context.getWindow().getDecorView(), Java.Gravity.center, 0, 0);
		}
	);
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
	buttonWindow.setBackgroundDrawable(transparentDrawable);

	var button = new android.widget.Button(context);
	button.setTypeface(minecraftFont);
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

/******************************/
/**********API block***********/
/******************************/

File = {
	read: function(file) {
		if (!file.exists()) {
			file.createNewFile();
		}
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
		File.writeFile(file, JSON.compile(out));
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

function getResource(path) {
	var bytes = ModPE.getBytesFromTexturePack(path);
	if (bytes == null)
		return false;
	return new java.lang.String(bytes);
}

function getResourceBytes(path) {
	var bytes = ModPE.getBytesFromTexturePack(path);
	if (bytes == null)
		return false;
	return bytes;
}

/******************************/
/*****Initialization block*****/
/******************************/

function init() {
	for (var i = 0;;i++)
		if (!new Java.File(Paths.logs + date + "-" + i + ".log").exists()) {
			log = new Java.File(Paths.logs, date + "-" + i + ".log");
			break;
		}
	File.write(log, "[INFO] NML initialization");
	
	initFiles();
	loadMods();
	showModsButton();
}

function initFiles() {
	Paths.minecraft.mkdirs();
	Paths.mods.mkdirs();
	Paths.configs.mkdirs();
	Paths.logs.mkdirs();
	Paths.tmp.mkdirs();

	Resources.forEach(
		function(item, index, array) {
			if (!getResource(item)) {
				Log.error("NML can't load because some resources is unaccessible.");
				throw new java.lang.Exception("NML can't load because some resources is unaccessible.");
			}
		}
	);

	if (!new Java.File(Paths.tmp, "font.ttf").exists())
		File.writeBytes(new Java.File(Paths.tmp, "font.ttf"), getResourceBytes("font.ttf"));
	minecraftFont = android.graphics.Typeface.createFromFile(new Java.File(Paths.tmp, "font.ttf"));
	new Java.File(Paths.tmp, "font.ttf")["delete"]();
	
	lang = JSON.parse(getResource("lang/en-US.lang"));
}

init();
