// ========== BACKGROUND (EXTENSION) SCRIPT =========

window.DEMO = {}; // for testing

let BAD_LINKS_MAP = {}; // canonical bad links object
let badLinksFoundMap = {}; // matched bad domains from anchorDomains
let anchorDomains = []; // all raw domains from inject.js

// populate the worker's bad links map immediately
let myWorker = new Worker("js/worker.js");
initWorker(chrome.extension.getURL("/data/data.json"));

window.onload = function() {
  // inject content script into active tab
  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({active: true, windowId: currentWindow.id}, function(activeTabs) {
      chrome.tabs.executeScript(
        activeTabs[0].id, {
          file: 'js/inject.js', 
          allFrames: true
        }
      );
    });
  });

  chrome.runtime.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(msg) {
      // STUB - only allow for first load for now
      console.log("port onMessage! anchorDomains, msg", anchorDomains, msg.data);
      if (msg.action == "anchor_domains") {
        anchorDomains = anchorDomains.concat(msg.data); // append data, don't replace

        // got our domains, send to worker to match the bad ones
        sendRawDataToWorker(port, anchorDomains);
      }
    });
  });
}

// tell worker to initialize the map
function initWorker(url) {
  myWorker.postMessage({
    action: "init_map",
    url: url
  });
}

function sendRawDataToWorker(port, anchorDomainsData) {
  // worker will get domains as e.data.data
  myWorker.postMessage({
    action: "process_data",
    domains: anchorDomainsData
  });

  // get bad links found map from worker
  myWorker.onmessage = function(e) {
    console.log('worker onMessage! worker sent badDomainsFoundMap:', e.data.data);
    if (e.data.action == "data_ready") {
      badLinksFoundMap = Object.assign(badLinksFoundMap, e.data.data);

      // dump the found bad domains in popup
      showLinks(badLinksFoundMap);

      // forward the found bad domains to the page for styling
      port.postMessage({
        action: "send_processed",
        data: badLinksFoundMap
      });
    }
  };
}

// display links in popup
function showLinks(linkMap) {
  const links = Object.keys(linkMap);
  const linksTable = document.getElementById('links');
  if (linksTable && linksTable.children) {
    while (linksTable.children.length > 1) {
      linksTable.removeChild(linksTable.children[linksTable.children.length - 1])
    }
    for (var i = 0; i < links.length; ++i) {
      var row = document.createElement('tr');
      var col0 = document.createElement('td');
      var col1 = document.createElement('td');
      col1.innerText = links[i];
      col1.style.whiteSpace = 'nowrap';
      
      row.appendChild(col0);
      row.appendChild(col1);
      linksTable.appendChild(row);
    }
  }
}

