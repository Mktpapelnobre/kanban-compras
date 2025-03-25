/***********************************************
 * script.js - Kanban Nobre Distribuidora
 ***********************************************/
const API_BASE_URL = "69.62.101.81"; // Atualize para o endereço público da sua VPS

function loadStageNames() {
  const stored = JSON.parse(localStorage.getItem("stageNames")) || {
    inicio: "Início de Pedido",
    aprovacao: "Aguardando Aprovação",
    revisao: "Revisão",
    receber: "Recebimento de Mercadoria",
    conferir: "Conferência de Mercadoria",
    entrada: "Entrada de Mercadorias",
    envio: "Envio para o Comercial"
  };

  document.querySelectorAll(".stage-title").forEach(el => {
    const stageId = el.getAttribute("data-stage");
    if (stored[stageId]) {
      el.textContent = stored[stageId];
    }
  });
  
  localStorage.setItem("stageNames", JSON.stringify(stored));
}

function openEditModal() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== "admin") {
    alert("Você não tem permissão para editar as etapas.");
    return;
  }
  const stored = JSON.parse(localStorage.getItem("stageNames")) || {};
  const body = document.getElementById("editModalBody");
  body.innerHTML = "";

  Object.keys(stored).forEach(stageId => {
    const label = document.createElement("label");
    label.innerText = stageId + ": ";

    const input = document.createElement("input");
    input.type = "text";
    input.value = stored[stageId];
    input.setAttribute("data-stage-id", stageId);

    const div = document.createElement("div");
    div.style.margin = "0.5rem 0";

    div.appendChild(label);
    div.appendChild(input);
    body.appendChild(div);
  });
  document.getElementById("editModal").style.display = "block";
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
}

function saveEditedSteps() {
  const inputs = document.querySelectorAll("#editModalBody input");
  let newValues = {};
  inputs.forEach(inp => {
    const stageId = inp.getAttribute("data-stage-id");
    newValues[stageId] = inp.value.trim() || stageId;
  });
  localStorage.setItem("stageNames", JSON.stringify(newValues));
  loadStageNames();
  alert("Etapas salvas!");
  closeEditModal();
}

/***********************************************
 * Ocultar Boards conforme Role
 ***********************************************/
function hideBoardsForRole() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;
  
  const boards = {
    comprador: document.getElementById("board_comprador"),
    estoque: document.getElementById("board_estoque"),
    compras: document.getElementById("board_compras"),
    estoqueFinal: document.getElementById("board_estoqueFinal")
  };

  Object.values(boards).forEach(board => {
    if (board) board.style.display = "none";
  });

  if (currentUser.role === "comprador") {
    if (boards.comprador) boards.comprador.style.display = "block";
  } else if (currentUser.role === "estoque") {
    if (boards.estoque) boards.estoque.style.display = "block";
    if (boards.estoqueFinal) boards.estoqueFinal.style.display = "block";
  } else if (currentUser.role === "compras") {
    if (boards.compras) boards.compras.style.display = "block";
  } else if (currentUser.role === "admin") {
    Object.values(boards).forEach(board => {
      if (board) board.style.display = "block";
    });
  }
}

const allowedColumnsMapping = {
  "comprador": ["inicio", "aprovacao", "revisao"],
  "estoque": ["conferir", "entrada"],
  "compras": ["entrada", "envio"],
  "admin": ["inicio", "aprovacao", "revisao", "receber", "conferir", "entrada", "envio"]
};

let currentEditCardId = "";

/***********************************************
 * 1. Logout, exibir usuário, dark mode
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

function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");
}

/***********************************************
 * 2. Notificações Internas
 ***********************************************/
function addNotification(message, roles = []) {
  roles.forEach(r => {
    const key = `notifications_${r}`;
    let arr = JSON.parse(localStorage.getItem(key)) || [];
    arr.push(message);
    localStorage.setItem(key, JSON.stringify(arr));
  });
}

function getNotificationsForCurrentUser() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return [];
  const key = `notifications_${currentUser.role}`;
  return JSON.parse(localStorage.getItem(key)) || [];
}

function clearNotificationsForCurrentUser() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;
  const key = `notifications_${currentUser.role}`;
  localStorage.setItem(key, JSON.stringify([]));
}

function updateNotificationBadge() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;
  const notifications = getNotificationsForCurrentUser();
  const badge = document.getElementById("notificationBadge");
  if (badge) badge.innerText = notifications.length;
}

