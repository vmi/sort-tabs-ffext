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

  var menuitem = xul("menuitem");
  menuitem.setAttribute("label", "Sort Tabs by URI");
  menuitem.addEventListener("command", function() {
      var tabs = [];
      for (var i = gBrowser.tabs.length - 1; ~i; i--) tabs[i] = gBrowser.tabs[i];
        tabs.sort(function(a, b) (
            (a.linkedBrowser.currentURI.spec < b.linkedBrowser.currentURI.spec) ? -1 : 1))
        .forEach(gBrowser.moveTabTo.bind(gBrowser));
  }, true);
  $("tabContextMenu").insertBefore(menuitem, $("context_reloadAllTabs"));

  unload(function() menuitem.parentNode.removeChild(menuitem), win);
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
