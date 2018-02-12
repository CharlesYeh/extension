$(document).ready(function() {
  const path = window.location.pathname;

  chrome.storage.local.get({path: []}, function(result) {
    const newPath= result.path;
    newPath.push(path);

    chrome.storage.local.set({path: newPath}, function() {
      // saved success
    });
  });
});