function openNotificationModal() {
  document.getElementById("notificationModal").style.display = "block";
  renderNotifications();
  clearNotificationsForCurrentUser();
  updateNotificationBadge();
}

function closeNotificationModal() {
  document.getElementById("notificationModal").style.display = "none";
}

function renderNotifications() {
  const notifications = getNotificationsForCurrentUser();
  const container = document.getElementById("notificationList");
  container.innerHTML = notifications.length === 0
    ? "<p>Nenhuma notificação.</p>"
    : notifications.map(n => `<p>${n}</p>`).join("");
}

/***********************************************
 * 3. Verificação de Atrasos
 ***********************************************/
function verificarAtrasos() {
  const cards = document.querySelectorAll(".kanban-item");
  const now = new Date();
  cards.forEach(card => {
    const dataStr = card.getAttribute("data-data");
    if (dataStr) {
      const parts = dataStr.split("/");
      const deadline = new Date(parts[2], parts[1] - 1, parts[0]);
      if (now > deadline) card.classList.add("overdue");
      else card.classList.remove("overdue");
    }
  });
}

/***********************************************
 * 4. Drag & Drop
 ***********************************************/
function allowDrop(e) {
  e.preventDefault();
}

function drag(e) {
  e.dataTransfer.setData("text/plain", e.target.id);
}

async function drop(e) {
  e.preventDefault();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    alert("Usuário não autenticado!");
    return;
  }
  const allowed = allowedColumnsMapping[currentUser.role] || [];
  const cardId = e.dataTransfer.getData("text/plain");
  const cardEl = document.getElementById(cardId);

  let dropzone = e.target;
  while (dropzone && !dropzone.classList.contains("task-list") && dropzone !== document.body) {
    dropzone = dropzone.parentElement;
  }
  if (dropzone && dropzone.classList.contains("task-list")) {
    const columnId = dropzone.parentElement.id;
    if (!allowed.includes(columnId)) {
      alert("Você não tem permissão para mover manualmente para esta coluna.");
      return;
    }
    dropzone.appendChild(cardEl);
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API_BASE_URL}/api/pedidos/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },
        body: JSON.stringify({ status: columnId })
      });
      alert("Pedido movido com sucesso.");
      verificarAtrasos();
      renderKanban();
    } catch (err) {
      console.error(err);
      alert("Erro ao mover pedido.");
    }
  }
}

/***********************************************
 * 5. Criação, Edição, Exclusão e Renderização de Pedidos
 ***********************************************/
