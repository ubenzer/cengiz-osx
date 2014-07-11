var getJenkinsUrl = function() {
	return localStorage.jenkinsUrl || "";
};

var JENKINS_API = "api/json";
var UPDATE_INTERVAL = 10000;

var gui = require('nw.gui');
var numeral = require('numeral');

// Create a tray icon
var tray = new gui.Tray({ icon: "img/jenkins.png" });

// Give it a menu
var menu = new gui.Menu();
tray.menu = menu;

var buildMenuMap = {};
var iterationCount = 0;

var gotoPreferences = function() {
	gui.Window.open(
		'preferences.html', {
			toolbar: false,
			position: 'center',
			width: 400,
			height: 200,
			resizable: false,
			fullscreen: false,
			show: false
		}
	);
};

var failMenuItem = new gui.MenuItem({label: "Check your connection!", 	enabled: false, icon: "img/vpn.png"});
var failVisible = false;
var clearFail = function() {
	if(!failVisible) { return; }
	menu.remove(failMenuItem);
	failVisible = false;
};

var configureMenuItem = new gui.MenuItem({label: "Configure your Jenkins!", click: gotoPreferences});
var configureVisible = false;
var clearConfigure = function() {
	if(!configureVisible) { return; }
	menu.remove(configureMenuItem);
	configureVisible = false;
};

var clearBuilds = function() {
	buildMenuMap = {};
	var found = true;
	while(found) {
		found = false;
		for (var i = 0; i < menu.items.length; i++) {
			var menuItem = menu.items[i];
			if (menuItem.$$type == "build") {
				menu.remove(menuItem);
				found = true;
				break;
			}
		}
	}
};


menu.append(new gui.MenuItem({type: "separator"}));
menu.append(new gui.MenuItem({label: "Preferences", click: gotoPreferences }));
menu.append(new gui.MenuItem({label: "Quit", click: function() {
	gui.App.quit();
}}));


var updateBuilds = function() {
	var JENKINS_URL = getJenkinsUrl();
	if(JENKINS_URL.length < 1) {
		clearBuilds();
		clearFail();
		if(!configureVisible) {
			menu.insert(configureMenuItem, 0);
			configureVisible = true;
		}
		return
	}
	jQuery.getJSON(JENKINS_URL + JENKINS_API)
		.done(function (projectSummary) {
			clearFail();
			clearConfigure();
			iterationCount++;
			var currentIterationCount = iterationCount;
			jQuery.each(projectSummary.builds, function (idx, build) {
				var menuItem = buildMenuMap[build.number];
				if(!menuItem) {
					menuItem = new gui.MenuItem({label: "#" + build.number});
					menuItem.$$type = "build";
					menuItem.$$buildNumber = build.number;
					menuItem.click = function() {
						gui.Shell.openExternal(JENKINS_URL + build.number + "/");
					};
					menu.insert(menuItem, idx);
					buildMenuMap[build.number] = menuItem;
				}
				menuItem.$$iterationCount = currentIterationCount;

				if(menuItem.$$dontCheckAgain) { return; }

				jQuery.getJSON(JENKINS_URL + build.number + "/" + JENKINS_API)
					.done(function (buildInfo) {
						var isBuilding = buildInfo.building;
						var estimatedDuration = buildInfo.estimatedDuration;
						var duration = buildInfo.duration;
						var startedAt = buildInfo.timestamp;
						var currentTime = (new Date()).getTime();
						var result = buildInfo.result;

						var leftStr = numeral(((startedAt + estimatedDuration) - currentTime) / 1000 / 60).format('0.00');
						var durationStr = numeral(duration / 1000 / 60).format('0.00');

						if (isBuilding) {
							menuItem.icon = "img/inProgress.png";
							menuItem.label = "#" + build.number + " - " + leftStr + " mins left";
						} else {
							menuItem.$$dontCheckAgain = true;
							if(result == "ABORTED") {
								menuItem.icon = "img/aborted.png";
								menuItem.label = "#" + build.number + " - Aborted after " + durationStr + " mins";
							} else if (result == "FAILURE") {
								menuItem.icon = "img/failed.png";
								menuItem.label = "#" + build.number + " - Failed after " + durationStr + " mins";
							} else {
								menuItem.icon = "img/tick.png";
								menuItem.label = "#" + build.number + " - Succeeded in  " + durationStr + " mins";
							}
						}
					});
			});

			jQuery.each(menu.items, function(idx, menuItem) {
				if(menuItem.$$type == "build" && menuItem.$$iterationCount != currentIterationCount) {
					delete buildMenuMap[menuItem.$$buildNumber];
					menu.remove(menuItem);
				}
			});
		})
		.fail(function() {
			 clearBuilds();
			 clearConfigure();
			 if(!failVisible) {
				menu.insert(failMenuItem, 0);
				failVisible = true;
			 }
		});
};

updateBuilds();
setInterval(updateBuilds, UPDATE_INTERVAL);

