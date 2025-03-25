require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const os = require('os');
const { exec } = require('child_process');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const PORT = process.env.PORT || 3000;

// Conexão com MongoDB (certifique-se de que o MongoDB esteja instalado na VPS)
mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost/kanban_nobre', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("Conectado ao MongoDB"))
.catch(err => console.error("Erro na conexão com o MongoDB:", err));

/* --- Modelo de Usuário --- */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

// Cria usuário admin se não existir
User.findOne({ username: "admin" }).then(user => {
  if (!user) {
    const admin = new User({ username: "admin", password: "admin", role: "admin" });
    admin.save().then(() => console.log("Usuário admin criado"))
      .catch(err => console.error("Erro ao criar usuário admin:", err));
  }
});

/* --- Modelo de Fornecedor --- */
const supplierSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  whats: String,
  rep: String
});
const Supplier = mongoose.model("Supplier", supplierSchema);

/* --- Modelo de Pedido --- */
const pedidoSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  valor: String,
  data: String,         // "dd/mm/aaaa"
  fornecedor: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  status: String
});
const Pedido = mongoose.model('Pedido', pedidoSchema);

/* --- Rota de Login --- */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const token = jwt.sign({ username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

/* --- Middleware de Autenticação JWT --- */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.sendStatus(401);
  const token = authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

/* --- Rotas de Pedidos --- */
app.get('/api/pedidos', authenticateToken, async (req, res) => {
  try {
    const pedidos = await Pedido.find({}).populate('fornecedor');
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
});

app.post('/api/pedidos', authenticateToken, async (req, res) => {
  try {
    const pedido = new Pedido(req.body);
    await pedido.save();
    res.status(201).json(pedido);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

app.put('/api/pedidos/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Pedido.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('fornecedor');
    if (!updated) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar pedido' });
  }
});

app.delete('/api/pedidos/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Pedido.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json({ message: 'Pedido excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir pedido' });
  }
});

/* --- Rotas de Usuários --- */
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const user = new User({ username: username.toLowerCase(), password, role });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.put('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

/* --- Rotas de Fornecedores --- */
app.get('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar fornecedores' });
  }
});

app.post('/api/suppliers', authenticateToken, async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao criar fornecedor' });
  }
});

app.put('/api/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar fornecedor' });
  }
});

app.delete('/api/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await Supplier.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Fornecedor não encontrado' });
    res.json({ message: 'Fornecedor excluído' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao excluir fornecedor' });
  }
});

/* --- Nova Rota: Pedidos Concluídos --- */
app.get('/api/pedidos/concluidos', authenticateToken, async (req, res) => {
  try {
    const pedidosConcluidos = await Pedido.find({ status: "concluido" }).populate("fornecedor");
    res.json(pedidosConcluidos);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedidos concluídos" });
  }
});

/* --- Nova Rota: Pedidos por Fornecedor (agrupados) --- */
app.get('/api/pedidos/por-fornecedor', authenticateToken, async (req, res) => {
  try {
    const pedidosConcluidos = await Pedido.find({ status: "concluido" }).populate("fornecedor");
    const grouped = {};
    pedidosConcluidos.forEach(order => {
      const supplierName = (order.fornecedor && order.fornecedor.nome) ? order.fornecedor.nome : "Sem Fornecedor";
      if (!grouped[supplierName]) {
        grouped[supplierName] = [];
      }
      grouped[supplierName].push(order);
    });
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar pedidos por fornecedor" });
  }
});

/* --- Rota para Monitoramento da VPS (CPU e memória) --- */
app.get('/api/health', authenticateToken, (req, res) => {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const memoryUsage = (((totalMem - freeMem) / totalMem) * 100).toFixed(2);
  const loadAvg = os.loadavg()[0].toFixed(2);
  res.json({
    memoryUsage,
    loadAverage: loadAvg
  });
});

/* --- Rota para Backup Real do Banco de Dados --- */
app.post('/api/backup', authenticateToken, (req, res) => {
  // Defina um diretório de backup acessível na VPS
  const backupPath = `/backup/kanban_nobre_${Date.now()}`;
  exec(`mongodump --db kanban_nobre --out ${backupPath}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backup error: ${error}`);
      return res.status(500).json({ error: 'Erro ao realizar backup' });
    }
    res.json({ message: 'Backup realizado com sucesso', backupPath });
  });
});

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
