// import * as d3 from "d3"

const ARC_THICKNESS = 15;

const WIDTH = window.innerWidth;

const HEIGHT = window.innerHeight;

const tooltip = d3.select("#tooltip");
tooltip.focus = false;
const tooltipTextDOM = document.querySelector("#class-name");

leaves.forEach((l, idx) => l.idx = idx);

const RADIUS = WIDTH * 0.2;

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .append("g")
    .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT / 2})`);

/* DRAW ARCS */

const updateAngles = function (groups) {
    // update arc angles starting from the leaves (most inner arcs of the diagram)
    // to parents (classes that are higher in the hierarchy)

    for (const leaf of leaves) {
        const group = groups[leaf.idx];

        leaf.startAngle = group.startAngle;
        leaf.endAngle = group.endAngle;
    }

    // go through the hierarchy level by level
    var currentLevel = new Set(leaves.map(d => d.parent));

    while (currentLevel.size !== 0) {
        const nextLevel = new Set();

        for (const node of currentLevel) {
            // calculate the angle of the current arc (correspondig to the current node)
            node.startAngle = d3.min(node.children, c => c.startAngle);
            node.endAngle = d3.max(node.children, c => c.endAngle);

            if (node.parent) {
                nextLevel.add(node.parent);
            }
        }

        currentLevel = nextLevel;
    }
}

// center and display tooltip on mouse hover
function onMouseEneter(event, datum) {
    if (tooltip.focus) {
        return;
    }
    tooltip.select("#class-name").text(datum.data.name);

    // the circle starts from the top not from the right, the equations need to be adjusted
    const arcAngle = datum.startAngle + (datum.endAngle - datum.startAngle) / 2 + 3 * Math.PI / 2;
    const radius = RADIUS + datum.height * ARC_THICKNESS;
    const xCoord = WIDTH / 2 + radius * Math.cos(arcAngle);
    const yCoord = HEIGHT / 2 + radius * Math.sin(arcAngle)

    tooltip.style("transform", `translate(${xCoord}px, ${yCoord}px)`);

    tooltip.style("opacity", 1);
}

// hide tooltip
function onMouseLeave(event, datum) {
    if (tooltip.focus) {
        return;
    }
    tooltip.style("opacity", 0);
}


// greyout the links that are not selected
function onMouseDown(event, datum) {
    const lastArc = localStorage.getItem("lastClickedArc");

    const paths = datum.leaves().flatMap(l => l.paths);
    const otherPaths = new Set(leaves.flatMap(l => l.paths).filter(p => !paths.includes(p)));

    paths.forEach(p => {
            d3.select(p)
                .attr("pointer-events", "auto")
                .style("opacity", 1);
    });

    otherPaths.forEach(p => {
        let newOpacity = 0;
        let newPointerEvent = "none";

        if (p.style.opacity == newOpacity && lastArc === datum.data.name) {
            newPointerEvent = "auto";
            newOpacity = 1;
        }

        d3.select(p)
            .attr("pointer-events", newPointerEvent)
            .style("opacity", newOpacity);
    });

    localStorage.setItem("lastClickedArc", datum.data.name);
}

const cluster = d3.cluster()
    .size([360, RADIUS]);

cluster(classHierarchy);

const angleAmount = 2 * Math.PI / leaves.length;

leaves.forEach(
    (leaf, idx) => {
        leaf.startAngle = idx * angleAmount;
        leaf.endAngle = (idx + 1) * angleAmount;
    }
)

leaves.forEach(
    (leaf) => {
        leaf.x = ((leaf.startAngle + leaf.endAngle) / 2) * (180 / Math.PI);
    }
)

const arcs = svg.append("g");

const arcsColorScale = d3.scaleSequential()
    .domain([0, classHierarchy.children.length - 1])
    .interpolator(d3.interpolateCool)

const drawArcs = function (tree, chord, color) {
    // use bfs to draw arcs for the provided hierarchy
    updateAngles(chord);

    let q = [];
    tree.visited = true;
    q.push(tree)

    tree.color = d3.rgb(color);

    const brightenAmount = (0.6 - 0.1) / tree.height;

    while (q.length !== 0) {
        const node = q.shift();

        arcs.datum(node)
            .append("path")
            .attr("class", "arc")
            .style("fill", node.color)
            .style("stroke", "white")
            .attr("d", d3.arc()
                .innerRadius(RADIUS + node.height * ARC_THICKNESS)
                .outerRadius(RADIUS + (node.height + 1) * ARC_THICKNESS)
                .startAngle(node.startAngle)
                .endAngle(node.endAngle)
            )
            .on("mouseenter", onMouseEneter)
            .on("mouseleave", onMouseLeave)
            .on("mousedown", onMouseDown);


        if (node.children) {
            for (const child of node.children) {

                child.color = child.parent.color.brighter(brightenAmount);

                if (!child.visited) {
                    child.visited = true;
                    q.push(child);
                }
            }
        }
    }
}

classHierarchy.children.forEach((c, idx) => drawArcs(c, leaves, arcsColorScale(idx)))

/* DRAW EDGES */

leaves.forEach(l => l.data.imports = adjacencyList.get(l.id));
const line = d3.lineRadial()
    .curve(d3.curveBundle.beta(0.85))
    .radius(function (d) { return d.y; })
    .angle(function (d) { return d.x / 180 * Math.PI; });

// TODO: change from adjacencyMatrix
const weightExtend = d3.extent(Object.values(pairs));
weightExtend[0] = weightExtend[0] - weightExtend[1] * 0.3;

const linksColorScale = d3.scaleSequential()
    .domain(weightExtend)
    .interpolator(d3.interpolateReds)

const linksWidthScale = d3.scaleLinear()
    .domain(weightExtend)
    .range([1, 5]);

function onMouseEnterLink(event, datum) {
    if (tooltip.focus) {
        return;
    }
    // skip disabled links
    if (event.target.style.opacity === "0") {
        return;
    }
    const source = datum.source.id;
    const target = datum.target.id;
    // the order of the pairs in the key is alphabetical
    const pairKey = [source, target].sort().join("");
    const tooltipText = `${source.slice(source.lastIndexOf(".") + 1)} \u2194 ${target.slice(target.lastIndexOf(".") + 1)}`;

    tooltip.select("#class-name").html(tooltipText + ":" + clientsMap.get(pairKey));
    tooltip.style("transform", `translate(${event.x}px, ${event.y}px)`);
    tooltip.style("opacity", 1);
}

document.addEventListener('keyup', (e) => {
    if (e.code == "F2" && tooltip.style("opacity") === "1") {
        tooltip.focus = !tooltip.focus;
        // make tooltip scrollable when in focus
        const pointerEvent = tooltip.style("pointer-events") == "auto" ? "none" : "auto";
        tooltip.style("pointer-events", pointerEvent);
        // reset scrollbar position
        tooltipTextDOM.scrollTop = 0;
    }
});

const link = svg.append("g").selectAll("g")
    .data(constructClassLinks(leaves))
    .enter()
    .append("path")
    .each(function (d) {
        d.source = d[0];
        d.target = d[d.length - 1];
    })
    .attr("d", line)
    .each(function (d) {
        d.source.paths.push(this);
        d.target.paths.push(this);
    })
    .attr("fill", "none")
    .style("stroke", d => {
        const key = [d.source.id, d.target.id].sort().join("|");
        return linksColorScale(pairs[key]);
    })
    .style("stroke-width", 0.8)
    .on("mouseenter", onMouseEnterLink)
    .on("mouseleave", onMouseLeave);
// .style("stroke-width", d => linksWidthScale(adjacencyMatrix[d.source.idx][d.target.idx]));

// Return a list of imports for the given array of nodes.
function constructClassLinks(nodes) {
    const map = {}, imports = [];

    // Compute a map from name to node.
    nodes.forEach(function (d) {
        map[d.data.name] = d;
    });

    // For each import, construct a link from the source to target node.
    nodes.forEach(function (d) {
        if (d.data.imports) {
            d.data.imports.forEach(function (i) {
                imports.push(map[d.data.name].path(map[i]));
            });
        }
    });

    return imports;
}
