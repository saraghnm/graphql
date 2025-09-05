// XP Progress Line Chart using SVG
export function renderXPChart(xpData) {
  const container = document.getElementById("xp-chart");
  container.innerHTML = ""; // Clear previous content

  if (!xpData || xpData.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8;">No XP data available</p>';
    return;
  }

  const width = 320;
  const height = 200;
  const margin = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Find data ranges
  const maxXP = Math.max(...xpData.map(d => d.cumulative));
  const minDate = Math.min(...xpData.map(d => d.date.getTime()));
  const maxDate = Math.max(...xpData.map(d => d.date.getTime()));

  // Create SVG
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  // Background
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", width);
  bg.setAttribute("height", height);
  bg.setAttribute("fill", "transparent");
  svg.appendChild(bg);

  // Convert data to SVG coordinates
  const points = xpData.map(d => {
    const x = margin.left + ((d.date.getTime() - minDate) / (maxDate - minDate)) * chartWidth;
    const y = margin.top + (1 - (d.cumulative / maxXP)) * chartHeight;
    return { x, y, data: d };
  });

  // Create gradient for area fill
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
  gradient.setAttribute("id", "xp-gradient");
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("x2", "0%");
  gradient.setAttribute("y2", "100%");

  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("stop-color", "#3b82f6");
  stop1.setAttribute("stop-opacity", "0.8");

  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("stop-color", "#3b82f6");
  stop2.setAttribute("stop-opacity", "0.1");

  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.appendChild(defs);

  // Create area path (fill under line)
  if (points.length > 0) {
    const areaPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    let pathData = `M ${points[0].x} ${height - margin.bottom}`;
    points.forEach(point => {
      pathData += ` L ${point.x} ${point.y}`;
    });
    pathData += ` L ${points[points.length - 1].x} ${height - margin.bottom} Z`;
    
    areaPath.setAttribute("d", pathData);
    areaPath.setAttribute("fill", "url(#xp-gradient)");
    svg.appendChild(areaPath);
  }

  // Create line path
  if (points.length > 1) {
    const linePath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    let pathData = `M ${points[0].x} ${points[0].y}`;
    points.slice(1).forEach(point => {
      pathData += ` L ${point.x} ${point.y}`;
    });
    
    linePath.setAttribute("d", pathData);
    linePath.setAttribute("fill", "none");
    linePath.setAttribute("stroke", "#3b82f6");
    linePath.setAttribute("stroke-width", "2");
    svg.appendChild(linePath);
  }

  // Add points
  points.forEach(point => {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", point.x);
    circle.setAttribute("cy", point.y);
    circle.setAttribute("r", "3");
    circle.setAttribute("fill", "#06b6d4");
    circle.setAttribute("stroke", "#1e293b");
    circle.setAttribute("stroke-width", "1");
    
    // Tooltip on hover
    circle.addEventListener("mouseenter", (e) => {
      showTooltip(e, `${point.data.cumulative.toLocaleString()} XP`);
    });
    circle.addEventListener("mouseleave", hideTooltip);
    
    svg.appendChild(circle);
  });

  // Add axes
  addAxes(svg, margin, chartWidth, chartHeight, maxXP, minDate, maxDate);

  container.appendChild(svg);
}

