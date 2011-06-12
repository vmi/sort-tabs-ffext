/* ***** BEGIN LICENSE BLOCK *****
 * Version: MIT/X11 License
 * 
 * Copyright (c) 2010 Original Author
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * Contributor(s):
 *   Erik Vold <erikvvold@gmail.com> (Original Author)
 *   Greg Parris <greg.parris@gmail.com>
 *
 * ***** END LICENSE BLOCK ***** */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

const NS_XUL = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const PREF_BRANCH = "extensions.sort-tabs.";
const PREFS = {
  sortBy: "alpha"
};

var prefChgHandlers = [];
let PREF_OBSERVER = {
  observe: function(aSubject, aTopic, aData) {
    if ("nsPref:changed" != aTopic || !(aData in PREFS)) return;
    prefChgHandlers.forEach(function(func) func && func(aData));
  }
}

function setPref(aKey, aVal) {
  switch (typeof(aVal)) {
    case "string":
      var ss = Cc["@mozilla.org/supports-string;1"]
          .createInstance(Ci.nsISupportsString);
      ss.data = aVal;
      Services.prefs.getBranch(PREF_BRANCH)
          .setComplexValue(aKey, Ci.nsISupportsString, ss);
      break;
  }
}

(function(global) global.include = function include(src) (
    Services.scriptloader.loadSubScript(src, global)))(this);

function main(win) {
    Services.console.logStringMessage("main");
  let doc = win.document;
  let gBrowser = win.gBrowser;
  function $(id) doc.getElementById(id);
  function xul(type) doc.createElementNS(NS_XUL, type);

  function markTime(event) {
    let tab = event.target;
    tab.setAttribute("created", Date.now());
  }

  win.addEventListener("TabOpen", markTime, false);
  unload(function() {
    win.removeEventListener("TabOpen", markTime, false);
    for (let [, tab] in Iterator(gBrowser.tabs))
      tab.removeAttribute("created");
  });

  function sortTabs(aType) {
    var tabs = [], sortFunc;
    aType = aType || checkedVal || "alpha";

    for (var i = gBrowser.tabs.length - 1; ~i; i--) tabs[i] = gBrowser.tabs[i];

    switch (aType) {
      case "alpha":
        sortFunc = function(a, b) {
          return a.label.toLocaleLowerCase()
              .localeCompare(b.label.toLocaleLowerCase());
        };
        break;
      case "timeOpened":
        sortFunc = function(a, b) {
          var aTime = a.getAttribute("created"),
              bTime = b.getAttribute("created");
          return (aTime < bTime ? -1 : aTime > bTime ? 1 : 0);
        }
        break;
      case "url":
        sortFunc = function(a, b) {
          var aURL = gBrowser.getBrowserForTab(a).currentURI.spec,
              bURL = gBrowser.getBrowserForTab(b).currentURI.spec;
          return aURL.toLocaleLowerCase().localeCompare(bURL.toLocaleLowerCase());
        };
        break;
      default:
        throw new Error(_("error.invalidSortType") + aType);
    }

    // Update the "checked" value
    if (checkedVal != aType)
      setPref("sortBy", aType);

    tabs.sort(sortFunc).forEach(gBrowser.moveTabTo.bind(gBrowser));
    Services.console.logStringMessage("Sorted tabs by: " + aType);
  };

  // Expose sortTabs
  gBrowser.sortTabs = sortTabs;

  var sortTypes = [
    {value: "alpha", label: _("sort.alphabetically")},
    {value: "timeOpened", label: _("sort.timeOpened")},
    {value: "url", label: _("sort.url")}
  ];

  var checkedVal = getPref("sortBy");

  var menu = xul("splitmenu");
  menu.setAttribute("label", _("sortTabs"));
  menu.setAttribute("oncommand", "gBrowser.sortTabs()");

  var menuPopup = xul("menupopup");

  for (var i=0; i < sortTypes.length; i++) {
    let sortType = sortTypes[i];
    let menuItem = xul("menuitem");
    menuItem.setAttribute("label", sortType.label);
    menuItem.setAttribute("name", "sortTabsItem");
    menuItem.setAttribute("type", "radio");
    menuItem.setAttribute("value", sortType.value);
    menuItem.addEventListener("command", function() sortTabs(sortType.value), true);
    if (checkedVal == sortType.value) menuItem.setAttribute("checked", "true");
    menuPopup.appendChild(menuItem);
  }

  menu.appendChild(menuPopup);
  $("tabContextMenu").insertBefore(menu, $("context_reloadAllTabs"));

  var prefChgHandlerIndex = prefChgHandlers.push(function(aData) {
    switch (aData) {
      case "sortBy":
        checkedVal = getPref(aData);
        let children = menuPopup.children;
        for (var i=0; i < children.length; i++)
          children[i].setAttribute("checked", checkedVal == children[i].value);
        break;
    }
  }) - 1;

  unload(function() {
    prefChgHandlers[prefChgHandlerIndex] = null;
    menu.parentNode.removeChild(menu);
  }, win);
}

var addon = {
  getResourceURI: function(filePath) ({
    spec: __SCRIPT_URI_SPEC__ + "/../" + filePath
  })
}

function disable(id) {
  Cu.import("resource://gre/modules/AddonManager.jsm");
  AddonManager.getAddonByID(id, function(addon) {
    addon.userDisabled = true;
  });
}

function install() {}
function uninstall() {}
function startup(data) {
  include(addon.getResourceURI("includes/utils.js").spec);

  include(addon.getResourceURI("includes/prefs.js").spec);
  var prefs = Services.prefs.getBranch(PREF_BRANCH);
  prefs = prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
  prefs.addObserver("", PREF_OBSERVER, false);
  setDefaultPrefs();
  unload(function() prefs.removeObserver("", PREF_OBSERVER));

  include(addon.getResourceURI("includes/l10n.js").spec);
  l10n(addon, "st.properties");
  unload(l10n.unload);

  watchWindows(main, "navigator:browser");
};
function shutdown(data, reason) unload()
