// ========== CONTENT SCRIPT ========== 

/**
Extension injects this script into all frames 
Send to extension a deduped list of valid link URLs on this page
**/
window.DEMO = {};
const port = chrome.runtime.connect({ name: "links" }); // connect immediately
const CSS_CLASS_GOOD = "good";
const CSS_CLASS_BAD = "bad";

const anchorNodes = [].slice.apply(document.getElementsByTagName('a'));
window.DEMO["anchorNodes"] = anchorNodes;

// anchorNodes == anchorDomains same position
let anchorDomains = getAnchorDomains(anchorNodes);
console.log("content ++ sending anchorDomains to background.js: ", anchorDomains);

// send the domains if we have any
if (anchorDomains.length > 0) {
  port.postMessage({ 
    action: "anchor_domains", 
    data: anchorDomains 
  });
}

// listen to the extension
port.onMessage.addListener(function(msg) {
  // map anchorNodes
  if (msg.action == "send_processed") {
    console.log("content ++ got badDomainsMap as data, styling: ", msg.data);
    styleBadLinks(msg.data);
  }
});

// convert array of anchor nodes into their hostnames
function getAnchorDomains(anchorNodes) {
  if (typeof anchorNodes === 'undefined' || anchorNodes.length == 0) {
    return [];
  }

  return anchorNodes.map(function(element) {
    return element.hostname;
  })
}

// { "www.mybaddomain.com": { url: "mybaddomain.com", type: "conspiracy site"} }
function styleBadLinks(badDomainsFoundMap) {
  if (typeof anchorNodes === 'undefined' || anchorNodes.length == 0 || anchorDomains.length == 0) {
    return;
  }

  let anchorNode;
  anchorDomains.forEach(function(domain, index, arr) {
    anchorNode = anchorNodes[index];
    // check if this domain is in the bad domains found
    if (badDomainsFoundMap.hasOwnProperty(domain)) {
      // add bad css
      anchorNode.className += " " + CSS_CLASS_BAD;
    } else {
      // add good css
      anchorNode.className += " " + CSS_CLASS_GOOD;
    }
  });
}

// ====== GRAVEYARD =======

// convert array of anchor nodes into their hrefs
const getAnchorHrefs = function(anchorNodes) {
  if (typeof anchorNodes === 'undefined' || anchorNodes.length == 0) {
    return [];
  }
  // var links = [].slice.apply(document.getElementsByTagName('a'));
  return anchorNodes.map(function(element) {
    // Return an anchor's href attribute, stripping any URL fragment (hash '#').
    // If the html specifies a relative path, chrome converts it to an absolute URL.
    let href = element.href;
    let hashIndex = href.indexOf('#');
    if (hashIndex >= 0) {
      href = href.substr(0, hashIndex);
    }
    return href;
  });
};

