$(document).ready(function() {
  setInterval(checkResults, 500);
});

var currentSearch;
function checkResults() {
  if (currentSearch == window.location.search) {
    return;
  }

  if (!$("#results").children()) {
    // hasn't loaded yet
    return;
  }

  currentSearch = window.location.search;

  const sourceCode = $("#source-code").text();
  var sourceCodeRaw = $("#source-code").html();

  var currentController;
  var lineId = 0;

  for (var line of sourceCode.split("\n")) {
    const ctlrMatch = line.match(/\s+controller: (.+)$/);
    if (ctlrMatch) {
      console.log(line);
      console.log(ctlrMatch);
      currentController = ctlrMatch[1];
      continue;
    }

    const keyMatches = line.match(/\s+action: (.+)$/);
    if (keyMatches) {

      const actionName = keyMatches[1];
      const actionSource = new RegExp(
        "(" + wrapOptTag("action") + ": " +
        wrapOptTag(actionName) + "\n)", "g");

      sourceCodeRaw = sourceCodeRaw.replace(actionSource, function(match, p1) {
        const tag = document.createElement("a");
        $(tag).html(p1);

        $(tag).addClass("action_tag");
        $(tag).addClass("action_tag_" + lineId);
        $(tag).attr("exp_ctlr", currentController);
        $(tag).attr("exp_action", actionName);

        lineId++;
        return tag.outerHTML;
      });
    }
  }

  $("#source-code").html(sourceCodeRaw);

  for (var i = 0; i < lineId; i++) {
    const $actionTag = $(".action_tag_" + i);
    $actionTag.on(
      "click",
      getActionCallback(
        $actionTag.attr("exp_ctlr"),
        $actionTag.attr("exp_action")));
  }

  /*
  for (var keyword of $("span.hljs-keyword")) {
    const $keyword = $(keyword);
    if ($keyword.html() == "action") {
      const action = $keyword.next(".hljs-keyword").text();

      const match = $keyword[0].previousSibling.textContent.match(/\bcontroller: (\w+)[\n$]/);
      const controller = match[1];

      console.log(controller);
      console.log(action);
    }
  }
  */

  /*
  if (window.location.pathname.startsWith("/search/")) {
    const fileGroups = $("div.file-group");
    for (var group of fileGroups) {
      const header = $($(group).find(".label.header.result-path")[0]).text();
      if (header.endsWith("routes.yaml")) {
        const file = header.split("::")[1];
        $.ajax("https://code.pp.dropbox.com/view/server" + file, function(data) {
          // TODO: get controller, fetch ctlr code, and link to it
          $(data).find("#source-code")
        });
        console.log(header);
      }
    }
  }
  */
}

function wrapOptTag(str) {
  const tag = "(</?[^>]+>)?";
  return tag + str + tag;
}

function getActionCallback(controllerName, actionName) {
  return function(evt) {

    const q = encodeURIComponent(`def ${actionName}( repo:server path:controllers/${controllerName}`);
    $.ajax(`https://code.pp.dropbox.com/api/v1/search/?q=${q}&fold_case=auto&regex=false`).done(function(data) {
      const json = JSON.parse(data);
      const result = json['results'][0];

      const path = result['path'];
      const lineno = result['lno'];
      window.location = `https://code.pp.dropbox.com/view/server${path}#L${lineno}`;
    });
  }
}
