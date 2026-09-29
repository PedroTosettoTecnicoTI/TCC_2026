/* ════════════════════════════════════════
   STATE
════════════════════════════════════════ */
let alunos    = JSON.parse(localStorage.getItem('ea_alunos')   || '[]');
let users     = JSON.parse(localStorage.getItem('ea_users')    || 'null');
let appTheme  = localStorage.getItem('ea_theme') || 'light';
let currentUser = null;
let deleteIdx   = null;
let editUserIdx = null;
let delUserIdx  = null;
let editIdx     = null;
let docsAlunoIdx = null;
let currentDocData = null;

/* ════════════════════════════════════════
   PERMISSÕES
════════════════════════════════════════ */
function isAdmin() {
  return currentUser && currentUser.role === 'admin';
}

function isLoggedIn() {
  return currentUser !== null;
}

function canModify() {
  return isLoggedIn() && isAdmin();
}

function canView() {
  return isLoggedIn();
}

function requireAdmin() {
  if (!canModify()) {
    toast('Acesso negado! Apenas administradores podem realizar esta ação.', 'error');
    return false;
  }
  return true;
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
if (!users || users.length === 0) {
  users = [
    { username: 'admin', password: 'admin', role: 'admin' },
    { username: 'user', password: '1234', role: 'user' }
  ];
  saveUsers();
}

function saveAlunos() { localStorage.setItem('ea_alunos', JSON.stringify(alunos)); }
function saveUsers()  { localStorage.setItem('ea_users',  JSON.stringify(users));  }
function saveTheme()  { localStorage.setItem('ea_theme',  appTheme); }

/* ════════════════════════════════════════
   THEME
════════════════════════════════════════ */
function applyTheme(t) {
  appTheme = t;
  document.documentElement.setAttribute('data-theme', t);
  const btnLight = document.getElementById('btn-light');
  const btnDark = document.getElementById('btn-dark');
  if (btnLight) btnLight.classList.toggle('active', t === 'light');
  if (btnDark) btnDark.classList.toggle('active', t === 'dark');
  saveTheme();
}

function setTheme(t) { applyTheme(t); }

/* ════════════════════════════════════════
   NAVIGATION
════════════════════════════════════════ */
function goTo(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(id);
  if (screen) screen.classList.add('active');
  
  if (id === 'screen-dashboard') {
    renderDash();
    const exportBtns = document.querySelectorAll('.btn-export-csv, .btn-export-pdf');
    exportBtns.forEach(btn => {
      btn.style.display = canModify() ? 'inline-flex' : 'none';
    });
  }
  
  if (id === 'screen-home') {
    const btnDash = document.getElementById('btn-dash');
    if (btnDash) btnDash.style.display = alunos.length > 0 ? 'block' : 'none';
    
    // Botão cadastrar - só admin
    const cadastrarBtn = document.querySelector('#screen-home .btn-group .btn:first-child');
    if (cadastrarBtn) {
      cadastrarBtn.textContent = canModify() ? 'Cadastrar' : '🔒 Cadastrar (admin)';
      cadastrarBtn.style.opacity = canModify() ? '1' : '0.6';
      cadastrarBtn.style.cursor = canModify() ? 'pointer' : 'not-allowed';
    }
  }
}

/* ════════════════════════════════════════
   LOGIN / LOGOUT
════════════════════════════════════════ */
function doLogin() {
  const u = document.getElementById('inp-user').value.trim();
  const p = document.getElementById('inp-pass').value.trim();
  
  if (!u || !p) { 
    toast('Preencha usuário e senha!', 'error'); 
    return; 
  }
  
  const found = users.find(x => x.username === u && x.password === p);
  
  if (!found) { 
    toast('Usuário ou senha incorretos!', 'error'); 
    return; 
  }
  
  currentUser = found;
  
  // Salvar sessão
  localStorage.setItem('ea_current_user', JSON.stringify(found));
  
  // Registrar último login
  found.lastLogin = new Date().toISOString();
  saveUsers();
  
  // Atualizar interface
  const topbarUser = document.getElementById('topbar-user');
  if (topbarUser) topbarUser.textContent = found.username;
  
  toast(`Bem-vindo, ${found.username}! ✅`);
  
  document.getElementById('inp-user').value = '';
  document.getElementById('inp-pass').value = '';
  
  goTo('screen-home');
}

function logout() {
  localStorage.removeItem('ea_current_user');
  currentUser = null;
  document.getElementById('inp-user').value = '';
  document.getElementById('inp-pass').value = '';
  closeSettings();
  goTo('screen-login');
  toast('Desconectado.');
}

// Tecla Enter no login
document.addEventListener('DOMContentLoaded', function() {
  const passInput = document.getElementById('inp-pass');
  if (passInput) {
    passInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
  }
  
  // Restaurar sessão
  const savedUser = localStorage.getItem('ea_current_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      const found = users.find(u => u.username === user.username);
      if (found && found.password === user.password) {
        currentUser = found;
        goTo('screen-home');
        toast(`Bem-vindo de volta, ${found.username}!`);
      } else {
        localStorage.removeItem('ea_current_user');
      }
    } catch(e) {
      localStorage.removeItem('ea_current_user');
    }
  }
});

