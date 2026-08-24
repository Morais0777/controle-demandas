// ============================================================
// CONFIGURACOES.JS — Lógica da página de Configurações
// Funciona sem módulos ES6 — compatível com GitHub Pages
// ============================================================

// ── Inicializa a página ───────────────────────────────────────
(async () => {
  renderLayout('configuracoes');
  const user = await initPage('Configurações');
  if (!user) return;

  // Preenche o campo com o nome atual e o preview
  const email = user.email || '';
  document.getElementById('previewEmail').textContent = email;
  document.getElementById('inputNome').value = window._currentDisplayName || '';
  atualizarPreview(window._currentDisplayName || '');

  // Sincroniza o seletor de tema com o tema ativo
  const temaAtual = localStorage.getItem('cd-theme') || 'light';
  document.getElementById(temaAtual === 'dark' ? 'temaDark' : 'temaLight').checked = true;

  // Atualiza o preview em tempo real conforme o usuário digita
  document.getElementById('inputNome').addEventListener('input', (e) => {
    atualizarPreview(e.target.value);
  });
})();

// ── Preview do avatar ─────────────────────────────────────────
function atualizarPreview(nome) {
  const partes = (nome || '').trim().split(/\s+/).filter(Boolean);
  const iniciais = partes.slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?';
  document.getElementById('avatarPreview').textContent = iniciais;
  document.getElementById('previewName').textContent = nome.trim() || '(sem nome)';
}

// ── Salvar perfil ─────────────────────────────────────────────
async function salvarPerfil() {
  const nome = document.getElementById('inputNome').value.trim();
  const btn  = document.getElementById('btnSalvarPerfil');
  const msg  = document.getElementById('statusPerfil');

  if (!nome) {
    exibirStatus(msg, 'error', 'O nome não pode ficar em branco.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Salvando…';

  try {
    const { data: { session } } = await _supabaseClient.auth.getSession();
    if (!session) throw new Error('Sessão expirada. Faça login novamente.');

    // Atualiza na tabela profiles
    const { error } = await _supabaseClient
      .from('profiles')
      .upsert({ id: session.user.id, display_name: nome, email: session.user.email }, { onConflict: 'id' });
    if (error) throw error;

    // Atualiza também no user_metadata como fallback
    await _supabaseClient.auth.updateUser({ data: { display_name: nome } });

    // Atualiza a sidebar imediatamente
    const el = document.getElementById('userName');
    if (el) el.textContent = nome;
    const partes = nome.split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('');
    const av = document.getElementById('userAvatar');
    if (av) av.textContent = partes || '?';

    window._currentDisplayName = nome;
    exibirStatus(msg, 'success', '✓ Nome atualizado com sucesso!');
    showToast('Nome de usuário atualizado!', 'success');
  } catch (err) {
    exibirStatus(msg, 'error', err.message);
    showToast('Erro ao salvar: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Salvar alterações';
  }
}

// ── Aplicar tema pelo seletor ─────────────────────────────────
function aplicarTemaSelecionado(tema) {
  document.documentElement.setAttribute('data-theme', tema);
  localStorage.setItem('cd-theme', tema);
  updateThemeIcon(tema);

  const msg = document.getElementById('statusTema');
  exibirStatus(msg, 'success', tema === 'dark' ? '🌙 Tema escuro aplicado!' : '☀️ Tema claro aplicado!');
}

// ── Helper: exibir mensagem de status ────────────────────────
function exibirStatus(el, tipo, texto) {
  el.className = `config-status-msg ${tipo} visible`;
  el.textContent = texto;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove('visible'), 3500);
}
