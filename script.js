/* Orvyn — site */
(() => {
  const $ = s => document.querySelector(s);
  const digits = s => String(s).replace(/\D/g, '');
  const fmtDate = s => { try { return new Date(s + 'T12:00:00').toLocaleDateString('pt-BR') } catch (e) { return s } };
  const waLink = (n, t) => `https://wa.me/${n}?text=${encodeURIComponent(t)}`;

  /* Salva o pedido no Firebase (se estiver configurado). Se falhar, o WhatsApp continua funcionando */
  const salvarLead = lead => {
    try {
      const c = window.FIREBASE_CONFIG;
      if (!window.firebase || !c || !c.apiKey || /^COLE/.test(c.apiKey)) return Promise.resolve();
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(c);
      return app.firestore().collection('leads').add({ ...lead, criado: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) { return Promise.resolve() }
  };

  /* WhatsApp (DDI+DDD+número). O do Dalton também recebe os pedidos de agendamento */
  const DALTON = '554691183094';
  const GUILHERME = '5546933001459';

  /* Faixas infinitas: dois grupos idênticos + animação até -50% = loop sem emenda */
  document.querySelectorAll('.strip').forEach(s => {
    const g = '<div class="grp">' + '<span>Orvyn</span>'.repeat(14) + '</div>';
    s.innerHTML = `<div class="track">${g}${g}</div>`;
  });


  /* Contador de estados atendidos */
  const cnt = $('#cnt');
  if (cnt) cnt.textContent = document.querySelectorAll('.tiles i.on').length;

  /* Botão de voltar ao início */
  const up = $('.up');
  if (up) {
    const toggle = () => up.classList.toggle('show', window.scrollY > 600);
    window.addEventListener('scroll', toggle, { passive: true });
    toggle();
  }

  /* Janela: escolha de quem falar → WhatsApp direto, ou agendamento com os dois */
  const dlg = $('#dlg'), pick = $('#pick'), form = $('#fm'), msg = $('#fmsg');
  const hello = n => `Olá, ${n}! Vim pelo site da Orvyn e quero conversar.`;
  document.querySelector('[data-wa=guilherme]').href = waLink(GUILHERME, hello('Guilherme'));
  document.querySelector('[data-wa=dalton]').href = waLink(DALTON, hello('Dalton'));
  const showPick = () => { pick.hidden = false; form.hidden = true; msg.textContent = '' };
  document.querySelectorAll('[data-agendar]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    showPick();
    $('#fd').min = new Date().toISOString().slice(0, 10);
    dlg.showModal();
  }));
  document.querySelectorAll('.opt[data-wa]').forEach(a => a.addEventListener('click', () => dlg.close()));
  $('#both').addEventListener('click', () => { pick.hidden = true; form.hidden = false; $('#fn').focus() });
  $('#fb').addEventListener('click', showPick);
  $('#fx0').addEventListener('click', () => dlg.close());

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const f = new FormData(form);
    const lead = {
      nome: String(f.get('nome')).trim(),
      tel: String(f.get('tel')).trim(),
      data: f.get('data'),
      hora: f.get('hora'),
      assunto: f.getAll('tema').concat(String(f.get('assunto') || '').trim() || []).join(', '),
      com: 'ambos', status: 'novo'
    };
    if (digits(lead.tel).length < 10) { msg.textContent = 'Digite o telefone com DDD.'; return }

    const url = waLink(DALTON, `Olá, Dalton! Sou ${lead.nome} (${lead.tel}). Quero agendar um bate-papo com você e o Guilherme, da Orvyn, no dia ${fmtDate(lead.data)} às ${lead.hora}.` + (lead.assunto ? ` Assunto: ${lead.assunto}.` : ''));
    window.open(url, '_blank'); /* dentro do clique, para o navegador não bloquear */
    salvarLead(lead).catch(err => console.warn('Lead não salvo:', err));

    form.hidden = true;
    form.reset();

    msg.textContent = `Prontinho, ${lead.nome.split(' ')[0]}! Abrimos o WhatsApp do Dalton com o seu pedido: é só tocar em enviar. Ele confirma o horário e manda o link da chamada.`;
    const a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Não abriu? Toque aqui.';
    msg.append(' ', a);
  });
})();
