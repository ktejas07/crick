import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDnmYtf3EGcBDqGrohuTy-W1BFz3eFW4iU",
  authDomain: "crickplanner-79306.firebaseapp.com",
  projectId: "crickplanner-79306",
  storageBucket: "crickplanner-79306.firebasestorage.app",
  messagingSenderId: "375475366004",
  appId: "1:375475366004:web:ea1f55ff7bc2371b830921",
  measurementId: "G-CJLE4ESNJW"
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)

export default app