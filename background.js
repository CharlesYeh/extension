chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.storage.local.get(['toggle'], function(data) {
    chrome.storage.local.set({toggle: !data.toggle});
  });
});

