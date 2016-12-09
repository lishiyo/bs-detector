// ========== CONTENT SCRIPT ========== 

(function () {
  /**
  Extension injects this script into all frames 
  Send to extension a deduped list of valid link URLs on this page
  **/
  const port = chrome.runtime.connect({ name: "links" }); // connect immediately
  const CSS_CLASS_GOOD = "good";
  const CSS_CLASS_BAD = "bad";

  // anchorNodes == anchorDomains same position
  let anchorNodes = [].slice.apply(document.getElementsByTagName('a'));
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

    anchorDomains.forEach(function(domain, index, arr) {
      let anchorNode = anchorNodes[index];
      // check if this domain is in the bad domains found
      if (badDomainsFoundMap.hasOwnProperty(domain)) {
        // add bad css
        anchorNode.className += " " + CSS_CLASS_BAD;
        let badType = badDomainsFoundMap[domain].type;
        if (!badType) {
          badType = "unknown";
        }
        anchorNode.setAttribute("bad-type", badType);
      } else {
        // add good css
        // anchorNode.className += " " + CSS_CLASS_GOOD;
      }
    });
  }
}());