async function loadPedidos() {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/api/pedidos`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }
    });
    if (!res.ok) throw new Error("Erro ao carregar pedidos: " + res.status);
    const pedidos = await res.json();
    return pedidos;
  } catch (err) {
    console.error("Erro ao carregar pedidos:", err);
    return [];
  }
}

async function renderKanban() {
  exibirUsuarioLogado();
  loadStageNames();
  const pedidos = await loadPedidos();

  ["inicio", "aprovacao", "revisao", "receber", "conferir", "entrada", "envio"].forEach(id => {
    const col = document.getElementById(id);
    if (col) {
      const tl = col.querySelector(".task-list");
      if (tl) tl.innerHTML = "";
    }
  });

  pedidos.forEach(p => {
    if (p.status !== "concluido") renderPedido(p);
  });
  updateNotificationBadge();
  verificarAtrasos();
}

function renderPedido(pedido) {
  const col = document.getElementById(pedido.status);
  if (!col) return;
  const taskList = col.querySelector(".task-list");
  const card = document.createElement("div");
  card.className = "kanban-item";
  card.id = pedido._id;
  card.draggable = true;
  card.ondragstart = drag;

  const formattedDate = new Date(pedido.data).toLocaleDateString("pt-BR");
  card.setAttribute("data-nome", pedido.nome);
  card.setAttribute("data-valor", pedido.valor);
  card.setAttribute("data-data", formattedDate);
  
  let fornecedorValue = "";
  let fornecedorDisplay = "Sem Fornecedor";
  if (pedido.fornecedor) {
    if (typeof pedido.fornecedor === "object") {
      fornecedorValue = pedido.fornecedor._id;
      fornecedorDisplay = pedido.fornecedor.nome || "Sem Fornecedor";
    } else {
      fornecedorValue = pedido.fornecedor;
      fornecedorDisplay = pedido.fornecedor;
    }
  }
  card.setAttribute("data-fornecedor", fornecedorValue);

  card.innerHTML = `
    Nome: ${pedido.nome}<br>
    Valor: ${pedido.valor || ""}<br>
    Data: ${formattedDate}<br>
    Fornecedor: ${fornecedorDisplay}
  `;

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) return;

  if (["comprador", "admin"].includes(currentUser.role)) {
    const editBtn = document.createElement("button");
    editBtn.innerText = "Editar Pedido";
    editBtn.className = "btn-edit";
    editBtn.onclick = e => {
      e.stopPropagation();
      editarPedido(pedido._id);
    };
    card.appendChild(editBtn);

    const delBtn = document.createElement("button");
    delBtn.innerText = "Excluir Pedido";
    delBtn.className = "btn-delete";
    delBtn.onclick = e => {
      e.stopPropagation();
      excluirPedido(pedido._id);
    };
    card.appendChild(delBtn);
  }

  if (pedido.status === "revisao" && ["comprador", "admin"].includes(currentUser.role)) {
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Passar para Recebimento";
    nextBtn.className = "btn-next";
    nextBtn.onclick = e => {
      e.stopPropagation();
      moverPara(pedido._id, "receber");
    };
    card.appendChild(nextBtn);
  }
  if (pedido.status === "receber" && ["estoque", "admin"].includes(currentUser.role)) {
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Passar para Conferência";
    nextBtn.className = "btn-next";
    nextBtn.onclick = e => {
      e.stopPropagation();
      moverPara(pedido._id, "conferir");
    };
    card.appendChild(nextBtn);
  }
  if (pedido.status === "conferir" && ["estoque", "admin"].includes(currentUser.role)) {
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Mandar para Compras";
    nextBtn.className = "btn-next";
    nextBtn.onclick = e => {
      e.stopPropagation();
      moverPara(pedido._id, "entrada");
    };
    card.appendChild(nextBtn);
  }
  if (pedido.status === "entrada" && ["compras", "admin"].includes(currentUser.role)) {
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Passar para Envio para o Comercial";
    nextBtn.className = "btn-next";
    nextBtn.onclick = e => {
      e.stopPropagation();
      moverPara(pedido._id, "envio");
    };
    card.appendChild(nextBtn);
  }
  if (pedido.status === "envio" && ["estoque", "admin"].includes(currentUser.role)) {
    const nextBtn = document.createElement("button");
    nextBtn.innerText = "Concluir Pedido";
    nextBtn.className = "btn-next";
    nextBtn.onclick = e => {
      e.stopPropagation();
      concluirPedido(pedido._id, pedido.nome);
    };
    card.appendChild(nextBtn);
  }

  taskList.appendChild(card);
}

async function moverPara(cardId, novoStatus) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/api/pedidos/${cardId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ status: novoStatus })
    });
    if (res.ok) {
      alert("Pedido movido com sucesso.");
      renderKanban();
    } else {
      alert("Erro ao mover pedido.");
    }
  } catch (err) {
    console.error(err);
    alert("Erro de conexão com o servidor.");
  }
}

async function concluirPedido(cardId, nomePedido) {
  try {
    const token = localStorage.getItem("token");
    const res = await fetch(`${API_BASE_URL}/api/pedidos/${cardId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ status: "concluido" })
    });
    if (res.ok) {
      alert("Pedido concluído!");
      addNotification(`O pedido "${nomePedido}" foi concluído!`, ["comprador", "admin"]);
      renderKanban();
    } else {
      alert("Erro ao concluir pedido.");
    }
  } catch (err) {
    console.error(err);
    alert("Erro de conexão com o servidor.");
  }
}

/***********************************************
 * 6. Modais de Novo Pedido, Fornecedor, etc.
 ***********************************************/
async function openOrderModal() {
  const select = document.getElementById("orderFornecedor");
  select.innerHTML = "";
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      }
    });
    if (!response.ok) throw new Error("Erro ao buscar fornecedores");
    const suppliers = await response.json();
    if (suppliers.length === 0) {
      select.innerHTML = "<option value=''>Nenhum fornecedor cadastrado</option>";
    } else {
      suppliers.forEach(supplier => {
        const opt = document.createElement("option");
        opt.value = supplier._id;
        opt.text = supplier.nome + (supplier.rep ? " (" + supplier.rep + ")" : "");
        select.appendChild(opt);
      });
    }
  } catch (err) {
    console.error(err);
    select.innerHTML = "<option value=''>Erro ao carregar fornecedores</option>";
  }
  document.getElementById("orderModal").style.display = "block";
}

