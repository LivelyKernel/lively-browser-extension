// This runs inside the extension!

function sendToBackgroundExtensionScript(msg, thenDo) {
  chrome.runtime.sendMessage(msg,
    function(response) {
      if (!response) response = "No response!"
      if (!response.success) {
        console.error(`[lively chrome extension] send message failure: ${response}`)
        console.log(response);
      }
      thenDo(response);
    });
}

function queryLastElement(target, selector) {
  var inner = Array.from(target.querySelectorAll(selector));
  return inner[inner.length-1];
}

function waitForMessageRequest() {
  var el = document.getElementById("lively-chrome-extension-messenger"),
      observer = new MutationObserver(function(mutations) {
        var selected = queryLastElement(el, ".request");
        if (!selected) return;
        var content = selected.textContent;
        selected.parentNode.removeChild(selected);
        sendToBackgroundExtensionScript(JSON.parse(content), response => {
          el.insertAdjacentHTML('beforeend', `<div class="answer">${response}</div>`);
        });
      });
  observer.observe(el, {attributes: false, childList: true, characterData: false});
  // observer.disconnect();
  var start = Date.now();
  var i = setInterval(() => {
    if (Array.from(document.querySelectorAll("script"))
        .some(script => script.type === "text/x-lively-world")) {
          // lively world not yet loaded
          start = Date.now();
          return;
        }
    
    // don't have that thing removed acccidentally...
    if (!el.parentNode) document.body.appendChild(el);
    if (Date.now()-start > 20*1000) {
      clearInterval(i);
      return;
    }
  }, 200);

}

function installDOMMessageBroker() {
  // this is a hack to send and receive messages from webpages. Chrome actually
  // has a proper messaging API so that web pages can send messages to extensions:
  // chrome.runtime.sendMessage(extensionId, msg, onResponse)
  // However, as https://developer.chrome.com/extensions/manifest/externally_connectable
  // lists, the manifest is not allowed to add wildcard domains as senders.
  // I.e. we have to know in advance where lively pages will be hosted.
  // To get around this limitation we have this hack: We install a hidden DOM
  // element and listen for changes to it. The lively page can add sub elements
  // to it which will be interpreted as a message send request. By adding
  // subelements from the extension itself, we can "answer" those requests

  if (!document.body) {
    setTimeout(installDOMMessageBroker, 100);
    return;
  }
  document.body.insertAdjacentHTML('beforeend', '<div style="display: none;" id="lively-chrome-extension-messenger" />');
  waitForMessageRequest();
}

function installChromeExtensionInfo() {
  var code = (`
    ${queryLastElement}
    ${sendToInjectedExtensionScript}
    ;(${chromeExtensionInfo_code})();
  `).replace("__EXTENSION_ID__", chrome.runtime.id),
      script = document.createElement('script');
  script.textContent = code;
  (document.head || document.documentElement).appendChild(script);
}

installDOMMessageBroker();
installChromeExtensionInfo();


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
// This runs inside the webpage!

function sendToInjectedExtensionScript(msg) {
  var el = document.getElementById("lively-chrome-extension-messenger");
  el.insertAdjacentHTML('beforeend', `<div class="request">${JSON.stringify(msg)}</div>`);
  var waitFor = 2000;/*ms*/
  var start = Date.now();
  return new Promise((resolve, reject) => {
    var i = setInterval(() => {
      if (Date.now()-start > waitFor) {
        clearInterval(i);
        reject(new Error("timeout"));
      }
      var answer = queryLastElement(el, ".answer");
      if (!answer) return;
      clearInterval(i);
      var content = answer.textContent;
      answer.parentNode.removeChild(answer);
      resolve(content);
    }, 10);
  });
}

function chromeExtensionInfo_code() {
  // Are we in a lively page?
  if (typeof lively === "undefined") return;
  console.log("Preparing lively browser extension");
  lively.browserExtension = {
    id: "__EXTENSION_ID__",
    doPaste() { return sendToInjectedExtensionScript({selector: "doPaste"}); }
  }
}