/* ════════════════════════════════════════
   SETTINGS PANEL
════════════════════════════════════════ */
function openSettings() {
  const section = document.getElementById('section-usuarios');
  if (section) {
    section.style.display = (currentUser && currentUser.role === 'admin') ? 'block' : 'none';
  }
  renderUsersList();
  const panel = document.getElementById('settings-panel');
  const backdrop = document.getElementById('settings-backdrop');
  if (panel) panel.classList.add('open');
  if (backdrop) backdrop.style.display = 'block';
}

function closeSettings() {
  const panel = document.getElementById('settings-panel');
  const backdrop = document.getElementById('settings-backdrop');
  if (panel) panel.classList.remove('open');
  if (backdrop) backdrop.style.display = 'none';
}

/* ════════════════════════════════════════
   USERS LIST
════════════════════════════════════════ */
function renderUsersList() {
  const list = document.getElementById('users-list');
  if (!list) return;
  list.innerHTML = '';
  
  users.forEach((u, i) => {
    const row = document.createElement('div');
    row.className = 'user-row';
    const isSelf = currentUser && u.username === currentUser.username;
    const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('pt-BR') : 'nunca';
    
    row.innerHTML = `
      <div class="user-row-info">
        <span class="user-row-name">👤 ${u.username} ${isSelf ? '<em style="font-size:.75rem;color:var(--green)">(você)</em>' : ''}</span>
        <span class="user-row-role">
          <span class="badge ${u.role==='admin'?'badge-admin':'badge-user'}">${u.role}</span>
          <span style="margin-left:0.5rem;font-size:0.7rem;color:var(--muted)">último acesso: ${lastLogin}</span>
        </span>
      </div>
      <div class="user-row-actions">
        <button class="icon-btn" onclick="openEditUser(${i})" title="Editar">✏️</button>
        ${!isSelf ? `<button class="icon-btn del" onclick="askDelUser(${i})" title="Excluir">🗑️</button>` : ''}
      </div>`;
    list.appendChild(row);
  });
}

/* ── ADD USER ── */
function openAddUser() {
  editUserIdx = null;
  document.getElementById('modal-user-title').textContent = 'Adicionar Usuário';
  document.getElementById('nu-username').value = '';
  document.getElementById('nu-pass').value = '';
  document.getElementById('nu-pass2').value = '';
  document.getElementById('nu-role').value = 'user';
  document.getElementById('nu-pass').placeholder = 'Mínimo 4 caracteres';
  document.getElementById('nu-pass2-wrap').style.display = 'block';
  document.getElementById('nu-username').disabled = false;
  openModal('modal-user');
}

