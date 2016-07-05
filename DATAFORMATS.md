# Vizceral Data Formats

The traffic data expected to be passed in regularly to `ele.updateData(traffic)`.

```js
{
  renderer: 'global', // Which graph renderer to use for this graph (currently only 'global' and 'region')
  name: 'edge',
  maxVolume: 100000, // OPTIONAL: The maximum volume seen recently to relatively measure particle density. This 'global' maxVolume is optional because it can be calculated by using all of the required sub-node maxVolumes.
  nodes: [
    {
      renderer: 'region',
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
          class: 'normal', //  The class of the node. will default to 'normal' if not provided. The coloring of the UI is based on 'normal', 'warning', and 'danger', so if you want to match the UI coloring, use those class names. Any class you provide will expect to have a style 'colorClassName' available, e.g. if the class is 'fuzzy', you should also call 'vizceral.updateStyles({ colorFuzzy: '#aaaaaa' })'
          metadata: {}, // OPTIONAL Any data that may be handled by a plugin or other data that isn't important to vizceral itself (if you want to show stuff on the page that contains vizceral, for example)
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
          metadata: {}, // OPTIONAL Any data that may be handled by a plugin or other data that isn't important to vizceral itself (if you want to show stuff on the page that contains vizceral, for example)
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
