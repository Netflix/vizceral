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
      maxVolume: 100000, // The maximum volume seen recently to relatively measure particle density
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
          class: 'normal', //  The class of the node. 'normal' will be default. Any class you provide will expect to have a style 'colorClass' available.
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
          metrics: { // These are the three default types/colors available in the component and the colors that are used for the nodes themselves. You are welcme to add others, or use other names instead knowing tha they may not match the UI coloring appropriately.
            normal: 5000,
            danger: 5,
            warning: 0
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
          },
          class: 'normal'
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