function openEditUser(i) {
  editUserIdx = i;
  const u = users[i];
  document.getElementById('modal-user-title').textContent = 'Editar Usuário';
  document.getElementById('nu-username').value = u.username;
  document.getElementById('nu-username').disabled = true;
  document.getElementById('nu-pass').value = '';
  document.getElementById('nu-pass2').value = '';
  document.getElementById('nu-pass').placeholder = 'Deixe em branco para não alterar';
  document.getElementById('nu-pass2-wrap').style.display = 'block';
  document.getElementById('nu-role').value = u.role;
  openModal('modal-user');
}

function saveUser() {
  const username = document.getElementById('nu-username').value.trim();
  const pass     = document.getElementById('nu-pass').value.trim();
  const pass2    = document.getElementById('nu-pass2').value.trim();
  const role     = document.getElementById('nu-role').value;

  if (editUserIdx === null) {
    if (!username) { toast('Informe o nome de usuário!', 'error'); return; }
    if (users.find(u => u.username === username)) { toast('Usuário já existe!', 'error'); return; }
    if (!pass || pass.length < 4) { toast('Senha deve ter mínimo 4 caracteres!', 'error'); return; }
    if (pass !== pass2) { toast('Senhas não coincidem!', 'error'); return; }
    users.push({ username, password: pass, role });
    toast('Usuário criado! ✅');
  } else {
    const u = users[editUserIdx];
    if (pass) {
      if (pass.length < 4) { toast('Senha deve ter mínimo 4 caracteres!', 'error'); return; }
      if (pass !== pass2) { toast('Senhas não coincidem!', 'error'); return; }
      u.password = pass;
    }
    u.role = role;
    if (currentUser && currentUser.username === u.username) {
      currentUser.role = role;
      if (pass) currentUser.password = pass;
    }
    toast('Usuário atualizado! ✅');
  }
  saveUsers();
  closeModal('modal-user');
  renderUsersList();
}

function askDelUser(i) {
  delUserIdx = i;
  document.getElementById('del-user-msg').textContent = `Excluir "${users[i].username}"? Esta ação não pode ser desfeita.`;
  openModal('modal-del-user');
}

function confirmDelUser() {
  if (delUserIdx === null) return;
  users.splice(delUserIdx, 1);
  saveUsers();
  closeModal('modal-del-user');
  renderUsersList();
  toast('Usuário removido.');
  delUserIdx = null;
}

/* ════════════════════════════════════════
   CPF MASK
════════════════════════════════════════ */
function maskCPF(v) {
  v = v.replace(/\D/g,'').slice(0,11);
  if(v.length>9) v=v.replace(/(\d{3})(\d{3})(\d{3})(\d)/,'$1.$2.$3-$4');
  else if(v.length>6) v=v.replace(/(\d{3})(\d{3})(\d)/,'$1.$2.$3');
  else if(v.length>3) v=v.replace(/(\d{3})(\d)/,'$1.$2');
  return v;
}

document.addEventListener('DOMContentLoaded', function() {
  ['c-cpf','f-cpf','e-cpf'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', function(){ this.value = maskCPF(this.value); });
  });
});

/* ════════════════════════════════════════
   VALIDAÇÃO DE CPF
════════════════════════════════════════ */
function validarCPF(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digito1 = resto > 9 ? 0 : resto;
  
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digito2 = resto > 9 ? 0 : resto;
  
  return cpf.charAt(9) == digito1 && cpf.charAt(10) == digito2;
}

/* ════════════════════════════════════════
   MÁSCARA DE TELEFONE
════════════════════════════════════════ */
function maskPhone(v) {
  v = v.replace(/\D/g, '');
  if (v.length > 10) {
    v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (v.length > 6) {
    v = v.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  } else if (v.length > 2) {
    v = v.replace(/(\d{2})(\d{0,5})/, '($1) $2');
  }
  return v;
}

document.addEventListener('DOMContentLoaded', function() {
  ['c-tel', 'c-tel-resp', 'e-tel', 'e-tel-resp'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', function() {
        this.value = maskPhone(this.value);
      });
    }
  });
});

