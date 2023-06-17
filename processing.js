const OBJECT_FQN = "java.lang.Object";

const adjacencyList = new Map();
const pairClientsCount = new Map();

pairs.forEach(p => {
    const p0 = p[0], p1 = p[1];

    // create adjacency list from list of pairs
    if (!adjacencyList.has(p0)) {
        adjacencyList.set(p0, new Set());
    }

    adjacencyList.get(p0).add(p1);

    // count how many clients use the pair of classes
    if (!pairClientsCount.has(p0)) {
        pairClientsCount.set(p0, new Map());
    }

    const p0Map = pairClientsCount.get(p0)
    if (!p0Map.has(p1)) {
        p0Map.set(p1, 0);
    }

    p0Map.set(p1, p0Map.get(p1) + 1);
});

// format the list of classes such that d3.stratify() can create a hierarchy
// and remove all the duplicated objects, stratify does not support duplicates
const hierarchyMap = new Map();
hierarchyMap.set(OBJECT_FQN, { name: OBJECT_FQN, parent: "" });

for (i = 0; i < hierarchies.length - 1; i++) {
    if (hierarchies[i] === OBJECT_FQN) {
        continue;
    }

    const newEdge = { name: hierarchies[i], parent: hierarchies[i + 1] };
    hierarchyMap.set(newEdge.name + newEdge.parent, newEdge);
}

const classHierarchyJson = [...hierarchyMap.values()];


var classHierarchy = d3.stratify()
    .id(d => d.name)
    .parentId(d => d.parent)
    (classHierarchyJson);

const leaves = classHierarchy.leaves();

// create the adjacency matrix use a map to make the mapping between the name of the classes and their indexes
const leavesMap = new Map();
leaves.forEach((l, i) => {
    // init list of paths that will be populated later
    l.paths = [];
    // map name of leaf to its index
    leavesMap.set(l.id, i);
});
const adjacencyMatrix = new Array(leaves.length).fill().map(() => new Array(leaves.length).fill(0));

// use the mapping from name to index to populate the adjacency matrix
for (k of pairClientsCount.keys()) {
    const i = leavesMap.get(k);
    const kMap = pairClientsCount.get(k);
    for (p of kMap.keys()) {
        const j = leavesMap.get(p);
        if (i && j)
            adjacencyMatrix[i][j] = adjacencyMatrix[j][i] = kMap.get(p);
    }
}