// Audit Ratio Donut Chart using SVG
export function renderAuditChart(up, down) {
  const container = document.getElementById("audit-chart");
  container.innerHTML = "";

  if (up === 0 && down === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8;">No audit data available</p>';
    return;
  }

  const size = 200;
  const radius = 70;
  const innerRadius = 40;
  const centerX = size / 2;
  const centerY = size / 2;

  const total = up + down;
  const upAngle = (up / total) * 2 * Math.PI;
  const downAngle = (down / total) * 2 * Math.PI;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  // Up segment (given audits)
  if (up > 0) {
    const upPath = createDonutSegment(centerX, centerY, radius, innerRadius, 0, upAngle);
    upPath.setAttribute("fill", "#06b6d4");
    upPath.setAttribute("stroke", "#1e293b");
    upPath.setAttribute("stroke-width", "2");
    svg.appendChild(upPath);

    // Up label
    const upLabelAngle = upAngle / 2;
    const upLabelRadius = (radius + innerRadius) / 2;
    const upLabelX = centerX + Math.cos(upLabelAngle - Math.PI / 2) * upLabelRadius;
    const upLabelY = centerY + Math.sin(upLabelAngle - Math.PI / 2) * upLabelRadius;
    
    const upLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    upLabel.setAttribute("x", upLabelX);
    upLabel.setAttribute("y", upLabelY);
    upLabel.setAttribute("text-anchor", "middle");
    upLabel.setAttribute("dominant-baseline", "middle");
    upLabel.setAttribute("fill", "#f1f5f9");
    upLabel.setAttribute("font-size", "12");
    upLabel.setAttribute("font-weight", "600");
    upLabel.textContent = "Given";
    svg.appendChild(upLabel);
  }

  // Down segment (received audits)
  if (down > 0) {
    const downPath = createDonutSegment(centerX, centerY, radius, innerRadius, upAngle, downAngle);
    downPath.setAttribute("fill", "#f59e0b");
    downPath.setAttribute("stroke", "#1e293b");
    downPath.setAttribute("stroke-width", "2");
    svg.appendChild(downPath);

    // Down label
    const downLabelAngle = upAngle + (downAngle / 2);
    const downLabelRadius = (radius + innerRadius) / 2;
    const downLabelX = centerX + Math.cos(downLabelAngle - Math.PI / 2) * downLabelRadius;
    const downLabelY = centerY + Math.sin(downLabelAngle - Math.PI / 2) * downLabelRadius;
    
    const downLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    downLabel.setAttribute("x", downLabelX);
    downLabel.setAttribute("y", downLabelY);
    downLabel.setAttribute("text-anchor", "middle");
    downLabel.setAttribute("dominant-baseline", "middle");
    downLabel.setAttribute("fill", "#f1f5f9");
    downLabel.setAttribute("font-size", "12");
    downLabel.setAttribute("font-weight", "600");
    downLabel.textContent = "Received";
    svg.appendChild(downLabel);
  }

  // Center ratio text
  const ratio = down === 0 ? "∞" : (up / down).toFixed(2);
  const centerText = document.createElementNS("http://www.w3.org/2000/svg", "text");
  centerText.setAttribute("x", centerX);
  centerText.setAttribute("y", centerY);
  centerText.setAttribute("text-anchor", "middle");
  centerText.setAttribute("dominant-baseline", "middle");
  centerText.setAttribute("fill", "#f1f5f9");
  centerText.setAttribute("font-size", "18");
  centerText.setAttribute("font-weight", "700");
  centerText.textContent = ratio;
  svg.appendChild(centerText);

  container.appendChild(svg);
}

