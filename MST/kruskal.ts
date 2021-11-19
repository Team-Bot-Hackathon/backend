'use strict';
import { DisjointSet } from 'disjoint-set-ds';

interface Edge {
    vertex_1: number;
    vertex_2: number;
    weight: number;
}

export function kruskal(edges: Edge[]):Edge[]{
    edges.sort(function(a,b){
        return a.weight - b.weight;
    })
    const mstEdges: Edge[] = [];
    const ds = new DisjointSet();

    edges.forEach((edges) => {
        ds.makeSet(edges.vertex_1);
        ds.makeSet(edges.vertex_2);
    });

    edges.forEach((edge) => {
        if(ds.find(edge.vertex_1) !== ds.find(edge.vertex_2)){
            mstEdges.push(edge);
            ds.union(ds.find(edge.vertex_1),ds.find(edge.vertex_2));
        }
    });
    
    return mstEdges;
}