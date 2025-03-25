// dashboard.js
const API_BASE_URL = "69.62.101.81"; // Atualize para o endereço público da sua VPS

document.addEventListener("DOMContentLoaded", async function() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "login.html";
    return;
  }

  exibirUsuarioLogado();
  document.getElementById("defaultTab").click();
  await loadDashboardData();
  loadUsersData();
  loadLogs();
  loadHealthMetrics();
});

/***********************************************
 * 1. Sistema de Abas (Tabs)
 ***********************************************/
function openTab(evt, tabName) {
  const tabcontents = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontents.length; i++) {
    tabcontents[i].style.display = "none";
  }
  const tablinks = document.getElementsByClassName("tablink");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].classList.remove("active");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.classList.add("active");
}

/***********************************************
 * 2. Carregamento de Pedidos para o Dashboard
 ***********************************************/
async function loadDashboardData() {
  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE_URL}/api/pedidos`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }
    });
    if (!response.ok) {
      throw new Error("Erro ao carregar pedidos: " + response.status);
    }
    const pedidos = await response.json();
    const openPedidos = pedidos.filter(p => p.status !== "concluido");
    updateCards(openPedidos);
    renderOrdersTable(openPedidos);
    renderDailyChart(pedidos);
    renderWeeklyChart(pedidos);
    renderMonthlyChart(pedidos);
  } catch (error) {
    console.error("Erro ao carregar dados do dashboard:", error);
  }
}

/***********************************************
 * 3. Atualização dos Cards e Tabela de Pedidos
 ***********************************************/
function updateCards(openPedidos) {
  document.getElementById("totalOrders").innerText = openPedidos.length;
  const totalValue = openPedidos.reduce((acc, cur) => acc + Number(cur.valor || 0), 0);
  document.getElementById("totalValue").innerText = "R$ " + totalValue.toFixed(2);
  const today = new Date();
  const overdue = openPedidos.filter(p => {
    const parts = p.data.split("/");
    const deliveryDate = new Date(parts[2], parts[1] - 1, parts[0]);
    return deliveryDate < today;
  });
  document.getElementById("overdueOrders").innerText = overdue.length;
}

function renderOrdersTable(openPedidos) {
  const tbody = document.getElementById("ordersTable").querySelector("tbody");
  tbody.innerHTML = "";
  openPedidos.forEach(p => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.nome}</td>
      <td>${p.valor}</td>
      <td>${p.data}</td>
      <td>${p.status}</td>
    `;
    tbody.appendChild(row);
  });
}

/***********************************************
 * 4. Gráficos (Diário, Semanal, Mensal)
 ***********************************************/