// Pass/Fail Pie Chart using SVG
export function renderPassFailChart(passCount, failCount) {
  const container = document.getElementById("pass-fail-chart");
  container.innerHTML = "";

  if (passCount === 0 && failCount === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8;">No project data available</p>';
    return;
  }

  const size = 200;
  const radius = 80;
  const centerX = size / 2;
  const centerY = size / 2;

  const total = passCount + failCount;
  const passAngle = (passCount / total) * 2 * Math.PI;
  const failAngle = (failCount / total) * 2 * Math.PI;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", `0 0 ${size} ${size}`);

  // Pass segment
  if (passCount > 0) {
    const passPath = createPieSegment(centerX, centerY, radius, 0, passAngle);
    passPath.setAttribute("fill", "#10b981");
    passPath.setAttribute("stroke", "#1e293b");
    passPath.setAttribute("stroke-width", "2");
    svg.appendChild(passPath);

    // Pass percentage label
    const passLabelAngle = passAngle / 2;
    const passLabelRadius = radius * 0.7;
    const passLabelX = centerX + Math.cos(passLabelAngle - Math.PI / 2) * passLabelRadius;
    const passLabelY = centerY + Math.sin(passLabelAngle - Math.PI / 2) * passLabelRadius;
    
    const passPercent = ((passCount / total) * 100).toFixed(1);
    const passLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    passLabel.setAttribute("x", passLabelX);
    passLabel.setAttribute("y", passLabelY);
    passLabel.setAttribute("text-anchor", "middle");
    passLabel.setAttribute("dominant-baseline", "middle");
    passLabel.setAttribute("fill", "#fff");
    passLabel.setAttribute("font-size", "14");
    passLabel.setAttribute("font-weight", "600");
    passLabel.textContent = `${passPercent}%`;
    svg.appendChild(passLabel);
  }

  // Fail segment
  if (failCount > 0) {
    const failPath = createPieSegment(centerX, centerY, radius, passAngle, failAngle);
    failPath.setAttribute("fill", "#ef4444");
    failPath.setAttribute("stroke", "#1e293b");
    failPath.setAttribute("stroke-width", "2");
    svg.appendChild(failPath);

    // Fail percentage label
    const failLabelAngle = passAngle + (failAngle / 2);
    const failLabelRadius = radius * 0.7;
    const failLabelX = centerX + Math.cos(failLabelAngle - Math.PI / 2) * failLabelRadius;
    const failLabelY = centerY + Math.sin(failLabelAngle - Math.PI / 2) * failLabelRadius;
    
    const failPercent = ((failCount / total) * 100).toFixed(1);
    const failLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
    failLabel.setAttribute("x", failLabelX);
    failLabel.setAttribute("y", failLabelY);
    failLabel.setAttribute("text-anchor", "middle");
    failLabel.setAttribute("dominant-baseline", "middle");
    failLabel.setAttribute("fill", "#fff");
    failLabel.setAttribute("font-size", "14");
    failLabel.setAttribute("font-weight", "600");
    failLabel.textContent = `${failPercent}%`;
    svg.appendChild(failLabel);
  }

  container.appendChild(svg);
}

