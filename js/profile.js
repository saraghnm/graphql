import { graphqlRequest } from './graphql.js';
import { renderXPChart, renderAuditChart, renderPassFailChart, renderXPByProjectChart } from './graphs.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (window.history && window.history.pushState) {
    // Prevent back button navigation to login
    window.history.pushState('forward', null, window.location.href);
    window.addEventListener('popstate', function (event) {
      // Force logout and redirect to login
      localStorage.removeItem('jwt');
      window.location.replace('login.html'); // replace instead of assign prevents back navigation
    });
  }

  // Clear browser cache headers
  if (window.performance && window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD) {
    // Page was refreshed - check session validity
    const jwt = localStorage.getItem('jwt');
    if (!jwt) {
      window.location.replace('login.html');
      return;
    }

    // Optional: Verify token is still valid with a quick API call
    try {
      await graphqlRequest(`{ user { id } }`, jwt);
    } catch (error) {
      localStorage.removeItem('jwt');
      window.location.replace('login.html');
      return;
    }
  }
  // DOM Elements
  const elements = {
    userId: document.getElementById('user-id'),
    userLogin: document.getElementById('user-login'),
    xpAmount: document.getElementById('xp-amount'),
    auditRatio: document.getElementById('audit-ratio'),
    projectsCompleted: document.getElementById('projects-completed'),
    successRate: document.getElementById('success-rate'),
    logoutBtn: document.getElementById('logout-btn')
  };

  // Check authentication
  const jwt = localStorage.getItem('jwt');
  if (!jwt) {
    window.location.href = 'login.html';
    return;
  }

  // Logout handler
  elements.logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('jwt');
    window.location.href = 'login.html';
  });

  try {
    showLoadingState();

    // Step 1: Fetch basic user information
    const userData = await fetchUserData(jwt);
    displayUserInfo(userData, elements);

    // Step 2: Fetch XP data with timeline
    const xpData = await fetchXPData(jwt);
    displayXPInfo(xpData, elements);

    // Step 3: Fetch audit data
    const auditData = await fetchAuditData(jwt);
    displayAuditInfo(auditData, elements);

    // Step 4: Fetch project statistics
    const projectStats = await fetchProjectStats(jwt);
    displayProjectStats(projectStats, elements);

    // Step 5: Fetch XP by project for chart
    const xpByProject = await fetchXPByProject(jwt);

    // Render all SVG charts
    renderXPChart(xpData.timeline);
    renderAuditChart(auditData.upSum, auditData.downSum);
    renderPassFailChart(projectStats.passCount, projectStats.failCount);
    renderXPByProjectChart(xpByProject);


  } catch (err) {
    showError(`Failed to load profile data: ${err.message}`);

    // Try to redirect to login if it's an auth error
    if (err.message.includes('Unauthorized') || err.message.includes('Authentication')) {
      setTimeout(() => {
        localStorage.removeItem('jwt');
        window.location.href = 'login.html';
      }, 2000);
    }
  }
});

// Fetch basic user information (NORMAL QUERY)
async function fetchUserData(jwt) {
  const query = `
    {
      user {
        id
        login
        createdAt
        updatedAt
      }
    }
  `;

  const data = await graphqlRequest(query, jwt);

  const user = Array.isArray(data.user) ? data.user[0] : data.user;
  if (!user) throw new Error("No user found in API response");

  return user;
}

// Fetch XP data with timeline information (NESTED QUERY + ARGUMENTS)
async function fetchXPData(jwt) {
  const query = `
    {
      transaction(
        where: { type: { _eq: "xp" } }
        order_by: { createdAt: asc }
      ) {
        amount
        createdAt
        path
        object {
          name
          type
        }
      }
    }
  `;

  const data = await graphqlRequest(query, jwt);

  if (!data.transaction || data.transaction.length === 0) {
    return {
      total: 0,
      timeline: [],
      transactions: []
    };
  }

  // Calculate total XP
  const totalXP = data.transaction.reduce((sum, tx) => sum + tx.amount, 0);

  // Create timeline data for chart with proper date objects
  let cumulative = 0;
  const timeline = data.transaction.map(tx => {
    cumulative += tx.amount;
    return {
      date: new Date(tx.createdAt),
      amount: tx.amount,
      cumulative: cumulative,
      path: tx.path,
      projectName: tx.object?.name || extractProjectName(tx.path)
    };
  });


  return {
    total: totalXP,
    timeline: timeline,
    transactions: data.transaction
  };
}

// Fetch audit ratio data (AGGREGATE QUERY)
async function fetchAuditData(jwt) {
  const query = `
    {
      up: transaction_aggregate(where: { type: { _eq: "up" } }) {
        aggregate {
          count
          sum {
            amount
          }
        }
      }
      down: transaction_aggregate(where: { type: { _eq: "down" } }) {
        aggregate {
          count
          sum {
            amount
          }
        }
      }
    }
  `;

  const data = await graphqlRequest(query, jwt);

  const upCount = data.up.aggregate.count || 0;
  const downCount = data.down.aggregate.count || 0;
  const upSum = data.up.aggregate.sum?.amount || 0;
  const downSum = data.down.aggregate.sum?.amount || 0;

  const ratio = downSum === 0 ? (upSum > 0 ? Infinity : 0) : upSum / downSum;


  return {
    up: upCount,
    down: downCount,
    upSum: upSum,
    downSum: downSum,
    ratio: ratio
  };
}

