export function buildNetwork(data) {
  const stations = new Map(data.stations.map(s => [s.id, s]));
  const lines = new Map(data.lines.map(l => [l.id, l]));
  const edges = new Map(data.stations.map(s => [s.id, []]));
  for (const [branchIndex,b] of data.branches.entries()) {
    const pairs = b.stations.slice(1).map((id, i) => [b.stations[i], id, i]);
    if (b.loop) pairs.push([b.stations.at(-1), b.stations[0], b.stations.length - 1]);
    for (const [a, z, i] of pairs) {
      const endForward = b.loop ? '环线' : stations.get(b.stations.at(-1)).name;
      const endBackward = b.loop ? '环线' : stations.get(b.stations[0]).name;
      edges.get(a).push({to:z, line:b.line, service:branchIndex+'-forward', direction:endForward});
      edges.get(z).push({to:a, line:b.line, service:branchIndex+'-backward', direction:endBackward});
    }
  }
  return {stations, lines, edges};
}

// Track each branch service and travel direction. A branch-to-branch turnback
// requires changing trains even when both services have the same line number.
export function findRoute(network, from, to, mode='transfers', special=false) {
  if (!network.stations.has(from) || !network.stations.has(to)) return null;
  if (from === to) return {steps:[], stops:0, transfers:0, segments:[]};
  const queue = [{station:from, service:'', score:0, steps:[], transfers:0}];
  const best = new Map();
  while (queue.length) {
    queue.sort((a,b) => a.score - b.score);
    const cur = queue.shift(), key = cur.station+'|'+cur.service;
    if ((best.get(key) ?? Infinity) <= cur.score) continue;
    best.set(key,cur.score);
    if (cur.station === to) {
      const segments=[];
      for (const step of cur.steps) {
        let seg=segments.at(-1);
        if (!seg || seg.service!==step.service) {
          seg={line:step.line, service:step.service, stations:[step.from], directions:[]};segments.push(seg);
        }
        seg.stations.push(step.to);seg.directions.push(step.direction);
      }
      // Use the final edge's branch direction, which disambiguates a shared trunk.
      for (const s of segments) s.direction=s.directions.at(-1);
      return {steps:cur.steps, stops:cur.steps.length, transfers:cur.transfers, segments};
    }
    for (const edge of network.edges.get(cur.station)) {
      if (!special && network.lines.get(edge.line).special) continue;
      const transfer=cur.service && cur.service!==edge.service ? 1 : 0;
      const score=cur.score + (mode==='transfers' ? 1+transfer*1000 : 1000+transfer);
      if ((best.get(edge.to+'|'+edge.service) ?? Infinity)<=score) continue;
      queue.push({station:edge.to,service:edge.service,score,transfers:cur.transfers+transfer,steps:[...cur.steps,{from:cur.station,...edge}]});
    }
  }
  return null;
}
