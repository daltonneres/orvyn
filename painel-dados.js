/* Camada de dados do painel: Firebase Auth (login) + Firestore (leads, projetos, financeiro, agenda).
   API: ready, onAuth(cb), signIn(email,senha), reset(email), signOut(),
        listen(colecao, cb, erroCb) → função que para de ouvir, add(colecao, dados), update(colecao, id, dados), remove(colecao, id) */
(() => {
  const cfg = window.FIREBASE_CONFIG;
  if (!window.firebase || !cfg || !cfg.apiKey || /^COLE/.test(cfg.apiKey)) { window.PAINEL_DADOS = { ready: false }; return; }
  const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg);
  const auth = app.auth(), db = app.firestore();
  const col = n => db.collection(n);
  const ms = x => (x.criado && x.criado.toMillis ? x.criado.toMillis() : 0);
  const MSG = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.', 'auth/wrong-password': 'E-mail ou senha incorretos.',
    'auth/user-not-found': 'E-mail ou senha incorretos.', 'auth/invalid-email': 'Esse e-mail não parece válido.',
    'auth/user-disabled': 'Esse acesso foi desativado.', 'auth/too-many-requests': 'Muitas tentativas. Espere um pouco e tente de novo.',
    'auth/network-request-failed': 'Sem conexão. Verifique a internet e tente de novo.', 'auth/missing-email': 'Digite seu e-mail no campo acima primeiro.'
  };
  const fail = err => { throw new Error(MSG[err && err.code] || 'Algo deu errado. Tente de novo.') };
  window.PAINEL_DADOS = {
    ready: true,
    onAuth: cb => auth.onAuthStateChanged(u => cb(u ? { email: u.email } : null)),
    signIn: (email, senha) => auth.signInWithEmailAndPassword(email, senha).catch(fail),
    reset: email => auth.sendPasswordResetEmail(email).catch(fail),
    signOut: () => auth.signOut(),
    listen: (c, cb, errCb) => col(c).onSnapshot(
      s => cb(s.docs.map(d => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) })).sort((a, b) => ms(b) - ms(a))),
      e => { console.error(e); errCb && errCb(e) }),
    add: (c, d) => col(c).add({ ...d, criado: firebase.firestore.FieldValue.serverTimestamp() }),
    update: (c, id, d) => col(c).doc(id).update(d),
    remove: (c, id) => col(c).doc(id).delete()
  };
})();
