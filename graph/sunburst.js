// This function creates the Zoomable Sunburst chart.
// It displays hierarchical data (from data.js) as segments of concentric rings.
// Clicking a segment zooms in to show its children.
function createSunburst() {
  // --- Configuration ---
  // Set the width based on the window size.
  const width = window.innerWidth * 0.9;
  // Height is the same as width for a circular layout.
  const height = width;
  // Calculate the radius for the sunburst. It's based on the smaller dimension
  // (width or height of the drawing area) and divided to control the overall size.
  const radius = Math.min(width, window.innerHeight * 0.9) / 6;

  // --- Color Scale ---
  // Create a color scale specifically for categorical data (like names).
  // d3.scaleOrdinal assigns a unique color from a scheme to each unique input value.
  const color = d3.scaleOrdinal(
    // d3.quantize generates an array of colors by sampling the rainbow interpolation.
    // The number of colors generated is based on the number of top-level children + 1.
    d3.quantize(d3.interpolateRainbow, data.children.length + 1)
  );

  // --- Data Preparation & Layout ---
  // Convert the raw data into D3's hierarchy format.
  const hierarchy = d3
    .hierarchy(data)
    // Calculate the size of each node based on the 'value' property (summed up).
    .sum((d) => d.value)
    // Sort nodes within the same level by value (descending), affects angular order.
    .sort((a, b) => b.value - a.value);

  // Create the partition layout function. This divides the space into segments.
  const root = d3
    .partition()
    // Set the size of the layout: [total angle, total radius].
    // 2 * Math.PI is a full circle. hierarchy.height + 1 determines the number of rings.
    .size([2 * Math.PI, hierarchy.height + 1])(
    // Apply the layout function to the prepared hierarchy data.
    hierarchy
  ); // 'root' now has x0, x1 (angles) and y0, y1 (radii) properties.

  // Store the initial calculated state (current angles/radii) on each node.
  // This is needed for transitions when zooming.
  root.each((d) => (d.current = d));

  // --- Arc Generator ---
  // Create a function that generates the SVG path data ('d' attribute) for arcs.
  const arc = d3
    .arc()
    // Define the start angle of the arc segment (maps to node's x0).
    .startAngle((d) => d.x0)
    // Define the end angle of the arc segment (maps to node's x1).
    .endAngle((d) => d.x1)
    // Add padding (a small gap) between adjacent arcs at the same level.
    .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
    // Add padding along the radius direction.
    .padRadius(radius * 1.5)
    // Define the inner radius of the arc segment (maps to node's y0).
    .innerRadius((d) => d.y0 * radius)
    // Define the outer radius of the arc segment (maps to node's y1).
    // Ensure the outer radius is at least slightly larger than the inner radius.
    .outerRadius((d) => Math.max(d.y0 * radius, d.y1 * radius - 1));

  // --- SVG Creation ---
  // Create the main SVG element.
  const svg = d3
    .create("svg")
    // Set the viewBox to center the chart. The origin (0,0) is the center.
    .attr("viewBox", [-width / 2, -height / 2, width, width])
    // Set the display width and height.
    .attr("width", width)
    .attr("height", height)
    // Apply CSS styles.
    .style("font", "10px sans-serif") // Default font size for labels.
    .style("max-width", "100%") // Ensure responsiveness.
    .style("height", "auto"); // Ensure responsiveness.

  // --- Draw Arcs (Paths) ---
  // Append an SVG group <g> to hold all the arc paths.
  const path = svg
    .append("g")
    // Select all path elements *that will be created*.
    .selectAll("path")
    // Bind the node data (excluding the root node, which is the center circle).
    .data(root.descendants().slice(1))
    // Create a <path> element for each data point.
    .join("path")
    // Set the fill color. It walks up the hierarchy until depth 1 (top-level child)
    // and uses the color scale based on that ancestor's name.
    .attr("fill", (d) => {
      while (d.depth > 1) d = d.parent;
      return color(d.data.name);
    })
    // Set the fill opacity based on visibility rules and whether it has children.
    // arcVisible checks if the arc is within the visible radius range.
    // Internal nodes (with children) are slightly more opaque.
    .attr("fill-opacity", (d) =>
      arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0
    )
    // Control mouse events. Disable events for hidden arcs.
    .attr("pointer-events", (d) => (arcVisible(d.current) ? "auto" : "none"))
    // Set the path shape ('d' attribute) using the arc generator and the node's current state.
    .attr("d", (d) => arc(d.current));

  // --- Click Interaction ---
  // Filter the paths to select only those representing nodes with children.
  path
    .filter((d) => d.children)
    // Change the cursor to a pointer for these clickable arcs.
    .style("cursor", "pointer")
    // Attach the 'clicked' function to the click event.
    .on("click", clicked);

  // --- Tooltips ---
  // Define a number formatter for the tooltip value.
  const format = d3.format(",d"); // Formats numbers with commas (e.g., 1,000).
  // Append a <title> element to each path. This provides a native browser tooltip.
  path
    .append("title")
    // Set the tooltip text. It shows the full path from the root and the node's value.
    .text(
      (d) =>
        `${d
          .ancestors()
          .map((d) => d.data.name)
          .reverse()
          .join("/")}\n${format(d.value)}`
    );

  // --- Draw Labels ---
  // Append an SVG group <g> for the labels.
  const label = svg
    .append("g")
    .attr("pointer-events", "none") // Labels don't intercept clicks.
    .attr("text-anchor", "middle") // Center text horizontally.
    .style("user-select", "none") // Prevent text selection.
    // Select all text elements *that will be created*.
    .selectAll("text")
    // Bind node data (excluding the root).
    .data(root.descendants().slice(1))
    // Create <text> elements.
    .join("text")
    .attr("dy", "0.35em") // Vertical alignment adjustment.
    // Set text opacity based on visibility rules (labelVisible checks arc size).
    .attr("fill-opacity", (d) => +labelVisible(d.current)) // '+' converts boolean to 0 or 1.
    // Position and rotate the label using the labelTransform function.
    .attr("transform", (d) => labelTransform(d.current))
    // Set the text content.
    .text((d) => d.data.name);

  // --- Center Circle ---
  // Append a circle element for the center area. Clicking this zooms out to the parent.
  const parent = svg
    .append("circle")
    // Bind the root node's data to this circle.
    .datum(root)
    // Set the radius to match the inner radius of the first level arcs.
    .attr("r", radius)
    // Make the center circle transparent.
    .attr("fill", "none")
    // Ensure it can receive click events.
    .attr("pointer-events", "all")
    // Attach the 'clicked' function. Clicking the center zooms out.
    .on("click", clicked);

  // --- Zoom Click Handler ---
  // Function called when an arc or the center circle is clicked.
  function clicked(event, p) {
    // 'p' is the data of the clicked element (arc or center circle).
    // Update the data bound to the center circle ('parent') to be the parent of the
    // clicked element 'p'. If 'p' is the root, its parent is null, so we use 'root'.
    parent.datum(p.parent || root);

    // Calculate the target state (angles and radii) for all nodes after the zoom.
    // This maps the clicked segment 'p' to the full circle.
    root.each(
      (d) =>
        (d.target = {
          // Calculate target start angle (x0). Maps p's range [p.x0, p.x1] to [0, 2*PI].
          x0:
            Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          // Calculate target end angle (x1).
          x1:
            Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) *
            2 *
            Math.PI,
          // Calculate target inner radius (y0). Subtract p's depth to shift levels inward.
          y0: Math.max(0, d.y0 - p.depth),
          // Calculate target outer radius (y1).
          y1: Math.max(0, d.y1 - p.depth),
        })
    );

    // --- Transition ---
    // Start a transition on the main SVG.
    const t = svg
      .transition()
      .duration(event.altKey ? 7500 : 750) // Animation duration.
      .ease(d3.easeCubicInOut); // Apply easing.

    // Transition the arc paths.
    path
      .transition(t)
      // Use a custom "tween" function to interpolate the data smoothly.
      .tween("data", (d) => {
        // Create an interpolator between the node's current state and its target state.
        const i = d3.interpolate(d.current, d.target);
        // Return a function that updates the node's 'current' state at each step 't' (0 to 1).
        return (t) => (d.current = i(t));
      })
      // Filter the selection during transition. This helps if the transition is interrupted.
      // It ensures that arcs becoming visible/invisible are handled correctly.
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      // Animate the fill opacity based on the target visibility.
      .attr("fill-opacity", (d) =>
        arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0
      )
      // Animate pointer events based on target visibility.
      .attr("pointer-events", (d) => (arcVisible(d.target) ? "auto" : "none"))
      // Animate the path shape ('d' attribute) using attrTween.
      // It calls the arc generator with the interpolated 'd.current' state at each step.
      .attrTween("d", (d) => () => arc(d.current));

    // Transition the labels.
    label
      .filter(function (d) {
        // Similar filter for interruption handling.
        return +this.getAttribute("fill-opacity") || labelVisible(d.target);
      })
      .transition(t)
      // Animate the fill opacity based on target label visibility.
      .attr("fill-opacity", (d) => +labelVisible(d.target))
      // Animate the label's transform using attrTween.
      // It calls labelTransform with the interpolated 'd.current' state.
      .attrTween("transform", (d) => () => labelTransform(d.current));
  } // End of clicked function

  // --- Visibility Helper Functions ---
  // Checks if an arc segment should be visible based on its radius levels.
  function arcVisible(d) {
    // Visible if outer radius (y1) is within level 3 and inner radius (y0) is level 1 or greater,
    // and the angle is positive (x1 > x0).
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }

  // Checks if a label should be visible.
  function labelVisible(d) {
    // Visible if the arc is visible and the area of the arc segment is large enough.
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  // Calculates the transform (rotation and translation) for a label.
  function labelTransform(d) {
    // Calculate the angle of the label (midpoint of the arc segment, converted to degrees).
    const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI;
    // Calculate the radial position of the label (midpoint of the inner/outer radius).
    const y = ((d.y0 + d.y1) / 2) * radius;
    // Apply rotation: rotate to the angle, translate out to the radius,
    // then rotate 180 degrees if the label is on the bottom half to keep text upright.
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  // --- Return SVG ---
  // Return the created and populated SVG DOM node.
  return svg.node();
} // End of createSunburst function
