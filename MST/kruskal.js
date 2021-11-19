'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.kruskal = void 0;
const disjoint_set_ds_1 = require("disjoint-set-ds");
function kruskal(edges) {
    edges.sort(function (a, b) {
        return a.weight - b.weight;
    });
    const mstEdges = [];
    const ds = new disjoint_set_ds_1.DisjointSet();
    edges.forEach((edges) => {
        ds.makeSet(edges.vertex_1);
        ds.makeSet(edges.vertex_2);
    });
    edges.forEach((edge) => {
        if (ds.find(edge.vertex_1) !== ds.find(edge.vertex_2)) {
            mstEdges.push(edge);
            ds.union(ds.find(edge.vertex_1), ds.find(edge.vertex_2));
        }
    });
    return mstEdges;
}
exports.kruskal = kruskal;
