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
  unload(function() win.removeEventListener("TabOpen", markTime, false));

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
        throw new Error("Invalid sort type: " + aType);
    }

    // Update the "checked" value
    checkedVal = aType;

    tabs.sort(sortFunc).forEach(gBrowser.moveTabTo.bind(gBrowser));
    Services.console.logStringMessage("Sorted tabs by: " + aType);
  };

  // Expose sortTabs
  gBrowser.sortTabs = sortTabs;

  var sortTypes = [
    {value: "alpha", label: "Sort alphabetically"},
    {value: "timeOpened", label: "Sort by time opened"},
    {value: "url", label: "Sort by URL"}
  ];

  // TODO: keep track of the user-checked value... initial value = preference
  var checkedVal = sortTypes[0].value;

  var menu = xul("splitmenu");
  menu.setAttribute("label", "Sort Tabs");
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

  unload(function() menu.parentNode.removeChild(menu), win);
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

  watchWindows(main, "navigator:browser");
};
function shutdown(data, reason) unload()
