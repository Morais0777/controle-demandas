// solicitacoes.js — sem módulos ES6
(async function() {
  renderLayout('solicitacoes');
  const user = await initPage('Solicitações');
  if (!user) return;

  let allSolicitacoes = [], editingId = null, detalheItem = null;

  async function loadSolicitacoes() {
    try {
      const { data, error } = await window._sb.from('solicitacoes').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      allSolicitacoes = data || [];
      renderTable(applyFilters());
    } catch(err) { showToast('Erro ao carregar.', 'error'); renderTable([]); }
  }

  function applyFilters() {
    const search = document.getElementById('searchSol')?.value.toLowerCase() || '';
    const status = document.getElementById('filterSolStatus')?.value || '';
    const prior  = document.getElementById('filterSolPrioridade')?.value || '';
    const ini    = document.getElementById('filterSolDataInicio')?.value || '';
    const fim    = document.getElementById('filterSolDataFim')?.value || '';
    return allSolicitacoes.filter(s =>
      (!search || s.titulo.toLowerCase().includes(search) || s.solicitante.toLowerCase().includes(search) || s.responsavel.toLowerCase().includes(search)) &&
      (!status || s.status===status) && (!prior || s.prioridade===prior) &&
      (!ini || (s.prazo && s.prazo>=ini)) && (!fim || (s.prazo && s.prazo<=fim))
    );
  }

  function renderTable(list) {
    const tbody = document.getElementById('tbodySolicitacoes'); if (!tbody) return;
    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><p class="empty-state-title">Nenhuma solicitação encontrada</p></div></td></tr>`; return;
    }
    tbody.innerHTML = list.map(s => {
      const over = isOverdue(s.prazo, s.status);
      return `<tr class="${over?'row-atrasado':''}">
        <td data-label="Título"><span style="font-weight:500">${esc(s.titulo)}</span></td>
        <td data-label="Solicitante" class="hide-mobile" style="color:var(--color-text-muted)">${esc(s.solicitante)}</td>
        <td data-label="Responsável" class="hide-mobile" style="color:var(--color-text-muted)">${esc(s.responsavel)}</td>
        <td data-label="Prioridade">${priorBadge(s.prioridade)}</td>
        <td data-label="Status">${statusBadge(s.status)}</td>
        <td data-label="Prazo" class="hide-mobile" style="color:var(--color-text-muted);font-size:.8rem">${formatDate(s.prazo)}${over?' <span class="badge badge-atrasado">Atrasada</span>':''}</td>
        <td data-label="Ações"><div class="td-actions">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewSolDetalhe('${s.id}')" title="Visualizar">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="editSol('${s.id}')" title="Editar">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteSol('${s.id}','${esc(s.titulo)}')" title="Excluir" style="color:var(--color-danger)">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td></tr>`;
    }).join('');
  }

  async function saveSol() {
    const titulo=document.getElementById('solTitulo')?.value.trim(), descricao=document.getElementById('solDescricao')?.value.trim(),
      solicitante=document.getElementById('solSolicitante')?.value.trim(), responsavel=document.getElementById('solResponsavel')?.value.trim(),
      prioridade=document.getElementById('solPrioridade')?.value, status=document.getElementById('solStatus')?.value,
      prazo=document.getElementById('solPrazo')?.value, observacoes=document.getElementById('solObservacoes')?.value.trim();
    if (!titulo||!solicitante||!responsavel||!prioridade||!status) { showToast('Preencha os campos obrigatórios.','warning'); return; }
    const btn=document.getElementById('btnSaveSol'); btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Salvando...';
    const payload={titulo,descricao:descricao||null,solicitante,responsavel,prioridade,status,prazo:prazo||null,observacoes:observacoes||null,user_id:user.id};
    try {
      if(editingId){delete payload.user_id;const{error}=await window._sb.from('solicitacoes').update(payload).eq('id',editingId);if(error)throw error;showToast('Atualizada!');}
      else{const{error}=await window._sb.from('solicitacoes').insert(payload);if(error)throw error;showToast('Criada!');}
      closeModals(); await loadSolicitacoes();
    } catch(err){showToast('Erro: '+err.message,'error');}
    finally{btn.disabled=false;btn.innerHTML='Salvar solicitação';}
  }

  window.viewSolDetalhe = (id) => {
    const s=allSolicitacoes.find(x=>x.id===id); if(!s) return; detalheItem=s;
    const over=isOverdue(s.prazo,s.status);
    document.getElementById('solDetalheContent').innerHTML=`
      <div class="detail-grid">
        <div class="detail-item full"><span class="detail-label">Título</span><span class="detail-value" style="font-size:1.05rem;font-weight:600">${esc(s.titulo)}</span></div>
        <hr class="detail-divider">
        <div class="detail-item full"><span class="detail-label">Descrição</span><span class="detail-value">${s.descricao?esc(s.descricao):'<em style="color:var(--color-text-subtle)">Sem descrição</em>'}</span></div>
        <div class="detail-item"><span class="detail-label">Solicitante</span><span class="detail-value">${esc(s.solicitante)}</span></div>
        <div class="detail-item"><span class="detail-label">Responsável</span><span class="detail-value">${esc(s.responsavel)}</span></div>
        <div class="detail-item"><span class="detail-label">Prioridade</span><span class="detail-value">${priorBadge(s.prioridade)}</span></div>
        <div class="detail-item"><span class="detail-label">Status</span><span class="detail-value">${statusBadge(s.status)}</span></div>
        <div class="detail-item"><span class="detail-label">Prazo</span><span class="detail-value">${formatDate(s.prazo)}${over?' <span class="badge badge-atrasado">Atrasada</span>':''}</span></div>
        <hr class="detail-divider">
        <div class="detail-item full"><span class="detail-label">Observações</span><span class="detail-value">${s.observacoes?esc(s.observacoes):'<em style="color:var(--color-text-subtle)">Nenhuma</em>'}</span></div>
      </div>`;
    document.getElementById('modalSolDetalhe').classList.add('open');
  };
  window.editSol = (id) => {
    const s=allSolicitacoes.find(x=>x.id===id); if(!s) return; editingId=id;
    document.getElementById('modalSolTitle').textContent='Editar solicitação';
    document.getElementById('solTitulo').value=s.titulo; document.getElementById('solDescricao').value=s.descricao||'';
    document.getElementById('solSolicitante').value=s.solicitante; document.getElementById('solResponsavel').value=s.responsavel;
    document.getElementById('solPrioridade').value=s.prioridade; document.getElementById('solStatus').value=s.status;
    document.getElementById('solPrazo').value=s.prazo||''; document.getElementById('solObservacoes').value=s.observacoes||'';
    document.getElementById('modalSol').classList.add('open');
  };
  window.deleteSol = (id,titulo) => {
    showConfirm({title:'Excluir solicitação',text:`"<strong>${titulo}</strong>" será excluída.`,
      onConfirm:async()=>{try{const{error}=await window._sb.from('solicitacoes').delete().eq('id',id);if(error)throw error;showToast('Excluída.');await loadSolicitacoes();}catch(err){showToast('Erro: '+err.message,'error');}}});
  };

  function openNewModal(){editingId=null;document.getElementById('modalSolTitle').textContent='Nova solicitação';document.getElementById('formSol').reset();document.getElementById('modalSol').classList.add('open');}
  function closeModals(){document.getElementById('modalSol').classList.remove('open');document.getElementById('modalSolDetalhe').classList.remove('open');}

  document.getElementById('btnNovaSolicitacao')?.addEventListener('click',openNewModal);
  document.getElementById('btnSaveSol')?.addEventListener('click',saveSol);
  document.getElementById('btnCancelSol')?.addEventListener('click',closeModals);
  document.getElementById('btnCloseModalSol')?.addEventListener('click',closeModals);
  document.getElementById('btnCloseSolDetalhe')?.addEventListener('click',closeModals);
  document.getElementById('btnCloseSolDetalheFooter')?.addEventListener('click',closeModals);
  document.getElementById('btnEditarSolDetalhe')?.addEventListener('click',()=>{closeModals();if(detalheItem)window.editSol(detalheItem.id);});
  document.getElementById('modalSol')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModals();});
  document.getElementById('modalSolDetalhe')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModals();});

  const refresh=()=>renderTable(applyFilters());
  document.getElementById('searchSol')?.addEventListener('input',debounce(refresh));
  document.getElementById('filterSolStatus')?.addEventListener('change',refresh);
  document.getElementById('filterSolPrioridade')?.addEventListener('change',refresh);
  document.getElementById('filterSolDataInicio')?.addEventListener('change',refresh);
  document.getElementById('filterSolDataFim')?.addEventListener('change',refresh);
  document.getElementById('btnLimparSolFiltros')?.addEventListener('click',()=>{
    ['searchSol','filterSolStatus','filterSolPrioridade','filterSolDataInicio','filterSolDataFim'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});refresh();});

  await loadSolicitacoes();
})();

