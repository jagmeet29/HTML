// This function creates the Collapsible Tree chart.
// It arranges the hierarchical data (from data.js) as a tree structure
// where nodes can be clicked to expand or collapse branches.
function createTree() {
  // Add ID generator function
  let nextId = 1;
  function generateId() {
    return `node-${nextId++}`;
  }

  // Initialize the data structure with unique IDs if they don't exist
  function addIds(node) {
    if (!node.id) {
      node.id = generateId();
    }
    if (node.children) {
      node.children.forEach(addIds);
    }
    return node;
  }

  // Add IDs to the original data structure
  addIds(data);

  // --- Configuration ---
  // Initial width calculation based on window, but might be overridden later
  let svgWidth = window.innerWidth * 0.9;
  // Define margins around the tree drawing area.
  const marginTop = 30;
  const marginRight = 150; // Larger right margin for labels on the right.
  const marginBottom = 30;
  const marginLeft = 100; // Larger left margin for the root node.

  // --- Data Preparation ---
  // Create the initial hierarchy with original data IDs
  let root = d3.hierarchy(data);
  root.x0 = 0;
  root.y0 = 0;

  // Store the original data IDs in the hierarchy nodes
  root.descendants().forEach((d) => {
    d.id = d.data.id; // Use the ID from the data
    d._children = d.children;
  });

  // --- Layout Dimensions ---
  // Define the vertical separation between nodes (tree levels).
  const dx = 35; // Increased for more vertical space.
  // dy calculation might need adjustment based on actual width later,
  // but start with an estimate.
  let dy = (svgWidth - marginRight - marginLeft) / (1 + root.height);

  // --- Layout Generators ---
  // Create the D3 tree layout function.
  const tree = d3
    .tree()
    // Define the size of each node in the layout (vertical separation dx, horizontal separation dy).
    .nodeSize([dx, dy]);
  // Create a function ('diagonal') to generate the path shape for links between nodes.
  // linkHorizontal creates paths suitable for a horizontal tree (root on left).
  const diagonal = d3
    .linkHorizontal()
    // The 'x' coordinate of the path is the node's horizontal position (d.y from tree layout).
    .x((d) => d.y)
    // The 'y' coordinate of the path is the node's vertical position (d.x from tree layout).
    .y((d) => d.x);

  // --- SVG Creation ---
  // Create the main SVG element.
  const svg = d3
    .create("svg")
    // Set the SVG width.
    .attr("width", svgWidth) // Initial width
    // Set an initial SVG height (will be adjusted dynamically).
    .attr("height", dx) // Initial height
    // Set the initial viewBox. This defines the coordinate system.
    // It will also be adjusted dynamically based on the tree height.
    .attr("viewBox", [-marginLeft, -marginTop, svgWidth, dx]) // Initial viewBox
    // Apply CSS styles.
    .attr(
      "style",
      `height: 90vh;        /* Set a large height, viewBox controls visible area */
       font: 14px sans-serif; /* Set default font size */
       user-select: none;   /* Prevent text selection */`
    );

  // --- SVG Groups ---
  // Create an SVG group <g> element to hold all the links.
  const gLink = svg
    .append("g")
    .attr("fill", "none") // Links are just strokes, no fill.
    .attr("stroke", "#555") // Link color.
    .attr("stroke-opacity", 0.4) // Link transparency.
    .attr("stroke-width", 1.5); // Link thickness.

  // Create an SVG group <g> element to hold all the nodes (circles and text).
  const gNode = svg
    .append("g")
    .attr("cursor", "pointer") // Indicate nodes are clickable.
    .attr("pointer-events", "all"); // Ensure this group catches mouse events.

  // --- Update Function ---
  // This function handles drawing and updating the tree when nodes are clicked.
  function update(source) {
    // 'source' is the node that was clicked (or the root initially).
    const duration = 750; // Increased duration for tree updates
    // Assign the nodes and links based on the *current* root state.
    const nodes = root.descendants();
    const links = root.links();

    // Calculate the new positions for all nodes based on the current hierarchy
    // (some nodes might have their 'children' property set to null if collapsed).
    tree(root);

    // --- Calculate Actual Required Dimensions ---
    let minX = Infinity,
      maxX = -Infinity; // For vertical bounds (d.x)
    let minY = Infinity,
      maxY = -Infinity; // For horizontal bounds (d.y)

    root.each((node) => {
      if (node.x < minX) minX = node.x;
      if (node.x > maxX) maxX = node.x;
      if (node.y < minY) minY = node.y; // Should always be 0 for root
      if (node.y > maxY) maxY = node.y; // Find max horizontal extent
    });

    // Calculate required height
    const calculatedHeight = maxX - minX + marginTop + marginBottom;
    const height = Math.max(window.innerHeight * 0.8, calculatedHeight);

    // Calculate required width based on deepest node's y position
    const requiredWidth = maxY + marginLeft + marginRight;

    // Use the larger of the initial width or the required width for the SVG element
    const finalSvgWidth = Math.max(svgWidth, requiredWidth);

    // Calculate the desired vertical center for the viewBox.
    // We'll try to keep the source node vertically centered.
    const viewBoxCenterY = source.x;
    // Calculate the top y-coordinate for the viewBox based on the center and height.
    const viewBoxY = viewBoxCenterY - height / 2;

    // --- SVG Transition ---
    // Start a transition on the SVG element itself to animate height/viewBox changes.
    const transition = svg
      .transition()
      .duration(duration) // Apply increased duration
      .ease(d3.easeCubicInOut) // Apply easing for smoothness
      .attr("width", finalSvgWidth) // Update width attribute
      .attr("height", height) // Animate the SVG height attribute.
      // Update viewBox width to match the potentially larger finalSvgWidth
      .attr("viewBox", [-marginLeft, viewBoxY, finalSvgWidth, height])
      // A fallback tween for browsers that don't support ResizeObserver well.
      .tween(
        "resize",
        window.ResizeObserver ? null : () => () => svg.dispatch("toggle")
      );

    // --- Update Nodes ---
    // Select all node groups (<g>) within the main node group (gNode).
    // Bind the 'nodes' data, using the unique 'id' as the key for tracking.
    const node = gNode.selectAll("g").data(nodes, (d) => d.id);

    // --- Enter New Nodes ---
    const nodeEnter = node
      .enter()
      .append("g")
      // Set initial position to the *current* position of the source node (parent)
      .attr("transform", (d) => `translate(${source.y},${source.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)
      .on("click", (event, d) => {
        // Node click for expand/collapse
        if (
          event.target.tagName === "circle" ||
          event.target.tagName === "text"
        ) {
          // Check if the node actually has hidden children to toggle
          if (d._children) {
            d.children = d.children ? null : d._children;
            update(d); // Update with the clicked node as source
          }
        }
      });

    // Append a circle to the entering node group.
    nodeEnter
      .append("circle")
      .attr("r", 6) // Circle radius.
      // Set fill color: darker if it has hidden children (_children), lighter otherwise.
      .attr("fill", (d) => (d._children ? "#555" : "#999"))
      .attr("stroke-width", 1); // Circle border width.

    // Append text to the entering node group.
    nodeEnter
      .append("text")
      .attr("dy", "0.31em") // Vertical alignment adjustment.
      // Position text based on whether it's a leaf node or internal node, and depth
      .attr("x", (d) => {
        // Check if it's a leaf node (no children, visible or hidden)
        const isLeaf = !d.children && !d._children;
        if (isLeaf) {
          return 10; // Always position leaf node text to the right
        } else {
          // For internal nodes (with children, visible or hidden)
          // Original logic: text on left if it has children (_children)
          // We keep text on left for internal nodes regardless of depth >= 3 change
          return -10; // Internal node text always on left
        }
      })
      // Align text based on position
      .attr("text-anchor", (d) => {
        const isLeaf = !d.children && !d._children;
        if (isLeaf) {
          return "start"; // Leaf node text starts after the node
        } else {
          // For internal nodes
          return "end"; // Internal node text ends before node
        }
      })
      .text((d) => d.data.name)
      // --- Text Halo Effect ---
      .clone(true) // Create a copy of the text element.
      .lower() // Place the copy behind the original text.
      .attr("stroke-linejoin", "round") // Style for the stroke.
      .attr("stroke-width", 3) // Thickness of the halo.
      .attr("stroke", "white"); // Color of the halo (usually white).

    // --- Add '+' Button for Adding Nodes ---
    nodeEnter
      .append("text")
      .attr("dy", "-1em") // Position above the node
      .attr("x", 0) // Center horizontally with the node
      .attr("fill", "green")
      .style("font-size", "14px") // Slightly smaller for better appearance
      .style("text-anchor", "middle") // Center the text
      .style("cursor", "pointer")
      .text("+")
      .on("click", (event, d_clicked) => {
        event.stopPropagation();

        const newNodeName = prompt(
          "Enter name for new child node:",
          "New Node"
        );
        if (newNodeName?.trim()) {
          // Use the helper function from data.js to create new node
          const newNodeData = createNewNode(newNodeName, generateId());

          // Find the correct parent node in the original data structure
          function findAndUpdateNode(node) {
            if (node.id === d_clicked.data.id) {
              // Found the parent node, add the new child
              if (!node.children) {
                node.children = [];
              }
              node.children.push(newNodeData);
              return true;
            }
            if (node.children) {
              return node.children.some(findAndUpdateNode);
            }
            return false;
          }

          // Update the original data structure
          if (findAndUpdateNode(data)) {
            // Save the updated data to localStorage
            saveData(data);

            // Store expanded/collapsed state
            const expandedNodes = new Set();
            root.descendants().forEach((node) => {
              if (node.children) {
                expandedNodes.add(node.data.id);
              }
            });

            // Regenerate hierarchy with new data
            root = d3.hierarchy(data);

            // Restore expanded/collapsed state and positions
            root.descendants().forEach((node) => {
              node.id = node.data.id;
              if (node.parent) {
                // Initialize position from parent if new
                node.x0 = node.parent.x0;
                node.y0 = node.parent.y0;
              } else {
                node.x0 = 0;
                node.y0 = 0;
              }

              // Restore children state
              node._children = node.children;
              if (!expandedNodes.has(node.data.id) && node.depth > 0) {
                node.children = null;
              }
            });

            // Find the clicked node in the new hierarchy
            let newSource = root
              .descendants()
              .find((n) => n.data.id === d_clicked.data.id);

            // Ensure the parent node is expanded to show the new child
            if (newSource) {
              newSource.children = newSource._children;
              update(newSource);
            }
          }
        }
      });

    // --- Transition Nodes (Enter + Update) ---
    node
      .merge(nodeEnter)
      // Apply the main transition to animate nodes to their new positions.
      .transition(transition)
      // Animate the 'transform' attribute to move nodes smoothly.
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      // Fade in the nodes (or keep them faded in).
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    // --- Exit Nodes ---
    // Handle nodes that are exiting (being removed from the display).
    const nodeExit = node
      .exit() // Get the exiting selection.
      // Apply the transition to animate exiting nodes.
      .transition(transition)
      // Remove the node group from the DOM after the transition finishes.
      .remove()
      // Animate the exiting nodes towards the position of the 'source' node (where the click happened).
      .attr("transform", (d) => `translate(${source.y},${source.x})`)
      // Fade out the exiting nodes.
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    // --- Update Links ---
    // Select all link paths within the main link group (gLink).
    // Bind the 'links' data, using the target node's id as the key.
    const link = gLink.selectAll("path").data(links, (d) => d.target.id);

    // --- Enter New Links ---
    // Handle links that are entering.
    const linkEnter = link
      .enter() // Get the entering selection.
      .append("path") // Append a new path element for each entering link.
      // Set the initial path shape ('d' attribute) to start from the 'source' node's position.
      // This makes links appear to grow out from the clicked node.
      .attr("d", (d) => {
        // Create a temporary point object representing the source's current position.
        const o = { x: source.x, y: source.y };
        // Use the diagonal generator with the source point as both start and end for the initial state.
        return diagonal({ source: o, target: o });
      });

    // --- Transition Links (Enter + Update) ---
    // Merge entering links with existing links being updated.
    link
      .merge(linkEnter)
      // Apply the main transition to animate links to their new shape.
      .transition(transition)
      // Animate the 'd' attribute using the diagonal generator to draw the final path shape.
      .attr("d", diagonal);

    // --- Exit Links ---
    // Handle links that are exiting.
    link
      .exit() // Get the exiting selection.
      // Apply the transition to animate exiting links.
      .transition(transition)
      // Remove the path element after the transition.
      .remove()
      // Animate the exiting links to end at the 'source' node's current position.
      // This makes links appear to shrink back into the clicked node.
      .attr("d", (d) => {
        // Create a temporary point object representing the source's current position.
        const o = { x: source.x, y: source.y };
        // Use the diagonal generator with the source point as both start and end for the final state.
        return diagonal({ source: o, target: o });
      });

    // --- Stash Positions ---
    // Store the current (final) positions of all nodes as their 'previous' positions (x0, y0).
    // This is crucial for the *next* update's enter/exit animations to start correctly.
    root.eachBefore((d) => {
      d.x0 = d.x;
      d.y0 = d.y;
    });
  } // End of update function

  // --- Initial Draw ---
  // Call the update function for the first time to draw the initial state of the tree.
  // 'root' is passed as the source, so animations start from the root's initial position (0,0).
  update(root);

  // --- Return SVG ---
  // Return the created and populated SVG DOM node.
  return svg.node();
} // End of createTree function
