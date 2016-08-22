import GlobalTrafficGraph from './global/globalTrafficGraph';
import RegionTrafficGraph from './region/regionTrafficGraph';

const Console = console;

function NewTrafficGraph (graphData, mainView, graphWidth, graphHeight) {
  let graph;
  switch (graphData.renderer) {
  case 'global':
    graph = new GlobalTrafficGraph(graphData.name, mainView, graphWidth, graphHeight);
    break;
  case 'region':
    graph = new RegionTrafficGraph(graphData.name, mainView, graphWidth, graphHeight);
    break;
  default:
    Console.log(`Attempted to create a graph type that does not exist: ${graphData.renderer} Please supply either global or region as a renderer type`);
  }
  return graph;
}

export default {
  NewTrafficGraph: NewTrafficGraph
};