/* ════════════════════════════════════════
   CADASTRAR ALUNO
════════════════════════════════════════ */
function cadastrar() {
  if (!requireAdmin()) return;
  
  const nome = document.getElementById('c-nome').value.trim();
  const cpf  = document.getElementById('c-cpf').value.trim();
  
  if (!nome) { toast('Nome é obrigatório!', 'error'); return; }
  if (!cpf) { toast('CPF é obrigatório!', 'error'); return; }
  if (!validarCPF(cpf)) { toast('CPF inválido! Verifique os dígitos.', 'error'); return; }
  if (alunos.some(a => a.cpf === cpf)) { toast('Este CPF já está cadastrado!', 'error'); return; }
  
  const falecido = document.querySelector('input[name="falecido"]:checked')?.value || 'não';
  
  alunos.push({
    nome, cpf,
    email:   document.getElementById('c-email').value.trim(),
    tel:     document.getElementById('c-tel').value.trim(),
    nasc:    document.getElementById('c-nascimento').value,
    end:     document.getElementById('c-end').value.trim(),
    resp:    document.getElementById('c-responsavel').value.trim(),
    telResp: document.getElementById('c-tel-resp').value.trim(),
    falecido,
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: currentUser ? currentUser.username : 'admin'
  });
  
  saveAlunos();
  
  ['c-nome','c-cpf','c-email','c-tel','c-nascimento','c-end','c-responsavel','c-tel-resp'].forEach(id =>
    document.getElementById(id).value = ''
  );
  const radioNao = document.querySelector('input[name="falecido"][value="não"]');
  if (radioNao) radioNao.checked = true;
  
  toast('Aluno cadastrado com sucesso! ✅');
  setTimeout(() => goTo('screen-dashboard'), 700);
}

