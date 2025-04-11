// This function creates the Circle Packing chart.
// It takes the raw hierarchical data (defined in data.js) and draws it as nested circles.
function createCirclePacking() {
  // --- Configuration ---
  // Get the available width from the browser window, subtracting some space.
  const width = window.innerWidth * 0.9;
  // Get the available height.
  const height = window.innerHeight * 0.9;
  // Use the smaller dimension to make the packing layout roughly square.
  const size = Math.min(width, height);

  // --- Color Scale ---
  // Create a function that maps numbers (depth level) to colors.
  const color = d3
    .scaleLinear() // A linear scale maps a range of numbers to another range (colors).
    .domain([0, 5]) // Input range: Node depth from 0 (root) to 5.
    // Output range: Colors from white to red to black (hex codes).
    .range(["#FFFFFF", "#F01111", "#0000"])
    // Method for blending colors between the specified range points. interpolateRgb is standard.
    .interpolate(d3.interpolateRgb);

  // --- Layout Calculation ---
  // Create the circle packing layout function.
  const pack = (data) =>
    // d3.pack() is the D3 function that calculates circle positions and sizes.
    d3
      .pack()
      // Set the overall size of the packing layout.
      .size([size, size])
      // Set the padding (space) between sibling circles.
      .padding(5)(
      // The (data) part applies the pack function to our data.
      // Convert the raw data object into D3's hierarchy format.
      d3
        .hierarchy(data)
        // Tell D3 how to calculate the size of each node.
        // It sums the 'value' property of leaf nodes up the hierarchy.
        .sum((d) => d.value)
        // Sort sibling circles (optional, affects placement slightly).
        // Places larger circles first.
        .sort((a, b) => b.value - a.value)
    );
  // Run the layout function on our data to get the calculated positions/radii.
  const root = pack(data); // 'root' now contains the data with x, y, r properties.

  // --- SVG Creation ---
  // Create an SVG element in memory (not yet added to the page).
  const svg = d3
    .create("svg") // Like document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    // Set the viewBox attribute for scaling and centering.
    // `-${size / 2} -${size / 2}` shifts the origin to the center.
    .attr("viewBox", `-${size / 2} -${size / 2} ${size} ${size}`)
    // Set the actual display width and height of the SVG element.
    .attr("width", size)
    .attr("height", size)
    // Apply inline CSS styles.
    .attr(
      "style",
      `display: block;        /* Standard SVG practice */
       margin: auto;          /* Helps centering if container is larger */
       background: ${color(
         0
       )}; /* Set background using the color scale (root depth = 0) */
       cursor: pointer;       /* Indicate it's interactive */`
    );

  // --- Draw Circles (Nodes) ---
  // Append an SVG group element <g> to hold all the circles.
  const node = svg
    .append("g")
    // Select all circle elements *that will be created* within this group.
    .selectAll("circle")
    // Bind the calculated node data to the selection.
    // root.descendants() gets all nodes. slice(1) skips the main root circle (it's the background).
    .data(root.descendants().slice(1))
    // Create a <circle> element for each data point that doesn't have one yet.
    .join("circle")
    // Set the fill color based on node properties.
    // If the node has children, use the color scale based on its depth.
    // If it's a leaf node (no children), make it white.
    .attr("fill", (d) => (d.children ? color(d.depth) : "white"))
    // Control mouse interaction. Disable clicks on leaf nodes (white circles).
    .attr("pointer-events", (d) => (!d.children ? "none" : null))
    // Add mouse hover effect: highlight stroke.
    .on("mouseover", function () {
      // Use 'function' to access 'this' (the circle element).
      d3.select(this).attr("stroke", "#000"); // Set stroke to black on hover.
    })
    // Remove hover effect.
    .on("mouseout", function () {
      d3.select(this).attr("stroke", null); // Remove stroke on mouse out.
    })
    // Add click behavior for zooming.
    .on(
      "click",
      // This is an arrow function called when a circle is clicked.
      // 'event' is the mouse event, 'd' is the data bound to the clicked circle.
      (event, d) =>
        // Check if the clicked circle ('d') is not already the focused one ('focus').
        focus !== d &&
        // If not focused, call the zoom function and stop the click event from
        // bubbling up (e.g., to the SVG background click handler).
        (zoom(event, d), event.stopPropagation())
    );

  // --- Draw Labels ---
  // Append an SVG group element <g> for the labels.
  const label = svg
    .append("g")
    // Set the font style for all labels in this group.
    .style("font", "10px sans-serif")
    // Make labels non-interactive (clicks pass through them).
    .attr("pointer-events", "none")
    // Center the text horizontally within its calculated position.
    .attr("text-anchor", "middle")
    // Select all text elements *that will be created*.
    .selectAll("text")
    // Bind node data (including the root this time, though its label might not show).
    .data(root.descendants())
    // Create <text> elements for the data.
    .join("text")
    // Set initial visibility (opacity). Only show labels directly under the root.
    .style("fill-opacity", (d) => (d.parent === root ? 1 : 0))
    // Set initial display style. Only display labels directly under the root.
    .style("display", (d) => (d.parent === root ? "inline" : "none"))
    // Set the text content to the 'name' property from the original data.
    .text((d) => d.data.name);

  // --- Zoom Logic ---
  // Add a click handler to the SVG background to zoom out to the root.
  svg.on("click", (event) => zoom(event, root));
  // Variable to keep track of the currently zoomed-in circle (node). Starts at the root.
  let focus = root;
  // Variable to store the current view parameters [x, y, diameter] for interpolation.
  let view;

  // Function to instantly set the view to specific coordinates and scale.
  function zoomTo(v) {
    // 'v' is the target view: [centerX, centerY, diameter].
    // Calculate the zoom scale factor 'k'. It's the ratio of the SVG size to the target diameter.
    const k = size / v[2];
    // Store the current view.
    view = v;
    // Apply transformations to labels.
    label.attr(
      "transform",
      // Translate each label based on its position relative to the view center, scaled by 'k'.
      (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
    );
    // Apply transformations to circle nodes.
    node.attr(
      "transform",
      // Translate each circle similarly.
      (d) => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`
    );
    // Adjust the radius of each circle based on the zoom scale 'k'.
    node.attr("r", (d) => d.r * k);
  }

  // Function to handle the animated zoom transition.
  function zoom(event, d) {
    // 'd' is the node (circle data) to zoom into.
    // Update the focus to the clicked/target node.
    focus = d;

    const transitionDuration = event.altKey ? 7500 : 1500; // Increased base duration

    // Start a D3 transition on the main SVG element.
    const transition = svg
      .transition()
      // Set the animation duration. Longer if Alt key is pressed (7.5s), otherwise 1.5s.
      .duration(transitionDuration) // Apply increased duration
      // Apply an easing function for smooth acceleration/deceleration.
      .ease(d3.easeCubicInOut)
      // Define a custom animation "tween" for the zoom.
      .tween("zoom", (d_ignored) => {
        // The 'd' here is not the node data, can be ignored.
        // Create an interpolator function 'i' that calculates intermediate zoom states
        // between the current 'view' and the target view [focus.x, focus.y, focus.r * 2].
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        // Return a function that takes the transition time 't' (0 to 1)
        // and calls zoomTo with the interpolated view state at that time.
        return (t) => zoomTo(i(t));
      });

    // Animate the labels during the zoom.
    label
      // Select only labels that should be potentially visible after the zoom:
      // EITHER direct children of the new 'focus' OR currently visible labels (to fade out).
      .filter(function (d) {
        // Use 'function' to access 'this.style.display'.
        return d.parent === focus || this.style.display === "inline";
      })
      // Apply the same transition settings to the labels.
      .transition(transition) // Use the same transition object
      // Easing is inherited from the main transition object
      // Animate the fill opacity: fade in if it's a child of the new focus, fade out otherwise.
      .style("fill-opacity", (d) => (d.parent === focus ? 1 : 0))
      // At the start of the transition, ensure labels that *will* be children of the focus are displayed.
      .on("start", function (d) {
        if (d.parent === focus) this.style.display = "inline";
      })
      // At the end of the transition, hide labels that are *no longer* children of the focus.
      .on("end", function (d) {
        if (d.parent !== focus) this.style.display = "none";
      });
  }

  // --- Initial Zoom ---
  // Perform the initial zoom to the root node when the chart is first created.
  zoomTo([root.x, root.y, root.r * 2]);

  // --- Return SVG ---
  // Return the created and populated SVG DOM node so it can be added to the page.
  return svg.node();
} // End of createCirclePacking function
