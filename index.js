// Importando os SDKs do Firebase via CDN nativa para o navegador
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  getFirestore, 
  addDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc, 
  where 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Mapeamento dos elementos do DOM
const startRsvpButton = document.getElementById('startRsvp');
const guestbookContainer = document.getElementById('guestbook-container');
const authContainer = document.getElementById('firebaseui-auth-container');
const form = document.getElementById('leave-message');
const input = document.getElementById('message');
const guestbook = document.getElementById('guestbook');
const numberAttending = document.getElementById('number-attending');
const rsvpYes = document.getElementById('rsvp-yes');
const rsvpNo = document.getElementById('rsvp-no');

let rsvpListener = null;
let guestbookListener = null;
let attendingListener = null;

let db, auth;

// Exibe o formulário de login customizado dentro de #firebaseui-auth-container
function showLoginForm() {
  authContainer.innerHTML = `
    <div id="login-form">
      <div class="login-icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="4" fill="white"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h3>Bem-vindo!</h3>
      <p class="subtitle">Entre ou crie sua conta para participar</p>

      <div class="auth-field">
        <input id="auth-email" type="email" placeholder="Seu e-mail" autocomplete="email">
        <i class="material-icons-round field-icon">mail</i>
      </div>
      <div class="auth-field">
        <input id="auth-password" type="password" placeholder="Senha" autocomplete="current-password">
        <i class="material-icons-round field-icon">lock</i>
      </div>

      <div id="auth-error" role="alert">
        <i class="material-icons-round" style="font-size:16px;">error</i>
        <span id="auth-error-text"></span>
      </div>

      <div class="auth-actions">
        <button id="btn-signin" class="btn-primary">Entrar</button>
        <button id="btn-signup" class="btn-secondary">Criar conta</button>
        <button id="btn-cancel" class="btn-cancel-link">Cancelar</button>
      </div>
    </div>
  `;

  const emailInput    = document.getElementById('auth-email');
  const passwordInput = document.getElementById('auth-password');
  const errorDiv      = document.getElementById('auth-error');
  const errorText     = document.getElementById('auth-error-text');
  const btnSignin     = document.getElementById('btn-signin');
  const btnSignup     = document.getElementById('btn-signup');

  // Foca no campo de e-mail automaticamente
  emailInput.focus();

  // Esconde erro ao digitar
  [emailInput, passwordInput].forEach(el =>
    el.addEventListener('input', () => errorDiv.classList.remove('visible'))
  );

  function showError(msg) {
    errorText.textContent = msg;
    errorDiv.classList.remove('visible');
    void errorDiv.offsetWidth; // força reflow para re-triggar a animação de shake
    errorDiv.classList.add('visible');
  }

  function setLoading(btn, loading, originalHTML) {
    btnSignin.disabled = loading;
    btnSignup.disabled = loading;
    if (loading) {
      const spinnerClass = btn.classList.contains('btn-secondary') ? 'spinner dark' : 'spinner';
      btn.innerHTML = `<span class="${spinnerClass}"></span> Aguarde...`;
    } else {
      btn.innerHTML = originalHTML;
    }
  }

  btnSignin.addEventListener('click', async () => {
    errorDiv.classList.remove('visible');
    const original = btnSignin.innerHTML;
    setLoading(btnSignin, true, original);
    try {
      await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      hideLoginForm();
    } catch (e) {
      showError(traduzirErro(e.code));
      setLoading(btnSignin, false, original);
    }
  });

  btnSignup.addEventListener('click', async () => {
    errorDiv.classList.remove('visible');
    const original = btnSignup.innerHTML;
    setLoading(btnSignup, true, original);
    try {
      await createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
      hideLoginForm();
    } catch (e) {
      showError(traduzirErro(e.code));
      setLoading(btnSignup, false, original);
    }
  });

  document.getElementById('btn-cancel').addEventListener('click', () => {
    hideLoginForm();
  });
}

function hideLoginForm() {
  authContainer.innerHTML = '';
}

// Traduz os códigos de erro do Firebase para português
function traduzirErro(code) {
  const erros = {
    'auth/invalid-email':        'E-mail inválido.',
    'auth/user-not-found':       'Usuário não encontrado.',
    'auth/wrong-password':       'Senha incorreta.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/weak-password':        'A senha deve ter pelo menos 6 caracteres.',
    'auth/too-many-requests':    'Muitas tentativas. Tente novamente mais tarde.',
    'auth/invalid-credential':   'E-mail ou senha incorretos.',
  };
  return erros[code] || 'Erro ao autenticar. Tente novamente.';
}