function closeOrderModal() {
  document.getElementById("orderModal").style.display = "none";
  document.getElementById("orderNome").value = "";
  document.getElementById("orderValor").value = "";
  document.getElementById("orderData").value = "";
  document.getElementById("orderFornecedor").innerHTML = "";
}

function openSupplierModal() {
  document.getElementById("supplierModal").style.display = "block";
}

function closeSupplierModal() {
  document.getElementById("supplierModal").style.display = "none";
  document.getElementById("supplierNome").value = "";
  document.getElementById("supplierWhats").value = "";
  document.getElementById("supplierRep").value = "";
}

async function cadastrarFornecedor() {
  const nome = document.getElementById("supplierNome").value.trim();
  const whats = document.getElementById("supplierWhats").value.trim();
  const rep = document.getElementById("supplierRep").value.trim();
  if (!nome) {
    alert("Preencha o nome do fornecedor.");
    return;
  }
  const token = localStorage.getItem("token");
  try {
    const response = await fetch(`${API_BASE_URL}/api/suppliers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({ nome, whats, rep })
    });
    if (!response.ok) throw new Error("Erro ao cadastrar fornecedor");
    await response.json();
    alert("Fornecedor cadastrado com sucesso!");
    closeSupplierModal();
  } catch (err) {
    console.error(err);
    alert("Erro ao cadastrar fornecedor.");
  }
}

/***********************************************
 * 7. Cadastro de Usuário e Painel Admin
 ***********************************************/
function openUserModal() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== "admin") {
    alert("Você não tem permissão para cadastrar novos usuários.");
    return;
  }
  document.getElementById("userModal").style.display = "block";
}

function closeUserModal() {
  document.getElementById("userModal").style.display = "none";
  document.getElementById("modalUsername").value = "";
  document.getElementById("modalPassword").value = "";
}

function adminRegister() {
  const modalUsername = document.getElementById("modalUsername").value.toLowerCase().trim();
  const modalPassword = document.getElementById("modalPassword").value;
  const modalRole = document.getElementById("modalRole").value;
  if (!modalUsername || !modalPassword) {
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
    body: JSON.stringify({ username: modalUsername, password: modalPassword, role: modalRole })
  })
  .then(res => {
    if (!res.ok) throw new Error("Erro ao cadastrar usuário");
    return res.json();
  })
  .then(data => {
    alert("Novo usuário cadastrado com sucesso!");
    closeUserModal();
    loadUsersData();
  })
  .catch(err => {
    console.error(err);
    alert("Erro ao cadastrar usuário.");
  });
}

function openManageUsersModal() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser || currentUser.role !== "admin") {
    alert("Você não tem permissão para gerenciar usuários.");
    return;
  }
  document.getElementById("manageUsersModal").style.display = "block";
  loadUsersData();
}

function closeManageUsersModal() {
  document.getElementById("manageUsersModal").style.display = "none";
}

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
 * 8. Alterar Senha (usuário comum)
 ***********************************************/
function openChangePasswordModal() {
  document.getElementById("changePasswordModal").style.display = "block";
}

function closeChangePasswordModal() {
  document.getElementById("changePasswordModal").style.display = "none";
  document.getElementById("oldPassword").value = "";
  document.getElementById("newPassword").value = "";
  document.getElementById("confirmNewPassword").value = "";
}

function changePassword() {
  const oldPass = document.getElementById("oldPassword").value;
  const newPass = document.getElementById("newPassword").value;
  const confirmNewPass = document.getElementById("confirmNewPassword").value;
  if (!oldPass || !newPass || !confirmNewPass) {
    alert("Preencha todos os campos.");
    return;
  }
  if (newPass !== confirmNewPass) {
    alert("As senhas não conferem.");
    return;
  }
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (!currentUser) {
    alert("Usuário não autenticado.");
    return;
  }
  if (oldPass !== currentUser.password) {
    alert("Senha atual incorreta.");
    return;
  }
  currentUser.password = newPass;
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  alert("Senha alterada com sucesso!");
  closeChangePasswordModal();
}

/***********************************************
 * 9. Renderização de Botões de Ação
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
 * 10. Inicialização
 ***********************************************/
window.onload = async function() {
  exibirUsuarioLogado();
  await renderKanban();
  renderActions();
  hideBoardsForRole();
};