/* ════════════════════════════════════════
   ENCONTRAR ALUNO
════════════════════════════════════════ */
function encontrar() {
  if (!isLoggedIn()) {
    toast('Faça login para pesquisar!', 'error');
    return;
  }
  
  const nome = document.getElementById('f-nome').value.trim().toLowerCase();
  const cpf  = document.getElementById('f-cpf').value.trim();
  const resp = document.getElementById('f-resp').value.trim().toLowerCase();
  const nasc = document.getElementById('f-nasc').value;
  const caixa = document.getElementById('f-caixa').value.trim().toLowerCase();
  
  const res = alunos.filter(a => {
    if (nome && !a.nome.toLowerCase().includes(nome)) return false;
    if (cpf  && !a.cpf.includes(cpf)) return false;
    if (resp && !a.resp.toLowerCase().includes(resp)) return false;
    if (nasc && a.nasc !== nasc) return false;
    if (caixa) {
      const busca = `${a.nome} ${a.cpf} ${a.resp} ${a.email} ${a.tel}`.toLowerCase();
      if (!busca.includes(caixa)) return false;
    }
    return true;
  });
  
  const tbody = document.getElementById('find-tbody');
  const empty = document.getElementById('find-empty');
  const wrap  = document.getElementById('find-results');
  
  wrap.style.display = 'block';
  tbody.innerHTML = '';
  
  if (res.length === 0) {
    empty.style.display = 'block';
    tbody.parentElement.style.display = 'none';
  } else {
    empty.style.display = 'none';
    tbody.parentElement.style.display = '';
    res.forEach(a => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${a.nome}</td>
        <td>${a.cpf}</td>
        <td>${a.nasc ? fmtDate(a.nasc) : '—'}</td>
        <td>${a.resp || '—'}</td>
        <td><span class="badge ${a.falecido === 'sim' ? 'badge-sim' : 'badge-nao'}">${a.falecido}</span></td>`;
      tbody.appendChild(tr);
    });
  }
  toast(`${res.length} aluno(s) encontrado(s).`);
}

/* ════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════ */
let sortField = 'nome';
let sortDirection = 'asc';

function sortAlunos(field) {
  if (sortField === field) {
    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    sortField = field;
    sortDirection = 'asc';
  }
  
  alunos.sort((a, b) => {
    let valA = (a[field] || '').toLowerCase();
    let valB = (b[field] || '').toLowerCase();
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
  
  saveAlunos();
  renderDash();
}

function renderDash() {
  const tbody = document.getElementById('dash-tbody');
  const empty = document.getElementById('dash-empty');
  tbody.innerHTML = '';
  
  const header = document.querySelector('.table-header');
  if (header) {
    const total = alunos.length;
    const ativos = alunos.filter(a => a.is_active !== false).length;
    header.innerHTML = `
      📋 Tabela de Alunos Registrados
      <span style="font-size:0.8rem;font-weight:400;background:rgba(255,255,255,0.2);padding:0.2rem 0.8rem;border-radius:20px">
        ${total} alunos (${ativos} ativos)
      </span>`;
  }
  
  if (alunos.length === 0) {
    empty.style.display = 'block';
    tbody.parentElement.style.display = 'none';
  } else {
    empty.style.display = 'none';
    tbody.parentElement.style.display = '';
    alunos.forEach((a, i) => {
      const tr = document.createElement('tr');
      
      const createdBy = a.created_by ? `<br><span style="font-size:0.65rem;color:var(--muted)">👤 ${a.created_by}</span>` : '';
      
      let actionsHtml = '';
      if (canModify()) {
        actionsHtml = `
          <button class="action-btn edit-btn" onclick="openEdit(${i})" title="Editar">✏️</button>
          <button class="action-btn del-btn" onclick="askDelete(${i})" title="Excluir">✕</button>
        `;
      } else {
        actionsHtml = `
          <button class="action-btn edit-btn" onclick="toast('Apenas administradores podem editar.', 'error')" title="Apenas admin" style="opacity:0.5;cursor:not-allowed">🔒</button>
        `;
      }
      
      tr.innerHTML = `
        <td><strong>${a.nome}</strong>${createdBy}</td>
        <td>${a.cpf}</td>
        <td>${a.nasc ? fmtDate(a.nasc) : '—'}</td>
        <td>${a.tel || '—'}</td>
        <td>${a.resp || '—'}</td>
        <td><span class="badge ${a.falecido === 'sim' ? 'badge-sim' : 'badge-nao'}">${a.falecido}</span></td>
        <td>
          <button class="doc-count-btn" onclick="openDocs(${i})" title="Ver documentos" id="doc-btn-${i}">
            📎 <span class="doc-count-num" id="doc-count-${i}">0</span>
          </button>
        </td>
        <td class="action-cell">${actionsHtml}</td>`;
      tbody.appendChild(tr);
    });
  }
}

function askDelete(i) { 
  if (!requireAdmin()) return;
  deleteIdx = i; 
  const aluno = alunos[i];
  document.querySelector('#modal-delete p').textContent = 
    `Deseja realmente excluir "${aluno.nome}" (CPF: ${aluno.cpf})? Esta ação não pode ser desfeita.`;
  openModal('modal-delete'); 
}

function confirmDelete() {
  if (deleteIdx === null) return;
  const nome = alunos[deleteIdx].nome;
  alunos.splice(deleteIdx, 1);
  saveAlunos();
  renderDash();
  closeModal('modal-delete');
  toast(`"${nome}" foi removido com sucesso.`);
  deleteIdx = null;
}

/* ════════════════════════════════════════
   MODAL HELPERS
════════════════════════════════════════ */
function openModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.add('open'); 
}

function closeModal(id) { 
  const el = document.getElementById(id);
  if (el) el.classList.remove('open'); 
}

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function fmtDate(d) {
  if (!d) return '—';
  const [y,m,dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

let toastTimer;
function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show ' + (type === 'error' ? 'error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* ════════════════════════════════════════
   EDITAR ALUNO
════════════════════════════════════════ */
function openEdit(i) {
  if (!requireAdmin()) return;
  editIdx = i;
  const a = alunos[i];
  document.getElementById('e-nome').value       = a.nome || '';
  document.getElementById('e-email').value      = a.email || '';
  document.getElementById('e-cpf').value        = a.cpf || '';
  document.getElementById('e-responsavel').value = a.resp || '';
  document.getElementById('e-tel').value        = a.tel || '';
  document.getElementById('e-tel-resp').value   = a.telResp || '';
  document.getElementById('e-nascimento').value = a.nasc || '';
  document.getElementById('e-end').value        = a.end || '';
  const falVal = a.falecido === 'sim' ? 'sim' : 'não';
  const radio = document.querySelector(`input[name="e-falecido"][value="${falVal}"]`);
  if (radio) radio.checked = true;
  openModal('modal-edit');
}

function saveEdit() {
  if (editIdx === null) return;
  const nome = document.getElementById('e-nome').value.trim();
  if (!nome) { toast('Nome é obrigatório!', 'error'); return; }
  
  const cpf = document.getElementById('e-cpf').value.trim();
  if (cpf && !validarCPF(cpf)) { toast('CPF inválido!', 'error'); return; }
  
  const falecido = document.querySelector('input[name="e-falecido"]:checked')?.value || 'não';
  
  alunos[editIdx] = {
    ...alunos[editIdx],
    nome,
    email:   document.getElementById('e-email').value.trim(),
    resp:    document.getElementById('e-responsavel').value.trim(),
    tel:     document.getElementById('e-tel').value.trim(),
    telResp: document.getElementById('e-tel-resp').value.trim(),
    nasc:    document.getElementById('e-nascimento').value,
    end:     document.getElementById('e-end').value.trim(),
    falecido,
  };
  saveAlunos();
  renderDash();
  closeModal('modal-edit');
  toast('Aluno atualizado! ✅');
  editIdx = null;
}

/* ════════════════════════════════════════
   EXPORTAR CSV
════════════════════════════════════════ */
function exportCSV() {
  if (!requireAdmin()) return;
  const ativos = alunos.filter(a => a.is_active !== false);
  if (ativos.length === 0) { 
    toast('Nenhum aluno ativo para exportar!', 'error'); 
    return; 
  }
  
  const headers = ['Nome','CPF','Email','Telefone','Data Nascimento','Endereço','Responsável','Tel. Responsável','Resp. Falecido'];
  const rows = ativos.map(a => [
    a.nome, a.cpf, a.email, a.tel,
    a.nasc ? fmtDate(a.nasc) : '',
    a.end, a.resp, a.telResp, a.falecido
  ].map(v => `"${(v||'').replace(/"/g,'""')}"`));
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; 
  a.download = `eduarchiv_alunos_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); 
  URL.revokeObjectURL(url);
  toast(`${ativos.length} alunos exportados! ✅`);
}

/* ════════════════════════════════════════
   EXPORTAR PDF
════════════════════════════════════════ */
function exportPDF() {
  if (!requireAdmin()) return;
  const ativos = alunos.filter(a => a.is_active !== false);
  if (ativos.length === 0) { 
    toast('Nenhum aluno ativo para exportar!', 'error'); 
    return; 
  }
  
  if (typeof window.jspdf === 'undefined') { 
    toast('Biblioteca PDF ainda carregando, tente novamente.', 'error'); 
    return; 
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(46, 204, 113);
  doc.rect(0, 0, 297, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('SAGE — Lista de Alunos', 14, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}   Total: ${ativos.length} aluno(s)`, 200, 12);

  const rows = ativos.map(a => [
    a.nome || '', a.cpf || '',
    a.nasc ? fmtDate(a.nasc) : '—',
    a.tel || '—', a.resp || '—', a.telResp || '—',
    a.falecido === 'sim' ? 'Sim' : 'Não'
  ]);

  doc.autoTable({
    startY: 22,
    head: [['Nome','CPF','Nascimento','Telefone','Responsável','Tel. Resp.','Resp. Falecido']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [127, 140, 141], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 248] },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = data.cell.raw;
        if (val === 'Sim') {
          doc.setTextColor(192, 57, 43);
        } else {
          doc.setTextColor(30, 132, 73);
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  doc.save(`sage_alunos_${new Date().toISOString().slice(0,10)}.pdf`);
  toast(`${ativos.length} alunos exportados! ✅`);
}

/* ════════════════════════════════════════
   DOCUMENTOS (IndexedDB)
════════════════════════════════════════ */
const DB_NAME    = 'sage_docs';
const DB_VERSION = 1;
const STORE      = 'documents';
let   db         = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) { resolve(db); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const idb = e.target.result;
      if (!idb.objectStoreNames.contains(STORE)) {
        const store = idb.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('cpf', 'cpf', { unique: false });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror   = e => reject(e.target.error);
  });
}

