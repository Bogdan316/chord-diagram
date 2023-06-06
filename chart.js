import * as d3 from "d3"

const hierarchy = [
    { 'name': "ClassA", "parent": "" },
    { 'name': "ClassB", "parent": "ClassA" },
    { 'name': "ClassC", "parent": "ClassA" },
]

var svg = d3.select("#chart")
    .append("svg")
    .attr("width", window.innerWidth)
    .attr("height", window.innerHeight)
    .append("g")
    .attr("transform", `translate(${window.innerWidth / 2}, ${window.innerHeight / 2})`)


var matrix = [
    [11975, 5871, 8916, 2868],
    [1951, 10048, 2060, 6171],
    [8010, 16145, 8090, 8045],
    [1013, 990, 940, 6907]
];

var chord = d3.chord()
    .sortSubgroups(d3.ascending)
    // .padAngle(0.1)
    (matrix)

// svg.datum(chord)
//     .append("g")
//     .selectAll("path")
//     .data((d) => d)
//     .enter()
//     .append("path")
//     .style("fill", "cornflowerblue")
//     .style("stroke", "black")
//     .attr("d", d3.ribbon().radius(400))
//     .append("title")
//     .text(d => `${d.source.value} → ${d.target.value}`)


const treeData = [
    [
        { "name": "10", "parent": "" },

        { "name": "5", "parent": "10" },
        { "name": "6", "parent": "5" },
        { "name": "4", "parent": "5" },
        { "name": "0", "parent": "6" },
        { "name": "1", "parent": "6" },
        { "name": "2", "parent": "4" },

        { "name": "7", "parent": "10" },
        { "name": "8", "parent": "7" },
        { "name": "9", "parent": "8" },
        { "name": "3", "parent": "9" },
    ],
];

var randomColor = () => d3.rgb(...hsvToRgb(Math.random(), 0.3, 0.5));

const updateAngles = function (root, groups) {
    for (const leaf of root.leaves()) {
        const group = groups[leaf.id];

        leaf.startAngle = group.startAngle;
        leaf.endAngle = group.endAngle;
    }

    var currentLevel = new Set(root.leaves().map(d => d.parent));

    while (currentLevel.size !== 0) {
        const nextLevel = new Set();

        for (const node of currentLevel) {
            node.startAngle = d3.min(node.children, c => c.startAngle);
            node.endAngle = d3.max(node.children, c => c.endAngle);

            if (node.parent) {
                nextLevel.add(node.parent);
            }
        }

        currentLevel = nextLevel;
    }
}

const bfs = function (tree, groups) {

    updateAngles(tree, groups);

    let q = [];
    tree.visited = true;
    q.push(tree)

    let color = randomColor();
    tree.color = color;

    let brightenAmount = (0.85 - 0.2) / tree.height;
    console.log(tree.height);

    while (q.length !== 0) {
        const node = q.shift();


        svg.datum(chord)
            .append("g")
            .selectAll("g")
            .data(groups)
            .enter()
            .append("g").append("path")
            .style("fill", node.color)
            .style("stroke", "white")
            .attr("d", d3.arc()
                .innerRadius(400 + node.height * 15)
                .outerRadius(400 + (node.height + 1) * 15)
                .startAngle(node.startAngle)
                .endAngle(node.endAngle));

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

var root = d3.stratify()
    .id(d => d.name)
    .parentId(d => d.parent)
    (treeData[0]);
bfs(root.children[0], chord.groups);

bfs(root.children[1], chord.groups);

var cluster = d3.cluster()
    .size([360, 400]);

cluster(root);

root.leaves().forEach(
    (leaf, idx) => {
        const group = chord.groups[idx];
        leaf.x = ((group.startAngle + group.endAngle) / 2) * (180 / Math.PI);
    }
)

var bubble = svg.append("g").selectAll("g");


// bubble = bubble
//     .data(root.leaves())
//     .enter().append("circle")
//     .attr("class", "bubble")
//     .attr("transform", function (d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y + 10) + ",0)" })
//     .attr('r', d => 20)
//     .attr('stroke', 'black')
//     .attr('fill', 'red')
//     .style('opacity', .2)

root.leaves().forEach(l => l.data.imports = ["0", "1", "2", "3"]);

var line = d3.lineRadial()
    .curve(d3.curveBundle.beta(0.85))
    .radius(function (d) { return d.y; })
    .angle(function (d) { return d.x / 180 * Math.PI; });

let link = svg.append("g").selectAll("g");

link = link
    .data(packageImports(root.leaves()))
    .enter().append("path")
    .each(function (d) { 
        // d[0].x -= 10;
        d.source = d[0]; 
        d.target = d[d.length - 1]; 
        console.log(d[0], d[d.length - 1]);
    })
    .attr("d", line)
    .attr("fill", "none")
    .style("stroke", "cornflowerblue");

// Return a list of imports for the given array of nodes.
function packageImports(nodes) {
    var map = {},
        imports = [];

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

// gradient
// linii, vazut valoarea (importanta)


// colors
// TODO: generate 
function hsvToRgb(h, s, v) {
    let r, g, b;

    let h_i = Math.floor(h * 6);
    let f = h * 6 - h_i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    if (h_i === 0) {
        [r, g, b] = [v, t, p];
    }

    if (h_i === 1) {
        [r, g, b] = [q, v, p];
    }

    if (h_i === 2) {
        [r, g, b] = [p, v, t];
    }

    if (h_i === 3) {
        [r, g, b] = [p, q, v];
    }

    if (h_i === 4) {
        [r, g, b] = [t, p, v];
    }

    if (h_i === 5) {
        [r, g, b] = [v, p, q];
    }

    return [r * 256, g * 256, b * 256].map(Math.floor);
}