// Fetch project statistics using progress table (NESTED QUERY WITH ARGUMENTS)
async function fetchProjectStats(jwt) {
  const query = `
    {
      progress(where: { isDone: { _eq: true } }) {
        id
        grade
        isDone
        path
        object {
          name
          type
        }
      }
    }
  `;

  const data = await graphqlRequest(query, jwt);

  if (!data.progress || data.progress.length === 0) {
    return {
      passCount: 0,
      failCount: 0,
      totalProjects: 0,
      successRate: 0
    };
  }

  // Count pass/fail based on grade
  let passCount = 0;
  let failCount = 0;

  data.progress.forEach(progress => {
    if (progress.grade === 1) {
      passCount++;
    } else if (progress.grade === 0) {
      failCount++;
    }
    // Note: Some entries might have null grades, we skip those
  });

  const totalProjects = passCount + failCount;
  const successRate = totalProjects > 0 ? (passCount / totalProjects) * 100 : 0;

  return {
    passCount,
    failCount,
    totalProjects,
    successRate
  };
}

// Fetch XP grouped by project for chart (COMPLEX NESTED QUERY)
async function fetchXPByProject(jwt) {
  const query = `
    {
      transaction(
        where: { type: { _eq: "xp" } }
        order_by: { amount: desc }
      ) {
        amount
        path
        object {
          name
          type
        }
      }
    }
  `;

  const data = await graphqlRequest(query, jwt);

  if (!data.transaction || data.transaction.length === 0) {
    return [];
  }

  // Group XP by project/object name
  const projectXPMap = new Map();

  data.transaction.forEach(tx => {
    let projectName = tx.object?.name || extractProjectName(tx.path);

    // Clean up project names
    if (projectName && projectName !== 'Unknown' && projectName.length > 0) {
      // Remove common prefixes/suffixes and limit length
      projectName = projectName.replace(/^(exercise-|project-)/i, '');
      if (projectName.length > 15) {
        projectName = projectName.substring(0, 12) + '...';
      }

      if (!projectXPMap.has(projectName)) {
        projectXPMap.set(projectName, 0);
      }
      projectXPMap.set(projectName, projectXPMap.get(projectName) + tx.amount);
    }
  });

  // Convert to array, sort by XP (descending), and take top 8
  const projectArray = Array.from(projectXPMap.entries())
    .map(([name, xp]) => ({ name, xp }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, 8); // Top 8 projects for better chart readability

  return projectArray;
}

// Helper function to extract project name from path
function extractProjectName(path) {
  if (!path || typeof path !== 'string') return 'Unknown';

  const parts = path.split('/');
  const lastPart = parts[parts.length - 1];

  // If last part is empty, try the second to last
  if (!lastPart || lastPart.length === 0) {
    return parts[parts.length - 2] || 'Unknown';
  }

  return lastPart;
}

// Display functions
function displayUserInfo(user, elements) {
  elements.userId.textContent = user.id;
  elements.userLogin.textContent = user.login;
}

function displayXPInfo(xpData, elements) {
  elements.xpAmount.textContent = `${xpData.total.toLocaleString()} XP`;
}

function displayAuditInfo(auditData, elements) {
  const ratioText = auditData.ratio === Infinity ? "∞" :
    auditData.ratio === 0 ? "0" :
      auditData.ratio.toFixed(2);
  elements.auditRatio.textContent = ratioText;
}

function displayProjectStats(stats, elements) {
  elements.projectsCompleted.textContent = `${stats.totalProjects} projects`;
  elements.successRate.textContent = `${stats.successRate.toFixed(1)}%`;
}

function showLoadingState() {
  const loadingElements = [
    'user-id', 'user-login', 'xp-amount',
    'audit-ratio', 'projects-completed', 'success-rate'
  ];

  loadingElements.forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = 'Loading...';
      element.style.color = '#94a3b8';
    }
  });
}

function showError(message) {
  // Remove any existing error
  const existingError = document.getElementById('error-display');
  if (existingError) {
    existingError.remove();
  }

  // Create error display
  const errorDiv = document.createElement('div');
  errorDiv.id = 'error-display';
  errorDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: white;
    padding: 15px 20px;
    border-radius: 12px;
    max-width: 400px;
    z-index: 1000;
    box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideIn 0.3s ease-out;
  `;

  // Add slide-in animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  document.head.appendChild(style);

  errorDiv.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 5px;">⚠️ Error</div>
    <div style="font-size: 0.9rem;">${message}</div>
  `;

  document.body.appendChild(errorDiv);

  // Auto hide after 8 seconds
  setTimeout(() => {
    if (errorDiv && errorDiv.parentNode) {
      errorDiv.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => errorDiv.remove(), 300);
    }
  }, 8000);
}