function dbGetByCpf(cpf) {
  return openDB().then(idb => new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('cpf');
    const req = idx.getAll(cpf);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function dbAdd(record) {
  return openDB().then(idb => new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).add(record);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function dbDelete(id) {
  return openDB().then(idb => new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = e => reject(e.target.error);
  }));
}

function dbCountByCpf(cpf) {
  return openDB().then(idb => new Promise((resolve, reject) => {
    const tx  = idb.transaction(STORE, 'readonly');
    const idx = tx.objectStore(STORE).index('cpf');
    const req = idx.count(cpf);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = e => reject(e.target.error);
  }));
}

function openDocs(i) {
  if (!isLoggedIn()) {
    toast('Faça login para ver documentos!', 'error');
    return;
  }
  docsAlunoIdx = i;
  const a = alunos[i];
  document.getElementById('docs-aluno-nome').textContent = a.nome;
  renderDocsList(a.cpf);

  const zone = document.getElementById('doc-dropzone');
  if (zone) {
    zone.ondragover  = e => { e.preventDefault(); zone.classList.add('dragover'); };
    zone.ondragleave = () => zone.classList.remove('dragover');
    zone.ondrop      = e => {
      e.preventDefault(); zone.classList.remove('dragover');
      handleDocFiles(Array.from(e.dataTransfer.files), a.cpf);
    };
  }

  openModal('modal-docs');
}

async function renderDocsList(cpf) {
  const list  = document.getElementById('docs-list');
  const empty = document.getElementById('docs-empty');
  if (!list || !empty) return;
  
  list.innerHTML = '';
  let docs = [];
  try { docs = await dbGetByCpf(cpf); } catch(e) {}
  
  if (docs.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  
  docs.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'doc-row';
    const isImg = doc.type && doc.type.startsWith('image/');
    const icon  = isImg ? '🖼️' : '📄';
    const size  = formatBytes(doc.size || 0);
    const date  = new Date(doc.addedAt || Date.now()).toLocaleDateString('pt-BR');
    row.innerHTML = `
      <div class="doc-row-icon">${icon}</div>
      <div class="doc-row-info">
        <span class="doc-row-name">${escHtml(doc.name)}</span>
        <span class="doc-row-meta">${size} · ${date}</span>
      </div>
      <div class="doc-row-actions">
        <button class="action-btn edit-btn" onclick="viewDoc(${doc.id})" title="Visualizar">👁</button>
        <button class="action-btn del-btn" onclick="deleteDoc(${doc.id},'${escHtml(cpf)}')" title="Remover">✕</button>
      </div>`;
    list.appendChild(row);
  });
}

