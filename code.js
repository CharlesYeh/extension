$(document).ready(function() {
  const currentUrl = window.location.pathname + window.location.hash;

  chrome.storage.local.get({path: [], toggle: true}, function(result) {
    const path = result.path;
    addUrlToPath(path, currentUrl);

    // TODO: make toggle instantaneous
    if (result.toggle) {
      renderBreadcrumbs(path);
    }
  });

  $("a").on("click", function(evt) {
    const url = $(evt.target).attr("href");
    const match = url.match(/^#L([0-9]+)$/);

    // If click on line number, add to history
    if (!match) {
      return;
    }

    const lineno = match[1];
    chrome.storage.local.get({path: []}, function(result) {
      const path = result.path;
      const hashUrl = window.location.pathname + match[0]
      addUrlToPath(path, hashUrl);

      const crumb = createCrumb(hashUrl);
      $(crumb).addClass("newly_added");
      const breadcrumb = $(".code_breadcrumb");
      breadcrumb.prepend(crumb);
    });
  });
});

function addUrlToPath(path, url) {
  if (path.indexOf(url) == -1) {
    if (url.indexOf("/search") != 0) {
      path.unshift(url);
    }
    path.splice(12);

    const newData = { path: path, };
    chrome.storage.local.set(newData, function() {
      // saved success
    });
  }
}

function renderBreadcrumbs(path) {
  const breadcrumb = document.createElement("div");
  const $breadcrumb = $(breadcrumb);
  $breadcrumb.addClass('code_breadcrumb');

  for (var url of path) {
    const crumb = createCrumb(url);
    $breadcrumb.append(crumb);
  }
  document.body.appendChild(breadcrumb);
}

function createCrumb(url) {
  const $element = $(document.createElement("div"));
  $element.addClass("element");
  loadCrumb($element, url);
  return $element[0];
}

function loadCrumb($crumb, url, context=2) {
  const proto = window.location.protocol;
  const host = window.location.host;

  const fullPath = proto + "//" + host + url;
  $.ajax(fullPath).done(function(data, textStatus, xhr) {
    var elementContents = "";

    const source = $(data).find("#source-code").text();
    const lines = source.split("\n");

    const hashIndex = url.lastIndexOf("#");
    if (hashIndex == -1) {
    } else {
      // hash format is #L100, 1-indexed
      const hash = Number.parseInt(url.substring(hashIndex + 2)) - 1;

      const startIndex = Math.max(0, hash - context);
      const endIndex = Math.min(lines.length - 1, hash + context);
      const snippet = [];
      for (var i = startIndex; i <= endIndex; i++) {

        var line = lines[i];
        if (i == hash) {
          line = "<b>" + line + "</b>";
        }

        snippet.push(line);
      }

      elementContents = snippet.join("\n");
    }

    $crumb.append(renderHeader(url, hashIndex, getCloseCallback($crumb, url)));
    $crumb.append("<pre>" + elementContents + "</pre>");
    $crumb.removeClass("newly_added");
  });
}

function getCloseCallback($crumb, url) {
  return function(evt) {
    $crumb.hide();

    chrome.storage.local.get({path: []}, function(result) {
      const path = result.path;
      path.splice(path.indexOf(url), 1);

      const newData = { path: path, };
      chrome.storage.local.set(newData, function() { });
    });
  };
}

function renderHeader(url, hashIndex, closeCallback) {
  var headerText;

  if (hashIndex == -1) {
    hashIndex = url.length;
  }

  const filename = url.substring("/view/server/".length, hashIndex);
  if (filename.length > 30) {
    headerText = ".." + filename.substring(filename.length - 40);
  } else {
    headerText = filename;
  }

  const closeButton = document.createElement("a");
  const $closeButton = $(closeButton);
  $closeButton.addClass("close_button");
  $closeButton.on("click", closeCallback);
  $closeButton.text("X");

  const header = document.createElement("div");
  const $header = $(header);
  $header.addClass("header");
  $header.append(closeButton);
  $header.append(`<a href='${url}'><b>${headerText}</b></a>`);
  return header;
}
