/* Camada de dados do painel (login + leads).
   Hoje só existe o MODO DEMONSTRAÇÃO (abra painel.html?demo): dados de exemplo, nada é salvo.
   Quando o banco estiver criado, este arquivo é trocado por uma versão que conversa com ele.
   Contrato que o painel.js espera:
     ready                      true quando há banco conectado
     onAuth(cb)                 chama cb(usuario | null) quando entra/sai
     signIn(email, senha)       entra (lança Error com mensagem em português se falhar)
     reset(email)               envia e-mail de troca de senha
     signOut()                  sai
     listen(cb, erroCb)         chama cb(listaDeLeads) a cada mudança; devolve função que para de ouvir
     update(id, dados)          atualiza campos de um lead
     remove(id)                 apaga um lead
   Cada lead: { id, nome, tel, data:'AAAA-MM-DD', hora:'HH:MM', assunto, status, meet } */
(() => {
  if (!/[?&]demo\b/.test(location.search)) { window.PAINEL_DADOS = { ready: false }; return; }

  const dia = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) };
  let leads = [
    { id: 'd1', nome: 'Ana Souza', tel: '(46) 99999-1111', data: dia(2), hora: '10:00', assunto: 'Identidade visual, Site ou landing page', status: 'novo' },
    { id: 'd2', nome: 'Carlos Lima', tel: '(46) 98888-2222', data: dia(3), hora: '15:00', assunto: 'Tenho uma loja e quero um site novo', status: 'novo' },
    { id: 'd3', nome: 'Marina Alves', tel: '(49) 97777-3333', data: dia(1), hora: '14:00', assunto: 'Sistema ou aplicativo', status: 'contatado' },
    { id: 'd4', nome: 'Pedro Rocha', tel: '(46) 96666-4444', data: dia(4), hora: '09:00', assunto: 'Redes sociais', status: 'agendado', meet: 'https://meet.google.com/abc-defg-hij' },
    { id: 'd5', nome: 'Julia Prado', tel: '(41) 95555-5555', data: dia(-3), hora: '11:00', assunto: '', status: 'concluido' }
  ];
  let user = { email: 'modo demonstração' }, authCb = null, listenCb = null;
  const push = () => listenCb && listenCb(leads.map(l => ({ ...l })));

  window.PAINEL_DADOS = {
    ready: true,
    onAuth(cb) { authCb = cb; cb(user) },
    signIn() { user = { email: 'modo demonstração' }; authCb(user); return Promise.resolve() },
    reset() { return Promise.resolve() },
    signOut() { user = null; authCb(null) },
    listen(cb) { listenCb = cb; push(); return () => { listenCb = null } },
    update(id, d) { leads = leads.map(l => l.id === id ? { ...l, ...d } : l); push(); return Promise.resolve() },
    remove(id) { leads = leads.filter(l => l.id !== id); push(); return Promise.resolve() }
  };
})();
