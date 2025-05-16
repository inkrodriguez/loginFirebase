// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBKLQCH_HrRllkCLf9hsJWOjaLQi4lrL74",
  authDomain: "loginfirebase-51b5d.firebaseapp.com",
  projectId: "loginfirebase-51b5d",
  storageBucket: "loginfirebase-51b5d.appspot.com",
  messagingSenderId: "41945977802",
  appId: "1:41945977802:web:d1de81501dbd4d0b1e7533"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { auth };
