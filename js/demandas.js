// demandas.js — sem módulos ES6
(async function() {
  renderLayout('demandas');
  const user = await initPage('Demandas');
  if (!user) return;

  let allDemandas = [], editingId = null, detalheItem = null;

  async function loadDemandas() {
    try {
      const { data, error } = await window._sb.from('demandas').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      allDemandas = data || [];
      renderTable(applyFilters());
    } catch(err) { showToast('Erro ao carregar demandas.', 'error'); renderTable([]); }
  }

  function applyFilters() {
    const search = document.getElementById('searchDemanda')?.value.toLowerCase() || '';
    const status = document.getElementById('filterStatus')?.value || '';
    const prior  = document.getElementById('filterPrioridade')?.value || '';
    const ini    = document.getElementById('filterDataInicio')?.value || '';
    const fim    = document.getElementById('filterDataFim')?.value || '';
    return allDemandas.filter(d =>
      (!search || d.titulo.toLowerCase().includes(search) || d.responsavel.toLowerCase().includes(search)) &&
      (!status || d.status === status) && (!prior || d.prioridade === prior) &&
      (!ini || (d.prazo && d.prazo >= ini)) && (!fim || (d.prazo && d.prazo <= fim))
    );
  }

  function renderTable(list) {
    const tbody = document.getElementById('tbodyDemandas'); if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
        <p class="empty-state-title">Nenhuma demanda encontrada</p></div></td></tr>`; return;
    }
    tbody.innerHTML = list.map(d => {
      const over = isOverdue(d.prazo, d.status);
      return `<tr class="${over?'row-atrasado':''}">
        <td data-label="Título"><span style="font-weight:500">${esc(d.titulo)}</span></td>
        <td data-label="Responsável" class="hide-mobile" style="color:var(--color-text-muted)">${esc(d.responsavel)}</td>
        <td data-label="Prioridade">${priorBadge(d.prioridade)}</td>
        <td data-label="Status">${statusBadge(d.status)}</td>
        <td data-label="Prazo" class="hide-mobile" style="color:var(--color-text-muted);font-size:.8rem">${formatDate(d.prazo)}</td>
        <td data-label="Situação" class="hide-mobile">${over?'<span class="badge badge-atrasado">Atrasada</span>':'<span style="color:var(--color-text-subtle);font-size:.8rem">No prazo</span>'}</td>
        <td data-label="Ações"><div class="td-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewDetalhe('${d.id}')" title="Visualizar">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="editDemanda('${d.id}')" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteDemanda('${d.id}','${esc(d.titulo)}')" title="Excluir" style="color:var(--color-danger)">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td></tr>`;
    }).join('');
  }

  async function saveDemanda() {
    const titulo = document.getElementById('demandaTitulo')?.value.trim();
    const descricao = document.getElementById('demandaDescricao')?.value.trim();
    const responsavel = document.getElementById('demandaResponsavel')?.value.trim();
    const prazo = document.getElementById('demandaPrazo')?.value;
    const prioridade = document.getElementById('demandaPrioridade')?.value;
    const status = document.getElementById('demandaStatus')?.value;
    const observacoes = document.getElementById('demandaObservacoes')?.value.trim();
    if (!titulo || !responsavel || !prioridade || !status) { showToast('Preencha os campos obrigatórios (*).', 'warning'); return; }
    const btn = document.getElementById('btnSaveDemanda');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Salvando...';
    const payload = { titulo, descricao: descricao||null, responsavel, prazo: prazo||null, prioridade, status, observacoes: observacoes||null, user_id: user.id };
    try {
      if (editingId) { delete payload.user_id; const {error} = await window._sb.from('demandas').update(payload).eq('id', editingId); if(error) throw error; showToast('Demanda atualizada!'); }
      else { const {error} = await window._sb.from('demandas').insert(payload); if(error) throw error; showToast('Demanda criada!'); }
      closeModal(); await loadDemandas();
    } catch(err) { showToast('Erro: '+err.message, 'error'); }
    finally { btn.disabled=false; btn.innerHTML='Salvar demanda'; }
  }

  window.viewDetalhe = (id) => {
    const d = allDemandas.find(x=>x.id===id); if(!d) return;
    detalheItem = d;
    const over = isOverdue(d.prazo, d.status);
    document.getElementById('detalheContent').innerHTML = `
      <div class="detail-grid">
        <div class="detail-item full"><span class="detail-label">Título</span><span class="detail-value" style="font-size:1.05rem;font-weight:600">${esc(d.titulo)}</span></div>
        <hr class="detail-divider">
        <div class="detail-item full"><span class="detail-label">Descrição</span><span class="detail-value">${d.descricao?esc(d.descricao):'<em style="color:var(--color-text-subtle)">Sem descrição</em>'}</span></div>
        <div class="detail-item"><span class="detail-label">Responsável</span><span class="detail-value">${esc(d.responsavel)}</span></div>
        <div class="detail-item"><span class="detail-label">Prazo</span><span class="detail-value">${formatDate(d.prazo)}${over?' <span class="badge badge-atrasado">Atrasada</span>':''}</span></div>
        <div class="detail-item"><span class="detail-label">Prioridade</span><span class="detail-value">${priorBadge(d.prioridade)}</span></div>
        <div class="detail-item"><span class="detail-label">Status</span><span class="detail-value">${statusBadge(d.status)}</span></div>
        <hr class="detail-divider">
        <div class="detail-item full"><span class="detail-label">Observações</span><span class="detail-value">${d.observacoes?esc(d.observacoes):'<em style="color:var(--color-text-subtle)">Nenhuma</em>'}</span></div>
        <div class="detail-item"><span class="detail-label">Criada em</span><span class="detail-value" style="color:var(--color-text-muted);font-size:.8rem">${new Date(d.created_at).toLocaleString('pt-BR')}</span></div>
      </div>`;
    document.getElementById('modalDetalhe').classList.add('open');
  };

  window.editDemanda = (id) => {
    const d = allDemandas.find(x=>x.id===id); if(!d) return;
    editingId = id;
    document.getElementById('modalDemandaTitle').textContent = 'Editar demanda';
    document.getElementById('demandaTitulo').value = d.titulo;
    document.getElementById('demandaDescricao').value = d.descricao||'';
    document.getElementById('demandaResponsavel').value = d.responsavel;
    document.getElementById('demandaPrazo').value = d.prazo||'';
    document.getElementById('demandaPrioridade').value = d.prioridade;
    document.getElementById('demandaStatus').value = d.status;
    document.getElementById('demandaObservacoes').value = d.observacoes||'';
    document.getElementById('modalDemanda').classList.add('open');
  };

  window.deleteDemanda = (id, titulo) => {
    showConfirm({ title:'Excluir demanda', text:`A demanda "<strong>${titulo}</strong>" será excluída permanentemente.`,
      onConfirm: async () => {
        try { const {error} = await window._sb.from('demandas').delete().eq('id',id); if(error) throw error; showToast('Excluída.'); await loadDemandas(); }
        catch(err) { showToast('Erro: '+err.message,'error'); }
      }});
  };

  function openNewModal() {
    editingId = null;
    document.getElementById('modalDemandaTitle').textContent = 'Nova demanda';
    document.getElementById('formDemanda').reset();
    document.getElementById('modalDemanda').classList.add('open');
  }
  function closeModal() {
    document.getElementById('modalDemanda').classList.remove('open');
    document.getElementById('modalDetalhe').classList.remove('open');
  }

  document.getElementById('btnNovaDemanda')?.addEventListener('click', openNewModal);
  document.getElementById('btnSaveDemanda')?.addEventListener('click', saveDemanda);
  document.getElementById('btnCancelDemanda')?.addEventListener('click', closeModal);
  document.getElementById('btnCloseModalDemanda')?.addEventListener('click', closeModal);
  document.getElementById('btnCloseDetalhe')?.addEventListener('click', closeModal);
  document.getElementById('btnCloseDetalheFooter')?.addEventListener('click', closeModal);
  document.getElementById('btnEditarDetalhe')?.addEventListener('click', () => { closeModal(); if(detalheItem) window.editDemanda(detalheItem.id); });
  document.getElementById('modalDemanda')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });
  document.getElementById('modalDetalhe')?.addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });

  const refresh = () => renderTable(applyFilters());
  document.getElementById('searchDemanda')?.addEventListener('input', debounce(refresh));
  document.getElementById('filterStatus')?.addEventListener('change', refresh);
  document.getElementById('filterPrioridade')?.addEventListener('change', refresh);
  document.getElementById('filterDataInicio')?.addEventListener('change', refresh);
  document.getElementById('filterDataFim')?.addEventListener('change', refresh);
  document.getElementById('btnLimparFiltros')?.addEventListener('click', () => {
    ['searchDemanda','filterStatus','filterPrioridade','filterDataInicio','filterDataFim'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    refresh();
  });

  await loadDemandas();
})();

