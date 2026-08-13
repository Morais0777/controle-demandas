// relatorios.js — sem módulos ES6
(async function() {
  renderLayout('relatorios');
  const user = await initPage('Relatórios');
  if (!user) return;

  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
  const ultimoDia   = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10);
  document.getElementById('relDataInicio').value = primeiroDia;
  document.getElementById('relDataFim').value    = ultimoDia;

  document.getElementById('btnGerarRelatorio')?.addEventListener('click', gerarRelatorio);
  document.getElementById('btnImprimir')?.addEventListener('click', () => window.print());

  async function gerarRelatorio() {
    const dataInicio=document.getElementById('relDataInicio')?.value;
    const dataFim=document.getElementById('relDataFim')?.value;
    const statusFiltro=document.getElementById('relStatus')?.value||'';
    const respFiltro=document.getElementById('relResponsavel')?.value.trim().toLowerCase()||'';
    const inclDem=document.getElementById('inclDemandas')?.checked;
    const inclSol=document.getElementById('inclSolicitacoes')?.checked;
    const inclLem=document.getElementById('inclLembretes')?.checked;

    if(!dataInicio||!dataFim){showToast('Selecione as datas.','warning');return;}
    if(dataInicio>dataFim){showToast('Data inicial deve ser anterior à final.','warning');return;}
    if(!inclDem&&!inclSol&&!inclLem){showToast('Selecione ao menos um tipo.','warning');return;}

    const btn=document.getElementById('btnGerarRelatorio');
    btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Gerando...';

    try {
      const [demRes,solRes,lemRes] = await Promise.all([
        inclDem ? window._sb.from('demandas').select('*').gte('created_at',dataInicio+'T00:00:00').lte('created_at',dataFim+'T23:59:59').order('created_at') : Promise.resolve({data:[]}),
        inclSol ? window._sb.from('solicitacoes').select('*').gte('created_at',dataInicio+'T00:00:00').lte('created_at',dataFim+'T23:59:59').order('created_at') : Promise.resolve({data:[]}),
        inclLem ? window._sb.from('lembretes').select('*').gte('data_lembrete',dataInicio).lte('data_lembrete',dataFim).order('data_lembrete') : Promise.resolve({data:[]})
      ]);
      if(demRes.error) throw demRes.error;
      if(solRes.error) throw solRes.error;
      if(lemRes.error) throw lemRes.error;

      const filter=(item,hasResp)=>(!statusFiltro||item.status===statusFiltro)&&(!respFiltro||!hasResp||item.responsavel?.toLowerCase().includes(respFiltro));
      const demandas=(demRes.data||[]).filter(d=>filter(d,true));
      const solicitacoes=(solRes.data||[]).filter(s=>filter(s,true));
      const lembretes=(lemRes.data||[]).filter(l=>filter(l,false));

      renderRelatorio({demandas,solicitacoes,lembretes,inclDem,inclSol,inclLem,dataInicio,dataFim});
    } catch(err){ showToast('Erro: '+err.message,'error'); }
    finally { btn.disabled=false; btn.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Gerar relatório'; }
  }

  function renderRelatorio({demandas,solicitacoes,lembretes,inclDem,inclSol,inclLem,dataInicio,dataFim}) {
    const area=document.getElementById('relatorioArea'); area.style.display='block';
    const total=demandas.length+solicitacoes.length+lembretes.length;
    const tipos=[inclDem&&'Demandas',inclSol&&'Solicitações',inclLem&&'Lembretes'].filter(Boolean);

    document.getElementById('printTitle').textContent='Relatório: '+tipos.join(' + ');
    document.getElementById('printSubtitle').textContent='Período: '+formatDate(dataInicio)+' a '+formatDate(dataFim);
    document.getElementById('printData').textContent='Período: '+formatDate(dataInicio)+' a '+formatDate(dataFim);
    document.getElementById('printGerado').textContent='Gerado em: '+new Date().toLocaleString('pt-BR');

    document.getElementById('resumoContent').innerHTML=
      (inclDem?`<div style="text-align:center"><div style="font-size:1.8rem;font-weight:700;color:var(--color-primary)">${demandas.length}</div><div style="font-size:.8rem;color:var(--color-text-muted)">Demandas</div></div>`:'')+
      (inclSol?`<div style="text-align:center"><div style="font-size:1.8rem;font-weight:700;color:var(--color-info)">${solicitacoes.length}</div><div style="font-size:.8rem;color:var(--color-text-muted)">Solicitações</div></div>`:'')+
      (inclLem?`<div style="text-align:center"><div style="font-size:1.8rem;font-weight:700;color:var(--color-warning)">${lembretes.length}</div><div style="font-size:.8rem;color:var(--color-text-muted)">Lembretes</div></div>`:'')+
      `<div style="text-align:center"><div style="font-size:1.8rem;font-weight:700">${total}</div><div style="font-size:.8rem;color:var(--color-text-muted)">Total</div></div>`;

    document.getElementById('relEmptyState').style.display=total===0?'block':'none';

    const secDem=document.getElementById('secaoDemandas');
    if(inclDem&&demandas.length>0){secDem.style.display='block';document.getElementById('countDemandas').textContent=demandas.length;
      document.getElementById('tbodyRelDemandas').innerHTML=demandas.map(d=>{const over=isOverdue(d.prazo,d.status);return`<tr><td>${esc(d.titulo)}</td><td>${esc(d.responsavel)}</td><td>${priorBadge(d.prioridade)}</td><td>${statusBadge(d.status)}</td><td style="font-size:.8rem;color:var(--color-text-muted)">${formatDate(d.prazo)}</td><td>${over?'<span class="badge badge-atrasado">Atrasada</span>':'<span style="font-size:.8rem;color:var(--color-text-subtle)">No prazo</span>'}</td></tr>`;}).join('');}
    else{secDem.style.display='none';}

    const secSol=document.getElementById('secaoSolicitacoes');
    if(inclSol&&solicitacoes.length>0){secSol.style.display='block';document.getElementById('countSolicitacoes').textContent=solicitacoes.length;
      document.getElementById('tbodyRelSolicitacoes').innerHTML=solicitacoes.map(s=>`<tr><td>${esc(s.titulo)}</td><td>${esc(s.solicitante)}</td><td>${esc(s.responsavel)}</td><td>${priorBadge(s.prioridade)}</td><td>${statusBadge(s.status)}</td><td style="font-size:.8rem;color:var(--color-text-muted)">${formatDate(s.prazo)}</td></tr>`).join('');}
    else{secSol.style.display='none';}

    const secLem=document.getElementById('secaoLembretes');
    if(inclLem&&lembretes.length>0){secLem.style.display='block';document.getElementById('countLembretes').textContent=lembretes.length;
      document.getElementById('tbodyRelLembretes').innerHTML=lembretes.map(l=>`<tr><td>${esc(l.titulo)}</td><td style="font-size:.8rem;color:var(--color-text-muted)">${formatDate(l.data_lembrete)}</td><td style="font-size:.8rem;color:var(--color-text-muted)">${l.horario?l.horario.slice(0,5):'—'}</td><td>${priorBadge(l.prioridade)}</td><td>${statusBadge(l.status)}</td></tr>`).join('');}
    else{secLem.style.display='none';}

    document.getElementById('btnImprimir').style.display='flex';
    area.scrollIntoView({behavior:'smooth',block:'start'});
    showToast(`Relatório com ${total} registro${total!==1?'s':''}.`, total>0?'success':'info');
  }
})();


