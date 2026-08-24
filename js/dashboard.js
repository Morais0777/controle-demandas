// dashboard.js — sem módulos ES6
(async function() {
  const user = await initPage('Dashboard');
  if (!user) return;

  let chartDem = null, chartPrior = null;

  async function loadDashboard() {
    try {
      const [demRes, solRes, lemRes] = await Promise.all([
        window._sb.from('demandas').select('*').order('created_at', { ascending: false }),
        window._sb.from('solicitacoes').select('*').order('created_at', { ascending: false }),
        window._sb.from('lembretes').select('*').order('data_lembrete', { ascending: true })
      ]);
      if (demRes.error) throw demRes.error;
      if (solRes.error) throw solRes.error;
      if (lemRes.error) throw lemRes.error;

      const demandas = demRes.data || [], solicitacoes = solRes.data || [], lembretes = lemRes.data || [];
      renderKPIs(demandas, solicitacoes, lembretes);
      renderCharts(demandas);
      renderRecentDemandas(demandas.slice(0, 5));
      renderRecentLembretes(lembretes);
      checkTodayReminders(lembretes);
    } catch(err) {
      console.error(err);
      showToast('Erro ao carregar dados.', 'error');
    }
  }

  function renderKPIs(demandas, solicitacoes, lembretes) {
    const today  = new Date().toISOString().slice(0,10);
    const in7    = new Date(Date.now() + 7*86400000).toISOString().slice(0,10);
    const set = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
    set('kpiTotalDemandas', demandas.length);
    set('kpiDemPendentes',  demandas.filter(d => d.status==='pendente'||d.status==='em_andamento').length);
    set('kpiDemConcluidas', demandas.filter(d => d.status==='concluida').length);
    set('kpiSolAbertas',    solicitacoes.filter(s => s.status==='aberta'||s.status==='em_andamento').length);
    set('kpiSolConcluidas', solicitacoes.filter(s => s.status==='concluida').length);
    const lemPend = lembretes.filter(l => l.status==='pendente');
    set('kpiLemProximos',   lemPend.filter(l => l.data_lembrete>=today && l.data_lembrete<=in7).length);
    set('kpiLemAtrasados',  lemPend.filter(l => l.data_lembrete<today).length);
  }

  function renderCharts(demandas) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94A3B8' : '#64748B';
    if (chartDem)   { chartDem.destroy();   chartDem   = null; }
    if (chartPrior) { chartPrior.destroy(); chartPrior = null; }
    const ctx1 = document.getElementById('chartDemandas')?.getContext('2d');
    if (ctx1) {
      chartDem = new Chart(ctx1, {
        type: 'doughnut',
        data: { labels: ['Pendente','Em andamento','Concluída','Cancelada'],
          datasets: [{ data: ['pendente','em_andamento','concluida','cancelada'].map(s=>demandas.filter(d=>d.status===s).length),
            backgroundColor:['#F59E0B','#3B82F6','#10B981','#94A3B8'], borderWidth:0, hoverOffset:4 }] },
        options: { responsive:true, maintainAspectRatio:false, cutout:'65%',
          plugins: { legend: { position:'bottom', labels:{ color:textColor, padding:16, usePointStyle:true } } } }
      });
    }
    const ctx2 = document.getElementById('chartPrioridade')?.getContext('2d');
    if (ctx2) {
      chartPrior = new Chart(ctx2, {
        type: 'bar',
        data: { labels:['Baixa','Média','Alta','Urgente'],
          datasets:[{ data:['baixa','media','alta','urgente'].map(p=>demandas.filter(d=>d.prioridade===p).length),
            backgroundColor:['#10B981','#3B82F6','#F59E0B','#EF4444'], borderRadius:6, borderWidth:0 }] },
        options: { responsive:true, maintainAspectRatio:false,
          scales: { x:{ticks:{color:textColor},grid:{display:false}}, y:{ticks:{color:textColor,stepSize:1},grid:{color:isDark?'#334155':'#F1F5F9'}} },
          plugins: { legend:{display:false} } }
      });
    }
  }

  function renderRecentDemandas(list) {
    const el = document.getElementById('recentDemandas'); if (!el) return;
    if (!list.length) { el.innerHTML = '<div class="empty-state"><p class="empty-state-title">Nenhuma demanda</p></div>'; return; }
    el.innerHTML = list.map(d => {
      const over = isOverdue(d.prazo, d.status);
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-border-subtle)">
        <div style="flex:1;min-width:0"><div style="font-size:.875rem;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(d.titulo)}</div>
        <div style="font-size:.75rem;color:var(--color-text-muted)">${esc(d.responsavel)} · ${formatDate(d.prazo)}${over?' <span style="color:var(--color-danger)">● Atrasada</span>':''}</div></div>
        <div style="margin-left:12px">${statusBadge(d.status)}</div></div>`;
    }).join('');
  }

  function renderRecentLembretes(lembretes) {
    const el = document.getElementById('recentLembretes'); if (!el) return;
    const today = new Date().toISOString().slice(0,10);
    const pending = lembretes.filter(l => l.status==='pendente' && l.data_lembrete>=today).slice(0,5);
    if (!pending.length) { el.innerHTML = '<div class="empty-state"><p class="empty-state-title">Sem lembretes próximos</p></div>'; return; }
    el.innerHTML = pending.map(l => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--color-border-subtle)">
        <div><div style="font-size:.875rem;font-weight:500">${esc(l.titulo)}</div>
        <div style="font-size:.75rem;color:var(--color-text-muted)">${formatDate(l.data_lembrete)}${l.horario?' às '+l.horario.slice(0,5):''}</div></div>
        <div style="margin-left:12px">${isToday(l.data_lembrete)?'<span class="badge badge-urgente">Hoje</span>':priorBadge(l.prioridade)}</div>
      </div>`).join('');
  }

  function checkTodayReminders(lembretes) {
    const today = new Date().toISOString().slice(0,10);
    const todayP = lembretes.filter(l => l.data_lembrete===today && l.status==='pendente');
    const el = document.getElementById('reminderAlert'); if (!el) return;
    if (todayP.length) {
      el.style.display = 'flex'; el.className = 'reminder-alert';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      <span>Você tem <strong>${todayP.length} lembrete${todayP.length>1?'s':''}</strong> para hoje. <a href="lembretes.html" style="margin-left:8px;font-weight:600;color:var(--color-primary)">Ver lembretes</a></span>`;
    }
  }

  await loadDashboard();
})();

