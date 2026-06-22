// Removido o import do CSS por texto (o navegador lê direto pelo link do HTML)

// Importando os SDKs do Firebase via CDN nativa para o navegador
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  EmailAuthProvider, 
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

// Importando a biblioteca de interface de autenticação (FirebaseUI) global
import 'https://www.gstatic.com/firebasejs/ui/6.0.1/firebase-ui-auth__pt.js';
const firebaseui = window.firebaseui;

// Mapeamento dos elementos do DOM
const startRsvpButton = document.getElementById('startRsvp');
const guestbookContainer = document.getElementById('guestbook-container');
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

async function main() {
  const firebaseConfig = {
    apiKey: 'AIzaSyDlkkxsgG8bFDvgmAulKxNOgDph4KCY6eI',
    authDomain: 'fir-web-codelab-ec7f6.firebaseapp.com',
    projectId: 'fir-web-codelab-ec7f6',
    storageBucket: 'fir-web-codelab-ec7f6.firebasestorage.app',
    messagingSenderId: '388192112189',
    appId: '1:388192112189:web:feddc902396824a1c72454',
  };

  // Inicializando o Firebase com as instâncias globais
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Inicializa o widget do FirebaseUI
  const ui = new firebaseui.auth.AuthUI(auth);

  const uiConfig = {
    credentialHelper: firebaseui.auth.CredentialHelper.NONE,
    signInOptions: [
      EmailAuthProvider.PROVIDER_ID,
    ],
    callbacks: {
      signInSuccessWithAuthResult: function (authResult, redirectUrl) {
        return false; // Evita o redirecionamento padrão da página
      },
    },
  };

  // Monitora o clique no botão de RSVP / Logout
  startRsvpButton.addEventListener("click", () => {
    if (auth.currentUser) {
      signOut(auth);
    } else {
      ui.start("#firebaseui-auth-container", uiConfig);
    }
  });

  // Escuta as mudanças de estado do usuário (Logado ou Deslogado)
  onAuthStateChanged(auth, user => {
    if (user) {
      startRsvpButton.textContent = 'LOGOUT';
      guestbookContainer.style.display = 'block';
      subscribeGuestbook();
      subscribeCurrentRSVP(user);
      subscribeAttendingCount();
    } else {
      startRsvpButton.textContent = 'RSVP';
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