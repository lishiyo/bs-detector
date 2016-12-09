// ========== WORKER THREADER ========
let BAD_LINKS_MAP = {}; // canonical bad links object
const KEY_INIT_MAP = "init_map";
const KEY_PROCESS_DATA = "process_data";
const KEY_MAP_READY = "map_ready";
const KEY_DATA_READY = "data_ready";
let mapReady = false;

function messageHandler(e) {
  let message = e.data;
  console.log('worker gotMessage! action, message', message.action, message); 
  if (message.action === KEY_INIT_MAP) {
    _initMap(message.url);
  } else if (message.action === KEY_PROCESS_DATA) {
    let anchorDomains = message.domains; // all raw domains from inject.js
    let badLinksFoundMap = processLinks(anchorDomains); // matched bad domains from anchorDomains

    console.log('worker posting processed badLinksFoundMap: ', badLinksFoundMap);
    postMessage({
      action: KEY_DATA_READY,
      data: badLinksFoundMap
    }); // pass back to background.js
  }
}

// populate the bad links map - parse from file, transform to object
function _initMap(dataUrl) {
  xhReq(dataUrl, function(file){
    const badLinksArray = JSON.parse(file);
    badLinksArray.forEach(function(elem, index) {
      BAD_LINKS_MAP[elem.url] = elem;
    });
    console.log("worker initMap! parsed test.json into BAD_LINKS_MAP", BAD_LINKS_MAP);
    mapReady = true;
  });
}

/**
filter the anchor domains array by checking against our BAD_LINKS_MAP
@return object where { anchor domain => corresponding BAD_LINKS_MAP value }
{
  "www.mybaddomain.com": {
    url: "mybaddomain.com",
    type: "conspiracy"
  }
}
**/
function processLinks(anchorDomains) {
  console.log("worker processLinks! mapReady? ", mapReady);
  if (!mapReady) {
    _initMap();
    return;
  }

  let cleanedDomains = _cleanLinks(anchorDomains); // strip www
  let badDomainsFound = {}; // bad domains map map
  cleanedDomains.forEach(function(domain, index, arr) {
    // if cleanedDomain in bad sites map, add to our found map
    if (BAD_LINKS_MAP.hasOwnProperty(domain)) {
      badDomainsFound[anchorDomains[index]] = BAD_LINKS_MAP[domain];
    }
  });

  return badDomainsFound;
};

// helper to send ajax request
function xhReq (url, callback) {
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

// @return array of links without "www." to prepare for matching
function _cleanLinks(links) {
  return links.map(function(link) {
    return link.replace('www.', "");
  });
};

addEventListener("message", messageHandler, true);
