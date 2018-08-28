

class RingLayout {
  run (graph, dimensions, layoutComplete) {
    const { nodes } = graph;
    const angleBetweenNodes = (Math.PI * 2) / nodes.length;
    const hw = dimensions.width * 0.5;
    const hh = dimensions.height * 0.5;
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const metadataPosition = node.metadata && node.metadata.position;
      let fixedPos;
      if (metadataPosition) {
        const posX = metadataPosition.x;
        const posY = metadataPosition.y;
        if (typeof posX === 'number' && Number.isFinite(posX) && typeof posY === 'number' && Number.isFinite(posY)) {
          fixedPos = { x: posX, y: posY };
        }
      }
      let pos = fixedPos;
      if (!fixedPos) {
        pos = {
          x: Math.cos(i * angleBetweenNodes) * hw,
          y: Math.sin(i * angleBetweenNodes) * hh
        };
      }
      node.updatePosition(pos);
    }
    layoutComplete();
  }
}

export default RingLayout;
