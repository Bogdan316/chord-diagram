import * as d3 from "d3"

const RADIUS = 400;

const ARC_THICKNESS = 15;

const WIDTH = window.innerWidth;

const HEIGHT = window.innerHeight;

const tooltip = d3.select("#tooltip");

const adjacencyMatrix = [
    [0, 0, 0, 5, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 2, 0],
    [0, 0, 0, 0, 0, 3, 0, 0],
    [5, 0, 0, 0, 0, 0, 7, 0],
    [0, 0, 0, 0, 0, 0, 0, 4],
    [0, 0, 3, 0, 0, 0, 0, 0],
    [0, 2, 0, 7, 0, 0, 0, 0],
    [0, 0, 0, 0, 4, 0, 0, 0],
];


const adjacencyList = {
    "ClassABA": ["ClassCA"],
    "ClassABB": ["ClassBCA"],
    "ClassBAA": ["ClassAAA", "ClassCA"],
    "ClassBBA": ["ClassCB"],
}

const classHierarchyJson =
    [
        { "name": "Object", "parent": "" },

        { "name": "ClassA", "parent": "Object" },
        { "name": "ClassAA", "parent": "ClassA" },
        { "name": "ClassAB", "parent": "ClassA" },
        { "name": "ClassAAA", "parent": "ClassAA" },
        { "name": "ClassABA", "parent": "ClassAB" },
        { "name": "ClassABB", "parent": "ClassAB" },

        { "name": "ClassB", "parent": "Object" },
        { "name": "ClassBA", "parent": "ClassB" },
        { "name": "ClassBB", "parent": "ClassB" },
        { "name": "ClassBC", "parent": "ClassB" },
        { "name": "ClassBAA", "parent": "ClassBA" },
        { "name": "ClassBBA", "parent": "ClassBB" },
        { "name": "ClassBCA", "parent": "ClassBC" },

        { "name": "ClassC", "parent": "Object" },
        { "name": "ClassCA", "parent": "ClassC" },
        { "name": "ClassCB", "parent": "ClassC" }
    ];

var classHierarchy = d3.stratify()
    .id(d => d.name)
    .parentId(d => d.parent)
    (classHierarchyJson);

const leaves = classHierarchy.leaves();
leaves.forEach((l, idx) => l.idx = idx);

const svg = d3.select("#chart")
    .append("svg")
    .attr("width", WIDTH)
    .attr("height", HEIGHT)
    .append("g")
    .attr("transform", `translate(${WIDTH / 2}, ${HEIGHT / 2})`);


const chord = d3.chord()
    // .sortSubgroups(d3.ascending)
    (adjacencyMatrix)


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


function onMouseEneter(event, datum) {
    tooltip.select("#class-name").text(datum.data.name);

    // the circle starts from the top not from the right, the equations need to be adjusted
    const arcAngle = datum.startAngle + (datum.endAngle - datum.startAngle) / 2 + 3 * Math.PI / 2;
    const radius = RADIUS + datum.height * ARC_THICKNESS;
    const xCoord = WIDTH / 2 + radius * Math.cos(arcAngle);
    const yCoord = HEIGHT / 2 + radius * Math.sin(arcAngle)

    tooltip.style("transform", `translate(${xCoord}px, ${yCoord}px)`);

    tooltip.style("opacity", 1);
}

function onMouseDown(event, datum) {
    const paths = datum.leaves().flatMap(l => l.paths);
    const otherPaths = new Set(leaves.flatMap(l => l.paths).filter(p => !paths.includes(p)));
    paths.forEach(p => {
        if (p.oldStroke) {
            d3.select(p)
                .style("stroke", p.oldStroke)
                .style("opacity", 1);
        }
    });
    otherPaths.forEach(p => {
        if (!p.oldStroke) {
            p.oldStroke = p.style.stroke;
        }
        d3.select(p)
            .style("stroke", "darkgrey")
            .style("opacity", 0.2);
    });
}

function onMouseLeave(event, datum) {
    tooltip.style("opacity", 0);
}

const arcs = svg.append("g");

const arcsColorScale = d3.scaleSequential()
    .domain([0, classHierarchy.children.length - 1])
    .interpolator(d3.interpolateCool)