function handleDocUpload(event) {
  const a = alunos[docsAlunoIdx];
  if (!a) return;
  handleDocFiles(Array.from(event.target.files), a.cpf);
  event.target.value = '';
}

async function handleDocFiles(files, cpf) {
  const MAX = 20 * 1024 * 1024;
  let added = 0;
  for (const file of files) {
    if (file.size > MAX) { toast(`"${file.name}" excede 20 MB, ignorado.`, 'error'); continue; }
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast(`"${file.name}" — tipo não suportado.`, 'error'); 
      continue;
    }
    const buf = await file.arrayBuffer();
    await dbAdd({
      cpf,
      name:    file.name,
      type:    file.type,
      size:    file.size,
      data:    buf,
      addedAt: Date.now(),
    });
    added++;
  }
  if (added > 0) {
    toast(`${added} documento(s) anexado(s)! ✅`);
    renderDocsList(cpf);
    const idx = alunos.findIndex(a => a.cpf === cpf);
    if (idx >= 0) {
      const count = await dbCountByCpf(cpf);
      const badge = document.getElementById(`doc-count-${idx}`);
      if (badge) badge.textContent = count;
    }
  }
}

async function deleteDoc(id, cpf) {
  await dbDelete(id);
  toast('Documento removido.');
  renderDocsList(cpf);
  const idx = alunos.findIndex(a => a.cpf === cpf);
  if (idx >= 0) {
    const count = await dbCountByCpf(cpf);
    const badge = document.getElementById(`doc-count-${idx}`);
    if (badge) badge.textContent = count;
  }
}

