# Vizceral Data Formats

The traffic data expected to be passed in regularly to `ele.updateData(traffic)`.

```js
{
  defaultRenderer: 'global', // Which graph renderer to use for this graph
  name: 'edge',
  nodes: [
    {
      defaultRenderer: 'region',
      name: 'us-west-2',
      updated: 1462471847, // Unix timestamp. Only checked on the top-level list of nodes. Last time the data was updated (Needed because the client could be passed stale data when loaded)
      maxRPS: 100000, // The maximum RPS seen recently to relatively measure particle density
      nodes: [
        {
          name: 'INTERNET' // Required... this is the entry node
        },
        {
          name: 'apiproxy-prod',
          notices: [ // OPTIONAL Any notices that you want to show up in the sidebar
            {
              title: 'Notice about something',
              link: 'http://link/to/relevant/thing', // OPTIONAL
              severity: 1 // OPTIONAL 0(default) for info level, 1 for warning level, 2 for error level
            }
          ],
          score: 0, // OPTIONAL The score of the node. 0(default) for normal, 1 for warning, 2 for error. This is what the node color is based on.
          metadata: { // OPTIONAL // TODO: metadata 'plugin' support...
            streaming: 1 // OPTIONAL 1 if this connection is in the streaming path, 0 if not
          },
          nodes: [],
          connections: []
        }
      ],
      connections: [
        {
          source: 'INTERNET', // The source of the connection, will log a warning if the node does not exist.
          target: 'apiproxy-prod', // The target of the connection, will log a warning if the node does not exist.
          metrics: {
            total: 5005, // Total number of requests (success + error + degraded)
            success: 5000, // OPTIONAL Number of successful requests (If not provided, will be calculated using total - (degraded + error))
            error: 5, // OPTIONAL Number of error requests (If not provided, assumed 0)
            degraded: 0 // OPTIONAL Number of degraded requests (If not provided, assumed 0)
          },
          notices: [ // OPTIONAL Any notices that you want to show up in the sidebar
            {
              title: 'Notice about something',
              subtitle: 'Subtitle', // OPTIONAL
              link: 'http://link/to/relevant/thing', // OPTIONAL
              severity: 1 // OPTIONAL 0(default) for info level, 1 for warning level, 2 for error level
            }
          ],
          metadata: { // OPTIONAL // TODO: metadata 'plugin' support...
            streaming: 1 // OPTIONAL 1 if this connection is in the streaming path, 0 if not
          }
        }
      ]
    }
  ]
}
```

### filters
Filters are optional.  Passing this structure to `ele.setFilters(filters)` will filter out all elements (nodes and connections) that don't pass the filters.

```js
[
  {
    name: 'rps', // A unique name for the filter
    type: 'connection', // What object type the filter applies to ('node' or 'connection')
    passes: (object, value) => { // The function to compare a value of object to the current value
      return object.volume.total <= value;
    },
    value: -1 // The current value of the filter
  },
  {
    name: 'streamingOnly',
    type: 'connection',
    passes: (object, value) => {
      return !value || object.streaming === value;
    },
    value: true
  }
]
```
