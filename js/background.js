// ========== BACKGROUND (EXTENSION) SCRIPT =========

window.DEMO = {};
let processedDomainsMap; // bad domains found from anchorDomains
let BAD_LINKS_MAP = {}; // canonical bad links object
let firstLoad = true;
let anchorDomains; // raw data from inject.js

// helper to send ajax request
const xhReq = function(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.overrideMimeType('application/json');
  xhr.open('GET', url, true);
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status == '200') {
        callback(xhr.responseText);
    }
  }
  xhr.send(null);
}

// populate the bad links map - parse from file
const _initMap = function() {
  xhReq(chrome.extension.getURL("/data/data.json"), function(file){
    // BAD_LINKS_MAP = JSON.parse(file);

    let badLinksArray = JSON.parse(file);
    badLinksArray.forEach(function(elem, index) {
      BAD_LINKS_MAP[elem.url] = elem;
    })    
    console.log("parsed test.json into BAD_LINKS", BAD_LINKS_MAP);
  });
}

// @return array of links without "www." to prepare for matching
const _cleanLinks = function(links) {
  // remove bad prefixes
  // var kBadPrefix = 'javascript';
  // for (var i = 0; i < links.length;) {
  //   if (((i > 0) && (links[i] == links[i - 1])) ||
  //       (links[i] == '') ||
  //       (kBadPrefix == links[i].toLowerCase().substr(0, kBadPrefix.length))) {
  //     links.splice(i, 1);
  //   } else {
  //     ++i;
  //   }
  // }

  return links.map(function(link) {
    return link.replace('www.', "");
  });
};

/**
convert array of anchor nodes into object with the bad domains
{
  "mybaddomain.com": {
    url: "mybaddomain.com",
    type: "conspiracy"
  }
}
**/
const processLinks = function(anchorDomains) {
  // var links = [].slice.apply(document.getElementsByTagName('a'));
  let cleanedDomains = _cleanLinks(anchorDomains);
  let badDomainsFound = {}; // object map
  cleanedDomains.forEach(function(domain, index, arr) {
    // if cleanedDomain in bad sites map, add to our found map
    if (BAD_LINKS_MAP.hasOwnProperty(domain)) {
      badDomainsFound[anchorDomains[index]] = BAD_LINKS_MAP[domain];
    }
  });

  return badDomainsFound;
};

// display links in popup
// TODO: remove
const showLinks = function(linkMap) {
  let links = Object.keys(linkMap);
  let linksTable = document.getElementById('links');
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

window.onload = function() {
  console.log("background ++ window.onload");
  // populate the bad links map
  _initMap();

  // inject into active tab
  chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({active: true, windowId: currentWindow.id}, function(activeTabs) {
      // chrome.tabs.insertCSS(activeTabs[0].id, {
      //   file: 'css/inject.css',
      //   allFrames: true
      // });

      chrome.tabs.executeScript(
        activeTabs[0].id, {
          file: 'js/inject.js', 
          allFrames: true
        }
      );
    });
  });

  chrome.runtime.onConnect.addListener(function(port) {
    console.log("background - chrome.runtime.onConnect! callback");

    port.onMessage.addListener(function(msg) {
      // STUB - only allow for first load for now
      if (firstLoad) {
        anchorDomains = msg.data;
        processedDomainsMap = processLinks(anchorDomains);
        console.log("background - port got msg: anchorDomains, processedDomainsMap: ", anchorDomains, processedDomainsMap);
      
        // dump in table
        showLinks(processedDomainsMap);

        // post the found bad domains
        port.postMessage({
          action: "send_processed",
          data: processedDomainsMap
        });

        firstLoad = false;
      }
    });
  });
}