async function viewDoc(id) {
  const idb  = await openDB();
  const doc  = await new Promise((res, rej) => {
    const tx  = idb.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => res(req.result);
    req.onerror   = e => rej(e.target.error);
  });
  if (!doc) { toast('Documento não encontrado.', 'error'); return; }

  const blob = new Blob([doc.data], { type: doc.type });
  const url  = URL.createObjectURL(blob);
  currentDocData = { url, name: doc.name, type: doc.type };

  document.getElementById('viewer-title').textContent = doc.name;
  const body = document.getElementById('viewer-body');
  body.innerHTML = '';

  if (doc.type === 'application/pdf') {
    const iframe = document.createElement('iframe');
    iframe.src    = url;
    iframe.style  = 'width:100%;height:100%;border:none;border-radius:8px';
    body.appendChild(iframe);
  } else {
    const img = document.createElement('img');
    img.src   = url;
    img.style = 'max-width:100%;max-height:100%;object-fit:contain;display:block;margin:auto;border-radius:8px';
    body.style.display = 'flex';
    body.style.alignItems = 'center';
    body.appendChild(img);
  }
  openModal('modal-viewer');
}

function downloadCurrentDoc() {
  if (!currentDocData) return;
  const a = document.createElement('a');
  a.href     = currentDocData.url;
  a.download = currentDocData.name;
  a.click();
}

/* ════════════════════════════════════════
   UTILS
════════════════════════════════════════ */
function formatBytes(b) {
  if (b < 1024)       return b + ' B';
  if (b < 1048576)    return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function autoBackup() {
  if (alunos.length === 0) return;
  
  const backup = {
    date: new Date().toISOString(),
    students: alunos,
    users: users,
    count: alunos.length
  };
  
  localStorage.setItem('ea_backup_' + new Date().toISOString().slice(0,10), JSON.stringify(backup));
  
  const keys = Object.keys(localStorage).filter(k => k.startsWith('ea_backup_'));
  if (keys.length > 7) {
    keys.sort();
    const toRemove = keys.slice(0, keys.length - 7);
    toRemove.forEach(k => localStorage.removeItem(k));
  }
}

setInterval(autoBackup, 5 * 60 * 1000);
autoBackup();

function restoreBackup(backupKey) {
  if (!confirm('Isso substituirá todos os dados atuais. Continuar?')) return;
  
  const data = JSON.parse(localStorage.getItem(backupKey));
  if (!data) return;
  
  alunos = data.students || [];
  users = data.users || [];
  saveAlunos();
  saveUsers();
  renderDash();
  toast('Backup restaurado com sucesso! ✅');
}

/* ════════════════════════════════════════
   INICIALIZAÇÃO
════════════════════════════════════════ */
console.log('🚀 SAGE iniciado!');
console.log('👥 Usuários:', users);
console.log('📚 Alunos:', alunos.length);