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

The following is sample JSON for rending a basic one-to-many graph representation:

```js
{
  "renderer": "global",
  "name": "edge",
  "nodes": [
    {
      "renderer": "region",
      "name": "INTERNET",
      "updated": 1466838417510,
      "nodes": [
      ],
      "class": "normal"
    },
    {
      "renderer": "region",
      "name": "us-east-1",
      "maxVolume": 50000,
      "class": "normal",
      "updated": 1466838546805,
      "nodes": [
        {
          "name": "INTERNET",
          "class": "normal"
        },
        {
          "name": "alpha",
          "metadata": {
            "streaming": true
          },
          "class": "normal"
        },
        {
          "name": "bravo",
          "metadata": {
            "streaming": true
          },
          "class": "normal"
        },
        {
          "name": "charlie",
          "metadata": {
            "streaming": true
          },
          "class": "normal"
        },
        {
          "name": "delta",
          "metadata": {
            "streaming": true
          },
          "class": "normal"
        },
        {
          "name": "echo",
          "metadata": {
            "streaming": true
          },
          "class": "normal"
        },
        {
          "name": "foxtrot",
          "metadata": {
            "streaming": true
          },
          "class": "normal"
        }
      ],
      "connections": [
        {
          "source": "INTERNET",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "danger": 0.646,
            "normal": 31.12
          },
          "class": "normal"
        },
        {
          "source": "INTERNET",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "danger": 0.582,
            "normal": 218.972
          },
          "class": "normal"
        },
        {
          "source": "INTERNET",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "normal": 11.072
          },
          "class": "normal"
        },
        {
          "source": "INTERNET",
          "target": "alpha",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "danger": 116.524,
            "normal": 15598.906
          },
          "status": {
            "danger": 281.33,
            "normal": 65364.56
          },
          "class": "normal"
        },
        {
          "source": "INTERNET",
          "target": "bravo",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "danger": 116.524,
            "normal": 15598.906
          },
          "status": {
            "danger": 281.33,
            "normal": 65364.56
          },
          "class": "normal"
        },
        {
          "source": "INTERNET",
          "target": "charlie",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "danger": 116.524,
            "normal": 15598.906
          },
          "status": {
            "danger": 281.33,
            "normal": 65364.56
          },
          "class": "normal"
        },
        {
          "source": "INTERNET",
          "target": "delta",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "danger": 116.524,
            "normal": 15598.906
          },
          "status": {
            "danger": 281.33,
            "normal": 65364.56
          },
          "class": "normal"
        },
        {
          "source": "INTERNET",
          "target": "echo",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "danger": 116.524,
            "normal": 15598.906
          },
          "status": {
            "danger": 281.33,
            "normal": 65364.56
          },
          "class": "normal"
        },
        {
          "source": "INTERNET",
          "target": "foxtrot",
          "metadata": {
            "streaming": true
          },
          "metrics": {
            "danger": 116.524,
            "normal": 15598.906
          },
          "status": {
            "danger": 281.33,
            "normal": 65364.56
          },
          "class": "normal"
        }        
      ]
    }
  ],
  "connections": [
    {
      "source": "INTERNET",
      "target": "us-east-1",
      "metrics": {
        "normal": 26037.626,
        "danger": 92.37
      },
      "notices": [

      ],
      "class": "normal"
    }
  ]
}
```

To apply simply create an index.html and do the following after running  ***npm install && npm run build***:

```html
<html>
  <head>
    <style>
      body {
        background-color: #222222;
      }
    </style>
    <script src="./dist/vizceral.js"></script>
    <script>
      function run() {
        var xmlhttp = new XMLHttpRequest();
        // update url depending on where you put the JSON data found above
        var url = "data.json";
        xmlhttp.onreadystatechange = function () {
          if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
            var traffic = JSON.parse(xmlhttp.responseText);
            loadVizceral(traffic);
          }
        };
        xmlhttp.open("GET", url, true);
        xmlhttp.send();
      }

      function loadVizceral(traffic) {
        var viz = new Vizceral.default(document.getElementById('test'));
        viz.updateData(traffic);
        viz.setView();
        viz.animate();
      }
    </script>
    <title>Vanilla Vizceral Example with Sample Data</title>
  </head>
  <body onload='javascript:run( )'>
    <canvas id='test'></canvas>
  </body>
</html>
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

### definitions
Definitions are optional.  Passing a structure similar to `ele.setDefinitions(definitions)` will add definitions to the component.  Supported defintions are in the example.

```js
{
  detailedNode: { // These definitions are for switching what the detailed node shows.
    volume: { // `volume` is already defined this way internally, but can be updated by passing it in again
      default: { // default is required
        top: { header: '% RPS', data: 'data.volumePercent', format: '0.00%' }, // top metric in the detailed node. `header` is the header, `data` is the path to the data to display, `format` is how to format the data using numeral.js.
        bottom: { header: 'ERROR RATE', data: 'data.classPercents.danger', format: '0.00%' }, // bottom metric in the detailed node
        donut: { // description of what fills the donut graph around the detailed node
          data: 'data.globalClassPercents',
          indices: [ // by default, the coloring for the donut slices will map by key in data, and in an indeterminant order, but if you want to map them to different classes or force a render order, override it here.
            { key: 'danger' },
            { key: 'warning' },
            { key: 'normal', class: 'normalDonut' }
          ]
        }
      },
      region: { // override for the region renderer
        top: { header: 'SERVICE RPS', data: 'data.volume', format: '0.0' },
        donut: {
          data: 'data.globalClassPercents'
        }
      },
      entry: { // override for entry nodes
        top: { header: 'TOTAL RPS', data: 'data.volume', format: '0.0' }
      }
    }
  }
}
```
