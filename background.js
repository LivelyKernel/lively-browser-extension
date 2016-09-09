function ensureTextInput() {
  var el = document.getElementById("text-input");
  if (!el) {
    document.body.insertAdjacentHTML("beforeend", '<textarea id="text-input"></textarea>')
    el = document.getElementById("text-input");
  }
  return el;
}

function getContentFromClipboard(textinput) {
  var result = '';
  textinput.value = '';
  textinput.select();
  if (document.execCommand('paste')) {
    result = textinput.value;
  }
  textinput.value = '';
  console.log('got value from sandbox: ' + result);
  return result;
}

// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

// function setupMessageListener() {
//   chrome.runtime.onMessageExternal.addListener(
//     function(request, sender, sendResponse) {
//       if (!request || !actions[request.selector]) return;
//       actions[request.selector](request, sender, sendResponse)
//     });
// }

// var actions = {
//   doPaste(req, sender, sendResponse) {
//     sendResponse(getContentFromClipboard(ensureTextInput()));
//   }
// }

// setupMessageListener();


function setupMessageListener() {
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      if (!request || !actions[request.selector]) return;
      actions[request.selector](request, sender, sendResponse);
    });
}

var actions = {
  doPaste(req, sender, sendResponse) {
    sendResponse(getContentFromClipboard(ensureTextInput()));
  }
}

setupMessageListener();