const drawArcs = function (tree, chord, color) {
    // use bfs to draw arcs for the provided hierarchy
    updateAngles(chord.groups);

    let q = [];
    tree.visited = true;
    q.push(tree)

    tree.color = d3.rgb(color);

    const brightenAmount = (0.6 - 0.1) / tree.height;

    while (q.length !== 0) {
        const node = q.shift();

        const currentArc = arcs
            .datum(node)
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

classHierarchy.children.forEach((c, idx) => drawArcs(c, chord, arcsColorScale(idx)))

/* DRAW EDGES */

const cluster = d3.cluster()
    .size([360, RADIUS]);

cluster(classHierarchy);

leaves.forEach(
    (leaf, idx) => {
        const group = chord.groups[idx];
        leaf.x = ((group.startAngle + group.endAngle) / 2) * (180 / Math.PI);
    }
)

leaves.forEach(l => l.data.imports = adjacencyList[l.id]);

const line = d3.lineRadial()
    .curve(d3.curveBundle.beta(0.85))
    .radius(function (d) { return d.y; })
    .angle(function (d) { return d.x / 180 * Math.PI; });

const weightExtend = d3.extent(adjacencyMatrix.flatMap(r => r));

const linksColorScale = d3.scaleSequential()
    .domain(weightExtend)
    .interpolator(d3.interpolateReds)

const linksWidthScale = d3.scaleLinear()
    .domain(weightExtend)
    .range([1, 5]);

const link = svg.append("g").selectAll("g")
    .data(constructClassLinks(leaves))
    .enter()
    .append("path")
    .each(function (d) {
        d.source = d[0];
        d.source.paths = [];

        d.target = d[d.length - 1];
        d.target.paths = [];
    })
    .attr("d", line)
    .each(function (d) {
        d.source.paths.push(this);
        d.target.paths.push(this);
    })
    .attr("fill", "none")
    .style("stroke", d => linksColorScale(adjacencyMatrix[d.source.idx][d.target.idx]))
    .style("stroke-width", d => linksWidthScale(adjacencyMatrix[d.source.idx][d.target.idx]));

// console.log(d3.select(leaves[0].paths[0]).style("stroke", "green"));

// Return a list of imports for the given array of nodes.
function constructClassLinks(nodes) {
    const map = {}, imports = [];

    // Compute a map from name to node.
    nodes.forEach(function (d) {
        map[d.data.name] = d;
    });

    // For each import, construct a link from the source to target node.
    nodes.forEach(function (d) {
        if (d.data.imports) d.data.imports.forEach(function (i) {
            imports.push(map[d.data.name].path(map[i]));
        });
    });

    return imports;
}


// var bubble = svg.append("g").selectAll("g");

// bubble = bubble
//     .data(leaves)
//     .enter().append("circle")
//     .attr("class", "bubble")
//     .attr("transform", function (d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 10) + ",0)" })
//     .attr('r', d => 20)
//     .attr('stroke', 'black')
//     .attr('fill', 'red')
//     .style('opacity', .2)

// gradient
// linii, vazut valoarea (importanta)


// colors
// TODO: generate 

// var randomColor = () => d3.rgb(...hsvToRgb(Math.random(), 0.3, 0.5));

// function hsvToRgb(h, s, v) {
//     let r, g, b;

//     let h_i = Math.floor(h * 6);
//     let f = h * 6 - h_i;
//     let p = v * (1 - s);
//     let q = v * (1 - f * s);
//     let t = v * (1 - (1 - f) * s);

//     if (h_i === 0) {
//         [r, g, b] = [v, t, p];
//     }

//     if (h_i === 1) {
//         [r, g, b] = [q, v, p];
//     }

//     if (h_i === 2) {
//         [r, g, b] = [p, v, t];
//     }

//     if (h_i === 3) {
//         [r, g, b] = [p, q, v];
//     }

//     if (h_i === 4) {
//         [r, g, b] = [t, p, v];
//     }

//     if (h_i === 5) {
//         [r, g, b] = [v, p, q];
//     }

//     return [r * 256, g * 256, b * 256].map(Math.floor);
// }
