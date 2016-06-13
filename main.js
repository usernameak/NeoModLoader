var context = com.mojang.minecraftpe.MainActivity.currentMainActivity.get();
var jsContext = new org.mozilla.javascript.ContextFactory().enterContext();
var transparentDrawable = new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT);
var blackDrawable = new android.graphics.drawable.ColorDrawable(android.graphics.Color.BLACK);
function runOnUiThread(func) {context.runOnUiThread(func);}
print = function(s) {runOnUiThread(function() {try {android.widget.Toast.makeText(context, "[NML]: " + s, 500).show();} catch (err) {}});};
var date = java.lang.String.valueOf(android.text.format.DateFormat.format("yyyy-MM-dd_HH.mm.ss", new java.util.Date()));
var log;
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
Paths.res = new Java.File("/sdcard/games/com.mojang/minecraftpe/res");

var minecraftFont = android.graphics.Typeface.createFromFile(new Java.File(Paths.res, "font.ttf"));

var lang = {
	descVersion: "Version",
	descID: "Mod ID",
	descAuthors: "Authors",
	descNoDescription: "No description available.",
	modsListTitle: "Mods List",
	modsListClose: "Close",
	modsButton: "Mods"
};

var Mods = [];

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

function Mod(modDir) {
	this.directory = modDir;

	if (new Java.File(modDir, "pemod.info").isFile()) {
		var info = Config.parse(new Java.File(modDir, "pemod.info"));
		if (info["id"] == undefined) {
			Log.error("Mod \"" + modDir.getName() + "\" cannot be loaded. pemod.info is missing");
			return;
		}
		this.name = info["name"] === undefined ? modDir.getName() : info["name"];
		this.id = info["id"] === undefined ? undefined : info["id"];
		this.description = info["description"] === undefined ? "No description available." : info["description"];
		this.version = info["version"] === undefined ? undefined : new Version(info["version"]);
		this.authors = info["authors"] === undefined ? undefined : info["authors"];
	} else {
		Log.error("Mod \"" + modDir.getName() + "\" cannot be loaded. pemod.info is missing");
		return;
	}

	this.config = new Object();
	var modFile = new Java.File(this.directory, "mod.js");
	this.scope = new API(this);

	jsContext.evaluateReader(this.scope, new java.io.FileReader(modFile), modFile.getName(), 0, null);

	Mods[this.id] = this;
	Mods.push(this);
}

