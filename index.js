// Import stylesheets
import './style.css';
// Firebase App (the core Firebase SDK) is always required
import { initializeApp } from 'firebase/app';

// Add the Firebase products and methods that you want to use
import {
  getAuth,
  EmailAuthProvider,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

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
} from 'firebase/firestore';

import * as firebaseui from 'firebaseui';

// Document elements
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
  // Add Firebase project configuration object here
  const firebaseConfig = {
    apiKey: 'AIzaSyDlkkxsgG8bFDvgmAulKxNOgDph4KCY6eI',
    authDomain: 'fir-web-codelab-ec7f6.firebaseapp.com',
    projectId: 'fir-web-codelab-ec7f6',
    storageBucket: 'fir-web-codelab-ec7f6.firebasestorage.app',
    messagingSenderId: '388192112189',
    appId: '1:388192112189:web:feddc902396824a1c72454',
  };

  // initializeApp(firebaseConfig);
  initializeApp(firebaseConfig);
  auth = getAuth();
  db = getFirestore()

  // Initialize the FirebaseUI widget using Firebase
  const ui = new firebaseui.auth.AuthUI(auth);

  // FirebaseUI config
  const uiConfig = {
    credentialHelper: firebaseui.auth.CredentialHelper.NONE,
    signInOptions: [
      // Email / Password Provider.
      EmailAuthProvider.PROVIDER_ID,
    ],
    callbacks: {
      signInSuccessWithAuthResult: function (authResult, redirectUrl) {
        // Handle sign-in.
        // Return false to avoid redirect.
        return false;
      },
    },
  };

  // // Is there an email link sign-in?
  // if (ui.isPendingRedirect()) {
  //   ui.start('#firebaseui-auth-container', uiConfig);
  // }

  // Listen to RSVP button clicks
  startRsvpButton.addEventListener("click", () => {
    if (auth.currentUser) {
      signOut(auth);
    } else {
      ui.start("#firebaseui-auth-container", uiConfig)
    }
  });

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
      unsubscribeGuestoook();
      unsubscribeCurrentRSVP();
      unsubscribeAttendingCount();

    }
  });

  // Listen to the form submission
  form.addEventListener('submit', async e => {
    // Prevent the default form redirect
    e.preventDefault();

    // Write a new message to the database collecion "guestbook"
    addDoc(collection(db, 'guestbook'), {
      text: input.value,
      timestamp: Date.now(),
      name: auth.currentUser.displayName,
      userId: auth.currentUser.uid
    });

    input.value = '';
    
    return false

  });

  // Create query for messages
  function subscribeGuestbook(){
    const q = query(collection(db, 'guestbook'), orderBy('timestamp', 'desc'));

    guestbookListener = onSnapshot(q, snaps => {
      // Reset Page
      guestbook.innerHTML = '';

      // Look through documents in database
      snaps.forEach(doc => {

        // Create an HTML entry for each document and add it to the chat
        const entry = document.createElement('p');

        // Use o email se o nome estiver vazio
        const name = doc.data().name || "Anônimo";
        entry.textContent = name + ': ' + doc.data().text;
        guestbook.appendChild(entry);

      });

    });

    
  }
  
  // Unsubscribe from guestbook updates
  function unsubscribeGuestoook(){
    if (guestbookListener != null){
      guestbookListener();
      guestbookListener = null;
    }
  }


  // Listen to Yes or No buttons confirmation presence
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

        // Update css classes for buttons
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

  // Starts de attending count 
  function subscribeAttendingCount() {
    const attendingQuery = query(
      collection(db, 'attendees'),
      where('attending', '==', true)
    );

    attendingListener = onSnapshot(attendingQuery, snap => {
      const newAttendeeCount = snap.docs.length; // <--- Corrigido de 'lenght' para 'length'
      numberAttending.innerHTML = newAttendeeCount + ' people going';
    });
  }

  // Stops the count and clear the screen
  function unsubscribeAttendingCount() {
    if (attendingListener != null) {
      attendingListener();
      attendingListener = null;
    }
    numberAttending.innerHTML = ''; 
  }



}

main();
