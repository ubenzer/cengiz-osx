jQuery(document).ready(function() {
	var gui = require('nw.gui');


	jQuery("#baseUrl").val(localStorage.jenkinsUrl || "");

	gui.Window.get().show();

	jQuery("#save").click(function() {
		localStorage.jenkinsUrl = jQuery("#baseUrl").val();
		gui.Window.get().close();
	});

	var menu = new gui.Menu()
	menu.append(new gui.MenuItem({
		label: "Cut",
		click: function() {
			document.execCommand("cut");
		}
	}));
	menu.append(new gui.MenuItem({
		label: "Copy",
		click: function() {
			document.execCommand("copy");
		}
	}));
	menu.append(new gui.MenuItem({
		label: "Paste",
		click: function() {
			document.execCommand("paste");
		}
	}));

	$("#baseUrl").on("contextmenu", function(e) {
		e.preventDefault();
		menu.popup(e.originalEvent.x, e.originalEvent.y);
	});

	$("a[target=external]").click(function(e) {
		e.preventDefault();
		gui.Shell.openExternal($(this).attr("href"));
	})
});