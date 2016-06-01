# \_

Copyright 2016 Netflix, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

        http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

# constructor

Represents a Vizceral component.

**Parameters**

-   `canvas` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)=** The canvas to render the graph onto; if not provided, will create a canvas accessible by this.renderer.domElement

# findNodes

Highlight nodes that match searchString.  Searches the node name and the list
of clusters, if nodes have one.

**Parameters**

-   `searchString` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The string to match against the nodes.

Returns **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** { total, totalMatches, visible, visibleMatches }

# getNode

Get a specific node object

**Parameters**

-   `nodeArray` **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** e.g. [ region, nodeName ]

# getStyles

Get an array of all possible defined styles

Returns **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** Array of all possible styles

# setFilters

Set the set of filters to apply along with their current values.

**Parameters**

-   `filters` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** The filters that match the format in DATAFORMATS.md

# setHighlightedNode

Sets the highlighted node.  If the node is undefined, clears any highlighting.

**Parameters**

-   `node` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** The node to highlight

# setView

Set the current view of the component to the passed in array. If the passed
in array does not match an existing region or node, the component will try
each level up the array until it finds a match, defaulting to the global
view.

Ex:
\[] - show the base global view
['us-east-1'] - show the regional view for 'us-east-1' if it exists
['us-east-1', 'api'] - show the api node in the us-east-1 region if it exists

**Parameters**

-   `viewArray` **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** the array containing the view to set.
-   `nodeArray`   (optional, default `[]`)

# updateData

Set the new set of traffic data to render. This is expected to be called
with the complete set of traffic data anytime there is an update.

**Parameters**

-   `data` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** The traffic data that matches the format in DATAFORMATS.md
-   `trafficData`  
-   `excludedEdgeNodes` **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** An array of node names that are at the edge that you want excluded from the global totals

# updateRegions

Update the regions that are known, whether they have data or not

**Parameters**

-   `Array` **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** of region names that we are expecting data for
-   `regions`  

# updateStyles

Update the global styles

**Parameters**

-   `An` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** object map of style names to values
-   `styles`  

# zoomOutViewLevel

If zoomed into a region or a service, zoom out one level up.
If in the global view, this is a noop.

# matchesFound

The `matchesFound` event is fired whenever nodes are found via findNodes().

**Properties**

-   `matches` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** The matches object { total, visible }

# nodeFocused

The `nodeFocused` event is fired whenever a node gains focus or the currently focused node is updated

**Properties**

-   `node` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** The node object that has been focused, or the focused node that has been updated.

# nodeHighlighted

The `nodeHighlighted` event is fired whenever a node is highlighted.

**Properties**

-   `node` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** The node object that has been highlighted, or the highlighted node that has been updated.

# regionContextSizeChanged

The `regionContextSizeChanged` event is fired whenever the context panel size for regional context changes

**Properties**

-   `dimensions` **[object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** The dimensions of the region context panels

# rendered

The `rendered` event is fired whenever a graph is rendered.

**Properties**

-   `name` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the graph that was rendered

# viewChanged

The `viewChanged` event is fired whenever the view changes between global, regional, and node

**Properties**

-   `view` **[array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** The currently selected view (e.g. \[] for global, ['us-east-1'] for regional, ['us-east-1', 'api'] for node level)
