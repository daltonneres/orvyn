/* Painel Orvyn: login + dashboard + leads (os dados vêm do painel-dados.js) */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = s => String(s || '').replace(/\D/g, '');
  const fmtD = s => { try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch (e) { return s || '' } };
  const phone = t => { const p = digits(t); return p.length <= 11 ? '55' + p : p };
  const wa = (n, t) => `https://wa.me/${n}?text=${encodeURIComponent(t)}`;
  const STATUS = { novo: 'Novo', contatado: 'Contatado', agendado: 'Agendado', concluido: 'Concluído', perdido: 'Perdido' };

  /* ---------- tema ---------- */
  const themeBtn = $('#themeToggle');
  const setTheme = t => {
    if (t === 'escuro') document.documentElement.dataset.theme = 'escuro'; else delete document.documentElement.dataset.theme;
    themeBtn.textContent = t === 'escuro' ? '☀️' : '🌙';
    try { localStorage.setItem('orvyn_tema', t) } catch (e) {}
  };
  let saved = null; try { saved = localStorage.getItem('orvyn_tema') } catch (e) {}
  setTheme(saved || (matchMedia('(prefers-color-scheme:dark)').matches ? 'escuro' : 'claro'));
  themeBtn.onclick = () => setTheme(document.documentElement.dataset.theme === 'escuro' ? 'claro' : 'escuro');

  /* ---------- dados (login e leads): vêm do painel-dados.js ---------- */
  const D = window.PAINEL_DADOS || { ready: false };
  const lockErr = $('#lockError');
  const showErr = (t, ok) => { lockErr.textContent = t; lockErr.classList.toggle('ok', !!ok); lockErr.classList.remove('hidden') };
  if (!D.ready) {
    showErr('O banco de dados ainda não foi conectado. Para ver o layout com dados de exemplo, abra painel.html?demo');
    $('#lockSubmit').disabled = true;
    return;
  }

  /* ---------- login ---------- */
  $('#lockForm').onsubmit = async e => {
    e.preventDefault();
    lockErr.classList.add('hidden');
    const btn = $('#lockSubmit'); btn.disabled = true;
    try { await D.signIn($('#lockEmail').value.trim(), $('#lockPassword').value) }
    catch (err) { showErr(err.message || 'Algo deu errado. Tente de novo.') }
    btn.disabled = false;
  };
  $('#lockForgot').onclick = async () => {
    const mail = $('#lockEmail').value.trim();
    if (!mail) return showErr('Digite seu e-mail no campo acima primeiro.');
    try { await D.reset(mail); showErr('Enviamos um e-mail com o link para trocar a senha.', true) }
    catch (err) { showErr(err.message || 'Algo deu errado. Tente de novo.') }
  };
  $('#btnLogout').onclick = () => D.signOut();

  /* ---------- menu ---------- */
  let view = 'dashboard', filter = 'todos', leads = [], unsub = null;
  const menu = $('#sidebarMenu'), toggle = $('#navToggle');
  toggle.onclick = () => { menu.classList.toggle('open'); toggle.classList.toggle('open') };
  const go = (v, f) => {
    view = v; if (f) filter = f;
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    menu.classList.remove('open'); toggle.classList.remove('open');
    render();
  };
  $$('.nav-btn').forEach(b => b.onclick = () => go(b.dataset.view));

  /* ---------- telas ---------- */
  const by = s => leads.filter(l => l.status === s);
  const when = l => `${l.data || ''} ${l.hora || ''}`;
  const lead = l => `
    <article class="lead st-${esc(l.status)}" data-id="${esc(l.id)}">
      <div class="lead-top"><div><h3>${esc(l.nome)}</h3>
        <div class="lead-meta">${esc(l.tel)} · pediu ${esc(fmtD(l.data))} às ${esc(l.hora)}</div></div>
        <span class="stamp ${esc(l.status)}">${STATUS[l.status] || esc(l.status)}</span></div>
      ${l.assunto ? `<p class="lead-sub">${esc(l.assunto)}</p>` : ''}
      <div class="lead-ctl">
        <a class="btn btn-ghost btn-sm" data-act="contact" href="${wa(phone(l.tel), `Olá, ${l.nome}! Aqui é da Orvyn. Recebemos o seu pedido de conversa. Pode ser ${fmtD(l.data)} às ${l.hora}?`)}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
        <input class="input meet" type="url" placeholder="Cole o link do Meet" value="${esc(l.meet || '')}" aria-label="Link do Meet">
        <a class="btn btn-ghost btn-sm" href="https://meet.google.com/new" target="_blank" rel="noopener">Criar Meet</a>
        <button class="btn btn-primary btn-sm" data-act="send">Confirmar e enviar link</button>
        <select class="input sel" data-act="status" aria-label="Status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${k === l.status ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <button class="btn btn-danger btn-sm" data-act="del">Excluir</button>
      </div>
    </article>`;

  function render() {
    const novos = by('novo').length, nc = $('#newCount');
    nc.textContent = novos; nc.classList.toggle('hidden', !novos);
    const main = $('#main');
    if (view === 'leads') {
      const list = filter === 'todos' ? leads : by(filter);
      main.innerHTML = `<header class="view-header"><h1 class="view-title">Leads</h1>
        <p class="view-desc">Pessoas que preencheram o pedido de conversa no site. Chame, combine o horário e envie o link da chamada.</p></header>
        <div class="chips">${['todos', ...Object.keys(STATUS)].map(k => `<button class="chip${k === filter ? ' on' : ''}" data-filter="${k}">${k === 'todos' ? 'Todos' : STATUS[k]}${k === 'todos' ? ` (${leads.length})` : ` (${by(k).length})`}</button>`).join('')}</div>
        ${list.length ? list.map(lead).join('') : '<p class="empty">Nenhum lead aqui ainda.</p>'}`;
    } else {
      const prox = by('agendado').sort((a, b) => when(a).localeCompare(when(b)));
      const stat = (k, label, cls) => `<button class="stat-card" data-go="${k}"><span class="stat-label">${label}</span><span class="stat-value ${cls}">${by(k).length}</span></button>`;
      main.innerHTML = `<header class="view-header"><h1 class="view-title">Painel</h1><p class="view-desc">Resumo dos pedidos de conversa que chegam pelo site.</p></header>
        <div class="cards-grid">${stat('novo', 'Novos', 'novo')}${stat('contatado', 'Contatados', 'contatado')}${stat('agendado', 'Agendados', 'agendado')}${stat('concluido', 'Concluídos', '')}</div>
        <h2 class="sec-title">Próximos agendamentos</h2>
        ${prox.length ? prox.map(lead).join('') : '<p class="empty">Nenhuma conversa agendada.</p>'}
        <h2 class="sec-title">Leads novos</h2>
        ${novos ? by('novo').slice(0, 5).map(lead).join('') : '<p class="empty">Nenhum lead novo no momento.</p>'}`;
    }
  }

  /* ---------- ações ---------- */
  const upd = (id, data) => Promise.resolve(D.update(id, data)).catch(() => alert('Não foi possível salvar. Verifique a conexão.'));
  $('#main').addEventListener('click', e => {
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; return render() }
    const g = e.target.closest('[data-go]'); if (g) return go('leads', g.dataset.go);
    const card = e.target.closest('.lead'), act = e.target.closest('[data-act]');
    if (!card || !act) return;
    const l = leads.find(x => x.id === card.dataset.id); if (!l) return;
    if (act.dataset.act === 'contact' && l.status === 'novo') upd(l.id, { status: 'contatado' });
    if (act.dataset.act === 'send') {
      const inp = card.querySelector('.meet'), v = inp.value.trim();
      if (!/^https?:\/\//.test(v)) { inp.focus(); inp.placeholder = 'Cole aqui o link do Meet primeiro'; return }
      window.open(wa(phone(l.tel), `Olá, ${l.nome}! Aqui é da Orvyn. Seu bate-papo com Guilherme e Dalton está confirmado para ${fmtD(l.data)} às ${l.hora}. É só entrar pelo link: ${v} . Qualquer coisa, é só responder aqui. Até lá!`), '_blank');
      upd(l.id, { meet: v, status: 'agendado' });
    }
    if (act.dataset.act === 'del' && confirm(`Excluir o lead de ${l.nome}?`)) Promise.resolve(D.remove(l.id)).catch(() => alert('Não foi possível excluir.'));
  });
  $('#main').addEventListener('change', e => {
    const s = e.target.closest('[data-act=status]'), card = e.target.closest('.lead');
    if (s && card) upd(card.dataset.id, { status: s.value });
  });

  /* ---------- entrada: só depois de tudo definido ---------- */
  D.onAuth(u => {
    if (u) {
      $('#lockScreen').classList.add('hidden'); $('#app').classList.remove('hidden');
      $('#userMail').textContent = u.email; $('#lockForm').reset();
      unsub = D.listen(
        list => { leads = list; render() },
        () => { $('#main').innerHTML = '<p class="empty">Não foi possível carregar os leads. Confira a conexão e as permissões.</p>' }
      );
    } else {
      if (unsub) { unsub(); unsub = null }
      leads = [];
      $('#app').classList.add('hidden'); $('#lockScreen').classList.remove('hidden');
    }
  });
})();