async function main() {
  const firebaseConfig = {
    apiKey: 'AIzaSyDlkkxsgG8bFDvgmAulKxNOgDph4KCY6eI',
    authDomain: 'fir-web-codelab-ec7f6.firebaseapp.com',
    projectId: 'fir-web-codelab-ec7f6',
    storageBucket: 'fir-web-codelab-ec7f6.firebasestorage.app',
    messagingSenderId: '388192112189',
    appId: '1:388192112189:web:feddc902396824a1c72454',
  };

  // Inicializando o Firebase
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Monitora o clique no botão de RSVP / Logout
  startRsvpButton.addEventListener("click", () => {
    if (auth.currentUser) {
      signOut(auth);
    } else {
      showLoginForm();
    }
  });

  // Escuta as mudanças de estado do usuário (Logado ou Deslogado)
  onAuthStateChanged(auth, user => {
    if (user) {
      startRsvpButton.innerHTML = '<i class="material-icons-round">logout</i><span>Sair</span>';
      startRsvpButton.classList.add('is-logout');
      guestbookContainer.style.display = 'flex';
      hideLoginForm();
      subscribeGuestbook();
      subscribeCurrentRSVP(user);
      subscribeAttendingCount();
    } else {
      startRsvpButton.innerHTML = '<i class="material-icons-round">how_to_reg</i><span>Confirmar Presença</span>';
      startRsvpButton.classList.remove('is-logout');
      guestbookContainer.style.display = 'none';
      unsubscribeGuestbook();
      unsubscribeCurrentRSVP();
      unsubscribeAttendingCount();
    }
  });

  // Envio de mensagens no mural (Chat)
  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!input.value.trim()) return false;

    await addDoc(collection(db, 'guestbook'), {
      text: input.value,
      timestamp: Date.now(),
      name: auth.currentUser.displayName || auth.currentUser.email.split('@')[0],
      userId: auth.currentUser.uid
    });

    input.value = '';
    return false;
  });

  function subscribeGuestbook() {
    const q = query(collection(db, 'guestbook'), orderBy('timestamp', 'desc'));

    guestbookListener = onSnapshot(q, snaps => {
      guestbook.innerHTML = '';
      snaps.forEach(doc => {
        const entry = document.createElement('p');
        const name = doc.data().name || "Anônimo";
        entry.textContent = name + ': ' + doc.data().text;
        guestbook.appendChild(entry);
      });
    });
  }

  function unsubscribeGuestbook() {
    if (guestbookListener != null) {
      guestbookListener();
      guestbookListener = null;
    }
  }

  async function updateRSVP(isAttending) {
    const userRef = doc(db, 'attendees', auth.currentUser.uid);
    try {
      await setDoc(userRef, { attending: isAttending });
    } catch (e) {
      console.error("Erro ao salvar RSVP:", e);
    }
  }

  rsvpYes.onclick = () => updateRSVP(true);
  rsvpNo.onclick = () => updateRSVP(false);

  function subscribeCurrentRSVP(user) {
    const ref = doc(db, 'attendees', user.uid);
    rsvpListener = onSnapshot(ref, doc => {
      if (doc && doc.data()) {
        const attendingResponse = doc.data().attending;
        if (attendingResponse) {
          rsvpYes.className = 'clicked';
          rsvpNo.className = '';
        } else {
          rsvpYes.className = '';
          rsvpNo.className = 'clicked';
        }
      }
    });
  }

  function unsubscribeCurrentRSVP() {
    if (rsvpListener != null) {
      rsvpListener();
      rsvpListener = null;
    }
    rsvpYes.className = '';
    rsvpNo.className = '';
  }

  function subscribeAttendingCount() {
    const attendingQuery = query(
      collection(db, 'attendees'),
      where('attending', '==', true)
    );

    attendingListener = onSnapshot(attendingQuery, snap => {
      const newAttendeeCount = snap.docs.length;
      numberAttending.innerHTML = newAttendeeCount + ' people going';
    });
  }

  function unsubscribeAttendingCount() {
    if (attendingListener != null) {
      attendingListener();
      attendingListener = null;
    }
    numberAttending.innerHTML = '';
  }
}

// Inicializa a aplicação
main();