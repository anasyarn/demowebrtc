import firebase from 'firebase';
let firebaseConfig = {
  apiKey: 'AIzaSyC9jKTBwIEBjA464tJxUtiDX3wy_ZM_ZIA',
  authDomain: 'demowebrtc-ebc57.firebaseapp.com',
  projectId: 'demowebrtc-ebc57',
  storageBucket: 'demowebrtc-ebc57.appspot.com',
  messagingSenderId: '753965325819',
  appId: '1:753965325819:web:4d865b4fa6776442b47f5e',
  measurementId: 'G-4MB8X9B2HT',
};
// Initialize Firebase
// let fireapp;
// if (!firebase.apps.length) {
//   fireapp = firebase.initializeApp(firebaseConfig);
// } else {
//   fireapp = firebase.app(); // if already initialized, use that one
// }
export default !firebase.apps.length
  ? firebase.initializeApp(firebaseConfig)
  : firebase.app();
