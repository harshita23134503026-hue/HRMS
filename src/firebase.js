import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {

    apiKey: "AIzaSyAebfS_90KMiA1ZYXNaEYw55P7NcrvTVio",
    authDomain: "hrmss-1f2e1.firebaseapp.com",
    databaseURL: "https://hrmss-1f2e1-default-rtdb.firebaseio.com",
    projectId: "hrmss-1f2e1",
    storageBucket: "hrmss-1f2e1.firebasestorage.app",
    messagingSenderId: "784977110536",
    appId: "1:784977110536:web:9e69e45a373f4485ee93bd",

};
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);