// XP by Project Bar Chart using SVG
export function renderXPByProjectChart(projectData) {
  const container = document.getElementById("xp-by-project-chart");
  container.innerHTML = "";

  if (!projectData || projectData.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #94a3b8;">No project data available</p>';
    return;
  }

  const width = 320;
  const height = 200;
  const margin = { top: 20, right: 20, bottom: 60, left: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const maxXP = Math.max(...projectData.map(d => d.xp));
  const barWidth = chartWidth / projectData.length - 5;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const colors = ["#3b82f6", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#ef4444"];

  // Draw bars
  projectData.forEach((project, i) => {
    const barHeight = (project.xp / maxXP) * chartHeight;
    const x = margin.left + i * (barWidth + 5);
    const y = margin.top + (chartHeight - barHeight);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("fill", colors[i % colors.length]);
    rect.setAttribute("stroke", "#1e293b");
    rect.setAttribute("stroke-width", "1");

    // Hover effect
    rect.addEventListener("mouseenter", (e) => {
      rect.setAttribute("opacity", "0.8");
      showTooltip(e, `${project.name}: ${project.xp.toLocaleString()} XP`);
    });
    rect.addEventListener("mouseleave", (e) => {
      rect.setAttribute("opacity", "1");
      hideTooltip();
    });

    svg.appendChild(rect);

    // Project name label (rotated)
    if (project.name.length < 15) { // Only show if name is not too long
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", x + barWidth / 2);
      text.setAttribute("y", height - margin.bottom + 15);
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#94a3b8");
      text.setAttribute("font-size", "10");
      text.setAttribute("transform", `rotate(-45, ${x + barWidth / 2}, ${height - margin.bottom + 15})`);
      text.textContent = project.name;
      svg.appendChild(text);
    }
  });

  // Y-axis line
  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", margin.left);
  yAxis.setAttribute("y1", margin.top);
  yAxis.setAttribute("x2", margin.left);
  yAxis.setAttribute("y2", height - margin.bottom);
  yAxis.setAttribute("stroke", "#94a3b8");
  yAxis.setAttribute("stroke-width", "1");
  svg.appendChild(yAxis);

  // X-axis line
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", margin.left);
  xAxis.setAttribute("y1", height - margin.bottom);
  xAxis.setAttribute("x2", width - margin.right);
  xAxis.setAttribute("y2", height - margin.bottom);
  xAxis.setAttribute("stroke", "#94a3b8");
  xAxis.setAttribute("stroke-width", "1");
  svg.appendChild(xAxis);

  container.appendChild(svg);
}

// Keep compatibility with old function name
export function renderSkillsChart(skills) {
  renderXPByProjectChart(skills);
}

// Helper Functions
function createDonutSegment(centerX, centerY, radius, innerRadius, startAngle, angleSize) {
  const endAngle = startAngle + angleSize;
  
  const x1 = centerX + Math.cos(startAngle - Math.PI / 2) * radius;
  const y1 = centerY + Math.sin(startAngle - Math.PI / 2) * radius;
  const x2 = centerX + Math.cos(endAngle - Math.PI / 2) * radius;
  const y2 = centerY + Math.sin(endAngle - Math.PI / 2) * radius;
  
  const x3 = centerX + Math.cos(endAngle - Math.PI / 2) * innerRadius;
  const y3 = centerY + Math.sin(endAngle - Math.PI / 2) * innerRadius;
  const x4 = centerX + Math.cos(startAngle - Math.PI / 2) * innerRadius;
  const y4 = centerY + Math.sin(startAngle - Math.PI / 2) * innerRadius;

  const largeArc = angleSize > Math.PI ? 1 : 0;

  const pathData = [
    `M ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
    'Z'
  ].join(' ');

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  return path;
}

function createPieSegment(centerX, centerY, radius, startAngle, angleSize) {
  const endAngle = startAngle + angleSize;
  
  const x1 = centerX + Math.cos(startAngle - Math.PI / 2) * radius;
  const y1 = centerY + Math.sin(startAngle - Math.PI / 2) * radius;
  const x2 = centerX + Math.cos(endAngle - Math.PI / 2) * radius;
  const y2 = centerY + Math.sin(endAngle - Math.PI / 2) * radius;

  const largeArc = angleSize > Math.PI ? 1 : 0;

  const pathData = [
    `M ${centerX} ${centerY}`,
    `L ${x1} ${y1}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
    'Z'
  ].join(' ');

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathData);
  return path;
}

function addAxes(svg, margin, chartWidth, chartHeight, maxXP, minDate, maxDate) {
  // Y-axis
  const yAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  yAxis.setAttribute("x1", margin.left);
  yAxis.setAttribute("y1", margin.top);
  yAxis.setAttribute("x2", margin.left);
  yAxis.setAttribute("y2", margin.top + chartHeight);
  yAxis.setAttribute("stroke", "#94a3b8");
  yAxis.setAttribute("stroke-width", "1");
  svg.appendChild(yAxis);

  // X-axis
  const xAxis = document.createElementNS("http://www.w3.org/2000/svg", "line");
  xAxis.setAttribute("x1", margin.left);
  xAxis.setAttribute("y1", margin.top + chartHeight);
  xAxis.setAttribute("x2", margin.left + chartWidth);
  xAxis.setAttribute("y2", margin.top + chartHeight);
  xAxis.setAttribute("stroke", "#94a3b8");
  xAxis.setAttribute("stroke-width", "1");
  svg.appendChild(xAxis);
}

// Simple tooltip functions
function showTooltip(event, text) {
  hideTooltip(); // Remove any existing tooltip
  
  const tooltip = document.createElement('div');
  tooltip.id = 'chart-tooltip';
  tooltip.style.cssText = `
    position: absolute;
    background: rgba(0,0,0,0.8);
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    font-size: 12px;
    pointer-events: none;
    z-index: 1000;
    left: ${event.pageX + 10}px;
    top: ${event.pageY - 30}px;
  `;
  tooltip.textContent = text;
  document.body.appendChild(tooltip);
}

function hideTooltip() {
  const tooltip = document.getElementById('chart-tooltip');
  if (tooltip) {
    tooltip.remove();
  }
}