function groupByDate(pedidos, formatter) {
  return pedidos.reduce((acc, p) => {
    const d = new Date(p.data);
    const key = formatter(d);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function renderDailyChart(pedidos) {
  const now = new Date();
  const past7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    past7Days.push(d);
  }
  const labels = past7Days.map(d => d.toLocaleDateString("pt-BR"));
  const recent = pedidos.filter(p => {
    const d = new Date(p.data);
    return d >= past7Days[0] && d <= now;
  });
  const grouped = groupByDate(recent, d => d.toLocaleDateString("pt-BR"));
  const data = labels.map(label => grouped[label] || 0);

  const ctx = document.getElementById("dailyChart").getContext("2d");
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Pedidos Diários",
        data: data,
        backgroundColor: "rgba(75, 192, 192, 0.6)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderWeeklyChart(pedidos) {
  const now = new Date();
  const labels = [];
  const counts = [];

  for (let i = 3; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() - (i * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const label = `${start.toLocaleDateString("pt-BR")} - ${end.toLocaleDateString("pt-BR")}`;
    labels.push(label);

    const count = pedidos.filter(p => {
      const d = new Date(p.data);
      return d >= start && d <= end;
    }).length;
    counts.push(count);
  }

  const ctx = document.getElementById("weeklyChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Pedidos Semanais",
        data: counts,
        backgroundColor: "rgba(153, 102, 255, 0.6)",
        fill: false,
        borderColor: "rgba(153, 102, 255, 1)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function renderMonthlyChart(pedidos) {
  const now = new Date();
  const labels = [];
  const counts = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    labels.push(label);

    const count = pedidos.filter(p => {
      const pd = new Date(p.data);
      return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
    }).length;
    counts.push(count);
  }

  const ctx = document.getElementById("monthlyChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Pedidos Mensais",
        data: counts,
        backgroundColor: "rgba(255, 159, 64, 0.6)",
        fill: false,
        borderColor: "rgba(255, 159, 64, 1)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

/***********************************************
 * 5. Logout e exibirUsuarioLogado
 ***********************************************/
function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

function exibirUsuarioLogado() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser) {
    const userInfoEl = document.getElementById("userInfo");
    if (userInfoEl) {
      userInfoEl.innerText = `Logado como: ${currentUser.username}`;
    }
  }
}

/***********************************************
 * 6. Gerenciamento de Usuários
 ***********************************************/
function loadUsersData() {
  const token = localStorage.getItem("token");
  fetch(`${API_BASE_URL}/api/users`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao buscar usuários: " + res.status);
    return res.json();
  })
  .then(users => {
    renderUsersTable(users);
  })
  .catch(err => console.error(err));
}

function renderUsersTable(users) {
  const container = document.getElementById("usersTable");
  if (!container) return;
  if (users.length === 0) {
    container.innerHTML = "<p>Nenhum usuário cadastrado.</p>";
    return;
  }
  let html = `<table>
    <tr>
      <th>Usuário</th>
      <th>Senha</th>
      <th>Role</th>
      <th>Ações</th>
    </tr>`;
  users.forEach(u => {
    html += `<tr>
      <td>${u.username}</td>
      <td>${u.password}</td>
      <td>${u.role}</td>
      <td>
        <button onclick="adminEditUser('${u._id}')">Editar</button>
        <button onclick="adminDeleteUser('${u._id}')">Excluir</button>
      </td>
    </tr>`;
  });
  html += `</table>`;
  container.innerHTML = html;
}

function addUser() {
  const username = document.getElementById("newUsername").value.toLowerCase().trim();
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;
  if (!username || !password) {
    alert("Preencha todos os campos.");
    return;
  }
  const token = localStorage.getItem("token");
  fetch(`${API_BASE_URL}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ username, password, role })
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao cadastrar usuário");
    return res.json();
  })
  .then(data => {
    alert("Usuário cadastrado com sucesso!");
    loadUsersData();
    document.getElementById("userForm").reset();
  })
  .catch(err => {
    console.error(err);
    alert("Erro ao cadastrar usuário.");
  });
}

function adminDeleteUser(userId) {
  if (!confirm("Deseja realmente excluir o usuário?")) return;
  const token = localStorage.getItem("token");
  fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "DELETE",
    headers: {
      "Authorization": "Bearer " + token
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao excluir usuário");
    return res.json();
  })
  .then(data => {
    alert("Usuário excluído com sucesso!");
    loadUsersData();
  })
  .catch(err => {
    console.error(err);
    alert("Erro ao excluir usuário.");
  });
}

function adminEditUser(userId) {
  const newPass = prompt("Nova senha:");
  if (newPass === null) return;
  const newRole = prompt("Novo setor (role):");
  if (newRole === null) return;
  const token = localStorage.getItem("token");
  fetch(`${API_BASE_URL}/api/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({ password: newPass, role: newRole })
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao atualizar usuário");
    return res.json();
  })
  .then(data => {
    alert("Usuário atualizado com sucesso!");
    loadUsersData();
  })
  .catch(err => {
    console.error(err);
    alert("Erro ao atualizar usuário.");
  });
}

/***********************************************
 * 7. Logs, Backup e Monitoramento
 ***********************************************/
function loadLogs() {
  const logs = JSON.parse(localStorage.getItem("systemLogs")) || [];
  const container = document.getElementById("logsContainer");
  if (!container) return;
  if (logs.length === 0) {
    container.innerHTML = "<p>Nenhum log disponível.</p>";
  } else {
    container.innerHTML = logs.map(log => `<p>${log}</p>`).join("");
  }
}

function realizarBackup() {
  const token = localStorage.getItem("token");
  fetch(`${API_BASE_URL}/api/backup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao realizar backup");
    return res.json();
  })
  .then(data => {
    alert("Backup realizado com sucesso! Caminho: " + data.backupPath);
    document.getElementById("backupStatus").innerText = `Último backup: ${new Date().toLocaleString()}`;
  })
  .catch(err => {
    console.error(err);
    alert("Erro ao realizar backup.");
  });
}

function loadHealthMetrics() {
  const token = localStorage.getItem("token");
  fetch(`${API_BASE_URL}/api/health`, {
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById("cpuUsage").innerText = data.loadAverage;
    document.getElementById("memoryUsage").innerText = data.memoryUsage;
  })
  .catch(err => {
    console.error(err);
  });
}

/***********************************************
 * 8. Renderização de Botões de Ação
 ***********************************************/
function renderActions() {
  const actionsDiv = document.getElementById("actions");
  if (!actionsDiv) return;
  actionsDiv.innerHTML = "";

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  if (currentUser.role === "admin") {
    const btnNovoPedido = document.createElement("button");
    btnNovoPedido.innerText = "Novo Pedido";
    btnNovoPedido.onclick = openOrderModal;
    actionsDiv.appendChild(btnNovoPedido);

    const btnNovoFornecedor = document.createElement("button");
    btnNovoFornecedor.innerText = "Cadastrar Fornecedor";
    btnNovoFornecedor.onclick = openSupplierModal;
    actionsDiv.appendChild(btnNovoFornecedor);

    const btnNovoUsuario = document.createElement("button");
    btnNovoUsuario.innerText = "Cadastrar Usuário";
    btnNovoUsuario.onclick = openUserModal;
    actionsDiv.appendChild(btnNovoUsuario);

    const btnGerenciarUsuarios = document.createElement("button");
    btnGerenciarUsuarios.innerText = "Gerenciar Usuários";
    btnGerenciarUsuarios.onclick = openManageUsersModal;
    actionsDiv.appendChild(btnGerenciarUsuarios);

    const btnEditarEtapas = document.createElement("button");
    btnEditarEtapas.innerText = "Editar Etapas";
    btnEditarEtapas.onclick = openEditModal;
    actionsDiv.appendChild(btnEditarEtapas);

    const btnDashboard = document.createElement("button");
    btnDashboard.innerText = "Dashboard";
    btnDashboard.onclick = () => {
      window.location.href = "dashboard.html";
    };
    actionsDiv.appendChild(btnDashboard);
  } else if (currentUser.role === "comprador") {
    const btnNovoPedido = document.createElement("button");
    btnNovoPedido.innerText = "Novo Pedido";
    btnNovoPedido.onclick = openOrderModal;
    actionsDiv.appendChild(btnNovoPedido);

    const btnNovoFornecedor = document.createElement("button");
    btnNovoFornecedor.innerText = "Cadastrar Fornecedor";
    btnNovoFornecedor.onclick = openSupplierModal;
    actionsDiv.appendChild(btnNovoFornecedor);
  }
}

/***********************************************
 * 9. Inicialização
 ***********************************************/
window.onload = async function() {
  exibirUsuarioLogado();
  await renderKanban();
  renderActions();
  hideBoardsForRole();
};
