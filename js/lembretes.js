// lembretes.js — sem módulos ES6
(async function() {
  const user = await initPage('Lembretes');
  if (!user) return;

  let allLembretes = [], editingId = null, detalheItem = null;
  const TODAY = new Date().toISOString().slice(0,10);
  const IN7   = new Date(Date.now()+7*86400000).toISOString().slice(0,10);

  async function loadLembretes() {
    try {
      const {data,error} = await window._sb.from('lembretes').select('*').order('data_lembrete',{ascending:true});
      if(error) throw error;
      allLembretes = data||[];
      renderKpis(); renderAlertas(); renderTable(applyFilters());
    } catch(err){ showToast('Erro ao carregar.','error'); }
  }

  function renderKpis() {
    const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
    const pend=allLembretes.filter(l=>l.status==='pendente');
    set('kLemHoje',      pend.filter(l=>l.data_lembrete===TODAY).length);
    set('kLemProximos',  pend.filter(l=>l.data_lembrete>TODAY&&l.data_lembrete<=IN7).length);
    set('kLemAtrasados', pend.filter(l=>l.data_lembrete<TODAY).length);
    set('kLemConcluidos',allLembretes.filter(l=>l.status==='concluido').length);
  }

  function renderAlertas() {
    const pend=allLembretes.filter(l=>l.status==='pendente');
    const hoje=pend.filter(l=>l.data_lembrete===TODAY);
    const atras=pend.filter(l=>l.data_lembrete<TODAY);
    const elH=document.getElementById('lemAlertaHoje');
    if(elH){ if(hoje.length){elH.style.display='flex';elH.className='reminder-alert';
      elH.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      <span>Você tem <strong>${hoje.length} lembrete${hoje.length>1?'s':''}</strong> para hoje.</span>`;}else{elH.style.display='none';}}
    const elA=document.getElementById('lemAlertaAtrasados');
    if(elA){ if(atras.length){elA.style.display='flex';elA.className='reminder-alert';elA.style.borderColor='var(--color-danger)';elA.style.background='var(--color-danger-bg)';
      elA.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      <span style="color:var(--color-danger)"><strong>${atras.length}</strong> lembrete${atras.length>1?'s':''} em atraso.</span>`;}else{elA.style.display='none';}}
  }

  function getSituacao(l) {
    if(l.status!=='pendente') return '';
    if(l.data_lembrete<TODAY)  return '<span class="badge badge-atrasado">Atrasado</span>';
    if(l.data_lembrete===TODAY) return '<span class="badge badge-urgente">Hoje</span>';
    if(l.data_lembrete<=IN7)  return '<span class="badge badge-alta">Em breve</span>';
    return '<span style="color:var(--color-text-subtle);font-size:.8rem">Futuro</span>';
  }

  function applyFilters() {
    const search=document.getElementById('searchLem')?.value.toLowerCase()||'';
    const status=document.getElementById('filterLemStatus')?.value||'';
    const prior=document.getElementById('filterLemPrioridade')?.value||'';
    const periodo=document.getElementById('filterLemPeriodo')?.value||'';
    return allLembretes.filter(l=>{
      const ms=!search||l.titulo.toLowerCase().includes(search);
      const mst=!status||l.status===status;
      const mp=!prior||l.prioridade===prior;
      let mper=true;
      if(periodo==='hoje')      mper=l.data_lembrete===TODAY;
      if(periodo==='semana')    mper=l.data_lembrete>=TODAY&&l.data_lembrete<=IN7;
      if(periodo==='atrasados') mper=l.data_lembrete<TODAY&&l.status==='pendente';
      return ms&&mst&&mp&&mper;
    });
  }

  function renderTable(list) {
    const tbody=document.getElementById('tbodyLembretes'); if(!tbody) return;
    if(!list.length){tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><p class="empty-state-title">Nenhum lembrete encontrado</p></div></td></tr>`;return;}
    tbody.innerHTML=list.map(l=>`
      <tr class="${l.status==='pendente'&&l.data_lembrete<TODAY?'row-atrasado':''}">
        <td data-label="Título"><span style="font-weight:500">${esc(l.titulo)}</span></td>
        <td data-label="Data" style="color:var(--color-text-muted);font-size:.85rem">${formatDate(l.data_lembrete)}</td>
        <td data-label="Horário" class="hide-mobile" style="color:var(--color-text-muted);font-size:.85rem">${l.horario?l.horario.slice(0,5):'—'}</td>
        <td data-label="Prioridade">${priorBadge(l.prioridade)}</td>
        <td data-label="Status">${statusBadge(l.status)}</td>
        <td data-label="Situação" class="hide-mobile">${getSituacao(l)}</td>
        <td data-label="Ações"><div class="td-actions">
          ${l.status==='pendente'?`<button class="btn btn-ghost btn-icon btn-sm" onclick="concluirLem('${l.id}')" title="Concluir" style="color:var(--color-success)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg></button>`:''}
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewLemDetalhe('${l.id}')" title="Visualizar"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="editLem('${l.id}')" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="deleteLem('${l.id}','${esc(l.titulo)}')" title="Excluir" style="color:var(--color-danger)"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div></td></tr>`).join('');
  }

  async function saveLem() {
    const titulo=document.getElementById('lemTitulo')?.value.trim(),descricao=document.getElementById('lemDescricao')?.value.trim(),
      data=document.getElementById('lemData')?.value,horario=document.getElementById('lemHorario')?.value,
      prioridade=document.getElementById('lemPrioridade')?.value,status=document.getElementById('lemStatus')?.value,
      observacoes=document.getElementById('lemObservacoes')?.value.trim();
    if(!titulo||!data||!prioridade){showToast('Preencha os campos obrigatórios.','warning');return;}
    const btn=document.getElementById('btnSaveLem');btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Salvando...';
    const payload={titulo,descricao:descricao||null,data_lembrete:data,horario:horario||null,prioridade,status:status||'pendente',observacoes:observacoes||null,user_id:user.id};
    try{
      if(editingId){delete payload.user_id;const{error}=await window._sb.from('lembretes').update(payload).eq('id',editingId);if(error)throw error;showToast('Atualizado!');}
      else{const{error}=await window._sb.from('lembretes').insert(payload);if(error)throw error;showToast('Criado!');}
      closeModals();await loadLembretes();
    }catch(err){showToast('Erro: '+err.message,'error');}
    finally{btn.disabled=false;btn.innerHTML='Salvar lembrete';}
  }

  window.concluirLem=async(id)=>{try{const{error}=await window._sb.from('lembretes').update({status:'concluido'}).eq('id',id);if(error)throw error;showToast('Concluído!');await loadLembretes();}catch(err){showToast('Erro: '+err.message,'error');}};
  window.viewLemDetalhe=(id)=>{const l=allLembretes.find(x=>x.id===id);if(!l)return;detalheItem=l;
    document.getElementById('lemDetalheContent').innerHTML=`<div class="detail-grid">
      <div class="detail-item full"><span class="detail-label">Título</span><span class="detail-value" style="font-size:1.05rem;font-weight:600">${esc(l.titulo)}</span></div>
      <hr class="detail-divider">
      <div class="detail-item full"><span class="detail-label">Descrição</span><span class="detail-value">${l.descricao?esc(l.descricao):'<em style="color:var(--color-text-subtle)">Sem descrição</em>'}</span></div>
      <div class="detail-item"><span class="detail-label">Data</span><span class="detail-value">${formatDate(l.data_lembrete)}</span></div>
      <div class="detail-item"><span class="detail-label">Horário</span><span class="detail-value">${l.horario?l.horario.slice(0,5):'—'}</span></div>
      <div class="detail-item"><span class="detail-label">Prioridade</span><span class="detail-value">${priorBadge(l.prioridade)}</span></div>
      <div class="detail-item"><span class="detail-label">Status</span><span class="detail-value">${statusBadge(l.status)} ${getSituacao(l)}</span></div>
      <hr class="detail-divider">
      <div class="detail-item full"><span class="detail-label">Observações</span><span class="detail-value">${l.observacoes?esc(l.observacoes):'<em style="color:var(--color-text-subtle)">Nenhuma</em>'}</span></div>
    </div>`;
    document.getElementById('modalLemDetalhe').classList.add('open');};
  window.editLem=(id)=>{const l=allLembretes.find(x=>x.id===id);if(!l)return;editingId=id;
    document.getElementById('modalLemTitle').textContent='Editar lembrete';
    document.getElementById('lemTitulo').value=l.titulo;document.getElementById('lemDescricao').value=l.descricao||'';
    document.getElementById('lemData').value=l.data_lembrete;document.getElementById('lemHorario').value=l.horario||'';
    document.getElementById('lemPrioridade').value=l.prioridade;document.getElementById('lemStatus').value=l.status;
    document.getElementById('lemObservacoes').value=l.observacoes||'';
    document.getElementById('modalLem').classList.add('open');};
  window.deleteLem=(id,titulo)=>{showConfirm({title:'Excluir lembrete',text:`"<strong>${titulo}</strong>" será excluído.`,
    onConfirm:async()=>{try{const{error}=await window._sb.from('lembretes').delete().eq('id',id);if(error)throw error;showToast('Excluído.');await loadLembretes();}catch(err){showToast('Erro: '+err.message,'error');}}});};

  function openNewModal(){editingId=null;document.getElementById('modalLemTitle').textContent='Novo lembrete';document.getElementById('formLem').reset();document.getElementById('lemData').value=TODAY;document.getElementById('modalLem').classList.add('open');}
  function closeModals(){document.getElementById('modalLem').classList.remove('open');document.getElementById('modalLemDetalhe').classList.remove('open');}

  document.getElementById('btnNovoLembrete')?.addEventListener('click',openNewModal);
  document.getElementById('btnSaveLem')?.addEventListener('click',saveLem);
  document.getElementById('btnCancelLem')?.addEventListener('click',closeModals);
  document.getElementById('btnCloseModalLem')?.addEventListener('click',closeModals);
  document.getElementById('btnCloseLemDetalhe')?.addEventListener('click',closeModals);
  document.getElementById('btnCloseLemDetalheFooter')?.addEventListener('click',closeModals);
  document.getElementById('btnEditarLemDetalhe')?.addEventListener('click',()=>{closeModals();if(detalheItem)window.editLem(detalheItem.id);});
  document.getElementById('modalLem')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModals();});
  document.getElementById('modalLemDetalhe')?.addEventListener('click',e=>{if(e.target===e.currentTarget)closeModals();});

  const refresh=()=>renderTable(applyFilters());
  document.getElementById('searchLem')?.addEventListener('input',debounce(refresh));
  document.getElementById('filterLemStatus')?.addEventListener('change',refresh);
  document.getElementById('filterLemPrioridade')?.addEventListener('change',refresh);
  document.getElementById('filterLemPeriodo')?.addEventListener('change',refresh);
  document.getElementById('btnLimparLemFiltros')?.addEventListener('click',()=>{['searchLem','filterLemStatus','filterLemPrioridade','filterLemPeriodo'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});refresh();});

  await loadLembretes();
})();

