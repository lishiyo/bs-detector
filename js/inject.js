// ========== CONTENT SCRIPT ========== 

/**
Extension injects this script into all frames 
Send to extension a deduped list of valid link URLs on this page
**/
window.DEMO = {};
const port = chrome.runtime.connect({name: "links"});
const CSS_CLASS_GOOD = "good";
const CSS_CLASS_BAD = "bad";

const anchorNodes = [].slice.apply(document.getElementsByTagName('a'));
let anchorDomains = [];
window.DEMO["anchorNodes"] = anchorNodes;

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

// convert array of anchor nodes into their hostnames
const getAnchorDomains = function(anchorNodes) {
  if (typeof anchorNodes === 'undefined' || anchorNodes.length == 0) {
    return [];
  }

  return anchorNodes.map(function(element) {
    return element.hostname;
  })
}

// { "mybaddomain.com": { reason: "conspiracy site"} }
const processAnchorDomains = function(rawAnchorDomains, badDomainsFoundMap) {
  console.log("processAnchorDomains ++ anchorNodes", anchorNodes, badDomainsFoundMap);
  if (typeof rawAnchorDomains === 'undefined' || rawAnchorDomains.length == 0) {
    return;
  }

  let anchorNode;
  rawAnchorDomains.forEach(function(rawAnchorDomain, index, arr) {
    anchorNode = anchorNodes[index];
    // check key inside bad domains found
    if (badDomainsFoundMap.hasOwnProperty(rawAnchorDomain)) {
      // add bad css
      anchorNode.className += " " + CSS_CLASS_BAD;
    } else {
      // add good css
      anchorNode.className += " " + CSS_CLASS_GOOD;
    }
  });
}

// anchorNodes == anchorDomains same position
anchorDomains = getAnchorDomains(anchorNodes);
console.log("content ++ sending anchorDomains: ", anchorDomains);

// send the domains only!
port.postMessage({ 
  action: "anchorNodes", 
  data: anchorDomains 
});

// listen to the extension
port.onMessage.addListener(function(msg) {

  // map anchorNodes
  if (msg.action == "send_processed") {
    console.log("content ++ port got msg: ", msg);
    processAnchorDomains(anchorDomains, msg.data);
  }
});

