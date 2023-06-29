const OBJECT_FQN = "java.lang.Object";

const adjacencyList = new Map();
const pairClientsCount = new Map();

for (pairFQNs of Object.keys(pairs)) {
    const [p0, p1] = pairFQNs.split("|");

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
        p0Map.set(p1, pairs[pairFQNs]);
    }
}

const classHierarchyJson = hierarchies;

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

const clientsMap = new Map();

let i = 0;

for (pair of Object.keys(clients)) {
    const formattedNames = clients[pair].map(c => {
        let [projectName, fqn] = c.split("/")
        const nameParts = fqn.split(".");
        const newName = projectName + "/" + nameParts
            .slice(0, nameParts.length - 1)
            .map(s => s.charAt(0))
            .join(".") + "." + nameParts[nameParts.length - 1]
        return newName;
    });

    clientsMap.set(pair, "<br/>" + formattedNames.join("<br/>"));
}