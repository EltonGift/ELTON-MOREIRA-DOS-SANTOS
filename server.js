import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Aumentar limite para uploads de arquivos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de Log para Debug (Verificar se os pedidos chegam)
app.use((req, res, next) => {
  if (req.url.startsWith('/api')) {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
  }
  next();
});

// Configuração CORS Manual
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const PORT = process.env.PORT || 3001;
const buildPath = path.join(__dirname, 'dist');
const DB_FILE = path.join(__dirname, 'database.json');

// Dados padrão
const INITIAL_DATA = {
  users: [],
  cases: [],
  tribunals: [],
  fases: [],
  statuses: []
};

// Ler Banco de Dados
function readDatabase() {
  if (!fs.existsSync(DB_FILE)) {
    console.log("Criando novo banco de dados...");
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2));
    } catch (e) {
        console.error("Erro ao criar arquivo:", e);
        return INITIAL_DATA; // Retorna memória se falhar disco
    }
    return INITIAL_DATA;
  }

  try {
    const fileContent = fs.readFileSync(DB_FILE, 'utf8');
    if (!fileContent.trim()) return INITIAL_DATA;
    return JSON.parse(fileContent);
  } catch (err) {
    console.error("Banco de dados corrompido. Resetando.", err.message);
    return INITIAL_DATA;
  }
}

// --- ROTAS API (DEVEM VIR ANTES DOS ARQUIVOS ESTÁTICOS) ---

app.get('/api/db', (req, res) => {
  try {
    const data = readDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (error) {
    console.error("Erro no GET /api/db:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

app.post('/api/save', (req, res) => {
  try {
    const newData = req.body;
    if (!newData || typeof newData !== 'object') {
        return res.status(400).json({ error: "Dados inválidos" });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(newData, null, 2));
    res.json({ success: true });
  } catch (err) {
    console.error("Erro no POST /api/save:", err);
    res.status(500).json({ error: "Erro ao salvar no disco" });
  }
});

// Rota de Healthcheck
app.get('/api/status', (req, res) => {
    res.json({ status: 'online', port: PORT });
});

// --- ARQUIVOS ESTÁTICOS ---

// Serve os arquivos do build (React)
app.use(express.static(buildPath));

// Fallback para React Router (SPA)
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
  } else {
      res.status(404).send(`
        <html>
            <head><title>Backend Ativo</title></head>
            <body style="font-family: sans-serif; padding: 20px;">
                <h1>Backend Rodando na porta ${PORT}</h1>
                <p>O servidor API está funcionando.</p>
                <hr/>
                <p><strong>Aviso:</strong> A interface (Frontend) não foi encontrada na pasta 'dist'.</p>
                <p>Execute <code>npm run build</code> e reinicie o servidor.</p>
            </body>
        </html>
      `);
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(`🚀 SERVIDOR INICIADO`);
  console.log(`📡 Porta: ${PORT}`);
  console.log(`💾 Banco: ${DB_FILE}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`==================================================\n`);
});