function API(mod) {
	var Log;
	var File;
	var Mods;
	var Config;
	var print;

	print = function(s) {runOnUiThread(function() {try {android.widget.Toast.makeText(context, "[" + mod.name + "]: " + s, 500).show();} catch (err) {print(err);}});};

	Log = {
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

	File = {
		read: function(file) {
			var source = file;
			var fis = null;
			var out = "";
			if (!source.exists()) {
				source.createNewFile();
			}
			try {
				fis = new java.io.FileInputStream(source);
			} catch (e) {
				Log.error(e);
			}
			var data = fis.read();
			while (data != -1) {
				out += String.fromCharCode(data);
				data = fis.read();
			}
			fis.close();
			return out;
		},
		write: function(file, text) {
			var fhandle = file;
			try {
				if (!fhandle.getParentFile().exists())
					fhandle.getParentFile().mkdirs();
				fhandle.createNewFile();
				var fOut = new java.io.FileOutputStream(fhandle);
				var myOutWriter = new java.io.OutputStreamWriter(fOut);
				myOutWriter.write(text);
				myOutWriter.close();
				fOut.close();
			} catch (e) {
				Log.error(e);
			}
		}
	};

	Mods = {
		getAPI: ModsAPI.getAPI, 
		getVer: ModsAPI.getVer, 
		getBuild: ModsAPI.getBuild, 
		isModLoaded: ModsAPI.isModLoaded
	};

	this.print = print;
	this.Log = Log;
	this.File = File;
	this.Mods = Mods;

	if (mod.id != undefined) {
		Config = {
			get:function(name) {
				return Mods[mod.id][name];
			}, 
			getFull:function() {
				return Mods[mod.id].config;
			},
			set:function(name, value) {
				if (typeof Mods[mod.id].config == "object") {
					Mods[mod.id].config[name] = value;
					Config.save(new Java.File(Paths.configs, mod.id + ".cfg", Mods[mod.id].config));
					return true;
				}
				return false;
			},
			setFull:function(value) {
				if (typeof Mods[mod.id].config == "object" && typeof val == "object") {
					Mods[mod.id].config = value;
					Config.save(new Java.File(Paths.configs, mod.id + ".cfg", Mods[mod.id].config));
					return true;
				}
				return false;
			}
		};
	}
}

function loadMod(directory) {
	try {
		if (directory.isDirectory()) {
			var modFile = new Java.File(directory, "mod.js");
			if (modFile.isFile()) {
				var mod = new Mod(directory);
				return true;
			}
		}
	} catch (e) {
		Log.error(e);
		return false;
	}
	return false;
}

function loadMods() {
	try {
		Mods = [];
		Mods["NML"] = {
			id: "NML",
			description: "First mod loader for MCPE",
			name: "NeoModLoader",
			version: new Version("0.0.1"),
			authors: "NeoKat"
		};
		Mods.push(Mods.NML);
		var list = Paths.mods.listFiles();
		for (var i = 0;i < list.length;i++) {
			if (list[i].isDirectory()) {
				loadMod(list[i]);
			}
		}
	} catch (e) {
		Log.error(e);
	}
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
	closeButton.setOnClickListener(function(){window.dismiss();});
	layoutParams = android.widget.RelativeLayout.LayoutParams(-1, height10);
	layoutParams.addRule(12);
	closeButton.setLayoutParams(layoutParams);
	layout.addView(closeButton);
	
	var modList = new android.widget.ScrollView(context);
	var modListLayout = new android.widget.LinearLayout(context);
	modListLayout.setOrientation(1);
	modList.addView(modListLayout);
	Mods.forEach(
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
	var text = "";
	if (mod.name != undefined)
		text += mod.name + "\n";
	if (mod.id != undefined)
		text += lang.descID + ": '" + mod.id + "'\n";
	if (mod.authors != undefined)
		text += lang.descAuthors + ": '" + mod.authors + "'\n";
	if (mod.description != undefined)
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
	button.setOnClickListener(function(){showModList();});
	layout.addView(button);

	runOnUiThread(
		function() {
			buttonWindow.showAtLocation(context.getWindow().getDecorView(), Java.Gravity.top, 0, 0);
		}
	);
}

function hideModsButton() {

}
































































/******************************/
/**********API block***********/
/******************************/


File = {
	read: function(file) {
		var source = file;
		var fis = null;
		var out = "";
		if (!source.exists()) {
			source.createNewFile();
		}
		try {
			fis = new java.io.FileInputStream(source);
		} catch (e) {

		}
		var data = fis.read();
		while (data != -1) {
			out += String.fromCharCode(data);
			data = fis.read();
		}
		fis.close();
		return out;
	},
	write: function(file, text) {
		var fhandle = file;
		try {
			if (!fhandle.getParentFile().exists())
				fhandle.getParentFile().mkdirs();
			fhandle.createNewFile();
			var fOut = new java.io.FileOutputStream(fhandle);
			var myOutWriter = new java.io.OutputStreamWriter(fOut);
			myOutWriter.write(text);
			myOutWriter.close();
			fOut.close();
		} catch (e) {

		}
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

ModsAPI = {
	add: function(mod, id) {
		if (id != undefined) {
			if (mods[id] == undefined)
				mods[id] = mod;
		} else {
			if (id == "NML")
				return false;
			mods.push(mod);
		}
	},
	get: function(id) {
		return mods[id];
	},
	getByInt: function(i) {
		return mods[i];
	},
	getAPI:function(modName) {
		if (modName == "NML")
			return {};
		if (!ModsAPI.isModLoaded(modName))
			return {};
		if (ModsAPI.get(modName).scope.API == undefined)
			return {};
		return ModsAPI.get(modName).scope.API;
	}, 
	getVer: function(modName) {
		if (modName == "NML")
			return version;
		if (!ModsAPI.isModLoaded(modName))
			return "";
		if (ModsAPI.get(modName).modInfo.version == undefined)
			return "";
		return ModsAPI.get(modName).modInfo.version;
	}, 
	getBuild:function(modName) {
		if (modName == "NML")
			return build;
		if (!ModsAPI.isModLoaded(modName))
			return "";
		if (ModsAPI.get(modName).modInfo.build == undefined)
			return "";
		return ModsAPI.get(modName).modInfo.build;
	}, 
	isModLoaded:function(modID) {
		if (Mods.hasOwnProperty(modID))
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













































































/******************************/
/*****Initialization block*****/
/******************************/

for (var i = 0;;i++)
	if (!new Java.File(Paths.logs + date + "-" + i + ".log").exists()) {
		log = new Java.File(Paths.logs, date + "-" + i + ".log");
		break;
	}

function init() {
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
}

init();
//var bbb = true;
//var thread = new java.lang.Thread(function(){while(true){if(bbb!=true)print(bbb);}});
//thread.start();
