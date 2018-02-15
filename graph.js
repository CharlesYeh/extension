const nodes = [];
const edges = [];
const urlIdMap = {};

var previousHash = window.location.hash

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

function addEdge(nodeMap, lineMap, source, target) {
  // TODO: brittle, if target is already a source, don't add
  if (target in nodeMap) {
    return;
  }

  const match = target.match(/#L([0-9]+)$/);
  // TODO: don't parse all src each time
  if (match) {
    const lineno = match[1] - 1;
    lineMap[target] = $("#source-code").text().split("\n")[lineno];
  }

  if (source in nodeMap) {
    nodeMap[source].push(target);
  } else {
    nodeMap[source] = [target];
  }

  var sourceId = renderNode(urlIdMap, lineMap, nodes, source);
  var targetId = renderNode(urlIdMap, lineMap, nodes, target);
  edges.push({
    source: sourceId,
    target: targetId,
  });
}

function renderGraph(urlToNodeMap, urlToLineMap) {
  const w = 800;
  const h = 800;

  for (var url in urlToNodeMap) {
    const links = urlToNodeMap[url];

    const sourceId = renderNode(urlIdMap, urlToLineMap, nodes, url);
    for (var destUrl of links) {
      const destId = renderNode(urlIdMap, urlToLineMap, nodes, destUrl);

      edges.push({
        source: sourceId,
        target: destId,
      });
    }
  }

  paintGraph(w, h, nodes, edges);
}

function renderNode(urlIdMap, urlToLineMap, nodes, url) {
  if (url in urlIdMap) {
    return urlIdMap[url];
  } else {
    var hashText = "";
    if (url in urlToLineMap) {
      hashText = urlToLineMap[url];
    }

    const nodeId = nodes.length;
    urlIdMap[url] = nodeId;

    const splitUrl = url.split("/");
    const nodeName = splitUrl[splitUrl.length - 1];
    nodes.push({
      name: nodeName,
      context: hashText,
      url: url,
    });
    return nodeId;
  }
}

function paintGraph(w, h, dataNodes, dataEdges) {
  var btn = d3.select("body").append("button")
    .attr("class", "btn_clear")
    .text("Clear all history")
    .on("click", function() {
      chrome.storage.local.clear();
    });

  var svg = d3.select("body").append("svg").attr({"width":w, "height":h});

  const linkDistance = 200;
  var force = d3.layout.force()
    .nodes(dataNodes)
    .links(dataEdges)
    .size([w,h])
    .linkDistance([linkDistance])
    .charge([-500])
    .theta(1)
    .gravity(0.07)
    .start();

  var edges = svg.selectAll("line")
    .data(dataEdges)
    .enter()
    .append("line")
    .attr("id",function(d,i) {return 'edge'+i})
    .attr('marker-end','url(#arrowhead)')
    .style("stroke","#ccc")
    .style("pointer-events", "none");

  const NODE_WIDTH = 150;
  const NODE_HEIGHT = 30;
  var nodes = svg.selectAll("rect")
    .data(dataNodes)
    .enter()
    .append("rect")
    .attr("width", NODE_WIDTH)
    .attr("height", NODE_HEIGHT)
    .call(force.drag)
    .on("click", function(d) {
      // TODO: disallow on drag, do tick
      window.location = d.url;
      previousHash = window.location.hash;
    });

  var nodelabels = svg.selectAll(".nodelabel")
    .data(dataNodes)
    .enter()
    .append("text")
    .attr({"x":function(d){return d.x;},
           "y":function(d){return d.y;},
           "class":"nodelabel",
           "stroke":"black",
           "font-size": "10",
    });

  const tspan1 = nodelabels
    .append("tspan")
    .attr({"x":function(d){return d.x;}})
    .text(function(d){return d.name;});

  const tspan2 = nodelabels
    .append("tspan")
    .attr({
      "x":function(d){return d.x;},
      "dy":"1em",
    })
    .text(function(d){return d.context;});

  force.on("tick", function(){
    edges.attr({"x1": function(d){return d.source.x;},
                "y1": function(d){return d.source.y;},
                "x2": function(d){return d.target.x;},
                "y2": function(d){return d.target.y;}
    });

    nodes.attr({"x":function(d){return d.x - 5 - NODE_WIDTH / 2;},
                "y":function(d){return d.y - 12 - NODE_HEIGHT / 2;}
         })
         .style("fill", function(d) {
           const currentUrl = window.location.pathname + window.location.hash;
           if (currentUrl == d.url) {
             return "#fee";
           } else {
             return "#eee";
           }
         })
         .style("stroke", function(d) {
           const currentUrl = window.location.pathname + window.location.hash;
           if (currentUrl == d.url) {
             return "#f99";
           } else {
             return "#999";
           }
         });

    nodelabels.attr("x", function(d) { return d.x - NODE_WIDTH / 2; })
              .attr("y", function(d) { return d.y - NODE_HEIGHT / 2; });

    tspan1.attr("x", function(d) { return d.x - NODE_WIDTH / 2; })
              .attr("y", function(d) { return d.y - NODE_HEIGHT / 2; });
    tspan2.attr("x", function(d) { return d.x - NODE_WIDTH / 2; })
              .attr("y", function(d) { return d.y - NODE_HEIGHT / 2; });

    /*

    edgepaths.attr('d', function(d) { var path='M '+d.source.x+' '+d.source.y+' L '+ d.target.x +' '+d.target.y;
                                       //console.log(d)
                                       return path});

    edgelabels.attr('transform',function(d,i){
        if (d.target.x<d.source.x){
            bbox = this.getBBox();
            rx = bbox.x+bbox.width/2;
            ry = bbox.y+bbox.height/2;
            return 'rotate(180 '+rx+' '+ry+')';
            }
        else {
            return 'rotate(0)';
            }
    });
    */
  });
}

function getReferrerPath(withSearch=false) {
  const tag = document.createElement("a");
  //tag.href = document.referrer;
  tag.href = parent.location.hash

  var path = tag.pathname;
  if (path.startsWith("/view/server")) {
    path = path.substring("/view/server".length);
  }

  return path + tag.hashname + (withSearch ? tag.search : "");
}
