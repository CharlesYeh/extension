const WIDTH = 800;
const HEIGHT = 500;

const NODE_WIDTH = 200;
const NODE_HEIGHT = 30;


// used to link urls after a line number is clicked
var previousHash = window.location.hash

d3.select("body").append("svg").attr({"width": WIDTH, "height": HEIGHT});
var svg = d3.select("svg");

var urlIdMap = {};
var nodes = [],
    links = [],
    nodelabels = [],
    nodecontext = [];

d3.select("body").append("button")
  .attr("class", "btn_clear")
  .text("Clear all history")
  .on("click", function() {
    chrome.storage.local.clear();

    urlIdMap = {};
    nodes = [];
    links = [];
    nodelabels = [];
    nodecontext = [];

    restart();
  });

// TODO: hide or show graph
d3.select("body").append("button")
  .attr("class", "btn_hide")
  .text("Hide graph")
  .on("click", function() {
  });

$(document).ready(function() {

  // TODO: store order of search referrers, for clearing
  chrome.storage.local.get({
    urlToNodeMap: {},
    searchReferrerMap: {},
    urlToLineMap: {},
  }, function(result) {
    const urlToNodeMap = result.urlToNodeMap;
    const searchReferrerMap = result.searchReferrerMap;
    const urlToLineMap = result.urlToLineMap;

    const currentUrl = window.location.pathname + window.location.hash;

    if (currentUrl.startsWith("/search/")) {
      searchReferrerMap[currentUrl + window.location.search] = getReferrerPath();
    } else {
      var previousUrl;
      const directPrev = getReferrerPath(true);
      // TODO: handle direct ref that aren't search
      if (directPrev.startsWith("/search/")) {
        previousUrl = searchReferrerMap[directPrev];
      }

      if (previousUrl) {
        addEdge(urlToNodeMap, urlToLineMap, previousUrl, currentUrl);
      }
    }

    renderGraph(urlToNodeMap, urlToLineMap);

    chrome.storage.local.set(
      { urlToNodeMap: urlToNodeMap, searchReferrerMap: searchReferrerMap },
      function(result) { }
    );
  });

  $("a").on("click", function(evt) {
    const url = $(evt.target).attr("href");
    const match = url.match(/^#L([0-9]+)$/);

    if (!match) {
      return;
    }

    const lineno = match[1];
    chrome.storage.local.get({ urlToNodeMap: {}, urlToLineMap: {} }, function(result) {
      const urlToNodeMap = result.urlToNodeMap;
      const urlToLineMap = result.urlToLineMap;

      const currentUrl = window.location.pathname + previousHash;
      previousHash = window.location.hash;

      const hashUrl = window.location.pathname + match[0];
      addEdge(urlToNodeMap, urlToLineMap, currentUrl, hashUrl);

      chrome.storage.local.set(
        { urlToNodeMap: urlToNodeMap, urlToLineMap: urlToLineMap },
        function(result) {});
    });
  });
});

function addEdge(nodeMap, urlToLineMap, source, target) {
  // TODO: brittle, if target is already a source, don't add
  if (target in nodeMap) {
    return;
  }

  const match = target.match(/#L([0-9]+)$/);
  // TODO: don't parse all src each time
  if (match) {
    const lineno = match[1] - 1;
    urlToLineMap[target] = $("#source-code").text().split("\n")[lineno];
  }

  if (source in nodeMap) {
    nodeMap[source].push(target);
  } else {
    nodeMap[source] = [target];
  }

  const sourceNode = renderNode(urlToLineMap, source);
  const targetNode = renderNode(urlToLineMap, target);
  links.push({source: sourceNode, target: targetNode});

  restart();
}

function renderGraph(urlToNodeMap, urlToLineMap) {
  for (var url in urlToNodeMap) {
    const sourceNode = renderNode(urlToLineMap, url);

    const targets = urlToNodeMap[url];
    for (var target of targets) {
      const targetNode = renderNode(urlToLineMap, target);
      links.push({source: sourceNode, target: targetNode});
    }
  }

  restart();
}

function renderNode(urlToLineMap, url) {
  if (url in urlIdMap) {
    return urlIdMap[url];
  } else {
    var hashText = "";
    if (url in urlToLineMap) {
      hashText = urlToLineMap[url];
    }

    const splitUrl = url.split("/");
    const nodeName = splitUrl[splitUrl.length - 1];
    const node = {
      name: nodeName,
      context: hashText,
      url: url,
    };

    urlIdMap[url] = node;
    nodes.push(node);

    return node;
  }
}

function getReferrerPath(withSearch=false) {
  const tag = document.createElement("a");
  tag.href = parent.location;

  var path = tag.pathname;
  if (path.startsWith("/view/server")) {
    path = path.substring("/view/server".length);
  }

  return path + tag.hash + (withSearch ? tag.search : "");
}

/************************************************************
                       D3 FUNCTIONALITY
*************************************************************/
var simulation = d3.forceSimulation(nodes)
    .force("charge", d3.forceManyBody().strength(-2000))
    .force("link", d3.forceLink(links).distance(120))
    .force("gravity", d3.forceManyBody().strength(300))
    .force("x", d3.forceX())
    .force("y", d3.forceY())
    .alpha(1)
    .on("tick", ticked);

var g = svg.append("g").attr("transform", "translate(" + WIDTH / 2 + "," + HEIGHT / 2 + ")"),
    link = g.append("g").attr("stroke", "#000").attr("stroke-width", 1.5).selectAll(".link"),
    node = g.append("g").attr("stroke", "#fff").attr("stroke-width", 1.5).selectAll(".node"),
    nodelabels = g.append("g").selectAll(".nodelabel");

restart();

function restart() {

  // Apply the general update pattern to the nodes.
  node = node.data(nodes, function(d) { return d.url;});
  node.exit().remove();
  var newNodes = node.enter();
  newNodes = newNodes
    .append("rect")
    .attr("fill", function(d) { return "#aaa"; })
    .attr("width", NODE_WIDTH)
    .attr("height", NODE_HEIGHT);
  newNodes.on("click", function(d) {
    // TODO: disallow on drag
    const tag = document.createElement("a");
    tag.href = d.url;

    if (tag.hash == previousHash) {
      window.location = d.url;
    } else {
      previousHash = tag.hash;
      simulation.alphaTarget(.01).restart();
    }
  });
  node = newNodes.merge(node);
  node.call(d3.drag().on("drag", dragged));
  function dragged(d) {
    d3.select(this).attr("x", d.x = d3.event.x).attr("y", d.y = d3.event.y);
  }

  // Apply the general update pattern to the links.
  link = link.data(links, function(d) { return d.source.url + "-" + d.target.url; });
  link.exit().remove();
  link = link.enter().append("line").merge(link);

  // Node labels
  nodelabels = nodelabels.data(nodes, function(d) { return d.id; });
  nodelabels.exit().remove().enter();
  const nodetext = nodelabels.enter()
    .append("text");
  const t1 = nodetext
    .append("tspan")
    .attr("fill", "#000000")
    .attr("font-weight", 600)
    .text(function(d) { return d.name; });
  nodecontext = nodetext
    .append("tspan")
    .attr("fill", "#000000")
    .attr("dy", "1em")
    .text(function(d) { return d.context; });
  nodelabels = nodetext.merge(nodelabels);

  // Update and restart the simulation.
  simulation.nodes(nodes);
  simulation.force("link").links(links);
  simulation.alphaTarget(.01).restart();
}

function ticked() {
  node.attr("x", function(d) { return d.x - NODE_WIDTH / 2; })
      .attr("y", function(d) { return d.y - NODE_HEIGHT / 2; })
      .style("fill", colorOnSelect("#fee", "#eee"))
      .style("stroke", colorOnSelect("#f99", "#999"));

  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  nodelabels.attr("x", function(d) { return d.x - NODE_WIDTH / 2 + 3; })
            .attr("y", function(d) { return d.y - NODE_HEIGHT / 2 + 12; });

  nodecontext.attr("x", function(d) { return d.x - NODE_WIDTH / 2 + 3; });
}

function colorOnSelect(selected, notSelected) {
  return function(d) {
    const tag = document.createElement("a");
    tag.href = d.url;

    if (previousHash == tag.hash) {
      return selected;
    } else {
      return notSelected;
    }
  }
}
