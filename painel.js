/* Painel Orvyn: login + início, leads, projetos, financeiro e agenda (dados em painel-dados.js) */
(() => {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = s => String(s || '').replace(/\D/g, '');
  const fmtD = s => { try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch (e) { return s || '' } };
  const phone = t => { const p = digits(t); return p.length <= 11 ? '55' + p : p };
  const wa = (n, t) => `https://wa.me/${n}?text=${encodeURIComponent(t)}`;
  const brl = n => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const hoje = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const STATUS = { novo: 'Novo', contatado: 'Contatado', agendado: 'Agendado', concluido: 'Concluído', perdido: 'Perdido' };
  const PST = { andamento: 'Em andamento', aguardando: 'Aguardando', concluido: 'Concluído' };
  const PCLS = { andamento: 'contatado', aguardando: 'novo', concluido: 'concluido' };
  const PESSOAS = { guilherme: 'Guilherme', dalton: 'Dalton', ambos: 'Os dois' };
  const EQUIPE = { 'guilherme.souza@orvyn.com': 'guilherme', 'dalton.neres@orvyn.com': 'dalton' };
  const COLS = ['leads', 'clientes', 'projetos', 'portfolio', 'financeiro', 'agenda'];
  const PTYPES = { identidade: 'Identidade visual', landing: 'Landing page', site: 'Site', sistema: 'Sistema ou app', video: 'Vídeo', social: 'Social media', outro: 'Outro' };
  const validUrl = (value, optional = false) => {
    if (!value && optional) return '';
    try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch (_) { return ''; }
  };
  const opts = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${k}"${k === cur ? ' selected' : ''}>${v}</option>`).join('');

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

  /* ---------- login ---------- */
  const D = window.PAINEL_DADOS || { ready: false };
  const lockErr = $('#lockError');
  const showErr = (t, ok) => { lockErr.textContent = t; lockErr.classList.toggle('ok', !!ok); lockErr.classList.remove('hidden') };
  if (!D.ready) { showErr('O banco de dados não foi conectado. Confira o firebase-config.js.'); $('#lockSubmit').disabled = true; return; }
  $('#lockForm').onsubmit = async e => {
    e.preventDefault(); lockErr.classList.add('hidden');
    const btn = $('#lockSubmit'); btn.disabled = true;
    try { await D.signIn($('#lockEmail').value.trim(), $('#lockPassword').value) } catch (err) { showErr(err.message) }
    btn.disabled = false;
  };
  $('#lockForgot').onclick = async () => {
    const mail = $('#lockEmail').value.trim();
    if (!mail) return showErr('Digite seu e-mail no campo acima primeiro.');
    try { await D.reset(mail); showErr('Enviamos um e-mail com o link para trocar a senha.', true) } catch (err) { showErr(err.message) }
  };
  $('#btnLogout').onclick = () => D.signOut();

  /* ---------- estado e menu ---------- */
  let view = 'inicio', filter = 'todos', mine = true, mes = hoje().slice(0, 7), eu = null, nome = '', unsubs = [];
  let data = { leads: [], clientes: [], projetos: [], portfolio: [], financeiro: [], agenda: [] };
  setInterval(() => { const clock = $('#panelClock'); if (clock) clock.textContent = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' }); }, 60000);
  const menu = $('#sidebarMenu'), toggle = $('#navToggle');
  toggle.onclick = () => { menu.classList.toggle('open'); toggle.classList.toggle('open') };
  const go = (v, f) => {
    view = v; if (f) filter = f;
    $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    menu.classList.remove('open'); toggle.classList.remove('open');
    render();
  };
  $$('.nav-btn').forEach(b => b.onclick = () => go(b.dataset.view));

  /* ---------- peças ---------- */
  const mineOf = a => mine && eu ? a.filter(x => !x.resp || x.resp === eu || x.resp === 'ambos') : a;
  const by = s => data.leads.filter(l => l.status === s);
  const quem = r => PESSOAS[r] || '';
  const head = (t, d, chips) => `<header class="view-header"><div class="view-heading"><div><h1 class="view-title">${t}</h1><p class="view-desc">${d}</p></div><time id="panelClock" class="panel-clock">${new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}</time></div></header>` +
    (chips ? `<div class="chips"><button class="chip${mine ? ' on' : ''}" data-mine="1">Só meus</button><button class="chip${mine ? '' : ' on'}" data-mine="0">Todos</button></div>` : '');
  const form = (col, campos) => `<form class="fgrid" data-form="${col}">${campos}<select class="input" name="resp" aria-label="Responsável">${opts(PESSOAS, eu)}</select><button class="btn btn-primary" type="submit">Adicionar</button></form>`;
  const item = (col, x, cls, titulo, meta, stamp, ctl) => `
    <article class="lead st-${cls}" data-col="${col}" data-id="${esc(x.id)}">
      <div class="lead-top"><div><h3>${esc(titulo)}</h3><div class="lead-meta">${meta}</div></div>${stamp}</div>
      <div class="lead-ctl">${ctl}<button class="btn btn-danger btn-sm" data-act="del">Excluir</button></div>
    </article>`;
  const meta = (...p) => p.filter(Boolean).map(esc).join(' · ');
  const proj = p => item('projetos', p, PCLS[p.status] || 'novo', p.nome, meta(p.clienteNome || p.cliente, p.valor && brl(p.valor), p.mensalidade ? brl(p.mensalidade) + '/mês' : '', p.prazo && 'prazo ' + fmtD(p.prazo), quem(p.resp)),
    `<span class="stamp ${PCLS[p.status] || 'novo'}">${PST[p.status] || ''}</span>`,
    `<select class="input sel" data-act="status" aria-label="Status">${opts(PST, p.status)}</select>`);
  const portfolioItem = p => item('portfolio', p, p.publicado ? 'agendado' : 'novo', p.nome,
    meta(PTYPES[p.categoria] || p.categoria || 'Projeto', quem(p.resp)),
    `<span class="stamp ${p.publicado ? 'agendado' : 'novo'}">${p.publicado ? 'Publicado' : 'Rascunho'}</span>`,
    `${p.descricao ? `<p class="portfolio-copy">${esc(p.descricao)}</p>` : ''}${p.entregas ? `<p class="portfolio-copy"><b>O que foi criado:</b> ${esc(p.entregas)}</p>` : ''}${p.link ? `<a class="btn btn-ghost btn-sm" href="${esc(p.link)}" target="_blank" rel="noopener">Abrir projeto</a>` : ''}<button class="btn btn-ghost btn-sm" data-act="edit-portfolio">Editar</button><button class="btn btn-primary btn-sm" data-act="publish">${p.publicado ? 'Tirar do site' : 'Publicar no site'}</button><form class="portfolio-edit hidden" data-portfolio-edit><input class="input" name="nome" value="${esc(p.nome)}" placeholder="Nome do projeto" required><select class="input" name="categoria">${opts(PTYPES,p.categoria)}</select><textarea class="input textarea" name="descricao" placeholder="Descrição pública" required>${esc(p.descricao)}</textarea><textarea class="input textarea" name="entregas" placeholder="O que foi criado?">${esc(p.entregas)}</textarea><input class="input" name="link" type="url" value="${esc(p.link)}" placeholder="Link público para acessar o projeto"><button class="btn btn-primary btn-sm" type="submit">Salvar edição</button><button class="btn btn-ghost btn-sm" data-act="cancel-edit" type="button">Cancelar</button></form><form class="media-form" data-portfolio-media><input class="input" name="mediaNome" placeholder="Nome da mídia" required><input class="input" name="mediaUrl" type="url" placeholder="Link direto da mídia (https://...)" required><select class="input" name="mediaTipo" aria-label="Tipo de mídia"><option value="imagem">Imagem / logo</option><option value="video">Vídeo direto</option><option value="link">Link / protótipo</option></select><button class="btn btn-ghost btn-sm" type="submit">Adicionar mídia</button></form>${(p.midias||[]).map(x=>`<a class="btn btn-ghost btn-sm" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.nome)}</a>`).join('')}`);
  const fin = f => item('financeiro', f, f.tipo, f.descricao, meta(fmtD(f.data), quem(f.resp)),
    `<span class="stamp ${f.tipo === 'entrada' ? 'agendado' : 'perdido'}">${f.tipo === 'entrada' ? '+' : '−'} ${brl(f.valor)}</span>`, '');
  const ag = a => { const t = hoje(), c = a.data === t ? 'agendado' : a.data < t ? 'concluido' : 'novo';
    return item('agenda', a, c, a.titulo, meta(fmtD(a.data) + (a.hora ? ' às ' + a.hora : ''), quem(a.resp)),
      a.data === t ? '<span class="stamp agendado">Hoje</span>' : a.data < t ? '<span class="stamp concluido">Passado</span>' : '', '') };
  const lead = l => item('leads', l, l.status, l.nome, meta(l.tel, 'pediu ' + fmtD(l.data) + ' às ' + l.hora),
    `<span class="stamp ${esc(l.status)}">${STATUS[l.status] || esc(l.status)}</span>`, '').replace('<div class="lead-ctl">', `${l.assunto ? `<p class="lead-sub" style="width:100%">${esc(l.assunto)}</p>` : ''}<div class="lead-ctl">
        <a class="btn btn-ghost btn-sm" data-act="contact" href="${wa(phone(l.tel), `Olá, ${l.nome}! Aqui é da Orvyn. Recebemos o seu pedido de conversa. Pode ser ${fmtD(l.data)} às ${l.hora}?`)}" target="_blank" rel="noopener">Chamar no WhatsApp</a>
        <input class="input meet" type="url" placeholder="Cole o link do Meet" value="${esc(l.meet || '')}" aria-label="Link do Meet">
        <a class="btn btn-ghost btn-sm" href="https://meet.google.com/new" target="_blank" rel="noopener">Criar Meet</a>
        <button class="btn btn-primary btn-sm" data-act="send">Confirmar e enviar link</button>
        <select class="input sel" data-act="status" aria-label="Status">${opts(STATUS, l.status)}</select>`);
  const empty = t => `<p class="empty">${t}</p>`;
  const tile = (v, f, label, val, cls) => `<button class="stat-card" data-go="${v}"${f ? ` data-f="${f}"` : ''}><span class="stat-label">${label}</span><span class="stat-value ${cls}">${val}</span></button>`;
  const soma = (arr, tipo) => arr.filter(f => f.tipo === tipo).reduce((s, f) => s + (Number(f.valor) || 0), 0);
  const agFut = () => mineOf(data.agenda).filter(a => a.data >= hoje()).sort((a, b) => (a.data + (a.hora || '')).localeCompare(b.data + (b.hora || '')));

  /* ---------- telas ---------- */
  function render() {
    const novos = by('novo').length, nc = $('#newCount');
    nc.textContent = novos; nc.classList.toggle('hidden', !novos);
    const m = $('#main');
    const clock = new Date().toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });
    const clockEl = $('#panelClock'); if (clockEl) clockEl.textContent = clock;
    if (view === 'leads') {
      const list = filter === 'todos' ? data.leads : by(filter);
      m.innerHTML = head('Leads', 'Pessoas que pediram conversa pelo site. Chame, combine o horário e envie o link da chamada.') +
        `<div class="chips">${['todos', ...Object.keys(STATUS)].map(k => `<button class="chip${k === filter ? ' on' : ''}" data-filter="${k}">${k === 'todos' ? 'Todos' : STATUS[k]} (${k === 'todos' ? data.leads.length : by(k).length})</button>`).join('')}</div>` +
        (list.length ? list.map(lead).join('') : empty('Nenhum lead aqui ainda.'));
    } else if (view === 'clientes') {
      const l = mineOf(data.clientes);
      m.innerHTML = head('Clientes', 'Cadastro e responsáveis pelos relacionamentos.', 1) +
        form('clientes', '<input class="input" name="nome" placeholder="Nome do cliente" required><input class="input" name="tel" type="tel" placeholder="Telefone"><input class="input" name="descricao" placeholder="O que estamos desenvolvendo">') +
        (l.length ? l.map(c => item('clientes', c, 'novo', c.nome, meta(c.tel, c.descricao, quem(c.resp)), '', '')).join('') : empty('Nenhum cliente cadastrado.'));
    } else if (view === 'projetos') {
      const ord = Object.keys(PST), l = [...mineOf(data.projetos)].sort((a, b) => ord.indexOf(a.status) - ord.indexOf(b.status));
      m.innerHTML = head('Projetos', 'O que está em andamento, para quem e até quando.', 1) +
        form('projetos', `<input class="input" name="nome" placeholder="Nome do projeto" required><select class="input" name="clienteId"><option value="">Cliente (opcional)</option>${data.clientes.map(c=>`<option value="${esc(c.id)}">${esc(c.nome)}</option>`).join('')}</select><input class="input" name="descricao" placeholder="Descrição do projeto"><input class="input" name="valor" type="number" min="0" step="0.01" placeholder="Valor total (R$)"><input class="input" name="mensalidade" type="number" min="0" step="0.01" placeholder="Mensalidade (R$)"><input class="input" name="prazo" type="date" aria-label="Prazo">`) +
        (l.length ? l.map(proj).join('') : empty('Nenhum projeto ainda.'));
    } else if (view === 'portfolio') {
      const l = mineOf(data.portfolio);
      const jaImportados = new Set(data.portfolio.map(p => p.origemProjetoId).filter(Boolean));
      const paraImportar = mineOf(data.projetos).filter(p => !jaImportados.has(p.id));
      m.innerHTML = head('Portfólio', 'Cadastre trabalhos públicos. Valores e andamento interno continuam em Projetos e Financeiro.', 1) +
        (paraImportar.length ? `<div class="portfolio-import"><span>${paraImportar.length} projeto(s) interno(s) podem virar rascunho.</span><button class="btn btn-ghost btn-sm" data-act="import-projects">Trazer para o portfólio</button></div>` : '') +
        form('portfolio', `<input class="input" name="nome" placeholder="Nome público do projeto" required><select class="input" name="categoria">${opts(PTYPES,'outro')}</select><textarea class="input textarea" name="descricao" placeholder="Descrição para quem visita o site" required></textarea><textarea class="input textarea" name="entregas" placeholder="O que foi criado? Ex.: identidade, site e painel"></textarea><input class="input" name="link" type="url" placeholder="Link público para acessar o projeto">`) +
        (l.length ? l.map(portfolioItem).join('') : empty('Nenhum trabalho no portfólio ainda. Cadastre um acima; ele só aparece no site depois de publicado.'));
    } else if (view === 'financeiro') {
      const l = mineOf(data.financeiro).filter(f => (f.data || '').startsWith(mes)).sort((a, b) => b.data.localeCompare(a.data));
      const e = soma(l, 'entrada'), s = soma(l, 'saida'), card = (t, v, c) => `<div class="stat-card"><span class="stat-label">${t}</span><span class="stat-value sm ${c}">${brl(v)}</span></div>`;
      const share = person => l.filter(f=>f.tipo==='entrada' && (f.resp===person || f.resp==='ambos')).reduce((sum,f)=>sum+(Number(f.valor)||0)*(f.resp==='ambos'?0.5:1),0);
      m.innerHTML = head('Financeiro', 'Entradas e saídas do mês.', 1) +
        `<div class="fgrid"><input class="input" type="month" id="mes" value="${esc(mes)}" aria-label="Mês"></div>` +
        `<div class="cards-grid finance-cards">${card('Entradas', e, 'agendado')}${card('Saídas', s, 'neg')}${card('Saldo', e - s, e - s >= 0 ? 'agendado' : 'neg')}${card('Dalton faturou', share('dalton'), 'contatado')}${card('Guilherme faturou', share('guilherme'), 'contatado')}</div>` +
        '<h2 class="sec-title">Novo lançamento</h2>' +
        form('financeiro', `<select class="input" name="tipo" aria-label="Tipo"><option value="entrada">Entrada</option><option value="saida">Saída</option></select><input class="input" name="descricao" placeholder="Descrição" required><input class="input" name="valor" type="number" step="0.01" min="0" placeholder="Valor (R$)" required><input class="input" name="data" type="date" value="${hoje()}" required aria-label="Data">`) +
        (l.length ? l.map(fin).join('') : empty('Nenhum lançamento neste mês.'));
    } else if (view === 'agenda') {
      const t = hoje(), fut = agFut(), pas = mineOf(data.agenda).filter(a => a.data < t).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 10);
      m.innerHTML = head('Agenda', 'Reuniões, entregas e compromissos.', 1) +
        form('agenda', `<input class="input" name="titulo" placeholder="Compromisso" required><input class="input" name="data" type="date" value="${t}" required aria-label="Data"><input class="input" name="hora" type="time" aria-label="Horário">`) +
        '<h2 class="sec-title">Próximos</h2>' + (fut.length ? fut.map(ag).join('') : empty('Nada marcado.')) +
        (pas.length ? '<h2 class="sec-title">Anteriores</h2>' + pas.map(ag).join('') : '');
    } else {
      const sm = hoje().slice(0, 7), fm = mineOf(data.financeiro).filter(f => (f.data || '').startsWith(sm)), fut = agFut();
      m.innerHTML = head(`Olá, ${esc(nome)}`, 'O que vamos fazer hoje?', 1) +
        `<div class="cards-grid">${tile('leads', 'novo', 'Leads novos', novos, 'novo')}${tile('agenda', '', 'Compromissos', fut.length, 'agendado')}${tile('projetos', '', 'Projetos ativos', mineOf(data.projetos).filter(p => p.status === 'andamento').length, 'contatado')}${tile('financeiro', '', 'Saldo do mês', brl(soma(fm, 'entrada') - soma(fm, 'saida')), 'sm')}</div>` +
        '<h2 class="sec-title">Próximos compromissos</h2>' + (fut.length ? fut.slice(0, 3).map(ag).join('') : empty('Nada marcado.'));
    }
  }

  /* ---------- ações ---------- */
  const falha = () => alert('Não foi possível salvar. Verifique a conexão.');
  const upd = (c, id, d) => Promise.resolve(D.update(c, id, d)).catch(falha);
  $('#main').addEventListener('click', e => {
    const f = e.target.closest('[data-filter]'); if (f) { filter = f.dataset.filter; return render() }
    const mi = e.target.closest('[data-mine]'); if (mi) { mine = mi.dataset.mine === '1'; return render() }
    const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go, g.dataset.f);
    const importBtn = e.target.closest('[data-act="import-projects"]');
    if (importBtn) {
      const imported = new Set(data.portfolio.map(p => p.origemProjetoId).filter(Boolean));
      const pending = mineOf(data.projetos).filter(p => !imported.has(p.id));
      if (!pending.length || !confirm(`Criar ${pending.length} rascunho(s) no portfólio? Eles ficarão ocultos do site até serem revisados e publicados.`)) return;
      Promise.all(pending.map(p => D.add('portfolio', {
        nome: p.nome || 'Projeto sem nome', categoria: 'outro', descricao: p.descricao || '', entregas: '',
        link: validUrl(p.link, true), midias: [], publicado: false, resp: p.resp || eu, origemProjetoId: p.id
      }))).then(() => alert('Rascunhos criados. Revise as descrições e links antes de publicar.')).catch(falha);
      return;
    }
    const card = e.target.closest('.lead'), act = e.target.closest('[data-act]');
    if (!card || !act) return;
    const c = card.dataset.col, id = card.dataset.id, x = data[c].find(i => i.id === id); if (!x) return;
    if (act.dataset.act === 'del') {
      if (confirm(`Excluir "${x.nome || x.titulo || x.descricao}"?`)) Promise.resolve(D.remove(c, id)).catch(() => alert('Não foi possível excluir.'));
      return;
    }
    if (act.dataset.act === 'edit-portfolio') { card.querySelector('[data-portfolio-edit]')?.classList.toggle('hidden'); return; }
    if (act.dataset.act === 'cancel-edit') { card.querySelector('[data-portfolio-edit]')?.classList.add('hidden'); return; }
    if (act.dataset.act === 'publish') {
      if (c === 'portfolio' && !x.publicado && !String(x.descricao || '').trim()) {
        card.querySelector('[data-portfolio-edit]')?.classList.remove('hidden');
        alert('Adicione uma descrição antes de publicar este trabalho.'); return;
      }
      upd(c,id,{publicado:!x.publicado}); return;
    }
    if (c !== 'leads') return;
    if (act.dataset.act === 'contact' && x.status === 'novo') upd(c, id, { status: 'contatado' });
    if (act.dataset.act === 'send') {
      const inp = card.querySelector('.meet'), v = inp.value.trim();
      if (!/^https?:\/\//.test(v)) { inp.focus(); inp.placeholder = 'Cole aqui o link do Meet primeiro'; return }
      window.open(wa(phone(x.tel), `Olá, ${x.nome}! Aqui é da Orvyn. Seu bate-papo com Guilherme e Dalton está confirmado para ${fmtD(x.data)} às ${x.hora}. É só entrar pelo link: ${v} . Qualquer coisa, é só responder aqui. Até lá!`), '_blank');
      upd(c, id, { meet: v, status: 'agendado' });
    }
  });
  $('#main').addEventListener('change', e => {
    if (e.target.id === 'mes') { mes = e.target.value || mes; return render() }
    const s = e.target.closest('[data-act=status]'), card = e.target.closest('.lead');
    if (s && card) upd(card.dataset.col, card.dataset.id, { status: s.value });
  });
  $('#main').addEventListener('submit', e => {
    const edit = e.target.closest('[data-portfolio-edit]');
    if (edit) {
      e.preventDefault();
      const card = edit.closest('.lead'), id = card.dataset.id, o = Object.fromEntries(new FormData(edit));
      for (const k in o) o[k] = String(o[k]).trim();
      const link = validUrl(o.link, true); if (o.link && !link) { alert('Use um link público começando com https://'); return; }
      o.link = link;
      Promise.resolve(D.update('portfolio', id, o)).then(() => edit.classList.add('hidden')).catch(falha);
      return;
    }
    const media = e.target.closest('[data-portfolio-media]');
    if (media) {
      e.preventDefault();
      const card = media.closest('.lead'), entry = data.portfolio.find(p => p.id === card.dataset.id), o = Object.fromEntries(new FormData(media));
      const url = validUrl(o.mediaUrl); if (!entry || !url) { alert('Cole um link público válido começando com https://'); return; }
      const midias = [...(entry.midias || []), { nome: o.mediaNome.trim(), url, tipo: o.mediaTipo }];
      Promise.resolve(D.update('portfolio', entry.id, { midias })).then(() => media.reset()).catch(falha);
      return;
    }
    const fm = e.target.closest('[data-form]'); if (!fm) return;
    e.preventDefault();
    const col = fm.dataset.form, o = Object.fromEntries(new FormData(fm));
    for (const k in o) o[k] = String(o[k]).trim();
    if (col === 'financeiro') o.valor = Number(o.valor.replace(',', '.')) || 0;
    if (col === 'clientes') o.resp = o.resp || eu;
    if (col === 'projetos') {
      o.valor = Number(o.valor) || 0; o.mensalidade = Number(o.mensalidade) || 0; o.status = 'andamento'; o.midias = []; o.publicado = false;
      const cliente = data.clientes.find(c=>c.id===o.clienteId); o.clienteNome = cliente ? cliente.nome : ''; delete o.clienteId;
    }
    if (col === 'portfolio') {
      const link = validUrl(o.link, true); if (o.link && !link) { alert('Use um link público começando com https://'); return; }
      o.link = link; o.publicado = false; o.midias = [];
    }
    Promise.resolve(D.add(col, o)).then(() => { fm.reset(); document.activeElement && document.activeElement.blur(); render() }).catch(falha);
  });

  /* ---------- entrada ---------- */
  const typing = () => document.activeElement && document.activeElement.matches('#main input, #main textarea, #main select');
  D.onAuth(u => {
    if (u) {
      eu = EQUIPE[(u.email || '').toLowerCase()] || null; nome = eu ? PESSOAS[eu] : u.email;
      $('#lockScreen').classList.add('hidden'); $('#app').classList.remove('hidden');
      $('#userMail').textContent = nome; $('#lockForm').reset();
      COLS.forEach(c => unsubs.push(D.listen(c, list => { data[c] = list; if (!typing()) render() },
        () => { $('#main').innerHTML = '<p class="empty">Não foi possível carregar os dados. Confira a conexão e as regras do Firestore.</p>' })));
      go('inicio');
    } else {
      unsubs.forEach(f => f()); unsubs = []; data = { leads: [], clientes: [], projetos: [], portfolio: [], financeiro: [], agenda: [] };
      $('#app').classList.add('hidden'); $('#lockScreen').classList.remove('hidden');
    }
  });
})();
